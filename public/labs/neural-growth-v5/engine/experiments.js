import {createSimulation,stepSimulation,getMetrics,restoreSimulation,normalizeConfig,transect} from './core.js';
import {PROFILES,PREPARATION} from './profiles.js';
import {runTransmissionAssay} from './connectivity.js';
import {passiveCable} from './cable.js';
import {cargoAudit} from './physiology.js';

export function createExperiment(profile='first',options={}){
  const p=PROFILES.find(p=>p.id===profile);if(!p)throw Error('Unknown V5 experiment');
  const sim=createSimulation({...p.config,...options,profile});
  sim.provenance={preparation:PREPARATION,profile:p.name,evidence:'Exploratory model; software verification is not biological calibration.',units:{length:'µm',time:'h',force:'pN',cargo:'µm-equivalent shaft material',membrane:'µm²',field:'relative cue activity'}};
  return sim;
}
export function intervene(sim,action){
  if(sim.interventions.length>=2000)throw Error('Intervention log limit reached. Save and begin a new experiment.');
  if(!action||typeof action.type!=='string')throw Error('Invalid intervention');
  if(action.type==='parameter'){
    const allowed=['adhesion','actin','microtubules','branching','membraneSupply','cargoRate','transportSpeed','motility','tension','guidance','synaptogenesis','synapticSupport','fieldSource','glialSupport','excitation'];
    if(!allowed.includes(action.key))throw Error('That setting requires a new experiment');
    sim.config=normalizeConfig({...sim.config,[action.key]:action.value});
    if(action.key==='excitation'){sim.waves=[];for(const s of sim.segments)s.excitation={a:0,h:0};}
  }else if(action.type==='activate'){
    const tip=sim.tips.find(t=>t.id===action.tipId&&t.active)||sim.tips.find(t=>t.active&&t.cellId===(action.cellId||0));
    if(!tip)throw Error('No active process yet. Advance until neurites form.');
    sim.segments[tip.segmentId].excitation={a:1,h:0};tip.exploration.pulse=1;
    tip.behavior.phase='growing';tip.behavior.remaining=.4;
  }else if(action.type==='cut'){
    const tip=sim.tips.find(t=>t.id===action.tipId&&t.active)||sim.tips.find(t=>t.active&&t.cellId===(action.cellId||0));
    if(!tip)throw Error('Select a cell with an active process.');
    const path=[];let id=tip.segmentId;while(id>=0){path.push(id);id=sim.segments[id].parentId;}
    transect(sim,path[Math.floor(path.length/2)],.5);
  }else throw Error('Unknown intervention');
  sim.interventions.push({timeHours:sim.timeHours,...structuredClone(action)});
}
export function measure(sim){const m=getMetrics(sim);return {...m,cargo:sim.cells.map(c=>cargoAudit(sim,c)),supportAgents:sim.tissue.agents.length,excitationEvents:sim.cells.reduce((a,c)=>a+c.excitation.events,0)};}
export function electrical(sim,cellId=0){return {passive:passiveCable(sim,cellId),enabled:runTransmissionAssay(sim,{sourceCellId:cellId}),blocked:runTransmissionAssay(sim,{sourceCellId:cellId,transmission:false})};}
export function csv(sim){
  const keys=['timeHours','totalLength','minorLength','totalAxonLength','totalDendriteLength','branches','activeTips','functionalSynapses','meanDisplacement','cargoResidual'];
  const rows=[...sim.history];if(rows.at(-1)?.timeHours!==sim.timeHours)rows.push(getMetrics(sim));else rows[rows.length-1]=getMetrics(sim);
  return keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]??0).join(',')).join('\n');
}
export {stepSimulation,restoreSimulation};
