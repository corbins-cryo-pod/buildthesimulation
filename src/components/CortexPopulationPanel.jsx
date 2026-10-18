import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { freshPopulation, planPopulation, populationCapacity, populationCsv } from '../lib/cortex/population.js';
import { encodeJson } from '../lib/cortex/experiment.js';

const seconds = value => `${Math.round(value)} s`;
const sampleColor = cell => cell.status === 'excluded' || cell.unsupportedReason ? '#b58b31'
  : !cell.response ? '#79c9c1' : cell.response.soma.thresholdEventCount > 0 ? '#ee9954'
  : cell.response.membraneThresholdCrossings.compartmentCount > 0 ? '#ab83d4' : '#658dff';
function DistanceMap({ plan, result }) {
  if (!plan) return null;
  const cells = result?.cells ?? plan.cells;
  const [projection, setProjection] = useState('xz');
  const axis = projection === 'xy' ? 1 : 2;
  const span = Math.max(100, ...cells.flatMap(c => c.somaUm.map((v, i) => Math.abs(v - plan.centerUm[i]))));
  const px = c => 210 + (c.somaUm[0] - plan.centerUm[0]) / span * 155;
  const py = c => 180 + (c.somaUm[axis] - plan.centerUm[axis]) / span * 140;
  const maxDistance = Math.max(10, ...cells.map(c => c.distanceFromCenterUm));
  const dx = c => 65 + Math.log10(Math.max(1, c.distanceFromCenterUm)) / Math.log10(maxDistance) * 320;
  const row = c => c.status === 'excluded' || c.unsupportedReason ? 3 : !c.response ? 4
    : c.response.soma.thresholdEventCount > 0 ? 0 : c.response.membraneThresholdCrossings.compartmentCount > 0 ? 1 : 2;
  return <div class="cx-distance-maps">
    <figure><figcaption>Cloud positions · linear physical scale</figcaption>
      <label>Projection <select value={projection} onChange={e => setProjection(e.currentTarget.value)}><option value="xz">X / depth Z</option><option value="xy">X / Y from above</option></select></label>
      <svg viewBox="0 0 420 365" role="img" aria-label="Population soma positions relative to the selected origin">
        <path d="M45 180H375M210 40V320" fill="none" stroke="currentColor" opacity="0.2" />
        <path d="M204 180H216M210 174V186" fill="none" stroke="currentColor" stroke-width="2" />
        <text x="218" y="172" fill="currentColor" font-size="10">origin</text>
        {cells.map((c, i) => <g key={c.id}><circle cx={px(c)} cy={py(c)} r={i ? 4 : 6} fill={sampleColor(c)} stroke="var(--panel)" stroke-width="1"><title>Cell {i + 1}{i ? '' : ' · target'}: {c.distanceFromCenterUm.toFixed(1)} µm from origin. {c.reason ?? c.unsupportedReason ?? (c.response ? `${c.response.soma.thresholdEventCount} soma events` : 'Not calculated')}</title></circle>{(i === 0 || c.distanceFromCenterUm > span / 8) && <text x={px(c) + 5} y={py(c) - 5} fill="currentColor" font-size="9">{i + 1}</text>}</g>)}
        <text x="45" y="347" fill="currentColor" font-size="10">±{Math.round(span)} µm · soma centers; markers enlarged</text>
      </svg>
    </figure>
    <figure><figcaption>Response versus distance · logarithmic axis</figcaption>
      <svg viewBox="0 0 420 365" role="img" aria-label="Sampled cell responses by distance, without an interpolated activation boundary">
        {['Soma event', 'Local only', 'No crossing', 'Unsupported', 'Not run'].map((label, i) => <g key={label}><line x1="65" x2="385" y1={70 + i * 50} y2={70 + i * 50} stroke="currentColor" opacity="0.12" /><text x="5" y={63 + i * 50} fill="currentColor" font-size="10">{label}</text></g>)}
        {[1, 10, 100, 1000].filter(v => v <= maxDistance).map(value => <g key={value}><line x1={dx({ distanceFromCenterUm: value })} x2={dx({ distanceFromCenterUm: value })} y1="50" y2="300" stroke="currentColor" opacity="0.1" /><text x={dx({ distanceFromCenterUm: value })} y="319" text-anchor="middle" fill="currentColor" font-size="11">{value}</text></g>)}
        {cells.map((c, i) => <circle key={c.id} cx={dx(c)} cy={70 + row(c) * 50} r={i ? 5 : 7} fill={sampleColor(c)} stroke="var(--panel)" stroke-width="1"><title>Cell {i + 1}: {c.distanceFromCenterUm.toFixed(2)} µm. {c.reason ?? c.unsupportedReason ?? (c.response ? `${c.response.soma.thresholdEventCount} soma events; ${c.response.membraneThresholdCrossings.compartmentCount} local compartments crossing` : 'Not calculated')}</title></circle>)}
        <text x="65" y="347" fill="currentColor" font-size="10">Soma-center distance from origin / µm</text>
      </svg>
    </figure>
  </div>;
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CortexPopulationPanel({ config, disabled, onBusy, onScene, onTarget, onLoadExample, Trace }) {
  const [settings, setSettings] = useState(freshPopulation);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Choose a population and run the shared stimulation experiment.');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const worker = useRef(null), request = useRef(0), started = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const inputKey = encodeJson({ config, settings });
  useEffect(() => {
    // A config may also be changed through a quick example or import above.
    // Never attach an in-flight result to changed geometry.
    request.current++;
    worker.current?.terminate(); worker.current = null;
    setResult(null); setRunning(false); onBusy(false); setProgress(0); setError('');
  }, [inputKey]);
  const ready = result?.inputKey === inputKey ? result.data : null;
  const state = useMemo(() => {
    try {
      const capacity = populationCapacity(config);
      if (config.protocol.mode !== 'extracellular-stimulation') return { capacity, plan: null, error: '' };
      return { capacity, plan: planPopulation(config, settings, { allowUnsupported: true }), error: '' };
    } catch (e) { return { plan: null, error: e.message }; }
  }, [config, settings]);
  useEffect(() => {
    onScene(state.plan ? { cells: state.plan.cells.map(({ id, offsetUm, unsupportedReason }) => ({ id, offsetUm, unsupportedReason })), responses: ready?.cells ?? null } : null);
  }, [state, ready, onScene]);
  useEffect(() => () => { request.current++; worker.current?.terminate(); }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((performance.now() - started.current) / 1000), 500);
    return () => clearInterval(timer);
  }, [running]);
  const stop = () => {
    request.current++;
    worker.current?.terminate(); worker.current = null;
    setRunning(false); onBusy(false); setProgress(0);
    setStatus('Cancelled. No incomplete population is reported as a result.');
  };
  const run = () => {
    if (!state.plan || state.plan.cells[0].unsupportedReason || disabled) return;
    const id = ++request.current;
    setError(''); setResult(null); setRunning(true); onBusy(true); setElapsed(0); setProgress(0);
    setStatus('Preparing the population'); started.current = performance.now();
    const fail = message => {
      if (id !== request.current) return;
      setError(message); setRunning(false); onBusy(false);
      worker.current?.terminate(); worker.current = null;
    };
    try {
      worker.current ??= new Worker(new URL('../lib/cortex/worker.js', import.meta.url), { type: 'module' });
      worker.current.onmessage = ({ data }) => {
        if (data.id !== request.current) return;
        if (data.type === 'progress') { setProgress(data.progress); setStatus(data.stage); }
        else if (data.type === 'error') fail(data.message);
        else if (data.type === 'result') {
          setResult({ inputKey, data: data.result }); setRunning(false); onBusy(false); setProgress(1);
          setElapsed(data.result.diagnostics.elapsedMs / 1000);
          setStatus('Complete. Target cell detail is available in the main replay above.');
          onTarget(data.result.targetResult);
        }
      };
      worker.current.onerror = () => fail('The population worker failed. Reload and try a smaller population.');
      worker.current.postMessage({ id, config, population: settings });
    } catch (e) { fail(e.message); }
  };
  const somaCells = ready?.cells.filter(c => c.response?.soma.thresholdEventCount > 0).length ?? 0;
  const localCells = ready?.cells.filter(c => c.response?.membraneThresholdCrossings.compartmentCount > 0 && !c.response.soma.thresholdEventCount).length ?? 0;
  const waveformCells = ready?.cells.filter(c => c.response?.soma.waveformEvidenceCount > 0).length ?? 0;
  return <section class="cx-population" id="cx-population" aria-label="Real-model population">
    <div class="cx-population-heading">
      <div><span class="cx-eyebrow">Population experiment</span><h2>Real-model population</h2></div>
      <span class="cx-population-badge">1 source specimen · up to 64 independent cells</span>
    </div>
    <p>The default is a distance cloud: a target cell plus neurons at increasing radii, each in a seeded random direction from stimulating contact A. The initial distance ladder is 1, 2, 5, 12, 20, 28, 40, 60, 85, 120, 170, 240, 340, 480, 680 and 960 µm. Use the seed to reproduce or change the angles.</p>
    <p class="cx-muted">Each supported position runs the published Allen human temporal L2 active cell independently. These are instances of one recorded specimen with reconstructed dendrites, fitted channels and its published synthetic 60 µm axon stub. Cell orientation stays fixed. The cloud is an illustrative placement experiment; close arbors can overlap. No invented morphologies, conductances or network connections.</p>
    <div class="cx-population-controls">
      <fieldset disabled={running || disabled}>
        <label>Arrangement<select value={settings.layout} onChange={e => { const layout = e.currentTarget.value; setSettings(s => ({ ...s, layout, center: layout === 'grid' ? 'target' : layout === 'shells' ? 'stimulus-midpoint' : 'stimulus-a', nearUm: layout === 'cloud' ? 1 : 100, farUm: layout === 'cloud' ? 960 : 600, count: layout === 'cloud' ? 17 : layout === 'shells' ? 25 : 27 })); }}><option value="cloud">Distance cloud · default</option><option value="shells">Concentric distance shells</option><option value="grid">3D grid</option></select></label>
        <label>Origin<select value={settings.center} onChange={e => setSettings(s => ({ ...s, center: e.currentTarget.value }))}><option value="stimulus-a">Stimulating contact A</option><option value="stimulus-midpoint">Stimulating pair midpoint</option><option value="target">Target soma</option></select></label>
        <label>Cells including target<input type="number" min="1" max={state.capacity?.maxCells ?? 64} step="1" value={settings.count}
          onChange={e => setSettings(s => ({ ...s, count: Number(e.currentTarget.value) }))} /></label>
        {settings.layout === 'grid' ? <label>Grid spacing / µm<input type="number" min="75" max="400" step="25" value={settings.spacingUm} onChange={e => setSettings(s => ({ ...s, spacingUm: Number(e.currentTarget.value) }))} /></label> : <>
          <label>Nearest distance / µm<input type="number" min={settings.layout === 'cloud' ? 1 : 75} max="1000" value={settings.nearUm} onChange={e => setSettings(s => ({ ...s, nearUm: Number(e.currentTarget.value) }))} /></label>
          <label>Farthest distance / µm<input type="number" min="2" max={settings.layout === 'cloud' ? 1500 : 1000} value={settings.farUm} onChange={e => setSettings(s => ({ ...s, farUm: Number(e.currentTarget.value) }))} /></label>
          {settings.layout === 'cloud' ? <><label>Angle seed<input type="number" min="0" max="4294967295" value={settings.seed} onChange={e => setSettings(s => ({ ...s, seed: Number(e.currentTarget.value) }))} /></label><button onClick={() => setSettings(s => ({ ...s, seed: (s.seed + 1) >>> 0 }))}>Shuffle angles</button></> : <label>Distance levels<input type="number" min="2" max="5" value={settings.levels} onChange={e => setSettings(s => ({ ...s, levels: Number(e.currentTarget.value) }))} /></label>}
        </>}
        <button onClick={() => onLoadExample(settings.layout === 'cloud' ? 40 : 20)}>Load {settings.layout === 'cloud' ? 40 : 20} µA population stimulus</button>
        <button class="cx-primary" onClick={run} disabled={!state.plan || !!state.plan.cells[0].unsupportedReason}>Run {state.plan?.supportedCells ?? settings.count} supported cells</button>
      </fieldset>
      {running && <button onClick={stop}>Cancel population</button>}
    </div>
    {config.protocol.mode !== 'extracellular-stimulation' && <p>Load the population stimulus to use the single-cell extracellular geometry as the starting configuration. Current clamp remains in the single-cell experiment above.</p>}
    {settings.layout !== 'cloud' && <p class="cx-muted">The measured grid and shell starting preset uses 20 µA. Load that preset explicitly to apply it; selecting a layout leaves the current stimulus unchanged.</p>}
    {state.plan && <p class="cx-population-budget">
      <strong>{state.capacity.maxCells} cells maximum at these solver settings.</strong>{' '}
      {state.capacity.membraneCompartmentsPerCell} membrane compartments per cell · {config.solver.durationMs} ms biological time · dt {config.solver.dtMs} ms.{' '}
      Estimated {seconds(state.plan.estimatedSeconds)} for {state.plan.supportedCells} supported / {settings.count} placed cells; up to {(state.plan.retainedOutputUpperBytes / 1e6).toFixed(1)} MB retained numeric arrays.{' '}
      Routine starting size: 8–16. Timing estimate uses a development CPU, not your browser; larger/finer runs take longer.
    </p>}
    {(error || state.error) && <p class="cx-error" role="alert">{error || state.error}</p>}
    <p aria-live="polite">{result && !ready ? 'Settings changed. Run again to update population results.' : status}{(running || ready) && ` · ${seconds(elapsed)}`}</p>
    {running && <progress aria-label="Population progress" value={progress} max="1" />}
    {!!state.plan?.errors.length && <details class="cx-population-exclusions"><summary>{state.plan.errors.length} unsupported positions · shown in gold, excluded from electrical calculation</summary><p>The existing 25 µm exclusion is measured from the full membrane, not just the soma center. Very close somata can also overlap the ideal source. These samples are neither firing nor inactive: their response is unknown here.</p><ul>{state.plan.errors.map(reason => <li key={reason}>{reason}</li>)}</ul></details>}
    <p class="cx-muted">3D colors: teal = not yet calculated; orange = soma threshold event; purple = local-only crossings; blue = no detected crossings; gold = unsupported placement. These summarize the full run. The target retains its time-varying voltage replay. Applied tissue-field overlays remain separate from cell responses.</p>
    {state.plan && <DistanceMap plan={state.plan} result={ready} />}
    <p class="cx-muted">Distance is measured to soma centers; nearest membrane distance is reported separately. Each point has a different direction as well as distance. This is a sampled response map, not a continuous activation boundary or activation radius.</p>
    {ready && <>
      <div class="cx-population-summary" aria-label="Population response summary">
        <span><b>{ready.diagnostics.simulatedCells} / {ready.cells.length}</b> solved / placed cells</span>
        <span><b>{somaCells}</b> cells with soma threshold events</span>
        <span><b>{waveformCells}</b> cells with overshoot + recovery</span>
        <span><b>{localCells}</b> local crossings without soma event</span>
      </div>
      <div class="cx-population-plots">
        <Trace time={ready.timeMs} title="Population neural recording" unit="µV" series={[
          { label: 'Contact A · sum of neural signals', color: '#367a76', values: ready.neuralUv[0] },
          { label: 'Contact B · sum of neural signals', color: '#9a6b45', values: ready.neuralUv[1] }]} />
        <Trace time={ready.timeMs} title="Applied stimulus artifact · counted once" unit="µV" series={[
          { label: 'Contact A · applied', color: '#6874a9', values: ready.appliedUv[0] },
          { label: 'Contact B · applied', color: '#9a6b45', values: ready.appliedUv[1] }]} />
      </div>
      <div class="cx-population-table"><table><caption>Per-cell evidence · soma and local threshold crossings are separate</caption>
        <thead><tr><th>Cell</th><th>Origin distance / µm</th><th>Nearest source / µm</th><th>Nearest membrane / µm</th><th>Applied |E| at soma / V m⁻¹</th><th>Max |ΔVm| / mV</th><th>Local compartments crossing</th><th>Soma events</th><th>Overshoot + recovery</th><th>First soma / ms</th></tr></thead>
        <tbody>{ready.cells.map((cell, i) => <tr key={cell.id}>
          <td title={cell.reason ?? cell.somaUm.join(', ')}>{i + 1}{i === 0 ? ' · target' : ''}{cell.status === 'excluded' ? ' · unsupported' : ''}</td><td>{cell.distanceFromCenterUm.toFixed(1)}</td>
          <td>{Math.min(...cell.sourceDistancesUm).toFixed(1)}</td><td>{cell.nearestMembraneUm?.toFixed(1) ?? '—'}</td><td>{cell.leadingFieldVPerM?.toFixed(2) ?? '—'}</td>
          <td>{cell.response?.polarization.maxAbsChangeMv.toFixed(2) ?? '—'}</td><td>{cell.response?.membraneThresholdCrossings.compartmentCount ?? '—'}</td>
          <td>{cell.response?.soma.thresholdEventCount ?? '—'}</td><td>{cell.response?.soma.waveformEvidenceCount ?? '—'}</td>
          <td>{cell.response?.soma.firstCrossingTimeMs?.toFixed(3) ?? '—'}</td>
        </tr>)}</tbody></table></div>
      <div class="cx-population-actions">
        <button onClick={() => download(populationCsv(ready), 'cortex-population-traces.csv', 'text/csv')}>Export population traces</button>
        <button onClick={() => download(encodeJson({ ...ready, targetResult: undefined }), 'cortex-population.json', 'application/json')}>Export population + provenance</button>
      </div>
      <p class="cx-muted">{(ready.diagnostics.outputBytes / 1e6).toFixed(2)} MB retained numeric output. Full target traces remain in the single-cell export above; other cells retain soma traces and response evidence. Neural signals sum across cells; total recording adds the shared applied artifact once. No integration timestep or morphology resolution is reduced.</p>
    </>}
    <p class="cx-population-limit">Spatial threshold convergence remains unresolved. Local crossings and sampled action-potential-like waveforms do not establish propagation, biological recruitment or single-neuron selectivity. <a href="/cortex/methods/#populations">Population methods and measured capacity</a>.</p>
  </section>;
}
