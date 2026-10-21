import { useEffect, useRef, useState } from 'preact/hooks';
import { CABLE_DEFAULTS, runCableExperiment } from '../lib/cortex/cable-explorer.js';

const fmt = (x, d = 2) => (Number.isFinite(x) ? Number(x).toFixed(d) : '');

function Plot({ series, minX, maxX, minY, maxY, xLabel, yLabel, marks = [] }) {
  const W = 600, H = 230, L = 62, R = 18, T = 22, B = 42;
  const X = (x) => L + ((x - minX) / (maxX - minX)) * (W - L - R);
  const Y = (y) => H - B - ((y - minY) / (maxY - minY)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((t) => [minX + t * (maxX - minX), minY + t * (maxY - minY)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} versus ${xLabel}`} style="width:100%;display:block">
      {marks.map((m, i) => (
        <rect key={i} x={X(m.from)} y={T} width={X(m.to) - X(m.from)} height={H - T - B} fill="currentColor" opacity=".06" />
      ))}
      {ticks.map(([tx, ty], t) => (
        <g key={t}>
          <path d={`M${L},${Y(ty)}H${W - R}`} stroke="currentColor" opacity=".14" />
          <text x={L - 8} y={Y(ty) + 4} text-anchor="end">{fmt(ty, maxY - minY > 100 ? 0 : 1)}</text>
          <text x={X(tx)} y={H - B + 20} text-anchor="middle">{fmt(tx, maxX - minX > 100 ? 0 : 2)}</text>
        </g>
      ))}
      <text x={L} y="13">{yLabel}</text>
      <text x={(W + L - R) / 2} y={H - 3} text-anchor="middle">{xLabel}</text>
      {series.map((s, j) => (
        <g key={j}>
          <path
            d={s.points.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')}
            style={{stroke:s.color || 'var(--bio-accent)'}} stroke-width="2.2" fill="none"
            {...(s.dashed ? {'stroke-dasharray':'5 4'} : {})}
          />
          {s.dots && s.points.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="3" style={{fill:s.color || 'var(--bio-accent)'}} />)}
        </g>
      ))}
    </svg>
  );
}

export default function CableExplorer() {
  const [diameter, setDiameter] = useState(CABLE_DEFAULTS.diameterUm);
  const [length, setLength] = useState(CABLE_DEFAULTS.lengthUm);
  const [rm, setRm] = useState(CABLE_DEFAULTS.resistanceOhmCm2);
  const [ri, setRi] = useState(CABLE_DEFAULTS.axialResistivityOhmCm);
  const [cm, setCm] = useState(CABLE_DEFAULTS.capacitanceUfPerCm2);
  const [amplitude, setAmplitude] = useState(CABLE_DEFAULTS.injectionNa * 1000); // pA
  const [run, setRun] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!alive.current) return;
      setRun(runCableExperiment({
        diameterUm: diameter,
        lengthUm: length,
        resistanceOhmCm2: rm,
        axialResistivityOhmCm: ri,
        capacitanceUfPerCm2: cm,
        injectionNa: amplitude / 1000,
      }));
    }, 120);
    return () => clearTimeout(id);
  }, [diameter, length, rm, ri, cm, amplitude]);

  const control = (label, value, set, min, max, step, unit) => (
    <label>{label}<output>{value} {unit}</output>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={(e) => set(Number(e.currentTarget.value))} />
    </label>
  );

  const theory = run?.theory;
  const vMin = run ? Math.min(0, ...run.profile.map((p) => Math.min(p.numericMv, p.analyticMv))) : -1;
  const vMax = run ? Math.max(1, ...run.profile.map((p) => Math.max(p.numericMv, p.analyticMv))) : 1;
  const vPad = (vMax - vMin) * 0.08;
  const tMax = run ? run.config.totalMs : 100;
  const traceVals = run ? run.probes.flatMap((p) => p.voltageMv) : [];
  const tMin = traceVals.length ? Math.min(...traceVals) : -65;
  const tMaxV = traceVals.length ? Math.max(...traceVals) : -60;
  const tPad = Math.max(0.5, (tMaxV - tMin) * 0.08);
  const probeColors = ['var(--bio-accent)', 'var(--bio-warm)', 'var(--bio-third)'];

  return (
    <div class="cable-explorer">
      <style>{`.cable-explorer{--bio-accent:#247b84;--bio-warm:#af6636;--bio-third:#7a6f9f;font-variant-numeric:tabular-nums}html[data-theme=dark] .cable-explorer{--bio-accent:#8dcdd2;--bio-warm:#efb67e;--bio-third:#b3a8d6}.cable-explorer .controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;padding:20px;border:1px solid var(--border);border-radius:0;background:var(--panel)}.cable-explorer label{display:grid;gap:10px;font-size:.9rem}.cable-explorer output{opacity:.7}.cable-explorer input{width:100%;accent-color:var(--bio-accent)}.cable-explorer .plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.cable-explorer .plot{border:1px solid var(--border);border-radius:0;padding:16px;margin-top:16px;background:var(--panel);min-width:0}.cable-explorer h2{font-family:var(--font-heading);font-size:28px;font-weight:400;margin:0 0 12px}.cable-explorer svg text{font:13px var(--font-body);fill:var(--text);opacity:.7}.cable-explorer table{width:100%;border-collapse:collapse;font-size:14px}.cable-explorer td,.cable-explorer th{padding:9px 12px;text-align:left;border-bottom:1px solid var(--border)}.cable-explorer th{font-weight:400;font-style:italic;background:var(--panelStrong)}.cable-explorer code{display:block;padding:12px;overflow:auto}.cable-explorer .note{opacity:.7;font-size:.85rem;margin-top:8px}@media(max-width:700px){.cable-explorer .plots{grid-template-columns:1fr}}`}</style>
      <div class="controls">
        {control('Diameter', diameter, setDiameter, 0.5, 8, 0.1, 'µm')}
        {control('Length', length, setLength, 200, 2000, 50, 'µm')}
        {control('Membrane resistance', rm, setRm, 5000, 60000, 1000, 'Ω·cm²')}
        {control('Axial resistivity', ri, setRi, 50, 400, 10, 'Ω·cm')}
        {control('Membrane capacitance', cm, setCm, 0.5, 2, 0.1, 'µF/cm²')}
        {control('Injected current', amplitude, setAmplitude, 10, 500, 10, 'pA')}
      </div>
      <div class="plots">
        <section class="plot">
          <h2>Steady-state voltage along the cable</h2>
          {run && (
            <Plot
              series={[
                { points: run.profile.map((p) => [p.xUm, p.numericMv]) },
                { points: run.profile.filter((_, i) => i % 8 === 0).map((p) => [p.xUm, p.analyticMv]), color: 'var(--bio-warm)', dots: true },
              ]}
              minX={0} maxX={length} minY={vMin - vPad} maxY={vMax + vPad}
              xLabel="Distance from injection site (µm)" yLabel="ΔV from rest (mV)"
            />
          )}
          <div class="note">Line: finite-volume solve · dots: analytic sealed-cable solution · max difference {run ? fmt(run.comparison.steadyStateErrorPct, 2) : ''}% of V(0)</div>
        </section>
        <section class="plot">
          <h2>Step transient</h2>
          {run && (
            <Plot
              series={run.probes.map((p, j) => ({ points: Array.from(run.timeMs, (t, i) => [t, p.voltageMv[i]]), color: probeColors[j] }))}
              minX={0} maxX={tMax} minY={tMin - tPad} maxY={tMaxV + tPad}
              xLabel="Time (ms)" yLabel="Voltage (mV)"
              marks={[{ from: run.config.stepStartMs, to: tMax }]}
            />
          )}
          <div class="note">{run ? `At ${fmt(run.probes[0].xUm, 0)} µm, ${fmt(run.probes[1].xUm, 0)} µm and ${fmt(run.probes[2].xUm, 0)} µm · step on at ${run.config.stepStartMs} ms, run to 6τ` : ''}</div>
        </section>
        <section class="plot">
          <h2>Cable properties</h2>
          <table>
            <tbody>
              <tr><th>Length constant λ</th><td>{theory ? fmt(theory.lambdaUm, 1) : ''} µm</td></tr>
              <tr><th>Electrotonic length L/λ</th><td>{theory ? fmt(theory.electrotonicLength, 2) : ''}</td></tr>
              <tr><th>Membrane time constant τ</th><td>{theory ? fmt(theory.tauMs, 1) : ''} ms</td></tr>
              <tr><th>First equalization constant τ₁</th><td>{theory ? fmt(theory.tau1Ms, 2) : ''} ms</td></tr>
              <tr><th>Input resistance, analytic</th><td>{theory ? fmt(theory.inputResistanceMOhm, 1) : ''} MΩ</td></tr>
              <tr><th>Input resistance, numeric</th><td>{run?.comparison.numericInputResistanceMOhm != null ? fmt(run.comparison.numericInputResistanceMOhm, 1) : ''} MΩ</td></tr>
            </tbody>
          </table>
          <code>{'λ = √(d·Rm / 4·Ri)   τ = Rm·Cm'}<br/>{'V(x) = I·R∞·cosh((L−x)/λ) / sinh(L/λ)'}<br/>{'R∞ = √(rm·ri)   Rin = R∞·coth(L/λ)   τ₁ = τ / (1 + (π·λ/L)²)'}</code>
        </section>
        <section class="plot">
          <h2>Configuration</h2>
          <table>
            <tbody>
              <tr><th>Geometry</th><td>Uniform cylinder · sealed ends · {CABLE_DEFAULTS.segments} compartments · lateral membrane only</td></tr>
              <tr><th>Injection</th><td>Somatic end (x = 0) · held to 6τ</td></tr>
              <tr><th>Solver</th><td>Finite-volume backward Euler · Hines tree · dt {CABLE_DEFAULTS.dtMs} ms · same integrator as Cortex Laboratory</td></tr>
              <tr><th>Membrane</th><td>Pure leak · no active channels · rest {CABLE_DEFAULTS.restMv} mV</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
