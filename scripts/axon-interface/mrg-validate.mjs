#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createMorphology,simulateCable,biphasicPulse,MRG_VERSION,MRG_SOURCE} from '../../src/lib/axon-interface/mrg.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const reportDir=path.join(root,'docs/axon-interface');
const artifactDir=path.join(reportDir,'mrg-reference-data');
fs.mkdirSync(artifactDir,{recursive:true});
const acceptance=JSON.parse(fs.readFileSync(path.join(reportDir,'mrg-acceptance.json')));
const started=performance.now(),tests=[],failures=[];
const python=process.env.MRG_PYTHON||'python3';
const sourceFiles=['src/lib/axon-interface/mrg.mjs','scripts/axon-interface/mrg-reference.py','scripts/axon-interface/mrg-validate.mjs','scripts/axon-interface/mrg-modeldb/AXNODE.mod','scripts/axon-interface/mrg-modeldb/MRGaxon.hoc','docs/axon-interface/mrg-acceptance.json'];
const sha256=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const startHashes=Object.fromEntries(sourceFiles.map(f=>[f,sha256(f)]));

function add(name,value,limit,unit,details={},required=true){const ok=typeof limit==='number'?value<=limit:value===limit;const t={name,status:ok?'pass':'fail',measured:value,limit,unit,required,...details};tests.push(t);return t;}
function compare(a,b){
 if(a.timesMs.length!==b.timesMs.length||a.timesMs.some((t,i)=>t!==b.timesMs[i]))throw new Error('Reference observation times differ; refusing alignment, interpolation or timestamp transformation.');
 const rmsPerNode=a.membraneMv.map((row,n)=>Math.sqrt(row.reduce((s,v,j)=>s+(v-b.membraneMv[n][j])**2,0)/row.length));
 const spikeCountsEqual=a.nodeEventTimes.every((row,n)=>row.length===b.nodeEventTimes[n].length);
 let maxEventDelta=0;for(let n=0;n<a.nodeEventTimes.length;n++)for(let j=0;j<a.nodeEventTimes[n].length;j++){
   const other=b.nodeEventTimes[n][j];maxEventDelta=Number.isFinite(other)?Math.max(maxEventDelta,Math.abs(a.nodeEventTimes[n][j]-other)):Infinity;
 }
 return {maximumNodeRmsMv:Math.max(...rmsPerNode),rmsPerNodeMv:rmsPerNode,spikeCountsEqual,maxEventDeltaMs:maxEventDelta};
}
function full(m,dt,mode='injected',extra={}){
 const durationMs=extra.durationMs??6;
 const transfer=m.compartments.map(c=>1000/(4*Math.PI*.3)*(1/Math.hypot(30,c.zUm)-1/Math.hypot(600,c.zUm)));
 const wave=biphasicPulse({amplitudeUa:10,onsetMs:.5,phaseMs:.1,gapMs:.05});
 const center=m.nodeIndices[Math.floor(m.nodes/2)];
 const injection=(t,i)=>i===center&&t>=.5&&t<.6?2:0;
 return simulateCable({morphology:m,dtMs:dt,durationMs,traceStride:Math.round(.005/dt),saveCurrents:true,
  ...(mode==='field'?{transferMvPerUa:transfer,waveform:wave}:mode==='injected'?{injectedCurrentNa:injection}:{}),...extra});
}
function recording(m,r){const weights=m.compartments.map(c=>1000/(4*Math.PI*.3*Math.hypot(100,c.zUm-1000)));
 return r.outerCurrentsNa.map(row=>row.reduce((s,q,i)=>s+q*weights[i],0));}
function ptp(a){return Math.max(...a)-Math.min(...a);}
function relative(a,b){return Math.abs(a-b)/Math.abs(b);}
function delay(r,dir='right'){const a=r.propagation[dir+'Arm'];return a.timesMs[2]-a.timesMs[0];}

const m=createMorphology();
const rest=full(m,.00125,'zero',{durationMs:6});
const drift=Math.max(...rest.membraneMv.flatMap(row=>row.map(v=>Math.abs(v-row[0]))));
add('Original MRG: zero-input drift, 6 ms',drift,.1,'mV',{preparationMs:20,initialCentralMv:rest.initialState.v[m.nodeIndices[5]]});
add('Original MRG: zero-input crossings',rest.events.length,0,'upward crossings');

// Retain the initial failed coarse study; refinement is the correction.
const original=createMorphology({passiveSegments:1});
const coarse=full(original,.005,'injected',{durationMs:3}),medium=full(original,.0025,'injected',{durationMs:3}),originalFine=full(original,.00125,'injected',{durationMs:3}),fine=full(m,.00125),finer=full(m,.000625),finest=full(m,.0003125);
const failed=compare(coarse,medium);
failures.push({id:'MRG-TIME-001',originalComparisonMs:[.005,.0025],originalMaximumNodeRmsMv:failed.maximumNodeRmsMv,
  originalRmsAcrossNodesMv:Math.sqrt(failed.rmsPerNodeMv.reduce((s,v)=>s+v*v,0)/failed.rmsPerNodeMv.length),criterionMv:1,
  cause:'First-order integration at 5 µs is too coarse for these action-potential waveforms.',
  correction:'Production default uses 1.25 µs; retain this failure and verify 1.25→0.625→0.3125 µs without relaxing 1 mV.'});
const secondFailure=compare(medium,originalFine);
failures.push({id:'MRG-TIME-002',originalComparisonMs:[.0025,.00125],originalMaximumNodeRmsMv:secondFailure.maximumNodeRmsMv,criterionMv:1,
 cause:'An across-node aggregate RMS hid a1.129mV endpoint error; acceptance applies to every recorded node.',correction:'Restrict verified calculation to dt≤.00125ms; use per-node maxima for acceptance.'});
add('Retained: original2.5 to1.25µs endpoint RMS',secondFailure.maximumNodeRmsMv,1,'mV',{retainedFailureId:'MRG-TIME-002'},false);
for(const [name,a,b] of [['1.25 to 0.625 µs',fine,finer],['0.625 to 0.3125 µs',finer,finest]]){
 const q=compare(a,b);add(`Time refinement ${name}: every node membrane RMS`,q.maximumNodeRmsMv,1,'mV',{rmsPerNodeMv:q.rmsPerNodeMv});
 add(`Time refinement ${name}: identical crossing counts`,q.spikeCountsEqual,true,'boolean');add(`Time refinement ${name}: event timing`,q.maxEventDeltaMs,.1,'ms');
}
const refinements=[1,3,5,7].map(n=>{const morphology=createMorphology({passiveSegments:n});return {m:morphology,r:full(morphology,.000625)}});
for(let k=1;k<refinements.length;k++){
 const a=refinements[k-1],b=refinements[k];
 add(`Spatial refinement ${a.m.passiveSegments} to ${b.m.passiveSegments}: conduction delay`,relative(delay(a.r),delay(b.r)),.05,'fraction',{delaysMs:[delay(a.r),delay(b.r)]},k>1);
 const pa=ptp(recording(a.m,a.r)),pb=ptp(recording(b.m,b.r));
 add(`Spatial refinement ${a.m.passiveSegments} to ${b.m.passiveSegments}: recording peak-to-peak`,relative(pa,pb),.1,'fraction',{peaksUv:[pa,pb],recordingPointUm:[100,0,1000],sigmaSm:.3},k>1);
 if(k===1)failures.push({id:'MRG-SPACE-001',originalPassiveSegments:[1,3],conductionRelativeError:relative(delay(a.r),delay(b.r)),recordingRelativeError:relative(pa,pb),
  limits:{conduction:.05,recording:.1},cause:'Original single-segment passive sections do not meet the requested refinement gates for this experiment.',correction:'Production default uses3 segments per passive section (311 compartments for11nodes);3→5 and5→7 are published. Original failed comparisons remain in tests.'});
}
const replay=full(m,.00125);
add('Deterministic same-runtime replay',JSON.stringify(fine)===JSON.stringify(replay),true,'boolean');
add('Cable KCL residual',fine.diagnostics.maxCurrentResidualNa,1e-8,'nA',{diagnostic:true});
const sumError=Math.max(...fine.outerCurrentsNa.map((row,k)=>Math.abs(row.reduce((s,x)=>s+x,0)-((fine.timesMs[k]>.5&&fine.timesMs[k]<=.6)?2:0))));
add('Source-current global conservation',sumError,1e-8,'nA',{diagnostic:true});

// The requested SG-like morphology is kept explicitly exploratory. An unchanged
// MRG node expanded to a soma is an observed model failure, not a silent retune.
const activeSoma=createMorphology({somaDiameterUm:20,somaActiveScale:1,passiveSegments:1});
const bad=full(activeSoma,.00125,'zero',{durationMs:6});
const badDrift=Math.max(...bad.membraneMv.flatMap(row=>row.map(v=>Math.abs(v-row[0]))));
failures.push({id:'MRG-SOMA-001',somaDiameterUm:20,somaActiveScale:1,measuredDriftMv:badDrift,upwardCrossings:bad.events.length,observationMs:6,equilibrationMs:20,
 criterionMv:.1,criterionSpikes:0,cause:'Unmodified nodal MRG conductance densities are not soma physiology; enlarging the node generates spontaneous activity.',
 correction:'Original straight motor-fiber benchmark remains default. An explicitly passive synthetic soma (scale=0) is a distinct exploratory loading model; it does not repair or validate the failed active-soma model.'});
const passive=createMorphology({somaDiameterUm:20,somaActiveScale:0});
const passiveRest=full(passive,.00125,'zero',{durationMs:6});
add('Exploratory passive soma: zero-input drift',Math.max(...passiveRest.membraneMv.flatMap(row=>row.map(v=>Math.abs(v-row[0])))),.1,'mV',{scope:'Passive loading model only; not active soma addressing.'});
add('Exploratory passive soma: zero-input crossings',passiveRest.events.length,0,'upward crossings');
for(const [tag,morph] of [['motor',m],['passive-soma',passive]]){
 const r1=full(morph,.00125,'field'),r2=full(morph,.000625,'field'),r3=full(morph,.0003125,'field');
 for(const [level,a,b] of [['1.25→0.625µs',r1,r2],['0.625→0.3125µs',r2,r3]]){
  const c=compare(a,b);add(`Extracellular ${tag} ${level}: every node membrane RMS`,c.maximumNodeRmsMv,1,'mV');
  add(`Extracellular ${tag} ${level}: identical crossing counts`,c.spikeCountsEqual,true,'boolean');
  add(`Extracellular ${tag} ${level}: event timing`,c.maxEventDeltaMs,.1,'ms');
 }
}

const referenceCases=[
 {id:'motor-10-intracellular',m,mode:'injected'},
 {id:'motor-10-extracellular',m,mode:'field'},
 {id:'motor-5p7-extracellular',m:createMorphology({fiberDiameterUm:5.7}),mode:'field'},
 {id:'passive-soma-20-extracellular',m:passive,mode:'field'},
 {id:'motor-proximal-silenced',m,mode:'field',silencedCompartments:[m.nodeIndices[4],m.nodeIndices[5],m.nodeIndices[6]]},
 {id:'motor-all-silenced',m,mode:'field',silencedCompartments:m.nodeIndices}
];
for(const rc of referenceCases){
 const dt=.00125,durationMs=6,wm=biphasicPulse({amplitudeUa:10}),center=rc.m.nodeIndices[Math.floor(rc.m.nodes/2)];
 const fixture={fiberDiameterUm:rc.m.fiberDiameterUm,nodes:rc.m.nodes,passiveSegments:rc.m.passiveSegments,somaDiameterUm:rc.m.somaDiameterUm,somaActiveScale:rc.m.somaActiveScale,
   dtMs:dt,durationMs,equilibrationMs:20,traceStride:4,saveCurrents:true,injectedCompartment:center,silencedCompartments:rc.silencedCompartments??[]};
 if(rc.mode==='injected')fixture.injectedWaveformNa=Array.from({length:durationMs/dt},(_,k)=>k*dt>=.5&&k*dt<.6?2:0);
 else {fixture.transferMvPerUa=rc.m.compartments.map(c=>1000/(4*Math.PI*.3)*(1/Math.hypot(30,c.zUm)-1/Math.hypot(600,c.zUm)));fixture.waveformUa=Array.from({length:durationMs/dt},(_,k)=>wm(k*dt));}
 const input=path.join(artifactDir,rc.id+'-input.json'),output=path.join(artifactDir,rc.id+'-neuron.json');
 fs.writeFileSync(input,JSON.stringify(fixture));
 const child=spawnSync(python,[path.join(here,'mrg-reference.py'),input,output],{encoding:'utf8',timeout:120000});
 if(child.status!==0){add(`Independent NEURON ${rc.id}`,false,true,'boolean',{error:child.stderr||child.error?.message||child.stdout});continue;}
 const native=JSON.parse(fs.readFileSync(output));const js=full(rc.m,dt,rc.mode,{silencedCompartments:rc.silencedCompartments??[]});const c=compare(js,native);
 add(`Independent NEURON ${rc.id}: every node membrane RMS`,c.maximumNodeRmsMv,1,'mV',{rmsPerNodeMv:c.rmsPerNodeMv,runtime:native.runtime});
 add(`Independent NEURON ${rc.id}: identical crossing counts`,c.spikeCountsEqual,true,'boolean');
 add(`Independent NEURON ${rc.id}: event timing`,c.maxEventDeltaMs,.1,'ms');
 const a=recording(rc.m,js),b=recording(rc.m,native);add(`Independent Python reciprocal recording ${rc.id}`,Math.max(...a.map((v,i)=>Math.abs(v-b[i]))),.001,'µV',
  {scope:'Same physical source locations and homogeneous recording coefficients; native NEURON voltages and independently rebuilt Python axial conductances.',amplitudeRescaling:false,timeShiftMs:0,baselineSubtraction:false});
 fs.writeFileSync(path.join(artifactDir,rc.id+'-comparison.json'),JSON.stringify({timesMs:js.timesMs,jsMembraneMv:js.membraneMv,neuronMembraneMv:native.membraneMv,jsRecordingUv:a,neuronRecordingUv:b}));
}

// Published class-band checks are deliberately broad and not organoid fits.
for(const [D,band,className] of [[10,[35,75],'Aβ diameter/conduction band'],[16,[80,120],'Aα diameter/conduction band']]){
 const morph=createMorphology({fiberDiameterUm:D,nodes:21});const center=morph.nodeIndices[10];
 const r=full(morph,.000625,'injected',{injectedCurrentNa:(t,i)=>i===center&&t>=.5&&t<.6?10:0});const cv=r.propagation.rightVelocityMps;
 add(`Diameter ${D} µm: published ${className}`,cv!==null&&cv>=band[0]&&cv<=band[1],true,'boolean',{velocityMps:cv,bandMps:band,injectedPulseNa:10,source:'Build prompt physiological class bands; MRG source model is a mammalian motor fiber, not a sensory identity calibration.'});
}
const subthresholdMorphology=createMorphology({fiberDiameterUm:16,nodes:21});
const subthreshold=full(subthresholdMorphology,.000625);
failures.push({id:'MRG-CV-001',fiberDiameterUm:16,injectedPulseNa:2,observedPropagation:subthreshold.propagation.rightArm.propagated,measuredVelocityMps:subthreshold.propagation.rightVelocityMps,upwardCrossings:subthreshold.events.length,cause:'The original 10 µm 2 nA verification stimulus was subthreshold for the 16 µm cable; no velocity can be computed.',correction:'This experiment is rerun on the reconstruction; a separate declared 10 nA suprathreshold experiment measures conduction.'});
add('Retained: 16 µm 2 nA benchmark did not establish conduction',subthreshold.propagation.rightArm.propagated,true,'boolean',{retainedFailureId:'MRG-CV-001'},false);

// Diagnostic only: there is no post hoc tolerance or channel retuning to make
// a motor-fiber implementation a calibrated species or ganglion-cell model.
const conductionLiteratureComparison=[];
for(const D of [10,16]){
 const morph=createMorphology({fiberDiameterUm:D,nodes:41,passiveSegments:7}),center=morph.nodeIndices[20];
 const run=full(morph,.0003125,'injected',{saveCurrents:false,injectedCurrentNa:(t,i)=>i===center&&t>=.5&&t<.6?10:0});
 const ordinals=[28,33],arrival=ordinals.map(n=>run.nodeEventTimes[n][0]);
 if(!arrival.every(Number.isFinite)||!(arrival[1]>arrival[0]))throw new Error(`No ordered propagation in the ${D} µm long-cable diagnostic.`);
 const distance=morph.compartments[morph.nodeIndices[33]].zUm-morph.compartments[morph.nodeIndices[28]].zUm;
 const measuredVelocityMps=distance/(arrival[1]-arrival[0])/1000,literatureLineMps=5.66*D;
 conductionLiteratureComparison.push({fiberDiameterUm:D,measuredVelocityMps,literatureLineMps,fractionalDifference:(measuredVelocityMps-literatureLineMps)/literatureLineMps,
   nodes:41,passiveSegments:7,dtMs:.0003125,injectedPulseNa:10,observationNodeOrdinals:ordinals,arrivalTimesMs:arrival,
   source:'MRG (2002), Figure 8, larger cat fiber line CV = 5.66 D; Boyd and Kalu (1979).',
   sourceUrl:'https://journals.physiology.org/doi/full/10.1152/jn.00353.2001',
   status:'unresolved physiological comparison; no acceptance tolerance was invented after observing the discrepancy'});
}
const endHashes=Object.fromEntries(sourceFiles.map(f=>[f,sha256(f)]));
const sourceChangedDuringRun=sourceFiles.filter(f=>startHashes[f]!==endHashes[f]);
if(sourceChangedDuringRun.length)add('Source stability during numerical studies',false,true,'boolean',{changedFiles:sourceChangedDuringRun});
const report={modelVersion:MRG_VERSION,source:MRG_SOURCE,generatedAt:new Date().toISOString(),acceptance,
 runtime:{node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,elapsedSeconds:(performance.now()-started)/1000},
 sourceHashes:startHashes,sourceChangedDuringRun,tests,retainedFailures:failures,conductionLiteratureComparison,
 recovery:{exactFormerSourceRecovered:false,formerSourceSha256:'6ec9e9576c6a2d6aecfb832f636896dfb0955d299c96e47ed183d69e9f5d3e1f',freshlyExecuted:true,upstreamBytesRecoveredExactly:true},
 summary:{requiredPass:tests.filter(t=>t.required&&t.status==='pass').length,requiredFail:tests.filter(t=>t.required&&t.status==='fail').length,
   numericalGatePassed:tests.every(t=>!t.required||t.status==='pass'),biologicalValidation:false,activeSomaValidated:false,publishedDiameterRelationValidated:false},
 limitations:['Agreement verifies implementation of stated equations, not biological prediction.','MRG is a mammalian motor-fiber model; no spiral-ganglion morphologies or channel fits are measured here.',
  'The active enlarged-soma variant fails zero-input acceptance and remains a retained failure.','The passive soma is only a hypothetical electrical load, not an excitable spiral-ganglion cell.',
  'Extracellular test coefficients are homogeneous analytic benchmark fields. The resolved layered tissue field has its own independent validation report.',
  'The recovered upstream source is exact, but the JavaScript reconstruction is a new revision. Every current pass was rerun.',
  'Earlier compiler failure is historical: this reconstruction explicitly selected GCC/G++ and built the unchanged mechanism successfully.']};
fs.writeFileSync(path.join(reportDir,'mrg-numerical-report.json'),JSON.stringify(report,null,2)+'\n');
fs.appendFileSync(path.join(reportDir,'mrg-validation-history.jsonl'),JSON.stringify({phase:'reconstructed numerical verification',report})+'\n');
console.log(JSON.stringify({summary:report.summary,tests:tests.map(t=>({name:t.name,status:t.status,value:t.measured})),retainedFailures:failures,seconds:report.runtime.elapsedSeconds},null,2));
if(!report.summary.numericalGatePassed)process.exitCode=1;

// RECOVERY NOTE: Body recovered from a pre-final source read. The later
// species-line conduction diagnostic and validator self-hash additions were
// not present in that read. This is not the exact final verified source.
