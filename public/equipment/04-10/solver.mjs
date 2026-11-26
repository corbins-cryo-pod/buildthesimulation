const base='/equipment/04-10/',check=(v,m)=>{if(!v)throw Error(m);};
export const initial=()=>({row:18,display:0});
export const load=async()=>{const r=await fetch(base+'chart-pair.json');check(r.ok,'Archive HTTP '+r.status);return validate(await r.json());};
export function validate(f){
 check(f?.schema==='bts.synthetic-printed-chart-pair.v1'&&f.sampleId==='CAL-R4-PRINTED-PAIR-001'&&f.revision===1&&typeof f.provenance==='string','Invalid synthetic archive metadata.');
 check(f.shapePx?.join()==='54,36'&&f.pixelSizeMm===.25,'Unsupported synthetic scale or raster frame.');
 check(f.charts?.length===2,'Two fixed charts are required.');
 for(const [i,c] of f.charts.entries()){
  check(c.id==='R4-EXHIBIT-'+['A','B'][i]&&c.encoding==='one-horizontal-ink-span-per-row'&&c.rows?.length===36,'Unexpected archived chart.');
  for(const span of c.rows)check(Array.isArray(span)&&span.length===3&&span.every(n=>Number.isInteger(n)&&n>=0)&&span.reduce((a,b)=>a+b,0)===54,'Malformed archived chart row.');
 }
 return f;
}
export function inspect(f,s){
 check(Number.isInteger(s.row)&&s.row>=0&&s.row<f.shapePx[1],'Row outside the fixed chart.');
 check(Number.isInteger(s.display)&&f.charts[s.display],'Unknown chart view.');
 const measurements=f.charts.map(c=>{
  const [left,width]=c.rows[s.row];
  return {chartId:c.id,row:s.row,edgeIntervalPx:width?[left,left+width]:null,widthPx:width||null,widthMm:width?width*f.pixelSizeMm:null};
 });
 const [a,b]=measurements.map(q=>q.widthMm);
 return {schema:'bts.synthetic-chart-comparison.v1',kind:'synthetic-documentary-replay',sampleId:f.sampleId,revision:f.revision,provenance:f.provenance,shapePx:f.shapePx,pixelSizeMm:f.pixelSizeMm,row:s.row,displayChartId:f.charts[s.display].id,measurements,differenceBMinusAMm:a===null||b===null?null:b-a,thermalWidth:{value:null,status:'not-applicable to preprinted charts'}};
}
export function act(f,s,a,v){
 try{
  const q=a==='reset'?initial():a==='next'?{...s,display:(s.display+1)%f.charts.length}:a==='row'?{...s,row:v}:a==='view'?{...s,display:v}:null;
  check(q,'Unknown review action.');const r=inspect(f,q);
  return {ok:true,state:q,message:r.differenceBMinusAMm===null?'No printed stripe on this row.':'Static printed widths only; no process model.'};
 }catch(e){return {ok:false,state:s,message:e.message};}
}
