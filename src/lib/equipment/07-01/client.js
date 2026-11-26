const $ = key => document.getElementById('cab-'+key);
const names = {closed:'Closed · reduced mode',work:'Working position','above-work':'Warning · above working range','below-work':'Warning · below working range'};
const fmt = value => Number(value.toFixed(3)).toString();

function report(message,error=false) {
  $('feedback').textContent=message;
  $('feedback').dataset.error=String(error);
}
function download(result) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url; a.download=result.sessionId+'-'+fmt(result.state.timeS)+'s.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function chart(result) {
  const {state,input,intervals,sampleHistory} = result;
  const end=input.durationS || 1;
  const chart=$('trace');
  const lanes = document.createDocumentFragment();
  function lane(title,id) {
    const row=document.createElement('div');row.className='cab-lane';
    const label=document.createElement('span');label.className='cab-lane-name'; label.textContent=title;label.title=title;
    const track=document.createElement('div');track.className='cab-lane-track';
    for(const interval of intervals) {
      if(id && !interval.presentSampleIds.includes(id)) continue;
      if(!id && !interval.warning) continue;
      const bar=document.createElement('i');
      bar.className='cab-span '+(interval.warning?'cab-warning':'cab-presence');
      bar.style.left=100*interval.startS/end+'%';bar.style.width=100*interval.durationS/end+'%';
      bar.title=fmt(interval.startS)+'–'+fmt(interval.endS)+' s';
      track.append(bar);
    }
    const cursor=document.createElement('i');cursor.className='cab-pointer';cursor.style.left='min(calc(100% - 2px), '+100*state.timeS/end+'%)';
    track.append(cursor);row.append(label,track);lanes.append(row);
  }
  lane('Cabinet warning',null);
  for(const item of sampleHistory) lane(item.sampleId,item.sampleId);
  const axis=document.createElement('div');axis.className='cab-lane';
  const ticks=document.createElement('div');ticks.className='cab-axis';
  for(const fraction of [0,.25,.5,.75,1]) {const t=document.createElement('span');t.textContent=fmt(end*fraction)+' s';ticks.append(t);}
  axis.append(document.createElement('span'),ticks);lanes.append(axis);
  chart.replaceChildren(lanes);
  chart.setAttribute('aria-label','Observed intervals through '+fmt(state.timeS)+' seconds. Cabinet warning '+fmt(result.summary.warningDurationS)+' seconds. '+sampleHistory.map(s=>s.sampleId+' '+fmt(s.warningDurationS)+' warning seconds').join('. '));
}
function showEvents(history) {
  const body=$('events');
  const rows=document.createDocumentFragment();
  for(const e of history) {
    const row=document.createElement('tr');
    const action=e.type==='sash'?'Move sash to '+fmt(e.heightMm)+' mm':(e.type==='load'?'Load ':'Remove ')+e.sampleId;
    for(const value of [fmt(e.timeS)+' s',action,names[e.state.position],e.state.presentSampleIds.join(', ')||'Empty']) {
      const cell=document.createElement('td');cell.textContent=value;row.append(cell);
    }
    rows.append(row);
  }
  if(!history.length) {
    const row=document.createElement('tr'),cell=document.createElement('td');
    cell.colSpan=4;cell.textContent='No handling events at this time.';row.append(cell);rows.append(row);
  }
  body.replaceChildren(rows);
}
export async function initCabinet() {
  const solverUrl='/equipment/07-01/session.mjs';
  let solver;
  try {solver=await import(/* @vite-ignore */solverUrl);} catch {report('The event model could not load. Reload the page to retry.',true);return;}
  const {CONFIG,makeExample,simulate}=solver;
  let mode='example', replayJob=makeExample(), exampleActive=true;
  const manualId='A2-'+Date.now().toString(36).toUpperCase();
  let manualJob={...makeExample(),sessionId:manualId,durationS:0,events:[]};
  let t=0, replayTime=0, result, viewer;
  let playing=false,frame=0,lastLog='';
  const current=()=>mode==='example'?replayJob:manualJob;
  function draw() {
    const job=current();
    result=simulate(job,t);
    const {state,sampleHistory,summary,eventHistory}=result;
    $('height').firstChild.nodeValue=fmt(state.sashMm)+' ';
    $('time').firstChild.nodeValue=fmt(state.timeS)+' ';
    $('position').textContent=names[state.position];
    $('indicator').dataset.position=state.position;
    $('indicator').dataset.warning=String(state.warning);
    $('present').textContent=state.presentSampleIds.length?'On surface · '+state.presentSampleIds.join(', '):'Work surface empty';
    $('duration').textContent=fmt(job.durationS)+' s';
    $('cursor').max=String(job.durationS);$('cursor').value=String(t);
    $('session-name').textContent=job.sessionId;
    $('warning-time').textContent=fmt(summary.warningDurationS)+' s';
    $('play').textContent=playing?'Pause':t>=job.durationS?'Replay':t>0?'Resume':exampleActive?'Run example':'Run replay';
    $('step').disabled=t>=job.durationS;$('finish').disabled=t>=job.durationS;
    $('samples').replaceChildren();
    if(!sampleHistory.length) {
      const el=document.createElement('li');el.textContent='No specimens observed';$('samples').append(el);
    }
    for(const sample of sampleHistory) {
      const el=document.createElement('li');el.textContent=sample.sampleId+' · '+fmt(sample.warningDurationS)+' s';$('samples').append(el);
    }
    const logKey=JSON.stringify(eventHistory);
    if(lastLog!==logKey){showEvents(eventHistory);lastLog=logKey;}
    chart(result);viewer?.update(result);
  }
  function stop(){playing=false;cancelAnimationFrame(frame);}
  function seek(value){stop();t=value;draw();}
  function switchMode(next) {
    if(mode==='example') replayTime=t;
    stop();mode=next;
    const example=mode==='example';
    $('example-mode').setAttribute('aria-pressed',String(example));$('manual-mode').setAttribute('aria-pressed',String(!example));
    $('replay').hidden=!example;$('manual').hidden=example;
    $('excursion-field').hidden=!exampleActive;
    t=example?replayTime:manualJob.durationS;
    report(example?'Replay ready.':'Set the sash, load a sealed specimen and advance the clock.');
    draw();
  }
  $('example-mode').onclick=()=>switchMode('example');
  $('manual-mode').onclick=()=>switchMode('manual');
  $('play').onclick=()=>{
    if(playing){stop();draw();report('Replay paused.');return;}
    if(t>=replayJob.durationS)t=0;
    playing=true;const start=t,wall=performance.now();let previous=-Infinity;
    report('Playing at 4× session time.');
    function tick(now) {
      if(!playing)return;
      t=Math.min(replayJob.durationS,Math.round((start+(now-wall)*.004)*1000)/1000);
      if(t>=replayJob.durationS){stop();report('Replay complete. The session record is ready to export.');draw();return;}
      if(now-previous>=125){draw();previous=now;}
      frame=requestAnimationFrame(tick);
    }
    draw();frame=requestAnimationFrame(tick);
  };
  $('cursor').oninput=()=>{seek(Number($('cursor').value));report('Inspecting the recorded state.');};
  $('step').onclick=()=>{
    const next=replayJob.events.find(e=>e.timeS>t)?.timeS??replayJob.durationS;
    seek(next);report('Inspecting '+fmt(next)+' s.');
  };
  $('finish').onclick=()=>{seek(replayJob.durationS);report('Replay complete. The session record is ready to export.');};
  function number(key) {
    const field=$(key);
    if(field.value.trim()==='' || !Number.isFinite(field.valueAsNumber)) throw Error('Enter a number for '+field.labels[0].textContent+'.');
    return field.valueAsNumber;
  }
  $('apply-excursion').onclick=()=>{
    try {
      const height=number('excursion');
      const draft=structuredClone(replayJob);
      draft.events.find(e=>e.type==='sash' && e.timeS===10).heightMm=height;
      simulate(draft);stop();replayJob=draft;t=0;draw();report('Updated. Run the example to compare warning times.');
    }catch(e){report(e.message,true);}
  };
  function applyManual(event,durationS=manualJob.durationS) {
    const draft={...manualJob,durationS,events:event?[...manualJob.events,{timeS:durationS,...event}]:manualJob.events};
    simulate(draft);manualJob=draft;t=durationS;draw();
  }
  const safe=fn=>()=>{try {fn();}catch(e){report(e.message,true);}};
  $('set-height').onclick=safe(()=>{applyManual({type:'sash',heightMm:number('manual-height')});report('Sash position recorded.');});
  for(const type of ['load','remove']) $(type).onclick=safe(()=>{
    const sampleId=$('token').value.trim();
    applyManual({type,sampleId,sampleKind:CONFIG.sampleKind});
    report(sampleId+(type==='load'?' loaded.':' removed.'));
  });
  $('advance').onclick=safe(()=>{
    const delta=number('advance-time');
    if(delta<=0 || Math.round(delta*1000)/1000!==delta) throw Error('Enter a positive hold time in whole milliseconds.');
    applyManual(null,Math.round((manualJob.durationS+delta)*1000)/1000);
    report('Clock advanced by '+fmt(delta)+' s.');
  });
  $('export').onclick=()=>{download(result);report('Exported '+result.sessionId+' through '+fmt(result.state.timeS)+' s.');};
  $('import-open').onclick=()=>$('import').click();
  $('import').onchange=async()=>{
    const file=$('import').files?.[0];if(!file)return;
    try {
      if(file.size>4*1024*1024)throw Error('Choose a replay input or exported session under 4 MiB.');
      const json=JSON.parse(await file.text());
      const input=json.schema==='bts.equipment.07-01.sash-session.v1'?json.input:json;
      const normalized=simulate(input).input;
      stop();replayJob=normalized;exampleActive=false;
      t=0;replayTime=0;switchMode('example');
      $('example-mode').textContent='Imported replay';
      report('Loaded '+replayJob.sessionId+' from the beginning.');
    }catch(e){report('Import rejected. '+e.message,true);}
    finally{$('import').value='';}
  };
  $('restore-example').onclick=()=>{
    stop();replayJob=makeExample();exampleActive=true;t=0;replayTime=0;
    $('example-mode').textContent='Example replay';$('excursion').value=String(replayJob.events[1].heightMm);
    switchMode('example');report('Original two-specimen example restored.');
  };
  draw();
  try {
    const {openViewer}=await import('./viewer.js');
    viewer=await openViewer($('canvas'),$('3d-status'));viewer.update(result);
  }catch(e){$('3d-status').textContent='3D viewer unavailable · reference view shown';console.error(e);}
}
