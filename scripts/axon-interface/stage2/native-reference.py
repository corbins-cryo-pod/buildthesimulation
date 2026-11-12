#!/usr/bin/env python3
"""Independent NEURON construction of the declared bipolar hypothesis.

No JavaScript geometry objects, matrices or voltage solutions are imported.
The request supplies physical parameters, electrode transfer coefficients and
the sampled current waveform. Original AXNODE.mod is compiled unchanged.
"""
import json,math,pathlib,platform,sys
from neuron import h,load_mechanisms,__version__ as neuron_version
from spectral_reference import PARAMETERS as SPECTRAL_PARAMETERS, photon_flux
ROOT=pathlib.Path(__file__).resolve().parents[1]
load_mechanisms(str(ROOT/'mrg-modeldb'))
load_mechanisms(str(ROOT/'stage2/mechanisms'))
h.load_file('stdrun.hoc');h.celsius=37;h.secondorder=0
TABLE={5.7:(3.4,1.9,500,35,80),7.3:(4.6,2.4,750,38,100),8.7:(5.8,2.8,1000,40,110),10:(6.9,3.3,1150,46,120),
       11.5:(8.1,3.7,1250,50,130),12.8:(9.2,4.2,1350,54,135),14:(10.4,4.7,1400,56,140),15:(11.5,5,1450,58,145),16:(12.7,5.5,1500,60,150)}
DEFAULTS=dict(somaDiameterUm=20,peripheralStemLengthUm=30,peripheralStemDiameterUm=1.5,centralStemLengthUm=50,centralStemDiameterUm=2.5,
              peripheralFiberDiameterUm=5.7,centralFiberDiameterUm=5.7,armNodeCount=6,passiveSegments=3,stemSegments=3,somaSegments=5,somaActiveScale=.1,stemActiveScale=.1)

def build(case):
    p={**DEFAULTS,**case.get('parameters',{})};raw=[]
    def arm(name):
        D=p[name+'FiberDiameterUm'];ad,nd,spacing,fl,lam=TABLE[D];stin=(spacing-1-6-2*fl)/6
        def add(kind,L,inner,gap):raw.append(dict(kind=kind,L=L,inner=inner,outer=inner if kind=='NODE' else D,gap=gap,lam=lam,nseg=1 if kind=='NODE' else p['passiveSegments'],scale=1 if kind=='NODE' else 0,arm=name,role=name+'_'+kind.lower()))
        for n in range(p['armNodeCount']):
            add('NODE',1,nd,.002)
            if n<p['armNodeCount']-1:
                add('MYSA',3,nd,.002);add('FLUT',fl,ad,.004)
                for k in range(6):add('STIN',stin,ad,.004)
                add('FLUT',fl,ad,.004);add('MYSA',3,nd,.002)
    R=p['somaDiameterUm']/2;left=-math.sqrt(R*R-(p['peripheralStemDiameterUm']/2)**2);right=math.sqrt(R*R-(p['centralStemDiameterUm']/2)**2)
    arm('peripheral');left_length=sum(d['L'] for d in raw)
    def exposed(kind,L,d,nseg,scale,name,role):raw.append(dict(kind=kind,L=L,inner=d,outer=d,gap=0,lam=0,nseg=nseg,scale=scale,arm=name,role=role))
    exposed('STEM',p['peripheralStemLengthUm'],p['peripheralStemDiameterUm'],p['stemSegments'],p['stemActiveScale'],'peripheral','peripheral_stem')
    exposed('SOMA',right-left,p['somaDiameterUm'],p['somaSegments'],p['somaActiveScale'],None,'soma')
    exposed('STEM',p['centralStemLengthUm'],p['centralStemDiameterUm'],p['stemSegments'],p['stemActiveScale'],'central','central_stem')
    arm('central')
    z=left-p['peripheralStemLengthUm']-left_length;sections=[];segments=[];nodes=[];active=[];physical=[];roles=[];positions=[]
    for d in raw:
        if case.get('nativeStump') and (d['arm']!=case['nativeStump'] or d['kind']=='STEM'):
            z+=d['L'];continue
        sec=h.Section(name=f"{d['role']}_{len(sections)}");sec.L=d['L'];sec.diam=d['outer'];sec.nseg=d['nseg'];sec.Ra=70*(d['outer']/d['inner'])**2
        sec.cm=2*d['inner']/d['outer'];sec.insert('extracellular')
        is_active=d['kind'] in ('NODE','STEM','SOMA');bare=d['kind'] in ('STEM','SOMA')
        annulus=math.pi*((d['inner']/2+d['gap'])**2-(d['inner']/2)**2) if not bare else None
        for seg in sec:
            seg.xraxial[0]=1e30 if bare else 7000/annulus
            seg.xg[0]=1e10 if is_active else .001/(2*d['lam'])
            seg.xc[0]=0 if is_active else .1/(2*d['lam'])
        if is_active:
            sec.insert('axnode')
            for seg in sec:
                seg.axnode.gnabar*=d['scale'];seg.axnode.gnapbar*=d['scale'];seg.axnode.gkbar*=d['scale']
        else:
            sec.insert('pas');sec.g_pas=(.001 if d['kind']=='MYSA' else .0001)*d['inner']/d['outer'];sec.e_pas=-80
        if sections:sec.connect(sections[-1](1),0)
        sections.append(sec)
        for seg in sec:
            index=len(segments)
            if is_active:active.append(index)
            if d['kind']=='NODE':nodes.append(index)
            segments.append(seg);positions.append(z+seg.x*d['L']);roles.append(d['role'])
            physical.append((d['L']/d['nseg'],math.pi*d['inner']**2/4,annulus))
        z+=d['L']
    return sections,segments,nodes,active,physical,roles,positions

def simulate(case):
    sections,segs,nodes,active,physical,roles,z=build(case)
    gi=[1e6/(700000*(a[0]/(2*a[1])+b[0]/(2*b[1]))) for a,b in zip(physical,physical[1:])]
    gp=[0 if a[2] is None or b[2] is None else 1e6/(700000*(a[0]/(2*a[2])+b[0]/(2*b[2]))) for a,b in zip(physical,physical[1:])]
    photo=case.get('optical')
    if photo:
        for sec in {segs[i].sec for i in photo['expressionIndices']}:sec.insert('axon_chr2')
        for i in photo['expressionIndices']:segs[i].axon_chr2.gmax=photo['gmaxMsCm2']
    spectral=case.get('spectral')
    if spectral:
        p=SPECTRAL_PARAMETERS[spectral['modelId']];indices=spectral['expressionIndices']
        for sec in {segs[i].sec for i in indices}:sec.insert('axon_spectral')
        total_area=sum(h.area(segs[i].x,sec=segs[i].sec) for i in indices)
        names=dict(Gd1='gd1',Gd2='gd2',Gr0='gr0',k1='k1',k2='k2',Gf0='gf0',Gb0='gb0',kf='kf',kb='kb',phim='phim',p='powerp',q='powerq',gamma='gamma',E='reversal')
        for i in indices:
            op=segs[i].axon_spectral
            for key,name in names.items():setattr(op,name,p[key])
            op.gbar=0 if spectral.get('blocked') else p['g0']*.1*spectral.get('expressionMultiplier',1)/total_area
            op.rate_scale=spectral.get('rateScale',1)
        spectral_flux={i:photon_flux(spectral['modelId'],[dict(nm=b['nm'],irradianceMwMm2=b['fluencePerMw'][i]*spectral['emittedMw']) for b in spectral['bins']],spectral.get('convention','declared')) for i in indices}
    dt=case['dtMs'];duration=case['durationMs'];h.dt=dt;h.steps_per_ms=1/dt
    injection_index=case.get('injectedCompartment',next((i for i,r in enumerate(roles) if r=='soma'),nodes[0]))
    stim=h.IClamp(segs[injection_index]);stim.delay=0;stim.dur=1e9;stim.amp=0
    h.finitialize(-80)
    for k in range(round(case.get('equilibrationMs',50)/dt)):h.fadvance()
    for i in case.get('silencedCompartments',[]):
        if i in active:segs[i].axnode.gnabar=0;segs[i].axnode.gnapbar=0;segs[i].axnode.gkbar=0
    h.t=0;record=case.get('recordIndices',active);times=[0.];traces=[[float(segs[i].v)] for i in record]
    def current():
        vi=[float(s.v+s.vext[0]) for s in segs];vp=[float(s.vext[0]) for s in segs];out=[0.]*len(segs);out[injection_index]=float(stim.amp)
        for i in range(len(gi)):
            flow=gi[i]*(vi[i]-vi[i+1])+gp[i]*(vp[i]-vp[i+1]);out[i]-=flow;out[i+1]+=flow
        return out
    currents=[current()] if case.get('saveCurrents',True) else [];events=[[] for _ in active];old=[float(segs[i].v) for i in active]
    steps=round(duration/dt);stride=case.get('traceStride',1);transfer=case.get('transferMvPerUa');waveform=case.get('waveformUa');injected=case.get('injectedWaveformNa')
    for k in range(steps):
        if transfer is not None:
            for i,s in enumerate(segs):s.e_extracellular=transfer[i]*waveform[k]
        if photo:
            t=k*dt;start=photo['pulseStartMs'];end=start+photo['pulseWidthMs']
            fraction=max(0,min(t+dt,end)-max(t,start))/dt
            for i in photo['expressionIndices']:segs[i].axon_chr2.light=photo['fluencePerMw'][i]*photo['emittedMw']*fraction
        if spectral:
            t=k*dt;start=spectral['pulseStartMs'];end=start+spectral['pulseWidthMs']
            fraction=max(0,min(t+dt,end)-max(t,start))/dt
            for i in spectral['expressionIndices']:segs[i].axon_spectral.flux=spectral_flux[i]*fraction
        stim.amp=injected[k] if injected else 0;h.fadvance();now=[float(segs[i].v) for i in active]
        for j in range(len(active)):
            if old[j]<0<=now[j]:events[j].append(k*dt+dt*(-old[j])/(now[j]-old[j]))
        old=now
        if (k+1)%stride==0 or k+1==steps:
            times.append((k+1)*dt)
            for row,i in zip(traces,record):row.append(float(segs[i].v))
            if case.get('saveCurrents',True):currents.append(current())
    return dict(timesMs=times,recordIndices=record,membraneMv=traces,outerCurrentsNa=currents,activeSiteIndices=active,activeSiteEventTimes=events,
                nodeEventTimes=[events[active.index(i)] for i in nodes],nodeIndices=nodes,positionsUm=z,roles=roles,
                runtime=dict(python=platform.python_version(),neuron=neuron_version,integration='native fixed-step NEURON, extracellular and unchanged AXNODE.mod cnexp'))

if __name__=='__main__':
    case=json.loads(pathlib.Path(sys.argv[1]).read_text());result=simulate(case)
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result,allow_nan=False,separators=(',',':'))+'\n')
