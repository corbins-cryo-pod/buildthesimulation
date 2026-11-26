import {defaults,run,capture,parseS2P} from './solver.mjs';
export function station(){let params={...defaults},powered=true,connected=true,cal=null,trace=null,result=null;const listeners=new Set();
 const snapshot=()=>({params:{...params},powered,connected,calibrated:!!cal,inputName:trace?.name||null,result});
 function dispatch(action,value){result=null;try{
  if(action==='power'){powered=!powered;if(!powered)cal=null}
  else if(action==='connect')connected=!connected;
  else if(action==='example'){params={...defaults};powered=true;connected=true;cal=trace=null}
  else if(action==='set'){if(!value||typeof value!=='object'||Object.keys(value).some(k=>!(k in defaults)))throw Error('Unknown sweep control.');const before=params;params={...params,...value};if(['startMHz','stopMHz','points','leftNs','rightNs'].some(k=>before[k]!==params[k]))cal=null}
  else if(action==='import'){trace=null;const q=parseS2P(value.text,value.name);trace=q;params={...params,fixture:'import',sampleId:q.identity?.sampleId||(q.name.replace(/\.s2p$/i,'').slice(0,64)||'IMPORTED'),parentRevision:q.identity?.revision??0};}
  else if(action==='capture'||action==='run'){if(!powered)throw Error('Turn the analyzer on.');if(!connected)throw Error('Connect the passive fixture between the two test leads.');if(action==='capture'){cal=capture(params);params={...params,correction:'response'}}else result=run(params,cal,trace)}
  else throw Error('Unknown station action.');return snapshot();
 }finally{for(const fn of listeners)fn(snapshot())}}
 return {snapshot,dispatch,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}}}
