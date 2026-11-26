export const artworkSchema='bts.pcb-inspection.artwork.v1', reportSchema='bts.pcb-inspection.report.v1';
const idok=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/.test(x);
const um=x=>{if(!Number.isFinite(x)||Math.abs(x*1000-Math.round(x*1000))>1e-7)throw Error('Supply finite mm coordinates on a 1 µm grid.');return Math.round(x*1000)};
export function parse(d){
 if(!d||d.schema!==artworkSchema||d.units!=='mm'||d.layer!=='top-copper'||!idok(d.sampleId)||!idok(d.revision))throw Error('Expected a v1 inert top-copper artwork in millimeters with sample and revision IDs.');
 if(!Array.isArray(d.outlineMm)||d.outlineMm.length!==2)throw Error('Expected one rectangular board outline.');
 const [w,h]=d.outlineMm.map(um);
 if(w<2000||h<2000||w>100000||h>100000)throw Error('This exercise supports rectangular coupons 2–100 mm per side.');
 if(!Array.isArray(d.rectangles)||d.rectangles.length<2||d.rectangles.length>80)throw Error('Expected 2–80 copper rectangles.');
 const ids=new Set(),pads=new Set();
 const rectangles=d.rectangles.map(r=>{
  if(!r||!idok(r.id)||ids.has(r.id)||!Array.isArray(r.boundsMm)||r.boundsMm.length!==4)throw Error('Copper rectangles need unique IDs and [xmin,ymin,xmax,ymax] bounds.');
  ids.add(r.id);
  if(r.padId!==undefined){if(!idok(r.padId)||pads.has(r.padId))throw Error('Duplicate or invalid pad ID.');pads.add(r.padId)}
  const [x0,y0,x1,y1]=r.boundsMm.map(um);
  if(x0<0||y0<0||x1>w||y1>h||x1<=x0||y1<=y0)throw Error('Copper rectangles must lie inside the outline and have positive area.');
  return {id:r.id,...(r.padId===undefined?{}:{padId:r.padId}),boundsMm:[x0/1000,y0/1000,x1/1000,y1/1000]};
 });
 if(!Array.isArray(d.nets)||d.nets.length!==2)throw Error('This inert exercise expects exactly two declared nets.');
 const netIds=new Set(),used=new Set();
 const nets=d.nets.map(n=>{
  if(!n||!idok(n.id)||netIds.has(n.id)||!Array.isArray(n.padIds)||n.padIds.length<2||n.padIds.length>40)throw Error('Each net needs a unique ID and 2–40 declared pads.');netIds.add(n.id);
  for(const p of n.padIds){if(!pads.has(p)||used.has(p))throw Error('Each pad must map to one known net.');used.add(p)}
  return {id:n.id,padIds:[...n.padIds]};
 });
 if(used.size!==pads.size)throw Error('Every labeled pad needs an intended net.');
 return {schema:artworkSchema,sampleId:d.sampleId,revision:d.revision,units:'mm',layer:'top-copper',outlineMm:[w/1000,h/1000],rectangles,nets};
}
function axis(a0,a1,b0,b1){if(a1<b0)return [a1,b0];if(b1<a0)return [a0,b1];const p=Math.max(a0,b0)+Math.min(a1,b1);return [p/2,p/2]}
function closest(a,b){
 const [ax,ay,aX,aY]=a, [bx,by,bX,bY]=b;
 const [x1,x2]=axis(ax,aX,bx,bX),[y1,y2]=axis(ay,aY,by,bY);
 return {distanceSquared:(x2-x1)**2+(y2-y1)**2,aMm:[x1/1000,y1/1000],bMm:[x2/1000,y2/1000]};
}
export const rectGap=(a,b)=>Math.sqrt(closest(a.map(um),b.map(um)).distanceSquared)/1000;
export function inspect(source,diameterMm,revision=1,parentRevision=null){
 const d=parse(source),dia=um(diameterMm);
 if(dia<50||dia>5000)throw Error('Reference gauge diameter must be 0.05–5 mm.');
 const box=d.rectangles.map(r=>r.boundsMm.map(um)),count=box.length,parent=Array.from({length:count},(_,i)=>i),root=i=>parent[i]===i?i:(parent[i]=root(parent[i]));
 for(let i=0;i<count;i++)for(let j=0;j<i;j++)if(closest(box[i],box[j]).distanceSquared===0)parent[root(i)]=root(j);
 const groups=new Map(),padNet=new Map(d.nets.flatMap(n=>n.padIds.map(p=>[p,n.id])));
 for(let i=0;i<count;i++){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i)}
 const members=[...groups.values()],comp=members.map((ids,i)=>{
  const padIds=ids.map(j=>d.rectangles[j].padId).filter(Boolean),netIds=[...new Set(padIds.map(p=>padNet.get(p)))].sort();
  return {componentId:'ISLAND-'+(i+1),rectangleIds:ids.map(j=>d.rectangles[j].id),padIds,intendedNetIds:netIds,status:netIds.length===0?'unassigned':netIds.length>1?'short':'single-net'};
 });
 const netChecks=d.nets.map(n=>{
  const found=comp.filter(c=>c.intendedNetIds.includes(n.id)),status=found.some(c=>c.status==='short')?'short':found.length===1?'connected':'open';
  return {netId:n.id,padIds:n.padIds,componentIds:found.map(c=>c.componentId),status};
 });
 const crossNetPairs=[];
 for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
  if(comp[i].status!=='single-net'||comp[j].status!=='single-net'||comp[i].intendedNetIds[0]===comp[j].intendedNetIds[0])continue;
  let best=null;
  for(const a of members[i])for(const b of members[j]){
   const candidate=closest(box[a],box[b]);
   if(!best||candidate.distanceSquared<best.distanceSquared)best={...candidate,a,b};
  }
  const {distanceSquared,a,b,aMm,bMm}=best;
  crossNetPairs.push({componentIds:[comp[i].componentId,comp[j].componentId],rectangleIds:[d.rectangles[a].id,d.rectangles[b].id],netIds:[comp[i].intendedNetIds[0],comp[j].intendedNetIds[0]],clearanceMm:Math.sqrt(distanceSquared)/1000,closestPointsMm:[aMm,bMm],status:distanceSquared<dia**2?'too-narrow':distanceSquared===dia**2?'zero-margin':'width-available'});
 }
 crossNetPairs.sort((a,b)=>a.clearanceMm-b.clearanceMm);
 return {schema:reportSchema,deviceId:'08-11',origin:'synthetic-geometry-only',sampleId:d.sampleId,sourceRevision:d.revision,revision,parentRevision,coordinateFrame:'top view; +x right, +y away; lower-left board origin',units:'mm',layer:d.layer,gaugeDiameterMm:dia/1000,asDesignedArtwork:d,netChecks,components:comp,crossNetPairs,scope:'Ideal closed-set copper contact and pairwise clearance only. No paths, material removal, fabrication output, electronics or process prediction.'};
}
export function initial(artwork){return {source:parse(artwork),hoodOpen:false,diameterMm:.8,report:null,revision:0};}
export function action(state,{type,payload}){
 switch(type){
  case 'hood':return {...state,hoodOpen:!state.hoodOpen};
  case 'artwork':return {...state,source:parse(payload),report:null,revision:0};
  case 'diameter': {const n=um(payload);if(n<50||n>5000)throw Error('Reference gauge diameter must be 0.05–5 mm.');return {...state,diameterMm:n/1000,report:null};}
  case 'inspect':{const revision=state.revision+1;return {...state,report:inspect(state.source,state.diameterMm,revision,state.revision||null),revision};}
  default:throw Error('Unknown inspection action.');
 }
}
