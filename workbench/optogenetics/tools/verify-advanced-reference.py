#!/usr/bin/env python3
"""Independent SciPy references: matrix-exponential kinetics and IVP chloride.
No JavaScript output is used to construct these fixtures.
"""
from pathlib import Path
import json, numpy as np
from scipy.linalg import expm
from scipy.integrate import solve_ivp
ROOT=Path(__file__).resolve().parents[1]
# Explicit parameter copies from the declared hypothesis, not a fit to any paper.
params={
 'chronos':dict(tauOnMs=2.3,tauOffMs=3.6,halfMwMm2=.3,tauDesMs=100,tauRecMs=500),
 'chrimsonr':dict(tauOnMs=4,tauOffMs=16,halfMwMm2=.5,tauDesMs=200,tauRecMs=1000),
 'gtacr2':dict(tauOnMs=1,tauOffMs=40,halfMwMm2=.1,tauDesMs=500,tauRecMs=1500)}
cases=[]
for name,m in params.items():
 for irradiance in [0,.01,.5,10]:
  for duration in [.005,.5,40,500]:
   q=irradiance/(irradiance+m['halfMwMm2']);a=q/m['tauOnMs'];b=1/m['tauOffMs'];d=q/m['tauDesMs'];r=1/m['tauRecMs']
   Q=np.array([[-a,b,r],[a,-b-d,0],[0,d,-r]])
   x0=np.array([.4,.35,.25]);x=expm(Q*duration)@x0
   cases.append(dict(opsin=name,irradiance=irradiance,durationMs=duration,initial=x0.tolist(),expected=x.tolist()))
# solve_ivp independent of the closed-form exponential update used in JS
chloride=[]
for current in [-.05,0,.4]:
 for duration in [.005,100,1000]:
  volume=1000.;F=96485.33212;tau=400.;c0=8.;target=5.
  sol=solve_ivp(lambda t,x:[current*1e6/(F*volume)-(x[0]-target)/tau],[0,duration],[c0],method='DOP853',rtol=2e-13,atol=2e-13)
  chloride.append(dict(currentNa=current,durationMs=duration,volumeUm3=volume,initialMm=c0,targetMm=target,tauMs=tau,expectedMm=float(sol.y[0,-1])))
out={'method':'SciPy expm (Padé) for 48 frozen-generator cases; DOP853 for 9 chloride mass/relaxation cases','opsin':cases,'chloride':chloride}
path=ROOT/'validation/phase3/independent-reference.json';path.write_text(json.dumps(out,indent=2));print(path)
