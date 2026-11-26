export const MODEL='09-10 SR560 ideal bench signal path v1';
export const GAINS=[1,2,5,10,20,50,100,200,500,1000];
export const HP=[.03,.1,.3,1,3,10,30,100,300,1000,3000,10000];
export const LP=[.03,.1,.3,1,3,10,30,100,300,1000,3000,10000,30000,100000];
export const FILTERS=['bypass','hp','hp2','lp','lp2','bp'];
export const SOURCES=['A','A-B','B'];
const SR=256000,N=8192;
const fail=(code,message)=>({ok:false,code,message});
const bounded=(x,l,h)=>typeof x==='number'&&Number.isFinite(x)&&x>=l&&x<=h;
const factor=s=>s.loadOhm===null?1:s.loadOhm/(s.loadOhm+s.outputOhm);
export const initial=()=>({power:true,source:'A-B',coupling:'DC',invert:false,filter:'bypass',hpHz:1000,lpHz:1000,gain:100,outputOhm:50,loadOhm:null,freqHz:1000,ampMpp:20,commonMpp:8,input:null,revision:0});
export function stages(s) {
 if(s.coupling==='AC'&&['hp2','lp2','bp'].includes(s.filter))return null;
 const f=[];
 if(s.coupling==='AC')f.push(['hp',.03]);
 if(s.filter==='hp'||s.filter==='hp2'||s.filter==='bp')f.push(['hp',s.hpHz]);
 if(s.filter==='hp2')f.push(['hp',s.hpHz]);
 if(s.filter==='lp'||s.filter==='lp2'||s.filter==='bp')f.push(['lp',s.lpHz]);
 if(s.filter==='lp2')f.push(['lp',s.lpHz]);
 return f;
}
export function response(s,hz) {
 let amplitude=s.coupling==='GND'?0:1,phase=0;
 for(const [kind,cut] of stages(s)??[]) {
  const r=hz/cut;
  amplitude*=kind==='hp'?r/Math.hypot(1,r):1/Math.hypot(1,r);
  phase+=kind==='hp'?(Math.PI/2-Math.atan(r)):-Math.atan(r);
 }
 return {amplitude,phase};
}
function expectWave(p){
 if(!p||p.schema!=='bts.analog-waveform.v1'||!bounded(p.dtS,1/2e6,.001)||typeof p.sampleId!=='string'||p.sampleId.length>128||!Number.isInteger(p.revision)||!Array.isArray(p.channels)||!p.channels.length||p.channels.length>2)return false;
 const n=p.channels[0].samples?.length;
 return n>=16&&n<=65536&&p.channels.every(c=>c.unit==='V'&&Array.isArray(c.samples)&&c.samples.length===n&&c.samples.every(v=>bounded(v,-20,20)));
}
function settings(s) {
 if(!SOURCES.includes(s.source)||!['DC','AC','GND'].includes(s.coupling)||!FILTERS.includes(s.filter)||!GAINS.includes(s.gain)||!HP.includes(s.hpHz)||!LP.includes(s.lpHz)||![50,600].includes(s.outputOhm)||![50,600,1e6,null].includes(s.loadOhm)||!bounded(s.freqHz,100,10000)||!bounded(s.ampMpp,0,500)||!bounded(s.commonMpp,0,500))return fail('settings','Use the declared source, cutoff, gain, load and stimulus choices.');
 if(!stages(s))return fail('filter-mode','The virtual AC coupling reserves one RC stage; use single HP, single LP or bypass.');
 return {ok:true};
}
function filterTrace(x,kind,fc,dt) {
 // Bilinear, prewarped at the chosen cutoff; initialize to the prior constant value.
 const k=Math.tan(Math.PI*fc*dt),a=(1-k)/(1+k);
 const b0=kind==='lp'?k/(1+k):1/(1+k),b1=kind==='lp'?b0:-b0;
 let x0=x[0],y0=kind==='lp'?x0:0;
 return x.map(u=>{const v=b0*u+b1*x0+a*y0;x0=u;y0=v;return v;});
}
function generated(s) {
 const f=s.freqHz,A=s.ampMpp*.0005,k=s.source==='A-B'?1:s.source==='A'?.5:-.5;
 const c=s.source==='A-B'?0:s.commonMpp*.0005, h=response(s,f),q=response(s,50);
 const src=(t)=>k*A*Math.sin(2*Math.PI*f*t)+c*Math.sin(2*Math.PI*50*t);
 return {dtS:1/SR,input:Array.from({length:N},(_,i)=>src(i/SR)),
 filtered:Array.from({length:N},(_,i)=>A*k*h.amplitude*Math.sin(2*Math.PI*f*i/SR+h.phase)+c*q.amplitude*Math.sin(2*Math.PI*50*i/SR+q.phase)),
 parent:{source:'Generated two-port electrical fixture',sampleId:'SR560-DIFFERENTIAL-CAL',revision:0}};
}
function imported(s) {
 const p=s.input, a=p.channels[0].samples,b=p.channels[1]?.samples;
 if(s.source!=='A'&&!b&&s.coupling!=='GND') return fail('input-routing','This file only has input A; select A or supply both channels.');
 if(stages(s).some(x=>x[1]*p.dtS>=.2))return fail('sample-clock','The waveform clock is too slow for that cutoff; use at least 5 samples per cutoff period.');
 const x=a.map((v,i)=>s.source==='A'?v:s.source==='B'?(b?.[i]??0):v-(b?.[i]??0));
 let filtered=s.coupling==='GND'?x.map(()=>0):[...x];
 for(const [kind,f] of stages(s))filtered=filterTrace(filtered,kind,f,p.dtS);
 return {dtS:p.dtS,t0S:Number.isFinite(p.t0S)?p.t0S:0,input:x,filtered,parent:{source:p.source??'Imported file',sampleId:p.sampleId,revision:p.revision}};
}
function metrics(arr) {
 let lo=Infinity,hi=-Infinity,ss=0;
 for(const v of arr){lo=Math.min(lo,v);hi=Math.max(hi,v);ss+=v*v;}
 return {vpp:hi-lo,rms:Math.sqrt(ss/arr.length),peak:Math.max(Math.abs(hi),Math.abs(lo))};
}
export function capture(s) {
 if(!s.power)return fail('standby','Power on the amplifier.');
 const q=settings(s);if(!q.ok)return q;
 const wave=s.input?imported(s):generated(s);if(wave.ok===false)return wave;
 const x=metrics(wave.input);
 if(s.coupling!=='GND'&&x.peak>1.5)return fail('input-overload','The selected differential or single-ended signal exceeds the simulator’s 1.5 V input peak bound.');
 const gain=s.gain*(s.invert?-1:1);
 const unloaded=wave.filtered.map(x=>x*gain), pre=metrics(unloaded);
 if(pre.peak>5+1e-10)return fail('output-overload','The modeled unloaded output exceeds ±5 V. Reduce gain or input amplitude.');
 const samples=unloaded.map(x=>x*factor(s)), out=metrics(samples);
 const {input,...params}=s;
 return {ok:true,state:{...s,revision:s.revision+1},result:{schema:'bts.analog-waveform.v1',sampleId:wave.parent.sampleId,revision:s.revision+1,
  source:'09-10 SRS SR560',kind:'simulated',model:MODEL,dtS:wave.dtS,t0S:wave.t0S??0,parent:wave.parent,conditions:params,channels:[{id:'OUTPUT',unit:'V',samples}],
  summary:{inputVpp:x.vpp,outputVpp:out.vpp,outputRmsV:out.rms,loadFactor:factor(s),nominalSmallSignalGain:s.gain*factor(s),method:s.input?'Bilinear prewarped at the chosen cutoff; constant prehistory':'Steady-state analytic phasors; two-tone source'}}};
}
export function dispatch(s,a,v) {
 if(a==='power')return {ok:true,state:{...s,power:!s.power}};
 if(a==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(!s.power)return fail('standby','Power on the amplifier.');
 if(a==='capture')return capture(s);
 if(a==='import')return v===null||expectWave(v)?{ok:true,state:{...s,input:v}}:fail('waveform-format','Use a bts.analog-waveform.v1 uniform volts file with one or two channels (16–65,536 samples).');
 if(a==='cycle-source')return dispatch(s,'set',{source:SOURCES[(SOURCES.indexOf(s.source)+1)%SOURCES.length]});
 if(a==='cycle-coupling'){const coupling=['DC','AC','GND'][(['DC','AC','GND'].indexOf(s.coupling)+1)%3];return dispatch(s,'set',{coupling});}
 if(a==='cycle-filter'){const f=s.coupling==='AC'?['bypass','hp','lp']:FILTERS;return dispatch(s,'set',{filter:f[(f.indexOf(s.filter)+1)%f.length]});}
 if(a==='acknowledge')return {ok:true,state:s};
 if(a==='set-output')return dispatch(s,'set',{outputOhm:v});
 if(['step-hp','step-lp'].includes(a)){
  const list=a==='step-hp'?HP:LP,k=a==='step-hp'?'hpHz':'lpHz';
  if(![-1,1].includes(v))return fail('setting','Choose a cutoff step.');
  return dispatch(s,'set',{[k]:list[Math.max(0,Math.min(list.length-1,list.indexOf(s[k])+v))]});
 }
 if(a==='invert')return dispatch(s,'set',{invert:!s.invert});
 if(a==='gain-up'||a==='gain-down'){const i=GAINS.indexOf(s.gain);return dispatch(s,'set',{gain:GAINS[Math.max(0,Math.min(GAINS.length-1,i+(a==='gain-up'?1:-1)))]});}
 if(a==='set'){
  const nx={...s,...v};const q=settings(nx);return q.ok?{ok:true,state:nx}:q;
 }
 return fail('action','Unknown virtual action.');
}
export function toCsv(r){return 'time_s,output_V\n'+r.channels[0].samples.map((v,i)=>(r.t0S+i*r.dtS)+','+v).join('\n')+'\n';}
