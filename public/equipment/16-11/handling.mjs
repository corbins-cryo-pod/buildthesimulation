export const slots=Object.freeze({
 'staging-100':{label:'100 mm staging tray',diameters:[100],workspaceMm:[-177,8.4,125],receive:'tray'},
 'cassette-100-A01':{label:'100 mm cassette · A01',diameters:[100],workspaceMm:[-177,16.4,-89],receive:'slot'},
 'cassette-100-A02':{label:'100 mm cassette · A02',diameters:[100],workspaceMm:[-177,28.4,-89],receive:'slot'},
 'cassette-100-A03':{label:'100 mm cassette · A03',diameters:[100],workspaceMm:[-177,40.4,-89],receive:'slot'},
 'cassette-150-B01':{label:'150 mm cassette · B01',diameters:[150],workspaceMm:[132,16.4,-94],receive:'slot'},
 'cassette-150-B02':{label:'150 mm cassette · B02',diameters:[150],workspaceMm:[132,28.4,-94],receive:'slot'},
 'cassette-150-B03':{label:'150 mm cassette · B03',diameters:[150],workspaceMm:[132,40.4,-94],receive:'slot'},
 'small-carrier':{label:'75 mm demonstration carrier',diameters:[75],workspaceMm:[140,8.4,141],receive:'tray'},
 'wand':{label:'Virtual wand pad',diameters:[100,150],workspaceMm:[-2,12.5,64],receive:'tool'},
});
export const targets=Object.freeze({
 W100_01:['select','W100-01'],W150_01:['select','W150-01'],
 Staging_100_base:['transfer','staging-100'],Carrier_75_base:['transfer','small-carrier'],Carrier_75_tab:['transfer','small-carrier'],Wand_click:['transfer','wand'],
 Slot_A01_handle:['transfer','cassette-100-A01'], Slot_A02_handle:['transfer','cassette-100-A02'], Slot_A03_handle:['transfer','cassette-100-A03'],
 Slot_B01_handle:['transfer','cassette-150-B01'], Slot_B02_handle:['transfer','cassette-150-B02'], Slot_B03_handle:['transfer','cassette-150-B03'],
});
export function example(){
 return {stationId:'BTS-HANDLING-MK-I',fixtureRevision:1,ledgerRevision:0,selectedId:'W100-01',wafers:
  [{id:'W100-01',node:'Pose_W100_01',diameterMm:100,thicknessMm:.525,orientationDeg:30,face:'top',siteId:'staging-100'},
   {id:'W150-01',node:'Pose_W150_01',diameterMm:150,thicknessMm:.675,orientationDeg:0,face:'top',siteId:'cassette-150-B01'}],
  transfers:[],attempt:null};
}
function carry(s,siteId,waferId=s.selectedId){
 const w=s.wafers.find(e=>e.id===waferId), dst=Object.hasOwn(slots,siteId)?slots[siteId]:null;
 const fail=(code,message,extra={})=>({...s,attempt:{ok:false,code,message,waferId,target:siteId,...extra}});
 if(!w||!dst)return fail('unknown','Select a known wafer and fixture position.');
 if(w.siteId===siteId)return fail('same-position',w.id+' already occupies '+dst.label+'.');
 if(!dst.diameters.includes(w.diameterMm)){
  const allowed=Math.max(...dst.diameters),delta=w.diameterMm-allowed;
  return fail('size-mismatch',delta>0?'Blocked: '+w.diameterMm+' mm wafer is '+delta+' mm wider than '+dst.label+'.':'Blocked: '+dst.label+' requires a different nominal wafer diameter.',{openingMm:allowed,diameterDeficitMm:Math.max(0,delta)});
 }
 const occupied=s.wafers.find(e=>e.siteId===siteId);
 if(occupied)return fail('occupied','Blocked: '+dst.label+' is already occupied by '+occupied.id+'.',{occupant:occupied.id});
 const revision=s.ledgerRevision+1, t={transferId:'custody-'+revision,revision,waferId:w.id,diameterMm:w.diameterMm,orientationDeg:w.orientationDeg,
  face:w.face,source:w.siteId,destination:siteId,waypoint:siteId==='wand'||w.siteId==='wand'?'direct':'wand',provenance:'virtual custody'};
 return {...s,ledgerRevision:revision,wafers:s.wafers.map(e=>e.id===w.id?{...e,siteId}:e),transfers:[...s.transfers,t],
  attempt:{ok:true,code:'transferred',message:w.id+' → '+dst.label+'. Orientation remains '+w.orientationDeg+'°.',waferId:w.id,target:siteId}};
}
export const poses=s=>s.wafers.map(w=>({node:w.node,positionM:slots[w.siteId].workspaceMm.map(x=>x/1000),rotationRad:w.orientationDeg*Math.PI/180,siteId:w.siteId,selected:w.id===s.selectedId}));
export function exportFile(s){
 return {schema:'buildthesimulation.wafer-custody.v1',stationId:s.stationId,fixtureRevision:s.fixtureRevision,ledgerRevision:s.ledgerRevision,
   provenance:'synthetic inert silicon geometry; no real handling records',units:{dimensions:'mm',orientation:'deg about +Y from +Z toward +X'},
   slots:Object.entries(slots).map(([slotId,d])=>({slotId,diametersMm:d.diameters,sampleCenterMm:d.workspaceMm,occupant:s.wafers.find(w=>w.siteId===slotId)?.id??null})),
   wafers:s.wafers.map(({node,...rest})=>rest),transfers:s.transfers,lastAttempt:s.attempt};
}
export function createStation(){
 let s=example();
 function dispatch(t,p){
  if(t==='reset')s=example();
  if(t==='select'&&s.wafers.some(w=>w.id===p))s={...s,selectedId:p,attempt:null};
  if(t==='transfer')s=carry(s,p);
  if(t==='transferFrom'){
   const w=s.wafers.find(w=>w.siteId===p?.source);
   s=w?carry(s,p.target,w.id):{...s,attempt:{ok:false,code:'empty-source',target:p?.target,message:'Blocked: selected source is empty.'}};
  }
  return s;
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(...targets[n]):s};
}
