import {defaults,scan} from './diffraction.mjs';
// Virtual interactions shared by browser and XR. Does not connect to any equipment.
export const interactions=Object.freeze({Door_handle_left:'toggleDoor',Door_handle_right:'toggleDoor',Specimen_holder:'toggleSample',Console_scan_key:'scan',Console_angle_knob:'stepAngle'});
export function createStation(){
 let config={...defaults},open=false,loaded=true,imported=null,result=null,error=null,angle=35;
 const read=()=>({config:{...config},open,loaded,imported:imported?.filename??null,result,error,angle});
 function dispatch(action,arg){
  error=null;
  if(action==='setAngle'||action==='stepAngle'){
   const t=action==='stepAngle'?(angle+5>150?10:angle+5):arg;
   if(Number.isFinite(t)&&t>=10&&t<=150)angle=t;
   return read();
  }
  result=null;
  if(action==='reset'){config={...defaults};angle=35;open=false;loaded=true;imported=null;}
  else if(action==='configure'){
   for(const [k,v] of Object.entries(arg??{}))if(Object.hasOwn(defaults,k))config[k]=v;
  }else if(action==='toggleDoor')open=!open;
  else if(action==='toggleSample'){
   if(!open)error={code:'virtual-access',message:'Open the virtual view cabinet before changing the display specimen.'};
   else loaded=!loaded;
  }else if(action==='import'){
   imported=arg;config={...config,source:'import'};
  }else if(action==='scan'){
   if(open)error={code:'open-view',message:'Close the virtual cabinet before starting the synthetic sweep.'};
   else if(!loaded)error={code:'empty-holder',message:'Seat a virtual specimen before starting the synthetic sweep.'};
   else{const q=scan(config,imported);if(q.ok){result=q.result;angle=result.peaks.find(p=>p.status==='isolated')?.centerDeg??result.spectrum[0][0];}else error={code:q.code,message:q.message};}
  }else throw Error('Unknown 05-12 station action '+action);
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(interactions,n)?dispatch(interactions[n]):null};
}
export const radius=0.185;
export function pose(state){
 const a=state.angle*Math.PI/180;
 return {leftDoorX:state.open?-.575:-.286,rightDoorX:state.open?.575:.286,sampleVisible:state.loaded,detectorAngleRad:-a,sampleAngleRad:-a/2,detectorOffsetM:[radius*Math.cos(a),0,radius*Math.sin(a)]};
}
