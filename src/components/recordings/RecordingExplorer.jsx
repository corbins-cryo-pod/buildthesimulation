import { useEffect, useMemo, useState } from 'preact/hooks';
import { validateRecording, sampleBounds, statistics, formatNumber, timeLabel, csvForChannel } from '../../lib/recordings/signal.js';
import SignalPlot from './SignalPlot.jsx';
import ChannelMap from './ChannelMap.jsx';

export default function RecordingExplorer({ entry }) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [segmentIndex,setSegmentIndex]=useState(0),[channelIndex,setChannelIndex]=useState(0);
  const [start,setStart]=useState(0),[windowSeconds,setWindowSeconds]=useState(1),[cursor,setCursor]=useState(0),[playing,setPlaying]=useState(false),[mode,setMode]=useState('focus');
  useEffect(()=>{
    const controller=new AbortController();setError('');setData(null);setPlaying(false);
    fetch(entry.dataUrl,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('The excerpt could not be downloaded.');return r.json();}).then(validateRecording).then(d=>{
      const s=d.segments[0],duration=s.channels[0].samples.length/s.sampleRateHz;
      setSegmentIndex(0);setChannelIndex(0);setStart(0);setCursor(0);setWindowSeconds(Math.min(duration,entry.windowSeconds||5));setData(d);
    }).catch(e=>{if(e.name!=='AbortError')setError(e.message||'The recording could not load.');});
    return()=>controller.abort();
  },[entry.id,retry]);
  const segment=data?.segments[segmentIndex], channel=segment?.channels[channelIndex];
  const duration=segment?segment.channels[0].samples.length/segment.sampleRateHz:0;
  const bounds=segment?sampleBounds(segment.channels[0].samples.length,segment.sampleRateHz,start,windowSeconds):[0,2];
  const stats=useMemo(()=>channel?statistics(channel.samples,...bounds):null,[channel,bounds[0],bounds[1]]);
  const maxStart=Math.max(0,duration-windowSeconds);
  useEffect(()=>{
    if(!playing||!segment)return;
    // Playback advances a viewing window. Small AP/ENG excerpts are slowed for inspection.
    const step=Math.max(1/segment.sampleRateHz,windowSeconds/100);
    const timer=setInterval(()=>setStart(s=>{const next=Math.min(s+step,maxStart);if(next>=maxStart)setPlaying(false);return next;}),50);
    return()=>clearInterval(timer);
  },[playing,segment,maxStart,windowSeconds]);
  const changeSegment=i=>{
    setPlaying(false);setSegmentIndex(i);setChannelIndex(0);setStart(0);setCursor(0);
    const s=data.segments[i];setWindowSeconds(Math.min(s.channels[0].samples.length/s.sampleRateHz,entry.windowSeconds||5));
  };
  const downloadCSV=()=>{const blob=new Blob([csvForChannel(data,segment,channel)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${entry.id}-${segment.id}-${String(channel.id).replace(/[^a-z0-9_-]/gi,'_')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const isCounts=segment?.signalKind==='spike-counts';
  const current=Math.max(bounds[0],Math.min(bounds[1]-1,cursor));
  const windows=segment?[...new Set([.002,.005,.01,.02,.05,.1,.25,.5,1,2,5,10,20,duration,windowSeconds].filter(n=>n>=2/segment.sampleRateHz&&n<=duration))].sort((a,b)=>a-b):[];
  return <section class="rd-viewer" id={`viewer-${entry.id}`} aria-label={entry.title}>
    <header class="rd-viewer-head"><div><span class="rd-eyebrow">{entry.signal}</span><h2>{entry.title}</h2></div><span class="rd-stamp">Measured data</span></header>
    <p>{entry.description}</p>
    {error?<div class="rd-error" role="alert"><p>{error}</p><button onClick={()=>setRetry(retry+1)}>Retry loading</button> <a href={entry.sourceUrl}>Open source archive</a></div>:!segment?<p role="status" class="rd-loading">Loading measured excerpt…</p>:<>
      <p class="rd-signal-note">{channel.signalType||segment.signalType||entry.signal}</p><div class="rd-facts"><span><b>{segment.channels.length}</b> channels shown</span><span><b>{segment.sampleRateHz.toLocaleString('en-US',{maximumFractionDigits:6})}</b> samples/s in excerpt</span><span><b>{timeLabel(duration)}</b> duration</span><span><b>{data.species||entry.species}</b> recording</span></div>
      <div class="rd-controls">
        <label>Recording excerpt<select value={segmentIndex} onChange={e=>changeSegment(Number(e.currentTarget.value))}>{data.segments.map((s,i)=><option value={i} key={s.id}>{s.label}</option>)}</select></label>
        <label>Channel<select value={channelIndex} onChange={e=>setChannelIndex(Number(e.currentTarget.value))}>{segment.channels.map((c,i)=><option value={i} key={c.id}>{c.label}</option>)}</select></label>
        <label>Time window<select value={windowSeconds} onChange={e=>{setPlaying(false);const n=Number(e.currentTarget.value);setWindowSeconds(n);setStart(Math.min(start,Math.max(0,duration-n)));}}>{windows.map(w=><option value={w} key={w}>{w===duration?'Full excerpt · ':''}{timeLabel(w,w)}</option>)}</select></label>
      </div>
      <div class="rd-workspace"><aside><ChannelMap segment={segment} selected={channelIndex} onSelect={setChannelIndex} bounds={bounds}/></aside><div class="rd-traces">
        <div class="rd-mode" role="group" aria-label="Signal view"><button aria-pressed={mode==='focus'} class={mode==='focus'?'active':''} onClick={()=>setMode('focus')}>Selected signal</button><button aria-pressed={mode==='stacked'} class={mode==='stacked'?'active':''} onClick={()=>setMode('stacked')}>Channel overview</button></div>
        <SignalPlot segment={segment} channelIndex={channelIndex} bounds={bounds} mode={mode} cursor={current} onCursor={setCursor}/>
        <div class="rd-transport"><button disabled={maxStart===0} aria-pressed={playing} onClick={()=>{if(start>=maxStart)setStart(0);setPlaying(!playing);}}>{playing?'Pause':'Play window'}</button><button onClick={()=>{setPlaying(false);setStart(0);setCursor(0);}}>Reset</button><output aria-live="off">{timeLabel(bounds[0]/segment.sampleRateHz,windowSeconds)} – {timeLabel(bounds[1]/segment.sampleRateHz,windowSeconds)}</output></div>
        <label class="rd-slider">Window start<input type="range" min="0" max={maxStart} step={1/segment.sampleRateHz} value={Math.min(start,maxStart)} disabled={maxStart===0} aria-valuetext={timeLabel(start,windowSeconds)} onInput={e=>{setPlaying(false);setStart(Number(e.currentTarget.value));}}/></label>
        <label class="rd-slider">Sample cursor<input type="range" min={bounds[0]} max={bounds[1]-1} step="1" value={current} aria-valuetext={`${timeLabel(current/segment.sampleRateHz,windowSeconds)}: ${formatNumber(channel.samples[current])} ${channel.unit||segment.unit}`} onInput={e=>setCursor(Number(e.currentTarget.value))}/></label>
        <dl class="rd-readouts"><div><dt>Cursor time</dt><dd>{timeLabel(current/segment.sampleRateHz,windowSeconds)}</dd></div><div><dt>Sample value</dt><dd>{formatNumber(channel.samples[current])} <small>{channel.unit||segment.unit}</small></dd></div><div><dt>{isCounts?'Window spike count':'Window RMS'}</dt><dd>{formatNumber(isCounts?stats.sum:stats.rms)} <small>{isCounts?'spikes':channel.unit||segment.unit}</small></dd></div><div><dt>{isCounts?'Window mean rate':'Window peak to peak'}</dt><dd>{formatNumber(isCounts?stats.sum/((bounds[1]-bounds[0])/segment.sampleRateHz):stats.peakToPeak)} <small>{isCounts?'spikes/s':channel.unit||segment.unit}</small></dd></div></dl>
      </div></div>
      {(segment.events||[]).length>0&&<div class="rd-events"><h3>Source event annotations</h3><div>{segment.events.map((e,i)=><button key={i} onClick={()=>{setPlaying(false);setStart(Math.max(0,Math.min(e.timeSeconds-windowSeconds*.25,maxStart)));setCursor(Math.round(e.timeSeconds*segment.sampleRateHz));}}>{e.label} · {timeLabel(e.timeSeconds,windowSeconds)}</button>)}</div></div>}
      <p class="rd-small">Time is relative to excerpt start. {segment.timeReference} {isCounts?'Bars show released timestamp counts in each 10 ms bin; at wide time scales, each pixel retains the largest bin.':'Plotting preserves each pixel’s minimum and maximum at wide time scales;'} zoom in to see individual samples. Playback advances one window-width every five seconds. The channel overview scales each row independently; use the selected signal’s axis to compare amplitude.</p>
      <div class="rd-downloads"><button onClick={downloadCSV}>Download selected channel · CSV</button><a href={entry.dataUrl} download>Download excerpt &amp; provenance · JSON</a></div>
      <details class="rd-provenance"><summary>Processing, units &amp; scientific limits</summary>
        {data.processing?.length>0&&<><h3>Processing</h3><ul>{data.processing.map((p,i)=><li key={i}>{p}</li>)}</ul></>}
        <h3>Interpretation</h3><ul>{(data.limitations||entry.limitations||[]).map((p,i)=><li key={i}>{p}</li>)}</ul>
        <p>{data.citation||data.attribution||''}</p><p>Release: {data.sourceVersion||data.version||entry.version} · <a href={data.licenseUrl||entry.licenseUrl}>{data.license||entry.license}</a></p>
        <p>The JSON download retains source identifiers, sample selection, processing history and file hashes. Moving a device in a simulation does not change these recorded data.</p>
      </details>
    </>}
    <footer class="rd-source"><a href={entry.sourceUrl}>Source dataset ↗</a><a href={entry.licenseUrl}>{entry.license}</a>{entry.paperUrl&&<a href={entry.paperUrl}>Study ↗</a>}</footer>
    <noscript>Enable JavaScript to load the measured excerpt. Source links remain available.</noscript>
  </section>;
}
