const tokenId=['triangle-A','square-B'];
export const branches=Object.freeze({
 A:Object.freeze({id:'A',key:tokenId[0],instrumentId:'station-A',edgeId:'blind-A-to-station-A',shape:'triangle',mountZ:-.074}),
 B:Object.freeze({id:'B',key:tokenId[1],instrumentId:'station-B',edgeId:'blind-B-to-station-B',shape:'square',mountZ:-.074})
});
export const targets=Object.freeze({Key_A_face:['toggle','A'],Key_B_face:['toggle','B'],Blind_socket_A:['inspect','A'],Blind_socket_B:['inspect','B'],Station_A_facade:['inspect','A'],Station_B_facade:['inspect','B']});
export const pose=s=>Object.fromEntries(Object.keys(branches).map(id=>[id,{tokenZ:branches[id].mountZ+(s.labeled[id]?0:.022),led:s.labeled[id]}]));
export const readiness=s=>Object.values(branches).map(c=>({instrumentId:c.instrumentId,branchId:c.id,key:c.key,ready:s.labeled[c.id],edgeId:s.labeled[c.id]?c.edgeId:null}));
const fixture=()=>({fixtureId:'BTS-BLIND-MK-I',fixtureRevision:1,ledgerRevision:0,labeled:{A:false,B:false},focus:'A',history:[],note:null});
export function exportFile(s){
 return {schema:'buildthesimulation.blind-label-continuity.v1',fixtureId:s.fixtureId,fixtureRevision:s.fixtureRevision,ledgerRevision:s.ledgerRevision,
 provenance:'virtual static labeled connectivity only, no physical services',
 branches:Object.values(branches).map(({id,key,shape,edgeId,instrumentId})=>({id,key,shape,retainedEdgeId:edgeId,instrumentId})),readiness:readiness(s),history:s.history,lastInspection:s.note};
}
export function createStation(){
 let s=fixture();
 function dispatch(t,p){
  if(t==='reset')return s=fixture();
  const bid=typeof p==='string'?p:p?.branch, conf=Object.hasOwn(branches,bid)?branches[bid]:null;
  if(!conf)return s={...s,note:{ok:false,code:'unknown-branch',text:'Unknown blind branch.'}};
  if(t==='inspect')return s={...s,focus:bid,note:{ok:true,code:'inspection',text:'Branch '+bid+' is keyed for '+conf.key+'. Its only dependent station is '+conf.instrumentId+'.'}};
  const used=t==='toggle'?conf.key:p?.token;
  let on;
  if(t==='toggle')on=!s.labeled[bid];
  else if(t==='seat')on=true;
  else if(t==='remove')on=false;
  else return s={...s,note:{ok:false,code:'unknown-action',text:'Unknown fixture action.'}};
  if(on && used!==conf.key)return s={...s,focus:bid,note:{ok:false,code:'key-mismatch',text:'Blocked: '+String(used??'missing marker')+' does not match the '+conf.shape+' recess on branch '+bid+'.'}};
  if(on===s.labeled[bid])return s={...s,focus:bid,note:{ok:true,code:'no-change',text:'Branch '+bid+' is already '+(on?'seated.':'unseated.')}};
  const ledgerRevision=s.ledgerRevision+1,edge={revision:ledgerRevision,branchId:bid,instrumentId:conf.instrumentId,edgeId:conf.edgeId,tokenId:conf.key,action:on?'seat':'remove',ready:on};
  return s={...s,focus:bid,ledgerRevision,labeled:{...s.labeled,[bid]:on},history:[...s.history,edge],note:{ok:true,code:edge.action,text:'Branch '+bid+' marker '+(on?'seated.':'removed.')+' Only '+conf.instrumentId+' changes readiness.'}};
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(...targets[n]):s};
}
