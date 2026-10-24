#!/usr/bin/env python3
"""Independently assemble and solve six cable matrices with SciPy SuperLU.
No JS matrix diagonal or RHS is used. Channel conductances are shared inputs,
so this is a voltage-solver/coupling check, not full NEURON validation.
"""
from pathlib import Path
import json, numpy as np
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve
ROOT=Path(__file__).resolve().parents[1]
probes=json.loads((ROOT/'validation/cable-probes.json').read_text());out=[]
gate=json.loads((ROOT/'validation/ACCEPTANCE_GATES.json').read_text())['independent_linear_solve_max_error_mV']
for c in probes['cases']:
    n=len(c['nodes']);A=lil_matrix((n,n));b=np.zeros(n)
    genome=c['fit']['genome'];old=np.array(c['oldVoltageMv']);phi=np.array(c['extracellularMv'])
    for i,node in enumerate(c['nodes']):
        area=node['areaUm2']
        if area:
            pars={p['name']:float(p['value']) for p in genome if p['section']==node['sectionType']}
            cap=pars['cm']*area*1e-5/c['dtMs'];leak=pars['g_pas']*area*.01
            A[i,i]+=cap+leak+c['synapticUs'][i]
            b[i]+=cap*old[i]+leak*pars['e_pas']-c['membraneOffsetNa'][i]+c['injectionNa'][i]
            for j in range(9):
                E=53 if j==0 else -45 if j==1 else c['calciumReversalMv'][i] if j in (6,7) else -107
                g=c['conductanceUs'][9*i+j];A[i,i]+=g;b[i]+=g*E
        p=node['parent']
        if p>=0:
            g=node['edgeUs'];A[i,i]+=g;A[p,p]+=g;A[i,p]-=g;A[p,i]-=g
            b[i]+=g*(phi[p]-phi[i]);b[p]+=g*(phi[i]-phi[p])
    A=A.tocsc();v=spsolve(A,b);diff=v-np.array(c['hinesVoltageMv'])
    report={'name':c['name'],'nodes':n,'maxErrorMv':float(abs(diff).max()),'rmsErrorMv':float(np.sqrt(np.mean(diff**2))),'maxResidualNa':float(abs(A@v-b).max()),'gateMv':gate}
    assert report['maxErrorMv']<gate,report
    out.append(report)
summary={'scope':probes['scope'],'reference':'Independent sparse matrix assembly in Python; SciPy SuperLU solve','passed':len(out),'comparisons':out}
(ROOT/'validation/current-cable-comparison.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
