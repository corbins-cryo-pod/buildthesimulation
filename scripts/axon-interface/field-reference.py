#!/usr/bin/env python3
"""Independent tetrahedral P1 assembly and scipy sparse reference solve.

This program imports no JS result as a matrix. Geometry, tensor assignments and
the specified electrode are the only model inputs. The JS nodal solution is
used only after the independent solution has been computed.
"""
import json, sys, platform, time
from pathlib import Path
import numpy as np
import scipy
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve


def reference(fixture):
    start = time.perf_counter()
    p = np.asarray(fixture['points'], dtype=np.float64)
    t = np.asarray(fixture['tetrahedra'], dtype=np.int64)
    regions = np.asarray(fixture['regions'], dtype=np.int64)
    boundary = np.asarray(fixture['boundary'], dtype=bool)
    # Columns 1,x,y,z; inverse columns hold the affine basis coefficients.
    affine = np.ones((len(t), 4, 4), dtype=np.float64)
    affine[:, :, 1:] = p[t]
    inv_affine = np.linalg.inv(affine)
    gradients = np.transpose(inv_affine[:, 1:, :], (0, 2, 1))
    volumes = np.abs(np.linalg.det(affine)) / 6
    sigma = np.asarray(fixture['conductivityByRegion'])[regions]
    stiffness = np.einsum('eia,ea,eja,e->eij', gradients, sigma, gradients, volumes)
    rows = np.repeat(t, 4, axis=1).reshape(-1)
    cols = np.tile(t, (1, 4)).reshape(-1)
    matrix = coo_matrix((stiffness.reshape(-1), (rows, cols)), shape=(len(p),len(p))).tocsr()
    node_volume = np.bincount(t.reshape(-1), weights=np.repeat(volumes / 4, 4), minlength=len(p))
    channel = fixture.get('channel')
    if channel:
        radius = channel['electrodeRadiusUm']
        def load_at(center):
            # Derive quadrature nodes independently from numpy's polynomial
            # implementation, rather than importing JavaScript constants.
            from numpy.polynomial.hermite_e import hermegauss
            qx, qw = hermegauss(5); qw /= np.sqrt(2*np.pi)
            load=np.zeros(len(p)); total=0
            for a in range(5):
                for b in range(5):
                    for c in range(5):
                        delta=np.array([qx[a],qx[b],qx[c]])*(radius/3)
                        if delta@delta >= radius**2: continue
                        point=np.r_[1,np.asarray(center)+delta]
                        weights=np.einsum('a,eai->ei',point,inv_affine)
                        candidates=np.flatnonzero(np.all(weights>=-1e-8,axis=1)&np.all(weights<=1+1e-8,axis=1))
                        if not len(candidates): raise ValueError('Electrode quadrature outside mesh')
                        el=candidates[0]; weight=qw[a]*qw[b]*qw[c]
                        np.add.at(load,t[el],weight*weights[el]);total+=weight
            return load/total
        rhs = load_at(channel['source']) - load_at(channel['return'])
    else:
        rhs = np.asarray(fixture['loadUa'], dtype=np.float64)
    voltage = np.zeros(len(p), dtype=np.float64)
    free = np.flatnonzero(~boundary)
    voltage[free] = spsolve(matrix[free, :][:, free], rhs[free])
    mv = voltage * 1000
    js = np.asarray(fixture['potentialMvPerUa'])
    error = mv-js
    loads_error = float(np.max(np.abs(rhs-np.asarray(fixture['loadUa']))))
    errors = []
    for sample in fixture['samples']:
        point = np.asarray([1, *sample['point']])
        weights = np.einsum('a,eai->ei', point, inv_affine)
        candidates = np.flatnonzero(np.all(weights >= -1e-8, axis=1) & np.all(weights <= 1+1e-8, axis=1))
        if not len(candidates): raise ValueError('Independent point location failed')
        el = candidates[0]
        value = float(weights[el] @ mv[t[el]])
        errors.append({'point':sample['point'], 'referenceMvPerUa':value,
                       'javascriptMvPerUa':sample['valueMvPerUa'],
                       'absoluteMicrovolt':abs(value-sample['valueMvPerUa'])*1000})
    residual = matrix @ voltage-rhs
    return {
        'schema':'axon-interface-field-reference/1',
        'independent':True,
        'method':'Independent numpy affine-basis inversion, scipy sparse tetrahedral assembly and SuperLU direct solve; no JS matrices imported',
        'maximumAbsoluteMicrovolt':float(np.max(np.abs(error))*1000),
        'rmsMicrovolt':float(np.sqrt(np.mean(error**2))*1000),
        'maximumSourceLoadDisagreementUa':loads_error,
        'referenceRelativeResidual':float(np.linalg.norm(residual[free])/np.linalg.norm(rhs[free])),
        'samples':errors,
        'durationSeconds':time.perf_counter()-start,
        'runtime':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__,
                   'machine':platform.machine(),'processor':platform.processor()},
        'limitations':['Agreement verifies the same discretized equations, not the continuous field or biological prediction.',
                       'The finite outer domain and ideal volumetric electrode are shared declared modeling assumptions.']
    }


if __name__=='__main__':
    source=Path(sys.argv[1]); destination=Path(sys.argv[2])
    result=reference(json.loads(source.read_text()))
    destination.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ('maximumAbsoluteMicrovolt','referenceRelativeResidual','durationSeconds')}))
