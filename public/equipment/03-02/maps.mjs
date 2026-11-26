const freeze=p=>Object.freeze(p.map(r=>Object.freeze([...r])));
const snapshot=freeze([[74,79,83],[77,82,86],[74,79,83]]), blank=freeze([[0,0,0],[0,0,0],[0,0,0]]);
export const targets=Object.freeze({Bell_jar:['cutaway'],Coupon_L:['focus','L'],Coupon_R:['focus','R']});
export const views=Object.freeze({snapshot:'Synthetic paired map',baseline:'Unchanged blank reference'});
const nominal={L:{id:'virtual-coupon-L',xMm:[-70,-60,-50]},R:{id:'virtual-coupon-R',xMm:[50,60,70]}};
export const stats=rows=>{
 const a=rows.flat(),min=Math.min(...a),max=Math.max(...a),mean=a.reduce((s,v)=>s+v,0)/a.length;
 return {minNm:min,maxNm:max,meanNm:mean,halfRangeOverMeanPercent:mean===0?null:100*(max-min)/(2*mean)};
};
export function compare(view='snapshot'){
 if(!Object.hasOwn(views,view))throw Error('Unknown reference snapshot.');
 const l=(view==='snapshot'?snapshot:blank).map(r=>[...r]),r=l.map(row=>[...row].reverse());
 const zMm=[-10,0,10];
 const maxMirrorDeltaNm=Math.max(...l.flatMap((row,i)=>row.map((v,j)=>Math.abs(v-r[i][2-j]))));
 return {schema:'buildthesimulation.synthetic-mirror-coupon-map.v1',datasetId:view==='snapshot'?'AUTO306-TEACHING-PAIR-01':'AUTO306-UNCHANGED-BLANK-01',
  fixtureRevision:1,provenance:'Constructed geometry and thickness values; not a process prediction or measurement.',
  coordinates:{convention:'Local to display frame with +X to right and +Z to front; mirror about X=0.',lengthUnit:'mm',thicknessUnit:'nm',zMm},
  comparison:{mirror:'Pair L row i column j with R row i column 2-j',maxMirrorDeltaNm},
  coupons:{L:{...nominal.L,xMm:[...nominal.L.xMm],matrixNm:l,summary:stats(l)},R:{...nominal.R,xMm:[...nominal.R.xMm],matrixNm:r,summary:stats(r)}}};
}
export function createStation(){
 const initial=()=>({view:'snapshot',focus:'both',cutaway:false,loaded:false,error:null});
 let s=initial();
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='cutaway')return s={...s,cutaway:!s.cutaway,error:null};
  if(k==='focus'&&['L','R','both'].includes(p))return s={...s,focus:p,error:null};
  if(k==='load'&&(p===undefined||Object.hasOwn(views,p)))return s={...s,view:p??s.view,loaded:true,error:null};
  return s={...s,error:'Select a known coupon or dataset.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(...targets[n]):s};
}
