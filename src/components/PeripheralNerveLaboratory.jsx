import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULTS, PRESETS, VERSION, calculateExperiment, experimentDocument, parseExperiment, pulseAt, fieldAt } from '../lib/peripheral-nerve/model.js';
import '../styles/peripheral-nerve.css';

const fmt = (x, digits = 2) => Math.abs(x) < 1e-8 ? '0' : Number(x).toFixed(digits);
const fLabel = i => `F${String(i + 1).padStart(2, '0')}`;
const aLabel = i => `A${String(i + 1).padStart(3, '0')}`;
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function Field({ label, unit, value, onChange, min, max, step, help }) {
  return <label class="pn-field"><span>{label}<small>{unit}</small></span><input type="number" value={value} min={min} max={max} step={step} onInput={e => onChange(Number(e.currentTarget.value))}/>{help && <small class="pn-help">{help}</small>}</label>;
}
function Plot({ series, unit, xUnit, cursor, label, fixedRange }) {
  const width = 540, height = 188, left = 52, right = 16, top = 18, bottom = 30;
  const ys = series.flatMap(s => Array.from(s.y)), xs = series.flatMap(s => Array.from(s.x));
  const lo = Math.min(...xs), hi = Math.max(...xs), span = hi - lo || 1;
  const bound = fixedRange || Math.max(...ys.map(Math.abs), 1e-4) * 1.12;
  const X = x => left + (x - lo) / span * (width - left - right), Y = y => top + (1 - y / bound) / 2 * (height - top - bottom);
  const path = s => Array.from(s.y, (y, i) => `${i ? 'L' : 'M'}${X(s.x[i]).toFixed(2)},${Y(y).toFixed(2)}`).join(' ');
  const value = n => Math.abs(n) >= 100 ? fmt(n, 0) : Math.abs(n) >= .1 ? fmt(n, 2) : n.toExponential(1);
  return <svg class="pn-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <title>{label}</title>
    {[-1, 0, 1].map(v => <g key={v}><line x1={left} x2={width - right} y1={Y(v * bound)} y2={Y(v * bound)} class={v ? 'pn-gridline' : 'pn-zero'}/><text x={left - 7} y={Y(v * bound) + 4} text-anchor="end">{v ? value(v * bound) : '0'}</text></g>)}
    {[0, .25, .5, .75, 1].map(t => <text x={X(lo + span * t)} y={height - 10} text-anchor="middle">{fmt(lo + span * t, span > 10 ? 0 : 2)}</text>)}
    <text x={left} y={11}>{unit}</text><text x={width - right} y={11} text-anchor="end">{xUnit}</text>
    {series.map((s, i) => <path key={i} d={path(s)} fill="none" class={s.dashed ? 'pn-trace pn-trace-pinned' : 'pn-trace'} stroke-dasharray={s.dashed ? '5 4' : undefined}/>)}
    {cursor !== undefined && <line x1={X(cursor)} x2={X(cursor)} y1={top} y2={height - bottom} class="pn-cursor"/>}
  </svg>;
}
function CrossSection({ result, selected, onSelect, mode, map, sectionZ }) {
  const { anatomy, contacts } = result, R = anatomy.radius, scale = 200 / Math.max(R, ...contacts.map(c => c.kind === 'cuff' ? c.r : R));
  const X = x => 270 + x * scale, Y = y => 250 - y * scale;
  const max = Math.max(...map.map(m => Math.abs(m[mode === 'potential' ? 'potential' : 'curvature'])), 1e-8);
  const color = (m, id) => {
    if (mode === 'anatomy') return id === selected ? '#f0cd8b' : '#b8ab8b';
    const v = m[mode] / max, alpha = .25 + .75 * Math.abs(v);
    return v >= 0 ? `rgba(236,173,94,${alpha})` : `rgba(103,190,214,${alpha})`;
  };
  const pathArc = (r, a0, a1) => `M${X(r * Math.cos(a0))},${Y(r * Math.sin(a0))} A${r * scale},${r * scale} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${X(r * Math.cos(a1))},${Y(r * Math.sin(a1))}`;
  return <svg class="pn-section" viewBox="0 0 540 510" role="group" aria-label="Nerve cross-section at z equals zero; choose a representative fiber">
    <defs><pattern id="pn-tissue" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#a89b7f" opacity=".18"/></pattern></defs>
    <circle cx="270" cy="250" r={R * scale} fill="#35352e" stroke="#c7b799" stroke-width="5"/>
    <circle cx="270" cy="250" r={R * scale - 4} fill="url(#pn-tissue)"/>
    {anatomy.fascicles.map(f => <g key={f.id}><circle cx={X(f.x)} cy={Y(f.y)} r={f.r * scale} fill="#222825" stroke="#b2ac92" stroke-width="2"/><circle cx={X(f.x)} cy={Y(f.y)} r={f.r * scale - 4} fill="none" stroke="#b2ac92" stroke-width=".6" opacity=".5"/><text x={X(f.x)} y={Y(f.y) - f.r * scale + 13} class="pn-fascicle-label">{fLabel(f.id)}</text></g>)}
    {anatomy.fibers.map(f => <g key={f.id} role="button" tabindex="0" aria-label={`Select fiber ${aLabel(f.id)}, fascicle ${fLabel(f.fascicle)}, diameter ${fmt(f.diameterUm, 1)} micrometers`} onClick={() => onSelect(f.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(f.id); } }} class="pn-fiber-hit">
      <circle cx={X(f.x)} cy={Y(f.y)} r="7" fill="transparent"/>
      <circle cx={X(f.x)} cy={Y(f.y)} r={Math.max(2.5, f.diameterUm / 2000 * scale * 3)} fill={color(map[f.id], f.id)} stroke="#1b211f" stroke-width="1"/>
      <circle cx={X(f.x)} cy={Y(f.y)} r=".8" fill="#17211e"/>
      {f.id === selected && <circle cx={X(f.x)} cy={Y(f.y)} r="8" stroke="#fff1c9" stroke-width="1.5" fill="none"/>}
    </g>)}
    {contacts.map((c, i) => c.kind === 'intra' ? <g key={i}><circle cx={X(c.x)} cy={Y(c.y)} r={Math.max(5, c.r * scale)} fill="#e5ad62" stroke="#fff0ca"/><text x={X(c.x) + 12} y={Y(c.y) - 8} class="pn-contact-label">C−</text></g> : <g key={i}>
      {c.arc >= 6 ? <circle cx={270} cy={250} r={c.r * scale + i * 6} fill="none" stroke={c.weight < 0 ? '#e5ad62' : '#76c5ca'} stroke-width="4" opacity=".9"/> : <path d={pathArc(c.r, c.angle - c.arc / 2, c.angle + c.arc / 2)} fill="none" stroke={c.weight < 0 ? '#e5ad62' : '#76c5ca'} stroke-width="9"/>}
    </g>)}
    <line x1="30" y1="482" x2={30 + .5 * scale} y2="482" stroke="#e8dac0" stroke-width="2"/>
    <text x="30" y="500" class="pn-scale">0.5 mm</text><text x="510" y="500" text-anchor="end" class="pn-scale">z = {fmt(sectionZ, 1)} mm</text>
  </svg>;
}
function Projection({ result, frame, sectionZ, onSelect }) {
  const X = (z, x) => 280 + z * 38 + x * 31, Y = (y, x) => 155 - y * 62 - x * 17;
  const { anatomy, response, contacts, cable } = result;
  const color = value => value > .06 ? `hsl(35 75% ${55 + 20 * (1 - value)}%)` : value < -.06 ? `hsl(193 55% ${55 + 20 * (1 + value)}%)` : '#aaa995';
  return <svg class="pn-projection" viewBox="0 0 560 330" role="img" aria-label="Oblique longitudinal projection of the same nerve. Bright nodes show the selected fiber's calculated passive polarization.">
    <title>Longitudinal nerve projection</title>
    {anatomy.fascicles.map(f => <g key={f.id} opacity=".5"><path d={`M${X(-5,f.x)},${Y(f.y+f.r,f.x)} L${X(5,f.x)},${Y(f.y+f.r,f.x)} M${X(-5,f.x)},${Y(f.y-f.r,f.x)} L${X(5,f.x)},${Y(f.y-f.r,f.x)}`} stroke="#bdb197" fill="none"/><ellipse cx={X(-5,f.x)} cy={Y(f.y,f.x)} rx={f.r*31} ry={f.r*62} fill="#353a32" stroke="#bdb197"/><ellipse cx={X(5,f.x)} cy={Y(f.y,f.x)} rx={f.r*31} ry={f.r*62} fill="none" stroke="#bdb197"/></g>)}
    {anatomy.fibers.map(f => <line key={f.id} x1={X(-5,f.x)} x2={X(5,f.x)} y1={Y(f.y,f.x)} y2={Y(f.y,f.x)} stroke={f.id===result.fiberId?'#ead3a4':'#a69a7b'} stroke-width={f.id===result.fiberId?2:.45} opacity={f.id===result.fiberId?1:.4} onClick={()=>onSelect(f.id)}/>)}
    <ellipse cx={X(sectionZ,0)} cy={Y(0,0)} rx={anatomy.radius*31} ry={anatomy.radius*62} fill="none" stroke="#eee5d5" stroke-width="1" stroke-dasharray="3 3"/>
    {contacts.map((c,i)=>{
      if(c.kind==='intra') return <circle key={i} cx={X(0,c.x)} cy={Y(c.y,c.x)} r="5" fill="#e5ad62"/>;
      const points=[];
      for(let j=0;j<=40;j++){const a=c.angle-c.arc/2+c.arc*j/40;points.push([X(c.z-c.width/2,c.r*Math.cos(a)),Y(c.r*Math.sin(a),c.r*Math.cos(a))]);}
      for(let j=40;j>=0;j--){const a=c.angle-c.arc/2+c.arc*j/40;points.push([X(c.z+c.width/2,c.r*Math.cos(a)),Y(c.r*Math.sin(a),c.r*Math.cos(a))]);}
      return <g key={i}><polygon points={points.map(p=>p.join(',')).join(' ')} fill={c.weight<0?'#e5ad62':'#76c5ca'} fill-opacity=".25" stroke={c.weight<0?'#e5ad62':'#76c5ca'} stroke-width="1.2"/><text x={X(c.z,0)+8} y={Y(c.r,0)-12} fill={c.weight<0?'#e5ad62':'#76c5ca'}>{c.id}</text></g>;
    })}
    {cable.z.map((z,i)=>{const f=anatomy.fibers[result.fiberId];return Math.abs(z)<=5&&<circle key={i} cx={X(z,f.x)} cy={Y(f.y,f.x)} r="3.6" stroke="#f7eed7" stroke-width=".5" fill={color(response.voltages[frame*response.count+i]/Math.max(response.peak,1e-9))}/>;})}
    <line x1="90" x2="470" y1="280" y2="280" stroke="#b9ac90"/>{Array.from({length:11},(_,i)=><g><line x1={90+i*38} x2={90+i*38} y1="280" y2={i%5?'284':'288'} stroke="#b9ac90"/>{i%5===0&&<text x={90+i*38} y="303" text-anchor="middle">{i-5} mm</text>}</g>)}
    <text x="15" y="20">Oblique projection · transverse dimensions ×1.6</text>
  </svg>;
}
function Scene({ result, onSelect, frame, sectionZ }) {
  const host = useRef(), api = useRef(), selectRef = useRef(onSelect), viewRef = useRef(), [error, setError] = useState('');
  selectRef.current = onSelect;
  viewRef.current = { frame, sectionZ };
  useEffect(() => {
    let cancelled = false; setError('');
    import('../lib/peripheral-nerve/scene.js').then(({ createNerveScene }) => {
      if (cancelled) return;
      try { api.current = createNerveScene(host.current, result, id => selectRef.current(id)); api.current.update(viewRef.current.frame, viewRef.current.sectionZ); } catch (e) { setError(e.message); }
    }).catch(() => setError('The 3D viewer could not load. Use the cross-section to inspect the same model.'));
    return () => { cancelled = true; api.current?.destroy(); api.current = null; };
  }, [result]);
  useEffect(() => { api.current?.update(frame, sectionZ); }, [frame, sectionZ]);
  return <div class="pn-scene-shell"><div class="pn-scene" ref={host}/>{error && <div class="pn-fallback"><Projection result={result} frame={frame} sectionZ={sectionZ} onSelect={onSelect}/><p role="status">2D projection · 3D unavailable on this device.</p></div>}<div class="pn-scene-tools"><span>10 mm window · ruler ticks 1 mm</span><button type="button" onClick={() => api.current?.reset()} disabled={!!error}>Reset view</button></div></div>;
}

export default function PeripheralNerveLaboratory() {
  const [draft, setDraft] = useState({ ...DEFAULTS }), [result, setResult] = useState(null), [fiberId, setFiberId] = useState(0);
  const [error, setError] = useState(''), [pending, setPending] = useState(false), [mode, setMode] = useState('anatomy');
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(false), [node, setNode] = useState(0), [pinned, setPinned] = useState(null);
  const [sectionZ, setSectionZ] = useState(0);
  const [jsonText, setJsonText] = useState(''), [jsonStatus, setJsonStatus] = useState('');
  const controls = useRef(), file = useRef(), generation = useRef(0);
  const run = (parameters = draft, id = fiberId) => {
    const ticket = ++generation.current; setPending(true); setPlaying(false); setError('');
    setTimeout(() => {
      if (ticket !== generation.current) return;
      try { const r = calculateExperiment(parameters, id); setResult(r); setFiberId(id); setNode(r.response.peakIndex); setFrame(r.response.peakFrame); }
      catch (e) { setError(e.message); }
      finally { setPending(false); }
    }, 25);
  };
  useEffect(() => { if (controls.current && matchMedia('(max-width: 850px)').matches) controls.current.open = false; run(DEFAULTS, 0); return () => { generation.current++; }; }, []);
  useEffect(() => {
    if (!playing || !result) return;
    let request, start, first = frame, stopped = false;
    const animate = now => {
      if (start === undefined) start = now;
      const next = first + Math.floor((now - start) / 6000 * (result.response.times.length - 1));
      if (next >= result.response.times.length - 1) { setFrame(result.response.times.length - 1); setPlaying(false); return; }
      setFrame(next); if (!stopped) request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate); return () => { stopped = true; cancelAnimationFrame(request); };
  }, [playing, result]);
  const dirty = result && JSON.stringify(draft) !== JSON.stringify(result.p);
  const update = key => value => setDraft(p => ({ ...p, [key]: value }));
  function selectFiber(id) { if (pending) return; setPinned(null); run(result.p, id); }
  async function importFile(event) {
    const input = event.currentTarget, selected = input.files?.[0]; if (!selected) return;
    try { if (selected.size > 16384) throw new Error('Choose an experiment JSON under 16 KB.'); const doc = parseExperiment(await selected.text()); setDraft(doc.parameters); setPinned(null); run(doc.parameters, doc.selectedFiber); }
    catch (e) { setError(e.message); } finally { input.value = ''; }
  }
  function restoreText() {
    try { const doc = parseExperiment(jsonText); setDraft(doc.parameters); setPinned(null); run(doc.parameters, doc.selectedFiber); setJsonStatus('Valid experiment restored; all results are recalculated.'); }
    catch(e) { setJsonStatus(e.message); }
  }
  const timeTrace = useMemo(() => result ? Float64Array.from(result.response.times, (_, i) => result.response.voltages[i * result.response.count + node]) : [], [result, node]);
  const pinnedNode = pinned ? Math.min(pinned.response.count - 1, node) : 0;
  const pinnedTrace = useMemo(() => pinned ? Float64Array.from(pinned.response.times, (_, i) => pinned.response.voltages[i * pinned.response.count + pinnedNode]) : [], [pinned, pinnedNode]);
  function exportCsv() {
    const { response: r, cable, field } = result;
    const lines = ['time_ms,node_index,z_mm,applied_extracellular_mV,passive_delta_Vm_mV'];
    for (let i = 0; i < r.times.length; i++) for (let j = 0; j < r.count; j++) lines.push([r.times[i], j, cable.z[j], field[j] * pulseAt(r.times[i], result.p), r.voltages[i * r.count + j]].join(','));
    download('peripheral-nerve-response.csv', lines.join('\n'), 'text/csv');
  }
  const currentFiber = result?.anatomy.fibers[fiberId], r = result?.response;
  const series = result ? [{ x: r.times, y: timeTrace }, ...(pinned ? [{ x: pinned.response.times, y: pinnedTrace, dashed: true }] : [])] : [];
  const sectionMap = useMemo(() => {
    if (!result) return [];
    if (sectionZ === 0) return result.map;
    const h = .05;
    return result.anatomy.fibers.map(f => {
      const at = z => fieldAt({x:f.x, y:f.y, z}, result.contacts, result.p), potential = at(sectionZ);
      return { potential, curvature: (at(sectionZ + h) - 2 * potential + at(sectionZ - h)) / h ** 2 };
    });
  }, [result, sectionZ]);
  const maxMap = result ? Math.max(...sectionMap.map(m => Math.abs(m[mode === 'anatomy' ? 'curvature' : mode]))) : 0;
  return <div class="pn">
    <header class="pn-heading"><div><p class="pn-kicker">Peripheral interfaces / Experiment 01</p><h1>Peripheral Nerve Laboratory</h1><p class="pn-intro">A nerve is a world of fibers.<br/>See what an electrode reaches.</p></div><a class="pn-method-link" href="/simulations/peripheral-nerve/methods/">Model, equations & evidence ↗</a></header>
    <div class="pn-premise"><p><strong>From cross-section to cable.</strong> Inspect fascicles, place a contact, and follow the extracellular field into the passive polarization of one myelinated fiber.</p><span>Physical geometry<br/>Exploratory electrical model</span></div>
    <nav class="pn-presets" aria-label="Starting experiments">{PRESETS.map((preset, i) => <button type="button" class={draft.layout === preset.id ? 'is-active' : ''} aria-pressed={draft.layout === preset.id} onClick={() => { const p = { ...DEFAULTS, ...preset.values, seed: draft.seed }; setDraft(p); setSectionZ(p.layout === 'bipolar' ? -p.spacing / 2 : 0); setPinned(null); run(p, fiberId); }}><small>0{i + 1}</small><span>{preset.name}</span><svg width="25" height="25" viewBox="0 0 25 25" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor"/><path d={i === 3 ? 'M12 5V19M9 8H15' : i === 0 ? 'M22 7V17M2 7V17' : i === 1 ? 'M1 6H23M1 18H23' : 'M1 3H23M1 12H23M1 21H23'} stroke="currentColor"/></svg></button>)}</nav>
    <div class="pn-workbench">
      <aside class="pn-controls"><details ref={controls} open><summary>01 / Experiment controls</summary><div class="pn-controls-inner">
        <p class="pn-help">{PRESETS.find(p => p.id === draft.layout)?.note} Choosing a preset resets the experiment controls; the anatomy seed is retained.</p>
        <h2>Nerve & contacts</h2>
        <Field label="Nerve diameter" unit="mm" value={draft.diameter} onChange={update('diameter')} min={1} max={4} step={.1}/>
        {draft.layout === 'intra' ? <><Field label="Contact X" unit="mm" value={draft.intraX} onChange={update('intraX')} min={-1.8} max={1.8} step={.025}/><Field label="Contact Y" unit="mm" value={draft.intraY} onChange={update('intraY')} min={-1.8} max={1.8} step={.025} help="Disk radius 40 µm; remote return. The complete disk must fit inside one fascicle."/></> : <><Field label="Contact clearance" unit="mm" value={draft.clearance} onChange={update('clearance')} min={.05} max={.6} step={.05}/>{draft.layout === 'directional' ? <Field label="Cuff rotation" unit="degrees" value={draft.angle} onChange={update('angle')} min={0} max={360} step={5}/> : <Field label="Cathode–return spacing" unit="mm" value={draft.spacing} onChange={update('spacing')} min={.5} max={4} step={.25}/>}</>}
        <h2>Balanced pulse</h2>
        <Field label="First-phase magnitude" unit="µA" value={draft.amplitude} onChange={update('amplitude')} min={0} max={100} step={draft.layout === 'intra' ? .5 : 5}/>
        <Field label="Duration per phase" unit="ms" value={draft.width} onChange={update('width')} min={.05} max={.4} step={.05}/>
        <Field label="Interphase gap" unit="ms" value={draft.gap} onChange={update('gap')} min={0} max={.2} step={.025}/>
        <p class="pn-help">Cathodic first at C−. Equal opposite second phase. Cuff returns share the first-phase return current.</p>
        <details class="pn-advanced"><summary>Conductor & numerics</summary><Field label="Transverse conductivity" unit="S/m" value={draft.sigmaT} onChange={update('sigmaT')} min={.05} max={1} step={.05}/><Field label="Longitudinal conductivity" unit="S/m" value={draft.sigmaL} onChange={update('sigmaL')} min={.05} max={2} step={.05}/><Field label="Anatomy seed" unit="integer" value={draft.seed} onChange={update('seed')} min={0} max={4294967295} step={1}/><label class="pn-field"><span>Time step<small>ms</small></span><select value={draft.dt} onChange={e => update('dt')(Number(e.currentTarget.value))}><option value={.002}>0.002 · standard</option><option value={.001}>0.001 · refined</option><option value={.0005}>0.0005 · fine</option></select></label><p class="pn-help">Uniform anisotropic tissue. Fascicle boundaries and cuff insulation do not change conductivity in this version.</p></details>
        <button class="pn-primary pn-run" type="button" onClick={() => run()} disabled={pending}>{pending ? 'Calculating…' : 'Apply & calculate →'}</button>
      </div></details></aside>
      <section class="pn-workspace" aria-label="Peripheral nerve experiment">
        <div class="pn-view-heading"><div><p class="pn-kicker">02 / Anatomy & applied field</p><h2>Inside the nerve</h2></div><span class="pn-status" role="status">{pending ? 'Calculating…' : dirty ? 'Controls edited · showing previous run' : result ? 'Calculated · current settings' : 'Preparing experiment…'}</span></div>
        {error && <p class="pn-error" role="alert">{error}</p>}
        {result ? <>
          <div class="pn-views" aria-busy={pending}>
            <section class="pn-cross-panel"><div class="pn-scene-title"><span>Transverse section</span><span>7 fascicles / 168 fibers</span></div><CrossSection result={result} selected={fiberId} onSelect={selectFiber} mode={mode} map={sectionMap} sectionZ={sectionZ}/><div class="pn-color-control"><label>Slice z / mm <input aria-label="Cross-section position" type="range" min={-5} max={5} step={.1} value={sectionZ} onInput={e => setSectionZ(Number(e.currentTarget.value))}/><output>{fmt(sectionZ, 1)}</output></label><label>Fiber color <select value={mode} onChange={e => setMode(e.currentTarget.value)}><option value="anatomy">Anatomy</option><option value="potential">Extracellular potential</option><option value="curvature">Field curvature</option></select></label>{mode !== 'anatomy' && <div class="pn-color-legend"><span>−{fmt(maxMap, 2)}</span><i/><span>+{fmt(maxMap, 2)} {mode === 'potential' ? 'mV' : 'mV/mm²'}</span></div>}</div></section>
            <section class="pn-long-panel"><div class="pn-scene-title"><span>Longitudinal cutaway</span><span>Drag to orbit</span></div><Scene result={result} onSelect={selectFiber} frame={frame} sectionZ={sectionZ}/><div class="pn-scene-key"><span><i class="pn-gold"/>C− cathodic contact</span><span><i class="pn-cyan"/>R+ return contact</span><span>Node ΔVm: blue − / gold +</span></div></section>
          </div>
          <p class="pn-caption">Synthetic anatomy; representative fibers, not a histological census. Fiber diameters are enlarged ×3 (minimum visible marker in section); node markers are enlarged. Ring contacts are projected into the section; their small radial offsets in this view separate overlapping symbols. Field colors show the first-phase field at the selected slice, not firing. Selected 3D nodes show replayed ΔVm, scaled to this run’s peak.</p>
          <div class="pn-inspector"><label>Inspect fiber<select value={fiberId} onChange={e => selectFiber(Number(e.currentTarget.value))} disabled={pending}>{result.anatomy.fibers.map(f => <option value={f.id}>{aLabel(f.id)} · {fLabel(f.fascicle)} · {fmt(f.diameterUm, 1)} µm</option>)}</select></label><div><small>Outer fiber diameter</small><strong>{fmt(currentFiber.diameterUm, 1)} <em>µm</em></strong></div><div><small>Node spacing</small><strong>{fmt(result.cable.spacingMm, 3)} <em>mm</em></strong></div><div><small>Peak passive |ΔVm|</small><strong>{fmt(r.peak, 3)} <em>mV</em></strong></div></div>
          <section class="pn-response"><div class="pn-view-heading"><div><p class="pn-kicker">03 / Field → cable → polarization</p><h2>Follow the selected fiber</h2></div><button type="button" onClick={() => { setPinned(result); }} disabled={pending || !!dirty}>Pin this run</button></div>
            <div class="pn-replay"><button type="button" onClick={() => { if (frame === r.times.length - 1) setFrame(0); setPlaying(!playing); }} aria-label={playing ? 'Pause membrane replay' : 'Play membrane replay'}>{playing ? 'Pause' : '▶ Replay'}</button><input aria-label="Membrane replay time" type="range" min={0} max={r.times.length - 1} step={1} value={frame} onInput={e => { setPlaying(false); setFrame(Number(e.currentTarget.value)); }}/><output>{fmt(r.times[frame], 3)} ms</output><button type="button" onClick={() => { setPlaying(false); setFrame(r.peakFrame); setNode(r.peakIndex); }}>Peak</button></div>
            <div class="pn-plot-grid"><section><h3>Applied extracellular potential</h3><p>Along the fiber during the first phase.</p><Plot label="First-phase extracellular voltage along the selected fiber" unit="Ve / mV" xUnit="z / mm" series={[{ x: result.cable.z, y: result.field }, ...(pinned ? [{ x: pinned.cable.z, y: pinned.field, dashed: true }] : [])]} cursor={result.cable.z[node]}/></section><section><h3>Passive membrane polarization</h3><p>Calculated ΔVm at the replay time; no active channels.</p><Plot label="Passive membrane polarization along the fiber at replay time" unit="ΔVm / mV" xUnit="z / mm" series={[{ x: result.cable.z, y: r.voltages.subarray(frame * r.count, (frame + 1) * r.count) }]} cursor={result.cable.z[node]} fixedRange={Math.max(r.peak * 1.1, .01)}/></section><section><h3>Axial driving term</h3><p>Sealed-end differences of Ve, multiplied by axial conductance.</p><Plot label="Axial extracellular driving current for each node" unit="nA" xUnit="z / mm" series={[{ x: result.cable.z, y: Array.from(result.drive, v => v * result.cable.axialUs) }]} cursor={result.cable.z[node]}/></section><section><h3>One node, through time</h3><label class="pn-node-control">Node <select aria-label="Inspected cable node" value={node} onChange={e => setNode(Number(e.currentTarget.value))}>{result.cable.z.map((z, i) => <option value={i}>{i + 1} · z {fmt(z)} mm</option>)}</select></label><Plot label="Selected node passive membrane response over time" unit="ΔVm / mV" xUnit="t / ms" series={series} cursor={r.times[frame]}/></section></div>
            {pinned && <div class="pn-comparison"><p><strong>Dashed: pinned run.</strong> {PRESETS.find(p => p.id === pinned.p.layout)?.name}, {pinned.p.amplitude} µA. Peak |ΔVm| {fmt(pinned.response.peak, 3)} → {fmt(r.peak, 3)} mV. {pinned.p.seed !== result.p.seed || pinned.p.diameter !== result.p.diameter ? 'Anatomy differs; this is not a matched geometry comparison.' : 'Anatomy and selected fiber are unchanged.'}</p><button type="button" onClick={() => setPinned(null)}>Clear baseline</button></div>}
            <p class="pn-limit">Polarization is a passive cable response, not a predicted action potential or recruitment threshold. The field-curvature map compares geometry; it does not establish fascicle selectivity. Large passive voltages fall outside the small-signal interpretation.</p>
          </section>
          <section class="pn-export"><div><p class="pn-kicker">04 / Reproduce the experiment</p><p>Save applied settings and the selected fiber, or export every calculated node and time point.</p></div><div class="pn-actions"><button type="button" onClick={() => download('peripheral-nerve-experiment.json', JSON.stringify(experimentDocument(result), null, 2), 'application/json')} disabled={pending}>Experiment JSON ↓</button><button type="button" onClick={exportCsv} disabled={pending}>Node traces CSV ↓</button><button type="button" onClick={() => file.current?.click()}>Import JSON ↑</button><input type="file" accept=".json,application/json" ref={file} onChange={importFile} hidden/></div><details class="pn-json"><summary>Copy or paste experiment JSON</summary><p>Use this text form if your browser restricts file downloads.</p><button type="button" onClick={() => { setJsonText(JSON.stringify(experimentDocument(result), null, 2)); setJsonStatus('Applied settings are ready to copy.'); }}>Show applied experiment</button><textarea aria-label="Experiment JSON text" value={jsonText} onInput={e => setJsonText(e.currentTarget.value)} maxLength={16384} spellcheck={false}/><button type="button" onClick={restoreText} disabled={pending}>Restore pasted experiment</button><p role="status">{jsonStatus}</p></details></section>
        </> : <div class="pn-loading" role="status">Preparing the nerve and contact model…</div>}
      </section>
    </div>
    <section class="pn-first"><div class="pn-first-number">001</div><div><p class="pn-kicker">Where BuildTheSimulation began</p><h2>The first simulation.</h2><p>The original peripheral nerve cross-section was the first simulation made for this site. It remains available, with its original interactions, as part of the project’s history.</p></div><a href="/sim/">Open the original ↗</a></section>
    <footer class="pn-footer"><span>Peripheral Nerve Laboratory · {VERSION}</span><a href="/simulations/peripheral-nerve/methods/">Assumptions & validation</a><a href="/simulations/nerve-regeneration/">Nerve regeneration ↗</a><a href="/simulations/rpni-design/">RPNI design ↗</a></footer>
  </div>;
}
