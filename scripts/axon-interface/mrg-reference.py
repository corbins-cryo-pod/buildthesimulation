#!/usr/bin/env python3
"""Independent native NEURON double cable using unmodified ModelDB AXNODE.mod.

The reference builds its own sections directly from the original MRG table.
It does not execute or translate the JS matrix solver. Fixed-step NEURON with
native extracellular and cnexp mechanisms supplies the independent integration.
"""
import argparse,json,math,pathlib,sys,platform
from neuron import h,load_mechanisms,__version__ as neuron_version

ROOT=pathlib.Path(__file__).resolve().parent
load_mechanisms(str(ROOT/'mrg-modeldb'))
h.load_file('stdrun.hoc')
h.celsius=37
h.secondorder=0
TABLE={5.7:(3.4,1.9,500,35,80),7.3:(4.6,2.4,750,38,100),8.7:(5.8,2.8,1000,40,110),
       10:(6.9,3.3,1150,46,120),11.5:(8.1,3.7,1250,50,130),12.8:(9.2,4.2,1350,54,135),
       14:(10.4,4.7,1400,56,140),15:(11.5,5,1450,58,145),16:(12.7,5.5,1500,60,150)}

def build(case):
    D=case.get('fiberDiameterUm',10);ad,nd,spacing,fl,lam=TABLE[D]
    nodes=case.get('nodes',11);ref=case.get('passiveSegments',1);soma=case.get('somaDiameterUm',0)
    stin=(spacing-1-6-2*fl)/6
    sections=[];segments=[];nodeindices=[];zvalues=[];kinds=[];physical=[]
    z=-(spacing*(nodes-1)+1+(soma-1 if soma else 0))/2
    def add(kind,L,inner,gap,nodeordinal=None):
        nonlocal z
        sec=h.Section(name=f'{kind}_{len(sections)}');sec.nseg=1 if kind=='NODE' else ref
        sec.L=L;sec.diam=inner if kind=='NODE' else D
        sec.Ra=70 if kind=='NODE' else 70*(D/inner)**2
        sec.cm=2 if kind=='NODE' else 2*inner/D
        sec.insert('extracellular')
        Rper=(700000*.01)/(math.pi*((inner/2+gap)**2-(inner/2)**2))
        for seg in sec:
            seg.xraxial[0]=Rper
            seg.xg[0]=1e10 if kind=='NODE' else .001/(2*lam)
            seg.xc[0]=0 if kind=='NODE' else .1/(2*lam)
        if kind=='NODE':
            sec.insert('axnode');nodeindices.append(len(segments))
            if soma and nodeordinal==nodes//2:
                scale=case.get('somaActiveScale',0)
                for seg in sec:
                    seg.axnode.gnabar*=scale;seg.axnode.gnapbar*=scale;seg.axnode.gkbar*=scale
        else:
            sec.insert('pas');sec.g_pas=(.001 if kind=='MYSA' else .0001)*inner/D;sec.e_pas=-80
        if sections:sec.connect(sections[-1](1),0)
        sections.append(sec)
        for seg in sec:
            segments.append(seg);kinds.append(kind);zvalues.append(z+seg.x*L)
            physical.append((L/sec.nseg,math.pi*inner*inner/4,math.pi*((inner/2+gap)**2-(inner/2)**2)))
        z+=L
    for n in range(nodes):
        issoma=soma and n==nodes//2
        add('NODE',soma if issoma else 1,soma if issoma else nd,.002,n)
        if n<nodes-1:
            add('MYSA',3,nd,.002);add('FLUT',fl,ad,.004)
            for i in range(6):add('STIN',stin,ad,.004)
            add('FLUT',fl,ad,.004);add('MYSA',3,nd,.002)
    return sections,segments,nodeindices,zvalues,kinds,physical

def simulate(case):
    sections,segs,ni,z,kinds,physical=build(case)
    gi=[];gp=[]
    for a,b in zip(physical,physical[1:]):
        gi.append(1e6/(700000*(a[0]/(2*a[1])+b[0]/(2*b[1]))))
        gp.append(1e6/(700000*(a[0]/(2*a[2])+b[0]/(2*b[2]))))
    dt=case['dtMs'];duration=case['durationMs'];settle=case.get('equilibrationMs',20);stride=case.get('traceStride',1)
    h.dt=dt;h.steps_per_ms=1/dt
    stim=h.IClamp(segs[case.get('injectedCompartment',ni[len(ni)//2])]);stim.delay=0;stim.dur=1e9;stim.amp=0
    h.finitialize(-80)
    for k in range(round(settle/dt)):h.fadvance()
    # Matching resting preparation does not rebalance any current or potential.
    for i in case.get('silencedCompartments',[]):
        if kinds[i]=='NODE':
            segs[i].axnode.gnabar=0;segs[i].axnode.gnapbar=0;segs[i].axnode.gkbar=0
    h.t=0
    times=[0.];traces=[[float(segs[i].v)] for i in ni]
    def outer_current():
        vi=[float(s.v+s.vext[0]) for s in segs];vp=[float(s.vext[0]) for s in segs]
        out=[0.]*len(segs);out[case.get('injectedCompartment',ni[len(ni)//2])]=float(stim.amp)
        for i in range(len(segs)-1):
            flow=gi[i]*(vi[i]-vi[i+1])+gp[i]*(vp[i]-vp[i+1])
            out[i]-=flow;out[i+1]+=flow
        return out
    currents=[outer_current()] if case.get('saveCurrents',False) else []
    events=[[] for _ in ni]
    transfer=case.get('transferMvPerUa');samples=case.get('waveformUa');inject=case.get('injectedWaveformNa')
    old=[segs[i].v for i in ni]
    for k in range(round(duration/dt)):
        if transfer:
            amp=samples[k]
            for i,s in enumerate(segs):s.e_extracellular=transfer[i]*amp
        stim.amp=inject[k] if inject else 0
        h.fadvance()
        now=[float(segs[i].v) for i in ni]
        for n in range(len(ni)):
            if old[n]<0<=now[n]:events[n].append(k*dt+dt*(-old[n])/(now[n]-old[n]))
        old=now
        if (k+1)%stride==0 or k==round(duration/dt)-1:
            times.append((k+1)*dt)
            for row,i in zip(traces,ni):row.append(float(segs[i].v))
            if case.get('saveCurrents',False):currents.append(outer_current())
    return {'timesMs':times,'membraneMv':traces,'nodeEventTimes':events,
            'outerCurrentsNa':currents,'nodeIndices':ni,'zUm':z,
            'runtime':{'python':platform.python_version(),'neuron':neuron_version,
                       'integration':'native fixed-step NEURON, secondorder=0, extracellular + unchanged AXNODE cnexp'},
            'referenceBoundary':'Independent framework and independently rebuilt geometry; no JS matrix or voltage trace imported.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('input');parser.add_argument('output');args=parser.parse_args()
    case=json.loads(pathlib.Path(args.input).read_text())
    result=simulate(case)
    pathlib.Path(args.output).write_text(json.dumps(result,allow_nan=False,separators=(',',':'))+'\n')
