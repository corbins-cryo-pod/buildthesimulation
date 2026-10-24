#!/usr/bin/env python3
"""Independent SciPy DOP853 integration of the published Williams 2013 equations.

This file imports no JavaScript output, derivative, or integration result.
Reference: DOI 10.1371/journal.pcbi.1003220; ModelDB 244414 rate definitions.
Re-run with: python3 tools/reference_opsin.py
"""
from pathlib import Path
import json,math,hashlib
import numpy as np
from scipy.integrate import solve_ivp
import scipy
ROOT=Path(__file__).resolve().parents[1]
def derivative(t,y,v,e,temp):
    c1,o1,o2,c2,p=y
    q=(temp-22)/10
    activation1=.8535*1.46**q*e*(470e-9*12e-20)/(1.986446e-25*1.3)*p
    activation2=.14*2.77**q*e*(470e-9*12e-20)/(1.986446e-25*1.3)*p
    closing1=(.075+.043*math.tanh(-(v+20)/20))*1.97**q
    closing2=.05*1.77**q
    recovery=.0000434587*math.exp(-.0211539274*v)*2.56**q
    conversion12=.011*1.1**q+.005*math.log1p(e/.024)
    conversion21=.008*1.95**q+.004*math.log1p(e/.024)
    target=.5*(1+math.tanh(120*(100*e-.1)))
    return [-activation1*c1+closing1*o1+recovery*c2,
            activation1*c1-(closing1+conversion12)*o1+conversion21*o2,
            activation2*c2+conversion12*o1-(closing2+conversion21)*o2,
            closing2*o2-(activation2+recovery)*c2,(target-p)/1.3]
def reference(v,e,temp,pulses,duration,spacing):
    edges=sorted(set([0.,duration]+[x for p in pulses for x in p]))
    times=np.array(sorted(set(np.arange(0,duration+1e-8,spacing).round(10).tolist()+edges)))
    states=np.zeros((len(times),5));states[0,0]=1;y=np.array([1.,0,0,0,0]);cursor=1
    for a,b in zip(edges,edges[1:]):
        dose=e if any(start<=(a+b)/2<end for start,end in pulses) else 0.
        sol=solve_ivp(lambda t,y:derivative(t,y,v,dose,temp),(a,b),y,method='DOP853',rtol=2e-12,atol=2e-14,max_step=.5,dense_output=True)
        if not sol.success:raise RuntimeError(sol.message)
        while cursor<len(times) and times[cursor]<=b+1e-10:
            states[cursor]=sol.sol(times[cursor]);cursor+=1
        y=sol.y[:,-1]
    return {'voltageMv':v,'irradianceMwMm2':e,'temperatureC':temp,'pulses':pulses,'times':times.tolist(),'states':states.tolist()}
cases=[]
for temp in [22,34]:
 for v in [-80,-65,-40,-10]:
  for e in [.34,1,5.5]:cases.append(reference(v,e,temp,[[10,110],[160,165]],220,1))
# Additional numerical extrapolation checks and sub-millisecond pulse alignment.
for v in [-100,0,40]:cases.append(reference(v,1,34,[[3.137,3.237],[10.013,15.013]],30,.25))
for e in [.34,1,5.5,20]:cases.append(reference(-65,e,34,[[3.137,3.237],[10.013,10.113]],30,.25))
cases.append(reference(-65,1,37,[[10,110],[160,165]],220,1))
payload={'method':'SciPy solve_ivp DOP853; separate published RHS; rtol=2e-12, atol=2e-14; exact restart at pulse edges; max_step=0.5 ms','scipyVersion':scipy.__version__,'source':'Williams et al. 2013, DOI 10.1371/journal.pcbi.1003220; ModelDB 244414','stateOrder':['C1','O1','O2','C2','p'],'caseCount':len(cases),'experimentalValidation':False,'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'cases':cases}
(ROOT/'validation/opsin-reference.json').write_text(json.dumps(payload,separators=(',',':')))
print('Generated',len(cases),'independent reference cases')
