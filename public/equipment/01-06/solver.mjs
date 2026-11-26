export const geometry=Object.freeze({ rackU:12,pitchMm:44.45,nominalFaceMm:482.6,railCentersMm:465,cabinetMm:[600,650,600],usableDepthMm:500,doorOpenDeg:94,nasPullM:.17 });
export const limits=Object.freeze({ voltageV:120,realW:1000,apparentVA:1440 });
export const mounted=Object.freeze([
 Object.freeze({id:'ups',u:1,heightU:2,depthMm:457,w:0,pf:1}),
 Object.freeze({id:'nas',u:4,heightU:2,depthMm:410,w:240,pf:.8}),
 Object.freeze({id:'switch',u:8,heightU:1,depthMm:270,w:48,pf:.8}),
 Object.freeze({id:'patch',u:10,heightU:1,depthMm:120,w:0,pf:1})
]);
export const runFixture={ schema:'bts.rack-run-input.v1',runId:'synthetic-mask-trace-01',sampleId:'inert-witness-4mm',revision:1,objects:[
 {id:'mask-01',parentId:'synthetic-mask-trace-01',type:'mask',text:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><circle cx="2" cy="2" r="1"/></svg>\n'},
 {id:'trace-01',parentId:'mask-01',type:'trace',text:'time_ms,voltage_v\n0,0\n1,0.5\n2,0\n'}
]};
const id=/^[a-zA-Z0-9_-]{1,64}$/u;const digest=/^[0-9a-f]{64}$/u;const encoder=new TextEncoder();
const validId=x=>typeof x==='string'&&id.test(x);
export async function sha(text){const q=await globalThis.crypto.subtle.digest('SHA-256',encoder.encode(text));return Array.from(new Uint8Array(q),x=>x.toString(16).padStart(2,'0')).join('');}
export function placement(u,heightU,depthMm,existing=mounted){
 if(!Number.isInteger(u)||!Number.isInteger(heightU)||u<1||heightU<1||u+heightU-1>geometry.rackU)return {ok:false,message:'The module crosses the 1–12 U mounting range.'};
 if(!Number.isFinite(depthMm)||depthMm<=0||depthMm>geometry.usableDepthMm)return {ok:false,message:'Module exceeds the 500 mm virtual mounting-depth allowance.'};
 const occupied=existing.find(m=>u<m.u+m.heightU&&m.u<u+heightU);
 return occupied?{ok:false,message:'Rack-unit overlap with '+occupied.id+'.'}:{ok:true,centerYmm:55+(u-1+heightU/2)*geometry.pitchMm};
}
export function budget(rows){let realW=0,apparentVA=0;for(const m of rows){if(!Number.isFinite(m.w)||m.w<0||!Number.isFinite(m.pf)||m.pf<=0||m.pf>1)throw Error('Load needs nonnegative W and a power factor in (0,1].');realW+=m.w;apparentVA+=m.w/m.pf;}
 return {realW,apparentVA,estimatedA:apparentVA/limits.voltageV,remainingW:limits.realW-realW,remainingVA:limits.apparentVA-apparentVA,within:realW<=limits.realW&&apparentVA<=limits.apparentVA};
}
function validate(pkg){
 if(!pkg||!validId(pkg.runId)||!validId(pkg.sampleId)||!Number.isInteger(pkg.revision)||pkg.revision<1||pkg.revision>1e6||!Array.isArray(pkg.objects)||pkg.objects.length!==2)throw Error('Expected a run, sample ID, revision, one mask and one trace.');
 const mask=pkg.objects.find(x=>x?.type==='mask'),trace=pkg.objects.find(x=>x?.type==='trace');
 if(!mask||!trace||!validId(mask.id)||!validId(trace.id)||new Set([pkg.runId,mask.id,trace.id]).size!==3||mask.parentId!==pkg.runId||trace.parentId!==mask.id)throw Error('Parent links must be run → mask → trace, with distinct IDs.');
 for(const o of pkg.objects)if(typeof o.text!=='string'||encoder.encode(o.text).length>65536)throw Error('Each UTF-8 object must be at most 65,536 bytes.');
}
export async function archive(pkg=runFixture){
 validate(pkg);if(pkg.schema!=='bts.rack-run-input.v1')throw Error('Unsupported run input schema.');
 return {schema:'bts.rack-archive.v1',runId:pkg.runId,sampleId:pkg.sampleId,revision:pkg.revision,provenance:'In-memory virtual archive; UTF-8 bytes; no network or persistent storage.',objects:await Promise.all(pkg.objects.map(async({id,parentId,type,text})=>({id,parentId,type,text,bytes:encoder.encode(text).length,sha256:await sha(text)})))};
}
export async function restore(pkg){
 if(pkg?.schema!=='bts.rack-archive.v1')return {ok:false,message:'Unsupported archive schema.'};
 try{validate(pkg);}catch(e){return {ok:false,message:e.message};}
 const checks=await Promise.all(pkg.objects.map(async o=>({id:o.id,parentId:o.parentId,bytes:encoder.encode(o.text).length,expectedSha256:o.sha256,actualSha256:await sha(o.text)})));
 checks.forEach((q,i)=>q.ok=typeof q.expectedSha256==='string'&&digest.test(q.expectedSha256)&&q.actualSha256===q.expectedSha256&&q.bytes===pkg.objects[i].bytes);
 const ok=checks.every(q=>q.ok);
 return {ok,message:ok?'Restored mask and trace; both digests and parent links match.':'Restore blocked: '+checks.filter(q=>!q.ok).map(q=>q.id).join(', ')+' failed integrity.',checks,event:ok?{type:'restore',runId:pkg.runId,sampleId:pkg.sampleId,archivedRevision:pkg.revision,restoredRevision:pkg.revision}:null};
}
export const initial=()=>({door:false,pull:false,power:true,module:null,pack:null,result:null});
export const loadFor=s=>budget(s.module?[...mounted,s.module]:mounted);
const fail=(s,message)=>({ok:false,state:s,message});
export async function dispatch(s,a,v){
 const ok=(state,message)=>({ok:true,state,message});
 if(a==='door')return !s.door||!s.pull?ok({...s,door:!s.door},s.door?'Front door closed.':'Front door open.'):fail(s,'Push the NAS tray in before closing the virtual door.');
 if(a==='pull')return s.door?ok({...s,pull:!s.pull},s.pull?'NAS tray seated.':'NAS tray extended.'):fail(s,'Open the door to access the NAS tray.');
 if(a==='power')return ok({...s,power:!s.power},s.power?'Virtual UPS in standby.':'Virtual UPS enabled.');
 if(a==='reset')return ok(initial(),'Rack reset; virtual archive cleared.');
 if(a==='mount'){
  if(!s.door)return fail(s,'Open the virtual door before mounting.');
  if(s.pull)return fail(s,'Seat the NAS tray before mounting.');
  const p=placement(v?.u,1,390);if(!p.ok)return fail(s,p.message);
  if(![120,900].includes(v?.w))return fail(s,'Choose one documented synthetic load.');
  return ok({...s,module:{id:'compute',u:v.u,heightU:1,depthMm:390,w:v.w,pf:.8}},'Compute sled mounted at U'+v.u+'.');
 }
 if(a==='remove')return s.door&&!s.pull?ok({...s,module:null},'Compute sled removed.'):fail(s,'Open the door and seat the NAS tray to remove the module.');
 if(a==='damage')return s.pack?ok({...s,result:null,pack:{...s.pack,objects:s.pack.objects.map(o=>o.type==='trace'?{...o,text:(o.text.includes('0.5')?o.text.replace('0.5','0.6'):o.text+'!')}:o)}},'One trace value changed; stored digest retained.'):fail(s,'Archive the example run first.');
 if(!['archive','restore','import'].includes(a))return fail(s,'Unknown action.');
 if(!s.power||!loadFor(s).within||s.pull)return fail(s,'Storage work blocked: UPS must be on, within W and VA limits, and the NAS tray seated.');
 if(a==='archive')return ok({...s,pack:await archive(),result:null},'Inert mask and trace archived with their original IDs and digests.');
 if(a==='restore'||a==='import'){
  if(a==='import'&&v?.schema==='bts.rack-run-input.v1')return ok({...s,pack:await archive(v),result:null},'Imported and archived the supplied mask and trace.');
  const pack=a==='import'?v:s.pack;if(!pack)return fail(s,'Archive or import the example first.');
  const result=await restore(pack);return {ok:result.ok,state:result.ok?{...s,pack,result}:{...s,result},message:result.message};
 }
}
