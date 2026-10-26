import { useEffect, useRef, useState } from 'preact/hooks';
import { coneSurface, VIEW_MODES } from '../../lib/cell-growth/render-geometry.js';
import { interpolateMorphology } from '../../lib/cell-growth/presentation.js';
import { drawMicroscopy } from '../../lib/cell-growth/microscopy-render.js';
import { shaftProfile, wavePosition } from '../../lib/cell-growth/morphogenesis.js';
const hex=n=>`#${n.toString(16).padStart(6,'0')}`;
const rgb=n=>[(n>>16)&255,(n>>8)&255,n&255];

const mix = (a,b,t) => a+(b-a)*t;
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
const unit = p => { const n=Math.hypot(...p)||1;return p.map(v=>v/n); };
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add = (a,b)=>a.map((v,i)=>v+b[i]);
const mul = (a,s)=>a.map(v=>v*s);

/** Orthographic projection of the solved 3D geometry. No optics/PSF claim. */
export default function GrowthProjection({ state, selectedCell, selectedTip, onSelect, isolate, showMembrane, showCytoskeleton, showForces, colorMode, thickness=1, cameraAction, inspectionMode='structural',showTrails=true,animating=false,frameDuration=140 }) {
  const canvas = useRef(null), latest = useRef(null), view = useRef({ yaw:0,pitch:Math.PI/2,center:[0,0,0],extent:300 }), draw = useRef(()=>{}), points=useRef([]), drag=useRef(null);
  const transition=useRef(null),previousFrame=useRef(null),animation=useRef(0);
  const [viewName,setViewName]=useState('Orthographic projection');
  latest.current={state,selectedCell,selectedTip,onSelect,isolate,showMembrane,showCytoskeleton,showForces,colorMode,thickness,inspectionMode,showTrails,animating};
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const context=el.getContext('2d');
    draw.current=()=>{
      const d=latest.current,tr=transition.current;
      const amount=tr?Math.min(1,(performance.now()-tr.started)/tr.duration):1;
      const s=tr&&d.animating?interpolateMorphology(tr.from,d.state,amount):d.state,rect=el.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h)return;
      const ratio=Math.min(window.devicePixelRatio||1,2);if(el.width!==Math.round(w*ratio)||el.height!==Math.round(h*ratio)){el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);}context.setTransform(ratio,0,0,ratio,0,0);
      const ctx=context,theme=VIEW_MODES[d.inspectionMode]||VIEW_MODES.structural;ctx.fillStyle=hex(theme.background);ctx.fillRect(0,0,w,h);if(!s)return;
      const v=view.current;
      if(v.followTip){
        const tip=s.tips.find(t=>t.id===d.selectedTip)||s.tips.find(t=>t.cellId===d.selectedCell&&t.active),segment=tip&&s.segments[tip.segmentId];
        if(segment?.alive)v.center=[...segment.end];
      }
      const scale=Math.min(w-50,h-92)/(2*v.extent),cy=Math.cos(v.yaw),sy=Math.sin(v.yaw),cp=Math.cos(v.pitch),sp=Math.sin(v.pitch);
      const project=p=>{const q=p.map((x,i)=>x-v.center[i]),x=q[0]*cy-q[2]*sy,z=q[0]*sy+q[2]*cy;return {x:w/2+x*scale,y:h/2+(z*sp-q[1]*cp)*scale,z:z*cp+q[1]*sp};};
      if(d.inspectionMode==='brightfield'||d.inspectionMode==='fluorescence'){
        points.current=drawMicroscopy(ctx,s,d,project,scale,w,h);return;
      }
      const path=(vertices,close=false)=>{ctx.beginPath();vertices.forEach((p,i)=>{const a=project(p);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);});if(close)ctx.closePath();};
      const min=s.world.bounds.min,max=s.world.bounds.max;
      const gridStep=50;
      ctx.strokeStyle='rgba(119,151,127,.1)';ctx.lineWidth=.6;
      for(let x=Math.ceil(min[0]/gridStep)*gridStep;x<=max[0];x+=gridStep){path([[x,min[1],min[2]],[x,min[1],max[2]]]);ctx.stroke();}
      for(let z=Math.ceil(min[2]/gridStep)*gridStep;z<=max[2];z+=gridStep){path([[min[0],min[1],z],[max[0],min[1],z]]);ctx.stroke();}
      if(s.world.sphereRadius){
        const p=project([0,0,0]),r=s.world.sphereRadius*scale;ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.strokeStyle='rgba(149,175,153,.32)';ctx.stroke();
        const fog=ctx.createRadialGradient(p.x,p.y,r*.1,p.x,p.y,r);fog.addColorStop(0,'rgba(124,144,118,.06)');fog.addColorStop(1,'rgba(80,119,88,.04)');ctx.fillStyle=fog;ctx.fill();
      }else {path([[min[0],0,min[2]],[max[0],0,min[2]],[max[0],0,max[2]],[min[0],0,max[2]]],true);ctx.strokeStyle='rgba(154,172,146,.3)';ctx.stroke();}
      const records=[];
      for(const obstacle of s.world.obstacles){
        if(obstacle.shape==='sphere')records.push({z:project(obstacle.position).z,draw:()=>{const p=project(obstacle.position),r=obstacle.radius*scale;const g=ctx.createRadialGradient(p.x-r*.2,p.y-r*.3,0,p.x,p.y,r);g.addColorStop(0,'rgba(103,121,107,.38)');g.addColorStop(1,'rgba(60,80,65,.22)');ctx.fillStyle=g;ctx.strokeStyle='rgba(146,165,143,.54)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(p.x,p.y,r,0,2*Math.PI);ctx.fill();ctx.stroke();}});
        else {
          const vertices=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])vertices.push(add(obstacle.position,[x*obstacle.size[0],y*obstacle.size[1],z*obstacle.size[2]]));
          for(const face of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])records.push({z:face.reduce((sum,i)=>sum+project(vertices[i]).z,0)/4,draw:()=>{path(face.map(i=>vertices[i]),true);ctx.fillStyle=s.config.mode==='biohybrid'?'rgba(155,133,83,.2)':'rgba(104,119,99,.17)';ctx.strokeStyle=s.config.mode==='biohybrid'?'rgba(198,168,104,.65)':'rgba(155,175,148,.38)';ctx.lineWidth=.7;ctx.fill();ctx.stroke();}});
        }
      }
      const visible=s.segments.filter(segment=>segment.alive&&(!d.isolate||segment.cellId===d.selectedCell)),profiles=shaftProfile(s);
      points.current=[];
      for(const segment of visible){
        const a=project(segment.start),b=project(segment.end),selected=segment.cellId===d.selectedCell;
        const depthFade=s.world.planar?1:.5+.5*Math.max(0,Math.min(1,((a.z+b.z)/2-min[1])/(max[1]-min[1]||1)));
        const shaftRgb=d.inspectionMode==='brightfield'?[98,128,111]:d.colorMode==='microtubules'?[Math.round(mix(206,124,segment.mt||0)),Math.round(mix(151,201,segment.mt||0)),Math.round(mix(92,154,segment.mt||0))]:segment.kind==='axon'?[143,216,201]:[227,193,131];
        const shape=profiles.get(segment.id),alpha=(selected?1:.7)*depthFade,diameter=Math.max(.35,(d.inspectionMode==='mechanics'?2*segment.radius:shape.r0+shape.r1)*scale*d.thickness);
        records.push({z:(a.z+b.z)/2,draw:()=>{
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineCap='round';
          ctx.strokeStyle=`rgba(${shaftRgb.join(',')},${alpha*.13})`;ctx.lineWidth=diameter+2.2;ctx.stroke();
          ctx.strokeStyle=`rgba(${shaftRgb.join(',')},${alpha})`;ctx.lineWidth=diameter;ctx.stroke();
          if(d.showCytoskeleton&&diameter>1.4){ctx.strokeStyle=`rgba(242,228,171,${alpha*.72})`;ctx.lineWidth=Math.max(.3,diameter*.2);ctx.stroke();}
        }});
        if(selected||segment.parentId===-1)points.current.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,cellId:segment.cellId,tipId:null});
      }
      for(const cell of s.cells){
        if(d.isolate&&cell.id!==d.selectedCell)continue;
        const p=project(cell.position),r=(cell.mechanics?.collisionRadius||cell.radius)*scale,selected=cell.id===d.selectedCell;
        if(d.showTrails&&cell.mechanics?.trail.length>1){path(cell.mechanics.trail.map(q=>q.position));ctx.strokeStyle=d.inspectionMode==='brightfield'?'rgba(70,95,83,.4)':'rgba(135,174,159,.4)';ctx.lineWidth=1;ctx.stroke();}
        records.push({z:p.z,draw:()=>{
          const m=cell.membrane,base=rgb(theme.membrane),act=rgb(theme.actin);
          const triangles=m.triangles.map(t=>{const verts=t.map(i=>m.vertices[i]),projected=verts.map(project),a=verts[0],b=verts[1],c=verts[2],normal=unit(cross(b.map((x,k)=>x-a[k]),c.map((x,k)=>x-a[k]))),light=.4+.6*Math.max(0,normal[0]*.35+normal[1]*.8+normal[2]*.48),activity=t.reduce((sum,i)=>sum+m.actin[i],0)/3;
            return {t,projected,light,activity,z:projected.reduce((a,b)=>a+b.z,0)/3};}).sort((a,b)=>a.z-b.z);
          const paint=triangle=>{const a=triangle.projected;ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.lineTo(a[1].x,a[1].y);ctx.lineTo(a[2].x,a[2].y);ctx.closePath();
            const amt=d.inspectionMode==='fluorescence'?triangle.activity*.7:triangle.activity*.13;
            const color=base.map((x,k)=>Math.round(mix(x,act[k],amt)*(.6+.4*triangle.light)));
            if(d.inspectionMode==='mechanics'){const force=triangle.t.reduce((sum,i)=>sum+Math.hypot(...(m.forces?.[i]||[0,0,0])),0)/3,q=Math.min(1,force/35);color[0]=Math.round(110+125*q);color[1]=Math.round(190-70*q);color[2]=Math.round(194-100*q);}
            ctx.fillStyle=`rgba(${color.join(',')},${d.showMembrane?(d.inspectionMode==='fluorescence'?.2:d.inspectionMode==='mechanics'?.6:.34):.04})`;ctx.fill();
            if(d.inspectionMode==='mechanics'&&selected){ctx.strokeStyle='rgba(213,204,175,.22)';ctx.lineWidth=.5;ctx.stroke();}
          };
          triangles.filter(t=>t.z<p.z).forEach(paint);
          const np=project(cell.nucleus?.position||cell.position),nr=(cell.nucleus?.radius||cell.radius*.38)*scale;
          const nucleus=ctx.createRadialGradient(np.x-nr*.3,np.y-nr*.35,0,np.x,np.y,nr);nucleus.addColorStop(0,hex(theme.nucleus));nucleus.addColorStop(.65,hex(theme.nucleus));nucleus.addColorStop(1,d.inspectionMode==='brightfield'?'#535e65':'#293742');ctx.fillStyle=nucleus;ctx.beginPath();ctx.arc(np.x,np.y,nr,0,Math.PI*2);ctx.fill();ctx.strokeStyle=d.inspectionMode==='fluorescence'?'rgba(123,156,255,.8)':'rgba(160,184,193,.5)';ctx.lineWidth=.8;ctx.stroke();
          if(d.showCytoskeleton&&selected){for(let i=0;i<m.vertices.length;i+=7){const a=cell.nucleus.position,b=m.vertices[i],fraction=m.mt[i];path([a,a.map((v,k)=>v+(b[k]-v)*(.55+.35*fraction))]);ctx.strokeStyle=`rgba(${rgb(theme.core).join(',')},${.18+.3*fraction})`;ctx.lineWidth=.65;ctx.stroke();}}
          triangles.filter(t=>t.z>=p.z).forEach(paint);
          if(d.inspectionMode==='mechanics'){ctx.fillStyle='#ee9079';for(const i of m.contactVertices||[]){const q=project(m.vertices[i]);ctx.beginPath();ctx.arc(q.x,q.y,2,0,Math.PI*2);ctx.fill();}}
          if(selected){ctx.beginPath();ctx.arc(p.x,p.y,r+3,0,2*Math.PI);ctx.strokeStyle=d.inspectionMode==='brightfield'?'rgba(60,84,71,.65)':'rgba(230,219,171,.55)';ctx.lineWidth=.75;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);ctx.font='10px sans-serif';ctx.fillStyle=d.inspectionMode==='brightfield'?'#354e40':'#e9e3cd';ctx.fillText(`Cell ${String(cell.id+1).padStart(2,'0')}`,p.x+r+6,p.y-6);}
          if(selected&&(d.showForces||d.inspectionMode==='mechanics')){const f=cell.mechanics.traction,mag=Math.hypot(...f);if(mag>1e-8){const q=project(add(cell.position,mul(f,Math.min(18,mag*.015)/mag)));ctx.strokeStyle='#89cfb2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,2.5,0,Math.PI*2);ctx.fillStyle='#89cfb2';ctx.fill();}}
        }});
        points.current.push({x:p.x,y:p.y,r:Math.max(r,8),cellId:cell.id,tipId:null});
      }
      for(const tip of s.tips){
        if(!tip.active||(d.isolate&&tip.cellId!==d.selectedCell))continue;
        const segment=s.segments[tip.segmentId];if(!segment?.alive)continue;
        const p=project(segment.end),end=project(add(segment.end,tip.direction)),angle=Math.atan2(end.y-p.y,end.x-p.x),r=Math.max(.8,tip.radius*scale*d.thickness),selected=tip.id===d.selectedTip;
        records.push({z:p.z+.1,draw:()=>{
          const color=d.inspectionMode==='brightfield'?'103,137,115':tip.kind==='axon'?'143,216,201':'227,193,131',shape=coneSurface(tip),z=unit(tip.direction),x=unit(cross(Math.abs(z[1])<.9?[0,1,0]:[1,0,0],z)),y=cross(z,x);
          const vertices=shape.vertices.map(q=>add(segment.end,add(mul(x,q[0]*d.thickness),add(mul(y,q[1]*d.thickness),mul(z,q[2]*d.thickness)))));
          for(const f of shape.triangles){path(f.map(i=>vertices[i]),true);ctx.fillStyle=`rgba(${color},.3)`;ctx.fill();}
          for(const probe of tip.filopodia||[]){if(probe.length<.02)continue;path([probe.start,probe.end]);ctx.strokeStyle=probe.blocked?'#ea9f86':hex(theme.actin);ctx.lineWidth=Math.max(.5,2*probe.radius*scale*d.thickness);ctx.lineCap='round';ctx.stroke();}
          if(selected&&d.showForces){const dir=unit([end.x-p.x,end.y-p.y,0]),drawArrow=(sign,pn,color,offset)=>{if(pn<=1e-12)return;const l=Math.max(6,Math.min(45,pn*.3));const start=[p.x,p.y+offset],finish=[start[0]+dir[0]*l*sign,start[1]+dir[1]*l*sign];ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...finish);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(finish[0]-dir[0]*5*sign-dir[1]*2.5,finish[1]-dir[1]*5*sign+dir[0]*2.5);ctx.lineTo(...finish);ctx.lineTo(finish[0]-dir[0]*5*sign+dir[1]*2.5,finish[1]-dir[1]*5*sign-dir[0]*2.5);ctx.stroke();};drawArrow(1,tip.forces.traction||0,'#b1e5c3',-2);drawArrow(-1,tip.forces.membrane||0,'#e3a087',2);}
        }});points.current.push({x:p.x,y:p.y,r:Math.max(5,r),cellId:tip.cellId,tipId:tip.id});
      }
      for(const bud of s.buds||[]){
        if(bud.length<.02||d.isolate&&bud.cellId!==d.selectedCell)continue;
        const p=project(bud.end);records.push({z:p.z,draw:()=>{path([bud.start,bud.end]);ctx.strokeStyle=hex(theme.actin);ctx.lineWidth=Math.max(.5,(bud.precursor==='lamellipodium'?.5:.16)*scale*d.thickness);ctx.stroke();}});
      }
      if(d.showCytoskeleton)for(const wave of s.waves||[]){
        if(d.isolate&&wave.cellId!==d.selectedCell)continue;const pos=wavePosition(s,wave);if(!pos)continue;const p=project(pos);
        records.push({z:p.z+.2,draw:()=>{ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,.8*scale),0,Math.PI*2);ctx.fillStyle=hex(theme.actin);ctx.fill();}});
      }
      records.sort((a,b)=>a.z-b.z).forEach(record=>record.draw());
      for(const contact of s.contacts.filter(c=>c.candidate&&c.status==='candidate'&&(!d.isolate||c.sourceCellId===d.selectedCell||c.targetCellId===d.selectedCell))){const p=project(contact.position);ctx.fillStyle='#e1bde6';ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,2*Math.PI);ctx.fill();}
      if(s.world.cue?.position&&s.config.guidance>0){const p=project(s.world.cue.position);ctx.strokeStyle='rgba(191,157,195,.45)';ctx.lineWidth=.7;for(const radius of [6,12,20]){ctx.beginPath();ctx.arc(p.x,p.y,radius*scale,0,2*Math.PI);ctx.stroke();}ctx.fillStyle='#c2a6c8';ctx.beginPath();ctx.arc(p.x,p.y,1.5,0,2*Math.PI);ctx.fill();}
      const scaleBar=[1,2,5,10,20,50,100,200].filter(n=>n*scale<100).at(-1)||1;
      ctx.strokeStyle=d.inspectionMode==='brightfield'?'#405849':'#bccab7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w-25-scaleBar*scale,h-58);ctx.lineTo(w-25,h-58);ctx.stroke();ctx.fillStyle=d.inspectionMode==='brightfield'?'#405849':'#b7c6b2';ctx.font='10px sans-serif';ctx.textAlign='right';ctx.fillText(`${scaleBar} µm`,w-25,h-65);ctx.textAlign='left';
    };
    const resize=new ResizeObserver(()=>draw.current());resize.observe(el);draw.current();
    const wheel=event=>{event.preventDefault();view.current.extent=Math.max(10,Math.min(1500,view.current.extent*Math.exp(event.deltaY*.001)));draw.current();};el.addEventListener('wheel',wheel,{passive:false});
    return()=>{resize.disconnect();el.removeEventListener('wheel',wheel);cancelAnimationFrame(animation.current);};
  },[]);
  useEffect(()=>{
    const before=previousFrame.current;cancelAnimationFrame(animation.current);
    if(animating&&before&&state&&state.timeHours>before.timeHours&&state.config.seed===before.config.seed&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      transition.current={from:before,started:performance.now(),duration:frameDuration};
      const frame=()=>{draw.current();if(performance.now()-transition.current.started<transition.current.duration)animation.current=requestAnimationFrame(frame);};
      animation.current=requestAnimationFrame(frame);
    }else transition.current=null;
    previousFrame.current=state;draw.current();
  },[state,animating,frameDuration]);
  useEffect(()=>draw.current(),[selectedCell,selectedTip,isolate,showMembrane,showCytoskeleton,showForces,colorMode,thickness,inspectionMode,showTrails]);
  useEffect(()=>{
    if(!state)return;const action=cameraAction?.type||'fit',v=view.current;v.followTip=action==='tip';
    if(action==='cell'){
      const c=state.cells.find(c=>c.id===selectedCell),points=[...(c?[c.position]:[]),...state.segments.filter(s=>s.alive&&s.cellId===selectedCell).map(s=>s.end)];
      if(points.length){const lo=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));v.center=lo.map((x,k)=>(x+hi[k])/2);v.extent=Math.max(35,...points.map(p=>distance(p,v.center)*1.12));}
    }
    else if(action==='tip'){const t=state.tips.find(t=>t.id===selectedTip)||state.tips.find(t=>t.cellId===selectedCell&&t.active),s=t&&state.segments[t.segmentId];if(s)v.center=[...s.end];v.extent=18;}
    else {const {min,max}=state.world.bounds;v.center=min.map((n,i)=>(n+max[i])/2);const all=[...state.cells.map(c=>c.position),...state.segments.filter(s=>s.alive).map(s=>s.end)];const lo=[0,1,2].map(k=>Math.min(...all.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...all.map(p=>p[k])));v.center=lo.map((x,k)=>(x+hi[k])/2);v.extent=Math.max(35,Math.max(...hi.map((x,k)=>x-lo[k]))*.6+15);v.yaw=0;v.pitch=action==='top'||state.world.planar?Math.PI/2:.68;}
    setViewName(action==='tip'?'Following selected growth cone':action==='top'||state.world.planar?'Plan projection · x–z':'Volume projection · rotatable');draw.current();
  },[cameraAction,state?.config.mode,state?.config.seed]);
  return <><canvas class="cg-projection" ref={canvas} role="img" aria-label="Measured orthographic projection of the solved neuron geometry. Drag to rotate, shift-drag to pan, scroll to zoom, or click a cell to inspect it."
    onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,shift:e.shiftKey};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const old=drag.current;if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;if(old.shift){view.current.followTip=false;setViewName('Manual framing');const rect=e.currentTarget.getBoundingClientRect(),scale=Math.min(rect.width-50,rect.height-92)/(2*view.current.extent);const yaw=view.current.yaw,pitch=view.current.pitch,right=[Math.cos(yaw),0,-Math.sin(yaw)],down=[Math.sin(yaw)*Math.sin(pitch),-Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];view.current.center=view.current.center.map((value,i)=>value-(dx*right[i]+dy*down[i])/scale);}else{view.current.yaw-=dx*.006;view.current.pitch=Math.max(-1.55,Math.min(1.57,view.current.pitch-dy*.006));setViewName('Volume projection · rotatable');}old.x=e.clientX;old.y=e.clientY;draw.current();}}
    onPointerUp={e=>{const old=drag.current;drag.current=null;if(!old||Math.hypot(e.clientX-old.startX,e.clientY-old.startY)>5)return;const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=points.current.map(p=>({...p,d:Math.hypot(x-p.x,y-p.y)})).filter(p=>p.d<(p.r||7)+3).sort((a,b)=>a.d-b.d)[0];if(hit)onSelect(hit.cellId,hit.tipId);}}
    onPointerCancel={()=>drag.current=null}
  /><span class="cg-projection-label">{viewName}</span></>;
}
