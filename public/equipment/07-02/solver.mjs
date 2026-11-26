// Trace values describe chamber air. Occupancy is a half-open interval [enter, leave).
export const DEVICE = '07-02';
export const VERSION = '1.0.0';
export const SCHEMA = 'bts.incubator.exposure.v1';
export const sourcePage = 'https://knowledge1.thermofisher.com/Lab_Equipment/CO2_Incubators/Thermo_Scientific_Heraeus_CO2_Incubators/Thermo_Scientific_Heraeus_Operator_Manuals/Recovery_and_Gas_Consumption_Graphs';
export const defaults = {temp_C:37, co2_pct:5, duration_s:1200, start_s:270, open_s:30, glass:true, gasConnected:true};
export const exampleSamples = [
  {sampleId:'VIOS-A', shelf:1, enter_s:0, leave_s:600, parentRevision:0},
  {sampleId:'VIOS-B', shelf:3, enter_s:900, leave_s:1200, parentRevision:0}
];
const channels = ['temp_C','co2_pct'];
const units = {time_s:'s', temp_C:'°C', co2_pct:'vol %'};
const between = (x,a,b) => Number.isFinite(x) && x>=a && x<=b;
function requireValue(ok,message) { if (!ok) throw new Error(message); }
export function validateTrace(trace) {
  const {readings, events, provenance} = trace;
  requireValue(provenance?.label && provenance?.kind,'Identify the trace source.');
  requireValue(Array.isArray(readings) && readings.length>=2 && readings.length<=7201,'Supply 2–7,201 timestamped readings.');
  requireValue(readings[0].time_s===0,'The clock must start at 0 s.');
  const present = channels.filter(k=>readings[0][k]!==null);
  requireValue(present.length,'Supply temperature, CO₂ or both.');
  for (let i=0;i<readings.length;i++) {
    const r=readings[i], dt=i?r.time_s-readings[i-1].time_s:0;
    requireValue(between(r.time_s,0,7200) && (!i || (dt>0 && (provenance.kind==='digitized-replay' || dt<=120))),'Times must increase within 0–7,200 s. Split logs at gaps longer than 120 s.');
    for (const k of channels) {
      if (!present.includes(k)) requireValue(r[k]===null,'Use a consistent set of measured channels.');
      else requireValue(k==='temp_C'?between(r[k],0,60):between(r[k],0,20),'Missing or out-of-range reading. Use 0–60 °C and 0–20 vol % CO₂.');
    }
  }
  const end=readings.at(-1).time_s;
  requireValue(Array.isArray(events),'Door events are required.');
  let last=0;
  for (const e of events) {
    requireValue(between(e.start_s,last,end) && between(e.end_s,e.start_s,end) && e.end_s>e.start_s && typeof e.glass==='boolean','Door events must be ordered, nonoverlapping and within the trace.');
    last=e.end_s;
  }
  return trace;
}
export function validateSamples(samples,end) {
  requireValue(Array.isArray(samples) && samples.length>=1 && samples.length<=12,'Load 1–12 sample reservations.');
  const ids=new Set();
  for(const s of samples) {
    requireValue(typeof s.sampleId==='string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(s.sampleId) && !ids.has(s.sampleId),'Give each sample a unique ID using letters, digits, periods, underscores or hyphens.');
    ids.add(s.sampleId);
    requireValue(Number.isInteger(s.shelf) && s.shelf>=1 && s.shelf<=3,'Choose shelf 1, 2 or 3.');
    requireValue(between(s.enter_s,0,end) && between(s.leave_s,0,end) && s.leave_s>s.enter_s,'Each occupancy window must have positive duration inside the trace (0–'+end+' s).');
    requireValue(Number.isSafeInteger(s.parentRevision) && s.parentRevision>=0 && s.parentRevision<Number.MAX_SAFE_INTEGER,'Parent revision must be a nonnegative integer.');
    if (s.history!==undefined) requireValue(Array.isArray(s.history),'Sample history must be an array.');
    if (s.contactIds!==undefined) requireValue(Array.isArray(s.contactIds) && s.contactIds.every(id=>typeof id==='string'),'Contact IDs must be strings.');
  }
  for(let i=0;i<samples.length;i++) for(const b of samples.slice(i+1)) {
    const a=samples[i];
    requireValue(a.shelf!==b.shelf || a.leave_s<=b.enter_s || b.leave_s<=a.enter_s,'Two samples reserve the same shelf slot at the same time.');
  }
  return samples;
}
// Exact constant-boundary solution dX/dt = ln(2) (target - X) / halfLife.
export function relax(value,target,seconds,halfLife) {
  return target+(value-target)*2**(-seconds/halfLife);
}
export function simulate(config) {
  const {temp_C,co2_pct,duration_s,start_s,open_s,glass,gasConnected}=config;
  requireValue(gasConnected===true,'Connect the virtual CO₂ supply before running the chamber model.');
  requireValue(typeof glass==='boolean' && between(temp_C,25,45) && between(co2_pct,1,15),'Supported setpoints are 25–45 °C and 1–15 vol % CO₂.');
  requireValue(Number.isInteger(duration_s) && between(duration_s,120,3600) && Number.isInteger(start_s) && between(start_s,0,duration_s) && Number.isInteger(open_s) && between(open_s,1,120) && start_s+open_s<=duration_s,'Use whole seconds. Place the complete 1–120 s door visit inside a 120–3,600 s run.');
  const events=[{start_s,end_s:start_s+open_s,glass}];
  const readings=[];
  let t=temp_C,c=co2_pct;
  for(let s=0;s<=duration_s;s++) {
    readings.push({time_s:s,temp_C:t,co2_pct:c});
    const exposed=glass && s>=start_s && s<start_s+open_s;
    t=relax(t,exposed?22:temp_C,1,exposed?30:65);
    c=relax(c,exposed ? 0.04 : co2_pct,1,exposed?15:75);
  }
  return validateTrace({provenance:{kind:'simulated',label:'Single-zone exchange model',version:VERSION,room_C:22,room_co2_pct:0.04,halfLives_s:{glassOpen:{temp_C:30,co2_pct:15},closed:{temp_C:65,co2_pct:75}},doorTiming:'Prescribed in configuration',config:{...config}},readings,events});
}
export const replayFiles = {tc:'tc180-co2.csv', temperature:'center-temperature.csv'};
export function replay(csv,kind) {
  requireValue(Object.hasOwn(replayFiles,kind),'Unknown manufacturer trace.');
  const tc=kind==='tc', start_s=tc?255:326;
  const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>{
    const [time_s,value]=line.split(',').map(Number);
    return {time_s,temp_C:tc?null:value,co2_pct:tc?value:null};
  });
  return validateTrace({provenance:{kind:'digitized-replay',label:tc?'VIOS 160i · TC180 CO₂':'VIOS 160i · chamber-centre temperature',source:sourcePage,sourceDocument:'Recovery and Gas consumption, 2018-08-15',page:tc?5:2,sourceFile:replayFiles[kind],doorTiming:'30 s reported; switch edges placed at first visible departure, not logged',interpolation:'Piecewise linear between digitized graph points; each graph has its own time origin'},readings:rows,events:[{start_s,end_s:start_s+30,glass:true}]});
}
function belowDuration(a,b,dt,level) {
  if(a<level && b<level)return dt;
  if(a>=level && b>=level)return 0;
  const fraction=(level-a)/(b-a);
  return dt*(a<level?fraction:1-fraction);
}
// Binary lookup retains the original knots and linearly interpolates only inside their domain.
export function readingAt(rows,t) {
  requireValue(between(t,rows[0].time_s,rows.at(-1).time_s),'Time outside the trace.');
  let lo=0,hi=rows.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(rows[mid].time_s<=t)lo=mid;else hi=mid;}
  const a=rows[lo],b=rows[hi],f=(t-a.time_s)/(b.time_s-a.time_s);
  const out={time_s:t};
  for(const k of channels) out[k]=a[k]===null?null:a[k]+f*(b[k]-a[k]);
  return out;
}
export function analyze(trace,samples) {
  validateTrace(trace);
  validateSamples(samples,trace.readings.at(-1).time_s);
  const {readings,events,provenance}=trace;
  const exposures=samples.map(s=>{
    const {enter_s,leave_s}=s, duration=leave_s-enter_s;
    const clip=[readingAt(readings,enter_s),...readings.filter(r=>r.time_s>enter_s && r.time_s<leave_s),readingAt(readings,leave_s)];
    const doorIntervals=events.filter(e=>e.glass && e.start_s<leave_s && e.end_s>enter_s)
      .map(e=>({start_s:Math.max(enter_s,e.start_s),end_s:Math.min(leave_s,e.end_s)}));
    const statistics={};
    for(const k of channels) {
      if(clip[0][k]===null) { statistics[k]=null; continue; }
      const vals=clip.map(r=>r[k]);
      let integral=0,below_s=0;
      const threshold=k==='co2_pct'?4.5:36.5;
      for(let i=1;i<clip.length;i++) {
        const dt=clip[i].time_s-clip[i-1].time_s;
        integral+=(vals[i]+vals[i-1])/2*dt;
        below_s+=belowDuration(vals[i-1],vals[i],dt,threshold);
      }
      statistics[k]={min:Math.min(...vals),max:Math.max(...vals),mean:integral/duration,threshold,below_s};
    }
    const revision=s.parentRevision+1;
    return {...s,revision,history:[...(s.history??[]),{deviceId:DEVICE,operation:'attach-chamber-history',parentRevision:s.parentRevision,revision,enter_s,leave_s}],duration_s:duration,glassOpen_s:doorIntervals.reduce((sum,e)=>sum+e.end_s-e.start_s,0),doorIntervals,statistics,readings:clip};
  });
  return {schema:SCHEMA,modelVersion:VERSION,deviceId:DEVICE,catalogNumber:'51030285',units,clock:'elapsed seconds from first reading',intervalConvention:'[enter_s, leave_s); final knot is the interpolation limit only',provenance,events,chamber:readings,samples:exposures};
}
export function importCSV(text,label) {
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  requireValue(lines.shift()?.trim()==='time_s,temp_C,co2_pct,glass_open','Required CSV header: time_s,temp_C,co2_pct,glass_open');
  let openAt=null;
  const readings=[],events=[];
  for(const line of lines) {
    const f=line.split(',').map(s=>s.trim());
    requireValue(f.length===4 && f[0]!=='' && ['0','1'].includes(f[3]),'Each CSV row needs a time, channel values and a 0/1 glass-door switch.');
    const time_s=Number(f[0]);
    readings.push({time_s,temp_C:f[1]===''?null:Number(f[1]),co2_pct:f[2]===''?null:Number(f[2])});
    if(f[3]==='1' && openAt===null)openAt=time_s;
    if(f[3]==='0' && openAt!==null){events.push({start_s:openAt,end_s:time_s,glass:true});openAt=null;}
  }
  if(openAt!==null && readings.at(-1).time_s>openAt)events.push({start_s:openAt,end_s:readings.at(-1).time_s,glass:true});
  return validateTrace({readings,events,provenance:{kind:'imported',label,doorTiming:'User-supplied glass switch; outer pose inferred',measurementStatus:'User-supplied, unverified'}});
}
export function exposureCSV(result) {
  const rows=['sample_id,revision,shelf,clock_s,temp_C,co2_pct,occupied,glass_open,source_kind'];
  for(const s of result.samples) {
    const knots=new Set(s.readings.map(r=>r.time_s));
    for(const e of s.doorIntervals){knots.add(e.start_s);knots.add(e.end_s);}
    for(const time_s of [...knots].sort((a,b)=>a-b)){
      const r=readingAt(result.chamber,time_s),occupied=time_s<s.leave_s;
      const open=occupied && s.doorIntervals.some(e=>time_s>=e.start_s && time_s<e.end_s);
      rows.push([s.sampleId,s.revision,s.shelf,time_s,r.temp_C??'',r.co2_pct??'',+occupied,+open,result.provenance.kind].join(','));
    }
  }
  return rows.join('\r\n')+'\r\n';
}
