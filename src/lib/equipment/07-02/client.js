import { drawChart } from './chart.js';
const base='/equipment/07-02/';
const $=id=>document.getElementById('vios-'+id);
async function fetchText(path){
  const r=await fetch(base+path);
  if(!r.ok)throw Error('Unable to load '+path+' (HTTP '+r.status+').');
  return r.text();
}
function download(name,contents,type) {
  const url=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function putRow(parent,tag,values){
  const tr=document.createElement('tr');
  for(const v of values){const c=document.createElement(tag);c.textContent=String(v);tr.append(c);}
  parent.append(tr);
}
export async function init() {
  const solverURL=base+'solver.mjs';
  const {defaults,exampleSamples,simulate,analyze,validateSamples,replay,replayFiles,readingAt,exposureCSV,importCSV}=await import(/* @vite-ignore */ solverURL);
  let trace=null,custom=null,samples=structuredClone(exampleSamples),result=null,time=0,paused=true;
  let viewer=null,moveCursor=()=>{},inspection={outerOpen:true,glassOpen:false},currentFrame=0,loadSeq=0;
  const handoffURL=base+'handoff.mjs';
  const getHandoff=()=>import(/* @vite-ignore */ handoffURL);
  const cache=new Map(),mode=$('mode'),chart=$('chart'),msg=t=>{$('status').textContent=t;};
  const modelFields=['temp_C','co2_pct','duration_s','start_s','open_s'];
  const conf=()=>({...Object.fromEntries(modelFields.map(k=>[k,$(k).valueAsNumber])),glass:$('access').value==='glass',gasConnected:$('connected').checked});
  const end=()=>trace?.readings.at(-1).time_s??0;
  function sampleForm(){
    const body=$('schedules');body.replaceChildren();
    for(const [i,s] of samples.entries()) {
      const row=document.createElement('tr');
      for(const [key,label] of [['sampleId','Sample ID'],['shelf','Shelf'],['enter_s','Enter at seconds'],['leave_s','Leave at seconds']]){
        const td=document.createElement('td'),el=document.createElement(key==='shelf'?'select':'input');
        if(key==='shelf')for(const v of [1,2,3])el.add(new Option(v,v));
        else if(key==='sampleId'){el.type='text';el.maxLength=64;}
        else {el.type='number';el.min='0';el.step='any';}
        el.setAttribute('aria-label',label+' for reservation '+(i+1));el.value=s[key];
        el.addEventListener('input',()=>{
          s[key]=key==='sampleId'?el.value:el.value===''?NaN:Number(el.value);
          invalidate();paintChart();sync();
        });
        td.append(el);row.append(td);
      }
      const td=document.createElement('td'),rm=document.createElement('button');rm.textContent='Remove';rm.disabled=samples.length<=1;
      rm.setAttribute('aria-label','Remove reservation '+(i+1));rm.onclick=()=>{samples.splice(i,1);sampleForm();invalidate();paintChart();sync();};
      td.append(rm);row.append(td);body.append(row);
    }
    $('add').disabled=samples.length>=12;
  }
  function stop(){paused=true;cancelAnimationFrame(currentFrame);$('play').textContent='Play trace';}
  function invalidate(){
    stop();result=null;$('result').hidden=true;$('transfer').disabled=$('json').disabled=$('csv').disabled=true;
    $('timeline').disabled=$('play').disabled=true;time=0;msg('Setup changed. Run the experiment to update the sample histories.');
  }
  function sync(){
    const row=trace?readingAt(trace.readings,time):{temp_C:null,co2_pct:null},e=trace?.events.find(e=>time>=e.start_s&&time<e.end_s);
    const pose=result?{outerOpen:!!e,glassOpen:!!e?.glass}:inspection;
    const here=samples.filter(s=>s.enter_s<=time&&time<s.leave_s);
    viewer?.sync({...pose,row,occupants:here});
    $('outer').textContent=pose.outerOpen?'Close outer door':'Open outer door';
    $('glass').textContent=pose.glassOpen?'Close glass door':'Open glass door';
    $('outer').disabled=!!result || pose.glassOpen;$('glass').disabled=!!result || !pose.outerOpen;
    $('bench').disabled=!result;
    $('clock').textContent=time.toFixed(0)+' s';
    $('temp').textContent=row.temp_C===null?'—':row.temp_C.toFixed(2)+' °C';
    $('co2').textContent=row.co2_pct===null?'—':row.co2_pct.toFixed(2)+' %';
    $('door-state').textContent=pose.glassOpen?'Glass open':pose.outerOpen?'Outer open':'Sealed';
    $('occupants').textContent=here.length?here.map(s=>s.sampleId+' · shelf '+s.shelf).join(' / '):'Empty';
    $('timeline').value=time;moveCursor(time);
  }
  function paintChart(){
    if(!trace){chart.replaceChildren();moveCursor=()=>{};return;}
    const channel=$('channel').value;
    moveCursor=drawChart(chart,trace,samples.filter(s=>Number.isFinite(s.enter_s)&&Number.isFinite(s.leave_s)&&s.enter_s>=0&&s.leave_s<=end()&&s.enter_s<s.leave_s),channel);
    moveCursor(time);
  }
  function setTrace(value) {
    trace=value;time=0;$('timeline').max=end();
    const channel=$('channel'),choice=channel.value;channel.replaceChildren();
    for(const [key,title] of [['co2_pct','CO₂ (vol %)'],['temp_C','Temperature (°C)']])if(trace.readings[0][key]!==null)channel.add(new Option(title,key));
    if([...channel.options].some(o=>o.value===choice))channel.value=choice;
    $('source').textContent=trace.provenance.label;
    $('event-note').textContent=trace.provenance.doorTiming;
    paintChart();sync();
  }
  async function loadMode(){
    const seq=++loadSeq,key=mode.value;
    invalidate();trace=null;$('source').textContent='';$('event-note').textContent='';paintChart();sync();$('run').disabled=true;
    $('model-settings').hidden=key!=='model';$('log-input').hidden=key!=='imported';
    try {
      let v;
      if(key==='model')v=simulate(conf());
      else if(key==='imported'){
        if(!custom){msg('Choose a logger CSV to load timestamped readings and glass-door states.');return;}
        v=custom;
      } else {
        if(!cache.has(key))cache.set(key,replay(await fetchText('records/'+replayFiles[key]),key));
        v=cache.get(key);
      }
      if(seq!==loadSeq)return;
      setTrace(v);$('run').disabled=false;msg('Ready. Run the experiment to attach chamber readings to each sample.');
    }catch(e){if(seq===loadSeq)msg(e.message);}
  }
  function showResults() {
    const body=$('metrics');body.replaceChildren();
    const channel=$('channel').value,unit=channel==='co2_pct'?'vol %':'°C';
    $('metric-head').textContent='Minimum ('+unit+')';$('mean-head').textContent='Mean ('+unit+')';
    $('below-head').textContent='Below '+(channel==='co2_pct'?'4.5 vol %':'36.5 °C')+' (s)';
    for(const s of result.samples){
      const a=s.statistics[channel];
      putRow(body,'td',[s.sampleId,s.shelf,s.enter_s+'–'+s.leave_s,s.glassOpen_s.toFixed(1),a.min.toFixed(2),a.mean.toFixed(2),a.below_s.toFixed(1)]);
    }
    $('result').hidden=false;$('transfer').disabled=$('json').disabled=$('csv').disabled=false;
  }
  $('run').onclick=()=>{
    try {
      if(!trace)throw Error('Choose a valid input first.');
      stop();result=analyze(trace,samples);
      // The deepest departure is immediately inspectable; the entire timeline remains available.
      const key=$('channel').value;
      time=trace.readings.reduce((lowest,r)=>r[key]<lowest[key]?r:lowest).time_s;
      $('timeline').disabled=$('play').disabled=false;showResults();sync();
      msg('Run complete. '+result.samples.length+' sample histories are ready to inspect or export.');
    } catch(e){invalidate();msg(e.message);sync();}
  };
  $('play').onclick=()=>{
    if(!result)return;
    if(!paused){stop();return;}
    if(time>=end())time=0;
    paused=false;$('play').textContent='Pause';
    let last=performance.now();
    function tick(now){
      if(paused)return;
      const step=(now-last)/1000;
      // Render the recorded clock at 30x and update the display at up to 12 Hz.
      if(step>=1/12){time=Math.min(end(),time+step*30);last=now;sync();}
      if(time>=end()){stop();return;}
      currentFrame=requestAnimationFrame(tick);
    }
    currentFrame=requestAnimationFrame(tick);
  };
  $('timeline').oninput=()=>{stop();time=$('timeline').valueAsNumber;sync();};
  $('bench').onclick=()=>{invalidate();inspection={outerOpen:true,glassOpen:false};sync();msg('Setup mode. Inspect the doors or edit the shelf reservations.');};
  $('outer').onclick=()=>{inspection.outerOpen=!inspection.outerOpen;sync();};
  $('glass').onclick=()=>{inspection.glassOpen=!inspection.glassOpen;sync();};
  $('channel').onchange=()=>{paintChart();if(result)showResults();};
  $('add').onclick=()=>{let i=samples.length+1;while(samples.some(s=>s.sampleId==='VIOS-'+i))i++;samples.push({sampleId:'VIOS-'+i,shelf:2,enter_s:0,leave_s:end()||300,parentRevision:0});sampleForm();invalidate();paintChart();sync();};
  $('manifest').onchange=async event=>{
    const f=event.target.files[0];if(!f)return;
    try{if(f.size>250000)throw Error('Sample map exceeds 250 KB.');const data=JSON.parse(await f.text());const next=Array.isArray(data)?validateSamples(data,end()):(await getHandoff()).fromCabinet(data,end());samples=next;sampleForm();invalidate();paintChart();sync();msg('Imported '+samples.length+' reservations and their parent revisions.');}catch(e){msg('Sample map rejected. '+e.message);}finally{event.target.value='';}
  };
  $('cabinet-example').onclick=async()=>{
    try{
      if(!trace)throw Error('Select a chamber trace first.');
      const response=await fetch('/equipment/07-01/example-session.json');
      if(!response.ok)throw Error('Cabinet example unavailable.');
      const {fromCabinet}=await getHandoff();
      samples=fromCabinet(await response.json(),end());sampleForm();invalidate();paintChart();sync();
      msg('Loaded SEALED-A and SEALED-B from cabinet session A2-EXAMPLE-01. Set the incubator reservations and run.');
    }catch(e){msg(e.message);}
  };
  $('transfer').onclick=async()=>{
    try{if(!result)return;const current=result;const {toCabinet}=await getHandoff();
      const job=toCabinet(current,'VIOS-'+crypto.randomUUID());
      download('07-02-to-07-01.json',JSON.stringify(job,null,2),'application/json');
      msg('Cabinet replay exported. Open station 07-01 and select Import replay.');
    }catch(e){msg(e.message);}
  };
  $('logger').onchange=async event=>{
    const f=event.target.files[0];if(!f)return;
    try{if(f.size>1000000)throw Error('Logger file exceeds 1 MB.');const next=importCSV(await f.text(),f.name);
      custom=next;await loadMode();
      if(trace===next && samples.some(s=>s.leave_s>end())){msg('Logger loaded ('+end()+' s). Adjust the sample windows to fit this clock.');}
    }catch(e){custom=null;await loadMode();msg('Logger rejected. '+e.message);}finally{event.target.value='';}
  };
  $('json').onclick=()=>{if(result)download('07-02-sample-exposure.json',JSON.stringify(result,null,2),'application/json');};
  $('csv').onclick=()=>{if(result)download('07-02-sample-exposure.csv',exposureCSV(result),'text/csv');};
  for(const k of [...modelFields,'access','connected'])$(k).addEventListener('input',loadMode);
  mode.onchange=loadMode;
  $('reset').onclick=()=>{mode.value='tc';samples=structuredClone(exampleSamples);sampleForm();for(const k of modelFields)$(k).value=defaults[k];
    $('access').value='glass';$('connected').checked=true;inspection={outerOpen:true,glassOpen:false};loadMode();viewer?.go('whole');};
  sampleForm();await loadMode();
  try {
    const {makeViewer}=await import('./viewer.js');
    viewer=await makeViewer($('view'));
    $('model-msg').textContent='3D model loaded · metres'+(viewer.software?' · software rendering':'');
    for(const b of document.querySelectorAll('[data-camera]')){
      b.disabled=false;b.onclick=()=>{viewer.go(b.dataset.camera);
        if(!result){if(b.dataset.camera==='controller')inspection={outerOpen:false,glassOpen:false};
          if(b.dataset.camera==='chamber')inspection={outerOpen:true,glassOpen:true};sync();}
      };
    }
    sync();$('poster').hidden=true;
  }catch(e){$('model-msg').textContent='3D view unavailable. Use the illustrated views below or download the GLB. '+e.message;}
}
