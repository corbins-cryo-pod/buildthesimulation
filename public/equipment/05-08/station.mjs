import {bounds,defaults,frame,measure,synthetic,cap} from './optics.mjs';
export const targets=Object.freeze({Stage_knob:'focusStep',Coupon:'toggleCoupon',Manual_syringe_knob:'deposit',Light_switch:'toggleLight',Camera_focus_knob:'capture'});
const error=(code,message)=>({code,message});
export function createStation(){
 let config={...defaults},loaded=true,deposited=false,light=true,image=null,imported=false,baseline=null,result=null,edge=null,err=null;
 const read=()=>({config:{...config},loaded,deposited,light,image,imported,baseline:baseline?{...baseline}:null,result,edge,error:err});
 const clear=()=>{image=null;baseline=null;imported=false;result=edge=null;};
 function dispatch(action,payload){
  err=null;result=edge=null;
  if(action==='reset'){config={...defaults};loaded=true;deposited=false;light=true;clear();}
  else if(action==='configure'){
   const old=config;config={...config};
   for(const [k,v] of Object.entries(payload||{}))if(Object.hasOwn(defaults,k))config[k]=v;
   if(!imported&&['noise','thetaDeg','volumeUl','imageRollDeg','umPerPx','focusMm'].some(k=>old[k]!==config[k]))clear();
  }else if(action==='toggleCoupon'){loaded=!loaded;deposited=false;clear();}
  else if(action==='toggleLight'){light=!light;if(!imported)clear();}
  else if(action==='focusStep'){
   config.focusMm=config.focusMm>=4?0:(config.focusMm+2);
   if(!imported)clear();
  }else if(action==='deposit'){
   clear();
   if(!loaded)err=error('coupon','Load the synthetic coupon before dosing.');
   else if(!Number.isFinite(config.volumeUl)||config.volumeUl<1||config.volumeUl>10)err=error('setting','Choose a 1–10 µL virtual drop.');
   else deposited=true;
  }else if(action==='capture'){
   clear();
   if(!loaded||!deposited)err=error('sample','Load a coupon and deposit the virtual drop before capturing.');
   else if(!light)err=error('illumination','Turn on the virtual LED backlight.');
   else if(!Number.isFinite(config.focusMm)||Math.abs(config.focusMm)>4)err=error('focus','Center the stage within ±4 mm of the virtual focus position.');
   else{const q=synthetic(config);if(q.ok)image=q.image;else err=error(q.code,q.message);}
  }else if(action==='importImage'){
   image=payload;imported=Boolean(image);baseline=image?{angleDeg:0,yAtCenterPx:Math.round(image.height*.74)}:null;
  }else if(action==='setBaseline'){
   baseline=payload;
  }else if(action==='fit'){
   if(!image)err=error('image','Capture a silhouette or import a side-view image before fitting.');
   else{
    const b=baseline??image.baseline??{angleDeg:0,yAtCenterPx:frame.baselineY};
    const q=measure(image,{...config,baseline:{...b,yAtCenterPx:b.yAtCenterPx+config.baselineShiftPx}});
    if(q.ok){result=q.result;edge=q.edge;}else err=error(q.code,q.message);
   }
  }else throw Error('Unknown 05-08 station action '+action);
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):null};
}
// glTF-local coordinates are in metres. Knobs are logical, cover retraction is illustrative.
export function pose(s){
 const f=Number.isFinite(s.config.focusMm)?Math.max(bounds.focusMm[0],Math.min(bounds.focusMm[1],s.config.focusMm)):0;
 const V=s.config.volumeUl,theta=s.config.thetaDeg,z=Number.isFinite(V)&&V>=1&&V<=10&&Number.isFinite(theta)&&theta>=40&&theta<=140?cap(theta,V):null;
 return {stageLiftM:f/1000,couponVisible:s.loaded,drop:(s.loaded&&s.deposited&&z)?{radiusM:z.radiusMm/1000,centerVM:z.centerVMm/1000,thetaRad:z.thetaDeg*Math.PI/180,heightM:z.heightMm/1000}:null,led:s.light};
}
