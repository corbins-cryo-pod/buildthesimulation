import {h,Fragment} from 'preact';
import {useEffect,useMemo,useRef,useState} from 'preact/hooks';
import {PROTOCOL_AXES,DEFAULT_PROTOCOL,normalizeProtocol} from '../../lib/biohybrid/protocols.js';
import {protocolCSV,protocolJSON,protocolRunRows} from '../../lib/biohybrid/protocol-export.js';
import {fmt,TRACE_COLORS} from './Instrumentation.jsx';
import '../../styles/biohybrid-protocols.css';

var axisNotes = {
  stimAmplitudeUa: "Signed first-phase current. Negative values are cathodic first; every pulse retains its opposite, equal-duration second phase. The sampled response need not be monotone.",
  synapticWeightUs: "Each connection receives this peak conductance. Morphology, stimulus, time step and all other settings stay fixed. Zero conductance preserves the cable geometry.",
  recordDistanceUm: "Move only the passive recording disks. Electrical activity should remain unchanged while the known forward-model signals change.",
  axonDiameterUm: "Change the engineered axon diameter and solve its altered membrane area and axial conductance. This is an idealized morphology study.",
  conductivitySPerM: "Conductivity affects both the applied stimulus field and the recording transfer. This is a coupled experiment, not a fixed-source 1/\u03C3 test."
};
var conditions = { intact: "Assigned junctions", "synapses-off": "Synapses off", "no-stimulus": "No stimulus" };
var classifications = { "lost-with-block": "Lost with block", "persists-with-block": "Persists with block", "appears-with-block": "Appears with block", silent: "Silent in both" };
var signature = (value) => JSON.stringify(value);
var numericValues = (text) => {
  const tokens = text.split(",").map((value) => value.trim());
  if (tokens.some((value) => !value)) throw new Error("Enter comma-separated numbers without empty entries.");
  return tokens.map((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("Every tested value must be a finite number.");
    return number;
  });
};
var defaultValues = (axis) => PROTOCOL_AXES.find((item) => item.id === axis)?.values?.join(", ") ?? "-6, -12, -18, -24, -30";
function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
var recording2 = (run) => run?.status === "ok" ? run.recordings.find((recording) => recording.id === "rec-2") : null;
var caseName = (entry, doc) => doc.protocol.kind === "causal" ? "Matched experiment" : `${fmt(entry.value, 4)} ${PROTOCOL_AXES.find((axis) => axis.id === doc.protocol.axis)?.unit ?? ""}`;
function ResponsePlot({ title, subtitle, unit, points, series, xLabel, maxY }) {
  const svgRef = useRef(null), [width, setWidth] = useState(680);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => setWidth(Math.max(240, svg.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const chart = useMemo(() => {
    const numeric = points.every((point) => Number.isFinite(point.x)), xs = points.map((point, i3) => numeric ? point.x : i3);
    const minX = Math.min(...xs), maxX = Math.max(...xs), left = 48, right = width - 39, top = 18, bottom = 177;
    let highest = maxY ?? 0;
    for (const row of points) for (const item of series) {
      const value = item.value(row);
      if (Number.isFinite(value)) highest = Math.max(highest, value);
    }
    const hi = highest > 0 ? highest * (maxY ? 1.05 : 1.12) : 1, px = (value) => left + (right - left) * (value - minX) / (maxX - minX || 1), py = (value) => bottom - (bottom - top) * value / hi;
    const traces = series.map((item) => {
      let active = false;
      let d3 = "";
      const marks = [];
      points.forEach((point, index) => {
        const value = item.value(point);
        if (!Number.isFinite(value)) {
          active = false;
          return;
        }
        const x2 = px(xs[index]), y3 = py(value);
        d3 += `${active ? " L" : "M"}${x2.toFixed(2)},${y3.toFixed(2)}`;
        marks.push({ x: x2, y: y3, index, value, label: point.label });
        active = true;
      });
      return { ...item, d: d3, marks };
    });
    return { left, right, top, bottom, hi, px, py, xs, traces, ticks: maxY ? Array.from({ length: maxY + 1 }, (_, index) => index) : [0, 0.25, 0.5, 0.75, 1].map((fraction) => hi * fraction) };
  }, [points, series, maxY, width]);
  return h("section", { class: "bh-response-plot" }, h("h4", null, title), h("p", null, subtitle), h("svg", { ref: svgRef, viewBox: `0 0 ${width} 230`, role: "img", "aria-label": `${title}. ${unit} versus ${xLabel}. Exact values appear in the table.` }, chart.ticks.map((value, index) => h("g", { key: index }, h("line", { class: "bh-grid-line", x1: chart.left, x2: chart.right, y1: chart.py(value), useEffect: chart.py(value) }), h("text", { x: chart.left - 9, y: chart.py(value) + 4, "text-anchor": "end" }, fmt(value, unit === "cells" ? 0 : 2)))), h("text", { x: chart.left, y: "10" }, unit), points.map((point, index) => h("g", { key: point.id }, h("line", { class: "bh-grid-line", x1: chart.px(chart.xs[index]), x2: chart.px(chart.xs[index]), y1: chart.top, useEffect: chart.bottom }), h("text", { x: chart.px(chart.xs[index]), y: "197", "text-anchor": "middle" }, point.label))), chart.traces.map((trace) => h("g", { key: trace.id }, h("path", { d: trace.d, fill: "none", stroke: trace.color, "stroke-width": "1.4", "stroke-dasharray": trace.dashed ? "5 4" : void 0, "vector-effect": "non-scaling-stroke" }), trace.marks.map((mark) => h("circle", { key: mark.index, cx: mark.x, cy: mark.y, r: "3.5", fill: trace.dashed ? "var(--paper)" : trace.color, stroke: trace.color, "stroke-width": "1.4" }, h("title", null, trace.label, ": ", fmt(mark.value, 5), " ", unit, "; ", mark.label))))), h("text", { x: (chart.left + chart.right) / 2, y: "221", "text-anchor": "middle" }, xLabel)), h("div", { class: "bh-chart-legend" }, series.map((item) => h("span", { key: item.id }, h("i", { style: { background: item.color } }), item.label, item.dashed ? " (dashed)" : ""))));
}
function ProtocolResults({ document: doc, onInspect, disabled, onExport }) {
  const axis = PROTOCOL_AXES.find((item) => item.id === doc.protocol.axis), causal = doc.protocol.kind === "causal";
  const rows = protocolRunRows(doc);
  const points = useMemo(() => causal ? rows.map(({ condition, run }, index) => ({ id: condition, x: index, label: condition === "intact" ? "Assigned" : condition === "synapses-off" ? "Synapses off" : "No stimulus", baseline: run, synapsesOff: null })) : doc.cases.map((entry) => ({ id: entry.id, x: entry.value, label: fmt(entry.value, 4), baseline: entry.baseline, synapsesOff: entry.synapsesOff })), [doc]);
  const recruitment = useMemo(() => [
    { id: "intact", label: causal ? "Recruited hosts" : "Assigned junctions", color: TRACE_COLORS[0], value: (point) => point.baseline?.status === "ok" ? point.baseline.metrics.recruitedHosts : null },
    ...!causal && doc.protocol.paired ? [{ id: "blocked", label: "Synapses off", color: TRACE_COLORS[3], dashed: true, value: (point) => point.synapsesOff?.status === "ok" ? point.synapsesOff.metrics.recruitedHosts : null }] : []
  ], [doc]);
  const signals = useMemo(() => [
    { id: "neural", label: "Combined neural", color: TRACE_COLORS[2], value: (point) => recording2(point.baseline)?.neuralPeakToPeakUv },
    { id: "graft", label: "Graft sources", color: TRACE_COLORS[0], value: (point) => recording2(point.baseline)?.graftPeakToPeakUv },
    { id: "host", label: "Host sources", color: TRACE_COLORS[1], value: (point) => recording2(point.baseline)?.hostPeakToPeakUv }
  ], [doc]);
  const summary = doc.summary, failed = summary.failedRuns, comparisons = doc.cases.filter((entry) => entry.comparison);
  return h("div", { class: "bh-protocol-results" }, h("div", { class: "bh-protocol-result-head" }, h("div", null, h("h3", null, causal ? "Matched causal audit" : `${axis?.label ?? "Parameter"} response study`), h("p", null, summary.successfulRuns, " calculated runs / ", summary.totalRuns, " requested \xB7 ", failed, " failed \xB7 ", doc.baseSettings.dtMs, " ms solver step")), h("div", { class: "bh-protocol-export" }, h("button", { onClick: () => onExport("csv") }, "Export protocol CSV"), h("button", { onClick: () => onExport("json") }, "Export protocol JSON"))), h("div", { class: "bh-protocol-charts" }, h(ResponsePlot, { title: "Host recruitment", subtitle: causal ? "Host soma spikes in three separately solved conditions." : "Number of host cells with a soma spike at each tested setting. Lines only connect tested points.", unit: "cells", points, series: recruitment, xLabel: causal ? "Matched condition" : `${axis?.label} / ${axis?.unit}`, maxY: doc.baseSettings.hostCount }), h(ResponsePlot, { title: "Recording 2: known source contributions", subtitle: "Each peak-to-peak amplitude uses its own extrema. Component amplitudes need not add to the combined amplitude.", unit: "\xB5V p\u2013p", points, series: signals, xLabel: causal ? "Matched condition" : `${axis?.label} / ${axis?.unit}` })), h("div", { class: "bh-protocol-table" }, h("table", null, h("caption", { class: "sr-only" }, "Every completed or failed condition in this controlled experiment"), h("thead", null, h("tr", null, h("th", null, "Tested setting"), h("th", null, "Condition"), h("th", null, "Host cells"), h("th", null, "Graft tip spikes"), h("th", null, "Trunk delay", h("br", null), "ms"), h("th", null, "Neural R2", h("br", null), "\xB5V p\u2013p"), h("th", null, "Graft R2", h("br", null), "\xB5V p\u2013p"), h("th", null, "Host R2", h("br", null), "\xB5V p\u2013p"), h("th", null, "Absolute charge", h("br", null), "nC / phase"), h("th", null, "Nominal density", h("br", null), "µC/cm² / phase"), h("th", null, "Full replay"))), h("tbody", null, rows.map(({ testCase, condition, run }) => {
    const ok = run.status === "ok", r3 = recording2(run);
    return h("tr", { key: `${testCase.id}-${condition}`, class: condition === "intact" ? "" : "is-control" }, h("td", null, caseName(testCase, doc)), h("td", null, conditions[condition], ok ? h("small", null, run.metrics.somaSpikeCount, " soma spikes") : h("small", null, "Calculation failed")), ok ? h(Fragment, null, h("td", null, run.metrics.recruitedHosts, " / ", run.metrics.hostCount), h("td", null, run.grafts.reduce((sum, graft) => sum + graft.terminalSpikes, 0)), h("td", null, fmt(run.metrics.conductionDelayMs, 3)), h("td", null, fmt(r3?.neuralPeakToPeakUv, 4)), h("td", null, fmt(r3?.graftPeakToPeakUv, 4)), h("td", null, fmt(r3?.hostPeakToPeakUv, 4)), h("td", null, fmt(run.dose.absolutePhaseChargeNc, 3)), h("td", null, fmt(run.dose.absolutePhaseChargeDensityUcPerCm2, 2))) : h("td", { colSpan: "8", class: "bh-case-error" }, run.error, " No response value is assigned to this failure."), h("td", null, h("button", { disabled: disabled || !ok, "aria-label": `Inspect ${caseName(testCase, doc)}, ${conditions[condition]}`, onClick: () => onInspect(run.settings, `${causal ? "Causal audit" : axis?.label}: ${caseName(testCase, doc)} \xB7 ${conditions[condition]}`) }, "Inspect run")));
  })))), h("div", { class: "bh-protocol-evidence" }, h("section", null, h("h4", null, causal ? "What the controls establish" : "Finite tested response intervals"), causal ? h(Fragment, null, h("p", null, summary.allControlsQuiet === true ? "The no-stimulus control produced no upward 0 mV crossings at the monitored somata or tract tips." : summary.allControlsQuiet === false ? "The no-stimulus control contains activity. Check its host and graft responses before interpreting stimulation dependence." : "The no-stimulus control did not complete; silence has not been established."), h("p", null, "Activity lost after setting synaptic conductance to zero supports synaptic dependence within this model and this observation window. Activity that persists can include direct field activation. A matched comparison does not establish biological integration.")) : h(Fragment, null, h("p", null, "Observed pattern in the listed test order: ", h("strong", null, summary.responsePattern), ". These are deterministic cell counts; they are not activation probabilities."), summary.transitions?.length ? h("ul", null, summary.transitions.map((transition, index) => h("li", { key: index }, fmt(transition.from, 4), " \u2192 ", fmt(transition.to, 4), " ", axis?.unit, ": ", transition.fromRecruitedHosts, " \u2192 ", transition.toRecruitedHosts, " host cells (", transition.direction, "). The transition is bracketed by tested settings; its exact location is unresolved."))) : h("p", null, "No change in host recruitment was resolved between adjacent successful tested settings. This does not prove a threshold is absent outside this grid."), failed > 0 && h("p", null, "Failed runs are kept in the table and exports. Response intervals do not bridge failed cases."))), h("section", null, h("h4", null, "Interpretation limits"), h("p", null, "Source attribution is available because this simulation knows every membrane current. A real extracellular electrode cannot uniquely separate graft and host sources from one waveform. Passive host currents can exist without a host spike."), h("p", null, "All successful runs use the recorded base temperature, morphology assumptions and solver resolution. The study does not estimate clinical dose, implant safety, synapse maturation or graft survival."))), comparisons.length > 0 && h("div", { class: "bh-protocol-pairs" }, comparisons.map((entry) => h("details", { key: entry.id, open: causal }, h("summary", null, "Host-by-host matched control \xB7 ", caseName(entry, doc), " \xB7 ", entry.comparison.lostHosts, " lost / ", entry.comparison.persistentHosts, " persistent / ", entry.comparison.appearingHosts, " appearing with block"), h("div", { class: "bh-protocol-table" }, h("table", null, h("thead", null, h("tr", null, h("th", null, "Host cell"), h("th", null, "Assigned soma spikes"), h("th", null, "Blocked soma spikes"), h("th", null, "Assigned first spike / ms"), h("th", null, "Blocked first spike / ms"), h("th", null, "Observed dependence"))), h("tbody", null, entry.comparison.hosts.map((host) => h("tr", { key: host.id }, h("td", null, host.id), h("td", null, host.baselineSpikes), h("td", null, host.blockedSpikes), h("td", null, fmt(host.baselineFirstMs, 4)), h("td", null, fmt(host.blockedFirstMs, 4)), h("td", null, classifications[host.classification] ?? host.classification))))))))), h("p", { class: "bh-protocol-fineprint" }, "Nominal charge density divides absolute phase charge by geometric disk area. It is not an electrochemical or clinical safety limit. Inspect run recalculates the selected recorded settings in the main laboratory for synchronized anatomy and voltage replay. JSON includes every setting, condition, error and host event; CSV includes one row per actual solve. These summary exports contain no full compartment voltage frames."));
}
function ProtocolWorkbench({ result, onApplySettings, disabled = false }) {
  const [kind, setKind] = useState(DEFAULT_PROTOCOL.kind), [axis, setAxis] = useState(DEFAULT_PROTOCOL.axis), [valuesText, setValuesText] = useState(defaultValues(DEFAULT_PROTOCOL.axis)), [paired, setPaired] = useState(true);
  const [output, setOutput] = useState(null), [busy, setBusy] = useState(false), [progress, setProgress] = useState({ progress: 0, completed: 0, total: 0, label: "" }), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const worker = useRef(null), epoch = useRef(0), activeBase = useRef(null);
  const baseSignature = signature(result?.settings ?? null);
  const axisInfo = PROTOCOL_AXES.find((item) => item.id === axis);
  const config = useMemo(() => {
    try {
      return { value: normalizeProtocol({ kind, axis, values: kind === "sweep" ? numericValues(valuesText) : DEFAULT_PROTOCOL.values, paired }, result?.settings), error: null };
    } catch (problem) {
      return { value: null, error: problem.message };
    }
  }, [kind, axis, valuesText, paired, baseSignature]);
  const snapshotChanged = !!output && signature(output.baseSettings) !== baseSignature;
  const protocolChanged = !!output && !!config.value && signature(output.protocol) !== signature(config.value);
  const expectedRuns = kind === "causal" ? 3 : (config.value?.values.length ?? 0) * (paired ? 2 : 1);
  const stop = (message = "Protocol cancelled. Previously completed results remain available.") => {
    ++epoch.current;
    worker.current?.terminate();
    worker.current = null;
    activeBase.current = null;
    setBusy(false);
    setNotice(message);
  };
  useEffect(() => () => {
    ++epoch.current;
    worker.current?.terminate();
  }, []);
  useEffect(() => {
    if (worker.current && activeBase.current !== baseSignature) stop("The completed main experiment changed. The running protocol was cancelled; start a study from the new snapshot.");
  }, [baseSignature]);
  useEffect(() => {
    if (disabled && worker.current) stop("The main laboratory is calculating. The protocol was cancelled to keep the calculation snapshot unambiguous.");
  }, [disabled]);
  const launch = () => {
    if (!result || !config.value || busy) return;
    worker.current?.terminate();
    const id = ++epoch.current;
    setBusy(true);
    setError("");
    setNotice("");
    setProgress({ progress: 0, completed: 0, total: expectedRuns, label: "Preparing controlled calculation" });
    activeBase.current = baseSignature;
    try {
      const nextWorker = new Worker(new URL("../../lib/biohybrid/protocol-worker.js", import.meta.url), { type: "module" });
      worker.current = nextWorker;
      nextWorker.onmessage = (event) => {
        const data = event.data;
        if (data.id !== id || id !== epoch.current) return;
        if (data.type === "progress") {
          setProgress(data);
          return;
        }
        if (data.type === "error") {
          setError(data.message);
          setBusy(false);
          nextWorker.terminate();
          worker.current = null;
          return;
        }
        if (data.type === "result") {
          setOutput(data.result);
          setBusy(false);
          setProgress((p3) => ({ ...p3, progress: 1, completed: p3.total, label: "Protocol complete" }));
          nextWorker.terminate();
          worker.current = null;
          activeBase.current = null;
        }
      };
      nextWorker.onerror = (event) => {
        if (id !== epoch.current) return;
        setError(event.message || "The protocol worker could not start.");
        setBusy(false);
        nextWorker.terminate();
        worker.current = null;
      };
      nextWorker.postMessage({ id, baseSettings: { ...result.settings }, protocol: config.value });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
      worker.current?.terminate();
      worker.current = null;
    }
  };
  const exportResult = (format) => {
    try {
      download(format === "csv" ? protocolCSV(output) : protocolJSON(output), format === "csv" ? "text/csv;charset=utf-8" : "application/json", `biohybrid-${output.protocol.kind}-protocol.${format}`);
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  };
  const changeAxis = (value) => {
    setAxis(value);
    setValuesText(defaultValues(value));
  };
  return h("section", { class: "bh-protocols", id: "controlled-experiments", "aria-labelledby": "bh-protocol-title" }, h("header", null, h("div", null, h("span", { class: "bh-label" }, "Experimental Series 02 / Controlled studies"), h("h2", { id: "bh-protocol-title" }, "What makes the bridge work?")), h("a", { href: "/simulations/biohybrid-interface/questions/" }, "Scientific questions & answers \u2197")), h("p", { class: "bh-protocol-intro" }, "Test a complete causal chain with matched controls, or vary one physical parameter across a finite grid. Every condition runs the active compartment model; a visible electrode waveform alone does not establish host recruitment."), h("div", { class: "bh-protocol-setup" }, h("fieldset", { disabled: busy || disabled || !result }, h("label", { class: "bh-protocol-choice" }, h("span", null, "Study design"), h("select", { "aria-label": "Controlled study design", value: kind, onChange: (event) => setKind(event.currentTarget.value) }, h("option", { value: "causal" }, "Matched causal audit"), h("option", { value: "sweep" }, "One-parameter response study"))), kind === "sweep" ? h(Fragment, null, h("label", { class: "bh-protocol-choice" }, h("span", null, "Parameter to vary"), h("select", { "aria-label": "Response study parameter", value: axis, onChange: (event) => changeAxis(event.currentTarget.value) }, PROTOCOL_AXES.map((item) => h("option", { key: item.id, value: item.id }, item.label, " / ", item.unit)))), h("label", { class: "bh-protocol-choice" }, h("span", null, "Tested values / ", axisInfo?.unit), h("input", { type: "text", "aria-label": `Tested values (${axisInfo?.unit})`, value: valuesText, onInput: (event) => setValuesText(event.currentTarget.value), autoComplete: "off", spellCheck: false })), h("p", { class: "bh-protocol-help" }, "Enter 2\u20137 unique values in ascending or descending order; allowed range ", axisInfo?.min, " to ", axisInfo?.max, " ", axisInfo?.unit, ". Failed conditions remain visible."), h("label", { class: "bh-check" }, h("input", { type: "checkbox", checked: paired, onChange: (event) => setPaired(event.currentTarget.checked) }), "Pair each setting with an identical synapses-off control"), h("p", { class: "bh-protocol-help" }, axisNotes[axis])) : h("p", { class: "bh-protocol-help" }, "Three independent solves: the currently assigned junctions; the same geometry with synaptic conductance set to zero; and the assigned network with stimulus amplitude set to zero. Per-host spikes reveal whether recruitment depends on the modeled junction.")), h("div", { class: "bh-protocol-snapshot" }, h("span", { class: "bh-label" }, "Base: completed main experiment"), result ? h(Fragment, null, h("dl", null, h("dt", null, "Population"), h("dd", null, result.settings.graftCount, " graft / ", result.settings.hostCount, " host cells"), h("dt", null, "Observation window"), h("dd", null, result.settings.durationMs, " ms"), h("dt", null, "Resolution"), h("dd", null, result.settings.dtMs, " ms / ", result.settings.segmentLengthUm, " \xB5m"), h("dt", null, "Temperature"), h("dd", null, result.settings.temperatureC, " \xB0C \xB7 canonical HH"), h("dt", null, "Stimulation"), h("dd", null, result.settings.stimAmplitudeUa, " \xB5A / ", result.settings.pulseWidthMs, " ms per phase"), h("dt", null, "Assigned coupling"), h("dd", null, result.settings.synapticWeightUs, " \xB5S per connection")), h("p", { class: "bh-protocol-help" }, "Uncalculated changes in the main controls are excluded. Run the main experiment first to use those settings.")) : h("p", { class: "bh-protocol-help" }, "Complete the main experiment to establish a reproducible base."), h("div", { class: "bh-protocol-actions" }, h("button", { class: "bh-primary", disabled: busy || disabled || !result || !!config.error, onClick: launch }, busy ? "Calculating protocol\u2026" : "Run controlled study"), busy && h("button", { onClick: () => stop() }, "Cancel study"), h("span", null, expectedRuns, " numerical solves", kind === "sweep" && paired ? " including controls" : "")))), config.error && result && h("p", { class: "bh-error", role: "alert" }, config.error), busy && h("div", { class: "bh-protocol-status", role: "status" }, h("progress", { max: "1", value: progress.progress }), h("p", null, progress.label, " \xB7 ", progress.completed, " / ", progress.total, " processed \xB7 ", Math.round(progress.progress * 100), "%")), error && h("p", { class: "bh-error", role: "alert" }, error), notice && h("p", { class: "bh-protocol-warning", role: "status" }, notice), output && (snapshotChanged || protocolChanged) && h("p", { class: "bh-protocol-warning" }, snapshotChanged ? "The main experiment has changed. " : "", protocolChanged ? "The study design has changed. " : "", "Results below retain their original settings and conditions. Run a new controlled study to update them."), output ? h(ProtocolResults, { document: output, onInspect: (settings, label) => onApplySettings(settings, label), disabled: disabled || busy, onExport: exportResult }) : h("div", { class: "bh-protocol-empty" }, h("p", null, h("strong", null, "Start with the matched audit."), " Compare host recruitment with its synapses-off control, then inspect the separated graft and host source signals."), h("p", null, "A nonzero receiving-electrode signal with zero host spikes can be volume-conducted graft activity. The calculation must distinguish those outcomes.")));
}
export {
  ProtocolWorkbench as default
};
