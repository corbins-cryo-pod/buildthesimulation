const schema='buildthesimulation.synthetic-counter-blocks.v1';
export const targets=Object.freeze({Top_shell_overlay:'cutaway',Aux_1_rim:'run',Synthetic_demo_tag:'toggleGap'});
export function fixture(missing=true){
 const firstCounter=1000,blockSize=4;
 const make=i=>({id:'blk-'+i,startCounter:firstCounter+i*blockSize,samples:Array.from({length:blockSize},(_,k)=>[i*blockSize+k,100+i*blockSize+k])});
 return {schema,streamId:'dummy-ramp-2ch',revision:1,provenance:'synthetic',sampleRateHz:1000,voltageUnit:'mV',firstCounter,blockSize,blockCount:4,channelIds:['A','B'],
  blocks:(missing?[2,0,3]:[2,0,3,1]).map(make),events:[{id:'edge-01',counter:1010,line:'M1',edge:'rising'}]};
}
const isId=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(s);
const expect=(x,t)=>{if(!x)throw Error(t);};
export function replay(s){
 expect(s?.schema===schema&&s.provenance==='synthetic'&&s.voltageUnit==='mV','Choose the synthetic-counter-blocks v1 format in millivolts.');
 expect(isId(s.streamId)&&Number.isSafeInteger(s.revision)&&s.revision>0,'Invalid stream ID or revision.');
 expect(Number.isFinite(s.sampleRateHz)&&s.sampleRateHz>=100&&s.sampleRateHz<=100000,'Invalid teaching sample rate, expected 100–100,000 Hz.');
 expect(Number.isSafeInteger(s.firstCounter)&&s.firstCounter>=0&&s.firstCounter<2**48,'Invalid first counter.');
 expect(Number.isInteger(s.blockSize)&&s.blockSize>=1&&s.blockSize<=64&&Number.isInteger(s.blockCount)&&s.blockCount>=1&&s.blockCount<=64,'Expected 1–64 blocks with 1–64 samples each.');
 const n=s.blockSize*s.blockCount,last=s.firstCounter+n-1,t=i=>i/s.sampleRateHz;
 expect(Array.isArray(s.channelIds)&&s.channelIds.length>=1&&s.channelIds.length<=8&&s.channelIds.every(isId)&&new Set(s.channelIds).size===s.channelIds.length,'Invalid or duplicate channel IDs.');
 expect(Array.isArray(s.blocks)&&s.blocks.length<=s.blockCount,'Too many or invalid blocks.');
 expect(Array.isArray(s.events)&&s.events.length<=64,'Too many or invalid markers.');
 const mapped=new Map(),blockIds=new Set();
 for(const b of s.blocks){
  const i=(b?.startCounter-s.firstCounter)/s.blockSize;
  expect(isId(b?.id)&&Number.isSafeInteger(b.startCounter)&&!blockIds.has(b.id)&&Number.isInteger(i)&&i>=0&&i<s.blockCount&&!mapped.has(i),'Block counter is duplicate, misaligned, or outside the window.');
  expect(Array.isArray(b.samples)&&b.samples.length===s.blockSize&&b.samples.every(v=>Array.isArray(v)&&v.length===s.channelIds.length&&v.every(y=>Number.isFinite(y)&&Math.abs(y)<=5000)),'Each block needs ordered finite ±5000 mV channel rows.');
  mapped.set(i,b);blockIds.add(b.id);
 }
 const samples=Array.from({length:n},(_,i)=>{
  const b=mapped.get(Math.floor(i/s.blockSize));
  return {counter:s.firstCounter+i,timeS:t(i),blockId:b?.id??null,valuesMv:b?[...b.samples[i%s.blockSize]]:null};
 });
 const gaps=[];let start=null;
 for(let i=0;i<=n;i++){
  if(i<n&&samples[i].valuesMv===null){if(start===null)start=i;}
  else if(start!==null){gaps.push({counterStart:s.firstCounter+start,counterEnd:s.firstCounter+i-1,timeStartS:t(start),missingSampleCount:i-start});start=null;}
 }
 const eventIds=new Set(),markers=s.events.map(e=>{
  expect(isId(e?.id)&&!eventIds.has(e.id)&&isId(e.line)&&['rising','falling'].includes(e.edge)&&Number.isSafeInteger(e.counter)&&e.counter>=s.firstCounter&&e.counter<=last,'Event has invalid ID, edge, or a counter outside the declared stream.');
  eventIds.add(e.id);const i=e.counter-s.firstCounter;
  return {id:e.id,line:e.line,edge:e.edge,counter:e.counter,zeroBasedSample:i,timeS:t(i),inGap:samples[i].valuesMv===null};
 }).sort((a,b)=>a.counter-b.counter);
 return {schema:'buildthesimulation.counter-replay-result.v1',streamId:s.streamId,sourceRevision:s.revision,provenance:'synthetic electronics replay only',sampleRateHz:s.sampleRateHz,
  clock:{firstCounter:s.firstCounter,lastCounter:last,indexOrigin:'firstCounter',relativeTimeUnit:'s'},
  voltageUnit:'mV',channelIds:[...s.channelIds],receivedBlocks:s.blocks.map(b=>b.id),gapSampleCount:gaps.reduce((sum,g)=>sum+g.missingSampleCount,0),gaps,markers,samples};
}
export function createStation(){
 const start=()=>({source:fixture(),missing:true,result:null,cutaway:false,revision:0,error:null});let s=start();
 function dispatch(k,p){
  if(k==='reset')return s=start();
  if(k==='cutaway')return s={...s,cutaway:!s.cutaway,error:null};
  if(k==='toggleGap'||k==='gap'){
   const q=k==='toggleGap'?(s.missing===null?true:!s.missing):Boolean(p);
   return s={...s,missing:q,source:fixture(q),result:null,error:null};
  }
  try{
   if(k==='load'){const f=structuredClone(p);replay(f);return s={...s,source:f,missing:null,result:null,error:null};}
   if(k==='run'){const result=replay(s.source);return s={...s,result:{...result,analysisRevision:s.revision+1},revision:s.revision+1,error:null};}
   throw Error('Unknown replay action.');
  }catch(e){return s={...s,error:e.message};}
 }
 return {read:()=>s,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):s};
}
export function csv(r){
 const by=new Map();for(const e of r.markers){const a=by.get(e.counter)??[];a.push(e.id);by.set(e.counter,a);}
 const lines=['counter,time_s,'+r.channelIds.map(n=>n+'_mV').join(',')+',gap,marker_ids'];
 for(const s of r.samples)lines.push([s.counter,s.timeS,...(s.valuesMv??r.channelIds.map(()=>'')),s.valuesMv===null?'1':'0',(by.get(s.counter)??[]).join('|')].join(','));
 return lines.join('\n')+'\n';
}
