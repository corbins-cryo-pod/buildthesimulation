// Pure station state; use from a UI or an XR host without requiring a DOM or three.js.
import {defaults,sweep,analogTrace} from './solver.mjs';
export function station(){
 let params={...defaults}, result=null,powered=true,runCount=0;const listeners=new Set();
 const snapshot=()=>({params:{...params},result,powered,runCount});
 function dispatch(action,value){
  if(action==='set'){if(!value||typeof value!=='object'||Object.keys(value).some(k=>!(k in defaults)))throw Error('Unknown station parameter');params={...params,...value};result=null}
  else if(action==='load'){params={...params,connected:!params.connected};result=null}
  else if(action==='power'){powered=!powered;result=null}
  else if(action==='mode'){if(!['IC','VC'].includes(value))throw Error('Unknown mode');params={...params,mode:value,holding:0,step:value==='IC'?20:10};result=null}
  else if(action==='example'){params={...defaults};powered=true;result=null}
  else if(action==='run'){result=null;if(!powered)throw Error('Power the amplifier before running.');result=sweep(params);runCount++}
  else throw Error('Unknown action: '+action);
  const s=snapshot();for(const fn of listeners)fn(s);return s;
 }
 return {snapshot,dispatch,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)},export(){if(!result)throw Error('Run first.');return analogTrace(result)}};
}
