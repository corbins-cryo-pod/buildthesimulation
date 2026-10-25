/**
 * Cell Growth Lab — deterministic, coarse-grained mechanochemical morphogenesis.
 * µm, hours, pN. This is an exploratory reduction, not a fitted human cell model.
 * No electrical activity, molecular fate network, or myelination is inferred.
 */
import {add,sub,scale,dot,cross,length,distance,clamp,unit,lerp,closestSegmentPoints,pointSegmentDistance,segmentSphereHit,segmentBoxHit,segmentCapsuleHit,SpatialHash} from './geometry.js';

import {constrainCone,sampleFilopodia} from './exploration.js';
import {createSoftCell, advanceCellMechanics, updateConeShape, populationMechanics, SHELL} from './mechanics.js';

export const MODEL_VERSION='cell-growth/2.0.0';
export const DEFAULT_CONFIG=Object.freeze({mode:'culture',source:'precursor',cellCount:12,seed:714,dtHours:.05,actin:1,microtubules:1,tension:1,adhesion:.65,stiffness:100,guidance:.6,branching:1,noise:.35,selfAvoidance:1,fasciculation:.55,membraneSupply:1,maxSegments:18000,maxTipsPerCell:32,motility:1,contractility:1,cortexStiffness:1,bending:1,cellAdhesion:.35,contactInhibition:1,density:1});
export const PRESETS=Object.freeze([
  {id:'culture',title:'In vitro plate',description:'A planar neural culture on an adhesive substrate with cell-scale obstacles and a localized trophic cue.',config:{mode:'culture',source:'precursor',cellCount:12}},
  {id:'organoid',title:'Organoid environment',description:'A three-dimensional spherical tissue volume, a lumen, reduced central support, and local radial organization.',config:{mode:'organoid',source:'precursor',cellCount:18,adhesion:.45,guidance:.45,maxSegments:26000}},
  {id:'regeneration',title:'Nerve regeneration',description:'Proximal and distal neuron populations separated by a guided conduit and scar obstacles; repair is represented geometrically.',config:{mode:'regeneration',source:'immature',cellCount:12,guidance:1,fasciculation:.8,branching:.65}},
  {id:'biohybrid',title:'Biohybrid interface',description:'An engineered neuron population, host neurons, microchannels, and inert electrode surfaces.',config:{mode:'biohybrid',source:'immature',cellCount:14,guidance:.8,fasciculation:.7,maxSegments:26000}}
]);
export const PHYSICAL_BASELINES=Object.freeze({polymerizationUmPerHour:64,unloadedRetrogradeUmPerHour:66,dragPnHoursPerUm:3,membraneTensionPnPerUm:7,clutchSpringPnPerUm:600,clutchOnPerSecond:.4,clutchOffPerSecond:.12,bondForcePn:2.5,motorStallPn:55,clutchSites:42,shaftSegmentUm:2.5,appositionHours:.3});
const MAX_DURATION=720;
const clone=x=>JSON.parse(JSON.stringify(x));
const RANGES={cellCount:[1,36],seed:[0,4294967295],dtHours:[.005,.25],actin:[0,3],microtubules:[0,3],tension:[0,4],adhesion:[0,1],stiffness:[1,10000],guidance:[0,3],branching:[0,3],noise:[0,2],selfAvoidance:[0,2],fasciculation:[0,1],membraneSupply:[0,3],maxSegments:[100,30000],maxTipsPerCell:[1,48],motility:[0,3],contractility:[0,3],cortexStiffness:[.2,3],bending:[0,3],cellAdhesion:[0,1],contactInhibition:[0,2],density:[.5,3]};
export function normalizeConfig(input={}) {
  const c={};
  for(const key of Object.keys(DEFAULT_CONFIG)) c[key]=input[key]??DEFAULT_CONFIG[key];
  if(!PRESETS.some(p=>p.id===c.mode))throw new Error('Unknown growth environment.');
  if(!['stem','precursor','immature'].includes(c.source))throw new Error('Source must be stem, precursor, or immature.');
  for(const [key,[lo,hi]] of Object.entries(RANGES))if(typeof c[key]!=='number'||!Number.isFinite(c[key])||c[key]<lo||c[key]>hi)throw new Error(`${key} must be finite and between ${lo} and ${hi}.`);
  for(const key of ['cellCount','seed','maxSegments','maxTipsPerCell'])if(!Number.isInteger(c[key]))throw new Error(`${key} must be an integer.`);
  if(c.maxSegments<c.cellCount*5)throw new Error('Segment budget is too small for the requested cells.');
  return c;
}
function random(sim){sim.rngState=(sim.rngState+0x6D2B79F5)>>>0;let t=sim.rngState;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function normal(sim){return Math.sqrt(-2*Math.log(Math.max(1e-12,random(sim))))*Math.cos(2*Math.PI*random(sim));}
function randomDirection(sim,planar=false){const a=random(sim)*Math.PI*2,z=planar?0:random(sim)*2-1,s=Math.sqrt(1-z*z);return [Math.cos(a)*s,z,Math.sin(a)*s];}
function event(sim,type,detail={}){sim.events.push({timeHours:sim.timeHours,type,...detail});if(sim.events.length>300)sim.events.shift();}

function worldFor(mode){
  const w={mode,bounds:{min:[-280,-80,-220],max:[280,80,220]},sphereRadius:null,planar:mode==='culture',obstacles:[],cue:{position:[190,0,30],strength:1},labels:[]};
  if(mode==='culture') {
    w.substrateY=-5.8;
    w.bounds={min:[-280,-15,-220],max:[280,15,220]};
    w.obstacles=[{id:'bead-1',shape:'sphere',position:[25,0,-10],radius:22},{id:'bead-2',shape:'sphere',position:[-85,0,90],radius:16},{id:'island',shape:'box',position:[95,0,85],size:[22,32,75]}];
  } else if(mode==='organoid') {
    w.sphereRadius=185;w.bounds={min:[-185,-185,-185],max:[185,185,185]};w.cue={position:[0,0,0],strength:.6};
    w.obstacles=[{id:'lumen',shape:'sphere',position:[0,0,0],radius:29}];
  } else if(mode==='regeneration') {
    w.bounds={min:[-280,-54,-105],max:[280,54,105]};w.cue={position:[235,0,0],strength:1};
    w.obstacles=[{id:'scar-1',shape:'sphere',position:[-30,4,-43],radius:23},{id:'scar-2',shape:'sphere',position:[75,-10,40],radius:22},{id:'scar-3',shape:'sphere',position:[35,18,4],radius:13},
      {id:'conduit-upper',shape:'box',position:[0,0,95],size:[330,110,14]},{id:'conduit-lower',shape:'box',position:[0,0,-95],size:[330,110,14]}];
  } else {
    w.bounds={min:[-280,-50,-180],max:[280,50,180]};w.cue={position:[210,0,0],strength:1};
    w.obstacles=[{id:'channel-1',shape:'box',position:[5,-3,-58],size:[205,35,10]},{id:'channel-2',shape:'box',position:[5,-3,58],size:[205,35,10]},
      {id:'electrode-1',shape:'box',position:[-65,-23,0],size:[26,9,26]},{id:'electrode-2',shape:'box',position:[45,-23,0],size:[26,9,26]},
      {id:'support-post',shape:'sphere',position:[-20,0,110],radius:17}];
  }
  return w;
}

function placementFree(p,r,sim){
  if(sim.world.sphereRadius&&length(p)>sim.world.sphereRadius-r-8)return false;
  if(p.some((v,i)=>v<sim.world.bounds.min[i]+r+3||v>sim.world.bounds.max[i]-r-3))return false;
  for(const o of sim.world.obstacles)if(o.shape==='sphere'?distance(p,o.position)<r+o.radius+7:p.every((v,i)=>Math.abs(v-o.position[i])<o.size[i]/2+r+7))return false;
  return sim.cells.every(c=>distance(p,c.position)>r+(c.mechanics?.collisionRadius??c.radius)+5);
}
function placeCell(sim,i){
  const mode=sim.config.mode;
  for(let attempt=0;attempt<2000;attempt++){
    let p;
    if(mode==='organoid'){const dir=randomDirection(sim),r=55+Math.pow(random(sim),.55)*100;p=scale(dir,r);}
    else if(mode==='regeneration'){const distal=i>=Math.ceil(sim.config.cellCount*.7);p=[distal?200+random(sim)*35:-225+random(sim)*65,(random(sim)-.5)*50,(random(sim)-.5)*132];}
    else if(mode==='biohybrid'){const host=i>=Math.ceil(sim.config.cellCount*.6);p=[host?155+random(sim)*75:-220+random(sim)*80,(random(sim)-.5)*32,(random(sim)-.5)*230];}
    else p=[(random(sim)-.5)*390/sim.config.density,0,(random(sim)-.5)*295/sim.config.density];
    if(placementFree(p,7.3,sim))return p;
  }
  throw new Error('Unable to place cells without overlap; reduce cell count.');
}
function lineageAge(cell,sim){return cell.ageHours+(sim.config.source==='immature'?8:sim.config.source==='stem'?-48:0);}
function stageFor(age){return age<0?'stem':age<8?'precursor':age<18?'immature':age<48?'polarized':'maturing';}

export function createSimulation(input={}){
  const config=normalizeConfig(input),sim={version:MODEL_VERSION,config,timeHours:0,stepCount:0,rngState:config.seed>>>0,cells:[],segments:[],tips:[],contacts:[],world:worldFor(config.mode),history:[],events:[],limits:{reached:false,reason:null,segmentCap:config.maxSegments,tipCap:config.maxTipsPerCell,tipLimitedCount:0},counters:{collisions:0,collisionSteps:0,branches:0,retractions:0,contacts:0},nextHistoryHours:0};
  for(let i=0;i<config.cellCount;i++){
    const position=placeCell(sim,i),radius=6.8+random(sim)*.9,stage=stageFor(config.source==='immature'?8:config.source==='stem'?-48:0),cell={id:i,position,radius,baseRadius:radius,stage,ageHours:0,supply:1,axonRootId:null,initialized:false,group:config.mode==='biohybrid'?(i<Math.ceil(config.cellCount*.6)?'graft':'host'):config.mode==='regeneration'?(i<Math.ceil(config.cellCount*.7)?'proximal':'distal'):'neuron'};
    const polarity=randomDirection(sim,sim.world.planar);Object.assign(cell,createSoftCell(position,radius,i,sim.world.planar,polarity));
    sim.cells.push(cell);if(stage==='immature')initializeNeurites(sim,cell);
  }
  recordHistory(sim);return sim;
}
function makeSegment(sim,cell,kind,start,end,parentId=-1,order=0){
  if(sim.segments.length>=sim.config.maxSegments){sim.limits.reached=true;sim.limits.reason='Segment budget reached';return null;}
  const parent=parentId>=0?sim.segments[parentId]:null,rootRadius=kind==='axon'?.52:1.05,radius=Math.max(kind==='axon'?.23:.3,parent?Math.min(rootRadius,parent.radius)*(order>parent.branchOrder?.79:.996):rootRadius);
  const s={id:sim.segments.length,cellId:cell.id,parentId,rootId:parent?parent.rootId:sim.segments.length,kind,start:[...start],end:[...end],radius,ageHours:0,mt:.3,alive:true,branchOrder:order};sim.segments.push(s);return s;
}
function makeTip(sim,cell,segment,direction,order=0){
  const t={id:sim.tips.length,cellId:cell.id,segmentId:segment.id,kind:segment.kind,direction:unit(direction),active:true,status:'extending',radius:segment.kind==='axon'?1.8:2.1,ageHours:0,stallHours:0,branchOrder:order,mt:.3,clutch:.5,branchClock:0,noiseState:[0,0,0],forces:{actin:0,traction:0,microtubule:0,membrane:0,net:0,retrograde:0,speed:0,clutch:.5},lastContact:null};sim.tips.push(t);return t;
}
function initializeNeurites(sim,cell){
  if(cell.initialized)return;cell.initialized=true;
  const count=Math.min(3+(cell.id%3),sim.config.maxTipsPerCell),chosen=[];
  // Persistent actin-rich membrane patches seed processes. Spatial inhibition
  // prevents identical radial stars; the solved deformed surface is the origin.
  for(let k=0;k<count;k++){
    let best=-1,score=-Infinity;
    for(let i=0;i<cell.membrane.vertices.length;i++){
      const direction=unit(sub(cell.membrane.vertices[i],cell.position));
      if(sim.world.planar&&Math.abs(direction[1])>.12)continue;
      if(chosen.some(j=>dot(direction,unit(sub(cell.membrane.vertices[j],cell.position)))>.40))continue;
      const q=(cell.membrane.actin[i]+.4*cell.membrane.mt[i])*(.65+.7*random(sim));
      if(q>score){score=q;best=i;}
    }
    if(best<0)break;chosen.push(best);
    const start=[...cell.membrane.vertices[best]],dir=unit(sub(start,cell.position));
    if(sim.world.planar){dir[1]=0;start[1]=cell.membrane.vertices[best][1];}
    const end=add(start,scale(unit(dir),2.5)),segment=makeSegment(sim,cell,'dendrite',start,end);
    if(segment){segment.anchorVertex=best;makeTip(sim,cell,segment,dir);}
  }
  event(sim,'neurite-initiation',{cellId:cell.id});
}
function polarize(sim,cell){
  if(cell.axonRootId!==null)return;
  const roots=sim.segments.filter(s=>s.alive&&s.cellId===cell.id&&s.parentId===-1);if(!roots.length)return;
  let best=roots[0],score=-Infinity;
  for(const root of roots){let l=0;for(const s of sim.segments)if(s.alive&&s.rootId===root.id)l+=distance(s.start,s.end);const direction=unit(sub(root.end,root.start)),cue=unit(sub(sim.world.cue.position,cell.position)),q=l+6*dot(direction,cue);if(q>score){score=q;best=root;}}
  cell.axonRootId=best.id;
  for(const s of sim.segments)if(s.rootId===best.id){s.kind='axon';s.radius=Math.min(s.radius,.52);}
  for(const t of sim.tips)if(sim.segments[t.segmentId].rootId===best.id){t.kind='axon';t.radius=1.8;}
  event(sim,'axon-polarization',{cellId:cell.id,rootId:best.id});
}

/** Quasi-steady motor-clutch force closure; rates are seconds⁻¹ internally. */
export function motorClutch(config,previous=.5){
  const b=PHYSICAL_BASELINES,k=config.stiffness*b.clutchSpringPnPerUm/(config.stiffness+b.clutchSpringPnPerUm);
  let retro=b.unloadedRetrogradeUmPerHour,traction=0,occupancy=previous;
  for(let j=0;j<24;j++){
    const f=b.bondForcePn*Math.log1p(k*(retro/3600)/(b.clutchOffPerSecond*b.bondForcePn));
    const off=b.clutchOffPerSecond*Math.exp(Math.min(15,f/b.bondForcePn));
    occupancy=b.clutchOnPerSecond/(b.clutchOnPerSecond+off);
    traction=b.clutchSites*config.adhesion*occupancy*f;
    const next=b.unloadedRetrogradeUmPerHour/(1+traction/b.motorStallPn);
    retro=.5*retro+.5*next;
  }
  return {retrograde:retro,traction,occupancy};
}
function coneForces(sim,tip,cell,dt){
  const c=sim.config,b=PHYSICAL_BASELINES,clutch=motorClutch(c,tip.clutch);tip.clutch=clutch.occupancy;
  const desiredMT=clamp(c.microtubules*(.35+.65*cell.supply),0,1),tau=c.microtubules>0?1.8:1;
  tip.mt+=(desiredMT-tip.mt)*(-Math.expm1(-dt/tau));
  const age=lineageAge(cell,sim),maturity=clamp((age-8)/6,.2,1),kindGain=tip.kind==='axon'?1:.58;
  const polymerization=b.polymerizationUmPerHour*c.actin*(.65+.35*cell.supply);
  const actin=b.dragPnHoursPerUm*Math.max(0,polymerization-clutch.retrograde);
  const mt=b.dragPnHoursPerUm*(sim.world.mode==='organoid'?12:8)*Math.min(c.actin,1)*tip.mt;
  const membrane=2*Math.PI*(tip.kind==='axon'?.52:.85)*cell.membrane.tension;
  const net=actin+mt-membrane,material=Math.min(cell.supply,cell.membrane.reserve),support=c.microtubules===0?0:tip.mt;
  const speed=Math.max(0,net/b.dragPnHoursPerUm)*kindGain*maturity*support*material;
  tip.forces={actin,traction:clutch.traction,microtubule:mt,membrane,net,retrograde:clutch.retrograde,speed,clutch:clutch.occupancy};return speed;
}
function materialBalance(sim,cell,dt){
  const tips=sim.tips.filter(t=>t.active&&t.cellId===cell.id),crowding=Math.max(0,tips.length-5),central=sim.world.mode==='organoid'?clamp(length(cell.position)/100,.28,1):1;
  const targetSupply=central/(1+.035*crowding),recovery=.8*sim.config.membraneSupply;
  cell.supply=clamp(cell.supply+(targetSupply-cell.supply)*(-Math.expm1(-.5*dt)),0,1);
  const replenished=(1-cell.membrane.reserve)*(-Math.expm1(-recovery*dt));
  cell.membrane.reserve+=replenished;cell.membrane.suppliedArea+=replenished*cell.membrane.reserveCapacity;
  const deficit=Math.max(0,1-cell.membrane.reserve);
  cell.membrane.tension=PHYSICAL_BASELINES.membraneTensionPnPerUm*sim.config.tension*(1+4*deficit*deficit);
}

function nearbyDirection(sim,tip,point,index,dt){
  const c=sim.config,s=sim.segments[tip.segmentId],cell=sim.cells[tip.cellId];let steer=[0,0,0];
  for(const probe of tip.filopodia||[])if(probe.blocked)steer=sub(steer,scale(probe.direction,.16));
  const cue=unit(sub(sim.world.cue.position,point));
  if(sim.world.mode==='organoid'){
    const radial=unit(point),toward=tip.kind==='axon'?scale(radial,-1):radial;steer=add(steer,scale(toward,c.guidance*.45));
  } else steer=add(steer,scale(cue,c.guidance*sim.world.cue.strength*(tip.kind==='axon'?.7:.17)));
  if(sim.world.mode==='regeneration')steer=add(steer,[tip.kind==='axon'?.55:.1,0,-point[2]*.002]);
  if(sim.world.mode==='biohybrid'&&Math.abs(point[2])<52)steer=add(steer,[tip.kind==='axon'?.35:0,-point[1]*.004,-point[2]*.003]);
  const ancestors=localAncestors(sim,s.id,6);
  for(const id of index.query(point,point,12)){
    const other=sim.segments[id];if(!other?.alive||ancestors.has(id))continue;
    const near=pointSegmentDistance(point,other.start,other.end);if(near.distance>12||near.distance<1e-9)continue;
    if(other.cellId===cell.id&&tip.kind==='dendrite'&&c.selfAvoidance>0)steer=add(steer,scale(unit(sub(point,near.point)),c.selfAvoidance*.7*(1-near.distance/12)));
    if(other.cellId!==cell.id&&other.kind==='axon'&&tip.kind==='axon'&&c.fasciculation>0){let dir=unit(sub(other.end,other.start));if(dot(dir,tip.direction)<0)dir=scale(dir,-1);steer=add(steer,scale(dir,c.fasciculation*.6*(1-near.distance/12)));}
  }
  for(const o of sim.world.obstacles){
    let q,dist;if(o.shape==='sphere'){const delta=sub(point,o.position);dist=length(delta)-o.radius;q=unit(delta);}else {const near=point.map((v,i)=>clamp(v,o.position[i]-o.size[i]/2,o.position[i]+o.size[i]/2));dist=distance(point,near);q=unit(sub(point,near));}
    if(dist<12)steer=add(steer,scale(q,.7*(1-Math.max(0,dist)/12)));
  }
  // Ornstein-Uhlenbeck directional fluctuations, with deterministic zero-noise limit.
  if(c.noise>0){const decay=Math.exp(-dt/1.5),sigma=c.noise*.32*Math.sqrt(1-decay*decay);for(let i=0;i<3;i++)tip.noiseState[i]=tip.noiseState[i]*decay+(sim.world.planar&&i===1?0:sigma*normal(sim));steer=add(steer,tip.noiseState);}
  let d=unit(add(tip.direction,scale(steer,dt*.8)));if(sim.world.planar)d=unit([d[0],0,d[2]]);return d;
}
function localAncestors(sim,id,range){const set=new Set();let l=0,steps=0;while(id>=0&&steps++<20){const s=sim.segments[id];if(!s)break;set.add(id);l+=distance(s.start,s.end);if(l>range)break;id=s.parentId;}return set;}
function firstCollision(sim,tip,a,b,index,shaftOnly=false){
  const segment=sim.segments[tip.segmentId],radius=segment.radius,solidRadius=shaftOnly?radius:Math.max(radius,tip.radius),cell=sim.cells[tip.cellId],ancestors=localAncestors(sim,segment.id,5);let hit=null;
  const accept=(h,type,id)=>{if(h&&(!hit||h.t<hit.t))hit={...h,type,id};};
  for(const o of sim.world.obstacles)accept(o.shape==='sphere'?segmentSphereHit(a,b,o.position,o.radius+solidRadius+.02):segmentBoxHit(a,b,o.position,o.size,solidRadius+.02),'obstacle',o.id);
  for(const other of sim.cells){
    if(other.id===cell.id&&distance(a,cell.position)<(cell.mechanics?.collisionRadius??cell.radius)+5)continue;
    // Conservative envelope encloses the actual deforming soma surface.
    accept(segmentSphereHit(a,b,other.position,(other.mechanics?.collisionRadius??other.radius*1.06)+solidRadius+.02),'soma',other.id);
  }
  for(const id of index.query(a,b,radius+8)){
    const other=sim.segments[id];if(!other?.alive||ancestors.has(id))continue;
    if(other.cellId===tip.cellId&&other.parentId===segment.parentId&&distance(a,segment.start)<3&&distance(other.start,segment.start)<1e-8)continue;
    const otherCone=index.cones?.get(id);
    if(otherCone&&other.cellId!==tip.cellId)accept(segmentSphereHit(a,b,other.end,solidRadius+otherCone.radius+.025),'growth-cone',id);
    const h=segmentCapsuleHit(a,b,other.start,other.end,(other.cellId!==tip.cellId?solidRadius:radius)+other.radius+.025);
    // Adjacent branch junctions share material; they are not self-intersections.
    if(h&&h.t===0&&distance(a,other.end)<3&&ancestors.has(other.parentId))continue;
    accept(h,'neurite',id);
  }
  if(sim.world.sphereRadius){
    const r=sim.world.sphereRadius-solidRadius-.02;if(length(b)>r){const v=sub(b,a),aa=dot(v,v),bb=dot(a,v),cc=dot(a,a)-r*r,t=aa>0?clamp((-bb+Math.sqrt(Math.max(0,bb*bb-aa*cc)))/aa,0,1):0,p=lerp(a,b,t);accept({t,point:p,normal:scale(unit(p),-1)},'boundary','organoid');}
  }
  for(let i=0;i<3;i++){
    if(sim.world.planar&&i===1)continue;
    const lo=sim.world.bounds.min[i]+solidRadius,hi=sim.world.bounds.max[i]-solidRadius;
    if(b[i]<lo||b[i]>hi){const edge=b[i]<lo?lo:hi,d=b[i]-a[i],t=d===0?0:clamp((edge-a[i])/d,0,1),normal=[0,0,0];normal[i]=b[i]<lo?1:-1;accept({t,point:lerp(a,b,t),normal},'boundary',i);}
  }
  return hit;
}

function contactPersists(sim,contact){
  const a=sim.segments[contact.axonSegmentId],b=sim.segments[contact.dendriteSegmentId];if(!a?.alive||!b?.alive)return false;
  const ta=sim.tips.find(t=>t.active&&t.segmentId===a.id),tb=sim.tips.find(t=>t.active&&t.segmentId===b.id);
  if(ta&&tb&&distance(a.end,b.end)<=ta.radius+tb.radius+.5)return true;
  if(ta&&pointSegmentDistance(a.end,b.start,b.end).distance<=Math.max(a.radius,ta.radius)+b.radius+.5)return true;
  if(tb&&pointSegmentDistance(b.end,a.start,a.end).distance<=a.radius+Math.max(b.radius,tb.radius)+.5)return true;
  return closestSegmentPoints(a.start,a.end,b.start,b.end).distance<=a.radius+b.radius+.5;
}
function registerContact(sim,tip,hit,dt){
  if(!['neurite','growth-cone'].includes(hit.type))return;
  const a=sim.segments[tip.segmentId],b=sim.segments[hit.id];if(!b||a.cellId===b.cellId||a.kind===b.kind)return;
  const axon=a.kind==='axon'?a:b,dendrite=a.kind==='dendrite'?a:b,key=`${tip.id}:${b.cellId}`;
  let contact=sim.contacts.find(c=>c.id===key);
  if(!contact){if(sim.contacts.length>=2000)return;contact={id:key,sourceCellId:axon.cellId,targetCellId:dendrite.cellId,axonSegmentId:axon.id,dendriteSegmentId:dendrite.id,position:[...hit.point],dwellHours:0,lastTime:sim.timeHours,candidate:false,status:'apposition',createdHours:sim.timeHours};sim.contacts.push(contact);sim.counters.contacts++;}
  if(contact.status==='lost'){contact.status='apposition';contact.dwellHours=0;}
  contact.axonSegmentId=axon.id;contact.dendriteSegmentId=dendrite.id;
  if(sim.timeHours-contact.lastTime>dt*1.5)contact.dwellHours=0;
  contact.dwellHours+=dt;contact.lastTime=sim.timeHours;contact.position=[...hit.point];
  if(!contact.candidate&&contact.dwellHours>=PHYSICAL_BASELINES.appositionHours){contact.candidate=true;contact.status='candidate';event(sim,'candidate-contact',{sourceCellId:axon.cellId,targetCellId:dendrite.cellId});}
  tip.lastContact=key;
}
function appendGrowth(sim,tip,point,index){
  const s=sim.segments[tip.segmentId],cell=sim.cells[tip.cellId],last=[...s.end],len=distance(s.start,s.end);let addedRadius=s.radius;
  // Extending the last render/rod segment changes its entire chord. Check that
  // chord as well as the swept tip; keep the old corner if it would cut a solid.
  const cutsCorner=len>1e-8&&firstCollision(sim,tip,s.start,point,index,true);
  const shortensShaft=distance(s.start,point)<len-1e-10;
  let added=distance(last,point);
  if(len>=PHYSICAL_BASELINES.shaftSegmentUm||cutsCorner||shortensShaft){
    const next=makeSegment(sim,cell,tip.kind,s.end,point,s.id,tip.branchOrder);if(!next)return 0;next.mt=tip.mt;index.cones?.delete(tip.segmentId);tip.segmentId=next.id;index.cones?.set(next.id,tip);addedRadius=next.radius;index.insert(next.id,next.start,next.end,next.radius);
  }else{added=Math.max(0,distance(s.start,point)-len);s.end=[...point];s.mt=tip.mt;index.insert(s.id,s.start,s.end,s.radius);}
  const consumption=2*Math.PI*addedRadius*added;
  cell.membrane.reserve=clamp(cell.membrane.reserve-consumption/cell.membrane.reserveCapacity,0,1);cell.membrane.usedArea+=consumption;
  cell.supply=clamp(cell.supply-added*.0007,0,1);return added;
}
function retractTip(sim,tip,amount){
  let remaining=amount,removedArea=0,removedLength=0;
  while(remaining>1e-9){
    const s=sim.segments[tip.segmentId],l=distance(s.start,s.end),children=sim.segments.filter(n=>n.alive&&n.parentId===s.id);
    if(children.length){tip.active=false;tip.status='stabilized';break;}
    if(l>remaining+.1){removedArea+=2*Math.PI*s.radius*remaining;removedLength+=remaining;s.end=lerp(s.end,s.start,remaining/l);remaining=0;}
    else if(s.parentId>=0){removedArea+=2*Math.PI*s.radius*l;removedLength+=l;s.alive=false;remaining-=l;tip.segmentId=s.parentId;}
    else {tip.active=false;tip.status='retracted';break;}
  }
  const membrane=sim.cells[tip.cellId].membrane,recycled=Math.min(removedArea*.6,(1-membrane.reserve)*membrane.reserveCapacity);membrane.reserve+=recycled/membrane.reserveCapacity;membrane.recycledArea+=recycled;
  sim.counters.retractions++;return removedLength;
}
function branchTip(sim,tip,dt,index){
  const c=sim.config,cell=sim.cells[tip.cellId],s=sim.segments[tip.segmentId],active=sim.tips.filter(t=>t.active&&t.cellId===tip.cellId).length;
  if(c.branching===0||c.actin===0||c.microtubules===0||tip.ageHours<3||tip.branchOrder>=5||tip.mt<.45||cell.membrane.reserve<.2||tip.status!=='extending')return;
  const rate=(tip.kind==='axon'?.012:.045)*c.branching*cell.supply*tip.mt/(1+.3*tip.branchOrder),prob=-Math.expm1(-rate*dt);
  if(random(sim)>prob)return;
  if(active>=c.maxTipsPerCell){sim.limits.tipLimitedCount++;return;}
  let perpendicular=sim.world.planar?[-tip.direction[2],0,tip.direction[0]]:unit(cross(tip.direction,Math.abs(tip.direction[1])<.85?[0,1,0]:[1,0,0]));
  perpendicular=scale(perpendicular,random(sim)<.5?-1:1);
  const angle=(tip.kind==='axon'?.48:.68),newDirection=unit(add(scale(tip.direction,Math.cos(angle)),scale(perpendicular,Math.sin(angle))));
  const next=makeSegment(sim,cell,tip.kind,s.end,s.end,s.id,tip.branchOrder+1);if(!next)return;const child=makeTip(sim,cell,next,newDirection,tip.branchOrder+1);index.insert(next.id,next.start,next.end,next.radius);index.cones.set(next.id,child);
  // Existing tip continues in a sister branch so the branch node stays fixed.
  const continuation=makeSegment(sim,cell,tip.kind,s.end,s.end,s.id,tip.branchOrder+1);if(continuation){index.cones.delete(tip.segmentId);tip.segmentId=continuation.id;index.insert(continuation.id,continuation.start,continuation.end,continuation.radius);index.cones.set(continuation.id,tip);tip.branchOrder++;tip.direction=unit(add(tip.direction,scale(perpendicular,-.2)));tip.ageHours=0;}
  sim.counters.branches++;event(sim,'branch',{cellId:cell.id,kind:tip.kind});
}

function advanceTip(sim,tip,dt,index){
  if(!tip.active)return;const cell=sim.cells[tip.cellId],s=sim.segments[tip.segmentId];if(!s.alive){tip.active=false;return;}
  tip.ageHours+=dt;updateConeShape(tip,dt,sim.config);constrainCone(sim,tip,index);
  const speed=coneForces(sim,tip,cell,dt),old=[...s.end];tip.direction=nearbyDirection(sim,tip,old,index,dt);
  const apposition=sim.contacts.find(c=>c.id===tip.lastContact&&c.status!=='lost');
  if(apposition&&sim.config.cellAdhesion>=.3){
    const other=sim.segments[apposition.axonSegmentId===s.id?apposition.dendriteSegmentId:apposition.axonSegmentId];
    if(other?.alive&&contactPersists(sim,apposition)){
      apposition.dwellHours+=dt;apposition.lastTime=sim.timeHours;apposition.candidate=apposition.dwellHours>=PHYSICAL_BASELINES.appositionHours;apposition.status=apposition.candidate?'candidate':'apposition';tip.status='stabilized';tip.forces.speed=0;sampleFilopodia(sim,tip,index,dt);return;
    }
  }
  if(speed<.02){tip.status='stalled';tip.stallHours+=dt;if(tip.stallHours>2&&(sim.config.actin===0||sim.config.microtubules===0||cell.membrane.reserve<.08||tip.forces.net<0))tip.forces.speed=-retractTip(sim,tip,dt*(tip.kind==='axon'?1.5:2.5))/dt;sampleFilopodia(sim,tip,index,dt);return;}
  const availableLength=cell.membrane.reserve*cell.membrane.reserveCapacity/(2*Math.PI*s.radius),amount=Math.min(speed*dt,availableLength),target=add(old,scale(tip.direction,amount)),hit=firstCollision(sim,tip,old,target,index);
  let added=0,retracted=0;
  if(hit){
    const collisionKey=`${hit.type}:${hit.id}`;sim.counters.collisionSteps++;
    if(tip.lastCollisionKey!==collisionKey||sim.timeHours-(tip.lastCollisionHours??-100)>dt*1.5){sim.counters.collisions++;event(sim,'collision',{cellId:tip.cellId,kind:tip.kind,object:hit.type});}
    tip.lastCollisionKey=collisionKey;tip.lastCollisionHours=sim.timeHours;tip.stallHours+=dt;tip.status='contact';
    if(hit.t>1e-6){const safe=lerp(old,target,Math.max(0,hit.t-.01/Math.max(amount,.01)));added=appendGrowth(sim,tip,safe,index);}
    registerContact(sim,tip,hit,dt);
    const normal=hit.normal,into=dot(tip.direction,normal),tangent=sub(tip.direction,scale(normal,Math.min(0,into)));
    if(length(tangent)<.05){let side=sim.world.planar?[-normal[2],0,normal[0]]:cross(normal,Math.abs(normal[1])<.9?[0,1,0]:[1,0,0]);side=scale(unit(side),(tip.id%2?1:-1));tip.direction=unit(add(side,scale(normal,.12)));}
    else tip.direction=unit(add(tangent,scale(normal,.08)));
    if(sim.world.planar)tip.direction=unit([tip.direction[0],0,tip.direction[2]]);
    if(tip.stallHours>1.8&&hit.type!=='neurite'){tip.status='retracting';retracted=retractTip(sim,tip,dt*2.2);}
  } else {added=appendGrowth(sim,tip,target,index);tip.status='extending';tip.stallHours=Math.max(0,tip.stallHours-dt*.8);}
  tip.forces.speed=(added-retracted)/dt;sampleFilopodia(sim,tip,index,dt);
  if(tip.active)branchTip(sim,tip,dt,index);
}

function internalStep(sim,dt){
  for(const cell of sim.cells){cell.ageHours+=dt;const previous=cell.stage;cell.stage=stageFor(lineageAge(cell,sim));if(!cell.initialized&&lineageAge(cell,sim)>=8)initializeNeurites(sim,cell);if(lineageAge(cell,sim)>=18)polarize(sim,cell);if(previous!==cell.stage)event(sim,'developmental-stage',{cellId:cell.id,stage:cell.stage});materialBalance(sim,cell,dt);}
  const previousIndex=new SpatialHash(16);for(const s of sim.segments)if(s.alive)previousIndex.insert(s.id,s.start,s.end,s.radius);
  for(const cell of sim.cells){
    const roots=sim.segments.filter(s=>s.alive&&s.cellId===cell.id&&s.parentId===-1),ids=new Set(previousIndex.query(cell.position,cell.position,cell.mechanics.collisionRadius+5));
    for(const root of roots)for(const id of previousIndex.query(root.start,root.end,3))ids.add(id);
    advanceCellMechanics(sim,cell,dt,[...ids].map(i=>sim.segments[i]).filter(s=>s.alive),roots);
    for(const root of roots)previousIndex.insert(root.id,root.start,root.end,root.radius);
  }
  const index=new SpatialHash(16);for(const s of sim.segments)if(s.alive){s.ageHours+=dt;const target=Math.min(1,sim.config.microtubules*sim.cells[s.cellId].supply);s.mt+=(target-s.mt)*(-Math.expm1(-dt/8));index.insert(s.id,s.start,s.end,s.radius);}
  index.cones=new Map(sim.tips.filter(t=>t.active).map(t=>[t.segmentId,t]));
  const count=sim.tips.length;
  for(let i=0;i<count;i++){
    const tip=sim.tips[i],old=tip.segmentId;advanceTip(sim,tip,dt,index);
    if(old!==tip.segmentId||!tip.active)index.cones.delete(old);
    if(tip.active)index.cones.set(tip.segmentId,tip);
  }
  sim.timeHours=Number((sim.timeHours+dt).toFixed(12));sim.stepCount++;

  for(const c of sim.contacts){if(!contactPersists(sim,c)){c.candidate=false;c.status='lost';}}
  if(sim.timeHours>=sim.nextHistoryHours-1e-9)recordHistory(sim);
}
export function stepSimulation(sim,durationHours=.25){
  if(!sim||sim.version!==MODEL_VERSION)throw new Error('Unsupported growth simulation.');
  if(typeof durationHours!=='number'||!Number.isFinite(durationHours)||durationHours<0||durationHours>MAX_DURATION)throw new Error('Advance duration must be between 0 and 720 hours.');
  if(sim.timeHours+durationHours>MAX_DURATION+1e-8)throw new Error('This experiment is limited to 720 simulated hours.');
  let left=durationHours;
  while(left>1e-10&&!sim.limits.reached){const dt=left>=sim.config.dtHours-1e-9?sim.config.dtHours:left;internalStep(sim,dt);left-=dt;}
  return sim;
}

/** Exact segment/sphere intersections for the Sholl profile, independent of view. */
function shollFor(segments,center){
  return [15,30,45,60,90,120,160,200,260].map(radius=>{
    let intersections=0;
    for(const s of segments){const a=sub(s.start,center),d=sub(s.end,s.start),aa=dot(d,d);if(aa<1e-18)continue;const bb=2*dot(a,d),cc=dot(a,a)-radius*radius,disc=bb*bb-4*aa*cc;if(disc<0)continue;const root=Math.sqrt(disc),t1=(-bb-root)/(2*aa),t2=(-bb+root)/(2*aa);if(t1>=0&&t1<1)intersections++;if(t2>=0&&t2<1&&Math.abs(t2-t1)>1e-9)intersections++;}
    return {radius,intersections};
  });
}
function branchAngles(segments,children){
  const result=[];for(const s of segments)if((children.get(s.id)||0)>1){const child=segments.filter(c=>c.parentId===s.id);for(let i=0;i<child.length;i++)for(let j=i+1;j<child.length;j++){const a=sub(child[i].end,child[i].start),b=sub(child[j].end,child[j].start);if(length(a)>1e-8&&length(b)>1e-8)result.push(Math.acos(clamp(dot(unit(a),unit(b)),-1,1))*180/Math.PI);}}
  return result;
}
function fieldArea(segments){
  // Convex hull of x/z projection; explicitly a projected coverage measurement.
  const pts=segments.flatMap(s=>[s.start,s.end]).map(p=>[p[0],p[2]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(pts.length<3)return 0;
  const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
  for(const p of pts){while(lower.length>1&&turn(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...pts].reverse()){while(upper.length>1&&turn(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  const hull=lower.slice(0,-1).concat(upper.slice(0,-1));return Math.abs(hull.reduce((a,p,i)=>a+p[0]*hull[(i+1)%hull.length][1]-p[1]*hull[(i+1)%hull.length][0],0))*.5;
}
export function getMetrics(sim){
  const live=sim.segments.filter(s=>s.alive),children=new Map();for(const s of live)if(s.parentId>=0)children.set(s.parentId,(children.get(s.parentId)||0)+1);
  const perCell=sim.cells.map(cell=>{
    const segments=live.filter(s=>s.cellId===cell.id),paths=new Map(),active=sim.tips.filter(t=>t.active&&t.cellId===cell.id),branchOrders={};let axonLength=0,dendriteLength=0,branches=0,longestAxonPath=0,longestDendritePath=0,axonReach=0,dendriteReach=0,shaftArea=0;
    for(const s of segments){const l=distance(s.start,s.end),path=l+(paths.get(s.parentId)||0),reach=distance(s.end,cell.position);paths.set(s.id,path);shaftArea+=2*Math.PI*s.radius*l;if(s.kind==='axon'){axonLength+=l;longestAxonPath=Math.max(longestAxonPath,path);axonReach=Math.max(axonReach,reach);}else{dendriteLength+=l;longestDendritePath=Math.max(longestDendritePath,path);dendriteReach=Math.max(dendriteReach,reach);}if((children.get(s.id)||0)>1){branches++;branchOrders[s.branchOrder]=(branchOrders[s.branchOrder]||0)+1;}}
    return {id:cell.id,stage:cell.stage,displacement:cell.mechanics.displacement,cellSpeed:length(cell.mechanics.velocity),pathLength:cell.mechanics.pathLength,areaStrain:cell.membrane.areaStrain,volumeStrain:cell.membrane.volumeStrain,meshQuality:cell.membrane.minQuality,branchAngles:branchAngles(segments,children),dendriticFieldArea:fieldArea(segments.filter(s=>s.kind==='dendrite')),axonLength,dendriteLength,totalLength:axonLength+dendriteLength,branches,activeTips:active.length,axonTips:active.filter(t=>t.kind==='axon').length,dendriteTips:active.filter(t=>t.kind==='dendrite').length,longestAxonPath,longestDendritePath,axonReach,dendriteReach,branchOrders,shaftArea,extensionRate:active.reduce((a,t)=>a+Math.max(0,t.forces.speed),0),retractionRate:active.reduce((a,t)=>a+Math.max(0,-t.forces.speed),0),meanConeSpeed:active.reduce((a,t)=>a+t.forces.speed,0)/Math.max(1,active.length),membraneArea:cell.membrane.area,tension:cell.membrane.tension,reserve:cell.membrane.reserve,supply:cell.supply,sholl:shollFor(segments,cell.position),shollAxon:shollFor(segments.filter(s=>s.kind==='axon'),cell.position),shollDendrite:shollFor(segments.filter(s=>s.kind==='dendrite'),cell.position)};
  });
  const totalAxonLength=perCell.reduce((a,c)=>a+c.axonLength,0),totalDendriteLength=perCell.reduce((a,c)=>a+c.dendriteLength,0);
  return {...populationMechanics(sim),timeHours:sim.timeHours,cellCount:sim.cells.length,totalAxonLength,totalDendriteLength,totalLength:totalAxonLength+totalDendriteLength,branches:perCell.reduce((a,c)=>a+c.branches,0),activeTips:sim.tips.filter(t=>t.active).length,liveSegments:live.length,totalSegments:sim.segments.length,contacts:sim.contacts.filter(c=>c.candidate&&c.status==='candidate').length,appositions:sim.contacts.filter(c=>c.status==='apposition').length,collisionEvents:sim.counters.collisions,retractionSteps:sim.counters.retractions,meanTension:sim.cells.reduce((a,c)=>a+c.membrane.tension,0)/sim.cells.length,meanReserve:sim.cells.reduce((a,c)=>a+c.membrane.reserve,0)/sim.cells.length,perCell};
}
function recordHistory(sim){
  const metrics=getMetrics(sim);delete metrics.perCell;sim.history.push(metrics);if(sim.history.length>1450)sim.history.shift();sim.nextHistoryHours=Math.floor(sim.timeHours)+1;
}
export function exportSWC(sim,cellId=0){
  if(!Number.isInteger(cellId)||!sim.cells[cellId])throw new Error('Unknown cell.');
  const cell=sim.cells[cellId],rows=[`# ${MODEL_VERSION}`,`# Exploratory grown geometry; coordinates/radii in micrometres; t=${sim.timeHours.toFixed(6)} h.`,`# 1 soma; 2 axon; 3 dendrite. No electrophysiological calibration.`,`1 1 ${cell.position.map(v=>v.toFixed(6)).join(' ')} ${cell.radius.toFixed(6)} -1`],ids=new Map();let id=2;
  for(const s of sim.segments)if(s.alive&&s.cellId===cellId){const parent=s.parentId<0?1:ids.get(s.parentId);if(!parent)continue;rows.push(`${id} ${s.kind==='axon'?2:3} ${s.end.map(v=>v.toFixed(6)).join(' ')} ${s.radius.toFixed(6)} ${parent}`);ids.set(s.id,id++);}
  return rows.join('\n')+'\n';
}
export function exportCSV(sim){
  const keys=['timeHours','totalAxonLength','totalDendriteLength','totalLength','branches','activeTips','contacts','appositions','collisionEvents','meanTension','meanReserve','meanDisplacement','meanCellSpeed','cellContacts','clusters','largestCluster'];
  const rows=[...sim.history];if(!rows.length||Math.abs(rows.at(-1).timeHours-sim.timeHours)>1e-8)rows.push(getMetrics(sim));
  return keys.join(',')+'\n'+rows.map(row=>keys.map(k=>Number(row[k]).toFixed(6)).join(',')).join('\n')+'\n';
}
export function serializeSimulation(sim){return clone(sim);}

function finiteNumber(x){return typeof x==='number'&&Number.isFinite(x);}
function validPoint(p){return Array.isArray(p)&&p.length===3&&p.every(x=>finiteNumber(x)&&Math.abs(x)<=1e5);}
export function restoreSimulation(data){
  const s=typeof data==='string'?JSON.parse(data):data;
  if(!s||s.version!==MODEL_VERSION)throw new Error('Unsupported Cell Growth Lab file version.');
  const normalized=normalizeConfig(s.config);if(Object.keys(normalized).some(k=>s.config[k]!==normalized[k]))throw new Error('Incomplete experiment configuration.');
  if(!finiteNumber(s.timeHours)||s.timeHours<0||s.timeHours>MAX_DURATION||!Number.isSafeInteger(s.stepCount)||s.stepCount<0||!Number.isInteger(s.rngState)||s.rngState<0||s.rngState>4294967295)throw new Error('Invalid experiment clock or random state.');
  if(!Array.isArray(s.cells)||s.cells.length!==s.config.cellCount||!Array.isArray(s.segments)||s.segments.length>s.config.maxSegments||!Array.isArray(s.tips)||s.tips.length>5000||!Array.isArray(s.contacts)||s.contacts.length>2000||!Array.isArray(s.history)||s.history.length>1450||!Array.isArray(s.events)||s.events.length>300)throw new Error('Invalid or oversized simulation arrays.');
  for(let i=0;i<s.cells.length;i++){
    const c=s.cells[i],m=c?.membrane;
    if(c?.id!==i||!validPoint(c.position)||!finiteNumber(c.radius)||c.radius<=0||c.radius>50||!finiteNumber(c.ageHours)||c.ageHours<0||!finiteNumber(c.supply)||c.supply<0||c.supply>1||!['stem','precursor','immature','polarized','maturing'].includes(c.stage)||!m||!Array.isArray(m.vertices)||m.vertices.length!==SHELL.vertices.length||!m.vertices.every(validPoint)||!Array.isArray(m.triangles)||m.triangles.length!==SHELL.triangles.length||m.triangles.some(f=>!Array.isArray(f)||f.length!==3||f.some(v=>!Number.isInteger(v)||v<0||v>=SHELL.vertices.length)))throw new Error('Invalid cell or membrane geometry.');
    if(!validPoint(c.nucleus?.position)||!finiteNumber(c.nucleus.radius)||c.nucleus.radius<=0||c.nucleus.radius>=c.radius||!validPoint(c.mechanics?.polarity)||!validPoint(c.mechanics?.velocity)||!validPoint(c.mechanics?.initialPosition)||!Array.isArray(c.mechanics.trail)||c.mechanics.trail.length>1500)throw new Error('Invalid cell mechanics or nucleus.');
    for(const key of ['actin','mt','adhesions'])if(!Array.isArray(m[key])||m[key].length!==SHELL.vertices.length||m[key].some(x=>!finiteNumber(x)||x<0||x>1))throw new Error('Invalid cortical state.');
    if(!Array.isArray(m.restLengths)||m.restLengths.length!==SHELL.edges.length||m.restLengths.some(x=>!finiteNumber(x)||x<=0)||m.triangles.some((f,j)=>f.some((v,k)=>v!==SHELL.triangles[j][k])))throw new Error('Invalid membrane topology.');
    if(!finiteNumber(c.mechanics.collisionRadius)||c.mechanics.collisionRadius<c.radius||!m.vertices.every(v=>distance(v,c.position)<=c.mechanics.collisionRadius+1e-7))throw new Error('Invalid soma contact envelope.');
    for(const k of ['area','volume','targetArea','targetVolume','reserve','reserveCapacity','suppliedArea','usedArea','recycledArea','tension','elasticEnergy','lastSolveHours'])if(!finiteNumber(m[k]))throw new Error('Invalid membrane state.');
    if(m.area<=0||m.targetArea<=0||m.volume<=0||m.targetVolume<=0||m.reserve<0||m.reserve>1||m.reserveCapacity<=0||m.suppliedArea<0||m.usedArea<0||m.recycledArea<0||m.tension<0)throw new Error('Invalid membrane material.');
    if(!finiteNumber(c.baseRadius)||c.baseRadius<=0||typeof c.initialized!=='boolean'||!['neuron','graft','host','proximal','distal'].includes(c.group)||(c.axonRootId!==null&&(!Number.isInteger(c.axonRootId)||!s.segments[c.axonRootId]||s.segments[c.axonRootId].cellId!==i)))throw new Error('Invalid cell developmental state.');
  }
  for(let i=0;i<s.segments.length;i++){
    const n=s.segments[i];if(n?.id!==i||!Number.isInteger(n.cellId)||!s.cells[n.cellId]||!Number.isInteger(n.parentId)||n.parentId< -1||n.parentId>=i||!Number.isInteger(n.rootId)||n.rootId<0||n.rootId>i||!validPoint(n.start)||!validPoint(n.end)||!finiteNumber(n.radius)||n.radius<=0||n.radius>5||!['axon','dendrite'].includes(n.kind)||typeof n.alive!=='boolean'||!finiteNumber(n.ageHours)||n.ageHours<0||!finiteNumber(n.mt)||n.mt<0||n.mt>1||!Number.isInteger(n.branchOrder)||n.branchOrder<0||n.branchOrder>6)throw new Error('Invalid neurite topology or geometry.');
    if(n.parentId===-1&&(!Number.isInteger(n.anchorVertex)||n.anchorVertex<0||n.anchorVertex>=SHELL.vertices.length))throw new Error('Invalid root membrane attachment.');
    if(n.parentId>=0&&s.segments[n.parentId].cellId!==n.cellId)throw new Error('A neurite parent belongs to another cell.');
    if(s.segments[n.rootId].cellId!==n.cellId||s.segments[n.rootId].parentId!==-1||(n.alive&&n.parentId>=0&&!s.segments[n.parentId].alive))throw new Error('Invalid neurite ancestry.');
  }
  for(let i=0;i<s.tips.length;i++){
    const t=s.tips[i];if(t?.id!==i||!Number.isInteger(t.segmentId)||!s.segments[t.segmentId]||t.cellId!==s.segments[t.segmentId].cellId||!validPoint(t.direction)||!validPoint(t.noiseState)||typeof t.active!=='boolean'||!finiteNumber(t.radius)||t.radius<=0||t.radius>10||!finiteNumber(t.mt)||t.mt<0||t.mt>1||!finiteNumber(t.clutch)||t.clutch<0||t.clutch>1||!finiteNumber(t.ageHours)||t.ageHours<0||!finiteNumber(t.stallHours)||t.stallHours<0||!t.forces||Object.values(t.forces).some(v=>!finiteNumber(v)))throw new Error('Invalid growth cone state.');
    if(t.filopodia&&(!Array.isArray(t.filopodia)||t.filopodia.length!==5||t.filopodia.some(p=>!validPoint(p.start)||!validPoint(p.end)||!validPoint(p.direction)||!finiteNumber(p.length)||p.length<0||p.length>10||p.radius!==.08||typeof p.blocked!=='boolean')))throw new Error('Invalid exploratory protrusion.');
    if(t.shape&&(!Array.isArray(t.shape.radii)||t.shape.radii.length!==12||t.shape.radii.some(x=>!finiteNumber(x)||x<=0||x>10)))throw new Error('Invalid growth cone membrane.');
    if(t.kind!==s.segments[t.segmentId].kind||(t.active&&!s.segments[t.segmentId].alive)||length(t.direction)<.5||length(t.direction)>1.5||!['extending','stalled','contact','retracting','retracted','stabilized'].includes(t.status)||['actin','traction','microtubule','membrane','net','retrograde','speed','clutch'].some(k=>!finiteNumber(t.forces[k])))throw new Error('Invalid growth cone identity or direction.');
  }
  for(const c of s.contacts)if(!s.cells[c.sourceCellId]||!s.cells[c.targetCellId]||c.sourceCellId===c.targetCellId||!s.segments[c.axonSegmentId]||!s.segments[c.dendriteSegmentId]||!validPoint(c.position)||!finiteNumber(c.dwellHours)||!finiteNumber(c.lastTime))throw new Error('Invalid candidate contact.');
  const w=s.world;if(!w||w.mode!==s.config.mode||!validPoint(w.bounds?.min)||!validPoint(w.bounds?.max)||!Array.isArray(w.obstacles)||w.obstacles.length>200||!validPoint(w.cue?.position)||!finiteNumber(w.cue.strength))throw new Error('Invalid environment.');
  if(w.bounds.min.some((v,i)=>v>=w.bounds.max[i])||typeof w.planar!=='boolean'||(w.sphereRadius!==null&&(!finiteNumber(w.sphereRadius)||w.sphereRadius<=0||w.sphereRadius>10000)))throw new Error('Invalid environment boundary.');
  for(const o of w.obstacles)if(typeof o.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(o.id)||!validPoint(o.position)||!['sphere','box'].includes(o.shape)||(o.shape==='sphere'?(!finiteNumber(o.radius)||o.radius<=0||o.radius>1000):(!validPoint(o.size)||o.size.some(v=>v<=0))))throw new Error('Invalid obstacle.');
  if(!s.limits||typeof s.limits.reached!=='boolean'||!s.counters||Object.values(s.counters).some(v=>!finiteNumber(v)||v<0)||!finiteNumber(s.nextHistoryHours))throw new Error('Invalid simulation counters.');
  // Reject non-finite values anywhere, including charts and event metadata.
  const scan=x=>{if(typeof x==='number'&&!Number.isFinite(x))throw new Error('Non-finite saved state.');if(x&&typeof x==='object')for(const v of Object.values(x))scan(v);};scan(s);
  return clone(s);
}
