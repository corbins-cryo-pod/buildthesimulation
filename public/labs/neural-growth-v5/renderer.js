import {drawMicroscopy} from './engine/microscopy-render.js';
import {distance} from './engine/geometry.js';
import {contactAnchors} from './engine/connectivity.js';

const COLORS={minor:'#bc9b61',axon:'#72b8a1',dendrite:'#ba99d2'};
export class Microscope {
  constructor(canvas,onSelect){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onSelect=onSelect;this.state=null;this.points=[];
    this.view='phase';this.overlay='none';this.showField=true;this.selectedCell=0;this.selectedTip=null;
    this.center=[0,0,0];this.scale=3;this.yaw=.45;this.pitch=.5;this.autoFit=true;
    this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(canvas);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.scale=Math.max(.3,Math.min(45,this.scale*Math.exp(-e.deltaY*.001)));this.autoFit=false;this.draw();},{passive:false});
    canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,shift:e.shiftKey};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.autoFit=false;
      if(this.view==='structure'&&!this.drag.shift){this.yaw+=dx*.008;this.pitch=Math.max(-1.4,Math.min(1.4,this.pitch+dy*.008));}
      else {this.center[0]-=dx/this.scale;this.center[2]-=dy/this.scale;}
      this.drag.x=e.clientX;this.drag.y=e.clientY;this.draw();});
    canvas.addEventListener('pointerup',e=>{if(!this.drag)return;const d=this.drag;this.drag=null;
      if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<4){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
        const hit=this.points.filter(p=>Math.hypot(p.x-x,p.y-y)<p.r+6).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
        if(hit)this.onSelect(hit.cellId,hit.tipId);
      }});
    canvas.addEventListener('pointercancel',()=>{this.drag=null;});
    canvas.addEventListener('keydown',e=>{const step=15/this.scale;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)){e.preventDefault();this.autoFit=false;if(e.key==='ArrowLeft')this.center[0]-=step;if(e.key==='ArrowRight')this.center[0]+=step;if(e.key==='ArrowUp')this.center[2]-=step;if(e.key==='ArrowDown')this.center[2]+=step;if(['+','='].includes(e.key))this.scale=Math.min(45,this.scale*1.2);if(e.key==='-')this.scale=Math.max(.3,this.scale/1.2);if(e.key==='0')this.fit();this.draw();}});
  }
  coordinates(p){const q=p.map((x,i)=>x-this.center[i]);if(this.view!=='structure')return[q[0],q[2],q[1]];const x=q[0]*Math.cos(this.yaw)-q[2]*Math.sin(this.yaw),z=q[0]*Math.sin(this.yaw)+q[2]*Math.cos(this.yaw);return[x,z*Math.cos(this.pitch)-q[1]*Math.sin(this.pitch),z*Math.sin(this.pitch)+q[1]*Math.cos(this.pitch)];}
  project=(p)=>{const q=this.coordinates(p);return {x:this.width/2+q[0]*this.scale,y:this.height/2+q[1]*this.scale,z:q[2]};};
  fit(){
    if(!this.state)return;this.autoFit=true;
    const sim=this.state,positions=sim.cells.flatMap(c=>c.membrane.vertices).concat(sim.segments.filter(s=>s.alive).map(s=>s.end));
    if(['repair','interface','pattern'].includes(sim.config.mode))for(const p of [sim.world.bounds.min,sim.world.bounds.max])positions.push(p);
    const min=[0,1,2].map(i=>Math.min(...positions.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...positions.map(p=>p[i])));
    this.center=min.map((v,i)=>(v+max[i])/2);
    const q=positions.map(p=>this.coordinates(p));const sx=Math.max(70,Math.max(...q.map(p=>p[0]))-Math.min(...q.map(p=>p[0]))),sy=Math.max(65,Math.max(...q.map(p=>p[1]))-Math.min(...q.map(p=>p[1])));
    this.scale=Math.max(.3,Math.min(7,(this.width-80)/sx,(this.height-90)/sy));
  }
  setState(state){this.state=state;if(this.autoFit)this.fit();this.draw();}
  line(a,b,color,width=1){const c=this.ctx,p=this.project(a),q=this.project(b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  draw(){
    const c=this.ctx,dpr=Math.min(devicePixelRatio||1,2),r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;
    if(this.canvas.width!==Math.round(r.width*dpr)||this.canvas.height!==Math.round(r.height*dpr)){this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);if(this.autoFit)this.fit();}
    c.setTransform(dpr,0,0,dpr,0,0);if(!this.state)return;const sim=this.state;
    if(this.view==='structure')this.drawStructure();
    else this.points=drawMicroscopy(c,sim,{inspectionMode:this.view==='phase'?'phase':'fluorescence',thickness:1,selectedCell:this.selectedCell,isolate:false},this.project,this.scale,this.width,this.height);
    if(this.showField)this.drawTissue();
    if(this.overlay!=='none')this.drawOverlay();
    const tip=sim.tips[this.selectedTip],cell=sim.cells[this.selectedCell],pos=tip?.active?sim.segments[tip.segmentId].end:cell?.position;
    if(pos){const p=this.project(pos),r=(tip?.active?tip.radius:cell.radius)*this.scale+6;c.strokeStyle=this.view==='phase'?'#4a6256':'#e0d2a6';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.arc(p.x,p.y,Math.max(8,r),0,Math.PI*2);c.stroke();c.setLineDash([]);}
  }
  drawStructure(){
    const c=this.ctx,sim=this.state;c.fillStyle='#141d20';c.fillRect(0,0,this.width,this.height);this.points=[];c.lineCap='round';
    // Orthographic projection of the saved 3-D graph and soma surface.
    for(const o of sim.world.obstacles){if(o.shape!=='box')continue;const corners=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(o.position.map((v,i)=>v+[x,y,z][i]*o.size[i]/2));for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if([1,2,4].includes(i^j))this.line(corners[i],corners[j],'#63817e70');}
    for(const s of sim.segments.filter(s=>s.alive).sort((a,b)=>this.project(a.end).z-this.project(b.end).z)){this.line(s.start,s.end,COLORS[s.kind],Math.max(.6,2*s.radius*this.scale));const p=this.project(s.end);this.points.push({...p,r:4,cellId:s.cellId,tipId:null});}
    for(const cell of sim.cells){const m=cell.membrane;for(const face of m.triangles){const p=face.map(i=>this.project(m.vertices[i]));c.beginPath();c.moveTo(p[0].x,p[0].y);c.lineTo(p[1].x,p[1].y);c.lineTo(p[2].x,p[2].y);c.closePath();c.fillStyle='#adcab91c';c.fill();c.strokeStyle='#b4ccb236';c.lineWidth=.45;c.stroke();}this.points.push({...this.project(cell.position),r:Math.max(8,cell.radius*this.scale),cellId:cell.id,tipId:null});}
    for(const tip of sim.tips.filter(t=>t.active)){const p=this.project(sim.segments[tip.segmentId].end);c.fillStyle=COLORS[tip.kind];c.beginPath();c.arc(p.x,p.y,Math.max(2,tip.radius*this.scale*.6),0,Math.PI*2);c.fill();for(const probe of tip.filopodia||[])this.line(probe.start,probe.end,'#bbc5a17c',.6);this.points.push({...p,r:6,cellId:tip.cellId,tipId:tip.id});}
    const origin=this.project(this.center),axis=[['X',[18,0,0],'#bd9c68'],['Y',[0,18,0],'#78b6ad'],['Z',[0,0,18],'#a594c4']];c.font='9px sans-serif';
    for(const [label,dir,color] of axis){const b=this.project(this.center.map((v,i)=>v+dir[i]));const x=33+(b.x-origin.x)/this.scale*1.1,y=this.height-43+(b.y-origin.y)/this.scale*1.1;c.strokeStyle=color;c.beginPath();c.moveTo(33,this.height-43);c.lineTo(x,y);c.stroke();c.fillStyle=color;c.fillText(label,x+3,y);}
    const bar=[1,2,5,10,20,50,100,200,500].filter(x=>x*this.scale<110).at(-1)||1;c.strokeStyle='#e1e6da';c.beginPath();c.moveTo(this.width-24-bar*this.scale,this.height-35);c.lineTo(this.width-24,this.height-35);c.stroke();c.textAlign='right';c.fillStyle='#c5d0c4';c.fillText(`${bar} µm`,this.width-24,this.height-43);c.textAlign='left';
  }
  drawTissue(){
    const c=this.ctx,t=this.state.tissue,f=t.field;
    if(f){const max=Math.max(...f.values,1e-6),[nx,ny,nz]=f.shape,y=Math.max(0,Math.min(ny-1,Math.floor(-f.origin[1]/f.h)));
      // A single y≈0 slice, explicitly labelled; never a volumetric measurement.
      for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const value=f.values[(z*ny+y)*nx+x]/max;if(value<.01)continue;const at=[f.origin[0]+x*f.h,f.origin[1]+(y+.5)*f.h,f.origin[2]+z*f.h],a=this.project(at),b=this.project([at[0]+f.h,at[1],at[2]]),d=this.project([at[0],at[1],at[2]+f.h]),e=this.project([at[0]+f.h,at[1],at[2]+f.h]);c.fillStyle=`rgba(207,177,93,${Math.sqrt(value)*.19})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(e.x,e.y);c.lineTo(d.x,d.y);c.closePath();c.fill();}
      c.fillStyle=this.view==='phase'?'#35483e':'#d3c7a0';c.font='9px sans-serif';c.fillText(`Cue slice y ≈ 0 · relative max ${max.toFixed(3)}`,16,53);
    }
    for(const a of t.agents){const p=this.project(a.position);c.fillStyle=this.view==='phase'?'#416f63':'#77b9a3';c.save();c.translate(p.x,p.y);c.rotate(a.side<0?-.4:.4);c.beginPath();c.ellipse(0,0,4*this.scale,1.6*this.scale,0,0,Math.PI*2);c.fill();c.restore();}
  }
  drawOverlay(){
    const c=this.ctx,sim=this.state;
    for(const s of sim.segments){if(!s.alive)continue;let color;
      if(this.overlay==='identity')color=COLORS[s.kind];
      else if(this.overlay==='excitation'){const a=s.excitation?.a||0;if(a<.02)continue;color=`rgba(244,198,71,${Math.min(1,a)})`;}
      else if(this.overlay==='microtubules')color=`rgba(88,192,198,${.12+.85*s.mt})`;
      else if(this.overlay==='tension'){const strain=(distance(s.start,s.end)/(s.material?.restLength||1))-1;color=strain>0?`rgba(210,95,69,${Math.min(.9,.15+strain)})`:`rgba(85,168,187,${Math.min(.9,.15-strain)})`;}
      if(color)this.line(s.start,s.end,color,Math.max(1,2*s.radius*this.scale));
    }
    if(this.overlay==='cargo')for(const cell of sim.cells)for(const parcel of cell.cargo.parcels){const s=sim.segments[parcel.path[parcel.index]];if(!s?.alive)continue;const q=Math.min(1,parcel.offset/Math.max(.00001,distance(s.start,s.end))),p=this.project(s.start.map((v,i)=>v+(s.end[i]-v)*q));c.fillStyle=this.view==='phase'?'#435b90':'#a5c9fb';c.beginPath();c.arc(p.x,p.y,Math.max(1,Math.min(3,parcel.amount*this.scale)),0,Math.PI*2);c.fill();}
    if(this.overlay==='contacts')for(const contact of sim.contacts){if(contact.status==='lost')continue;const anchors=contactAnchors(sim,contact);if(!anchors)continue;const color=contact.status==='functional'?'#529d81':contact.status==='structural'?'#a77f36':'#9d73b8';this.line(anchors.p,anchors.q,color,2);const p=this.project(anchors.p);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.stroke();}
  }
}

export function plot(canvas,series,{xLabel='Time (h)',yLabel='Length (µm)',minY=0,maxX}={}){
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*ratio);canvas.height=Math.round(r.height*ratio);const c=canvas.getContext('2d');c.scale(ratio,ratio);const w=r.width,h=r.height,left=42,right=12,top=20,bottom=25;
  const all=series.flatMap(s=>s.points),xMax=maxX??Math.max(1,...all.map(p=>p[0])),xMin=0,yMin=minY===null?Math.min(...all.map(p=>p[1]),-65):minY,yMax=Math.max(yMin+1,...all.map(p=>p[1]));const X=x=>left+(x-xMin)/(xMax-xMin)*(w-left-right),Y=y=>h-bottom-(y-yMin)/(yMax-yMin)*(h-top-bottom);
  c.font='9px sans-serif';c.fillStyle='#696b62';c.fillText(yLabel,left,10);c.fillText(xLabel,w-62,h-3);
  for(let i=0;i<3;i++){const y=yMin+(yMax-yMin)*i/2;c.strokeStyle='#d9d2c2';c.lineWidth=.6;c.beginPath();c.moveTo(left,Y(y));c.lineTo(w-right,Y(y));c.stroke();c.textAlign='right';c.fillText(Math.abs(y)>100?Math.round(y):y.toFixed(1),left-6,Y(y)+3);}
  for(let i=0;i<5;i++){const x=xMax*i/4;c.textAlign='center';c.fillText(xMax>10?x.toFixed(0):x.toFixed(1),X(x),h-bottom+13);}c.textAlign='left';
  c.save();c.beginPath();c.rect(left,top,w-left-right,h-top-bottom);c.clip();
  for(const s of series){c.strokeStyle=s.color;c.lineWidth=1.5;c.setLineDash(s.dashed?[4,3]:[]);c.beginPath();s.points.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.stroke();if(s.points.length===1){c.beginPath();c.arc(X(s.points[0][0]),Y(s.points[0][1]),2,0,Math.PI*2);c.fillStyle=s.color;c.fill();}}c.restore();c.setLineDash([]);
}
