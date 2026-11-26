export const gauge=Object.freeze({id:'bts-blind-22',diameterMm:22,kind:'original non-OEM blind inspection gauge'});
export const carriers=Object.freeze({
 small:Object.freeze({id:'demo-small-16x10',widthMm:16,heightMm:10,node:'Carrier_small_pose',rest:[.246,.027,.127]}),
 touch:Object.freeze({id:'demo-touch-17p6x13p2',widthMm:17.6,heightMm:13.2,node:'Carrier_touch_pose',rest:[.289,.027,.127]}),
 large:Object.freeze({id:'demo-large-20x12',widthMm:20,heightMm:12,node:'Carrier_large_pose',rest:[.332,.027,.127]}),
});
export const targets=Object.freeze({Cover_front_plate:['cutaway'],Blind_gauge_rim:['check'],Carrier_small:['select','small'],Carrier_touch:['select','touch'],Carrier_large:['select','large']});
export function check(k){
 if(!Object.hasOwn(carriers,k))throw Error('Unknown inert carrier.');
 const {id,widthMm,heightMm}=carriers[k],diagonalMm=Math.hypot(widthMm,heightMm),g=(gauge.diameterMm-diagonalMm)/2;
 const radialGapMm=Math.abs(g)<1e-9?0:g;
 return {carrierId:id,gaugeId:gauge.id,widthMm,heightMm,diagonalMm,radialGapMm,outcome:radialGapMm>0?'clear':radialGapMm<0?'blocked':'touch'};
}
export function poses(s){
 return Object.entries(carriers).map(([k,e])=>{
  const c=s.selected===k&&s.result;
  return {node:e.node,positionM:c?[.285,.072,c.outcome==='clear'?.088:.114]:[...e.rest]};
 });
}
export function exportFile(s){
 if(!s.result)throw Error('Check a carrier first.');
 return {schema:'buildthesimulation.inert-envelope-check.v1',fixtureId:'BLUEM-MINI-MITE-DOCUMENTARY',fixtureRevision:1,inspectionRevision:s.revision,gauge,
   result:s.result,provenance:'Original blind visual gauge; mathematical geometry only. Not real equipment compatibility.'};
}
export function createStation(){
 const initial=()=>({selected:'small',result:null,cutaway:false,revision:0,error:null});let s=initial();
 function dispatch(k,p){
  if(k==='reset')return s=initial();
  if(k==='cutaway')return s={...s,cutaway:!s.cutaway,error:null};
  if(k==='select'&&Object.hasOwn(carriers,p))return s={...s,selected:p,result:null,error:null};
  if(k==='check')return s={...s,result:check(s.selected),revision:s.revision+1,error:null};
  return s={...s,error:'Select a known inert carrier.'};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(...targets[n]):s};
}
