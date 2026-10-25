/** Video-informed qualitative behavior, not rates fitted to microscopy.
 * Independent saved random streams keep local episodes independent of tip order. */
import {add,scale,unit,sub,dot,clamp,distance,closestSegmentPoints} from './geometry.js';

function draw(state){state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return state.rng/4294967296;}
export function createTipBehavior(seed,id,height){
  const state={rng:(seed^Math.imul(id+1,2654435761))>>>0,phase:'growing',remaining:0,gain:1,clock:0,baseHeight:height};
  state.phase=draw(state)<.55?'growing':'paused';state.remaining=.15+draw(state)*1.4;state.gain=state.phase==='growing'?1.6:0;
  return state;
}
export function advanceTipBehavior(tip,dt,strength=1){
  const b=tip.behavior;let left=dt,integral=0;b.clock+=dt;
  while(left>1e-12){
    if(b.remaining<=1e-12){
      b.phase=b.phase==='growing'?(draw(b)<.16?'retracting':'paused'):'growing';
      b.remaining=b.phase==='growing'?.3+draw(b)*1.2:b.phase==='paused'?.2+draw(b)*1.5:.1+draw(b)*.25;
    }
    const h=Math.min(left,b.remaining),target=b.phase==='growing'?1.8:b.phase==='paused'?0:-.3,tau=.12,decay=Math.exp(-h/tau);
    integral+=target*h+(b.gain-target)*tau*(1-decay);b.gain=target+(b.gain-target)*decay;b.remaining-=h;left-=h;
  }
  return 1-strength+strength*integral/dt;
}

/** A plate constrains the culture, not all neurite centers to one plane.
 * Plan a shallow raised route before a transverse shaft encounter. The engine
 * still sweeps every proposed step against finite shafts, cones and solids. */
export function plateDirection(sim,tip,point,direction,index){
  if(!sim.world.planar)return direction;
  const horizontal=unit([direction[0],0,direction[2]]),ahead=add(point,scale(horizontal,18));
  let height=tip.behavior.baseHeight;
  // Segment IDs interleave across cells. Identify nearby parent geometry by
  // ancestry and length, never by numerical ID proximity.
  const local=new Set();let node=sim.segments[tip.segmentId],walked=0;
  for(let i=0;node&&i<64&&walked<12;i++){
    local.add(node.id);walked+=distance(node.start,node.end);node=sim.segments[node.parentId];
  }
  const flat=p=>[p[0],0,p[2]];
  for(const id of index.query(point,ahead,12)){
    const s=sim.segments[id];if(!s?.alive||id===tip.segmentId)continue;
    if(local.has(id)||(s.cellId===tip.cellId&&local.has(s.parentId)&&distance(s.start,point)<6))continue;
    const shaft=unit(sub(flat(s.end),flat(s.start)));
    if(Math.abs(dot(horizontal,shaft))>.85)continue;
    const near=closestSegmentPoints(flat(point),flat(ahead),flat(s.start),flat(s.end));
    if(near.distance>tip.radius+s.radius+1)continue;
    // Leave approaching tips available for contact instead of automatically
    // climbing over them. Crossings concern the established shaft behind them.
    if(index.cones?.has(id)&&Math.hypot(near.q[0]-s.end[0],near.q[2]-s.end[2])<8)continue;
    height=Math.max(height,Math.max(s.start[1],s.end[1])+tip.radius+s.radius+.45);
  }
  height=Math.min(height,sim.world.bounds.max[1]-tip.radius-.1);
  const slope=clamp((height-point[1])*.32,-.35,.8);
  return unit([horizontal[0],slope,horizontal[2]]);
}
