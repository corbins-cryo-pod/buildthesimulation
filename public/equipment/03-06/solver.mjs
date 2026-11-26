export const gauge=Object.freeze({radiusMm:103,heightMm:10,provenance:'BTS abstract nonphysical teaching gauge; not Veeco assembly dimensions'});
export const specimen=Object.freeze({sampleId:'BTS-FIJI-INERT-DISK',sampleRevision:'display-r1',shape:'rigid cylindrical proxy'});
export const defaults=Object.freeze({diameterMm:200,heightMm:4,xMm:0,yMm:0});
export const limits=Object.freeze({diameterMm:[80,240],heightMm:[1,30],xMm:[-30,30],yMm:[-30,30]});
export function validate(p){
 if(!p||typeof p!=='object')throw Error('Enter an inert proxy geometry.');
 const v={};for(const [k,[lo,hi]] of Object.entries(limits)){if(!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error(k+' must be '+lo+'–'+hi+' mm.');v[k]=p[k]}
 return v;
}
export function fit(p,revision=1,parentRevision=null){
 const inputs=validate(p), radial=inputs.diameterMm/2, e=Math.hypot(inputs.xMm,inputs.yMm);
 let radialMarginMm=gauge.radiusMm-radial-e,verticalMarginMm=gauge.heightMm-inputs.heightMm;
 if(Math.abs(radialMarginMm)<1e-10)radialMarginMm=0;
 if(Math.abs(verticalMarginMm)<1e-10)verticalMarginMm=0;
 const min=Math.min(radialMarginMm,verticalMarginMm),status=min<0?'interference-in-mockup':min===0?'zero-reserve':'clear-in-mockup';
 return {schema:'bts.ald-cabinet.static-fit.v1',deviceId:'03-06',origin:'synthetic-static-envelope',sample:specimen,revision,parentRevision,units:'mm',coordinateFrame:'teaching plane, x to the right and y away, z normal to the carrier',inputs,gauge,radialMarginMm,verticalMarginMm,status,assurance:'This model is not an authorization or fit check for physical equipment. It does not calculate paths, process state, film thickness or exposure.'};
}
export const initial=()=>({cutaway:false,carrierVisible:true,parameters:{...defaults},result:null,revision:0});
export function action(s,{type,payload}){
 switch(type){
  case 'cutaway':return {...s,cutaway:!s.cutaway};
  case 'carrier':return {...s,carrierVisible:!s.carrierVisible,result:null};
  case 'configure':return {...s,parameters:validate(payload),result:null};
  case 'inspect': {if(!s.carrierVisible)throw Error('Show the inert teaching carrier first.');const parameters=payload===undefined?s.parameters:validate(payload);return {...s,parameters,revision:s.revision+1,result:fit(parameters,s.revision+1,s.revision||null)};}
  case 'reset':return initial();
  default:throw Error('Unknown inspection action.');
 }
}
