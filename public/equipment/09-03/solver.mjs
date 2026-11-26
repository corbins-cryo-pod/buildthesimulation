// Ideal resistive DC transfer only. All public data in SI units; no browser dependencies.
export const schema='bts.smu-resistive-sweep.v1';
export const defaults=()=>({sampleId:'coupon-1k-01',inputRevision:0,contacts:['DUT-HI','DUT-LO'],mode:'V',sense:2,connected:true,senseConnected:true,rOhm:1000,leadOhm:0,start:0,stop:1,limit:0.002,n:11,dwellS:0.1,continuityOhm:50,noise:false,seed:2450});
export function check(c){
 const need=(ok,msg)=>{if(!ok)throw Error(msg)};
 need(c&&['V','I'].includes(c.mode)&&[2,4].includes(c.sense),'Select voltage or current and a 2- or 4-wire connection.');
 need(typeof c.connected==='boolean'&&c.connected,'DUT force leads are disconnected. Connect the coupon first.');
 need(c.sense!==4||c.senseConnected===true,'Remote sense circuit open. Connect both sense leads.');
 need(typeof c.sampleId==='string'&&c.sampleId.trim().length>0&&c.sampleId.length<=96&&Number.isSafeInteger(c.inputRevision)&&c.inputRevision>=0,'Sample ID or input revision invalid.');
 need(Array.isArray(c.contacts)&&c.contacts.length===2&&c.contacts.every(x=>typeof x==='string'&&x.length)&&c.contacts[0]!==c.contacts[1],'Use two distinct DUT contact IDs.');
 const inR=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b,amp=c.mode==='V'?10:.01,lim=c.mode==='V'?.01:10;
 need(inR(c.rOhm,1,1e6),'DUT must be a finite ohmic load between 1 Ω and 1 MΩ.');
 need(inR(c.leadOhm,0,100),'Each force lead must be between 0 and 100 Ω.');
 need(inR(c.start,-amp,amp)&&inR(c.stop,-amp,amp),'Source level exceeds the supported ±10 V or ±10 mA range.');
 need(inR(c.limit,c.mode==='V'?1e-7:1e-4,lim),'Limit must be 0.0001–10 mA or 0.0001–10 V, as appropriate.');
 need(Number.isInteger(c.n)&&inR(c.n,2,201),'Use 2–201 sweep points.');
 need(inR(c.dwellS,.001,10),'Use 1 ms to 10 s per point.');
 need(inR(c.continuityOhm,.1,1e6),'Continuity threshold must be 0.1 Ω to 1 MΩ.');
 need(typeof c.noise==='boolean'&&Number.isInteger(c.seed)&&inR(c.seed,0,4294967295),'Invalid noise settings.');return c;
}
export function solve(config){
 const c=check({...config});let s=c.seed>>>0;const random=()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)+.5)/4294967296;
 const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
 const rPath=c.rOhm+2*c.leadOhm,rSense=c.sense===4?c.rOhm:rPath;
 const points=Array.from({length:c.n},(_,k)=>{
  const request=c.start+(c.stop-c.start)*k/(c.n-1);const free=c.mode==='V'?request/rSense:request;
  const cap=c.mode==='V'?c.limit:c.limit/rSense;
  const compliance=Math.abs(free)>cap*(1+8*Number.EPSILON),currentA=Math.sign(free)*Math.min(Math.abs(free),cap);
  const dutV=currentA*c.rOhm,terminalV=currentA*rPath,sensedV=currentA*rSense;
  const measuredV=sensedV+(c.noise?1e-6*normal():0),measuredA=currentA+(c.noise?1e-9*normal():0);
  return {k,timeS:k*c.dwellS,request,currentA,dutV,terminalV,sensedV,measuredV,measuredA,compliance};
 });
 const best=points.reduce((a,b)=>Math.abs(a.currentA)>=Math.abs(b.currentA)?a:b);
 const apparentOhm=Math.abs(best.currentA)>1e-15&&Math.abs(best.measuredA)>1e-15?best.measuredV/best.measuredA:null;
 return {schema,deviceId:'09-03',model:'2450 benchtop/front banana',origin:'simulated',sampleId:c.sampleId,inputRevision:c.inputRevision,revision:c.inputRevision+1,contacts:[...c.contacts],configuration:{...c,contacts:[...c.contacts]},units:{timeS:'s',request:c.mode==='V'?'V':'A',currentA:'A',dutV:'V',terminalV:'V',sensedV:'V',measuredV:'V',measuredA:'A',apparentOhm:'Ω'},points,apparentOhm,continuity:apparentOhm===null?null:apparentOhm<=c.continuityOhm,complianceCount:points.filter(p=>p.compliance).length,provenance:{solver:'linear-ohmic-dual-source/1',dataset:null,noise:c.noise?'seeded synthetic 1 µV and 1 nA Gaussian standard deviations':'disabled',chronology:'First point at t=0; uniform simulated dwell; no transient dynamics.',history:[{deviceId:'09-03',operation:'DC sweep',parentRevision:c.inputRevision,resultRevision:c.inputRevision+1}]}};
}
// These same actions are usable by mouse, keyboard or XR input, without a browser.
export const initial=()=>({config:defaults(),result:null,lastRevision:0,output:false,error:''});
export function act(s,action,value){
 const idle={...s,output:false,result:null,error:''};
 if(action==='preset')return initial();
 if(action==='load')return {...idle,config:{...s.config,connected:!s.config.connected}};
 if(action==='sense')return {...idle,config:{...s.config,sense:s.config.sense===4?2:4}};
 if(action==='senseLeads')return {...idle,config:{...s.config,senseConnected:!s.config.senseConnected}};
 if(action==='set')return {...idle,config:{...s.config,...value},lastRevision:value?.sampleId!==undefined&&value.sampleId!==s.config.sampleId?0:s.lastRevision};
 if(action==='off')return {...s,output:false,error:''};
 if(action==='output'&&s.output)return act(s,'off');
 if(action==='run'||action==='output'){try{const result=solve({...s.config,inputRevision:s.lastRevision});return {...s,output:true,error:'',result,lastRevision:result.revision}}catch(e){return {...idle,error:e.message}}}
 throw Error('Unknown action: '+action);
}
export function toCSV(r){
 const safe=x=>'"'+String(x).replace(/"/g,'""')+'"',k=['k','timeS','request','currentA','dutV','terminalV','sensedV','measuredV','measuredA','compliance'];
 return ['sampleId,revision,hiContact,loContact,origin,'+k.join(','),...r.points.map(p=>[safe(r.sampleId),r.revision,...r.contacts.map(safe),'simulated',...k.map(a=>p[a])].join(','))].join('\n')+'\n';
}
export function toWaveform(r){
 return {schema:'bts.analog-waveform.v1',sampleId:r.sampleId,revision:r.revision,origin:'simulated',dtS:r.configuration.dwellS,channels:[{id:r.contacts.join('_to_')+'_voltage',unit:'V',samples:r.points.map(p=>p.measuredV)}],provenance:{sourceDeviceId:'09-03',sourceSchema:r.schema,contacts:r.contacts,description:'DC sweep samples; no inter-point dynamics represented.'}};
}
