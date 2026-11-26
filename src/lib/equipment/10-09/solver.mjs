// Read-only deterministic replay and labeling of a synthetic bench fixture, not real RHS data.
export const DT=0.0005,COUNT=121,PRIMARY='A-01';
export const PORTS=Object.freeze({A:{headstageId:'M4032-A',capacity:32},B:{headstageId:'M4016-B',capacity:16},C:{headstageId:'M4032-C',capacity:32},D:null});
const fixed=Object.freeze({'A-01':[40,.012],'A-02':[42,-.010],'B-01':[46,.016],'C-01':[38,.008]});
const trace=([k,volts])=>Array.from({length:COUNT},(_,i)=>i<k||i>=k+10?0:volts*(i<k+6?1:.5));
const data=Object.freeze(Object.fromEntries(Object.entries(fixed).map(([k,v])=>[k,Object.freeze(trace(v))])));
const find=v=>v.findIndex(x=>Math.abs(x)>=.005);
const round=x=>Number(x.toFixed(12));
export const initial=()=>({selected:PRIMARY,relative:false,result:null,error:'',revision:0});
export function replay(id,revision=0){
 if(typeof id!=='string'||!/^[A-D]-[0-9]{2}$/.test(id))throw Error('Select a catalogued channel label.');
 const port=id[0],stage=PORTS[port];if(!stage)throw Error('Port '+port+' is empty. No trace is available.');
 if(Number(id.slice(2))<1||Number(id.slice(2))>stage.capacity)throw Error('Channel is outside that headstage family.');
 if(!Object.hasOwn(data,id))throw Error('No synthetic trace was stored for '+id+'. No samples were invented.');
 const samples=[...data[id]],markerIndex=find(samples),referenceIndex=find(data[PRIMARY]),relativeToAms=round((markerIndex-referenceIndex)*DT*1000);
 return {schema:'bts.analog-waveform.v1',deviceId:'10-09',sampleId:'rhs-synthetic-bench-01',kind:'simulated',revision:revision+1,parentRevision:revision,source:'Synthetic static inert bench replay, not measured RHS data',dtS:DT,startS:0,
   channels:[{id,unit:'V',samples}],playback:{port,headstageId:stage.headstageId,markerIndex,markerTimeS:round(markerIndex*DT),referenceChannel:PRIMARY,referenceIndex,relativeToAms,peakAbsV:Math.max(...samples.map(Math.abs))},
   provenance:{modality:'read-only fixed synthetic voltages',rack:'Intan M4200',notHardwareConnected:true,timestamp:'native n×0.0005 s, zero-based',alignmentMethod:'first magnitude crossing of 0.005 V, compared with A-01; no resampling'}};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='align')return {...s,relative:!s.relative};
 if(id==='select'){s={...s,selected:p,result:null,error:''};return act(s,'read');}
 if(id==='read'){try{const result=replay(s.selected,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...s,result:null,error:e.message};}}
 throw Error('Unknown passive playback action');
}
export function csv(r){const c=r.channels[0];return ['sampleId,revision,channelId,headstageId,time_s,voltage_v',...c.samples.map((v,i)=>[r.sampleId,r.revision,c.id,r.playback.headstageId,round(r.startS+i*r.dtS),v].join(','))].join('\n')+'\n';}
