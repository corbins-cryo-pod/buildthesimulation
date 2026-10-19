"""Independent 3D cell-centered finite-volume Laplace solve, not panel BEM.
Contact faces at z=0 are Dirichlet; other bottom faces insulating; outer box grounded.
Current is measured from contact flux, then potential normalized to one amp (sigma=1).
"""
import json,hashlib,sys,copy
from pathlib import Path
from importlib.metadata import version
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import cg
from scipy.interpolate import RegularGridInterpolator
import pyamg
ROOT=Path(__file__).resolve().parents[1]
gallery=json.loads((ROOT/'public/models/cortex/field-gallery.json').read_text())
def axis(h,extent,signed=False):
    a=list(np.arange(0,2+h/2,h));step=h
    while a[-1]<extent:
        step*=1.3;a.append(min(extent,a[-1]+step))
    a=np.array(a);return np.r_[-a[:0:-1],a] if signed else a
def mask(shape,x,y):
    if shape=='disk':return x*x+y*y<=1
    if shape=='ring':return (x*x+y*y<=4/3)&(x*x+y*y>=1/3)
    if shape=='square':return (abs(x)<=np.sqrt(np.pi)/2)&(abs(y)<=np.sqrt(np.pi)/2)
    return (abs(x)<=np.sqrt(np.pi))&(abs(y)<=np.sqrt(np.pi)/4)
def solve(shape,h,extent,points):
    edges=[axis(h,extent,True),axis(h,extent,True),axis(h,extent)]
    widths=[np.diff(a) for a in edges];centers=[(a[:-1]+a[1:])/2 for a in edges]
    dims=tuple(len(a) for a in centers);ids=np.arange(np.prod(dims)).reshape(dims);n=ids.size
    diag=np.zeros(dims);rhs=np.zeros(dims);rows=[];cols=[];vals=[]
    for ax in range(3):
        face=np.ones(dims)
        for other in range(3):
            if other!=ax:
                shp=[1,1,1];shp[other]=dims[other];face*=widths[other].reshape(shp)
        a=[slice(None)]*3;b=a.copy();a[ax]=slice(None,-1);b[ax]=slice(1,None);a=tuple(a);b=tuple(b)
        shp=[1,1,1];shp[ax]=dims[ax]-1
        g=face[a]/np.diff(centers[ax]).reshape(shp)
        diag[a]+=g;diag[b]+=g
        rows.extend([ids[a].ravel(),ids[b].ravel()]);cols.extend([ids[b].ravel(),ids[a].ravel()]);vals.extend([-g.ravel(),-g.ravel()])
        for side in [0,-1]:
            ix=[slice(None)]*3;ix[ax]=side;ix=tuple(ix)
            gb=face[ix]/(widths[ax][side]/2)
            if ax==2 and side==0:
                x,y=np.meshgrid(centers[0],centers[1],indexing='ij');contact=mask(shape,x,y);gb=gb*contact
                rhs[ix]+=gb;contact_g=gb;contact_area=float(np.sum(face[ix]*contact))
            diag[ix]+=gb
    rows.append(ids.ravel());cols.append(ids.ravel());vals.append(diag.ravel())
    matrix=coo_matrix((np.concatenate(vals),(np.concatenate(rows),np.concatenate(cols))),shape=(n,n)).tocsr()
    mg=pyamg.ruge_stuben_solver(matrix,max_coarse=100)
    v,info=cg(matrix,rhs.ravel(),M=mg.aspreconditioner(),rtol=1e-10,maxiter=1000)
    assert info==0,info
    residual=float(np.linalg.norm(matrix@v-rhs.ravel())/np.linalg.norm(rhs))
    v=v.reshape(dims);current=float(np.sum(contact_g*(1-v[:,:,0])));v/=current
    interpolator=RegularGridInterpolator(centers,v)
    e=[RegularGridInterpolator(centers,-g)(points) for g in np.gradient(v,*centers,edge_order=2)]
    return np.column_stack([interpolator(points),*e]),{'cells':n,'contactArea':contact_area,'areaRelativeError':abs(contact_area/np.pi-1),'linearResidual':residual,'unitVoltageCurrent':current,'preconditioner':'Ruge-Stuben AMG'}
def bem(shape,points):
    m=gallery['shapes'][shape];p=np.array(m['panels']);out=np.zeros((len(points),4))
    for sx in [-1,1]:
      for sy in [-1,1]:
        src=np.column_stack([p[:,0]+sx*m['hx']/np.sqrt(12),p[:,1]+sy*m['hy']/np.sqrt(12),np.zeros(len(p))])
        delta=points[:,None,:]-src;r=np.linalg.norm(delta,axis=2);q=p[:,2]/4
        out[:,0]+=(1/r)@q/(2*np.pi)
        out[:,1:]+=np.einsum('ijk,ij,j->ik',delta,1/r**3,q)/(2*np.pi)
    return out
def errors(a,b):
    return {'potential':float(np.max(abs(a[:,0]-b[:,0])/abs(b[:,0]))),'field':float(np.max(np.linalg.norm(a[:,1:]-b[:,1:],axis=1)/np.linalg.norm(b[:,1:],axis=1)))}
points=np.array([[x,y,z] for x in [0,.5,1,2] for y in [0,.5] for z in [.5,1,2]])
# Gates fixed before running. Failures remain in the report; never tuned to pass.
gates={'potential':.05,'field':.08}
report={'schema':'cortex-gallery-independent/1','gates':gates,'samplePoints':points.tolist(),'runtime':{k:version(k) for k in ['numpy','scipy','pyamg']},'shapes':{},'scope':'Independent finite-volume discretization of nominal shapes. Finite grounded box approximates the gallery infinite return. Different boundary staircases and area errors are reported; results are not a global error bound.'}
extended='--extend-domain' in sys.argv
if extended:
    report=json.loads((ROOT/'docs/cortex/gallery-independent-comparison.json').read_text())
    report['initialStudy']=copy.deepcopy(report['shapes'])
    report['extensionReason']='Initial 16→32 domain refinement failed potential convergence. Extend to 64 and 128 without changing acceptance gates; retain initial failures.'
    report['linearSolverDevelopment']='First 64-radius extension exhausted 300 CG iterations with smoothed-aggregation AMG. Changed preconditioner to Ruge-Stuben AMG and cap to 1000, retaining 1e-10 residual tolerance and all physical acceptance gates.'
for shape in gallery['shapes']:
    results=[]
    for h,extent in ([(.0625,64),(.0625,128)] if extended else [(.125,16),(.0625,16),(.0625,32)]):
        val,meta=solve(shape,h,extent,points);results.append(val)
        report['shapes'].setdefault(shape,{'solves':[]})['solves'].append({'spacing':h,'extent':extent,**meta})
        print(shape,h,extent,meta,flush=True)
    item=report['shapes'][shape]
    if not extended:item['meshChange']=errors(results[0],results[1])
    item['domainChange']=errors(results[-2],results[-1]);item['bemDifference']=errors(results[-1],bem(shape,points))
    item['status']='pass' if all(v[k]<=gates[k] for v in [item['meshChange'],item['domainChange'],item['bemDifference']] for k in gates) else 'fail'
    if shape=='disk':
        def analytical(p):
            r=np.hypot(p[:,0],p[:,1]);z=p[:,2]
            return np.arcsin(2/(np.hypot(r-1,z)+np.hypot(r+1,z)))/(2*np.pi)
        grad=[]
        for ax in range(3):
            dp=np.zeros_like(points);dp[:,ax]=1e-4
            grad.append(-(analytical(points+dp)-analytical(points-dp))/(2e-4))
        item['analyticalDiskDifference']=errors(results[-1],np.column_stack([analytical(points),*grad]))
        if any(item['analyticalDiskDifference'][k]>gates[k] for k in gates):item['status']='fail'
    print(shape,item['status'],item['bemDifference'],flush=True)
report['status']='pass' if all(x['status']=='pass' for x in report['shapes'].values()) else 'fail'
report['sourceHashes']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['scripts/cortex-gallery-independent.py','public/models/cortex/field-gallery.json']}
(ROOT/'docs/cortex/gallery-independent-comparison.json').write_text(json.dumps(report,indent=2)+'\n')
