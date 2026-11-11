#!/usr/bin/env python3
"""Independent P1 assembly and finite-surface load integration for well FEM."""
import json,sys,time,platform
from pathlib import Path
import numpy as np
import scipy
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve

def reference(f):
    started=time.perf_counter()
    points=np.asarray(f['points'],dtype=np.float64)
    cells=np.asarray(f['tetrahedra'],dtype=np.int64)
    tensor=np.asarray(f['conductivityByRegion'],dtype=np.float64)[np.asarray(f['regions'],dtype=np.int64)]
    affine=np.ones((len(cells),4,4));affine[:,:,1:]=points[cells]
    inverse=np.linalg.inv(affine)
    grad=np.transpose(inverse[:,1:,:],(0,2,1))
    volume=np.abs(np.linalg.det(affine))/6
    local=np.einsum('eia,ea,eja,e->eij',grad,tensor,grad,volume)
    rows=np.repeat(cells,4,axis=1).reshape(-1)
    cols=np.tile(cells,(1,4)).reshape(-1)
    matrix=coo_matrix((local.reshape(-1),(rows,cols)),shape=(len(points),len(points))).tocsr()
    rhs=np.zeros(len(points))
    contacts={q['id']:q for q in f['contacts']}
    areas={}
    for name,sign in [('sourceContactId',1),('returnContactId',-1)]:
        contact=contacts[f['channel'][name]]
        facets=np.asarray(contact['facets'],dtype=np.int64)
        p=points[facets]
        a=np.linalg.norm(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]),axis=1)/2
        areas[contact['id']]=float(a.sum())
        np.add.at(rhs,facets.reshape(-1),np.repeat(sign*a/(3*a.sum()),3))
    boundary=np.asarray(f['boundary'],dtype=bool);free=np.flatnonzero(~boundary)
    volts=np.zeros(len(points));volts[free]=spsolve(matrix[free,:][:,free],rhs[free])
    mv=1000*volts;error=1000*(mv-np.asarray(f['potentialMvPerUa']))
    residual=matrix@volts-rhs
    return {'schema':'explicit-well-field-reference/1','independent':True,
      'method':'Independent affine inversion, tensor P1 stiffness, surface-triangle areas and current loads, scipy sparse direct solve; no JavaScript matrix imported.',
      'maximumAbsoluteMicrovolt':float(np.max(np.abs(error))),'rmsMicrovolt':float(np.sqrt(np.mean(error**2))),
      'maximumLoadDifferenceUa':float(np.max(np.abs(rhs-np.asarray(f['loadUa'])))),
      'referenceRelativeResidual':float(np.linalg.norm(residual[free])/np.linalg.norm(rhs[free])),
      'contactAreasUm2':areas,'durationSeconds':time.perf_counter()-started,
      'runtime':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__},
      'limitations':['Same-mesh implementation verification does not establish continuous accuracy or biological calibration.','Polygonal geometry, effective distal tissue and ideal surface-current boundary assumptions are shared explicit inputs.']}

if __name__=='__main__':
    result=reference(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
