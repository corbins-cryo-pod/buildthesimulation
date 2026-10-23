import {useMemo,useState} from 'preact/hooks';
import {Plot,TRACE_COLORS,fmt} from './Instrumentation.jsx';

const span=values=>{let lo=Infinity,hi=-Infinity;for(const value of values){lo=Math.min(lo,value);hi=Math.max(hi,value);}return hi-lo;};

/** Linear forward-model source attribution, not inverse spike sorting. */
export default function RecordingSources({result,time,onTime}){
 const [contactId,setContactId]=useState('rec-2');
 const contact=result.recordings.find(record=>record.id===contactId)??result.recordings[0];
 const series=useMemo(()=>contact?.graftUv&&contact?.hostUv?[
  {id:'graft',label:'Engineered-cell currents',values:contact.graftUv,color:TRACE_COLORS[0]},
  {id:'host',label:'Host-cell currents',values:contact.hostUv,color:TRACE_COLORS[2]},
  {id:'sum',label:'Combined neural signal',values:contact.neuralUv,color:TRACE_COLORS[1]},
 ]:[],[contact]);
 if(!series.length)return null;
 return <section class="bh-sources" id="recording-sources" aria-labelledby="bh-source-title">
  <header><div><span class="bh-kicker">Stage 02 / Measurement attribution</span><h2 id="bh-source-title">Where does the signal come from?</h2></div><label>Recording contact<select aria-label="Source attribution recording contact" value={contact.id} onChange={event=>setContactId(event.currentTarget.value)}>{result.recordings.map(record=><option key={record.id} value={record.id}>{record.label}</option>)}</select></label></header>
  <p>Every trace is calculated from the outward membrane currents of the indicated cells. A host contribution can reflect subthreshold polarization or synaptic current even when that cell never fires. The applied stimulation field is excluded here.</p>
  <div class="bh-source-grid"><Plot title={`${contact.label}: known-source decomposition`} subtitle="Same solved state and finite recording disk. Instantaneous graft + host contributions equal the combined neural waveform." unit="µV" times={result.timeMs} series={series} time={time} onTime={onTime}/><div class="bh-source-summary"><span class="bh-label">Complete recorded interval</span><table><thead><tr><th>Source</th><th>Amplitude / µV p–p</th></tr></thead><tbody><tr><td>Engineered cells</td><td>{fmt(span(contact.graftUv),6)}</td></tr><tr><td>Host cells</td><td>{fmt(span(contact.hostUv),6)}</td></tr><tr><td>Combined neural</td><td>{fmt(span(contact.neuralUv),6)}</td></tr></tbody></table><p>Peak-to-peak amplitudes do not generally add: their maxima and minima occur at different times. This is a forward-model partition with known simulated sources, not a method for identifying cells from a real electrode recording.</p><a href="#controlled-experiments">Test synaptic dependence with matched controls ↓</a></div></div>
 </section>;
}
