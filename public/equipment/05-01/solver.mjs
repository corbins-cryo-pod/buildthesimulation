// One-dimensional rigid spherical stylus, editable educational operating-point model.
export const SCHEMA='bts.surface-line.v1', OUT='bts.stylus-profile.v1', CAL='VIRTUAL-LVDT-LINEAR-1';
export const resolutionNm={6.5:.1,65.5:1,524:8,1000:15};
const reference={id:'SHV2318',heightUm:9.993,expandedUm:.029,coverage:'2 sigma',source:'https://michmet.com/wp-content/uploads/2024/09/michigan_metrology_certification.pdf#page=2'};
export const standard=(h=9.993)=>({schema:SCHEMA,sampleId:'SHV2318-IDEAL',revision:1,segments:[[-700,0,0],[0,700,h]],edgeUm:0,provenance:'Ideal profile; public height witness, not measured hardware.',reference});
export const initial=()=>({sample:standard(),length:1100,center:0,points:401,radius:1,range:65.5,speed:250,tilt:0,noise:0,repeats:2,direction:'alternate',level:true,hood:false,down:true,loaded:true,power:true,sequence:0});
const error=(code,message)=>({ok:false,code,message});
const inRange=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
export function sample(raw,row){
 if(raw?.schema==='bts.ionmill.result.v1')return sample(raw.sample,row);
 if(!raw || typeof raw.sampleId!=='string' || !/^[A-Za-z0-9_ .-]{1,80}$/.test(raw.sampleId)||!Number.isInteger(raw.revision)||raw.revision<0)return error('sample','The coupon requires a short sample identifier and revision.');
 if(raw.schema==='bts.ionmill.sample.v1'){
  const {nx,ny,widthMm,heightMm,thicknessNm}=raw;
  if(!Number.isInteger(nx)||!inRange(nx,8,96)||!Number.isInteger(ny)||!inRange(ny,8,96)||!inRange(widthMm,.1,55)||!inRange(heightMm,.1,100)||!Array.isArray(thicknessNm)||thicknessNm.length!==nx*ny||!thicknessNm.every(v=>inRange(v,0,100000)))return error('sample','Unsupported film map (55 mm maximum width).');
  const j=row??Math.floor(ny/2);
  if(!Number.isInteger(j)||!inRange(j,0,ny-1))return error('row','Select a valid zero-based map row.');
  const w=1000*widthMm,dx=w/nx;
  return {ok:true,value:{schema:SCHEMA,sampleId:raw.sampleId,revision:raw.revision,edgeUm:0,segments:Array.from({length:nx},(_,i)=>[-w/2+i*dx,-w/2+(i+1)*dx,thicknessNm[j*nx+i]/1000]),map:{schema:raw.schema,row:j,yFromLowerEdgeUm:(j+.5)*1000*heightMm/ny},provenance:'Simulated ion-mill thickness above an assumed planar substrate.'}};
 }
 const a=raw.segments;
 if(raw.schema!==SCHEMA||!Array.isArray(a)||!inRange(a.length,2,1000)||!Number.isFinite(raw.edgeUm))return error('sample','Use compatible line-segment or film-map JSON.');
 for(const [i,s] of a.entries())if(!Array.isArray(s)||s.length!==3||!s.every(x=>inRange(x,-55000,55000))||s[0]>=s[1]||i&&Math.abs(a[i-1][1]-s[0])>1e-6)return error('sample','Expected contiguous ordered [start, end, height] segment triplets in micrometres.');
 if(a.at(-1)[1]-a[0][0]>55000||raw.edgeUm<=a[0][0]||raw.edgeUm>=a.at(-1)[1])return error('sample','The 55 mm scan limit and interior step reference are required.');
 return {ok:true,value:{schema:SCHEMA,sampleId:raw.sampleId,revision:raw.revision,segments:a,edgeUm:raw.edgeUm,provenance:String(raw.provenance??'Imported line').slice(0,180),...(raw.sampleId==='SHV2318-IDEAL'&&raw.reference?.id===reference.id?{reference}:{}),...(raw.map?.schema==='bts.ionmill.sample.v1'?{map:raw.map}:{})}};
}
export function contact(x,segments,r,slope=0){
 const tangent=x+r*slope/Math.hypot(1,slope); let value=-Infinity;
 for(const [lo,hi,z] of segments){
  if(lo>x+r)break;if(hi<x-r)continue;
  const q=Math.max(lo,Math.min(hi,tangent));const dx=q-x;
  if(Math.abs(dx)<=r+1e-12)value=Math.max(value,z+slope*q+Math.sqrt(Math.max(0,r*r-dx*dx))-r);
 }
 return value;
}
function normal(seed){
 const u=()=>{seed=(1664525*seed+1013904223)>>>0;return (seed+.5)/4294967296;};
 return ()=>Math.sqrt(-2*Math.log(u()))*Math.cos(2*Math.PI*u());
}
function estimate(trace,windows,level){
 const group=windows.map(([lo,hi])=>trace.filter(x=>x.x>=lo&&x.x<=hi));
 if(group.some(x=>x.length<3))return error('plateau-window','Need at least three sampled positions in both plateau windows. Increase length or sampling.');
 const x=group.map(g=>mean(g.map(p=>p.x))),y=group.map(g=>mean(g.map(p=>p.z)));
 const edge=group.reduce((a,g,i)=>{for(const p of g){a[0]+=(p.x-x[i])*(p.z-y[i]);a[1]+=(p.x-x[i])**2;}return a;},[0,0]);
 const slope=level?edge[0]/edge[1]:0;
 return {ok:true,signed:y[1]-y[0]-slope*(x[1]-x[0]),slopeUmPerMm:slope*1000,counts:group.map(g=>g.length)};
}
export function step(s,a,v){
 if(a==='reset')return {ok:true,state:{...initial(),sequence:s.sequence}};
 if(a==='hood')return {ok:true,state:{...s,hood:!s.hood,down:false}};
 if(a==='power')return {ok:true,state:{...s,power:!s.power,down:false}};
 if(a==='tower')return s.hood||!s.loaded||!s.power?error('interlock','Power on, close hood and load a sample before lowering the stylus.'):{ok:true,state:{...s,down:!s.down}};
 if(['load','standard','import'].includes(a)){
  if(!s.hood)return error('hood','Open the draft hood before loading or unloading a coupon.');
  if(a==='load')return {ok:true,state:{...s,loaded:!s.loaded,down:false}};
  const q=sample(a==='standard'?standard():v?.raw,v?.row);if(!q.ok)return q;
  const t=q.value,l=t.segments[0][0],r=t.segments.at(-1)[1],c=t.edgeUm;
  return {ok:true,state:{...s,...(v?.example?{range:6.5,tilt:0,noise:0,level:true,points:401,repeats:2,direction:'alternate'}:a==='standard'?{range:65.5}:{}),sample:t,loaded:true,down:false,center:c,length:Math.floor(1.72*Math.min(c-l,r-c))}};
 }
 if(a==='settings')return {ok:true,state:{...s,...v}};
 if(a==='scan')return scan(s);
 return error('action','Unknown control.');
}
export function scan(s){
 if(!s.power)return error('standby','Power on the instrument.');
 if(s.hood||!s.loaded||!s.down)return error('interlock','Close the hood, load a sample and lower the stylus before scanning.');
 const q=sample(s.sample);if(!q.ok)return q;
 const t=q.value,seg=t.segments,left=seg[0][0],right=seg.at(-1)[1],e=t.edgeUm,l=s.center-s.length/2;
 if(!inRange(s.length,20,55000)||!inRange(s.center,-55000,55000)||l<left-1e-8||l+s.length>right+1e-8||!Number.isInteger(s.points)||!inRange(s.points,21,1601)||!Number.isInteger(s.repeats)||!inRange(s.repeats,1,6)||!Object.hasOwn(resolutionNm,s.range)||![1,2,12.5].includes(s.radius)||!inRange(s.speed,20,2000)||!inRange(s.noise,0,10)||!inRange(s.tilt,-10,10)||!['forward','reverse','alternate'].includes(s.direction))return error('settings','Check scan length, coupon bounds, point count, speed, radius and repeat settings.');
 const half=Math.min(e-left,right-e),windows=[[e-.68*half,e-.34*half],[e+.34*half,e+.68*half]];
 if(.34*half<2*s.radius)return error('plateau-window','Plateau windows need two tip radii of clearance.');
 const pitch=s.length/(s.points-1),inc=resolutionNm[s.range]/1000,rev=s.sequence+1;
 const base=Array.from({length:s.points},(_,i)=>{const x=l+i*pitch;return {x,envelope:contact(x,seg,s.radius,s.tilt/1000)};});
 const h=base.map(p=>p.envelope);
 if(Math.max(...h)-Math.min(...h)>s.range+1e-9)return error('vertical-range','Profile exceeds selected LVDT range; choose a larger range or shorter path.');
 const runs=[];
 for(let j=0;j<s.repeats;j++){
  const direction=s.direction==='alternate'?(j%2?'reverse':'forward'):s.direction;
  const g=normal(30403+991*rev+6287*j);
  const trace=(direction==='reverse'?[...base].reverse():base).map((x,i)=>({...x,time:i*pitch/s.speed,z:Math.round((x.envelope+g()*s.noise/1000)/inc)*inc}));
  const q=estimate(trace,windows,s.level);if(!q.ok)return q;
  runs.push({direction,signedStepUm:q.signed,stepUm:Math.abs(q.signed),slopeUmPerMm:q.slopeUmPerMm,counts:q.counts,trace});
 }
 const meanStepUm=mean(runs.map(r=>r.stepUm)),sampleSdUm=runs.length>1?Math.sqrt(runs.reduce((a,b)=>a+(b.stepUm-meanStepUm)**2,0)/(runs.length-1)):null;
 return {ok:true,state:{...s,sequence:rev},result:{schema:OUT,classification:'simulated',instrument:'Bruker DektakXT',sampleId:t.sampleId,sampleRevision:t.revision,scanRevision:rev,calibrationId:CAL,sourceProfile:t,frame:'X goes toward sample back; positive z is up; seconds local to each scan',units:{x:'µm',z:'µm',envelope:'µm',time:'s'},recipe:{lengthUm:s.length,radiusUm:s.radius,spanUm:s.range,incrementNm:resolutionNm[s.range],speedUmPerS:s.speed,tiltUmPerMm:s.tilt,noiseNm:s.noise,leveled:s.level,stylusForceMg:3},windowsUm:windows,runs,meanStepUm,sampleSdUm,modeledExpandedUm:sampleSdUm===null?null:2*Math.hypot(sampleSdUm/Math.sqrt(runs.length),inc/Math.sqrt(6)),referenceExpandedUm:t.reference?.expandedUm??null}};
}
export function csv(r){return ['sampleId,sampleRevision,scanRevision,calibrationId,direction,time_s,x_um,height_um,signed_step_um',...r.runs.flatMap(q=>q.trace.map(p=>[r.sampleId,r.sampleRevision,r.scanRevision,r.calibrationId,q.direction,p.time,p.x,p.z,q.signedStepUm].join(',')))].join('\n')+'\n';}
