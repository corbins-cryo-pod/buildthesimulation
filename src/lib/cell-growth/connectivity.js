/** Local encounters, molecular-competence proxies, contact bonds and synaptic
 * maturation. All kinetic coefficients are exploratory. The state labels denote
 * modeled assemblies, not experimentally established synapses. Time is hours.
 */
import {add,sub,scale,dot,length,distance,unit,clamp,lerp,closestSegmentPoints,pointSegmentDistance} from './geometry.js';

export const CONNECTIVITY=Object.freeze({candidateHours:.3,structuralHours:2,presynapticTauHours:3,
  receptorTauHours:8,bondSpring:8,bondBreakExtension:1.2,maxProbeReach:8,siteSpacing:3,
  cueDecayLength:35,cueCoreRadius:8,maxContacts:2000});
const mature=c=>({stem:0,precursor:0,immature:.25,polarized:.7,maturing:1}[c.stage]??0);
export function createCellIdentity(id){return {transmitter:id%5===4?'inhibitory':'excitatory',
  organizer:1,receptivity:1,cueSecretion:1,cueAttraction:1,cueRepulsion:0};}
export function contactCompatibility(sim,axon,dendrite){
  if(!axon?.alive||!dendrite?.alive||axon.kind!=='axon'||dendrite.kind!=='dendrite'||axon.cellId===dendrite.cellId)return 0;
  const pre=sim.cells[axon.cellId],post=sim.cells[dendrite.cellId];
  return clamp((sim.config.synaptogenesis??1)*(pre.identity?.organizer??0)*(post.identity?.receptivity??0)*Math.sqrt(mature(pre)*mature(post)),0,1);
}

/** Optional assay field: screened 3-D diffusion/decay equilibrium in the bath.
 * Sources/receptors are explicit cell state. Default cellSignals=0: an ordinary
 * dish does not assume that every soma emits a universal attractant. */
export function cellCueAt(sim,cell,point){
  let concentration=0,gradient=[0,0,0];const lambda=CONNECTIVITY.cueDecayLength,a=CONNECTIVITY.cueCoreRadius;
  for(const source of sim.cells){
    if(source.id===cell.id)continue;
    const emission=(source.identity?.cueSecretion??0)*mature(source)*(sim.config.cellSignals??0);if(emission===0)continue;
    const d=sub(source.position,point),r=length(d),c=emission*a*Math.exp(-r/lambda)/(r+a);
    concentration+=c;if(r>1e-9)gradient=add(gradient,scale(d,c*(1/lambda+1/(r+a))/r));
  }
  const response=(cell.identity?.cueAttraction??0)-(cell.identity?.cueRepulsion??0);
  // Saturating receptor occupancy c/(1+c); its gradient turns the cone.
  return {concentration,occupancy:concentration/(1+concentration),direction:scale(gradient,response*lambda/(1+concentration)**2)};
}

export function contactAnchors(sim,contact){
  const a=sim.segments[contact.axonSegmentId],b=sim.segments[contact.dendriteSegmentId];
  if(!a?.alive||!b?.alive)return null;
  const p=lerp(a.start,a.end,contact.axonFraction),q=lerp(b.start,b.end,contact.dendriteFraction);
  return {a,b,p,q,distance:distance(p,q)};
}
export function contactPersists(sim,contact){
  const anchors=contactAnchors(sim,contact);if(!anchors)return false;
  return anchors.distance<=contact.restDistance+CONNECTIVITY.bondBreakExtension;
}

/** Withdrawal removes distal material; it must not drag a retained contact
 * proximally along the shaft. Elastic strain, in contrast, preserves fractions. */
export function retractContactSites(sim,segment,oldLength,newLength){
  if(!segment.hasContactSite)return;
  for(const c of sim.contacts){
    if(c.status==='lost')continue;
    const key=c.axonSegmentId===segment.id?'axonFraction':c.dendriteSegmentId===segment.id?'dendriteFraction':null;
    if(!key)continue;
    const materialDistance=c[key]*oldLength;
    if(newLength<materialDistance-1e-9){c.status='lost';c.candidate=false;c.conductanceNS=0;c.bond=0;c.lostReason='contact-bearing material retracted';}
    else c[key]=newLength>1e-12?clamp(materialDistance/newLength,0,1):0;
  }
}

/** Only call after a finite cone/filopodium physically encounters a shaft. */
export function registerNeuriteContact(sim,tip,otherId,point,via='cone'){
  const first=sim.segments[tip.segmentId],second=sim.segments[otherId];
  if(!first?.alive||!second?.alive||first.cellId===second.cellId||first.kind===second.kind)return null;
  const axon=first.kind==='axon'?first:second,dendrite=first.kind==='dendrite'?first:second;
  const compatible=contactCompatibility(sim,axon,dendrite);if(compatible<=0)return null;
  // Probes originate at the sampled cone; nearest material points must remain
  // within that finite probe's reach. No nearest-neuron shortcut is used.
  const near=closestSegmentPoints(axon.start,axon.end,dendrite.start,dendrite.end);
  const source=pointSegmentDistance(point,axon.start,axon.end),target=pointSegmentDistance(point,dendrite.start,dendrite.end);
  const p=via==='filopodium'?(first===axon?{point:[...first.end],t:1}:source):{point:near.p,t:near.s};
  const q=via==='filopodium'?(first===dendrite?{point:[...first.end],t:1}:target):{point:near.q,t:near.t};
  const separation=distance(p.point,q.point);
  if(separation>CONNECTIVITY.maxProbeReach+axon.radius+dendrite.radius)return null;
  const position=lerp(p.point,q.point,.5);
  let c=sim.contacts.find(c=>c.axonSegmentId===axon.id&&c.dendriteSegmentId===dendrite.id);
  if(!c)c=sim.contacts.find(c=>c.status!=='lost'&&c.sourceCellId===axon.cellId&&c.targetCellId===dendrite.cellId&&distance(c.position,position)<CONNECTIVITY.siteSpacing);
  if(c&&c.status!=='lost'){tip.lastContact=c.id;return c;}
  if(!c){
    if(sim.contacts.length>=CONNECTIVITY.maxContacts){sim.limits.contactLimitedCount=(sim.limits.contactLimitedCount||0)+1;return null;}
    c={id:`contact-${sim.counters.contacts++}`};sim.contacts.push(c);
  }
  Object.assign(c,{sourceCellId:axon.cellId,targetCellId:dendrite.cellId,axonSegmentId:axon.id,dendriteSegmentId:dendrite.id,
    axonFraction:p.t,dendriteFraction:q.t,position,restDistance:separation,via,tipId:tip.id,
    dwellHours:0,lastTime:sim.timeHours,createdHours:sim.timeHours,candidate:false,status:'apposition',
    compatibility:compatible,bond:0,calcium:0,presynaptic:0,receptors:0,conductanceNS:0,lostReason:null});
  // Preserve the contacted shaft site when its growth cone continues: extension
  // starts a daughter segment instead of dragging the site to a new endpoint.
  axon.hasContactSite=true;dendrite.hasContactSite=true;tip.lastContact=c.id;
  return c;
}

export function contactBondLoads(sim){
  const loads=[];
  for(const c of sim.contacts){
    if(c.status==='lost'||c.bond<=0)continue;const a=contactAnchors(sim,c);if(!a)continue;
    const stretch=Math.max(0,a.distance-c.restDistance);if(stretch>CONNECTIVITY.bondBreakExtension)continue;
    const f=scale(unit(sub(a.q,a.p)),CONNECTIVITY.bondSpring*c.bond*stretch);
    loads.push({segmentId:a.a.id,fraction:c.axonFraction,force:f},{segmentId:a.b.id,fraction:c.dendriteFraction,force:scale(f,-1)});
  }
  return loads;
}

export function contactSteering(sim,tip){
  let steer=[0,0,0];
  for(const probe of tip.filopodia||[]){
    if(!probe.blocked)continue;
    const other=sim.segments[probe.targetSegmentId],self=sim.segments[tip.segmentId];
    const score=other?contactCompatibility(sim,self.kind==='axon'?self:other,self.kind==='dendrite'?self:other):0;
    // Compatible contact is sampled locally; other obstructions bias withdrawal.
    steer=add(steer,scale(probe.direction,score>0?.35*score:-.16));
  }
  return add(steer,cellCueAt(sim,sim.cells[tip.cellId],sim.segments[tip.segmentId].end).direction);
}

export function advanceConnectivity(sim,dt){
  for(const c of sim.contacts){
    if(c.status==='lost')continue;
    const a=contactAnchors(sim,c),compatibility=a?contactCompatibility(sim,a.a,a.b):0;
    if(!a||!contactPersists(sim,c)||compatibility<=0||sim.config.cellAdhesion===0){
      c.status='lost';c.candidate=false;c.conductanceNS=0;c.bond=0;
      c.lostReason=!a?'process removed':compatibility<=0?'recognition unavailable':sim.config.cellAdhesion===0?'adhesion unavailable':'contact separated';continue;
    }
    c.position=lerp(a.p,a.q,.5);c.lastTime=sim.timeHours;c.dwellHours+=dt;c.compatibility=compatibility;
    const retention=compatibility*sim.config.cellAdhesion;
    // Local calcium is a dimensionless contact-response proxy, not a computed
    // calcium concentration or evidence that the cell has already fired.
    c.calcium+=(retention-c.calcium)*(-Math.expm1(-dt/.12));
    c.bond+=(clamp(2*retention,0,1)-c.bond)*(-Math.expm1(-dt/.25));
    c.candidate=c.dwellHours>=CONNECTIVITY.candidateHours&&c.bond>=.05;
    c.status=c.candidate?'candidate':'apposition';
    if(!c.candidate)continue;
    const support=sim.config.synapticSupport??1;
    c.presynaptic+=(compatibility*support-c.presynaptic)*(-Math.expm1(-dt/CONNECTIVITY.presynapticTauHours));
    c.receptors+=(compatibility*support-c.receptors)*(-Math.expm1(-dt/CONNECTIVITY.receptorTauHours));
    if(c.dwellHours>=CONNECTIVITY.structuralHours&&c.presynaptic>=.3)c.status='structural';
    if(c.status==='structural'&&c.presynaptic>=.6&&c.receptors>=.55){c.status='functional';c.conductanceNS=1.2*c.presynaptic*c.receptors;}
    else c.conductanceNS=0;
  }
}

export function connectivityMetrics(sim){
  const active=sim.contacts.filter(c=>c.status!=='lost');
  return {contacts:active.filter(c=>c.candidate).length,appositions:active.filter(c=>c.status==='apposition').length,
    structuralSynapses:active.filter(c=>c.status==='structural'||c.status==='functional').length,
    functionalSynapses:active.filter(c=>c.status==='functional').length,lostContacts:sim.contacts.length-active.length};
}

export function validateConnectivityState(sim){
  const scalar=(v,lo=0,hi=1)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  const point=p=>Array.isArray(p)&&p.length===3&&p.every(v=>scalar(v,-1e5,1e5));
  for(const cell of sim.cells){const i=cell.identity;
    if(!i||!['excitatory','inhibitory'].includes(i.transmitter)||['organizer','receptivity','cueSecretion','cueAttraction','cueRepulsion'].some(k=>!scalar(i[k],0,2)))throw new Error('Invalid cell recognition or transmitter state.');
  }
  for(const s of sim.segments){const m=s.material;
    if(!m||!scalar(m.restLength,0,1e5)||!point(m.anchor)||!scalar(m.adhesion)||!(m.restCos===null||scalar(m.restCos,-1,1))||!scalar(m.strain,-1e6,1e6)||!scalar(m.tension,-1e9,1e9)||!scalar(m.remodeledLength,-1e5,1e5))throw new Error('Invalid neurite material state.');
  }
  const ids=new Set();
  for(const c of sim.contacts){
    const a=sim.segments[c.axonSegmentId],b=sim.segments[c.dendriteSegmentId];
    if(typeof c.id!=='string'||ids.has(c.id)||!a||!b||a.kind!=='axon'||b.kind!=='dendrite'||a.cellId!==c.sourceCellId||b.cellId!==c.targetCellId||a.cellId===b.cellId||!['apposition','candidate','structural','functional','lost'].includes(c.status)||!['cone','filopodium'].includes(c.via)||!scalar(c.axonFraction)||!scalar(c.dendriteFraction)||!scalar(c.restDistance,0,18)||!scalar(c.dwellHours,0,720)||!scalar(c.createdHours,0,720)||!scalar(c.lastTime,0,720)||!point(c.position)||['compatibility','bond','calcium','presynaptic','receptors'].some(k=>!scalar(c[k]))||!scalar(c.conductanceNS,0,1.2)||typeof c.candidate!=='boolean')throw new Error('Invalid contact maturation state.');
    if(c.status==='functional'?(c.conductanceNS<=0||!c.candidate||c.presynaptic<.6||c.receptors<.55):c.conductanceNS!==0)throw new Error('Inconsistent synaptic conductance.');
    if(c.candidate!==['candidate','structural','functional'].includes(c.status)||c.createdHours>c.lastTime+1e-8||c.lastTime>sim.timeHours+1e-8||!Number.isInteger(c.tipId)||!sim.tips[c.tipId]||c.candidate&&c.dwellHours<CONNECTIVITY.candidateHours||['structural','functional'].includes(c.status)&&(c.dwellHours<CONNECTIVITY.structuralHours||c.presynaptic<.3)||c.status==='lost'&&(c.bond!==0||typeof c.lostReason!=='string'))throw new Error('Inconsistent contact lifecycle.');
    if(c.status!=='lost'&&(!a.hasContactSite||!b.hasContactSite))throw new Error('A retained contact requires preserved material sites.');
    ids.add(c.id);
  }
}

/** Frozen-geometry transmission assay: conductance-based leaky integrate-and-
 * fire cells (pF, nS, mV, pA, ms). This is explicitly a reduced electrical model,
 * not a fitted reconstruction or a prediction of measured culture recordings. */
export const ELECTRICAL_ASSAY=Object.freeze({capacitancePF:100,leakNS:5,restMV:-65,thresholdMV:-50,
  resetMV:-65,refractoryMs:2,excitatoryReversalMV:0,inhibitoryReversalMV:-75,excTauMs:5,inhTauMs:10,
  delayMs:1,stimulusPA:220,stimulusStartMs:20,stimulusEndMs:80});
export function runTransmissionAssay(sim,{sourceCellId=0,durationMs=200,dtMs=.05,transmission=true}={}){
  if(!Number.isInteger(sourceCellId)||!sim.cells[sourceCellId])throw new Error('Choose an existing source cell.');
  if(!Number.isFinite(durationMs)||durationMs<100||durationMs>500||!Number.isFinite(dtMs)||dtMs<.005||dtMs>.2)throw new Error('Invalid transmission-assay duration or timestep.');
  const p=ELECTRICAL_ASSAY,cells=sim.cells.map(c=>({id:c.id,v:p.restMV,gE:0,gI:0,refractoryUntil:0,spikes:0,peakMV:p.restMV,minimumMV:p.restMV}));
  const edges=sim.contacts.filter(c=>c.status==='functional'&&c.conductanceNS>0&&contactPersists(sim,c)).map(c=>({contactId:c.id,source:c.sourceCellId,target:c.targetCellId,conductanceNS:c.conductanceNS,inhibitory:sim.cells[c.sourceCellId].identity.transmitter==='inhibitory'}));
  const samples=[],spikes=[],deliveries=[],queue=[];let sampleAt=0;
  for(let t=0;t<durationMs-1e-9;t+=dtMs){
    const h=Math.min(dtMs,durationMs-t);
    for(let i=queue.length-1;i>=0;i--)if(queue[i].time<=t+1e-9){const event=queue.splice(i,1)[0],cell=cells[event.target];cell[event.inhibitory?'gI':'gE']+=event.conductanceNS;deliveries.push({timeMs:t,...event});}
    const fired=[];
    for(const c of cells){
      const ge=c.gE*Math.exp(-h/(2*p.excTauMs)),gi=c.gI*Math.exp(-h/(2*p.inhTauMs));
      const current=c.id===sourceCellId&&t>=p.stimulusStartMs-1e-9&&t<p.stimulusEndMs-1e-9?p.stimulusPA:0;
      if(t>=c.refractoryUntil){const g=p.leakNS+ge+gi,e=(p.leakNS*p.restMV+ge*p.excitatoryReversalMV+gi*p.inhibitoryReversalMV+current)/g;c.v=e+(c.v-e)*Math.exp(-h*g/p.capacitancePF);c.peakMV=Math.max(c.peakMV,c.v);if(c.v>=p.thresholdMV){c.spikes++;fired.push(c.id);spikes.push({cellId:c.id,timeMs:t+h});c.v=p.resetMV;c.refractoryUntil=t+h+p.refractoryMs;}}
      c.gE*=Math.exp(-h/p.excTauMs);c.gI*=Math.exp(-h/p.inhTauMs);
      c.minimumMV=Math.min(c.minimumMV,c.v);
    }
    if(transmission)for(const source of fired)for(const edge of edges)if(edge.source===source)queue.push({...edge,time:t+h+p.delayMs});
    if(t+h>=sampleAt-1e-9){samples.push({timeMs:Number((t+h).toFixed(6)),voltages:cells.map(c=>c.v)});sampleAt+=.5;}
  }
  return {model:'cell-growth/transmission-assay/1',growthVersion:sim.version,growthTimeHours:sim.timeHours,sourceCellId,durationMs,dtMs,transmission,parameters:{...p},edges,spikes,deliveries,samples,
    cells:cells.map(c=>({cellId:c.id,spikes:c.spikes,peakMV:c.peakMV,minimumMV:c.minimumMV,peakDepolarizationMV:c.peakMV-p.restMV,peakHyperpolarizationMV:c.minimumMV-p.restMV})),
    scope:'Reduced point-neuron transmission assay on the grown contact graph; not calibrated electrophysiology. Growth is frozen and unchanged.'};
}
