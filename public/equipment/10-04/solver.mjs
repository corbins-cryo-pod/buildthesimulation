import {defaults, sweep as sharedSweep} from '../10-01/solver.mjs';
export const fixture=Object.freeze({schema:'bts.passive-clamp-fixture.v1',sampleId:defaults.sampleId,parentRevision:defaults.parentRevision,rsMOhm:defaults.rsMOhm,rlMOhm:defaults.rmMOhm,cPf:defaults.cmPf});
export const ranges=Object.freeze({low:{limitA:2e-6,scale:5e6},medium:{limitA:20e-9,scale:5e8},high:{limitA:200e-12,scale:5e10}});
export const calibrationId='VIRTUAL-EPC10-ANALYTIC-RC-1';
export const initial=()=>({fixture:{...fixture},settings:{mode:'IC',holding:0,step:20,durationMs:100,range:'medium'},powered:true,connected:true,host:true,result:null,count:0});
function verifyFixture(q){
 if(q?.schema!=='bts.passive-clamp-fixture.v1'||typeof q.sampleId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/u.test(q.sampleId)||!Number.isSafeInteger(q.parentRevision)||q.parentRevision<0||q.parentRevision>1e8)throw Error('Use a labeled inert resistor/capacitor fixture JSON.');
 for(const [k,l,h] of [['rsMOhm',0,50],['rlMOhm',10,1000],['cPf',1,250]])if(!Number.isFinite(q[k])||q[k]<l||q[k]>h)throw Error(k+' outside the supported virtual range.');
 return {schema:q.schema,sampleId:q.sampleId,parentRevision:q.parentRevision,rsMOhm:q.rsMOhm,rlMOhm:q.rlMOhm,cPf:q.cPf};
}
function verifySettings(p){
 const max=p.mode==='IC'?200:100;
 if(!['IC','VC'].includes(p.mode)||!Object.hasOwn(ranges,p.range)||!Number.isFinite(p.holding)||!Number.isFinite(p.step)||Math.abs(p.holding)>max||Math.abs(p.step)>max||Math.abs(p.holding+p.step)>max||!Number.isFinite(p.durationMs)||p.durationMs<1||p.durationMs>500)throw Error('Use a supported mode/range, limits of ±200 pA IC or ±100 mV VC including hold plus step, and 1–500 ms duration.');
 return p;
}
export function run(s=initial()){
 if(!s.powered||!s.host||!s.connected)throw Error('Enable the virtual amplifier, host and dummy headstage link first.');
 const f=verifyFixture(s.fixture),p=verifySettings(s.settings);
 if(p.mode==='VC'&&f.rsMOhm<.1)throw Error('Voltage clamp needs series resistance of at least 0.1 MΩ in this bandwidth-free model.');
 const a=sharedSweep({...defaults,mode:p.mode,sampleId:f.sampleId,parentRevision:f.parentRevision,rsMOhm:f.rsMOhm,rmMOhm:f.rlMOhm,cmPf:f.cPf,holding:p.holding,step:p.step,durationMs:p.durationMs,gain:1});
 const cc=p.mode==='IC',range=cc?{limitA:null,scale:10}:ranges[p.range],values=cc?a.columns.electrodeV:a.columns.currentA,rail=cc?10:range.limitA*range.scale;
 const clipped=values.map(v=>Math.abs(v*range.scale)>rail+1e-12),monitorV=values.map(v=>Math.max(-rail,Math.min(rail,v*range.scale)));
 return {schema:'bts.heka-passive-clamp.v1',equipmentId:'10-04',sampleId:f.sampleId,parentRevision:f.parentRevision,revision:f.parentRevision+1,runSequence:s.count+1,calibrationId,mode:p.mode,
  provenance:'Simulated resistor-capacitor dummy; shares BuildTheSimulation 10-01 circuit, not a device calibration or biological trace.',fixture:f,settings:p,
  acquisition:{dtS:a.dtS,preS:a.settings.preS,durationS:a.settings.holdDurationS,postS:a.settings.postS,monitorScaleVPerSI:range.scale,vcCurrentLimitA:range.limitA,physicalPrimaryUnit:cc?'V':'A',clockHz:1/a.dtS},
  units:{timeS:'s',commandSI:cc?'A':'V',circuitNodeV:'V',electrodeV:'V',currentA:'A',monitorV:'V',clipped:'boolean'},
  summary:{tauMs:a.summary.tauMs,settledPrimarySI:a.summary.settledPrimarySI,clippedSamples:clipped.filter(Boolean).length,peakAbsPrimarySI:values.reduce((m,v)=>Math.max(m,Math.abs(v)),0)},
  records:{timeS:a.columns.timeS,commandSI:a.columns.commandSI,circuitNodeV:a.columns.membraneV,electrodeV:a.columns.electrodeV,currentA:a.columns.currentA,monitorV,clipped}};
}
export function waveform(a,limit=a.records.monitorV.length){
 return {schema:'bts.analog-waveform.v1',sampleId:a.sampleId,parentRevision:a.parentRevision,revision:a.revision,dtS:a.acquisition.dtS,t0S:0,startS:0,kind:'simulated electronic clamp monitor',source:'10-04 HEKA EPC 10 USB virtual monitor',channels:[{id:'EPC10-PRIMARY',unit:'V',samples:a.records.monitorV.slice(0,limit)}],provenance:{source:'10-04',classification:'simulated',scaleVPerPhysicalSI:a.acquisition.monitorScaleVPerSI,physicalUnit:a.acquisition.physicalPrimaryUnit,calibrationId:a.calibrationId,clippedSamples:a.records.clipped.slice(0,limit).filter(Boolean).length,partial:limit<a.records.monitorV.length}};
}
export function dispatch(s,a,v){
 const ok=(state,message)=>({ok:true,state,message});
 try{
  if(a==='reset')return ok(initial(),'Ready equivalent electronic dummy connected.');
  if(a==='power'||a==='host'||a==='connect'){
   const k={power:'powered',host:'host',connect:'connected'}[a];return ok({...s,[k]:!s[k],result:null},'Virtual '+k+' '+(s[k]?'disabled':'enabled')+'.');
  }
  if(a==='settings'){
   const settings=verifySettings({...s.settings,...v});return ok({...s,settings,result:null},'Acquisition settings updated.');
  }
  if(a==='mode'){
   if(!['IC','VC'].includes(v))throw Error('Choose current or voltage clamp.');
   return dispatch(s,'settings',{mode:v,holding:0,step:v==='IC'?20:10});
  }
  if(a==='fixture'||a==='import'){
   const f=verifyFixture(a==='import'?v:{...s.fixture,...v});return ok({...s,fixture:f,result:null},'Electronic dummy parameters updated.');
  }
  if(a==='run')return ok({...s,result:run(s),count:s.count+1},'Analytic dummy trace calculated on the shared sample clock.');
  throw Error('Unknown station action.');
 }catch(e){return {ok:false,state:s,message:e.message};}
}
