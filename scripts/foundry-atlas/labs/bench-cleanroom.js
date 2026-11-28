/* Display-only bridge for Tool Fit and Process Handoff. Their existing clock owns gate advancement. */
window.FoundryBenchCleanroom = (() => {
 'use strict';
 const PATH='/simulations/foundry/cleanroom-player.js',duration=7000;
 function create(node,slug){
  const supported=Boolean(node)&&/^https?:$/.test(location.protocol);
  if(!supported)return {update(){},close(){}};
  const wrap=node.closest('[data-bench-cleanroom]'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let room=null,pending=null,generation=0,failed=false,frame=0,at=0,progress=0,active=null,advancing=false;
  function stop(){
   cancelAnimationFrame(frame);frame=0;
   if(at){progress=Math.min(1,progress+(performance.now()-at)/duration);at=0;}
  }
  function close(){
   stop();generation++;pending=null;
   try{room?.destroy();}catch{/* The digital ledger is not tied to the preview. */}
   room=null;active=null;progress=0;advancing=false;wrap.hidden=true;node.replaceChildren();
   wrap.dataset.state=failed?'unavailable':'closed';
  }
  function fail(){failed=true;close();}
  function paint(p){
   if(!room||!active)return;
   try{room.paint(active.index,motion.matches?1:p,active.detail);}
   catch{fail();}
  }
  function mount(){
   if(failed||room||pending||!active)return;
   const serial=generation;
   wrap.dataset.state='loading';
   pending=import(PATH).then(({mountLabCleanroom})=>{
    if(serial!==generation||!active||!node.isConnected)return;
    wrap.hidden=false;room=mountLabCleanroom(node,slug);
    if(!room||typeof room.paint!=='function'||typeof room.destroy!=='function')throw Error('Cleanroom did not mount');
    wrap.dataset.state='ready';
    paint(Math.min(1,progress+(at?(performance.now()-at)/duration:0)));
   }).catch(()=>{if(serial===generation)fail();}).finally(()=>{if(serial===generation)pending=null;});
  }
  function tick(now){
   if(!advancing||!active||failed)return;
   if(!at)at=now;
   const p=Math.min(1,progress+(now-at)/duration);
   paint(p);
   if(p<1)frame=requestAnimationFrame(tick);
   else{progress=1;at=0;frame=0;}
  }
  function update(state,detail){
   const index=state.progress-1;
   if(index<0||!detail){close();return;}
   if(failed)return;
   const same=active?.index===index;
   const wasRunning=advancing;
   stop();
   if(!same){
    if(!wasRunning||index!==active?.index+1){
     try{room?.reset?.();}catch{fail();return;}
    }
    progress=state.running?0:1;
   }else if(!state.running&&!wasRunning)progress=1;
   active={index,detail};advancing=state.running;
   mount();paint(progress);
   if(advancing&&progress<1)frame=requestAnimationFrame(tick);
  }
  const onMotion=()=>paint(Math.min(1,progress+(at?(performance.now()-at)/duration:0)));
  motion.addEventListener?.('change',onMotion);
  window.addEventListener('pagehide',stop);
  return {update,close};
 }
 return {create,duration};
})();
