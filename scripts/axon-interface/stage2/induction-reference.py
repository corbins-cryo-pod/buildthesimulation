"""Independent chunked NumPy P1 assembly and symmetric-order SciPy direct solve.

Only physical geometry, conductivity and winding segments enter assembly. The
JavaScript matrix, load and potential are used only for final comparisons.
"""
import json,sys,time,platform,resource
from pathlib import Path
import numpy as np
import scipy
from scipy.sparse import coo_matrix,csr_matrix
from scipy.sparse.linalg import splu
started=time.perf_counter();f=json.loads(Path(sys.argv[1]).read_text())
points=np.array(f.pop('points'));cells=np.array(f.pop('tetrahedra'),dtype=np.int32).reshape(-1,4)
regions=np.array(f.pop('regions'),dtype=np.uint8);conductivity=np.array(f['conductivityByRegion']);n=len(points)
# Independently evaluate the closed winding's finite-segment vector potential.
P=points*1e-6;A=np.zeros_like(P)
for segment in f['segments']:
 a=np.array(segment['a']);b=np.array(segment['b']);u=b-a;L=np.linalg.norm(u);u/=L;r=P-a;t=r@u;rho=np.linalg.norm(r-t[:,None]*u,axis=1)
 regular=rho>1e-16;integral=np.empty(n);integral[regular]=np.arcsinh(t[regular]/rho[regular])-np.arcsinh((t[regular]-L)/rho[regular]);far=~regular
 integral[far]=np.where(t[far]>L,np.log(np.abs(t[far]/(t[far]-L))),np.log(np.abs((L-t[far])/(-t[far]))))
 A+=1e-7*integral[:,None]*u
# Limit temporary dense element arrays. This changes storage, not quadrature.
K=csr_matrix((n,n));rhs=np.zeros(n);chunk=25000
for start in range(0,len(cells),chunk):
 ids=cells[start:start+chunk];sigma=conductivity[regions[start:start+chunk]]
 affine=np.ones((len(ids),4,4));affine[:,:,1:]=points[ids];inv=np.linalg.inv(affine)
 grad=np.transpose(inv[:,1:,:],(0,2,1));volume=np.abs(np.linalg.det(affine))/6
 local=np.einsum('eia,ea,eja,e->eij',grad,sigma,grad,volume)
 K+=coo_matrix((local.reshape(-1),(np.repeat(ids,4,axis=1).reshape(-1),np.tile(ids,(1,4)).reshape(-1))),shape=(n,n)).tocsr()
 local_rhs=volume[:,None]*np.einsum('eia,ea,ea->ei',grad,sigma,(-A[ids]).mean(axis=1))*1e-6
 np.add.at(rhs,ids.reshape(-1),local_rhs.reshape(-1))
free=np.flatnonzero(~np.array(f['boundary'],dtype=bool));v=np.zeros(n)
# Symmetric minimum-degree ordering reduces fill on this SPD problem. Neither
# the diagonal nor the physical equation is regularized.
solver=splu(K[free,:][:,free].tocsc(),permc_spec='MMD_AT_PLUS_A',diag_pivot_thresh=0.)
v[free]=solver.solve(rhs[free]);mv=v*1000
relative=float(np.linalg.norm((K@v-rhs)[free])/np.linalg.norm(rhs[free]))
error=(mv-np.array(f['potentialMvPerAperS']))*1000
r={'schema':'axon-stage2-induction-reference/2','maximumPotentialErrorUvPerAperS':float(abs(error).max()),'maximumLoadErrorMicroampPerSlew':float(abs(rhs-np.array(f['loadMicroampPerSlew'])).max()),'loadSum':float(rhs.sum()),'relativeResidual':relative,'factorNonzeros':int(solver.L.nnz+solver.U.nnz),'peakRssBytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,'seconds':time.perf_counter()-started,'runtime':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__},'method':'Independent finite-segment A, chunked NumPy affine inversion and tensor assembly, SciPy SuperLU with symmetric minimum-degree ordering; no JavaScript stiffness or load imported into solve.'}
if len(sys.argv)>3:Path(sys.argv[3]).write_text(json.dumps({'potentialMvPerAperS':mv.tolist(),'relativeResidual':relative},separators=(',',':'))+'\n')
Path(sys.argv[2]).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
