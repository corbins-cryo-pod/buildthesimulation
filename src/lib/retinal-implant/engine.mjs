import {MODEL_VERSION,normalizeConfig,generateContacts,createElectricalSources,createStimulusRaster,buildWaveform,measurePercept,configurationId} from './model.mjs';
import {predictPercept,PERCEPT_REFERENCE_VERSION} from './percept.mjs';
import {evaluateField,FIELD_MODEL_ID} from './field.mjs';

export async function simulateExperiment(input,reference,{onProgress=()=>{},yieldControl=()=>Promise.resolve()}={}){
  const started=performance.now(),config=normalizeConfig(input);
  if(config.perceptModel==='biphasic'&&config.sequence!=='simultaneous')throw new Error('The published biphasic percept model requires simultaneous zero-delay trains. Use a spatial model for interleaved electrical delivery.');
  const report=(phase,progress,message)=>onProgress({phase,progress,message});
  report('geometry',.08,'Building contact geometry and exact pulse schedules');
  const contacts=generateContacts(config),electrical=createElectricalSources(config,contacts),{sources}=electrical,waveform=buildWaveform(config),contactMetrics={},warnings=[];
  let totalAbsoluteChargeNc=0,netChargeNc=0;
  for(const p of contacts){const w=buildWaveform(config,p.id);contactMetrics[p.id]={phaseChargeNc:w.phaseChargeNc,chargeDensityUcCm2:w.chargeDensityUcCm2,pulseCount:w.pulseCount,netChargeNc:w.netChargeNc,totalAbsoluteChargeNc:w.totalAbsoluteChargeNc,offsetMs:w.offsetMs,amplitudeUa:w.amplitudeUa};totalAbsoluteChargeNc+=w.totalAbsoluteChargeNc;netChargeNc+=w.netChargeNc;p.pulseCount=w.pulseCount;}
  const effective=contacts.map(p=>({...p,amplitudeUa:p.pulseCount?p.amplitudeUa:0})),stimulus=createStimulusRaster(config);
  await yieldControl();report('percept',.24,'Evaluating the pinned published percept model');
  const options={electrodes:effective,eye:config.eye,model:config.perceptModel,rhoUm:config.rhoUm,lambdaUm:config.lambdaUm,frequencyHz:config.frequencyHz,phaseDurationMs:config.phaseDurationMs,gridStepDeg:config.gridStepDeg};
  const percept=predictPercept(reference,options);percept.metrics={...percept.metrics,...measurePercept(percept)};
  const circularPercept=config.compareCircular?predictPercept(reference,{...options,model:config.perceptModel==='biphasic'?'biphasic-scoreboard':'scoreboard'}):null;
  if(circularPercept)circularPercept.metrics={...circularPercept.metrics,...measurePercept(circularPercept)};
  await yieldControl();report('field',.5,'Solving finite source and return fields on the retinal plane');
  const selected=contacts.find(p=>p.id===config.selectedId),n=config.fieldGridSize;
  const cx=config.fieldView==='selected'?selected.xUm:config.xUm,cy=config.fieldView==='selected'?selected.yUm:config.yUm;
  const extent=config.fieldView==='selected'?config.fieldSpanUm/2:Math.max(3500,...contacts.map(p=>Math.max(Math.abs(p.xUm-cx),Math.abs(p.yUm-cy))+1200));
  const xUm=Float64Array.from({length:n},(_,i)=>cx-extent+2*extent*i/(n-1)),yUm=Float64Array.from({length:n},(_,i)=>cy+extent-2*extent*i/(n-1));
  const points=[];for(const y of yUm)for(const x of xUm)points.push({xUm:x,yUm:y,zUm:0});
  const fieldOptions={conductivitySm:config.conductivitySm,quadratureOrder:32,interpolation:true,requireBalanced:true};
  const field={width:n,height:n,xUm,yUm,zUm:0,gridStepUm:2*extent/(n-1),...evaluateField(sources,points,fieldOptions)};
  field.metadata={...field.metadata,snapshotTimeMs:electrical.snapshotTimeMs,snapshotLabel:electrical.snapshotLabel,observationPlane:'Retinal tangent plane, z=0 µm',peakInterpretation:'Maximum over sampled grid; not a continuous-space maximum.'};
  report('inspection',.82,'Evaluating contact-center probes and image measurements');
  const probes=evaluateField(sources,contacts.map(p=>({xUm:p.xUm,yUm:p.yUm,zUm:0})),fieldOptions);
  for(let i=0;i<contacts.length;i++)Object.assign(contactMetrics[contacts[i].id],{totalPotentialMv:probes.potentialMv[i],potentialMv:probes.potentialMv[i],fieldVm:Math.hypot(probes.exVm[i],probes.eyVm[i],probes.ezVm[i]),exVm:probes.exVm[i],eyVm:probes.eyVm[i],ezVm:probes.ezVm[i],currentDensityAm2:probes.currentDensityAm2[i]});
  let maxAbsPotentialMv=0,maxFieldVm=0,maxCurrentDensityAm2=0;
  for(let i=0;i<points.length;i++){maxAbsPotentialMv=Math.max(maxAbsPotentialMv,Math.abs(field.potentialMv[i]));maxFieldVm=Math.max(maxFieldVm,Math.hypot(field.exVm[i],field.eyVm[i],field.ezVm[i]));maxCurrentDensityAm2=Math.max(maxCurrentDensityAm2,field.currentDensityAm2[i]);}
  const p=percept.metrics,metrics={drivenContacts:effective.filter(c=>c.amplitudeUa>0).length,totalContacts:contacts.length,phaseChargeNc:waveform.phaseChargeNc,chargeDensityUcCm2:waveform.chargeDensityUcCm2,selectedNetChargeNc:waveform.netChargeNc,netChargeNc,totalAbsoluteChargeNc,selectedPulseCount:waveform.pulseCount,peakCurrentUa:Math.max(0,...contacts.map(c=>c.amplitudeUa)),summedAmplitudeUa:contacts.reduce((s,c)=>s+c.amplitudeUa,0),snapshotTotalCurrentUa:electrical.totalCurrentUa,netSourceCurrentUa:electrical.netCurrentUa,perceptAreaDeg2:p.areaDeg2,perceptPeak:p.peak,perceptElongation:p.elongation,perceptCentroidXDeg:p.centroidXDeg,perceptCentroidYDeg:p.centroidYDeg,perceptComponents:p.components,perceptIntegratedBrightness:p.integratedBrightness,touchesEdge:p.touchesEdge,maxFieldVm,maxAbsPotentialMv,maxCurrentDensityAm2,fieldGridStepUm:field.gridStepUm,elapsedMs:performance.now()-started};
  if(field.gridStepUm>Math.min(config.gapUm,config.diameterUm/2)/2)warnings.push('The electrical grid is coarse relative to contact and gap dimensions. Sampled peaks can miss local maxima; inspect a contact site or select a local region and finer grid.');
  if(percept.metadata?.sampling?.warning)warnings.push(percept.metadata.sampling.warning);
  if(percept.metrics.appreciableTailAtBoundary)warnings.push('A percept tail reaches the ±15° visual boundary. Extent and integrated brightness are limited by this field of view.');
  if(contacts.some(c=>Math.abs(c.xDeg)>15||Math.abs(c.yDeg)>15))warnings.push('Some contacts lie outside the displayed visual field. Their modeled contributions may enter from beyond the viewport.');
  if(config.sequence==='interleaved')warnings.push('The percept compares spatial electrode amplitudes and does not predict the visual effect of interleaved timing. The electrical map shows one cathodic slot.');
  if(config.perceptModel==='biphasic'){
    warnings.push('Thresholds are assumed 50%-detection currents at 0.45 ms and the selected frequency. This is a representative pulse-train image, without within-train dynamics or interphase-gap dependence.');
    if(effective.some(c=>c.amplitudeUa>0&&c.amplitudeUa<c.thresholdUa))warnings.push('Some channels are below their assumed 50%-detection current. Empirical brightness is not a detection probability and has no hard detection gate.');
  }
  if(contacts.some(c=>c.amplitudeUa>0&&!c.pulseCount))warnings.push('The finite train window contains no complete pulse for some channels; they contribute no percept drive.');
  if(config.budgetMode==='total-current'&&metrics.summedAmplitudeUa<config.totalCurrentUa-1e-6)warnings.push('Configured summed current is below the budget cap under the selected scene weights and per-contact limit.');
  if(config.device==='argus-ii'&&(config.rows!==6||config.cols!==10||config.pitchUm!==575||config.diameterUm!==225))warnings.push('Edited Argus-II-derived geometry. The pinned software reference is 6×10 contacts, 575 µm pitch and 225 µm diameter.');
  const result={config,contacts,sources,stimulus,percept,circularPercept,field,waveform,metrics,contactMetrics,warnings,experimentId:configurationId(config),modelVersion:MODEL_VERSION,provenance:{perceptReference:PERCEPT_REFERENCE_VERSION,referenceAssetSha256:reference.manifest.dataSha256,fieldModel:FIELD_MODEL_ID,modelVersion:MODEL_VERSION,createdAt:new Date().toISOString(),geometry:config.device==='argus-ii'?'Editable pulse2percept 0.11.0 Argus-II reference':'User-defined planar test array',sampling:{visualStepDeg:config.gridStepDeg,visualBoundsDeg:[-15,15],fieldGridSize:n,fieldGridStepUm:field.gridStepUm},physiology:'Phenomenological epiretinal percept model; no membrane or spike solver.',anatomy:'Population-average Jansonius paths; 3D curvature is separate from the planar field model.'}};
  report('complete',1,'Experiment complete');return result;
}
