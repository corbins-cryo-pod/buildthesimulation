export const MODEL='09-05 Tektronix 465B analog A sweep v1';
export const YS=[.005,.01,.02,.05,.1,.2,.5,1,2,5],XS=[.1,.2,.5,1,2,5];
export const HP_COUPLING_HZ=10;
const ok=(state,result)=>({ok:true,state,...(result?{result}:{})});
const fail=(code,message)=>({ok:false,code,message});
const bounded=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
export const initial=()=>({power:true,input:'cal',probe:1,coupling:'DC',channel:'CH1',vDiv:.1,msDiv:.2,posDiv:0,levelV:.15,slope:'rising',mode:'NORM',armed:false,intensity:.68,focus:.81,source:null,revision:0});
const cal={dtS:1/256000,t0S:0,sampleId:'465B-NOMINAL-CAL',revision:0,channels:[{id:'CAL',unit:'V',samples:Array.from({length:32768},(_,i)=>i%256<128?.3:0)}]};
const sine={dtS:1/256000,t0S:0,sampleId:'465B-1KHZ-BENCH',revision:0,channels:[{id:'SOURCE',unit:'V',samples:Array.from({length:32768},(_,i)=>.4*Math.sin(2*Math.PI*(i%256)/256))}]};
export function inspectInput(p){
 if(!p||p.schema!=='bts.analog-waveform.v1'||!bounded(p.dtS,1/2e6,.002)||typeof p.sampleId!=='string'||p.sampleId.length>128||!Number.isInteger(p.revision)||!Array.isArray(p.channels)||!p.channels.length||p.channels.length>2)return false;
 const n=p.channels[0].samples?.length;
 return n>=16&&n<=65536&&p.channels.every(c=>c.unit==='V'&&Array.isArray(c.samples)&&c.samples.length===n&&c.samples.every(v=>bounded(v,-20,20)));
}
function AC(x,dt){
 const k=Math.tan(Math.PI*HP_COUPLING_HZ*dt),a=(1-k)/(1+k),b=1/(1+k);
 let last=x[0],y=0;
 return x.map(v=>{y=a*y+b*(v-last);last=v;return y;});
}
function crosses(y, l, slope){
 const rises=slope==='rising',ts=[];
 for(let i=1;i<y.length;i++){
  const a=y[i-1],b=y[i];
  if(rises?a<l&&b>=l:a>l&&b<=l)ts.push(i-1+(l-a)/(b-a));
 }
 return ts;
}
function at(x,q){
 const i=Math.floor(q),r=q-i;
 return i>=x.length-1?x.at(-1):x[i]+r*(x[i+1]-x[i]);
}
function extrema(arr){let lo=Infinity,hi=-Infinity;for(const y of arr){lo=Math.min(lo,y);hi=Math.max(hi,y);}return [lo,hi];}
function resultBase(s,src,outcome,windowS) {
 return {schema:'bts.analog-trace.screen.v1',source:'09-05 Tektronix 465B',kind:'simulated',model:MODEL,outcome,windowS,graticule:{horizontalDivisions:10,verticalDivisions:8,metersPerDivision:.01},settings:{probe:s.probe,voltsPerDivision:s.vDiv,tipVoltsPerDivision:s.vDiv*s.probe,msPerDivision:s.msDiv,coupling:s.coupling,channel:s.channel,triggerLevelBncV:s.levelV,slope:s.slope,mode:s.mode,positionDiv:s.posDiv},parent:{sampleId:src.sampleId,revision:src.revision,dtS:src.dtS,source:src.source??'Virtual electrical witness'}};
}
export function sweep(s){
 if(!s.power)return fail('standby','Switch the oscilloscope on.');
 const src=s.input==='file'?s.source:s.input==='sine'?sine:cal;
 if(!src)return fail('input','Load a compatible waveform before selecting File.');
 const n=s.channel==='CH2'?1:0;
 // Internally provided reference is one electrical source manually routed to the selected input.
 let v=src.channels[s.input==='file'?n:0]?.samples;
 if(!v&&s.coupling!=='GND')return fail('channel','This file only has CH1 data.');
 v??=src.channels[0].samples;
 const dt=src.dtS,y0=v.map(x=>x/s.probe),trace=s.coupling==='AC'?AC(y0,dt):s.coupling==='GND'?y0.map(()=>0):y0;
 const windowS=10*s.msDiv/1000,span=windowS/dt;
 const meta=(tag)=>resultBase(s,src,tag,windowS);
 if(s.mode==='SINGLE'&&!s.armed)return ok(s,meta('not-armed'));
 if(span<2||span>trace.length-1)return fail('time-base','Not enough source points or record duration for the selected 10-division sweep.');
 const edges=crosses(trace,s.levelV,s.slope).filter(x=>x+span<=trace.length-1);
 const trig=edges[0];
 if(trig===undefined&&s.mode!=='AUTO')return ok(s,meta('blank'));
 const start=trig??0, measuredPeriodS=edges.length>=2?(edges[1]-edges[0])*dt:null;
 // A virtual spot is evaluated on an ideal piecewise-linear input. Include its
 // recorded breakpoints, then the uniform rendered points, to preserve corners.
 const pts=[start];
 const end=start+span;
 for(let i=Math.floor(start)+1;i<end;i++)pts.push(i);
 pts.push(end);
 const vals=pts.map(x=>at(trace,x)),[lo,hi]=extrema(vals), vpp=hi-lo;
 const screen=pts.map((q,i)=>({timeS:(q-start)*dt,spotXDiv:10*(q-start)/span,spotYDiv:vals[i]/s.vDiv+s.posDiv,inputBncV:vals[i]}));
 const result={...meta(trig===undefined?'free-run':'triggered'),triggerTimeS:(Number.isFinite(src.t0S)?src.t0S:0)+start*dt,thresholdSampleV:vals[0],summary:{inputBncVpp:vpp,tipEquivalentVpp:vpp*s.probe,visibleDivisions:vpp/s.vDiv,estimatedPeriodS:measuredPeriodS,clipped:screen.some(p=>Math.abs(p.spotYDiv)>4)},screen};
 return ok({...s,revision:s.revision+1,armed:false},{...result,revision:s.revision+1});
}
export function dispatch(s,a,value){
 if(a==='power')return ok({...s,power:!s.power,armed:false});
 if(a==='reset')return ok({...initial(),revision:s.revision});
 if(!s.power)return fail('standby','Switch the oscilloscope on.');
 if(a==='sweep')return sweep(s);
 if(a==='arm')return ok({...s,mode:'SINGLE',armed:true});
 if(a==='import')return inspectInput(value)?ok({...s,input:'file',source:value}):fail('waveform','Import one or two uniformly sampled signed voltage channels in bts.analog-waveform.v1 format.');
 if(a==='select-mode')return dispatch(s,'set',{mode:value});
 if(a==='step-level')return dispatch(s,'set',{levelV:s.levelV>=.5?-.1:Number((s.levelV+.05).toFixed(4))});
 if(a==='step-position')return dispatch(s,'set',{posDiv:s.posDiv>=3?-3:s.posDiv+.5});
 if(a==='step-intensity')return dispatch(s,'set',{intensity:s.intensity>=.9?.2:Number((s.intensity+.1).toFixed(2))});
 if(a==='step-focus')return dispatch(s,'set',{focus:s.focus>=.9?.25:Number((Math.min(1,s.focus+.1)).toFixed(2))});
 if(a==='cycle-coupling')return dispatch(s,'set',{coupling:['DC','AC','GND'][(['DC','AC','GND'].indexOf(s.coupling)+1)%3]});
 if(a==='cycle-slope')return dispatch(s,'set',{slope:s.slope==='rising'?'falling':'rising'});
 if(a==='step-y'||a==='step-x'){
  const l=a==='step-y'?YS:XS,k=a==='step-y'?'vDiv':'msDiv';
  return dispatch(s,'set',{[k]:l[(l.indexOf(s[k])+1)%l.length]});
 }
 if(a==='set'){
  const q={...s,...value};
  if(!['cal','sine','file'].includes(q.input)||![1,10].includes(q.probe)||!['DC','AC','GND'].includes(q.coupling)||!['CH1','CH2'].includes(q.channel)||!YS.includes(q.vDiv)||!XS.includes(q.msDiv)||!bounded(q.posDiv,-4,4)||!bounded(q.levelV,-5,5)||!['rising','falling'].includes(q.slope)||!['AUTO','NORM','SINGLE'].includes(q.mode)||!bounded(q.intensity,.1,1)||!bounded(q.focus,0,1))return fail('settings','Use modeled sensitivity, time base, mode and on-screen limits.');
  return ok({...q,armed:'mode' in value&&value.mode!==s.mode?false:q.armed});
 }
 return fail('action','Unsupported analog-scope action.');
}
export const toCsv=r=>'time_since_sweep_s,x_div,y_div,bnc_input_V\n'+r.screen.map(p=>[p.timeS,p.spotXDiv,p.spotYDiv,p.inputBncV].join(',')).join('\n')+'\n';
