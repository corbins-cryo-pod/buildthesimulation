/** Distributed overdamped neurite mechanics. µm, h, pN.
 * Mechanisms: O'Toole et al. 2008 (doi:10.1529/biophysj.107.117424),
 * Lamoureux et al. 2010 (doi:10.1002/dneu.20764). Coefficients below are
 * declared exploratory reductions, not fitted tissue/cell-type constants.
 */
import {add,sub,scale,dot,length,distance,unit,clamp,lerp,closestSegmentPoints,segmentSphereHit,segmentBoxHit,segmentCapsuleHit} from './geometry.js';
import {contactBondLoads} from './connectivity.js';

export const NEURITE_MECHANICS=Object.freeze({axialRigidity:75,bendingRigidity:6,nodeDrag:12,
  adhesionDrag:90,anchorSpring:18,anchorYieldUm:1.5,remodelHours:24,maxSpeed:4,maxElasticStrain:.4});
const plus=(a,b,k=1)=>{for(let i=0;i<3;i++)a[i]+=k*b[i];};
const boxesNear=(a,b,c,d,r)=>{
  for(let k=0;k<3;k++)if(Math.max(a[k],b[k])+r<Math.min(c[k],d[k])||Math.min(a[k],b[k])-r>Math.max(c[k],d[k]))return false;
  return true;
};
export function initializeShaftMechanics(s){
  s.material??={restLength:distance(s.start,s.end),anchor:[...s.end],adhesion:0,restCos:null,
    strain:0,tension:0,remodeledLength:0};
  return s.material;
}
/** Growth adds stress-free material; an elastic displacement does not. */
export function addShaftMaterial(s,amount){
  const m=initializeShaftMechanics(s);m.restLength=Math.max(0,m.restLength+amount);
}
export function prepareNeuriteGraph(sim,cell){
  const segments=sim.segments.filter(s=>s.alive&&s.cellId===cell.id),byId=new Map(segments.map(s=>[s.id,s]));
  for(const s of segments){const m=initializeShaftMechanics(s),p=byId.get(s.parentId);
    if(m.restCos===null&&p&&distance(p.start,p.end)>.2&&distance(s.start,s.end)>.2)m.restCos=clamp(dot(unit(sub(p.end,p.start)),unit(sub(s.end,s.start))),-1,1);
  }
  return {segments,byId,roots:segments.filter(s=>s.parentId<0)};
}
export function settlementGain(sim,graph){
  if(!graph.roots.length)return 1;
  const age=graph.roots.reduce((a,s)=>a+s.ageHours,0)/graph.roots.length;
  const extent=graph.segments.reduce((a,s)=>a+distance(s.start,s.end),0);
  return 1/(1+(sim.config.somaSettlement??1)*sim.config.adhesion*(-Math.expm1(-age/8))*Math.min(20,extent/15));
}
/** Analytic energy gradients. Every internal force has an equal/opposite
 * endpoint contribution, including forces transmitted to the soma cortex. */
export function neuriteForces(sim,cell,graph,adhesions=true){
  const cfg=NEURITE_MECHANICS,gain=sim.config.neuriteCoupling??1;
  const nodes=new Map(graph.segments.map(s=>[s.id,[0,0,0]])),roots=new Map(),tensions=new Map();let energy=0;
  const atStart=(s,f)=>{if(s.parentId>=0){if(nodes.has(s.parentId))plus(nodes.get(s.parentId),f);}else{if(!roots.has(s.anchorVertex))roots.set(s.anchorVertex,[0,0,0]);plus(roots.get(s.anchorVertex),f);}};
  for(const s of graph.segments){
    const m=s.material,delta=sub(s.end,s.start),len=length(delta),rest=Math.max(.25,m.restLength),ea=cfg.axialRigidity*(s.radius/.5)**2*gain;
    const strain=(len-m.restLength)/rest,tension=ea*strain,f=scale(unit(delta),tension);
    // A newly initiated zero-length branch has no defined axis/material yet.
    if(m.restLength>.05){atStart(s,f);plus(nodes.get(s.id),f,-1);energy+=.5*ea*(len-m.restLength)**2/rest;}
    tensions.set(s.id,{strain,tension:m.restLength>.05?tension:0});
    const p=graph.byId.get(s.parentId);
    if(p&&m.restCos!==null&&len>.2&&distance(p.start,p.end)>.2){
      const a=sub(p.end,p.start),la=length(a),u=scale(a,1/la),v=scale(delta,1/len),cos=dot(u,v),q=cos-m.restCos,k=cfg.bendingRigidity*gain;
      const ga=scale(sub(v,scale(u,cos)),k*q/la),gb=scale(sub(u,scale(v,cos)),k*q/len);
      atStart(p,ga);plus(nodes.get(p.id),sub(gb,ga));plus(nodes.get(s.id),gb,-1);energy+=.5*k*q*q;
    }
    if(adhesions){const d=sub(s.end,m.anchor);if(sim.world.planar)d[1]=0;plus(nodes.get(s.id),d,-cfg.anchorSpring*m.adhesion*gain);}
  }
  if(adhesions)for(const load of contactBondLoads(sim)){
    const s=graph.byId.get(load.segmentId);if(!s)continue;
    atStart(s,scale(load.force,1-load.fraction));plus(nodes.get(s.id),load.force,load.fraction);
  }
  return {nodes,roots,tensions,energy};
}

function edgeFree(sim,s,a,b,motion,index,neighbors,nearby){
  const radius=s.radius+motion+.00001;
  for(const p of [a,b]){
    if(sim.world.sphereRadius&&length(p)+s.radius>sim.world.sphereRadius)return false;
    for(let k=0;k<3;k++)if(!(sim.world.planar&&k===1)&&(p[k]<sim.world.bounds.min[k]+s.radius||p[k]>sim.world.bounds.max[k]-s.radius))return false;
    if(sim.world.planar&&p[1]-s.radius<(sim.world.substrateY??-5.8))return false;
  }
  for(const o of sim.world.obstacles)if(o.shape==='sphere'?segmentSphereHit(a,b,o.position,o.radius+radius):segmentBoxHit(a,b,o.position,o.size,radius))return false;
  for(const c of sim.cells)if(c.id!==s.cellId&&boxesNear(a,b,c.position,c.position,c.mechanics.collisionRadius+radius)&&segmentSphereHit(a,b,c.position,c.mechanics.collisionRadius+radius))return false;
  const own=sim.cells[s.cellId];
  if(s.parentId>=0&&own&&boxesNear(a,b,own.position,own.position,own.mechanics.collisionRadius+radius)&&!segmentSphereHit(s.start,s.end,own.position,own.mechanics.collisionRadius+s.radius)&&segmentSphereHit(a,b,own.position,own.mechanics.collisionRadius+radius))return false;
  for(const id of nearby){
    const other=sim.segments[id];if(!other?.alive||neighbors.has(id))continue;
    const cone=other.cellId!==s.cellId?index.cones?.get(id):null;
    if(!boxesNear(a,b,other.start,other.end,Math.max(other.radius,cone?.radius||0)+radius+.025))continue;
    // Local shared material is not a collision. Unrelated shafts, including
    // same-cell arbors, retain finite collision radii during the swept move.
    if(closestSegmentPoints(a,b,other.start,other.end).distance<=other.radius+radius){
      // The expanded proposed capsule contains the entire old capsule. An
      // existing overlap (often local same-cell material) cannot be escaped by
      // halving this swept move; avoid seven equivalent rejected checks.
      return closestSegmentPoints(s.start,s.end,other.start,other.end).distance<=other.radius+s.radius+.00001?-1:false;
    }
    if(cone&&segmentSphereHit(a,b,other.end,cone.radius+radius+.025))return false;
  }
  return true;
}

/** Joint-by-joint constrained overdamped solve. A shared joint updates every
 * daughter atomically. Sequential constraints dissipate motion; they never
 * translate the entire arbor or reconnect a crossing. */
export function advanceNeuriteNodes(sim,cell,graph,forces,dt,index){
  const cfg=NEURITE_MECHANICS,children=new Map();
  for(const s of graph.segments)if(s.parentId>=0){if(!children.has(s.parentId))children.set(s.parentId,[]);children.get(s.parentId).push(s);}
  const tipAt=new Map(sim.tips.filter(t=>t.active&&t.cellId===cell.id).map(t=>[t.segmentId,t]));
  let moves=0,maxStrain=0;
  for(const s of graph.segments){
    const m=s.material,cs=children.get(s.id)||[],old=s.end;
    const delta=scale(forces.nodes.get(s.id),dt/(cfg.nodeDrag+cfg.adhesionDrag*m.adhesion));
    const speed=length(delta)/dt;if(speed>cfg.maxSpeed)for(let k=0;k<3;k++)delta[k]*=cfg.maxSpeed/speed;
    const linked=[s,...cs],neighbors=new Set([s.id,s.parentId,...cs.map(c=>c.id)]);
    for(const c of children.get(s.parentId)||[])neighbors.add(c.id);
    for(const c of cs)for(const d of children.get(c.id)||[])neighbors.add(d.id);
    // One conservative broad-phase query covers every halved line-search move.
    // The node can move at most |delta|, and swept clearance adds another |delta|.
    const nearby=new Map(length(delta)>1e-9?linked.map(edge=>[edge.id,index.query(edge.start,edge.end,edge.radius+2*length(delta)+8)]):[]);
    let accepted=null,area=0;
    for(let attempt=0;attempt<7&&length(delta)>1e-9;attempt++){
      const next=add(old,delta),motion=length(delta),tip=tipAt.get(s.id);
      let free=true,locked=false;
      if(tip){
        for(const o of sim.world.obstacles)if(o.shape==='sphere'?segmentSphereHit(old,next,o.position,o.radius+tip.radius+.025):segmentBoxHit(old,next,o.position,o.size,tip.radius+.025)){free=false;break;}
        for(const c of sim.cells)if(c.id!==s.cellId&&segmentSphereHit(old,next,c.position,c.mechanics.collisionRadius+tip.radius+.025))free=false;
        for(const id of index.query(old,next,tip.radius+8)){const other=sim.segments[id];if(!other?.alive||other.cellId===s.cellId)continue;
          if(segmentCapsuleHit(old,next,other.start,other.end,other.radius+tip.radius+.025))free=false;
          const cone=index.cones?.get(id);if(cone&&segmentSphereHit(old,next,other.end,cone.radius+tip.radius+.025))free=false;
        }
      }
      area=0;
      for(const edge of linked){
        const a=edge===s?edge.start:next,b=edge===s?next:edge.end;
        if(!free)break;
        const clear=edgeFree(sim,edge,a,b,motion,index,neighbors,nearby.get(edge.id));
        if(clear!==true){free=false;locked=clear===-1;break;}
        const oldLength=distance(edge.start,edge.end),len=distance(a,b),rest=Math.max(.25,edge.material.restLength);
        if(len<.025&&oldLength>.025||Math.abs(len-edge.material.restLength)>cfg.maxElasticStrain*rest&&Math.abs(len-edge.material.restLength)>Math.abs(oldLength-edge.material.restLength)+1e-10){free=false;break;}
        area+=2*Math.PI*edge.radius*(len-oldLength);
      }
      if(free&&area<=cell.membrane.reserve*cell.membrane.reserveCapacity){accepted=next;break;}
      if(locked)break;
      for(let k=0;k<3;k++)delta[k]*=.5;
    }
    if(accepted){
      const membrane=cell.membrane;
      if(area>0){membrane.reserve-=area/membrane.reserveCapacity;membrane.usedArea+=area;}
      else{const recycled=Math.min(-area*.6,(1-membrane.reserve)*membrane.reserveCapacity);membrane.reserve+=recycled/membrane.reserveCapacity;membrane.recycledArea+=recycled;}
      s.end=accepted;for(const c of cs)c.start=[...accepted];
      for(const edge of linked)index.insert(edge.id,edge.start,edge.end,edge.radius);
      moves++;
    }
    const access=sim.world.planar?Math.exp(-Math.max(0,s.end[1]-(sim.world.substrateY??-5.8))/7):1;
    const target=sim.config.adhesion*access*(-Math.expm1(-s.ageHours/3));
    const offset=sub(s.end,m.anchor);if(sim.world.planar)offset[1]=0;
    const yielding=Math.max(0,length(offset)-cfg.anchorYieldUm),off=.3+yielding*2;
    m.adhesion+=(target/(1+off)-m.adhesion)*(-Math.expm1(-dt*(1+off)));
    // Unbound/slipping anchors follow material; attached anchors resist sliding.
    m.anchor=lerp(m.anchor,s.end,-Math.expm1(-dt*((1-m.adhesion)*.12+yielding)));
    const len=distance(s.start,s.end),change=(len-m.restLength)*(-Math.expm1(-dt/cfg.remodelHours));
    m.restLength=Math.max(0,m.restLength+change);m.remodeledLength+=change;
  }
  // A daughter can move after its parent's endpoint was processed. Report the
  // completed shared geometry, not a mixture of intermediate joint states.
  for(const s of graph.segments){const m=s.material;
    m.strain=(distance(s.start,s.end)-m.restLength)/Math.max(.25,m.restLength);
    m.tension=cfg.axialRigidity*(s.radius/.5)**2*(sim.config.neuriteCoupling??1)*m.strain;
    maxStrain=Math.max(maxStrain,Math.abs(m.strain));
  }
  cell.mechanics.neuriteEnergy=forces.energy;cell.mechanics.maxNeuriteStrain=maxStrain;
  cell.mechanics.neuriteReaction=[...forces.roots.values()].reduce((a,f)=>add(a,f),[0,0,0]);
  cell.mechanics.shaftMoves=(cell.mechanics.shaftMoves||0)+moves;
}
