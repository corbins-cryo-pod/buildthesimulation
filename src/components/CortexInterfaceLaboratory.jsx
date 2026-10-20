import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { freshInterfaceConfig, INTERFACE_COMPARISON_VERSION } from '../lib/cortex/interface-contract.js';
import { INTERFACE_DESIGN, INTERFACE_CONTACT_VARIANTS, makeInterfaceDesign } from '../lib/cortex/interface-field.js';
import { decodeInterfaceArchive, encodeInterfaceArchive } from '../lib/cortex/interface-archive.js';
import { readInterfaceReplayFile, validateInterfaceReplay } from '../lib/cortex/interface-replay-validation.js';
import '../styles/cortex-interface.css';

const palette = ['#79e3cf', '#91c9ff', '#dbb4ff', '#ffbc99', '#9fe3a4', '#f0ce8e', '#a9c8e6', '#f5a7c4'];
const conditions = [{ key: 'baseline', label: 'A · baseline', color: '#91c9ff' }, { key: 'variant', label: 'B · variant', color: '#ffbc99' }];
const examples = { default: 'Ongoing firing', evoked: 'Evoked spikes', geometry: 'Compare pad sizes', stimulation: 'Stimulus off / on' };
const format = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
const units = magnitude => magnitude >= 1e6 ? { scale: 1e6, label: 'V' } : magnitude >= 1000 ? { scale: 1000, label: 'mV' } : { scale: 1, label: 'µV' };
function potential(value) { const unit = units(Math.abs(value)); return `${format(value / unit.scale, 2)} ${unit.label}`; }
const eventCount = run => run.cells.reduce((sum, c) => sum + c.spikeTimesMs.length, 0);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const configKey = config => JSON.stringify(canonical({ ...freshInterfaceConfig(), ...config, contactGeometry: config.contactGeometry ?? null }));
const meanOf = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const sameTimeGrid = (a, b) => a.timeMs.length === b.timeMs.length && a.timeMs.every((t, i) => t === b.timeMs[i]);
function recordingValues(run, contact, signal, source, cell) {
  const neural = source === 'cell' ? run.cells[cell]?.neuralUv : run.neuralUv;
  if (signal !== 'artifact' && !neural) return null;
  return Float64Array.from(run.timeMs, (_, frame) => (signal !== 'artifact' ? neural[frame * 8 + contact] : 0) + (signal !== 'neural' ? run.artifactUv[frame * 8 + contact] : 0));
}
function closestFrame(times, target) {
  let low = 0, high = times.length - 1;
  while (low < high) { const middle = (low + high) >>> 1; if (times[middle] < target) low = middle + 1; else high = middle; }
  return low && target - times[low - 1] < times[low] - target ? low - 1 : low;
}
function download(name, bytes, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([bytes], { type })), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const summaryRun = run => ({ ...run, cells: run.cells.map(cell => ({ ...cell, nodes: undefined, membraneMv: undefined })), exportScope: 'Protocol, source provenance, contact signals, cell contributions where available, soma traces and events. Full compartment arrays require the binary replay export.' });

function Plot({ result, comparison, frame, kind, contact = 0, cell = 0, node = 0, signal = 'neural', source = 'all', subtractMean = false, gain = 'shared' }) {
  const canvas = useRef(null);
  const graph = useMemo(() => {
    if (!result) return null;
    const matched = !comparison || sameTimeGrid(comparison.baseline, comparison.variant);
    const runs = comparison && matched ? conditions.map(condition => ({ ...condition, run: comparison[condition.key] })) : [{ run: result, color: kind === 'voltage' ? '#a1eddc' : palette[contact] }];
    if (kind === 'raster') return { runs, matched };
    const traces = runs.map(entry => {
      const selected = entry.run.cells[cell], count = selected?.nodes.length;
      const values = kind === 'voltage' ? Float64Array.from(entry.run.timeMs, (_, f) => selected?.membraneMv[f * count + node] ?? NaN) : recordingValues(entry.run, contact, signal, source, cell);
      return { ...entry, values, mean: kind === 'recording' && subtractMean && values ? meanOf(values) : 0 };
    });
    if (traces.some(trace => !trace.values)) return { unavailable: true, matched };
    let low = -100, high = 40;
    if (kind === 'voltage') {
      for (const trace of traces) for (const value of trace.values) { low = Math.min(low, value); high = Math.max(high, value); }
    } else {
      let limit = .05;
      if (gain === 'shared') {
        // One range across all contacts and both conditions: selection never changes gain.
        for (const { run } of runs) for (let k = 0; k < 8; k++) {
          const values = recordingValues(run, k, signal, source, cell);
          if (!values) continue;
          const mean = subtractMean ? meanOf(values) : 0;
          for (const value of values) limit = Math.max(limit, Math.abs(value - mean));
        }
        limit *= 1.08;
      } else limit = Number(gain);
      low = -limit; high = limit;
    }
    const unit = kind === 'voltage' ? { scale: 1, label: 'mV' } : units(Math.max(Math.abs(low), Math.abs(high)));
    const clipped = traces.some(trace => trace.values.some(value => value - trace.mean < low || value - trace.mean > high));
    return { runs, traces, low, high, unit, clipped, matched };
  }, [result, comparison, kind, contact, cell, node, signal, source, subtractMean, gain]);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext('2d'); if (!ctx) return;
    const width = 900, height = kind === 'raster' ? 230 : 190;
    element.width = width * 2; element.height = height * 2; ctx.scale(2, 2);
    ctx.fillStyle = '#302f2d'; ctx.fillRect(0, 0, width, height); ctx.font = '12px system-ui'; ctx.fillStyle = '#98aab9';
    if (!graph || graph.unavailable) { ctx.fillText(graph?.unavailable ? 'This replay has no per-cell recording contributions. Run a new experiment to compute them.' : 'Load an example or run an experiment to inspect its recorded signals.', 35, height / 2); return; }
    const left = 62, right = width - 18, top = 22, bottom = height - 30, end = result.timeMs.at(-1);
    const x = time => left + time / end * (right - left);
    ctx.lineWidth = 1;
    const tickStep = end <= 100 ? 20 : 50;
    for (let time = 0; time <= end; time += tickStep) {
      ctx.strokeStyle = '#20313e'; ctx.beginPath(); ctx.moveTo(x(time), top); ctx.lineTo(x(time), bottom); ctx.stroke();
      ctx.fillStyle = '#91a6b8'; ctx.fillText(`${time}`, x(time) - 8, height - 9);
    }
    ctx.fillText('ms', width - 23, height - 9);
    if (kind === 'raster') {
      const row = (bottom - top) / result.cells.length;
      for (let ci = 0; ci < result.cells.length; ci++) {
        const y = top + row * (ci + .5); ctx.fillStyle = ci === cell ? '#eafff9' : '#8fa4b5'; ctx.fillText(`${ci + 1}`, 27, y + 4);
        graph.runs.forEach((entry, index) => {
          const center = y + (graph.runs.length === 2 ? (index ? .19 : -.19) * row : 0), half = row * (graph.runs.length === 2 ? .13 : .3);
          ctx.strokeStyle = graph.runs.length === 2 ? entry.color : ci === cell ? '#92f1d8' : '#779b9a'; ctx.lineWidth = ci === cell ? 2 : 1.4;
          for (const time of entry.run.cells[ci].spikeTimesMs) { ctx.beginPath(); ctx.moveTo(x(time), center - half); ctx.lineTo(x(time), center + half); ctx.stroke(); }
        });
      }
    } else {
      const y = value => bottom - (value - graph.low) / (graph.high - graph.low) * (bottom - top);
      ctx.fillStyle = '#a9becb'; ctx.fillText(graph.unit.label, 5, 13);
      for (let i = 0; i < 3; i++) {
        const value = graph.low + (graph.high - graph.low) * i / 2;
        ctx.fillStyle = '#91a6b8'; ctx.fillText(format(value / graph.unit.scale, Math.abs(graph.high / graph.unit.scale) < 1 ? 2 : 1), 3, y(value) + 4);
        ctx.strokeStyle = '#20313e'; ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(right, y(value)); ctx.stroke();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
      graph.traces.forEach((trace, index) => {
        ctx.strokeStyle = trace.color; ctx.lineWidth = 1.5; ctx.setLineDash(index ? [5, 3] : []); ctx.beginPath();
        for (let f = 0; f < trace.values.length; f++) { const px = x(trace.run.timeMs[f]), py = y(trace.values[f] - trace.mean); if (!f) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
      });
      ctx.restore(); ctx.setLineDash([]);
    }
    const cursor = x(result.timeMs[frame] ?? 0); ctx.strokeStyle = '#ffffffa0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cursor, top); ctx.lineTo(cursor, bottom); ctx.stroke();
    graph.runs.forEach((entry, index) => {
      const config = entry.run.config;
      if (config.mode === 'recording' || !config.amplitudeUa) return;
      ctx.strokeStyle = graph.runs.length === 2 ? entry.color : '#ff9d7b'; ctx.lineWidth = 2;
      for (let time = config.startMs; time + (2 * config.phaseUs + config.gapUs) / 1000 <= end; time += 1000 / config.frequencyHz) {
        ctx.beginPath(); ctx.moveTo(x(time), 6 + index * 5); ctx.lineTo(x(time), 10 + index * 5); ctx.stroke();
      }
    });
  }, [graph, result, frame, kind, cell]);
  return <div><canvas ref={canvas} class="ci-plot" style={{ aspectRatio: kind === 'raster' ? '900 / 230' : '900 / 190' }} role="img" aria-label={kind === 'raster' ? 'Somatic event raster; paired conditions use separate upper and lower ticks. An accessible event table follows.' : kind === 'voltage' ? 'Selected compartment voltage in millivolts; A and B share the same axes.' : 'Ideal contact potential; unit prefix and gain are displayed on the axis.'} />
    {graph?.clipped && <p class="ci-plot-warning">Signal exceeds the selected display range. Choose a wider range to see it; exported values are unchanged.</p>}
    {graph && !graph.matched && <p class="ci-plot-warning">Time grids differ; only the displayed run is plotted. No interpolated comparison is shown.</p>}</div>;
}

export default function CortexInterfaceLaboratory() {
  const host = useRef(null), view = useRef(null), worker = useRef(null), replayClock = useRef(0), resultRef = useRef(null), sceneRun = useRef(null);
  const exampleRequest = useRef(null), loadId = useRef(0), jobId = useRef(0), mounted = useRef(false), reducedMotion = useRef(false), fileInput = useRef(null);
  const [config, setConfig] = useState(freshInterfaceConfig), [archive, setArchive] = useState(null), [side, setSide] = useState('variant');
  const [status, setStatus] = useState('Loading the computed 12-cell recording…'), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [playing, setPlaying] = useState(false), [exporting, setExporting] = useState(false);
  const [frame, setFrame] = useState(0), [speed, setSpeed] = useState(8), [cell, setCell] = useState(0), [node, setNode] = useState(0);
  const [contact, setContact] = useState(3), [signal, setSignal] = useState('neural'), [source, setSource] = useState('all'), [subtractMean, setSubtractMean] = useState(false), [gain, setGain] = useState('shared');
  const [sceneStatus, setSceneStatus] = useState(''), [showLabels, setShowLabels] = useState(true), [sceneReady, setSceneReady] = useState(0);
  const [compareKind, setCompareKind] = useState('geometry'), [compareContact, setCompareContact] = useState(3), [baselineSize, setBaselineSize] = useState('12x24'), [variantSize, setVariantSize] = useState('30x30');
  const comparison = archive?.version === INTERFACE_COMPARISON_VERSION ? archive : null;
  const result = comparison ? comparison[side] : archive; resultRef.current = result;
  const draftReference = comparison?.variant ?? result;
  const dirty = draftReference && configKey(config) !== configKey(draftReference.config), locked = busy || loading;
  const draftDesign = useMemo(() => makeInterfaceDesign(config.contactGeometry ?? null), [config.contactGeometry]);
  const shownDesign = result?.design ?? INTERFACE_DESIGN, selected = result?.cells[cell], currentTime = result?.timeMs[frame] ?? 0;
  const patch = values => setConfig(previous => ({ ...previous, ...values }));
  const toggleContact = index => setConfig(previous => ({ ...previous, activeContacts: previous.activeContacts.includes(index) ? previous.activeContacts.filter(i => i !== index) : [...previous.activeContacts, index].sort((a, b) => a - b) }));
  const selectCell = index => { setCell(index); setNode(resultRef.current?.cells[index]?.somaIndex ?? 0); };
  const accept = payload => {
    const paired = payload.version === INTERFACE_COMPARISON_VERSION, run = paired ? payload.variant : payload;
    const firstCell = run.config.mode === 'evoked' ? Math.max(0, run.cells.findIndex(c => c.spikeTimesMs.length)) : 0;
    setArchive(payload); setSide('variant'); setConfig(structuredClone(run.config)); setFrame(0); setCell(firstCell); setNode(run.cells[firstCell].somaIndex);
    setContact(paired && payload.spec.kind === 'geometry' ? payload.spec.contactIndex : run.config.activeContacts[0] ?? 3);
    if (paired) { setCompareKind(payload.spec.kind); if (payload.spec.kind === 'geometry') { setCompareContact(payload.spec.contactIndex); setBaselineSize(payload.spec.baselineVariantId); setVariantSize(payload.spec.variantVariantId); } }
    replayClock.current = 0; setPlaying(!reducedMotion.current); setBusy(false); setLoading(false); setError('');
    setStatus(paired ? `Matched comparison ready · ${run.cells.length} cells per condition · A: ${eventCount(payload.baseline)} / B: ${eventCount(payload.variant)} complete somatic events` : `${run.cells.length} cells · ${run.compartments.toLocaleString()} compartments · ${run.timeMs.at(-1)} ms computed · ${eventCount(run)} complete somatic events`);
  };
  const loadExample = async name => {
    exampleRequest.current?.abort(); const controller = new AbortController(), request = ++loadId.current; exampleRequest.current = controller;
    setLoading(true); setPlaying(false); setError(''); setStatus(`Loading computed example: ${examples[name]}…`);
    try {
      const response = await fetch(`/models/cortex/interface/${name}.bin.gz`, { signal: controller.signal });
      if (!response.ok) throw new Error('The saved example could not be loaded. Run an experiment to calculate a new result.');
      const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if (mounted.current && request === loadId.current) accept(validateInterfaceReplay(decodeInterfaceArchive(bytes)));
    } catch (e) { if (mounted.current && request === loadId.current && !controller.signal.aborted) { setLoading(false); setError(e.message); setStatus('The previous replay remains available. You can run a new experiment.'); } }
  };
  useEffect(() => {
    mounted.current = true;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)'); reducedMotion.current = preference.matches;
    const motionChange = event => { reducedMotion.current = event.matches; if (event.matches) setPlaying(false); };
    preference.addEventListener('change', motionChange);
    import('../lib/cortex/interface-scene.js').then(({ createInterfaceView }) => {
      if (!mounted.current) return;
      view.current = createInterfaceView(host.current, { onSelectCell: (ci, ni) => { setCell(ci); setNode(ni); }, onSelectContact: setContact, onStatus: setSceneStatus });
      view.current.setGeometry({ design: INTERFACE_DESIGN, cells: [] }); setSceneReady(value => value + 1);
    }).catch(e => { if (mounted.current) setSceneStatus(e.message); });
    loadExample('default');
    return () => { mounted.current = false; ++loadId.current; ++jobId.current; preference.removeEventListener('change', motionChange); exampleRequest.current?.abort(); worker.current?.terminate(); worker.current = null; view.current?.dispose(); };
  }, []);
  useEffect(() => {
    if (!result || !view.current) return;
    const preserveView = !!comparison && (sceneRun.current === comparison.baseline || sceneRun.current === comparison.variant);
    view.current.setGeometry({ design: result.design, cells: result.cells, preserveView }); sceneRun.current = result;
  }, [result, comparison, sceneReady]);
  useEffect(() => {
    if (!result) return;
    view.current?.setContacts(result.config.mode === 'recording' || !result.config.amplitudeUa ? [] : result.config.activeContacts, contact);
    view.current?.setFrame(result, frame, cell, node, { showLabels });
  }, [result, frame, cell, node, contact, showLabels, sceneReady]);
  useEffect(() => {
    if (!playing || !result) return;
    let handle, previous = performance.now();
    const tick = now => {
      const delta = Math.min(100, now - previous); previous = now;
      if (!document.hidden) { replayClock.current = (replayClock.current + delta * speed / 1000) % result.timeMs.at(-1); setFrame(closestFrame(result.timeMs, replayClock.current)); }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick); return () => cancelAnimationFrame(handle);
  }, [playing, result, speed]);
  const stop = () => { ++jobId.current; worker.current?.terminate(); worker.current = null; setBusy(false); setStatus('Computation cancelled. The previous completed replay is unchanged.'); };
  const run = (type = 'run') => {
    exampleRequest.current?.abort(); ++loadId.current; setLoading(false); setPlaying(false); setBusy(true); setError('');
    setStatus(type === 'compare' ? 'Preparing two matched conditions…' : 'Preparing the full compartment experiment…');
    const request = ++jobId.current;
    const spec = type === 'compare' ? { version: INTERFACE_COMPARISON_VERSION, kind: compareKind, eventMatchWindowMs: 5, ...(compareKind === 'geometry' ? { contactIndex: compareContact, baselineVariantId: baselineSize, variantVariantId: variantSize } : {}) } : undefined;
    try {
      const next = worker.current ?? new Worker(new URL('../lib/cortex/interface-worker.js', import.meta.url), { type: 'module' }); worker.current = next;
      const fail = message => { if (worker.current !== next || jobId.current !== request) return; setError(message); setBusy(false); setStatus('Computation stopped. The previous completed replay is unchanged.'); next.terminate(); worker.current = null; };
      next.onmessage = ({ data }) => {
        if (!mounted.current || worker.current !== next || data.jobId !== request || jobId.current !== request) return;
        if (data.type === 'progress') setStatus(`${data.condition ? `${data.condition === 'baseline' ? 'A' : 'B'} · ` : ''}${data.message ?? data.stage} · full morphology computations can take several minutes`);
        // Geometry and progress belong to a draft job; only a complete accepted run replaces the replay.
        if (data.type === 'result' || data.type === 'comparison') { try { accept(validateInterfaceReplay(data.comparison ?? data.result)); } catch (e) { fail(e.message); } }
        if (data.type === 'error') fail(data.message);
      };
      next.onerror = event => fail(event.message || 'The simulation worker stopped.');
      next.postMessage({ type, jobId: request, config: structuredClone(config), ...(spec ? { spec } : {}) });
    } catch (e) { worker.current?.terminate(); worker.current = null; setBusy(false); setError(e.message); }
  };
  const importReplay = async file => {
    if (!file || busy) return;
    exampleRequest.current?.abort(); const request = ++loadId.current; ++jobId.current; setLoading(true); setPlaying(false); setError(''); setStatus('Checking replay structure, geometry, arrays and matched conditions…');
    try { const payload = await readInterfaceReplayFile(file); if (mounted.current && request === loadId.current) accept(payload); }
    catch (e) { if (mounted.current && request === loadId.current) { setLoading(false); setError(e.message); setStatus('Import rejected. The previous completed replay is unchanged.'); } }
  };
  const metrics = useMemo(() => !result ? [] : result.design.contacts.map((pad, k) => {
    let min = Infinity, max = -Infinity; for (let f = 0; f < result.timeMs.length; f++) { const value = result.neuralUv[f * 8 + k]; min = Math.min(min, value); max = Math.max(max, value); }
    return { ...pad, peakToPeakUv: max - min };
  }), [result]);
  const cursorTrace = useMemo(() => {
    if (!result) return null; const values = recordingValues(result, contact, signal, source, cell);
    return values ? { values, mean: subtractMean ? meanOf(values) : 0 } : null;
  }, [result, contact, signal, source, cell, subtractMean]);
  const eventRows = useMemo(() => !result ? [] : (comparison ? conditions.map(condition => ({ ...condition, run: comparison[condition.key] })) : [{ key: null, label: 'Run', run: result }]).flatMap(entry => entry.run.cells[cell].spikeTimesMs.map((time, index) => ({ time, index, key: entry.key, label: entry.label }))).sort((a, b) => a.time - b.time), [result, comparison, cell]);
  const seek = (time, run = result) => { if (!run) return; const next = closestFrame(run.timeMs, time); setFrame(next); replayClock.current = run.timeMs[next]; setPlaying(false); };
  const adjacentEvent = direction => { const events = selected?.spikeTimesMs ?? []; const time = direction > 0 ? events.find(t => t > currentTime + .06) : [...events].reverse().find(t => t < currentTime - .06); if (time !== undefined) { setNode(selected.somaIndex); seek(time); } };
  const exportSummary = () => {
    if (!archive) return;
    const data = comparison ? { ...comparison, baseline: summaryRun(comparison.baseline), variant: summaryRun(comparison.variant) } : summaryRun(result);
    download(comparison ? 'interface-comparison.json' : 'interface-experiment.json', JSON.stringify(data, (_, value) => ArrayBuffer.isView(value) ? Array.from(value) : value, 2));
  };
  const exportReplay = async () => {
    if (!archive) return; setExporting(true);
    try { const stream = new Blob([encodeInterfaceArchive(archive)]).stream().pipeThrough(new CompressionStream('gzip')); download(comparison ? 'interface-comparison.bin.gz' : 'interface-replay.bin.gz', await new Response(stream).arrayBuffer(), 'application/gzip'); }
    catch (e) { setError(`Replay export failed: ${e.message}`); } finally { if (mounted.current) setExporting(false); }
  };
  const contributionAvailable = !!result && (comparison ? [comparison.baseline, comparison.variant] : [result]).every(run => !!run.cells[cell]?.neuralUv);
  const compareProblem = compareKind === 'geometry' ? baselineSize === variantSize ? 'Choose two different contact sizes.' : '' : config.mode === 'recording' || config.amplitudeUa <= 0 || !config.activeContacts.length ? 'Choose a stimulation protocol, positive current and at least one active pad.' : '';
  const comparisonContact = comparison?.analysis.contacts[contact];
  return <section class="ci-lab" aria-label="Neural Interface Laboratory">
    <header class="ci-heading"><div><div class="ci-eyebrow"><span /> CORTEX / INTEGRATED EXPERIMENT</div><h1>Neural Interface Laboratory</h1><p>One shank. Twelve human neurons. Matched experiments in stimulation and recording.</p></div><a class="ci-method-link" href="/cortex/interface/methods/">Model &amp; evidence <span>↗</span></a></header>
    <div class="ci-workspace"><aside class="ci-controls">
      <div class="ci-section-title"><span>01</span> Experiment draft</div>
      <div class="ci-examples"><span>Computed examples</span><div>{Object.entries(examples).map(([name, label]) => <button key={name} disabled={locked} onClick={() => loadExample(name)}>{label}</button>)}</div></div>
      <label>Protocol<select value={config.mode} disabled={locked} onChange={e => patch({ mode: e.currentTarget.value })}><option value="recording">Record ongoing firing</option><option value="evoked">Stimulate resting cells</option><option value="combined">Background + stimulation</option></select></label>
      <div class="ci-two"><label>Cells<select value={config.count} disabled={locked} onChange={e => patch({ count: +e.currentTarget.value })}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label><label>Clearance · µm<input type="number" min="25" max="200" step="5" value={config.clearanceUm} disabled={locked} onChange={e => patch({ clearanceUm: +e.currentTarget.value })} /></label></div>
      <label>Recording window · ms<select value={config.durationMs} disabled={locked} onChange={e => patch({ durationMs: +e.currentTarget.value })}>{[...new Set([100,260,300,config.durationMs])].sort((a,b) => a-b).map(value => <option key={value}>{value}</option>)}</select></label>
      <p class="ci-hint">Every cell uses its full reconstruction and fitted membrane channels. Background firing is driven by calibrated somatic current.</p>
      <div class="ci-section-title"><span>02</span> Surface contacts</div><p class="ci-hint">Select stimulation pads for the next run. Click a pad in the completed scene to inspect its recording. All eight contacts are recorded.</p>
      <div class="ci-contacts">{draftDesign.contacts.map(pad => <button key={pad.id} disabled={locked} class={config.activeContacts.includes(pad.index) ? 'ci-pad selected' : 'ci-pad'} aria-pressed={config.activeContacts.includes(pad.index)} onClick={() => toggleContact(pad.index)}><b>{pad.label}</b><span>{pad.widthUm} × {pad.heightUm}<small>µm · {pad.areaUm2} µm²</small></span><i>{config.activeContacts.includes(pad.index) ? '●' : '○'}</i></button>)}</div>
      <div class="ci-two"><label>Total current · µA<input type="number" min="0" max="100" step="1" value={config.amplitudeUa} disabled={locked || config.mode === 'recording'} onChange={e => patch({ amplitudeUa: +e.currentTarget.value })} /></label><label>Train · Hz<select value={config.frequencyHz} disabled={locked || config.mode === 'recording'} onChange={e => patch({ frequencyHz: +e.currentTarget.value })}>{[...new Set([10,20,40,50,100,config.frequencyHz])].sort((a,b) => a-b).map(value => <option key={value}>{value}</option>)}</select></label></div>
      <label>Phase duration · µs<select value={config.phaseUs} disabled={locked || config.mode === 'recording'} onChange={e => patch({ phaseUs: +e.currentTarget.value })}>{[...new Set([100,200,500,1000,config.phaseUs])].sort((a,b) => a-b).map(value => <option key={value}>{value}</option>)}</select></label>
      <p class="ci-hint">Cathodic first, balanced biphasic pulses from {config.startMs} ms; {config.gapUs} µs gap. Total current is shared equally across selected pads. Inactive pads float.</p>
      <button class="ci-run" onClick={() => run()} disabled={locked}>{busy ? 'Solving membrane dynamics…' : 'Run experiment'} <span>→</span></button>
      {busy && <button class="ci-secondary" onClick={stop}>Cancel computation</button>}
      {dirty && <p class="ci-pending">Draft changed. The scene, signals and highlighted pads still belong to the completed replay. Run to apply these inputs.</p>}
      <section class="ci-compare-setup" aria-label="Configure a controlled comparison"><div class="ci-section-title"><span>03</span> Compare A / B</div>
        <label>Change one input<select value={compareKind} disabled={locked} onChange={e => setCompareKind(e.currentTarget.value)}><option value="geometry">Contact size at the same position</option><option value="stimulation">Stimulation off versus on</option></select></label>
        {compareKind === 'geometry' ? <><label>Target contact<select value={compareContact} disabled={locked} onChange={e => setCompareContact(+e.currentTarget.value)}>{INTERFACE_DESIGN.contacts.map(pad => <option key={pad.id} value={pad.index}>Contact {pad.label} · same center in A and B</option>)}</select></label><div class="ci-two"><label>A · baseline size<select value={baselineSize} disabled={locked} onChange={e => setBaselineSize(e.currentTarget.value)}>{INTERFACE_CONTACT_VARIANTS.map(size => <option key={size.id} value={size.id}>{size.label}</option>)}</select></label><label>B · variant size<select value={variantSize} disabled={locked} onChange={e => setVariantSize(e.currentTarget.value)}>{INTERFACE_CONTACT_VARIANTS.map(size => <option key={size.id} value={size.id}>{size.label}</option>)}</select></label></div></> : <p class="ci-hint">A delivers 0 µA. B uses the configured {format(config.amplitudeUa)} µA train. Geometry, cells and the selected background protocol remain identical.</p>}
        {compareProblem && <p class="ci-pending">{compareProblem}</p>}
        <button class="ci-run ci-compare-run" onClick={() => run('compare')} disabled={locked || !!compareProblem}>Run matched comparison <span>A + B</span></button><p class="ci-hint">Two full runs share cell positions, membrane models, drive and timebase. A pad-size change updates the coupled field, so other contacts can change too. Event correspondence uses a 5 ms window; it describes timing, not individual event causation.</p>
      </section>
      <div class="ci-design-note"><b>A test interface, physically scaled</b><p>90 × 20 µm shank · 1.8 mm long · 300 µm pointed tip. Mixed contact sizes inspired by Neuropixels. A hypothetical test design, not a demonstrated optimum.</p><a href="/devices/">Device catalogue ↗</a></div>
    </aside><div class="ci-main">
      {comparison && <section class="ci-data-card ci-comparison"><div class="ci-card-heading"><div><span class="ci-section-label">CONTROLLED COMPARISON</span><h2>{comparison.spec.kind === 'geometry' ? `Contact ${comparison.spec.contactIndex + 1}: size comparison` : 'Stimulation off / on'}</h2></div><div class="ci-ab-switch" aria-label="Displayed completed condition">{conditions.map(condition => <button key={condition.key} class={side === condition.key ? 'active' : ''} aria-pressed={side === condition.key} onClick={() => setSide(condition.key)}>{condition.label}</button>)}</div></div>
        <p class="ci-hint">The scene and numerical readouts show <b>{side === 'baseline' ? 'A · baseline' : 'B · variant'}</b>. Plots overlay both completed conditions with the same axes, time cursor, cell and contact selection.</p>
        <div class="ci-ab-key"><span class="ci-a">A · solid trace / upper raster tick</span><span class="ci-b">B · dashed trace / lower raster tick</span></div>
        <details class="ci-table-details"><summary>Changed inputs · {comparison.analysis.inputChanges.length}</summary><div class="ci-table-scroll"><table><thead><tr><th>Input</th><th>A · baseline</th><th>B · variant</th></tr></thead><tbody>{comparison.analysis.inputChanges.map(change => <tr key={change.path}><th>{change.path}</th><td>{JSON.stringify(change.baseline)}</td><td>{JSON.stringify(change.variant)}</td></tr>)}</tbody></table></div></details>
        <details class="ci-table-details"><summary>Per-cell event comparison</summary><div class="ci-table-scroll"><table><thead><tr><th>Cell</th><th>A events</th><th>B events</th><th>Added / lost</th><th>Earlier / later</th></tr></thead><tbody>{comparison.analysis.cells.map(row => <tr key={row.cellIndex}><th><button onClick={() => selectCell(row.cellIndex)}>Cell {row.cellIndex + 1}</button></th><td>{row.baselineEventCount}</td><td>{row.variantEventCount}</td><td>{row.added.length} / {row.lost.length}</td><td>{row.matched.filter(event => event.classification === 'advanced').length} / {row.matched.filter(event => event.classification === 'delayed').length}</td></tr>)}</tbody></table></div><p class="ci-hint">Earlier / later refers to matched complete soma events within 5 ms. Shifts beyond 5 ms appear unmatched (added / lost); incomplete events near the end of the window may be censored. These labels do not identify which single event a stimulus caused.</p></details>
        <div class="ci-pair-metrics"><span>Contact {contact + 1} · all-cell neural p–p</span><b>A {potential(comparisonContact?.neural.baselinePeakToPeakUv)}</b><b>B {potential(comparisonContact?.neural.variantPeakToPeakUv)}</b><span>B − A {potential(comparisonContact?.neural.peakToPeakChangeUv)}</span></div>
      </section>}
      <section class="ci-scene-card"><div class="ci-card-heading"><div><span class="ci-section-label">{comparison ? `${side === 'baseline' ? 'A · BASELINE' : 'B · VARIANT'} / COMPUTED REPLAY` : 'COMPUTED REPLAY'}</span><h2>Membrane activity</h2></div><div class="ci-view-buttons">{['oblique','front','side'].map(name => <button key={name} onClick={() => view.current?.setView(name)}>{name}</button>)}<button onClick={() => view.current?.setView('cell', cell)}>Focus cell</button></div></div>
        {result && <div class="ci-run-identity">Displayed run: {result.config.mode} · {result.cells.length} cells · {result.config.mode === 'recording' || !result.config.amplitudeUa ? 'no stimulus current' : `${format(result.config.amplitudeUa)} µA across pads ${result.config.activeContacts.map(k => k + 1).join(', ')}`}<small>{result.design.id}</small></div>}
        <div ref={host} class="ci-scene" aria-label="Single pointed electrode shank and human neurons showing solved compartment voltage" /><div class="ci-scene-footer"><span>Drag to orbit · scroll to zoom · click a branch or pad to inspect</span><label><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.currentTarget.checked)} /> Labels</label></div>
        <div class="ci-voltage-key"><span>Membrane voltage</span><span>−100 mV</span><i /><span>+40 mV</span><span>Same voltage scale for every cell</span></div>{sceneStatus && <p class="ci-hint">{sceneStatus}</p>}
        <div class="ci-transport"><button onClick={() => setPlaying(!playing)} disabled={!result}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button><input aria-label="Replay time" type="range" min="0" max={(result?.timeMs.length ?? 1) - 1} value={frame} disabled={!result} onInput={e => seek(result.timeMs[+e.currentTarget.value])} /><output>{format(currentTime)} <small>ms</small></output><select aria-label="Replay speed" value={speed} onChange={e => setSpeed(+e.currentTarget.value)}>{[2,8,20,50].map(value => <option key={value} value={value}>{value} ms / sec</option>)}</select></div>
        <div class="ci-event-navigation"><span>Cell {cell + 1}{comparison ? ` · ${side === 'baseline' ? 'A' : 'B'}` : ''} soma events</span><button disabled={!selected?.spikeTimesMs.some(t => t < currentTime - .06)} onClick={() => adjacentEvent(-1)}>← Previous event</button><button disabled={!selected?.spikeTimesMs.some(t => t > currentTime + .06)} onClick={() => adjacentEvent(1)}>Next event →</button></div>
        <p class="ci-replay-note">Slow-motion loop of one computed {result?.config.durationMs ?? config.durationMs} ms window. Colors show each compartment’s solved voltage; replay does not generate new spikes. Reduced-motion preferences pause automatic playback.</p>
      </section>
      <div class="ci-status" role="status" aria-live="polite"><span class={busy || loading ? 'working' : ''} />{status}</div>{error && <p class="ci-error" role="alert">{error}</p>}
      <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">INTRACELLULAR</span><h2>Inspect a cell</h2></div><div class="ci-inline"><label>Cell<select value={cell} disabled={!result} onChange={e => selectCell(+e.currentTarget.value)}>{result?.cells.map((entry, i) => <option key={entry.id + i} value={i}>{i + 1} · {entry.specimenId}</option>)}</select></label><label>Compartment<select value={node} disabled={!selected} onChange={e => setNode(+e.currentTarget.value)}>{selected?.nodes.map((entry, i) => <option key={i} value={i}>{i === selected.somaIndex ? 'Soma' : `${entry.sectionType} ${entry.sectionId} · ${i}`}</option>)}</select></label></div></div>
        <div class="ci-readouts"><div><span>Selected Vm {comparison ? `· ${side === 'baseline' ? 'A' : 'B'}` : ''}</span><b>{format(selected?.membraneMv[frame * selected.nodes.length + node])} <small>mV</small></b></div><div><span>Somatic events</span><b>{selected?.spikeTimesMs.length ?? '—'} <small>/ window</small></b></div><div><span>Somatic drive</span><b>{format(selected?.backgroundNa, 2)} <small>nA</small></b></div><div><span>Specimen</span><b>{selected?.specimenId ?? '—'}</b></div></div>
        <Plot result={result} comparison={comparison} frame={frame} kind="voltage" cell={cell} node={node} /><p class="ci-hint">{selected ? `${selected.cellType} · ${selected.nodes.length} compartments. ` : ''}Select a soma, dendrite or axon compartment to follow its solved membrane voltage. Paired traces use identical compartment indices and voltage axes.</p>
        {selected && <div class="ci-ionic"><span>Soma outward ionic currents at this frame:</span><span>Na⁺ <b>{format(selected.somaSodiumNa[frame], 3)} nA</b></span><span>K⁺ <b>{format(selected.somaPotassiumNa[frame], 3)} nA</b></span><span>Ca²⁺ <b>{format(selected.somaCalciumNa[frame], 3)} nA</b></span></div>}
      </section>
      <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">IDEAL EXTRACELLULAR POTENTIAL</span><h2>Surface recording</h2></div><div class="ci-inline"><label>Contact<select value={contact} onChange={e => setContact(+e.currentTarget.value)}>{shownDesign.contacts.map(pad => <option key={pad.id} value={pad.index}>{pad.label} · {pad.widthUm} × {pad.heightUm} µm</option>)}</select></label><label>Signal<select value={signal} onChange={e => setSignal(e.currentTarget.value)}><option value="neural">Known neural contribution</option><option value="artifact">Direct stimulus artifact</option><option value="total">Neural + artifact</option></select></label></div></div>
        <div class="ci-instrument-controls"><label>Neural sources<select value={source} disabled={signal === 'artifact'} onChange={e => setSource(e.currentTarget.value)}><option value="all">All cells</option><option value="cell" disabled={!contributionAvailable}>Selected cell {cell + 1}{!contributionAvailable ? ' · unavailable in this replay' : ''}</option></select></label><label>Display range<select value={gain} onChange={e => setGain(e.currentTarget.value)}><option value="shared">Shared across all pads + A/B</option><option value="10">Fixed ±10 µV</option><option value="100">Fixed ±100 µV</option><option value="1000">Fixed ±1 mV</option><option value="100000">Fixed ±100 mV</option><option value="10000000">Fixed ±10 V</option></select></label><label class="ci-check"><input type="checkbox" checked={subtractMean} onChange={e => setSubtractMean(e.currentTarget.checked)} /> Subtract each trace mean</label></div>
        {source === 'cell' && !contributionAvailable && signal !== 'artifact' && <p class="ci-plot-warning">Per-cell source contributions are unavailable in this older replay. Select all cells or compute a new run.</p>}
        <Plot result={result} comparison={comparison} frame={frame} kind="recording" contact={contact} cell={cell} signal={signal} source={source} subtractMean={subtractMean} gain={gain} /><div class="ci-cursor-readout"><span>{comparison ? `${side === 'baseline' ? 'A' : 'B'} · ` : ''}{format(currentTime)} ms</span><b>{cursorTrace ? potential(cursorTrace.values[frame] - cursorTrace.mean) : '—'}</b><span>{subtractMean ? 'Mean-subtracted display' : 'Raw potential · reference at infinity'}</span></div>
        <div class="ci-contact-metrics">{metrics.map(metric => <button key={metric.id} class={contact === metric.index ? 'active' : ''} onClick={() => setContact(metric.index)}><span>Contact {metric.label}</span><b>{potential(metric.peakToPeakUv)} <small>p–p</small></b><small>{metric.areaUm2} µm² · all cells</small></button>)}</div>
        <p class="ci-hint">The neural trace is a known contribution from the solver, not a signal recovered from stimulation artifact. Direct artifact can be orders of magnitude larger. {source === 'cell' ? 'Selected-cell view includes only that cell’s neural contribution; direct artifact is unchanged. ' : ''}Shared gain is fixed across contacts and both conditions for the chosen signal and source selection. Raw samples remain in exports. No electrode impedance, noise, amplifier saturation or spike sorting is modeled.</p>
      </section>
      <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">POPULATION</span><h2>Somatic spike raster</h2></div><span class="ci-small">{result?.cells.length ?? 12} independent cells</span></div><Plot result={result} comparison={comparison} frame={frame} kind="raster" cell={cell} /><p class="ci-hint">Ticks require a −25 mV upward crossing, a peak ≥ 0 mV and return below −40 mV. These are known simulated soma events, not spikes detected or sorted from the contact trace. Marks above each plot show stimulus times; coincidence alone does not establish causation.</p>
        <details class="ci-table-details"><summary>Cell {cell + 1} event times · {eventRows.length} entries</summary><div class="ci-table-scroll ci-event-table"><table><thead><tr><th>Condition</th><th>Event</th><th>Time · ms</th><th>Replay</th></tr></thead><tbody>{eventRows.map(row => <tr key={`${row.key}-${row.index}`}><td>{row.label}</td><td>{row.index + 1}</td><td>{format(row.time, 3)}</td><td><button onClick={() => { if (row.key) setSide(row.key); setNode(selected.somaIndex); seek(row.time, row.key ? comparison[row.key] : result); }}>Inspect event</button></td></tr>)}{!eventRows.length && <tr><td colSpan="4">No complete soma events in the selected cell’s window.</td></tr>}</tbody></table></div></details>
      </section>
      <section class="ci-scope"><div><h2>What this experiment establishes</h2><p>All cells run the original human active membrane models. Stimulation and recording share one coupled finite surface-contact solution. The visible shank uses a <b>planar insulating backing approximation</b>: its tip, sides and back do not yet shape the field. Matched comparisons isolate an input within this model; they do not establish an optimal implant or validate a new configuration against native NEURON.</p><a href="/cortex/interface/methods/">Read equations, provenance and validation scope ↗</a></div><div class="ci-exports"><input ref={fileInput} type="file" accept=".gz,.bin,application/gzip,application/octet-stream" hidden onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; importReplay(file); }} /><button disabled={busy || exporting} onClick={() => fileInput.current?.click()}>Import full replay / comparison</button><button disabled={!archive || exporting} onClick={exportSummary}>Export signals &amp; protocol</button><button disabled={!archive || exporting} onClick={exportReplay}>{exporting ? 'Preparing export…' : comparison ? 'Export both full replays' : 'Export full compartment replay'}</button><a href="/cortex/">Original Cortex Laboratory</a></div></section>
    </div></div>
  </section>;
}
