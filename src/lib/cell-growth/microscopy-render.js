/** A qualitative microscopy view of the SAME solved geometry. Phase halos and
 * fluorescence intensity are display transfer functions, not fitted optics.
 * All moving edges, protrusions and wave positions come from saved model state.
 */
import {shaftProfile,wavePosition} from './morphogenesis.js';
import {add,scale,unit,cross} from './geometry.js';
import {contactAnchors} from './connectivity.js';

const TAU=2*Math.PI;
const hash=n=>{let x=Math.imul(n^0x9e3779b9,0x85ebca6b);x^=x>>>13;return (x>>>0)/4294967296;};

export function somaOutline(cell,project){
  // Silhouette edges separate front- and back-facing faces of the solved mesh.
  // Binning vertices by angle incorrectly pulls interior projected vertices into
  // the outline and produces a scalloped "flower" on an otherwise smooth shell.
  const projected=cell.membrane.vertices.map(project),edges=new Map();
  for(const face of cell.membrane.triangles){
    const [a,b,c]=face.map(i=>projected[i]);
    const facing=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0;
    for(let i=0;i<3;i++){
      const u=face[i],v=face[(i+1)%3],key=u<v?`${u}:${v}`:`${v}:${u}`;
      const edge=edges.get(key);
      if(edge)edge.boundary=edge.facing!==facing;else edges.set(key,{u,v,facing,boundary:false});
    }
  }
  const adjacency=new Map();
  for(const e of edges.values())if(e.boundary){for(const [u,v] of [[e.u,e.v],[e.v,e.u]]){if(!adjacency.has(u))adjacency.set(u,[]);adjacency.get(u).push(v);}}
  const visited=new Set(),loops=[];
  for(const start of adjacency.keys()){
    if(visited.has(start))continue;
    const loop=[];let previous=-1,current=start;
    while(!visited.has(current)){
      visited.add(current);loop.push([projected[current].x,projected[current].y]);
      const next=adjacency.get(current)?.find(i=>i!==previous);if(next===undefined)break;
      previous=current;current=next;
    }
    if(loop.length>2)loops.push(loop);
  }
  const area=points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0));
  return loops.sort((a,b)=>area(b)-area(a))[0]||[];
}

function outlinePath(ctx,points){
  if(points.length<3)return;
  ctx.beginPath();
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  ctx.moveTo(...mid(points.at(-1),points[0]));
  for(let i=0;i<points.length;i++)ctx.quadraticCurveTo(...points[i],...mid(points[i],points[(i+1)%points.length]));
  ctx.closePath();
}

export function taperedPath(ctx,a,b,ra,rb){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
  if(length<1e-5){ctx.moveTo(a.x+Math.max(ra,rb,.05),a.y);ctx.arc(a.x,a.y,Math.max(ra,rb,.05),0,TAU);ctx.closePath();return;}
  const nx=-dy/length,ny=dx/length;
  ctx.moveTo(a.x+nx*ra,a.y+ny*ra);ctx.lineTo(b.x+nx*rb,b.y+ny*rb);
  ctx.arc(b.x,b.y,rb,Math.atan2(ny,nx),Math.atan2(-ny,-nx),true);
  ctx.lineTo(a.x-nx*ra,a.y-ny*ra);ctx.arc(a.x,a.y,ra,Math.atan2(-ny,-nx),Math.atan2(ny,nx),true);ctx.closePath();
}

export function drawMicroscopy(ctx,sim,options,project,pixelsPerUm,width,height){
  const fluorescent=options.inspectionMode==='fluorescence',light=fluorescent?'238,242,230':'255,255,250';
  const points=[],profile=shaftProfile(sim),selected=options.selectedCell;
  const visibleCell=id=>!options.isolate||id===selected;
  const background=ctx.createRadialGradient(width*.45,height*.4,20,width*.5,height*.5,Math.max(width,height)*.8);
  background.addColorStop(0,fluorescent?'#131819':'#ababab');background.addColorStop(1,fluorescent?'#080b0d':'#959595');
  ctx.fillStyle=background;ctx.fillRect(0,0,width,height);

  // Substrate marks/solids are exact environment geometry. Ordinary cultures
  // contain neither a tiled grid nor an artificial bead obstacle by default.
  for(const o of sim.world.obstacles){
    const p=project(o.position);ctx.fillStyle=fluorescent?'#233039':'rgba(74,80,80,.24)';ctx.strokeStyle=fluorescent?'#5a7070':'rgba(231,236,230,.5)';ctx.lineWidth=1;
    if(o.shape==='sphere'){ctx.beginPath();ctx.arc(p.x,p.y,o.radius*pixelsPerUm,0,TAU);}
    else{const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>project([o.position[0]+x*o.size[0],o.position[1],o.position[2]+z*o.size[2]]));ctx.beginPath();corners.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}
    ctx.fill();ctx.stroke();
  }

  const segments=sim.segments.filter(s=>s.alive&&visibleCell(s.cellId)).sort((a,b)=>(a.start[1]+a.end[1])-(b.start[1]+b.end[1]));
  // A single compound fill gives the union of the capsule profiles. Painting
  // translucent segments separately creates a dark bead at every mesh joint.
  // The same union receives an optical halo; there are no end-cap highlights.
  ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  for(const s of segments){
    const a=project(s.start),b=project(s.end),r=profile.get(s.id);
    const ra=Math.max(.18,r.r0*pixelsPerUm*options.thickness),rb=Math.max(.16,r.r1*pixelsPerUm*options.thickness);
    taperedPath(ctx,a,b,ra,rb);
    points.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,r:Math.max(4,ra),cellId:s.cellId,tipId:null});
  }
  ctx.save();ctx.shadowColor=fluorescent?'rgba(206,235,208,.45)':'rgba(255,255,244,.8)';ctx.shadowBlur=fluorescent?3:2.5;
  ctx.fillStyle=fluorescent?'rgba(219,237,218,.62)':'rgba(36,36,36,.66)';ctx.fill();ctx.restore();
  if(!fluorescent){
    ctx.beginPath();
    for(const s of segments){const a=project(s.start),b=project(s.end);ctx.moveTo(a.x+.35,a.y+.45);ctx.lineTo(b.x+.35,b.y+.45);}
    ctx.strokeStyle='rgba(220,220,220,.24)';ctx.lineWidth=Math.max(.2,.13*pixelsPerUm);ctx.stroke();
  }

  for(const cell of sim.cells){
    if(!visibleCell(cell.id))continue;
    const p=project(cell.position),outline=somaOutline(cell,project),r=cell.radius*pixelsPerUm;
    outlinePath(ctx,outline);ctx.lineWidth=3.5;ctx.strokeStyle=`rgba(${light},${fluorescent?.12:.48})`;ctx.stroke();
    const fill=ctx.createRadialGradient(p.x-r*.15,p.y-r*.12,r*.15,p.x,p.y,r*1.35);
    if(fluorescent){fill.addColorStop(0,'rgba(215,236,217,.56)');fill.addColorStop(.7,'rgba(207,231,213,.64)');fill.addColorStop(1,'rgba(236,246,225,.22)');}
    else{fill.addColorStop(0,'rgba(192,192,192,.84)');fill.addColorStop(.5,'rgba(209,209,209,.87)');fill.addColorStop(.82,'rgba(225,225,225,.91)');fill.addColorStop(1,'rgba(199,199,199,.55)');}
    ctx.fillStyle=fill;ctx.fill();
    // Root funnels join the solved cortex to primary shafts inside the soma
    // footprint. They do not add unmeasured neurite length to the arbor.
    for(const root of segments.filter(s=>s.cellId===cell.id&&s.parentId===-1)){
      const a=project(root.start),b=project(root.end),dx=a.x-p.x,dy=a.y-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,rr=Math.min(r*.28,2.5*pixelsPerUm);
      ctx.beginPath();ctx.moveTo(p.x+dx*.72+nx*rr,p.y+dy*.72+ny*rr);ctx.quadraticCurveTo(a.x+nx*.7,a.y+ny*.7,b.x,b.y);ctx.quadraticCurveTo(a.x-nx*.7,a.y-ny*.7,p.x+dx*.72-nx*rr,p.y+dy*.72-ny*rr);ctx.closePath();ctx.fillStyle=fluorescent?'rgba(223,241,220,.42)':'rgba(219,219,219,.8)';ctx.fill();
    }
    const np=project(cell.nucleus.position),nr=cell.nucleus.radius*pixelsPerUm;
    if(!fluorescent){
      const nuclear=ctx.createRadialGradient(np.x-nr*.25,np.y-nr*.22,.1,np.x,np.y,nr);nuclear.addColorStop(0,'rgba(103,103,103,.44)');nuclear.addColorStop(.7,'rgba(116,116,116,.32)');nuclear.addColorStop(1,'rgba(149,149,149,.08)');ctx.fillStyle=nuclear;ctx.beginPath();ctx.ellipse(np.x,np.y,nr*1.02,nr*.90,cell.id*.7,0,TAU);ctx.fill();
      // Static intracellular granularity is purely visual, with no claim of
      // individually simulated organelles or active vesicle transport.
      if(r>9)for(let i=0;i<13;i++){const angle=hash(cell.id*31+i)*TAU,rad=(.48+.32*hash(cell.id*53+i+5))*r;ctx.beginPath();ctx.arc(p.x+Math.cos(angle)*rad,p.y+Math.sin(angle)*rad*.7,Math.max(.35,.13*pixelsPerUm),0,TAU);ctx.fillStyle='rgba(106,106,106,.25)';ctx.fill();}
    }
    points.push({x:p.x,y:p.y,r:Math.max(8,r),cellId:cell.id,tipId:null});
  }

  for(const bud of sim.buds||[]){
    if(!visibleCell(bud.cellId)||bud.length<.05)continue;
    const a=project(bud.start),b=project(bud.end);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=Math.max(.45,(bud.precursor==='lamellipodium'?.35:.12)*pixelsPerUm);
    ctx.strokeStyle=fluorescent?'rgba(228,241,221,.7)':'rgba(40,54,48,.5)';ctx.stroke();
    if(bud.precursor==='lamellipodium'){ctx.beginPath();ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(.4,bud.length*pixelsPerUm*.35),.45*pixelsPerUm,Math.atan2(b.y-a.y,b.x-a.x),0,TAU);ctx.fillStyle=fluorescent?'rgba(227,243,216,.26)':'rgba(230,237,218,.38)';ctx.fill();}
  }

  for(const tip of sim.tips){
    if(!tip.active||!visibleCell(tip.cellId))continue;
    const segment=sim.segments[tip.segmentId];if(!segment?.alive)continue;
    const origin=segment.end,p=project(origin),dir=unit(tip.direction),side=unit(cross(Math.abs(dir[1])<.9?[0,1,0]:[1,0,0],dir));
    const radii=tip.shape?.radii||Array(12).fill(tip.radius);
    const rim=radii.map((r,i)=>{const a=i/radii.length*TAU,q=project(add(origin,add(scale(side,Math.sin(a)*r),scale(dir,Math.cos(a)*r))));return[q.x,q.y];});
    // A thin lamellar sheet has much less phase contrast than the central
    // cytoplasm. A uniform opaque fill makes the cone look like a round bead.
    // These intensities are illustrative; the perimeter remains the solved rim.
    const forward=project(add(origin,scale(dir,tip.radius))),back=project(add(origin,scale(dir,-tip.radius*.6)));
    const coneFill=ctx.createLinearGradient(back.x,back.y,forward.x,forward.y);
    if(fluorescent){coneFill.addColorStop(0,'rgba(214,236,211,.36)');coneFill.addColorStop(.5,'rgba(218,240,213,.42)');coneFill.addColorStop(1,`rgba(233,250,225,${.5+Math.min(.3,(tip.exploration?.pulse||0)*.25)})`);}
    else{coneFill.addColorStop(0,'rgba(38,38,38,.56)');coneFill.addColorStop(.35,'rgba(68,68,68,.36)');coneFill.addColorStop(.75,'rgba(204,204,204,.16)');coneFill.addColorStop(1,'rgba(222,222,222,.10)');}
    outlinePath(ctx,rim);ctx.save();ctx.shadowColor=fluorescent?'rgba(219,245,209,.35)':'rgba(255,255,255,.78)';ctx.shadowBlur=fluorescent?2.5:Math.max(2,.35*pixelsPerUm);ctx.fillStyle=coneFill;ctx.fill();ctx.restore();
    ctx.lineWidth=fluorescent?1:Math.max(.45,.05*pixelsPerUm);ctx.strokeStyle=fluorescent?'rgba(232,247,224,.5)':'rgba(245,245,245,.24)';ctx.stroke();
    for(const probe of tip.filopodia||[]){
      if(probe.length<.08)continue;const a=project(probe.start),b=project(probe.end);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=Math.max(.35,2*probe.radius*pixelsPerUm);
      ctx.save();ctx.shadowColor=fluorescent?'rgba(223,246,213,.3)':'rgba(255,255,255,.65)';ctx.shadowBlur=fluorescent?1.2:Math.max(1,.12*pixelsPerUm);
      ctx.strokeStyle=fluorescent?'rgba(217,241,214,.7)':'rgba(35,35,35,.43)';ctx.stroke();ctx.restore();
    }
    points.push({x:p.x,y:p.y,r:Math.max(6,tip.radius*pixelsPerUm),cellId:tip.cellId,tipId:tip.id});
  }

  // Contact bridges are the saved local adhesion/filopodial links, not new
  // long-range neurites. Puncta colors annotate modeled maturation state.
  for(const contact of sim.contacts||[]){
    if(!contact.candidate||contact.status==='lost'||!visibleCell(contact.sourceCellId)&&!visibleCell(contact.targetCellId))continue;
    const anchors=contactAnchors(sim,contact);if(!anchors)continue;
    const a=project(anchors.p),b=project(anchors.q),color=contact.status==='functional'?'#69b18d':contact.status==='structural'?'#b99752':'#ac8aaf';
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=fluorescent?'rgba(214,231,210,.6)':'rgba(60,60,60,.5)';ctx.lineWidth=Math.max(.35,.16*pixelsPerUm);ctx.stroke();
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(a.x,a.y,Math.max(1,.35*pixelsPerUm),0,TAU);ctx.fill();
  }

  for(const wave of sim.waves||[]){
    if(!visibleCell(wave.cellId))continue;
    const pos=wavePosition(sim,wave);if(!pos)continue;const p=project(pos),r=Math.max(.8,1.4*pixelsPerUm);
    const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*1.5);glow.addColorStop(0,fluorescent?'rgba(244,253,223,.82)':'rgba(61,80,66,.48)');glow.addColorStop(1,'rgba(230,243,220,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*1.5,0,TAU);ctx.fill();
  }

  const label=fluorescent?'Actin-inspired fluorescence':'Phase-contrast-inspired view';
  ctx.font='11px sans-serif';ctx.fillStyle=fluorescent?'#b7c8ba':'#354540';ctx.fillText(label,20,height-23);
  const bar=[1,2,5,10,20,50,100,200,500].filter(x=>x*pixelsPerUm<110).at(-1)||1;
  ctx.strokeStyle=fluorescent?'#e2ecdb':'#273a32';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(width-24-bar*pixelsPerUm,height-35);ctx.lineTo(width-24,height-35);ctx.stroke();ctx.textAlign='right';ctx.fillText(`${bar} µm`,width-24,height-43);ctx.textAlign='left';
  return points;
}
