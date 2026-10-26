import {createActiveCable,stepActiveCable} from '../../vendor/cortex/active-cable.js';
import {pulseIntervals,pulseAt,expressionFactor,conditionCable,analyzePulses} from '../simulation.js';
import {OPSINS,createOpsin,opening,currentFactor,slopeFactor,advanceOpsin} from './opsins.js';
import {chlorideReversal,compartmentVolume,advanceChloride} from './chloride.js';
import {sourceField,sourcePowers} from './optics.js';
import {validateAdvanced,ADVANCED_VERSION,ADVANCED_SCHEMA} from './config.js';
import {runThermal} from './thermal.js';
function rigidPoint(point,cell){
 let [x,y,z]=point;const [a,b,c]=cell.rotationDeg.map(x=>x*Math.PI/180);
 [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
 [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
 [x,y]=[x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c)];
 return [x+cell.offsetUm[0],y+cell.offsetUm[1],z+cell.offsetUm[2]];
}
function populationNodes(model,c,cell){
 let nodes=model.variants[String(c.experiment.segmentLengthUm)];
 if(c.experiment.mode==='clamp')nodes=[{...nodes.find(n=>n.sectionType==='soma'&&n.areaUm2>0),parent:-1,edgeUs:0}];
 return nodes.map(n=>({...n,cellId:cell.id,centerUm:rigidPoint(n.centerUm,cell),startUm:rigidPoint(n.startUm,cell),endUm:rigidPoint(n.endUm,cell),pathUm:(n.pathUm??[]).map(p=>rigidPoint(p,cell))}));
}
function spatialExpression(node,config,cell){
 if(config.experiment.mode==='clamp')return 1;
 if(config.experiment.expression==='soma-targeted'){
  if(node.areaUm2<=0||node.sectionType==='axon')return 0;
  return node.sectionType==='soma'?1:Math.exp(-Math.hypot(...node.centerUm.map((x,k)=>x-cell.offsetUm[k]))/50);
 }
 return expressionFactor(node,config.experiment.expression,config.experiment.expressionSectionId);
}
function runSingle(model,c,cell,dark=false,retain=true,onProgress){
 const cfg=c.experiment,nodes=populationNodes(model,c,cell),n=nodes.length,soma=nodes.findIndex(x=>x.sectionType==='soma'&&x.areaUm2>0),opsinId=cell.opsin??c.opsin;
 if(cfg.expression==='section'&&!nodes.some(n=>n.areaUm2>0&&n.sectionId===cfg.expressionSectionId))throw Error('Selected expression section is absent from this morphology.');
 const o=createOpsin(opsinId,n,opsinId===c.opsin?c.kinetics:{}),isCl=OPSINS[opsinId].ion==='chloride',pulses=pulseIntervals(cfg);
 const physical=Float64Array.from(nodes,n=>n.areaUm2>0?sourceField(n.centerUm,c.source,c.device):0);
 const effective=Float64Array.from(nodes,n=>n.areaUm2>0&&!dark?sourceField(n.centerUm,c.source,c.device,opsinId):0);
 if(Math.max(...physical)>100)throw Error('A compartment receives >100 mW/mm². Reduce source power or move the emitter.');
 const g=Float64Array.from(nodes,node=>cfg.conductanceDensityScm2*cell.expressionScale*spatialExpression(node,c,cell)*node.areaUm2*.01),active=nodes.map((_,i)=>i).filter(i=>g[i]>0);
 const ci=Float64Array.from(nodes,node=>node.sectionType==='axon'?c.chloride.axonMm:c.chloride.insideMm),setpoint=ci.slice(),ecl=Float64Array.from(ci,x=>chlorideReversal(x,c.chloride.outsideMm));
 const volumes=Float64Array.from(nodes,n=>compartmentVolume(n)*c.chloride.volumeFraction);
 const cable=cfg.mode==='clamp'?null:createActiveCable(nodes,model.fit),v=cable?.voltageMv??new Float64Array(1).fill(cfg.clampMv);
 if(cable)conditionCable(cable,cfg,model,p=>onProgress?.(p.progress*.7,'Conditioning identical membrane state'));
 const time=[];for(let i=0;i*cfg.sampleMs<cfg.durationMs-1e-9;i++)time.push(i*cfg.sampleMs);time.push(cfg.durationMs);
 const frames=time.length,alloc=()=>retain?new Float32Array(n*frames):null;
 const r={id:cell.id,opsin:opsinId,cell,nodes,n,frames,somaIndex:soma,timeMs:Float64Array.from(time),voltageMv:alloc(),photocurrentNa:alloc(),effectiveOpen:alloc(),chlorideMm:alloc(),chlorideReversalMv:alloc(),
 somaVoltageMv:new Float64Array(frames),somaChlorideMm:new Float64Array(frames),somaChlorideReversalMv:new Float64Array(frames),totalPhotocurrentNa:new Float64Array(frames),lightDrive:new Float64Array(frames),injectionNa:new Float64Array(frames),lightMwMm2:physical,effectiveLightMwMm2:effective,spikes:[],
 diagnostics:{maximumKclResidualNa:0,maximumLinearizationErrorNa:0,minimumChlorideMm:Math.min(...ci),maximumChlorideMm:Math.max(...ci),peakVoltageMv:-Infinity,peakAbsPhotocurrentNa:0,minimumProbability:1,maximumProbabilitySumError:0,maximumLocalExposureMwMm2:Math.max(...physical),expressingSitesAboveWilliamsLightRange:opsinId==='chr2'?active.filter(i=>effective[i]>5.5).length:null,opsinEvidence:OPSINS[opsinId].evidence,opsinParameters:o.parameters,retainedAllCompartments:retain}};
 const tan=new Float64Array(n),offset=new Float64Array(n),oldBase=new Float64Array(n),oldE=new Float64Array(n),inject=new Float64Array(n),kcl=new Float64Array(n);
 const edges=[...new Set([...pulses.flatMap(p=>[p.startMs,p.endMs]),c.drive.startMs,c.drive.endMs])].sort((a,b)=>a-b);
 let t=0,edge=0,lastSpike=-Infinity,steps=0;
 function save(k){
  r.somaVoltageMv[k]=v[soma];r.somaChlorideMm[k]=ci[soma];r.somaChlorideReversalMv[k]=ecl[soma];r.lightDrive[k]=dark?0:pulseAt(time[k],pulses);
  r.injectionNa[k]=cable&&time[k]>=c.drive.startMs&&time[k]<c.drive.endMs?c.drive.currentNa:0;
  if(retain){r.voltageMv.set(v,k*n);r.chlorideMm.set(ci,k*n);r.chlorideReversalMv.set(ecl,k*n);}
  let total=0;
  for(const i of active){const q=opening(o,i),I=g[i]*q*currentFactor(o,v[i],ecl[i]);total+=I;if(retain){r.photocurrentNa[k*n+i]=I;r.effectiveOpen[k*n+i]=q;}}
  r.totalPhotocurrentNa[k]=total;r.diagnostics.peakAbsPhotocurrentNa=Math.max(r.diagnostics.peakAbsPhotocurrentNa,Math.abs(total));
 }
 save(0);
 for(let f=1;f<frames;f++){
  while(t<time[f]-1e-9){
   while(edge<edges.length&&edges[edge]<=t+1e-9)edge++;
   const dt=Math.min(cfg.dtMs,time[f]-t,(edges[edge]??Infinity)-t),light=pulseAt(t+dt*.5,pulses),previous=v[soma];
   const injected=cable&&t+dt*.5>=c.drive.startMs&&t+dt*.5<c.drive.endMs?c.drive.currentNa:0;
   inject[soma]=injected;
   for(const i of active){
    oldBase[i]=g[i]*opening(o,i);oldE[i]=ecl[i];tan[i]=oldBase[i]*slopeFactor(o,v[i]);offset[i]=oldBase[i]*currentFactor(o,v[i],ecl[i])-tan[i]*v[i];
   }
   if(cable){
    stepActiveCable(cable,dt,{injectionNa:inject,synapticUs:tan,membraneOffsetNa:offset});
    // Sample KCL periodically; the same physical currents remain in every solve.
    if(steps%20===0){
     kcl.set(cable.membraneCurrentNa);kcl[soma]-=injected;
     for(let i=1;i<n;i++){const p=nodes[i].parent;if(p>=0){const I=nodes[i].edgeUs*(v[i]-v[p]);kcl[i]+=I;kcl[p]-=I;}}
     for(const I of kcl)r.diagnostics.maximumKclResidualNa=Math.max(r.diagnostics.maximumKclResidualNa,Math.abs(I));
    }
   }
   for(const i of active){
    const usedCurrent=tan[i]*v[i]+offset[i];
    r.diagnostics.maximumLinearizationErrorNa=Math.max(r.diagnostics.maximumLinearizationErrorNa,Math.abs(usedCurrent-oldBase[i]*currentFactor(o,v[i],oldE[i])));
    if(isCl){ci[i]=advanceChloride(ci[i],usedCurrent,volumes[i],dt,setpoint[i],c.chloride.recoveryMs,c.chloride.dynamic);ecl[i]=chlorideReversal(ci[i],c.chloride.outsideMm);
     r.diagnostics.minimumChlorideMm=Math.min(r.diagnostics.minimumChlorideMm,ci[i]);r.diagnostics.maximumChlorideMm=Math.max(r.diagnostics.maximumChlorideMm,ci[i]);}
    advanceOpsin(o,i,v[i],effective[i]*light,dt);
   }
   if(cable&&previous< -25&&v[soma]>=-25){const event=t+dt*(-25-previous)/(v[soma]-previous);if(event-lastSpike>=2){r.spikes.push({timeMs:event,compartmentId:nodes[soma].id});lastSpike=event;}}
   r.diagnostics.peakVoltageMv=Math.max(r.diagnostics.peakVoltageMv,v[soma]);t+=dt;steps++;
  }
  t=time[f];save(f);if(f%40===0)onProgress?.(.12+.88*t/cfg.durationMs,'Solving '+cell.id+' · '+(dark?'matched dark control':OPSINS[opsinId].name));
 }
 const stride=opsinId==='chr2'?5:3,states=opsinId==='chr2'?4:3;
 for(const i of active){let sum=0;for(let k=0;k<states;k++){const q=o.state[i*stride+k];sum+=q;r.diagnostics.minimumProbability=Math.min(r.diagnostics.minimumProbability,q);}r.diagnostics.maximumProbabilitySumError=Math.max(r.diagnostics.maximumProbabilitySumError,Math.abs(sum-1));}
 r.diagnostics.integrationSteps=steps;r.pulseMetrics=cfg.mode==='neuron'?analyzePulses(r.spikes,pulses,cfg.durationMs):null;
 return r;
}
function countInEpoch(spikes,pulses){return spikes.filter(s=>pulses.some(p=>s.timeMs>=p.startMs&&s.timeMs<p.endMs)).length;}
function runAdvanced(model,input,onProgress){
 const start=performance.now(),c=validateAdvanced(input),pulses=pulseIntervals(c.experiment),cells=[],control=[],total=c.population.count*(c.matchedControl?2:1)+(c.thermal.enabled?1:0);let done=0;
 const progress=(p,stage)=>onProgress?.({progress:(done+p)/total,stage});
 for(const cell of c.population.cells){
  const r=runSingle(model,c,cell,false,true,progress);cells.push(r);done++;
  if(c.matchedControl){control.push(runSingle(model,c,cell,true,false,progress));done++;}
 }
 let thermal=null;if(c.thermal.enabled){
  thermal=runThermal(c,pulses,cells[0].timeMs,cells.flatMap(r=>r.nodes.map(n=>n.centerUm)),p=>progress(p.progress,p.stage));done++;
 }
 const summaries=cells.map((r,i)=>{
  const illuminatedEvents=countInEpoch(r.spikes,pulses),baselineEvents=c.matchedControl?countInEpoch(control[i].spikes,pulses):null;
  return {cellId:r.id,opsin:r.opsin,somaExposureMwMm2:r.lightMwMm2[r.somaIndex],maxExposureMwMm2:Math.max(...r.lightMwMm2),spikes:r.spikes.length,matchedDarkSpikes:control[i]?.spikes.length??null,illuminatedEvents,baselineEpochEvents:baselineEvents,eventReductionFraction:baselineEvents>0?1-illuminatedEvents/baselineEvents:null,exactlyOnePulses:r.pulseMetrics?.exactlyOnePulses??null};
 });
 onProgress?.({progress:1,stage:'Complete'});return {schema:'bts-opto-result/3',version:ADVANCED_VERSION,config:c,modelId:model.id,sourceCommit:model.sourceCommit,sourceHashes:model.sourceHashes,pulses,cells,control,thermal,summaries,
  diagnostics:{computationMs:performance.now()-start,sourcePowers:sourcePowers(c.source,c.device),cellCount:cells.length,independentCells:true,temperatureFeedback:false,
  limitations:['Cells are rotated/translated copies of one fitted human model, not distinct biological cell types. No synapses, ephaptic coupling or collision physics.','The original cell has a synthetic axon stub; chloride in that stub is an assumption, not measured anatomy.','Reduced opsin kinetics and off-peak action spectra are exploratory, not independently fitted experimental models.','Chloride uses independent well-mixed local pools, finite geometry-derived volume and a relaxation surrogate for transport; no axial ionic diffusion, bicarbonate or extracellular depletion.','Event reduction compares counts inside the illuminated intervals with an identical-drive dark control. Negative reduction means more events; it does not prove causal inhibition or account for all post-light effects.','Williams ChR2 was characterized at −80 to −10 mV and 0.34–5.5 mW/mm². Rest/AP voltages and some LED-site exposures extrapolate the fit; no recruitment accuracy is established.',
  'The inherited 40→20 µm voltage/spike convergence limitation remains. Thermal feedback is not included.']}};
}
export {rigidPoint,populationNodes,spatialExpression,runSingle,countInEpoch,runAdvanced};
