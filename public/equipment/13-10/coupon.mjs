export const coupon=Object.freeze({id:'BTS-ACE600-VISUAL-01',revision:'1',kind:'immutable-synthetic-geometry',sizeMm:Object.freeze([20,12]),pitchMm:.5,boundsMm:Object.freeze([6,3,14,9]),heightNm:36});
export const targets=Object.freeze({Pick_Raised_Point:'raised',Pick_Surround_Point:'surround',Read_Passive_Step:'read'});
const columns=40,rows=24;
const valid=(v,max)=>Number.isFinite(v)&&v>=0&&v<max;
export function heightAt(xMm,yMm){
 if(!valid(xMm,20)||!valid(yMm,12))throw new RangeError('Point outside coupon. X must lie in [0,20) mm; Y in [0,12) mm.');
 const [x0,y0,x1,y1]=coupon.boundsMm;
 return xMm>=x0&&xMm<x1&&yMm>=y0&&yMm<y1?coupon.heightNm:0;
}
export function scanRow(row){
 if(!Number.isInteger(row)||row<0||row>=rows)throw new RangeError('Row must be an integer 0–23.');
 const yMm=(row+.5)*coupon.pitchMm;
 const points=Array.from({length:columns},(_,column)=>{const xMm=(column+.5)*coupon.pitchMm;return {column,xMm,heightNm:heightAt(xMm,yMm)};});
 return {row,yMm,points};
}
export function readStep({row,column}){
 if(!Number.isInteger(column)||column<0||column>=columns)throw new RangeError('Column must be an integer 0–39.');
 const {yMm,points}=scanRow(row),point=points[column],reference={xMm:2.25,yMm:6.25,heightNm:heightAt(2.25,6.25)};
 return {point:{xMm:point.xMm,yMm,heightNm:point.heightNm},reference,stepNm:point.heightNm-reference.heightNm,row,yMm};
}
export function createStation(){
 const init=()=>({row:12,column:20,measurement:null,error:null});let s=init();
 const read=()=>structuredClone(s);
 function dispatch(key,payload){
  try{
   const next={...s,error:null};
   if(key==='reset'){s=init();return read();}
   if(key==='row'||key==='column'){
    const limit=key==='row'?rows:columns;
    if(!Number.isInteger(payload)||payload<0||payload>=limit)throw new RangeError(key+' out of bounds.');
    next[key]=payload;next.measurement=null;
   } else if(key==='raised'||key==='surround'){
    next.column=key==='raised'?20:4;next.row=12;next.measurement=null;
   } else if(key==='read'){next.measurement=readStep(next);}
   else return read();
   s=next;
  }catch(e){s={...s,measurement:null,error:e.message};}
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function file(state){
 return {schema:'bts.ace600.preexisting-coupon-inspection.v1',equipment:'13-10',provenance:'synthetic geometry; no instrument acquisition, process or material metadata',coupon,
 units:{horizontal:'mm',height:'nm'},selection:{row:state.row,column:state.column},measurement:state.measurement,profile:scanRow(state.row)};
}
