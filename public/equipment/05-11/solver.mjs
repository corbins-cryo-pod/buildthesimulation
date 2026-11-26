// Educational FTIR. Wavenumber cm^-1, optical path difference (not mirror displacement) cm.
// Source library is synthetic, not extracted from an instrument or a licensed data library.
export const DX=1/16000, RANGE=Object.freeze([450,4000]), COUNTS=Object.freeze([1024,2048,4096,8192]);
export const LIBRARY=Object.freeze({
 PE:{label:'Polyethylene-like',bands:[[2916,.75,19],[2849,.42,17],[1465,.33,17],[720,.20,12]]},
 PS:{label:'Polystyrene-like',bands:[[3060,.25,14],[3026,.35,17],[2922,.14,23],[1601,.35,13],[1493,.56,13],[1452,.21,17],[758,.65,15],[698,.72,14]]},
 PMMA:{label:'PMMA-like',bands:[[2995,.23,18],[2950,.19,18],[1728,.92,19],[1452,.20,25],[1240,.36,20],[1148,.70,27],[989,.30,19],[840,.19,15]]},
 BLANK:{label:'Clean blank',bands:[]}
});
const req=(ok,m)=>{if(!ok)throw Error(m)},range=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function fft(real,imaginary=null,inverse=false){
 const N=real.length;req(Number.isInteger(N)&&N>=2&&!(N&(N-1))&&N<=16384,'Use bounded radix-2 FFT arrays.');
 const re=Float64Array.from(real),im=imaginary?Float64Array.from(imaginary):new Float64Array(N);req(im.length===N,'Complex array lengths differ.');
 for(let i=1,j=0;i<N;i++){let b=N>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
 for(let l=2;l<=N;l*=2){const w=(inverse?2:-2)*Math.PI/l,cr=Math.cos(w),ci=Math.sin(w);
  for(let i=0;i<N;i+=l){let xr=1,xi=0;
   for(let j=0;j<l/2;j++){const a=i+j,b=a+l/2,v=re[b]*xr-im[b]*xi,u=re[b]*xi+im[b]*xr;re[b]=re[a]-v;im[b]=im[a]-u;re[a]+=v;im[a]+=u;[xr,xi]=[xr*cr-xi*ci,xr*ci+xi*cr]}
  }
 }
 if(inverse)for(let i=0;i<N;i++){re[i]/=N;im[i]/=N}
 return {re,im};
}
export function sampling(N){
 req(COUNTS.includes(N),'Use 1024, 2048, 4096 or 8192 OPD samples.');
 return {count:N,spacingCm:DX,maxAbsOpdCm:N/2*DX,wavenumberPitchCm:1/(N*DX),nyquistCm:1/(2*DX),coordinate:'OPD i*spacingCm - maxAbsOpdCm; cm, not mirror travel'};
}
function pattern(key,w){return LIBRARY[key].bands.reduce((sum,[c,a,s])=>sum+a*Math.exp(-.5*((w-c)/s)**2),0)}
function addNoise(x,RMS,seed){if(!RMS)return x;let s=seed>>>0;const rand=()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)+.5)/4294967296;
 return Float64Array.from(x,v=>v+RMS*Math.sqrt(-2*Math.log(rand()))*Math.cos(2*Math.PI*rand()));
}
export function interferogram(N,key,{tilt=0,noise=0,seed=183}={}){
 req(Object.hasOwn(LIBRARY,key),'Unknown passive specimen.');
 const {wavenumberPitchCm:bin}=sampling(N),I=new Float64Array(N);
 req(range(tilt,-.2,.2)&&range(noise,0,.005),'Unsupported noise or absorbance tilt.');
 for(let k=1;k<N/2;k++){
  const w=k*bin,penumbra=w<350?0:w>7800?0:.24+.75*Math.exp(-.5*((w-2050)/1600)**2);
  const A=pattern(key,w)+(key==='BLANK'?0:tilt*(w-2225)/3550);
  I[k]=I[N-k]=penumbra*10**(-A)*N/2;
 }
 const t=fft(I,null,true).re,centered=Float64Array.from(t,(_,i)=>t[(i+N/2)%N]);
 const peak=Math.max(...centered.map(Math.abs));req(peak>0,'Nominal source invalid.');
 return addNoise(centered,peak*noise,seed);
}
export function reconstruct(z,window='hann'){
 const N=z.length,p=sampling(N);req((window==='hann'||window==='rect')&&Array.from(z).every(Number.isFinite),'Finite interferogram and known window required.');
 const w=Float64Array.from(z,(v,i)=>v*(window==='rect'?1:.5*(1+Math.cos(2*Math.PI*(i-N/2)/N))));
 const F=fft(w);return Array.from({length:N/2},(_,k)=>({wavenumberCm:k*p.wavenumberPitchCm,intensity:Math.hypot(F.re[k],F.im[k])*2/N,unnormalizedMagnitude:Math.hypot(F.re[k],F.im[k])}));
}
export function absorb(B,S){
 req(Number.isFinite(B)&&Number.isFinite(S)&&B>0&&S>0,'A ratio requires positive reference and sample intensity.');
 return -Math.log10(S/B);
}
export function validateIntensities(x){
 req(x?.schema==='bts.ftir-intensity.v1'&&typeof x.sampleId==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(x.sampleId)&&Number.isSafeInteger(x.revision)&&x.revision>=0&&x.revision<1e9,'Expected bts.ftir-intensity.v1 and valid sample ID/revision.');
 req(Array.isArray(x.rows)&&x.rows.length>=8&&x.rows.length<=4000,'Supply 8–4000 paired intensities.');
 for(const [i,r] of x.rows.entries())req(range(r.wavenumberCm,...RANGE)&&Number.isFinite(r.background)&&Number.isFinite(r.sample)&&r.background>0&&r.sample>0&&(i===0||r.wavenumberCm>x.rows[i-1].wavenumberCm),'Use ascending unique 450–4000 cm⁻¹ and positive finite intensities.');
 return x;
}
function profile(x,mode,key){
 if(mode==='none')return x.map(r=>r[key]);
 req(mode==='linear-ends','Unknown baseline mode.');
 const N=Math.max(1,Math.floor(x.length*.04)),mean=(rows,k)=>rows.reduce((s,r)=>s+r[k],0)/rows.length;
 const left=x.slice(0,N),right=x.slice(-N),p=mean(left,'wavenumberCm'),q=mean(right,'wavenumberCm'),a=mean(left,key),b=mean(right,key);
 return x.map(r=>r[key]-a-(b-a)*(r.wavenumberCm-p)/(q-p));
}
function norm(x){const m=x.reduce((a,b)=>a+b,0)/x.length;const z=x.map(v=>v-m),s=Math.sqrt(z.reduce((a,b)=>a+b*b,0));return s<1e-10?null:z.map(v=>v/s)}
export function analyze(x,{baseline='none'}={}){
 validateIntensities(x);const rows=x.rows.map(r=>({...r,transmittance:r.sample/r.background,rawAbsorbance:absorb(r.background,r.sample)}));
 const base=profile(rows,baseline,'rawAbsorbance');rows.forEach((r,i)=>{r.absorbance=base[i]});
 const sig=norm(base),matches=[];
 if(sig&&rows[0].wavenumberCm<750&&rows.at(-1).wavenumberCm>3050)for(const key of ['PE','PS','PMMA']){
  const ideal=rows.map(r=>({wavenumberCm:r.wavenumberCm,b:pattern(key,r.wavenumberCm)})),a=norm(profile(ideal,baseline,'b'));
  if(a)matches.push({label:LIBRARY[key].label,key,correlation:Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*sig[i],0)))});
 }
 matches.sort((a,b)=>b.correlation-a.correlation);
 return {schema:'bts.ftir-absorbance.v1',deviceId:'05-11',sampleId:x.sampleId,parentRevision:x.revision,revision:x.revision+1,rows,matches,comparison:matches[0]?.correlation>=.75?'similar to synthetic library example':'no reliable synthetic-library match',provenance:{kind:x.provenance?.kind??'supplied intensity origin unverified',source:x.provenance??null,history:[{operation:'negative log10(sample/background)'},{operation:'baseline',mode:baseline},{operation:'normalized synthetic shape ranking; not an identification'}]}};
}
export function state(){return {power:true,lid:false,loaded:null,clamp:false,N:4096,window:'hann',noise:0,tilt:0,baseline:'none',background:null,bgTrace:null,trace:null,input:null,result:null}}
export function act(s,a,v){
 s.result=null;
 if(a==='power'){s.power=!s.power;if(!s.power){s.background=null;s.bgTrace=null}return;}
 if(a==='lid'){s.lid=!s.lid;return;}
 if(a==='load'){req(!s.clamp,'Raise the ATR foot before changing sample.');req(v===null||Object.hasOwn(LIBRARY,v),'Use a passive synthetic coupon.');s.loaded=v;return;}
 if(a==='clamp'){req(s.loaded,'Load a sample before lowering the ATR foot.');s.clamp=!s.clamp;return;}
 if(a==='N'||a==='window'||a==='noise'){
  if(a==='N')sampling(v);if(a==='window')req(['hann','rect'].includes(v),'Unknown window.');if(a==='noise')req(range(v,0,.005),'Noise RMS fraction outside range.');
  s[a]=v;s.background=null;s.bgTrace=null;s.trace=null;s.input=null;return;
 }
 if(a==='tilt'||a==='baseline'){req(a==='tilt'?range(v,-.2,.2):['none','linear-ends'].includes(v),'Unsupported processing setting.');s[a]=v;return;}
 if(a==='background'){
  req(s.power&&s.loaded===null&&!s.clamp,'Power on and clear the ATR crystal for background.');
  s.bgTrace=interferogram(s.N,'BLANK',{noise:s.noise,seed:473});s.background=reconstruct(s.bgTrace,s.window);s.trace=null;s.input=null;return;
 }
 if(a==='acquire'){
  req(s.power&&s.loaded&&s.clamp,'Load and seat the coupon against the ATR crystal.');
  req(s.background,'Collect a fresh clean-crystal background for these settings.');
  s.trace=interferogram(s.N,s.loaded,{tilt:s.tilt,noise:s.noise,seed:1147});
  const source=reconstruct(s.trace,s.window),rows=source.filter(x=>range(x.wavenumberCm,...RANGE)).map(x=>({wavenumberCm:x.wavenumberCm,sample:x.intensity,background:s.background[Math.round(x.wavenumberCm/sampling(s.N).wavenumberPitchCm)].intensity}));
  s.input={schema:'bts.ftir-intensity.v1',sampleId:'FTIR-'+s.loaded,revision:0,rows,provenance:{kind:'synthetic',mode:'built-in diamond ATR simulator',window:s.window,noiseRMSFraction:s.noise,imposedTilt:s.tilt,opd:sampling(s.N)}};
  s.result=analyze(s.input,s);return s.result;
 }
 if(a==='import'){s.trace=null;s.input=null;s.input=validateIntensities({...v,provenance:{...(v?.provenance??{}),processingMode:'paired-intensity import; FFT bypassed'}});s.result=analyze(s.input,s);return s.result;}
 if(a==='process'){req(s.input,'Acquire or import intensity pairs before processing.');s.result=analyze(s.input,s);return s.result;}
 throw Error('Unknown FTIR action.');
}
export function csv(r){req(r,'No result to export.');const k=['wavenumberCm','background','sample','transmittance','rawAbsorbance','absorbance'];return ['# sampleId: '+r.sampleId,'# revision: '+r.revision,k.join(','),...r.rows.map(o=>k.map(x=>o[x]).join(','))].join('\n')+'\n';}
