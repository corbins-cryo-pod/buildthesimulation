// Original passive, non-biological virtual fixture. No hardware-control calls or wet-lab instructions.
export const roles=Object.freeze(['WE','RE','CE']);
export const limits=Object.freeze({gapMm:[2,30],areaMm2:[4,400],sigmaSm:[.05,5],temperatureC:[5,50],rpOhm:[1,100000],capUf:[.01,1000],amplitudeMv:[.1,30],startHz:[.1,100000],stopHz:[.1,100000],count:[2,181]});
export const defaults=Object.freeze({cellId:'BTS-3E-DEMO',contactId:'WE-01',parentRevision:0,gapMm:10,areaMm2:100,sigmaSm:1,temperatureC:22,model:'slab',rpOhm:500,capUf:10,amplitudeMv:10,startHz:1,stopHz:10000,count:49});
export const ports=Object.freeze({WE:'BTS-CELL-WE',RE:'BTS-CELL-RE',CE:'BTS-CELL-CE'});
const defaultWiring=()=>({WE:'WE',RE:'RE',CE:'CE'});
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(x);
const problem=(code,message)=>({ok:false,code,message});
const current=(amplitude,x,y)=>{
 const d=x*x+y*y;return [amplitude*x/d,y===0?0:-amplitude*y/d]
};
export function impedance(rs,rp,c,f){
 if(rp===null)return [rs,0];
 const w=2*Math.PI*f*rp*c,k=rp/(1+w*w);
 return [rs+k,-k*w]
}
export function measure(input={},wiring=defaultWiring(),lifted=false){
 const p={...defaults,...input};
 if(lifted)return problem('open-fixture','Lower the cartridge to establish the specified path before acquiring.');
 if(wiring?.RE==='open'||wiring?.RE==null)return problem('missing-reference','Reference lead is open. No WE–RE voltage can be defined in this three-electrode experiment.');
 if(roles.some(k=>wiring[k]==='open'||wiring[k]==null))return problem('open-current-path','Connect the working and counter leads to complete the current path.');
 if(roles.some(k=>wiring[k]!==k))return problem('incorrect-assignment','Lead map does not match the fixture: assign WE→WE, RE→RE and CE→CE. No two-electrode fallback is inferred.');
 if(!validId(p.cellId)||!validId(p.contactId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>99999999)return problem('identity','Enter an alphanumeric sample and contact ID (dashes, periods and underscores allowed).');
 if(!['slab','parallel-rc'].includes(p.model))return problem('model','Choose the uniform slab or the slab with passive interface.');
 for(const [field,[lo,hi]] of Object.entries(limits)){
  if(p.model==='slab'&&['rpOhm','capUf'].includes(field))continue;
  if(!Number.isFinite(p[field])||p[field]<lo||p[field]>hi)return problem('setting',field+' must be within '+lo+'–'+hi+'.');
 }
 if(!Number.isInteger(p.count)||!(p.startHz<p.stopHz))return problem('sweep','Use an integer point count and a stop frequency above the start.');
 const geometry={gapM:p.gapMm/1000,areaM2:p.areaMm2/1e6,conductivitySm:p.sigmaSm,declaredTemperatureC:p.temperatureC};
 const cellConstant=geometry.gapM/geometry.areaM2,rs=cellConstant/p.sigmaSm,rp=p.model==='parallel-rc'?p.rpOhm:null,cap=rp===null?null:p.capUf/1e6,v=p.amplitudeMv/1000;
 const samples=[];
 for(let i=0;i<p.count;i++){
  const f=i===p.count-1?p.stopHz:p.startHz*(p.stopHz/p.startHz)**(i/(p.count-1));const [x,y]=impedance(rs,rp,cap,f);
  const [a,b]=current(v,x,y);samples.push([f,x,y,Math.hypot(x,y),y===0?0:Math.atan2(y,x)*180/Math.PI,a,b,Math.hypot(a,b)])
 }
 return {ok:true,result:{
  schema:'bts.cell.three-electrode.v1',deviceId:'09-12',modelRevision:'BTS-CELL-3E/Mk-I',sampleId:p.cellId,contactId:p.contactId,parentRevision:p.parentRevision,revision:p.parentRevision+1,
  provenance:{origin:'simulated',equation:'ideal uniform slab; optional parallel RC in series; sensed WE–RE transfer',hardwareCalibration:false},
  terminals:{working:{id:ports.WE,role:'WE',function:'source current and voltage sense positive'},reference:{id:ports.RE,role:'RE',function:'ideal voltage sense negative; zero current'},counter:{id:ports.CE,role:'CE',function:'return current; counter impedance not modeled'}},leadMap:{...wiring},
  geometry,cellConstantPerM:cellConstant,cellCircuit:{kind:rp===null?'series-r':'series-r-plus-parallel-rc',solutionOhm:rs,interfaceOhm:rp,interfaceFarad:cap,referredTo:'WE-minus-RE',referenceInputIdeal:true},
  excitation:{voltageRmsV:v,startHz:p.startHz,stopHz:p.stopHz,samples:p.count,grid:'log'},
  convention:{phasor:'exp(+jωt)',current:'positive into WE; ideal CE return',referencePlane:'working-side uniform path ends at reference sensing plane, not CE',temperature:'metadata only; conductivity is already supplied at this temperature'},
  columns:['frequency_Hz','Z_real_ohm','Z_imag_ohm','Z_magnitude_ohm','Z_phase_deg','I_real_Arms','I_imag_Arms','I_magnitude_Arms'],samples,
  handoff:{intendedConsumer:'09-01 potentiostat',kind:'cell-terminal-model + reference spectrum',requiresAdapter:true,notVendorDataFile:true}
 }};
}
export const interaction=Object.freeze({Socket_WE:'toggleWE',Clip_WE:'toggleWE',Socket_RE:'toggleRE',Clip_RE:'toggleRE',Socket_CE:'toggleCE',Clip_CE:'toggleCE',Handle_lift:'toggleLift'});
export function createStation(){
 let config={...defaults},wiring=defaultWiring(),lifted=false,result=null,error=null;
 const read=()=>({config:{...config},wiring:{...wiring},lifted,result,error});
 function dispatch(action,arg){
  result=null;error=null;
  if(action==='defaults'){config={...defaults};wiring=defaultWiring();lifted=false}
  else if(action==='configure'){for(const [k,v] of Object.entries(arg||{}))if(Object.hasOwn(defaults,k))config[k]=v;}
  else if(action==='wire'){if(!roles.includes(arg?.lead)||!['open',...roles].includes(arg?.terminal))throw Error('Invalid lead assignment');wiring[arg.lead]=arg.terminal;}
  else if(/^toggle(WE|RE|CE)$/.test(action)){const role=action.slice(6);wiring[role]=wiring[role]==='open'?role:'open';}
  else if(action==='toggleLift')lifted=!lifted;
  else if(action==='acquire'){const a=measure(config,wiring,lifted);if(a.ok)result=a.result;else error={code:a.code,message:a.message};}
  else throw Error('Unknown station action: '+action);
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(interaction,n)?dispatch(interaction[n]):null};
}
export function toCSV(result){
 const p=result;
 return ['# sampleId='+p.sampleId,'# contactId='+p.contactId,'# parentRevision='+p.parentRevision,'# revision='+p.revision,'# source=09-12 ideal passive three-electrode fixture','# kind=simulated','# phasor=exp(+jwt)',p.columns.join(','),...p.samples.map(row=>row.join(','))].join('\n')+'\n';
}

// All projections are glTF-local metres; desktop and VR adapters use this same pose.
export function projectPose(state){
 const bounded=k=>{
  const v=state.config[k], [lo,hi]=limits[k];return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):defaults[k];
 };
 const gap=bounded('gapMm')/1000,side=Math.sqrt(bounded('areaMm2'))/1000,sites={WE:.007-gap,RE:.007,CE:.025};
 const clips={};for(const [i,k] of roles.entries()){
  const t=state.wiring[k],open=t==='open';
  clips[k]={translation:[open?(i-1)*.010:sites[t]-sites[k],open?.105:.088,open?-.012:t!==k?-(i+1)*.004:0],yawRad:open?(i-1)*.38:0};
 }
 return {liftY:state.lifted?.038:0,workingX:sites.WE,side,conductiveVolume:[gap,side,side],conductiveCenterX:.007-gap/2,conductiveVisible:!state.lifted,clips};
}
