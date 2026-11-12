"""Independent tensor stiffness and conservative induction source, NumPy/SciPy.
Only physical geometry enters assembly; JS load and potential are comparisons.
Faces are grouped by a vectorized sort, not the JS streaming face-map algorithm.
"""
import json,sys,time,platform,resource,itertools
import numpy as np
import scipy
from scipy.sparse import coo_matrix,csr_matrix,diags,eye,save_npz
from scipy.sparse.linalg import splu,spilu,bicgstab,LinearOperator
from numpy.polynomial.legendre import leggauss
t0=time.perf_counter();data=json.load(open(sys.argv[1]));points=np.array(data['points']);cells=np.array(data['tetrahedra'],dtype=np.int32).reshape(-1,4);regions=np.array(data['regions']);conductivity=np.array(data['conductivityByRegion']);n=len(points)
del data['points'],data['tetrahedra'],data['regions']

def vector_potential(p,axial_only=False):
    out=np.zeros_like(p)
    for e in data['segments']:
        a=np.array(e['a']);b=np.array(e['b']);u=b-a;length=np.linalg.norm(u);u/=length
        if axial_only and u[2]==0:continue
        r=p-a;s=np.einsum('ij,j->i',r,u);rho=np.linalg.norm(r-s[:,None]*u,axis=1);near=np.clip(s,0,length)
        if np.any(np.linalg.norm(r-near[:,None]*u,axis=1)<=e['exclusionRadiusM']):raise ValueError('Conductor intersection')
        good=rho>1e-16;line=np.empty(len(p));line[good]=np.arcsinh(s[good]/rho[good])-np.arcsinh((s[good]-length)/rho[good]);far=~good
        line[far]=np.log(np.maximum(abs(s[far]),abs(length-s[far]))/np.minimum(abs(s[far]),abs(length-s[far])))
        out+=1e-7*line[:,None]*u
    return out

weights=[-.078933333333333333]+[.045733333333333333]*4+[.149333333333333333]*6
bary=[[.25]*4]+[[11/14 if i==j else 1/14 for j in range(4)] for i in range(4)]+[[.3994035761667992 if k in pair else .1005964238332008 for k in range(4)] for pair in itertools.combinations(range(4),2)]
bary=np.array(bary);K=csr_matrix((n,n));rhs=np.zeros(n)
for start in range(0,len(cells),15000):
    ids=cells[start:start+15000];xyz=points[ids];sigma=conductivity[regions[start:start+15000]]
    affine=np.ones((len(ids),4,4));affine[:,:,1:]=xyz;inverse=np.linalg.inv(affine);grad=inverse[:,1:,:].transpose(0,2,1);vol=abs(np.linalg.det(affine))/6
    local=np.einsum('eia,ea,eja,e->eij',grad,sigma,grad,vol)
    K+=coo_matrix((local.ravel(),(np.repeat(ids,4,axis=1).ravel(),np.tile(ids,(1,4)).ravel())),shape=(n,n)).tocsr()
    delta=sigma[:,2]-sigma[:,0];active=delta!=0
    if np.any(active):
        q=np.einsum('qa,eac->eqc',bary,xyz[active])*1e-6
        az=vector_potential(q.reshape(-1,3),True)[:,2].reshape(-1,11)@np.array(weights)
        force=-grad[active,:,2]*(vol[active]*delta[active]*az*1e-6)[:,None]
        np.add.at(rhs,ids[active].ravel(),force.ravel())
print('Independent stiffness/anisotropic source assembled',flush=True)
# All four oriented faces, sorted by vertex triple; cancel equal-conductivity
# face flux before quadrature, including the removed insulating boundaries.
faces=np.concatenate([np.sort(np.delete(cells,j,axis=1),axis=1) for j in range(4)]);opposite=np.concatenate([cells[:,j] for j in range(4)]);sigma=np.tile(conductivity[regions,0],4)
order=np.lexsort((faces[:,2],faces[:,1],faces[:,0]));faces=faces[order];opposite=opposite[order];sigma=sigma[order]
starts=np.r_[0,1+np.flatnonzero(np.any(faces[1:]!=faces[:-1],axis=1))];ends=np.r_[starts[1:],len(faces)];counts=ends-starts
if np.any(counts>2):raise ValueError('Nonmanifold tetrahedral face')
# Cancel equal-conductivity pairs using incidence, before allocating physical
# coordinates. Paired outward normals are exact opposites on a shared face.
coefficient=sigma[starts].copy();paired=counts==2;coefficient[paired]-=sigma[ends[paired]-1];keep=coefficient!=0
unique=faces[starts[keep]].copy();opp=opposite[starts[keep]].copy();coefficient=coefficient[keep]
del faces,opposite,sigma,order,starts,ends,counts,paired,keep
xyz=points[unique];normal=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0])/2
normal[np.einsum('ij,ij->i',normal,points[opp]-xyz[:,0])>0]*=-1
combined=normal*coefficient[:,None]
del xyz,normal,opp,coefficient
g,w=leggauss(8);g=(g+1)/2;w=w/2
q=np.array([[1-u,u*(1-v),u*v] for u in g for v in g]);qw=np.array([2*u*wu*wv for u,wu in zip(g,w) for v,wv in zip(g,w)])
for start in range(0,len(unique),512):
    ids=unique[start:start+512];xyz=points[ids];samples=np.einsum('qa,eac->eqc',q,xyz)*1e-6
    a=vector_potential(samples.reshape(-1,3)).reshape(-1,64,3)
    flux=-1e-6*np.einsum('eqc,ec->eq',a,combined[start:start+512])*qw
    force=flux@q;np.add.at(rhs,ids.ravel(),force.ravel())
print('Independent interface source assembled',flush=True)
free=np.flatnonzero(~np.array(data['boundary'],dtype=bool));v=np.zeros(n);A=K[free,:][:,free].tocsc();b=rhs[free]
iterations=0
if n<100000:
    factor=splu(A,permc_spec='MMD_AT_PLUS_A',diag_pivot_thresh=0.);v[free]=factor.solve(b);nnz=factor.L.nnz+factor.U.nnz;method='SuperLU direct, symmetric minimum-degree ordering'
else:
    scale=1/np.sqrt(A.diagonal());D=diags(scale);scaled=(D@A@D).tocsc();scaled_rhs=b*scale
    save_npz('/tmp/conservative-independent-scaled.npz',scaled);np.save('/tmp/conservative-independent-rhs.npy',scaled_rhs);np.save('/tmp/conservative-independent-scale.npy',scale)
    # The shift changes only the approximate inverse. BiCGSTAB still solves
    # the original unshifted physical matrix, and its true residual is checked.
    factor=None;attempts=[]
    for shift in [0,1e-8,1e-6,1e-4,.001,.01,.1]:
        try:
            factor=spilu(scaled+shift*eye(len(free),format='csc'),drop_tol=1e-6,fill_factor=8,permc_spec='MMD_AT_PLUS_A',diag_pivot_thresh=0.)
            attempts.append(dict(shift=shift,success=True));break
        except RuntimeError as error:attempts.append(dict(shift=shift,success=False,error=str(error)))
    if factor is None:raise RuntimeError('All independent preconditioners failed')
    print('Independent ILUT ready '+str(attempts),flush=True)
    M=LinearOperator(A.shape,matvec=factor.solve)
    def progress(x):
        global iterations
        iterations+=1
    # A per-unit-slew load is approximately 1e-12. Normalize the algebraic
    # RHS to avoid BiCGSTAB's absolute rho-breakdown threshold. Restore its
    # physical magnitude before checking the original unscaled equation.
    rhs_norm=np.linalg.norm(scaled_rhs)
    y,info=bicgstab(scaled,scaled_rhs/rhs_norm,rtol=1e-12,atol=0,maxiter=20000,M=M,callback=progress)
    if info!=0:raise RuntimeError('Independent BiCGSTAB failed: '+str(info))
    v[free]=scale*y*rhs_norm;nnz=factor.L.nnz+factor.U.nnz;method='SciPy BiCGSTAB with independently built ILUT, symmetric equilibration and unit-norm algebraic RHS'
relative=np.linalg.norm((K@v-rhs)[free])/np.linalg.norm(rhs[free]);mv=v*1000;reference=np.array(data['potentialMvPerAperS']);expected_load=np.array(data['loadMicroampPerSlew'])
report=dict(schema='axon-stage2-conservative-reference/1',maximumPotentialErrorUvPerAperS=float(abs(mv-reference).max()*1000),potentialRelativeL2=float(np.linalg.norm(mv-reference)/np.linalg.norm(mv)),maximumLoadErrorMicroampPerSlew=float(abs(rhs-expected_load).max()),loadRelativeL2=float(np.linalg.norm(rhs-expected_load)/np.linalg.norm(rhs)),relativeResidual=float(relative),loadSum=float(rhs.sum()),factorNonzeros=int(nnz),iterations=iterations,nodes=n,peakRssBytes=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,seconds=time.perf_counter()-t0,method=method,preconditionerAttempts=attempts if n>=100000 else [],runtime=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__))
json.dump(report,open(sys.argv[2],'w'),indent=2);print(json.dumps(report))
