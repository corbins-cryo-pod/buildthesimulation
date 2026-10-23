import {createGeometry, MODEL_VERSION, OBSERVATION_VERSION, normalizeSettings, runSimulation} from './model.js';

/** Controlled experiments over the same explicit cable solver used by the lab. */
export const PROTOCOL_VERSION='biohybrid-protocol/1.0.0';
export const PROTOCOL_LIMITS=Object.freeze({maxPoints:7,maxRuns:14,maxNodeSteps:120_000_000,maxSavedVoltageValues:8_000_000});
export const PROTOCOL_AXES=Object.freeze([
  {id:'stimAmplitudeUa',label:'First-phase current',unit:'µA',min:-100,max:100,values:[-6,-12,-18,-24,-30]},
  {id:'synapticWeightUs',label:'Each synaptic connection',unit:'µS',min:0,max:.1,values:[0,.005,.01,.025,.05]},
  {id:'recordDistanceUm',label:'Recording contact height',unit:'µm',min:45,max:400,values:[60,100,150,200,300]},
  {id:'axonDiameterUm',label:'Axon diameter',unit:'µm',min:.6,max:5,values:[.8,1.2,2,3,4]},
  {id:'conductivitySPerM',label:'Tissue conductivity',unit:'S/m',min:.1,max:.6,values:[.15,.225,.3,.45,.6]},
].map(axis=>Object.freeze({...axis,values:Object.freeze(axis.values)})));
export const DEFAULT_PROTOCOL=Object.freeze({kind:'causal',axis:'stimAmplitudeUa',values:PROTOCOL_AXES[0].values,paired:true});

const LIMITATIONS=Object.freeze([
  'A deterministic synthetic network is sampled. Recruited-cell counts are not biological activation probabilities.',
  'Synapses-off comparisons remove only assigned host–graft conductance. They do not simulate pharmacology, tissue injury, cell death or inflammation.',
  'Activity lost after conductance removal supports dependence within this mathematical model. Persistent activity can include direct electrical activation; a temporal sequence alone is not causal proof.',
  'Source components are exact bookkeeping of the assumed linear forward model. An experimental electrode does not separately measure graft and host currents.',
  'Adjacent sampled response changes are brackets between calculated cases, not fitted thresholds. Untested values, nonmonotone responses and different geometries can change the result.',
  'Conductivity sweeps recalculate stimulation and membrane currents as well as recording transfer. They are not fixed-current inverse-conductivity tests.',
  'The canonical Hodgkin–Huxley benchmark and synthetic morphology remain uncalibrated to mammalian grafts or implanted devices.',
  'Charge density uses the nominal disk geometric area. It does not model electrode impedance, polarization, electrochemistry or an electrochemical safety limit.',
]);

const cloneSettings=settings=>({...normalizeSettings(settings)});
const settingsFor=(base,p,value)=>p.kind==='sweep'?cloneSettings({...base,[p.axis]:value}):cloneSettings(base);

/** Reject malformed or excessive protocols before starting any numerical run. */
export function normalizeProtocol(input=DEFAULT_PROTOCOL,baseSettings={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Protocol must be an object.');
  const kind=input.kind??'causal';
  if(!['causal','sweep'].includes(kind))throw new Error('Protocol kind must be causal or sweep.');
  const base=cloneSettings(baseSettings);
  let axis=null,values=[],paired=true;
  if(kind==='sweep'){
    axis=input.axis??PROTOCOL_AXES[0].id;
    const definition=PROTOCOL_AXES.find(item=>item.id===axis);
    if(!definition)throw new Error('Unsupported protocol parameter.');
    const supplied=input.values??definition.values;
    if(!Array.isArray(supplied)||supplied.length<2||supplied.length>PROTOCOL_LIMITS.maxPoints)throw new Error('A sweep requires 2–7 sampled parameter values.');
    if(supplied.some(value=>typeof value!=='number'||!Number.isFinite(value)))throw new Error('Sweep values must be finite numbers.');
    values=[...supplied];
    if(new Set(values).size!==values.length)throw new Error('Sweep values must be unique.');
    const direction=Math.sign(values[1]-values[0]);
    if(values.slice(1).some((value,i)=>Math.sign(value-values[i])!==direction))throw new Error('Sweep values must be in strictly increasing or decreasing order.');
    if(input.paired!==undefined&&typeof input.paired!=='boolean')throw new Error('Paired control must be true or false.');
    paired=input.paired??true;
  }
  const protocol={kind,axis,values,paired};
  const cases=kind==='causal'?[null]:values;
  const runsPerCase=kind==='causal'?3:paired?2:1;
  let estimatedNodeSteps=0,maxSavedVoltageValues=0;
  for(const value of cases){
    // Validate numerical parameter ranges now. Unsupported placements remain
    // visible per-case failures in runProtocol, rather than fabricated zeros.
    const settings=settingsFor(base,protocol,value),nodeCount=createGeometry(settings).nodes.length;
    estimatedNodeSteps+=nodeCount*Math.round(settings.durationMs/settings.dtMs)*runsPerCase;
    maxSavedVoltageValues=Math.max(maxSavedVoltageValues,nodeCount*(Math.round(settings.durationMs/settings.sampleDtMs)+1));
  }
  const estimatedRuns=cases.length*runsPerCase;
  if(estimatedRuns>PROTOCOL_LIMITS.maxRuns||estimatedNodeSteps>PROTOCOL_LIMITS.maxNodeSteps||maxSavedVoltageValues>PROTOCOL_LIMITS.maxSavedVoltageValues){
    throw new Error(`Protocol exceeds the browser work budget (${estimatedRuns} runs; ${estimatedNodeSteps.toLocaleString('en-US')} node-steps; ${maxSavedVoltageValues.toLocaleString('en-US')} saved voltage values per run). Split the sweep or reduce the population. Solver resolution is never changed automatically.`);
  }
  return {...protocol,estimatedRuns,estimatedNodeSteps,maxSavedVoltageValues};
}

const peakToPeak=values=>{let min=Infinity,max=-Infinity;for(const value of values){min=Math.min(min,value);max=Math.max(max,value);}return max-min;};

/** Geometric dose bookkeeping; no electrochemical or tissue-safety model. */
export function stimulationDose(settings){
  const s=normalizeSettings(settings),phase=s.stimAmplitudeUa*s.pulseWidthMs,area=Math.PI*s.contactRadiusUm**2;
  return {firstPhaseChargeNc:phase,absolutePhaseChargeNc:Math.abs(phase),netChargeNc:0,totalAbsoluteChargeNc:2*Math.abs(phase)*s.pulseCount,
    geometricContactAreaUm2:area,absolutePhaseChargeDensityUcPerCm2:Math.abs(phase)*1e5/area};
}

/** Retain physical measurements, not complete voltage movies, for a sweep. */
export function summarizeRun(result){
  const hosts=result.geometry.neurons.filter(neuron=>neuron.role==='host').map(neuron=>{
    const spikes=result.spikes.filter(spike=>spike.neuronId===neuron.id&&spike.kind==='soma');
    const relayConsistentSpikes=spikes.filter(spike=>result.synapticEvents.some(event=>event.postNeuronId===neuron.id&&event.appliedTimeMs<spike.timeMs)).length;
    return {id:neuron.id,somaSpikes:spikes.length,spikeTimesMs:spikes.map(spike=>spike.timeMs),firstSpikeMs:spikes[0]?.timeMs??null,
      relayConsistentSpikes,earlySpikes:spikes.length-relayConsistentSpikes};
  });
  const grafts=result.geometry.neurons.filter(neuron=>neuron.role==='graft').map(neuron=>{
    const soma=result.spikes.filter(spike=>spike.neuronId===neuron.id&&spike.kind==='soma');
    const terminal=result.spikes.filter(spike=>spike.neuronId===neuron.id&&spike.kind==='terminal');
    return {id:neuron.id,somaSpikes:soma.length,terminalSpikes:terminal.length,firstSomaMs:soma[0]?.timeMs??null,firstTerminalMs:terminal[0]?.timeMs??null};
  });
  const recordings=result.recordings.map(record=>{
    let sourceResidualMaxUv=0;
    for(let i=0;i<record.neuralUv.length;i++)sourceResidualMaxUv=Math.max(sourceResidualMaxUv,Math.abs(record.neuralUv[i]-record.graftUv[i]-record.hostUv[i]));
    return {id:record.id,neuralPeakToPeakUv:peakToPeak(record.neuralUv),graftPeakToPeakUv:peakToPeak(record.graftUv),hostPeakToPeakUv:peakToPeak(record.hostUv),
      artifactPeakToPeakUv:peakToPeak(record.artifactUv),totalPeakToPeakUv:peakToPeak(record.totalUv),sourceResidualMaxUv};
  });
  const s=result.settings;
  return {status:'ok',settings:{...s},metrics:{...result.metrics,totalMonitoredSpikes:result.spikes.length,recordingPeakToPeakUv:[...result.metrics.recordingPeakToPeakUv]},hosts,grafts,recordings,
    dose:stimulationDose(s),
    diagnostics:Object.fromEntries(['dtMs','sampleDtMs','segmentLengthUm','steps','frames','maxCurrentBalanceNa'].map(key=>[key,result.diagnostics[key]]))};
}

/** Matched intervention; no inference from extracellular amplitude alone. */
export function compareControls(baseline,blocked){
  if(baseline?.status!=='ok'||blocked?.status!=='ok')return null;
  if(blocked.settings.synapticWeightUs!==0)throw new Error('The matched control must remove host–graft synaptic conductance.');
  for(const key of new Set([...Object.keys(baseline.settings),...Object.keys(blocked.settings)])){
    if(key!=='synapticWeightUs'&&baseline.settings[key]!==blocked.settings[key])throw new Error(`Matched control changed ${key}; only synapticWeightUs may differ.`);
  }
  if(baseline.hosts.length!==blocked.hosts.length)throw new Error('Matched control has a different host population.');
  const hosts=baseline.hosts.map(host=>{
    const control=blocked.hosts.find(item=>item.id===host.id);
    if(!control)throw new Error(`Matched control is missing ${host.id}.`);
    const classification=host.somaSpikes>0?(control.somaSpikes>0?'persists-with-block':'lost-with-block'):(control.somaSpikes>0?'appears-with-block':'silent');
    return {id:host.id,baselineSpikes:host.somaSpikes,blockedSpikes:control.somaSpikes,baselineFirstMs:host.firstSpikeMs,blockedFirstMs:control.firstSpikeMs,classification};
  });
  const count=classification=>hosts.filter(host=>host.classification===classification).length;
  const lostHosts=count('lost-with-block'),persistentHosts=count('persists-with-block'),appearingHosts=count('appears-with-block'),silentHosts=count('silent');
  const interpretation=[
    lostHosts?`${lostHosts} host${lostHosts===1?'':'s'} lost all somatic spikes when modeled host–graft conductance was removed. This supports synaptic dependence for those cells under these exact settings.`:'',
    persistentHosts?`${persistentHosts} host${persistentHosts===1?'':'s'} still spiked without host–graft synaptic conductance. Those intact responses do not establish exclusive synaptic mediation.`:'',
    appearingHosts?`${appearingHosts} host${appearingHosts===1?'':'s'} began spiking after conductance removal. The response changed nonlinearly; inspect individual spike times.`:'',
    silentHosts===hosts.length?'Neither matched condition produced a host somatic spike during the observation window.':'',
  ].filter(Boolean).join(' ');
  return {hosts,lostHosts,persistentHosts,appearingHosts,silentHosts,interpretation};
}

/** Only adjacent valid samples bracket a change; failed cases are not bridged. */
export function summarizeProtocol(cases,protocol){
  const runs=cases.flatMap(item=>[item.baseline,item.synapsesOff,item.noStimulus].filter(Boolean));
  const transitions=[];
  let positive=false,negative=false;
  for(let i=1;i<cases.length;i++){
    const a=cases[i-1],b=cases[i];
    if(a.baseline.status!=='ok'||b.baseline.status!=='ok')continue;
    const from=a.baseline.metrics.recruitedHosts,to=b.baseline.metrics.recruitedHosts;
    if(to===from)continue;
    if(to>from)positive=true;else negative=true;
    transitions.push({from:a.value,to:b.value,fromRecruitedHosts:from,toRecruitedHosts:to,direction:to>from?'gain':'loss'});
  }
  const failedRuns=runs.filter(run=>run.status==='error').length;
  const baselineFailures=cases.some(item=>item.baseline.status!=='ok');
  const responsePattern=baselineFailures?'incomplete':positive&&negative?'nonmonotonic':positive?'nondecreasing':negative?'nonincreasing':'constant';
  const noStimulus=cases.map(item=>item.noStimulus).filter(Boolean);
  return {completedCases:cases.filter(item=>item.status==='ok').length,failedRuns,totalRuns:runs.length,successfulRuns:runs.length-failedRuns,
    transitions,responsePattern,allControlsQuiet:noStimulus.length&&noStimulus.every(run=>run.status==='ok')?noStimulus.every(run=>run.metrics.totalMonitoredSpikes===0):null,
    transitionInterpretation:protocol.kind==='sweep'?'Changes refer to adjacent sampled values in the listed order; no interpolation, fitted threshold or monotonicity assumption is applied.':'A matched intact, synapses-off and zero-stimulus comparison.'};
}

export function runProtocol(baseSettings={},input=DEFAULT_PROTOCOL,{onProgress}={}){
  const base=cloneSettings(baseSettings),protocol=normalizeProtocol(input,base),cases=[];
  let completed=0;
  const notify=(fraction,label)=>onProgress?.({progress:(completed+fraction)/protocol.estimatedRuns,completed,total:protocol.estimatedRuns,label});
  const calculate=(settings,label)=>{
    notify(0,label);
    let summary;
    try{summary=summarizeRun(runSimulation(settings,{onProgress:progress=>notify(progress,label)}));}
    catch(error){summary={status:'error',settings:{...settings},error:error instanceof Error?error.message:String(error)};}
    completed++;notify(0,label);return summary;
  };
  for(const [index,value] of (protocol.kind==='causal'?[null]:protocol.values).entries()){
    const settings=settingsFor(base,protocol,value),label=protocol.kind==='causal'?'Causal audit':`Case ${index+1}/${protocol.values.length}`;
    const baseline=calculate(settings,`${label} · intact`);
    const synapsesOff=protocol.paired?calculate({...settings,synapticWeightUs:0},`${label} · synapses off`):null;
    const noStimulus=protocol.kind==='causal'?calculate({...settings,stimAmplitudeUa:0},`${label} · zero stimulus`):null;
    const outcomes=[baseline,synapsesOff,noStimulus].filter(Boolean),ok=outcomes.filter(item=>item.status==='ok').length;
    cases.push({id:protocol.kind==='causal'?'audit':`case-${index+1}`,value,settings,status:ok===outcomes.length?'ok':ok?'partial':'error',
      baseline,synapsesOff,noStimulus,comparison:compareControls(baseline,synapsesOff)});
  }
  return {schemaVersion:PROTOCOL_VERSION,modelVersion:MODEL_VERSION,observationVersion:OBSERVATION_VERSION,baseSettings:base,protocol,cases,
    summary:summarizeProtocol(cases,protocol),units:{time:'ms',membranePotential:'mV',extracellularPotential:'µV',current:'µA',conductance:'µS',length:'µm',conductivity:'S/m',charge:'nC',chargeDensity:'µC/cm²',contactArea:'µm²',recruitment:'cells'},
    limits:{...PROTOCOL_LIMITS},limitations:[...LIMITATIONS]};
}
