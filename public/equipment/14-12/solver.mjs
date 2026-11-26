// Ideal imposed air schedule and a lumped, inert non-biological package. No physical chamber commands.
export const schema='bts.chamber-phantom.v1';
export const defaults=()=>({sampleId:'inert-package-01',initialC:20,stepC:40,rhPercent:65,tauS:120,holdS:480});
export const initial=()=>({config:defaults(),loaded:true,door:false,result:null,error:'',code:'',revision:0});
const finite=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const fail=(code,t)=>{const e=Error(t);e.code=code;throw e};
export function validate(c){
 if(!c||typeof c.sampleId!=='string'||!c.sampleId.trim()||c.sampleId.length>96)fail('BAD_SAMPLE','Enter an inert package ID.');
 if(!finite(c.initialC,20,75)||!finite(c.stepC,20,75)||!finite(c.rhPercent,60,85))fail('OUTSIDE_PROFILE','Outside the virtual humidity profile: 20–75 °C and 60–85% RH.');
 if(!finite(c.tauS,10,3600)||!finite(c.holdS,10,14400))fail('BAD_TIMING','Use time constant 10–3600 s and hold 10–14,400 s.');
}
const temp=(cold,air,t,tau)=>cold+(air-cold)*(-Math.expm1(-t/tau));
export function solve(c,inputRevision=0){
 validate(c);if(!Number.isSafeInteger(inputRevision)||inputRevision<0)fail('BAD_REVISION','Invalid revision.');
 const row=tS=>({tS,airC:c.stepC,phantomC:temp(c.initialC,c.stepC,tS,c.tauS),targetRH:c.rhPercent});
 const ts=Array.from({length:121},(_,i)=>c.holdS*i/120);
 if(c.tauS<=c.holdS&&!ts.includes(c.tauS))ts.push(c.tauS);ts.sort((a,b)=>a-b);
 return {schema,deviceId:'14-12',model:'ESPEC SH-262 / solid door / 22.5 L',kind:'simulated',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,
  configuration:{...c},units:{tS:'s',airC:'°C',phantomC:'°C',targetRH:'% RH',fraction:'1'},
  schedule:{initialAirC:c.initialC,segments:[{startS:0,durationS:c.holdS,setpointC:c.stepC,targetRH:c.rhPercent}],interpretation:'Ideal instantaneous change of air, not measured chamber ramp'},
  points:ts.map(row),oneTau:c.tauS<=c.holdS?{tS:c.tauS,temperatureC:row(c.tauS).phantomC,fraction:c.stepC===c.initialC?null:-Math.expm1(-1)}:null,
  provenance:{simulated:'ideal imposed air and lumped inert thermal phantom',deviceEnvelope:'conservative educational subwindow, not factory operating limits',humidity:'programmed RH only; no moisture dynamics',measuredHardware:false,history:[{deviceId:'14-12',operation:'virtual step/hold',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,p){
 const idle={...s,result:null,error:'',code:''};
 if(id==='reset')return initial();
 if(id==='door')return {...idle,door:!s.door};
 if(id==='load')return s.door?{...idle,loaded:!s.loaded}:{...s,error:'Open the virtual door to change the package.',code:'DOOR_CLOSED'};
 if(id==='set')return {...idle,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){try{if(s.door)fail('DOOR_OPEN','Close the virtual door before running.');if(!s.loaded)fail('NO_SAMPLE','Place an inert package first.');const result=solve(s.config,s.revision);return {...s,result,error:'',code:'',revision:result.revision};}catch(e){return {...idle,error:e.message,code:e.code||'INVALID'};}}
 throw Error('Unknown chamber action');
}
export function csv(r){const q=x=>'"'+String(x).replace(/"/g,'""')+'"';return ['sampleId,revision,origin,time_s,air_setpoint_C,phantom_C,target_percent_RH',...r.points.map(p=>[q(r.sampleId),r.revision,r.kind,p.tS,p.airC,p.phantomC,p.targetRH].join(','))].join('\n')+'\n';}
