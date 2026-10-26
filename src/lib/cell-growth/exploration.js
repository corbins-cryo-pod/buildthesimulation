/** Finite exploratory filopodia are geometric sensing degrees of freedom, not
 * individual actin polymers. They steer the cone but do not become retained shafts. */
import {add,sub,scale,unit,cross,distance,length,lerp,segmentSphereHit,segmentBoxHit,segmentCapsuleHit,pointSegmentDistance} from './geometry.js';
import {signedObstacle} from './mechanics.js';
import {createExploration,advanceExploration} from './morphogenesis.js';

export function constrainCone(sim,tip,index){
  const segment=sim.segments[tip.segmentId],p=segment.end;
  let allowed=10;
  for(const o of sim.world.obstacles)allowed=Math.min(allowed,signedObstacle(p,o).gap-.025);
  for(const c of sim.cells)if(c.id!==tip.cellId)allowed=Math.min(allowed,distance(p,c.position)-c.mechanics.collisionRadius-.025);
  for(const id of index.query(p,p,8)){
    const shaft=sim.segments[id];if(!shaft?.alive||shaft.cellId===tip.cellId)continue;
    allowed=Math.min(allowed,pointSegmentDistance(p,shaft.start,shaft.end).distance-shaft.radius-.025);
    const other=index.cones?.get(id);if(!other||other.id===tip.id)continue;
    allowed=Math.min(allowed,distance(p,sim.segments[id].end)-other.radius-.025);
  }
  for(let i=0;i<3;i++)if(!(sim.world.planar&&i===1))allowed=Math.min(allowed,p[i]-sim.world.bounds.min[i],sim.world.bounds.max[i]-p[i]);
  if(sim.world.sphereRadius)allowed=Math.min(allowed,sim.world.sphereRadius-length(p));
  if(tip.shape&&allowed<tip.shape.maxRadius){const factor=Math.max(.05,allowed)/tip.shape.maxRadius;tip.shape.radii=tip.shape.radii.map(r=>r*factor);tip.shape.height=Math.min(tip.shape.height,Math.max(.05,allowed));tip.shape.maxRadius=Math.max(...tip.shape.radii);tip.radius=tip.shape.maxRadius;}
}

export function sampleFilopodia(sim,tip,index,dt){
  const segment=sim.segments[tip.segmentId],origin=segment.end,dir=unit(tip.direction),side=unit(cross(Math.abs(dir[1])<.9?[0,1,0]:[1,0,0],dir));
  tip.exploration??=createExploration(sim.config.seed,tip.id);
  advanceExploration(tip,dt,sim.config);
  const probes=[];
  for(const local of tip.exploration.probes){
    const angle=local.angle,u=unit(add(scale(dir,Math.cos(angle)),scale(side,Math.sin(angle))));
    const rim=tip.shape?.radii,sector=((angle/(2*Math.PI)+1)%1)*(rim?.length||12),i=Math.floor(sector),f=sector-i;
    const radius=rim?rim[i]*(1-f)+rim[(i+1)%rim.length]*f:tip.radius;
    const start=add(origin,scale(u,radius*.96));
    const extension=local.length/(1+.012*tip.forces.membrane),end=add(start,scale(u,extension));let first=null;
    const accept=h=>{if(h&&(!first||h.t<first.t))first=h;};
    for(const o of sim.world.obstacles)accept(o.shape==='sphere'?segmentSphereHit(start,end,o.position,o.radius+.08):segmentBoxHit(start,end,o.position,o.size,.08));
    for(const c of sim.cells)if(c.id!==tip.cellId)accept(segmentSphereHit(start,end,c.position,c.mechanics.collisionRadius+.08));
    for(const id of index.query(start,end,8)){const other=sim.segments[id];if(other.alive&&other.cellId!==tip.cellId){accept(segmentCapsuleHit(start,end,other.start,other.end,other.radius+.08));const cone=index.cones?.get(id);if(cone)accept(segmentSphereHit(start,end,other.end,cone.radius+.08));}}
    for(let k=0;k<3;k++)if(!(sim.world.planar&&k===1)){
      const lo=sim.world.bounds.min[k]+.08,hi=sim.world.bounds.max[k]-.08;
      if(end[k]<lo||end[k]>hi){const edge=end[k]<lo?lo:hi;accept({t:Math.max(0,(edge-start[k])/(end[k]-start[k]))});}
    }
    if(sim.world.sphereRadius&&length(end)>sim.world.sphereRadius-.08){
      const radius=sim.world.sphereRadius-.08,d=sub(end,start),aa=d.reduce((a,v)=>a+v*v,0),bb=start.reduce((a,v,k)=>a+v*d[k],0),cc=start.reduce((a,v)=>a+v*v,0)-radius*radius;
      accept({t:Math.max(0,Math.min(1,(-bb+Math.sqrt(Math.max(0,bb*bb-aa*cc)))/aa))});
    }
    const point=first?lerp(start,end,Math.max(0,first.t-.01/Math.max(.01,extension))):end;
    probes.push({start,end:point,direction:u,length:distance(start,point),radius:.08,blocked:Boolean(first),phase:local.phase});
  }
  tip.filopodia=probes;
}
