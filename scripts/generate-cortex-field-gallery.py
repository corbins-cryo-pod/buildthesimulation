"""Reproducible exploratory planar equipotential contact BEM; numpy/scipy only."""
import json
from pathlib import Path
import numpy as np
from scipy.linalg import solve

ROOT = Path(__file__).resolve().parents[1]

def panels(shape, n):
    # Nominal area pi; square panels, center inclusion, then exact area normalization.
    w, h = {'disk': (2, 2), 'square': (np.sqrt(np.pi),)*2,
            'rectangle': (2*np.sqrt(np.pi), np.sqrt(np.pi)/2),
            'ring': (4/np.sqrt(3),)*2}[shape]
    ny = max(2, round(n*h/w))
    x, y = np.meshgrid((np.arange(n)+.5)*w/n-w/2,
                       (np.arange(ny)+.5)*h/ny-h/2)
    keep = np.ones(x.shape, dtype=bool)
    if shape == 'disk': keep = x*x+y*y < 1
    if shape == 'ring': keep = (x*x+y*y < 4/3) & (x*x+y*y > 1/3)
    p = np.column_stack((x[keep], y[keep]))
    scale = np.sqrt(np.pi/(len(p)*w/n*h/ny))
    return p*scale, w/n*scale, h/ny*scale

def exact(p, hx, hy, xyz):
    """Mean 1/r over each rectangular panel, integrated analytically."""
    x, y, z = np.asarray(xyz).T
    result = np.zeros((len(x), len(p)))
    for sx, sy in [(1,1),(-1,-1),(1,-1),(-1,1)]:
        a = p[None,:,0]+sx*hx/2-x[:,None]
        b = p[None,:,1]+sy*hy/2-y[:,None]
        zz = z[:,None]
        da, db = np.hypot(a,zz), np.hypot(b,zz)
        with np.errstate(divide='ignore', invalid='ignore'):
            f = np.where(a == 0, 0, a*np.arcsinh(b/da))
            f += np.where(b == 0, 0, b*np.arcsinh(a/db))
        f -= zz*np.arctan2(a*b, zz*np.sqrt(a*a+b*b+zz*zz))
        result += sx*sy*f
    return result/(hx*hy)

def fit(shape,n):
    p,hx,hy = panels(shape,n)
    m = exact(p,hx,hy,np.column_stack((p,np.zeros(len(p)))))
    q = solve(m,np.ones(len(p)),assume_a='pos')
    q /= q.sum()
    residual = np.ptp(m@q)/np.mean(m@q)
    assert q.min()>0 and residual < 1e-10
    return p,hx,hy,q,float(residual)

def sample(model,xyz):
    p,hx,hy,q,*_ = model
    out=np.zeros((len(xyz),4))
    for sx,sy in [(1,1),(-1,-1),(1,-1),(-1,1)]:
        source = np.column_stack((p[:,0]+sx*hx/np.sqrt(12),p[:,1]+sy*hy/np.sqrt(12),np.zeros(len(p))))
        d=np.asarray(xyz)[:,None,:]-source[None,:,:]
        r=np.linalg.norm(d,axis=2)
        out[:,0] += (1/r)@(q/4)
        out[:,1:] += np.einsum('ijk,ij,j->ik',d,1/r**3,q/4)
    return out

def disk(xyz):
    x,y,z=np.asarray(xyz).T
    r=np.hypot(x,y)
    return np.arcsin(2/(np.hypot(r-1,z)+np.hypot(r+1,z)))

def gradient(fun,xyz,step=1e-4):
    result=[]
    for axis in range(3):
        d=np.zeros_like(xyz);d[:,axis]=step
        result.append(-(fun(xyz-2*d)-8*fun(xyz-d)+8*fun(xyz+d)-fun(xyz+2*d))/(12*step))
    return np.array(result).T

def main():
    # Gates chosen before generation. Empirical samples, not global error bounds.
    gates={'disk_potential_relative':.03,'disk_field_vector_relative':.07,
           'mesh_potential_relative':.04,'mesh_field_vector_relative':.08,
           'quadrature_potential_relative':.01,'quadrature_field_vector_relative':.02}
    xyz=np.array([[x,y,z] for z in [.2,.4,1,2,4] for x in [-4,-2,-1,-.5,0,.5,1,2,4] for y in [0,.5,1,2]],float)
    output={'schema':'cortex-planar-gallery/1','conductivity':.3,'minimumNormalizedHeight':.2,
            'return':'infinity','shapes':{}}
    report={'gates':gates,'sample_count':len(xyz),'levels':[12,24,48],'shapes':{}}
    for shape in ['disk','square','rectangle','ring']:
        models=[fit(shape,n) for n in [12,24,48]]
        values=[sample(m,xyz) for m in models]
        m=models[-1];p,hx,hy,q,res=m
        final=values[-1];coarse=values[-2]
        ref=exact(p,hx,hy,xyz)@q
        ef=gradient(lambda pts:exact(p,hx,hy,pts)@q,xyz)
        rel=lambda a,b:float(np.max(np.abs(a-b)/np.abs(b)))
        vec=lambda a,b:float(np.max(np.linalg.norm(a-b,axis=1)/np.linalg.norm(b,axis=1)))
        stats={'panel_count':len(p),'current_sum':float(q.sum()),'collocation_relative_spread':res,
               'mesh_potential_relative':rel(final[:,0],coarse[:,0]),
               'mesh_field_vector_relative':vec(final[:,1:],coarse[:,1:]),
               'quadrature_potential_relative':rel(final[:,0],ref),
               'quadrature_field_vector_relative':vec(final[:,1:],ef)}
        if shape=='disk':
            stats['disk_potential_relative']=rel(final[:,0],disk(xyz))
            stats['disk_field_vector_relative']=vec(final[:,1:],gradient(disk,xyz))
        stats['pass']=all(stats[k]<=limit for k,limit in gates.items() if k in stats)
        report['shapes'][shape]=stats
        output['shapes'][shape]={'hx':hx,'hy':hy,'panels':[[float(x),float(y),float(w)] for (x,y),w in zip(p,q)]}
        print(shape,json.dumps(stats),flush=True)
    report['pass']=all(s['pass'] for s in report['shapes'].values())
    path=ROOT/'docs/cortex/field-gallery-validation.json'
    path.write_text(json.dumps(report,indent=2)+'\n')
    assert report['pass'], 'Numerical acceptance gate failed; do not publish model.'
    dest=ROOT/'public/models/cortex/field-gallery.json'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,separators=(',',':'))+'\n')

if __name__=='__main__': main()
