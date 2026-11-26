// Native dimensions in sheet millimetres. Rendering, camera motion and view zoom do not edit the document.
export const sample=()=>({schema:'bts.planar-outline.v1',sampleId:'SQUARE-10MM',drawingId:'BTS-DRAFT-0001',parentRevision:0,units:'mm',scale:'1:1',datum:{xMm:0,yMm:0},
 vertices:[{id:'A',xMm:0,yMm:0},{id:'B',xMm:10,yMm:0},{id:'C',xMm:10,yMm:10},{id:'D',xMm:0,yMm:10}],
 dimensions:[{id:'DIM-AB',from:'A',to:'B'},{id:'DIM-BC',from:'B',to:'C'}]});
export const desk=Object.freeze({worktopM:[1.10,.028,.65],surfaceY:.93,hingeZ:.25,paperM:[.420,.297]});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(v);
const coord=x=>Number.isFinite(x)&&Math.abs(x)<=150;
export function validate(p){
 if(!p||p.schema!=='bts.planar-outline.v1'||p.units!=='mm'||p.scale!=='1:1')throw Error('Use bts.planar-outline.v1 with millimetres and physical 1:1 scale.');
 if(!id(p.sampleId)||!id(p.drawingId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>1e8||!coord(p.datum?.xMm)||!coord(p.datum?.yMm))throw Error('Invalid sample ID, drawing revision, or datum.');
 if(!Array.isArray(p.vertices)||p.vertices.length<3||p.vertices.length>48)throw Error('Use 3–48 ordered outline vertices.');
 const points=new Map();
 for(const v of p.vertices){if(!id(v?.id)||points.has(v.id)||!coord(v.xMm)||!coord(v.yMm))throw Error('Duplicate/invalid vertex ID or coordinates outside ±150 mm.');points.set(v.id,{id:v.id,xMm:v.xMm,yMm:v.yMm});}
 for(const v of points.values())if(Math.abs(v.xMm+p.datum.xMm)>199||Math.abs(v.yMm+p.datum.yMm)>137)throw Error('Datum places at least one point outside the usable sheet area.');
 if(!Array.isArray(p.dimensions)||p.dimensions.length<1||p.dimensions.length>16)throw Error('Use 1–16 anchored dimensions.');
 const labels=new Set(),dims=p.dimensions.map(d=>{
  if(!id(d?.id)||labels.has(d.id)||!points.has(d.from)||!points.has(d.to)||d.from===d.to)throw Error('Each dimension needs a unique ID and two valid different vertex IDs.');
  labels.add(d.id);const a=points.get(d.from),b=points.get(d.to);
  if(Math.hypot(a.xMm-b.xMm,a.yMm-b.yMm)===0)throw Error('Annotation endpoints coincide.');
  return {id:d.id,from:d.from,to:d.to};
 });
 return {schema:p.schema,units:'mm',scale:'1:1',sampleId:p.sampleId,drawingId:p.drawingId,parentRevision:p.parentRevision,datum:{xMm:p.datum.xMm,yMm:p.datum.yMm},vertices:[...points.values()],dimensions:dims};
}
export function dimensionRows(p){
 const points=new Map(p.vertices.map(v=>[v.id,v]));
 return p.dimensions.map(d=>{
  const a=points.get(d.from),b=points.get(d.to);
  return {id:d.id,anchorVertexIds:[d.from,d.to],lengthMm:Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm),sheetEndpointsMm:[[a.xMm+p.datum.xMm,a.yMm+p.datum.yMm],[b.xMm+p.datum.xMm,b.yMm+p.datum.yMm]]};
 });
}
export const targets=Object.freeze({Tilt_lock_knob:'tilt',Paper_grid:'overlay',Straightedge_handle:'rotateView',Drawer_pull:'drawer',Task_lamp_switch:'lamp'});
export function createStation(){
 let drawing=sample(),zoom=1,angle=0,tilt=0,overlay=true,drawer=false,lamp=true,error=null;
 const read=()=>({drawing:structuredClone(drawing),view:{zoom,rotationDeg:angle},tiltDeg:tilt,overlay,drawer,lamp,error});
 function dispatch(a,p){
  error=null;
  if(a==='reset'){drawing=sample();zoom=1;angle=tilt=0;overlay=true;drawer=false;lamp=true;}
  else if(a==='resetView'){zoom=1;angle=0;}
  else if(a==='zoomIn')zoom=Math.min(16,zoom*2);
  else if(a==='zoomOut')zoom=Math.max(1,zoom/2);
  else if(a==='rotateView')angle=(angle+30)%360;
  else if(a==='tilt')tilt=tilt>=45?0:tilt+15;
  else if(a==='overlay')overlay=!overlay;
  else if(a==='drawer')drawer=!drawer;
  else if(a==='lamp')lamp=!lamp;
  else if(a==='load'){try{drawing=validate(p);zoom=1;angle=0;}catch(e){error={code:'outline',message:e.message};}}
  else throw Error('Unknown drawing table action '+a);
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):null};
}
export function pose(s){return {hingeRotationRad:s.tiltDeg*Math.PI/180,drawerOffsetM:s.drawer?.16:0,light:s.lamp,specimenVisible:s.overlay};}
export function file(s){
 const p=s.drawing;
 return {schema:'bts.dimensioned-sheet.v1',equipmentId:'01-07',drawingId:p.drawingId,sampleId:p.sampleId,revision:p.parentRevision+1,parentRevision:p.parentRevision,units:'mm',paper:{widthMm:420,heightMm:297},physicalScale:'1:1',datum:p.datum,
 outline:p.vertices,annotations:dimensionRows(p),specimenOverlay:{visible:s.overlay,translationMm:[p.datum.xMm,p.datum.yMm],rotationDeg:0,scale:1},view:{...s.view},provenance:'drawing-space measurement, not screen or physical metrology'};
}
// Portable drawing preserves physical sheet scale irrespective of the inspection view.
export function svgSheet(s){
 const doc=file(s),points=doc.outline.map(v=>[v.xMm+doc.datum.xMm,v.yMm+doc.datum.yMm]);
 const poly=points.map(p=>p.join(',')).join(' ');
 const measures=doc.annotations.map(t=>{
  const [[x1,y1],[x2,y2]]=t.sheetEndpointsMm;
  return `<g data-from="${t.anchorVertexIds[0]}" data-to="${t.anchorVertexIds[1]}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#32745e" stroke-dasharray="1 1"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-2}" font-size="3" text-anchor="middle" fill="#333">${Number(t.lengthMm.toFixed(4))} mm</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="-210 -148.5 420 297"><title>${doc.drawingId} rev ${doc.revision}</title><rect x="-210" y="-148.5" width="420" height="297" fill="white"/><rect x="-200" y="-138.5" width="400" height="277" fill="none" stroke="#777" stroke-width=".35"/><polygon points="${poly}" fill="${doc.specimenOverlay.visible?'#cde2d6':'none'}" stroke="#263b41" stroke-width=".35"/>${measures}<text x="-190" y="130" font-size="5">BTS-DRAFT · 1:1 source geometry · ${doc.sampleId}</text></svg>\n`;
}
