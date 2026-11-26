export const source=Object.freeze({
 id:'BTS-OFFLINE-PEAK-COMPARISON-01',revision:'1',kind:'authored static numerical example',sampleIntervalMs:.05,referenceIndex:32,sampleCount:128,
 window:Object.freeze([62,102]),clipOrder:Object.freeze(['L1','L2','L3','L4'])
});
export const thresholds=Object.freeze([3,5,6,7,9]);
export const targets=Object.freeze({Recompute_from_fixed_file:'analyze',Cycle_offline_threshold:'cycleThreshold'});
const events={L1:[],L2:[[74,1],[75,2],[76,1]],L3:[[74,1],[75,4],[76,6],[77,4],[78,1]],L4:[[74,3],[75,5],[76,8],[77,8],[78,3]]};
const immutable=Object.freeze(Object.fromEntries(source.clipOrder.map(id=>{
 const data=Array(source.sampleCount).fill(0);
 // Fixed earlier distractor deliberately lies outside the analysis window; not a generated waveform.
 data[46]=9;for(const [i,v] of events[id])data[i]=v;
 return [id,Object.freeze(data)];
})));
export function clip(id){
 if(!Object.hasOwn(immutable,id))throw new RangeError('Choose a listed offline clip.');
 return {id,dataMv:[...immutable[id]]};
}
export const indexToTimeMs=i=>(i-source.referenceIndex)*source.sampleIntervalMs;
export function analyze(thresholdMv){
 if(!thresholds.includes(thresholdMv))throw new RangeError('Choose a listed analysis-only threshold.');
 const report=source.clipOrder.map(id=>{
  let peakIndex=source.window[0],peakMv=immutable[id][peakIndex];
  for(let i=peakIndex+1;i<=source.window[1];i++)if(immutable[id][i]>peakMv){peakIndex=i;peakMv=immutable[id][i];}
  const qualifies=peakMv>=thresholdMv;
  return {id,windowMaxMv:peakMv,qualifies,peakIndex:qualifies?peakIndex:null,peakOffsetMs:qualifies?indexToTimeMs(peakIndex):null};
 });
 const first=report.find(x=>x.qualifies)??null;
 return {thresholdMv,first,clips:report};
}
export function createStation(){
 const init=()=>({thresholdMv:5,clipId:'L3',result:null,error:null});let s=init();
 const read=()=>structuredClone(s);
 function dispatch(k,p){
  const n={...s,error:null};
  try{
   if(k==='reset'){s=init();return read();}
   if(k==='threshold'){if(!thresholds.includes(p))throw new RangeError('Choose a listed analysis-only threshold.');n.thresholdMv=p;n.result=null;}
   if(k==='cycleThreshold'){n.thresholdMv=thresholds[(thresholds.indexOf(n.thresholdMv)+1)%thresholds.length];n.result=null;}
   if(k==='clip'){clip(p);n.clipId=p;}
   if(k==='analyze'){n.result=analyze(n.thresholdMv);if(n.result.first)n.clipId=n.result.first.id;}
   s=n;
  }catch(e){s={...s,error:e.message};}
  return read();
 }
 return {read,dispatch,hit:n=>Object.hasOwn(targets,n)?dispatch(targets[n]):read()};
}
export function exportRecord(s){
 if(!s.result)throw new Error('Apply the offline rule before exporting.');
 return {schema:'bts.tdt.offline-peak-comparison.v1',equipment:'15-12',source,units:{amplitude:'mV',time:'ms',index:'unitless'},rule:'first fixed file record whose maximum in the inclusive analysis window meets the threshold; earliest index breaks a tie',result:s.result};
}
export function csvRecord(s){
 const r=exportRecord(s);
 const rows=['source_id,revision,clip_id,sample_index,time_ms,source_mV,in_analysis_window,analysis_threshold_mV,qualifying_peak'];
 for(const c of r.result.clips)for(let i=0;i<source.sampleCount;i++){
  rows.push([source.id,source.revision,c.id,i,indexToTimeMs(i).toFixed(2),immutable[c.id][i],i>=source.window[0]&&i<=source.window[1],r.result.thresholdMv,c.peakIndex===i].join(','));
 }
 return rows.join('\n')+'\n';
}
