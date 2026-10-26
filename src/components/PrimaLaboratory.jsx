import SimHero from './SimHero.jsx';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_CONFIG, PRESETS, normalizeConfig, validateConfig } from '../lib/prima/model.mjs';
import { createPrimaClient } from '../lib/prima/client.mjs';
import { exportExperiment, parseExperiment } from '../lib/prima/export.mjs';
import { drawPrimaImage, drawPrimaPlan, drawPrimaSection, drawPrimaField, drawPrimaWaveform, drawPrimaFrequency, formatNumber as fmt, absolutePeak } from '../lib/prima/plots.js';
import '../styles/prima.css';

const PATTERNS = [['landolt', 'Landolt C'], ['letter', 'Letter'], ['grating', 'Sinusoidal grating'], ['checkerboard', 'Checkerboard'], ['face', 'Schematic face'], ['spot', 'Local light spot'], ['blank', 'Blank control']];
const initialConfig = () => ({ ...DEFAULT_CONFIG });

function download(content, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function Range({ name, label, value, onChange, onValidity, min, max, step = 1, unit = '', note, integer = false }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); onValidity(name, true); }, [value]);
  const accept = raw => {
    setDraft(raw); const numeric = Number(raw), valid = raw.trim() !== '' && Number.isFinite(numeric) && numeric >= min && numeric <= max && (!integer || Number.isInteger(numeric));
    onValidity(name, valid); if (valid) onChange(name, numeric);
  };
  const commit = () => {
    let numeric = draft.trim() === '' || !Number.isFinite(Number(draft)) ? value : Number(draft);
    numeric = Math.min(max, Math.max(min, integer ? Math.round(numeric) : numeric)); setDraft(String(numeric)); onValidity(name, true); if (numeric !== value) onChange(name, numeric);
  };
  return <label class="pr-control">
    <span class="pr-control-top"><span>{label}</span><span class="pr-number-wrap"><input data-prima-number={name} type="number" aria-label={`${label}${unit ? ` (${unit})` : ''}`} value={draft} min={min} max={max} step={step} onInput={e => accept(e.currentTarget.value)} onChange={e => accept(e.currentTarget.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/><span>{unit}</span></span></span>
    <input data-prima-setting={name} aria-label={`${label} slider`} type="range" value={value} min={min} max={max} step={step} onInput={e => onChange(name, Number(e.currentTarget.value))}/>
    {note && <small>{note}</small>}
  </label>;
}

function Select({ name, label, value, options, onChange, note }) {
  return <label class="pr-select"><span>{label}</span><select data-prima-setting={name} aria-label={label} value={value} onChange={e => onChange(name, e.currentTarget.value)}>{options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select>{note && <small>{note}</small>}</label>;
}

function Canvas({ draw, label, marker, className = '', onPointerDown }) {
  const canvas = useRef(null), latest = useRef(draw); latest.current = draw;
  useEffect(() => {
    const paint = () => { if (canvas.current) latest.current(canvas.current); };
    const resize = new ResizeObserver(paint); resize.observe(canvas.current);
    const theme = new MutationObserver(paint); theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.fonts.ready.then(paint); paint();
    return () => { resize.disconnect(); theme.disconnect(); };
  }, []);
  useEffect(() => { if (canvas.current) draw(canvas.current); }, [draw]);
  return <canvas ref={canvas} data-prima-canvas={marker} class={className} role="img" aria-label={label} onPointerDown={onPointerDown}>{label}</canvas>;
}

function Scene({ data, visible, reset, onSelect, onUnavailable }) {
  const host = useRef(null), api = useRef(null), latest = useRef(data), selection = useRef(onSelect), unavailable = useRef(onUnavailable);
  latest.current = data; selection.current = onSelect; unavailable.current = onUnavailable;
  useEffect(() => {
    let disposed = false;
    import('../lib/prima/scene.js').then(({ createPrimaScene }) => {
      if (disposed) return;
      api.current = createPrimaScene(host.current, { onSelect: id => selection.current(id), onUnavailable: reason => unavailable.current(reason) });
      api.current.update(latest.current); api.current.setVisible(visible);
    }).catch(() => unavailable.current('The 3D view could not load. Plan and section views remain available.'));
    return () => { disposed = true; api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => api.current?.update(latest.current), [data]);
  useEffect(() => api.current?.setVisible(visible), [visible]);
  useEffect(() => api.current?.reset(), [reset]);
  return <div class="pr-three-host" ref={host} style={{ visibility: visible ? 'visible' : 'hidden' }}/>;
}

function Metric({ label, value, unit = '', note, marker }) {
  return <div class="pr-metric" data-prima-metric={marker}><span>{label}</span><strong>{value ?? '—'}{unit && <small>{unit}</small>}</strong>{note && <p>{note}</p>}</div>;
}

function ImagePanel({ title, tag, data, fieldDeg, caption, marker, pixels, selectedId, overlay }) {
  return <section class="pr-image-panel"><header><div><span class="pr-eyebrow">{tag}</span><h3>{title}</h3></div><span class="pr-corner-mark">+</span></header>
    <Canvas marker={marker} className="pr-image-canvas" label={`${title}. Fixed grayscale from zero to one, on retinal visual-angle axes.`} draw={canvas => drawPrimaImage(canvas, data, { fieldDeg, pixelOverlay: overlay, pixels, selectedId })}/>
    <p class="pr-caption">{caption}</p>
  </section>;
}

export default function PrimaLaboratory() {
  const [config, setConfig] = useState(initialConfig), [result, setResult] = useState(null), [geometry, setGeometry] = useState(null), [pinned, setPinned] = useState(null);
  const [tab, setTab] = useState('optics'), [presetId, setPresetId] = useState('native'), [view, setView] = useState('3d');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('Preparing the PRIMA experiment…'), [progress, setProgress] = useState(0), [invalidDrafts, setInvalidDrafts] = useState([]);
  const [showProjection, setShowProjection] = useState(true), [showTissue, setShowTissue] = useState(true), [expanded, setExpanded] = useState(true), [overlay, setOverlay] = useState(false), [reset, setReset] = useState(0), [graphicsError, setGraphicsError] = useState('');
  const [fieldMode, setFieldMode] = useState('bc'), [showVoltage, setShowVoltage] = useState(false), [comparisonOpen, setComparisonOpen] = useState(false), [imageName, setImageName] = useState(''), [fileError, setFileError] = useState('');
  const client = useRef(null), sequence = useRef(0), locations = useRef([]), experimentFile = useRef(null), imageFile = useRef(null);
  const validation = useMemo(() => validateConfig(config), [config]);
  const displayGeometry = useMemo(() => {
    const current = result?.geometry ?? geometry;
    if (!current) return null;
    return { ...current, pixels: current.pixels.map(pixel => ({ ...pixel, activeRadiusUm: config.activeRadiusUm, illumination: result ? pixel.illumination : 0 })) };
  }, [result, geometry, config.activeRadiusUm]);
  const pixels = displayGeometry?.pixels ?? [];
  const selectedPixel = pixels.find(p => p.id === config.selectedPixelId);
  const inspected = result?.physics?.pixelMetrics?.find(p => p.id === config.selectedPixelId);
  const metrics = result?.metrics, physics = result?.physics;
  const selectedPreset = PRESETS.find(p => p.id === presetId);
  const implantFieldDeg = result?.metrics?.implantFieldDeg ?? config.implantWidthUm / config.retinalScaleUmDeg;
  const sceneData = useMemo(() => ({ geometry: displayGeometry, config, selectedId: config.selectedPixelId, pixelMetrics: result?.physics?.pixelMetrics ?? [], input: result?.input, experimentId: result?.experimentId ?? 'pending', expanded, showTissue, showProjection }), [result, displayGeometry, config, expanded, showTissue, showProjection]);

  function clearCalculation(text = 'Settings changed. Run the experiment to calculate the new result.') {
    const id = ++sequence.current; client.current?.cancel(); setBusy(false); setResult(null); setError(''); setFileError(''); setProgress(0); setStatus(text); return id;
  }
  function validity(name, valid) {
    setInvalidDrafts(previous => valid ? previous.filter(key => key !== name) : previous.includes(name) ? previous : [...previous, name]);
    if (!valid) clearCalculation('Complete the numeric value before running the experiment.');
  }
  function change(name, value) {
    if (['imageSize', 'fieldGridSize'].includes(name)) value = Number(value);
    clearCalculation(); setConfig(current => ({ ...current, [name]: value })); setPresetId('custom');
  }
  async function run(input = config) {
    const id = ++sequence.current; client.current?.cancel(); setResult(null); setError(''); setFileError(''); setProgress(0); setBusy(true); setStatus('Preparing optical input and the reference geometry…');
    try {
      const normalized = normalizeConfig(input); setConfig(normalized);
      if (!client.current) client.current = createPrimaClient();
      const output = await client.current.run(normalized, { onProgress: update => {
        if (id !== sequence.current) return;
        const fraction = typeof update === 'number' ? update : update?.fraction ?? update?.value ?? update?.progress ?? 0;
        setProgress(Math.max(0, Math.min(100, fraction <= 1 ? fraction * 100 : fraction)));
        const text = typeof update === 'object' ? update.message ?? update.stage : null; if (text) setStatus(text);
      } });
      if (id !== sequence.current) return;
      setResult(output); setGeometry(output.geometry); setProgress(100); setBusy(false); setStatus(`Calculation complete · ${fmt(output.elapsedMs / 1000, 2)} s`);
    } catch (failure) {
      if (id !== sequence.current) return;
      setBusy(false);
      if (failure.name === 'AbortError') { setStatus('Calculation cancelled.'); return; }
      setError(failure.message || 'The experiment could not be calculated.'); setStatus('Calculation stopped.');
    }
  }
  function preset(item) { const next = { ...DEFAULT_CONFIG, ...item.config }; setPresetId(item.id); setInvalidDrafts([]); setImageName(''); setConfig(next); run(next); }
  function selectPixel(id) {
    if (id === config.selectedPixelId) return;
    const next = { ...config, selectedPixelId: id }; clearCalculation('Calculating the selected pixel…'); setConfig(next); setPresetId('custom'); run(next);
  }
  function stepPixel(delta) {
    const index = pixels.findIndex(p => p.id === config.selectedPixelId), target = pixels[(index + delta + pixels.length) % pixels.length]; if (target) selectPixel(target.id);
  }
  function selectPlan(event) {
    const bounds = event.currentTarget.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const nearest = locations.current.reduce((best, p) => { const distance = Math.hypot(p.x - x, p.y - y); return distance < (best?.distance ?? Infinity) ? { ...p, distance } : best; }, null);
    if (nearest && nearest.distance <= Math.max(12, nearest.r * 1.4)) selectPixel(nearest.id);
  }
  function graphicsUnavailable(reason) { setGraphicsError(reason); setView(current => current === '3d' ? 'plan' : current); }
  function pin() { if (result) { setPinned({ result, title: selectedPreset?.title ?? 'Custom experiment' }); setComparisonOpen(true); } }

  function exportFile(kind) {
    if (!result) return;
    try {
      let content, type = 'text/csv;charset=utf-8', suffix = `${kind}.csv`;
      if (kind === 'json') { content = exportExperiment(result); type = 'application/json'; suffix = 'experiment.json'; }
      else if (kind === 'field') {
        const f = result.physics.field, lines = [`# ${result.experimentId}`, `# snapshot_time_ms: ${f.snapshotTimeMs}`, '# Reduced model; extracellular bipolar-cell driving difference is not membrane voltage.', 'x_um,y_um,potential_mv,bipolar_delta_mv,ez_vm'];
        for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) { const k = y * f.width + x; lines.push([f.xUm[x], f.yUm[y], f.potentialMv[k], f.bcDeltaMv[k], f.ezVm?.[k] ?? ''].join(',')); }
        content = lines.join('\n') + '\n';
      } else {
        const w = result.physics.waveform, lines = [`# ${result.experimentId}`, `# selected_pixel: ${result.config.selectedPixelId}`, 'time_ms,irradiance_mw_mm2,pixel_current_ua,polarization_mv,diode_voltage_v,array_current_ua,return_current_ua'];
        for (let i = 0; i < w.timeMs.length; i++) lines.push([w.timeMs[i], w.irradianceMwMm2?.[i], w.currentUa?.[i], w.polarizationMv?.[i], w.diodeVoltageV?.[i], w.arrayCurrentUa?.[i], w.returnCurrentUa?.[i]].join(','));
        content = lines.join('\n') + '\n';
      }
      download(content, `${result.experimentId.toLowerCase()}-${suffix}`, type); setFileError('');
    } catch (failure) { setFileError(failure.message); }
  }
  async function restore(event) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return;
    const id = clearCalculation('Reading the experiment definition…');
    try {
      if (file.size > 20_000_000) throw new Error('Choose an experiment JSON smaller than 20 MB.');
      const definition = parseExperiment(await file.text()); if (id !== sequence.current) return;
      setConfig(definition); setInvalidDrafts([]); setPresetId('custom'); setImageName(definition.customImage ? 'Image restored from experiment' : ''); run(definition);
    } catch (failure) { if (id === sequence.current) { setFileError(failure.message); setStatus('Experiment import could not be completed.'); } }
  }
  async function importImage(event) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return;
    const id = clearCalculation('Preparing the local image…'); let bitmap;
    try {
      if (file.size > 8_000_000) throw new Error('Choose a PNG, JPEG or WebP image smaller than 8 MB.');
      bitmap = await createImageBitmap(file); if (id !== sequence.current) { bitmap.close(); return; }
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const context = canvas.getContext('2d');
      context.fillStyle = '#000'; context.fillRect(0, 0, 256, 256);
      const scale = Math.min(256 / bitmap.width, 256 / bitmap.height), w = bitmap.width * scale, h = bitmap.height * scale; context.drawImage(bitmap, (256 - w) / 2, (256 - h) / 2, w, h); bitmap.close(); bitmap = null;
      const rgba = context.getImageData(0, 0, 256, 256).data, values = Array.from({ length: 256 * 256 }, (_, i) => (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255);
      const next = { ...config, stimulus: 'image', customImage: { width: 256, height: 256, values }, offsetXUm: 0, offsetYUm: 0 };
      setConfig(next); setPresetId('custom'); setImageName(file.name); setInvalidDrafts([]); run(next);
    } catch (failure) { bitmap?.close(); if (id === sequence.current) { setFileError(failure.message || 'This image could not be read.'); setStatus('Image import could not be completed.'); } }
  }

  useEffect(() => { run(DEFAULT_CONFIG); return () => { ++sequence.current; client.current?.dispose(); }; }, []);
  const range = properties => <Range {...properties} value={config[properties.name]} onChange={change} onValidity={validity}/>;
  const select = properties => <Select {...properties} value={config[properties.name]} onChange={change}/>;
  const fieldValues = fieldMode === 'potential' ? physics?.field?.potentialMv : physics?.field?.bcDeltaMv;
  const fieldMaximum = absolutePeak(fieldValues);

  return <article class="pr-lab" data-prima-lab data-prima-state={busy ? 'busy' : error ? 'error' : result ? 'complete' : 'dirty'}>
    <SimHero kicker="Retinal implant laboratory / Photovoltaic systems" title="PRIMA Laboratory" intro="Project an image. Follow the current. Explore the limits of prosthetic vision." links={[{ href: '/simulations/retinal-implant/prima/methods/', label: 'Science & verification' }, { href: '/devices/177-science-prima-subretinal-photovoltaic-implant/', label: 'Science PRIMA device sheet' }]} family={[{ href: '/simulations/retinal-implant/', label: 'Epiretinal laboratory' }, { label: 'PRIMA · subretinal photovoltaic', current: true }]} familyNote="Independent research simulation" />
    <div class="pr-facts"><span><b>378</b> reconstructed pixels</span><span><b>100 μm</b> nominal width</span><span><b>2 × 2 mm</b> implant</span><span><b>880 nm</b> optical input</span></div>

    <section class="pr-experiments" aria-label="Example experiments"><div class="pr-section-label"><span class="pr-eyebrow">Choose an experiment</span><span>Seven starting points · all settings remain editable</span></div><div class="pr-preset-list">{PRESETS.map((item, i) => <button key={item.id} data-prima-preset={item.id} aria-pressed={presetId === item.id} onClick={() => preset(item)}><span>{String(i + 1).padStart(2, '0')}</span>{item.title}</button>)}</div></section>
    <div class="pr-experiment-title"><div><span class="pr-eyebrow">Current experiment</span><h2>{selectedPreset?.title ?? 'Custom experiment'}</h2></div><p>{selectedPreset?.description ?? 'Compare optical, electrical and perceptual behavior while keeping each model’s assumptions explicit.'}</p></div>

    <div class="pr-workbench">
      <aside class="pr-settings" aria-label="Experiment settings"><header><h2>Experiment settings</h2><span class={`pr-state ${busy ? 'is-busy' : result ? 'is-ready' : ''}`}>{busy ? 'Calculating' : result ? 'Calculated' : 'Modified'}</span></header>
        <div class="pr-control-tabs" aria-label="Settings section">{['optics', 'device', 'percept'].map(key => <button key={key} data-prima-tab={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div>
        <div class="pr-control-body">
          {tab === 'optics' && <>
            {select({ name: 'stimulus', label: 'Projected pattern', options: config.customImage ? [...PATTERNS, ['image', 'Imported image']] : PATTERNS })}
            {config.stimulus === 'landolt' && <>{select({ name: 'orientation', label: 'Gap orientation', options: [['right', 'Right'], ['down', 'Down'], ['left', 'Left'], ['up', 'Up']] })}{range({ name: 'landoltGapUm', label: 'Scene gap at 1×', unit: 'μm', min: 30, max: 350, step: 5 })}</>}
            {config.stimulus === 'letter' && select({ name: 'letter', label: 'Letter', options: [['E', 'E'], ['F', 'F'], ['H', 'H'], ['T', 'T']] })}
            {['grating', 'checkerboard'].includes(config.stimulus) && range({ name: 'gratingCycles', label: 'Scene spatial frequency', unit: 'cycles', min: 1, max: 30, step: 1 })}
            {config.stimulus === 'spot' && range({ name: 'spotRadiusUm', label: 'Spot radius at 1×', unit: 'μm', min: 10, max: 700, step: 5 })}
            {config.stimulus === 'face' && <p class="pr-help">A synthetic facial pattern for inspecting image filtering. It is not a face-recognition test.</p>}
            <button class="pr-upload" data-prima="import-image" onClick={() => imageFile.current?.click()}>Load a local image <span>↗</span></button>{imageName && <p class="pr-file-name">{imageName}</p>}
            {range({ name: 'zoom', label: 'Image magnification', unit: '×', min: 1, max: 12, step: .25, note: 'Magnification reduces scene coverage; native pixel spacing stays fixed.' })}
            {range({ name: 'contrast', label: 'Input contrast', unit: '', min: 0, max: 1, step: .05 })}{range({ name: 'brightness', label: 'Input intensity', unit: '', min: 0, max: 1, step: .05 })}
            <div class="pr-control-divider">Optical pulse train</div>
            {range({ name: 'irradianceMwMm2', label: 'Peak irradiance', unit: 'mW/mm²', min: 0, max: 4, step: .1 })}
            {range({ name: 'pulseDurationMs', label: 'Light-pulse duration', unit: 'ms', min: .7, max: 9.8, step: .1 })}
            {range({ name: 'frequencyHz', label: 'Pulse frequency', unit: 'Hz', min: 1, max: 40, step: 1 })}
            <details class="pr-advanced"><summary>Alignment &amp; projection</summary>{range({ name: 'offsetXUm', label: 'Horizontal image offset', unit: 'μm', min: -2000, max: 2000, step: 25 })}{range({ name: 'offsetYUm', label: 'Vertical image offset', unit: 'μm', min: -2000, max: 2000, step: 25 })}{range({ name: 'blurSigmaPx', label: 'Projection blur', unit: 'px', min: 0, max: 8, step: .25 })}{range({ name: 'cycles', label: 'Calculated periods', unit: '', min: 1, max: 8, step: 1, integer: true })}</details>
          </>}
          {tab === 'device' && <>
            <div class="pr-reference-label"><span>Published-device geometry</span><strong>378 pixels · 100 μm</strong><p>Idealized reconstruction. Electrode dimensions and interface parameters below are explicit model assumptions.</p></div>
            {range({ name: 'gapUm', label: 'Electrode–neuron separation', unit: 'μm', min: 10, max: 100, step: 1 })}
            {range({ name: 'bipolarLengthUm', label: 'Bipolar-cell extent', unit: 'μm', min: 20, max: 100, step: 1, note: 'Distance used by the extracellular driving-difference surrogate.' })}
            {range({ name: 'conductivitySm', label: 'Tissue conductivity', unit: 'S/m', min: .05, max: 1, step: .01 })}
            {range({ name: 'activeRadiusUm', label: 'Equivalent active radius', unit: 'μm', min: 8, max: 20, step: .5 })}
            {range({ name: 'returnWidthUm', label: 'Equivalent return width', unit: 'μm', min: 2, max: 6, step: .25 })}
            <details class="pr-advanced"><summary>Photovoltaic &amp; interface parameters</summary>
              {range({ name: 'capacitanceDensityFm2', label: 'Interface capacitance density', unit: 'F/m²', min: 1, max: 40, step: .5 })}
              {range({ name: 'shuntMohm', label: 'Pixel shunt resistance', unit: 'MΩ', min: .1, max: 10, step: .1 })}
              {range({ name: 'responsivityAW', label: 'Photodiode responsivity', unit: 'A/W', min: .1, max: .65, step: .01 })}
              {range({ name: 'diodeIdeality', label: 'Diode ideality factor', unit: '', min: 1, max: 2, step: .05 })}
              {range({ name: 'diodeSaturationNa', label: 'Diode saturation current', unit: 'nA', min: .00001, max: .1, step: .00001 })}
            </details>
            <details class="pr-advanced"><summary>Numerical sampling</summary>{select({ name: 'fieldGridSize', label: 'Field sampling grid', options: [['31', '31 × 31 · exploratory'], ['61', '61 × 61 · detailed'], ['81', '81 × 81 · fine']] })}{range({ name: 'timeStepMs', label: 'Maximum integration step', unit: 'ms', min: .025, max: .5, step: .025 })}</details>
            <p class="pr-help">Reduced photovoltaic circuit and homogeneous conductive half-space. A shared return mesh is coupled to the active electrodes; detailed retinal layers and cell membranes are not solved.</p>
          </>}
          {tab === 'percept' && <>
            <div class="pr-reference-label"><span>Published appearance approximation</span><strong>ProViSim · 2026</strong><p>Grayscale, spatial filtering and assumed contrast transformation. Independent of the circuit’s neural-driving surrogate.</p></div>
            {select({ name: 'contrastModel', label: 'Contrast transformation', options: [['gamma', 'Gamma · compressed grayscale'], ['sigmoid', 'Sigmoid · threshold-like'], ['none', 'Spatial filter only']] })}
            {config.contrastModel === 'gamma' && range({ name: 'gamma', label: 'Gamma exponent', unit: '', min: 1, max: 4, step: .1 })}
            {config.contrastModel === 'sigmoid' && <>{range({ name: 'sigmoidGain', label: 'Sigmoid gain', unit: '', min: 1, max: 40, step: 1 })}{range({ name: 'sigmoidOffset', label: 'Sigmoid offset', unit: '', min: 0, max: 1, step: .025 })}</>}
            <div class="pr-fixed-parameters"><div><span>Nominal sampling cutoff</span><b>10 cycles / width</b></div><div><span>Tukey taper</span><b>0.30</b></div><div><span>Radius expansion</span><b>0.30</b></div></div>
            <p class="pr-help">Contrast settings illustrate alternative hypotheses. They are not individual patient calibrations or measurements of perceived brightness.</p>
            {range({ name: 'retinalScaleUmDeg', label: 'Retinal distance per degree', unit: 'μm/°', min: 250, max: 320, step: 1 })}
            {select({ name: 'imageSize', label: 'Image calculation size', options: [['128', '128 × 128'], ['256', '256 × 256']] })}
            <a class="pr-inline-link" href="https://doi.org/10.1186/s12984-026-01958-z" target="_blank" rel="noreferrer">Read the perception-model paper ↗</a>
          </>}
        </div>
        <div class="pr-run-area"><button class="pr-primary" data-prima="run" disabled={busy || !validation.valid || invalidDrafts.length > 0} onClick={() => run()}>{busy ? 'Calculating…' : 'Run experiment'}<span>→</span></button>{busy && <button class="pr-cancel" data-prima="cancel" onClick={() => clearCalculation('Calculation cancelled.')}>Cancel</button>}<p class="pr-run-status" role="status" aria-live="polite">{status}</p>{busy && <progress aria-label="Calculation progress" max="100" value={progress}/>}<p class="pr-error" role="alert">{error || (!validation.valid ? validation.errors[0] : '')}</p></div>
      </aside>

      <div class="pr-results">
        <div class="pr-view-grid">
          <section class="pr-anatomy-panel"><header class="pr-panel-heading"><div><span class="pr-eyebrow">Device / retinal placement</span><h2>The photovoltaic interface</h2></div><span class="pr-plate-code">PRIMA / 01</span></header>
            <div class="pr-view-tabs">{[['3d', '3D structure'], ['plan', 'Pixel plan'], ['section', 'Retinal section']].map(([key, title]) => <button key={key} data-prima-view={key} aria-pressed={view === key} disabled={key === '3d' && Boolean(graphicsError)} onClick={() => setView(key)}>{title}</button>)}<button class="pr-reset" data-prima="reset-camera" aria-label="Reset 3D camera" disabled={Boolean(graphicsError) || view !== '3d'} onClick={() => setReset(value => value + 1)}>↺</button></div>
            <div class="pr-anatomy-viewport"><Scene data={sceneData} visible={view === '3d'} reset={reset} onSelect={selectPixel} onUnavailable={graphicsUnavailable}/>{view === 'plan' && <Canvas marker="plan" className="pr-plan-canvas" label="Plan of the reconstructed 378-pixel PRIMA implant. Select a pixel to recalculate its waveform." onPointerDown={selectPlan} draw={canvas => { locations.current = drawPrimaPlan(canvas, pixels, config, config.selectedPixelId, physics?.pixelMetrics); }}/>} {view === 'section' && <Canvas marker="section" className="pr-section-canvas" label="Retinal cross-section in micrometers with a 30-micrometer silicon implant and schematic bipolar cells." draw={canvas => drawPrimaSection(canvas, config, selectedPixel)}/>}</div>
            <div class="pr-scene-controls"><label><input type="checkbox" data-prima-scene="tissue" disabled={Boolean(graphicsError) || view !== '3d'} checked={showTissue} onChange={e => setShowTissue(e.currentTarget.checked)}/>Retinal context</label><label><input type="checkbox" data-prima-scene="projection" disabled={Boolean(graphicsError) || view !== '3d'} checked={showProjection} onChange={e => setShowProjection(e.currentTarget.checked)}/>Optical projection</label><label><input type="checkbox" data-prima-scene="depth" disabled={Boolean(graphicsError) || view !== '3d'} checked={expanded} onChange={e => setExpanded(e.currentTarget.checked)}/>Expand depth ×4</label></div>
            <p class="pr-caption">Reconstructed pixel layout; cells are schematic. Depth expansion affects the 3D illustration only. {view === '3d' && 'Drag to orbit · scroll to zoom · click to select.'}</p>{graphicsError && <p class="pr-graphics-note">{graphicsError}</p>}
          </section>
          <div class="pr-image-pair">
            <ImagePanel title="Projected image" tag="Optical input" marker="input" data={result?.input} fieldDeg={implantFieldDeg} pixels={pixels} selectedId={config.selectedPixelId} overlay={overlay} caption="Normalized image at the implant. The optical pulse train supplies the physical irradiance."/>
            <ImagePanel title="Percept approximation" tag="ProViSim model" marker="percept" data={result?.percept} fieldDeg={implantFieldDeg} caption={result?.config.irradianceMwMm2 === 0 ? "Optical power is off. This conditional appearance preview does not predict a visible percept without stimulation." : "A spatial and contrast approximation. Grayscale 0–1 is not calibrated perceived luminance."}/>
          </div>
        </div>
        <div class="pr-branch-note"><span class="pr-branch-symbol">↗<br/>↘</span><p><strong>Two calculations, one experiment.</strong> The physical model predicts currents and extracellular fields. The appearance model filters the projected image independently; it does not convert electrical field strength into perceived brightness.</p><label><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.currentTarget.checked)}/>Show pixel sampling</label></div>

        <section class="pr-pixel-inspector" aria-label="Selected pixel"><div><span class="pr-eyebrow">Pixel inspector</span><div class="pr-pixel-picker"><button disabled={!pixels.length || busy} onClick={() => stepPixel(-1)} aria-label="Previous pixel">‹</button><select data-prima-setting="selectedPixelId" aria-label="Selected pixel" value={config.selectedPixelId} disabled={!pixels.length || busy} onChange={e => selectPixel(e.currentTarget.value)}>{pixels.length ? pixels.map(p => <option value={p.id} key={p.id}>{p.id}</option>) : <option value={config.selectedPixelId}>{config.selectedPixelId}</option>}</select><button disabled={!pixels.length || busy} onClick={() => stepPixel(1)} aria-label="Next pixel">›</button></div></div><div><span>Position</span><strong>{selectedPixel ? `${fmt(selectedPixel.xUm, 0)}, ${fmt(selectedPixel.yUm, 0)} μm` : '—'}</strong></div><div><span>Relative illumination</span><strong data-prima-metric="pixel-illumination">{inspected ? `${fmt(inspected.illumination * 100, 1)}%` : '—'}</strong></div><div><span>Peak pixel current</span><strong data-prima-metric="pixel-current">{fmt(inspected?.peakCurrentUa, 3)} <small>μA</small></strong></div><div><span>Light-phase charge</span><strong>{fmt(inspected?.phaseChargeNc, 3)} <small>nC</small></strong></div></section>

        <div class="pr-metrics"><Metric label="Native sampling scale" marker="native-acuity" value={metrics ? `20/${fmt(metrics.nativeSnellenDenominator, 0)}` : '—'} note="Geometric reference, not a predicted acuity score."/><Metric label="Scene coverage" marker="scene-field" value={fmt(metrics?.sceneFieldDeg, 2)} unit="°" note={`${fmt(config.zoom, 2)}× magnification across the implant width.`}/><Metric label="Illuminated pixels" marker="illuminated" value={metrics?.illuminatedPixels ?? '—'} unit="/ 378" note="Pixels receiving nonzero sampled input."/><Metric label="Average projection power" marker="power" value={fmt(metrics?.averageProjectionPowerMw ?? metrics?.averageIncidentPowerMw, 3)} unit="mW" note="Incident on the 2 × 2 mm projection; not absorbed heat."/></div>

        <div class="pr-physics-grid">
          <section class="pr-field-panel"><header class="pr-panel-heading"><div><span class="pr-eyebrow">Reduced electrical model</span><h2>Stimulation field</h2></div><span class="pr-unit">mV</span></header><div class="pr-field-tabs">{[['bc', 'Bipolar-cell driving difference'], ['potential', 'Extracellular potential']].map(([key, label]) => <button aria-pressed={fieldMode === key} onClick={() => setFieldMode(key)} data-prima-field={key}>{label}</button>)}</div><Canvas marker="field" className="pr-field-canvas" label={fieldMode === 'bc' ? 'Calculated extracellular potential difference over the assumed bipolar-cell extent, in millivolts.' : 'Calculated extracellular potential at the model sampling plane, in millivolts.'} draw={canvas => drawPrimaField(canvas, physics?.field, { mode: fieldMode, selectedId: config.selectedPixelId, pixels })}/><div class="pr-field-key"><span><i class="negative"/>Negative</span><span>0</span><span>Positive<i/></span></div><p class="pr-caption">{fieldMode === 'bc' ? 'Extracellular driving surrogate, not membrane voltage or an activation probability.' : 'Potential relative to the solver’s reference, at the selected tissue depth.'} {physics?.field && `Snapshot ${fmt(physics.field.snapshotTimeMs, 2)} ms · sampled maximum |value| ${fmt(fieldMaximum, 3)} mV.`}</p></section>
          <section class="pr-waveform-panel"><header class="pr-panel-heading"><div><span class="pr-eyebrow">Light → photovoltaic circuit</span><h2>Pulse &amp; recovery</h2></div><button class="pr-small-button" aria-pressed={showVoltage} onClick={() => setShowVoltage(value => !value)}>{showVoltage ? 'Show current' : 'Show polarization'}</button></header><Canvas marker="waveform" className="pr-waveform-canvas" label={`Optical pulse train and ${showVoltage ? 'interface polarization' : 'current'} for pixel ${config.selectedPixelId}.`} draw={canvas => drawPrimaWaveform(canvas, physics?.waveform, { selectedId: config.selectedPixelId, showVoltage })}/><p class="pr-caption">The circuit determines the electrical waveform and dark recovery. Residual charge is measured after the final dark interval. Selecting a pixel recalculates this trace.</p><div class="pr-small-metrics"><Metric label="Optical duty cycle" marker="duty-cycle" value={metrics ? fmt(metrics.dutyCycle * 100, 1) : '—'} unit="%"/><Metric label="Selected Δφ" marker="pixel-driving" value={fmt(inspected?.bcDeltaMv, 3)} unit="mV"/><Metric label="Residual pixel charge" marker="pixel-residual" value={fmt(inspected?.residualChargeNc, 3)} unit="nC"/></div><div class="pr-filter-heading"><span class="pr-eyebrow">Separate appearance calculation</span><h3>Spatial filter response</h3></div><Canvas marker="frequency" className="pr-frequency-canvas" label="Transfer function of the published ProViSim spatial filter, in cycles per implant width." draw={canvas => drawPrimaFrequency(canvas, result?.percept?.frequencyResponse, config)}/></section>
        </div>
      </div>
    </div>

    {result?.warnings?.length > 0 && <details class="pr-result-notes"><summary>Model notes for this experiment <span>{result.warnings.length}</span></summary><ul>{result.warnings.map((warning, i) => <li key={i}>{typeof warning === 'string' ? warning : warning.message ?? JSON.stringify(warning)}</li>)}</ul></details>}

    <section class="pr-comparison"><header class="pr-panel-heading"><div><span class="pr-eyebrow">Compare experiments</span><h2>A reference to return to</h2></div><div class="pr-actions"><button data-prima="pin" disabled={!result} onClick={pin}>{pinned ? 'Replace pinned experiment' : 'Pin this experiment'}</button>{pinned && <><button onClick={() => setComparisonOpen(value => !value)} aria-expanded={comparisonOpen}>{comparisonOpen ? 'Close comparison' : 'Compare'}</button><button onClick={() => { setPinned(null); setComparisonOpen(false); }}>Clear pin</button></>}</div></header><p class="pr-comparison-note">Pin a calculation, then change magnification, alignment or contrast. Both images use a fixed 0–1 grayscale display; this is not a comparison of measured perceptual luminance.</p>
      {comparisonOpen && pinned && <div class="pr-comparison-grid"><ImagePanel title="Current experiment" tag={result?.experimentId ?? 'Modified settings'} marker="comparison-current" data={result?.percept} fieldDeg={implantFieldDeg} caption={result ? `${fmt(result.config.zoom, 2)}× magnification · ${result.config.contrastModel} contrast transform` : 'Run the modified experiment to compare it with the retained reference.'}/><ImagePanel title={pinned.title} tag={`Pinned · ${pinned.result.experimentId}`} marker="comparison-pinned" data={pinned.result.percept} fieldDeg={pinned.result.metrics.implantFieldDeg} caption={`${fmt(pinned.result.config.zoom, 2)}× magnification · ${pinned.result.config.contrastModel} contrast transform`}/><div class="pr-comparison-values"><span class="pr-eyebrow">Pinned experiment</span><h3>{pinned.result.experimentId}</h3><dl><div><dt>Magnification</dt><dd>{fmt(pinned.result.config.zoom, 2)}×</dd></div><div><dt>Scene coverage</dt><dd>{fmt(pinned.result.metrics.sceneFieldDeg, 2)}°</dd></div><div><dt>Separation</dt><dd>{fmt(pinned.result.config.gapUm, 0)} μm</dd></div><div><dt>Illuminated pixels</dt><dd>{pinned.result.metrics.illuminatedPixels}</dd></div><div><dt>Peak irradiance</dt><dd>{fmt(pinned.result.config.irradianceMwMm2, 2)} mW/mm²</dd></div></dl><button onClick={() => { const definition = { ...pinned.result.config }; setConfig(definition); setPresetId('custom'); setInvalidDrafts([]); run(definition); }}>Restore pinned settings</button></div></div>}
    </section>

    <section class="pr-export"><div><span class="pr-eyebrow">Reproducible experiments</span><h2>Keep the settings and the evidence.</h2><p>Export the complete experiment with numerical samples and provenance. Loading an experiment restores its settings and calculates fresh results. Images stay in your browser.</p></div><div class="pr-actions"><button data-prima="export-json" disabled={!result} onClick={() => exportFile('json')}>Experiment JSON ↓</button><button data-prima="export-field" disabled={!result} onClick={() => exportFile('field')}>Field CSV ↓</button><button data-prima="export-waveform" disabled={!result} onClick={() => exportFile('waveform')}>Waveform CSV ↓</button><button data-prima="import-experiment" onClick={() => experimentFile.current?.click()}>Load experiment ↑</button></div><p class="pr-export-meta">{result ? `${result.experimentId} · ${result.modelVersion} · ${fmt(result.elapsedMs, 0)} ms calculation` : 'Run an experiment to enable export.'}</p>{fileError && <p class="pr-file-error" role="alert">{fileError}</p>}</section>
    <input hidden ref={experimentFile} type="file" accept="application/json,.json" data-prima-file="experiment" onChange={restore}/><input hidden ref={imageFile} type="file" accept="image/png,image/jpeg,image/webp" data-prima-file="image" onChange={importImage}/>

    <footer class="pr-evidence"><div><span class="pr-eyebrow">Model scope</span><h2>Published ideas, explicit assumptions.</h2><p>This laboratory combines a published PRIMA appearance approximation with a reduced photovoltaic circuit and conductive half-space calculation. Reconstructed geometry, circuit parameters and schematic anatomy are identified in the methods. Numerical agreement does not establish clinical prediction.</p><a href="/simulations/retinal-implant/prima/methods/">Read equations, reference checks and limitations →</a></div><div><span class="pr-eyebrow">Clinical context</span><h2>Pixel resolution and useful vision are different measures.</h2><p>Native sampling, magnification and scene coverage are shown separately. The filtered images do not predict an individual patient’s acuity, contrast sensitivity or reading performance.</p><a href="/devices/177-science-prima-subretinal-photovoltaic-implant/">Explore PRIMA’s device and clinical evidence →</a></div></footer>
  </article>;
}
