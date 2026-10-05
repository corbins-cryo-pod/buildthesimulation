import { contactBounds, LAYER_COLORS } from './model.js';
export function drawContact(ctx,c,expand=0) {
  const w=c.w+expand*2,h=(c.shape==='square'?c.w:c.h)+expand*2;
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.rotation*Math.PI/180);ctx.beginPath();
  if(c.shape==='circle'||c.shape==='ring') {
    ctx.arc(0,0,w/2,0,Math.PI*2);
    if(c.shape==='ring'&&c.inner>expand*2){ctx.moveTo((c.inner-expand*2)/2,0);ctx.arc(0,0,(c.inner-expand*2)/2,0,Math.PI*2,true);}
  } else if(c.shape==='ellipse')ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
  else ctx.rect(-w/2,-h/2,w,h);
  ctx.fill('evenodd');ctx.restore();
}
export function renderCanvas(canvas,doc,result,selection,view,options,dragBox) {
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(rect.width*ratio)||canvas.height!==Math.round(rect.height*ratio)){canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);}
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#101d24';ctx.fillRect(0,0,rect.width,rect.height);
  const scale=view.scale,ox=rect.width/2+view.x,oy=rect.height/2+view.y,px=x=>x*scale+ox,py=y=>y*scale+oy;
  const minX=-ox/scale,maxX=(rect.width-ox)/scale,minY=-oy/scale,maxY=(rect.height-oy)/scale;
  const grid=options.grid;
  if(options.showGrid&&grid>0){let gap=grid;while(gap*scale<14)gap*=5;ctx.strokeStyle='#29404b';ctx.lineWidth=.5;ctx.beginPath();
    for(let x=Math.ceil(minX/gap)*gap;x<=maxX;x+=gap){ctx.moveTo(px(x),0);ctx.lineTo(px(x),rect.height);}for(let y=Math.ceil(minY/gap)*gap;y<=maxY;y+=gap){ctx.moveTo(0,py(y));ctx.lineTo(rect.width,py(y));}ctx.stroke();}
  ctx.strokeStyle='#45616c';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(px(0),0);ctx.lineTo(px(0),rect.height);ctx.moveTo(0,py(0));ctx.lineTo(rect.width,py(0));ctx.stroke();
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  const visibleLayer=Number(options.layer), show=l=>!visibleLayer||visibleLayer===l;
  if(options.showSubstrate&&result?.checks?.bounds){const b=result.checks.bounds,r=doc.routing;ctx.fillStyle='#28434a';
    if(r.substrateStyle==='envelope'){ctx.beginPath();ctx.roundRect(b.minX,b.minY,b.maxX-b.minX,b.maxY-b.minY,Math.min(r.substrateRadius,(b.maxX-b.minX)/2,(b.maxY-b.minY)/2));ctx.fill();}
    else {ctx.strokeStyle='#28434a';for(const t of result.routes){if(t.status==='unrouted')continue;ctx.lineWidth=t.width+2*r.insulationMargin;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();t.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}for(const c of doc.contacts)drawContact(ctx,{...c,shape:c.shape==='ring'?'circle':c.shape},r.substrateMargin);}}
  if(options.showTraces&&result)for(const t of result.routes){if(!show(t.layer))continue;if(t.status==='unrouted'&&!options.showAirwires)continue;
    ctx.strokeStyle=t.status==='routed'?LAYER_COLORS[t.layer-1]:t.status==='unrouted'?'#ef6e7580':'#f07884';ctx.lineWidth=t.status==='unrouted'?1/scale:Math.max(t.width,.65/scale);ctx.lineJoin=t.style==='manhattan'?'miter':'round';ctx.lineCap='round';ctx.setLineDash(t.status==='unrouted'?[5/scale,5/scale]:[]);ctx.beginPath();t.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);}
  const routeById=new Map((result?.routes??[]).map(t=>[t.contactId,t]));
  if(options.showContacts)for(const c of doc.contacts){const l=routeById.get(c.id)?.layer??(c.layer||1);if(!show(l))continue;const b=contactBounds(c);if(b.maxX<minX||b.minX>maxX||b.maxY<minY||b.minY>maxY)continue;
    ctx.fillStyle=LAYER_COLORS[l-1];drawContact(ctx,c);if(selection.has(c.id)){ctx.strokeStyle='#c0fff0';ctx.lineWidth=1.6/scale;ctx.setLineDash([3/scale,3/scale]);ctx.strokeRect(b.minX-5/scale,b.minY-5/scale,b.maxX-b.minX+10/scale,b.maxY-b.minY+10/scale);ctx.setLineDash([]);}
    if(options.labels&&doc.contacts.length<=300){ctx.fillStyle='#eaf4f1';ctx.font=`${10/scale}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText(c.id,c.x,b.minY-5/scale);}}
  if(options.showTraces&&result)for(const p of result.pads){if(!show(p.layer??1))continue;ctx.fillStyle=LAYER_COLORS[(p.layer??1)-1];ctx.fillRect(p.x-p.w/2,p.y-p.h/2,p.w,p.h);}
  if(dragBox){ctx.fillStyle='#68dfca22';ctx.strokeStyle='#68dfca';ctx.lineWidth=1/scale;ctx.fillRect(dragBox.x,dragBox.y,dragBox.w,dragBox.h);ctx.strokeRect(dragBox.x,dragBox.y,dragBox.w,dragBox.h);}
  ctx.restore();
  // Readable physical scale regardless of zoom.
  let bar=1;while(bar*scale<70)bar*=10;while(bar*scale>180)bar/=2;
  ctx.fillStyle='#d9e9ea';ctx.strokeStyle='#d9e9ea';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(22,rect.height-29);ctx.lineTo(22+bar*scale,rect.height-29);ctx.moveTo(22,rect.height-34);ctx.lineTo(22,rect.height-24);ctx.moveTo(22+bar*scale,rect.height-34);ctx.lineTo(22+bar*scale,rect.height-24);ctx.stroke();ctx.font='11px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText(`${bar>=1000?(bar/1000).toLocaleString()+' mm':bar.toLocaleString()+' µm'}`,22,rect.height-40);
}
