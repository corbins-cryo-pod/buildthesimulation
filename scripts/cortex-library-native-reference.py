"""Independent native NEURON comparisons for every imported specimen.
Inputs contain configurations and geometry only, never browser solutions.
Run separately for each dataset with its own original NMODL library loaded.
"""
import json, math, subprocess, sys
from pathlib import Path
from importlib.machinery import SourceFileLoader
from neuron import h
ROOT=Path(__file__).resolve().parents[1]
dataset=sys.argv[1]
script='cortex-cell-library-model.py' if dataset=='human-eap' else 'cortex-epilepsy-library-model.py'
model=SourceFileLoader('library_native',str(ROOT/'scripts'/script)).load_module()
model.original.load_mechanisms()
cases=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/cortex-library-reference-input.mjs'),dataset],cwd=ROOT))
def overlap(t,dt,start,duration):return max(0,min(t+dt,start+duration)-max(t,start))/dt
def unit(p,s,sigma):return 1000/(4*math.pi*sigma*math.dist(p,s))
def run(case):
    c=case['config'];p=c['protocol'];dt=c['solver']['dtMs']
    sections,soma,stub,center=model.make_cell(case['specimenId'],40)
    nodes,segs=model.original.discretize(sections,soma,center)
    assert [n['id'] for n in nodes]==[n['id'] for n in case['nodes']]
    h.nlayer_extracellular(1)
    for sec in sections:
        sec.insert('extracellular')
        for seg in sec:seg.xg[0]=1e9;seg.xc[0]=0;seg.xraxial[0]=1e9
    h.CVode().active(0);h.CVode().use_fast_imem(1);h.secondorder=0;h.dt=dt;h.steps_per_ms=1/dt
    clamp=h.IClamp(soma(.5));clamp.delay=0;clamp.dur=1e9;clamp.amp=0
    h.finitialize(-80 if dataset=='human-eap' else -78)
    for _ in range(round(c['solver']['settleMs']/dt)):h.fadvance()
    physical=[i for i,n in enumerate(nodes) if n['areaUm2']>0]
    sigma=c['tissue']['conductivitySPerM'];sources=case['sources']
    field=[unit(n['centerUm'],sources[0],sigma)-unit(n['centerUm'],sources[1],sigma) for n in case['nodes']]
    bath=[unit(n['centerUm'],p['bathReturnUm'],sigma)/1000 for n in case['nodes']]
    soma_mv=[float(soma(.5).v)];snapshots=[];spikes=[];previous=soma_mv[0];last=-1e9
    stride=round(c['solver']['sampleMs']/dt)
    snapshot_steps={round(t/dt) for t in [0,5,5.5,6,10,25,40]}
    snapshots.append({'frame':0,'voltageMv':[segs[i].v for i in physical]})
    for step in range(1,round(c['solver']['durationMs']/dt)+1):
        t=(step-1)*dt;phase=p['phaseUs']/1000;gap=p['gapUs']/1000
        inject=p['injectionNa']*overlap(t,dt,p['startMs'],p['durationMs']) if p['mode']=='intracellular-current' else 0
        drive=p['amplitudeUa']*(-overlap(t,dt,p['startMs'],phase)+overlap(t,dt,p['startMs']+phase+gap,phase)) if p['mode']=='extracellular-stimulation' else 0
        clamp.amp=inject
        for i in physical:segs[i].e_extracellular=field[i]*drive-bath[i]*inject
        h.fadvance();v=float(soma(.5).v)
        if previous<-25<=v:
            crossing=t+dt*(-25-previous)/(v-previous)
            if crossing-last>=2:spikes.append(crossing);last=crossing
        previous=v
        if step%stride==0:soma_mv.append(v)
        if step in snapshot_steps:snapshots.append({'frame':step//stride,'voltageMv':[segs[i].v for i in physical]})
    print(case['id'],len(spikes),'soma events',flush=True)
    return {**{k:case[k] for k in ['id','specimenId','config']},'physicalIndices':physical,'somaVoltageMv':soma_mv,'spikeTimesMs':spikes,'snapshots':snapshots}
result={'dataset':dataset,'neuronVersion':'9.0.1','generatorSha256':model.sha(__file__),
        'modelGeneratorSha256':model.sha(ROOT/'scripts'/script),'cases':[run(case) for case in cases]}
(ROOT/f'tests/fixtures/cortex-library-{dataset}.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
