import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CONFIG, MATERIALS, MODEL_VERSION, PRESETS, electrode, normalizeConfig, presetConfig } from '../lib/stimulation/config.js';
import { contactArea, contactNodes, conductivityTensor, fieldAt, distanceToContact } from '../lib/stimulation/field.js';

const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const percent = n => `${fmt(n * 100, 1)}%`;
function download(body, name, type) { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
function NumberField({ label, value, onChange, unit = '', min, max, step = 1 }) { return <label class="cs-field"><span>{label}<small>{unit}</small></span><input type="number" value={value} min={min} max={max} step={step} onChange={e => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) onChange(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v))); }} /></label>; }
function Choice({ label, value, onChange, options }) { return <label class="cs-field"><span>{label}</span><select value={value} onChange={e => onChange(e.currentTarget.value)}>{options.map(([v, label]) => <option value={v}>{label}</option>)}</select></label>; }
function Toggle({ children, value, onChange }) { return <label class="cs-toggle"><input type="checkbox" checked={value} onChange={e => onChange(e.currentTarget.checked)} />{children}</label>; }

function LinePlot({ time, series, yLabel, yRange, marker = null }) {
  if (!time?.length) return null;
  const w = 620, h = 190, left = 48, right = 14, top = 16, bottom = 32;
  const xMax = time[time.length - 1] || 1;
  let lo = yRange?.[0] ?? Infinity, hi = yRange?.[1] ?? -Infinity;
  if (!yRange) series.forEach(s => s.values.forEach(v => { if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
  if (!Number.isFinite(lo)) lo = -1; if (!Number.isFinite(hi)) hi = 1;
  if (hi - lo < 1e-5) { hi++; lo--; }
  const x = t => left + t / xMax * (w - left - right), y = v => top + (hi - v) / (hi - lo) * (h - top - bottom);
  return <div class="cs-lineplot"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${yLabel} over time. ${series.map(s => s.label).join(', ')}.`}>
    {[0, .5, 1].map(f => <g><line x1={left} x2={w - right} y1={y(lo + f * (hi - lo))} y2={y(lo + f * (hi - lo))} class="cs-gridline"/><text x={left - 8} y={y(lo + f * (hi - lo)) + 4} text-anchor="end">{fmt(lo + f * (hi - lo), 1)}</text></g>)}
    {[0, .25, .5, .75, 1].map(f => <text x={x(f * xMax)} y={h - 11} text-anchor="middle">{fmt(f * xMax, 1)}</text>)}
    {series.map(s => <path d={Array.from(time, (t, i) => `${i ? 'L' : 'M'}${x(t).toFixed(2)},${y(s.values[i]).toFixed(2)}`).join(' ')} fill="none" stroke={s.color} stroke-width="1.7" stroke-dasharray={s.dashed ? '5 3' : undefined}/>)}
    {marker !== null && <line x1={x(marker)} x2={x(marker)} y1={top} y2={h - bottom} class="cs-playhead"/>}
    <text x={left} y={11}>{yLabel}</text><text x={w - 14} y={h - 11} text-anchor="end">ms</text>
  </svg><div class="cs-chart-key">{series.map(s => <span><i style={{ background: s.color }}/>{s.label}</span>)}</div></div>;
}

function Recruitment({ result, baseline }) {
  const bins = result.bins;
  return <><svg class="cs-recruitment" viewBox="0 0 620 205" role="img" aria-label="Fraction of sampled neurons spiking by soma distance from the nearest active contact. Numbers are sample counts per bin.">
    {[0, .5, 1].map(p => <g><line class="cs-gridline" x1="44" x2="612" y1={160 - p * 130} y2={160 - p * 130}/><text x="37" y={164 - p * 130} text-anchor="end">{p * 100}%</text></g>)}
    {bins.map((b, i) => {
      const x = 53 + i * 70, p = b.total ? b.activated / b.total : 0, n = b.total, z2 = 3.8416;
      const center = n ? (p + z2 / (2 * n)) / (1 + z2 / n) : 0, half = n ? 1.96 * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n) : 0;
      const a = baseline?.bins[i], ap = a?.total ? a.activated / a.total : 0;
      return <g><rect x={x} y={160 - p * 130} width="44" height={Math.max(n ? 1 : 0, p * 130)} rx="2" class="cs-bar"/>{a && <rect x={x - 4} y={160 - ap * 130} width="52" height={Math.max(1, ap * 130)} fill="none" class="cs-baseline-bar"/>}{n > 0 && <line x1={x + 22} x2={x + 22} y1={160 - (center + half) * 130} y2={160 - Math.max(0, center - half) * 130} class="cs-errorbar"/>}<text x={x + 22} y="178" text-anchor="middle">{i === 7 ? '525+' : `${b.lower}`}</text><text x={x + 22} y="198" text-anchor="middle">n={n}</text></g>;
    })}
  </svg><p class="cs-caption">Soma-to-contact surface distance, µm · 75 µm bins · bars show the solved sample; whiskers are Wilson 95% sampling intervals. They do not capture model uncertainty.{baseline && ' Outlines: saved comparison.'}</p></>;
}

function FieldSection({ result, kind, selected, onSelect }) {
  const canvas = useRef(null), [hover, setHover] = useState(null);
  const contacts = useMemo(() => result.config.electrodes.map(e => contactNodes(e, result.config.quadrature)), [result]);
  useEffect(() => {
    let cancelled = false;
    import('../lib/stimulation/view.js').then(({ fieldImage }) => {
      if (cancelled || !canvas.current) return;
      const c = canvas.current, ctx = c.getContext('2d'), { field, config } = result; c.width = 720; c.height = Math.round(720 * config.depth / config.width);
      const off = document.createElement('canvas'); off.width = field.n; off.height = field.n; off.getContext('2d').putImageData(new ImageData(fieldImage(field, kind), field.n, field.n), 0, 0); ctx.drawImage(off, 0, 0, c.width, c.height);
      const sx = c.width / config.width, sz = c.height / config.depth;
      result.samples.forEach((cell, i) => {
        if (Math.abs(cell.position[1]) > 20 + cell.radius) return;
        ctx.beginPath(); ctx.ellipse((cell.position[0] + config.width / 2) * sx, (cell.position[2] - config.top) * sz, cell.radii[0] * sx, cell.radii[2] * sz, 0, 0, 2 * Math.PI); ctx.fillStyle = cell.firstSpike >= 0 ? '#ffc679' : '#738ea6'; ctx.fill(); ctx.strokeStyle = i === selected ? '#fff9e8' : '#132430'; ctx.lineWidth = i === selected ? 3 : 1; ctx.stroke();
      });
      ctx.strokeStyle = '#e8f0e9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(24, c.height - 30); ctx.lineTo(24 + 100 * sx, c.height - 30); ctx.stroke(); ctx.font = '20px Georgia'; ctx.fillStyle = '#e8f0e9'; ctx.fillText('100 µm', 24, c.height - 42);
    });
    return () => { cancelled = true; };
  }, [result, kind, selected]);
  const position = event => { const rect = canvas.current.getBoundingClientRect(); return [(event.clientX - rect.left) / rect.width * result.config.width - result.config.width / 2, 0, result.config.top + (event.clientY - rect.top) / rect.height * result.config.depth]; };
  const inspect = event => { const p = position(event); if (result.config.electrodes.some(e => distanceToContact(p, e) < 2)) { setHover({ p, masked: true }); return; } const f = fieldAt(p, contacts, result.config.electrodes.map(e => e.weight * result.peakDrive), conductivityTensor(result.config)); setHover({ p, ...f }); };
  const select = event => { const p = position(event); let near = 18, index = -1; result.samples.forEach((n, i) => { if (Math.abs(n.position[1]) > 20 + n.radius) return; const d = Math.hypot(p[0] - n.position[0], p[2] - n.position[2]); if (d < near) { near = d; index = i; } }); if (index >= 0) onSelect(index); };
  return <div class="cs-section-view"><canvas ref={canvas} onPointerMove={inspect} onPointerLeave={() => setHover(null)} onClick={select} role="img" aria-label="Side cross-section of the extracellular field at y equals zero; physically scaled somata within a 40 micrometer slice."/><p>{hover?.masked ? 'Contact interior / near-surface field is masked' : hover ? `x ${fmt(hover.p[0], 0)} · depth ${fmt(hover.p[2], 0)} µm | φ ${fmt(hover.potential, 2)} mV | |E| ${fmt(hover.magnitude, 1)} V/m` : 'Field at y = 0 · somata within a 40 µm section · hover to inspect the field'}</p></div>;
}

export default function CorticalStimulationLab() {
  const [config, setConfig] = useState(() => normalizeConfig(DEFAULT_CONFIG)), [result, setResult] = useState(null), [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState({ progress: 0, label: '' }), [error, setError] = useState('');
  const [tab, setTab] = useState('contacts'), [preset, setPreset] = useState('single'), [selectedElectrode, setSelectedElectrode] = useState(0), [spacing, setSpacing] = useState(150), [share, setShare] = useState(.5);
  const [selected, setSelected] = useState(0), [view, setView] = useState('3d'), [kind, setKind] = useState('magnitude'), [showPopulation, setShowPopulation] = useState(true), [showField, setShowField] = useState(false), [viewerError, setViewerError] = useState('');
  const [playing, setPlaying] = useState(false), [time, setTime] = useState(null);
  const mount = useRef(null), viewer = useRef(null), worker = useRef(null), job = useRef(0), file = useRef(null), currentConfig = useRef(config), resultRef = useRef(result), displayRef = useRef(null);
  currentConfig.current = config; resultRef.current = result; displayRef.current = { selected, kind, showPopulation, showField, time };
  const update = (key, value) => setConfig(c => ({ ...c, [key]: value }));
  const e = config.electrodes[selectedElectrode] ?? config.electrodes[0];
  const updateElectrode = (key, value) => setConfig(c => ({ ...c, electrodes: c.electrodes.map((contact, i) => i === selectedElectrode ? { ...contact, [key]: value } : contact) }));
  const stale = result && JSON.stringify(normalizeConfig(config)) !== JSON.stringify(result.config);
  const run = (value = currentConfig.current) => {
    worker.current?.terminate(); const id = ++job.current, clean = normalizeConfig(value); setConfig(clean); setBusy(true); setError(''); setPlaying(false); setTime(null); setProgress({ progress: 0, label: 'Starting the experiment' });
    try {
      const w = new Worker(new URL('../lib/stimulation/worker.js', import.meta.url), { type: 'module' }); worker.current = w;
      w.onmessage = ({ data }) => {
        if (data.job !== job.current) return;
        if (data.error) { setError(data.error); setBusy(false); w.terminate(); }
        else if (data.result) { setResult(data.result); setSelected(Math.max(0, data.result.samples.findIndex(n => n.firstSpike >= 0))); setBusy(false); w.terminate(); worker.current = null; }
        else setProgress(data);
      };
      w.onerror = () => { if (id === job.current) { setError('The simulation worker could not finish. Try a smaller solved sample or reload the page.'); setBusy(false); } w.terminate(); };
      w.postMessage({ job: id, config: clean });
    } catch (error) { setError(error.message); setBusy(false); }
  };
  const cancel = () => { job.current++; worker.current?.terminate(); worker.current = null; setBusy(false); setProgress({ progress: 0, label: 'Experiment cancelled' }); };
  useEffect(() => { run(); return () => { job.current++; worker.current?.terminate(); }; }, []);
  useEffect(() => {
    if (!mount.current || viewer.current) return;
    let cancelled = false;
    import('../lib/stimulation/view.js').then(({ createCortexView }) => {
      if (cancelled) return;
      try { viewer.current = createCortexView(mount.current, setSelected); if (resultRef.current) viewer.current.setResult(resultRef.current); const d = displayRef.current; viewer.current.setSelected(d.selected); viewer.current.setField(d.kind); viewer.current.showPopulation(d.showPopulation); viewer.current.showField(d.showField); viewer.current.setTime(d.time); }
      catch { setViewerError('3D is unavailable in this browser. The field section, neuron solver and charts still work.'); setView('section'); }
    }).catch(() => { setViewerError('3D could not load. Use the field section and charts.'); setView('section'); });
    return () => { cancelled = true; viewer.current?.dispose(); viewer.current = null; };
  }, []);
  useEffect(() => { if (result && viewer.current) viewer.current.setResult(result); }, [result]);
  useEffect(() => { viewer.current?.setSelected(selected); }, [selected, result]);
  useEffect(() => { viewer.current?.setField(kind); }, [kind, result]);
  useEffect(() => { viewer.current?.showPopulation(showPopulation); }, [showPopulation]);
  useEffect(() => { viewer.current?.showField(showField); }, [showField]);
  useEffect(() => { viewer.current?.setTime(time); }, [time]);
  useEffect(() => {
    if (!playing || !result) return;
    let frame, last = performance.now(), position = time ?? 0, previousPaint = 0;
    const end = result.traces.time[result.traces.time.length - 1];
    const tick = now => { position += (now - last) * end / 6500; last = now; if (position > end) position = 0; if (now - previousPaint > 30) { setTime(position); previousPaint = now; } frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing, result]);
  const applyPreset = id => { setPreset(id); setConfig(c => presetConfig(id, c, spacing)); setSelectedElectrode(0); setShare(.5); };
  const setMaterial = material => { const m = MATERIALS[material]; setConfig(c => ({ ...c, electrodes: c.electrodes.map((e, i) => i === selectedElectrode ? { ...e, material, capacitance: m.capacitance, resistance: m.resistance } : e) })); };
  const sample = result?.samples[selected];
  const traceSeries = useMemo(() => result ? [
    { label: 'Soma', color: '#bf7541', values: Array.from(result.traces.time, (_, k) => result.traces.soma[k * result.traces.count + selected]) },
    { label: 'Distal AIS', color: '#348e9a', values: Array.from(result.traces.time, (_, k) => result.traces.ais[k * result.traces.count + selected]) },
  ] : [], [result, selected]);
  const electrodeTrace = Math.min(selectedElectrode, (result?.config.electrodes.length ?? 1) - 1);
  const currents = useMemo(() => result ? result.config.electrodes.map((e, i) => ({ label: e.id, color: ['#348e9a', '#bd7444', '#8b6ea9', '#668252', '#c95f76', '#748093'][i], values: Array.from(result.traces.time, (_, k) => result.traces.current[k * result.traces.electrodes + i]) })) : [], [result]);
  const polar = useMemo(() => result ? [
    { label: 'Terminal voltage', color: '#bf7541', values: Array.from(result.traces.time, (_, k) => result.traces.voltage[k * result.traces.electrodes + electrodeTrace]) },
    { label: 'Interface polarization', color: '#348e9a', values: Array.from(result.traces.time, (_, k) => result.traces.polarization[k * result.traces.electrodes + electrodeTrace]) },
  ] : [], [result, electrodeTrace]);
  const exportResults = () => {
    if (!result) return;
    const rows = [['model_version', 'neuron_id', 'cell_class', 'x_um', 'y_um', 'depth_um', 'soma_diameter_um', 'nearest_contact_soma_um', 'nearest_contact_neurite_um', 'first_spike_ms', 'first_compartment', 'soma_spike_ms', 'axon_spike_ms', 'extreme_voltage'], ...result.samples.map(n => [MODEL_VERSION, n.id, n.inhibitory ? 'FS-like' : 'RS-like', ...n.position, n.diameter, Number.isFinite(n.somaDistance) ? n.somaDistance : '', Number.isFinite(n.neuriteDistance) ? n.neuriteDistance : '', n.firstSpike < 0 ? '' : n.firstSpike, n.firstKind, n.somaSpike < 0 ? '' : n.somaSpike, n.axonSpike < 0 ? '' : n.axonSpike, n.extreme])];
    download(rows.map(row => row.join(',')).join('\n'), 'cortical-stimulation-neurons.csv', 'text/csv');
  };
  const exportTraces = () => { if (!result) return; const { traces } = result; const rows = [['time_ms', `neuron_${sample.id}_soma_mV`, `neuron_${sample.id}_AIS_mV`, ...result.config.electrodes.flatMap(e => [`${e.id}_current_uA`, `${e.id}_terminal_V`, `${e.id}_polarization_V`])]]; for (let k = 0; k < traces.time.length; k++) rows.push([traces.time[k], traces.soma[k * traces.count + selected], traces.ais[k * traces.count + selected], ...result.config.electrodes.flatMap((_, i) => [traces.current[k * traces.electrodes + i], traces.voltage[k * traces.electrodes + i], traces.polarization[k * traces.electrodes + i]])]); download(rows.map(r => r.join(',')).join('\n'), `cortical-stimulation-neuron-${sample.id}-traces.csv`, 'text/csv'); };
  const importConfig = async event => { const f = event.currentTarget.files?.[0]; if (!f) return; try { if (f.size > 2e6) throw new Error('Use an experiment JSON smaller than 2 MB.'); const parsed = JSON.parse(await f.text()), data = parsed.config ?? parsed; if (!Array.isArray(data.electrodes)) throw new Error('This file does not contain a stimulation experiment.'); setConfig(normalizeConfig(data)); setSelectedElectrode(0); setPreset('custom'); setError(''); } catch (error) { setError(error.message); } finally { event.target.value = ''; } };
  const f = (key, label, unit, min, max, step = 1) => <NumberField label={label} unit={unit} value={config[key]} onChange={v => update(key, v)} min={min} max={max} step={step}/>;
  const ef = (key, label, unit, min, max, step = 1) => <NumberField label={label} unit={unit} value={e[key]} onChange={v => updateElectrode(key, v)} min={min} max={max} step={step}/>;
  return <div class="cs-lab">
    <div class="cs-topbar"><div><span class="cs-eyebrow">Cortical stimulation · experiment 03</span><h2>Where does a pulse become a spike?</h2><p>Shape the current. Follow the axon. Inspect the response.</p></div><a href="/simulations/cortical-stimulation/guide/">Physics, anatomy &amp; sources</a></div>
    <div class="cs-presets" aria-label="Electrode arrangement presets">{PRESETS.map(p => <button class={preset === p.id ? 'is-active' : ''} onClick={() => applyPreset(p.id)} title={p.description}>{p.name}</button>)}<span>Human V1 layers 2/3 · reduced active neurons</span></div>
    <div class="cs-workspace">
      <aside class="cs-controls" aria-label="Experiment parameters">
        <div class="cs-control-tabs" role="tablist" aria-label="Parameter groups">{[['contacts', 'Electrodes'], ['pulse', 'Pulse'], ['tissue', 'Tissue'], ['model', 'Model']].map(([key, label]) => <button role="tab" tabIndex={tab === key ? 0 : -1} onKeyDown={event => { const keys = ['contacts', 'pulse', 'tissue', 'model']; let next; if (event.key === 'ArrowRight') next = (keys.indexOf(tab) + 1) % 4; else if (event.key === 'ArrowLeft') next = (keys.indexOf(tab) + 3) % 4; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = 3; if (next !== undefined) { event.preventDefault(); setTab(keys[next]); document.getElementById(`cs-tab-${keys[next]}`)?.focus(); } }} aria-selected={tab === key} aria-controls="cs-control-panel" id={`cs-tab-${key}`} class={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
        <div class="cs-control-panel" id="cs-control-panel" role="tabpanel" aria-labelledby={`cs-tab-${tab}`}>
          {tab === 'contacts' && <>
            <h3>Finite contacts</h3><p class="cs-note">Negative weights are cathodic in the leading phase. All weights multiply the pulse amplitude.</p>
            <div class="cs-electrodes">{config.electrodes.map((contact, i) => <button class={i === selectedElectrode ? 'is-active' : ''} onClick={() => setSelectedElectrode(i)}>{contact.id} <small>{contact.weight > 0 ? '+' : ''}{fmt(contact.weight, 2)}</small></button>)}</div>
            <div class="cs-buttonrow"><button disabled={config.electrodes.length >= 6} onClick={() => { setConfig(c => ({ ...c, electrodes: [...c.electrodes, electrode(`E${c.electrodes.length + 1}`, { x: [100, -100, 0, 0, 100][c.electrodes.length - 1], y: [0, 0, 100, -100, 100][c.electrodes.length - 1], weight: 1, z: c.top + c.depth / 2 })] })); setSelectedElectrode(config.electrodes.length); setPreset('custom'); }}>Add contact</button><button disabled={config.electrodes.length <= 1} onClick={() => { setConfig(c => ({ ...c, electrodes: c.electrodes.filter((_, i) => i !== selectedElectrode).map((e, i) => ({ ...e, id: `E${i + 1}` })) })); setSelectedElectrode(0); setPreset('custom'); }}>Remove</button></div>
            <Choice label="Contact shape" value={e.shape} onChange={v => updateElectrode('shape', v)} options={[["disk", "Disk"], ["rectangle", "Rectangle"], ["ring", "Annulus"], ["sphere", "Sphere"]]}/>
            <div class="cs-fields">{e.shape === 'rectangle' ? <>{ef('width', 'Width', 'µm', 10, 200)}{ef('height', 'Height', 'µm', 10, 300)}</> : ef('diameter', 'Diameter', 'µm', 10, 200)}{e.shape === 'ring' && ef('innerRatio', 'Inner / outer radius', '', .1, .9, .05)}{ef('weight', 'Current weight', '×', -2, 2, .05)}</div>
            <p class="cs-small-stat">Exposed interface area <strong>{fmt(contactArea(e), 0)} µm²</strong></p>{e.shape !== 'sphere' && <p class="cs-note">Immersed sheet: both faces exposed, rim insulated.</p>}
            <div class="cs-fields">{ef('x', 'X position', 'µm', -500, 500, 10)}{ef('y', 'Y position', 'µm', -500, 500, 10)}{ef('z', 'Depth below pia', 'µm', 100, 1200, 10)}{e.shape !== 'sphere' && ef('tilt', 'Normal tilt from depth', '°', 0, 180, 5)}</div>
            {config.electrodes.length > 1 && <NumberField label="Preset center spacing" value={spacing} unit="µm" min={30} max={300} step={10} onChange={v => { const scale = v / spacing; setSpacing(v); setConfig(c => ({ ...c, electrodes: c.electrodes.map(e => ({ ...e, x: e.x * scale, y: e.y * scale })) })); }}/>}
            {preset === 'steer' && <label class="cs-field"><span>Share sent to E2 <small>{percent(share)}</small></span><input type="range" min="0" max="1" step=".05" value={share} onInput={event => { const value = +event.currentTarget.value; setShare(value); setConfig(c => ({ ...c, electrodes: c.electrodes.map((e, i) => ({ ...e, weight: i === 0 ? -(1 - value) : -value })) })); }}/></label>}
            <h3>Material &amp; interface</h3><Choice label="Material example" value={e.material} onChange={setMaterial} options={Object.entries(MATERIALS).map(([key, value]) => [key, value.name])}/><p class="cs-note">{MATERIALS[e.material].note}</p>
            <div class="cs-fields">{ef('capacitance', 'Effective capacitance', 'µF/cm²', 5, 20000, 5)}{ef('resistance', 'Charge-transfer resistance', 'Ω·cm²', 10, 10000, 10)}</div>
          </>}
          {tab === 'pulse' && <>
            <h3>Charge-balanced command</h3><p class="cs-note">Biphasic pulses start at 1 ms. The second phase repays the commanded charge; clipping can leave a delivered imbalance.</p>
            {f('amplitude', 'Pulse amplitude', 'µA × weight', 0, 100, 1)}
            <div class="cs-fields">{f('phaseWidth', 'Leading phase', 'µs', 50, 1000, 25)}{f('gap', 'Interphase gap', 'µs', 0, 500, 10)}{f('recoveryRatio', 'Recovery duration', '× leading', 1, 5, .5)}{f('pulses', 'Pulse count', '', 1, 4)}{f('frequency', 'Train frequency', 'Hz', 50, 200, 10)}{f('compliance', 'Voltage compliance', '±V', 1, 30, 1)}</div>
            <Toggle value={config.interfaceEnabled} onChange={v => update('interfaceEnabled', v)}>Include interface &amp; compliance</Toggle><p class="cs-note">When enabled, all channels scale together if one runs out of voltage, preserving local current balance. Disabled: an ideal current source with no interface voltage limit.</p>
            <div class="cs-explainer"><strong>Material changes the delivered pulse.</strong><p>At identical delivered currents, changing only the material leaves the bulk tissue field unchanged in this model. Smaller contacts raise both charge density and interface polarization.</p></div>
          </>}
          {tab === 'tissue' && <>
            <h3>Physical anatomy</h3><p class="cs-note">Human V1 L2/3 measurements anchor density and soma scale. The arrangement and branched morphologies are synthetic; individual cells are not anatomical reconstructions.</p>
            {f('density', 'Neuron density', 'neurons/mm³', 20000, 180000, 1000)}
            <div class="cs-fields">{f('somaDiameter', 'Soma profile-equivalent diameter', 'µm', 8, 22, .5)}{f('somaCV', 'Soma size dispersion', 'assumed CV', 0, .3, .02)}{f('inhibitoryFraction', 'FS-like fraction', '0–1', 0, .5, .01)}{f('width', 'Lateral width (X and Y)', 'µm', 300, 800, 50)}{f('depth', 'Volume thickness', 'µm', 300, 600, 50)}{f('top', 'Volume top below pia', 'µm', 281, 403, 10)}</div>
            <h3>Neurites &amp; conductivity</h3><div class="cs-fields">{f('axonDiameter', 'Axon shaft diameter', 'µm', .4, 2, .1)}{f('axonLength', 'Collateral reach', 'µm', 100, 400, 20)}{f('conductivity', 'Tangential conductivity', 'S/m', .1, .6, .01)}{f('anisotropy', 'Depth / tangential ratio', '×', .5, 3, .1)}</div>
            <Choice label="Principal cell orientation" value={config.orientation} onChange={v => update('orientation', v)} options={[["radial", "Pyramidal axis toward pia"], ["random", "Randomized orientation experiment"]]}/>
            <p class="cs-note">Depth is an anatomical coordinate. The electrical medium extends indefinitely: pia, CSF, shank insulation, glia and blood vessels are not boundaries in this solver.</p>
          </>}
          {tab === 'model' && <>
            <h3>Active cable equations</h3><p class="cs-note">Na, delayed-rectifier K, slow M and leak currents are coupled through branched intracellular cables. Excitation is detected from upward 0 mV crossings, not from a field threshold.</p>
            <Choice label="Solved population sample" value={config.sampleCount} onChange={v => update('sampleCount', +v)} options={[[128, '128 · quick exploration'], [512, '512 · standard'], [1024, '1,024 · denser sample'], [2048, '2,048 · slower, denser sample']]}/>
            <Choice label="Time step" value={config.dt} onChange={v => update('dt', +v)} options={[[.005, '5 µs · standard'], [.0025, '2.5 µs · convergence check'], [.001, '1 µs · short pulses / fine']]}/>
            <Choice label="Maximum neurite segment length" value={config.segmentLength} onChange={v => update('segmentLength', +v)} options={[[20, '20 µm · standard'], [10, '10 µm · convergence check']]}/>
            <Choice label="Contact quadrature points" value={config.quadrature} onChange={v => update('quadrature', +v)} options={[[144, '144 · standard'], [400, '400 · near-field check']]}/>
            <div class="cs-fields">{f('axialResistivity', 'Intracellular resistivity', 'Ω·cm', 70, 250, 10)}{f('sodiumScale', 'Na conductance sensitivity', '×', .5, 2, .1)}{f('seed', 'Anatomy seed', '', 1, 2147483647)}</div>
            <p class="cs-note">Kinetics: Pospischil / Traub at 36 °C, with assumed spatial channel densities. Unmyelinated local axons, sealed terminals, no synapses or spontaneous activity. Absolute thresholds are not experimentally validated.</p>
            <button onClick={() => { setConfig(normalizeConfig(DEFAULT_CONFIG)); setPreset('single'); setSelectedElectrode(0); setSpacing(150); }}>Restore reference experiment</button>
          </>}
        </div>
        <div class="cs-run"><button class="cs-primary" onClick={() => run()} disabled={busy}>{busy ? 'Solving…' : stale ? 'Run changed experiment' : 'Run experiment'}</button>{busy && <button onClick={cancel}>Cancel</button>}<p>{stale ? 'Views show the last completed run until you rerun.' : 'Seeded anatomy stays fixed while you change the stimulus.'}</p></div>
      </aside>
      <div class="cs-main">
        <div class="cs-metrics"><div><span>Sampled neurons spiking</span><strong>{result ? `${result.summary.activated} / ${result.summary.solved}` : '—'}</strong></div><div><span>First spike in axon / AIS</span><strong>{result ? result.summary.firstAxonal : '—'}</strong></div><div><span>90% soma-distance extent</span><strong>{result ? `${fmt(result.summary.p90Distance, 0)} µm` : '—'}</strong></div><div><span>Represented anatomy</span><strong>{result ? fmt(result.population.count, 0) : '21,511'} <small>somata</small></strong></div></div>
        <div class="cs-viewbar"><div class="cs-buttonrow"><button class={view === '3d' ? 'is-active' : ''} disabled={!!viewerError} onClick={() => setView('3d')}>3D tissue</button><button class={view === 'section' ? 'is-active' : ''} onClick={() => setView('section')}>Field section</button></div><div class="cs-buttonrow">{[['oblique', 'Oblique'], ['side', 'Side'], ['top', 'Top'], ['cell', 'Inspect cell']].map(([key, label]) => <button disabled={!!viewerError} onClick={() => { setView('3d'); viewer.current?.setView(key); }}>{label}</button>)}</div></div>
        <div class="cs-stage">
          <div class={`cs-three ${view !== '3d' ? 'is-hidden' : ''}`} ref={mount}/>
          {view === 'section' && result && <FieldSection result={result} kind={kind} selected={selected} onSelect={setSelected}/>}
          {!result && <div class="cs-stage-intro"><span class="cs-eyebrow">From injected current to membrane voltage</span><h3>A tissue-scale experiment,<br/><em>one neuron at a time.</em></h3><p>{busy ? 'The reference experiment is being calculated.' : 'Run an experiment to calculate neural responses.'} Each bright soma will be a solved cell, surrounded by the anatomical population at its physical scale.</p></div>}
          {busy && <div class="cs-progress" role="status"><span>{progress.label}</span><progress max="1" value={progress.progress}/></div>}
          <div class="cs-stage-legend"><span><i class="unsolved"/>Anatomy only</span><span><i class="solved"/>Solved · no spike</span><span><i class="spike"/>Spiked</span><span><i class="selected"/>Selected cell</span></div>
        </div>
        <div class="cs-display-controls"><Toggle value={showPopulation} onChange={setShowPopulation}>Anatomical background</Toggle><Toggle value={showField} onChange={setShowField}>Field plane in 3D</Toggle><Choice label="Field display" value={kind} onChange={setKind} options={[["magnitude", "Electric field · V/m"], ["potential", "Extracellular potential · mV"], ["currentDensity", "Current density · A/m²"]]}/></div>
        <div class="cs-color-key"><div class={kind === 'potential' ? 'potential' : 'magnitude'}/><span>{kind === 'potential' ? '−100 mV · 0 · +100 mV, asinh scale' : kind === 'currentDensity' ? '0 → 300 A/m², logarithmic scale' : '0 → 1,000 V/m, logarithmic scale'}</span><span>Field: peak delivered leading phase · values above the legend saturate</span></div>
        {result && <div class="cs-playback"><button onClick={() => { if (time === null) setTime(0); setPlaying(p => !p); }}>{playing ? 'Pause' : 'Replay recruitment'}</button><input aria-label="Recruitment playback time" type="range" min="0" max={result.traces.time[result.traces.time.length - 1]} step=".025" value={time ?? result.traces.time[result.traces.time.length - 1]} onInput={e => { setPlaying(false); setTime(+e.currentTarget.value); }}/><output>{time === null ? 'All responses' : `${fmt(time, 2)} ms`}</output><button onClick={() => { setPlaying(false); setTime(null); }}>Show all</button></div>}
        {error && <p class="cs-alert" role="alert">{error}</p>}{viewerError && <p class="cs-note">{viewerError}</p>}
        <p class="cs-scope">Mechanistic exploration: finite current sources in uniform tissue and idealized active neurons. Bright cells are the solved sample; dim cells have no assigned activation result. <a href="/simulations/cortical-stimulation/guide/#limits">Read the model’s scope</a>.</p>
        {result && <>
          {result.population.count < result.population.target && <p class="cs-alert">The requested density could not be packed with these soma sizes and conservative clearance. This run represents {fmt(result.population.density, 0)} neurons/mm³; reduce size or density to reach the requested count.</p>}
          {result.summary.clippedFraction > 0 && <p class="cs-alert">Voltage compliance limited {percent(result.summary.clippedFraction)} of pulse intervals. Fields and neural responses use the delivered waveform shown below.</p>}
          {result.summary.extreme > 0 && <p class="cs-alert">{result.summary.extreme} sampled cells reached |Vₘ| &gt; 200 mV. Treat those responses as outside the reduced membrane model’s reliable range; lower current or increase contact clearance.</p>}
          <div class="cs-cell-inspector"><div><span class="cs-eyebrow">Follow a single neuron</span><h3>{sample?.inhibitory ? 'FS-like interneuron' : 'RS-like pyramidal cell'} <em>#{sample?.id}</em></h3></div><select aria-label="Inspect a solved neuron" value={selected} onChange={e => setSelected(+e.currentTarget.value)}>{result.samples.map((n, i) => <option value={i}>#{n.id} · {n.firstSpike >= 0 ? 'spiked' : 'no spike'} · soma {fmt(n.somaDistance, 0)} µm</option>)}</select></div>
          {sample && <div class="cs-cell-facts"><span>Soma diameter <b>{fmt(sample.diameter)} µm</b></span><span>Soma → contact <b>{fmt(sample.somaDistance, 0)} µm</b></span><span>Nearest neurite → contact <b>{fmt(sample.neuriteDistance, 0)} µm</b></span><span>First crossing <b>{sample.firstSpike < 0 ? 'No spike' : `${sample.firstKind} · ${fmt(sample.firstSpike, 3)} ms`}</b></span></div>}
          {sample?.neuriteDistance < 30 && <p class="cs-note">This cell has a neurite within 30 µm of a contact. Near-contact predictions are particularly sensitive to surface-current assumptions, compartment spacing, and omitted tissue boundaries.</p>}
          <div class="cs-plots">
            <section class="cs-plot"><div class="cs-plot-title"><h3>Membrane response</h3><button onClick={exportTraces}>Export traces</button></div><LinePlot time={result.traces.time} series={traceSeries} yLabel="Vₘ, mV" marker={time}/><p class="cs-caption">Actual computed soma and distal axon-initial-segment voltages. A remote axonal branch may spike before either trace rises.</p></section>
            <section class="cs-plot"><div class="cs-plot-title"><h3>Recruitment by distance</h3><button onClick={() => setBaseline(baseline ? null : { config: result.config, summary: result.summary, bins: result.bins })}>{baseline ? 'Clear comparison' : 'Save as comparison'}</button></div><Recruitment result={result} baseline={baseline}/></section>
            <section class="cs-plot"><h3>Delivered current</h3><LinePlot time={result.traces.time} series={currents} yLabel="I, µA" marker={time}/><p class="cs-caption">{Math.abs(result.summary.netWeight) < 1e-8 ? 'Local source and return currents balance at every time step.' : `A remote return at infinity carries the opposite of the summed contact current (net weight ${fmt(result.summary.netWeight, 2)}).`} Frequency is pulse repetition, not an assumed neuron firing rate.</p></section>
            <section class="cs-plot"><h3>{result.config.electrodes[electrodeTrace].id} · interface dynamics</h3><LinePlot time={result.traces.time} series={polar} yLabel="Voltage, V" marker={time}/><p class="cs-caption">The terminal voltage includes tissue access and electrode polarization. Circuit constants are editable equivalent models; charge density is not a tissue-safety threshold.</p></section>
          </div>
          <section class="cs-plot cs-raster"><div class="cs-plot-title"><h3>First-spike timing across the sample</h3><span>{result.summary.activated} responses</span></div><svg viewBox="0 0 960 170" role="img" aria-label="First spike times for the sampled neurons, ordered by soma distance. Each dot is a computed response.">{[0, .25, .5, .75, 1].map(f => <g><line class="cs-gridline" x1={45 + f * 900} x2={45 + f * 900} y1="12" y2="138"/><text x={45 + f * 900} y="160" text-anchor="middle">{fmt(result.traces.time[result.traces.time.length - 1] * f, 1)} ms</text></g>)}{result.samples.map((n, i) => n.firstSpike >= 0 && <circle cx={45 + n.firstSpike / result.traces.time[result.traces.time.length - 1] * 900} cy={15 + Math.min(n.somaDistance / 600, 1) * 120} r={i === selected ? 4 : 2.5} class="cs-raster-dot" onClick={() => setSelected(i)}><title>Neuron {n.id}: {fmt(n.firstSpike, 3)} ms, soma {fmt(n.somaDistance, 0)} µm</title></circle>)}<text x="3" y="18">0 µm</text><text x="3" y="139">600+</text></svg></section>
          <section class="cs-data"><h3>Contact accounting</h3><div class="cs-table-wrap"><table><thead><tr><th>Contact</th><th>Area, µm²</th><th>Peak current, µA</th><th>Max phase charge, nC</th><th>Charge density, mC/cm²</th><th>Net delivered charge, nC</th><th>Peak |V|</th></tr></thead><tbody>{result.interfaces.map((q, i) => <tr><td>{result.config.electrodes[i].id}</td><td>{fmt(q.area, 0)}</td><td>{fmt(q.maxCurrent, 2)}</td><td>{fmt(q.phaseCharge, 3)}</td><td>{fmt(q.chargeDensity, 3)}</td><td>{fmt(q.net, 4)}</td><td>{fmt(q.maxVoltage, 2)} V</td></tr>)}</tbody></table></div></section>
          {baseline && <p class="cs-comparison">Saved comparison: {baseline.summary.activated}/{baseline.summary.solved} sampled neurons spiked; current run: {result.summary.activated}/{result.summary.solved}. {['seed', 'width', 'depth', 'top', 'density', 'somaDiameter', 'somaCV', 'inhibitoryFraction', 'orientation', 'axonDiameter', 'axonLength', 'sampleCount'].some(key => baseline.config[key] !== result.config[key]) ? 'Anatomy settings differ; these are not paired cell-by-cell results.' : 'Compare identical seeds and sampling settings to isolate a stimulus change.'}</p>}
          <div class="cs-export"><div><h3>Keep the experiment</h3><p>Configuration, units and model version travel with the export.</p></div><button onClick={() => download(JSON.stringify({ version: MODEL_VERSION, units: { geometry: 'µm', density: 'neurons/mm³', phaseWidthAndGap: 'µs', integrationAndTraceTime: 'ms', frequency: 'Hz', current: 'µA', membranePotential: 'mV', terminalVoltage: 'V', charge: 'nC', chargeDensity: 'mC/cm²', conductivity: 'S/m', electricField: 'V/m', currentDensity: 'A/m²', specificCapacitance: 'µF/cm²', specificChargeTransferResistance: 'Ω·cm²', axialResistivity: 'Ω·cm' }, config: result.config, summary: result.summary, anatomy: result.population, interfaces: result.interfaces, limitations: 'Reduced idealized active neurons; homogeneous full-space conductor; no synapses, myelin or reconstructed human cells. See /simulations/cortical-stimulation/guide/.' }, null, 2), 'cortical-stimulation-experiment.json', 'application/json')}>Export run JSON</button><button onClick={exportResults}>Export neuron CSV</button><button onClick={() => file.current?.click()}>Load configuration</button></div>
          <p class="cs-run-details">{MODEL_VERSION} · {fmt(result.summary.compartmentCount, 0)} compartments · Δt {fmt(result.config.dt * 1000, 1)} µs · {fmt(result.config.segmentLength, 0)} µm maximum segment · {result.summary.rejected} sampled cells excluded for contact intersections · achieved density {fmt(result.population.density, 0)} neurons/mm³ · accepted mean soma profile diameter {fmt(result.population.meanDiameter, 1)} µm · FS-like share {percent(result.population.inhibitoryFraction)} · nearest-neighbor median {fmt(result.population.nearestMedian, 1)} µm in a 256-cell placement audit.</p>
        </>}
      </div>
    </div>
    <input hidden type="file" ref={file} accept=".json,application/json" onChange={importConfig}/>
  </div>;
}
