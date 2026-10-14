import { useMemo } from "preact/hooks";
import {
  electricalScales,
  replayPhase,
  resultSummary,
  sampleInterval,
} from "../lib/cortex/electrical.js";

const f = (v) =>
  !Number.isFinite(v)
    ? "—"
    : v !== 0 && Math.abs(v) < 0.001
      ? v.toExponential(2)
      : Number(v.toPrecision(4)).toString();
function Numeric({ label, value, min, max, step, onChange }) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
      />
    </label>
  );
}
function Legend({ title, low, high, unit, kind = "signed", children }) {
  return (
    <div class="cx-legend">
      <strong>{title}</strong>
      <div class={`cx-colorbar cx-colorbar-${kind}`} aria-hidden="true" />
      <div class="cx-legend-ticks">
        <span>
          {f(low)} {unit}
        </span>
        <span>{kind === "signed" ? "0" : "Vₘ"}</span>
        <span>
          {high > 0 ? "+" : ""}
          {f(high)} {unit}
        </span>
      </div>
      <p>{children}</p>
    </div>
  );
}

export default function CortexElectricalPanel({
  world,
  result,
  frame,
  options,
  onChange,
  component,
}) {
  const scales = useMemo(
    () =>
      world ? electricalScales(world, result, { ...options, component }) : null,
    [world, result, options, component],
  );
  if (!world || !scales) return null;
  const c = world.config,
    active = !!c.neuron.modelId,
    stimulated = c.protocol.mode === "extracellular-stimulation";
  const current = result && stimulated ? result.drive[frame] : 0;
  const signals = result?.[`${component}Uv`];
  let saturated = 0,
    count = 0,
    membraneSaturated = 0;
  for (const slice of scales.field?.slices ?? [])
    for (const i of slice.visibleVertices) {
      count++;
      if (Math.abs(slice.transfers[i] * current) > scales.fieldMv) saturated++;
    }
  const low = active ? -100 : c.membrane.restMv - 10,
    high = active ? 40 : c.membrane.restMv + 10;
  if (result)
    for (let i = 0; i < world.neuron.nodes.length; i++) {
      if (world.neuron.nodes[i].kind === "junction") continue;
      const v = result.membraneMv[frame * result.diagnostics.compartments + i];
      if (v < low || v > high) membraneSaturated++;
    }
  const toggle = (key, label) => (
    <label>
      <input
        type="checkbox"
        checked={options[key]}
        onChange={(e) => onChange(key, e.currentTarget.checked)}
      />{" "}
      {label}
    </label>
  );
  return (
    <section
      class="cx-electrical"
      aria-label="Electrical visualization and units"
    >
      <div class="cx-view-options">
        {toggle("tips", "Contact tips")}
        {toggle("tissueField", "Applied tissue potential")}
        {toggle("neuronColor", "Membrane coloring")}
        {toggle("labels", "Contact labels")}
      </div>
      <p class="cx-muted">
        Display controls update immediately; they do not alter the experiment.
        Enlarged spheres (stimulating) and diamonds (recording) are visual
        guides, not contact dimensions.
      </p>
      <div class="cx-legends">
        <Legend
          title="Neuronal membrane voltage Vₘ"
          low={low}
          high={high}
          unit="mV"
          kind={active ? "membrane" : "passive"}
        >
          {active
            ? "Absolute voltage across membrane; −100 to +40 mV."
            : `Centered on rest ${c.membrane.restMv} mV; color shows ±10 mV deviation.`}{" "}
          {options.neuronColor
            ? `${membraneSaturated} compartments saturated at this sample.`
            : "Coloring off."}
        </Legend>
        {stimulated && (
          <Legend
            title="Stimulating-contact outward current"
            low={-scales.stimulationUa}
            high={scales.stimulationUa}
            unit="µA"
          >
            Blue = sink / cathodic; red = source / anodic. A leads cathodic; B
            is the equal/opposite return. Roles reverse in phase 2. Neutral =
            zero.
          </Legend>
        )}
        {stimulated && (
          <Legend
            title="Applied extracellular tissue potential φ"
            low={-scales.fieldMv}
            high={scales.fieldMv}
            unit="mV"
          >
            {options.fieldScale === "auto"
              ? "Auto, fixed across this run."
              : "Fixed scale."}{" "}
            {saturated}/{count} visible vertices saturated now. Blue &lt; 0;
            neutral = 0; red &gt; 0, relative to infinity. This is potential,
            not |E| or field direction.
          </Legend>
        )}
        <Legend
          title={`Ideal recording-contact potential · ${component}`}
          low={-scales.recordingUv}
          high={scales.recordingUv}
          unit="µV"
        >
          {options.recordingScale === "auto"
            ? "Auto peak across both contacts and all run samples."
            : "Fixed scale."}{" "}
          {signals
            ? signals.filter((s) => Math.abs(s[frame]) > scales.recordingUv)
                .length
            : 0}{" "}
          contacts saturated now. Each marker is A or B relative to infinity,
          even when the plot shows A − B.
        </Legend>
      </div>
      <p class="cx-muted">
        <b>Neural</b> = potential generated by total membrane currents through
        the point/line forward model. <b>Applied</b> = stimulation sources or
        current-clamp bath return. <b>Total</b> = neural + applied. Tissue
        slices show only applied array stimulation; no neural volume field is
        inferred from recording traces.
      </p>
      <details>
        <summary>Slice geometry & color scales</summary>
        <div class="cx-display-grid">
          <label>
            Slice orientation
            <select
              value={options.orientation}
              onChange={(e) => onChange("orientation", e.currentTarget.value)}
            >
              <option value="three">Three orthogonal slices</option>
              <option value="xy">XY · constant depth Z</option>
              <option value="xz">XZ · constant Y</option>
              <option value="yz">YZ · constant X</option>
            </select>
          </label>
          <Numeric
            label="Slice extent · µm"
            value={options.extentUm}
            min={100}
            max={6000}
            step={100}
            onChange={(v) => onChange("extentUm", v)}
          />
          {["X", "Y", "Z"].map((axis, i) => (
            <Numeric
              label={`Center offset from soma ${axis} · µm`}
              value={options.offsetUm[i]}
              min={-5000}
              max={5000}
              step={25}
              onChange={(v) =>
                onChange(
                  "offsetUm",
                  options.offsetUm.map((x, j) => (i === j ? v : x)),
                )
              }
            />
          ))}
          <label>
            Slice opacity · {options.fieldOpacity.toFixed(2)}
            <input
              type="range"
              min="0"
              max="0.7"
              step="0.01"
              value={options.fieldOpacity}
              onInput={(e) =>
                onChange("fieldOpacity", Number(e.currentTarget.value))
              }
            />
          </label>
          <label>
            Tissue scale
            <select
              value={options.fieldScale}
              onChange={(e) => onChange("fieldScale", e.currentTarget.value)}
            >
              <option value="fixed">Fixed symmetric range</option>
              <option value="auto">Auto · full pulse amplitude</option>
            </select>
          </label>
          <Numeric
            label="Tissue ±limit · mV"
            value={options.fieldLimitMv}
            min={0.001}
            max={10000}
            step={0.1}
            onChange={(v) => onChange("fieldLimitMv", v)}
          />
          <label>
            Recording scale
            <select
              value={options.recordingScale}
              onChange={(e) =>
                onChange("recordingScale", e.currentTarget.value)
              }
            >
              <option value="auto">Auto · run peak</option>
              <option value="fixed">Fixed symmetric range</option>
            </select>
          </label>
          <Numeric
            label="Recording ±limit · µV"
            value={options.recordingLimitUv}
            min={0.000001}
            max={1000000}
            step={1}
            onChange={(v) => onChange("recordingLimitUv", v)}
          />
        </div>
        <button
          onClick={() => {
            onChange("offsetUm", [0, 0, 0]);
          }}
        >
          Center slices on soma
        </button>
        <p class="cx-muted">
          Slice center [
          {scales.field?.center.map(f).join(", ") ?? c.neuron.somaUm.join(", ")}
          ] µm. Each slice samples 25 × 25 points with linear color
          interpolation. Cells intersecting a {c.recording.exclusionUm} µm
          source exclusion sphere are omitted; holes can exceed the sphere by
          one grid cell. No distance clamp or finite-contact regularization is
          used.
        </p>
      </details>
      <p>
        <b>
          {result
            ? `${f(result.timeMs[frame])} ms · ${replayPhase(result, frame)}`
            : "Run the experiment to inspect electrical values."}
        </b>
      </p>
      {result && (
        <>
          <p class="cx-muted">
            {frame
              ? `Input and artifact average the preceding internal timestep [${f(sampleInterval(result, frame)[0])}, ${f(result.timeMs[frame])}] ms; membrane voltage is at its end.`
              : "Initial state; no applied drive."}{" "}
            Zero-current intervals keep neutral slices visible.
          </p>
          <table>
            <caption>
              Replay contact values · markers are enlarged guides
            </caption>
            <thead>
              <tr>
                <th>Contact / role</th>
                <th>Signed value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {stimulated &&
                c.protocol.sourceContactIds.map((id, i) => {
                  const v = current * (i ? -1 : 1);
                  return (
                    <tr>
                      <td>
                        Stim {i ? "B" : "A"} · {id}
                      </td>
                      <td>{f(v)} µA</td>
                      <td>
                        {v < 0
                          ? "Cathodic sink"
                          : v > 0
                            ? "Anodic source"
                            : "Off"}
                      </td>
                    </tr>
                  );
                })}
              {c.recording.contactIds.map((id, i) => (
                <tr>
                  <td>
                    Rec {i ? "B" : "A"} · {id}
                  </td>
                  <td>{f(signals[i][frame])} µV</td>
                  <td>{component} · infinity</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stimulated &&
            (resultSummary(result).negativeFrame < 0 ||
              resultSummary(result).positiveFrame < 0) && (
              <p class="cx-notice">
                A pulse phase is absent from retained samples. Reduce the output
                sample interval and rerun to inspect it; internal charge
                integration remains separate.
              </p>
            )}
        </>
      )}
      {result &&
        stimulated &&
        c.protocol.gapUs > 0 &&
        resultSummary(result).gapFrame < 0 && (
          <p class="cx-notice">
            The interphase gap has no complete retained zero-drive interval. The
            Gap button is disabled; reduce output sampling interval and rerun to
            inspect it.
          </p>
        )}
      <p class="cx-muted">
        One unbounded homogeneous conductor; ideal point contacts. No electrode
        impedance, finite surface voltage, shank obstruction, layered
        conductivity or acquisition electronics.
      </p>
    </section>
  );
}
