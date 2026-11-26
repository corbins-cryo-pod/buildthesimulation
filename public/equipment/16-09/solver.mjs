export const specification=Object.freeze({enclosureMm:[220,105,335],ceramicMm:[180,180],thermalBoundaryC:[50,80],deviceRangeC:[50,500],setpointStepC:5,stirRpm:[100,1500],indicatorC:50});
export const scenario=Object.freeze({schema:'bts.hotplate-phantom.v1',vesselId:'inert-witness-vessel',revision:1,ambientC:22,mode:'equilibrium'});
export const tau=Object.freeze({plateS:25,phantomS:100});
const range=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
export function validate(f){
 if(f?.schema!=='bts.hotplate-phantom.v1'||typeof f.vesselId!=='string'||!/^[a-z0-9_-]{1,64}$/i.test(f.vesselId)||!Number.isInteger(f.revision)||f.revision<1||f.revision>1e6||!range(f.ambientC,15,35)||!['equilibrium','transfer'].includes(f.mode))throw Error('Use a named inert phantom, valid revision, ambient 15–35 °C and equilibrium or transfer mode.');
 return {schema:f.schema,vesselId:f.vesselId,revision:f.revision,ambientC:f.ambientC,mode:f.mode};
}
export function evolve(plateC,vesselC,boundaryC,t){
 const a=Math.exp(-t/tau.plateS),b=Math.exp(-t/tau.phantomS);
 return {plateC:boundaryC+(plateC-boundaryC)*a,vesselC:boundaryC+(vesselC-boundaryC)*b+(plateC-boundaryC)*tau.plateS/(tau.plateS-tau.phantomS)*(a-b)};
}
export const isHot=s=>s.plateC>specification.indicatorC;
export const effectiveRpm=s=>s.power&&s.loaded&&s.stir?s.settings.rpm:0;
export function initial(f=scenario){
 f=validate(f);
 return {fixture:f,loaded:true,probe:true,power:true,heat:false,stir:false,settings:{setC:60,rpm:300,durationS:100},timeS:0,phaseTurns:0,plateC:f.ambientC,vesselC:f.ambientC,history:[],run:0};
}
const ok=(state,message)=>({ok:true,state,message}),fail=(state,message)=>({ok:false,state,message});
export function dispatch(s,a,v){
 if(a==='reset')return ok(initial(),'Restored the inert equilibrium example.');
 if(a==='import'||a==='fixture'){
  try{return ok(initial(a==='import'?v:{...s.fixture,...v}),'Restarted the virtual phantom.');}
  catch(e){return fail(s,e.message);}
 }
 if(a==='settings'){
  const j={...s.settings,...v};
  if(!range(j.setC,50,80)||j.setC%5!==0||!range(j.rpm,100,1500)||!Number.isInteger(j.rpm)||!range(j.durationS,1,300)||!Number.isInteger(j.durationS))return fail(s,'Use a virtual boundary in 5 °C steps from 50–80 °C, 100–1500 rpm and an integer 1–300 s.');
  return ok({...s,settings:j},'Virtual parameters applied.');
 }
 if(a==='power')return ok({...s,power:!s.power,heat:false,stir:false},s.power?'Virtual standby; any remaining warmth is retained.':'Virtual controls enabled.');
 if(a==='load'){
  if(s.heat||s.stir)return fail(s,'Disable the virtual heater and stir first.');
  return ok({...s,loaded:!s.loaded,probe:s.loaded?false:s.probe,vesselC:s.fixture.ambientC},s.loaded?'Removed the inert vessel.':'Placed the inert vessel.');
 }
 if(a==='probe')return s.loaded?ok({...s,probe:!s.probe},s.probe?'Removed the modeled probe.':'Inserted modeled probe.'):fail(s,'Place the inert vessel before inserting the probe.');
 if(a==='stir'){
  if(!s.power||!s.loaded)return fail(s,'Stir requires enabled controls and a loaded witness.');
  return ok({...s,stir:!s.stir},s.stir?'Virtual stirring off.':'Virtual stirring on.');
 }
 if(a==='heat'){
  if(s.fixture.mode!=='transfer')return fail(s,'Heating and cooling are disabled in the equilibrium witness.');
  if(!s.power||!s.loaded)return fail(s,'A loaded witness and enabled controls are required.');
  return ok({...s,heat:!s.heat},s.heat?'Boundary dropped to ambient; cooldown continues.':'Virtual plate boundary enabled.');
 }
 if(a==='run'){
  if(s.history.length>=20)return fail(s,'Reset to start a new virtual track.');
  const {durationS,setC}=s.settings,{ambientC,mode}=s.fixture,boundaryC=s.heat&&s.power?setC:ambientC;
  const count=Math.min(61,durationS+1),rpm=effectiveRpm(s);
  const data=Array.from({length:count},(_,i)=>{
   const dt=i*durationS/(count-1),temps=mode==='equilibrium'?{plateC:ambientC,vesselC:ambientC}:evolve(s.plateC,s.vesselC,boundaryC,dt);
   return {timeS:s.timeS+dt,plateC:temps.plateC,phantomC:s.loaded?temps.vesselC:null,probeC:s.loaded&&s.probe?temps.vesselC:null,agitationRpm:rpm,stirring:rpm>0,hotTop:isHot(temps),boundaryC:mode==='transfer'?boundaryC:null};
  });
  const last=data.at(-1);
  return ok({...s,run:s.run+1,timeS:last.timeS,phaseTurns:(s.phaseTurns+rpm*durationS/60)%1,plateC:last.plateC,vesselC:last.phantomC??ambientC,history:[...s.history,{segment:s.run+1,mode,loaded:s.loaded,heater:s.heat,probe:s.probe,data}]},'Calculated '+durationS+' virtual seconds.');
 }
 return fail(s,'Unknown action.');
}
export function exportRun(s){
 return {schema:'bts.hotplate-history.v1',equipmentId:'16-09',vesselId:s.fixture.vesselId,revision:s.fixture.revision,model:'Two coupled first-order thermal states with synthetic time constants; equilibrium mode disables all exchange.',units:{time:'s',temperature:'degC',agitation:'rpm'},provenance:'SIMULATED inert test phantom, not a certified process or device calibration.',fixture:s.fixture,segments:s.history};
}
