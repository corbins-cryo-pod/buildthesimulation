import {MODEL_VERSION,DEFAULT_SETTINGS,normalizeSettings,validateBudget,LIMITATIONS,BUDGET} from './settings.mjs';
import {createCohort,geometryDiagnostics} from './geometry.mjs';
import {createMorphology,simulateCable,MRG_VERSION} from './mrg.mjs';
import {createFieldModel,solveChannel,sampleTransfer,FIELD_VERSION} from './field.mjs';
import {selectivityMetrics,orderedAmplitudeSweep,bracketThreshold} from './metrics.mjs';

const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
export function phaseAverage(s,t){const h=s.dtMs,a=s.stimulusStartMs,b=a+s.phaseWidthMs,c=b+s.phaseGapMs,d=c+s.phaseWidthMs;return s.amplitudeUa*(overlap(t,t+h,c,d)-overlap(t,t+h,a,b))/h;}
export function buildMorphology(s){return createMorphology({fiberDiameterUm:s.fiberDiameterUm,nodes:s.nodeCount,passiveSegments:s.passiveSegments,temperatureC:s.temperatureC,somaDiameterUm:s.somaDiameterUm,somaActiveScale:s.somaActiveScale});}
export function fieldSettings(s,m){
  const span=Math.max(...m.compartments.map(q=>Math.abs(q.zUm)))+1500;
  return {fascicleRadiusUm:s.fascicleRadiusUm,perineuriumThicknessUm:2*s.fascicleRadiusUm*s.perineuriumThicknessFraction,epineuriumRadiusUm:Math.max(400,s.fascicleRadiusUm+150),outerRadiusUm:Math.max(1200,s.fascicleRadiusUm+s.sourceOffsetUm+s.electrodeRadiusUm+400),halfLengthUm:Math.max(8000,Math.ceil(span/500)*500),sigmaEndoTransverse:s.endoneuriumTransverseSPerM,sigmaEndoLongitudinal:s.endoneuriumLongitudinalSPerM,sigmaPerineurium:1/s.perineuriumResistivityOhmM,sigmaEpineurium:s.epineuriumSPerM,sigmaSurrounding:s.surroundingSPerM,electrodeRadiusUm:s.electrodeRadiusUm};
}
/** Ordered events are explicitly a propagation diagnostic, never causal proof.
 * Match event ordinals rather than arbitrarily combining separate spike trains. */
export function propagatedOutput(run,m,{notBeforeMs=0}={}){
  const nodes=[m.nodes-4,m.nodes-3,m.nodes-2],times=nodes.map(n=>run.nodeEventTimes[n]??[]);
  if(nodes[0]<=Math.floor(m.nodes/2)+1)throw new Error('Propagation monitors must all lie beyond the locally silenced region.');
  const criterion='Same-ordinal upward crossings on three unsilenced distal nodes, positive delays, 1–200 m/s segment velocities, at most twofold velocity mismatch. Temporal evidence is not proof of a single travelling event.';
  const count=Math.min(...times.map(t=>t.length));
  for(let i=0;i<count;i++){
    const t=times.map(v=>v[i]);if(t[0]<notBeforeMs||!t.every(Number.isFinite)||!(t[0]<t[1]&&t[1]<t[2]))continue;
    const z=nodes.map(n=>m.compartments[m.nodeIndices[n]].zUm);
    const velocity=[(z[1]-z[0])/(t[1]-t[0])/1000,(z[2]-z[1])/(t[2]-t[1])/1000];
    if(velocity.every(v=>v>=1&&v<=200)&&Math.max(...velocity)/Math.min(...velocity)<=2)return {recruited:true,times:t,nodeOrdinals:nodes,direction:'+z',segmentVelocityMps:velocity,diagnosticOnly:true,criterion};
  }
  return {recruited:false,times:[],nodeOrdinals:nodes,direction:'+z',segmentVelocityMps:[],diagnosticOnly:true,criterion};
}
function compactTrace(run,m,notBeforeMs=0){return {timeMs:run.timesMs,indices:run.recordIndices,nodeOrdinals:run.recordIndices.map(i=>m.nodeIndices.indexOf(i)),voltageMv:run.membraneMv,events:run.events,propagation:propagatedOutput(run,m,{notBeforeMs}),initiatingNode:run.propagation.firstCrossingNode,diagnostics:run.diagnostics};}
function finiteAudit(run,requiresCurrentResidual=false){const d=run.diagnostics;return Number.isFinite(d.minMv)&&Number.isFinite(d.maxMv)&&(requiresCurrentResidual?Number.isFinite(d.maxCurrentResidualNa):(d.maxCurrentResidualNa===null||Number.isFinite(d.maxCurrentResidualNa)));}
function eventBudget(run){if(run.nodeEventTimes.some(t=>t.length>BUDGET.maxEventsPerNodePerSolve))throw new Error(`Saved-event budget exceeded: more than ${BUDGET.maxEventsPerNodePerSolve} crossings at one node in a solve. Calculation rejected; no events were discarded.`);}
function earliestInitiationInRegion(run,m,indices,startMs){
  if(!run.events.length)return false;
  const first=Math.min(...run.events.map(e=>e.timeMs));
  if(first<startMs)return false;
  const possibleFirst=run.events.filter(e=>e.timeMs<=first+run.dtMs);
  return possibleFirst.length>0&&possibleFirst.every(e=>indices.includes(e.compartmentIndex));
}
function savedValueCount(value){
  if(typeof value==='number'||typeof value==='boolean')return 1;
  if(!value||typeof value!=='object')return 0;
  if(ArrayBuffer.isView(value))return value.length;
  return Object.values(value).reduce((sum,v)=>sum+savedValueCount(v),0);
}
export function runProtocol(input=DEFAULT_SETTINGS,{onProgress=()=>{},shouldCancel=()=>false,fieldCache=null}={}){
  const started=now(),s=normalizeSettings(input),geometry=createCohort(s),m=buildMorphology(s),budget=validateBudget(s,m.compartments.length);
  const check=()=>{if(shouldCancel())throw new Error('Calculation cancelled; no partial result was published.');};
  const center=Math.floor(m.nodes/2),centerIndices=[center-1,center,center+1].map(n=>m.nodeIndices[n]);
  const monitorNodes=[center,m.nodes-4,m.nodes-3,m.nodes-2],monitorIndices=monitorNodes.map(n=>m.nodeIndices[n]);
  const stride=Math.round(s.sampleDtMs/s.dtMs),base={morphology:m,dtMs:s.dtMs,durationMs:s.durationMs,traceStride:stride,recordIndices:monitorIndices,saveCurrents:false,maxNodeSteps:BUDGET.maxCompartmentSteps,maxSavedValues:BUDGET.maxSavedValues,maxEventsPerNode:BUDGET.maxEventsPerNodePerSolve};
  onProgress({phase:'Checking geometry and frozen work budget',fraction:0.01});check();
  const zero=simulateCable({...base,recordIndices:m.nodeIndices});
  eventBudget(zero);
  const zeroOutput=propagatedOutput(zero,m),zeroDrift=Math.max(...zero.membraneMv.flatMap(v=>v.map(x=>Math.abs(x-v[0]))));
  const baselineValid=zero.events.length===0&&zeroDrift<=0.1;
  const allSilentZero=simulateCable({...base,initialState:zero.initialState,silencedCompartments:m.nodeIndices});
  const localSilentZero=simulateCable({...base,initialState:zero.initialState,silencedCompartments:centerIndices});
  eventBudget(allSilentZero);eventBudget(localSilentZero);
  check();onProgress({phase:'Assembling anisotropic conductor',fraction:0.025});
  const fs=fieldSettings(s,m),cacheKey=JSON.stringify(fs);
  const field=fieldCache?.key===cacheKey?fieldCache.model:createFieldModel(fs);
  const matrices={assigned:[],localSilenced:[],wholeSilenced:[]},initiationEligibility=[],pairTraces=[],events=[],recordings=[],fieldDiagnostics=[],coupling=[],transferMatrix=[];
  const zeroInput=Array(s.axonCount).fill(zeroOutput.recruited),volumeCurrentResiduals=[];
  const points=geometry.cells.map(c=>m.compartments.map(q=>[c.xUm,c.yUm,q.zUm]));
  const neuronDescriptor={compartments:m.compartments.map(q=>({index:q.index,kind:q.kind,zUm:q.zUm,lengthUm:q.lengthUm,diameterUm:q.diameterUm})),nodeIndices:m.nodeIndices,nodeCount:m.nodes,modelBoundary:m.modelBoundary};
  const total=s.channelCount*s.axonCount*3;let done=0;
  for(const channel of geometry.channels){
    check();onProgress({phase:`Solving source and return · ${channel.id}`,fraction:0.04+0.9*done/total});
    const solution=solveChannel(field,channel,{isCancelled:shouldCancel}),transfers=points.map(p=>sampleTransfer(solution,p));
    fieldDiagnostics.push({channel:channel.id,...solution.diagnostics});
    transferMatrix.push(transfers.map(t=>Array.from(t)));
    coupling.push(transfers.map(t=>Math.max(...t)-Math.min(...t)));
    const counts={assigned:[],localSilenced:[],wholeSilenced:[]},initiations=[];
    // Saved membrane currents use the field applied during the preceding step.
    // Keep the artifact on that same interval rather than shifting it by one dt.
    const precedingStepStart=t=>Math.max(0,Math.round(t/s.dtMs)-1)*s.dtMs;
    const signal={channel:channel.id,timeMs:[...zero.timesMs],appliedStepStartMs:zero.timesMs.map(precedingStepStart),appliedStepEndMs:[...zero.timesMs],stimulusUa:zero.timesMs.map(t=>t===0?0:phaseAverage(s,precedingStepStart(t))),artifactUv:[],engineeredUv:zero.timesMs.map(()=>0),hostUv:zero.timesMs.map(()=>0),totalUv:[],samplingMeaning:'State at timeMs; stimulus and artifact are the average drive applied during the last solver step ending there. Initial sample has no applied interval. Saved traces do not change solver dt.',hostMeaning:'Zero because no distinct host-source population is instantiated; not evidence of preserved silent host axons.'};
    let pairResistanceMvPerUa=0;for(let j=0;j<solution.loadUa.length;j++)pairResistanceMvPerUa+=solution.loadUa[j]*solution.potentialMvPerUa[j];
    signal.artifactUv=signal.stimulusUa.map(a=>a*pairResistanceMvPerUa*1000);
    for(let i=0;i<s.axonCount;i++){
      check();const pair={channel:channel.index,cell:i};
      for(const intervention of ['assigned','localSilenced','wholeSilenced']){
        const isAssigned=intervention==='assigned',silenced=intervention==='localSilenced'?centerIndices:intervention==='wholeSilenced'?m.nodeIndices:[];
        const run=simulateCable({...base,transferMvPerUa:transfers[i],waveform:t=>phaseAverage(s,t),initialState:zero.initialState,silencedCompartments:silenced,recordIndices:isAssigned?m.nodeIndices:monitorIndices,saveCurrents:isAssigned});
        eventBudget(run);
        if(!finiteAudit(run,isAssigned))throw new Error(`Nonfinite membrane diagnostics or unavailable required current residual for ${channel.id}/${geometry.cells[i].id}/${intervention}. No voltage was clipped.`);
        const output=propagatedOutput(run,m,{notBeforeMs:s.stimulusStartMs});counts[intervention].push(output.recruited);
        pair[intervention]=compactTrace(run,m,s.stimulusStartMs);
        for(const e of run.events)events.push({channel:channel.id,cell:geometry.cells[i].id,intervention,compartment:e.compartmentIndex,timeMs:e.timeMs,zUm:e.zUm,direction:'unclassified local crossing',criterion:'0 mV upward crossing; an individual event is not a propagation or direction classification'});
        if(isAssigned){
          const eligible=earliestInitiationInRegion(run,m,centerIndices,s.stimulusStartMs);initiations.push(eligible);pair.initiationRegionEligible=eligible;
          volumeCurrentResiduals.push(run.diagnostics.maxCurrentResidualNa);
          for(let t=0;t<run.timesMs.length;t++)for(let j=0;j<m.compartments.length;j++)signal.engineeredUv[t]+=run.outerCurrentsNa[t][j]*transfers[i][j];
        }
        done++;onProgress({phase:`Matched controls · ${channel.id} · cell ${i+1}/${s.axonCount} · ${intervention}`,fraction:0.06+0.9*done/total});
      }
      pairTraces.push(pair);
    }
    for(const key of Object.keys(matrices))matrices[key].push(counts[key]);
    initiationEligibility.push(initiations);
    signal.totalUv=signal.artifactUv.map((v,i)=>v+signal.engineeredUv[i]+signal.hostUv[i]);recordings.push(signal);
  }
  check();
  const wholeSilencedValid=matrices.wholeSilenced.every(row=>row.every(v=>!v));
  const auditValid=baselineValid&&wholeSilencedValid&&localSilentZero.events.length===0&&allSilentZero.events.length===0;
  const metrics=selectivityMetrics(matrices.assigned,matrices.localSilenced,zeroInput,s.axonCount,{auditValid,initiationEligible:initiationEligibility});
  const controls=[
    {id:'junction',name:'Junction block',status:'not applicable',reason:'This electrical benchmark contains cables and no organoid-to-host junction. This is not a passing junction test or a simulated ganglion replacement.'},
    {id:'zero',name:'Zero stimulus',status:baselineValid?'passed':'failed',spikes:zero.events.length,driftMv:zeroDrift,reason:'Identical morphology, 37 °C kinetics, shared equilibrated initial state, dt and window; drive set to zero. Identical cellular geometry permits one exact baseline reused across the cohort.'},
    {id:'isolation',name:'Channel isolation',status:'completed',reason:'Every recruitment row was calculated with only its named source–return pair active. No nonlinear simultaneous-channel inference.'},
    {id:'local',name:'Initiation-region silencing',status:localSilentZero.events.length===0?'completed':'failed',reason:'Active conductances at the central node and its immediate nodal neighbors are zero; all distal active nodes and the imposed field remain unchanged. This is a local-conductance intervention, not synaptic block.',compartmentIndices:centerIndices,zeroDriveEvents:localSilentZero.events.length},
    {id:'whole',name:'Whole model-cell silencing',status:wholeSilencedValid&&allSilentZero.events.length===0?'passed':'failed',reason:'All active nodal conductances set to zero, passive leak/myelin retained. This test alone cannot establish local initiation or soma mediation.',zeroDriveEvents:allSilentZero.events.length},
    {id:'no-construct',name:'No-construct comparator',status:'not modeled',reason:'Postoperative original-host preservation and repair are not predicted by this electrical core. The no-drive cable reference is not relabeled a no-construct repair experiment.'},
  ];
  const cascade=[
    {label:'Preserved original host identities',count:null,denominator:null,status:'not modelled; no replacement or postoperative continuity experiment'},
    {label:'Geometric well capacity',count:geometry.capacity,denominator:s.axonCount,status:'geometry only; wall insulation not solved'},
    {label:'Explicitly resolved model cables',count:s.axonCount,denominator:s.axonCount,status:'synthetic model cohort, not a human or engineered-tissue census'},
    {label:'Fabrication / routing / occupancy / survival',count:null,denominator:s.axonCount,status:'not simulated; not assigned a yield of 1'},
    {label:'Appropriate target reinnervation',count:null,denominator:s.axonCount,status:'not simulated'},
    {label:'At least one channel recruits output',count:auditValid?metrics.anyRecruitment:null,denominator:s.axonCount,status:auditValid?'calculated after matched controls':'withheld: causal audit failed'},
    {label:'Exclusively recruited engineered outputs',count:auditValid?metrics.engineeredExclusiveCount:null,denominator:s.axonCount,status:auditValid?'calculated at declared amplitude':'withheld'},
    {label:'Exclusive with conditional local-initiation evidence',count:auditValid?metrics.engineeredCausalExclusiveCount:null,denominator:s.axonCount,status:auditValid?'earliest observed initiation in region plus loss under local silencing; no host junction':'withheld'},
    {label:'Chronic survival',count:null,denominator:s.axonCount,status:'not simulated'},
  ];
  const maxima=coupling.map(row=>Math.max(...row)),confinement=coupling.map(row=>row.map((v,i)=>{const denominator=Math.max(...row.filter((_,j)=>j!==i));return denominator>0?v/denominator:null;}));
  const result={modelVersion:MODEL_VERSION,modelComponents:{membrane:MRG_VERSION,field:FIELD_VERSION},settings:s,geometry,morphology:neuronDescriptor,workBudget:budget,auditComplete:true,auditValid,controls,baseline:compactTrace(zero,m),localSilencedBaseline:compactTrace(localSilentZero,m),wholeSilencedBaseline:compactTrace(allSilentZero,m),metrics,matrices,initiationEligibility,pairTraces,events,recordings,cascade,geometryDiagnostics:geometryDiagnostics(s,geometry),field:{settings:field.settings,diagnostics:fieldDiagnostics,transferMatrixMvPerUa:transferMatrix,compartmentOrder:'morphology.compartments',couplingMvPerUa:coupling,confinement,confinementDefinition:'Potential range along this cable divided by maximum potential range along another cable, per isolated channel; null if the denominator is zero. Not a threshold, an activating-function solve, or a shared physical unit across modalities.',maxCouplingMvPerUa:maxima},diagnostics:{elapsedMs:now()-started,zeroInputDriftMv:zeroDrift,maxMembraneCurrentResidualNa:Math.max(...volumeCurrentResiduals),sampledCells:s.axonCount,screening:'none; all stated cells and interventions were resolved',amplitudeRule:'User-declared operating amplitude. This is one sampled point; use the explicit ordered sweep before comparing designs.',recruitmentMeaning:'Declared three-node temporal propagation diagnostic plus named controls; not proof of biological continuity or a unique travelling action-potential identity.'},limitations:[...LIMITATIONS,...(!auditValid?['Recruitment headlines are withheld because a matched-control acceptance gate failed. Raw traces and matrices remain diagnostic evidence.']:[])],evidence:{anatomy:'estimated',equations:'mathematical',ganglionArchitecture:'hypothetical',clinicalPrediction:'not provided'}};
  result.numericalContract={equilibrationMs:20,eventThresholdMv:0,propagationMinSegmentVelocityMps:1,propagationMaxSegmentVelocityMps:200,propagationMaxVelocityRatio:2,initiationTimingUncertaintyMs:s.dtMs,evidence:'estimated',provenance:'Explicit numerical diagnostic choices. Speed bounds reject gross temporal mismatches; they are not fitted conduction-velocity bands or proof of a single action-potential identity.'};
  result.sharedInitialState=zero.initialState;
  const actualSavedValues=savedValueCount(result)+1;
  if(actualSavedValues>BUDGET.maxSavedValues)throw new Error(`Saved-value budget exceeded at final integrity check (${actualSavedValues}); result rejected without truncation.`);
  result.workBudget.actualRetainedValues=actualSavedValues;
  onProgress({phase:'Completed matched-control audit',fraction:1});return result;
}

export function runStudy(input,kind,{onProgress=()=>{},shouldCancel=()=>false}={}){
  const s=normalizeSettings(input),values=kind==='amplitude'?orderedAmplitudeSweep(s.amplitudeUa):kind==='perineurium'?[400,1149,3750]:null;
  if(!values)throw new Error('Unsupported study.');
  const m=buildMorphology(s),plan=validateBudget(s,m.compartments.length);
  const totalBudget={cableSolves:plan.cableSolves*values.length,compartmentSteps:plan.compartmentSteps*values.length,savedValues:plan.retainedValues*values.length+plan.peakTransientValues};
  if(totalBudget.cableSolves>BUDGET.maxCableSolves||totalBudget.compartmentSteps>BUDGET.maxCompartmentSteps||totalBudget.savedValues>BUDGET.maxSavedValues)throw new Error('The complete matched study exceeds a declared total solve, compartment-step, or saved-value budget. Choose a smaller explicit census before starting. No resolution was changed.');
  const runs=values.map((value,i)=>runProtocol({...s,[kind==='amplitude'?'amplitudeUa':'perineuriumResistivityOhmM']:value},{shouldCancel,onProgress:p=>onProgress({...p,phase:`Study ${i+1}/${values.length}: ${p.phase}`,fraction:(i+p.fraction)/values.length})}));
  const completeValid=runs.every(r=>r.auditValid);
  const brackets=kind==='amplitude'&&completeValid?Array.from({length:s.channelCount},(_,k)=>Array.from({length:s.axonCount},(_,i)=>bracketThreshold(values,runs.map(r=>r.matrices.assigned[k][i])))):null;
  return {kind,values,settings:s,modelVersion:MODEL_VERSION,runs,brackets,bracketStatus:kind!=='amplitude'?'not applicable':completeValid?'calculated from valid samples':'withheld: at least one sample failed its matched audit; failure is not non-recruitment',workBudget:totalBudget,rule:'Finite predeclared ordered values; no interpolation, threshold extrapolation or amplitude optimization. Every point includes the same matched interventions.'};
}
