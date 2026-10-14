"""Native SWC + original NMODL reference; no browser numerical solution input."""
import json
import math
import gzip
import subprocess
from pathlib import Path

import numpy as np
from neuron import h
import lfpykit
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
model = SourceFileLoader("cortex_active_model", str(ROOT / "scripts/cortex-active-model.py")).load_module()
model.load_mechanisms()
inputs_raw = subprocess.check_output(["node", str(ROOT / "scripts/cortex-active-reference-input.mjs")], cwd=ROOT)
inputs = json.loads(inputs_raw)


def overlap(t, dt, start, duration):
    return max(0, min(t+dt, start+duration)-max(t, start))/dt


def field(pos, source, sigma):
    return 1000 / (4*math.pi*sigma*np.linalg.norm(np.array(pos)-np.array(source)))


def run(case):
    c=case["config"]
    sections,soma,stub,center=model.make_cell(c["neuron"]["segmentLengthUm"])
    native_nodes,segs=model.discretize(sections,soma,center)
    nodes=case["nodes"]
    if [n["id"] for n in nodes]!=[n["id"] for n in native_nodes]:
        raise RuntimeError("Native SWC topology differs from shared geometry")
    h.nlayer_extracellular(1)
    for sec in sections:
        sec.insert("extracellular")
        for seg in sec:
            seg.xg[0]=1e9;seg.xc[0]=0;seg.xraxial[0]=1e9
    h.CVode().active(0);h.CVode().use_fast_imem(1);h.secondorder=0
    dt=c["solver"]["dtMs"];h.dt=dt;h.steps_per_ms=1/dt
    clamp=h.IClamp(soma(.5));clamp.delay=0;clamp.dur=1e9;clamp.amp=0
    h.finitialize(-80)
    for _ in range(round(c["solver"]["settleMs"]/dt)):
        h.fadvance()
    physical=[i for i,n in enumerate(nodes) if n["areaUm2"]>0]
    positions=np.array([nodes[i]["centerUm"] for i in physical])
    a=np.array([nodes[i]["startUm"] for i in physical]);b=np.array([nodes[i]["endUm"] for i in physical])
    a[0]=positions[0]+[-nodes[0]["diameterUm"]/2,0,0];b[0]=positions[0]+[nodes[0]["diameterUm"]/2,0,0]
    geom=lfpykit.CellGeometry(x=np.c_[a[:,0],b[:,0]],y=np.c_[a[:,1],b[:,1]],z=np.c_[a[:,2],b[:,2]],d=np.array([nodes[i]["diameterUm"] for i in physical]))
    sites=np.array([s["positionUm"] for s in case["recordingSites"]]);sigma=c["tissue"]["conductivitySPerM"]
    electrode=lfpykit.RecExtElectrode(geom,sigma=sigma,x=sites[:,0],y=sites[:,1],z=sites[:,2],method="root_as_point")
    lead=electrode.get_transformation_matrix()*1000
    mode=c["protocol"]["mode"];p=c["protocol"]
    source=np.array([s["positionUm"] for s in case["stimulatingSites"]])
    unit=np.array([field(n["centerUm"],source[0],sigma)-field(n["centerUm"],source[1],sigma) for n in nodes])
    bath=np.array([field(n["centerUm"],p["bathReturnUm"],sigma)/1000 for n in nodes])
    artifact=np.array([1000*(field(s,source[0],sigma)-field(s,source[1],sigma)) for s in sites])
    bath_artifact=np.array([field(s,p["bathReturnUm"],sigma) for s in sites])
    initial=[seg.v for seg in segs]
    samples=[];spikes=[];previous=initial[0];last=-1e9;max_kcl=0
    soma_trace=[];signals={key:[] for key in ['neuralUv','appliedUv','totalUv']}
    full_voltage=[];full_current=[]
    first_crossings=[None]*len(nodes);previous_voltages=initial[:]
    saved_times=[0,5,5.1,5.2,5.25,5.3,5.5,6,7,8,10,10.1,15,40]
    saved_steps={round(t/dt) for t in saved_times}
    stride=round(c["solver"]["sampleMs"]/dt)

    def capture(step,drive,inject):
        currents=np.array([segs[i].i_membrane_ for i in physical])
        full_voltage.append([segs[i].v for i in physical]);full_current.append(currents)
        neural=lead@currents
        applied=artifact*drive-bath_artifact*inject
        soma_trace.append(segs[0].v)
        for key,value in [('neuralUv',neural),('appliedUv',applied),('totalUv',neural+applied)]:signals[key].append(value.tolist())
        if step not in saved_steps:return
        samples.append({"step":step,"timeMs":step*dt,"voltageMv":[seg.v for seg in segs],
                        "membraneCurrentNa":[seg.i_membrane_ if i in physical else 0 for i,seg in enumerate(segs)],
                        "neuralUv":neural.tolist(),"appliedUv":applied.tolist(),"totalUv":(neural+applied).tolist()})
    capture(0,0,0)
    for step in range(1,round(c["solver"]["durationMs"]/dt)+1):
        t=(step-1)*dt;gate=overlap(t,dt,p["startMs"],p["durationMs"])
        phase=p["phaseUs"]/1000;gap=p["gapUs"]/1000
        drive=p["amplitudeUa"]*(-overlap(t,dt,p["startMs"],phase)+overlap(t,dt,p["startMs"]+phase+gap,phase)) if mode=="extracellular-stimulation" else 0
        inject=p["injectionNa"]*gate if mode=="intracellular-current" else 0
        clamp.amp=inject
        for i in physical:
            ve=unit[i]*drive if mode=="extracellular-stimulation" else -bath[i]*inject if mode=="intracellular-current" else 0
            segs[i].e_extracellular=ve
        h.fadvance()
        for i in physical:
            if previous_voltages[i]<-25<=segs[i].v and first_crossings[i] is None:
                first_crossings[i]=t+dt*(-25-previous_voltages[i])/(segs[i].v-previous_voltages[i])
            previous_voltages[i]=segs[i].v
        voltage=segs[0].v
        if previous < -25 <= voltage:
            crossing=t+dt*(-25-previous)/(voltage-previous)
            if crossing-last>=2:
                spikes.append(crossing);last=crossing
        previous=voltage
        max_kcl=max(max_kcl,abs(sum(segs[i].i_membrane_ for i in physical)-inject))
        if step%stride==0:capture(step,drive,inject)
    print(case["id"],"spikes",spikes,"range",min(s["voltageMv"][0] for s in samples),max(s["voltageMv"][0] for s in samples),"balance",max_kcl,flush=True)
    # Quantization is far below the declared gates: ≤0.5e−6 mV and
    # ≤0.5e−7 nA. Keep every membrane at every exported sample, then delta
    # encode and gzip the int32 arrays instead of retaining large raw JSON.
    encoded=[]
    for values,quantum in [(full_voltage,1e-6),(full_current,1e-7)]:
        q=np.rint(np.array(values)/quantum).astype(np.int64)
        delta=np.diff(q,axis=0,prepend=np.zeros((1,len(physical)),dtype=np.int64))
        if np.max(np.abs(delta))>=2**31:raise RuntimeError('Reference encoding exceeds signed-int32 range')
        encoded.append(delta.astype('<i4').tobytes())
    payload=gzip.compress(b''.join(encoded),mtime=0)
    filename=f"cortex-active-{case['id']}.bin.gz"
    target=ROOT/'tests/fixtures'/filename;target.write_bytes(payload)
    complete={"file":filename,"sha256":model.sha(target),"frames":len(full_voltage),"compartments":len(physical),"voltageQuantumMv":1e-6,"currentQuantumNa":1e-7,"encoding":"gzip; little-endian int32 frame deltas; all voltage then all current; frame-major physicalIndices"}
    return {"id":case["id"],"config":c,"physicalIndices":physical,"spikeTimesMs":spikes,"firstCrossingTimesMs":first_crossings,"maxConservationResidualNa":max_kcl,"samples":samples,"somaVoltageMv":soma_trace,"signals":signals,"completeTrace":complete}


def channel_checks():
    for sec in list(h.allsec()):h.delete_section(sec=sec)
    sec=h.Section(name="held_voltage_channel_check");sec.L=20;sec.diam=20;sec.nseg=1
    for mechanism in model.MECHANISMS:
        sec.insert(mechanism)
        if mechanism!='CaDynamics':setattr(sec,'gbar_'+mechanism,0)
    sec.ena=53;sec.ek=-107;sec.gamma_CaDynamics=0
    h.celsius=34;h.dt=.005;h.finitialize(-80)
    seg=sec(.5)
    def states():
        names=[('Ih','m'),('Im','m'),('K_Pst','m'),('K_Pst','h'),('K_Tst','m'),('K_Tst','h'),('Kv3_1','m'),('Ca_HVA','m'),('Ca_HVA','h'),('Ca_LVA','m'),('Ca_LVA','h'),('SK','z')]
        return {"gates":[getattr(getattr(seg,mechanism),state) for mechanism,state in names],
                "sodium":[getattr(seg.NaV,name) for name in ['C1','I1','C2','I2','C3','I3','C4','I4','C5','I5','O','I6']],"calciumMm":seg.cai}
    initial=states();samples=[]
    for command in [-80,-40,0,40,-80]:
        for step in range(20):
            seg.v=command;h.fadvance()
            samples.append({"commandMv":command,"actualMv":seg.v,**states()})
    return {"dtMs":.005,"initial":initial,"samples":samples,"description":"Original NMODL at held voltage with conductances zero; gamma=0 holds calcium. States still integrate using original kinetics."}


if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument("--case");args=parser.parse_args()
    selected=[c for c in inputs if not args.case or c["id"]==args.case]
    import hashlib
    result={"generator":{"neuronVersion":"9.0.1","lfpykitVersion":"0.6.2","scriptSha256":model.sha(__file__),"modelGeneratorSha256":model.sha(ROOT/"scripts/cortex-active-model.py"),"inputScriptSha256":model.sha(ROOT/"scripts/cortex-active-reference-input.mjs"),"inputSha256":hashlib.sha256(inputs_raw).hexdigest(),"sourceHashes":{p.name:model.sha(p) for p in [model.ASSETS/'571654895.swc',model.ASSETS/'optim_param_571654895.json',*[model.KINETICS/f'{m}.mod' for m in model.MECHANISMS]]}},"cases":[run(c) for c in selected],"channelChecks":channel_checks()}
    path=ROOT/"tests/fixtures/cortex-active-neuron.json"
    path.write_text(json.dumps(result,separators=(",", ":"))+"\n")
