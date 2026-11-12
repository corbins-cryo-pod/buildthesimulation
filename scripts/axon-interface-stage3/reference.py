#!/usr/bin/env python3
"""Independent math checks: Python/SciPy code does not import the JS solver."""
import json, math, pathlib, subprocess, platform
import numpy as np
import scipy
from scipy.integrate import quad, solve_ivp
ROOT=pathlib.Path(__file__).resolve().parents[2]
G=json.loads((ROOT/'docs/axon-interface/stage3/ACCEPTANCE.json').read_text())['gates']
js="""
import * as E from './public/axon-stage3/engine.mjs';
const fields=[21,41,81,161].map(fieldNodes=>{const s=E.normalize({fieldNodes});return {s,field:E.solveTrophic(s)}});
const cases=[{c0:0,ceq:12,rate:3,dt:.1},{c0:20,ceq:2,rate:10,dt:1},{c0:0,ceq:0,rate:1,dt:28}].map(q=>({...q,well:E.relax(q.c0,q.ceq,q.rate,q.dt),hazard:E.hazardIntegral(q.c0,q.ceq,q.rate,q.dt,E.DEFAULT)}));
const fate=[.1,.05,.025].map(dt=>{let state=[...E.CONSTANTS.initialMarker],rows=[state];for(let i=0;i<28/dt;i++){state=E.fateStep(state,E.DEFAULT,0,dt);rows.push(state);}return {dt,rows}});
console.log(JSON.stringify({fields,cases,fate,settings:E.DEFAULT,constants:E.CONSTANTS}));
"""
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True))
checks=[]
def check(name,value,limit,rule='<='):
    ok=value<=limit if rule=='<=' else value>=limit
    checks.append({'name':name,'measured':float(value),'criterion':rule,'limit':limit,'pass':bool(ok)})
errs=[]
for item in data['fields']:
    s=item['s'];f=item['field'];y=np.array(f['yUm']);c=np.array(f['concentrationNgMl']);D=s['diffusionUm2S']*86400;k=s['uptakePerDay'];T=s['thicknessUm'];bath=s['supplyNgMl']
    exact=bath*np.cosh(np.sqrt(k/D)*y)/np.cosh(np.sqrt(k/D)*T/2)
    err=float(np.max(np.abs(c-exact))/bath);errs.append(err)
    if s['fieldNodes']==81:check('Default slab against analytic cosh solution',err,G['diffusionAnalyticRelativeToBath'])
    dx=y[1]-y[0];a=D/dx**2;n=len(c)-2
    matrix=np.diag(np.full(n,2*a+k))+np.diag(np.full(n-1,-a),1)+np.diag(np.full(n-1,-a),-1)
    rhs=np.zeros(n);rhs[0]+=a*bath;rhs[-1]+=a*bath
    dense=np.linalg.solve(matrix,rhs)
    check(f'Dense independent matrix, {len(c)} nodes',np.max(np.abs(c[1:-1]-dense)),G['diffusionDenseReferenceNgMl'])
for i in range(1,len(errs)):
    check(f'Slab refinement order {data["fields"][i-1]["s"]["fieldNodes"]} to {data["fields"][i]["s"]["fieldNodes"]}',math.log2(errs[i-1]/errs[i]),G['diffusionRefinementMinimumOrder'],'>=')
s=data['settings'];K=5
for i,q in enumerate(data['cases']):
    c=lambda t:q['ceq']+(q['c0']-q['ceq'])*math.exp(-q['rate']*t)
    well=solve_ivp(lambda t,y:[q['rate']*(q['ceq']-y[0])],(0,q['dt']),[q['c0']],rtol=2e-12,atol=1e-12).y[0,-1]
    check(f'Well exchange ODE {i}',abs(well-q['well']),G['wellExchangeAbsoluteNgMl'])
    hazard=quad(lambda t:s['basalDeathPerDay']+s['starvationDeathPerDay']*K/(K+c(t)),0,q['dt'],epsabs=1e-12,epsrel=1e-12)[0]
    check(f'Hazard numerical quadrature {i}',abs(hazard-q['hazard']),G['hazardIntegralAbsolute'])
def hill(x):return x*x/(.35**2+x*x)
def ode(t,y):
    p=hill(s['FGF'])*hill(s['WNT'])*(1-.7*hill(s['BMP']))
    n=y[0]*(.35+.65*hill(s['RA']))*(1-.6*hill(s['SHH']))
    g=y[0]*(1-.7*hill(s['SHH']));b=y[1]*y[2]
    return [(p-y[0])/2,(n-y[1])/2,(g-y[2])/3,(b-y[3])/3]
ref=solve_ivp(ode,(0,28),[.05,0,0,0],rtol=1e-11,atol=1e-13,dense_output=True)
for q in data['fate']:
    ts=np.linspace(0,28,len(q['rows']));err=np.max(np.abs(np.array(q['rows'])-ref.sol(ts).T))
    if q['dt']==.1:check('Default marker step against independent continuous ODE',err,G['fateIndependentAbsoluteAtDefaultStep'])
for i in range(1,len(data['fate'])):
    coarse=np.array(data['fate'][i-1]['rows']);fine=np.array(data['fate'][i]['rows'])[::2]
    check(f'Marker time refinement {data["fate"][i-1]["dt"]} to {data["fate"][i]["dt"]}',np.max(np.abs(coarse-fine)),G['fateHalvingMaximumDifference'])
report={'scope':'Component-equation verification only. No whole stochastic-model convergence or biological calibration.','environment':{'python':platform.python_version(),'numpy':np.__version__,'scipy':scipy.__version__},'passed':sum(c['pass'] for c in checks),'total':len(checks),'checks':checks}
(ROOT/'docs/axon-interface/stage3/reference-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2));raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
