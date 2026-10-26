import SimHero from './SimHero.jsx';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CONFIG, PRESETS, MODEL_VERSION, normalizeConfig, generateContacts, createStimulusRaster, buildWaveform, exportExperiment, parseExperiment } from '../lib/retinal-implant/model.mjs';
import { createRetinalClient } from '../lib/retinal-implant/client.mjs';
import { drawRaster, drawRetinalPlan, drawRetinalSection, drawWaveform, fmt, peak } from '../lib/retinal-implant/plots.js';
import '../styles/retinal-implant.css';

const MODELS = { axon: 'Axon map', scoreboard: 'Circular baseline', biphasic: 'Pulse-dependent axon map' };
const PATTERNS = [['single', 'Single contact'], ['pair', 'Two contacts'], ['letter-e', 'Letter E'], ['landolt-c', 'Landolt C'], ['bars', 'Two bars'], ['checkerboard', 'Checkerboard'], ['blank', 'Blank control']];
const FIELD_MODES = { potential: ['Extracellular potential', 'mV'], field: ['Electric-field magnitude', 'V/m'], density: ['Bulk current-density magnitude', 'A/m²'] };
const initial = () => ({ ...DEFAULT_CONFIG, disabledIds: [...DEFAULT_CONFIG.disabledIds] });

function saveFile(content, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function RangeField({ name, label, value, onChange, onValidity, min, max, step = 1, unit = '', note, integer = false }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); onValidity?.(name, true); }, [value]);
  const accept = raw => {
    setDraft(raw); const n = Number(raw), valid = raw.trim() !== '' && Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
    onValidity?.(name, valid); if (valid) onChange(name, n);
  };
  const commit = () => {
    let n = draft.trim() === '' || !Number.isFinite(Number(draft)) ? value : Number(draft);
    n = Math.max(min, Math.min(max, integer ? Math.round(n) : n)); setDraft(String(n)); onValidity?.(name, true); if (n !== value) onChange(name, n);
  };
  return <label class="ri-control"><span class="ri-control-heading"><span>{label}</span><span class="ri-control-value"><input data-ri-number={name} aria-label={`${label} (${unit})`} type="number" value={draft} min={min} max={max} step={step} onInput={e => accept(e.currentTarget.value)} onChange={e => accept(e.currentTarget.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/><span>{unit}</span></span></span><input data-ri-setting={name} aria-label={`${label} slider`} type="range" value={value} min={min} max={max} step={step} onInput={e => onChange(name, Number(e.currentTarget.value))}/>{note && <small>{note}</small>}</label>;
}
function SelectField({ name, label, value, options, onChange, note }) {
  return <label class="ri-select-field"><span>{label}</span><select data-ri-setting={name} aria-label={label} value={value} onChange={e => onChange(name, e.currentTarget.value)}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>{note && <small>{note}</small>}</label>;
}
function Canvas({ draw, label, className = '', onPointerDown, marker }) {
  const ref = useRef(null), latest = useRef(draw); latest.current = draw;
  useEffect(() => {
    const paint = () => { if (ref.current) latest.current(ref.current); };
    const resize = new ResizeObserver(paint); resize.observe(ref.current); const theme = new MutationObserver(paint); theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); document.fonts.ready.then(paint); paint();
    return () => { resize.disconnect(); theme.disconnect(); };
  }, []);
  useEffect(() => { if (ref.current) draw(ref.current); }, [draw]);
  return <canvas data-ri-canvas={marker} ref={ref} class={className} role="img" aria-label={label} onPointerDown={onPointerDown}>{label}</canvas>;
}
function RetinaScene({ contacts, config, selectedId, axonData, showFibers, visible, reset, onSelect, onUnavailable }) {
  const host = useRef(null), api = useRef(null), latest = useRef(null), selected = useRef(onSelect); selected.current = onSelect; latest.current = { contacts, config, selectedId, axonData, showFibers };
  useEffect(() => {
    let stopped = false;
    import('../lib/retinal-implant/scene.js').then(({ createRetinalScene }) => { if (!stopped) { api.current = createRetinalScene(host.current, { onSelect: id => selected.current(id), onUnavailable }); api.current.update(latest.current); api.current.setVisible(visible); } }).catch(() => onUnavailable('The 3D renderer could not load. The retinal plan remains available.'));
    return () => { stopped = true; api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => api.current?.update(latest.current), [contacts, config, selectedId, axonData, showFibers]);
  useEffect(() => api.current?.setVisible(visible), [visible]); useEffect(() => api.current?.reset(), [reset]);
  return <div ref={host} class="ri-three-host" style={{ visibility: visible ? 'visible' : 'hidden' }}/>;
}
function Metric({ label, value, unit, note, marker }) {
  return <div class="ri-metric" data-ri-metric={marker}><span>{label}</span><strong>{Number.isFinite(value) ? value : value === '—' ? '—' : value ?? '—'}<small>{unit}</small></strong>{note && <p>{note}</p>}</div>;
}
function PerceptPanel({ title, subtitle, data, maximum, caption, marker }) {
  return <section class="ri-percept-panel"><header><h3>{title}</h3><span>{subtitle}</span></header><Canvas marker={marker} className="ri-percept-canvas" label={`${title}, on visual-field axes in degrees; linear grayscale in arbitrary model units.`} draw={canvas => drawRaster(canvas, data, { maximum, title: 'Run an experiment' })}/><p class="ri-caption">{caption}</p></section>;
}

export default function RetinalImplantLaboratory() {
  const [config, setConfig] = useState(initial), [result, setResult] = useState(null), [pinned, setPinned] = useState(null);
  const [presetId, setPresetId] = useState('letter'), [tab, setTab] = useState('device'), [view, setView] = useState('3d');
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('Preparing the reference models…'), [progress, setProgress] = useState(0), [error, setError] = useState(''), [invalidDrafts, setInvalidDrafts] = useState([]);
  const [inspectorId, setInspectorId] = useState(DEFAULT_CONFIG.selectedId), [fieldMode, setFieldMode] = useState('potential'), [showFibers, setShowFibers] = useState(true), [axonData, setAxonData] = useState(null), [axonError, setAxonError] = useState(''), [graphicsError, setGraphicsError] = useState(''), [reset, setReset] = useState(0);
  const [fullTrain, setFullTrain] = useState(false), [compareOpen, setCompareOpen] = useState(false), [exportError, setExportError] = useState('');
  const client = useRef(null), runId = useRef(0), fileInput = useRef(null), locations = useRef([]);
  const contacts = useMemo(() => { try { return generateContacts(config); } catch { return []; } }, [config]);
  const scene = useMemo(() => { try { return createStimulusRaster(config); } catch { return null; } }, [config]);
  const chosen = (result?.contacts ?? contacts).find(p => p.id === inspectorId) ?? contacts[0];
  const trial = PRESETS.find(p => p.id === presetId);
  let invalid = ''; try { normalizeConfig(config); } catch (e) { invalid = e.message; }
  const inspectedWaveform = useMemo(() => { if (!result || !chosen) return null; try { return buildWaveform(result.config, chosen.id); } catch { return null; } }, [result, chosen?.id]);
  const probe = result?.contactMetrics?.[chosen?.id], m = result?.metrics;
  const currentUnits = result?.percept?.model?.startsWith('biphasic') ? 'empirical model units' : 'spatial drive units';
  const pinnedUnits = pinned?.result?.percept?.model?.startsWith('biphasic') ? 'empirical model units' : 'spatial drive units';
  // Spatial drive and empirical pulse-response amplitudes use different model units.
  const compatiblePin = Boolean(result?.percept && pinned?.result?.percept && currentUnits === pinnedUnits);
  const currentMaximum = Math.max(peak(result?.percept?.brightness), peak(result?.circularPercept?.brightness));
  const pinnedMaximum = peak(pinned?.result?.percept?.brightness);
  const displayMaximum = compatiblePin ? Math.max(currentMaximum, pinnedMaximum) : currentMaximum;
  const pinnedDisplayMaximum = compatiblePin ? displayMaximum : pinnedMaximum;
  const currentScaleLabel = `0–${fmt(displayMaximum, 2)} ${currentUnits}${displayMaximum === 0 ? ' (zero response)' : ''}`;
  const pinnedScaleLabel = `0–${fmt(pinnedDisplayMaximum, 2)} ${pinnedUnits}${pinnedDisplayMaximum === 0 ? ' (zero response)' : ''}`;
  const currentScaleCaption = `${result?.circularPercept ? 'Current and circular percepts share' : 'The current percept uses'} a linear display scale of ${currentScaleLabel}.`;
  const comparisonScaleCaption = result
    ? compatiblePin
      ? `Current${result.circularPercept ? ', circular' : ''} and pinned percepts share a linear display scale of ${currentScaleLabel}.`
      : `${currentScaleCaption}${pinned ? ` The pinned trial uses its own linear display scale of ${pinnedScaleLabel}. Brightness is not comparable across these model families.` : ''}`
    : pinned ? `The pinned trial uses its own linear display scale of ${pinnedScaleLabel}. Run the current experiment to compare results.` : 'Run an experiment to compare percepts.';
  const field = useMemo(() => {
    if (!result?.field) return null; const f = result.field;
    return { ...f, values: fieldMode === 'potential' ? f.potentialMv : fieldMode === 'density' ? f.currentDensityAm2 : Float64Array.from(f.exVm, (x, i) => Math.hypot(x, f.eyVm[i], f.ezVm[i])) };
  }, [result, fieldMode]);
  const fieldMaximum = peak(field?.values);

  function clearCalculation(text = 'Settings changed. Run to calculate new results.') {
    ++runId.current; client.current?.cancel(); setBusy(false); setResult(null); setError(''); setExportError(''); setStatus(text); setProgress(0);
  }
  function validity(name, valid) {
    setInvalidDrafts(previous => valid ? previous.filter(key => key !== name) : previous.includes(name) ? previous : [...previous, name]);
    if (!valid) clearCalculation('Complete the numeric value before running the experiment.');
  }
  function change(name, value) {
    let next = { ...config, [name]: value };
    if (name === 'device') next = value === 'argus-ii' ? { ...next, rows: 6, cols: 10, pitchUm: 575, diameterUm: 225 } : { ...next, rows: 8, cols: 8, pitchUm: 400, diameterUm: 200 };
    if (['gridStepDeg', 'fieldGridSize'].includes(name)) next[name] = Number(value);
    if (name === 'fieldView' && value === 'selected') next.selectedId = inspectorId;
    if (Number(next.selectedId.slice(1)) > next.rows * next.cols) { next.selectedId = 'E01'; setInspectorId('E01'); }
    next.disabledIds = next.disabledIds.filter(id => Number(id.slice(1)) <= next.rows * next.cols);
    clearCalculation(); setPresetId('custom'); setConfig(next);
  }
  function selectContact(id) {
    setInspectorId(id);
    if (config.pattern === 'single' || config.pattern === 'pair' || config.fieldView === 'selected') { clearCalculation(); setPresetId('custom'); setConfig({ ...config, selectedId: id }); }
  }
  function setAvailable(available) { if (chosen) change('disabledIds', available ? config.disabledIds.filter(id => id !== chosen.id) : [...config.disabledIds.filter(id => id !== chosen.id), chosen.id]); }
  async function run(input = config) {
    const id = ++runId.current; client.current?.cancel(); setError(''); setExportError(''); setResult(null); setProgress(0); setStatus('Loading the pinned reference geometry…');
    try {
      const normalized = normalizeConfig(input); setConfig(normalized); setBusy(true);
      if (!client.current) client.current = createRetinalClient();
      const answer = await client.current.run(normalized, update => { if (id === runId.current) { setProgress(update.progress ?? 0); setStatus(update.message ?? 'Calculating…'); } });
      if (id !== runId.current) return;
      setResult(answer); setBusy(false); setProgress(1); setStatus(`Calculation complete · ${fmt(answer.metrics.elapsedMs / 1000, 2)} s. Results correspond to these settings.`);
    } catch (e) { if (id === runId.current) { setBusy(false); if (e.name !== 'AbortError') { setError(e.message); setStatus('The experiment could not be calculated.'); } } }
  }
  function loadPreset(preset) { clearCalculation(); setInvalidDrafts([]); const next = { ...initial(), ...preset.config, disabledIds: [...(preset.config.disabledIds ?? [])] }; setConfig(next); setInspectorId(next.selectedId); setPresetId(preset.id); run(next); }
  function cancel() { clearCalculation('Calculation cancelled. Run to start again.'); }
  function unavailable(message) { setGraphicsError(message); setView('plan'); }
  function pickPlan(e) { const box = e.currentTarget.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top; const nearby = locations.current.map(p => ({ ...p, d: Math.hypot(p.x - x, p.y - y) })).filter(p => p.d < Math.max(12, p.r + 5)).sort((a, b) => a.d - b.d); if (nearby[0]) selectContact(nearby[0].id); }
  useEffect(() => {
    const abort = new AbortController(); run(initial());
    fetch('/assets/retinal-implant/axon-display.json', { signal: abort.signal }).then(r => { if (!r.ok) throw new Error('Reference anatomy could not load.'); return r.json(); }).then(setAxonData).catch(e => { if (e.name !== 'AbortError') setAxonError(e.message); });
    return () => { ++runId.current; client.current?.dispose(); abort.abort(); };
  }, []);

  function exportData(kind) {
    if (!result) return;
    try {
      if (kind === 'json') { saveFile(JSON.stringify(exportExperiment(config, result), null, 2), `${result.experimentId}.json`, 'application/json'); return; }
      const lines = [`# Retinal Implant Laboratory ${MODEL_VERSION}`, `# experiment_id: ${result.experimentId}`, `# settings: ${JSON.stringify(result.config)}`, `# provenance: ${JSON.stringify(result.provenance)}`];
      if (kind === 'waveform') {
        lines.push(`# inspected_contact: ${chosen.id}`, '# exact piecewise-constant events; cathodic current is negative', 'start_ms,end_ms,current_uA'); for (const event of inspectedWaveform.events) lines.push([event.startMs, event.endMs, event.currentUa].join(','));
      } else if (kind === 'field') {
        const f = result.field; lines.push(`# field_metadata: ${JSON.stringify(f.metadata)}`, 'retinal_x_um,retinal_y_um,potential_mV,Ex_V_per_m,Ey_V_per_m,Ez_V_per_m,current_density_A_per_m2');
        for (let row = 0; row < f.height; row++) for (let col = 0; col < f.width; col++) { const i = row * f.width + col; lines.push([f.xUm[col], f.yUm[row], f.potentialMv[i], f.exVm[i], f.eyVm[i], f.ezVm[i], f.currentDensityAm2[i]].join(',')); }
      } else {
        const p = result.percept; lines.push(`# percept_metadata: ${JSON.stringify(p.metadata)}`, 'visual_x_deg,visual_y_deg,brightness_model_units'); for (let row = 0; row < p.height; row++) for (let col = 0; col < p.width; col++) lines.push([p.xDeg[col], p.yDeg[row], p.brightness[row * p.width + col]].join(','));
      }
      saveFile(lines.join('\n'), `${result.experimentId}-${kind}.csv`, 'text/csv;charset=utf-8');
    } catch (e) { setExportError(e.message); }
  }
  async function restore(e) {
    const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!file) return;
    try { if (file.size > 20000000) throw new Error('Choose a retinal experiment file smaller than 20 MB.'); const next = parseExperiment(await file.text()); clearCalculation(); setConfig(next); setInvalidDrafts([]); setInspectorId(next.selectedId); setPresetId('custom'); await run(next); }
    catch (e) { setExportError(e.message); }
  }
  const range = props => <RangeField {...props} value={config[props.name]} onChange={change} onValidity={validity}/>;
  const select = props => <SelectField {...props} value={config[props.name]} onChange={change}/>;

  return <article class="ri-lab" data-retinal-lab data-ri-state={busy ? 'busy' : result ? 'complete' : 'dirty'}>
    <SimHero kicker="Neural interface laboratories / Visual prostheses" title="Retinal Implant Laboratory" intro="Place an array. Shape the pulse. Inspect the predicted visual field." links={[{ href: '/simulations/retinal-implant/methods/', label: 'Model, evidence & verification' }, { href: '/devices/165-argus-ii-retinal-prosthesis/', label: 'Argus II reference sheet' }, { href: '/simulations/retinal-implant/prima/', label: 'PRIMA photovoltaic laboratory' }]} />
    <div class="ri-model-strip"><span class="ri-tech">Epiretinal laboratory</span><p>Published percept models and a separate finite-contact electrical model. Retinal responses are represented through the selected percept model.</p></div>
    <section class="ri-experiments" aria-label="Example experiments"><div class="ri-section-heading"><span class="ri-tech">Start with an experiment</span><a href="/simulations/retinal-implant/methods/#delivery">Experiment notes →</a></div><div class="ri-preset-list">{PRESETS.map((p, i) => <button data-ri-preset={p.id} aria-pressed={presetId === p.id} onClick={() => loadPreset(p)}><span>{String(i + 1).padStart(2, '0')}</span>{p.title}</button>)}</div></section>
    <div class="ri-experiment-title"><div><span class="ri-tech">Current experiment</span><h2>{trial?.title ?? 'Custom experiment'}</h2></div><p>{trial?.description ?? 'Inspect physical stimulation and modeled appearance with the same electrode geometry and pulse schedule.'}</p></div>
    <div class="ri-workbench">
      <aside class="ri-settings" aria-label="Experiment settings"><header><h2>Device &amp; drive</h2><span class={`ri-state ${busy ? 'is-busy' : result ? 'is-ready' : ''}`}>{busy ? 'Calculating' : result ? 'Calculated' : 'Modified'}</span></header><div class="ri-control-tabs" aria-label="Settings section">{['device', 'stimulus', 'models'].map(key => <button data-ri-tab={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div>
        <div class="ri-control-body">{tab === 'device' && <>
          {select({ name: 'device', label: 'Electrode array', options: [['argus-ii', 'Argus II · p2p reference'], ['grid', 'Custom rectangular grid'], ['hex', 'Custom staggered grid']] })}
          {config.device === 'argus-ii' ? <p class="ri-help">60 circular contacts · 225 µm diameter in the pinned reference geometry. Choose a custom array to edit its dimensions.</p> : <><div class="ri-paired-controls">{range({ name: 'rows', label: 'Rows', unit: '', min: 2, max: 16, integer: true })}{range({ name: 'cols', label: 'Columns', unit: '', min: 2, max: 16, integer: true })}</div>{range({ name: 'pitchUm', label: 'Contact pitch', unit: 'µm', min: 250, max: 1000, step: 25 })}{range({ name: 'diameterUm', label: 'Contact diameter', unit: 'µm', min: 100, max: 500, step: 5 })}</>}
          <div class="ri-control-divider ri-tech">Retinal placement</div>{select({ name: 'eye', label: 'Eye', options: [['RE', 'Right eye'], ['LE', 'Left eye']] })}
          {range({ name: 'xUm', label: 'Retinal x', unit: 'µm', min: -3000, max: 3000, step: 50 })}{range({ name: 'yUm', label: 'Retinal y', unit: 'µm', min: -3000, max: 3000, step: 50 })}{range({ name: 'rotationDeg', label: 'Array rotation', unit: '°', min: -180, max: 180 })}{range({ name: 'gapUm', label: 'Electrode–retina gap', unit: 'µm', min: 25, max: 1000, step: 25, note: 'Affects the electrical field. Percept spread parameters remain independent.' })}
        </>}
        {tab === 'stimulus' && <>
          {select({ name: 'pattern', label: 'Input pattern', options: PATTERNS })}
          {['single', 'pair'].includes(config.pattern) ? <p class="ri-help">Choose the anchor in the contact inspector. Direct probes bypass scene encoding.</p> : <>{select({ name: 'encoder', label: 'Scene encoder', options: [['intensity', 'Intensity sampling'], ['edges', 'Edge emphasis']] })}{range({ name: 'sceneSizeDeg', label: 'Scene extent', unit: '°', min: 6, max: 30 })}</>}
          {config.pattern === 'pair' && range({ name: 'pairSpacing', label: 'Requested pair separation', unit: 'pitch', min: 1, max: 5, integer: true, note: 'Uses the nearest contact to this offset; the array boundary can limit actual separation.' })}
          {range({ name: 'amplitudeUa', label: 'Peak current cap', unit: 'µA', min: 0, max: 300, step: 5 })}{range({ name: 'phaseDurationMs', label: 'Phase duration', unit: 'ms', min: .05, max: 1, step: .01 })}{range({ name: 'interphaseMs', label: 'Interphase gap', unit: 'ms', min: 0, max: .5, step: .01 })}{range({ name: 'frequencyHz', label: 'Repetition frequency', unit: 'Hz', min: 1, max: 100 })}
          {select({ name: 'sequence', label: 'Channel delivery', options: [['simultaneous', 'Simultaneous'], ['interleaved', 'Interleaved']] })}
          <details class="ri-advanced"><summary>Train window &amp; current budget</summary>{range({ name: 'trainDurationMs', label: 'Train duration', unit: 'ms', min: 20, max: 1000, step: 10 })}{select({ name: 'budgetMode', label: 'Drive constraint', options: [['peak', 'Per-contact peak cap'], ['total-current', 'Summed-current cap']] })}{config.budgetMode === 'total-current' && range({ name: 'totalCurrentUa', label: 'Summed-current cap', unit: 'µA', min: 10, max: 10000, step: 10, note: 'Only scales amplitudes down. Interleaved instantaneous current is a separate quantity.' })}</details>
        </>}
        {tab === 'models' && <>
          {select({ name: 'perceptModel', label: 'Percept model', options: Object.entries(MODELS) })}{range({ name: 'rhoUm', label: 'Spatial spread · ρ', unit: 'µm', min: 100, max: 800, step: 25 })}{range({ name: 'lambdaUm', label: 'Axonal spread · λ', unit: 'µm', min: 100, max: 2000, step: 25 })}<p class="ri-help">Effective percept parameters. These are independent of conductivity, contact size and gap.</p>
          {config.perceptModel === 'biphasic' && <>{range({ name: 'thresholdUa', label: 'Assumed threshold', unit: 'µA', min: 10, max: 500, step: 5, note: '50%-detection current at 0.45 ms and the chosen frequency. Requires independent calibration.' })}<p class="ri-inline-warning">A representative train image; no within-train dynamics or interphase-gap effect.</p></>}
          {select({ name: 'gridStepDeg', label: 'Visual sampling', options: [['0.5', 'Standard · 0.5° · 61 × 61'], ['0.25', 'Detailed · 0.25° · 121 × 121']] })}
          <label class="ri-check"><input type="checkbox" checked={config.compareCircular} onChange={e => change('compareCircular', e.currentTarget.checked)}/>Calculate circular comparison</label>
          <div class="ri-control-divider ri-tech">Volume conductor</div>{range({ name: 'conductivitySm', label: 'Conductivity', unit: 'S/m', min: .05, max: 1, step: .01 })}{select({ name: 'returnMode', label: 'Finite return geometry', options: [['remote', 'Distant finite return'], ['ring', 'Eight-contact return ring']] })}<p class="ri-help">Uniform-current disks in homogeneous full space. No insulating backing, retinal layers or membrane solver.</p>
        </>}
        </div><div class="ri-run-area"><button class="ri-primary" data-ri="run" disabled={busy || !!invalid || invalidDrafts.length > 0} onClick={() => run()}><span>{busy ? 'Calculating…' : 'Run experiment'}</span><span>↗</span></button>{busy && <button class="ri-cancel" onClick={cancel}>Cancel calculation</button>}{busy && <progress max="1" value={progress} aria-label="Calculation progress"/>}<p class="ri-run-status" data-ri="status" role="status" aria-live="polite">{status}</p>{(invalid || error) && <p class="ri-error" role="alert">{invalid || error}</p>}</div>
      </aside>

      <main class="ri-experiment-main"><div class="ri-visual-workspace">
        <section class="ri-retina-panel"><header><div><span class="ri-tech">Retinal anatomy</span><h2>Array &amp; nerve fibers</h2></div><span class="ri-tech">{config.eye === 'RE' ? 'Right eye' : 'Left eye'}</span></header><div class="ri-view-tabs" aria-label="Retinal view">{[['3d', '3D surface'], ['plan', 'Retinal plan'], ['section', 'Section']].map(([id, label]) => <button data-ri-view={id} aria-pressed={view === id} disabled={id === '3d' && !!graphicsError} onClick={() => setView(id)}>{label}</button>)}{view === '3d' && <button class="ri-reset" onClick={() => setReset(v => v + 1)}>Reset view</button>}</div>
          <div class="ri-anatomy-viewport"><RetinaScene contacts={contacts} config={config} selectedId={inspectorId} axonData={axonData} showFibers={showFibers} visible={view === '3d'} reset={reset} onSelect={selectContact} onUnavailable={unavailable}/>{view === 'plan' && <Canvas marker="plan" className="ri-plan-canvas" label="Retinal plan, with physical x and y coordinates in millimeters, reference trajectories and selectable contacts." onPointerDown={pickPlan} draw={canvas => { locations.current = drawRetinalPlan(canvas, contacts, config, inspectorId, axonData, showFibers); }}/>} {view === 'section' && <Canvas marker="section" className="ri-plan-canvas" label="Physical x-z section with the calculated electrode gap above the retinal tangent plane." draw={canvas => drawRetinalSection(canvas, contacts, config, inspectorId)}/>}</div>
          <div class="ri-anatomy-footer"><label class="ri-check"><input type="checkbox" checked={showFibers} onChange={e => setShowFibers(e.currentTarget.checked)}/>Reference axon trajectories</label><span>{contacts.length} contacts · {config.device === 'argus-ii' ? 'p2p reference geometry' : 'custom test geometry'}</span></div><div class="ri-legend"><span><i class="ri-dot is-driven"/>Driven contact</span><span><i class="ri-dot"/>Idle / disabled</span><span><i class="ri-dot is-selected"/>Selected</span></div><p class="ri-anatomy-note">{view === '3d' ? 'Drag to orbit · scroll to zoom. Curved display anatomy; electrical calculations use a tangent plane.' : view === 'section' ? 'Contacts projected onto x–z. The field observation plane is z = 0.' : 'Physical retinal coordinates. Visual-field mapping is handled separately.'}</p>{(graphicsError || axonError) && <p class="ri-graphics-note">{graphicsError || axonError}</p>}
        </section>
        <div class="ri-images"><PerceptPanel marker="input" title="Visual input" subtitle={['single', 'pair'].includes(config.pattern) ? 'Direct drive' : config.encoder === 'edges' ? 'Edge encoder' : 'Intensity encoder'} data={scene} maximum={1} caption={['single', 'pair'].includes(config.pattern) ? 'Direct contact experiments bypass scene encoding.' : 'The encoder samples the scene at mapped contact locations.'}/><PerceptPanel marker="percept" title="Predicted percept" subtitle={MODELS[config.perceptModel]} data={result?.percept} maximum={displayMaximum} caption={result ? `Linear display ${currentScaleLabel}. ${config.perceptModel === 'biphasic' ? 'Representative pulse-train image.' : 'Spatial response to electrode drive.'}` : 'Results clear when their inputs change.'}/></div>
      </div>

      <section class="ri-inspector" aria-label="Selected contact inspector"><div><span class="ri-tech">Inspect a contact</span><SelectField name="inspector" label="Selected contact" value={chosen?.id ?? ''} options={contacts.map(p => [p.id, `${p.id} · ${!p.enabled ? 'unavailable' : p.amplitudeUa > 0 ? 'driven' : 'idle'}`])} onChange={(_, value) => selectContact(value)}/></div><p data-ri="contact-position">{chosen ? <>x {fmt(chosen.xUm, 0)} · y {fmt(chosen.yUm, 0)} · z {fmt(chosen.zUm, 0)} µm<br/>{fmt(chosen.radiusUm * 2, 0)} µm diameter · {fmt(chosen.amplitudeUa, 1)} µA drive</> : 'Choose a valid array geometry.'}</p><label class="ri-check"><input type="checkbox" checked={chosen?.enabled ?? false} disabled={!chosen} onChange={e => setAvailable(e.currentTarget.checked)}/>Contact available</label></section>
      <section class="ri-metrics" aria-label="Computed experiment measurements"><Metric marker="driven" label="Driven contacts" value={m ? fmt(m.drivenContacts, 0) : '—'} unit={`/ ${contacts.length}`} note="Complete, nonzero channel pulses"/><Metric marker="area" label="Percept support area" value={m ? fmt(m.perceptAreaDeg2, 1) : '—'} unit="deg²" note="Pixel area ≥ 50% of peak"/><Metric marker="elongation" label="Percept elongation" value={m ? fmt(m.perceptElongation, 2) : '—'} unit="×" note="Support major / minor moment axis"/><Metric marker="potential" label="Sampled peak |potential|" value={m ? fmt(m.maxAbsPotentialMv, 1) : '—'} unit="mV" note="Maximum over the displayed grid"/></section>
      {result?.warnings?.length > 0 && <div class="ri-warnings" role="note">{result.warnings.map(message => <p>{message}</p>)}</div>}

      <div class="ri-calculation-grid"><section class="ri-waveform-panel"><header class="ri-panel-heading"><div><span class="ri-tech">Delivered stimulation</span><h2>{chosen?.id ?? 'Contact'} · biphasic waveform</h2></div><button aria-pressed={fullTrain} onClick={() => setFullTrain(v => !v)}>{fullTrain ? 'Show pulse detail' : 'Show full train'}</button></header><Canvas marker="waveform" className="ri-waveform-canvas" label={`Calculated current waveform for ${chosen?.id}, in microamps versus milliseconds. Cathodic first phase is negative.`} draw={canvas => drawWaveform(canvas, inspectedWaveform, fullTrain)}/><div class="ri-mini-metrics"><Metric label="Charge / phase" value={inspectedWaveform ? fmt(inspectedWaveform.phaseChargeNc, 2) : '—'} unit="nC"/><Metric label="Geometric density" value={inspectedWaveform ? fmt(inspectedWaveform.chargeDensityUcCm2, 2) : '—'} unit="µC/cm²"/><Metric label="Net train charge" value={inspectedWaveform ? fmt(inspectedWaveform.netChargeNc, 3) : '—'} unit="nC"/></div><p class="ri-caption">Complete cathodic-first pulse pairs. Charge accounting describes the specified waveform.</p><details class="ri-result-details"><summary>Train accounting and current budget</summary><dl><div><dt>Complete pulses · inspected contact</dt><dd>{inspectedWaveform?.pulseCount ?? '—'}</dd></div><div><dt>Absolute charge · inspected contact</dt><dd>{fmt(inspectedWaveform?.totalAbsoluteChargeNc, 2)} nC</dd></div><div><dt>Absolute charge · all stimulating contacts</dt><dd>{fmt(m?.totalAbsoluteChargeNc, 2)} nC</dd></div><div><dt>Configured channel sum</dt><dd>{fmt(m?.summedAmplitudeUa, 2)} µA</dd></div><div><dt>Instantaneous stimulating current</dt><dd>{fmt(m?.snapshotTotalCurrentUa, 2)} µA</dd></div><div><dt>Net current · sources and finite returns</dt><dd>{fmt(m?.netSourceCurrentUa, 6)} µA</dd></div></dl><p>Absolute charge includes both phases of the stimulating contacts and excludes return-electrode charge. These quantities do not determine electrochemical safety.</p></details></section>

      <section class="ri-field-panel"><header class="ri-panel-heading"><div><span class="ri-tech">Independent electrical calculation</span><h2>Retinal tangent plane</h2></div></header><label class="ri-field-select">Electrical quantity<select aria-label="Electrical quantity" value={fieldMode} onChange={e => setFieldMode(e.currentTarget.value)}>{Object.entries(FIELD_MODES).map(([key, value]) => <option value={key}>{value[0]}</option>)}</select></label><Canvas marker="field" className="ri-field-canvas" label={`${FIELD_MODES[fieldMode][0]}, including finite return sources, in ${FIELD_MODES[fieldMode][1]}.`} draw={canvas => drawRaster(canvas, field, { maximum: fieldMaximum, signed: fieldMode === 'potential', physical: true, contacts: result?.contacts ?? [], selectedId: inspectorId })}/><div class={`ri-colorbar ${fieldMode === 'potential' ? 'is-signed' : ''}`}><span>{result ? fieldMode === 'potential' ? `−${fmt(fieldMaximum, 1)}` : '0' : '—'}</span><i/><span>{result ? fmt(fieldMaximum, 1) : '—'} {FIELD_MODES[fieldMode][1]}</span></div><p class="ri-caption">{result?.field?.metadata?.snapshotLabel ?? 'Cathodic snapshot'} · {config.returnMode === 'ring' ? 'finite return ring' : 'distant finite return'} · homogeneous full space.</p><div class="ri-contact-probe"><span>{chosen?.id} center φ <strong>{fmt(probe?.potentialMv ?? probe?.totalPotentialMv, 2)} mV</strong></span><span>|E| <strong>{fmt(probe?.fieldVm, 2)} V/m</strong></span></div><details class="ri-result-details"><summary>Electrical sampling and local detail</summary>{select({ name: 'fieldView', label: 'Electrical region', options: [['array', 'Whole array'], ['selected', 'Selected-contact region']] })}{select({ name: 'fieldGridSize', label: 'Electrical grid', options: [['61', '61 × 61'], ['121', '121 × 121'], ['241', '241 × 241']] })}{config.fieldView === 'selected' && range({ name: 'fieldSpanUm', label: 'Local region width', unit: 'µm', min: 500, max: 10000, step: 100 })}<p>Grid step: {fmt(result?.field?.gridStepUm, 1)} µm. Grid maxima can miss a peak between samples. The center probe is evaluated separately.</p></details></section></div>

      <section class="ri-comparison"><header class="ri-panel-heading"><div><span class="ri-tech">Controlled comparison</span><h2>Inspect the model’s assumptions</h2></div><div class="ri-actions"><button aria-expanded={compareOpen} onClick={() => setCompareOpen(v => !v)}>{compareOpen ? 'Close comparison' : 'Compare percepts'}</button><button data-ri="pin" disabled={!result} onClick={() => { setPinned({ result, title: trial?.title ?? 'Custom experiment' }); setCompareOpen(true); }}>Pin this trial</button>{pinned && <button onClick={() => setPinned(null)}>Clear pinned trial</button>}</div></header><p class="ri-caption">Compare identical electrode drive under different spatial assumptions, or retain a completed trial while changing the next experiment.</p>{compareOpen && <><div class={`ri-comparison-images ${pinned ? 'has-pinned' : ''}`}><PerceptPanel title="Current model" subtitle={result ? MODELS[result.config.perceptModel] : ''} data={result?.percept} maximum={displayMaximum} caption={result ? `${fmt(result.metrics.perceptAreaDeg2, 1)} deg² support · ${fmt(result.metrics.perceptElongation, 2)}× elongation` : 'Run the current experiment.'}/>{result?.circularPercept && <PerceptPanel title="Circular comparison" subtitle="Same electrode drive" data={result.circularPercept} maximum={displayMaximum} caption={result.config.perceptModel === 'biphasic' ? 'Same pulse-dependent brightness and size factors, without the axonal path term.' : 'Same electrode drive, with circular spatial spread.'}/>} {pinned && <PerceptPanel title="Pinned trial" subtitle={MODELS[pinned.result.config.perceptModel]} data={pinned.result.percept} maximum={pinnedDisplayMaximum} caption={`${pinned.title} · ${fmt(pinned.result.config.amplitudeUa, 0)} µA cap · ρ ${pinned.result.config.rhoUm} µm · λ ${pinned.result.config.lambdaUm} µm. ${compatiblePin ? 'Shared' : 'Own'} linear display ${pinnedScaleLabel}.`}/>}</div><p class="ri-comparison-scale">{comparisonScaleCaption} {(result || pinned) && 'Model units are not calibrated luminance.'}</p></>}</section>
      </main>
    </div>

    <section class="ri-export"><header><span class="ri-tech">Reproducible experiment</span><h2>Keep the settings and calculated data</h2><p>Reload the experiment definition or inspect the numerical grids and exact waveform events. CSV files begin with # metadata lines.</p></header><div class="ri-actions"><button data-ri="export-json" disabled={!result} onClick={() => exportData('json')}>Experiment JSON</button><button data-ri="load" onClick={() => fileInput.current?.click()}>Load experiment</button><button data-ri="export-percept" disabled={!result} onClick={() => exportData('percept')}>Percept CSV</button><button data-ri="export-field" disabled={!result} onClick={() => exportData('field')}>Field CSV</button><button data-ri="export-waveform" disabled={!result} onClick={() => exportData('waveform')}>Waveform CSV</button><input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Load retinal experiment JSON" onChange={restore}/></div>{exportError && <p class="ri-error" role="alert">{exportError}</p>}{result && <p class="ri-export-meta">{result.experimentId} · {result.modelVersion} · Pinned reference and checksum included in JSON.</p>}</section>
    <section class="ri-evidence"><div><span class="ri-tech">Two models, one experiment</span><h2>Electrical fields and percepts remain distinct</h2><p>The electrical model calculates extracellular potential and field from finite sources. The percept model maps electrode stimulation to a predicted visual response under its published assumptions.</p></div><div><span class="ri-tech">Evidence and interpretation</span><h2>Inspect what each calculation represents</h2><p>Reference-derived nerve-fiber geometry and pinned coefficients are documented with the independent numerical benchmarks, unit conventions and model limits. <a href="/simulations/retinal-implant/methods/">Read the model and verification record →</a></p></div></section>
  </article>;
}
