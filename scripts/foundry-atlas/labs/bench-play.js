/* Shared clock only. Each foundry bench defines and paints its own reviewed stages. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FoundryBenchPlay=api;
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const playLabel={ready:'Play workflow',running:'Pause workflow',paused:'Resume workflow',complete:'Replay workflow'};
function create({paint,delay=2100,clock=globalThis}){
 let total=0,progress=0,running=false,timer=null,epoch=0;
 const snapshot=()=>({total,progress,running,mode:running?'running':total>0&&progress===total?'complete':progress?'paused':'ready'});
 const emit=()=>paint(snapshot());
 function clear(){
  epoch++;
  if(timer!==null)clock.clearTimeout(timer);
  timer=null;
 }
 function schedule(){
  clear();
  if(!running||progress>=total)return;
  const thisEpoch=epoch;
  timer=clock.setTimeout(()=>{
   if(thisEpoch!==epoch||!running)return;
   timer=null;
   tick();
  },delay);
 }
 function tick(){
  progress=Math.min(total,progress+1);
  if(progress===total)running=false;
  emit();schedule();
 }
 function load(length){
  if(!Number.isSafeInteger(length)||length<0)throw RangeError('Expected a non-negative integer stage count.');
  clear();total=length;progress=0;running=false;emit();
 }
 function go(index){
  if(!Number.isSafeInteger(index))throw RangeError('Expected an integer stage index.');
  clear();running=false;progress=Math.max(0,Math.min(total,index));emit();
 }
 function pause(){
  if(!running)return;
  clear();running=false;emit();
 }
 function toggle(){
  if(running){pause();return;}
  if(!total)return;
  if(progress===total)progress=0;
  running=true;
  if(!progress)tick();else{emit();schedule();}
 }
 return {snapshot,load,go,pause,toggle,next:()=>go(progress+1),previous:()=>go(progress-1),finish:()=>go(total),reset:()=>go(0)};
}
return {create,playLabel};
});
