// SI input/output. This deterministic teaching model is not Tektronix firmware.
export const defaults=Object.freeze({source:'comp',sinePeakV:1,connected:true,rate:1e6,secDiv:.0005,voltsDiv:.5,centerV:1.25,level:1,edge:'rising',coupling:'DC',factor:10});
const bad=msg=>{throw Error(msg)},finite=(n,label,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi?n:bad(label+' out of range');
const headerUnits=s=>/(?:_uV|\((?:µV|μV|uV)\))$/i.test(s)?1e-6:/(?:_mV|\(mV\))$/i.test(s)?1e-3:/(?:_V|\(V\))$/i.test(s)?1:null;
export function csvSource(text,name='Imported trace'){
 if(typeof text!=='string'||text.length>12e6)bad('CSV must be under 12 MB');
 let raw=[],meta={},notes=[];
 for(const line of text.replace(/^\uFEFF/,'').trim().split(/\r?\n/)){if(line.startsWith('#')){const v=line.slice(1).trim(),k=v.indexOf(':');if(k>0)meta[v.slice(0,k).trim()]=v.slice(k+1).trim();notes.push(v)}else if(line.trim())raw.push(line)}
 const header=(raw.shift()||'').split(',').map(s=>s.trim().replace(/^"|"$/g,'')); let timeUnit=header[0]==='time_s'?1:header[0]==='time_ms'?.001:bad('Time column must be time_s or time_ms');
 const k=header.findIndex((s,i)=>i>0&&headerUnits(s)!==null);if(k<1)bad('Expected a voltage column labelled _V, _mV, _uV or (µV)');
 if(raw.length<4||raw.length>250000)bad('Expected 4–250,000 populated sample rows');
 let times=[],volts=[];for(const line of raw){const c=line.split(',');if(!c[0]?.trim()||!c[k]?.trim())bad('Missing timestamp or voltage');let t=Number(c[0])*timeUnit,v=Number(c[k])*headerUnits(header[k]);if(!Number.isFinite(t)||!Number.isFinite(v)||Math.abs(v)>1e5||t<=(times.at(-1)??-Infinity))bad('Invalid or non-increasing sample');times.push(t);volts.push(v)}
 const dt=(times.at(-1)-times[0])/(times.length-1);for(let i=1;i<times.length;i++)if(Math.abs(times[i]-times[i-1]-dt)>Math.max(1e-12,dt*.001))bad('Source clock must be uniform within 0.1%');
 const revision=Number(meta.revision??0);if(!Number.isSafeInteger(revision)||revision<0||revision>=1e9)bad('Invalid source revision');
 return {id:meta.sampleId||name,contact:meta.contactId||header[k],revision,kind:meta.kind||'imported trace; origin not verified',origin:meta.source||meta.Source||name,notes,times,volts,dt};
}
const pulse=t=>((Math.round(t*1e12)%1e9)+1e9)%1e9<5e8?1:0;
export function acquire(part={},src=null){
 const c={...defaults,...part}; if(!c.connected)bad('CH1 disconnected: attach the probe or import a connected trace');
 if(!['comp','sine','rc','import'].includes(c.source)||!['AC','DC'].includes(c.coupling)||!['rising','falling'].includes(c.edge)||![1,10].includes(c.factor))bad('Unsupported source, coupling, edge or readout factor');
 finite(c.sinePeakV,'Peak amplitude',.000001,10);finite(c.rate,'Sample rate',10,2e6); finite(c.secDiv,'Time/div',.00001,10);finite(c.voltsDiv,'Volts/div',.000001,10);finite(c.centerV,'Vertical center',-100,100);finite(c.level,'Trigger level',-100,100);
 if(c.source==='import'&&!src)bad('Load a uniformly sampled voltage trace first');
 const N=Math.round(c.secDiv*10*c.rate)+1;if(N<16||N>65536)bad('Adjust timebase or sample rate: screen record must contain 16–65,536 samples');
 const npre=Math.floor((N-1)/4),dt=1/c.rate,imp=c.source==='import',srcT=imp?src.times[0]:0;
 // AC coupling is an explicitly illustrative 10 Hz high-pass at the simulated sampling rate.
 const tau=1/(2*Math.PI*10),a=tau/(tau+dt),pre=imp?0:Math.ceil(.1*c.rate),search=imp?Math.min(500000,Math.floor((src.times.at(-1)-srcT)*c.rate+1e-6)+1):Math.max(N*2+2,Math.ceil(.01*c.rate)+N+1);
 if(search<N)bad('Source shorter than requested screen record; shorten time/div');
 function input(i){const t=i*dt; if(imp){const u=Math.min(src.volts.length-1,Math.max(0,t/src.dt)),j=Math.floor(u);return src.volts[j]+(u-j)*((src.volts[j+1]??src.volts[j])-src.volts[j]);}
 if(c.source==='sine')return c.sinePeakV*Math.sin(2*Math.PI*1000*t);
 if(c.source==='comp')return pulse(t)*2.5*1e7/(1e7+1000);
 // Exact periodic steady-state solution for 50% duty, external 1 kΩ, 100 nF series RC; V across capacitor.
 const half=.0005,T=.001,tauRC=.0001,u=((t%T)+T)%T,b=Math.exp(-half/tauRC),hi=1/(1+b),lo=b*hi;
 return u<half?1+(lo-1)*Math.exp(-u/tauRC):hi*Math.exp(-(u-half)/tauRC);
 }
 const crossing=(p,v)=>c.edge==='rising'?p<c.level&&v>=c.level:p>c.level&&v<=c.level;
 const lo=c.centerV-5*c.voltsDiv,hi=c.centerV+5*c.voltsDiv,lsb=(hi-lo)/4095;let xp=input(-pre),yp=0,values=[],flags=[],last=null,trig=-1;
 for(let i=-pre;i<search;i++){let v=input(i),h=a*(yp+v-xp);yp=h;xp=v;if(i<0)continue;
 // All sources use ideal 10:1 physical probe, manual readout factor 1× or 10×. Imports at probe tip.
 const y=(c.coupling==='AC'?h:v)*c.factor/10,clip=y<lo||y>hi,code=Math.max(0,Math.min(4095,Math.round((y-lo)/lsb))),q=lo+code*lsb;
 values.push(q);flags.push(clip);if(trig<0&&i>=npre&&last!==null&&crossing(last,q))trig=i;last=q;if(trig>=0&&i>=trig+N-npre-1)break;
 }
 if(trig<0)bad('No selected trigger edge within acquisition window; adjust level, scale, sample rate or edge');
 const first=trig-npre;if(first+N>values.length)bad('Insufficient post-trigger source samples; shorten time/div or choose another edge');
 const volts=values.slice(first,first+N),clipCount=flags.slice(first,first+N).filter(Boolean).length,times=Array.from({length:N},(_,i)=>(i-npre)*dt);
 const hit=volts.findIndex((v,i)=>i>npre&&crossing(volts[i-1],v));const peakToPeak=volts.reduce((v,x)=>Math.max(v,x),-Infinity)-volts.reduce((v,x)=>Math.min(v,x),Infinity);
 return {schema:'bts.scope.capture.v1',device:'09-04',configuration:'MSO64B / 6-BW-1000 / CH1 TPP1000',sampleId:imp?src.id:'bench-'+c.source,contactId:imp?src.contact:'CH1',revision:(imp?src.revision:0)+1,parentRevision:imp?src.revision:0,source:imp?src.origin:c.source==='comp'?'Nominal 1 kHz, 0–2.5 V probe compensator':c.source==='sine'?'Analytical 1 kHz sine, '+c.sinePeakV+' V peak':'Analytical 1 kHz pulse through RC',kind:imp?'virtual acquisition of imported voltage':'simulated',inputKind:imp?src.kind:'simulated',settings:c,sampling:{rateHz:c.rate,intervalS:dt,n:N,triggerIndex:npre,firstSourceTimeS:srcT+first*dt,triggerSourceTimeS:srcT+trig*dt,timeOrigin:'trigger sample',sourceRateHz:imp?1/src.dt:null},measurements:{peakToPeakV:peakToPeak,rmsV:Math.sqrt(volts.reduce((x,y)=>x+y*y,0)/N),secondEdgeIndex:hit>=0?hit:null,periodS:hit>=0?(hit-npre)*dt:null,clipCount,lsbV:lsb},timeRelativeS:times,voltageV:volts,sourceMetadata:imp?src.notes:[]};
}
export function toCsv(r){
 const clean=x=>String(x).replace(/[\r\n]+/g,' ');
 return ['# sampleId: '+clean(r.sampleId),'# contactId: '+clean(r.contactId),'# revision: '+r.revision,'# source: '+clean(r.source),'# kind: '+clean(r.kind),'# triggerIndex: '+r.sampling.triggerIndex,'# firstSourceTimeS: '+r.sampling.firstSourceTimeS,'# csvOrigin: record start; volts referred to indicated probe tip','time_s,voltage_V',...r.voltageV.map((v,i)=>(i*r.sampling.intervalS).toPrecision(12)+','+v.toPrecision(12))].join('\n')+'\n';
}

export function jsonSource(obj){
 if(obj?.schema!=='bts.analog-waveform.v1')bad('Expected bts.analog-waveform.v1');
 if(typeof obj.sampleId!=='string'||!obj.sampleId.trim()||!Number.isSafeInteger(obj.revision)||obj.revision<0||obj.revision>=1e9)bad('Missing waveform ID or invalid revision');
 finite(obj.dtS,'Source dtS',1e-12,10);
 const ch=obj.channels?.find(c=>c?.unit==='V'&&Array.isArray(c.samples));
 if(!ch||typeof ch.id!=='string'||!ch.id.trim()||ch.samples.length<4||ch.samples.length>250000||!ch.samples.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e5))bad('Expected a labelled volts channel with 4–250,000 finite samples');
 const start=obj.startS??0;finite(start,'startS',-1e7,1e7);
 return {id:obj.sampleId,contact:ch.id,revision:obj.revision,kind:obj.kind||obj.origin||'imported trace',origin:typeof obj.source==='string'?obj.source:obj.sampleId,notes:['schema: bts.analog-waveform.v1',...(obj.provenance?['provenance: '+JSON.stringify(obj.provenance)]:[]),...(obj.source&&typeof obj.source==='object'?['source: '+JSON.stringify(obj.source)]:[])],times:ch.samples.map((_,i)=>start+i*obj.dtS),volts:ch.samples.slice(),dt:obj.dtS};
}

export function importSettings(src){
 const duration=(src.volts.length-1)*src.dt;
 const rate=Math.min(2e6,Math.max(10,1/src.dt,64/duration));
 const secDiv=Math.max(.00001,Math.min(10,Math.max(16/rate,Math.min(duration*.4,1000/rate))/10));
 let min=Infinity,max=-Infinity;for(const x of src.volts){min=Math.min(min,x);max=Math.max(max,x)}
 return {...defaults,source:'import',rate,secDiv,voltsDiv:Math.max(1e-6,Math.min(10,(max-min)/8)),centerV:(max+min)/2,level:(max+min)/2};
}
