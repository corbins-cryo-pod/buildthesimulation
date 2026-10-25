import { useEffect, useState } from 'preact/hooks';
import RecordingExplorer from './RecordingExplorer.jsx';
import LongitudinalExplorer from './LongitudinalExplorer.jsx';
import '../../styles/recordings.css';

export default function RecordingLibrary({ entries, deviceId=null }) {
  const [selected,setSelected]=useState(entries[0].id);
  useEffect(()=>{
    if(deviceId)return;
    const update=()=>{const id=new URL(window.location.href).searchParams.get('dataset');setSelected(entries.some(d=>d.id===id)?id:entries[0].id);};
    update();window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);
  },[deviceId]);
  const entry=entries.find(d=>d.id===selected)||entries[0];
  const select=(e,id)=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();setSelected(id);if(!deviceId){const url=new URL(window.location.href);url.searchParams.set('dataset',id);history.pushState({},'',url);}};
  const relation=entry.devices.find(d=>d.id===deviceId);
  return <div class={`recording-library ${deviceId?'rd-embedded':''}`}>
    {entries.length>1&&<nav class="rd-dataset-tabs" aria-label="Recording datasets">{entries.map((d,i)=><a key={d.id} href={`/recordings/?dataset=${d.id}`} aria-current={selected===d.id?'page':undefined} onClick={e=>select(e,d.id)}><span>{String(i+1).padStart(2,'0')}</span><b>{d.title}</b><small>{d.species} · {d.signal}</small></a>)}</nav>}
    {relation&&<p class="rd-association"><strong>{relation.relationship==='recorded'?'Recorded interface':'Related research'}</strong> · {relation.note}</p>}
    {entry.kind==='summary'?<LongitudinalExplorer key={entry.id} entry={entry}/>:<RecordingExplorer key={entry.id} entry={entry}/>}
    {!deviceId&&<nav class="rd-device-links" aria-label="Associated device pages"><span>Device sheets</span>{entry.devices.map(d=><a key={d.id} href={`/devices/${d.slug}/#measured-recordings`}>{d.label} <small>· {d.relationship==='recorded'?'recorded interface':'related research'}</small> →</a>)}</nav>}
    {deviceId&&<p class="rd-all-link"><a href={`/recordings/?dataset=${entry.id}`}>Open the complete Recording Library →</a></p>}
  </div>;
}
