"""Independent NumPy/JAX assembly and continuous-time SciPy material reference.
No JavaScript shape gradients, stresses, tangents or optimizer are reused.
Pinned inputs/outputs saved so failures remain auditable.
"""
import os
os.environ.setdefault('JAX_ENABLE_X64','True')
os.environ.setdefault('OMP_NUM_THREADS','1')
import json, sys, platform, time
from pathlib import Path
import numpy as np
import scipy
from scipy.optimize import minimize
from scipy.integrate import solve_ivp
import jax
jax.config.update('jax_enable_x64',True)
import jax.numpy as j
out=Path('artifacts/tissue-phase2');data=json.loads((out/'js-reference-cases.json').read_text());results=[]
def iso_np(F,p):
    J=np.linalg.det(F);B=F@F.T*J**(-2/3);i1=np.trace(B);i2=(i1*i1-np.trace(B@B))/2
    if p['model']=='ogden': return 2*p['mu']/p['alpha']**2*(np.sum(np.linalg.eigvalsh(B)**(p['alpha']/2))-3)
    mix=0 if p['model']=='neo' else p['mix']
    return .5*p['mu']*((1-mix)*(i1-3)+mix*(i2-3))
for m in data['material']:
    F=np.array(m['F']).reshape(3,3);p=m['p'];h=1e-6;gradient=np.zeros((3,3))
    for r in range(3):
        for c in range(3):
            plus=F.copy();minus=F.copy();plus[r,c]+=h;minus[r,c]-=h
            gradient[r,c]=(iso_np(plus,p)-iso_np(minus,p))/(2*h)
    error=float(np.max(np.abs(gradient.ravel()-m['P'])))
    assert error<2e-7,(p,error)
    results.append({'kind':'material central-difference','model':p['model'],'maxStressErrorKPa':error,'energyError':abs(iso_np(F,p)-m['energy'])})
for case in data['cases']:
    p=case['parameters'];n=p['n'];axis=np.linspace(-.5,.5,n+1);height=np.linspace(0,1,n+1)
    X=np.array([[x,y,z] for z in axis for y in height for x in axis]);conn=[]
    index=lambda i,k,l:i+(n+1)*(k+(n+1)*l)
    split=np.array([[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]])
    for z in range(n):
        for y in range(n):
            for x in range(n):
                cube=[index(x,y,z),index(x+1,y,z),index(x,y+1,z),index(x+1,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x,y+1,z+1),index(x+1,y+1,z+1)]
                conn.extend(np.array(cube)[split])
    conn=np.array(conn);xe=X[conn];D=np.transpose(xe[:,1:]-xe[:,:1],(0,2,1));invD=np.linalg.inv(D);V=np.abs(np.linalg.det(D))/6
    gradients=np.concatenate([-np.sum(invD,axis=1,keepdims=True),invD],axis=1)
    fixed=np.zeros_like(X,dtype=bool);fixed[X[:,1]==0]=True;fixed[X[:,1]==1,1]=True
    target=X.copy();target[X[:,1]==1,1]-=p['amplitude'];free=np.flatnonzero(~fixed.ravel());top=np.flatnonzero(X[:,1]==1)
    C=j.array(conn);G=j.array(gradients);vol=j.array(V);t=j.array(target.ravel());fr=j.array(free);K=2*p['mu']*(1+p['nu'])/(3*(1-2*p['nu']));mix=0 if p['model']=='neo' else p['mix'];mu=p['mu']
    def full_energy(flat):
        x=flat.reshape(-1,3);F=j.einsum('eai,eaj->eij',x[C],G);J=j.linalg.det(F);B=j.einsum('eik,ejk->eij',F,F)*J[:,None,None]**(-2/3)
        i1=j.trace(B,axis1=1,axis2=2);i2=(i1*i1-j.einsum('eij,eji->e',B,B))/2
        energy=j.sum(vol*.5*mu*((1-mix)*(i1-3)+mix*(i2-3)))
        if p['formulation']=='mixed':
            vc=vol.reshape(-1,6);jc=J.reshape(-1,6);vm=j.sum(vc,axis=1);jm=j.sum(vc*jc,axis=1)/vm
            energy+=j.sum(.5*K*vm*(jm-1)**2)+j.sum(.5*mu*vc*(jc-jm[:,None])**2)
        else:energy+=j.sum(.5*K*vol*(J-1)**2)
        return energy
    fun=lambda u:full_energy(t.at[fr].set(u))
    value_grad=jax.jit(jax.value_and_grad(fun));hessian=jax.jit(jax.hessian(fun));fullgrad=jax.jit(jax.grad(full_energy))
    wrapped=lambda u:(float(value_grad(u)[0]),np.array(value_grad(u)[1]))
    start=time.monotonic();opt=minimize(wrapped,target.ravel()[free],jac=True,hess=lambda u:np.array(hessian(u)),method='trust-exact',options={'gtol':1e-9,'maxiter':100})
    # Report independent convergence from force residual, not only scipy's status flag.
    residual=float(np.linalg.norm(wrapped(opt.x)[1])/mu);assert residual<1e-7,(case['name'],opt.message,residual)
    x=target.ravel().copy();x[free]=opt.x;js=np.array(case['positions']);u=x-X.ravel();relative=float(np.linalg.norm(x-js)/np.linalg.norm(u))
    force=float(np.array(fullgrad(x)).reshape(-1,3)[top,1].sum());jsforce=case['report']['reactionMN'][1];force_error=abs(force-jsforce)/abs(force)
    rec={'kind':'independent nonlinear FEM','name':case['name'],'displacementRelativeL2':relative,'reactionRelativeError':force_error,'referenceForceMN':force,'referenceResidual':residual,'seconds':time.monotonic()-start,'scipyStatus':str(opt.message)};results.append(rec);print(rec,flush=True)
    assert relative<1e-4 and force_error<1e-4,rec
# Continuous-time finite Maxwell reference: no discrete return-mapping code reused.
p={'mu':.36,'alpha':-16.07,'branches':[(1.78,10.18),(.82,697.88)]}
def gradient_F(t): return np.array([[1,.06*min(t/2,1),0],[0,1,0],[0,0,1.]])
def branch_tau(F,C,mu):
    b=F@((C+C.T)/2)@F.T;values,vectors=np.linalg.eigh(b);logs=.5*np.log(values);logs-=np.mean(logs);z=np.exp(p['alpha']*logs);tau=vectors@np.diag(2*mu/p['alpha']*(z-np.mean(z)))@vectors.T
    return tau,b
def rhs(t,y):
    F=gradient_F(t);inv=np.linalg.inv(F);rates=[]
    for k,(mu,eta) in enumerate(p['branches']):
        tau,b=branch_tau(F,y[k*9:(k+1)*9].reshape(3,3),mu);rates.extend((-inv@tau@b@inv.T/eta).ravel())
    return np.array(rates)
initial=np.tile(np.eye(3).ravel(),2)
# Integrate separately at the ramp/hold corner so the discontinuous velocity is not skipped.
a=solve_ivp(rhs,(0,2),initial,method='DOP853',rtol=1e-10,atol=1e-12,dense_output=True,max_step=.1)
b=solve_ivp(rhs,(2,8),a.y[:,-1],method='DOP853',rtol=1e-10,atol=1e-12,dense_output=True,max_step=.1)
assert a.success and b.success
errors=[]
for path in data['paths']:
    observed=[];truth=[]
    for point in path['records']:
        t=point['time'];F=gradient_F(t);y=(a if t<=2 else b).sol(t);tau=branch_tau(F,np.eye(3),p['mu'])[0]
        for k,(mu,eta) in enumerate(p['branches']):tau+=branch_tau(F,y[9*k:9*k+9].reshape(3,3),mu)[0]
        truth.append((tau@np.linalg.inv(F).T)[0,1]);observed.append(point['P01'])
    error=float(np.max(np.abs(np.array(truth)-observed))/max(np.abs(truth)));errors.append(error);results.append({'kind':'continuous finite Maxwell DOP853','dtSeconds':path['dt'],'peakNormalizedStressError':error})
assert errors[-1]<.012 and errors[-1]<.35*errors[0],errors
report={'python':sys.version,'platform':platform.platform(),'numpy':np.__version__,'scipy':scipy.__version__,'jax':jax.__version__,'acceptance':{'nonlinearDisplacementRelativeL2':1e-4,'nonlinearReactionRelative':1e-4,'continuousMaterialFinestError':.012},'results':results}
(out/'independent-reference.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
