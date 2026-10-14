import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  freshConfig,
  freshActiveConfig,
  ENGINE_VERSION,
  ACTIVE_ENGINE_VERSION,
} from '../lib/cortex/config.js';
import { makeWorld, placedContacts } from '../lib/cortex/world.js';
import { getDeviceModel } from '../lib/devices/catalog.js';
import { modelRegistry, ACTIVE_MODEL_ID, PASSIVE_MODEL_ID } from '../lib/cortex/model-registry.js';
import {
  runExperiment,
  encodeJson,
  resultBundle,
  resultCsv,
  parseConfig,
  fieldSection,
} from '../lib/cortex/experiment.js';
import '../styles/cortex-laboratory.css';

const format = (value) =>
  !Number.isFinite(value)
    ? '—'
    : Math.abs(value) > 0 && Math.abs(value) < 0.001
      ? value.toExponential(2)
      : value.toFixed(Math.abs(value) < 1 ? 4 : 2);
function save(content, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function NumberControl({ label, value, min, max, step = 1, onChange }) {
  return (
    <label class="cx-number">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (e.currentTarget.value !== '') onChange(Number(e.currentTarget.value));
        }}
      />
    </label>
  );
}
function Trace({ time, series, unit, title, frame = 0, spikes = [] }) {
  const w = 440,
    h = 156,
    l = 57,
    r = 10,
    top = 17,
    bottom = 27;
  let low = Infinity,
    high = -Infinity;
  for (const s of series)
    for (const v of s.values) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  const span = Math.max(1e-8, high - low),
    margin = Math.max(span * 0.1, high === low ? Math.max(0.001, Math.abs(high) * 0.01) : 0);
  low -= margin;
  high += margin;
  const x = (t) => l + (t / (time.at(-1) || 1)) * (w - l - r),
    y = (v) => top + ((high - v) / (high - low)) * (h - top - bottom);
  // Keep extrema in every pixel bucket; narrow pulses must not disappear in a decimated plot.
  function path(values) {
    const points = [],
      bucket = Math.max(1, Math.floor(values.length / 380));
    for (let start = 0; start < values.length; start += bucket) {
      let min = start,
        max = start;
      for (let i = start; i < Math.min(values.length, start + bucket); i++) {
        if (values[i] < values[min]) min = i;
        if (values[i] > values[max]) max = i;
      }
      [...new Set([start, min, max, Math.min(values.length - 1, start + bucket - 1)])]
        .sort((a, b) => a - b)
        .forEach((i) => points.push(`${x(time[i]).toFixed(2)},${y(values[i]).toFixed(2)}`));
    }
    return points.join(' ');
  }
  return (
    <figure class="cx-trace">
      <figcaption>
        {title}
        <span>{unit}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${title}, ${unit}, 0 to ${time.at(-1)} milliseconds`}
      >
        {[low, (low + high) / 2, high].map((v) => (
          <g>
            <line x1={l} x2={w - r} y1={y(v)} y2={y(v)} class="cx-gridline" />
            <text x={l - 7} y={y(v) + 4} text-anchor="end">
              {format(v)}
            </text>
          </g>
        ))}
        {[0, time.at(-1) / 2, time.at(-1)].map((t) => (
          <text x={x(t)} y={h - 7} text-anchor="middle">
            {format(t)} ms
          </text>
        ))}
        {series.map((s) => (
          <polyline points={path(s.values)} fill="none" stroke={s.color} stroke-width="1.6" />
        ))}
        {spikes.map((s) => (
          <line x1={x(s.timeMs)} x2={x(s.timeMs)} y1={top} y2={top + 10} stroke="#b3532e">
            <title>Computed crossing at {format(s.timeMs)} ms</title>
          </line>
        ))}
        <line
          x1={x(time[frame] ?? 0)}
          x2={x(time[frame] ?? 0)}
          y1={top}
          y2={h - bottom}
          class="cx-cursor"
        />
      </svg>
      <div class="cx-trace-legend">
        {series.map((s) => (
          <span>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
function FieldSection({ world }) {
  const map = useMemo(() => fieldSection(world), [world]);
  const [hover, setHover] = useState(null),
    size = map.size,
    cell = 300 / size,
    limitMv = 2;
  useEffect(() => setHover(null), [world]);
  return (
    <div class="cx-field">
      <svg
        viewBox="0 0 342 345"
        role="img"
        aria-label="Calculated X-Z potential section through soma, cathodic leading phase, fixed range minus 2 to plus 2 millivolts"
      >
        <rect width="342" height="345" fill="#111f26" />
        {map.values.map((v, i) => {
          const weight = v ? Math.min(1, Math.abs(v.potentialMv) / limitMv) : 0;
          const color = v
            ? v.potentialMv < 0
              ? `rgb(${35 + 30 * weight},${60 + 85 * weight},${76 + 160 * weight})`
              : `rgb(${35 + 217 * weight},${60 + 104 * weight},${76 - 10 * weight})`
            : '#eee';
          return (
            <rect
              x={30 + (i % size) * cell}
              y={12 + Math.floor(i / size) * cell}
              width={cell + 0.1}
              height={cell + 0.1}
              fill={color}
              onPointerMove={() => setHover(v)}
            >
              <title>
                {v
                  ? `X ${v.pointUm[0].toFixed(0)} µm, Z ${v.pointUm[2].toFixed(0)} µm: ${v.potentialMv.toFixed(5)} mV; |E| ${Math.hypot(...v.fieldVPerM).toFixed(3)} V/m`
                  : 'Excluded near source'}
              </title>
            </rect>
          );
        })}
        <text x="180" y="335" fill="#dae5e8" text-anchor="middle">
          X · {map.widthUm / 1000} mm window
        </text>
        <text x="16" y="165" fill="#dae5e8" transform="rotate(-90 16 165)" text-anchor="middle">
          Depth +Z ↓
        </text>
      </svg>
      <p>
        −2 mV <span class="cx-field-gradient" /> +2 mV · values beyond range saturate
      </p>
      <p>
        Section Y = {format(map.yUm)} µm.{' '}
        {hover
          ? `X ${format(hover.pointUm[0])}, Z ${format(hover.pointUm[2])} µm · ${format(hover.potentialMv)} mV · ${format(Math.hypot(...hover.fieldVPerM))} V/m`
          : 'Hover to inspect calculated values.'}
      </p>
      <p class="cx-muted">
        Leading phase only. Layers and implant bodies do not modify this homogeneous field.
      </p>
    </div>
  );
}

export default function CortexLaboratory() {
  const [config, setConfig] = useState(freshConfig),
    [result, setResult] = useState(null),
    [pinned, setPinned] = useState(null);
  const [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState('');
  const [viewStatus, setViewStatus] = useState('Loading 3D workspace…'),
    [scale, setScale] = useState({ pixels: 80, label: '100 µm' });
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [selected, setSelected] = useState(0);
  const [section, setSection] = useState(true),
    [opacity, setOpacity] = useState(0.12),
    [projection, setProjection] = useState(false),
    [fieldVisible, setFieldVisible] = useState(false),
    [component, setComponent] = useState('neural');
  const host = useRef(null),
    view = useRef(null),
    worker = useRef(null),
    runId = useRef(0),
    importInput = useRef(null),
    mounted = useRef(true);
  const state = useMemo(() => {
    try {
      return { world: makeWorld(config), error: '' };
    } catch (e) {
      return { world: null, error: e.message };
    }
  }, [config]);
  const active = !!config.neuron.modelId,
    model = modelRegistry.find((m) => m.id === (config.neuron.modelId ?? PASSIVE_MODEL_ID));
  const world = state.world,
    stale = !!result && encodeJson(result.config) !== encodeJson(config),
    ready = result && !stale && world ? result : null;
  const latest = useRef({ world, section, opacity, ready, frame, selected, projection });
  latest.current = { world, section, opacity, ready, frame, selected, projection };
  const edit = (group, key, value) => {
    setConfig((c) => ({ ...c, [group]: { ...c[group], [key]: value } }));
    setPlaying(false);
    setError('');
  };
  const editVector = (group, key, axis, value) =>
    edit(
      group,
      key,
      config[group][key].map((x, i) => (i === axis ? value : x)),
    );
  const cancel = () => {
    runId.current++;
    worker.current?.terminate();
    worker.current = null;
    setRunning(false);
    setProgress(0);
  };
  async function run() {
    setError('');
    setPlaying(false);
    try {
      const valid = makeWorld(config).config;
      if (running) cancel();
      else runId.current++;
      const id = ++runId.current;
      setRunning(true);
      setProgress(0);
      const finish = (r) => {
        if (!mounted.current || id !== runId.current) return;
        setResult(r);
        setFrame(0);
        setRunning(false);
        setProgress(1);
      };
      const fail = (message) => {
        if (!mounted.current || id !== runId.current) return;
        setError(message);
        setRunning(false);
        worker.current?.terminate();
        worker.current = null;
      };
      try {
        worker.current ??= new Worker(new URL('../lib/cortex/worker.js', import.meta.url), {
          type: 'module',
        });
      } catch {
        if (valid.neuron.modelId || Math.ceil(valid.solver.durationMs / valid.solver.dtMs) > 5000) {
          fail(
            'Workers are unavailable. The active model requires a worker; passive CPU fallback supports at most 5,000 steps.',
          );
          return;
        }
        setViewStatus('Bounded main-thread CPU fallback');
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (id === runId.current) finish(runExperiment(valid));
        return;
      }
      worker.current.onmessage = ({ data }) => {
        if (data.id !== runId.current) return;
        if (data.type === 'progress') setProgress(data.progress);
        else if (data.type === 'result') finish(data.result);
        else if (data.type === 'error') fail(data.message);
      };
      worker.current.onerror = () =>
        fail('The numerical worker failed to load or execute. Reload the page and try again.');
      worker.current.postMessage({ id, config: valid });
    } catch (e) {
      setError(e.message);
      setRunning(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    import('../lib/cortex/scene.js')
      .then(async ({ createCortexView }) => {
        if (cancelled || !host.current) return;
        const api = await createCortexView(
          host.current,
          (s) => !cancelled && setViewStatus(s),
          (s) => !cancelled && setScale(s),
          (s) => !cancelled && setSelected(s),
        );
        if (cancelled) {
          api.dispose();
          return;
        }
        view.current = api;
        const s = latest.current;
        if (s.world) {
          api.setWorld(s.world, s);
          api.setProjection(s.projection);
          api.setFrame(s.ready || null, s.frame, s.selected);
        }
      })
      .catch(() => {
        if (!cancelled)
          setViewStatus('3D unavailable · numerical experiments and exports remain available');
      });
    run();
    return () => {
      cancelled = true;
      mounted.current = false;
      runId.current++;
      worker.current?.terminate();
      view.current?.dispose();
    };
  }, []);
  useEffect(() => {
    setSelected(0);
    setPlaying(false);
  }, [config.neuron.modelId, config.neuron.segmentLengthUm]);
  useEffect(() => view.current?.setProjection(projection), [projection]);
  useEffect(() => {
    if (world && view.current) {
      view.current.setWorld(world, { section, opacity });
      view.current.setFrame(ready || null, frame, selected);
    }
  }, [world, section, opacity]);
  useEffect(() => {
    view.current?.setFrame(ready || null, frame, selected);
  }, [ready, frame, selected]);
  useEffect(() => {
    if (!playing || !ready) return;
    // Replay is intentionally slowed to 10 biological ms/s; integration is already complete.
    const timer = setInterval(
      () =>
        setFrame((f) => {
          const next = Math.min(
            result.timeMs.length - 1,
            f + Math.max(1, Math.round(0.5 / (config.solver.sampleMs ?? config.solver.dtMs))),
          );
          if (next === result.timeMs.length - 1) setPlaying(false);
          return next;
        }),
      50,
    );
    return () => clearInterval(timer);
  }, [playing, ready]);
  const contacts = useMemo(() => {
      try {
        return placedContacts(getDeviceModel(config.implant.deviceId), config.implant);
      } catch {
        return [];
      }
    }, [config.implant]),
    selectedNode = world?.neuron.nodes[Math.min(selected, (world?.neuron.nodes.length ?? 1) - 1)];
  const traces = useMemo(() => {
    if (!ready) return null;
    const n = result.diagnostics.compartments,
      index = Math.min(selected, n - 1),
      pair = result[`${component}Uv`];
    return {
      pair,
      differential: Float64Array.from(pair[0], (v, i) => v - pair[1][i]),
      voltage: Float64Array.from(result.timeMs, (_, k) => result.membraneMv[k * n + index]),
      current: Float64Array.from(result.timeMs, (_, k) => result.membraneCurrentNa[k * n + index]),
      soma: Float64Array.from(
        result.timeMs,
        (_, k) => result.membraneMv[k * n + (result.somaIndex ?? 0)],
      ),
    };
  }, [ready, result, component, selected]);
  const selector = (label, ids, onChange) => (
    <div class="cx-pair">
      {ids.map((id, i) => (
        <label>
          {label} {i === 0 ? 'A' : 'B'}
          <select
            value={id}
            onChange={(e) => onChange(ids.map((v, j) => (j === i ? e.currentTarget.value : v)))}
          >
            {contacts.map((s) => (
              <option value={s.id} disabled={ids.some((other, j) => j !== i && other === s.id)}>
                {s.id}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
  return (
    <section class="cortex-lab">
      <header class="cx-heading">
        <div>
          <p class="cx-eyebrow">Cortex Laboratory · active reference 02</p>
          <h1>From membrane to contact.</h1>
          <p>Place a real array. Follow calculated currents through a shared cortical scene.</p>
        </div>
        <a href="/cortex/methods/">Equations, evidence & scope →</a>
      </header>
      <div class="cx-scope">
        <strong>
          {active ? 'Human temporal cell · published active model' : 'Exploratory passive model'}
        </strong>
        <span>
          {active
            ? 'Reconstructed dendrites · synthetic axon stub · no independent experimental validation'
            : 'Numerical verification · no experimental validation · no action potentials'}
        </span>
      </div>
      <div class="cx-lab-grid">
        <aside class="cx-config">
          <fieldset disabled={running}>
            <details open>
              <summary>01 / Experiment</summary>
              <label>
                Neuron model
                <select
                  value={config.neuron.modelId ?? PASSIVE_MODEL_ID}
                  onChange={(e) => {
                    setConfig(
                      e.currentTarget.value === ACTIVE_MODEL_ID
                        ? freshActiveConfig()
                        : freshConfig(),
                    );
                    setSelected(0);
                    setPlaying(false);
                    setError('');
                  }}
                >
                  {modelRegistry.map((m) => (
                    <option value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
              <p class="cx-muted">
                {model?.scope} <a href={model?.source}>Model source →</a>
              </p>
              {active && (
                <p class="cx-muted">
                  34 °C · fitted channel distributions · {config.solver.settleMs} ms initialization
                  conditioning. Detailed runs can take several seconds; repeat runs reuse identical
                  conditioning.
                </p>
              )}
              <label>
                Protocol
                <select
                  value={config.protocol.mode}
                  onChange={(e) => edit('protocol', 'mode', e.currentTarget.value)}
                >
                  <option value="synaptic-recording">Record a synaptic response</option>
                  <option value="extracellular-stimulation">Extracellular polarization</option>
                  <option value="intracellular-current">Intracellular current clamp</option>
                </select>
              </label>
              {config.protocol.mode === 'synaptic-recording' ? (
                <>
                  <NumberControl
                    label="Total synaptic conductance · nS"
                    value={config.protocol.synapseNs}
                    min={0}
                    max={active ? 100 : 5}
                    step={0.1}
                    onChange={(v) => edit('protocol', 'synapseNs', v)}
                  />
                  <p class="cx-muted">
                    {active
                      ? world?.neuron.synapseDescription
                      : 'A step conductance across the distal 100 µm of the apical branch.'}{' '}
                    Total membrane currents generate the recording.
                  </p>
                </>
              ) : config.protocol.mode === 'intracellular-current' ? (
                <>
                  <NumberControl
                    label="Soma current · nA"
                    value={config.protocol.injectionNa}
                    min={active ? -1 : -0.2}
                    max={active ? 2 : 0.2}
                    step={0.01}
                    onChange={(v) => edit('protocol', 'injectionNa', v)}
                  />
                  <p class="cx-muted">
                    Includes a point bath return at [{config.protocol.bathReturnUm.join(', ')}] µm.
                    This is distinct from extracellular stimulation.
                  </p>
                </>
              ) : (
                <>
                  {selector('Stimulating site', config.protocol.sourceContactIds, (v) =>
                    edit('protocol', 'sourceContactIds', v),
                  )}
                  <NumberControl
                    label="Phase current magnitude · µA"
                    value={config.protocol.amplitudeUa}
                    min={0}
                    max={active ? 100 : 10}
                    step={0.1}
                    onChange={(v) => edit('protocol', 'amplitudeUa', v)}
                  />
                  <NumberControl
                    label="Phase width · µs"
                    value={config.protocol.phaseUs}
                    min={50}
                    max={1000}
                    step={25}
                    onChange={(v) => edit('protocol', 'phaseUs', v)}
                  />
                  <NumberControl
                    label="Interphase gap · µs"
                    value={config.protocol.gapUs}
                    min={0}
                    max={1000}
                    step={25}
                    onChange={(v) => edit('protocol', 'gapUs', v)}
                  />
                  <p class="cx-muted">
                    One balanced biphasic pulse. A is cathodic first; B is its local return. Ideal
                    point sources at apices, without an electrode interface model.
                  </p>
                </>
              )}
              {active && config.protocol.mode === 'extracellular-stimulation' && (
                <button
                  type="button"
                  onClick={() => {
                    const c = freshActiveConfig();
                    c.protocol.mode = 'extracellular-stimulation';
                    c.protocol.amplitudeUa = 40;
                    c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
                    c.recording.contactIds = ['r3-c3', 'r3-c6'];
                    setConfig(c);
                    setSelected(0);
                    setPlaying(false);
                  }}
                >
                  Load reference extracellular configuration
                </button>
              )}
              <NumberControl
                label="Onset · ms"
                value={config.protocol.startMs}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => edit('protocol', 'startMs', v)}
              />
              {config.protocol.mode !== 'extracellular-stimulation' && (
                <NumberControl
                  label="Drive duration · ms"
                  value={config.protocol.durationMs}
                  min={0.1}
                  max={10}
                  step={0.5}
                  onChange={(v) => edit('protocol', 'durationMs', v)}
                />
              )}
            </details>
            <details open>
              <summary>02 / Implant & recording</summary>
              <p class="cx-device-name">Utah Array · 1.5 mm</p>
              <p class="cx-muted">
                100 physical shanks · 96 nominal channels · channel map unknown. Sampling sites
                below are ideal probes.
              </p>
              {['X translation · µm', 'Y translation · µm', 'Substrate depth · µm'].map(
                (label, i) => (
                  <NumberControl
                    label={label}
                    value={config.implant.translationUm[i]}
                    min={-2000}
                    max={2000}
                    step={25}
                    onChange={(v) => editVector('implant', 'translationUm', i, v)}
                  />
                ),
              )}
              <div class="cx-pair">
                {[
                  ['Tilt Y · °', 1],
                  ['Rotate Z · °', 2],
                ].map(([label, i]) => (
                  <NumberControl
                    label={label}
                    value={config.implant.rotationDeg[i]}
                    min={-180}
                    max={180}
                    step={5}
                    onChange={(v) => editVector('implant', 'rotationDeg', i, v)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  editVector('implant', 'translationUm', 0, config.implant.translationUm[0] - 100)
                }
              >
                Move array −100 µm in X
              </button>
              {selector('Recording site', config.recording.contactIds, (v) =>
                edit('recording', 'contactIds', v),
              )}
              <label>
                Reference
                <select
                  value={config.recording.reference}
                  onChange={(e) => edit('recording', 'reference', e.currentTarget.value)}
                >
                  <option value="infinity">Remote infinity · show A and B</option>
                  <option value="bipolar">Bipolar · A minus B</option>
                </select>
              </label>
              <a href="/devices/01-utah-microelectrode-array/#model-3d">
                Catalog geometry & sources →
              </a>
            </details>
            <details>
              <summary>03 / Anatomy & membrane</summary>
              <p class="cx-muted">
                {active
                  ? 'Human middle temporal layer-2 spiny dendrites in an illustrative slab; the published model uses a synthetic active axon stub. Placement depth does not change its cortical identity.'
                  : 'Representative slab, synthetic layer fractions and one idealized passive arbor.'}
              </p>
              <NumberControl
                label="Cortical thickness · µm"
                value={config.anatomy.thicknessUm}
                min={3000}
                max={5000}
                step={100}
                onChange={(v) => edit('anatomy', 'thicknessUm', v)}
              />
              {['Soma X · µm', 'Soma Y · µm', 'Soma depth · µm'].map((label, i) => (
                <NumberControl
                  label={label}
                  value={config.neuron.somaUm[i]}
                  min={i === 2 ? 700 : -2000}
                  max={i === 2 ? 3500 : 2000}
                  step={25}
                  onChange={(v) => editVector('neuron', 'somaUm', i, v)}
                />
              ))}
              <NumberControl
                label="Conductivity · S/m"
                value={config.tissue.conductivitySPerM}
                min={0.1}
                max={1}
                step={0.025}
                onChange={(v) => edit('tissue', 'conductivitySPerM', v)}
              />
              {!active && (
                <>
                  <NumberControl
                    label="Specific capacitance · µF/cm²"
                    value={config.membrane.capacitanceUfPerCm2}
                    min={0.2}
                    max={2}
                    step={0.1}
                    onChange={(v) => edit('membrane', 'capacitanceUfPerCm2', v)}
                  />
                  <NumberControl
                    label="Membrane resistance · Ω cm²"
                    value={config.membrane.resistanceOhmCm2}
                    min={5000}
                    max={100000}
                    step={1000}
                    onChange={(v) => edit('membrane', 'resistanceOhmCm2', v)}
                  />
                  <NumberControl
                    label="Axial resistivity · Ω cm"
                    value={config.membrane.axialResistivityOhmCm}
                    min={50}
                    max={300}
                    step={10}
                    onChange={(v) => edit('membrane', 'axialResistivityOhmCm', v)}
                  />
                </>
              )}
              {active && (
                <p class="cx-muted">
                  Capacitance, axial resistivity and channel densities use the pinned source model
                  and vary by section type.{' '}
                  <a href="/cortex/methods/#active-model">Read model conventions →</a>
                </p>
              )}
            </details>
            <details>
              <summary>04 / Resolution & files</summary>
              <NumberControl
                label="Timestep · ms"
                value={config.solver.dtMs}
                min={active ? 0.00125 : 0.0025}
                max={active ? 0.01 : 0.1}
                step={active ? 0.00125 : 0.0025}
                onChange={(v) => edit('solver', 'dtMs', v)}
              />
              {active ? (
                <label>
                  Maximum segment length · µm
                  <select
                    value={config.neuron.segmentLengthUm}
                    onChange={(e) =>
                      edit('neuron', 'segmentLengthUm', Number(e.currentTarget.value))
                    }
                  >
                    {[10, 20, 40, 80].map((v) => (
                      <option value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <NumberControl
                  label="Maximum segment length · µm"
                  value={config.neuron.segmentLengthUm}
                  min={10}
                  max={100}
                  step={10}
                  onChange={(v) => edit('neuron', 'segmentLengthUm', v)}
                />
              )}
              {active && (
                <NumberControl
                  label="Output sample interval · ms"
                  value={config.solver.sampleMs}
                  min={config.solver.dtMs}
                  max={0.1}
                  step={0.005}
                  onChange={(v) => edit('solver', 'sampleMs', v)}
                />
              )}
              <NumberControl
                label="Experiment length · ms"
                value={config.solver.durationMs}
                min={20}
                max={100}
                step={10}
                onChange={(v) => edit('solver', 'durationMs', v)}
              />
              <label>
                Neurite source model
                <select
                  value={config.recording.sourceModel}
                  onChange={(e) => edit('recording', 'sourceModel', e.currentTarget.value)}
                >
                  <option value="line">Uniform line sources</option>
                  <option value="point">Compartment-center point sources</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setConfig(freshConfig());
                  setError('');
                  setSelected(0);
                  setPlaying(false);
                }}
              >
                Reset benchmark configuration
              </button>
              <button
                type="button"
                disabled={!world}
                onClick={() => save(encodeJson(config), 'cortex-configuration.json')}
              >
                Save configuration
              </button>
              <button type="button" onClick={() => importInput.current?.click()}>
                Import configuration
              </button>
              <input
                ref={importInput}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (!file) return;
                  try {
                    if (file.size > 100000) throw new Error('Configuration exceeds 100 KB.');
                    const next = parseConfig(await file.text());
                    makeWorld(next);
                    setConfig(next);
                    setSelected(0);
                    setPlaying(false);
                    setError('');
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              />
            </details>
          </fieldset>
          <div class="cx-run">
            <button class="cx-primary" disabled={running || !world} onClick={run}>
              {running ? `Solving · ${Math.round(progress * 100)}%` : 'Run experiment'}
            </button>
            {running && <button onClick={cancel}>Cancel</button>}
            <p aria-live="polite">
              {running
                ? 'Solving independently of 3D rendering.'
                : stale
                  ? 'Configuration changed. Run again to update results.'
                  : ready
                    ? `${active?`${world.neuron.membraneCompartments} membrane compartments + ${result.diagnostics.compartments-world.neuron.membraneCompartments} junction nodes`:`${result.diagnostics.compartments} compartments`} · ${result.timeMs.at(-1)} ms solved`
                    : 'Ready to calculate.'}
            </p>
          </div>
        </aside>
        <section class="cx-workspace" aria-label="Shared cortical geometry">
          <div class="cx-viewbar">
            <div>
              {['cell', 'patch', 'side', 'top'].map((v) => (
                <button onClick={() => view.current?.setView(v)}>
                  {v === 'cell' ? 'Cell detail' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <button aria-label="Zoom in" onClick={() => view.current?.zoom(1.3)}>
                +
              </button>
              <button aria-label="Zoom out" onClick={() => view.current?.zoom(1 / 1.3)}>
                −
              </button>
            </div>
          </div>
          <div class="cx-stage">
            <div class="cx-canvas" ref={host} />
            <div class="cx-stage-label">
              Pia Z = 0 · +Z into cortex
              <br />
              All geometry at physical scale
            </div>
            <div class="cx-scale">
              <div style={{ width: `${scale.pixels}px` }} />
              {scale.label}
            </div>
            {!world && <div class="cx-stage-error">Geometry unavailable: {state.error}</div>}
          </div>
          <div class="cx-view-options">
            <label>
              <input
                type="checkbox"
                checked={section}
                onChange={(e) => setSection(e.currentTarget.checked)}
              />{' '}
              Cutaway layers
            </label>
            <label>
              <input
                type="checkbox"
                checked={projection}
                onChange={(e) => {
                  setProjection(e.currentTarget.checked);
                }}
              />{' '}
              Orthographic
            </label>
            <label>
              Opacity{' '}
              <input
                aria-label="Tissue opacity"
                type="range"
                min={0}
                max={0.35}
                step={0.01}
                value={opacity}
                onInput={(e) => setOpacity(Number(e.currentTarget.value))}
              />
            </label>
          </div>
          <p class="cx-muted cx-caption">
            {viewStatus}. Thin lines mark neurite centers; crosshairs mark recording sites. Colors
            {active
              ? 'show membrane voltage from −100 to +40 mV.'
              : 'show ΔVₘ from −10 to +10 mV, saturating beyond this range.'}{' '}
            The selection marker identifies the inspected compartment.
          </p>
          <div class="cx-layers">
            {world?.layers.map((l) => (
              <span style={{ borderColor: l.color }}>
                <b>{l.id}</b>
                {format(l.topUm / 1000)}–{format(l.bottomUm / 1000)} mm
              </span>
            ))}
          </div>
          <p class="cx-muted cx-caption">
            Layer fractions are illustrative. CSF and white matter are anatomical guides; all
            electrical calculations use one homogeneous conductor.
          </p>
          {world && (
            <details class="cx-inspector" open>
              <summary>Inspect coordinates & membrane</summary>
              <label>
                Compartment
                <select
                  value={Math.min(selected, world.neuron.nodes.length - 1)}
                  onChange={(e) => setSelected(Number(e.currentTarget.value))}
                >
                  {world.neuron.nodes.map(
                    (n, i) => n.kind !== 'junction' && <option value={i}>{n.id}</option>,
                  )}
                </select>
              </label>
              <div class="cx-readouts">
                <span>
                  Center / µm<b>{selectedNode?.centerUm.map(format).join(', ')}</b>
                </span>
                <span>
                  Diameter / µm<b>{format(selectedNode?.diameterUm)}</b>
                </span>
                <span>
                  Membrane / mV<b>{traces ? format(traces.voltage[frame]) : 'Run experiment'}</b>
                </span>
                <span>
                  Outward current / nA<b>{traces ? format(traces.current[frame]) : '—'}</b>
                </span>
              </div>
              {ready?.channels && (
                <div class="cx-readouts">
                  {[
                    ['sodiumNa', 'Na outward / nA'],
                    ['potassiumNa', 'K outward / nA'],
                    ['calciumNa', 'Ca outward / nA'],
                    ['hcnNa', 'HCN outward / nA'],
                    ['leakNa', 'Leak outward / nA'],
                    ['capacitiveNa', 'Capacitive / nA'],
                    ['calciumMm', 'Intracellular Ca / mM'],
                    ['sodiumOpen', 'NaV open probability'],
                  ].map(([key, label]) => (
                    <span>
                      {label}
                      <b>
                        {format(
                          ready.channels[key][frame * ready.diagnostics.compartments + selected],
                        )}
                      </b>
                    </span>
                  ))}
                </div>
              )}
              {ready?.channels && (
                <p class="cx-muted">
                  Currents use channel states from the voltage solve. NaV open probability and
                  calcium are shown after the state update at this sample.
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Ideal sensing site</th>
                    <th>X / µm</th>
                    <th>Y / µm</th>
                    <th>Z / µm</th>
                    <th>Distance to soma / µm</th>
                  </tr>
                </thead>
                <tbody>
                  {config.recording.contactIds.map((id) => {
                    const s = contacts.find((c) => c.id === id);
                    return (
                      <tr>
                        <td>{id}</td>
                        {s.positionUm.map((v) => (
                          <td>{format(v)}</td>
                        ))}
                        <td>
                          {format(
                            Math.hypot(...s.positionUm.map((v, i) => v - config.neuron.somaUm[i])),
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
          )}
          {world && config.protocol.mode === 'extracellular-stimulation' && (
            <details
              open={fieldVisible}
              onToggle={(e) => setFieldVisible(e.currentTarget.open)}
              class="cx-inspector"
            >
              <summary>Calculated potential section</summary>
              {fieldVisible && <FieldSection world={world} />}
            </details>
          )}
        </section>
        <aside class="cx-analysis">
          <h2>Calculated signals</h2>
          {(error || state.error) && (
            <p class="cx-error" role="alert">
              {error || state.error}
            </p>
          )}
          {world?.warnings.map((w) => (
            <p class="cx-notice">{w}</p>
          ))}
          {stale && (
            <p class="cx-notice">
              The scene shows your edited geometry. Previous signals are hidden until you rerun.
            </p>
          )}
          {!ready && (
            <div class="cx-empty">
              <span>01 → 02 → 03</span>
              <p>Membrane equations → transmembrane currents → contact potentials.</p>
              <p>No synthetic recording templates are used in this experiment.</p>
            </div>
          )}
          {ready && traces && (
            <>
              {result.warnings.map((w) => (
                <p class="cx-notice">{w}</p>
              ))}
              <label>
                Signal component
                <select value={component} onChange={(e) => setComponent(e.currentTarget.value)}>
                  <option value="neural">Neural currents only</option>
                  <option value="applied">Applied source / return artifact</option>
                  <option value="total">Total ideal electrode potential</option>
                </select>
              </label>
              <Trace
                title={
                  config.recording.reference === 'bipolar'
                    ? 'A − B potential'
                    : 'Contact potentials · infinity reference'
                }
                time={result.timeMs}
                unit="µV"
                frame={frame}
                series={
                  config.recording.reference === 'bipolar'
                    ? [{ label: 'A − B', values: traces.differential, color: '#ba7540' }]
                    : [
                        {
                          label: config.recording.contactIds[0],
                          values: traces.pair[0],
                          color: '#ba7540',
                        },
                        {
                          label: config.recording.contactIds[1],
                          values: traces.pair[1],
                          color: '#4e7fab',
                        },
                      ]
                }
              />
              <Trace
                title={
                  active ? 'Soma voltage · computed threshold crossings' : 'Soma membrane voltage'
                }
                time={result.timeMs}
                unit="mV"
                frame={frame}
                spikes={result.spikes ?? []}
                series={[{ label: 'Soma Vₘ', values: traces.soma, color: '#b3532e' }]}
              />
              {active && (
                <p class="cx-muted">
                  {result.spikes.length} soma crossings at −25 mV · internal timestep{' '}
                  {config.solver.dtMs} ms · output samples {config.solver.sampleMs} ms.
                  {result.diagnostics.firstThresholdCrossing &&
                    ` Earliest modeled crossing: ${result.diagnostics.firstThresholdCrossing.compartmentId} at ${format(result.diagnostics.firstThresholdCrossing.timeMs)} ms.`}{' '}
                  Crossing location depends on this morphology and the synthetic axon stub.
                </p>
              )}
              <Trace
                title={`${selectedNode.id} · membrane voltage`}
                time={result.timeMs}
                unit="mV"
                frame={frame}
                series={[{ label: 'Computed Vₘ', values: traces.voltage, color: '#429b94' }]}
              />
              <Trace
                title={`${selectedNode.id} · outward membrane current`}
                time={result.timeMs}
                unit="nA"
                frame={frame}
                series={[
                  {
                    label: active
                      ? 'Capacitive + ionic + synaptic'
                      : 'Capacitive + leak + synaptic',
                    values: traces.current,
                    color: '#8e739f',
                  },
                ]}
              />
              <div class="cx-replay">
                <button
                  onClick={() => {
                    if (frame === result.timeMs.length - 1) setFrame(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? 'Pause replay' : 'Replay'}
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setFrame((f) => Math.min(result.timeMs.length - 1, f + 1));
                  }}
                >
                  Step
                </button>
                <output>{format(result.timeMs[frame])} ms</output>
                <input
                  aria-label="Inspect simulation time"
                  type="range"
                  min={0}
                  max={result.timeMs.length - 1}
                  step={1}
                  value={frame}
                  onInput={(e) => {
                    setPlaying(false);
                    setFrame(Number(e.currentTarget.value));
                  }}
                />
              </div>
              <p class="cx-muted">
                Replay: 10 biological ms/s. Raw ideal potentials; amplifier, noise, filtering and
                ADC are not modeled.
              </p>
              <div class="cx-metrics">
                <span>
                  Solver time<b>{format(result.diagnostics.elapsedMs)} ms</b>
                </span>
                {active && (
                  <span>
                    Compute / simulated time
                    <b>{format(result.diagnostics.elapsedMs / config.solver.durationMs)}×</b>
                  </span>
                )}
                <span>
                  Current-balance error
                  <b>{result.diagnostics.maxConservationResidualNa.toExponential(2)} nA</b>
                </span>
                <span>
                  Stored numeric output<b>{(result.diagnostics.outputBytes / 1e6).toFixed(2)} MB</b>
                </span>
                {config.protocol.mode === 'extracellular-stimulation' && (
                  <span>
                    Charge / phase / contact<b>{format(result.diagnostics.cathodicChargeNc)} nC</b>
                  </span>
                )}
              </div>
              {config.protocol.mode === 'extracellular-stimulation' && (
                <p class="cx-muted">
                  Geometric charge density is unavailable: exposed tip area is unknown. No safety
                  threshold is inferred.
                </p>
              )}
              <div class="cx-export">
                <button
                  onClick={() =>
                    save(
                      resultCsv(result, component),
                      `cortex-${component}-signals.csv`,
                      'text/csv',
                    )
                  }
                >
                  Export CSV
                </button>
                <button
                  onClick={() => save(encodeJson(resultBundle(result)), 'cortex-results.json')}
                >
                  Results + provenance
                </button>
                <button onClick={() => setPinned(result)}>Pin run for comparison</button>
              </div>
              {pinned && (
                <details open class="cx-inspector">
                  <summary>Comparison with pinned run</summary>
                  <p class="cx-muted">
                    Actual configurations are retained; changed parameters may confound
                    interpretation.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Pinned</th>
                        <th>Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Neuron model</td>
                        <td>{pinned.config.neuron.modelId ?? PASSIVE_MODEL_ID}</td>
                        <td>{config.neuron.modelId ?? PASSIVE_MODEL_ID}</td>
                      </tr>
                      <tr>
                        <td>Implant X / µm</td>
                        <td>{pinned.config.implant.translationUm[0]}</td>
                        <td>{config.implant.translationUm[0]}</td>
                      </tr>
                      <tr>
                        <td>Protocol</td>
                        <td>{pinned.config.protocol.mode}</td>
                        <td>{config.protocol.mode}</td>
                      </tr>
                      <tr>
                        <td>Peak |neural A| / µV</td>
                        <td>
                          {format(pinned.neuralUv[0].reduce((s, x) => Math.max(s, Math.abs(x)), 0))}
                        </td>
                        <td>
                          {format(result.neuralUv[0].reduce((s, x) => Math.max(s, Math.abs(x)), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <button
                    onClick={() =>
                      save(
                        encodeJson({
                          schemaVersion: 'cortex-comparison/1',
                          pinned: resultBundle(pinned),
                          current: resultBundle(result),
                        }),
                        'cortex-comparison.json',
                      )
                    }
                  >
                    Export both runs
                  </button>
                </details>
              )}
            </>
          )}
          <details class="cx-inspector">
            <summary>Model limits & next steps</summary>
            <p>
              {active
                ? 'This model has human reconstructed dendrites, fitted active channels and a synthetic axon stub. Computed threshold crossings depend on this model and placement.'
                : 'This reference is a passive synthetic arbor without action potentials.'}{' '}
              Population activity, layered conductivity, finite exposed contacts, acquisition
              electronics, mechanics and independent experimental validation remain outside this
              milestone.
            </p>
            <p>
              The existing active stimulation and synthetic recording tools remain available under{' '}
              <a href="/simulations/">Simulations</a>. Their outputs are not validation of this
              model.
            </p>
            <a href="/cortex/methods/">Read the scientific scope →</a>
            <p class="cx-muted">{active ? ACTIVE_ENGINE_VERSION : ENGINE_VERSION}</p>
          </details>
        </aside>
      </div>
    </section>
  );
}
