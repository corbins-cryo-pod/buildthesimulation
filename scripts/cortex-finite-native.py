"""Independent NEURON dynamics + SWC reconstruction + binary field sampling.
Browser solutions are opened only AFTER all native simulations are complete.
"""
import hashlib,json,math,os,sys
from pathlib import Path
from importlib.machinery import SourceFileLoader
from importlib.metadata import version
import numpy as np
from neuron import h
ROOT=Path(__file__).resolve().parents[1]
model=SourceFileLoader('finite_native_model',str(ROOT/'scripts/cortex-cell-library-model.py')).load_module()
model.original.load_mechanisms()
work=Path(sys.argv[1]);inputs=json.loads((work/'inputs.json').read_text())
manifest=json.loads((ROOT/'public/models/cortex/finite-contact/disk-v1/field.json').read_text())
raw=(ROOT/'public/models/cortex/finite-contact/disk-v1/field.bin').read_bytes()
assert hashlib.sha256(raw).hexdigest()==manifest['data']['sha256']
d=manifest['data'];nr=d['radialCount'];nz=d['axialCount']
rr=np.frombuffer(raw,dtype='<f8',count=nr);zz=np.frombuffer(raw,dtype='<f8',count=nz,offset=nr*8)
vv=np.frombuffer(raw,dtype='<f4',offset=(nr+nz)*8).reshape(nz,nr).astype(float)
def sample(points):
    p=np.asarray(points)*1e-6;r=np.hypot(p[:,0],p[:,1]);z=p[:,2]-.001
    assert np.all((r<=.00025)&(z>0)&(z<=.00025))
    i=np.searchsorted(rr,r,side='right')-1;j=np.searchsorted(zz,z,side='right')-1
    u=(r-rr[i])/(rr[i+1]-rr[i]);v=(z-zz[j])/(zz[j+1]-zz[j])
    return np.where(v<=u,(1-u)*vv[j,i]+(u-v)*vv[j,i+1]+v*vv[j+1,i+1],(1-v)*vv[j,i]+u*vv[j+1,i+1]+(v-u)*vv[j+1,i])*.001
def rotate(p,angles):
    x,y,z=p;a,b,c=angles
    y,z=math.cos(a)*y-math.sin(a)*z,math.sin(a)*y+math.cos(a)*z
    x,z=math.cos(b)*x+math.sin(b)*z,-math.sin(b)*x+math.cos(b)*z
    return [math.cos(c)*x-math.sin(c)*y,math.sin(c)*x+math.cos(c)*y,z]
def overlap(t,dt,start,duration):return max(0,min(t+dt,start+duration)-max(t,start))/dt
native={};audits={}
for case in inputs['cases']:
    c=case['config'];p=c['protocol'];dt=c['solver']['dtMs']
    sections,soma,stub,center=model.make_cell(case['specimenId'],c['neuron']['segmentLengthUm'])
    nodes,segs=model.original.discretize(sections,soma,center)
    def world(v):
        a=rotate(v,case['orientationRadians']);b=rotate([a[0],a[2],-a[1]],[math.radians(x) for x in c['neuron']['rotationDeg']])
        return [x+c['neuron']['somaUm'][i] for i,x in enumerate(b)]
    geometry_error=0
    assert len(nodes)==len(case['nodes'])
    for a,b in zip(nodes,case['nodes']):
        for key in ['id','parent','sectionId','sectionX']:assert a[key]==b[key]
        for key in ['areaUm2','edgeUs','lengthUm','diameterUm']:geometry_error=max(geometry_error,abs(a[key]-b[key]))
        for key in ['centerUm','startUm','endUm']:geometry_error=max(geometry_error,max(abs(x-y) for x,y in zip(world(a[key]),b[key])))
    assert geometry_error<1e-8,geometry_error
    unit=sample([world(n['centerUm']) for n in nodes]);field_error=float(np.max(np.abs(unit-case['unitAppliedMvPerUa'])))
    assert field_error<1e-9,field_error
    h.nlayer_extracellular(1)
    for sec in sections:
        sec.insert('extracellular')
        for seg in sec:seg.xg[0]=1e9;seg.xc[0]=0;seg.xraxial[0]=1e9
    h.CVode().active(0);h.secondorder=0;h.dt=dt;h.steps_per_ms=1/dt
    fit=json.loads((ROOT/f"public/models/cortex/human-eap/optim_param_{case['specimenId']}.json").read_text())
    h.finitialize(fit['conditions'][0]['v_init'])
    for _ in range(round(c['solver']['settleMs']/dt)):h.fadvance()
    physical=np.array([i for i,n in enumerate(nodes) if n['areaUm2']>0])
    prev=np.array([s.v for s in segs]);traces=[prev.copy()];first=np.full(len(nodes),np.nan);spikes=[]
    stride=round(c['solver']['sampleMs']/dt)
    for step in range(1,round(c['solver']['durationMs']/dt)+1):
        t=(step-1)*dt;phase=p['phaseUs']/1000;gap=p['gapUs']/1000
        drive=p['amplitudeUa']*(-overlap(t,dt,p['startMs'],phase)+overlap(t,dt,p['startMs']+phase+gap,phase))
        # NEURON endpoint range variables alias an adjacent segment. Assigning
        # zero-area junction entries would overwrite physical forcing values.
        for i in physical:segs[i].e_extracellular=unit[i]*drive
        h.fadvance();v=np.array([s.v for s in segs]);cross=physical[(prev[physical]<-25)&(v[physical]>=-25)]
        for i in cross:
            when=t+dt*(-25-prev[i])/(v[i]-prev[i])
            if np.isnan(first[i]):first[i]=when
            if i==0 and (not spikes or when-spikes[-1]>=2):spikes.append(when)
        if step%stride==0:traces.append(v.copy())
        prev=v
    native[case['id']]={'traces':np.array(traces),'first':first,'spikes':spikes,'physical':physical}
    audits[case['id']]={'geometryMaxAbsoluteError':geometry_error,'fieldMaxMvPerUaError':field_error}
    print(case['id'],'native soma events',len(spikes),'local compartments',np.count_nonzero(np.isfinite(first[physical])),flush=True)
# Only now load browser solutions for comparison.
browser=json.loads((work/'browser-traces.json').read_text());report={'schema':'cortex-finite-native/1','gates':inputs['gates'],'runtime':{x:version(x) for x in ['neuron','numpy']},'neuronBuild':h.nrnversion(),'cases':[]}
for case in inputs['cases']:
    key=case['id'];a=native[key];b=browser[key];v=a['traces'];js=np.array(b['voltageMv']).reshape(v.shape);physical=a['physical'];error=np.abs(v-js)
    local=np.isfinite(a['first'][physical]);jsfirst=np.array([np.nan if x is None else x for x in b['firstCrossingMs']]);same_mask=np.array_equal(local,np.isfinite(jsfirst[physical]));both=physical[np.isfinite(a['first'][physical])&np.isfinite(jsfirst[physical])]
    time_error=float(np.max(np.abs(a['first'][both]-jsfirst[both]))) if len(both) else None
    gates=inputs['gates'];soma_error=float(error[:,0].max());membrane_error=float(error[:,physical].max())
    classification_match=same_mask and len(a['spikes'])==len(b['somaSpikeTimesMs'])
    passed=classification_match and soma_error<=gates['somaWaveformMaxMv'] and membrane_error<=gates['allMembraneWaveformMaxMv'] and (time_error is None or time_error<=gates['crossingTimeMaxMs'])
    report['cases'].append({'id':key,'config':case['config'],**audits[key],'maxSomaErrorMv':soma_error,'maxMembraneErrorMv':membrane_error,'rmsMembraneErrorMv':float(np.sqrt(np.mean(error[:,physical]**2))),'crossingClassificationMatch':classification_match,'maxSharedCrossingTimeErrorMs':time_error,'nativeLocalCrossingCount':int(local.sum()),'browserLocalCrossingCount':b['classification']['localCount'],'nativeSomaEvents':a['spikes'],'browserSomaEvents':b['somaSpikeTimesMs'],'nativeSomaTraceMv':v[:,0].tolist(),'browserSomaTraceMv':js[:,0].tolist(),'status':'pass' if passed else 'fail'})
report['status']='pass' if all(c['status']=='pass' for c in report['cases']) else 'fail'
paths=['scripts/cortex-finite-native.py','scripts/cortex-cell-library-model.py','scripts/cortex-active-model.py','public/models/cortex/human-eap/601927090.swc','public/models/cortex/human-eap/optim_param_601927090.json']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'scripts/cortex-active-mechanisms').glob('*.mod'))]
report['sourceHashes']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
report['compiledMechanismSha256']=hashlib.sha256(Path(os.environ['CORTEX_ACTIVE_MECHANISM_LIBRARY']).read_bytes()).hexdigest()
report['scope']='Matched finite-disk forcing and original mechanisms; independent NEURON dynamics. Shared field export and morphology adapter conventions. No independent experimental validation; no proof of propagation.'
(ROOT/'docs/cortex/finite-native-comparison.json').write_text(json.dumps(report,indent=2)+'\n')
print('RESULT',report['status'],len(report['cases']),'cases',flush=True)
