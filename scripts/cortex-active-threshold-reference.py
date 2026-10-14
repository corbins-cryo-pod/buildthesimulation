"""Independent native threshold brackets, with explicit detection convention."""
import hashlib
import json
import math
import subprocess
from pathlib import Path
from importlib.machinery import SourceFileLoader

import numpy as np
from neuron import h

ROOT=Path(__file__).resolve().parents[1]
model=SourceFileLoader('cortex_active_model',str(ROOT/'scripts/cortex-active-model.py')).load_module()
model.load_mechanisms()
raw=subprocess.check_output(['node',str(ROOT/'scripts/cortex-active-reference-input.mjs')],cwd=ROOT)
inputs=json.loads(raw)


def overlap(t,dt,start,duration):
    return max(0,min(t+dt,start+duration)-max(t,start))/dt


def field(point,source,sigma):
    return 1000/(4*math.pi*sigma*np.linalg.norm(np.array(point)-np.array(source)))


def bracket(case,criterion,upper):
    c=case['config'];p=c['protocol'];dt=c['solver']['dtMs'];nodes=case['nodes']
    sections,soma,stub,center=model.make_cell(c['neuron']['segmentLengthUm'])
    native_nodes,segs=model.discretize(sections,soma,center)
    if [n['id'] for n in nodes]!=[n['id'] for n in native_nodes]:raise RuntimeError('Topology mismatch')
    physical=[i for i,n in enumerate(nodes) if n['areaUm2']]
    observed=[0] if criterion=='soma' else physical
    h.nlayer_extracellular(1)
    for sec in sections:
        sec.insert('extracellular')
        for seg in sec:seg.xg[0]=1e9;seg.xc[0]=0;seg.xraxial[0]=1e9
    h.CVode().active(0);h.secondorder=0;h.dt=dt
    clamp=h.IClamp(soma(.5));clamp.delay=0;clamp.dur=1e9;clamp.amp=0
    h.finitialize(-80)
    for _ in range(round(c['solver']['settleMs']/dt)):h.fadvance()
    saved=h.SaveState();saved.save()
    sources=[s['positionUm'] for s in case['stimulatingSites']];sigma=c['tissue']['conductivitySPerM']
    unit=[field(n['centerUm'],sources[0],sigma)-field(n['centerUm'],sources[1],sigma) for n in nodes]
    bath=[field(n['centerUm'],p['bathReturnUm'],sigma)/1000 for n in nodes]
    mode=p['mode'];probes=[]
    def crosses(amplitude):
        saved.restore();clamp.amp=0
        for i in physical:segs[i].e_extracellular=0
        h.fcurrent()
        previous=[segs[i].v for i in observed]
        for step in range(round(15/dt)):
            t=step*dt;gate=overlap(t,dt,p['startMs'],p['durationMs'])
            phase=p['phaseUs']/1000;gap=p['gapUs']/1000
            drive=amplitude*(-overlap(t,dt,p['startMs'],phase)+overlap(t,dt,p['startMs']+phase+gap,phase)) if mode=='extracellular-stimulation' else 0
            inject=amplitude*gate if mode=='intracellular-current' else 0
            clamp.amp=inject
            for i in physical:segs[i].e_extracellular=unit[i]*drive-bath[i]*inject
            h.fadvance()
            current=[segs[i].v for i in observed]
            if any(a< -25<=b for a,b in zip(previous,current)):return True
            previous=current
        return False
    low=0.;high=float(upper)
    if crosses(low) or not crosses(high):raise RuntimeError('Threshold search requires a valid initial bracket')
    for _ in range(7):
        mid=(low+high)/2;event=crosses(mid);probes.append({'amplitude':mid,'crosses':event})
        if event:high=mid
        else:low=mid
    # Repeat the boundary probes to verify restored-state determinism.
    if crosses(low) or not crosses(high):raise RuntimeError('SaveState threshold replay is inconsistent')
    result={'id':case['id'],'config':c,'criterion':criterion,'thresholdMv':-25,'windowEndMs':15,
            'units':'nA' if mode=='intracellular-current' else 'µA','lowerNoCrossing':low,'upperCrossing':high,'probes':probes}
    print(case['id'],criterion,low,high,flush=True)
    return result


if __name__=='__main__':
    cases=[(next(c for c in inputs if c['id']=='intracellular-spiking'),'soma',1.2),
           (next(c for c in inputs if c['id']=='extracellular-spiking'),'any-membrane',40)]
    results=[bracket(*case) for case in cases]
    fixture={'generator':{'neuronVersion':'9.0.1','scriptSha256':model.sha(__file__),
              'modelGeneratorSha256':model.sha(ROOT/'scripts/cortex-active-model.py'),
              'inputScriptSha256':model.sha(ROOT/'scripts/cortex-active-reference-input.mjs'),
              'inputSha256':hashlib.sha256(raw).hexdigest()},'cases':results}
    (ROOT/'tests/fixtures/cortex-active-thresholds.json').write_text(json.dumps(fixture,indent=2)+'\n')
