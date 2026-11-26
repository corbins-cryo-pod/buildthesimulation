// Inert PCB teaching fixture. No hardware I/O, thermal process or soldering procedure.
const fixture=Object.freeze({boardId:'BTS-PCB-REWORK-A',footprintId:'D1',pads:Object.freeze([{id:'P1',net:'VPLUS',xMm:-7,zMm:0},{id:'P2',net:'RETURN',xMm:7,zMm:0}].map(Object.freeze)),pins:Object.freeze(['A','K'])});
const BOM=Object.freeze({original:{id:'D1-ORIGINAL',part:'Virtual polarized diode',role:'original'},replacement:{id:'D1-REPLACEMENT',part:'Virtual polarized diode',role:'replacement'}});
export const fixtureRecord=()=>structuredClone(fixture);
export const joints=placement=>!placement?[]:fixture.pins.map((pin,i)=>{const pad=fixture.pads[placement.orientationDeg===0?i:1-i];return {pin,padId:pad.id,net:pad.net,state:placement.joined?'joined':'preview'};});
const expected=Object.freeze({A:'VPLUS',K:'RETURN'});
export function inspect(placement){
 if(!placement)return {ok:false,code:'footprint-empty',message:'The removed component has left both footprint joints open.',issues:[],joined:false};
 const actual=Object.fromEntries(joints(placement).map(x=>[x.pin,x.net]));
 const ok=Object.keys(expected).every(p=>expected[p]===actual[p]);
 return {ok,code:ok?(placement.joined?'verified':'ready-to-join'):'reversed-polarity',message:ok?(placement.joined?'Verified: A → VPLUS, K → RETURN.':'Correct orientation; both pins align with the intended nets.'):'Reversed polarity: A would reach RETURN and K would reach VPLUS. Rotate before joining.',issues:ok?[]:[{expected,actual}],joined:placement.joined};
}
export const targets=Object.freeze({T245_handle:'selectJoin',DR560_handle:'selectRemove',Diode_body:'rotate',Board_mount_tab:'inspect',Console_button:'inspect'});
export function createStation(){
 let p={...BOM.original,orientationDeg:0,joined:true},tool='inspect',rev=0,history=[],error=null,feedback=inspect(p);
 const snapshot=()=>({boardId:fixture.boardId,rev,parentRevision:rev===0?null:rev-1,placement:p?{...p}:null,tool,feedback,error,history:history.map(h=>({...h})),joints:joints(p)});
 function log(k,part){rev++;history=[...history,{revision:rev,parentRevision:rev-1,operation:k,componentId:part,footprintId:'D1'}];}
 function dispatch(k){
  error=null;
  if(k==='reset'){p={...BOM.original,orientationDeg:0,joined:true};rev=0;history=[];tool='inspect';}
  else if(k==='selectJoin')tool='join';
  else if(k==='selectRemove')tool='remove';
  else if(k==='remove'){
   tool='remove';
   if(!p)error={code:'footprint-empty',message:'D1 is already empty.'};
   else if(!p.joined){p=null;}
   else{const id=p.id;p=null;log('remove',id);}
  }else if(k==='place'){
   if(p)error={code:'occupied',message:'Remove the installed component before placing a replacement.'};
   else p={...BOM.replacement,orientationDeg:0,joined:false};
  }else if(k==='rotate'){
   if(!p||p.joined)error={code:'preview-required',message:'Rotate only an uncommitted replacement.'};
   else p={...p,orientationDeg:(p.orientationDeg+180)%360};
  }else if(k==='join'){
   tool='join';
   if(!p||p.joined)error={code:'preview-required',message:'Place a replacement in D1 first.'};
   else{const check=inspect(p);if(!check.ok)error=check;else{p={...p,joined:true};log('join',p.id);}}
  }else if(k!=='inspect')throw Error('Unknown 08-12 action '+k);
  feedback=inspect(p);return snapshot();
 }
 return {read:snapshot,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):null};
}
export function assemblyRecord(s){
 const f=fixtureRecord(),nodes=[{id:'VPLUS',type:'board-net'},{id:'RETURN',type:'board-net'},...f.pads.map(p=>({id:p.id,type:'pad'}))],edges=f.pads.map(p=>({a:p.id,b:p.net,kind:'board-trace'}));
 const joined=s.joints.filter(j=>j.state==='joined');
 for(const j of joined){const id=`${f.footprintId}:${j.pin}`; nodes.push({id,type:'pin',componentId:s.placement.id});edges.push({a:id,b:j.padId,kind:'joint'});}
 return {schema:'bts.pcb-assembly.v1',equipmentId:'08-12',sampleId:f.boardId,footprintId:f.footprintId,parentRevision:s.parentRevision,revision:s.rev,provenance:'simulated unpowered PCB topology; no material or thermal claims',components:s.placement?.joined?[{...s.placement}]:[],pendingPlacement:s.placement&&!s.placement.joined?{...s.placement}:null,pads:f.pads,expectedPinNets:{...expected},jointStates:f.pads.map(p=>joined.find(j=>j.padId===p.id)??{padId:p.id,net:p.net,pin:null,state:'open'}),check:{...s.feedback},history:s.history.map(h=>({...h})),connectivity:{nodes,edges}};
}
export function pose(s){return {componentVisible:Boolean(s.placement),orientationY:(s.placement?.orientationDeg??0)*Math.PI/180,pending:!!s.placement&&!s.placement.joined,joined:s.placement?.joined===true,selectedTool:s.tool};}
