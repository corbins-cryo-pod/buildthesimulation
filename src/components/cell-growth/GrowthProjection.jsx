import { useEffect, useRef, useState } from 'preact/hooks';

const mix = (a,b,t) => a+(b-a)*t;
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
const unit = p => { const n=Math.hypot(...p)||1;return p.map(v=>v/n); };
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add = (a,b)=>a.map((v,i)=>v+b[i]);
const mul = (a,s)=>a.map(v=>v*s);

/** Orthographic projection of the solved 3D geometry. No optics/PSF claim. */
export default function GrowthProjection({ state, selectedCell, selectedTip, onSelect, isolate, showMembrane, showCytoskeleton, showForces, colorMode, thickness=1, cameraAction }) {
  const canvas = useRef(null), latest = useRef(null), view = useRef({ yaw:0,pitch:Math.PI/2,center:[0,0,0],extent:300 }), draw = useRef(()=>{}), points=useRef([]), drag=useRef(null);
  const [viewName,setViewName]=useState('Orthographic projection');
  latest.current={state,selectedCell,selectedTip,onSelect,isolate,showMembrane,showCytoskeleton,showForces,colorMode,thickness};
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const context=el.getContext('2d');
    draw.current=()=>{
      const d=latest.current,s=d.state,rect=el.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h)return;
      const ratio=Math.min(window.devicePixelRatio||1,2);el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);context.setTransform(ratio,0,0,ratio,0,0);
      const ctx=context;ctx.fillStyle='#151d1a';ctx.fillRect(0,0,w,h);if(!s)return;
      const v=view.current,scale=Math.min(w-50,h-92)/(2*v.extent),cy=Math.cos(v.yaw),sy=Math.sin(v.yaw),cp=Math.cos(v.pitch),sp=Math.sin(v.pitch);
      const project=p=>{const q=p.map((x,i)=>x-v.center[i]),x=q[0]*cy-q[2]*sy,z=q[0]*sy+q[2]*cy;return {x:w/2+x*scale,y:h/2+(z*sp-q[1]*cp)*scale,z:z*cp+q[1]*sp};};
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
      const visible=s.segments.filter(segment=>segment.alive&&(!d.isolate||segment.cellId===d.selectedCell));
      points.current=[];
      for(const segment of visible){
        const a=project(segment.start),b=project(segment.end),selected=segment.cellId===d.selectedCell;
        const depthFade=s.world.planar?1:.5+.5*Math.max(0,Math.min(1,((a.z+b.z)/2-min[1])/(max[1]-min[1]||1)));
        const rgb=d.colorMode==='microtubules'?[Math.round(mix(206,124,segment.mt||0)),Math.round(mix(151,201,segment.mt||0)),Math.round(mix(92,154,segment.mt||0))]:segment.kind==='axon'?[143,216,201]:[227,193,131];
        const alpha=(selected?1:.7)*depthFade,diameter=Math.max(.45,2*segment.radius*scale*d.thickness);
        records.push({z:(a.z+b.z)/2,draw:()=>{
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineCap='round';
          ctx.strokeStyle=`rgba(${rgb.join(',')},${alpha*.13})`;ctx.lineWidth=diameter+2.2;ctx.stroke();
          ctx.strokeStyle=`rgba(${rgb.join(',')},${alpha})`;ctx.lineWidth=diameter;ctx.stroke();
          if(d.showCytoskeleton&&diameter>1.4){ctx.strokeStyle=`rgba(242,228,171,${alpha*.72})`;ctx.lineWidth=Math.max(.3,diameter*.2);ctx.stroke();}
        }});
        if(selected||segment.parentId===-1)points.current.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,cellId:segment.cellId,tipId:null});
      }
      for(const cell of s.cells){
        if(d.isolate&&cell.id!==d.selectedCell)continue;
        const p=project(cell.position),r=cell.radius*scale;
        records.push({z:p.z,draw:()=>{
          if(d.showMembrane){
            const triangles=(cell.membrane?.triangles||[]).map(t=>{const projected=t.map(i=>project(cell.membrane.vertices[i]));return {projected,z:projected.reduce((a,b)=>a+b.z,0)/3};}).sort((a,b)=>a.z-b.z);
            for(const triangle of triangles){const a=triangle.projected;ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.lineTo(a[1].x,a[1].y);ctx.lineTo(a[2].x,a[2].y);ctx.closePath();ctx.fillStyle=cell.id===d.selectedCell?'rgba(211,187,131,.22)':'rgba(166,188,152,.17)';ctx.fill();if(d.showCytoskeleton&&r>8){ctx.strokeStyle='rgba(205,210,162,.16)';ctx.lineWidth=.5;ctx.stroke();}}
          }
          const nucleus=ctx.createRadialGradient(p.x-r*.18,p.y-r*.2,0,p.x,p.y,r*.5);nucleus.addColorStop(0,cell.id===d.selectedCell?'#cfc29a':'#adbd9b');nucleus.addColorStop(1,'#4a6351');ctx.fillStyle=nucleus;ctx.beginPath();ctx.ellipse(p.x,p.y,r*.46,r*.37,-.4,0,Math.PI*2);ctx.fill();
          if(cell.id===d.selectedCell){ctx.beginPath();ctx.arc(p.x,p.y,r*1.3+2,0,2*Math.PI);ctx.strokeStyle='rgba(230,219,171,.8)';ctx.lineWidth=.75;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);ctx.font='10px sans-serif';ctx.fillStyle='#e9e3cd';ctx.fillText(`Cell ${String(cell.id+1).padStart(2,'0')}`,p.x+r+6,p.y-6);}
        }});
        points.current.push({x:p.x,y:p.y,r:Math.max(r,8),cellId:cell.id,tipId:null});
      }
      for(const tip of s.tips){
        if(!tip.active||(d.isolate&&tip.cellId!==d.selectedCell))continue;
        const segment=s.segments[tip.segmentId];if(!segment?.alive)continue;
        const p=project(segment.end),end=project(add(segment.end,tip.direction)),angle=Math.atan2(end.y-p.y,end.x-p.x),r=Math.max(.8,tip.radius*scale*d.thickness),selected=tip.id===d.selectedTip;
        records.push({z:p.z+.1,draw:()=>{
          const color=tip.kind==='axon'?'143,216,201':'227,193,131';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.fillStyle=`rgba(${color},.38)`;ctx.strokeStyle=`rgba(${color},.72)`;ctx.lineWidth=.55;ctx.beginPath();ctx.ellipse(0,0,r*1.6,r*.85,0,0,2*Math.PI);ctx.fill();
          if(r>1.2){for(let i=0;i<7;i++){const a=-1.15+i/6*2.3;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.5,Math.sin(a)*r*.5);ctx.lineTo(Math.cos(a)*r*(2+((tip.id+i*7)%7)/12),Math.sin(a)*r*2.1);ctx.stroke();}}ctx.restore();
          if(selected&&d.showForces){const dir=unit([end.x-p.x,end.y-p.y,0]),drawArrow=(sign,pn,color,offset)=>{if(pn<=1e-12)return;const l=Math.max(6,Math.min(45,pn*.3));const start=[p.x,p.y+offset],finish=[start[0]+dir[0]*l*sign,start[1]+dir[1]*l*sign];ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...finish);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(finish[0]-dir[0]*5*sign-dir[1]*2.5,finish[1]-dir[1]*5*sign+dir[0]*2.5);ctx.lineTo(...finish);ctx.lineTo(finish[0]-dir[0]*5*sign+dir[1]*2.5,finish[1]-dir[1]*5*sign-dir[0]*2.5);ctx.stroke();};drawArrow(1,tip.forces.traction||0,'#b1e5c3',-2);drawArrow(-1,tip.forces.membrane||0,'#e3a087',2);}
        }});points.current.push({x:p.x,y:p.y,r:Math.max(5,r),cellId:tip.cellId,tipId:tip.id});
      }
      records.sort((a,b)=>a.z-b.z).forEach(record=>record.draw());
      for(const contact of s.contacts.filter(c=>c.candidate&&c.status==='candidate'&&(!d.isolate||c.sourceCellId===d.selectedCell||c.targetCellId===d.selectedCell))){const p=project(contact.position);ctx.fillStyle='#e1bde6';ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,2*Math.PI);ctx.fill();}
      if(s.world.cue?.position&&s.config.guidance>0){const p=project(s.world.cue.position);ctx.strokeStyle='rgba(191,157,195,.45)';ctx.lineWidth=.7;for(const radius of [6,12,20]){ctx.beginPath();ctx.arc(p.x,p.y,radius*scale,0,2*Math.PI);ctx.stroke();}ctx.fillStyle='#c2a6c8';ctx.beginPath();ctx.arc(p.x,p.y,1.5,0,2*Math.PI);ctx.fill();}
      const scaleBar=[1,2,5,10,20,50,100,200].filter(n=>n*scale<100).at(-1)||1;
      ctx.strokeStyle='#bccab7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w-25-scaleBar*scale,h-58);ctx.lineTo(w-25,h-58);ctx.stroke();ctx.fillStyle='#b7c6b2';ctx.font='10px sans-serif';ctx.textAlign='right';ctx.fillText(`${scaleBar} µm`,w-25,h-65);ctx.textAlign='left';
    };
    const resize=new ResizeObserver(()=>draw.current());resize.observe(el);draw.current();
    const wheel=event=>{event.preventDefault();view.current.extent=Math.max(10,Math.min(1500,view.current.extent*Math.exp(event.deltaY*.001)));draw.current();};el.addEventListener('wheel',wheel,{passive:false});
    return()=>{resize.disconnect();el.removeEventListener('wheel',wheel);};
  },[]);
  useEffect(()=>draw.current(),[state,selectedCell,selectedTip,isolate,showMembrane,showCytoskeleton,showForces,colorMode,thickness]);
  useEffect(()=>{
    if(!state)return;const action=cameraAction?.type||'fit',v=view.current;
    if(action==='cell'){const c=state.cells.find(c=>c.id===selectedCell);if(c)v.center=[...c.position];const ends=state.segments.filter(s=>s.alive&&s.cellId===selectedCell).map(s=>distance(s.end,v.center));v.extent=Math.max(25,Math.min(160,ends.length?Math.max(...ends)*1.1:30));}
    else if(action==='tip'){const t=state.tips.find(t=>t.id===selectedTip)||state.tips.find(t=>t.cellId===selectedCell&&t.active),s=t&&state.segments[t.segmentId];if(s)v.center=[...s.end];v.extent=18;}
    else {const {min,max}=state.world.bounds;v.center=min.map((n,i)=>(n+max[i])/2);v.extent=Math.max(max[0]-min[0],max[2]-min[2])*.55;v.yaw=0;v.pitch=action==='top'||state.world.planar?Math.PI/2:.68;}
    setViewName(action==='top'||state.world.planar?'Plan projection · x–z':'Volume projection · rotatable');draw.current();
  },[cameraAction,state?.config.mode,state?.config.seed]);
  return <><canvas class="cg-projection" ref={canvas} role="img" aria-label="Measured orthographic projection of the solved neuron geometry. Drag to rotate, shift-drag to pan, scroll to zoom, or click a cell to inspect it."
    onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,shift:e.shiftKey};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const old=drag.current;if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;if(old.shift){const rect=e.currentTarget.getBoundingClientRect(),scale=Math.min(rect.width-50,rect.height-92)/(2*view.current.extent);const yaw=view.current.yaw,pitch=view.current.pitch,right=[Math.cos(yaw),0,-Math.sin(yaw)],down=[Math.sin(yaw)*Math.sin(pitch),-Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];view.current.center=view.current.center.map((value,i)=>value-(dx*right[i]+dy*down[i])/scale);}else{view.current.yaw-=dx*.006;view.current.pitch=Math.max(-1.55,Math.min(1.57,view.current.pitch-dy*.006));setViewName('Volume projection · rotatable');}old.x=e.clientX;old.y=e.clientY;draw.current();}}
    onPointerUp={e=>{const old=drag.current;drag.current=null;if(!old||Math.hypot(e.clientX-old.startX,e.clientY-old.startY)>5)return;const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=points.current.map(p=>({...p,d:Math.hypot(x-p.x,y-p.y)})).filter(p=>p.d<(p.r||7)+3).sort((a,b)=>a.d-b.d)[0];if(hit)onSelect(hit.cellId,hit.tipId);}}
    onPointerCancel={()=>drag.current=null}
  /><span class="cg-projection-label">{viewName}</span></>;
}
