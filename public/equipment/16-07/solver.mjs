export const fixture=Object.freeze({sampleId:'BTS-INERT-DUMMY-16-07',sampleRevision:'dummy-r1',type:'uniform-temperature inert virtual mass'});
export const defaults=Object.freeze({mode:'held',setC:28,bath0C:21,dummy0C:18,tauBathS:60,tauDummyS:60,durationS:180});
export const limits=Object.freeze({setC:[15,45],bath0C:[10,45],dummy0C:[10,45],tauBathS:[5,600],tauDummyS:[5,600],durationS:[1,1200]});
export function validate(spec){
 if(!spec||!['held','relaxing'].includes(spec.mode))throw Error('Choose a held or relaxing bath.');
 const p={mode:spec.mode};
 for(const [k,[lo,hi]] of Object.entries(limits)){const v=spec[k];if(!Number.isFinite(v)||v<lo||v>hi)throw Error(k+' must be in '+lo+'–'+hi+'.');p[k]=v}
 return p;
}
export function temperature(spec,t){
 const p=validate(spec);
 if(!Number.isFinite(t)||t<0||t>p.durationS)throw Error('Time is outside the simulation window.');
 const a=1/p.tauDummyS, b=1/p.tauBathS, e=Math.exp(-a*t), initial=p.dummy0C-p.setC;
 if(p.mode==='held')return {timeS:t,bathC:p.setC,dummyC:p.setC+initial*e};
 const d=p.bath0C-p.setC,delta=a-b;
 const conv=delta===0?a*t*e:a*e*Math.expm1(delta*t)/delta;
 return {timeS:t,bathC:p.setC+d*Math.exp(-b*t),dummyC:p.setC+initial*e+d*conv};
}
export function run(spec,revision=1,parentRevision=null){
 const p=validate(spec),x=Array.from({length:121},(_,i)=>i===120?p.durationS:p.durationS*i/120);
 if(p.tauDummyS<=p.durationS&&!x.includes(p.tauDummyS))x.push(p.tauDummyS);
 x.sort((a,b)=>a-b);
 return {schema:'bts.thermal-bath.history.v1',deviceId:'16-07',origin:'synthetic-lumped-model',specimen:fixture,revision,parentRevision,parameters:p,
 units:{timeS:'s',bathC:'degree Celsius',dummyC:'degree Celsius'},simulationClock:{startS:0,exposureStartS:0,exposureEndS:p.durationS,basis:'relative simulated time; no wall-clock dependence'},
 history:x.map(t=>temperature(p,t)),oneTauReference:p.mode==='held'?{timeS:p.tauDummyS,gapClosedFraction:p.setC===p.dummy0C?null:-Math.expm1(-1),initialGapC:p.setC-p.dummy0C}:null};
}
export const blank=()=>({lidOpen:false,loaded:true,revision:0,settings:{...defaults},result:null,cursor:0});
export function action(s,{type,payload}){
 switch(type){
  case 'lid':return {...s,lidOpen:!s.lidOpen};
  case 'load':if(!s.lidOpen)throw Error('Open the display lid before placing or removing the dummy.');return {...s,loaded:!s.loaded,result:null,cursor:0};
  case 'configure':return {...s,settings:validate(payload),result:null,cursor:0};
  case 'run': {if(s.lidOpen||!s.loaded)throw Error('A loaded inert dummy and closed lid are required.');const settings=payload===undefined?s.settings:validate(payload);return {...s,settings,revision:s.revision+1,result:run(settings,s.revision+1,s.revision||null),cursor:0};}
  case 'seek':if(!s.result||!Number.isInteger(payload)||payload<0||payload>=s.result.history.length)throw Error('Run first and select an existing simulated time.');return {...s,cursor:payload};
  case 'reset':return blank();
  default:throw Error('Unknown bath action.');
 }
}
export function csv(r){
 return ['sample_id,sample_revision,output_revision,time_s,bath_c,dummy_c',...r.history.map(x=>[r.specimen.sampleId,r.specimen.sampleRevision,r.revision,x.timeS,x.bathC,x.dummyC].join(','))].join('\n')+'\n';
}
