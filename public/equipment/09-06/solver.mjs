export const SOURCE_OHMS = 50;
export const MAX_SAMPLES = 65536;
export const MODEL = '09-06 Thevenin bench model v1';
const functions = ['sine','square','triangle','dc'];
const leads = ['CH1','CH2'];
const num = Number.isFinite;
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const failure = (code,message) => ({ok:false,code,message});
const validReference = n => n === null || (num(n) && n >= 1 && n <= 10_000);
const validLoad = n => n === null || (num(n) && n >= 50 && n <= 10_000_000);
const parse = n => typeof n === 'number' ? n : Number.NaN;
export const divider = ohms => ohms === null ? 1 : ohms/(SOURCE_OHMS+ohms);
const basic = () => ({function:'sine',frequencyHz:1000,offsetOC:0,amplitudeOC:0.2,dutyPct:50,phaseDeg:0,referenceOhms:50,loadOhms:50,enabled:false});
export const initial = () => ({powered:true,focus:0,clockHz:256000,durationS:0.032,revision:0,channels:[basic(),basic()]});
export const display = ch => ({amplitudeVpp:ch.amplitudeOC*divider(ch.referenceOhms),offsetV:ch.offsetOC*divider(ch.referenceOhms)});
export const views = state => state.channels.map(ch => ({...display(ch),actualVpp: ch.function==='dc'?0:ch.amplitudeOC*divider(ch.loadOhms),actualOffsetV:ch.offsetOC*divider(ch.loadOhms)}));
function range(ch) {
  if (!functions.includes(ch.function)) return failure('waveform','Select sine, square, triangle or DC.');
  if (!num(ch.frequencyHz)||ch.frequencyHz<10||ch.frequencyHz>20000) return failure('frequency','This bench covers 10 Hz to 20 kHz.');
  if (!num(ch.phaseDeg)||ch.phaseDeg < 0|| ch.phaseDeg >= 360) return failure('phase','Phase must be at least 0° and less than 360°.');
  if (!num(ch.dutyPct)||ch.dutyPct<5||ch.dutyPct>95) return failure('duty','The square-wave teaching range is 5–95%.');
  if (!validReference(ch.referenceOhms)||!validLoad(ch.loadOhms)) return failure('load','Choose a valid resistive load or High Z.');
  if (!num(ch.amplitudeOC)||ch.amplitudeOC < .002||!num(ch.offsetOC)) return failure('amplitude','Use at least 2 mVpp open circuit (1 mVpp referenced to 50 Ω).');
  if (Math.abs(ch.offsetOC)+(ch.function==='dc'?0:ch.amplitudeOC/2) > 10+1e-12) return failure('headroom','Offset plus AC peak exceeds ±10 V open circuit.');
  return {ok:true};
}
export function dispatch(state, action, value) {
  if(action==='reset') return {ok:true,state:{...initial(),revision:state.revision}};
  if(action==='load-example') {
    const source=initial();
    Object.assign(source.channels[0],{enabled:true,amplitudeOC:2});
    return {ok:true,state:{...source,revision:state.revision}};
  }
  if(action==='power') return {ok:true,state:{...state,powered:!state.powered,channels:state.channels.map(x=>({...x,enabled:false}))}};
  if(!state.powered) return failure('standby','Switch the virtual generator on.');
  if(action==='focus') return [0,1].includes(value)?{ok:true,state:{...state,focus:value}}:failure('channel','Select channel 1 or 2.');
  if(action==='toggle-output') {
    if (![0,1].includes(value)) return failure('channel','Select channel 1 or 2.');
    return {ok:true,state:{...state,channels:state.channels.map((c,i)=>i===value?{...c,enabled:!c.enabled}:c)}};
  }
  if(action==='clock') {
    if (!Number.isInteger(value?.clockHz)||value.clockHz<1000||value.clockHz>2_000_000||!num(value.durationS)||value.durationS<.001||value.durationS>2) return failure('sample-clock','Use 1 kSa/s to 2 MSa/s and 1 ms to 2 s.');
    return {ok:true,state:{...state,clockHz:value.clockHz,durationS:value.durationS}};
  }
  if(action==='configure') {
    const idx=state.focus,ch={...state.channels[idx]};
    if(!value || typeof value!=='object') return failure('settings','Enter valid waveform settings.');
    for(const key of ['function','frequencyHz','dutyPct','phaseDeg','referenceOhms','loadOhms']) if(own(value,key)) ch[key]=value[key];
    if(own(value,'amplitudeVpp')) ch.amplitudeOC=parse(value.amplitudeVpp)/divider(ch.referenceOhms);
    if(own(value,'offsetV')) ch.offsetOC=parse(value.offsetV)/divider(ch.referenceOhms);
    const check=range(ch);
    return check.ok?{ok:true,state:{...state,channels:state.channels.map((c,i)=>i===idx?ch:c)}}:check;
  }
  if(action==='capture') {
    const m=capture(state);
    return m.ok?{ok:true,state:{...state,revision:state.revision+1},result:m.result}:m;
  }
  if(action==='step-frequency') return dispatch(state,'configure',{frequencyHz:Math.max(10,Math.min(20_000,state.channels[state.focus].frequencyHz+[100,-100][value]))});
  return failure('action','This control is not modeled.');
}
function wave(mode,cycle,duty) {
 const p=cycle-Math.floor(cycle);
 if(mode==='sine') return Math.sin(2*Math.PI*p);
 if(mode==='triangle') return 1-4*Math.abs(p-.5);
 if(mode==='square') return p+1e-12 < duty/100 ? 1 : -1;
 return 0;
}
function events(ch, duration) {
 if(ch.function==='dc') return [];
 const startCycles = ch.function==='triangle'?.25:0;
 const frac = ((startCycles-ch.phaseDeg/360)%1+1)%1;
 const list = [];
 for(let i=0;(i+frac)/ch.frequencyHz<duration && i<4096;i++) list.push({id:leads[ch.index]+'-rising',timeS:(i+frac)/ch.frequencyHz,kind:'ideal rising midpoint'});
 return list;
}
export function capture(state) {
 if(!state.powered) return failure('standby','Switch the virtual generator on.');
 const active=state.channels.map((ch,index)=>({...ch,index})).filter(ch=>ch.enabled);
 if(!active.length) return failure('output-off','Enable at least one front output.');
 const {clockHz,durationS}=state,n= Math.round(clockHz*durationS);
 if(!Number.isInteger(clockHz)||clockHz<1000||clockHz>2_000_000||!num(durationS)||durationS<.001||durationS>2||n<16||n>MAX_SAMPLES) return failure('sample-clock','A record must have 16–65,536 points. Adjust sample clock or duration.');
 for(const ch of active) {
  const c=range(ch);if(!c.ok)return c;
  if(ch.function!=='dc'){
   const min=ch.function==='square'?Math.max(20,2/(Math.min(ch.dutyPct,100-ch.dutyPct)/100)):20;
   if(clockHz/ch.frequencyHz < min) return failure('sample-clock','Increase clock to resolve the waveform; short square states need at least two samples.');
   if(n*ch.frequencyHz/clockHz<2) return failure('sample-clock','Capture at least two periods for each enabled AC channel.');
  }
 }
 const dtS=1/clockHz;
 const channels=active.map(ch=>{
  const factor=divider(ch.loadOhms), samples=[], ao=ch.function==='dc'?0:ch.amplitudeOC/2*factor, dc=ch.offsetOC*factor;
  let min=Infinity,max=-Infinity,sum=0,square=0;
  for(let i=0;i<n;i++) {
   const v=dc+ao*wave(ch.function,i*dtS*ch.frequencyHz+ch.phaseDeg/360,ch.dutyPct);
   samples.push(v);min=Math.min(min,v);max=Math.max(max,v);sum+=v;square+=v*v;
  }
  const theoreticalVpp=2*ao;
  return {id:leads[ch.index],unit:'V',samples,parameterSnapshot:{...ch,...display(ch)},metrics:{theoreticalVpp,sampledVpp:max-min,meanV:sum/n,rmsV:Math.sqrt(square/n),powerW:ch.loadOhms===null?0:square/n/ch.loadOhms,nominalFrequencyHz:ch.function==='dc'?null:ch.frequencyHz,mismatch:ch.loadOhms!==ch.referenceOhms},events:events(ch,n*dtS)};
 });
 return {ok:true,result:{schema:'bts.analog-waveform.v1',sampleId:'33622A-BENCH',revision:state.revision+1,dtS,t0S:0,source:'09-06 Keysight 33622A',kind:'simulated',model:MODEL,sourceOhms:SOURCE_OHMS,channels}};
}
export function toCsv(result) {
 return 'time_s,'+result.channels.map(c=>c.id+'_V').join(',')+'\n'+result.channels[0].samples.map((_,i)=>[i*result.dtS,...result.channels.map(c=>c.samples[i])].join(',')).join('\n')+'\n';
}
