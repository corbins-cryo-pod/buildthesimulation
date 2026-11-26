// Standalone classroom drawing with normalized fictional units; no device linkage.
const widths=Object.freeze([10,12.5,20]),area=100;
export const picks=Object.freeze({Offline_gold_rect:{action:'next',label:'Cycle detached equal-area rectangles'}});
export const initial=()=>({width:10,revision:0});
export function reduce(s,a,v){
 if(a==='next')v=widths[(widths.indexOf(s.width)+1)%widths.length];else if(a!=='width')throw Error('Unknown offline diagram action.');
 if(!widths.includes(v))throw Error('Unknown authored rectangle.');
 return v===s.width?s:{width:v,revision:s.revision+1};
}
export function report(s){
 if(!widths.includes(s.width))throw Error('Unknown authored rectangle.');
 const height=area/s.width;
 return {schema:'bts.06-05.offline-rectangle.v1',source:'independent geometry diagram',revision:s.revision,width:s.width,height,area:s.width*height,perimeter:2*(s.width+height),aspectRatio:s.width/height,units:'fictional grid units',deviceConnection:false};
}
