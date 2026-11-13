"""Independent integrations of the stated equations. Not biological validation."""
import json, math, time, platform, hashlib
from pathlib import Path
import numpy as np
import scipy
from scipy.integrate import quad, solve_ivp
from sympy import Matrix
root=Path(__file__).resolve().parents[1]
f=json.loads((root/'reports/reference-fixtures.json').read_text())
a=json.loads((root/'docs/acceptance.json').read_text()); rows=[]
def check(name, value, limit, unit='', relation='<='):
    ok=value <= limit if relation=='<=' else value==limit
    rows.append(dict(name=name, measured=float(value),limit=float(limit),unit=unit,passed=bool(ok)))
# Independent exact rational rank and entropy of deterministic observation groups.
for k,x in enumerate(f['rank']):
    check(f'exact real rank / fixture {k}',x['rank'],int(Matrix(x['R']).rank()),relation='==')
    R=np.asarray(x['R']); patterns=np.concatenate([np.zeros((1,R.shape[1]),int),R]); _,counts=np.unique(patterns,axis=0,return_counts=True)
    p=counts/len(patterns); H=float(-(p*np.log2(p)).sum())
    check(f'isolated protocol information / fixture {k}',abs(H-x['information']['bitsPerTrial']),1e-12,'bit/trial')
# Direct quadrature of filament equations; no reuse of JS closed forms.
for k,x in enumerate(f['field']):
    p=np.array(x['p']);aa=np.array(x['edge']['a']);d=np.array(x['edge']['b'])-aa
    A=np.array([1e-7*quad(lambda t: d[j]/np.linalg.norm(p-aa-t*d),0,1,epsabs=1e-13,epsrel=1e-12)[0] for j in range(3)])
    B=np.array([1e-7*quad(lambda t: np.cross(d,p-aa-t*d)[j]/np.linalg.norm(p-aa-t*d)**3,0,1,epsabs=1e-13,epsrel=1e-12)[0] for j in range(3)])
    check(f'segment vector potential / fixture {k}',np.linalg.norm(np.array(x['A'])-A)/np.linalg.norm(A),a['segmentVectorPotentialRelative'],'relative L2')
    check(f'segment magnetic field / fixture {k}',np.linalg.norm(np.array(x['B'])-B)/np.linalg.norm(B),a['segmentMagneticFieldRelative'],'relative L2')
# P1 gradients via inverse affine interpolation matrix, independent assembly.
x=f['induction'];m=x['mesh'];P=np.asarray(m['points']); E=np.asarray(x['E']); rhs=np.zeros(len(P))
for k,ids in enumerate(np.asarray(m['tetrahedra']).reshape(-1,4)):
    p=P[ids]; basis=np.column_stack([np.ones(4),p]); coeff=np.linalg.inv(basis); gradients=coeff[1:,:].T
    volume=abs(np.linalg.det((p[1:]-p[0]).T))/6
    sigma=np.array(m['conductivityByRegion'][m['regions'][k]]); rhs[ids]+=volume*(gradients@(sigma*E[ids].mean(axis=0)))*1e-6
check('induction independent weak-load assembly',np.max(np.abs(rhs-np.array(x['rhs']))),1e-15,'uA/(A/s)')
check('induction conservative summed source',abs(rhs.sum()),a['inductionRhsCurrentSumAbsoluteMicroampPerRate'],'uA/(A/s)')
# Solve all four occupancy equations plus activation lag directly with DOP853.
# Only physical constants shared with the JS model; no generated solver matrices.
def derivative(V,I,T,loss):
    q=(T-22)/10
    gd1=(.075+.043*np.tanh(-(V+20)/20))*1.97**q;gd2=.05*1.77**q
    gr=4.34587e-5*np.exp(-.0211539274*V)*2.56**q
    e12=.011*1.1**q+.005*np.log1p(I/.024);e21=.008*1.95**q+.004*np.log1p(I/.024)
    eps1=.8535*1.46**q;eps2=.14*2.77**q;F=12e-20*I*470e-9/(1.986446e-25*loss)
    activation=.5*(1+np.tanh(120*(100*I-.1)))
    def fun(t,y):
        C1,O1,O2,C2,p=y;k1=eps1*F*p;k2=eps2*F*p
        return [-k1*C1+gd1*O1+gr*C2,k1*C1-(gd1+e12)*O1+e21*O2,e12*O1-(gd2+e21)*O2+k2*C2,gd2*O2-(k2+gr)*C2,(activation-p)/1.3]
    return fun
for k,x in enumerate(f['membrane']):
    s=x['settings'];edges={0.,s['durationMs']}
    for pulse in range(s['pulses']):
        start=s['onsetMs']+pulse*(s['pulseMs']+s['gapMs']);edges.update(t for t in [start,start+s['pulseMs']] if 0<=t<=s['durationMs'])
    edges=sorted(edges);ts=np.asarray(x['timeMs']); values=np.zeros((len(ts),5));values[0]=[1,0,0,0,0];initial=values[0].copy()
    for start,end in zip(edges[:-1],edges[1:]):
        mid=(start+end)/2-s['onsetMs']; period=s['pulseMs']+s['gapMs'];j=math.floor(mid/period)
        lit=mid>=0 and j<s['pulses'] and mid-j*period<s['pulseMs'];I=s['irradianceMwMm2'] if lit else 0
        sol=solve_ivp(derivative(s['voltageMv'],I,s['temperatureC'],s['lossDivisor']),(start,end),initial,method='DOP853',rtol=1e-11,atol=1e-13,dense_output=True)
        if not sol.success: raise RuntimeError(sol.message)
        mask=(ts>start)&(ts<=end+1e-12);values[mask]=sol.sol(ts[mask]).T;initial=sol.y[:,-1]
    js=np.column_stack([x['occupancy'],x['activation']]);err=np.abs(js-values).max()
    current=s['gmaxMsCm2']*s['areaUm2']*1e-5*(10.6408-14.6408*np.exp(-s['voltageMv']/42.7671))*(values[:,1]+.1*values[:,2])
    check(f'opsin independent five-state integration / fixture {k}',err,a['opsinStateVsScipyAbsolute'],'absolute occupancy / activation')
    check(f'opsin independent photocurrent / fixture {k}',np.abs(current-np.array(x['currentNa'])).max(),a['opsinCurrentVsScipyAbsoluteNanoamp'],'nA')
    check(f'opsin probability conservation / fixture {k}',x['diagnostics']['massError'],a['opsinMassAbsolute'],'absolute')
# Pure-absorption collimated slab: escape fraction exp(-mu_a L).
slab=f['beer']['scene'];distance=slab['boxHalfUm']-slab['source']['center'][2];truth=math.exp(-slab['settings']['muAbsPerMm']*distance/1000)
check('optical collimated Beer-Lambert escape',abs(f['beer']['result']['energy']['escaped']-truth),a['opticalBeerLambertAbsolute'],'absolute fraction')
check('optical Beer-Lambert energy balance',f['beer']['result']['energyResidual'],a['opticalEnergyBalanceAbsolute'],'fraction')
for k,x in enumerate(f['opticalRuns']): check(f'optical full-well energy balance / budget {x["settings"]["photons"]}',x['energyResidual'],a['opticalEnergyBalanceAbsolute'],'fraction')
# Independent seeded budgets; zero hits never become a finite certainty of isolation.
for first,second in zip(f['opticalRuns'][0]['perCell'],f['opticalRuns'][1]['perCell']):
    se=math.hypot(first['batchStandardError'],second['batchStandardError'])
    if min(first['photonsIntersecting'],second['photonsIntersecting'])>=100 and se>0:check(f'photon-budget compatibility / {first["id"]}',abs(first['meanFluencePerMw']-second['meanFluencePerMw'])/se,a['photonBatchCompatibilityStandardErrors'],'combined standard errors')
    else: rows.append(dict(name=f'photon-budget compatibility / {first["id"]}',passed=None,status='unresolved: insufficient rare-event detections; compatibility is not evidence of isolation'))
report=dict(schema='axon-stage2.independent-component-reference.v1',status='pass' if all(r['passed'] is not False for r in rows) else 'fail',python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,tests=rows,requiredPass=sum(r['passed'] is True for r in rows),requiredFail=sum(r['passed'] is False for r in rows),unresolved=sum(r['passed'] is None for r in rows),completeStage2=False,biologicalValidation=False,limitations=['Independent integration of component equations, not a coupled neuron reference.','Photon compatibility is a two-budget diagnostic, not proof of membrane-surface or domain convergence.','No native NEURON optical/magnetic experiment was executed.'])
(root/'reports/independent-reference.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='tests'},indent=2))
for row in rows:
    if row['passed'] is False: print('FAIL',row)
raise SystemExit(report['requiredFail']>0)
