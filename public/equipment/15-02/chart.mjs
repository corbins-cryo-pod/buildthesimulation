// An immutable authored geometric chart, unrelated to the sealed instrument.
const spans=Object.freeze({mm:Object.freeze([38,58]),zero:Object.freeze([48,48])});
const zooms=Object.freeze([1,2]);
const sourcePixelsPerMm=20;
export const picks=Object.freeze({Offline_zoom_tile:{action:'toggle',label:'Change only the unrelated chart display scale'}});
export const initial=()=>({zoom:1,span:'mm',revision:0});
export function reduce(s,a,v){
 if(a==='toggle')a='zoom',v=s.zoom===1?2:1;
 if(a==='zoom'&&zooms.includes(v))return s.zoom===v?s:{...s,zoom:v,revision:s.revision+1};
 if(a==='span'&&Object.hasOwn(spans,v))return s.span===v?s:{...s,span:v,revision:s.revision+1};
 throw Error('Choose a supported offline diagram control.');
}
export function points(s){if(!Object.hasOwn(spans,s.span))throw Error('Unknown immutable chart span.');return spans[s.span]}
export function report(s){
 if(!zooms.includes(s.zoom))throw Error('Unknown chart display scale.');
 const [a,b]=points(s),baseSpanPx=Math.abs(b-a),chartSpanPx=baseSpanPx*s.zoom,legendPxPerMm=sourcePixelsPerMm*s.zoom;
 return {schema:'bts.15-02.offline-scale-chart.v1',source:'fixed vector artwork: 1 mm authored ruler span',revision:s.revision,span:s.span,displayScale:s.zoom,baseSpanPx,chartSpanPx,legendPxPerMm,chartDistanceMm:chartSpanPx/legendPxPerMm,deviceConnection:false};
}
