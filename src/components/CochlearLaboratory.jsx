import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS, MODEL_VERSION, PRESETS, normalizeSettings, presetSettings, serializeExperiment, parseExperiment } from '../lib/cochlear/config.js';
import { createGeometry, greenwoodHz } from '../lib/cochlear/geometry.js';
import { createNerveModel } from '../lib/cochlear/nerve.js';
import { validateProcessorConfig, runProcessor } from '../lib/cochlear/processor.js';
import { synthesizeVocoder } from '../lib/cochlear/audio.js';
import { prepareAudio, pulsesCSV, spikesCSV, membraneCSV } from '../lib/cochlear/experiment.js';
import CochleaScene, { replayValue } from './cochlear/Scene.jsx';
import { SignalPlot, Electrodogram, MembranePlot, NeuralRaster, RecruitmentPlot, OverlapMatrix } from './cochlear/Charts.jsx';
import '../styles/cochlear.css';

const fmt = (n, d = 1) => Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const hz = n => n >= 1000 ? `${fmt(n / 1000, 2)} kHz` : `${fmt(n, 0)} Hz`;
function download(text, name, type = 'text/plain') { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function clampAudioOffset(full, offset, durationMs) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const maximum = Math.max(0, full.samples.length / full.sampleRate * 1000 - duration);
  return Math.max(0, Math.min(Number.isFinite(offset) ? offset : 0, maximum));
}
function takeAudioWindow(full, offset, durationMs) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return { label: `${full.label} · ${offset}–${offset + duration} ms`, sampleRate: full.sampleRate,
    samples: full.samples.slice(Math.round(offset * full.sampleRate / 1000), Math.round((offset + duration) * full.sampleRate / 1000)) };
}

function Field({ name, label, value, onChange, min, max, step = 1, unit = '' }) {
  return <label class="coch-control"><span>{label}<small>{unit}</small></span><input type="number" name={name} value={value} min={min} max={max} step={step} onInput={e => onChange(name, Number(e.currentTarget.value))} /></label>;
}
function Select({ name, label, value, onChange, options }) {
  return <label class="coch-control"><span>{label}</span><select name={name} value={value} onChange={e => onChange(name, e.currentTarget.value)}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
}
function Metric({ label, value, note }) { return <div class="coch-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }

export default function CochlearLaboratory() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, activeMask: [...DEFAULT_SETTINGS.activeMask] });
  const [result, setResult] = useState(null), [baseline, setBaseline] = useState(null), [scan, setScan] = useState(null), [threshold, setThreshold] = useState(null);
  const [preset, setPreset] = useState('tone'), [tab, setTab] = useState('sound'), [view, setView] = useState('coiled');
  const [busy, setBusy] = useState(''), [progress, setProgress] = useState({ fraction: 0, stage: '' }), [error, setError] = useState('');
  const [selectedContact, setContact] = useState(6), [selectedFiber, setFiber] = useState(16), [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [uploaded, setUploaded] = useState(null), [theme, setTheme] = useState('light'), [unavailable, setUnavailable] = useState('');
  const [audioStatus, setAudioStatus] = useState(''), [audioBusy, setAudioBusy] = useState(false), [vocoderShift, setVocoderShift] = useState(0);
  const [uploadOffsetMs, setUploadOffset] = useState(0), [fullUpload, setFullUpload] = useState(null);
  const worker = useRef(null), runId = useRef(0), activeTask = useRef(''), mediaGeneration = useRef(0), sourceFile = useRef(null), experimentFile = useRef(null), audioContext = useRef(null), audioSource = useRef(null);
  const nerveModel = useMemo(() => createNerveModel(), []);
  let normalized = null, invalid = '', schedule = null;
  try { normalized = normalizeSettings(settings); schedule = validateProcessorConfig(normalized, normalized.sampleRate); if (!schedule.valid) invalid = schedule.errors.join(' '); }
  catch (e) { invalid = e.message; }
  const draftScene = useMemo(() => {
    try { const prepared = normalizeSettings(settings); return { geometry: createGeometry(prepared), settings: prepared }; }
    catch { return { geometry: createGeometry(DEFAULT_SETTINGS), settings: DEFAULT_SETTINGS }; }
  }, [settings]);
  const geometry = result?.geometry ?? draftScene.geometry, model = result?.model ?? nerveModel;
  const contactIndex = Math.min(selectedContact, geometry.contacts.length - 1), fiberIndex = Math.min(selectedFiber, geometry.fibers.length - 1);
  const chosenPreset = PRESETS.find(p => p.id === preset);
  const fiber = result?.fibers[fiberIndex], contact = result?.allocation[contactIndex];
  const stopAudio = () => { ++mediaGeneration.current; try { audioSource.current?.stop(); } catch {} audioSource.current = null; setAudioStatus(''); setAudioBusy(false); };
  const cancel = () => { ++runId.current; worker.current?.terminate(); worker.current = null; activeTask.current = ''; setBusy(''); setPlaying(false); stopAudio(); };
  const change = (name, value) => {
    cancel(); setError(''); setPreset('custom'); setResult(null); setScan(null); setThreshold(null); setTime(0);
    if (fullUpload && ((name === 'durationMs' && settings.signalKind === 'uploaded') || (name === 'signalKind' && value === 'uploaded'))) {
      const duration = name === 'durationMs' ? value : settings.durationMs;
      const offset = clampAudioOffset(fullUpload, uploadOffsetMs, duration);
      setUploadOffset(offset); setUploaded(takeAudioWindow(fullUpload, offset, duration));
    }
    setSettings(old => { const next = { ...old, [name]: value }; if (name === 'channelCount') { next.channelCount = Number(value); next.activeMask = Array(next.channelCount).fill(true); next.maxima = Math.min(next.channelCount, next.maxima); } return next; });
  };
  const launch = (task = 'run', draft = settings, clip = uploaded) => {
    cancel(); const id = ++runId.current; setError(''); setPlaying(false); setProgress({ fraction: 0, stage: task === 'run' ? 'Preparing sound and pulse schedule' : task === 'scan' ? 'Preparing isolated contact probes' : 'Searching for a propagated response' });
    try {
      const prepared = normalizeSettings(draft), validation = validateProcessorConfig(prepared, prepared.sampleRate);
      if (!validation.valid) throw new Error(validation.errors.join(' '));
      if (task === 'run' && prepared.signalKind === 'uploaded' && !clip) throw new Error('Choose an audio file first.');
      setBusy(task); activeTask.current = task;
      const w = new Worker(new URL('../lib/cochlear/worker.js', import.meta.url), { type: 'module' }); worker.current = w;
      w.onmessage = e => {
        const message = e.data; if (message.id !== id || runId.current !== id) return;
        if (message.type === 'progress') { setProgress(message); return; }
        if (message.type === 'error') { setError(message.message); setBusy(''); activeTask.current = ''; w.terminate(); worker.current = null; return; }
        if (message.type !== 'result') return;
        const r = message.result; setBusy(''); activeTask.current = ''; w.terminate(); worker.current = null;
        if (task === 'scan') { setScan(r); return; }
        if (task === 'threshold') { setThreshold(r); return; }
        setResult(r); setSettings(r.settings); setScan(null); setThreshold(null);
        let best = 0, maximum = -1;
        for (let c = 0; c < r.settings.channelCount; c++) { let sum = 0; for (let t = 0; t < r.processor.frameTimesS.length; t++) sum += r.processor.currentsUA[t * r.settings.channelCount + c]; if (sum > maximum) { maximum = sum; best = c; } }
        setContact(best);
        const x = r.geometry.contacts[best].positionMm[0];
        let nearest = 0, distance = Infinity; r.fibers.forEach((f, i) => { const d = Math.abs(f.placeMm - x); if (f.alive && d < distance) { distance = d; nearest = i; } });
        setFiber(nearest); setTime(r.fibers[nearest]?.spikeTimesMs[0] ?? 0);
      };
      w.onerror = e => { if (id === runId.current) { setError(e.message || 'The calculation worker could not run.'); setBusy(''); activeTask.current = ''; worker.current = null; } w.terminate(); };
      w.postMessage({ id, task, settings: prepared, audio: clip, contactIndex, fiberIndex });
    } catch (e) { setError(e.message); setBusy(''); activeTask.current = ''; worker.current?.terminate(); worker.current = null; }
  };
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); sync();
    const observer = new MutationObserver(sync); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    launch('run', DEFAULT_SETTINGS, null);
    return () => { ++runId.current; ++mediaGeneration.current; worker.current?.terminate(); observer.disconnect(); try { audioSource.current?.stop(); audioContext.current?.close(); } catch {} };
  }, []);
  useEffect(() => {
    if (!playing || !result) return;
    let frame, previous = performance.now();
    const tick = now => { const delta = (now - previous) * .012; previous = now; setTime(t => { if (t + delta >= result.durationMs) { setPlaying(false); return result.durationMs; } return t + delta; }); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing, result]);
  const selectContact = index => {
    if (!geometry.contacts[index]) return;
    if (activeTask.current === 'threshold') cancel();
    setContact(index); setThreshold(null);
    const x = geometry.contacts[index].positionMm[0]; let best = 0, distance = Infinity;
    geometry.fibers.forEach((f, i) => { if (f.alive && Math.abs(f.placeMm - x) < distance) { best = i; distance = Math.abs(f.placeMm - x); } }); setFiber(best);
  };
  const selectFiber = index => { if (!geometry.fibers[index]) return; if (activeTask.current === 'threshold') cancel(); setFiber(index); setThreshold(null); };
  const scrub = t => { setPlaying(false); setTime(Math.max(0, Math.min(result?.durationMs ?? settings.durationMs, t))); };
  const choose = id => { const next = presetSettings(id); cancel(); setSettings(next); setPreset(id); setResult(null); setScan(null); setThreshold(null); setTime(0); launch('run', next, null); };
  const applyAudioWindow = offsetValue => {
    if (!fullUpload) return;
    cancel(); setError(''); setResult(null); setScan(null); setThreshold(null); setTime(0); setPreset('custom');
    const offset = clampAudioOffset(fullUpload, offsetValue, settings.durationMs);
    setUploadOffset(offset); setUploaded(takeAudioWindow(fullUpload, offset, settings.durationMs));
  };
  const restoreBaseline = () => {
    if (!baseline) return;
    cancel(); setError(''); setSettings(baseline.settings);
    const audio = baseline.settings.signalKind === 'uploaded' ? baseline.audio : null;
    setUploaded(audio); setFullUpload(audio); setUploadOffset(0);
    setResult(baseline); setScan(null); setThreshold(null); setTime(0); setPreset('custom');
  };
  const field = (name, label, unit, min, max, step = 1) => <Field key={name} {...{ name, label, unit, min, max, step }} value={settings[name]} onChange={change} />;

  const listen = async mode => {
    stopAudio(); const generation = mediaGeneration.current; setError(''); setAudioBusy(true);
    try {
      const s = normalizeSettings(settings), context = audioContext.current ?? new (window.AudioContext || window.webkitAudioContext)(); audioContext.current = context; await context.resume();
      if (generation !== mediaGeneration.current) return;
      let sound, startMs = 0;
      if (s.signalKind === 'uploaded') {
        const full = fullUpload ?? uploaded;
        if (!full?.samples?.length) throw new Error('Choose an audio file first.');
        startMs = fullUpload ? clampAudioOffset(full, uploadOffsetMs, s.durationMs) : 0;
        const duration = Math.min(2000, full.samples.length / full.sampleRate * 1000 - startMs);
        if (!(duration > 0)) throw new Error('The selected audio window contains no samples.');
        sound = prepareAudio(s, takeAudioWindow(full, startMs, duration), duration);
      } else sound = prepareAudio(s, null, 2000);
      const output = mode === 'original' ? sound : synthesizeVocoder(runProcessor(sound.samples, sound.sampleRate, s), { carrier: mode, shiftSemitones: vocoderShift, seed: s.seed });
      if (generation !== mediaGeneration.current) return;
      const buffer = context.createBuffer(1, output.samples.length, output.sampleRate); buffer.copyToChannel(output.samples, 0);
      const source = context.createBufferSource(); source.buffer = buffer; const gain = context.createGain(); gain.gain.value = mode === 'original' ? .45 : .8; source.connect(gain).connect(context.destination); audioSource.current = source;
      source.onended = () => { if (audioSource.current === source) { audioSource.current = null; setAudioStatus(''); } };
      const durationMs = output.samples.length / output.sampleRate * 1000;
      const durationLabel = durationMs >= 1000 ? `${fmt(durationMs / 1000, 1)} s` : `${fmt(durationMs, 0)} ms`;
      const warnings = output.warnings?.length ? ` · ${output.warnings.join(' ')}` : '';
      setAudioStatus(`${mode === 'original' ? 'Original signal' : `${mode === 'noise' ? 'Noise' : 'Sine'} vocoder`} · ${durationLabel} acoustic preview${s.signalKind === 'uploaded' ? ` from ${fmt(startMs, 0)} ms` : ''}${warnings}`); source.start();
    } catch (e) { if (generation === mediaGeneration.current) setError(e.message); }
    finally { if (generation === mediaGeneration.current) setAudioBusy(false); }
  };
  const importAudio = async event => {
    const input = event.currentTarget, file = input.files?.[0]; if (!file) return;
    cancel(); setError(''); setResult(null); setScan(null); setThreshold(null); setAudioBusy(true);
    const generation = mediaGeneration.current;
    try {
      if (file.size > 20000000) throw new Error('Choose an audio file smaller than 20 MB.');
      const context = audioContext.current ?? new (window.AudioContext || window.webkitAudioContext)(); audioContext.current = context;
      const bytes = await file.arrayBuffer(); if (generation !== mediaGeneration.current) return;
      const decoded = await context.decodeAudioData(bytes); if (generation !== mediaGeneration.current) return;
      const seconds = Math.min(10, decoded.duration), target = 24000;
      if (seconds < .01) throw new Error('Audio must contain at least 10 ms.');
      const offline = new OfflineAudioContext(1, Math.round(seconds * target), target), source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
      const rendered = await offline.startRendering(); if (generation !== mediaGeneration.current) return;
      const samples = Float32Array.from(rendered.getChannelData(0), value => Math.max(-1, Math.min(1, value)));
      const full = { samples, sampleRate: target, label: file.name }; setFullUpload(full); setUploadOffset(0);
      const duration = Math.min(settings.durationMs, Math.floor(seconds * 1000)); setUploaded(takeAudioWindow(full, 0, duration));
      setSettings(old => ({ ...old, sampleRate: target, signalKind: 'uploaded', durationMs: duration })); setPreset('custom');
    } catch (e) { if (generation === mediaGeneration.current) setError(`Audio could not be decoded: ${e.message}`); }
    finally { input.value = ''; if (generation === mediaGeneration.current) setAudioBusy(false); }
  };
  const importSettings = async event => {
    const input = event.currentTarget, file = input.files?.[0]; if (!file) return;
    cancel(); setError(''); const generation = mediaGeneration.current;
    try {
      const text = await file.text(); if (generation !== mediaGeneration.current) return;
      const record = parseExperiment(text); setSettings(record.settings); setUploaded(record.audio); setFullUpload(record.audio); setUploadOffset(0); setPreset('custom'); setResult(null); setScan(null); setThreshold(null); setTime(0);
    } catch (e) { if (generation === mediaGeneration.current) setError(e.message); }
    finally { input.value = ''; }
  };

  const traceSeries = fiber?.response ? ['Peripheral node', 'Soma', 'Distal axon'].map((label, index) => ({ label, values: fiber.response.membraneMv[index], color: ['var(--coch-blue)', 'var(--coch-brass)', 'var(--coch-red)'][index] })) : [];
  const computedSettings = result?.settings ?? draftScene.settings;
  return <div class="coch-lab" data-model-version={MODEL_VERSION} data-coch-status={busy || (result ? 'complete' : 'ready')}>
    <header class="coch-heading"><div><p class="coch-kicker">Neural Interface Laboratories / Auditory systems</p><h1>Cochlear Implant Laboratory</h1><p class="coch-intro">Follow a sound from its frequency bands to a propagated nerve response.</p></div><a href="/simulations/cochlear-implant/methods/" class="coch-method-link">Methods &amp; validation ↗</a></header>
    <div class="coch-model-strip"><span>Calculated model</span><p>Finite circular contacts · homogeneous conductor · Rattay auditory nerve · 65 compartments per fiber</p></div>
    <div class="coch-experiment-bar"><label><span class="coch-label">Experiment</span><select aria-label="Saved experiment" value={preset} onChange={e => choose(e.currentTarget.value)}>{preset === 'custom' && <option value="custom">Custom experiment</option>}{PRESETS.map(p => <option value={p.id} key={p.id}>{p.title}</option>)}</select></label><p>{chosenPreset?.question ?? 'Change a parameter, calculate the response, and compare it with a pinned run.'}</p><div class="coch-actions"><button disabled={!result || !!busy} onClick={() => setBaseline(result)}>{baseline ? 'Replace baseline' : 'Pin baseline'}</button>{baseline && <button onClick={() => setBaseline(null)}>Clear baseline</button>}</div></div>
    <div class="coch-workbench">
      <aside class="coch-controls"><div class="coch-panel-title"><h2>Experiment settings</h2><span>{result ? 'Calculated' : 'Draft'}</span></div>
        <div class="coch-control-tabs">{[['sound', 'Sound'], ['implant', 'Implant'], ['nerve', 'Nerve']].map(([id, text]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{text}</button>)}</div>
        <div class="coch-control-body">
          {tab === 'sound' && <>
            <Select name="signalKind" label="Input signal" value={settings.signalKind} onChange={change} options={[[ 'tone', 'Pure tone' ], ['sweep', 'Frequency sweep'], ['two-tone', 'Two tones'], ['am', 'Amplitude-modulated tone'], ['synthetic-vowel', 'Synthetic vowel'], ['noise', 'Seeded noise'], ['silence', 'Silence control'], ['uploaded', 'Uploaded audio']]} />
            {['tone', 'am', 'two-tone'].includes(settings.signalKind) && field('toneHz', 'Tone frequency', 'Hz', 200, 8000, 50)}
            {settings.signalKind === 'two-tone' && field('secondToneHz', 'Second tone', 'Hz', 200, 8000, 50)}
            {settings.signalKind === 'am' && <>{field('modulationHz', 'Modulation rate', 'Hz', 1, 200)}{field('modulationDepth', 'Modulation depth', 'fraction', 0, 1, .05)}</>}
            {settings.signalKind !== 'uploaded' && field('levelDbfs', 'Digital input peak', 'dBFS', -60, 0)}
            {field('durationMs', 'Neural simulation window', 'ms', 10, 250, 10)}
            {settings.signalKind === 'uploaded' && <div class="coch-upload"><button onClick={() => sourceFile.current?.click()} disabled={audioBusy}>Choose audio file</button><p>{fullUpload?.label ?? 'WAV, MP3 or another browser-supported format.'}</p>{fullUpload && <><label class="coch-control"><span>Window start<small>ms</small></span><input type="number" min="0" max={Math.max(0, Math.floor(fullUpload.samples.length / fullUpload.sampleRate * 1000) - settings.durationMs)} step="10" value={uploadOffsetMs} onInput={e => applyAudioWindow(Number(e.currentTarget.value))} /></label><button onClick={() => applyAudioWindow(uploadOffsetMs)}>Use this audio window</button></>}</div>}
            <h3>Sound processor</h3>
            <Select name="strategy" label="Stimulation strategy" value={settings.strategy} onChange={change} options={[[ 'cis', 'CIS · all source bands' ], ['nofm', 'Generic n-of-m']]} />
            {settings.strategy === 'nofm' && field('maxima', 'Selected maxima', 'bands / frame', 1, settings.channelCount)}
            {field('frameRateHz', 'Selection frame rate', 'Hz', 100, 2000, 50)}
            {field('envelopeCutoffHz', 'Envelope cutoff', 'Hz', 20, 500, 10)}
            {field('gamma', 'Compression exponent', '', .1, 3, .1)}
            <p class="coch-note">Digital sound level maps to current through a documented compression curve. It is not a clinical loudness map.</p>
          </>}
          {tab === 'implant' && <>
            <Select name="channelCount" label="Contacts / analysis bands" value={String(settings.channelCount)} onChange={change} options={[[ '8', '8 contacts' ], ['12', '12 contacts'], ['16', '16 contacts'], ['24', '24 contacts']]} />
            {field('arraySpanMm', 'Fixed contact span', 'mm on reference path', 8, 22, .5)}
            {field('apicalDepthMm', 'Apical map position', 'mm from base', 16, 32, .5)}
            {field('radialDistanceMm', 'Contact-to-nerve separation', 'mm', .1, 2, .05)}
            {field('contactRadiusMm', 'Contact radius', 'mm', .03, .35, .01)}
            <Select name="returnMode" label="Return configuration" value={settings.returnMode} onChange={change} options={[[ 'monopolar', 'Monopolar · remote return' ], ['bipolar', 'Bipolar · neighboring return'], ['partial-tripolar', 'Partial tripolar']]} />
            {settings.returnMode === 'partial-tripolar' && field('focusFraction', 'Local return fraction', '', 0, 1, .05)}
            <h3>Electrical pulse</h3>
            {field('maxCurrentUA', 'Maximum pulse amplitude', 'µA', 0, 2000, 25)}
            {field('phaseWidthUs', 'Phase duration', 'µs', 10, 100, 5)}
            {field('gapUs', 'Interphase gap', 'µs', 0, 30)}
            <Select name="polarity" label="Leading phase" value={settings.polarity} onChange={change} options={[[ 'cathodic', 'Cathodic first' ], ['anodic', 'Anodic first']]} />
            <h3>Source channels</h3><div class="coch-contact-mask">{settings.activeMask.map((active, i) => <button key={i} aria-pressed={active} aria-label={`Source contact ${i + 1} ${active ? 'enabled' : 'disabled'}`} onClick={() => change('activeMask', settings.activeMask.map((value, index) => index === i ? !value : value))}>{i + 1}</button>)}</div>
            <p class="coch-note">Disabled sources receive no selected pulses. They can still carry a local return. Bands retain their original allocation.</p>
          </>}
          {tab === 'nerve' && <>
            <p class="coch-note">Every surviving modeled fiber uses the same published 65-compartment auditory nerve cable. These are sampled fibers, not the full human population.</p>
            <Select name="fiberCount" label="Modeled fibers" value={String(settings.fiberCount)} onChange={(name, value) => change(name, Number(value))} options={[[ '17', '17 · faster exploration' ], ['33', '33 · standard'], ['65', '65 · finer spatial sampling']]} />
            {field('neuralLoss', 'Loss within selected region', 'fraction', 0, 1, .1)}
            {field('lossCentreMm', 'Loss region center', 'mm from base', 2, 33, .5)}
            {field('lossWidthMm', 'Loss region width', 'mm', 1, 20, .5)}
            {field('conductivitySPerM', 'Homogeneous conductivity', 'S/m', .1, 2, .05)}
            <Select name="dtUs" label="Numerical timestep" value={String(settings.dtUs)} onChange={(name, value) => change(name, Number(value))} options={[[ '0.5', '0.5 µs · refinement' ], ['1', '1 µs · reference'], ['2', '2 µs · faster']]} />
            {field('seed', 'Survival / audio seed', '', 0, 4294967295)}
            <p class="coch-note">The membrane model is deterministic. The seed controls which fibers survive partial regional loss and the synthetic noise signal.</p>
          </>}
        </div>
        <div class="coch-run-controls">{schedule && <div class={`coch-timing ${invalid ? 'is-invalid' : ''}`}><span>Maximum schedule occupancy</span><strong>{fmt((schedule.timing?.maxOccupancy ?? 0) * 100, 1)}%</strong></div>}{invalid && <p class="coch-error" role="alert">{invalid}</p>}<button class="coch-primary" disabled={!!busy || !!invalid || audioBusy} onClick={() => launch('run')}>Run experiment</button>{busy && <button onClick={cancel}>Cancel calculation</button>}<p class="coch-note">Settings changes clear previous results. Pin a completed run to preserve it for comparison.</p></div>
      </aside>
      <section class="coch-observation">
        <div class="coch-status-row" aria-live="polite"><span class={`coch-status ${busy ? 'is-busy' : ''}`} />{busy ? progress.stage : result ? `Calculated · ${result.metrics.totalCompartments.toLocaleString()} compartments · ${fmt(result.metrics.elapsedMs / 1000, 1)} s` : 'Ready to calculate'}<span class="coch-version">Model {MODEL_VERSION}</span></div>
        {busy && <progress class="coch-progress" max="1" value={progress.fraction || undefined} aria-label="Calculation progress" />}
        {error && <p role="alert" class="coch-error">{error}</p>}
        <div class="coch-viewbar"><div>{[['coiled', 'Coiled view'], ['unrolled', 'Calculation space'], ['field', 'Contact field']].map(([id, title]) => <button key={id} aria-pressed={view === id} disabled={id === 'coiled' && !!unavailable} onClick={() => setView(id)}>{title}</button>)}</div><label>Contact<select aria-label="Inspect contact" value={contactIndex} onChange={e => selectContact(Number(e.currentTarget.value))}>{geometry.contacts.map((c, i) => <option value={i} key={i}>{c.label}</option>)}</select></label></div>
        <div class="coch-viewport"><CochleaScene {...{ geometry, model, theme, timeMs: time, selectedContact: contactIndex, selectedFiber: fiberIndex, view }} fibers={result?.fibers} settings={computedSettings} onContact={selectContact} onFiber={selectFiber} onUnavailable={message => { setUnavailable(message); setView('unrolled'); }} /></div>
        <div class="coch-view-caption"><p>{view === 'coiled' ? 'Drag to orbit · select a contact or fiber. Coiled geometry is an anatomical illustration; the electrical calculation uses the unrolled coordinates.' : view === 'unrolled' ? 'Physical calculation coordinates. Electrode projections are above the nerve plane; compartment diameters are exaggerated for visibility.' : 'Uniform-source disk potential in an unbounded conductor. No bony walls, scala boundaries, or patient anatomy are included.'}</p>{view !== 'field' && <div class="coch-voltage-legend"><span>Membrane</span><i /><span>−80</span><span>+30 mV</span></div>}</div>
        {unavailable && <p class="coch-note">{unavailable}</p>}
        <div class="coch-replay"><button disabled={!result} onClick={() => { if (time >= result.durationMs) setTime(0); setPlaying(v => !v); }}>{playing ? 'Pause replay' : 'Play replay'}</button><input type="range" aria-label="Shared simulation time" min="0" max={result?.durationMs ?? settings.durationMs} step=".02" value={time} disabled={!result} onInput={e => scrub(Number(e.currentTarget.value))} /><output>{fmt(time, 2)} ms</output></div>
        <div class="coch-selection"><div><span class="coch-label">{geometry.contacts[contactIndex].label} · frequency allocation</span><strong>{contact ? `${hz(contact.lowHz)}–${hz(contact.highHz)}` : 'Calculated after a run'}</strong><small>Reference place: {hz(geometry.contacts[contactIndex].placeHz)}{contact ? ` · ${contact.mismatchSemitones >= 0 ? '+' : ''}${fmt(contact.mismatchSemitones, 1)} semitones (place − band)` : ''}</small></div><label class="coch-fiber-select"><span class="coch-label">Inspect auditory nerve</span><select aria-label="Inspect auditory nerve fiber" value={fiberIndex} onChange={e => selectFiber(Number(e.currentTarget.value))}>{geometry.fibers.map((f, i) => <option value={i} key={i}>{f.label} · {fmt(f.placeMm, 1)} mm{!f.alive ? ' · removed' : ''}</option>)}</select><small>{fiber ? `${fiber.spikeTimesMs.length} propagated spikes in this run` : '65 membrane compartments per surviving fiber'}</small></label></div>
        <div class="coch-metrics"><Metric label="Fibers recruited" value={result ? `${result.metrics.recruited} / ${result.metrics.surviving}` : '—'} note="Surviving modeled fibers" /><Metric label="Propagated spikes" value={result ? result.metrics.spikeCount : '—'} note="Distal axon · 0 mV crossing" /><Metric label="Delivered pulses" value={result ? result.processor.metrics.totalPulses.toLocaleString() : '—'} note={result ? `${fmt(result.processor.metrics.actualOccupancy * 100, 1)}% occupied time` : 'Exact sequential schedule'} /><Metric label="Largest phase charge" value={result ? `${fmt(result.processor.metrics.chargePerPhaseMaxNC, 2)} nC` : '—'} note="Current × phase duration" /></div>
        {!result && <div class="coch-empty">{busy ? 'Solving the electrical and membrane equations. Geometry is available while the calculation runs.' : 'Run the experiment to calculate the sound bands, delivered pulses, and nerve responses.'}</div>}
        {result && <div class="coch-plot-grid"><SignalPlot samples={result.audio.samples} sampleRate={result.audio.sampleRate} timeMs={time} onTime={scrub} /><Electrodogram processor={result.processor} timeMs={time} selectedContact={contactIndex} onContact={selectContact} onTime={scrub} />{fiber?.response ? <MembranePlot timeMs={fiber.response.timeMs} series={traceSeries} cursorMs={time} onTime={scrub} /> : <div class="coch-plot coch-empty">This fiber was removed from the modeled surviving population. Select another fiber to inspect membrane voltage.</div>}<NeuralRaster fibers={result.fibers} durationMs={result.durationMs} timeMs={time} selectedFiber={fiberIndex} onFiber={selectFiber} onTime={scrub} /><RecruitmentPlot fibers={result.fibers} baselineFibers={baseline?.fibers} /></div>}
      </section>
    </div>
    <section class="coch-tools"><header><div><span class="coch-kicker">Acoustic demonstration</span><h2>Listen to the coding constraints</h2></div><div class="coch-actions"><button disabled={audioBusy || !!invalid} onClick={() => listen('original')}>Original</button><button disabled={audioBusy || !!invalid} onClick={() => listen('noise')}>Noise vocoder</button><button disabled={audioBusy || !!invalid} onClick={() => listen('sine')}>Sine vocoder</button>{audioStatus && <button onClick={stopAudio}>Stop</button>}</div></header><div class="coch-listen-options"><label>Carrier shift <input type="number" min="-24" max="24" step="1" value={vocoderShift} disabled={audioBusy} onInput={e => { stopAudio(); setVocoderShift(Math.max(-24, Math.min(24, Number(e.currentTarget.value)))); }} /> semitones</label><span aria-live="polite">{audioBusy ? 'Preparing acoustic preview…' : audioStatus || 'A separate acoustic preview of up to 2 seconds.'}</span></div><p>Vocoder audio demonstrates selected coding constraints. It does not reproduce an individual implant user’s hearing. Generated vowel audio is synthetic; neural calculations use the shorter window above. Preview playback uses fixed output gains, and vocoder output has RMS normalization.</p></section>
    <section class="coch-tools"><header><div><span class="coch-kicker">Controlled electrical measurements</span><h2>Probe the electrode–nerve interface</h2></div><div class="coch-actions"><button disabled={!!busy || !!invalid} onClick={() => launch('scan')}>Scan isolated contacts</button><button disabled={!!busy || !!invalid || !geometry.fibers[fiberIndex].alive || !settings.activeMask[contactIndex]} onClick={() => launch('threshold')}>Find selected-fiber threshold</button></div></header><p>The contact scan delivers one isolated biphasic pulse per source at the configured maximum current. It measures propagated neural recruitment independently of the audio. The threshold search uses the selected contact and fiber.</p>{threshold && <div class="coch-threshold" aria-live="polite"><strong>{threshold.thresholdUA === null ? 'No threshold bracket found up to 2,000 µA' : `${fmt(threshold.thresholdUA, 2)} µA · E${String(threshold.contactIndex + 1).padStart(2, '0')} → ANF ${threshold.fiberIndex + 1}`}</strong><span>Deterministic single-pulse model threshold; distal 0 mV upcrossing within 4 ms. This is not a clinical hearing threshold.</span></div>}{scan && <OverlapMatrix scan={scan} selectedContact={contactIndex} onContact={selectContact} />}</section>
    {baseline && <section class="coch-tools coch-comparison"><header><div><span class="coch-kicker">Pinned baseline</span><h2>Compare completed calculations</h2></div><button onClick={restoreBaseline}>Restore baseline</button></header><p>Baseline: {baseline.audio.label} · {baseline.settings.channelCount} contacts · {baseline.settings.radialDistanceMm} mm separation · {baseline.settings.maxCurrentUA} µA maximum.</p><div class="coch-table-wrap"><table><thead><tr><th>Measurement</th><th>Baseline</th><th>Current run</th></tr></thead><tbody><tr><th>Recruited / surviving fibers</th><td>{baseline.metrics.recruited} / {baseline.metrics.surviving}</td><td>{result ? `${result.metrics.recruited} / ${result.metrics.surviving}` : 'Awaiting calculation'}</td></tr><tr><th>Propagated spikes</th><td>{baseline.metrics.spikeCount}</td><td>{result?.metrics.spikeCount ?? '—'}</td></tr><tr><th>Delivered pulses</th><td>{baseline.processor.metrics.totalPulses}</td><td>{result?.processor.metrics.totalPulses ?? '—'}</td></tr><tr><th>Maximum phase charge / nC</th><td>{fmt(baseline.processor.metrics.chargePerPhaseMaxNC, 2)}</td><td>{fmt(result?.processor.metrics.chargePerPhaseMaxNC, 2)}</td></tr><tr><th>Same input samples</th><td colSpan="2">{result ? (result.audio.fingerprint === baseline.audio.fingerprint ? 'Yes' : 'No — inputs differ') : 'Awaiting calculation'}</td></tr></tbody></table></div></section>}
    <section class="coch-tools coch-export"><header><div><span class="coch-kicker">Reproducible experiment record</span><h2>Save settings and measurements</h2></div><div class="coch-actions"><button disabled={!result} onClick={() => download(serializeExperiment(result.settings, { audioFingerprint: result.audio.fingerprint, model: result.model.id }, result.settings.signalKind === 'uploaded' ? result.audio : null), 'cochlear-experiment.json', 'application/json')}>Experiment JSON</button><button onClick={() => experimentFile.current?.click()}>Load experiment</button><button disabled={!result} onClick={() => download(pulsesCSV(result), 'cochlear-pulses.csv', 'text/csv')}>Pulse events CSV</button><button disabled={!result} onClick={() => download(spikesCSV(result), 'cochlear-spikes.csv', 'text/csv')}>Spikes CSV</button><button disabled={!fiber?.response} onClick={() => download(membraneCSV(result, fiberIndex), 'cochlear-membrane.csv', 'text/csv')}>Selected fiber CSV</button></div></header><p>Settings include source selection, geometry, pulse timing, model version, numerical timestep, and seed. Uploaded-audio experiments embed the exact simulated audio window. All processing happens in your browser.</p></section>
    <div class="coch-evidence"><div><span class="coch-label">What is calculated</span><p>Causal filtering, envelopes, channel selection, charge-balanced electrical pulses, finite-contact extracellular potentials, active membrane dynamics, and propagated axonal spikes.</p></div><div><span class="coch-label">Model boundary</span><p>A generic unrolled conductor and sampled deterministic nerve population. No patient-specific cochlea, validated long-term adaptation, ECAP recording, or speech-understanding prediction. <a href="/simulations/cochlear-implant/methods/">Read the equations and verification.</a></p></div></div>
    <input hidden ref={sourceFile} type="file" accept="audio/*" onChange={importAudio} /><input hidden ref={experimentFile} type="file" accept="application/json,.json" onChange={importSettings} />
  </div>;
}
