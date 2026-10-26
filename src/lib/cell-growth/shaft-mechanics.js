/** Slow overdamped relaxation of newly deposited shafts. Older adhesive shafts
 * stay anchored. Geometry is solved here, never displaced by the renderer. */
import {add,sub,scale,length,distance,lerp,segmentSphereHit,segmentBoxHit,segmentCapsuleHit} from './geometry.js';
import {MORPHOGENESIS} from './morphogenesis.js';

export function relaxYoungShafts(sim,dt,index){
  const children=new Map();
  for(const s of sim.segments)if(s.alive&&s.parentId>=0){if(!children.has(s.parentId))children.set(s.parentId,[]);children.get(s.parentId).push(s);}
  const terminals=new Set(sim.tips.filter(t=>t.active).map(t=>t.segmentId)),candidates=new Set();
  for(const tip of sim.tips){if(!tip.active)continue;let node=sim.segments[tip.segmentId];
    for(let i=0;node&&i<10;i++){if(node.parentId>=0)candidates.add(node.parentId);node=sim.segments[node.parentId];}
  }
  for(const id of candidates){
    const a=sim.segments[id],cs=children.get(id);
    if(!a?.alive||a.parentId<0||a.ageHours>12||cs?.length!==1||terminals.has(id))continue;
    const b=cs[0];if(b.branchOrder!==a.branchOrder)continue;
    const la=distance(a.start,a.end),lb=distance(b.start,b.end);if(la<.2||lb<.2)continue;
    const current=a.end,straight=lerp(a.start,b.end,la/(la+lb));
    const mobility=(1-a.ageHours/12)*(1-.85*sim.config.adhesion);
    let delta=scale(sub(straight,current),-Math.expm1(-dt*MORPHOGENESIS.shaftRelaxationPerHour*mobility));
    const size=length(delta);if(size<1e-8)continue;
    if(size>MORPHOGENESIS.maxShaftMotionPerHour*dt)delta=scale(delta,MORPHOGENESIS.maxShaftMotionPerHour*dt/size);
    const point=add(current,delta),r=Math.max(a.radius,b.radius),cell=sim.cells[a.cellId];
    if(point.some((v,k)=>v<sim.world.bounds.min[k]+r||v>sim.world.bounds.max[k]-r))continue;
    if(sim.world.sphereRadius&&length(point)+r>sim.world.sphereRadius)continue;
    const edges=[[a.start,point,a.radius],[point,b.end,b.radius]];
    let blocked=false;
    for(const [start,end,physicalRadius] of edges){
      // The expanded candidate capsule encloses every intermediate edge while
      // this joint moves, so even a thin obstruction cannot be swept through.
      const radius=physicalRadius+length(delta);
      for(const o of sim.world.obstacles){if(o.shape==='sphere'?segmentSphereHit(start,end,o.position,o.radius+radius+.025):segmentBoxHit(start,end,o.position,o.size,radius+.025)){blocked=true;break;}}
      if(blocked)break;
      for(const c of sim.cells)if(c.id!==a.cellId&&segmentSphereHit(start,end,c.position,c.mechanics.collisionRadius+radius+.025)){blocked=true;break;}
      if(blocked)break;
      for(const otherId of index.query(start,end,radius+8)){
        const other=sim.segments[otherId];if(!other?.alive||other.id===a.id||other.id===b.id)continue;
        // Neighboring segments and material at a shared branch node overlap by
        // construction. Every unrelated edge, including same-cell shafts, is checked.
        if(other.id===a.parentId||other.parentId===a.parentId||other.parentId===b.id||other.parentId===a.id)continue;
        const cone=index.cones?.get(other.id);
        if(cone&&other.cellId!==a.cellId&&segmentSphereHit(start,end,other.end,radius+cone.radius+.025)){blocked=true;break;}
        if(segmentCapsuleHit(start,end,other.start,other.end,radius+other.radius+.025)){blocked=true;break;}
      }
      if(blocked)break;
    }
    if(blocked)continue;
    const area=2*Math.PI*(a.radius*(distance(a.start,point)-la)+b.radius*(distance(point,b.end)-lb));
    const m=cell.membrane;
    if(area>m.reserve*m.reserveCapacity)continue;
    if(area>0){m.reserve-=area/m.reserveCapacity;m.usedArea+=area;}
    else{const recycled=Math.min(-area*.6,(1-m.reserve)*m.reserveCapacity);m.reserve+=recycled/m.reserveCapacity;m.recycledArea+=recycled;}
    a.end=[...point];b.start=[...point];
    index.insert(a.id,a.start,a.end,a.radius);index.insert(b.id,b.start,b.end,b.radius);
    sim.counters.shaftRelaxations++;
  }
}
