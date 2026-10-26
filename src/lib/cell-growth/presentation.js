/** Display interpolation between completed solver frames. Never fed back into
 * physics, measurements, export or random generators. No extrapolation/jitter. */
import {lerp,clamp,unit,distance} from './geometry.js';

export function interpolateMorphology(previous,next,fraction){
  const t=clamp(fraction,0,1);
  if(t===1||!previous||previous.config.seed!==next.config.seed||previous.timeHours>=next.timeHours)return next;
  if(t===0)return previous;
  const scalar=(a,b)=>a+(b-a)*t;
  const origins=new Map();
  const segments=next.segments.map(s=>{
    const old=previous.segments[s.id];
    if(old?.alive&&s.alive)return {...s,start:lerp(old.start,s.start,t),end:lerp(old.end,s.end,t)};
    if(!s.alive)return s;
    const parent=previous.segments[s.parentId],origin=parent?.alive?parent.end:origins.get(s.parentId)||s.start;
    origins.set(s.id,origin);
    return {...s,start:lerp(origin,s.start,t),end:lerp(origin,s.end,t)};
  });
  const cells=next.cells.map((c,i)=>{
    const old=previous.cells[i];if(!old)return c;
    return {...c,position:lerp(old.position,c.position,t),nucleus:{...c.nucleus,position:lerp(old.nucleus.position,c.nucleus.position,t)},
      membrane:{...c.membrane,vertices:c.membrane.vertices.map((p,j)=>lerp(old.membrane.vertices[j],p,t))}};
  });
  const tips=next.tips.map((tip,i)=>{
    const old=previous.tips[i],origin=origins.get(tip.segmentId)||segments[tip.segmentId]?.start;
    return {...tip,direction:old?unit(lerp(old.direction,tip.direction,t)):tip.direction,
      shape:tip.shape?{...tip.shape,radii:tip.shape.radii.map((r,j)=>scalar(old?.shape?.radii[j]??0,r))}:tip.shape,
      filopodia:tip.filopodia?.map((p,j)=>{const q=old?.filopodia?.[j];return {...p,start:lerp(q?.start||origin||p.start,p.start,t),end:lerp(q?.end||origin||p.start,p.end,t),length:scalar(q?.length??0,p.length)};})};
  });
  const oldBuds=new Map(previous.buds.map(b=>[b.id,b]));
  const buds=next.buds.map(b=>{const old=oldBuds.get(b.id);return {...b,start:lerp(old?.start||b.start,b.start,t),end:lerp(old?.end||b.start,b.end,t),length:scalar(old?.length??0,b.length)};});
  const oldWaves=new Map(previous.waves.map(w=>[w.id,w])),timeHours=scalar(previous.timeHours,next.timeHours);
  const waves=next.waves.flatMap(w=>{
    if(w.bornHours>timeHours)return [];
    const old=oldWaves.get(w.id),route=[];
    let segment=segments[w.segmentId];
    while(segment){route.unshift(segment);if(old?segment.id===old.segmentId:segment.parentId===-1)break;segment=segments[segment.parentId];}
    if(!route.length||old&&route[0].id!==old.segmentId)return [w];
    const spans=route.map((s,i)=>({s,start:i===0?(old?.offset??0):0,end:i===route.length-1?w.offset:distance(s.start,s.end)}));
    const total=spans.reduce((n,p)=>n+Math.max(0,p.end-p.start),0);
    const progress=old?t:clamp((timeHours-w.bornHours)/Math.max(1e-9,next.timeHours-w.bornHours),0,1);
    let traveled=total*progress;
    for(const p of spans){const length=Math.max(0,p.end-p.start);if(traveled<=length)return [{...w,segmentId:p.s.id,offset:p.start+traveled}];traveled-=length;}
    return [w];
  });
  return {...next,timeHours,cells,segments,tips,buds,waves};
}
