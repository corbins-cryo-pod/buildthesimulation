"""Independent SciPy P1 assembly and induction load from geometric source segments."""
import json,sys,time,platform
from pathlib import Path
import numpy as np
import scipy
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
started=time.perf_counter();f=json.loads(Path(sys.argv[1]).read_text());points=np.array(f.pop('points'));cells=np.array(f.pop('tetrahedra'),dtype=int).reshape(-1,4);tensor=np.array(f['conductivityByRegion'])[np.array(f.pop('regions'))]
affine=np.ones((len(cells),4,4));affine[:,:,1:]=points[cells];inv=np.linalg.inv(affine);grad=np.transpose(inv[:,1:,:],(0,2,1));volume=np.abs(np.linalg.det(affine))/6
local=np.einsum('eia,ea,eja,e->eij',grad,tensor,grad,volume);K=coo_matrix((local.reshape(-1),(np.repeat(cells,4,axis=1).reshape(-1),np.tile(cells,(1,4)).reshape(-1))),shape=(len(points),len(points))).tocsr()
del affine,inv,local
# Independent finite-segment vector potential, batched vectorized NumPy.
P=points*1e-6;A=np.zeros_like(P)
for segment in f['segments']:
 a=np.array(segment['a']);b=np.array(segment['b']);u=b-a;L=np.linalg.norm(u);u/=L;r=P-a;t=r@u;rho=np.linalg.norm(r-t[:,None]*u,axis=1)
 regular=rho>1e-16;integral=np.empty(len(P));integral[regular]=np.arcsinh(t[regular]/rho[regular])-np.arcsinh((t[regular]-L)/rho[regular]);far=~regular
 integral[far]=np.where(t[far]>L,np.log(np.abs(t[far]/(t[far]-L))),np.log(np.abs((L-t[far])/(-t[far]))))
 A+=1e-7*integral[:,None]*u
E=-A;avg=E[cells].mean(axis=1);local_rhs=volume[:,None]*np.einsum('eia,ea,ea->ei',grad,tensor,avg)*1e-6;rhs=np.zeros(len(P));np.add.at(rhs,cells.reshape(-1),local_rhs.reshape(-1));free=np.flatnonzero(~np.array(f['boundary'],dtype=bool));v=np.zeros(len(P));v[free]=spsolve(K[free,:][:,free],rhs[free]);mv=v*1000
error=(mv-np.array(f['potentialMvPerAperS']))*1000
r={'schema':'axon-stage2-induction-reference/1','maximumPotentialErrorUvPerAperS':float(abs(error).max()),'maximumLoadErrorMicroampPerSlew':float(abs(rhs-np.array(f['loadMicroampPerSlew'])).max()),'loadSum':float(rhs.sum()),'seconds':time.perf_counter()-started,'runtime':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__},'method':'Independently reconstructed finite-segment A, NumPy affine inversion and tensor load, SciPy sparse direct solution; no JS stiffness or load imported into the solve.'}
if len(sys.argv)>3:
    Path(sys.argv[3]).write_text(json.dumps({'potentialMvPerAperS':mv.tolist(),'relativeResidual':float(np.linalg.norm((K@v-rhs)[free])/np.linalg.norm(rhs[free]))},separators=(',',':'))+'\n')
Path(sys.argv[2]).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
