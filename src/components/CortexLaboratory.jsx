import { cellLibraryExample } from '../lib/cortex/library-examples.js';
import CortexCellLibrary from './CortexCellLibrary.jsx';
import CortexEvidencePanel from './CortexEvidencePanel.jsx';
import { loadActiveModel } from '../lib/cortex/model-library.js';
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ACTIVE_ENGINE_VERSION } from "../lib/cortex/config.js";
import { makeWorld, placedContacts } from "../lib/cortex/world.js";
import { CORTEX_IMPLANTS, getCortexImplant, getCortexImplantModel, selectCortexImplant } from "../lib/cortex/implants.js";
import { modelRegistry } from "../lib/cortex/model-registry.js";
import {
  encodeJson,
  resultBundle,
  resultCsv,
} from "../lib/cortex/experiment.js";
import CortexElectricalPanel from "./CortexElectricalPanel.jsx";
import CortexPopulationPanel from "./CortexPopulationPanel.jsx";
import { populationExampleConfig } from "../lib/cortex/population.js";
import {
  DEFAULT_ELECTRICAL,
  nearestFrame,
  resultSummary,
  configurationChanges,
} from "../lib/cortex/electrical.js";
import {
  placementReport,
  translationForTipDepth,
} from "../lib/cortex/placement.js";
import { parseLaboratoryConfig } from "../lib/cortex/laboratory.js";
import { currentStepSummary, adjacentSpikeFrame } from "../lib/cortex/current-step.js";
import { analyzeActiveResponse } from "../lib/cortex/response-analysis.js";
import { EXAMPLES, getExampleConfig } from "../lib/cortex/examples.js";
import "../styles/cortex-laboratory.css";

const format = (value) =>
  !Number.isFinite(value)
    ? "—"
    : Math.abs(value) > 0 && Math.abs(value) < 0.001
      ? value.toExponential(2)
      : value.toFixed(Math.abs(value) < 1 ? 4 : 2);
function save(content, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type })),
    link = document.createElement("a");
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
          if (e.currentTarget.value !== "")
            onChange(Number(e.currentTarget.value));
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
  const plot = useMemo(() => {
    let low = Infinity,
      high = -Infinity;
    for (const s of series)
      for (const v of s.values) {
        low = Math.min(low, v);
        high = Math.max(high, v);
      }
    const span = Math.max(1e-8, high - low),
      margin = Math.max(
        span * 0.1,
        high === low ? Math.max(0.001, Math.abs(high) * 0.01) : 0,
      );
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
        [
          ...new Set([
            start,
            min,
            max,
            Math.min(values.length - 1, start + bucket - 1),
          ]),
        ]
          .sort((a, b) => a - b)
          .forEach((i) =>
            points.push(`${x(time[i]).toFixed(2)},${y(values[i]).toFixed(2)}`),
          );
      }
      return points.join(" ");
    }
    return { low, high, paths: series.map((s) => path(s.values)) };
  }, [time, series[0]?.values, series[1]?.values, series[2]?.values]);
  const { low, high } = plot;
  const x = (t) => l + (t / (time.at(-1) || 1)) * (w - l - r);
  const y = (v) => top + ((high - v) / (high - low)) * (h - top - bottom);
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
        {series.map((s, i) => (
          <polyline
            points={plot.paths[i]}
            fill="none"
            stroke={s.color}
            stroke-width="1.6"
          />
        ))}
        {spikes.map((s) => (
          <line
            x1={x(s.timeMs)}
            x2={x(s.timeMs)}
            y1={top}
            y2={top + 10}
            stroke="#b3532e"
          >
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
export default function CortexLaboratory({ populationEnabled = false } = {}) {
  const [config, setConfig] = useState(() => populationEnabled ? populationExampleConfig() : getExampleConfig("active-intracellular-spike")),
    [result, setResult] = useState(null),
    [pinned, setPinned] = useState(null);
  const [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [runStage, setRunStage] = useState("Ready to calculate.");
  const [populationRunning, setPopulationRunning] = useState(false),
    [populationScene, setPopulationScene] = useState(null);
  const [viewStatus, setViewStatus] = useState("Loading 3D workspace…"),
    [scale, setScale] = useState({ pixels: 80, label: "100 µm" });
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [selected, setSelected] = useState(0);
  const [section, setSection] = useState(true),
    [opacity, setOpacity] = useState(0.12),
    [projection, setProjection] = useState(false),
    [electrical, setElectrical] = useState(true),
    [component, setComponent] = useState("neural"),
    [plotReference, setPlotReference] = useState("infinity"),
    [visual, setVisual] = useState(() => structuredClone(DEFAULT_ELECTRICAL)),
    [replaySpeed, setReplaySpeed] = useState(1),
    [exampleId, setExampleId] = useState(populationEnabled ? "extracellular-soma-spike" : "active-intracellular-spike"),
    [guideOpen, setGuideOpen] = useState(true);
  const chosenExample = EXAMPLES.find((e) => e.id === exampleId);
  const displayOptions = useMemo(
    () => ({ ...visual, electrical, component, population: populationScene }),
    [visual, electrical, component, populationScene],
  );
  const displayEdit = (key, value) =>
    setVisual((v) => ({ ...v, [key]: value }));
  const host = useRef(null),
    view = useRef(null),
    worker = useRef(null),
    runId = useRef(0),
    importInput = useRef(null),
    mounted = useRef(true);
  const [modelRevision, setModelRevision] = useState(0);
  useEffect(() => { let alive=true; loadActiveModel(config.neuron.modelId, config.neuron.segmentLengthUm).then(()=>{if(alive)setModelRevision(v=>v+1);}).catch(e=>{if(alive)setError(e.message);}); return ()=>{alive=false;}; }, [config.neuron.modelId, config.neuron.segmentLengthUm]);
  const modelRequest = useRef(0);
  const chooseModel = async id => {
    const request=++modelRequest.current;
    try { await loadActiveModel(id, config.neuron.segmentLengthUm); if(request!==modelRequest.current || !mounted.current)return; setConfig(c=>({...c,neuron:{...c.neuron,modelId:id},membrane:{...c.membrane,sourceModelId:id}}));setSelected(0);setResult(null);setPlaying(false);setError(""); } catch(e){setError(e.message);}
  };
  const state = useMemo(() => {
    try {
      return { world: makeWorld(config), error: "" };
    } catch (e) {
      return { world: null, error: e.message };
    }
  }, [config, modelRevision]);
  const active = true,
    implant = getCortexImplant(config.implant.deviceId),
    model = modelRegistry.find(
      (m) => m.id === (config.neuron.modelId),
    );
  const world = state.world,
    stale = !!result && encodeJson(result.config) !== encodeJson(config),
    ready = result && !stale && world && !running ? result : null;
  const placement = useMemo(
    () => (world ? placementReport(world, selected) : null),
    [world, selected],
  );
  const summary = useMemo(() => resultSummary(ready), [ready]);
  const stepSummary = useMemo(() => currentStepSummary(ready), [ready]);
  const responseAnalysis = useMemo(
    () => ready ? ready.responseAnalysis ?? analyzeActiveResponse(ready, world) : null,
    [ready, world],
  );
  const baselineSummary = useMemo(() => resultSummary(pinned), [pinned]);
  const baselineSoma = useMemo(
    () =>
      pinned
        ? Float64Array.from(
            pinned.timeMs,
            (_, k) =>
              pinned.membraneMv[
                k * pinned.diagnostics.compartments + (pinned.somaIndex ?? 0)
              ],
          )
        : null,
    [pinned],
  );
  const sameTimeGrid = useMemo(
    () =>
      !!pinned &&
      !!ready &&
      pinned.timeMs.length === ready.timeMs.length &&
      pinned.timeMs.every((t, i) => t === ready.timeMs[i]),
    [pinned, ready],
  );
  const changes = useMemo(
    () =>
      pinned && ready ? configurationChanges(pinned.config, ready.config) : [],
    [pinned, ready],
  );
  const latest = useRef({
    world,
    section,
    opacity,
    ready,
    frame,
    selected,
    projection,
    ...displayOptions,
  });
  latest.current = {
    world,
    section,
    opacity,
    ready,
    frame,
    selected,
    projection,
    ...displayOptions,
  };
  const edit = (group, key, value) => {
    setConfig((c) => ({ ...c, [group]: { ...c[group], [key]: value } }));
    setPlaying(false);
    setError("");
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
    setRunStage("Cancelled. Adjust settings or run again.");
  };
  const chooseImplant = (deviceId) => {
    setConfig(c => selectCortexImplant(c, deviceId));
    setPlaying(false);
    setError("");
    setRunStage("Implant loaded. Inspect placement and recording sites, then run.");
  };
  const loadExample = (id = exampleId) => {
    const e = EXAMPLES.find((e) => e.id === id);
    setExampleId(id);
    setConfig(getExampleConfig(id));
    setResult(null);
    setFrame(0);
    setSelected(0);
    setPlaying(false);
    setError("");
    setComponent(e.view.recordingComponent);
    setReplaySpeed(e.view.replaySpeed ?? 1);
    setPlotReference(e.config.recording.reference);
    setRunStage("Example loaded. Inspect geometry, then run.");
  };
  async function run() {
    setError("");
    setPlaying(false);
    try {
      const valid = makeWorld(config).config;
      if (running) cancel();
      else runId.current++;
      const id = ++runId.current;
      setRunning(true);
      setResult(null);
      setProgress(0);
      setRunStage(
        valid.neuron.modelId
          ? "Conditioning the active cell"
          : "Integrating membrane response",
      );
      const finish = (r) => {
        if (!mounted.current || id !== runId.current) return;
        setResult(r);
        setFrame(0);
        setRunning(false);
        setProgress(1);
        setRunStage("Complete. Replay and inspect the calculated response.");
      };
      const fail = (message) => {
        if (!mounted.current || id !== runId.current) return;
        setError(message);
        setRunning(false);
        worker.current?.terminate();
        worker.current = null;
      };
      try {
        worker.current ??= new Worker(
          new URL("../lib/cortex/worker.js", import.meta.url),
          {
            type: "module",
          },
        );
      } catch {
        fail("Workers are unavailable. This neuron requires a browser worker; use a browser with worker support and reload.");
        return;
      }
      worker.current.onmessage = ({ data }) => {
        if (data.id !== runId.current) return;
        if (data.type === "progress") {
          setProgress(data.progress);
          setRunStage(data.stage ?? "Integrating membrane response");
        } else if (data.type === "result") finish(data.result);
        else if (data.type === "error") fail(data.message);
      };
      worker.current.onerror = () =>
        fail(
          "The numerical worker failed to load or execute. Reload the page and try again.",
        );
      worker.current.postMessage({ id, config: valid });
    } catch (e) {
      setError(e.message);
      setRunning(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const requestedExample = new URLSearchParams(window.location.search).get(
      "example",
    );
    if (requestedExample === "passive-subthreshold") {
      loadExample("active-intracellular-subthreshold");
      setRunStage("The simplified neuron was retired. Loaded the human cell subthreshold example; inspect its settings, then run.");
    } else if (EXAMPLES.some((e) => e.id === requestedExample))
      loadExample(requestedExample);
    const requestedImplant = new URLSearchParams(window.location.search).get("implant");
    const implantChoice = CORTEX_IMPLANTS.find(d => d.key === requestedImplant);
    if (implantChoice) chooseImplant(implantChoice.deviceId);
    const requestedCell = new URLSearchParams(window.location.search).get("cell");
    if (modelRegistry.some(m => m.id === requestedCell)) chooseModel(requestedCell);
    let cancelled = false;
    import("../lib/cortex/scene.js")
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
          api.setFrame(s.ready || null, s.frame, s.selected, s);
          if (s.population) api.setView("population");
        }
      })
      .catch(() => {
        if (!cancelled)
          setViewStatus(
            "3D unavailable · numerical experiments and exports remain available",
          );
      });
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
      view.current.setWorld(world, { section, opacity, ...displayOptions });
      view.current.setFrame(ready || null, frame, selected, displayOptions);
    }
  }, [world, section, opacity]);
  useEffect(() => {
    view.current?.setFrame(ready || null, frame, selected, displayOptions);
  }, [ready, frame, selected, displayOptions]);
  useEffect(() => {
    if (!playing || !ready) return;
    // Real elapsed replay time maps to retained samples with binary search; no history scan.
    const started = performance.now(),
      startMs = ready.timeMs[frame];
    const timer = setInterval(() => {
      const target =
        startMs + ((performance.now() - started) * replaySpeed) / 1000;
      setFrame(nearestFrame(ready.timeMs, target));
      if (target >= ready.timeMs.at(-1)) setPlaying(false);
    }, 40);
    return () => clearInterval(timer);
  }, [playing, ready, replaySpeed]);
  const contacts = useMemo(() => {
      try {
        return placedContacts(
          getCortexImplantModel(config.implant.deviceId),
          config.implant,
        );
      } catch {
        return [];
      }
    }, [config.implant]),
    selectedNode =
      world?.neuron.nodes[
        Math.min(selected, (world?.neuron.nodes.length ?? 1) - 1)
      ];
  const traces = useMemo(() => {
    if (!ready) return null;
    const n = result.diagnostics.compartments,
      index = Math.min(selected, n - 1),
      pair = result[`${component}Uv`];
    return {
      pair,
      differential: Float64Array.from(pair[0], (v, i) => v - pair[1][i]),
      voltage: Float64Array.from(
        result.timeMs,
        (_, k) => result.membraneMv[k * n + index],
      ),
      current: Float64Array.from(
        result.timeMs,
        (_, k) => result.membraneCurrentNa[k * n + index],
      ),
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
          {label} {i === 0 ? "A" : "B"}
          <select
            value={id}
            onChange={(e) =>
              onChange(ids.map((v, j) => (j === i ? e.currentTarget.value : v)))
            }
          >
            {contacts.map((s) => (
              <option
                value={s.id}
                disabled={ids.some((other, j) => j !== i && other === s.id)}
              >
                {s.id} · {Math.round(s.positionUm[2])} µm depth{s.positionUm[2] < 0 || s.positionUm[2] > config.anatomy.thicknessUm ? " · outside slab" : ""}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
  return (
    <section class="cortex-lab">
      <CortexEvidencePanel config={config} />
      <header class="cx-heading">
        <div>
          <p class="cx-eyebrow">{populationEnabled ? "Cortex Population Laboratory" : "Cortex Laboratory · single human cell"}</p>
          <h1>{populationEnabled ? "Cells around a contact." : "From membrane to contact."}</h1>
          <p>
            Place an array, thread or shank. Follow calculated currents through a shared
            cortical scene.
          </p>
        </div>
        <a href="/cortex/methods/">Equations, evidence & scope →</a>
      </header>
      <div class="cx-scope">
        <strong>
          Human cortical cells · published active models
        </strong>
        <span>
          Reconstructed dendrites · synthetic axon stub · no independent experimental validation
        </span>
      </div>
      <nav class="cx-workflow" aria-label="Laboratory workflow">
        {populationEnabled ? <a href="#cx-population">Distance cloud</a> : <a href="/cortex/population/">Population laboratory →</a>}
        <a href="#cx-choose">1 · Choose</a>
        <a href="#cx-geometry">2 · Inspect</a>
        <a href="#cx-run">3 · Run</a>
        <a href="#cx-response">4 · Replay</a>
        <a href="#cx-export">5 · Compare / export</a>
      </nav>
        <CortexCellLibrary selectedId={config.neuron.modelId} onSelect={chooseModel} onPatch={id=>{setConfig(cellLibraryExample(id));setResult(null);setSelected(0);setPlaying(false);setError("");}} disabled={running || populationRunning} />
      <details
        class="cx-guide"
        open={guideOpen}
        onToggle={(e) => setGuideOpen(e.currentTarget.open)}
      >
        <summary>First run · a one-minute guide</summary>
        {populationEnabled ? <p>The default experiment places distinct sourced human cells in a seeded distance cloud. Open <a href="#cx-population">Real-model population</a>, inspect the supported and excluded positions, then run the supported cells. The controls below configure the target cell and shared stimulation.</p> : <p>Start with one reconstructed human cell and its original intracellular soma-spike example. Run the experiment, then replay voltage across its soma, dendrites and axon stub. Choose a patch-clamp current step for repeated firing, or an array example for electrode stimulation.</p>}
        <ol>
          <li>
            Choose an example, read its reset notice and click{" "}
            <b>Load example</b>.
          </li>
          <li>
            Inspect the pial depth and contact distances. The source and return
            move with the array.
          </li>
          <li>
            Click <b>Run experiment</b>. The active cell first undergoes 100 ms
            of numerical conditioning.
          </li>
          <li>
            Replay slowly and use <b>Next soma event</b> for threshold crossings. Array
            examples also offer <b>Phase 1</b> and <b>Phase 2</b>. Compare
            membrane mV, contact µV and source µA.
          </li>
          <li>
            Pin a baseline, load its comparison example, rerun, and inspect
            changed settings and signal differences.
          </li>
        </ol>
        <p>
          Geometry or input edits require a new run. View controls and
          signal-component selection do not. All examples describe this
          single-neuron model.
        </p>
      </details>
      <div class="cx-lab-grid">
        <aside class="cx-config">
          <fieldset disabled={running || populationRunning}>
            <details open>
              <summary id="cx-choose">1 / Choose example</summary>
              <label>
                Curated example
                <select
                  value={exampleId}
                  onChange={(e) => setExampleId(e.currentTarget.value)}
                >
                  {EXAMPLES.map((e) => (
                    <option value={e.id}>{e.title}</option>
                  ))}
                </select>
              </label>
              <p>{chosenExample.purpose}</p>
              <p class="cx-muted">{chosenExample.description}</p>
              <p class="cx-reset-notice">{chosenExample.resetDisclosure}</p>
              <button type="button" onClick={() => loadExample()}>
                Load example
              </button>
              <p class="cx-muted">
                {encodeJson(config) === encodeJson(chosenExample.config)
                  ? "Current settings match this example."
                  : "Preview only. Load this example to apply its settings."}
              </p>
              <details>
                <summary>Expected behavior & verification</summary>
                <p>{chosenExample.expectedBehavior}</p>
                <p class="cx-muted">{chosenExample.verification}</p>
                <button
                  type="button"
                  onClick={() =>
                    save(
                      encodeJson(chosenExample.config),
                      `cortex-example-${exampleId}.json`,
                    )
                  }
                >
                  Save exact example configuration
                </button>
              </details>
              <p class="cx-device-name">Neuron model · {model.label}</p>
              <p class="cx-muted">
                {model.scope} <a href={model.source}>Model source →</a>
              </p>
              {active && (
                <p class="cx-muted">
                  34 °C · fitted channel distributions ·{" "}
                  {config.solver.settleMs} ms initialization conditioning.
                  Detailed runs can take several seconds; repeat runs reuse
                  identical conditioning.
                </p>
              )}
              <label>
                Protocol
                <select
                  value={config.protocol.mode}
                  onChange={(e) =>
                    edit("protocol", "mode", e.currentTarget.value)
                  }
                >
                  <option value="synaptic-recording">
                    Record a synaptic response
                  </option>
                  <option value="extracellular-stimulation" disabled={!implant.extracellular}>
                    Extracellular polarization
                  </option>
                  <option value="intracellular-current">
                    Intracellular current clamp
                  </option>
                </select>
              </label>
              {!implant.extracellular && <p class="cx-muted">This implant is recording-only here. Current clamp drives the neuron, not the device.</p>}
              {config.protocol.mode === "synaptic-recording" ? (
                <>
                  <NumberControl
                    label="Total synaptic conductance · nS"
                    value={config.protocol.synapseNs}
                    min={0}
                    max={active ? 100 : 5}
                    step={0.1}
                    onChange={(v) => edit("protocol", "synapseNs", v)}
                  />
                  <p class="cx-muted">
                    {active
                      ? world?.neuron.synapseDescription
                      : "A step conductance across the distal 100 µm of the apical branch."}{" "}
                    Total membrane currents generate the recording.
                  </p>
                </>
              ) : config.protocol.mode === "intracellular-current" ? (
                <>
                  <NumberControl
                    label="Soma current · nA"
                    value={config.protocol.injectionNa}
                    min={active ? -1 : -0.2}
                    max={active ? 2 : 0.2}
                    step={0.01}
                    onChange={(v) => edit("protocol", "injectionNa", v)}
                  />
                  <p class="cx-muted">
                    Includes a point bath return at [
                    {config.protocol.bathReturnUm.join(", ")}] µm. This is
                    distinct from extracellular stimulation.
                  </p>
                </>
              ) : (
                <>
                  {selector(
                    "Stimulating site",
                    config.protocol.sourceContactIds,
                    (v) => edit("protocol", "sourceContactIds", v),
                  )}
                  <NumberControl
                    label="Phase current magnitude · µA"
                    value={config.protocol.amplitudeUa}
                    min={0}
                    max={active ? 100 : 10}
                    step={0.1}
                    onChange={(v) => edit("protocol", "amplitudeUa", v)}
                  />
                  <NumberControl
                    label="Phase width · µs"
                    value={config.protocol.phaseUs}
                    min={50}
                    max={1000}
                    step={25}
                    onChange={(v) => edit("protocol", "phaseUs", v)}
                  />
                  <NumberControl
                    label="Interphase gap · µs"
                    value={config.protocol.gapUs}
                    min={0}
                    max={1000}
                    step={25}
                    onChange={(v) => edit("protocol", "gapUs", v)}
                  />
                  <p class="cx-muted">
                    One balanced biphasic pulse. A is cathodic first; B is its
                    local return. Ideal point sources at apices, without an
                    electrode interface model.
                  </p>
                </>
              )}
              <NumberControl
                label="Onset · ms"
                value={config.protocol.startMs}
                min={1}
                max={active ? 500 : 10}
                step={0.5}
                onChange={(v) => edit("protocol", "startMs", v)}
              />
              {active &&
                config.protocol.mode === "extracellular-stimulation" && (
                  <p class="cx-notice">
                    Local-crossing thresholds remain sensitive to spatial
                    discretization. These examples demonstrate model behavior;
                    they do not establish a converged biological threshold.{" "}
                    <a href="/cortex/methods/#numerical-reliability">
                      Numerical reliability →
                    </a>
                  </p>
                )}
              {config.protocol.mode !== "extracellular-stimulation" && (
                <NumberControl
                  label={config.protocol.mode === "intracellular-current" ? "Current step duration · ms" : "Drive duration · ms"}
                  value={config.protocol.durationMs}
                  min={0.1}
                  max={active ? 1000 : 10}
                  step={0.5}
                  onChange={(v) => edit("protocol", "durationMs", v)}
                />
              )}
              <NumberControl
                label="Recording length · ms"
                value={config.solver.durationMs}
                min={20}
                max={active ? 1200 : 100}
                step={10}
                onChange={(v) => edit("solver", "durationMs", v)}
              />
              {active && config.protocol.mode === "intracellular-current" && (
                <p class="cx-muted">
                  A sustained current step can produce repeated spikes and adaptation.
                  Choose “200 ms current step” or “500 ms current step” above, then
                  Load example and Run. Set recording length beyond onset + step
                  duration to include recovery. This is ideal somatic current clamp;
                  pipette resistance and clamp electronics are not modeled.
                </p>
              )}
            </details>
            <details open>
              <summary id="cx-geometry">2 / Place implant & recording</summary>
              <label>
                Implant geometry
                <select value={config.implant.deviceId} onChange={e => chooseImplant(e.currentTarget.value)}>
                  {CORTEX_IMPLANTS.map(d => <option value={d.deviceId}>{d.label}</option>)}
                </select>
              </label>
              <p class="cx-muted">{implant.summary}</p>
              <p class="cx-reset-notice">Changing implant resets its pose and recording pair, keeping the neuron and solver settings. For recording-only implants, extracellular polarization switches to intracellular current clamp. Loading a curated example restores its Utah array.</p>
              {implant.notes && <details><summary>Geometry evidence & limits</summary><p class="cx-muted">{implant.notes}</p></details>}
              {[
                "X translation · µm",
                "Y translation · µm",
                implant.key === "utah" ? "Substrate origin Z · µm" : "Distal tip Z · µm",
              ].map((label, i) => (
                <NumberControl
                  label={label}
                  value={config.implant.translationUm[i]}
                  min={-implant.poseLimitUm}
                  max={implant.poseLimitUm}
                  step={25}
                  onChange={(v) => editVector("implant", "translationUm", i, v)}
                />
              ))}
              <div class="cx-pair">
                {[
                  ["Tilt X · °", 0],
                  ["Tilt Y · °", 1],
                  ["Rotate Z · °", 2],
                ].map(([label, i]) => (
                  <NumberControl
                    label={label}
                    value={config.implant.rotationDeg[i]}
                    min={-180}
                    max={180}
                    step={5}
                    onChange={(v) => editVector("implant", "rotationDeg", i, v)}
                  />
                ))}
              </div>
              <p class="cx-muted">
                Pia is Z = 0; +Z points into cortex. X/Y are lateral. Rotation
                applies X, Y, then Z about the {implant.origin},
                before translation. Layers are anatomical guides.
              </p>
              {world && (
                <>
                  <NumberControl
                    label={implant.key === "utah" ? "Mean tip depth below pia · µm" : "Distal tip depth below pia · µm"}
                    value={Math.round(placement.meanTipDepthUm * 100) / 100}
                    min={placement.meanTipDepthUm - config.implant.translationUm[2] - implant.poseLimitUm}
                    max={placement.meanTipDepthUm - config.implant.translationUm[2] + implant.poseLimitUm}
                    step={25}
                    onChange={(v) =>
                      edit(
                        "implant",
                        "translationUm",
                        translationForTipDepth(world, v),
                      )
                    }
                  />
                  <p class="cx-muted">
                    {implant.key === "utah" ? `Apex depth range: ${format(placement.minTipDepthUm)}–${format(placement.maxTipDepthUm)} µm. Without tilt, tip depth = substrate Z + 1500 µm.` : `Distal tip: ${format(placement.meanTipDepthUm)} µm. Recording sites run up the shaft toward the pia; their depths are not tip depth.`}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setError("");
                  setConfig((c) => ({
                    ...c,
                    implant: {
                      ...c.implant,
                      translationUm: [...implant.translationUm],
                      rotationDeg: [0, 0, 0],
                    },
                  }));
                }}
              >
                Reset implant pose
              </button>
              {selector("Recording site", config.recording.contactIds, (v) =>
                edit("recording", "contactIds", v),
              )}
              <a href={`/devices/${getCortexImplantModel(config.implant.deviceId).slug}/#model-3d`}>
                Catalog geometry & sources →
              </a>
            </details>
            <details>
              <summary>Neuron placement & advanced physiology</summary>
              <p class="cx-muted">
                {model.label} in an illustrative slab; the published model uses a synthetic active axon stub. Placement depth does not change its cortical identity.
              </p>
              <NumberControl
                label="Cortical thickness · µm"
                value={config.anatomy.thicknessUm}
                min={3000}
                max={5000}
                step={100}
                onChange={(v) => edit("anatomy", "thicknessUm", v)}
              />
              {["Soma X · µm", "Soma Y · µm", "Soma depth · µm"].map(
                (label, i) => (
                  <NumberControl
                    label={label}
                    value={config.neuron.somaUm[i]}
                    min={i === 2 ? 700 : -2000}
                    max={i === 2 ? 3500 : 2000}
                    step={25}
                    onChange={(v) => editVector("neuron", "somaUm", i, v)}
                  />
                ),
              )}
              {active &&
                ["X", "Y", "Z"].map((axis, i) => (
                  <NumberControl
                    label={`Cell rotation ${axis} · °`}
                    value={config.neuron.rotationDeg[i]}
                    min={-180}
                    max={180}
                    step={5}
                    onChange={(v) => editVector("neuron", "rotationDeg", i, v)}
                  />
                ))}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setError("");
                  setConfig((c) => ({
                    ...c,
                    neuron: {
                      ...c.neuron,
                      somaUm: [-100, -200, 1500],
                      ...(active ? { rotationDeg: [0, 0, 0] } : {}),
                    },
                  }));
                }}
              >
                Reset neuron pose
              </button>
              <NumberControl
                label="Conductivity · S/m"
                value={config.tissue.conductivitySPerM}
                min={0.1}
                max={1}
                step={0.025}
                onChange={(v) => edit("tissue", "conductivitySPerM", v)}
              />
              {!active && (
                <>
                  <NumberControl
                    label="Specific capacitance · µF/cm²"
                    value={config.membrane.capacitanceUfPerCm2}
                    min={0.2}
                    max={2}
                    step={0.1}
                    onChange={(v) => edit("membrane", "capacitanceUfPerCm2", v)}
                  />
                  <NumberControl
                    label="Membrane resistance · Ω cm²"
                    value={config.membrane.resistanceOhmCm2}
                    min={5000}
                    max={100000}
                    step={1000}
                    onChange={(v) => edit("membrane", "resistanceOhmCm2", v)}
                  />
                  <NumberControl
                    label="Axial resistivity · Ω cm"
                    value={config.membrane.axialResistivityOhmCm}
                    min={50}
                    max={300}
                    step={10}
                    onChange={(v) =>
                      edit("membrane", "axialResistivityOhmCm", v)
                    }
                  />
                </>
              )}
              {active && (
                <p class="cx-muted">
                  Capacitance, axial resistivity and channel densities use the
                  pinned source model and vary by section type.{" "}
                  <a href="/cortex/methods/#active-model">
                    Read model conventions →
                  </a>
                </p>
              )}
            </details>
            <details>
              <summary>Advanced numerical settings & files</summary>
              <NumberControl
                label="Timestep · ms"
                value={config.solver.dtMs}
                min={active ? 0.00125 : 0.0025}
                max={active ? 0.01 : 0.1}
                step={active ? 0.00125 : 0.0025}
                onChange={(v) => edit("solver", "dtMs", v)}
              />
              {active ? (
                <label>
                  Maximum segment length · µm
                  <select
                    value={config.neuron.segmentLengthUm}
                    onChange={(e) =>
                      edit(
                        "neuron",
                        "segmentLengthUm",
                        Number(e.currentTarget.value),
                      )
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
                  onChange={(v) => edit("neuron", "segmentLengthUm", v)}
                />
              )}
              {active && (
                <NumberControl
                  label="Output sample interval · ms"
                  value={config.solver.sampleMs}
                  min={config.solver.dtMs}
                  max={0.5}
                  step={0.005}
                  onChange={(v) => edit("solver", "sampleMs", v)}
                />
              )}
              {active && (
                <p class="cx-muted">
                  Output sampling changes saved plots, replay and exports, not integration
                  or internal spike detection. Longer runs remain limited to 64 MiB of
                  numeric output. At the default 40 µm mesh, use 0.1 ms for a 250 ms
                  recording, 0.25 ms for 600 ms, or 0.5 ms for 1200 ms. Coarser output
                  can miss spike peaks; use a shorter recording with finer output for
                  waveform inspection. No resolution is changed automatically.
                </p>
              )}
              <label>
                Neurite source model
                <select
                  value={config.recording.sourceModel}
                  onChange={(e) =>
                    edit("recording", "sourceModel", e.currentTarget.value)
                  }
                >
                  <option value="line">Uniform line sources</option>
                  <option value="point">
                    Compartment-center point sources
                  </option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setConfig(getExampleConfig("active-intracellular-spike"));
                  setExampleId("active-intracellular-spike");
                  setResult(null);
                  setFrame(0);
                  setError("");
                  setSelected(0);
                  setPlaying(false);
                }}
              >
                Reset human cell configuration
              </button>
              <button
                type="button"
                disabled={!world}
                onClick={() =>
                  save(encodeJson(config), "cortex-configuration.json")
                }
              >
                Save configuration
              </button>
              <button
                type="button"
                onClick={() => importInput.current?.click()}
              >
                Import configuration
              </button>
              <input
                ref={importInput}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 100000)
                      throw new Error("Configuration exceeds 100 KB.");
                    const next = parseLaboratoryConfig(await file.text());
                    await loadActiveModel(next.neuron.modelId, next.neuron.segmentLengthUm);
                    makeWorld(next);
                    setConfig(next);
                    setResult(null);
                    setFrame(0);
                    setPlotReference(next.recording.reference);
                    setSelected(0);
                    setPlaying(false);
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              />
            </details>
          </fieldset>
          <div class="cx-run" id="cx-run" aria-busy={running}>
            <button
              class="cx-primary"
              disabled={running || populationRunning || !world || !placement?.supported}
              onClick={run}
            >
              {running
                ? `Solving · ${Math.round(progress * 100)}%`
                : populationScene ? "Run target cell" : "Run experiment"}
            </button>
            {running && (
              <>
                <button onClick={cancel}>Cancel</button>
                <progress
                  aria-label="Experiment progress"
                  value={progress}
                  max="1"
                />
              </>
            )}
            <p aria-live="polite">
              {running
                ? `${runStage}. Solver runs independently of rendering.`
                : stale
                  ? "Configuration changed. Run again to update results."
                  : ready
                    ? `${active ? `${world.neuron.membraneCompartments} membrane compartments + ${result.diagnostics.compartments - world.neuron.membraneCompartments} junction nodes` : `${result.diagnostics.compartments} compartments`} · ${result.timeMs.at(-1)} ms solved`
                    : !placement?.supported && world
                      ? "Move contacts out of the unsupported near-membrane region before running."
                      : runStage}
            </p>
          </div>
        </aside>
        <section class="cx-workspace" aria-label="Shared cortical geometry">
          {populationScene && <p class="cx-muted" style={{ padding: "0 14px" }}>Main replay and contact markers show the target cell. Population response and summed recordings appear below.</p>}
          <div class="cx-viewbar">
            <div>
              {["cell", ...(populationScene ? ["population"] : []), "contacts", "implant", "patch", "side", "top"].map((v) => (
                <button onClick={() => view.current?.setView(v)}>
                  {v === "cell"
                    ? "Cell detail"
                    : v === "contacts" ? "Contact detail" : v === "implant" ? "Whole implant" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <button
                aria-label="Zoom in"
                onClick={() => view.current?.zoom(1.3)}
              >
                +
              </button>
              <button
                aria-label="Zoom out"
                onClick={() => view.current?.zoom(1 / 1.3)}
              >
                −
              </button>
            </div>
          </div>
          <div class="cx-stage">
            <div class="cx-canvas" ref={host} />
            <div class="cx-stage-label">
              Pia Z = 0 · +Z into cortex
              <br />
              Physical anatomy · enlarged contact guides
            </div>
            <div class="cx-scale">
              <div style={{ width: `${scale.pixels}px` }} />
              {scale.label}
            </div>
            {!world && (
              <div class="cx-stage-error">
                Geometry unavailable: {state.error}
              </div>
            )}
          </div>
          <div class="cx-view-options">
            <label>
              <input
                type="checkbox"
                checked={electrical}
                onChange={(e) => setElectrical(e.currentTarget.checked)}
              />{" "}
              Electrical overlays
            </label>
            <label>
              <input
                type="checkbox"
                checked={section}
                onChange={(e) => setSection(e.currentTarget.checked)}
              />{" "}
              Cutaway layers
            </label>
            <label>
              <input
                type="checkbox"
                checked={projection}
                onChange={(e) => {
                  setProjection(e.currentTarget.checked);
                }}
              />{" "}
              Orthographic
            </label>
            <label>
              Anatomy opacity{" "}
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
            {viewStatus}. Thin lines mark neurite centers; crosshairs mark
            recording sites. Colors{" "}
            {active
              ? "show membrane voltage from −100 to +40 mV."
              : "show ΔVₘ from −10 to +10 mV, saturating beyond this range."}{" "}
            The selection marker identifies the inspected compartment.
          </p>
          <CortexElectricalPanel
            world={world}
            result={ready}
            frame={frame}
            options={displayOptions}
            onChange={displayEdit}
            component={component}
          />
          <div class="cx-layers">
            {world?.layers.map((l) => (
              <span style={{ borderColor: l.color }}>
                <b>{l.id}</b>
                {format(l.topUm / 1000)}–{format(l.bottomUm / 1000)} mm
              </span>
            ))}
          </div>
          <p class="cx-muted cx-caption">
            Layer fractions are illustrative. CSF and white matter are
            anatomical guides; all electrical calculations use one homogeneous
            conductor.
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
                    (n, i) =>
                      n.kind !== "junction" && (
                        <option value={i}>{n.id}</option>
                      ),
                  )}
                </select>
              </label>
              <div class="cx-readouts">
                <span>
                  Center / µm
                  <b>{selectedNode?.centerUm.map(format).join(", ")}</b>
                </span>
                <span>
                  Diameter / µm<b>{format(selectedNode?.diameterUm)}</b>
                </span>
                <span>
                  Membrane / mV
                  <b>
                    {traces ? format(traces.voltage[frame]) : "Run experiment"}
                  </b>
                </span>
                <span>
                  Outward current / nA
                  <b>{traces ? format(traces.current[frame]) : "—"}</b>
                </span>
              </div>
              {ready?.channels && (
                <div class="cx-readouts">
                  {[
                    ["sodiumNa", "Na outward / nA"],
                    ["potassiumNa", "K outward / nA"],
                    ["calciumNa", "Ca outward / nA"],
                    ["hcnNa", "HCN outward / nA"],
                    ["leakNa", "Leak outward / nA"],
                    ["capacitiveNa", "Capacitive / nA"],
                    ["calciumMm", "Intracellular Ca / mM"],
                    ["sodiumOpen", "NaV open probability"],
                  ].map(([key, label]) => (
                    <span>
                      {label}
                      <b>
                        {format(
                          ready.channels[key][
                            frame * ready.diagnostics.compartments + selected
                          ],
                        )}
                      </b>
                    </span>
                  ))}
                </div>
              )}
              {ready?.channels && (
                <p class="cx-muted">
                  Currents use channel states from the voltage solve. NaV open
                  probability and calcium are shown after the state update at
                  this sample.
                </p>
              )}
              <table>
                <caption>
                  Contact placement · conservative membrane-clearance estimates
                  (µm)
                </caption>
                <thead>
                  <tr>
                    <th>Contact / role</th>
                    <th>Depth Z</th>
                    <th>Soma</th>
                    <th>Axon</th>
                    <th>Selected</th>
                    <th>Nearest membrane</th>
                  </tr>
                </thead>
                <tbody>
                  {placement.rows.map((row) => (
                    <tr>
                      <td>
                        {row.id}
                        <br />
                        {row.role}
                      </td>
                      <td>{format(row.positionUm[2])}</td>
                      <td>{format(row.somaUm)}</td>
                      <td>{format(row.axonUm)}</td>
                      <td>{format(row.selectedUm)}</td>
                      <td>
                        {format(row.nearestUm)}
                        <br />
                        {row.nearestId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {placement.supported ? (
                <p class="cx-muted">
                  Selected contacts pass the {config.recording.exclusionUm} µm
                  numerical exclusion. This does not validate near-field
                  accuracy or mechanical clearance.
                </p>
              ) : (
                <p class="cx-error" role="alert">
                  Unsupported near-contact configuration:{" "}
                  {placement.rows
                    .filter((r) => !r.supported)
                    .map(
                      (r) =>
                        `${r.id} is ${format(r.nearestUm)} µm from ${r.nearestId}`,
                    )
                    .join("; ")}
                  . Move the array or neuron, change depth or choose different
                  contacts until all selected contacts are at least{" "}
                  {config.recording.exclusionUm} µm from the membrane. Run is
                  disabled.
                </p>
              )}
            </details>
          )}
        </section>
        <aside class="cx-analysis" id="cx-response">
          <h2>4 / Replay & inspect</h2>
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
              The scene shows your edited geometry. Previous signals are hidden
              until you rerun.
            </p>
          )}
          {!ready && (
            <div class="cx-empty">
              <span>01 → 02 → 03</span>
              <p>
                Membrane equations → transmembrane currents → contact
                potentials.
              </p>
              <p>
                No synthetic recording templates are used in this experiment.
              </p>
            </div>
          )}
          {ready && traces && (
            <>
              <div class="cx-replay">
                <label>
                  Replay speed
                  <select
                    value={replaySpeed}
                    onChange={(e) =>
                      setReplaySpeed(Number(e.currentTarget.value))
                    }
                  >
                    {[0.25, 1, 5, 10, 25, 50, 100].map((v) => (
                      <option value={v}>{v} biological ms/s</option>
                    ))}
                  </select>
                </label>
                {config.protocol.mode === "extracellular-stimulation" && (
                  <>
                    <button
                      disabled={summary.negativeFrame < 0}
                      onClick={() => {
                        setPlaying(false);
                        setFrame(summary.negativeFrame);
                      }}
                    >
                      Phase 1
                    </button>
                    <button
                      disabled={summary.positiveFrame < 0}
                      onClick={() => {
                        setPlaying(false);
                        setFrame(summary.positiveFrame);
                      }}
                    >
                      Phase 2
                    </button>
                    <button
                      disabled={summary.gapFrame < 0}
                      title={
                        summary.gapFrame < 0
                          ? "No retained interval lies entirely within the gap; decrease output sampling interval and rerun."
                          : "Inspect a retained zero-drive interval inside the gap."
                      }
                      onClick={() => {
                        setPlaying(false);
                        setFrame(summary.gapFrame);
                      }}
                    >
                      Gap
                    </button>
                  </>
                )}
                {active && result.spikes.length > 0 && [-1, 1].map((direction) => {
                  const target = adjacentSpikeFrame(result, frame, direction);
                  return (
                    <button disabled={target < 0} onClick={() => {
                      setPlaying(false);
                      setFrame(target);
                    }}>
                      {direction < 0 ? "Previous soma event" : "Next soma event"}
                    </button>
                  );
                })}
                {config.protocol.mode === "intracellular-current" && [
                  ["Step onset", config.protocol.startMs],
                  ["Step end", config.protocol.startMs + config.protocol.durationMs],
                ].map(([label, time]) => (
                  <button onClick={() => {
                    setPlaying(false);
                    setFrame(nearestFrame(result.timeMs, time));
                  }}>{label}</button>
                ))}
                <button
                  onClick={() => {
                    setPlaying(false);
                    setFrame((f) => Math.max(0, f - 1));
                  }}
                >
                  Previous sample
                </button>
                <button
                  onClick={() => {
                    if (frame === result.timeMs.length - 1) setFrame(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? "Pause replay" : "Replay"}
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
                Replay: {replaySpeed} biological ms/s. Use phase buttons or
                sample stepping to inspect short pulses. Raw ideal potentials;
                amplifier, noise, filtering and ADC are not modeled.
              </p>
              {result.warnings.map((w) => (
                <p class="cx-notice">{w}</p>
              ))}
              <label>
                Signal component
                <select
                  value={component}
                  onChange={(e) => setComponent(e.currentTarget.value)}
                >
                  <option value="neural">Neural currents only</option>
                  <option value="applied">
                    Applied source / return artifact
                  </option>
                  <option value="total">Total ideal electrode potential</option>
                </select>
              </label>
              <label>
                Recording plot reference
                <select
                  value={plotReference}
                  onChange={(e) => setPlotReference(e.currentTarget.value)}
                >
                  <option value="infinity">
                    Individual contacts A and B · infinity
                  </option>
                  <option value="bipolar">Bipolar · A − B</option>
                </select>
              </label>
              <p class="cx-muted">
                A and B are individual ideal probes relative to infinity.
                Bipolar subtracts B from A; it is not another contact. CSV
                always includes all three. Display changes need no rerun.
              </p>
              <details>
                <summary>Membrane voltage, applied field and recorded signal</summary>
                <p>
                  Membrane voltage Vₘ is the intracellular minus local extracellular potential, in mV.
                  Applied extracellular potential comes from the stimulation source and return;
                  its spatial gradient gives the electric field (E = −∇φ, V/m).
                  Potential and field are different quantities.
                </p>
                <p>
                  Neural recording is the extracellular potential generated by modeled membrane currents, in µV.
                  The applied source/return contribution at a recording contact is the ideal stimulation artifact.
                  Total adds these two contributions. A large artifact does not demonstrate membrane polarization
                  or a neuronal action potential. Electrode interface and amplifier artifacts are not modeled.
                </p>
              </details>
              <Trace
                title={
                  config.protocol.mode === "extracellular-stimulation"
                    ? "Applied input · stimulating contact A"
                    : "Applied input"
                }
                time={result.timeMs}
                unit={
                  config.protocol.mode === "extracellular-stimulation"
                    ? "µA"
                    : config.protocol.mode === "intracellular-current"
                      ? "nA"
                      : "nS"
                }
                frame={frame}
                series={[
                  {
                    label: "Interval-average input",
                    values: result.drive,
                    color: "#79619d",
                  },
                ]}
              />
              <Trace
                title={
                  plotReference === "bipolar"
                    ? "A − B potential"
                    : "Contact potentials · infinity reference"
                }
                time={result.timeMs}
                unit="µV"
                frame={frame}
                series={
                  plotReference === "bipolar"
                    ? [
                        {
                          label: "A − B",
                          values: traces.differential,
                          color: "#ba7540",
                        },
                      ]
                    : [
                        {
                          label: config.recording.contactIds[0],
                          values: traces.pair[0],
                          color: "#ba7540",
                        },
                        {
                          label: config.recording.contactIds[1],
                          values: traces.pair[1],
                          color: "#4e7fab",
                        },
                      ]
                }
              />
              <Trace
                title={
                  active
                    ? "Soma voltage · computed threshold crossings"
                    : "Soma membrane voltage"
                }
                time={result.timeMs}
                unit="mV"
                frame={frame}
                spikes={result.spikes ?? []}
                series={[
                  { label: "Soma Vₘ", values: traces.soma, color: "#b3532e" },
                ]}
              />
              {stepSummary && (
                <div class="cx-notice">
                  <strong>During the current step: {stepSummary.spikeCount} soma threshold events</strong>
                  <p>
                    Count / step duration: {format(stepSummary.countRateHz)} Hz.
                    First-event latency: {format(stepSummary.latencyMs)} ms.
                    First / last event interval: {format(stepSummary.firstIsiMs)} / {format(stepSummary.lastIsiMs)} ms.
                    {" "}— means no applicable event or interval.
                  </p>
                  <details>
                    <summary>Soma event times and intervals</summary>
                    <table>
                      <caption>All soma crossings; times from recording start. Intervals use internal detection, not saved frame peaks.</caption>
                      <thead><tr><th>Event</th><th>Time · ms</th><th>Interval · ms</th><th>During step</th></tr></thead>
                      <tbody>{stepSummary.events.map((s, i) => (
                        <tr><td>{i + 1}</td><td>{format(s.timeMs)}</td><td>{format(s.intervalMs)}</td><td>{s.duringStep ? "Yes" : "No"}</td></tr>
                      ))}</tbody>
                    </table>
                  </details>
                </div>
              )}
              {responseAnalysis && (
                <div class="cx-notice">
                  <strong>What this response establishes</strong>
                  <p>
                    Membrane polarization: largest saved change from the conditioned baseline{" "}
                    {format(responseAnalysis.polarization.maxAbsChangeMv)} mV.
                    {" "}{responseAnalysis.membraneThresholdCrossings.compartmentCount} membrane
                    compartments crossed {responseAnalysis.membraneThresholdCrossings.thresholdMv} mV;
                    {" "}{responseAnalysis.soma.thresholdEventCount} soma threshold events.
                    Junction nodes are excluded.
                  </p>
                  <p>
                    Somatic action-potential evidence: {responseAnalysis.soma.waveformEvidenceCount} of{" "}
                    {responseAnalysis.soma.thresholdEventCount} event windows contain a saved positive-voltage peak
                    followed by return below {responseAnalysis.membraneThresholdCrossings.thresholdMv} mV.
                    This is descriptive AP-like waveform evidence; a threshold crossing alone does not confirm
                    a regenerative action potential. Saved samples can miss peaks or recovery.
                  </p>
                  <p>
                    <b>Propagation is not established.</b>{" "}
                    {responseAnalysis.membraneThresholdCrossings.first &&
                      `Earliest membrane crossing: ${responseAnalysis.membraneThresholdCrossings.first.compartmentId} at ${format(responseAnalysis.membraneThresholdCrossings.first.timeMs)} ms. `}
                    {responseAnalysis.propagation.firstCrossingToSomaDelayMs !== null &&
                      `Delay to first soma crossing: ${format(responseAnalysis.propagation.firstCrossingToSomaDelayMs)} ms. `}
                    Crossing order alone cannot locate initiation or demonstrate propagation;
                    the applied field can directly polarize multiple compartments.
                  </p>
                  {config.protocol.mode === "extracellular-stimulation" && <p>
                    <b>Spatial activation boundaries remain mesh-sensitive.</b>{" "}
                    Near a boundary, changing compartment length can change the crossing classification.
                    This result does not establish a minimum neuron separation or a device's spatial resolution.
                  </p>}
                  <details>
                    <summary>Detection convention and soma waveform evidence</summary>
                    <p>
                      Upward crossings at {responseAnalysis.membraneThresholdCrossings.thresholdMv} mV
                      use internal steps ({config.solver.dtMs} ms) and a{" "}
                      {result.spikeDetection.refractoryMs} ms soma refractory counting interval.
                      Waveform evidence uses saved output ({config.solver.sampleMs} ms).
                      Each window extends from a detected soma event to the next event or recording end.
                      “Not observed” is not proof of absence. Polarization extrema also use saved frames.
                    </p>
                    {responseAnalysis.soma.events.length > 0 && <table>
                      <caption>Descriptive somatic waveform measurements</caption>
                      <thead><tr><th>Event · ms</th><th>Saved peak · mV</th><th>Return below threshold · ms</th><th>Overshoot and return</th></tr></thead>
                      <tbody>{responseAnalysis.soma.events.map((event) => (
                        <tr><td>{format(event.timeMs)}</td><td>{format(event.sampledPeakMv)}</td><td>{format(event.returnBelowThresholdTimeMs)}</td><td>{event.overshootAndReturnObserved ? "Observed" : "Not observed"}</td></tr>
                      ))}</tbody>
                    </table>}
                    <a href="/cortex/methods/#numerical-reliability">Read numerical reliability and model limits →</a>
                  </details>
                </div>
              )}
              <Trace
                title={`${selectedNode.id} · membrane voltage`}
                time={result.timeMs}
                unit="mV"
                frame={frame}
                series={[
                  {
                    label: "Computed Vₘ",
                    values: traces.voltage,
                    color: "#429b94",
                  },
                ]}
              />
              <Trace
                title={`${selectedNode.id} · outward membrane current`}
                time={result.timeMs}
                unit="nA"
                frame={frame}
                series={[
                  {
                    label: active
                      ? "Capacitive + ionic + synaptic"
                      : "Capacitive + leak + synaptic",
                    values: traces.current,
                    color: "#8e739f",
                  },
                ]}
              />
              <div class="cx-metrics">
                <span>
                  Solver time<b>{format(result.diagnostics.elapsedMs)} ms</b>
                </span>
                {active && (
                  <span>
                    Compute / simulated time
                    <b>
                      {format(
                        result.diagnostics.elapsedMs / config.solver.durationMs,
                      )}
                      ×
                    </b>
                  </span>
                )}
                <span>
                  Current-balance error
                  <b>
                    {result.diagnostics.maxConservationResidualNa.toExponential(
                      2,
                    )}{" "}
                    nA
                  </b>
                </span>
                <span>
                  Stored numeric output
                  <b>{(result.diagnostics.outputBytes / 1e6).toFixed(2)} MB</b>
                </span>
                {config.protocol.mode === "extracellular-stimulation" && (
                  <span>
                    Charge / phase / contact
                    <b>{format(result.diagnostics.cathodicChargeNc)} nC</b>
                  </span>
                )}
              </div>
              {config.protocol.mode === "extracellular-stimulation" && (
                <p class="cx-muted">
                  Geometric charge density is unavailable: exposed tip area is
                  unknown. No safety threshold is inferred.
                </p>
              )}
              <h3 id="cx-export">5 / Compare & export</h3>
              <div class="cx-export">
                <button
                  onClick={() =>
                    save(
                      resultCsv(result, component),
                      `cortex-${component}-signals.csv`,
                      "text/csv",
                    )
                  }
                >
                  Export CSV
                </button>
                <button
                  onClick={() =>
                    save(
                      encodeJson({
                        ...resultBundle(result),
                        visualization: {
                          ...displayOptions,
                          plotReference,
                          frame,
                        },
                      }),
                      "cortex-results.json",
                    )
                  }
                >
                  Results + provenance
                </button>
                <button onClick={() => setPinned(result)}>
                  Pin run as baseline
                </button>
              </div>
              {pinned && (
                <details open class="cx-inspector">
                  <summary>Comparison with pinned run</summary>
                  <p class="cx-muted">
                    Pinned baseline is retained when loading examples.{" "}
                    {changes.length} configuration fields differ; inspect them
                    before attributing an effect.
                  </p>
                  <details>
                    <summary>Changed settings</summary>
                    <ul>
                      {changes.map((change) => (
                        <li>
                          <code>{change.key}</code>:{" "}
                          {JSON.stringify(change.before) ?? "absent"} →{" "}
                          {JSON.stringify(change.after) ?? "absent"}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {chosenExample.view.baselineExampleId && (
                    <button
                      disabled={running}
                      onClick={() =>
                        loadExample(chosenExample.view.baselineExampleId)
                      }
                    >
                      Load paired comparison example
                    </button>
                  )}
                  <button onClick={() => setPinned(null)}>
                    Clear baseline
                  </button>
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
                        <td>
                          {pinned.config.neuron.modelId}
                        </td>
                        <td>{config.neuron.modelId}</td>
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
                        <td>{format(baselineSummary.neuralPeakA)}</td>
                        <td>{format(summary.neuralPeakA)}</td>
                      </tr>
                      {[
                        ["Soma peak / mV", "somaPeak"],
                        ["Soma events", "somaSpikes"],
                        ["First soma event / ms", "firstSomaMs"],
                        ["Local crossing compartments", "localCrossings"],
                        ["Peak |applied A| / µV", "artifactPeakA"],
                      ].map(([label, key]) => (
                        <tr>
                          <td>{label}</td>
                          <td>{format(baselineSummary[key])}</td>
                          <td>{format(summary[key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p class="cx-muted">
                    Zero means the soma detector found no event. Each run retains the selected specimen identity. Compare source types explicitly.
                  </p>
                  {sameTimeGrid ? (
                    <>
                      <Trace
                        title="Comparison · soma membrane voltage"
                        unit="mV"
                        time={result.timeMs}
                        frame={frame}
                        series={[
                          {
                            label: "Pinned soma",
                            values: baselineSoma,
                            color: "#8e739f",
                          },
                          {
                            label: "Current soma",
                            values: traces.soma,
                            color: "#b3532e",
                          },
                        ]}
                      />
                      <Trace
                        title="Comparison · neural recording A"
                        unit="µV"
                        time={result.timeMs}
                        frame={frame}
                        series={[
                          {
                            label: `Pinned ${pinned.recordingSiteIds[0]}`,
                            values: pinned.neuralUv[0],
                            color: "#8e739f",
                          },
                          {
                            label: `Current ${result.recordingSiteIds[0]}`,
                            values: result.neuralUv[0],
                            color: "#429b94",
                          },
                        ]}
                      />
                      <p class="cx-muted">
                        Exact shared time samples; no waveform alignment or
                        interpolation. Contact coordinates belong to each run
                        and may differ.
                      </p>
                    </>
                  ) : (
                    <p class="cx-muted">
                      Time grids differ. Summary metrics and exports remain
                      available; no interpolated trace comparison is implied.
                    </p>
                  )}
                  <button
                    onClick={() =>
                      save(
                        encodeJson({
                          schemaVersion: "cortex-comparison/1",
                          pinned: resultBundle(pinned),
                          current: resultBundle(result),
                        }),
                        "cortex-comparison.json",
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
              This model has reconstructed human temporal-cortex dendrites, fitted active channels and a short synthetic axon stub.
              It does not reconstruct a full projection axon or establish M1/S1 excitability.
              Computed threshold crossings depend on this cell, the stub, placement and numerical refinement.{" "}
              Coupled population activity, layered conductivity, finite exposed
              contacts, acquisition electronics, mechanics and independent
              experimental validation remain outside this milestone.
            </p>
            <p>
              The existing active stimulation and synthetic recording tools
              remain available under <a href="/simulations/">Simulations</a>.
              Their outputs are not validation of this model.
            </p>
            <a href="/cortex/methods/">Read the scientific scope →</a>
            <p class="cx-muted">
              {ACTIVE_ENGINE_VERSION}
            </p>
          </details>
        </aside>
      </div>
      {populationEnabled && <CortexPopulationPanel config={config} disabled={running} onBusy={setPopulationRunning}
        onScene={setPopulationScene} onLoadExample={amplitudeUa => {
          loadExample("extracellular-soma-spike");
          setConfig(c => ({ ...c, protocol: { ...c.protocol, amplitudeUa } }));
        }}
        Trace={Trace} onTarget={target => {
          setResult(target); setFrame(0); setSelected(0); setPlaying(false);
          setRunStage("Population complete. Replaying the target cell; population totals are below.");
        }} />}
    </section>
  );
}
