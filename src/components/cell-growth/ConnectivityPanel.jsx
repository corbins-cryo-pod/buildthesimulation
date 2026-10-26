const fmt=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
const label=id=>`Cell ${String(id+1).padStart(2,'0')}`;
const statuses={apposition:'Encounter',candidate:'Retained contact',structural:'Structural assembly',functional:'Transmission-ready',lost:'Lost'};

function VoltageTrace({assay,control,cellId,title}){
  const rows=assay.samples,values=rows.map(r=>r.voltages[cellId]),lo=Math.min(-65,...values)-1,hi=Math.max(-65,...values)+1;
  const x=t=>52+t/assay.durationMs*530,y=v=>164-(v-lo)/(hi-lo)*136;
  const path=data=>data.map((r,i)=>`${i?'L':'M'}${x(r.timeMs)},${y(r.voltages[cellId])}`).join(' ');
  return <figure class="cg-transmission-trace"><figcaption>{title} · {label(cellId)}</figcaption><svg viewBox="0 0 600 202" role="img" aria-label={`${title}, membrane voltage in millivolts over 200 milliseconds`}>
    {[0,.5,1].map(f=><g key={f}><line x1="52" x2="582" y1={y(lo+(hi-lo)*f)} y2={y(lo+(hi-lo)*f)} class="cg-gridline"/><text x="45" y={y(lo+(hi-lo)*f)+4} textAnchor="end">{fmt(lo+(hi-lo)*f,1)}</text><text x={x(f*assay.durationMs)} y="183" textAnchor="middle">{fmt(f*assay.durationMs,0)}</text></g>)}
    <path d={path(control.samples)} stroke="#ac8a72" strokeWidth="1.5" strokeDasharray="5 4" fill="none"/><path d={path(rows)} stroke="#6da99a" strokeWidth="2" fill="none"/>
    {assay.spikes.filter(s=>s.cellId===cellId).map((s,i)=><line key={i} x1={x(s.timeMs)} x2={x(s.timeMs)} y1="10" y2="20" stroke="#6da99a" strokeWidth="2"/>)}
    <text x="52" y="15">mV</text><text x="540" y="199">Time / ms</text>
  </svg><small>Solid: transmission enabled · Dashed: synaptic conductance blocked. Top marks indicate threshold events; spike waveforms are not modeled.</small></figure>;
}

export default function ConnectivityPanel({state,metrics,selectedCell,assay,running,pending,onRun,onExport,onSelect}){
  const contacts=state?.contacts||[],active=contacts.filter(c=>c.status!=='lost');
  const result=assay?.reference,control=assay?.blocked;
  const target=result?.cells.filter(c=>c.cellId!==result.sourceCellId).sort((a,b)=>Math.max(b.peakDepolarizationMV,-b.peakHyperpolarizationMV)-Math.max(a.peakDepolarizationMV,-a.peakHyperpolarizationMV))[0]?.cellId;
  return <div class="cg-connectivity-panel">
    <div class="cg-analysis-grid"><div><h3>From encounter to a modeled synapse</h3><p>Filopodia and growth cones detect nearby processes. Compatible contacts can persist, assemble presynaptic machinery, and recruit postsynaptic receptors. A crossing alone creates no connection.</p>
      <dl class="cg-readings"><div><dt>Encounters</dt><dd>{metrics?.appositions||0}</dd></div><div><dt>Retained contacts</dt><dd>{metrics?.contacts||0}</dd></div><div><dt>Structural assemblies</dt><dd>{metrics?.structuralSynapses||0}</dd></div><div><dt>Transmission-ready</dt><dd>{metrics?.functionalSynapses||0}</dd></div><div><dt>Lost contacts</dt><dd>{metrics?.lostContacts||0}</dd></div></dl>
      <p class="cg-help">Structural and transmission-ready counts are subsets of retained contacts. Purple marks retained contacts, amber marks structural assemblies, and green marks transmission-ready sites. All states are model predictions from exploratory kinetics.</p></div>
      <div><h3>Test signal transmission</h3><p>Stimulate {label(selectedCell)} for 60 ms in a 200 ms assay, with an identical synaptic-block control. Growth remains paused.</p>
        <button type="button" class="cg-primary" disabled={!state||running||pending} onClick={onRun}>{pending?'Calculating…':`Stimulate ${label(selectedCell)}`}</button>
        <p class="cg-help">A separate conductance-based point-neuron model tests the grown graph. It is not a fitted electrical reconstruction of these arbors. The illustrative population assigns every fifth cell an inhibitory output; the other cells have excitatory outputs.</p>
        {result&&<><dl class="cg-readings"><div><dt>Source threshold events</dt><dd>{result.cells[result.sourceCellId]?.spikes||0}</dd></div><div><dt>Ready graph edges</dt><dd>{result.edges.length}</dd></div><div><dt>Synaptic deliveries</dt><dd>{result.deliveries.length}</dd></div><div><dt>Frozen growth time</dt><dd>{fmt(result.growthTimeHours)} h</dd></div></dl><button type="button" onClick={onExport}>Download transmission assay</button>{!result.deliveries.length&&<p class="cg-help">No signal was delivered from this source through the current graph. Select a cell with a transmission-ready outgoing contact, or allow the culture to develop further.</p>}</>}
      </div></div>
    {result&&<div class="cg-analysis-grid"><VoltageTrace assay={result} control={control} cellId={result.sourceCellId} title="Stimulated source"/>{target!==undefined&&<VoltageTrace assay={result} control={control} cellId={target} title="Other cell with largest response"/>}</div>}
    <div class="cg-table-wrap"><table><thead><tr><th>Source → target</th><th>State</th><th>Contact age / h</th><th>Presynaptic / receptor assembly</th><th>Conductance / nS</th></tr></thead><tbody>{active.slice(-80).map(c=><tr key={c.id}><td><button type="button" onClick={()=>onSelect(c.sourceCellId)}>{label(c.sourceCellId)}</button> → <button type="button" onClick={()=>onSelect(c.targetCellId)}>{label(c.targetCellId)}</button></td><td>{statuses[c.status]}</td><td>{fmt(c.dwellHours)}</td><td>{fmt(c.presynaptic*100,0)}% / {fmt(c.receptors*100,0)}%</td><td>{fmt(c.conductanceNS,3)}</td></tr>)}{!active.length&&<tr><td colSpan="5">No retained encounters yet. Multiple neurons must physically encounter one another before contacts can mature.</td></tr>}</tbody></table></div>
  </div>;
}
