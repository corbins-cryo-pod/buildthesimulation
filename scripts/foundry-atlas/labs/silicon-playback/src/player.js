(() => {
  "use strict";
  const root=document.querySelector(".bts-workflow-player");
  if(!root)return;
  const $=id=>document.getElementById(id);
  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const text=n=>(n?.textContent??"").replace(/\s+/g," ").trim();
  const role=k=>q('[data-flow-role="'+k+'"]',root);
  const motion=matchMedia("(prefers-reduced-motion: reduce)");
  const type=root.dataset.workflow;
  const manualSelector='button,input,select,textarea,canvas,a,summary,[contenteditable="true"],[role="button"],[role="option"],[data-site],[tabindex]:not([tabindex="-1"])';
  const allowed=n=>n&&!n.disabled&&!n.closest("[hidden]");
  const go=(kind,body,target,delay=1325)=>({kind,body,target,delay});
  const final=(body,target)=>go("done",body,target);
  const blocked=(body,target)=>go("blocked",body,target);
  const step=(body,target,delay)=>go("running",body,target,delay);
  const wait=(body,target)=>go("running",body,target,180);
  const click=n=>{if(!allowed(n))return false;n.click();return true;};
  function nativeList(id){return qa("#"+id+" > li");}
  function stageOf(id,heading){
    const a=nativeList(id),n=a.filter(x=>x.classList.contains("done")).length;
    const b=a.findIndex(x=>x.hasAttribute("aria-current"));
    return {total:a.length,position:b===-1?Math.max(1,Math.min(a.length,n+1)):b+1,count:n,label:text($(heading))};
  }
  function nativeProblem(fallback,id="status"){return text($(id))||fallback;}
  function utah(){
    const action=()=>q('#actions button[data-next="true"],#transfer[data-next="true"]');
    const complete=()=>!$("export")?.disabled&&!!$("transfer")?.disabled;
    const s=()=>{const current=stageOf("stageList","stageTitle");return {...current,count:complete()?current.total:current.count};};
    const fingerprint=()=>[text($("stageTitle")),text($("revision")),$("actionLog")?.children.length,action()?.id].join("|");
    return {
      name:"Utah · station walkthrough",
      note:"Follow the virtual workpiece through all five stations. Play uses the current comparison case. Manual interaction pauses the tour.",
      output:"inspection", resets:true, state:s, ready:()=>$("reset")&&!$("reset").disabled,
      changed:()=>s().count>0||($("actionLog")?.children.length??0)>0,
      restart:()=>click($("reset")),
      next(){
        if(complete())return final("All five stations are complete. The final symbolic inspection and native downloads are ready.",$("inspection"));
        if(/(exit|leave)\s+vr/i.test(text($("xrButton"))))return blocked("Exit the native VR session before starting on-page playback.",$("scene"));
        const native=action();
        if(!allowed(native))return blocked("The native station needs a manual choice before it can continue.",$("stageTitle"));
        const old=fingerprint(),current=s().label,description=text(native),id=native.id;
        click(native);
        if(fingerprint()===old&&!complete())return blocked(nativeProblem("The station did not accept the action.","message"),$("stageTitle"));
        if(complete())return final("Finalized r6. The native geometry and symbolic associations are ready to inspect.",$("inspection"));
        const target=s().label!==current?$("stageTitle"):id.includes("Map")||id.includes("Faces")||id==="inspect"?$("geometry"):$("scene");
        const delay=id==="transfer"?1810:/(preview|compare|inspect)/i.test(id)?1150:690;
        return step(current+" · "+description,target,delay);
      }
    };
  }
  function foundry(cap,ledger,identity,label,name){
    const total=()=>nativeList("steps").length;
    const complete=()=>$(cap)&&!$(cap).hidden&&allowed($("export"));
    let inCapture=false,tries=0;
    const s=()=>stageOf("steps","station");
    return {
      name,note:"Preview, hold and commit each modeled station in order, using the current settings. Manual interaction pauses playback.",
      output:cap,resets:true,state:s,ready:()=>allowed($("reset")),
      changed:()=>s().count>0||label.test(text($(identity))),
      restart(){inCapture=false;tries=0;return click($("reset"));},
      prepareVisual(){
        if(complete()||!allowed($("reset")))return;
        const a=s();
        if(a.position===total()||label.test(text($(identity))))return;
        // Use the native dry preview on the current workpiece before animating it.
        // The existing native commit guard remains the state authority.
        click($("preview"));
      },
      next(){
        if(complete()){inCapture=false;tries=0;return final("All modeled stations completed. The native same-seed synthetic output and run download are ready.",$(cap));}
        const a=s();
        if(!a.total)return blocked("Native station controls are unavailable in this view.",$("station"));
        if(!allowed($("reset"))){
          if(++tries>110)return blocked("The native calculation has not finished yet. Start playback again after it returns.",$("station"));
          return wait("Waiting for the native calculation…",inCapture?$("record")||$("captureRow"):$("station"));
        }
        tries=0;
        if(a.position===total()&&!$("capture").closest("[hidden]")){
          if(inCapture){
            inCapture=false;
            return blocked(nativeProblem("The native synthetic capture did not complete."),$("station"));
          }
          if(!click($("capture")))return blocked("The native synthetic capture is not ready.",$("station"));
          inCapture=true;
          return step(a.label+" · recording the synthetic process and ideal-control outputs",$("record")||$("captureRow"),620);
        }
        inCapture=false;
        if(!label.test(text($(identity)))){
          if(!click($("preview")))return blocked("The native preview is not available.",$("station"));
          if(q("#status.bad")||!label.test(text($(identity))))return blocked(nativeProblem("The native preview did not produce a valid proposal."),$("witness"));
          return step(a.label+" · native preview", $("witness"), 1510);
        }
        if(q("#status.bad"))return blocked(nativeProblem("A native preview needs your attention before it can be committed."),$("witness"));
        const before=a.count;
        if(!click($("commit")))return blocked("The native commit control is not ready.",$("station"));
        if(s().count!==before+1)return blocked(nativeProblem("The native station did not advance."),$("station"));
        return step(a.label+" · committed to the same workpiece",$("witness"),715);
      }
    };
  }
  function family(){
    let i=0, signature="";
    const total=5,labels=["Probe and revision","Site or count limits","Selected fault","Virtual loopback","Digital output"];
    const sig=()=>JSON.stringify(["model","pattern","fault","faultnum","faultshank"].map(id=>$(id)?.value).concat(Array.from(q("#specific").querySelectorAll("input,textarea,select"),n=>n.value)));
    const state=()=>({total,position:Math.max(1,i),count:i,label:labels[Math.max(0,i-1)]});
    const selected=id=>text($(id).selectedOptions[0]);
    return {
      name:"Neuropixels family · routing walkthrough",
      note:"Follow the selected probe, layout and fault through this digital routing check. Playback never changes those inputs.",
      output:"testhead",resets:false,state,ready:()=>$("model")?.options.length>0,changed:()=>i>0,
      restart(){i=0;signature="";return true;},
      next(){
        const sigNow=sig();
        if(signature&&signature!==sigNow)i=0;
        signature=sigNow;
        if(i>=4&&!allowed($("json")))i=3;
        if(i===0){i++;return step(selected("model")+" · "+selected("pattern"),$("controls"),1510);}
        if(i===1){
          if($("run").disabled)return blocked("The current allocation is rejected. "+text($("reason")),q(".scope"));
          i++;
          return step(text($("status"))+" · "+text($("reason")),q(".scope"),1910);
        }
        if(i===2){i++;return step("Fault fixture · "+selected("fault"),q(".faultbar"),1460);}
        if(i===3){
          if(!click($("run"))||$("json").disabled)return blocked("The virtual test needs a valid fixture. "+text($("runStatus")),$("runStatus"));
          i++;return step(text($("runStatus")),$("metrics"),1460);
        }
        i=5;return final("Digital output ready. "+text($("runStatus")),$("metrics"));
      }
    };
  }
  const adapter=type==="utah-array-fabrication"?utah():
    type==="neuropixels-foundry"?foundry("recording","log","identity",/\bcandidate r\d+\b/,"Neuropixels 1.0 · station walkthrough"):
    type==="masmanidis-64d-foundry"?foundry("bench","history","id",/\+ candidate\b/,"Masmanidis 64D · station walkthrough"):family();
  const play=role("play"),replay=role("replay"),progress=role("progress"),status=role("status"),now=role("now"),note=role("note"),out=role("output"),where=role("view"),confirm=role("confirm");
  let state="idle",timer=0,focusTarget=null,anim=null,manualSinceStart=false,owned=false;
  role("name").textContent=adapter.name;
  note.textContent=adapter.note;
  out.href="#"+adapter.output;
  function highlight(n){
    anim?.cancel();anim=null;
    if(focusTarget&&focusTarget!==n)focusTarget.removeAttribute("data-bts-flow-active");
    focusTarget=n||null;
    if(!n)return;
    n.setAttribute("data-bts-flow-active","");
    if(n.id){where.href="#"+n.id;where.hidden=false;}
    else {where.hidden=true;}
    if(!motion.matches&&n.animate)anim=n.animate([{opacity:.78},{opacity:1}],{duration:340,easing:"ease-out"});
  }
  function refresh(body){
    const s=adapter.state();
    root.dataset.playerState=state;
    root.dataset.workflowStep=String(s.count);
    progress.max=Math.max(1,s.total);
    progress.value=Math.min(s.total,s.count);
    now.textContent=!s.total?"Workflow":state==="done"?s.total+" of "+s.total+" complete":"Stage "+s.position+" of "+s.total;
    play.textContent=state==="running"?"Pause workflow":"Play workflow";
    play.disabled=state==="done";
    replay.disabled=state==="running";
    out.hidden=state!=="done";
    if(body!==undefined)status.textContent=body;
  }
  function halt(next,body){
    clearTimeout(timer);timer=0;state=next;anim?.cancel();anim=null;
    refresh(body);
  }
  function pause(body="Paused. Play continues from the current native state."){
    if(state==="running"){cleanroom?.pause();halt("paused",body);}
  }
  let cleanroom=null,roomImport=null,stationShown=-1;
  function loadRoom(){
    if(!/^https?:/.test(location.protocol))return Promise.resolve();
    roomImport??=import("/simulations/foundry/cleanroom-player.js").then(m=>{
      const host=document.createElement("div");root.after(host);cleanroom=m.mountTimedCleanroom(host,type);
    }).catch(()=>{});
    return roomImport;
  }
  function roomDetail(label){
    let controls=qa('#params label,#parameters label').filter(x=>x.querySelector('input,select')).slice(0,7);
    if(!controls.length)controls=qa('input[id^="param-"],input[id^="p-"]').slice(0,7).map(n=>n.closest('label')).filter(Boolean);
    const settings=controls.map(row=>{
      const input=row.querySelector('input,select');
      return ["Current virtual control · "+(input.labels?.[0]?.querySelector('span')?.textContent||row.childNodes[0]?.textContent?.trim()||input.id),input.selectedOptions?.[0]?.textContent||input.value];
    });
    for(const id of type==="utah-array-fabrication"?["scenario"]:type==="neuropixels-family"?["model","pattern","fault"]:type==="neuropixels-foundry"?["die"]:["field","face"]){
      if($(id)?.selectedOptions?.[0])settings.push(["Current virtual selection · "+id,text($(id).selectedOptions[0])]);
    }
    let specimenIdentity,nativeWitness;
    if(type==="masmanidis-64d-foundry"){
      const field=window.mas64?.().field||$("field")?.value;
      const match=/^F([0-6])([0-6])$/.exec(field||"");
      const channel=Number($("channel")?.value),face=$("face")?.value;
      nativeWitness=window.mas64ProcessWitness?.();
      if($("channel")?.selectedOptions[0])settings.push(["Selected physical site",text($("channel").selectedOptions[0])]);
      if(match)specimenIdentity={label:field,fieldMm:[(+match[2]-3)*22,(+match[1]-3)*22],fieldSideMm:22,channel,face};
    }
    return {operation:label,settings,specimenIdentity,nativeWitness,dataset:type==='utah-array-fabrication'?{scenario:$('scenario')?.value}:undefined};
  }
  function tick(){
    if(state!=="running")return;
    if(document.hidden){pause("Paused while this page is in the background.");return;}
    const current=adapter.state(), index=type==="neuropixels-family"?current.count:current.position-1;
    if(cleanroom&&stationShown!==index&&index<current.total){
      stationShown=index;
      if(type==="masmanidis-64d-foundry")adapter.prepareVisual?.();
      cleanroom.start(index,roomDetail(current.label),tick,motion.matches?900:undefined);
      return;
    }
    let r;
    try{r=adapter.next();}catch{halt("blocked","Playback could not continue. The native controls remain available.");return;}
    if(r.target&&(r.target!==focusTarget||r.delay!==180))highlight(r.target);
    if(r.kind==="done"||r.kind==="blocked"){halt(r.kind,r.body);return;}
    refresh(r.body);
    timer=setTimeout(tick,r.delay);
  }
  function begin(){
    if(state==="running")return;
    confirm.hidden=true;
    if(state==="idle"){owned=!adapter.changed()&&!manualSinceStart;}
    // Native downloads are never clicked by the player.
    state="running";
    refresh("Showing the next native step…");
    Promise.resolve(loadRoom()).then(()=>{
      if(state==="running"&&!cleanroom?.resume())timer=setTimeout(tick,350);
    });
  }
  function restart(){
    if(!adapter.ready()){
      confirm.hidden=true;
      halt("blocked","Wait for the current native operation to finish before replaying.");
      return;
    }
    if(!adapter.restart()){
      confirm.hidden=true;
      halt("blocked","The native workflow could not start a new run.");
      return;
    }
    stationShown=-1;cleanroom?.reset();manualSinceStart=false;owned=true;
    clearTimeout(timer);state="paused";begin();
  }
  play.addEventListener("click",()=>state==="running"?pause():begin());
  replay.addEventListener("click",()=>{
    if(state==="running")return;
    if(adapter.resets&&(manualSinceStart||(adapter.changed()&&!owned))){
      confirm.hidden=false;
      role("restart").focus({preventScroll:true});
      return;
    }
    restart();
  });
  role("restart").addEventListener("click",restart);
  role("keep").addEventListener("click",()=>{confirm.hidden=true;replay.focus({preventScroll:true});});
  let manualRefresh=0;
  function refreshManualRoom(){
    const ticket=++manualRefresh;
    let last='',tries=0;
    const check=()=>{
      if(ticket!==manualRefresh||!cleanroom||state==="running")return;
      const s=adapter.state(),index=type==="neuropixels-family"?Math.min(s.count,s.total-1):s.position-1;
      const detail=roomDetail(s.label),fingerprint=JSON.stringify([index,detail]);
      if(fingerprint!==last){last=fingerprint;stationShown=-1;cleanroom.preview(index,detail);}
      // Native async validation and click listeners must finish before the preview is bound.
      if(++tries<4)setTimeout(check,80);
    };
    requestAnimationFrame(check);
  }
  function manual(e){
    const n=e.target;
    if(!e.isTrusted||!(n instanceof Element)||root.contains(n)||n.closest(".cr-room")||!n.closest(manualSelector))return;
    if(e.type==="keydown"&&(e.key==="Tab"||e.key==="Escape"||e.ctrlKey||e.metaKey||e.altKey))return;
    manualSinceStart=true;
    pause("Paused for your manual interaction. Play uses the state you leave.");
    if(cleanroom&&["click","input","change"].includes(e.type))refreshManualRoom();
  }
  for(const k of ["pointerdown","click","keydown","input","change"])document.addEventListener(k,manual,true);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pause("Paused while this page is in the background.");});
  addEventListener("pagehide",()=>pause());
  motion.addEventListener?.("change",()=>{if(motion.matches){anim?.cancel();anim=null;}});
  // A passive native change after completion (rewind, reset, or a new family setup)
  // re-enables Play without commandeering the new state.
  document.addEventListener("click",e=>{
    if(!e.isTrusted||root.contains(e.target))return;
    queueMicrotask(()=>{
      if(state!=="done")return;
      const s=adapter.state(),loss=adapter.resets?s.count<s.total:!allowed($("json"));
      if(loss){if(!adapter.resets)adapter.restart();halt("idle","Current setup changed. Select Play workflow to follow it.");}
    });
  });
  document.addEventListener("input",e=>{
    if(!e.isTrusted||root.contains(e.target)||state!=="done"||adapter.resets)return;
    queueMicrotask(()=>{if(state==="done"&&!allowed($("json"))){adapter.restart();halt("idle","Current setup changed. Select Play workflow to follow it.");}});
  });
  refresh("Ready. Select Play workflow to start.");
})();
