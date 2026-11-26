export const capacityG=109, stepG=.0001, vesselG=2;
export const resolutionMg=.1;
export const blank=()=>({doorOpen:false,vessel:false,weightG:0,tareG:0,rawPpm:0,gainCorrection:1,calibrationId:'AE100-NOMINAL-SIM-R1',calibrationRevision:0,seed:3407,noise:false,measurement:null,reads:0,ledger:[]});
export const gross=s=>(s.vessel?vesselG:0)+s.weightG;
export function quantize(g) {
 if(!Number.isFinite(g))throw Error('Nonfinite mass.');
 const d=Math.sign(g)*Math.floor(Math.abs(g)/stepG+.5+1e-10)*stepG;
 return d===0?0:Number(d.toFixed(4));
}
function random(i){
 let n=(i|0)>>>0;n=(n+0x9e3779b9)>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad)>>>0;n=Math.imul(n^(n>>>15),0x735a2d97)>>>0;return ((n^(n>>>15))>>>0)/4294967296;
}
export function sample(state){
 const g=gross(state),corrected=g*(1+state.rawPpm*1e-6)*state.gainCorrection;
 if(g>capacityG)return {status:'overload',nominalGrossG:g,displayG:null,trace:[]};
 if(state.doorOpen)return {status:'draft-open',nominalGrossG:g,displayG:null,trace:[]};
 const trace=Array.from({length:6},(_,i)=>{
  const drift=.002*Math.max(0,1-i/3)*Math.cos(2.1*i);
  const noise=state.noise?(random(state.seed+state.reads*101+i)*2-1)*.00012:0;
  return {timeS:i,signalGrossG:corrected+drift+noise};
 });
 const tail=trace.slice(-3).map(x=>x.signalGrossG),mean=tail.reduce((a,b)=>a+b,0)/3,span=Math.max(...tail)-Math.min(...tail);
 return {status:span<=.00018?'stable':'unstable',nominalGrossG:g,estimateGrossG:mean,stabilitySpanG:span,displayG:span<=.00018?quantize(mean-state.tareG):null,trace};
}
function stable(s){if(s.doorOpen||!s.measurement||s.measurement.status!=='stable')throw Error('Close the shield and settle to a valid reading first.');}
function record(s){
 stable(s);const m=s.measurement,revision=s.ledger.length+1;
 const entry={revision,parentRevision:revision===1?null:revision-1,sampleId:s.weightG?'INERT-R1-WEIGHT':'INERT-R1-VESSEL',fixtureId:'BTS-AE100-TEACHING-KIT',result:'simulated',nominalGrossG:m.nominalGrossG,displayG:m.displayG,tareG:s.tareG,calibrationId:s.calibrationId,displayStepG:stepG,optionalNoise:{enabled:s.noise,seed:s.seed},stabilitySpanG:m.stabilitySpanG,simulatedTimeS:5,trace:m.trace};
 return {...s,ledger:[...s.ledger,entry]};
}
export function action(s,{type,payload}){
 switch(type){
  case 'door':return {...s,doorOpen:!s.doorOpen,measurement:null};
  case 'vessel': if(!s.doorOpen)throw Error('Open the draft shield before loading the vessel.');return {...s,vessel:true,measurement:null};
  case 'weight': if(!s.doorOpen)throw Error('Open the draft shield before loading a weight.');if(!Number.isFinite(payload)||payload<=0||payload>150)throw Error('Enter an inert virtual load above 0 and at most 150 g.');return {...s,weightG:payload,measurement:null};
  case 'unload': if(!s.doorOpen)throw Error('Open the draft shield before unloading.');return {...s,vessel:false,weightG:0,measurement:null};
  case 'settle': return {...s,measurement:sample(s),reads:s.reads+1};
  case 'tare': stable(s);return {...s,tareG:s.measurement.estimateGrossG,measurement:{...s.measurement,displayG:0}};
  case 'noise': if(!Number.isInteger(payload?.seed)||payload.seed<0||payload.seed>2147483647||typeof payload?.enabled!=='boolean')throw Error('Use a 0–2147483647 integer seed.');return {...s,seed:payload.seed,noise:payload.enabled,reads:0,measurement:null};
  case 'gain': if(!Number.isFinite(payload)||Math.abs(payload)>1000)throw Error('Virtual gain error is limited to ±1000 ppm.');return {...s,rawPpm:payload,gainCorrection:1,tareG:0,calibrationId:'AE100-UNCORRECTED-SIM-R1',measurement:null};
  case 'calibrate': {
   stable(s);if(gross(s)!==0)throw Error('The virtual pan must be empty for calibration.');
   const i=s.calibrationRevision+1;
   return {...s,calibrationRevision:i,calibrationId:'AE100-SYNTHETIC-100G-R'+i,gainCorrection:1/(1+s.rawPpm*1e-6),tareG:0,measurement:null};
  }
  case 'record':return record(s);
  case 'example':return acceptance().state;
  case 'reset':return blank();
  default:throw Error('Unknown balance action.');
 }
}
export function acceptance(){
 let s=blank();const go=(type,payload)=>{s=action(s,{type,payload});return s};
 go('door');go('vessel');go('door');const before=go('settle').measurement;go('tare');const zero=go('record').measurement;
 go('door');go('weight',5);go('door');go('settle');const after=go('record').measurement;
 return {before,zero,after,state:s};
}
export function exportLedger(s){
 return {schema:'bts.balance.weighing.v1',deviceId:'16-06',origin:'synthetic',units:'g',capacityG,displayStepG:stepG,convention:'gross capacity before tare; positive and negative ties round away from zero',readings:s.ledger};
}
