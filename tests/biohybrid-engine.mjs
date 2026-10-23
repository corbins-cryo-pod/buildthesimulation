import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,MODEL_VERSION,normalizeSettings,createGeometry,runSimulation,hhRates,equilibriumMv,createCable,stepCable,
  prepareFields,diskSamples,diskMembraneClearanceUm,stimulusMean,stimulusAt} from '../src/lib/biohybrid/model.js';
import {PRESETS} from '../src/lib/biohybrid/presets.js';
import {pointTransferUvPerNa} from '../src/lib/cortex/volume-conductor.js';
// Gates predeclared in SCIENTIFIC_ARCHITECTURE.md, not weakened after failure.
const base=runSimulation();
const sampleRms=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);
const maxAbs=a=>a.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
const relative=(a,b)=>Math.abs(a-b)/Math.abs(b);
const somas=r=>r.spikes.filter(s=>s.kind==='soma');

test('biohybrid: canonical HH rates are finite at removable singularities',()=>{
  for(const v of [-100,-65,-55,-40,0,50]){
    const r=hhRates(v);assert.ok(r.every(Number.isFinite));
    for(let i=0;i<6;i+=2){assert.ok(r[i]>=0&&r[i]<=1);assert.ok(r[i+1]>0);}
  }
  const cold=hhRates(-65,6.3),warm=hhRates(-65,16.3);
  for(let i=0;i<6;i+=2){assert.equal(cold[i],warm[i]);assert.ok(Math.abs(cold[i+1]/warm[i+1]-3)<1e-12);}
});
test('biohybrid: geometry forms five independent conservative branched cables',()=>{
  const {nodes,neurons,synapses}=base.geometry;
  assert.equal(neurons.length,5);assert.equal(nodes.filter(n=>n.parent===-1).length,5);
  assert.equal(synapses.length,6);assert.ok(nodes.some(n=>n.kind==='junction'));
  nodes.forEach((n,i)=>{
    assert.equal(n.index,i);assert.ok(n.parent<i);
    if(n.parent>=0){assert.ok(n.edgeUs>0);assert.equal(nodes[n.parent].neuronId,n.neuronId);}
    if(n.kind==='junction')assert.equal(n.areaUm2,0);else assert.ok(n.areaUm2>0&&n.diameterUm>0);
  });
});
test('biohybrid: resting potential is stable with zero input and produces no spontaneous spikes',()=>{
  const r=runSimulation({stimAmplitudeUa:0});
  assert.equal(r.spikes.length,0);assert.equal(r.metrics.synapticEvents,0);
  for(const t of r.traces)assert.ok(maxAbs(t.values.map(v=>v-r.diagnostics.restMv))<.1);
  for(const trace of r.recordings)assert.ok(maxAbs(trace.neuralUv)<1e-8);
  assert.ok(r.diagnostics.maxCurrentBalanceNa<1e-8);
});
test('biohybrid: default pulses produce calculated graft propagation and host recruitment',()=>{
  assert.equal(base.modelVersion,MODEL_VERSION);assert.equal(base.metrics.recruitedHosts,3);
  assert.equal(base.metrics.relayConsistentHosts,3);assert.equal(base.metrics.earlyHostSpikes,0);
  assert.ok(base.metrics.successfulTransmission);assert.equal(somas(base).length,10);
  assert.ok(base.metrics.firstGraftSpikeMs>base.settings.stimStartMs);
  assert.ok(base.metrics.conductionDelayMs>0&&base.metrics.conductionDelayMs<10);
  assert.ok(base.metrics.firstHostSpikeMs>base.metrics.firstGraftSpikeMs+base.metrics.conductionDelayMs);
  for(const tr of base.traces)assert.ok(Math.max(...tr.values)>20);
  assert.ok(base.diagnostics.maxCurrentBalanceNa<1e-8);
});
test('biohybrid: eliminating synaptic conductance retains graft activity and removes host spikes',()=>{
  const r=runSimulation({synapticWeightUs:0});
  assert.equal(r.metrics.recruitedHosts,0);assert.equal(r.metrics.successfulTransmission,false);
  assert.equal(r.geometry.nodes.length,base.geometry.nodes.length);assert.equal(r.synapticEvents.length,0);
  assert.deepEqual(r.traces.filter(t=>t.id.startsWith('graft')).map(t=>t.values),base.traces.filter(t=>t.id.startsWith('graft')).map(t=>t.values));
  assert.equal(somas(r).length,4);
  assert.ok(r.metrics.recordingPeakToPeakUv.some(v=>v>0));
});
test('biohybrid: reducing connection distribution recruits only its assigned host',()=>{
  const r=runSimulation({connectedHosts:1});
  assert.equal(r.metrics.recruitedHosts,1);assert.equal(r.metrics.activeConnections,2);
  assert.deepEqual([...new Set(somas(r).filter(s=>s.neuronId.startsWith('host')).map(s=>s.neuronId))],['host-1']);
});
test('biohybrid: subthreshold amplitude fails and polarity reverses the initial polarization',()=>{
  const low=runSimulation({stimAmplitudeUa:-12,pulseCount:1,durationMs:25});
  const reversed=runSimulation({stimAmplitudeUa:12,pulseCount:1,durationMs:25});
  assert.equal(low.metrics.somaSpikeCount,0);assert.equal(reversed.metrics.somaSpikeCount,0);
  const index=low.timeMs.findIndex(t=>t>=5.15);
  assert.ok(low.traces[0].values[index]>low.diagnostics.restMv);
  assert.ok(reversed.traces[0].values[index]<reversed.diagnostics.restMv);
  assert.ok(base.metrics.somaSpikeCount>0);
});
test('biohybrid: each biphasic pulse is charge balanced including fractional integration intervals',()=>{
  const s=normalizeSettings({pulseWidthMs:.333,pulseGapMs:.071,pulseCount:1,durationMs:25});
  let charge=0;
  for(let j=0;j<5000;j++)charge+=stimulusMean(j*.005,(j+1)*.005,s)*.005;
  assert.ok(Math.abs(charge)<1e-9);
  assert.equal(stimulusAt(s.stimStartMs+.1,s),s.stimAmplitudeUa);
  assert.equal(stimulusAt(s.stimStartMs+s.pulseWidthMs+s.pulseGapMs+.1,s),-s.stimAmplitudeUa);
});
test('biohybrid: longer and thinner axons increase calculated conduction delay',()=>{
  const thin=runSimulation({axonDiameterUm:1,pulseCount:1,durationMs:25});
  const long=runSimulation({axonLengthUm:1800,pulseCount:1,durationMs:25});
  assert.ok(thin.metrics.conductionDelayMs>base.metrics.conductionDelayMs*1.2);
  assert.ok(long.metrics.conductionDelayMs>base.metrics.conductionDelayMs*1.5);
  assert.ok(long.metrics.conductionVelocityMPerS>0);
});
test('biohybrid: greater passive recording distance attenuates this configuration without changing Vm',()=>{
  const r=runSimulation({recordDistanceUm:200});
  assert.deepEqual(r.voltageMv,base.voltageMv);assert.deepEqual(r.spikes,base.spikes);
  r.metrics.recordingPeakToPeakUv.forEach((v,i)=>assert.ok(v<base.metrics.recordingPeakToPeakUv[i]));
});
test('biohybrid: conductivity scales the fixed-source forward kernel inversely',()=>{
  const a=prepareFields(base.geometry,base.settings),b=prepareFields(base.geometry,{...base.settings,conductivitySPerM:.6});
  a.lead.forEach((lead,k)=>lead.coefficients.forEach((v,i)=>assert.ok(Math.abs(b.lead[k].coefficients[i]-.5*v)<1e-11)));
  a.stimulusMvPerUa.forEach((v,i)=>assert.ok(Math.abs(b.stimulusMvPerUa[i]-.5*v)<1e-11));
});
test('biohybrid: finite disk averages approach a distant point-contact field',()=>{
  const c={positionUm:[0,0,0],radiusUm:10,normal:[0,0,1]},p=[0,0,1000];
  const samples=diskSamples(c),mean=samples.reduce((sum,x)=>sum+pointTransferUvPerNa(p,x,.3),0)/samples.length;
  const point=pointTransferUvPerNa(p,c.positionUm,.3);
  assert.ok(relative(mean,point)<.001);
  const exact=1000/(2*Math.PI*.3*c.radiusUm**2)*(Math.sqrt(p[2]**2+c.radiusUm**2)-p[2]);
  assert.ok(relative(mean,exact)<1e-6);
});
test('biohybrid: complete disk clearance catches an intersection between quadrature points',()=>{
  const contact={positionUm:[0,0,0],radiusUm:20,normal:[0,0,1]};
  const n={kind:'axon',startUm:[-30,0,0],endUm:[30,0,0],diameterUm:1};
  assert.ok(diskMembraneClearanceUm(contact,n)<0);
  assert.throws(()=>prepareFields({...base.geometry,contacts:[{...contact,id:'stim',kind:'stim'},...base.geometry.contacts.filter(c=>c.kind!=='stim')]},base.settings),/membrane/);
});
test('biohybrid: dt halving meets predeclared Vm RMS and event timing criteria',()=>{
  const fine=runSimulation({dtMs:.0025});
  for(let i=0;i<base.traces.length;i++)assert.ok(sampleRms(base.traces[i].values,fine.traces[i].values)<=1,`trace ${i} RMS`);
  assert.equal(base.spikes.length,fine.spikes.length);
  for(let i=0;i<base.spikes.length;i++){assert.equal(base.spikes[i].neuronId,fine.spikes[i].neuronId);assert.ok(Math.abs(base.spikes[i].timeMs-fine.spikes[i].timeMs)<=.1);}
});
test('biohybrid: spatial refinement preserves anatomical contacts and meets frozen delay/EAP gates',()=>{
  const fine=runSimulation({segmentLengthUm:12.5});
  base.geometry.synapses.forEach((syn,i)=>assert.deepEqual(syn.positionUm,fine.geometry.synapses[i].positionUm));
  assert.ok(relative(base.metrics.conductionDelayMs,fine.metrics.conductionDelayMs)<=.05);
  base.metrics.recordingPeakToPeakUv.forEach((v,i)=>assert.ok(relative(v,fine.metrics.recordingPeakToPeakUv[i])<=.1));
  assert.equal(base.metrics.recruitedHosts,fine.metrics.recruitedHosts);
});
test('biohybrid: deterministic replay preserves all computed electrical samples and events',()=>{
  const replay=runSimulation(base.settings);
  assert.deepEqual(replay.voltageMv,base.voltageMv);assert.deepEqual(replay.spikes,base.spikes);
  assert.deepEqual(replay.recordings,base.recordings);assert.deepEqual(replay.stimulusUa,base.stimulusUa);
});
test('biohybrid: neural signal and applied artifact remain explicitly separate',()=>{
  for(const tr of base.recordings)for(let i=0;i<base.timeMs.length;i++)assert.equal(tr.totalUv[i],tr.neuralUv[i]+tr.artifactUv[i]);
  const index=base.timeMs.findIndex(t=>t>=5.1);
  assert.ok(Math.abs(base.recordings[0].artifactUv[index])>Math.abs(base.recordings[0].neuralUv[index]));
  assert.equal(base.recordings[0].artifactUv.at(-1),0);
});
test('biohybrid: all seven experiments normalize and retain documented physical units',()=>{
  assert.equal(PRESETS.length,7);
  for(const p of PRESETS){const s=normalizeSettings(p.settings);assert.ok(s.dtMs>0&&s.conductivitySPerM>0);}
  assert.throws(()=>normalizeSettings({dtMs:0}),/dtMs/);
  assert.throws(()=>normalizeSettings({synapticWeightUs:NaN}),/synapticWeightUs/);
  assert.throws(()=>normalizeSettings({sampleDtMs:.051}),/integer multiple/);
});
test('biohybrid: current bookkeeping satisfies local Kirchhoff balance including branch junctions',()=>{
  const geometry=createGeometry(normalizeSettings({graftCount:1,hostCount:1,connectedHosts:0}));
  const c=createCable(geometry.nodes,DEFAULT_SETTINGS),injection=new Float64Array(c.n);injection[0]=.2;
  for(let j=0;j<20;j++)stepCable(c,.005,{injectionNa:injection});
  const balance=Float64Array.from(c.membraneCurrentNa,(v,i)=>v-injection[i]);
  geometry.nodes.forEach((node,i)=>{if(node.parent>=0){const axial=node.edgeUs*(c.voltageMv[i]-c.voltageMv[node.parent]);balance[i]+=axial;balance[node.parent]-=axial;}});
  assert.ok(maxAbs(balance)<1e-8);
});


test('biohybrid: crossings within one solver step remain chronologically ordered',()=>{
  // Before the post-solve ordering correction, host-1 at 11.148292 ms preceded
  // host-5 at 11.136117 ms in the event list because monitors iterated by ID.
  const r=runSimulation({hostCount:5,connectedHosts:5,synapticWeightUs:.025,dtMs:.025,pulseCount:1,durationMs:25});
  assert.ok(r.spikes.every((spike,i)=>i===0||spike.timeMs>=r.spikes[i-1].timeMs));
  const host=r.spikes.filter(spike=>spike.kind==='soma'&&spike.neuronId.startsWith('host'));
  assert.equal(host.length,5);assert.equal(r.metrics.firstHostSpikeMs,Math.min(...host.map(spike=>spike.timeMs)));
  assert.equal(r.metrics.relayDelayMs,r.metrics.firstHostSpikeMs-r.metrics.firstGraftSpikeMs);
});
