import {confinement} from './confinement.mjs';
import {qualifySelectivity} from './causal-selectivity.mjs';
import {normalize,budget,VERSION} from './settings.mjs';
import {createBipolarMorphology} from '../bipolar.mjs';
import {createStage1Cohort,createIdentityLedger} from '../identities.mjs';
import {stage1FieldSettings,stage1PhaseAverage,propagatedArmOutput} from '../stage1-protocol.mjs';
import {createStage1FieldModel,solveStage1Channel,sampleMembraneTransfer} from '../field-stage1.mjs';
import {simulateCable} from './membrane.mjs';
import {createPhotocurrent} from './photocurrent.mjs';
import {surfaceScene,surfaceTransport,surfaceCoefficients} from './optical-surface.mjs';
import {solveMagneticChannel,coilSlew,coilDrive} from './magnetic-coupling.mjs';
import {analyzeMatrix,analyzeSweep} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/selectivity.mjs';
import {ledEnergy} from '../../../../public/simulations/biohybrid-axon-interface/stage2/modules/optics.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const sum=x=>x.reduce((a,b)=>a+b,0);
export async function runProtocol(input,{onProgress=()=>{},shouldCancel=()=>false}={}){
 const started=performance.now(),{settings:s,anatomy}=normalize(input),m=createBipolarMorphology(anatomy),g=createStage1Cohort(anatomy),identities=createIdentityLedger(anatomy,g),work=budget(s,m);
 const check=()=>{if(shouldCancel())throw new Error('Calculation cancelled; no partial matrix was released.');};
 const controls=['assigned','regionalSilenced','wholeSilenced','somaSilenced',...(s.modality==='optical'?['opsinBlocked']:[])];
 const silence={assigned:[],regionalSilenced:m.initiationRegionIndices,wholeSilenced:m.activeSiteIndices,somaSilenced:m.somaIndices,opsinBlocked:[]};
 const common={morphology:m,dtMs:s.dtMs,durationMs:s.durationMs,equilibrationMs:50,traceStride:Math.round(s.sampleDtMs/s.dtMs),saveCurrents:false,maxEventsPerNode:8};
 check();onProgress({phase:'Matched dark/no-drive baselines',fraction:.01});
 const base=simulateCable(common),zeroByControl={assigned:base};for(const control of controls.slice(1)){zeroByControl[control]=simulateCable({...common,initialState:base.initialState,silencedCompartments:silence[control]});check();}
 const zeroDrift=Math.max(...base.membraneMv.map(v=>Math.max(...v.map(x=>Math.abs(x-v[0]))))),baselineValid=zeroDrift<=.1&&Object.values(zeroByControl).every(r=>r.events.length===0);
 if(!baselineValid)throw new Error('Matched no-drive audit failed; recruitment withheld.');
 onProgress({phase:'Meshing physical wells and reciprocal recording contacts',fraction:.03});
 const field=createStage1FieldModel(stage1FieldSettings(anatomy,m),{...g,morphology:m,constructPresent:true}),readout=solveStage1Channel(field,g.channels[0]),recordTransfers=g.cells.map(c=>sampleMembraneTransfer(readout,m,c));
 const points=s.amplitudes.map(amplitude=>({amplitude,matrices:Object.fromEntries(controls.map(c=>[c,[]])),pairs:[],recordings:[],auditValid:false})),fieldReports=[],units={electrode:'uA',magnetic:'A peak',optical:'mW emitted'};
 let completed=0;const total=s.channelCount*s.amplitudes.length*s.axonCount;
 for(let k=0;k<s.channelCount;k++){
  check();let transfer=null,magnetic=null,optical=null,stimSolution=null;
  if(s.modality==='electrode'){stimSolution=k===0?readout:solveStage1Channel(field,g.channels[k]);transfer=g.cells.map(c=>Array.from(sampleMembraneTransfer(stimSolution,m,c)));fieldReports.push({channel:g.channels[k].id,transfers:transfer,diagnostics:stimSolution.diagnostics});}
  if(s.modality==='magnetic'){magnetic=solveMagneticChannel(field,m,g,k,{coilOptions:{layers:s.coilLayers},shouldCancel,onProgress});transfer=magnetic.transfers.map(t=>t.effective);fieldReports.push({channel:g.channels[k].id,transfers:magnetic.transfers,coil:magnetic.coil,inductance:magnetic.inductance,diagnostics:magnetic.diagnostics,limitations:magnetic.limitations});}
  if(s.modality==='optical'){optical=surfaceTransport(surfaceScene(g,m,k,{shellThicknessUm:s.shellThicknessUm}),{photons:s.photons,seed:(s.seed+1009*k)>>>0,reflectivity:s.reflectivity,totalChannels:s.channelCount},p=>{check();onProgress({...p,fraction:.05+.9*(completed/total)});});fieldReports.push({channel:g.channels[k].id,...optical});}
  fieldReports[k].confinement=confinement(s.modality,fieldReports[k],m,k);
  for(const point of points){
   const amplitude=point.amplitude;for(const c of controls)point.matrices[c][k]=[];const pairRecording=Array.from({length:Math.round(s.durationMs/s.sampleDtMs)+1},()=>0);
   for(let j=0;j<s.axonCount;j++){
    check();const interventions={},waveform=s.modality==='electrode'?t=>stage1PhaseAverage({...anatomy,amplitudeUa:amplitude},t):s.modality==='magnetic'?t=>coilSlew(t,s.dtMs,{peakA:amplitude,riseMs:s.coilRiseMs}):null;
    for(const control of controls){
     const photo=s.modality==='optical'?createPhotocurrent(m,{fluencePerMw:surfaceCoefficients(optical,m,j),emittedMw:amplitude,gmaxMsCm2:s.gmaxMsCm2,pulseWidthMs:s.opticalPulseMs,blocked:control==='opsinBlocked',traceStride:common.traceStride}):null;
     let sample=0;const trace=simulateCable({...common,initialState:base.initialState,silencedCompartments:silence[control],transferMvPerUa:transfer?.[j]??null,waveform,membraneMechanism:photo?.mechanism??null,
      onSample:control==='assigned'?(_t,currents)=>{pairRecording[sample++]+=sum(currents.outer.map((v,i)=>v*recordTransfers[j][i]));}:null});
     const response=propagatedArmOutput(trace,m,'central',{notBeforeMs:.5});point.matrices[control][k][j]=Number(response.recruited);
     interventions[control]={timeMs:trace.timesMs,voltageMv:trace.membraneMv,events:trace.events,central:response,peripheral:propagatedArmOutput(trace,m,'peripheral',{notBeforeMs:.5}),diagnostics:trace.diagnostics,initialStateExact:JSON.stringify(trace.initialState)===JSON.stringify(base.initialState),...(photo?{opsin:photo.diagnostics(),photocurrent:photo.history}:{})};
    }
    let exposureSensitivity=null;
    if(optical){exposureSensitivity={};for(const side of ['lower','upper']){const photo=createPhotocurrent(m,{fluencePerMw:surfaceCoefficients(optical,m,j,side),emittedMw:amplitude,gmaxMsCm2:s.gmaxMsCm2,pulseWidthMs:s.opticalPulseMs,traceStride:common.traceStride}),r=simulateCable({...common,initialState:base.initialState,membraneMechanism:photo.mechanism});exposureSensitivity[side]={central:propagatedArmOutput(r,m,'central',{notBeforeMs:.5}),events:r.events,diagnostics:r.diagnostics};}
     exposureSensitivity.sameClassificationAtThreeProbes=['lower','upper'].every(x=>exposureSensitivity[x].central.recruited===interventions.assigned.central.recruited);
     exposureSensitivity.meaning='Three finite sensitivity probes of the exposure interval. These are not a mathematical enclosure of nonlinear recruitment for every interior field.';
    }
    point.pairs.push({channelIndex:k,cellIndex:j,channelId:g.channels[k].id,cellId:g.cells[j].id,interventions,exposureSensitivity});completed++;onProgress({fraction:.05+.9*completed/total,phase:`${s.modality}: channel ${k+1}/${s.channelCount}, amplitude ${amplitude}, cell ${j+1}/${s.axonCount}`});
   }
   let artifact=null;if(s.modality==='electrode'){const mutual=sum(Array.from(readout.loadUa,(v,i)=>v*stimSolution.potentialMvPerUa[i]));artifact=base.timesMs.map(t=>1000*mutual*stage1PhaseAverage({...anatomy,amplitudeUa:amplitude},t));}else if(s.modality==='optical')artifact=base.timesMs.map(()=>0);
   point.recordings.push({channelIndex:k,timeMs:base.timesMs,engineeredSourceUv:pairRecording,originalHostSourceUv:pairRecording.map(()=>0),imposedFieldArtifactUv:artifact,totalUv:artifact?pairRecording.map((v,i)=>v+artifact[i]):null,
    artifactMeaning:s.modality==='magnetic'?'Withheld: induction artifact depends on the measurement-lead loop, which is not specified.':s.modality==='optical'?'Zero imposed electrical field in the optical model; LED wiring pickup is not modeled.':'Reciprocal finite-contact transfer of the imposed source-return current.',
    meaning:'Full-precision model currents projected on the same reciprocal contact functional. Known-source partition, not experimental spike sorting.'});
   point.energy??=[];point.energy.push(s.modality==='magnetic'?coilDrive(magnetic.coil,{peakA:amplitude,riseMs:s.coilRiseMs,simultaneousChannels:s.channelCount,inductanceH:magnetic.inductance.henry}):s.modality==='optical'?ledEnergy({emittedMw:amplitude,pulseMs:s.opticalPulseMs,channels:s.channelCount}):{geometricChargeNc:amplitude*anatomy.phaseWidthMs,electrochemicalSafety:null});
  }
 }
 check();for(const point of points){
  point.auditValid=point.pairs.every(p=>Object.values(p.interventions).every(r=>r.initialStateExact));
  const analysis=analyzeMatrix({assigned:point.matrices.assigned,blocked:point.matrices.regionalSilenced,wholeSilenced:point.matrices.wholeSilenced,cellIds:g.cells.map(c=>c.id),channelIds:g.channels.map(c=>c.id),census:s.axonCount,auditComplete:true,auditValid:point.auditValid,provenance:'New full-cohort nonlinear solves at the retained amplitude.'});
  point.exposureProbeAgreement=point.pairs.every(p=>!p.exposureSensitivity||p.exposureSensitivity.sameClassificationAtThreeProbes);
  const qualified=qualifySelectivity(point.matrices,g.cells.map(c=>c.id));
  const headline=analysis.headline?{...analysis.headline,...qualified,exclusiveCoverageOfOriginalCensus:qualified.exclusiveCount/s.axonCount}:null;
  point.metrics={...analysis,nominalHeadline:headline,descriptiveUncontrolledCounts:analysis.headline,headline:point.exposureProbeAgreement?headline:null,headlineMeaning:s.modality==='optical'?(point.exposureProbeAgreement?'Conditional on the nominal finite-shell light field; the three exposure probes agree. This is not a rigorous uncertainty-certified firing result.':'Withheld: optical exposure probes change a recruitment classification. Nominal descriptive results remain visible.'):'Conditional on the declared field and membrane model. Required mechanism-removal controls must abolish the output.'};
 }
 const sweep=analyzeSweep(points.map(p=>({amplitude:p.amplitude,auditValid:p.auditValid,assigned:p.matrices.assigned})));
 const candidates=points.filter(p=>p.metrics.headline),chosen=[...candidates].sort((a,b)=>b.metrics.headline.exclusiveCount-a.metrics.headline.exclusiveCount||a.amplitude-b.amplitude)[0];
 return {schema:'axon-stage2.coupled-result.v1',modelVersion:VERSION,settings:clone(s),anatomySettings:clone(anatomy),units:{amplitude:units[s.modality],voltage:'mV',electricalTime:'ms',recording:'uV',coordinate:'um'},geometry:g,identities,morphology:{parameters:m.parameters,compartments:m.compartments.map(c=>({index:c.index,kind:c.kind,role:c.role,zUm:c.zUm,lengthUm:c.lengthUm,diameterUm:c.diameterUm})),recordIndices:m.activeSiteIndices,somaIndices:m.somaIndices},work,points,sweep,fieldReports,
  zeroInput:{maximumDriftMv:zeroDrift,eventsByControl:Object.fromEntries(Object.entries(zeroByControl).map(([c,r])=>[c,r.events.length])),initialState:base.initialState},auditComplete:true,auditValid:points.every(p=>p.auditValid),
  operatingPoint:{amplitude:chosen?.amplitude??null,rule:'Greatest conditional exclusive count on the declared valid grid; lowest amplitude breaks ties. No interpolation or threshold extrapolation.'},
  originalHost:{census:s.axonCount,preserved:0,uniquelyAddressed:0,y:0,reason:'Complete resection in the declared B3 topology. E identities are not H identities.'},
  noDevice:{census:s.axonCount,originalPreserved:0,originalY:0,implantedCells:0,wells:0,drive:0,meaning:'Same assumed absent native remnants; removing introduced cells/wells/drive leaves no excitable population in this postoperative domain.'},
  limitations:['Numerical Stage 2 development experiment; release qualification is on the methods page, not inferred from a successful calculation.','Fixed hypothetical B3 anatomy; no growth, survival or target reinnervation.','MRG motor-fiber equations and hypothetical soma conductances are not measured human spiral-ganglion physiology.','Junction block is not applicable: each introduced bipolar cell owns both projections. Regional, soma-only, whole-cell and optical opsin-block interventions are separate.','All declared cells are resolved. No untested channel or full human census is inferred.','Optical confidence intervals quantify packet sampling in a finite-shell model. Three endpoint/mean probes cannot prove behavior throughout a nonlinear parameter interval.','Magnetic recording artifact is withheld without a defined lead loop. Electrode polarization, impedance, circuit pickup and noise are unsolved.','No result is a device specification, surgical recommendation or prediction of human recovery, safety or implant lifetime.'],elapsedSeconds:(performance.now()-started)/1000};
}
