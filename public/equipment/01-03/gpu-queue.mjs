// Byte accounting contract only. All textures and jobs here are synthetic metadata.
export const GB=1_000_000_000,HARDWARE_LABEL_BYTES=48*GB,RESERVE_BYTES=4*GB,LIMIT_BYTES=44*GB;
export const volumes={A:{id:'INERT-GRID-A',revision:1,dims:[2048,2048,2048],virtualDurationS:4,renderRef:'synthetic-a'},B:{id:'INERT-GRID-B',revision:2,dims:[2560,1792,1792],virtualDurationS:6,renderRef:'synthetic-b'}};
export const hitActions={Power_button:{action:'step',label:'Advance simulated GPU queue'},Access_latch:{action:'panel',label:'Inspect GPU inside the chassis'},Left_side_access_panel:{action:'panel',label:'Remove virtual access plate'},RTX6000_Ada_card:{action:'quality',label:'Switch preset for the waiting example'}};
const vox=d=>d.reduce((a,b)=>a*b,1);
export function budget(dims,quality='full'){if(dims.length!==3||dims.some(v=>!Number.isSafeInteger(v)||v<1||v>8192))throw Error('Invalid synthetic volume dimensions');if(!['full','overview'].includes(quality))throw Error('Unknown quality preset');const d=quality==='full'?[...dims]:dims.map(v=>Math.ceil(v/2));let mip=0;for(let m=d;Math.max(...m)>1;){m=m.map(v=>Math.max(1,Math.floor(v/2)));mip+=2*vox(m)}
 const components={intensityBytes:2*vox(d),labelBytes:vox(d),intensityMipBytes:mip,stagingBytes:4*vox(d.map(v=>Math.min(256,v))),renderBytes:1920*1080*12};return {quality,dims:d,components,totalBytes:Object.values(components).reduce((a,b)=>a+b,0)}}
export const initial=(quality='full',limit=LIMIT_BYTES)=>{if(!Number.isSafeInteger(limit)||limit<1||limit>HARDWARE_LABEL_BYTES)throw Error('Reserved memory limit is invalid');return {clockS:0,quality,limitBytes:limit,allocatedBytes:0,queue:Object.entries(volumes).map(([id,v])=>({...v,key:id,memory:budget(v.dims,quality)})),running:[],finished:[],events:[]}}
function add(s,type,q){s.events.push({virtualTimeS:s.clockS,kind:type,volumeId:q.id,volumeRevision:q.revision,jobBytes:q.memory.totalBytes,allocatedBytes:s.allocatedBytes});}
export function step(prev){const s={...prev,events:[...prev.events],queue:[...prev.queue],running:[...prev.running],finished:[...prev.finished]};if(!s.queue.length&&!s.running.length)return s;;
 while(s.queue.length&&s.queue[0].memory.totalBytes>s.limitBytes){const q=s.queue.shift();s.finished.push({...q,status:'rejected'});add(s,'reject-budget',q)}
 if(s.running.length&&(!s.queue.length||s.allocatedBytes+s.queue[0].memory.totalBytes>s.limitBytes)){
  s.clockS=Math.min(...s.running.map(q=>q.endS));const done=s.running.filter(q=>q.endS===s.clockS);s.running=s.running.filter(q=>q.endS!==s.clockS);for(const q of done){s.finished.push({...q,status:'complete'});add(s,'complete',q);s.allocatedBytes-=q.memory.totalBytes;add(s,'release',q)}
 }
 while(s.queue.length&&s.allocatedBytes+s.queue[0].memory.totalBytes<=s.limitBytes){const q=s.queue.shift();s.running.push({...q,endS:s.clockS+q.virtualDurationS});s.allocatedBytes+=q.memory.totalBytes;add(s,'start',q)}
 if(!s.queue.length&&!s.running.length&&s.allocatedBytes!==0)throw Error('Leaked allocation');return s;
}
export function action(s,a){if(a==='step')return step(s);if(a==='quality'){if(s.events.length)throw Error('Reset the queue before changing quality.');return initial(s.quality==='full'?'overview':'full',s.limitBytes)}throw Error('Unknown queue action')}
export function run(s){for(let i=0;i<12&&(s.queue.length||s.running.length);i++)s=step(s);return s}
export function report(s){return {schema:'bts.gpu-volume-queue.v1',source:'simulated',instrumentId:'01-03',configuration:'ThinkStation P7 / 1× NVIDIA RTX 6000 Ada',units:{memory:'byte',clock:'virtual second'},hardwareLabelBytes:HARDWARE_LABEL_BYTES,reservedBytes:HARDWARE_LABEL_BYTES-s.limitBytes,...s,limits:'Peak budget model, not free VRAM, real data size, compute time, fps or hardware measurements.'}}
