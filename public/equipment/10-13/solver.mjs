export const version='BTS-NPX1-R1';
export const count=960;
export const banks=Object.freeze([384,384,192]);
export const siteSha256='f542eff9378d0c3d1c929c5ba099e70dd64867e0113223d71f4b6581aabb1ad0';
export const coordinateAsset='/models/neuropixels-engineering/electrode-coordinates.csv';
export const shankAsset='/models/neuropixels-engineering/models/neuropixels-shank.glb';
export const defaults=Object.freeze({schema:'bts.npx1-synthetic-fixture.v1',sampleId:'NPX1-INERT-CHECKERBOARD',revision:1,variant:'Neuropixels 1.0',mapRevision:version,dcUv:10,amplitudeUv:8,slopeUvPerUm:.01,toneHz:7,durationMs:1000});
const within=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
export function parseMap(text){
 if(typeof text!=='string')throw Error('Expected the engineering coordinate text.');
 const [header,...lines]=text.trim().split(/\r?\n/);
 if(header!=='site_id,row,x_um,y_um,z_um,size_um'||lines.length!==count)throw Error('Unexpected geometry export layout.');
 return lines.map((line,i)=>{
  const a=line.split(',').map(Number),[id,row,xUm,yUm,zUm,sizeUm]=a;
  if(a.length!==6||id!==i||row!==Math.floor(i/2)||![xUm,yUm,zUm,sizeUm].every(Number.isFinite)||xUm!==[[-24,8],[-8,24]][row%2][i%2]||Math.abs(yUm-200-row*20)>1e-6||zUm!==12||sizeUm!==12)throw Error('Coordinate mismatch for asset site '+i+'.');
  return {siteId:id,row,xUm,yUm,zUm,sizeUm};
 });
}
export async function loadMap(fetcher=fetch){
 const r=await fetcher(coordinateAsset);if(!r.ok)throw Error('Coordinate file unavailable.');
 const payload=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',payload)),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==siteSha256)throw Error('The engineering coordinate file differs from this replay version.');
 return parseMap(new TextDecoder().decode(payload));
}
export function fixture(o){
 if(o?.schema!==defaults.schema||o.variant!==defaults.variant||o.mapRevision!==version||typeof o.sampleId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/u.test(o.sampleId)||!Number.isInteger(o.revision)||o.revision<1||o.revision>1e6)throw Error('Use a named synthetic Neuropixels 1.0 fixture for '+version+'.');
 for(const [k,l,h] of [['dcUv',-100,100],['amplitudeUv',0,80],['slopeUvPerUm',-.05,.05],['toneHz',.5,80],['durationMs',100,1000]])if(!within(o[k],l,h))throw Error(k+' outside virtual range.');
 if(!Number.isInteger(o.durationMs))throw Error('Use an integer run length in milliseconds.');
 return Object.fromEntries(Object.keys(defaults).map(k=>[k,o[k]]));
}
export function selection(map,bank,channel){
 if(!Number.isInteger(bank)||bank<0||bank>=banks.length||!Number.isInteger(channel)||channel<0||channel>=banks[bank])throw Error('Replay channel does not exist in this virtual bank.');
 if(!Array.isArray(map)||map.length!==count)throw Error('No verified geometry map.');
 return map[bank*384+channel];
}
export const selectSite=siteId=>{
 if(!Number.isInteger(siteId)||siteId<0||siteId>=count)throw Error('Invalid asset site.');
 return {bank:Math.floor(siteId/384),channel:siteId%384};
};
export function volts(f,p,t=0){return 1e-6*(f.dcUv+f.slopeUvPerUm*(p.yUm-200)+f.amplitudeUv*Math.sin(2*Math.PI*f.toneHz*t));}
export function replay(map,s){
 const f=fixture(s.userFixture),p=selection(map,s.bank,s.channel),offset=s.yShiftUm;
 if(!within(offset,-5000,5000))throw Error('Display translation must be within ±5000 µm.');
 const dtS=.001,runSequence=s.runs+1,times=Array.from({length:f.durationMs+1},(_,i)=>i*dtS);
 const world=q=>[q.xUm,q.yUm+offset,q.zUm];
 const base={schema:'bts.npx1-synthetic-replay.v1',equipmentId:'10-13',fixtureId:f.sampleId,sourceRevision:f.revision,runSequence,variant:defaults.variant,mapRevision:version,mapSha256:siteSha256,
  coordinateConvention:'X across shank; Y proximal from reconstruction tip; Z toward face. Units µm. Display scene translation does not change synthetic field.',
  partition:'Software-only geometry groups of 384, 384 and 192. Virtual channel numbers are not IMRO routing or hardware channel IDs.',
  source:'Synthetic fixed depth gradient plus common tone, unrelated to tissue or measurements.',fixture:f,
  bank:s.bank,validVirtualChannels:banks[s.bank],displayShiftUm:[0,offset,0],selected:{channel:s.channel,...p,worldUm:world(p),initialV:volts(f,p,0)},
  bankAt0:Array.from({length:banks[s.bank]},(_,i)=>{const q=selection(map,s.bank,i);return {channel:i,siteId:q.siteId,localUm:[q.xUm,q.yUm,q.zUm],worldUm:world(q),v:volts(f,q,0)};}),
  trace:{t0S:0,dtS,timeS:times,voltageV:times.map(t=>volts(f,p,t))},units:{coordinate:'µm',time:'s',voltage:'V'}};
 return base;
}
export const initial=()=>({userFixture:{...defaults},bank:0,channel:7,yShiftUm:0,result:null,runs:0});
export function dispatch(s,map,a,v){
 const next=(state,message)=>({ok:true,state,message});
 try{
  if(a==='reset')return next(initial(),'Reset the synthetic replay example.');
  if(a==='fixture'||a==='import')return next({...s,userFixture:fixture(a==='import'?v:{...s.userFixture,...v}),result:null},'Synthetic fixture updated.');
  if(a==='bank'){
   if(!Number.isInteger(v)||v<0||v>=banks.length)throw Error('Choose virtual bank 0, 1 or 2.');
   return next({...s,bank:v,channel:s.channel<banks[v]?s.channel:0,result:null},'Switched virtual bank; unavailable channel numbers reset to 0.');
  }
  if(a==='site'){const q=selectSite(v);return next({...s,...q,result:null},'Selected physical asset site '+v+'.');}
  if(a==='channel'){selection(map,s.bank,v);return next({...s,channel:v,result:null},'Selected virtual channel '+v+'.');}
  if(a==='shift'){
   if(!within(v,-5000,5000))throw Error('Display translation must be within ±5000 µm.');
   return next({...s,yShiftUm:v,result:null},'Translated the display frame only.');
  }
  if(a==='run')return next({...s,result:replay(map,s),runs:s.runs+1},'Computed synthetic trace and active-bank snapshot.');
  throw Error('Unknown inspection action.');
 }catch(e){return {ok:false,state:s,message:e.message};}
}
export function csv(r){
 const clamp=v=>String(v);
 return ['# Synthetic only: no hardware or biological measurement','# Map '+r.mapRevision+' / '+r.mapSha256,'# Fixture '+r.fixtureId+' / revision '+r.sourceRevision,
 'time_s,voltage_V,asset_site_id,virtual_bank,virtual_channel,local_x_um,local_y_um,local_z_um',
 ...r.trace.timeS.map((t,i)=>[t,r.trace.voltageV[i],r.selected.siteId,r.bank,r.selected.channel,r.selected.xUm,r.selected.yUm,r.selected.zUm].map(clamp).join(','))].join('\n')+'\n';
}
