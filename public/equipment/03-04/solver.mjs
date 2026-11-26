export const geo=Object.freeze({stageNominalMm:203.2,sandboxSeatDiameterMm:154,clearanceMm:2,drawerTravelMm:155,displayHingeDeg:-86});
const xs=Object.freeze([-20,-10,0,10,20]),zs=Object.freeze([-20,-10,0,10,20]);
export const fixture=Object.freeze({schema:'bts.readonly-coating-witness.v1',sampleId:'inert-d635-witness',revision:1,diameterMm:100,xMm:xs,zMm:zs,layers:[
 {id:'witness-A',material:'Synthetic A',nm:zs.map(()=>xs.map(x=>40+x/10))},
 {id:'witness-B',material:'Synthetic B',nm:zs.map(z=>xs.map(()=>20+Math.abs(z)/5))}
]});
const limits=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
function id(x){return typeof x==='string'&&/^[a-zA-Z0-9_-]{1,64}$/u.test(x);}
export function fit(diameterMm,offsetMm=0){
 if(!limits(diameterMm,45,180)||!limits(offsetMm,-35,35))throw Error('Use a 45–180 mm inert witness and lateral offset −35 to 35 mm.');
 const radial=geo.sandboxSeatDiameterMm/2-diameterMm/2-Math.abs(offsetMm);
 return {fits:radial+1e-9>=geo.clearanceMm,radialClearanceMm:radial,minimumClearanceMm:geo.clearanceMm,nominalSeatMm:geo.sandboxSeatDiameterMm,offsetMm,diameterMm};
}
function axes(x){return Array.isArray(x)&&x.length>=2&&x.length<=31&&x.every((v,i)=>limits(v,-90,90)&&(!i||v>x[i-1]));}
export function validate(x){
 if(x?.schema!=='bts.readonly-coating-witness.v1'||!id(x.sampleId)||!Number.isInteger(x.revision)||x.revision<1||x.revision>1e6||!limits(x.diameterMm,45,180)||!axes(x.xMm)||!axes(x.zMm))throw Error('Invalid witness schema, sample ID, diameter, revision or lattice axes.');
 if(Math.max(...x.xMm.map(Math.abs))**2+Math.max(...x.zMm.map(Math.abs))**2>(x.diameterMm/2)**2)throw Error('The map corners must lie inside the circular witness.');
 if(!Array.isArray(x.layers)||x.layers.length!==2||!x.layers.every(q=>id(q?.id)&&typeof q.material==='string'&&/^[A-Za-z0-9 _-]{1,40}$/u.test(q.material)&&Array.isArray(q.nm)&&q.nm.length===x.zMm.length&&q.nm.every(r=>Array.isArray(r)&&r.length===x.xMm.length&&r.every(n=>limits(n,0,2000))))||new Set(x.layers.map(q=>q.id)).size!==2)throw Error('Provide exactly two distinctly named synthetic maps with valid nanometre cells.');
 return {schema:x.schema,sampleId:x.sampleId,revision:x.revision,diameterMm:x.diameterMm,xMm:[...x.xMm],zMm:[...x.zMm],layers:x.layers.map(q=>({id:q.id,material:q.material,nm:q.nm.map(r=>[...r])}))};
}
export function inspect(x=fixture,iz=2,ix=2,offsetMm=0){
 x=validate(x);const q=fit(x.diameterMm,offsetMm);
 if(!q.fits)throw Error('Witness did not pass passive carrier clearance.');
 if(!Number.isInteger(ix)||ix<0||ix>=x.xMm.length||!Number.isInteger(iz)||iz<0||iz>=x.zMm.length)throw Error('The requested map cut lies outside the witness lattice.');
 let floor=0;
 const stack=x.layers.map((layer,i)=>{
  const d=layer.nm[iz][ix],z={layerId:layer.id,material:layer.material,orderBottomFirst:i,cumulativeBaseNm:floor,cumulativeTopNm:floor+d,thicknessNm:d};floor+=d;return z;
 });
 return {schema:'bts.readonly-coating-inspection.v1',equipmentId:'03-04',sampleId:x.sampleId,sourceRevision:x.revision,provenance:'Synthetic already prepared maps; no deposition, processing, target behavior or device control.',axes:{xMm:x.xMm,zMm:x.zMm,verticalUnit:'nm',order:'substrate upward; rows follow increasing +Z'},layers:x.layers,fit:q,selected:{ix,iz,xMm:x.xMm[ix],zMm:x.zMm[iz],totalNm:floor,stack}};
}
export function initial(x=fixture){
 return {sample:validate(x),open:false,tray:false,placed:false,offsetMm:0,ix:Math.floor(x.xMm.length/2),iz:Math.floor(x.zMm.length/2),result:null,cutaway:false};
}
export function dispatch(s,a,v){
 const ok=(state,message)=>({ok:true,state,message});
 try{
  if(a==='reset')return ok(initial(),'Restored the synthetic reference.');
  if(a==='import')return ok(initial(v),'Loaded a read-only witness; place it on the inert tray to inspect.');
  if(a==='cover'){
   if(s.open&&s.tray)throw Error('Retract the virtual tray before closing its practice cover.');
   return ok({...s,open:!s.open},s.open?'Practice cover closed.':'Practice cover open.');
  }
  if(a==='tray'){
   if(!s.open)throw Error('Open the virtual practice cover first.');
   return ok({...s,tray:!s.tray},s.tray?'Practice tray retracted.':'Practice tray extended.');
  }
  if(a==='cutaway')return ok({...s,cutaway:!s.cutaway},'Changed static documentary view.');
  if(a==='geometry'){
   if(s.placed)throw Error('Remove the passive witness before changing fit dimensions.');
   const d=v?.diameterMm??s.sample.diameterMm,o=v?.offsetMm??s.offsetMm;fit(d,o);
   return ok({...s,sample:validate({...s.sample,diameterMm:d}),offsetMm:o,result:null},'Practice carrier fit changed.');
  }
  if(a==='place'){
   if(!s.open||!s.tray)throw Error('Extend the inert practice tray first.');
   if(!s.placed&&!fit(s.sample.diameterMm,s.offsetMm).fits)throw Error('No fit: the passive witness needs at least 2 mm radial clearance.');
   return ok({...s,placed:!s.placed,result:null},s.placed?'Removed the inert witness.':'Placed the passive witness.');
  }
  if(a==='index'||a==='inspect'){
   const ix=v?.ix??s.ix,iz=v?.iz??s.iz;const valid=Number.isInteger(ix)&&ix>=0&&ix<s.sample.xMm.length&&Number.isInteger(iz)&&iz>=0&&iz<s.sample.zMm.length;
   if(!valid)throw Error('Point indexes must lie inside this witness lattice.');
   if(a==='inspect'&&!s.placed)throw Error('Place the inert witness before inspecting its stored cross-section.');
   return ok({...s,ix,iz,result:a==='inspect'?inspect(s.sample,iz,ix,s.offsetMm):null},a==='inspect'?'Read archived maps from bottom to top.':'Moved the cross-section cursor.');
  }
  throw Error('Unknown virtual interaction.');
 }catch(e){return {ok:false,state:s,message:e.message};}
}
