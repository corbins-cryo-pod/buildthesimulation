import {useMemo} from 'preact/hooks';
export const TRACE_COLORS=['#247f80','#b36d28','#8459a3','#4877b4','#a6434a','#6a8c48','#ad6280'];
export const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString(undefined,{maximumFractionDigits:d}):'—';
export function Field({name,label,unit,min,max,step=1,value,onChange}){return <label class="bh-field"><span>{label}<small>{unit}</small></span><input type="number" name={name} aria-label={`${label} (${unit})`} min={min} max={max} step={step} value={value} onChange={e=>{const v=e.currentTarget.valueAsNumber;if(Number.isFinite(v))onChange(name,Math.max(min,Math.min(max,v)));}}/></label>;}
export function Metric({label,value,unit,detail}){return <div class="bh-metric"><span>{label}</span><div>{value}<small>{unit}</small></div><p>{detail}</p></div>;}
export function Plot({title,subtitle,unit,times,series,time,onTime,range,compare}){
 const chart=useMemo(()=>{
  let lo=Infinity,hi=-Infinity;for(const s of [...series,...(compare?.series||[])])for(const v of s.values||[]){if(Number.isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v);}}
  if(range){lo=Math.min(Number.isFinite(lo)?lo:range[0],range[0]);hi=Math.max(Number.isFinite(hi)?hi:range[1],range[1]);}else{if(!Number.isFinite(lo)){lo=-1;hi=1;}const pad=Math.max((hi-lo)*.12,.0001);lo-=pad;hi+=pad;}
  const end=Math.max(times?.[times.length-1]||40,compare?.times?.[compare.times.length-1]||0),left=52,right=662,top=15,bottom=155;
  const px=t=>left+(right-left)*t/end,py=v=>bottom-(bottom-top)*(v-lo)/(hi-lo||1);
  const paths=(list,t,old=false)=>list.map((s,k)=>({key:`${old?'old':'new'}-${s.id}`,color:s.color||TRACE_COLORS[k%TRACE_COLORS.length],old,d:Array.from(s.values||[],(v,i)=>`${i?'L':'M'}${px(t[i]).toFixed(2)},${py(v).toFixed(2)}`).join(' ')}));
  return{lo,hi,end,left,right,top,bottom,px,py,paths:[...(compare?paths(compare.series,compare.times,true):[]),...paths(series,times)],ticks:Array.from({length:4},(_,i)=>lo+(hi-lo)*i/3)};
 },[times,series,range?.[0],range?.[1],compare]);
 return <section class="bh-plot"><header><h3>{title}</h3><span>{unit}</span></header><p>{subtitle}</p><svg viewBox="0 0 690 188" role="img" aria-label={`${title}, ${unit} versus milliseconds. Click to move the replay cursor.`} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onTime(Math.max(0,Math.min(chart.end,((e.clientX-r.left)/r.width*690-chart.left)/(chart.right-chart.left)*chart.end)));}}>
 {chart.ticks.map((v,i)=><g key={i}><line x1={chart.left} x2={chart.right} y1={chart.py(v)} y2={chart.py(v)} class="bh-grid-line"/><text x="44" y={chart.py(v)+4} textAnchor="end">{fmt(v,Math.abs(v)<1?3:1)}</text></g>)}
 {[0,.25,.5,.75,1].map(f=><g key={f}><line x1={chart.px(f*chart.end)} x2={chart.px(f*chart.end)} y1={chart.top} y2={chart.bottom} class="bh-grid-line"/><text x={chart.px(f*chart.end)} y="177" textAnchor="middle">{fmt(f*chart.end,0)}</text></g>)}
 {chart.paths.map(p=><path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={p.old?1.1:1.6} strokeDasharray={p.old?'5 4':undefined} opacity={p.old?.5:1}/>)}
 <line x1={chart.px(time)} x2={chart.px(time)} y1={chart.top} y2={chart.bottom} class="bh-cursor"/><text x="680" y="177" textAnchor="end">ms</text></svg>
 <div class="bh-chart-legend">{series.map((s,i)=><span key={s.id}><i style={{background:s.color||TRACE_COLORS[i%TRACE_COLORS.length]}}/>{s.label}</span>)}{compare&&<span class="bh-dashed-label">Dashed: pinned run</span>}</div></section>;
}
export function Raster({result,time,onTime}){
 const cells=result.geometry.neurons,left=100,right=666,row=24,height=cells.length*row+42,end=result.settings.durationMs,x=t=>left+(right-left)*t/end;
 return <section class="bh-plot bh-raster"><header><h3>Spike timing</h3><span>ms</span></header><p>Somatic threshold crossings; terminal crossings are open circles.</p><svg viewBox={`0 0 690 ${height}`} role="img" aria-label="Calculated neuronal spike raster" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onTime(Math.max(0,Math.min(end,((e.clientX-r.left)/r.width*690-left)/(right-left)*end)));}}>
 {cells.map((n,i)=><g key={n.id}><text x={left-12} y={20+i*row+4} textAnchor="end">{n.label}</text><line x1={left} x2={right} y1={20+i*row} y2={20+i*row} class="bh-grid-line"/>{result.spikes.filter(s=>s.neuronId===n.id).map((s,j)=>s.kind==='soma'?<line key={j} x1={x(s.timeMs)} x2={x(s.timeMs)} y1={13+i*row} y2={27+i*row} stroke={TRACE_COLORS[i%TRACE_COLORS.length]} strokeWidth="2.4"/>:<circle key={j} cx={x(s.timeMs)} cy={20+i*row} r="3" fill="none" stroke={TRACE_COLORS[i%TRACE_COLORS.length]}/>)}</g>)}
 <line x1={x(time)} x2={x(time)} y1="8" y2={height-28} class="bh-cursor"/>{[0,.25,.5,.75,1].map(f=><text key={f} x={x(end*f)} y={height-8} textAnchor="middle">{fmt(end*f,0)}</text>)}</svg></section>;
}
