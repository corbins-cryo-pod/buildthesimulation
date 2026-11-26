import {defaults, measure,limits} from './dma.mjs';
export const targets=Object.freeze({Furnace_cap:'toggleFurnace',Film_fixed_grip:'toggleCoupon',Film_moving_grip:'toggleCoupon',Panel_measure_button:'acquire'});
export function createStation(){
 let config={...defaults},open=false,loaded=true,result=null,error=null,phaseDeg=0;
 const read=()=>({config:{...config},open,loaded,result,error,phaseDeg});
 function dispatch(action,arg){
  if(action==='viewPhase'){if(Number.isFinite(arg))phaseDeg=Math.min(360,Math.max(0,arg));return read();}
  error=null;result=null;
  if(action==='reset'){config={...defaults};open=false;loaded=true;phaseDeg=0;}
  else if(action==='configure'){for(const [k,v] of Object.entries(arg??{}))if(Object.hasOwn(defaults,k))config[k]=v;}
  else if(action==='toggleFurnace')open=!open;
  else if(action==='toggleCoupon'){if(open)loaded=!loaded;else error={code:'access',message:'Raise the virtual furnace before changing the coupon.'};}
  else if(action==='acquire'){const r=measure(config,loaded,open);if(r.ok)result=r.result;else error=r;}
  else throw Error('Unknown DMA action '+action);
  return read();
 }
 return {read,dispatch,hit:name=>Object.hasOwn(targets,name)?dispatch(targets[name]):null};
}
export function pose(s){
 function get(k){const n=s.config[k],b=limits[k];return Number.isFinite(n)?Math.max(b[0],Math.min(b[1],n)):defaults[k];}
 const g=get('gaugeMm')/1000,a=s.result?get('strainPercent')/100*Math.cos(s.phaseDeg*Math.PI/180):0,L=g*(1+a);
 return {furnaceLiftM:s.open?.15:0,movingGripYM:.286-L,couponCenterYM:.286-L/2,couponDimensionsM:[get('widthMm')/1000,L,get('thicknessMm')/1000],couponVisible:s.loaded};
}
