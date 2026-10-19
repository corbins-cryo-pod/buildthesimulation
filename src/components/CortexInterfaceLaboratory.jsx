import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { freshInterfaceConfig } from '../lib/cortex/interface-contract.js';
import { INTERFACE_DESIGN } from '../lib/cortex/interface-field.js';
import { decodeInterfaceArchive, encodeInterfaceArchive } from '../lib/cortex/interface-archive.js';
import '../styles/cortex-interface.css';

const palette = ['#79e3cf', '#91c9ff', '#dbb4ff', '#ffbc99', '#9fe3a4', '#f0ce8e', '#a9c8e6', '#f5a7c4'];
const format = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
function download(name, bytes, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([bytes], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Plot({ result, frame, kind, contact, cell, node, signal }) {
  const canvas = useRef(null);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d'); if (!ctx) return;
    const width = 900, height = kind === 'raster' ? 215 : 190;
    el.width = width * 2; el.height = height * 2; ctx.scale(2, 2);
    ctx.fillStyle = '#0c1721'; ctx.fillRect(0, 0, width, height);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#98aab9';
    if (!result) { ctx.fillText('Preparing the first recorded experiment…', 55, height / 2); return; }
    const left = 58, right = width - 18, top = 15, bottom = height - 30;
    const end = result.timeMs.at(-1), x = t => left + t / end * (right - left);
    ctx.lineWidth = 1;
    for (let t = 0; t <= end; t += 50) {
      ctx.strokeStyle = '#20313e'; ctx.beginPath(); ctx.moveTo(x(t), top); ctx.lineTo(x(t), bottom); ctx.stroke();
      ctx.fillStyle = '#91a6b8'; ctx.fillText(`${t}`, x(t) - 8, height - 9);
    }
    ctx.fillText('ms', width - 23, height - 9);
    if (kind === 'raster') {
      const row = (bottom - top) / result.cells.length;
      for (let i = 0; i < result.cells.length; i++) {
        const y = top + row * (i + .5);
        ctx.fillStyle = i === cell ? '#eafff9' : '#8fa4b5'; ctx.fillText(`${i + 1}`, 27, y + 4);
        ctx.strokeStyle = i === cell ? '#92f1d8' : '#779b9a'; ctx.lineWidth = i === cell ? 2 : 1.4;
        for (const t of result.cells[i].spikeTimesMs) {
          ctx.beginPath(); ctx.moveTo(x(t), y - row * .3); ctx.lineTo(x(t), y + row * .3); ctx.stroke();
        }
      }
    } else {
      const selected = result.cells[cell], n = selected.nodes.length;
      const values = kind === 'voltage' ? result.timeMs.map((_, f) => selected.membraneMv[f * n + node])
        : result.timeMs.map((_, f) => (signal !== 'artifact' ? result.neuralUv[f * 8 + contact] : 0)
          + (signal !== 'neural' ? result.artifactUv[f * 8 + contact] : 0));
      // Remove the trace mean for a legible AC recording display; raw values are exported.
      let mean = 0; if (kind === 'recording') mean = values.reduce((a, b) => a + b, 0) / values.length;
      let low = Infinity, high = -Infinity;
      for (const v of values) { low = Math.min(low, v - mean); high = Math.max(high, v - mean); }
      if (kind === 'voltage') { low = Math.min(-85, low); high = Math.max(40, high); }
      else { const limit = Math.max(.05, Math.abs(low), Math.abs(high)) * 1.08; low = -limit; high = limit; }
      const y = v => bottom - (v - low) / (high - low) * (bottom - top);
      for (let i = 0; i < 3; i++) {
        const v = low + (high - low) * i / 2;
        ctx.fillStyle = '#91a6b8'; ctx.fillText(format(v, Math.max(Math.abs(low), Math.abs(high)) < 1 ? 2 : 1), 3, y(v) + 4);
        ctx.strokeStyle = '#20313e'; ctx.beginPath(); ctx.moveTo(left, y(v)); ctx.lineTo(right, y(v)); ctx.stroke();
      }
      ctx.strokeStyle = kind === 'voltage' ? '#a1eddc' : palette[contact]; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let f = 0; f < values.length; f++) { const px = x(result.timeMs[f]), py = y(values[f] - mean); if (!f) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
    }
    const cursor = x(result.timeMs[frame] ?? 0);
    ctx.strokeStyle = '#ffffffa0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cursor, top); ctx.lineTo(cursor, bottom); ctx.stroke();
    if (result.config.mode !== 'recording') {
      ctx.strokeStyle = '#ff9d7b80'; ctx.lineWidth = 2;
      for (let t = result.config.startMs; t + (2 * result.config.phaseUs + result.config.gapUs) / 1000 <= end; t += 1000 / result.config.frequencyHz) {
        ctx.beginPath(); ctx.moveTo(x(t), top); ctx.lineTo(x(t), top + 7); ctx.stroke();
      }
    }
  }, [result, frame, kind, contact, cell, node, signal]);
  return <canvas ref={canvas} class="ci-plot" style={{ aspectRatio: kind === 'raster' ? '900 / 215' : '900 / 190' }} role="img" aria-label={kind === 'raster' ? 'Somatic spike raster for all simulated cells' : kind === 'voltage' ? 'Selected compartment membrane voltage in millivolts' : 'Selected surface contact recording in microvolts'} />;
}

export default function CortexInterfaceLaboratory() {
  const host = useRef(null), view = useRef(null), worker = useRef(null), replayClock = useRef(0), resultRef = useRef(null);
  const exampleRequest = useRef(null);
  const [config, setConfig] = useState(freshInterfaceConfig), [result, setResult] = useState(null);
  const [status, setStatus] = useState('Loading the computed 12-cell recording…'), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0), [speed, setSpeed] = useState(8), [cell, setCell] = useState(0), [node, setNode] = useState(0);
  const [contact, setContact] = useState(3), [signal, setSignal] = useState('neural'), [sceneStatus, setSceneStatus] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [sceneReady, setSceneReady] = useState(0), controlsLocked = useRef(false);
  controlsLocked.current = busy || loading;
  const selected = result?.cells[cell], currentTime = result?.timeMs[frame] ?? 0;
  const dirty = result && JSON.stringify(config) !== JSON.stringify(result.config);
  const patch = values => setConfig(previous => ({ ...previous, ...values }));
  const toggleContact = index => {
    if (controlsLocked.current) return;
    setConfig(previous => ({ ...previous, activeContacts: previous.activeContacts.includes(index)
      ? previous.activeContacts.filter(i => i !== index) : [...previous.activeContacts, index].sort((a, b) => a - b) }));
  };
  const accept = data => {
    resultRef.current = data; setResult(data); setConfig(data.config); setFrame(0);
    setCell(data.config.mode === 'evoked' ? Math.max(0, data.cells.findIndex(c => c.spikeTimesMs.length)) : 0); setNode(0);
    setContact(data.config.activeContacts[0] ?? 3);
    replayClock.current = 0; setPlaying(true); setBusy(false); setLoading(false); setError('');
    setStatus(`${data.cells.length} cells · ${data.compartments.toLocaleString()} compartments · ${data.timeMs.at(-1)} ms computed · ${data.cells.reduce((sum, c) => sum + c.spikeTimesMs.length, 0)} complete somatic events`);
    view.current?.setGeometry({ design: data.design, cells: data.cells });
  };
  useEffect(() => {
    let disposed = false;
    import('../lib/cortex/interface-scene.js').then(({ createInterfaceView }) => {
      if (disposed) return;
      view.current = createInterfaceView(host.current, {
        onSelectCell: (ci, ni) => { setCell(ci); setNode(ni); }, onSelectContact: toggleContact, onStatus: setSceneStatus,
      });
      if (resultRef.current) view.current.setGeometry({ design: resultRef.current.design, cells: resultRef.current.cells });
      else view.current.setGeometry({ design: INTERFACE_DESIGN, cells: [] });
      setSceneReady(n => n + 1);
    }).catch(e => setSceneStatus(e.message));
    const controller = new AbortController();
    (async () => {
      const response = await fetch('/models/cortex/interface/default.bin.gz', { signal: controller.signal });
      if (!response.ok) throw new Error('Saved recording unavailable. Choose Run experiment to compute it locally.');
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      const bytes = await new Response(stream).arrayBuffer();
      if (!disposed) accept(decodeInterfaceArchive(bytes));
    })().catch(e => { if (!disposed) { setLoading(false); setStatus('Ready to compute an experiment.'); setError(e.message); } });
    return () => { disposed = true; controller.abort(); exampleRequest.current?.abort(); worker.current?.terminate(); worker.current = null; view.current?.dispose(); };
  }, []);
  useEffect(() => {
    view.current?.setContacts(config.activeContacts, contact);
    if (result) view.current?.setFrame(result, frame, cell, node, { showLabels });
  }, [result, frame, cell, node, contact, config.activeContacts, showLabels, sceneReady]);
  useEffect(() => {
    if (!playing || !result) return;
    let handle, previous = performance.now();
    const tick = now => {
      const delta = Math.min(100, now - previous); previous = now;
      replayClock.current = (replayClock.current + delta * speed / 1000) % result.timeMs.at(-1);
      setFrame(Math.min(result.timeMs.length - 1, Math.round(replayClock.current / result.config.sampleMs)));
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick); return () => cancelAnimationFrame(handle);
  }, [playing, result, speed]);
  const run = () => {
    worker.current?.terminate(); setPlaying(false); setBusy(true); setError(''); setStatus('Preparing the full compartment experiment…');
    try {
    const next = new Worker(new URL('../lib/cortex/interface-worker.js', import.meta.url), { type: 'module' }); worker.current = next;
    next.onmessage = ({ data }) => {
      if (worker.current !== next) return;
      if (data.type === 'progress') setStatus(`${data.message} · computation can take a few minutes for 12 cells`);
      if (data.type === 'geometry') { view.current?.setGeometry(data); setResult(null); resultRef.current = null; setFrame(0); setCell(0); setNode(0); }
      if (data.type === 'result') { accept(data.result); next.terminate(); worker.current = null; }
      if (data.type === 'error') { setError(data.message); setBusy(false); setStatus('Experiment stopped without dropping cells or clipping voltages.'); next.terminate(); worker.current = null; }
    };
    next.onerror = e => { if (worker.current !== next) return; setError(e.message || 'The simulation worker stopped.'); setBusy(false); next.terminate(); worker.current = null; };
    next.postMessage({ config });
    } catch (e) { worker.current?.terminate(); worker.current = null; setBusy(false); setError(e.message); }
  };
  const loadExample = async name => {
    exampleRequest.current?.abort(); const controller = new AbortController(); exampleRequest.current = controller;
    setLoading(true); setPlaying(false); setError(''); setStatus(`Loading the computed ${name === 'evoked' ? 'stimulation' : 'ongoing firing'} example…`);
    try {
      const response = await fetch(`/models/cortex/interface/${name}.bin.gz`, { signal: controller.signal });
      if (!response.ok) throw new Error('The saved example could not be loaded. Run experiment to calculate a new result.');
      const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if (!controller.signal.aborted) accept(decodeInterfaceArchive(bytes));
    } catch (e) { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } }
  };
  const metrics = useMemo(() => {
    if (!result) return [];
    return INTERFACE_DESIGN.contacts.map((pad, k) => {
      let min = Infinity, max = -Infinity;
      for (let f = 0; f < result.timeMs.length; f++) { const v = result.neuralUv[f * 8 + k]; min = Math.min(min, v); max = Math.max(max, v); }
      return { ...pad, peakToPeakUv: max - min };
    });
  }, [result]);
  const exportSummary = () => {
    if (!result) return;
    download('interface-experiment.json', JSON.stringify({ ...result, timeMs: Array.from(result.timeMs),
      neuralUv: Array.from(result.neuralUv), artifactUv: Array.from(result.artifactUv), currentUa: Array.from(result.currentUa),
      cells: result.cells.map(c => ({ ...c, nodes: undefined, membraneMv: undefined,
        somaMv: Array.from(c.somaMv), somaSodiumNa: Array.from(c.somaSodiumNa), somaPotassiumNa: Array.from(c.somaPotassiumNa),
        somaCalciumNa: Array.from(c.somaCalciumNa), somaInjectionNa: Array.from(c.somaInjectionNa) })),
      exportScope: 'Protocol, source provenance, contact signals, soma traces and events. Full compartment arrays are available in the binary replay export.' }, null, 2));
  };
  const exportReplay = async () => {
    if (!result) return;
    const stream = new Blob([encodeInterfaceArchive(result)]).stream().pipeThrough(new CompressionStream('gzip'));
    download('interface-replay.bin.gz', await new Response(stream).arrayBuffer(), 'application/gzip');
  };
  return <section class="ci-lab" aria-label="Neural Interface Laboratory">
    <header class="ci-heading">
      <div><div class="ci-eyebrow"><span /> CORTEX / INTEGRATED EXPERIMENT</div><h1>Neural Interface Laboratory</h1>
        <p>One shank. Twelve human neurons. A shared field for stimulation and recording.</p></div>
      <a class="ci-method-link" href="/cortex/interface/methods/">Model &amp; evidence <span>↗</span></a>
    </header>
    <div class="ci-workspace">
      <aside class="ci-controls">
        <div class="ci-section-title"><span>01</span> Experiment</div>
        <div class="ci-examples"><span>Computed examples</span><div><button disabled={busy || loading} onClick={() => loadExample('default')}>Ongoing firing</button><button disabled={busy || loading} onClick={() => loadExample('evoked')}>Evoked spikes</button></div></div>
        <label>Protocol<select value={config.mode} disabled={busy || loading} onChange={e => patch({ mode: e.currentTarget.value })}>
          <option value="recording">Record ongoing firing</option><option value="evoked">Stimulate resting cells</option><option value="combined">Background + stimulation</option>
        </select></label>
        <div class="ci-two"><label>Cells<select value={config.count} disabled={busy || loading} onChange={e => patch({ count: +e.currentTarget.value })}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
          <label>Clearance · µm<input type="number" min="25" max="200" step="5" value={config.clearanceUm} disabled={busy || loading} onChange={e => patch({ clearanceUm: +e.currentTarget.value })} /></label></div>
        <label>Recording window · ms<select value={config.durationMs} disabled={busy || loading} onChange={e => patch({ durationMs: +e.currentTarget.value })}>{[100,260,300].map(v => <option key={v}>{v}</option>)}</select></label>
        <p class="ci-hint">Every cell uses its full reconstruction and fitted membrane channels. Background firing is driven by calibrated somatic current.</p>
        <div class="ci-section-title"><span>02</span> Surface contacts</div>
        <p class="ci-hint">Select pads to stimulate. Choose a recording contact below the scene. All eight contacts are recorded.</p>
        <div class="ci-contacts">{INTERFACE_DESIGN.contacts.map(pad => <button key={pad.id} disabled={busy || loading} class={config.activeContacts.includes(pad.index) ? 'ci-pad selected' : 'ci-pad'} aria-pressed={config.activeContacts.includes(pad.index)} onClick={() => toggleContact(pad.index)}>
          <b>{pad.label}</b><span>{pad.widthUm} × {pad.heightUm}<small>µm · {pad.areaUm2} µm²</small></span><i>{config.activeContacts.includes(pad.index) ? '●' : '○'}</i>
        </button>)}</div>
        <div class="ci-two"><label>Total current · µA<input type="number" min="0" max="100" step="1" value={config.amplitudeUa} disabled={busy || loading || config.mode === 'recording'} onChange={e => patch({ amplitudeUa: +e.currentTarget.value })} /></label>
          <label>Train · Hz<select value={config.frequencyHz} disabled={busy || loading || config.mode === 'recording'} onChange={e => patch({ frequencyHz: +e.currentTarget.value })}>{[10,20,40,50,100].map(v => <option key={v}>{v}</option>)}</select></label></div>
        <label>Phase duration · µs<select value={config.phaseUs} disabled={busy || loading || config.mode === 'recording'} onChange={e => patch({ phaseUs: +e.currentTarget.value })}>{[100,200,500,1000].map(v => <option key={v}>{v}</option>)}</select></label>
        <p class="ci-hint">Cathodic first, balanced biphasic pulses from {config.startMs} ms; 100 µs gap. Total current is shared equally across selected pads. Inactive pads float.</p>
        <button class="ci-run" onClick={run} disabled={busy || loading}>{busy ? 'Solving membrane dynamics…' : 'Run experiment'} <span>→</span></button>
        {busy && <button class="ci-secondary" onClick={() => { worker.current?.terminate(); worker.current = null; setBusy(false); setStatus('Computation stopped. Choose Run experiment to restart.'); }}>Stop computation</button>}
        {dirty && !busy && <p class="ci-pending">Controls changed. Run to update the recorded experiment.</p>}
        <div class="ci-design-note"><b>A test interface, physically scaled</b><p>90 × 20 µm shank · 1.8 mm long · 300 µm pointed tip. Mixed contact sizes, inspired by Neuropixels. A hypothetical test design, not a demonstrated optimum.</p><a href="/devices/">Device catalogue ↗</a></div>
      </aside>
      <div class="ci-main">
        <section class="ci-scene-card">
          <div class="ci-card-heading"><div><span class="ci-section-label">LIVE REPLAY</span><h2>Membrane activity</h2></div><div class="ci-view-buttons">{['oblique','front','side'].map(name => <button key={name} onClick={() => view.current?.setView(name)}>{name}</button>)}<button onClick={() => view.current?.setView('cell', cell)}>Focus cell</button></div></div>
          <div ref={host} class="ci-scene" aria-label="Single pointed electrode shank and complete human neurons with membrane voltage replay" />
          <div class="ci-scene-footer"><span>Drag to orbit · scroll to zoom · click a branch to inspect</span><label><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.currentTarget.checked)} /> Labels</label></div>
          <div class="ci-voltage-key"><span>Membrane voltage</span><span>−100 mV</span><i /><span>+40 mV</span><span>Same voltage scale for every cell</span></div>
          {sceneStatus && <p class="ci-hint">{sceneStatus}</p>}
          <div class="ci-transport"><button onClick={() => setPlaying(!playing)} disabled={!result}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button>
            <input aria-label="Replay time" type="range" min="0" max={(result?.timeMs.length ?? 1) - 1} value={frame} disabled={!result} onInput={e => { const f = +e.currentTarget.value; setFrame(f); replayClock.current = result.timeMs[f]; }} />
            <output>{format(currentTime)} <small>ms</small></output><select aria-label="Replay speed" value={speed} onChange={e => setSpeed(+e.currentTarget.value)}>{[2,8,20,50].map(v => <option key={v} value={v}>{v} ms / sec</option>)}</select>
          </div>
          <p class="ci-replay-note">Slow-motion loop of one computed {result?.config.durationMs ?? config.durationMs} ms window. Colors show each compartment’s solved voltage; replay does not generate new spikes.</p>
        </section>
        <div class="ci-status" role="status" aria-live="polite"><span class={busy || loading ? 'working' : ''} />{status}</div>
        {error && <p class="ci-error" role="alert">{error}</p>}
        <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">INTRACELLULAR</span><h2>Inspect a cell</h2></div>
          <div class="ci-inline"><label>Cell<select value={cell} disabled={!result} onChange={e => { setCell(+e.currentTarget.value); setNode(0); }}>{result?.cells.map((c, i) => <option key={c.id + i} value={i}>{i + 1} · {c.specimenId}</option>)}</select></label>
            <label>Compartment<select value={node} disabled={!selected} onChange={e => setNode(+e.currentTarget.value)}>{selected?.nodes.map((n, i) => <option key={i} value={i}>{i === selected.somaIndex ? 'Soma' : `${n.sectionType} ${n.sectionId} · ${i}`}</option>)}</select></label></div></div>
          <div class="ci-readouts"><div><span>Selected Vm</span><b>{format(selected?.membraneMv[frame * selected.nodes.length + node])} <small>mV</small></b></div><div><span>Somatic events</span><b>{selected?.spikeTimesMs.length ?? '—'} <small>/ window</small></b></div><div><span>Somatic drive</span><b>{format(selected?.backgroundNa, 2)} <small>nA</small></b></div><div><span>Specimen</span><b>{selected?.specimenId ?? '—'}</b></div></div>
          <Plot result={result} frame={frame} kind="voltage" cell={cell} node={node} />
          <p class="ci-hint">{selected ? `${selected.cellType} · ${selected.nodes.length} compartments. ` : ''}Select any soma, dendrite or axon compartment to follow membrane voltage across the cell in mV. Click a branch in the 3D view to select it.</p>
          {selected && <div class="ci-ionic"><span>Soma outward ionic currents at this frame:</span><span>Na⁺ <b>{format(selected.somaSodiumNa[frame], 3)} nA</b></span><span>K⁺ <b>{format(selected.somaPotassiumNa[frame], 3)} nA</b></span><span>Ca²⁺ <b>{format(selected.somaCalciumNa[frame], 3)} nA</b></span></div>}
        </section>
        <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">EXTRACELLULAR</span><h2>Surface recording <small>µV</small></h2></div><div class="ci-inline">
          <label>Contact<select value={contact} onChange={e => setContact(+e.currentTarget.value)}>{INTERFACE_DESIGN.contacts.map(c => <option key={c.id} value={c.index}>{c.label} · {c.widthUm} × {c.heightUm} µm</option>)}</select></label>
          <label>Signal<select value={signal} onChange={e => setSignal(e.currentTarget.value)}><option value="neural">Neural contribution</option><option value="artifact">Direct stimulus artifact</option><option value="total">Neural + artifact</option></select></label></div></div>
          <Plot result={result} frame={frame} kind="recording" contact={contact} cell={cell} signal={signal} />
          <div class="ci-contact-metrics">{metrics.map(m => <button key={m.id} class={contact === m.index ? 'active' : ''} onClick={() => setContact(m.index)}><span>Contact {m.label}</span><b>{format(m.peakToPeakUv, 2)} <small>µV p–p</small></b><small>{m.areaUm2} µm²</small></button>)}</div>
          <p class="ci-hint">Ideal contact voltage from all cells’ membrane currents and the same reciprocal finite-contact field. Plot is mean-subtracted; exports contain raw values. Differences reflect both contact geometry and position. No noise, electrode impedance, amplifier or spike sorting is modeled.</p>
        </section>
        <section class="ci-data-card"><div class="ci-card-heading"><div><span class="ci-section-label">POPULATION</span><h2>Somatic spike raster</h2></div><span class="ci-small">{result?.cells.length ?? 12} independent cells</span></div>
          <Plot result={result} frame={frame} kind="raster" cell={cell} />
          <p class="ci-hint">Ticks require a −25 mV upward crossing, a peak ≥ 0 mV and return below −40 mV. These are known simulated soma events, not spikes detected or sorted from the contact trace. Coral marks show stimulus times; coincidence alone does not establish causation.</p>
        </section>
        <section class="ci-scope"><div><h2>What this experiment establishes</h2><p>All cells run the original human active membrane models. Stimulation and recording share one coupled finite surface-contact solution. The visible shank uses a <b>planar insulating backing approximation</b>: its tip, sides and back do not yet shape the field. This complete configuration is exploratory and has not been independently validated.</p><a href="/cortex/interface/methods/">Read equations, provenance and validation scope ↗</a></div><div class="ci-exports"><button disabled={!result} onClick={exportSummary}>Export signals &amp; protocol</button><button disabled={!result} onClick={exportReplay}>Export full compartment replay</button><a href="/cortex/">Original Cortex Laboratory</a></div></section>
      </div>
    </div>
  </section>;
}
