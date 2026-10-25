import { useEffect, useState } from 'preact/hooks';
import { formatNumber } from '../../lib/recordings/signal.js';
import { validateSummary } from '../../lib/recordings/summary.js';

export default function LongitudinalExplorer({ entry }) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[seriesIndex,setSeriesIndex]=useState(0),[metricId,setMetricId]=useState('percentYield'),[pointIndex,setPointIndex]=useState(0);
  useEffect(()=>{const c=new AbortController();setError('');fetch(entry.dataUrl,{signal:c.signal}).then(r=>{if(!r.ok)throw new Error('The study summary could not be downloaded.');return r.json();}).then(validateSummary).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[entry.id,retry]);
  const series=data?.series[seriesIndex],metric=data?.metrics.find(m=>m.id===metricId),point=series?.points[pointIndex];
  let min=0,max=100,first=0,last=1;
  if(series){const values=series.points.map(p=>p[metricId]).filter(Number.isFinite);min=metric.domain?.[0]??(values.length?Math.min(...values):0);max=metric.domain?.[1]??(values.length?Math.max(...values):1);if(min===max){min-=1;max+=1;}first=series.points[0].day;last=series.points.at(-1).day;if(first===last)last++;}
  const x=day=>66+(day-first)/(last-first)*665,y=value=>30+(1-(value-min)/(max-min))*235;
  return <section id={`viewer-${entry.id}`} class="rd-viewer" aria-label={entry.title}>
    <header class="rd-viewer-head"><div><span class="rd-eyebrow">Published array-session measurements</span><h2>{entry.title}</h2></div><span class="rd-stamp">Measured data</span></header><p>{entry.description}</p>
    {error?<div role="alert"><p>{error}</p><button onClick={()=>setRetry(retry+1)}>Retry loading</button></div>:!data?<p role="status" class="rd-loading">Loading study measurements…</p>:<>
      <div class="rd-facts"><span><b>{data.counts.participants}</b> participants</span><span><b>{data.counts.arrays}</b> arrays</span><span><b>{data.counts.sessions.toLocaleString()}</b> sessions</span><span><b>{data.counts.arraySessionRows.toLocaleString()}</b> array-session observations</span></div>
      <div class="rd-controls"><label>Participant &amp; array<select value={seriesIndex} onChange={e=>{setSeriesIndex(Number(e.currentTarget.value));setPointIndex(0);}}>{data.series.map((s,i)=><option key={s.id} value={i}>{s.label} · {s.points.length} observations</option>)}</select></label><label>Measurement<select value={metricId} onChange={e=>setMetricId(e.currentTarget.value)}>{data.metrics.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>
      <figure class="rd-longitudinal"><svg viewBox="0 0 780 330" role="img" aria-label={`${metric.label} in ${metric.unit} for ${series.label}, days ${first} to ${last}. Points are measured observations. Select a session with the slider below.`}>
        {[0,1,2,3,4].map(i=><g key={i}><line x1="66" x2="731" y1={30+235*i/4} y2={30+235*i/4}/><text x="58" y={35+235*i/4} text-anchor="end">{formatNumber(max-(max-min)*i/4)}</text><text x={66+665*i/4} y="290" text-anchor="middle">{Math.round(first+(last-first)*i/4)}</text></g>)}
        <text x="66" y="17">{metric.label} · {metric.unit}</text><text x="398" y="318" text-anchor="middle">Days after implantation</text>
        {series.points.map((p,i)=>Number.isFinite(p[metricId])?<circle key={i} cx={x(p.day)} cy={y(p[metricId])} r={i===pointIndex?6:2.6} class={i===pointIndex?'rd-selected':''} onClick={()=>setPointIndex(i)}><title>Day {p.day}: {formatNumber(p[metricId])} {metric.unit}</title></circle>:null)}
      </svg><figcaption>Each point is one array-session. Irregular observation times are retained. Missing values are omitted; no trend line or lifespan prediction is fitted.</figcaption></figure>
      <label class="rd-slider">Session observation<input type="range" min="0" max={series.points.length-1} step="1" value={pointIndex} onInput={e=>setPointIndex(Number(e.currentTarget.value))} aria-valuetext={`Day ${point.day}, ${metric.label}: ${formatNumber(point[metricId])} ${metric.unit}`}/></label>
      <div class="rd-transport"><button disabled={pointIndex===0} onClick={()=>setPointIndex(pointIndex-1)}>Previous session</button><button disabled={pointIndex===series.points.length-1} onClick={()=>setPointIndex(pointIndex+1)}>Next session</button><output aria-live="off">{series.label} · day {point.day}</output></div>
      <dl class="rd-readouts">{data.metrics.map(m=><div key={m.id}><dt>{m.label}</dt><dd>{formatNumber(point[m.id])} <small>{m.unit}</small></dd></div>)}</dl>
      <p class="rd-definition">{metric.definition}</p>
      <details class="rd-provenance"><summary>Study methods &amp; interpretation</summary><ul>{data.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul><p>{data.provenance.citation}</p><p><a href={data.provenance.repositoryUrl}>Authors’ analysis repository</a> · commit {data.provenance.repositoryCommit.slice(0,8)} · <a href={data.provenance.methodsUrl}>Metric definitions in source code</a></p><p>{data.provenance.transformation}</p><p><a href="/data/recordings/braingate-summary-LICENSE.txt">MIT source notice</a>; underlying Dryad release CC0.</p></details>
      <div class="rd-downloads"><a href={entry.dataUrl} download>Download all measurements &amp; provenance · JSON</a><a href="/data/recordings/braingate-yield-summary.csv" download>Original author CSV</a></div>
    </>}
    <footer class="rd-source"><a href={entry.sourceUrl}>Source dataset ↗</a><a href={entry.licenseUrl}>{entry.license}</a></footer><noscript>Enable JavaScript to explore the measurements. Source links remain available.</noscript>
  </section>;
}
