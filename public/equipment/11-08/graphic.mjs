// Immutable made-up graphic, not a camera capture. Everything is a fictional diagram unit.
export const width=32,height=22,unitsPerPx=2;
const spans=Object.freeze({diag:Object.freeze([[5,5],[13,11]].map(Object.freeze)),row:Object.freeze([[7,15],[18,15]].map(Object.freeze)),same:Object.freeze([[23,8],[23,8]].map(Object.freeze))});
const keys=Object.freeze(Object.keys(spans));
export const fixedRaster=Object.freeze(Array.from({length:width*height},(_,i)=>{
 const x=i%width,y=Math.floor(i/width);
 if(x===2||x===29||y===2||y===19)return 65;
 if(x>=3&&x<=28&&y>=3&&y<=18)return 20+((Math.floor(x/4)+Math.floor(y/4))%2)*17;
 return 13;
}));
export const initial=()=>({span:'diag',revision:0});
export const picks=Object.freeze({Offline_scale_legend:{action:'next',label:'Switch the independent illustrated ruler span'}});
export function reduce(s,a,v){
 if(a==='next')v=keys[(keys.indexOf(s.span)+1)%keys.length];else if(a!=='span')throw Error('Unknown offline image action.');
 if(!Object.hasOwn(spans,v))throw Error('Unknown fixed graphic span.');
 return v===s.span?s:{span:v,revision:s.revision+1};
}
export function markers(s){if(!Object.hasOwn(spans,s.span))throw Error('Unknown fixed graphic span.');return spans[s.span]}
export function report(s){
 const [[x,y],[u,v]]=markers(s),distancePx=Math.hypot(u-x,v-y);
 return {schema:'bts.11-08.offline-graphic.v1',source:'fixed authored checker graphic, not acquired',revision:s.revision,span:s.span,widthPx:width,heightPx:height,legendUnitsPerPx:unitsPerPx,distancePx,distanceGraphicUnits:distancePx*unitsPerPx,deviceConnection:false};
}
