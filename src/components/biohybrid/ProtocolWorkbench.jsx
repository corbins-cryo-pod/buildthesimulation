import {DEFAULT_SETTINGS} from '../../lib/biohybrid/model.js';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PROTOCOL_AXES, DEFAULT_PROTOCOL, normalizeProtocol } from '../../lib/biohybrid/protocols.js';
import { protocolCSV, protocolJSON, protocolRunRows } from '../../lib/biohybrid/protocol-export.js';
import { fmt, TRACE_COLORS } from './Instrumentation.jsx';
import '../../styles/biohybrid-protocols.css';
const axisNotes = {
  stimAmplitudeUa: "Signed first-phase current. Negative values are cathodic first; every pulse retains its opposite, equal-duration second phase. The sampled response need not be monotone.",
  synapticWeightUs: "Each connection receives this peak conductance. Morphology, stimulus, time step and all other settings stay fixed. Zero conductance preserves the cable geometry.",
  recordDistanceUm: "Move only the passive recording disks. Electrical activity should remain unchanged while the known forward-model signals change.",
  axonDiameterUm: "Change the shared graft-trunk and host-axon diameter; graft-to-host terminal branches use 0.8× this diameter. The solver recalculates membrane area and axial conductance. This is an idealized morphology study.",
  conductivitySPerM: "Conductivity affects both the applied stimulus field and the recording transfer. This is a coupled experiment, not a fixed-source 1/\u03C3 test."
};
const conditions = {
  intact: "Assigned junctions",
  "synapses-off": "Synapses off",
  "no-stimulus": "No stimulus"
};
const classifications = {
  "lost-with-block": "Lost with block",
  "persists-with-block": "Persists with block",
  "appears-with-block": "Appears with block",
  silent: "Silent in both"
};
const signature = value => JSON.stringify(value);
const numericValues = text => {
  const tokens = text.split(",").map(value => value.trim());
  if (tokens.some(value => !value)) throw new Error("Enter comma-separated numbers without empty entries.");
  return tokens.map(value => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("Every tested value must be a finite number.");
    return number;
  });
};
const defaultValues = axis => PROTOCOL_AXES.find(item => item.id === axis)?.values?.join(", ") ?? "-6, -12, -18, -24, -30";
function download(text, type, name) {
  const url = URL.createObjectURL(new Blob([text], {
      type
    })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
}
const recording2 = run => run?.status === "ok" ? run.recordings.find(recording => recording.id === "rec-2") : null;
const caseName = (entry, doc) => doc.protocol.kind === "causal" ? "Matched experiment" : `${fmt(entry.value, 4)} ${PROTOCOL_AXES.find(axis => axis.id === doc.protocol.axis)?.unit ?? ""}`;
function ResponsePlot({
  title,
  subtitle,
  unit,
  points,
  series,
  xLabel,
  maxY
}) {
  const svgRef = useRef(null),
    [width, setWidth] = useState(680);
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
    const numeric = points.every(point => Number.isFinite(point.x)),
      xs = points.map((point, i3) => numeric ? point.x : i3);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      left = 48,
      right = width - 39,
      top = 18,
      bottom = 177;
    let highest = maxY ?? 0;
    for (const row of points) for (const item of series) {
      const value = item.value(row);
      if (Number.isFinite(value)) highest = Math.max(highest, value);
    }
    const hi = highest > 0 ? highest * (maxY ? 1.05 : 1.12) : 1,
      px = value => left + (right - left) * (value - minX) / (maxX - minX || 1),
      py = value => bottom - (bottom - top) * value / hi;
    const traces = series.map(item => {
      let active = false;
      let d3 = "";
      const marks = [];
      points.forEach((point, index) => {
        const value = item.value(point);
        if (!Number.isFinite(value)) {
          active = false;
          return;
        }
        const x2 = px(xs[index]),
          y3 = py(value);
        d3 += `${active ? " L" : "M"}${x2.toFixed(2)},${y3.toFixed(2)}`;
        marks.push({
          x: x2,
          y: y3,
          index,
          value,
          label: point.label
        });
        active = true;
      });
      return {
        ...item,
        d: d3,
        marks
      };
    });
    return {
      left,
      right,
      top,
      bottom,
      hi,
      px,
      py,
      xs,
      traces,
      ticks: maxY ? Array.from({
        length: maxY + 1
      }, (_, index) => index) : [0, 0.25, 0.5, 0.75, 1].map(fraction => hi * fraction)
    };
  }, [points, series, maxY, width]);
  return <section class="bh-response-plot">
  <h4>
    {title}
  </h4>
  <p>
    {subtitle}
  </p>
  <svg ref={svgRef} viewBox={`0 0 ${width} 230`} role="img" aria-label={`${title}. ${unit} versus ${xLabel}. Exact values appear in the table.`}>
    {chart.ticks.map((value, index) => <g key={index}>
      <line class="bh-grid-line" x1={chart.left} x2={chart.right} y1={chart.py(value)} y2={chart.py(value)} />
      <text x={chart.left - 9} y={chart.py(value) + 4} text-anchor="end">
        {fmt(value, unit === "cells" ? 0 : 2)}
      </text>
    </g>)}
    <text x={chart.left} y="10">
      {unit}
    </text>
    {points.map((point, index) => <g key={point.id}>
      <line class="bh-grid-line" x1={chart.px(chart.xs[index])} x2={chart.px(chart.xs[index])} y1={chart.top} y2={chart.bottom} />
      <text x={chart.px(chart.xs[index])} y="197" text-anchor="middle">
        {point.label}
      </text>
    </g>)}
    {chart.traces.map(trace => <g key={trace.id}>
      <path d={trace.d} fill="none" stroke={trace.color} stroke-width="1.4" stroke-dasharray={trace.dashed ? "5 4" : void 0} vector-effect="non-scaling-stroke" />
      {trace.marks.map(mark => <circle key={mark.index} cx={mark.x} cy={mark.y} r="3.5" fill={trace.dashed ? "var(--paper)" : trace.color} stroke={trace.color} stroke-width="1.4">
        <title>
          {trace.label}
          {": "}
          {fmt(mark.value, 5)}
          {" "}
          {unit}
          {"; "}
          {mark.label}
        </title>
      </circle>)}
    </g>)}
    <text x={(chart.left + chart.right) / 2} y="221" text-anchor="middle">
      {xLabel}
    </text>
  </svg>
  <div class="bh-chart-legend">
    {series.map(item => <span key={item.id}>
      <i style={{
          background: item.color
        }} />
      {item.label}
      {item.dashed ? " (dashed)" : ""}
    </span>)}
  </div>
</section>;
}
function ProtocolResults({
  document: doc,
  onInspect,
  disabled,
  onExport
}) {
  const axis = PROTOCOL_AXES.find(item => item.id === doc.protocol.axis),
    causal = doc.protocol.kind === "causal";
  const rows = protocolRunRows(doc);
  const points = useMemo(() => causal ? rows.map(({
    condition,
    run
  }, index) => ({
    id: condition,
    x: index,
    label: condition === "intact" ? "Assigned" : condition === "synapses-off" ? "Synapses off" : "No stimulus",
    baseline: run,
    synapsesOff: null
  })) : doc.cases.map(entry => ({
    id: entry.id,
    x: entry.value,
    label: fmt(entry.value, 4),
    baseline: entry.baseline,
    synapsesOff: entry.synapsesOff
  })), [doc]);
  const recruitment = useMemo(() => [{
    id: "intact",
    label: causal ? "Recruited hosts" : "Assigned junctions",
    color: TRACE_COLORS[0],
    value: point => point.baseline?.status === "ok" ? point.baseline.metrics.recruitedHosts : null
  }, ...(!causal && doc.protocol.paired ? [{
    id: "blocked",
    label: "Synapses off",
    color: TRACE_COLORS[3],
    dashed: true,
    value: point => point.synapsesOff?.status === "ok" ? point.synapsesOff.metrics.recruitedHosts : null
  }] : [])], [doc]);
  const signals = useMemo(() => [{
    id: "neural",
    label: "Combined neural",
    color: TRACE_COLORS[2],
    value: point => recording2(point.baseline)?.neuralPeakToPeakUv
  }, {
    id: "graft",
    label: "Graft sources",
    color: TRACE_COLORS[0],
    value: point => recording2(point.baseline)?.graftPeakToPeakUv
  }, {
    id: "host",
    label: "Host sources",
    color: TRACE_COLORS[1],
    value: point => recording2(point.baseline)?.hostPeakToPeakUv
  }], [doc]);
  const summary = doc.summary,
    failed = summary.failedRuns,
    comparisons = doc.cases.filter(entry => entry.comparison);
  return <div class="bh-protocol-results">
  <div class="bh-protocol-result-head">
    <div>
      <h3>
        {causal ? "Matched causal audit" : `${axis?.label ?? "Parameter"} response study`}
      </h3>
      <p>
        {summary.successfulRuns}
        {" calculated runs / "}
        {summary.totalRuns}
        {" requested \xB7 "}
        {failed}
        {" failed \xB7 "}
        {doc.baseSettings.dtMs}
        {" ms solver step"}
      </p>
    </div>
    <div class="bh-protocol-export">
      <button onClick={() => onExport("csv")}>
        {"Export protocol CSV"}
      </button>
      <button onClick={() => onExport("json")}>
        {"Export protocol JSON"}
      </button>
    </div>
  </div>
  <div class="bh-protocol-charts">
    <ResponsePlot title="Host recruitment" subtitle={causal ? "Host soma spikes in three separately solved conditions." : "Number of host cells with a soma spike at each tested setting. Lines only connect tested points."} unit="cells" points={points} series={recruitment} xLabel={causal ? "Matched condition" : `${axis?.label} / ${axis?.unit}`} maxY={doc.baseSettings.hostCount} />
    <ResponsePlot title="Recording 2: known source contributions" subtitle="Each peak-to-peak amplitude uses its own extrema. Component amplitudes need not add to the combined amplitude." unit="µV p–p" points={points} series={signals} xLabel={causal ? "Matched condition" : `${axis?.label} / ${axis?.unit}`} />
  </div>
  <p class="bh-protocol-fineprint">Tip − soma is the signed difference between the first upward 0 mV crossings at the engineered-1 tract tip and soma. A negative value means the tip crossed first. This event ordering must be interpreted alongside local voltages and matched synaptic controls.</p>
  <div class="bh-protocol-table" tabIndex={0} role="region" aria-label="Controlled study measurements; scroll horizontally for all columns">
    <table>
      <caption class="sr-only">
        {"Every completed or failed condition in this controlled experiment"}
      </caption>
      <thead>
        <tr>
          <th>
            {"Tested setting"}
          </th>
          <th>
            {"Condition"}
          </th>
          <th>
            {"Host cells"}
          </th>
          <th>
            {"Graft tip spikes"}
          </th>
          <th>
            {"Tip − soma"}
            <br />
            {"first crossings / ms"}
          </th>
          <th>
            {"Neural R2"}
            <br />
            {"\xB5V p\u2013p"}
          </th>
          <th>
            {"Graft R2"}
            <br />
            {"\xB5V p\u2013p"}
          </th>
          <th>
            {"Host R2"}
            <br />
            {"\xB5V p\u2013p"}
          </th>
          <th>
            {"Absolute charge"}
            <br />
            {"nC / phase"}
          </th>
          <th>
            {"Nominal density"}
            <br />
            {"µC/cm² / phase"}
          </th>
          <th>
            {"Full replay"}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({
            testCase,
            condition,
            run
          }) => {
            const ok = run.status === "ok",
              r3 = recording2(run);
            return <tr key={`${testCase.id}-${condition}`} class={condition === "intact" ? "" : "is-control"}>
          <td>
            {caseName(testCase, doc)}
          </td>
          <td>
            {conditions[condition]}
            {ok ? <small>
              {run.metrics.somaSpikeCount}
              {" soma spikes"}
            </small> : <small>
              {"Calculation failed"}
            </small>}
          </td>
          {ok ? <>
            <td>
              {run.metrics.recruitedHosts}
              {" / "}
              {run.metrics.hostCount}
            </td>
            <td>
              {run.grafts.reduce((sum, graft) => sum + graft.terminalSpikes, 0)}
            </td>
            <td>
              {fmt(run.metrics.conductionDelayMs, 3)}
            </td>
            <td>
              {fmt(r3?.neuralPeakToPeakUv, 4)}
            </td>
            <td>
              {fmt(r3?.graftPeakToPeakUv, 4)}
            </td>
            <td>
              {fmt(r3?.hostPeakToPeakUv, 4)}
            </td>
            <td>
              {fmt(run.dose.absolutePhaseChargeNc, 3)}
            </td>
            <td>
              {fmt(run.dose.absolutePhaseChargeDensityUcPerCm2, 2)}
            </td>
          </> : <td colSpan="8" class="bh-case-error">
            {run.error}
            {" No response value is assigned to this failure."}
          </td>}
          <td>
            <button disabled={disabled || !ok} aria-label={`Inspect ${caseName(testCase, doc)}, ${conditions[condition]}`} onClick={() => onInspect(run.settings, `${causal ? "Causal audit" : axis?.label}: ${caseName(testCase, doc)} \xB7 ${conditions[condition]}`)}>
              {"Inspect run"}
            </button>
          </td>
        </tr>;
          })}
      </tbody>
    </table>
  </div>
  <div class="bh-protocol-evidence">
    <section>
      <h4>
        {causal ? "What the controls establish" : "Finite tested response intervals"}
      </h4>
      {causal ? <>
        <p>
          {summary.allControlsQuiet === true ? "The no-stimulus control produced no upward 0 mV crossings at the monitored somata or tract tips." : summary.allControlsQuiet === false ? "The no-stimulus control contains activity. Check its host and graft responses before interpreting stimulation dependence." : "The no-stimulus control did not complete; silence has not been established."}
        </p>
        <p>
          {"Activity lost after setting synaptic conductance to zero supports synaptic dependence within this model and this observation window. Activity that persists can include direct field activation. A matched comparison does not establish biological integration."}
        </p>
      </> : <>
        <p>
          {"Observed pattern in the listed test order: "}
          <strong>
            {summary.responsePattern}
          </strong>
          {". These are deterministic cell counts; they are not activation probabilities."}
        </p>
        {summary.transitions?.length ? <ul>
          {summary.transitions.map((transition, index) => <li key={index}>
            {fmt(transition.from, 4)}
            {" \u2192 "}
            {fmt(transition.to, 4)}
            {" "}
            {axis?.unit}
            {": "}
            {transition.fromRecruitedHosts}
            {" \u2192 "}
            {transition.toRecruitedHosts}
            {" host cells ("}
            {transition.direction}
            {"). The transition is bracketed by tested settings; its exact location is unresolved."}
          </li>)}
        </ul> : <p>
          {"No change in host recruitment was resolved between adjacent successful tested settings. This does not prove a threshold is absent outside this grid."}
        </p>}
        {failed > 0 && <p>
          {"Failed runs are kept in the table and exports. Response intervals do not bridge failed cases."}
        </p>}
      </>}
    </section>
    <section>
      <h4>
        {"Interpretation limits"}
      </h4>
      <p>
        {"Source attribution is available because this simulation knows every membrane current. A real extracellular electrode cannot uniquely separate graft and host sources from one waveform. Passive host currents can exist without a host spike."}
      </p>
      <p>
        {"All successful runs use the recorded base temperature, morphology assumptions and solver resolution. The study does not estimate clinical dose, implant safety, synapse maturation or graft survival."}
      </p>
    </section>
  </div>
  {comparisons.length > 0 && <div class="bh-protocol-pairs">
    {comparisons.map(entry => <details key={entry.id} open={causal}>
      <summary>
        {"Host-by-host matched control \xB7 "}
        {caseName(entry, doc)}
        {" \xB7 "}
        {entry.comparison.lostHosts}
        {" lost / "}
        {entry.comparison.persistentHosts}
        {" persistent / "}
        {entry.comparison.appearingHosts}
        {" appearing with block"}
      </summary>
      <div class="bh-protocol-table" tabIndex={0} role="region" aria-label={`Host-by-host matched control for ${caseName(entry, doc)}; scroll horizontally for all columns`}>
        <table>
          <thead>
            <tr>
              <th>
                {"Host cell"}
              </th>
              <th>
                {"Assigned soma spikes"}
              </th>
              <th>
                {"Blocked soma spikes"}
              </th>
              <th>
                {"Assigned first spike / ms"}
              </th>
              <th>
                {"Blocked first spike / ms"}
              </th>
              <th>
                {"Observed dependence"}
              </th>
            </tr>
          </thead>
          <tbody>
            {entry.comparison.hosts.map(host => <tr key={host.id}>
              <td>
                {host.id}
              </td>
              <td>
                {host.baselineSpikes}
              </td>
              <td>
                {host.blockedSpikes}
              </td>
              <td>
                {fmt(host.baselineFirstMs, 4)}
              </td>
              <td>
                {fmt(host.blockedFirstMs, 4)}
              </td>
              <td>
                {classifications[host.classification] ?? host.classification}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </details>)}
  </div>}
  <p class="bh-protocol-fineprint">
    {"Nominal charge density divides absolute phase charge by geometric disk area. It is not an electrochemical or clinical safety limit. Inspect run recalculates the selected recorded settings in the main laboratory for synchronized anatomy and voltage replay. JSON includes every setting, condition, error and host event; CSV includes one row per actual solve. These summary exports contain no full compartment voltage frames."}
  </p>
</div>;
}
function ProtocolWorkbench({
  result,
  onApplySettings,
  disabled = false
}) {
  const [kind, setKind] = useState(DEFAULT_PROTOCOL.kind),
    [axis, setAxis] = useState(DEFAULT_PROTOCOL.axis),
    [valuesText, setValuesText] = useState(defaultValues(DEFAULT_PROTOCOL.axis)),
    [paired, setPaired] = useState(true);
  const [output, setOutput] = useState(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState({
      progress: 0,
      completed: 0,
      total: 0,
      label: ""
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const worker = useRef(null),
    epoch = useRef(0),
    activeBase = useRef(null);
  const baseSignature = signature(result?.settings ?? null);
  const axisInfo = PROTOCOL_AXES.find(item => item.id === axis);
  const config = useMemo(() => {
    try {
      return {
        value: normalizeProtocol({
          kind,
          axis,
          values: kind === "sweep" ? numericValues(valuesText) : DEFAULT_PROTOCOL.values,
          paired
        }, result?.settings),
        error: null
      };
    } catch (problem) {
      return {
        value: null,
        error: problem.message
      };
    }
  }, [kind, axis, valuesText, paired, baseSignature]);
  const snapshotChanged = !!output && signature(output.baseSettings) !== baseSignature;
  const protocolChanged = !!output && (!!config.error || signature(output.protocol) !== signature(config.value));
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
  useLayoutEffect(() => {
    if (worker.current && activeBase.current !== baseSignature) stop("The completed main experiment changed. The running protocol was cancelled; start a study from the new snapshot.");
  }, [baseSignature]);
  useLayoutEffect(() => {
    if (disabled && worker.current) stop("The main laboratory is calculating. The protocol was cancelled to keep the calculation snapshot unambiguous.");
  }, [disabled]);
  const launch = () => {
    if (!result || !config.value || busy || disabled) return;
    worker.current?.terminate();
    const id = ++epoch.current;
    setBusy(true);
    setError("");
    setNotice("");
    setProgress({
      progress: 0,
      completed: 0,
      total: expectedRuns,
      label: "Preparing controlled calculation"
    });
    activeBase.current = baseSignature;
    try {
      const nextWorker = new Worker(new URL("../../lib/biohybrid/protocol-worker.js", import.meta.url), {
        type: "module"
      });
      worker.current = nextWorker;
      nextWorker.onmessage = event => {
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
          setProgress(p3 => ({
            ...p3,
            progress: 1,
            completed: p3.total,
            label: "Protocol complete"
          }));
          nextWorker.terminate();
          worker.current = null;
          activeBase.current = null;
        }
      };
      nextWorker.onerror = event => {
        if (id !== epoch.current) return;
        setError(event.message || "The protocol worker could not start.");
        setBusy(false);
        nextWorker.terminate();
        worker.current = null;
      };
      nextWorker.postMessage({
        id,
        baseSettings: {
          ...result.settings
        },
        protocol: config.value
      });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
      worker.current?.terminate();
      worker.current = null;
    }
  };
  const exportResult = format => {
    try {
      download(format === "csv" ? protocolCSV(output) : protocolJSON(output), format === "csv" ? "text/csv;charset=utf-8" : "application/json", `biohybrid-${output.protocol.kind}-protocol.${format}`);
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  };
  const changeAxis = value => {
    setAxis(value);
    setValuesText(defaultValues(value));
  };
  return <section class="bh-protocols" id="controlled-experiments" aria-labelledby="bh-protocol-title">
  <header>
    <div>
      <span class="bh-label">
        {"Experimental Series 02 / Controlled studies"}
      </span>
      <h2 id="bh-protocol-title">
        {"What makes the bridge work?"}
      </h2>
    </div>
    <a href="/simulations/biohybrid-interface/questions/">
      {"Scientific questions & answers \u2197"}
    </a>
  </header>
  <p class="bh-protocol-intro">
    {"Test a complete causal chain with matched controls, or vary one physical parameter across a finite grid. Every condition runs the active compartment model; a visible electrode waveform alone does not establish host recruitment."}
  </p>
  <div class="bh-protocol-example">
    <button disabled={busy || disabled} onClick={() => {
      setKind("causal");
      onApplySettings({...DEFAULT_SETTINGS, axonLengthUm: 300, stimXUm: 300, stimAmplitudeUa: -30, pulseCount: 1, durationMs: 25}, "Mixed synaptic and direct activation");
    }}>Load mixed-activation example</button>
    <p>Loads two graft and three host cells in a 300 µm bridge with near-host stimulation. After the main calculation completes, run the matched audit to inspect which host responses depend on the junction.</p>
  </div>
  <div class="bh-protocol-setup">
    <fieldset disabled={busy || disabled || !result}>
      <label class="bh-protocol-choice">
        <span>
          {"Study design"}
        </span>
        <select aria-label="Controlled study design" value={kind} onChange={event => setKind(event.currentTarget.value)}>
          <option value="causal">
            {"Matched causal audit"}
          </option>
          <option value="sweep">
            {"One-parameter response study"}
          </option>
        </select>
      </label>
      {kind === "sweep" ? <>
        <label class="bh-protocol-choice">
          <span>
            {"Parameter to vary"}
          </span>
          <select aria-label="Response study parameter" value={axis} onChange={event => changeAxis(event.currentTarget.value)}>
            {PROTOCOL_AXES.map(item => <option key={item.id} value={item.id}>
              {item.label}
              {" / "}
              {item.unit}
            </option>)}
          </select>
        </label>
        <label class="bh-protocol-choice">
          <span>
            {"Tested values / "}
            {axisInfo?.unit}
          </span>
          <input type="text" aria-label={`Tested values (${axisInfo?.unit})`} value={valuesText} onInput={event => setValuesText(event.currentTarget.value)} autoComplete="off" spellCheck={false} />
        </label>
        <p class="bh-protocol-help">
          {"Enter 2\u20137 unique values in ascending or descending order; allowed range "}
          {axisInfo?.min}
          {" to "}
          {axisInfo?.max}
          {" "}
          {axisInfo?.unit}
          {". Failed conditions remain visible."}
        </p>
        <label class="bh-check">
          <input type="checkbox" checked={paired} onChange={event => setPaired(event.currentTarget.checked)} />
          {"Pair each setting with an identical synapses-off control"}
        </label>
        <p class="bh-protocol-help">
          {axisNotes[axis]}
        </p>
      </> : <p class="bh-protocol-help">
        {"Three independent solves: the currently assigned junctions; the same geometry with synaptic conductance set to zero; and the assigned network with stimulus amplitude set to zero. Per-host spikes reveal whether recruitment depends on the modeled junction."}
      </p>}
    </fieldset>
    <div class="bh-protocol-snapshot">
      <span class="bh-label">
        {"Base: completed main experiment"}
      </span>
      {result ? <>
        <dl>
          <dt>
            {"Population"}
          </dt>
          <dd>
            {result.settings.graftCount}
            {" graft / "}
            {result.settings.hostCount}
            {" host cells"}
          </dd>
          <dt>
            {"Observation window"}
          </dt>
          <dd>
            {result.settings.durationMs}
            {" ms"}
          </dd>
          <dt>
            {"Resolution"}
          </dt>
          <dd>
            {result.settings.dtMs}
            {" ms / "}
            {result.settings.segmentLengthUm}
            {" \xB5m"}
          </dd>
          <dt>
            {"Temperature"}
          </dt>
          <dd>
            {result.settings.temperatureC}
            {" \xB0C \xB7 canonical HH"}
          </dd>
          <dt>
            {"Stimulation"}
          </dt>
          <dd>
            {result.settings.stimAmplitudeUa}
            {" \xB5A / "}
            {result.settings.pulseWidthMs}
            {" ms per phase"}
          </dd>
          <dt>
            {"Assigned coupling"}
          </dt>
          <dd>
            {result.settings.synapticWeightUs}
            {" \xB5S per connection"}
          </dd>
        </dl>
        <p class="bh-protocol-help">
          {"Uncalculated changes in the main controls are excluded. Run the main experiment first to use those settings."}
        </p>
      </> : <p class="bh-protocol-help">
        {"Complete the main experiment to establish a reproducible base."}
      </p>}
      <div class="bh-protocol-actions">
        <button class="bh-primary" disabled={busy || disabled || !result || !!config.error} onClick={launch}>
          {busy ? "Calculating protocol\u2026" : "Run controlled study"}
        </button>
        {busy && <button onClick={() => stop()}>
          {"Cancel study"}
        </button>}
        <span>
          {expectedRuns}
          {" numerical solves"}
          {kind === "sweep" && paired ? " including controls" : ""}
        </span>
      </div>
    </div>
  </div>
  {config.error && result && <p class="bh-error" role="alert">
    {config.error}
  </p>}
  {busy && <div class="bh-protocol-status" role="status">
    <progress max="1" value={progress.progress} aria-label="Controlled study progress" />
    <p>
      {progress.label}
      {" \xB7 "}
      {progress.completed}
      {" / "}
      {progress.total}
      {" processed \xB7 "}
      {Math.round(progress.progress * 100)}
      {"%"}
    </p>
  </div>}
  {error && <p class="bh-error" role="alert">
    {error}
  </p>}
  {notice && <p class="bh-protocol-warning" role="status">
    {notice}
  </p>}
  {output && (snapshotChanged || protocolChanged) && <p class="bh-protocol-warning">
    {snapshotChanged ? "The main experiment has changed. " : ""}
    {protocolChanged ? "The study design has changed. " : ""}
    {"Results below retain their original settings and conditions. Run a new controlled study to update them."}
  </p>}
  {output ? <ProtocolResults document={output} onInspect={(settings, label) => onApplySettings(settings, label)} disabled={disabled || busy} onExport={exportResult} /> : <div class="bh-protocol-empty">
    <p>
      <strong>
        {"Start with the matched audit."}
      </strong>
      {" Compare host recruitment with its synapses-off control, then inspect the separated graft and host source signals."}
    </p>
    <p>
      {"A nonzero receiving-electrode signal with zero host spikes can be volume-conducted graft activity. The calculation must distinguish those outcomes."}
    </p>
  </div>}
</section>;
}
export { ProtocolWorkbench as default };
