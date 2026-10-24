import reference from './reference.json' with { type: 'json' };
import { labelConnectedComponents, STAGES } from '../microfabrication/model.js';
export { STAGES };
export const MODEL_VERSION = 'neural-interface-studio/2.0.0';
export const clone = x => JSON.parse(JSON.stringify(x));
const bounds = {baseThicknessUm:[.1,50],metalThicknessUm:[.01,2],topThicknessUm:[.1,50],resistThicknessUm:[.1,20],undercutUm:[0,10],depositionAngleDeg:[0,60],lithographyBiasUm:[-5,5],overlayXUm:[-80,80],overlayYUm:[-80,80],overlayRotationDeg:[-15,15],etchTimeMin:[0,100],etchRateUmMin:[.01,10],maskThicknessUm:[.1,30],etchSelectivity:[.1,50],lateralRatio:[0,.5],resistivityOhmM:[1e-9,1e-5]};
export const RECIPE_BOUNDS = bounds;
function num(x,lo,hi,label) { if (typeof x !== 'number' || !Number.isFinite(x) || x<lo || x>hi) throw Error(`${label} must be between ${lo} and ${hi}.`); return x; }
function list(x,max,label,min=1) {if(!Array.isArray(x)||x.length<min||x.length>max)throw Error(`${label}: expected ${min}–${max} entries.`);return x;}
function point(p){list(p,2,'Point',2);num(p[0],0,320,'X');num(p[1],0,1000,'Y');}
export function validateProject(value) {
  const p=clone(value); const d=p.design;
  if(!d || d.units!=='um')throw Error('Design coordinates must use um.');
  if(typeof d.name!=='string'||d.name.length>120)throw Error('Design needs a name of at most 120 characters.');
  list(d.outline,64,'Outline',3).forEach(point);
  const ids=new Set();
  const id=o=>{if(typeof o.id!=='string'||!/^[\w-]{1,40}$/.test(o.id)||ids.has(o.id))throw Error('Feature IDs must be unique short identifiers.');ids.add(o.id);};
  for(const key of ['sites','pads','openings'])for(const s of list(d[key],32,key)) {
    id(s);if(!['circle','rect','ring'].includes(s.shape))throw Error('Unsupported shape.');
    num(s.x,0,320,'X');num(s.y,0,1000,'Y');num(s.w,2,300,'Width');num(s.h,2,300,'Height');num(s.rotation??0,-180,180,'Rotation');num(s.inner??0,0,Math.min(s.w,s.h)-1,'Ring inner diameter');
  }
  for(const t of list(d.traces,32,'Traces')){id(t);num(t.width,2,80,'Trace width');list(t.points,32,'Trace points',2).forEach(point);}
  for(const n of list(d.nets,16,'Nets')){id(n);if(!d.sites.some(s=>s.id===n.siteId)||!d.pads.some(s=>s.id===n.padId))throw Error('Each net must reference an existing site and pad.');}
  if(new Set(d.nets.map(n=>n.siteId)).size!==d.nets.length||new Set(d.nets.map(n=>n.padId)).size!==d.nets.length)throw Error('A terminal may belong to only one net.');
  if([...d.sites,...d.pads,...d.traces].some(s=>!d.nets.some(n=>n.id===s.netId)))throw Error('Unknown net reference.');
  if(d.nets.some(n=>d.sites.find(s=>s.id===n.siteId).netId!==n.id||d.pads.find(s=>s.id===n.padId).netId!==n.id))throw Error('Terminal net references must agree.');
  if(d.openings.some(s=>![...d.sites,...d.pads].some(t=>t.id===s.targetId)))throw Error('Unknown opening target.');
  if(!p.recipe)throw Error('Recipe missing.');for(const [k,[lo,hi]]of Object.entries(bounds))num(p.recipe[k],lo,hi,k);
  p.cellUm=p.cellUm??2;if(![1,2,4].includes(p.cellUm))throw Error('Grid must be 1, 2 or 4 µm.');
  p.defects=p.defects??[];for(const f of list(p.defects,32,'Defects',0)){if(!['cut','bridge'].includes(f.type))throw Error('Unknown defect.');num(f.x,0,320,'Defect X');num(f.y,0,1000,'Defect Y');num(f.w,2,320,'Defect width');num(f.h,2,1000,'Defect height');}
  return {design:d,recipe:p.recipe,cellUm:p.cellUm,defects:p.defects};
}
export function importProject(text){if(text.length>2000000)throw Error('Project exceeds 2 MB.');const p=JSON.parse(text);if(p.schema!=='bts-neural-interface-studio'||![1,2].includes(p.version))throw Error('Unsupported Studio project.');return {...validateProject(p),historicalRuns:Array.isArray(p.runs)?p.runs.slice(-40).map(r=>{const input=validateProject({...r,cellUm:r.cellUm??r.options?.cellUm??2,defects:r.defects??r.options?.defects??[]});return {...r,...input,name:typeof r.name==='string'?r.name.slice(0,160):input.design.name,modelVersion:typeof r.modelVersion==='string'?r.modelVersion.slice(0,80):'unknown',stage:Number.isInteger(r.stage??r.options?.stage)?Math.max(0,Math.min(9,r.stage??r.options.stage)):9,metrics:Object.fromEntries(Object.entries(r.metrics??{}).filter(([k,v])=>typeof v==='number'&&Number.isFinite(v))),imported:true};}):[]};}
export function exportProject(p,runs=[]){return JSON.stringify({schema:'bts-neural-interface-studio',version:2,modelVersion:MODEL_VERSION,savedAt:new Date().toISOString(),...validateProject(p),runs:runs.slice(-40)},null,2);}
export function preset(id='reference') {
  const p={...clone(reference),cellUm:2,defects:[]};p.design.name='Four-channel reference';
  if(id==='open'){p.design.name='One broken conductor';p.defects=[{type:'cut',x:64,y:528,w:32,h:18}];}
  if(id==='bridge'){p.design.name='Two bridged channels';p.defects=[{type:'bridge',x:160,y:560,w:80,h:10}];}
  if(id==='covered'){p.design.name='Contacts still covered';p.recipe.etchTimeMin=6;}
  if(id==='overlay'){p.design.name='Misregistered openings';p.recipe.overlayXUm=28;}
  if(id==='liftoff'){p.design.name='Blocked lift-off';p.recipe.undercutUm=0;}
  if(id==='overetch'){p.design.name='Exhausted etch mask';p.recipe.maskThicknessUm=2;p.recipe.etchTimeMin=20;}
  if(id==='serpentine'){p.design.name='Longer routed conductors';p.design.traces.forEach(t=>{const x=t.points[0][0];t.points=[[x,170],[x,300],[x+18,350],[x+18,700],[x,750],[x,900]];});}
  if(id==='ring'){p.design.name='Annular contact sites';p.design.sites.forEach(s=>{s.shape='ring';s.inner=20;});p.design.openings.filter(s=>s.kind==='site').forEach(s=>{s.shape='ring';s.inner=24;});}
  p.design.id=id;return p;
}
export const PRESETS=[['reference','Four-channel reference'],['serpentine','Routed conductors'],['ring','Annular sites'],['open','Broken conductor'],['bridge','Bridged channels'],['covered','Incomplete contact etch'],['overlay','Mask misalignment'],['liftoff','Blocked lift-off'],['overetch','Mask exhaustion']];
function insidePoly(x,y,poly){let on=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])on=!on;}return on;}
export function shapeContains(s,x,y,bias=0){const a=-(s.rotation||0)*Math.PI/180,dx=x-s.x,dy=y-s.y,u=dx*Math.cos(a)-dy*Math.sin(a),v=dx*Math.sin(a)+dy*Math.cos(a),w=s.w/2+bias,h=s.h/2+bias;if(w<=0||h<=0)return false;if(s.shape==='rect')return Math.abs(u)<=w&&Math.abs(v)<=h;return (u/w)**2+(v/h)**2<=1&&(s.shape!=='ring'||Math.hypot(u,v)>=Math.max(0,s.inner/2-bias));}
function traceContains(t,x,y,bias){const radius=t.width/2+bias;if(radius<=0)return false;for(let j=1;j<t.points.length;j++){const a=t.points[j-1],b=t.points[j],dx=b[0]-a[0],dy=b[1]-a[1],q=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(x-a[0]-q*dx,y-a[1]-q*dy)<=radius)return true;}return false;}
function neighbors(i,nx,n){const out=[];if(i%nx)out.push(i-1);if(i%nx<nx-1)out.push(i+1);if(i>=nx)out.push(i-nx);if(i+nx<n)out.push(i+nx);return out;}
/** Unit-voltage finite-volume sheet network. Equipotential full site and pad footprints. */
export function sheetResistance(mask,nx,source,sink,sheetOhm){
  const n=mask.length,idx=new Int32Array(n).fill(-1),fixed=new Int8Array(n).fill(-1),cells=[];
  for(const i of source)fixed[i]=1;for(const i of sink){if(fixed[i]===1)return {ohm:null,converged:false,residual:null,iterations:0};fixed[i]=0;}
  for(let i=0;i<n;i++)if(mask[i]&&fixed[i]<0){idx[i]=cells.length;cells.push(i);}
  const m=cells.length,diag=new Float64Array(m),b=new Float64Array(m),adj=cells.map(i=>neighbors(i,nx,n).filter(j=>mask[j]));
  for(let k=0;k<m;k++)for(const j of adj[k]){diag[k]++;if(fixed[j]===1)b[k]++;}
  const mul=x=>{const y=new Float64Array(m);for(let k=0;k<m;k++){y[k]=diag[k]*x[k];for(const j of adj[k])if(idx[j]>=0)y[k]-=x[idx[j]];}return y;};
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const v=new Float64Array(m),r=b.slice(),z=r.map((x,i)=>x/diag[i]),p=z.slice();let rz=dot(r,z),res=Math.sqrt(dot(r,r)),iterations=0;
  const tolerance=1e-9*Math.max(1,Math.sqrt(dot(b,b)));
  while(res>tolerance&&iterations<4000){const ap=mul(p),den=dot(p,ap);if(!(den>0))break;const alpha=rz/den;for(let k=0;k<m;k++){v[k]+=alpha*p[k];r[k]-=alpha*ap[k];z[k]=r[k]/diag[k];}const next=dot(r,z),beta=next/rz;for(let k=0;k<m;k++)p[k]=z[k]+beta*p[k];rz=next;res=Math.sqrt(dot(r,r));iterations++;}
  let current=0;for(const i of source)for(const j of neighbors(i,nx,n))if(mask[j]&&fixed[j]!==1)current+=1-(fixed[j]===0?0:v[idx[j]]);
  return {ohm:res<=tolerance&&current>0?sheetOhm/current:null,converged:res<=tolerance,residual:res,iterations};
}
export function fabricate(input,stage=9,{resistance=true}={}){
  const p=validateProject(input),d=p.design,r=p.recipe,c=p.cellUm,nx=320/c,ny=1000/c,n=nx*ny;
  stage=num(stage,0,9,'Stage');if(!Number.isInteger(stage))throw Error('Stage must be an integer.');
  const margin=r.undercutUm-r.resistThicknessUm*Math.tan(r.depositionAngleDeg*Math.PI/180)-r.metalThicknessUm;
  const blocked=stage>=5&&(margin<=0||r.resistThicknessUm<=r.metalThicknessUm),effectiveStage=blocked?5:stage;
  const cap=effectiveStage>=6,etched=effectiveStage>=7,depth=etched?r.etchTimeMin*r.etchRateUmMin:0,protectedDepth=etched?Math.max(0,depth-r.maskThicknessUm*r.etchSelectivity):0;
  const body=new Uint8Array(n),metal=new Uint8Array(n),exposed=new Uint8Array(n),opening=new Uint8Array(n),nominal=new Uint8Array(n);
  const a=-r.overlayRotationDeg*Math.PI/180;
  for(let i=0;i<n;i++){
    const x=(i%nx+.5)*c,y=(Math.floor(i/nx)+.5)*c;body[i]=insidePoly(x,y,d.outline)?1:0;
    nominal[i]=([...d.sites,...d.pads].some(s=>shapeContains(s,x,y))||d.traces.some(t=>traceContains(t,x,y,0)))?1:0;
    let on=[...d.sites,...d.pads].some(s=>shapeContains(s,x,y,r.lithographyBiasUm))||d.traces.some(t=>traceContains(t,x,y,r.lithographyBiasUm));
    for(const f of p.defects)if(Math.abs(x-f.x)<=f.w/2&&Math.abs(y-f.y)<=f.h/2)on=f.type==='bridge';
    if(blocked)on=true;
    metal[i]=effectiveStage>=4&&on&&(effectiveStage<8||body[i])?1:0;
    const dx=x-160-r.overlayXUm,dy=y-494-r.overlayYUm,ox=160+dx*Math.cos(a)-dy*Math.sin(a),oy=494+dx*Math.sin(a)+dy*Math.cos(a);
    opening[i]=d.openings.some(s=>shapeContains(s,ox,oy,r.lithographyBiasUm+depth*r.lateralRatio))?1:0;
    exposed[i]=metal[i]&&(!cap||(etched&&(opening[i]?depth:protectedDepth)>=r.topThicknessUm))?1:0;
  }
  const {labels,componentCount}=labelConnectedComponents(metal,nx,ny);
  const terminals=d.nets.map(net=>{const site=d.sites.find(s=>s.id===net.siteId),pad=d.pads.find(s=>s.id===net.padId),s=[],t=[];for(let i=0;i<n;i++)if(metal[i]){const x=(i%nx+.5)*c,y=(Math.floor(i/nx)+.5)*c;if(shapeContains(site,x,y))s.push(i);if(shapeContains(pad,x,y))t.push(i);}return {net,site:s,pad:t,components:new Set([...s,...t].map(i=>labels[i]))};});
  const channels=terminals.map(({net,site,pad,components},k)=>{
    const sl=new Set(site.map(i=>labels[i])),pl=new Set(pad.map(i=>labels[i])),shared=[...sl].filter(i=>pl.has(i));const connected=shared.length>0;
    const shortedWith=terminals.flatMap((t,j)=>j!==k&&[...components].some(i=>t.components.has(i))?[t.net.id]:[]);
    const siteArea=site.reduce((s,i)=>s+exposed[i]*c*c,0),padArea=pad.reduce((s,i)=>s+exposed[i]*c*c,0);
    let solver=null;if(connected&&!shortedWith.length&&resistance&&!blocked){const comp=shared[0],mask=Uint8Array.from(labels,l=>l===comp?1:0);solver=sheetResistance(mask,nx,site.filter(i=>labels[i]===comp),pad.filter(i=>labels[i]===comp),r.resistivityOhmM/(r.metalThicknessUm*1e-6));}
    return {id:net.id,connected,shortedWith,siteAreaUm2:siteArea,padAreaUm2:padArea,resistanceOhm:solver?.ohm??null,solver,status:stage<4?'not fabricated':blocked?'process blocked':shortedWith.length?'shorted':!connected?'open':!siteArea||!padArea?'covered':'accessible'};
  });
  let unintendedAreaUm2=0;for(let i=0;i<n;i++)if(exposed[i]){const x=(i%nx+.5)*c,y=(Math.floor(i/nx)+.5)*c;if(![...d.sites,...d.pads].some(s=>shapeContains(s,x,y)))unintendedAreaUm2+=c*c;}
  return {modelVersion:MODEL_VERSION,stage,effectiveStage,channels,geometry:{nx,ny,cellUm:c,body,metal,exposed,opening,nominal},process:{blocked,liftOffMarginUm:margin,etchDepthUm:depth,capRemainingUm:Math.max(0,r.topThicknessUm-depth),protectedCapRemainingUm:Math.max(0,r.topThicknessUm-protectedDepth),maskRemainingUm:Math.max(0,r.maskThicknessUm-depth/r.etchSelectivity)},metrics:{componentCount,connectedCount:channels.filter(c=>c.connected).length,shortCount:channels.filter(c=>c.shortedWith.length).length,openCount:channels.filter(c=>!c.connected).length,accessibleCount:channels.filter(c=>c.status==='accessible').length,unintendedAreaUm2}};
}
export function maskPath(mask,nx,c){let path='';for(let row=0;row<mask.length/nx;row++)for(let x=0;x<nx;x++){if(!mask[row*nx+x])continue;const start=x;while(x+1<nx&&mask[row*nx+x+1])x++;path+=`M${start*c} ${row*c}h${(x-start+1)*c}v${c}h-${(x-start+1)*c}z`; }return path;}
