// Synthetic trace replay only. No material, furnace-control recipe, chemistry or kinetics.
const err=(code,message)=>({ok:false,code,message});
const ok=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
export function fixture(basis='gross',drift=false,panMg=2){
 const times=[0,63,151,233,431,509,640,800,1017,1263],labels=[25,61,143,172,220,237,291,338,397,451];
 const mass=[10,10,9.97,9.81,9.48,8.96,8.46,8.15,8.02,8];
 return {schema:'bts.tga-series.v1',sampleId:'SYNTHETIC-MASS-10TO8',revision:1,classification:'synthetic',basis,panId:'Q50-VIRTUAL-PAN-01',panMg,points:mass.map((m,i)=>{
  const blankMg=drift?.2*i/(mass.length-1):0;return {timeS:times[i],temperatureC:labels[i],indicatedMg:m+(basis==='gross'?panMg:0)+blankMg,blankMg};
 })};
}
export const initial=()=>({power:true,chamber:true,loaded:true,pan:true,taredMg:2,applyBlank:true,record:fixture(),revision:0});
export function trace(raw){
 if(!raw||raw.schema!=='bts.tga-series.v1'||raw.classification!=='synthetic'||!['gross','net'].includes(raw.basis)||![raw.sampleId,raw.panId].every(s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(s))||!Number.isInteger(raw.revision)||raw.revision<0||!ok(raw.panMg,.01,200)||!Array.isArray(raw.points)||raw.points.length<3||raw.points.length>2000)return err('series','Use a synthetic series JSON with unique sample/pan IDs, declared gross or net basis, and 3–2000 records.');
 const points=[];
 for(const [i,p] of raw.points.entries()){
  if(!p||!ok(p.timeS,0,604800)||!ok(p.temperatureC,-20,1100)||!ok(p.indicatedMg,0,1500)||!ok(p.blankMg??0,-50,50)||i&&p.timeS<=points[i-1].timeS)return err('series','Record times must increase; each temperature, indicated mg and optional blank mg must be finite and in bounds.');
  points.push({timeS:p.timeS,temperatureC:p.temperatureC,indicatedMg:p.indicatedMg,blankMg:p.blankMg??0});
 }
 return {ok:true,value:{schema:raw.schema,sampleId:raw.sampleId,revision:raw.revision,classification:raw.classification,panId:raw.panId,panMg:raw.panMg,basis:raw.basis,points}};
}
export function dispatch(s,a,v){
 if(a==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(a==='power')return {ok:true,state:{...s,power:!s.power,chamber:false}};
 if(a==='chamber')return s.power?{ok:true,state:{...s,chamber:!s.chamber}}:err('standby','Power on before moving the virtual furnace.');
 if(a==='load'||a==='pan'||a==='tare'||a==='import'){
  if(!s.power||s.chamber)return err('open','Lower the virtual furnace to expose the pan.');
  if(a==='pan')return {ok:true,state:{...s,pan:!s.pan,loaded:false,taredMg:null}};
  if(!s.pan)return err('pan','Install the virtual pan first.');
  if(a==='load')return {ok:true,state:{...s,loaded:!s.loaded}};
  if(a==='tare')return s.loaded?err('tare','Remove the specimen before recording empty-pan tare.'):{ok:true,state:{...s,taredMg:s.record.panMg}};
  const t=trace(v);if(!t.ok)return t;
  return {ok:true,state:{...s,record:t.value,loaded:true,taredMg:s.record.panId===t.value.panId&&s.record.panMg===t.value.panMg?s.taredMg:null}};
 }
 if(a==='preset'){
  const n=fixture(v==='drift'?'gross':v??'gross',v==='drift');return {ok:true,state:{...s,record:n,taredMg:s.record.panId===n.panId&&s.record.panMg===n.panMg?s.taredMg:null}};
 }
 if(a==='blank')return {ok:true,state:{...s,applyBlank:!!v}};
 if(a==='replay')return replay(s);
 return err('control','Unknown virtual instrument action.');
}
export function replay(s){
 if(!s.power||!s.chamber||!s.pan||!s.loaded)return err('interlock','Power on, install a pan and specimen, then raise the furnace before replay.');
 const q=trace(s.record);if(!q.ok)return q;const r=q.value;
 const tare=r.basis==='gross'?s.taredMg:0;
 if(!ok(tare,0,200))return err('tare','Gross readings need a current empty-pan tare. Net readings never subtract the pan again.');
 const rows=r.points.map(p=>({...p,correctedMg:p.indicatedMg-tare-(s.applyBlank?p.blankMg:0)}));
 const init=rows[0].correctedMg;
 if(init<=0||rows.some(p=>p.correctedMg<0))return err('mass','Subtraction produced a nonphysical mass. Verify basis, empty-pan tare and blank series.');
 const final=rows.at(-1).correctedMg,revision=s.revision+1;
 return {ok:true,state:{...s,revision},result:{schema:'bts.tga-replay.v1',classification:'synthetic replay',instrument:'TA Instruments Q50',sampleId:r.sampleId,sampleRevision:r.revision,panId:r.panId,runRevision:revision,basis:r.basis,appliedTareMg:tare,blankApplied:s.applyBlank,initialMg:init,terminalMg:final,removedMg:init-final,terminalPercent:100*final/init,units:{timeS:'s',temperatureC:'°C',indicatedMg:'mg',blankMg:'mg',correctedMg:'mg',retainedPercent:'%'},rows:rows.map(p=>({...p,retainedPercent:100*p.correctedMg/init})),provenance:'Synthetic table replay only; temperature values are data labels, not a thermal schedule.'}};
}
export function toCsv(r){return ['sampleId,sampleRevision,runRevision,panId,basis,time_s,temperature_C,indicated_mg,blank_mg,corrected_mg,retained_percent',...r.rows.map(p=>[r.sampleId,r.sampleRevision,r.runRevision,r.panId,r.basis,p.timeS,p.temperatureC,p.indicatedMg,p.blankMg,p.correctedMg,p.retainedPercent].join(','))].join('\n')+'\n';}
