const REC='buildthesimulation.synthetic-recording.v1', OUT='buildthesimulation.spike-alignment.v1';
const maxN=4096, radius=2;
function require(ok,msg){if(!ok)throw Error(msg);}
function id(s){return typeof s==='string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/.test(s);}
export const targets=Object.freeze({Raster_screen:'raster',Waveform_screen:'waveform',Run_analysis_button:'run',Trigger_wheel:'trigger',Reset_button:'reset'});
export function example(){
 const waveA=[0,-15,-60,-15,0],waveB=[0,-12,-45,-12,0],vA=Array(40).fill(0),vB=Array(40).fill(0);
 for(const n of [12,28])vA.splice(n-radius,5,...waveA);
 for(const n of [16,32])vB.splice(n-radius,5,...waveB);
 return {schema:REC,recordingId:'toy-2ch-v1',revision:1,provenance:'synthetic',sampleRateHz:2000,startTimeS:0,voltageUnit:'uV',
   channels:[{id:'A',traceUV:vA},{id:'B',traceUV:vB}],
   events:[{id:'spk-a1',channelId:'A',sampleIndex:12},{id:'spk-b1',channelId:'B',sampleIndex:16},{id:'spk-a2',channelId:'A',sampleIndex:28},{id:'spk-b2',channelId:'B',sampleIndex:32}],
   triggers:[{id:'sync-20',sampleIndex:20},{id:'sync-21',sampleIndex:21}]};
}
function parse(d){
 const isOutput=d?.schema===OUT;
 if(isOutput)require(Number.isInteger(d.analysisRevision)&&d.analysisRevision>0&&d.analysisRevision<1e6,'Invalid analysis revision.');
 const s=isOutput?d.recording:d;
 require(s?.schema===REC&&s.provenance==='synthetic'&&s.voltageUnit==='uV','Use a BTS synthetic-recording v1 or spike-alignment v1 JSON in µV.');
 require(id(s.recordingId)&&Number.isInteger(s.revision)&&s.revision>0&&s.revision<1e6,'Invalid recording ID or revision.');
 require(Number.isFinite(s.sampleRateHz)&&s.sampleRateHz>=100&&s.sampleRateHz<=100000&&Number.isFinite(s.startTimeS)&&Math.abs(s.startTimeS)<=1e6,'Expected 100–100,000 Hz and finite recording-relative start time (s).');
 require(Array.isArray(s.channels)&&s.channels.length>0&&s.channels.length<=4,'Expected 1–4 voltage channels.');
 const n=s.channels[0]?.traceUV?.length, validSample=i=>Number.isInteger(i)&&i>=0&&i<n;
 require(Number.isInteger(n)&&n>=5&&n<=maxN,'Expected 5–4096 samples per channel.');
 const ids=new Set();
 for(const c of s.channels){
  require(id(c?.id)&&!ids.has(c.id)&&Array.isArray(c.traceUV)&&c.traceUV.length===n&&c.traceUV.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6),'Channel ID duplicated or voltage samples invalid.');
  ids.add(c.id);
 }
 require(Array.isArray(s.events)&&s.events.length<=256&&Array.isArray(s.triggers)&&s.triggers.length>0&&s.triggers.length<=8,'Expected 0–256 labeled events and 1–8 triggers.');
 const eid=new Set();
 for(const e of s.events){
  require(id(e?.id)&&!eid.has(e.id)&&ids.has(e.channelId)&&validSample(e.sampleIndex),'Duplicate event ID, unknown channel or event off the sample clock.');
  eid.add(e.id);
 }
 const tid=new Set();
 for(const t of s.triggers){
  require(id(t?.id)&&!tid.has(t.id)&&validSample(t.sampleIndex),'Duplicate trigger ID or trigger off the sample clock.');
  tid.add(t.id);
 }
 const triggerId=isOutput?d.triggerId:s.triggers[0].id;
 require(tid.has(triggerId),'Selected trigger is missing.');
 return {recording:{schema:REC,recordingId:s.recordingId,revision:s.revision,provenance:s.provenance,
   sampleRateHz:s.sampleRateHz,startTimeS:s.startTimeS,voltageUnit:s.voltageUnit,
   channels:s.channels.map(c=>({id:c.id,traceUV:[...c.traceUV]})),
   events:s.events.map(({id,channelId,sampleIndex})=>({id,channelId,sampleIndex})),
   triggers:s.triggers.map(({id,sampleIndex})=>({id,sampleIndex}))},triggerId,lastRevision:isOutput?d.analysisRevision:0};
}
function prepped(s,triggerId){
 const trigger=s.triggers.find(t=>t.id===triggerId),fx=s.sampleRateHz;
 require(!!trigger,'Unknown trigger.');
 const rows=s.events.map(e=>{
  const offsetSamples=e.sampleIndex-trigger.sampleIndex;
  return {...e,clockTimeS:s.startTimeS+e.sampleIndex/fx,offsetSamples,offsetMs:1000*offsetSamples/fx};
 }).sort((a,b)=>a.sampleIndex-b.sampleIndex||a.id.localeCompare(b.id,'en'));
 const summary=s.channels.map(c=>{
  const events=rows.filter(r=>r.channelId===c.id),complete=events.filter(e=>e.sampleIndex>=radius&&e.sampleIndex<c.traceUV.length-radius);
  const meanWaveformUV=complete.length?Array.from({length:5},(_,i)=>complete.reduce((sum,e)=>sum+c.traceUV[e.sampleIndex-radius+i],0)/complete.length):null;
  return {channelId:c.id,count:events.length,waveformCount:complete.length,excludedEdgeWaveforms:events.length-complete.length,meanWaveformUV};
 });
 return {trigger:{...trigger,clockTimeS:s.startTimeS+trigger.sampleIndex/fx},samplePeriodMs:1000/fx,events:rows,summary,waveformTimeMs:[-2,-1,0,1,2].map(x=>1000*x/fx)};
}
export function analyze(data,triggerId){
 const p=parse(data);
 return prepped(p.recording,triggerId??p.triggerId);
}
export function exportFile(state){
 require(!!state.result,'Run analysis first.');
 return {schema:OUT,analysisRevision:state.lastRevision,parentAnalysisRevision:state.lastRevision>1?state.lastRevision-1:null,triggerId:state.triggerId,
  provenance:{kind:'synthetic',method:'Provided-label sample-clock alignment and complete centered ±2-sample mean',voltageUnit:'uV',clockUnit:'s',offsetUnit:'ms'},recording:state.recording,analysis:state.result};
}
export function createStation(){
 let s;
 function defaultState(){return {...parse(example()),view:'raster',result:null,error:null};}
 s=defaultState();
 function dispatch(k,p){
  try{
   if(k==='reset')s=defaultState();
   else if(k==='load')s={...parse(p),view:'raster',result:null,error:null};
   else if(k==='trigger'){
    const a=s.recording.triggers,i=a.findIndex(t=>t.id===s.triggerId);
    const triggerId=p??a[(i+1)%a.length].id;
    require(a.some(t=>t.id===triggerId),'Unknown trigger.');
    s={...s,triggerId,result:triggerId===s.triggerId?s.result:null,error:null};
   }else if(k==='run')s={...s,lastRevision:s.lastRevision+1,result:prepped(s.recording,s.triggerId),error:null};
   else if(k==='waveform'||k==='raster')s={...s,view:k,error:null};
   else throw Error('Unknown console action.');
  }catch(e){s={...s,error:e.message};}
  return s;
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):s};
}
