import { STAGE1_MODEL_VERSION, DEFAULT_STAGE1_SETTINGS, normalizeStage1Settings, validateStage1Budget, STAGE1_BUDGET, STAGE1_LIMITATIONS } from './stage1-settings.mjs';
import { createStage1Cohort, createIdentityLedger, applyB3IdentityMetrics, assertDisconnectedNativeStumps } from './identities.mjs';
import { createBipolarMorphology, createNativeStumpMorphologies, BIPOLAR_VERSION, BIPOLAR_DEFAULTS } from './bipolar.mjs';
import { simulateCable, MRG_VERSION } from './mrg.mjs';
import { selectivityMetrics, orderedAmplitudeSweep, bracketThreshold } from './metrics.mjs';
import * as defaultFieldAPI from './field-stage1.mjs';

const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
export function stage1PhaseAverage(s,t){const h=s.dtMs,a=s.stimulusStartMs,b=a+s.phaseWidthMs,c=b+s.phaseGapMs,d=c+s.phaseWidthMs;return s.amplitudeUa*(overlap(t,t+h,c,d)-overlap(t,t+h,a,b))/h;}
export function buildStage1Morphology(input){const s=normalizeStage1Settings(input),parameters=Object.fromEntries([...new Set([...Object.keys(BIPOLAR_DEFAULTS),'somaSegments'])].map(key=>[key,s[key]])),m=createBipolarMorphology(parameters);if(m.somaIndices?.length!==s.somaSegments)throw new Error('The bipolar solver does not implement the requested soma subdivision; no coarse fallback was used.');return m;}
export function stage1FieldSettings(s,m){
  const span=Math.max(...m.compartments.map(q=>Math.abs(q.zUm)+q.lengthUm/2))+1500;
  return {fascicleRadiusUm:s.fascicleRadiusUm,perineuriumThicknessUm:2*s.fascicleRadiusUm*s.perineuriumThicknessFraction,
    epineuriumRadiusUm:Math.max(400,s.fascicleRadiusUm+150),outerRadiusUm:Math.max(1200,s.fascicleRadiusUm+600),halfLengthUm:Math.max(8000,Math.ceil(span/500)*500),
    sigmaEndoTransverse:s.endoneuriumTransverseSPerM,sigmaEndoLongitudinal:s.endoneuriumLongitudinalSPerM,sigmaPerineurium:1/s.perineuriumResistivityOhmM,
    sigmaEpineurium:s.epineuriumSPerM,sigmaSurrounding:s.surroundingSPerM,sigmaWellFluid:s.wellFluidSPerM,
    angularSegments:s.fieldAngularSegments,wellAngularSegments:s.wellAngularSegments,radialRefinement:s.fieldRadialRefinement,axialRefinement:s.fieldAxialRefinement,
    localAxialStepUm:s.localAxialStepUm,resolvedCellExtensionUm:s.resolvedCellExtensionUm};
}

export function propagatedArmOutput(run,m,arm='central',{notBeforeMs=0}={}){
  const monitor=m.armMonitors?.[arm];
  if(!monitor||monitor.nodeOrdinals.length!==3||monitor.compartmentIndices.length!==3)throw new Error(`Three declared distal ${arm} monitors are required.`);
  if(monitor.compartmentIndices.some(i=>m.initiationRegionIndices.includes(i)))throw new Error('Propagation monitors must lie outside the locally silenced region.');
  const times=monitor.nodeOrdinals.map(n=>run.nodeEventTimes[n]??[]),count=Math.min(...times.map(v=>v.length));
  const criterion='Same-ordinal upward crossings on three distal true nodes, positive outward delays, 1–200 m/s segment velocities and at most twofold velocity mismatch. Temporal evidence is not proof of one traveling event.';
  for(let i=0;i<count;i++){
    const t=times.map(a=>a[i]);if(t[0]<notBeforeMs||!t.every(Number.isFinite)||!(t[0]<t[1]&&t[1]<t[2]))continue;
    const z=monitor.compartmentIndices.map(index=>m.compartments[index].zUm);
    const velocity=[Math.abs(z[1]-z[0])/(t[1]-t[0])/1000,Math.abs(z[2]-z[1])/(t[2]-t[1])/1000];
    if(velocity.every(v=>v>=1&&v<=200)&&Math.max(...velocity)/Math.min(...velocity)<=2)return {recruited:true,times:t,nodeOrdinals:[...monitor.nodeOrdinals],compartmentIndices:[...monitor.compartmentIndices],direction:monitor.direction,segmentVelocityMps:velocity,diagnosticOnly:true,criterion};
  }
  return {recruited:false,times:[],nodeOrdinals:[...monitor.nodeOrdinals],compartmentIndices:[...monitor.compartmentIndices],direction:monitor.direction,segmentVelocityMps:[],diagnosticOnly:true,criterion};
}
export function initiationRegionEligible(run,m,startMs){
  if(!run.events.length)return false;
  const first=Math.min(...run.events.map(event=>event.timeMs));
  if(first<startMs)return false;
  const possible=run.events.filter(event=>event.timeMs<=first+run.dtMs);
  return possible.length>0&&possible.every(event=>m.initiationRegionIndices.includes(event.compartmentIndex));
}
function compactTrace(run,m,notBeforeMs=0){
  const armNames=Object.keys(m.armMonitors),primary=armNames.includes('central')?'central':armNames[0];
  const first=run.events.length?run.events.reduce((a,b)=>a.timeMs<=b.timeMs?a:b):null;
  return {timeMs:run.timesMs,indices:run.recordIndices,nodeOrdinals:run.recordIndices.map(index=>{const n=m.nodeIndices.indexOf(index);return n<0?null:n;}),
    siteLabels:run.recordIndices.map(index=>{const c=m.compartments[index],ordinal=m.nodeIndices.indexOf(index);return ordinal>=0?`${c.arm??'axon'} node ${ordinal+1}`:(c.role??c.kind);}),
    voltageMv:run.membraneMv,events:run.events,propagation:propagatedArmOutput(run,m,primary,{notBeforeMs}),
    armPropagation:Object.fromEntries(armNames.map(arm=>[arm,propagatedArmOutput(run,m,arm,{notBeforeMs})])),
    initiatingNode:first?.nodeOrdinal??null,firstCrossingNode:first?.nodeOrdinal??null,
    initiatingSite:first?{compartmentIndex:first.compartmentIndex,role:first.role??m.compartments[first.compartmentIndex].role,timeMs:first.timeMs}:null,
    firstCrossingMeaning:'First observed upward threshold crossing. It need not be the source of depolarization or the compartment that initiated a traveling event.',diagnostics:run.diagnostics};
}
function finiteAudit(run,currentRequired){const d=run.diagnostics;return Number.isFinite(d.minMv)&&Number.isFinite(d.maxMv)&&(currentRequired?Number.isFinite(d.maxCurrentResidualNa):(d.maxCurrentResidualNa===null||Number.isFinite(d.maxCurrentResidualNa)));}
function drift(run){let largest=0;for(const row of run.membraneMv)for(const value of row)largest=Math.max(largest,Math.abs(value-row[0]));return largest;}
function eventBudget(run){const count=new Map();for(const event of run.events){const n=(count.get(event.compartmentIndex)??0)+1;count.set(event.compartmentIndex,n);if(n>STAGE1_BUDGET.maxEventsPerNodePerSolve)throw new Error('Active-site event budget exceeded; no events were discarded.');}}
function savedValueCount(value){if(typeof value==='number'||typeof value==='boolean')return 1;if(!value||typeof value!=='object')return 0;if(ArrayBuffer.isView(value))return value.length;return Object.values(value).reduce((sum,item)=>sum+savedValueCount(item),0);}
function descriptor(m){return {type:m.type,modelBoundary:m.modelBoundary,nodeCount:m.nodes,nodeIndices:[...m.nodeIndices],activeSiteIndices:[...m.activeSiteIndices],somaIndex:m.somaIndex,
  somaIndices:[...m.somaIndices],initiationRegionIndices:[...m.initiationRegionIndices],armMonitors:m.armMonitors,armNodeIndices:m.armNodeIndices,soma:m.soma,
  compartments:m.compartments.map(c=>({index:c.index,kind:c.kind,role:c.role,arm:c.arm,nodeOrdinal:c.nodeOrdinal,zUm:c.zUm,lengthUm:c.lengthUm,diameterUm:c.diameterUm,samplingSurface:c.samplingSurface})),parameters:m.parameters};}
function checkTransfer(value,m){if(!value||value.length!==m.compartments.length||!Array.from(value).every(Number.isFinite))throw new Error('Field transfer must contain one finite mV/µA coefficient per exact membrane compartment.');return value;}
function contactSummary(model,channel){
  if(!Array.isArray(model.contacts))throw new Error('The field model must expose its actual finite surface contacts.');
  const source=model.contacts.find(c=>c.id===channel.sourceContactId),returned=model.contacts.find(c=>c.id===channel.returnContactId);
  if(!source||!returned||source.wellId!==channel.wellId||returned.wellId!==channel.wellId)throw new Error(`Finite surface contact identities are missing for ${channel.id}.`);
  if(![source.areaUm2,returned.areaUm2].every(area=>Number.isFinite(area)&&area>0))throw new Error('Actual mesh-integrated source and return contact areas must be positive.');
  return {channel:channel.id,wellId:channel.wellId,sourceContactId:source.id,returnContactId:returned.id,sourceAreaUm2:source.areaUm2,returnAreaUm2:returned.areaUm2,areaMeaning:'Actual finite-element surface patch area; rectangular input dimensions are not substituted for mesh area.'};
}

/** New experiment; no verification status is inherited from the legacy core.
 * A supplied fieldAPI is for explicit independent implementations/tests only. */
export async function runStage1Protocol(input=DEFAULT_STAGE1_SETTINGS,{onProgress=()=>{},shouldCancel=()=>false,fieldAPI=null}={}){
  const started=now(),s=normalizeStage1Settings(input),geometry=createStage1Cohort(s),ledger=createIdentityLedger(s,geometry),m=buildStage1Morphology(s),stumps=createNativeStumpMorphologies(m);
  const disconnected=assertDisconnectedNativeStumps(stumps),budget=validateStage1Budget(s,m,stumps),check=()=>{if(shouldCancel())throw new Error('Stage 1 calculation cancelled; no partial result was published.');};
  onProgress({phase:'Checking fixed B3 identities, anatomy and total work budget',fraction:.005});check();
  const api=fieldAPI??defaultFieldAPI;
  for(const key of ['createStage1FieldModel','solveStage1Channel','sampleMembraneTransfer'])if(typeof api[key]!=='function')throw new Error(`Stage 1 field implementation is missing ${key}.`);
  if(typeof api.FIELD_STAGE1_VERSION!=='string')throw new Error('Stage 1 field implementation must expose its version.');
  if(s.includeElectrodeOnlyControl&&(typeof api.createExternalTestFieldModel!=='function'||typeof api.solveExternalTestChannel!=='function'))throw new Error('The additional electrode-only fixture is not implemented by this field API. True no-device remains available; the requested extra condition was not silently removed.');
  const monitors=[m.somaIndex,...m.armMonitors.peripheral.compartmentIndices,...m.armMonitors.central.compartmentIndices];
  const common={dtMs:s.dtMs,durationMs:s.durationMs,equilibrationMs:s.equilibrationMs,traceStride:Math.round(s.sampleDtMs/s.dtMs),saveCurrents:false,
    maxNodeSteps:STAGE1_BUDGET.maxCompartmentSteps,maxSavedValues:STAGE1_BUDGET.maxSavedValues,maxEventsPerNode:STAGE1_BUDGET.maxEventsPerNodePerSolve};
  const eBase={...common,morphology:m,recordIndices:monitors};
  const zero=simulateCable({...eBase,recordIndices:m.activeSiteIndices});eventBudget(zero);
  const localZero=simulateCable({...eBase,initialState:zero.initialState,silencedCompartments:m.initiationRegionIndices});eventBudget(localZero);
  const wholeZero=simulateCable({...eBase,initialState:zero.initialState,silencedCompartments:m.activeSiteIndices});eventBudget(wholeZero);
  const somaZero=simulateCable({...eBase,initialState:zero.initialState,silencedCompartments:m.somaIndices});eventBudget(somaZero);
  for(const run of [zero,localZero,wholeZero,somaZero])if(!finiteAudit(run,false))throw new Error('Nonfinite engineered zero-input or silencing baseline.');
  const nativeZero={};for(const arm of ['peripheral','central']){check();nativeZero[arm]=simulateCable({...common,morphology:stumps[arm],recordIndices:stumps[arm].activeSiteIndices});eventBudget(nativeZero[arm]);if(!finiteAudit(nativeZero[arm],false))throw new Error(`Nonfinite ${arm} native-stump baseline.`);}
  const zeroDrift=drift(zero),nativeDrift=Object.fromEntries(['peripheral','central'].map(arm=>[arm,drift(nativeZero[arm])]));
  const baselineValid=zero.events.length===0&&zeroDrift<=.1,nativeBaselineValid=Object.values(nativeZero).every(run=>run.events.length===0)&&Object.values(nativeDrift).every(value=>value<=.1);
  check();onProgress({phase:'Meshing finite well walls, end caps, apertures and surface contacts',fraction:.025});
  const fs=stage1FieldSettings(s,m),field=await api.createStage1FieldModel(fs,{cells:geometry.cells,wells:geometry.wells,morphology:m,constructPresent:true,isCancelled:shouldCancel});
  check();const areas=geometry.channels.map(channel=>contactSummary(field,channel));
  const samplingPlans=typeof api.prepareMembraneSampling==='function'?geometry.cells.map(cell=>api.prepareMembraneSampling(field,m,cell)):null;
  const noDeviceField=await api.createStage1FieldModel(fs,{cells:[],wells:[],morphology:null,constructPresent:false,isCancelled:shouldCancel});
  if(!Array.isArray(noDeviceField.contacts)||noDeviceField.contacts.length||noDeviceField.geometry?.constructPresent!==false||noDeviceField.geometry.cells?.length!==0||noDeviceField.geometry.wells?.length!==0)throw new Error('True no-device field must explicitly contain no implanted cells, wells or contacts.');
  let externalField=null;if(s.includeElectrodeOnlyControl)externalField=await api.createExternalTestFieldModel(fs,{nativeStumps:stumps,originalCells:ledger.original,geometry,morphology:m,isCancelled:shouldCancel});
  const matrices={assigned:[],localSilenced:[],wholeSilenced:[],somaSilenced:[]},initiationEligibility=[],pairTraces=[],events=[],recordings=[],fieldDiagnostics=[],transferMatrix=[],coupling=[],currentResiduals=[];
  const nativeDriven=s.includeElectrodeOnlyControl?{pairTraces:[],matrices:{peripheral:[],central:[]},recordings:[],fieldDiagnostics:[]}:null;
  const total=s.axonCount*s.channelCount*(4+(s.includeElectrodeOnlyControl?2:0));let done=0;
  const progress=phase=>onProgress({phase,fraction:.06+.9*done/total});
  const appendEvents=(run,channel,cell,intervention,morph)=>{for(const e of run.events)events.push({channel,cell,intervention,compartment:e.compartmentIndex,timeMs:e.timeMs,zUm:e.zUm,role:e.role??morph.compartments[e.compartmentIndex].role,
    direction:'unclassified local crossing',criterion:'0 mV upward crossing at an active membrane site; not an individual propagation or direction classification'});};
  const signalTemplate=(channel,reference)=>{
    const previous=t=>Math.max(0,Math.round(t/s.dtMs)-1)*s.dtMs;
    return {channel,timeMs:[...reference.timesMs],appliedStepStartMs:reference.timesMs.map(previous),appliedStepEndMs:[...reference.timesMs],stimulusUa:reference.timesMs.map(t=>t===0?0:stage1PhaseAverage(s,previous(t))),artifactUv:[],engineeredUv:reference.timesMs.map(()=>0),hostUv:reference.timesMs.map(()=>0),totalUv:[],
      samplingMeaning:'State at timeMs; drive and artifact are averages over the canonical preceding solver step. Initial sample has no applied interval.',hostMeaning:'Original native processes are absent in BOTH B3 and matched no-device. Viable disconnected native proxies are separately simulated only in an additional diagnostic.'};
  };
  for(const channel of geometry.channels){
    check();progress(`Finite surface source–return solve · ${channel.id}`);
    const solution=await api.solveStage1Channel(field,{wellId:channel.wellId,sourceContactId:channel.sourceContactId,returnContactId:channel.returnContactId},{isCancelled:shouldCancel});
    if(!Number.isFinite(solution.pairArtifactMvPerUa))throw new Error('Surface-contact solution must expose finite pairArtifactMvPerUa for the exact source/return weighting.');
    const transfers=[];for(let i=0;i<geometry.cells.length;i++)transfers.push(checkTransfer(await api.sampleMembraneTransfer(solution,m,geometry.cells[i],samplingPlans?{prepared:samplingPlans[i]}:{}),m));
    fieldDiagnostics.push({channel:channel.id,...solution.diagnostics});transferMatrix.push(transfers.map(t=>Array.from(t)));coupling.push(transfers.map(t=>Math.max(...t)-Math.min(...t)));
    const signal=signalTemplate(channel.id,zero);signal.artifactUv=signal.stimulusUa.map(a=>a*solution.pairArtifactMvPerUa*1000);
    const counts={assigned:[],localSilenced:[],wholeSilenced:[],somaSilenced:[]},initiations=[];
    for(let i=0;i<s.axonCount;i++){
      const pair={channel:channel.index,cell:i};
      for(const intervention of ['assigned','localSilenced','wholeSilenced','somaSilenced']){
        check();const assigned=intervention==='assigned',silenced=intervention==='localSilenced'?m.initiationRegionIndices:intervention==='wholeSilenced'?m.activeSiteIndices:intervention==='somaSilenced'?m.somaIndices:[];
        const run=simulateCable({...eBase,transferMvPerUa:transfers[i],waveform:t=>stage1PhaseAverage(s,t),initialState:zero.initialState,silencedCompartments:silenced,recordIndices:assigned?m.activeSiteIndices:monitors,saveCurrents:assigned});
        eventBudget(run);if(!finiteAudit(run,assigned))throw new Error(`Nonfinite required diagnostics at ${channel.id}/${geometry.cells[i].id}/${intervention}; no voltage was clipped.`);
        counts[intervention].push(propagatedArmOutput(run,m,'central',{notBeforeMs:s.stimulusStartMs}).recruited);
        pair[intervention]=compactTrace(run,m,s.stimulusStartMs);appendEvents(run,channel.id,geometry.cells[i].id,intervention,m);
        if(assigned){const eligible=initiationRegionEligible(run,m,s.stimulusStartMs);initiations.push(eligible);pair.initiationRegionEligible=eligible;currentResiduals.push(run.diagnostics.maxCurrentResidualNa);
          for(let t=0;t<run.timesMs.length;t++)for(let j=0;j<m.compartments.length;j++)signal.engineeredUv[t]+=run.outerCurrentsNa[t][j]*transfers[i][j];}
        done++;progress(`B3 matched interventions · ${channel.id} · ${geometry.cells[i].id} · ${intervention}`);
      }
      pair.somaActiveConductanceNecessary=pair.assigned.propagation.recruited&&!pair.somaSilenced.propagation.recruited;
      pair.somaNecessityMeaning='Output dependence on active somatic conductances in this matched intervention, not proof that the soma initiated the action potential.';
      pairTraces.push(pair);
    }
    for(const key of Object.keys(matrices))matrices[key].push(counts[key]);initiationEligibility.push(initiations);
    signal.totalUv=signal.artifactUv.map((value,i)=>value+signal.engineeredUv[i]+signal.hostUv[i]);recordings.push(signal);
    if(nativeDriven){
      check();const externalSolution=await api.solveExternalTestChannel(externalField,{channel,geometry},{isCancelled:shouldCancel});
      if(!Number.isFinite(externalSolution.pairArtifactMvPerUa))throw new Error('External test fixture must expose its actual artifact transfer.');
      const nativeSignal=signalTemplate(channel.id,nativeZero.central);nativeSignal.hostMeaning='Known currents from separately solved original native-stump proxies. No continuity across the resection gap is present.';
      nativeSignal.artifactUv=nativeSignal.stimulusUa.map(a=>a*externalSolution.pairArtifactMvPerUa*1000);nativeDriven.fieldDiagnostics.push({channel:channel.id,...externalSolution.diagnostics});
      const nativeRows={peripheral:[],central:[]};
      for(let i=0;i<s.axonCount;i++){
        const pair={channel:channel.index,originalIdentity:ledger.original[i].id};
        for(const arm of ['peripheral','central']){
          check();const stump=stumps[arm],transfer=checkTransfer(await api.sampleMembraneTransfer(externalSolution,stump,geometry.cells[i]),stump);
          const run=simulateCable({...common,morphology:stump,initialState:nativeZero[arm].initialState,recordIndices:stump.activeSiteIndices,transferMvPerUa:transfer,waveform:t=>stage1PhaseAverage(s,t),saveCurrents:true});
          eventBudget(run);if(!finiteAudit(run,true))throw new Error(`Nonfinite external-test native ${arm} diagnostics.`);
          pair[arm]=compactTrace(run,stump,s.stimulusStartMs);nativeRows[arm].push(pair[arm].propagation.recruited);appendEvents(run,channel.id,ledger.original[i][arm+'RemnantId'],`electrodeOnly${arm}`,stump);
          for(let t=0;t<run.timesMs.length;t++)for(let j=0;j<stump.compartments.length;j++)nativeSignal.hostUv[t]+=run.outerCurrentsNa[t][j]*transfer[j];
          done++;progress(`Additional electrode-only counterfactual · ${channel.id} · ${ledger.original[i].id} · ${arm}`);
        }
        nativeDriven.pairTraces.push(pair);
      }
      for(const arm of ['peripheral','central'])nativeDriven.matrices[arm].push(nativeRows[arm]);
      nativeSignal.totalUv=nativeSignal.artifactUv.map((value,i)=>value+nativeSignal.hostUv[i]);nativeDriven.recordings.push(nativeSignal);
    }
  }
  check();
  const wholeValid=matrices.wholeSilenced.every(row=>row.every(value=>!value))&&wholeZero.events.length===0;
  const matchedNoDeviceValid=noDeviceField.contacts.length===0&&ledger.remnantStateAssumption.matched===true;
  const auditValid=baselineValid&&localZero.events.length===0&&somaZero.events.length===0&&wholeValid&&matchedNoDeviceValid;
  const electrical=selectivityMetrics(matrices.assigned,matrices.localSilenced,Array(s.axonCount).fill(propagatedArmOutput(zero,m).recruited),s.axonCount,{auditValid,initiationEligible:initiationEligibility});
  const metrics=applyB3IdentityMetrics(electrical,ledger,{auditValid});
  const somaDependentExclusive=new Set();for(let k=0;k<matrices.assigned.length;k++){const members=matrices.assigned[k].flatMap((value,i)=>value?[i]:[]);if(members.length===1&&!matrices.somaSilenced[k][members[0]])somaDependentExclusive.add(members[0]);}
  metrics.engineeredSomaDependentExclusiveCount=auditValid?somaDependentExclusive.size:null;
  metrics.somaNecessityMeaning='Exclusive outputs lost with soma-only active-conductance removal. This is intervention necessity, not proof of somatic initiation or source localization.';
  const noDevice={condition:'matched fixed post-resection state, no implanted construct',originalCensus:ledger.originalCensus,continuousOriginalCount:0,originalHostY:0,
    implantedCellIds:[],wellIds:[],contactIds:[],implantDriveUa:0,field:{settings:noDeviceField.settings??fs,diagnostics:noDeviceField.diagnostics??{},solution:'exact zero potential under zero sources and homogeneous zero-Dirichlet boundary',contacts:[]},
    nativeRemnantIds:[],excitablePopulationCount:0,sourceCurrentNa:0,fieldPotentialMv:0,evokedOutputCount:0,membraneTraces:[],recording:null,
    evaluation:'Analytical zero: no excitable cells or current sources, with homogeneous grounded outer boundaries. No numerical membrane trajectory exists or is manufactured.',
    changedFromB3:['implanted engineered cells removed','well walls/end caps removed','implant contacts removed','implant drive absent'],
    heldFromB3:['original remnants absent in modeled domain','original census and identity ledger','seed and macroscopic tissue conductor','temperature and declared observation window'],
    remnantStateComparison:ledger.remnantStateAssumption,
    comparisonMeaning:'The original-remnant state is identical in B3 and no-device. Only the implanted construct and its drive are removed. Structural original-host Y=0 follows the fixed assumption; no repair or degeneration forecast is made.'};
  const viableStumpDiagnostic={condition:'separate hypothetical viable disconnected original remnants',status:nativeBaselineValid?'completed; zero-input diagnostic passed':'completed; zero-input diagnostic failed',
    isMatchedNoDevice:false,usedToEstimateImplantBenefit:false,originalCensus:ledger.originalCensus,continuousOriginalCount:0,implantDriveUa:0,
    nativeStumpMorphologies:{peripheral:descriptor(stumps.peripheral),central:descriptor(stumps.central)},disconnected,
    baselineTraces:Object.fromEntries(['peripheral','central'].map(arm=>[arm,compactTrace(nativeZero[arm],stumps[arm])])),baselineDriftMv:nativeDrift,
    nativeRemnantIds:ledger.nativeRemnants.map(item=>item.id),baselineValid:nativeBaselineValid,
    reuseMeaning:'Every original identity has the same declared stump morphology and zero imposed field. Two exact position-independent reference trajectories are shared without population subsampling.',
    anatomicalAssumption:'All original somas/stems are absent and peripheral/central graphs are disconnected. Stumps are assumed electrically viable at the modeled instant; no growth, survival or degeneration is predicted.',
    comparisonMeaning:'This explicitly different viable-remnant population is not the matched no-device condition and does not estimate the benefit of implantation.'};
  const controls=[
    {id:'junction',name:'Junction block',status:'not applicable',reason:'B3 cells own both projections and contain no engineered-to-host junction. No fictitious block or passing score is generated.'},
    {id:'zero',name:'Zero stimulus',status:baselineValid?'passed':'failed',spikes:zero.events.length,driftMv:zeroDrift,reason:'Identical engineered morphology, 37 °C kinetics, equilibrated state, dt and observation window; drive set to zero.'},
    {id:'isolation',name:'Channel isolation',status:'completed',reason:'Every row uses only its named finite contact pair. All declared cells and matched interventions are explicitly solved.'},
    {id:'local',name:'Soma and initiation-region silencing',status:localZero.events.length===0?'completed':'failed',compartmentIndices:[...m.initiationRegionIndices],zeroDriveEvents:localZero.events.length,reason:'Active conductances at the explicit soma, both stems and proximal heminodes are removed; distal active membrane, extracellular field and initial state are unchanged. Conditional initiation eligibility is checked separately.'},
    {id:'whole',name:'Whole engineered-cell silencing',status:wholeValid?'passed':'failed',compartmentIndices:[...m.activeSiteIndices],zeroDriveEvents:wholeZero.events.length,reason:'Every engineered active membrane site is silenced while passive membranes and the imposed field remain. This test alone does not establish soma initiation.'},
    {id:'soma',name:'Soma-only active-conductance necessity',status:somaZero.events.length===0?'completed':'failed',compartmentIndices:[...m.somaIndices],zeroDriveEvents:somaZero.events.length,reason:'Only active somatic conductances are removed; stems, heminodes, distal membrane, imposed field and initial state are unchanged. Loss shows conditional somatic-conductance necessity, not the origin of depolarization or proof of somatic initiation.'},
    {id:'no-construct',name:'Matched true no-device',status:matchedNoDeviceValid?'passed':'failed',evaluation:'analytical empty-population zero',reason:'Original remnants are absent in BOTH matched conditions. Removing only implanted neurons, wells and electrodes leaves no excitable population or drive, so field/current and evoked output are analytically zero. No membrane trace or repair outcome is invented. The viable-stump diagnostic is separate.'}
  ];
  if(nativeDriven)controls.push({id:'electrode-only',name:'Additional electrode-only counterfactual',status:'completed',reason:'A separately declared external test fixture drives disconnected native stumps. It is additional to, and never substituted for, true no-device.'});
  const chargeNc=s.amplitudeUa*s.phaseWidthMs,qUc=chargeNc/1000,chargeByContact=areas.flatMap(a=>['source','return'].map(role=>{const area=a[role+'AreaUm2'],density=qUc/(area*1e-8);return {channel:a.channel,role,areaUm2:area,chargePerPhaseNc:chargeNc,geometricChargeDensityUcCm2:density,shannonK:qUc>0?Math.log10(qUc)+Math.log10(density):null};}));
  const geometryDiagnostics={geometricCapacity:geometry.capacity,physicalWellCount:geometry.wells.length,addressedPhysicalWells:geometry.channels.length,representedCensus:s.axonCount,chargePerPhaseNc:chargeNc,chargeByContact,
    poissonSingleOccupancy:s.seedingLambda*Math.exp(-s.seedingLambda),poissonExpectedSingleWells:geometry.wells.length*s.seedingLambda*Math.exp(-s.seedingLambda),
    occupancyMeaning:'Analytic independent loading of the explicitly stated well count; actual cells are fixed assumed inputs and this diagnostic is never multiplied into recruitment.',
    chargeMeaning:'Arithmetic using actual mesh patch area. Electrode polarization, injury and safety thresholds are not predicted.'};
  const cascade=[
    {label:'Declared original census',count:s.axonCount,denominator:s.axonCount,status:'fixed synthetic preoperative identity set'},
    {label:'Continuous original identities after complete resection',count:0,denominator:s.axonCount,status:'zero by explicit topology; not predicted repair'},
    {label:'Fixed engineered projecting neurons',count:s.axonCount,denominator:s.axonCount,status:'hypothetical pre-grown inputs; not a survival or fabrication yield'},
    {label:'Physically present insulating wells',count:geometry.wells.length,denominator:s.axonCount,status:'explicit field geometry; unaddressed contact pairs have zero imposed flux'},
    {label:'Addressed channel pairs',count:geometry.channels.length,denominator:s.axonCount,status:'isolated trials; every other cell remains an off-target candidate'},
    {label:'Fabrication and viable loading',count:null,denominator:s.axonCount,status:'not simulated'},
    {label:'Biologically appropriate target reinnervation',count:null,denominator:s.axonCount,status:'not simulated; electrical observation planes are assumed'},
    {label:'At least one channel recruits engineered central output',count:metrics.anyRecruitment,denominator:s.axonCount,status:auditValid?'calculated after electrical controls':'withheld: audit failed'},
    {label:'Exclusive engineered outputs',count:metrics.engineeredExclusiveCount,denominator:s.axonCount,status:auditValid?'calculated at the stated amplitude':'withheld: audit failed'},
    {label:'Exclusive with conditional local-initiation evidence',count:metrics.engineeredCausalExclusiveCount,denominator:s.axonCount,status:auditValid?'earliest observed regional threshold crossings plus loss under local silencing; no source-localization proof':'withheld: audit failed'},
    {label:'Exclusive outputs requiring active somatic conductances',count:metrics.engineeredSomaDependentExclusiveCount,denominator:s.axonCount,status:auditValid?'matched soma-only necessity; not proof of soma initiation':'withheld: audit failed'},
    {label:'Chronic survival',count:null,denominator:s.axonCount,status:'not simulated'}
  ];
  const confinement=coupling.map(row=>row.map((value,i)=>{const denominator=Math.max(...row.filter((_,j)=>j!==i));return denominator>0?value/denominator:null;}));
  const result={modelVersion:STAGE1_MODEL_VERSION,mode:s.mode,modelComponents:{membrane:MRG_VERSION,bipolar:BIPOLAR_VERSION,field:api.FIELD_STAGE1_VERSION},settings:s,geometry,identities:ledger,morphology:descriptor(m),workBudget:budget,
    auditComplete:true,auditValid,controls,baseline:compactTrace(zero,m),localSilencedBaseline:compactTrace(localZero,m),wholeSilencedBaseline:compactTrace(wholeZero,m),somaSilencedBaseline:compactTrace(somaZero,m),metrics,matrices,initiationEligibility,pairTraces,events,recordings,cascade,geometryDiagnostics,
    sharedInitialState:{engineered:zero.initialState,nativePeripheral:nativeZero.peripheral.initialState,nativeCentral:nativeZero.central.initialState},
    comparators:{noDevice,viableStumpDiagnostic,electrodeOnly:nativeDriven?{...nativeDriven,status:'calculated separate external-test fixture and viable-stump population; not matched no-device',originalContinuity:0,biologicalRepairForecast:null}:null,intactNativeContext:ledger.intactNativeContext},
    field:{settings:field.settings??fs,limits:api.STAGE1_FIELD_LIMITS??null,diagnostics:fieldDiagnostics,contacts:areas,transferMatrixMvPerUa:transferMatrix,compartmentOrder:'morphology.compartments',couplingMvPerUa:coupling,confinement,maxCouplingMvPerUa:coupling.map(row=>Math.max(...row)),
      confinementDefinition:'Potential range along one cable divided by the largest range along another cable. This is not a threshold or a recruitment probability.'},
    numericalContract:{equilibrationMs:s.equilibrationMs,eventThresholdMv:0,baselineMaximumDriftMv:.1,propagationMinSegmentVelocityMps:1,propagationMaxSegmentVelocityMps:200,propagationMaxVelocityRatio:2,initiationTimingUncertaintyMs:s.dtMs,evidence:'estimated',source:'Declared numerical diagnostics; new model verification is reported separately.'},
    diagnostics:{elapsedMs:now()-started,zeroInputDriftMv:zeroDrift,maxMembraneCurrentResidualNa:Math.max(...currentResiduals),sampledCells:s.axonCount,screening:'none; every declared driven cell and requested intervention is resolved',
      amplitudeRule:'Explicit operating point. No optimization or hidden threshold search.',recruitmentMeaning:'Three true distal-node temporal diagnostics and named interventions, conditional on the fixed assumed projecting topology.'},
    limitations:[...STAGE1_LIMITATIONS,...(!auditValid?['Electrical selectivity is withheld because a matched audit failed. Original-host structural zero remains a topology statement.']:[])],
    evidence:{anatomy:'hypothetical',equations:'mathematical',parameters:'estimated',targetReinnervation:'not simulated',survival:'not simulated'}};
  const actual=savedValueCount(result)+1;if(actual>STAGE1_BUDGET.maxSavedValues||actual>budget.retainedValues)throw new Error(`Stage 1 retained-data budget exceeded (${actual} values); result rejected without truncation.`);
  result.workBudget.actualRetainedValues=actual;onProgress({phase:'Completed fixed-topology B3 electrical audit',fraction:1});return result;
}

export async function runStage1Study(input,kind,options={}){
  const s=normalizeStage1Settings(input),definitions={
    amplitude:{key:'amplitudeUa',unit:'µA',values:orderedAmplitudeSweep(s.amplitudeUa)},
    perineurium:{key:'perineuriumResistivityOhmM',unit:'Ω m',values:[400,1149,3750]},
    aperture:{key:'wellApertureRadiusUm',unit:'µm',values:[3.1,3.5,5]},
    'soma-density':{key:'somaActiveScale',unit:'relative nodal conductance',values:[0,.03,.1,.3,1]},
    'stem-density':{key:'stemActiveScale',unit:'relative nodal conductance',values:[0,.03,.1,.3,1]},
    'soma-diameter':{key:'somaDiameterUm',unit:'µm',values:[15,20,25]}
  };
  if(!Object.hasOwn(definitions,kind))throw new Error('Unsupported Stage 1 study.');
  const {key,unit,values}=definitions[kind],settings=values.map(value=>normalizeStage1Settings({...s,[key]:value}));
  // Preflight every requested anatomical state and its actual morphology budget.
  // Invalid points are errors, never filtered from a sensitivity curve.
  const plans=settings.map(config=>{createStage1Cohort(config);const m=buildStage1Morphology(config),stumps=createNativeStumpMorphologies(m);assertDisconnectedNativeStumps(stumps);return validateStage1Budget(config,m,stumps);});
  const total={cableSolves:plans.reduce((sum,p)=>sum+p.cableSolves,0),compartmentSteps:plans.reduce((sum,p)=>sum+p.compartmentSteps,0),savedValues:plans.reduce((sum,p)=>sum+p.retainedValues,0)+Math.max(...plans.map(p=>p.peakTransientValues))};
  if(total.cableSolves>STAGE1_BUDGET.maxCableSolves||total.compartmentSteps>STAGE1_BUDGET.maxCompartmentSteps||total.savedValues>STAGE1_BUDGET.maxSavedValues)throw new Error('The complete Stage 1 study exceeds a declared total work budget. Explicitly reduce census or channels; no resolution or requested point was removed.');
  const runs=[];
  for(let i=0;i<settings.length;i++){
    if(options.shouldCancel?.())throw new Error('Stage 1 study cancelled; no partial result was published.');
    try{
      runs.push(await runStage1Protocol(settings[i],{...options,onProgress:p=>options.onProgress?.({...p,phase:`Study ${i+1}/${values.length}: ${p.phase}`,fraction:(i+p.fraction)/values.length})}));
    }catch(error){
      if(options.shouldCancel?.()||/cancelled/i.test(String(error?.message)))throw error;
      runs.push({modelVersion:STAGE1_MODEL_VERSION,mode:s.mode,settings:settings[i],auditComplete:false,auditValid:false,
        failure:{stage:'execution',name:error?.name??'Error',message:String(error?.message??error)},workBudget:plans[i],
        metrics:{anyRecruitment:null,engineeredExclusiveCount:null,engineeredCausalExclusiveCount:null,engineeredSomaDependentExclusiveCount:null},
        matrices:null,controls:[],reason:'Requested point failed during execution. No recruitment value, completed control or replacement numerical result is inferred.'});
      options.onProgress?.({phase:`Study ${i+1}/${values.length}: failed point retained (${String(error?.message??error)})`,fraction:(i+1)/values.length});
    }
  }
  const valid=runs.every(run=>run.auditComplete&&run.auditValid),brackets=kind==='amplitude'&&valid?Array.from({length:s.channelCount},(_,k)=>Array.from({length:s.axonCount},(_,i)=>bracketThreshold(values,runs.map(run=>run.matrices.assigned[k][i])))):null;
  return {kind,values,parameterKey:key,parameterUnit:unit,settings:s,modelVersion:STAGE1_MODEL_VERSION,runs,brackets,bracketStatus:kind!=='amplitude'?'not applicable':valid?'calculated from valid sampled conditions':'withheld: at least one requested execution or matched audit failed',workBudget:total,rule:'Every predeclared point and its actual geometry were preflighted. Complete controls are attempted at each point. Execution failures remain at their requested values with metrics withheld; no invalid-point filtering, interpolation, geometry retuning or amplitude optimization.'};
}
