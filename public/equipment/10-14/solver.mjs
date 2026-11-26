export const insert=Object.freeze({sampleId:'BTS-SOLID-DRY-BLOCK',sampleRevision:'block-r1',kind:'inert rectangular display prop',widthMm:65,depthMm:80,heightMm:15});
export const seat=Object.freeze({id:'BTS-DRY-SEAT-R1',widthMm:85,depthMm:120,heightMm:19});
const aliases=Object.freeze(['TAG-A','TAG-B']);
export const defaults=Object.freeze({xMm:0,yMm:0,leftTag:'TAG-A',rightTag:'TAG-B'});
export function validate(p){
 if(!p||typeof p!=='object'||![p.xMm,p.yMm].every(x=>Number.isFinite(x)&&Math.abs(x)<=45)||!aliases.includes(p.leftTag)||!aliases.includes(p.rightTag))throw Error('Use two visible tags and XY offsets between −45 and +45 mm.');
 return {xMm:p.xMm,yMm:p.yMm,leftTag:p.leftTag,rightTag:p.rightTag};
}
export function evaluate(p,revision=1,parentRevision=null){
 const v=validate(p),x=(seat.widthMm-insert.widthMm)/2,y=(seat.depthMm-insert.depthMm)/2;
 const marginMm={left:x+v.xMm,right:x-v.xMm,front:y+v.yMm,back:y-v.yMm,vertical:seat.heightMm-insert.heightMm},m=Math.min(...Object.values(marginMm));
 return {schema:'bts.dry-mount.inspection.v1',deviceId:'10-14',origin:'original-dry-display-mock',revision,parentRevision,dimensionsUnit:'mm',frame:'fixture plane, +X right from operator, +Y away',insert,seat,parameters:v,marginMm,
 fitStatus:m<0?'interference':m===0?'zero-reserve':'nominal-fit',
 labels:{left:v.leftTag,right:v.rightTag,expectedLeft:'TAG-A',expectedRight:'TAG-B',matchesReference:v.leftTag==='TAG-A'&&v.rightTag==='TAG-B',plugState:'detached and power-disconnected'},
 scope:'Original non-operational visualization. No fluid, actual specimen, signals, circuitry, electrodes or physiological response.'};
}
export const blank=()=>({parameters:{...defaults},visible:true,tagsVisible:true,revision:0,result:null});
export function action(s,{type,payload}){
 switch(type){
  case 'insert':return {...s,visible:!s.visible,result:null};
  case 'tags':return {...s,tagsVisible:!s.tagsVisible};
  case 'set':return {...s,parameters:validate(payload),result:null};
  case 'inspect': {
   if(!s.visible)throw Error('Show the inert block before checking its nominal fit.');
   const parameters=payload===undefined?s.parameters:validate(payload);return {...s,parameters,revision:s.revision+1,result:evaluate(parameters,s.revision+1,s.revision||null)};
  }
  case 'reset':return blank();
  default:throw Error('Only disconnected display and clearance actions are available.');
 }
}
