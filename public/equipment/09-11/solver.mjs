// Original voltage-mode classic RC demonstrator, not manufacturer's firmware.
export const defaults=Object.freeze({source:'tone',signalId:'LOCKED-INPUT-A',contactId:'A',parentRevision:0,ampUv:100,signalHz:1000,signalPhase:30,refHz:1000,refPhase:0,tauMs:10,poles:2,durationMs:200,rangeMv:10,interfererUv:0,interfererHz:1050,connected:true});
const TAU=2*Math.PI,rad=x=>x*Math.PI/180;
const bad=(code,message)=>({ok:false,code,message});
export function enbw(n,t){return [1,1/2,3/8,5/16][n-1]/(4*t)}
export function rcStep(z,u,k){for(let j=0;j<z.length;j++){z[j]+=k*(u-z[j]);u=z[j]}return u}
export function settling(n,t){let lo=0,hi=25;for(let j=0;j<64;j++){const x=(lo+hi)/2;let sum=1,k=1;for(let i=1;i<n;i++){k*=x/i;sum+=k}if(Math.exp(-x)*sum>0.01)lo=x;else hi=x}return t*(lo+hi)/2}
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
function id(x){return typeof x==='string' && x.length>0 && x.length<=100 && !/[\x00-\x1f]/.test(x)}
export function parseCSV(txt,signalId='CSV-INPUT',contactId='A',rev=0){
 if(typeof txt!=='string'||txt.length>3e6)throw Error('CSV too large (3 MB maximum).');
 const meta={};const lines=txt.trim().split(/\r?\n/).filter(line=>{
  if(!line.trimStart().startsWith('#'))return true;
  const m=line.match(/^\s*#\s*([A-Za-z]+)\s*[:=]\s*(.+?)\s*$/);
  if(m&&['sampleId','contactId','revision','source','kind'].includes(m[1]))meta[m[1]]=m[2];return false;
 });
 if(meta.sampleId)signalId=meta.sampleId;if(meta.contactId)contactId=meta.contactId;if(meta.revision!==undefined)rev=Number(meta.revision);
 const header=lines.shift().replace(/^\uFEFF/,'').trim().toLowerCase().replaceAll(' ','');
 if(header!=='time_s,voltage_v')throw Error('Expected CSV header time_s,voltage_V (seconds, volts).');
 if(lines.length<32||lines.length>160000)throw Error('Require 32–160000 samples.');
 let t0,dt;const samples=[];
 for(let i=0;i<lines.length;i++){const fields=lines[i].split(',').map(v=>v.trim());if(fields.length!==2||fields.some(v=>!v||!Number.isFinite(Number(v))))throw Error('Each row needs two finite numbers.');const [t,v]=fields.map(Number);if(i===0)t0=t;if(i===1){dt=t-t0;if(!(dt>0))throw Error('Time must increase.')}if(i>1&&Math.abs(t-t0-i*dt)>Math.max(1e-11,dt*1e-4))throw Error('Uneven sample spacing; no implicit resampling.');samples.push(v)}
 return {schema:'bts.waveform.voltage.v1',signalId,contactId,parentRevision:rev,t0S:t0,sampleRateHz:1/dt,volts:samples,sourceMetadata:meta};
}
export function run(config,signal=null){
 let p={...defaults,...config};if(!p.connected)return bad('disconnected','Signal A is disconnected. Connect A before acquiring.');
 if(!id(p.signalId)||!id(p.contactId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>999999999)return bad('identity','Supply valid signal/contact IDs and revision.');
 if(!['tone','import'].includes(p.source)||!finite(p.refHz,5,10000)||!finite(p.refPhase,-360,360)||![1,2,3,4].includes(p.poles)||![1,3,10,30,100].includes(p.tauMs)||![10,30,100,300,1000].includes(p.rangeMv))return bad('setting','Unsupported reference, phase, classic-RC filter or input range.');
 const T=p.tauMs/1000;let fs,N,t0=0,source;
 if(p.source==='import'){
  if(!signal||signal.schema!=='bts.waveform.voltage.v1'||!Array.isArray(signal.volts)||signal.volts.length<32||signal.volts.length>160000||!finite(signal.sampleRateHz,1,2e6)||!finite(signal.t0S,-1e6,1e6)||signal.volts.some(x=>!Number.isFinite(x))||!id(signal.signalId)||!id(signal.contactId)||!Number.isSafeInteger(signal.parentRevision)||!finite(signal.parentRevision,0,999999999))return bad('waveform','Invalid waveform.v1; check IDs, revision, finite samples, units, rate and length.');
  fs=signal.sampleRateHz;N=signal.volts.length;t0=signal.t0S;if(fs<16*p.refHz||fs*T<16)return bad('sampling','Need at least 16 samples per reference cycle and per RC time constant. Supply a band-limited record.');
  p={...p,signalId:signal.signalId,contactId:signal.contactId,parentRevision:signal.parentRevision};source=(i)=>signal.volts[i];
 }else{
  if(!finite(p.signalHz,5,10000)||!finite(p.signalPhase,-360,360)||!finite(p.ampUv,0,1e6)||!finite(p.interfererUv,0,1e6)||!finite(p.interfererHz,5,10000)||!finite(p.durationMs,10,1000))return bad('setting','Check synthetic signal amplitude, frequency, phase and record length.');
  fs=Math.ceil(Math.max(64000,64*p.refHz,64*p.signalHz,p.interfererUv?64*p.interfererHz:0,64/T));N=Math.round(p.durationMs*fs/1000);if(N>160000)return bad('budget','Record exceeds 160000 integration samples; shorten the acquisition.');
  source=(i,t)=>Math.SQRT2*1e-6*(p.ampUv*Math.sin(TAU*p.signalHz*t+rad(p.signalPhase))+p.interfererUv*Math.sin(TAU*p.interfererHz*t));
 }
 const k=-Math.expm1(-1/(fs*T)),xbuf=Array(p.poles).fill(0),ybuf=Array(p.poles).fill(0),out=[];let peak=0;
 const stride=Math.max(1,Math.ceil(N/700));const times=settling(p.poles,T);
 for(let i=0;i<N;i++){
  const t=t0+i/fs,u=source(i,t);peak=Math.max(peak,Math.abs(u));if(Math.abs(u)>p.rangeMv*.001*(1+1e-12))return bad('overload','Signal exceeds selected peak input range. No measurement was exported.');
  const a=TAU*p.refHz*t+rad(p.refPhase),x=rcStep(xbuf,Math.SQRT2*u*Math.sin(a),k),y=rcStep(ybuf,Math.SQRT2*u*Math.cos(a),k);
  if(i%stride===0||i===N-1){const r=Math.hypot(x,y);out.push([t,u,x,y,r,r<1e-15?null:Math.atan2(y,x)*180/Math.PI])}
 }
 const last=out.at(-1),elapsed=N/fs;return {ok:true,result:{schema:'bts.sr860.measurement.v1',deviceId:'09-11',signalId:p.signalId,contactId:p.contactId,parentRevision:p.parentRevision,revision:p.parentRevision+1,provenance:{origin:p.source==='tone'?'simulated-input':'user-supplied samples (not authenticated as measured)',operation:'simulated displayed volts; ideal fundamental dual-phase product + classic RC v1',sourceSchema:p.source==='import'?signal.schema:null,sourceMetadata:p.source==='import'?{sampleId:signal.signalId,contactId:signal.contactId,revision:signal.parentRevision,kind:String(signal.sourceMetadata?.kind??'unspecified').slice(0,100),source:String(signal.sourceMetadata?.source??'unspecified').slice(0,100)}:null},settings:p,units:{time:'s',input:'V instantaneous',X:'V RMS',Y:'V RMS',R:'V RMS',phase:'degrees, signal minus reference'},sampleRateHz:fs,sampleCount:N,displayStride:stride,peakInputV:peak,filter:{tauS:T,poles:p.poles,enbwHz:enbw(p.poles,T),onePercentStepTimeS:times,startupWindowElapsed:elapsed>=times},columns:['time_s','input_V','X_Vrms','Y_Vrms','R_Vrms','phase_deg'],trace:out,final:{xV:last[2],yV:last[3],rV:last[4],phaseDeg:last[5]}}}
}
