const freeze=Object.freeze;
export const poster=freeze({id:'DETACHED-DOT-POSTER-01',revision:'poster-original-1',size:freeze([9,7]),datumMm:freeze([-18,12]),spacingMm:freeze([14,11]),
 markers:freeze([{id:'A',index:freeze([2,1])},{id:'B',index:freeze([7,5])}].map(freeze))});
function valid(index){
 if(!Array.isArray(index)||index.length!==2||index.some((q,i)=>!Number.isInteger(q)||q<0||q>=poster.size[i]))throw new RangeError('No dot at those poster indices.');
}
export function dot(index){
 valid(index);return {index:[...index],centerMm:index.map((v,i)=>poster.datumMm[i]+v*poster.spacingMm[i]),
  marker:poster.markers.find(m=>m.index.every((v,i)=>v===index[i]))?.id??null};
}
export function markerDistance(){
 const a=dot(poster.markers[0].index),b=dot(poster.markers[1].index),deltaMm=b.centerMm.map((q,i)=>q-a.centerMm[i]);
 return {markers:[a,b],deltaMm,lengthMm:Math.hypot(...deltaMm)};
}
export const blank=()=>({index:[...poster.markers[0].index],revision:0,report:null});
export function action(s,a){
 if(a.type==='reset')return blank();
 if(a.type==='cycle'||a.type==='pick'){
  const i=a.type==='cycle'?poster.markers[dot(s.index).marker==='A'?1:0].index:a.payload;valid(i);
  return {...s,index:[...i],report:null};
 }
 if(a.type!=='inspect')throw new RangeError('Only passive inspection of the separate poster is available.');
 const revision=s.revision+1;
 return {...s,revision,report:{schema:'bts.detached-dot-grid-inspection.v1',revision,
  posterId:poster.id,sourceRevision:poster.revision,positiveAxes:['X right','Y up'],units:'mm',
  selected:dot(s.index),posterGrid:{size:poster.size,datumMm:poster.datumMm,spacingMm:poster.spacingMm},
  vector:markerDistance(),provenance:'Fictitious standalone mathematical poster; not a machine coordinate frame, physical tool or process output.'}};
}
