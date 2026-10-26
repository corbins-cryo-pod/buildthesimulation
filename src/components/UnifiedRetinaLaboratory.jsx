import { useEffect, useRef, useState, useMemo } from "preact/hooks";
import SimHero from "./SimHero.jsx";
import {
  cloneDefaults,
  normalize,
  VERSION,
  parseExperiment,
  exportExperiment,
  importDesigner,
  fromLegacyElectrical,
  fromLegacyPrima,
} from "../lib/retina-lab/schema.mjs";
import { createClient } from "../lib/retina-lab/client.mjs";
import { decodeResponse } from "../lib/retina-lab/engine.mjs";
import { PRESETS as ELECTRICAL_PRESETS } from "../lib/retinal-implant/model.mjs";
import {
  PRESETS as PRIMA_PRESETS,
  DEFAULT_CONFIG as PRIMA_DEFAULTS,
} from "../lib/prima/model.mjs";
import "../styles/retina-lab.css";

const MODES = [
  ["electrical", "Epiretinal · electrical"],
  ["photovoltaic", "PRIMA · photovoltaic"],
  ["optogenetic", "Retinal optogenetics"],
  ["hybrid", "Electrical + optogenetic"],
];
const FIDELITY = [
  ["recruitment", "Tier 1 · recruitment"],
  ["network", "Tier 2 · retinal network"],
  ["cable", "Tier 3 · selected active cable"],
];
const CONDITIONS = [
  ["healthy", "Healthy"],
  ["degeneration", "Advanced degeneration"],
  ["rp", "RP-like peripheral loss"],
  ["ga", "Geographic atrophy"],
  ["selective", "Selective cell loss"],
  ["ganglion", "Ganglion dysfunction"],
  ["lesion", "Localized tissue injury"],
];
const labelMode = (id) => MODES.find((p) => p[0] === id)?.[1] ?? id;
const fmt = (v, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : Math.abs(v) > 1e5 || (Math.abs(v) < 0.01 && v !== 0)
      ? v.toExponential(2)
      : v.toLocaleString(undefined, { maximumFractionDigits: d });
function download(name, value, type = "application/json") {
  const blob = new Blob(
      [typeof value === "string" ? value : JSON.stringify(value)],
      { type },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Select({ label, value, options, onChange, id }) {
  return (
    <label class="rtl-control">
      <span>{label}</span>
      <select
        data-rtl-setting={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {options.map((x) => (
          <option value={Array.isArray(x) ? x[0] : x}>
            {Array.isArray(x) ? x[1] : x}
          </option>
        ))}
      </select>
    </label>
  );
}
function NumberField({ label, value, min, max, step = 1, onChange, id, unit }) {
  return (
    <label class="rtl-control rtl-number">
      <span>
        {label}
        {unit && <small>{unit}</small>}
      </span>
      <input
        data-rtl-setting={id}
        aria-label={label}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) =>
          onChange(
            e.currentTarget.value === "" ? NaN : Number(e.currentTarget.value),
          )
        }
      />
    </label>
  );
}
function Check({ label, value, onChange }) {
  return (
    <label class="rtl-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      {label}
    </label>
  );
}
function Metric({ label, value, unit }) {
  return (
    <div class="rtl-metric">
      <dt>{label}</dt>
      <dd>
        {fmt(value)} <small>{unit}</small>
      </dd>
    </div>
  );
}
function Raster({ image, label, onSelect }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current,
      ctx = c.getContext("2d");
    ctx.fillStyle = "#101617";
    ctx.fillRect(0, 0, c.width, c.height);
    if (!image) return;
    const data = new ImageData(image.width, image.height),
      values = image.values ?? image.brightness;
    for (let i = 0; i < values.length; i++) {
      const v = Math.max(0, Math.min(1, values[i]));
      data.data[i * 4] = Math.round(v * 245);
      data.data[i * 4 + 1] = Math.round(v * 239);
      data.data[i * 4 + 2] = Math.round(v * 219);
      data.data[i * 4 + 3] = 255;
    }
    const tmp = document.createElement("canvas");
    tmp.width = image.width;
    tmp.height = image.height;
    tmp.getContext("2d").putImageData(data, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, c.width, c.height);
  }, [image]);
  return (
    <canvas
      ref={ref}
      width="384"
      height="384"
      role="img"
      aria-label={label}
      onClick={(e) => {
        if (!onSelect) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSelect(
          (e.clientX - r.left) / r.width,
          (e.clientY - r.top) / r.height,
        );
      }}
    />
  );
}
function Trace({
  time = [],
  values = [],
  label,
  unit,
  spikes,
  total = 1,
  until = 200,
}) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current,
      ctx = c.getContext("2d"),
      w = c.width,
      h = c.height;
    ctx.fillStyle = "#182023";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#354447";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(42, (i * (h - 38)) / 5 + 10);
      ctx.lineTo(w - 10, (i * (h - 38)) / 5 + 10);
      ctx.stroke();
    }
    ctx.fillStyle = "#ccc4ad";
    ctx.font = "12px Arial";
    if (spikes) {
      ctx.strokeStyle = "#d7b978";
      for (const s of spikes) {
        const x = 42 + (s.timeMs / until) * (w - 55),
          y = 15 + (s.cell / total) * (h - 45);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 2);
        ctx.stroke();
      }
      ctx.fillText("RGC samples", 45, 13);
      ctx.fillText(`${until} ms`, w - 65, h - 6);
      return;
    }
    const finite = values.filter(Number.isFinite);
    if (!finite.length) {
      ctx.fillText("Run this model to obtain a recording", 48, h / 2);
      return;
    }
    let lo = Math.min(...finite),
      hi = Math.max(...finite);
    if (hi === lo) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.1;
    lo -= pad;
    hi += pad;
    const end = time.at(-1) || until;
    ctx.strokeStyle = "#dbbd80";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < time.length; i++) {
      const x = 42 + (time[i] / end) * (w - 55),
        y = h - 28 - ((values[i] - lo) / (hi - lo)) * (h - 45);
      if (!Number.isFinite(y)) continue;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#ccc4ad";
    ctx.fillText(fmt(hi, 1), 2, 20);
    ctx.fillText(fmt(lo, 1), 2, h - 30);
    ctx.fillText(`0 → ${fmt(end, 1)} ms`, w - 110, h - 6);
    ctx.fillText(unit || "", 46, 14);
  }, [time, values, spikes, total, until]);
  return (
    <canvas ref={ref} width="640" height="210" role="img" aria-label={label} />
  );
}
function Anatomy({
  config,
  result,
  view,
  overlay,
  frame,
  layers,
  onSelect,
  onPlace,
}) {
  const host = useRef(),
    api = useRef(),
    [error, setError] = useState(""),
    latest = useRef();
  latest.current = { config, result, view, overlay, frame, layers };
  const actions = useRef();
  actions.current = { onSelect, onPlace };
  useEffect(() => {
    let dead = false;
    import("../lib/retina-lab/scene.js")
      .then(({ createScene }) => {
        if (!dead) {
          api.current = createScene(host.current, {
            onSelect: (id) => actions.current.onSelect(id),
            onPlace: (p) => actions.current.onPlace(p),
            onUnavailable: setError,
          });
          api.current.update(latest.current);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      dead = true;
      api.current?.dispose();
    };
  }, []);
  useEffect(() => {
    try {
      api.current?.update(latest.current);
    } catch (e) {
      setError(e.message);
    }
  }, [config, result, view, overlay, frame, layers]);
  return (
    <div class="rtl-anatomy">
      <div ref={host} class="rtl-viewport" />
      <div class="rtl-view-note">
        {view === "whole"
          ? "Retinal surface · fovea-centered coordinates"
          : "Microscopic section · physical depth, density-reduced cells"}
        <br />
        <span>Drag to orbit · scroll to zoom · shift-drag to place</span>
      </div>
      <button class="rtl-reset" onClick={() => api.current?.reset()}>
        Reset camera
      </button>
      {error && (
        <div class="rtl-graphics-error" role="status">
          {error}
        </div>
      )}
    </div>
  );
}
async function loadMedia(file) {
  if (!file || file.size > 80e6)
    throw Error("Choose a local image or video smaller than 80 MB.");
  const url = URL.createObjectURL(file),
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const raster = (media) => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 128, 128);
    const w = media.videoWidth ?? media.naturalWidth,
      h = media.videoHeight ?? media.naturalHeight,
      side = Math.min(w, h);
    ctx.drawImage(
      media,
      (w - side) / 2,
      (h - side) / 2,
      side,
      side,
      0,
      0,
      128,
      128,
    );
    const rgba = ctx.getImageData(0, 0, 128, 128).data;
    return {
      width: 128,
      height: 128,
      values: Array.from(
        { length: 128 * 128 },
        (_, i) =>
          (0.2126 * rgba[4 * i] +
            0.7152 * rgba[4 * i + 1] +
            0.0722 * rgba[4 * i + 2]) /
          255,
      ),
    };
  };
  try {
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () =>
          reject(Error("This video codec could not be decoded."));
        video.src = url;
      });
      if (!Number.isFinite(video.duration))
        throw Error("Video has no finite duration.");
      const frames = [];
      for (let i = 0; i < 8; i++) {
        const t = Math.min(
          video.duration - 0.01,
          (i * Math.min(video.duration, 2)) / 8,
        );
        if (t > 0)
          await new Promise((resolve) => {
            video.onseeked = resolve;
            video.currentTime = t;
          });
        frames.push(raster(video));
      }
      const frameMs = Math.max(20, Math.min(250, (video.duration * 1000) / 8));
      video.removeAttribute("src");
      video.load();
      return { frames, stimulus: "video", frameIndex: 0, frameMs };
    }
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(Error("Image could not be decoded."));
      img.src = url;
    });
    return { customImage: raster(img), stimulus: "image", frames: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ConfigurationEditor({ config, onApply }) {
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    setText(JSON.stringify(config, null, 2));
    setError("");
  }, [config]);
  return (
    <details class="rtl-config-editor">
      <summary>Complete experiment settings</summary>
      <p class="rtl-note">
        All retained engine parameters are editable here, including legacy eye,
        sampling and image settings. Applying settings clears calculated
        results.
      </p>
      <textarea
        aria-label="Complete experiment JSON settings"
        rows="16"
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
      />
      <button
        onClick={() => {
          try {
            onApply(JSON.parse(text));
            setError("");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        Apply settings
      </button>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}

export default function UnifiedRetinaLaboratory() {
  const [config, setConfig] = useState(cloneDefaults),
    [result, setResult] = useState(null),
    [state, setState] = useState("loading"),
    [progress, setProgress] = useState({
      progress: 0,
      message: "Preparing the shared laboratory",
    }),
    [error, setError] = useState(""),
    [view, setView] = useState("tissue"),
    [overlay, setOverlay] = useState("none"),
    [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false),
    [timeView, setTimeView] = useState(false),
    [layers, setLayers] = useState({}),
    [comparison, setComparison] = useState(null),
    [otherMode, setOtherMode] = useState("photovoltaic"),
    [sweep, setSweep] = useState([]),
    [clip, setClip] = useState([]),
    [clipIndex, setClipIndex] = useState(0),
    [recording, setRecording] = useState("current");
  const client = useRef(),
    counter = useRef(0),
    configRef = useRef(config),
    importRef = useRef(),
    designerRef = useRef(),
    mediaRef = useRef();
  configRef.current = config;
  const displayRef = useRef(config);
  const displayConfig = useMemo(() => {
    try {
      displayRef.current = normalize(config);
    } catch {}
    return displayRef.current;
  }, [config]);
  const active = clip.length ? clip[clipIndex] : result,
    busy = state === "running",
    pv = config.modality === "photovoltaic",
    optical = config.modality === "optogenetic" || config.modality === "hybrid",
    dirty = state === "dirty";
  async function run(next = configRef.current) {
    const id = ++counter.current;
    client.current?.cancel();
    setError("");
    setResult(null);
    setClip([]);
    setFrame(0);
    setTimeView(false);
    setPlaying(false);
    setState("running");
    try {
      const c = normalize(next);
      setConfig(c);
      const r = await client.current.run(c, setProgress);
      if (id !== counter.current) return;
      setResult(r);
      setState("complete");
    } catch (e) {
      if (id !== counter.current || e.name === "AbortError") return;
      setError(e.message);
      setState("error");
    }
  }
  function edit(section, key, value) {
    const current = configRef.current,
      next = section
        ? { ...current, [section]: { ...current[section], [key]: value } }
        : { ...current, [key]: value };
    if (section === "scene" || key === "modality") next.inputMode = "shared";
    invalidate(next);
  }
  function invalidate(next) {
    if (next.modality === otherMode)
      setOtherMode(
        next.modality === "electrical" ? "photovoltaic" : "electrical",
      );
    setComparison(null);
    setSweep([]);
    counter.current++;
    client.current?.cancel();
    setConfig(next);
    setResult(null);
    setClip([]);
    setFrame(0);
    setTimeView(false);
    setPlaying(false);
    setError("");
    setState("dirty");
  }
  useEffect(() => {
    client.current = createClient();
    const c = cloneDefaults(),
      q = new URLSearchParams(location.search);
    if (MODES.some((x) => x[0] === q.get("technology")))
      c.modality = q.get("technology");
    setConfig(c);
    setOtherMode(c.modality === "photovoltaic" ? "electrical" : "photovoltaic");
    run(c);
    return () => {
      counter.current++;
      client.current.dispose();
    };
  }, []);
  useEffect(() => {
    if (!playing || !active) return;
    const timer = setInterval(
      () => setFrame((i) => (i + 1) % active.neural.frames.length),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, active]);
  function preset(id) {
    const c = cloneDefaults();
    if (id === "degeneration") {
      c.modality = "photovoltaic";
      c.tissue.condition = "ga";
      c.scene.featureUm = 160;
    }
    if (id === "placement") {
      c.electrical.pattern = "single";
      c.inputMode = "legacy-electrical";
      c.placement.xUm = -1000;
      c.electrical.gapUm = 75;
      c.percept = "coupled";
    }
    if (id === "optical") {
      c.modality = "optogenetic";
      c.scene.stimulus = "spot";
      c.scene.featureUm = 800;
    }
    if (id === "cable") {
      c.fidelity = "cable";
      c.neural.selectedIndex = 285;
      c.neural.durationMs = 100;
      c.electrical.trainDurationMs = 100;
    }
    setComparison(null);
    setSweep([]);
    run(c);
  }
  function nf(section, key, label, unit, min, max, step = 1) {
    return (
      <NumberField
        label={label}
        unit={unit}
        value={config[section][key]}
        min={min}
        max={max}
        step={step}
        id={`${section}.${key}`}
        onChange={(v) => edit(section, key, v)}
      />
    );
  }
  const selectContact = (id) => {
    if (pv) edit("photovoltaic", "selectedPixelId", id);
    else edit("electrical", "selectedId", id);
  };
  async function compare() {
    const id = ++counter.current;
    setState("running");
    setError("");
    try {
      const c = normalize(configRef.current);
      const first = result ?? (await client.current.run(c, setProgress));
      const next = structuredClone(c);
      next.modality =
        otherMode === c.modality
          ? c.modality === "electrical"
            ? "photovoltaic"
            : "electrical"
          : otherMode;
      next.inputMode = "shared";
      const b = await client.current.run(next, setProgress);
      if (id !== counter.current) return;
      setResult(first);
      setComparison({ a: first, b });
      setState("complete");
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
        setState("error");
      }
    }
  }
  async function runSweep() {
    const id = ++counter.current;
    setState("running");
    setError("");
    setSweep([]);
    try {
      const c = normalize(configRef.current),
        gaps = pv ? [10, 25, 50, 75, 100] : [25, 75, 150, 300, 600],
        rows = [];
      for (const gap of gaps) {
        const next = structuredClone(c);
        next[pv ? "photovoltaic" : "electrical"].gapUm = gap;
        const r = await client.current.run(next, (p) =>
          setProgress({ ...p, message: `Gap ${gap} µm · ${p.message}` }),
        );
        if (id !== counter.current) return;
        rows.push({
          gap,
          mean: r.metrics.meanResponse,
          spikes: r.metrics.totalSpikes,
          field: pv
            ? r.metrics.peakBipolarDriveMv
            : r.metrics.peakGanglionDriveMv,
        });
        setSweep([...rows]);
      }
      setState(result ? "complete" : "dirty");
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
        setState("error");
      }
    }
  }
  async function runClip() {
    const id = ++counter.current;
    setState("running");
    setError("");
    setClip([]);
    try {
      const c = normalize(configRef.current),
        count = c.scene.frames?.length ?? 8,
        frames = [];
      for (let i = 0; i < count; i++) {
        const next = structuredClone(c);
        next.scene.frameIndex = i;
        const r = await client.current.run(next, (p) =>
          setProgress({
            ...p,
            message: `Scene ${i + 1}/${count} · ${p.message}`,
          }),
        );
        if (id !== counter.current) return;
        frames.push(r);
      }
      setClip(frames);
      setClipIndex(0);
      setResult(frames[0]);
      setConfig(frames[0].config);
      setState("complete");
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
        setState("error");
      }
    }
  }
  async function importFile(event, kind) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (kind === "media") {
        const patch = await loadMedia(file);
        invalidate({
          ...configRef.current,
          inputMode: "shared",
          scene: { ...configRef.current.scene, ...patch },
        });
      } else if (kind === "designer") {
        const contacts = importDesigner(await file.text());
        invalidate({
          ...configRef.current,
          customContacts: contacts,
          modality: "electrical",
          inputMode: "shared",
        });
      } else run(parseExperiment(await file.text()));
    } catch (e) {
      setError(e.message);
    }
  }
  function saveJSON() {
    try {
      download(
        `${active.experimentId}.json`,
        exportExperiment(active.config, active),
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function saveCSV() {
    const r = active;
    const lines = [
      `# ${VERSION} ${r.experimentId}`,
      `# ${r.neural.note}`,
      "sample_id,retinal_x_um,retinal_y_um,visual_x_deg,visual_y_deg,response,response_unit,photoreceptor_survival,bipolar_survival,ganglion_survival,ganglion_drive_mV,bipolar_drive_mV,optical_mW_mm2",
    ];
    r.neural.cells.forEach((p, i) =>
      lines.push(
        [
          p.id,
          p.xUm,
          p.yUm,
          p.xDeg,
          p.yDeg,
          r.neural.response[i],
          r.neural.units,
          p.survival.photoreceptor,
          p.survival.bipolar,
          p.survival.ganglion,
          r.drive.ganglionMv[i],
          r.drive.bipolarMv[i],
          r.drive.optical[i],
        ].join(","),
      ),
    );
    download(`${r.experimentId}.csv`, lines.join("\n"), "text/csv");
  }
  function report() {
    const a = active,
      b = comparison?.b;
    download(
      `${a.experimentId}-report.txt`,
      [
        `RETINA LABORATORY · EXPERIMENT REPORT`,
        `${a.experimentId} / ${VERSION}`,
        `Model: ${a.config.fidelity}`,
        `Modality: ${labelMode(a.config.modality)}`,
        `Coordinates: ${a.provenance.coordinates}`,
        `Metrics: ${JSON.stringify(a.metrics, null, 2)}`,
        `Comparison: ${b ? JSON.stringify({ mode: b.config.modality, metrics: b.metrics }) : "None"}`,
        `Gap sweep: ${JSON.stringify(sweep)}`,
        `Assumptions: ${a.warnings.join("\n")}`,
        a.neural.note,
        `Configuration: ${JSON.stringify(a.config)}`,
      ].join("\n\n"),
      "text/plain",
    );
  }
  const currentFrame =
      active?.neural.frames[Math.min(frame, active.neural.frames.length - 1)],
    responseFrame =
      active && timeView
        ? decodeResponse(active.config, active.neural, currentFrame)
        : active?.response;
  const selectedCell = active?.neural.cells[active.config.neural.selectedIndex],
    contact = active?.electrical?.contacts.find(
      (p) => p.id === config.electrical.selectedId,
    ),
    pixel = active?.photovoltaic?.physics.pixelMetrics.find(
      (p) => p.id === config.photovoltaic.selectedPixelId,
    ),
    wave =
      active?.electrical?.waveform ?? active?.photovoltaic?.physics.waveform;
  const trace =
    recording === "voltage"
      ? {
          time: active?.cable?.timeMs ?? active?.neural.traces.timeMs,
          values: active?.cable?.voltageMv ?? active?.neural.traces.voltageMv,
          unit: "mV",
        }
      : recording === "photovoltage"
        ? { time: wave?.timeMs, values: wave?.diodeVoltageV, unit: "V" }
        : recording === "population"
          ? {
              time: active?.neural.traces.timeMs,
              values: active?.neural.traces.populationHz,
              unit: "spikes/s per sample",
            }
          : recording === "photocurrent"
            ? {
                time: active?.neural.traces.timeMs,
                values: active?.neural.traces.photocurrentPa,
                unit: "pA",
              }
            : recording === "heat"
              ? {
                  time: active?.thermal?.timeMs,
                  values: active?.thermal?.deltaK,
                  unit: "K rise",
                }
              : { time: wave?.timeMs, values: wave?.currentUa, unit: "µA" };
  return (
    <main
      class="rtl-lab"
      data-retina-lab
      data-state={state}
      data-model-version={VERSION}
    >
      <SimHero
        kicker="Visual neuroprostheses / one experimental retina"
        title="Retina Laboratory"
        intro="Place an implant. Follow the signal. Explore the resulting vision."
        links={[
          {
            href: "/simulations/retinal-implant/methods/",
            label: "Models & evidence",
          },
          {
            href: "/devices/177-science-prima-subretinal-photovoltaic-implant/",
            label: "PRIMA device sheet",
          },
        ]}
      />
      <div class="rtl-experiments" aria-label="Example experiments">
        <span class="rtl-tech">Experiment</span>
        {[
          ["comparison", "01 · Electrical & PRIMA"],
          ["degeneration", "02 · What survives?"],
          ["placement", "03 · Placement & spread"],
          ["optical", "04 · Optogenetic response"],
          ["cable", "05 · Active neuron"],
        ].map(([id, title]) => (
          <button
            data-rtl-preset={id}
            onClick={() => preset(id)}
            disabled={busy}
          >
            {title}
          </button>
        ))}
      </div>
      <section class="rtl-toolbar" aria-label="Experiment controls">
        <Select
          label="Technology"
          id="modality"
          value={config.modality}
          options={MODES}
          onChange={(v) => edit(null, "modality", v)}
        />
        <Select
          label="Tissue condition"
          id="tissue.condition"
          value={config.tissue.condition}
          options={CONDITIONS}
          onChange={(v) => edit("tissue", "condition", v)}
        />
        <Select
          label="Response model"
          id="fidelity"
          value={config.fidelity}
          options={FIDELITY}
          onChange={(v) => edit(null, "fidelity", v)}
        />
        <div class="rtl-run">
          <button
            class="rtl-primary"
            data-rtl="run"
            onClick={() => run()}
            disabled={busy}
          >
            Run experiment <span>↗</span>
          </button>
          <button
            data-rtl="cancel"
            disabled={!busy}
            onClick={() => {
              counter.current++;
              client.current.cancel();
              setState("dirty");
              setProgress({ progress: 0, message: "Calculation cancelled" });
            }}
          >
            Cancel
          </button>
        </div>
      </section>
      <div class="rtl-status" role="status" aria-live="polite">
        <span class={`rtl-status-dot ${state}`} />
        {error ||
          (busy
            ? progress.message
            : dirty
              ? "Settings changed · run to calculate new results"
              : state === "complete"
                ? `${active?.experimentId} · ${fmt(active?.metrics.elapsedMs / 1000, 1)} s calculation · ${active?.neural.model}`
                : progress.message)}
        {busy && <progress max="1" value={progress.progress} />}
      </div>
      {error && (
        <p class="rtl-error" role="alert">
          {error}
        </p>
      )}
      <div class="rtl-workspace">
        <aside class="rtl-controls" aria-label="Device and stimulus settings">
          <div class="rtl-panel-heading">
            <span class="rtl-tech">01 / Configuration</span>
            <h2>Device & stimulus</h2>
          </div>
          <details open>
            <summary>Placement</summary>
            <div class="rtl-fields">
              {nf("placement", "xUm", "Retinal x", "µm", -3000, 3000, 25)}
              {nf("placement", "yUm", "Retinal y", "µm", -3000, 3000, 25)}
              {nf("placement", "rotationDeg", "Rotation", "°", -180, 180, 5)}
              {pv
                ? nf(
                    "photovoltaic",
                    "gapUm",
                    "Implant–bipolar gap",
                    "µm",
                    10,
                    100,
                    5,
                  )
                : config.modality !== "optogenetic"
                  ? nf(
                      "electrical",
                      "gapUm",
                      "Electrode–retina gap",
                      "µm",
                      25,
                      1000,
                      25,
                    )
                  : null}
            </div>
            <p class="rtl-note">
              Translation and rotation resample the scene and physical fields.
              Shift-drag the 3D view to move the implant.
            </p>
          </details>
          <details open>
            <summary>
              {pv
                ? "Photovoltaic conversion"
                : optical && config.modality === "optogenetic"
                  ? "Optical stimulation"
                  : "Electrical stimulation"}
            </summary>
            {pv ? (
              <>
                <div class="rtl-device-spec">
                  <strong>PRIMA reference</strong>
                  <span>378 pixels · 100 μm · 2 × 2 mm</span>
                  <span>880 nm → two photodiodes → current</span>
                </div>
                <div class="rtl-fields">
                  {nf(
                    "photovoltaic",
                    "irradianceMwMm2",
                    "Irradiance",
                    "mW/mm²",
                    0,
                    4,
                    0.1,
                  )}
                  {nf(
                    "photovoltaic",
                    "pulseDurationMs",
                    "Optical pulse",
                    "ms",
                    0.7,
                    9.8,
                    0.1,
                  )}
                  {nf(
                    "photovoltaic",
                    "frequencyHz",
                    "Pulse frequency",
                    "Hz",
                    1,
                    40,
                    1,
                  )}
                  {nf("photovoltaic", "cycles", "Periods", "", 1, 8, 1)}
                </div>
              </>
            ) : config.modality !== "optogenetic" ? (
              <>
                <Select
                  label="Array geometry"
                  value={config.electrical.device}
                  options={["argus-ii", "grid", "hex"]}
                  onChange={(v) => edit("electrical", "device", v)}
                />
                <div class="rtl-fields">
                  {nf(
                    "electrical",
                    "amplitudeUa",
                    "Peak contact current",
                    "µA",
                    0,
                    300,
                    5,
                  )}
                  {nf(
                    "electrical",
                    "phaseDurationMs",
                    "Phase duration",
                    "ms",
                    0.05,
                    1,
                    0.05,
                  )}
                  {nf(
                    "electrical",
                    "frequencyHz",
                    "Pulse frequency",
                    "Hz",
                    1,
                    100,
                    1,
                  )}
                  {nf(
                    "electrical",
                    "trainDurationMs",
                    "Train duration",
                    "ms",
                    20,
                    1000,
                    10,
                  )}
                </div>
                <Select
                  label="Delivery"
                  value={config.electrical.sequence}
                  options={["simultaneous", "interleaved"]}
                  onChange={(v) => edit("electrical", "sequence", v)}
                />
                <Select
                  label="Leading phase"
                  value={config.polarity}
                  options={["cathodic-first", "anodic-first"]}
                  onChange={(v) => edit(null, "polarity", v)}
                />
                <Select
                  label="Return"
                  value={config.electrical.returnMode}
                  options={["remote", "ring"]}
                  onChange={(v) => edit("electrical", "returnMode", v)}
                />
              </>
            ) : null}
            {optical && (
              <>
                <Select
                  label="Opsin"
                  value={config.optical.opsin}
                  options={["chrimsonr", "chr2", "chronos"]}
                  onChange={(v) => edit("optical", "opsin", v)}
                />
                <Select
                  label="Expression target"
                  value={config.optical.target}
                  options={["ganglion", "bipolar"]}
                  onChange={(v) => edit("optical", "target", v)}
                />
                <div class="rtl-fields">
                  {nf(
                    "optical",
                    "wavelengthNm",
                    "Wavelength",
                    "nm",
                    400,
                    950,
                    10,
                  )}
                  {nf(
                    "optical",
                    "irradianceMwMm2",
                    "Incident light",
                    "mW/mm²",
                    0,
                    4,
                    0.1,
                  )}
                  {nf(
                    "optical",
                    "expression",
                    "Expression scale",
                    "×",
                    0,
                    4,
                    0.1,
                  )}
                  {nf(
                    "optical",
                    "pulseMs",
                    "Optical pulse",
                    "ms",
                    0.1,
                    30,
                    0.5,
                  )}
                  {nf(
                    "optical",
                    "frequencyHz",
                    "Light frequency",
                    "Hz",
                    1,
                    100,
                  )}
                  {nf("optical", "delayMs", "Optical delay", "ms", 0, 100, 1)}
                </div>
              </>
            )}
          </details>
          <details>
            <summary>Geometry & contact selection</summary>
            {!pv && config.modality !== "optogenetic" && (
              <div class="rtl-fields">
                {nf("electrical", "rows", "Rows", "", 2, 16)}
                {nf("electrical", "cols", "Columns", "", 2, 16)}
                {nf(
                  "electrical",
                  "pitchUm",
                  "Contact pitch",
                  "µm",
                  250,
                  1000,
                  25,
                )}
                {nf(
                  "electrical",
                  "diameterUm",
                  "Contact diameter",
                  "µm",
                  100,
                  500,
                  25,
                )}
              </div>
            )}
            <Select
              label={pv ? "Selected pixel" : "Selected electrode"}
              value={
                pv
                  ? config.photovoltaic.selectedPixelId
                  : config.electrical.selectedId
              }
              options={
                pv
                  ? Array.from(
                      { length: 378 },
                      (_, i) => "P" + String(i + 1).padStart(3, "0"),
                    )
                  : (
                      config.customContacts ??
                      active?.electrical?.contacts ??
                      Array.from(
                        {
                          length:
                            config.electrical.rows * config.electrical.cols,
                        },
                        (_, i) => ({
                          id: "E" + String(i + 1).padStart(2, "0"),
                        }),
                      )
                    ).map((p) => p.id)
              }
              onChange={selectContact}
            />
            <NumberField
              label="Selected channel gain"
              unit="× scene"
              min={0}
              max={1}
              step={0.1}
              value={
                config.driveWeights[
                  pv
                    ? config.photovoltaic.selectedPixelId
                    : config.electrical.selectedId
                ] ?? 1
              }
              onChange={(v) =>
                edit(null, "driveWeights", {
                  ...config.driveWeights,
                  [pv
                    ? config.photovoltaic.selectedPixelId
                    : config.electrical.selectedId]: v,
                })
              }
            />
            <button onClick={() => designerRef.current.click()}>
              Import Designer geometry
            </button>
            {config.customContacts && (
              <>
                <p class="rtl-note">
                  {config.customContacts.length} imported circular contacts.
                  Coordinates retained; Designer downward y is converted to
                  retinal upward y.
                </p>
                <button onClick={() => edit(null, "customContacts", null)}>
                  Use reference array
                </button>
              </>
            )}
            <p class="rtl-note">
              Imported circles use the verified disk solver. Other contact
              shapes are rejected explicitly.
            </p>
          </details>
          <details>
            <summary>Physics & numerical controls</summary>
            <div class="rtl-fields">
              {nf(
                pv ? "photovoltaic" : "electrical",
                "conductivitySm",
                "Conductivity",
                "S/m",
                0.05,
                1,
                0.05,
              )}
              {nf("neural", "durationMs", "Response window", "ms", 20, 400, 10)}
              {nf(
                "neural",
                "timeStepMs",
                "Network step",
                "ms",
                0.025,
                0.2,
                0.025,
              )}
            </div>
            {pv ? (
              <div class="rtl-fields">
                {nf(
                  "photovoltaic",
                  "timeStepMs",
                  "Circuit step",
                  "ms",
                  0.025,
                  0.5,
                  0.025,
                )}
                {nf(
                  "photovoltaic",
                  "responsivityAW",
                  "Responsivity",
                  "A/W",
                  0.1,
                  0.65,
                  0.05,
                )}
                {nf(
                  "photovoltaic",
                  "capacitanceDensityFm2",
                  "Interface capacitance",
                  "F/m²",
                  1,
                  40,
                )}
                {nf(
                  "photovoltaic",
                  "shuntMohm",
                  "Shunt resistance",
                  "MΩ",
                  0.1,
                  10,
                  0.1,
                )}
                {nf(
                  "photovoltaic",
                  "activeRadiusUm",
                  "Active radius",
                  "µm",
                  8,
                  20,
                )}
                {nf(
                  "photovoltaic",
                  "returnWidthUm",
                  "Return width",
                  "µm",
                  2,
                  6,
                )}
                {nf(
                  "photovoltaic",
                  "diodeIdeality",
                  "Diode ideality",
                  "",
                  1,
                  2,
                  0.05,
                )}
                {nf(
                  "photovoltaic",
                  "diodeSaturationNa",
                  "Diode saturation",
                  "nA",
                  0.00001,
                  0.1,
                  0.00001,
                )}
                {nf(
                  "photovoltaic",
                  "bipolarLengthUm",
                  "Bipolar extent",
                  "µm",
                  20,
                  100,
                  5,
                )}
                {nf(
                  "photovoltaic",
                  "offsetXUm",
                  "Projection x alignment",
                  "µm",
                  -2000,
                  2000,
                  25,
                )}
                {nf(
                  "photovoltaic",
                  "offsetYUm",
                  "Projection y alignment",
                  "µm",
                  -2000,
                  2000,
                  25,
                )}
              </div>
            ) : (
              <>
                <Select
                  label="Electrical field region"
                  value={config.electrical.fieldView}
                  options={["array", "selected"]}
                  onChange={(v) => edit("electrical", "fieldView", v)}
                />
                <Select
                  label="Field grid"
                  value={config.electrical.fieldGridSize}
                  options={[61, 121, 241]}
                  onChange={(v) => edit("electrical", "fieldGridSize", +v)}
                />
                <div class="rtl-fields">
                  {nf(
                    "electrical",
                    "fieldSpanUm",
                    "Local field span",
                    "µm",
                    500,
                    10000,
                    100,
                  )}
                  {nf(
                    "electrical",
                    "interphaseMs",
                    "Interphase gap",
                    "ms",
                    0,
                    0.5,
                    0.025,
                  )}
                  {nf(
                    "electrical",
                    "totalCurrentUa",
                    "Summed current budget",
                    "µA",
                    10,
                    10000,
                    10,
                  )}
                </div>
                <Select
                  label="Current budgeting"
                  value={config.electrical.budgetMode}
                  options={["peak", "total-current"]}
                  onChange={(v) => edit("electrical", "budgetMode", v)}
                />
              </>
            )}
            {(optical || pv) && (
              <div class="rtl-fields">
                {nf(
                  "optical",
                  "absorptionMmInv",
                  "Absorption coefficient",
                  "mm⁻¹",
                  0,
                  5,
                  0.05,
                )}
                {nf(
                  "optical",
                  "scatteringMmInv",
                  "Reduced scattering",
                  "mm⁻¹",
                  0,
                  20,
                  0.1,
                )}
                {nf(
                  "optical",
                  "coolingMs",
                  "Assumed thermal cooling",
                  "ms",
                  10,
                  5000,
                  50,
                )}
              </div>
            )}
            <p class="rtl-note">
              Isotropic homogeneous conductors. Optical attenuation and lumped
              temperature are explicit research approximations.
            </p>
          </details>
        </aside>
        <section class="rtl-center" aria-label="Retinal anatomy">
          <div class="rtl-scene-toolbar">
            <div class="rtl-segmented">
              {[
                ["whole", "Whole retina"],
                ["tissue", "Microscope"],
                ["section", "Section"],
                ["plan", "En face"],
              ].map(([v, label]) => (
                <button
                  data-rtl-view={v}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              aria-label="Anatomical overlay"
              value={overlay}
              onChange={(e) => setOverlay(e.currentTarget.value)}
            >
              {[
                ["none", "Anatomy"],
                ["field", "Extracellular potential"],
                ["light", "Optical irradiance"],
                ["voltage", "Network voltage"],
                ["spikes", "Spiking activity"],
                ["synapses", "Bipolar activity"],
                ["damage", "Tissue damage"],
                ["heat", "Lumped heating"],
              ].map(([v, t]) => (
                <option value={v}>{t}</option>
              ))}
            </select>
          </div>
          <Anatomy
            config={displayConfig}
            result={active}
            view={view}
            overlay={overlay}
            frame={frame}
            layers={layers}
            onSelect={selectContact}
            onPlace={(p) =>
              invalidate({
                ...configRef.current,
                placement: { ...configRef.current.placement, ...p },
              })
            }
          />
          <div class="rtl-layers" aria-label="Visible structures">
            {[
              ["retina", "Tissue"],
              ["ganglion", "Ganglion cells"],
              ["interneurons", "Interneurons"],
              ["photoreceptors", "Photoreceptors"],
              ["device", "Implant"],
              ["vessels", "Vessels"],
              ["fibers", "Axons"],
              ["labels", "Labels"],
            ].map(([id, label]) => (
              <Check
                label={label}
                value={layers[id] !== false}
                onChange={(v) => setLayers({ ...layers, [id]: v })}
              />
            ))}
          </div>
          <div class="rtl-anatomy-caption">
            <span class="rtl-tech">Anatomical model</span>
            <p>
              Stratified, procedural cells informed by retinal histology.
              Density is reduced for inspection. The shared retinal chart
              registers every device and response; the conductive solvers retain
              their documented planar domains.
            </p>
          </div>
          <div class="rtl-pipeline">
            <span>Scene</span>
            <i>→</i>
            <span>
              {pv
                ? "Photovoltaic conversion"
                : optical
                  ? "Light / opsin"
                  : "Electrode drive"}
            </span>
            <i>→</i>
            <span>Retinal circuitry</span>
            <i>→</i>
            <span>Output & percept</span>
          </div>
        </section>
        <aside
          class="rtl-inspector"
          aria-label="Measurements and tissue settings"
        >
          <div class="rtl-panel-heading">
            <span class="rtl-tech">02 / Measurements</span>
            <h2>Retinal response</h2>
          </div>
          <dl class="rtl-metrics">
            <Metric
              label="Responsive population samples"
              value={active?.metrics.respondingSamples}
              unit={active ? `/ ${active.metrics.totalSamples}` : ""}
            />
            <Metric
              label="Mean retinal output"
              value={active?.metrics.meanResponse}
              unit={active?.neural.units}
            />
            <Metric
              label="Ganglion driving difference"
              value={active?.metrics.peakGanglionDriveMv}
              unit="mV extracellular"
            />
            <Metric
              label="Bipolar driving difference"
              value={active?.metrics.peakBipolarDriveMv}
              unit="mV extracellular"
            />
            {pv ? (
              <>
                <Metric
                  label="Selected pixel current"
                  value={pixel?.snapshotCurrentUa}
                  unit="µA"
                />
                <Metric
                  label="Photodiode voltage"
                  value={pixel?.voltageV}
                  unit="V"
                />
                <Metric
                  label="Incident average power"
                  value={active?.photovoltaic?.metrics.averageIncidentPowerMw}
                  unit="mW"
                />
                <Metric
                  label="Circuit KCL residual"
                  value={active?.photovoltaic?.metrics.maxKclResidualPa}
                  unit="pA"
                />
              </>
            ) : (
              <>
                <Metric
                  label="Selected phase charge"
                  value={active?.electrical?.waveform.phaseChargeNc}
                  unit="nC"
                />
                <Metric
                  label="Selected charge density"
                  value={active?.electrical?.waveform.chargeDensityUcCm2}
                  unit="µC/cm²"
                />
              </>
            )}
            {(pv || optical) && (
              <Metric
                label="Peak-column temperature rise"
                value={active?.thermal?.peakDeltaK}
                unit="K · assumption-dependent"
              />
            )}
          </dl>
          <details>
            <summary>Selected device & cell</summary>
            <dl class="rtl-metrics">
              <Metric
                label="Contact-to-soma distance"
                value={active?.metrics.selectedContactToSomaUm}
                unit="µm · planar chart"
              />
              <Metric
                label="Bounding device footprint"
                value={active?.metrics.boundingFootprintMm2}
                unit="mm² · axis-aligned"
              />
            </dl>
            {selectedCell && (
              <p class="rtl-note">
                {selectedCell.id} · {selectedCell.on ? "ON" : "OFF"}{" "}
                {selectedCell.kind} sample. Soma ({fmt(selectedCell.xUm)},{" "}
                {fmt(selectedCell.yUm)}) µm; depth {fmt(selectedCell.depthUm)}{" "}
                µm. Visual location ({fmt(selectedCell.xDeg)},{" "}
                {fmt(selectedCell.yDeg)})°.
              </p>
            )}
            {contact && (
              <p class="rtl-note">
                {contact.id}: ({fmt(contact.xUm)}, {fmt(contact.yUm)}) µm;{" "}
                {fmt(contact.amplitudeUa)} µA peak. Material:{" "}
                {contact.material ?? "platinum reference contact"}.
              </p>
            )}
            {pixel && (
              <p class="rtl-note">
                {pixel.id}: {fmt(pixel.illumination * 100)}% relative
                illumination, {fmt(pixel.polarizationMv)} mV interface
                polarization.
              </p>
            )}
          </details>
          <details open>
            <summary>Tissue & surviving pathways</summary>
            <div class="rtl-fields">
              {nf(
                "tissue",
                "severity",
                "Loss severity",
                "fraction",
                0,
                1,
                0.05,
              )}
              {nf(
                "tissue",
                "bipolar",
                "Bipolar preservation",
                "fraction",
                0,
                1,
                0.05,
              )}
              {nf(
                "tissue",
                "ganglion",
                "Ganglion preservation",
                "fraction",
                0,
                1,
                0.05,
              )}
              {nf(
                "tissue",
                "lesionRadiusUm",
                "Lesion radius",
                "µm",
                100,
                3500,
                100,
              )}
            </div>
            <Check
              label="Include surviving natural visual input"
              value={config.tissue.naturalVision}
              onChange={(v) => edit("tissue", "naturalVision", v)}
            />
            <p class="rtl-note">
              Disease presets change cell response and visibility. Survival
              fractions are exploratory, not patient-specific histology.
            </p>
          </details>
          <details>
            <summary>Neural model & uncertainty</summary>
            <div class="rtl-fields">
              {nf(
                "neural",
                "thresholdMv",
                "Ganglion scale",
                "mV",
                0.1,
                50,
                0.1,
              )}
              {nf(
                "neural",
                "bipolarThresholdMv",
                "Bipolar scale",
                "mV",
                0.01,
                10,
                0.05,
              )}
              {nf("neural", "lateral", "Lateral inhibition", "×", 0, 1, 0.05)}
              {nf("neural", "tauMs", "Bipolar time constant", "ms", 2, 50)}
              {nf(
                "neural",
                "electricalGainMv",
                "Assumed electrical gain",
                "mV",
                0,
                1500,
                50,
              )}
              {nf(
                "neural",
                "synapticGainMv",
                "Assumed synaptic gain",
                "mV",
                0,
                500,
                10,
              )}
              {nf(
                "neural",
                "selectedIndex",
                "Selected cell sample",
                "index",
                0,
                config.neural.gridSize ** 2 - 1,
              )}
              {config.fidelity === "cable" &&
                nf(
                  "neural",
                  "cableDtMs",
                  "Cable step",
                  "ms",
                  0.005,
                  0.04,
                  0.005,
                )}
              {config.fidelity === "cable" &&
                nf(
                  "neural",
                  "cableInjectionPa",
                  "Intracellular test current",
                  "pA",
                  0,
                  500,
                  10,
                )}
            </div>
            <Select
              label="Population sampling"
              value={config.neural.gridSize}
              options={[15, 23, 31]}
              onChange={(v) =>
                invalidate({
                  ...config,
                  neural: {
                    ...config.neural,
                    gridSize: +v,
                    selectedIndex: Math.floor((+v * +v) / 2),
                  },
                })
              }
            />
            <NumberField
              label="Reproducible seed"
              value={config.seed}
              min={0}
              max={4294967295}
              onChange={(v) => edit(null, "seed", v)}
            />
            {active?.cable && (
              <p class="rtl-note">
                Selected neuron: {active.cable.spikes.length} cable spikes /{" "}
                {active.metrics.selectedNetworkSpikeCount} network spikes. The
                output decoder uses the population model; this trace measures
                model disagreement.
              </p>
            )}
            <p class="rtl-note">
              Tier 3 solves one branched retinal Na/K/A cable in the same field.
              The surrounding population remains Tier 2. Calcium dynamics and
              fitted human parameters are not implemented.
            </p>
            {active?.neural.sensitivity.map((p) => (
              <p class="rtl-note">
                Threshold ×{p.thresholdFactor}: mean surrogate recruitment{" "}
                {fmt(p.meanRecruitment, 3)}
              </p>
            ))}
          </details>
        </aside>
      </div>
      <section class="rtl-vision" aria-label="Vision reconstruction">
        <div class="rtl-section-heading">
          <div>
            <span class="rtl-tech">03 / Vision reconstruction</span>
            <h2>One scene. Four stages.</h2>
          </div>
          <Select
            label="Percept interpretation"
            id="percept"
            value={config.percept}
            options={[
              ["coupled", "Coupled retinal-output prototype"],
              ["baseline", "Published appearance baseline"],
            ]}
            onChange={(v) => edit(null, "percept", v)}
          />
        </div>
        <div class="rtl-scene-controls">
          <Select
            label="Visual scene"
            id="scene.stimulus"
            value={config.scene.stimulus}
            options={[
              "letter",
              "landolt",
              "grating",
              "checkerboard",
              "face",
              "spot",
              "blank",
              ...(config.scene.customImage ? ["image"] : []),
              ...(config.scene.frames ? ["video"] : []),
            ]}
            onChange={(v) => {
              invalidate({
                ...configRef.current,
                inputMode: "shared",
                scene: { ...configRef.current.scene, stimulus: v },
              });
            }}
          />
          {nf(
            "scene",
            "featureUm",
            "Letter stroke / spot radius",
            "µm",
            30,
            1000,
            25,
          )}
          {nf("scene", "fieldDeg", "Common visual field", "°", 8, 30, 1)}
          {nf("scene", "zoom", "Scene magnification", "×", 0.25, 12, 0.25)}
          {nf("scene", "contrast", "Input contrast", "", 0, 1, 0.05)}
          <button onClick={() => mediaRef.current.click()}>
            Image / video
          </button>
        </div>
        <div class="rtl-four-panels">
          {[
            [
              "01",
              "Original scene",
              active?.scene,
              "Common visual field for every technology.",
            ],
            [
              "02",
              pv ? "Projected implant input" : "Device input",
              active?.deviceInput,
              pv
                ? "Light at the implant plane. Electrical conversion is calculated separately."
                : "Scene sampled at the active device geometry.",
            ],
            [
              "03",
              "Retinal response",
              responseFrame,
              "Calculated activity on the common retinal population.",
            ],
            [
              "04",
              "Predicted percept",
              config.percept === "coupled" && timeView
                ? responseFrame
                : active?.percept,
              active?.percept.model ?? "Select a model and run an experiment.",
            ],
          ].map(([num, title, img, note]) => (
            <figure>
              <figcaption>
                <span>{num}</span>
                <h3>{title}</h3>
              </figcaption>
              <Raster
                image={img}
                label={title}
                onSelect={
                  num === "03"
                    ? (x, y) =>
                        edit(
                          "neural",
                          "selectedIndex",
                          Math.min(
                            config.neural.gridSize ** 2 - 1,
                            Math.floor(y * config.neural.gridSize) *
                              config.neural.gridSize +
                              Math.floor(x * config.neural.gridSize),
                          ),
                        )
                    : null
                }
              />
              <p>{note}</p>
            </figure>
          ))}
        </div>
        <p class="rtl-interpretation">
          Coupled output is an illustrative fixed-scale activity decoder.
          Published electrical and PRIMA appearance models use different
          brightness definitions and are not interchangeable measures of human
          vision.
        </p>
        <details>
          <summary>Input, percept & legacy reference options</summary>
          <div class="rtl-expanded-controls">
            <Select
              label="Letter"
              value={config.scene.letter}
              options={Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
              onChange={(v) => edit("scene", "letter", v)}
            />
            {nf("scene", "gratingCycles", "Grating cycles", "per field", 1, 30)}
            {nf("scene", "offsetXDeg", "Scene x offset", "°", -15, 15, 0.5)}
            {nf("scene", "offsetYDeg", "Scene y offset", "°", -15, 15, 0.5)}
            <Select
              label="Electrical percept"
              value={config.electrical.perceptModel}
              options={["axon", "scoreboard", "biphasic"]}
              onChange={(v) => edit("electrical", "perceptModel", v)}
            />
            {nf(
              "electrical",
              "rhoUm",
              "Across-axon spread",
              "µm",
              100,
              800,
              25,
            )}
            {nf(
              "electrical",
              "lambdaUm",
              "Along-axon spread",
              "µm",
              100,
              2000,
              50,
            )}
            {nf(
              "electrical",
              "thresholdUa",
              "Assumed pulse threshold",
              "µA",
              10,
              500,
              10,
            )}
            <Select
              label="Electrical encoder"
              value={config.electrical.encoder}
              options={["intensity", "edges"]}
              onChange={(v) => edit("electrical", "encoder", v)}
            />
            <Select
              label="PRIMA contrast"
              value={config.photovoltaic.contrastModel}
              options={["none", "gamma", "sigmoid"]}
              onChange={(v) => edit("photovoltaic", "contrastModel", v)}
            />
            {nf("photovoltaic", "gamma", "PRIMA signed gamma", "", 1, 4, 0.1)}
            {nf("photovoltaic", "sigmoidGain", "PRIMA sigmoid gain", "", 1, 40)}
            {nf(
              "photovoltaic",
              "sigmoidOffset",
              "PRIMA sigmoid offset",
              "",
              0,
              1,
              0.05,
            )}
            {nf(
              "photovoltaic",
              "blurSigmaPx",
              "Legacy projection blur",
              "px",
              0,
              8,
              0.5,
            )}
          </div>
          <Select
            label="Legacy electrical pattern"
            value={config.electrical.pattern}
            options={[
              "single",
              "pair",
              "letter-e",
              "landolt-c",
              "bars",
              "checkerboard",
              "blank",
            ]}
            onChange={(v) =>
              invalidate({
                ...config,
                inputMode: "legacy-electrical",
                modality: "electrical",
                electrical: { ...config.electrical, pattern: v },
              })
            }
          />
          <div class="rtl-legacy-presets">
            <span class="rtl-tech">
              Retained electrical reference experiments
            </span>
            {ELECTRICAL_PRESETS.map((p) => (
              <button
                data-rtl-legacy-e={p.id}
                disabled={busy}
                onClick={() =>
                  run(
                    fromLegacyElectrical({
                      ...cloneDefaults().electrical,
                      ...p.config,
                    }),
                  )
                }
              >
                {p.title}
              </button>
            ))}
            <span class="rtl-tech">Retained PRIMA reference experiments</span>
            {PRIMA_PRESETS.map((p) => (
              <button
                data-rtl-legacy-pv={p.id}
                disabled={busy}
                onClick={() =>
                  run(fromLegacyPrima({ ...PRIMA_DEFAULTS, ...p.config }))
                }
              >
                {p.title}
              </button>
            ))}
          </div>
          <p class="rtl-note">
            Legacy files and presets run their original engines inside this
            workspace. Switch a scene control to resume the common visual input.
            Current input: {config.inputMode}.
          </p>
        </details>
      </section>
      <section class="rtl-recordings" aria-label="Research instrumentation">
        <div class="rtl-section-heading">
          <div>
            <span class="rtl-tech">04 / Recordings</span>
            <h2>Follow the response in time.</h2>
          </div>
          <div class="rtl-play">
            <button
              disabled={!active}
              aria-pressed={playing}
              onClick={() => {
                setTimeView(true);
                setPlaying(!playing);
              }}
            >
              {playing ? "Pause" : "Play response"}
            </button>
            <label>
              Time{" "}
              <input
                aria-label="Response time"
                type="range"
                min="0"
                max={(active?.neural.frames.length ?? 1) - 1}
                value={frame}
                disabled={!active}
                onInput={(e) => {
                  setPlaying(false);
                  setTimeView(true);
                  setFrame(+e.currentTarget.value);
                }}
              />
              <output>
                {timeView
                  ? `${fmt(currentFrame?.timeMs, 1)} ms`
                  : "Trial summary"}
              </output>
            </label>
          </div>
        </div>
        <div class="rtl-record-grid">
          <div>
            <Select
              label="Recorded quantity"
              value={recording}
              options={[
                ["current", "Selected contact current"],
                ["photovoltage", "Photovoltaic diode voltage"],
                ["voltage", "Selected membrane voltage"],
                ["photocurrent", "Selected opsin photocurrent"],
                ["population", "Population firing rate"],
                ["heat", "Lumped optical temperature"],
              ]}
              onChange={setRecording}
            />
            <Trace {...trace} label="Recorded experiment trace" />
          </div>
          <div>
            <h3>Ganglion-cell spike raster</h3>
            <Trace
              spikes={active?.neural.spikes ?? []}
              total={active?.neural.cells.length}
              until={active?.config.neural.durationMs}
              label="Calculated ganglion spike raster"
            />
          </div>
        </div>
        <p class="rtl-note">
          {active?.cable
            ? `${active.cable.compartments} active compartments · ${active.cable.model}`
            : config.fidelity === "recruitment"
              ? "Tier 1 reports recruitment only; no membrane or spike calculation."
              : "Tier 2 voltage and spike traces are from an assumed leaky integrate-and-fire retinal network."}
        </p>
        <div class="rtl-clip">
          <Check
            label="Move the input across the common field"
            value={config.scene.motion}
            onChange={(v) => edit("scene", "motion", v)}
          />
          <button
            disabled={
              busy ||
              (!config.scene.motion && config.scene.stimulus !== "video")
            }
            onClick={runClip}
          >
            Calculate sampled sequence
          </button>
          {clip.length > 0 && (
            <label>
              Scene frame{" "}
              <input
                aria-label="Scene frame"
                type="range"
                min="0"
                max={clip.length - 1}
                value={clipIndex}
                onInput={(e) => {
                  setPlaying(false);
                  setFrame(0);
                  setClipIndex(+e.currentTarget.value);
                }}
              />{" "}
              {clipIndex + 1}/{clip.length}
            </label>
          )}
          <span>
            Sampled image/video trials restart the circuit and network for each
            frame. Pulse dynamics within each trial remain calculated.
          </span>
        </div>
      </section>
      <section class="rtl-comparison">
        <div class="rtl-section-heading">
          <div>
            <span class="rtl-tech">05 / Matched experiment</span>
            <h2>Compare mechanisms, not scores.</h2>
          </div>
          <div class="rtl-compare-actions">
            <Select
              label="Compare with"
              value={otherMode}
              options={MODES.filter((p) => p[0] !== config.modality)}
              onChange={setOtherMode}
            />
            <button
              data-rtl="compare"
              disabled={busy || config.inputMode !== "shared"}
              onClick={compare}
            >
              Run comparison
            </button>
            <button
              disabled={busy || config.modality === "optogenetic"}
              onClick={runSweep}
            >
              Sweep implant gap
            </button>
          </div>
        </div>
        <p class="rtl-note">
          Same scene, retinal chart, tissue parameters, response model and
          observation window. Device pulse schedules and model assumptions
          remain explicit. No overall device ranking is calculated.
        </p>
        {comparison && (
          <>
            <div class="rtl-comparison-images">
              {[comparison.a, comparison.b].map((r) => (
                <figure>
                  <figcaption>
                    <h3>{labelMode(r.config.modality)}</h3>
                    <span>{r.experimentId}</span>
                  </figcaption>
                  <Raster
                    image={r.percept}
                    label={`${labelMode(r.config.modality)} comparison percept`}
                  />
                  <p>{r.percept.model}</p>
                </figure>
              ))}
            </div>
            <div class="rtl-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Calculated outcome</th>
                    <th>{labelMode(comparison.a.config.modality)}</th>
                    <th>{labelMode(comparison.b.config.modality)}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Bounding device footprint",
                      (r) =>
                        `${fmt(r.metrics.boundingFootprintMm2)} mm² · axis-aligned`,
                    ],
                    [
                      "Sampled response area",
                      (r) =>
                        `${fmt(r.metrics.sampledResponseAreaDeg2)} deg² · nonzero samples`,
                    ],
                    [
                      "Mean response",
                      (r) => `${fmt(r.metrics.meanResponse)} ${r.neural.units}`,
                    ],
                    [
                      "Responding samples",
                      (r) =>
                        `${r.metrics.respondingSamples}/${r.metrics.totalSamples}`,
                    ],
                    [
                      "Observation window",
                      (r) => `${r.config.neural.durationMs} ms`,
                    ],
                    [
                      "Electrical / PV drive",
                      (r) =>
                        `${fmt(r.metrics.peakGanglionDriveMv)} / ${fmt(r.metrics.peakBipolarDriveMv)} mV`,
                    ],
                    [
                      "Incident optical power",
                      (r) =>
                        r.photovoltaic
                          ? `${fmt(r.photovoltaic.metrics.averageIncidentPowerMw)} mW`
                          : "Not calculated for this device",
                    ],
                    [
                      "Incident energy over optical train",
                      (r) =>
                        r.photovoltaic
                          ? `${fmt(r.metrics.incidentTrainEnergyUj)} µJ`
                          : "Not calculated for this device",
                    ],
                    [
                      "Circuit source",
                      (r) =>
                        r.electrical?.model ??
                        r.photovoltaic?.model ??
                        "Direct opsin conductance",
                    ],
                  ].map(([title, get]) => (
                    <tr>
                      <th>{title}</th>
                      <td>{get(comparison.a)}</td>
                      <td>{get(comparison.b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {sweep.length > 0 && (
          <div class="rtl-table-wrap">
            <table>
              <caption>
                Gap sensitivity · model results, not confidence intervals
              </caption>
              <thead>
                <tr>
                  <th>Gap (µm)</th>
                  <th>Peak driving difference (mV)</th>
                  <th>Mean response</th>
                  <th>Spikes</th>
                </tr>
              </thead>
              <tbody>
                {sweep.map((s) => (
                  <tr>
                    <td>{s.gap}</td>
                    <td>{fmt(s.field)}</td>
                    <td>{fmt(s.mean)}</td>
                    <td>{s.spikes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section class="rtl-export">
        <div>
          <span class="rtl-tech">06 / Reproducible record</span>
          <h2>Keep the experiment.</h2>
          <p>
            Settings, units, seed, equations and calculated arrays travel
            together. Imported results are recomputed.
          </p>
        </div>
        <div class="rtl-export-actions">
          <button
            data-rtl="export-json"
            disabled={!active || busy || dirty}
            onClick={saveJSON}
          >
            Experiment JSON
          </button>
          <button disabled={!active || busy || dirty} onClick={saveCSV}>
            Population CSV
          </button>
          <button disabled={!active || busy || dirty} onClick={report}>
            Experiment report
          </button>
          <button onClick={() => importRef.current.click()}>
            Restore experiment
          </button>
        </div>
      </section>
      <input
        ref={importRef}
        class="rtl-file"
        type="file"
        accept=".json,application/json"
        aria-label="Import experiment JSON"
        onChange={(e) => importFile(e, "experiment")}
      />
      <input
        ref={designerRef}
        class="rtl-file"
        type="file"
        accept=".json,application/json"
        aria-label="Import Designer geometry"
        onChange={(e) => importFile(e, "designer")}
      />
      <input
        ref={mediaRef}
        class="rtl-file"
        type="file"
        accept="image/*,video/*"
        aria-label="Upload local image or video"
        onChange={(e) => importFile(e, "media")}
      />
      <ConfigurationEditor
        config={config}
        onApply={(c) => invalidate(normalize(c))}
      />
      <footer class="rtl-evidence">
        <div>
          <h2>Numerical verification is one kind of evidence.</h2>
          <p>
            The retained finite-contact solver, pulse2percept models, PRIMA
            circuit and ProViSim baseline keep their independent benchmarks. New
            retinal coupling, procedural anatomy, optical attenuation and
            thermal estimates are research prototypes. They have not been fitted
            or validated against patient outcomes.
          </p>
          <a href="/simulations/retinal-implant/methods/">
            Read model provenance, equations and verification →
          </a>
        </div>
        <details>
          <summary>Current assumptions & limitations</summary>
          {(
            active?.warnings ?? [
              "Run an experiment to inspect its assumptions.",
            ]
          ).map((w) => (
            <p>{w}</p>
          ))}
          <p>{active?.neural.note}</p>
        </details>
      </footer>
    </main>
  );
}
