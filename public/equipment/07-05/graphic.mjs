export const imageSpec=Object.freeze({sampleId:'BTS-STATIC-GRAPHIC-01',revision:1,width:40,height:24,pitchMm:.25});
const patch=Object.freeze({A:Object.freeze({rect:Object.freeze([2,4,18,20]),known:true}),B:Object.freeze({rect:Object.freeze([22,4,38,20]),known:true}),U:Object.freeze({rect:Object.freeze([6,6,16,14]),known:false})});
export const station=()=>({region:'A'});
export const graphicInk=(x,y)=>x>=5&&x<13&&y>=8&&y<14;
export function act(s,action,value){if(action==='reset')return station();if(action!=='review'||!Object.hasOwn(patch,value))throw RangeError('Choose a published region A, B or U.');return{region:value}}
export function review(s){
 const region=act(station(),'review',s.region).region,{rect,known}=patch[region],[x0,y0,x1,y1]=rect,total=(x1-x0)*(y1-y0);
 let marked=known?0:null;if(known)for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)marked+=Number(graphicInk(x,y));
 return {schema:'bts.static-graphic-review.v1',sampleId:imageSpec.sampleId,revision:imageSpec.revision,sourceType:'Immutable author-designed nonbiological printed graphic and supplied region masks; not acquired imagery.',coordinateFrame:'Zero-based [x0,y0,x1,y1), image pixels from top left, +Y down.',dimensionsPx:[imageSpec.width,imageSpec.height],pitchMm:imageSpec.pitchMm,region,regionBoundsPx:[...rect],regionPixels:total,maskStatus:known?'present':'absent',markedPixels:marked,markedFraction:known?marked/total:null,markedAreaMm2:known?marked*imageSpec.pitchMm**2:null};
}
