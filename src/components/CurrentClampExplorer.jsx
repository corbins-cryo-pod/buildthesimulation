import { useEffect, useRef, useState } from 'preact/hooks';
import {
  SOMA_AREA_UM2,
  SPIKE_THRESHOLD_MV,
  IV_AMPLITUDES_NA,
  FI_AMPLITUDES_NA,
  SWEEP_PROTOCOL,
  runCurrentClamp,
  ivSweep,
  fiSweep,
} from '../lib/cortex/current-clamp.js';

const fmt = (x, d = 2) => (Number.isFinite(x) ? Number(x).toFixed(d) : '');
const pA = (na) => Math.round(na * 1000);

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
            stroke={s.color || '#2679ad'} stroke-width="2.2" fill="none"
          />
          {s.dots && s.points.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="3" fill={s.color || '#2679ad'} />)}
        </g>
      ))}
    </svg>
  );
}

export default function CurrentClampExplorer({ fit }) {
  const [amplitude, setAmplitude] = useState(100); // pA
  const [start, setStart] = useState(200);
  const [duration, setDuration] = useState(600);
  const [trace, setTrace] = useState(null);
  const [iv, setIv] = useState([]);
  const [fi, setFi] = useState([]);
  const [sweepDone, setSweepDone] = useState(false);
  const timers = useRef([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    // Fixed-protocol reference sweeps, one run per macrotask to keep the UI live.
    const queue = [
      ...IV_AMPLITUDES_NA.map((a, i) => () => setIv((s) => [...s, ivSweep(fit, [a])[0]])),
      ...FI_AMPLITUDES_NA.map((a) => () => setFi((s) => [...s, fiSweep(fit, [a])[0]])),
    ];
    const pump = () => {
      if (!alive.current) return;
      const job = queue.shift();
      if (!job) { setSweepDone(true); return; }
      job();
      timers.current.push(setTimeout(pump, 0));
    };
    timers.current.push(setTimeout(pump, 0));
    return () => { alive.current = false; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [fit]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!alive.current) return;
      setTrace(runCurrentClamp(fit, { injectionNa: amplitude / 1000, startMs: start, durationMs: duration, tailMs: 150 }));
    }, 150);
    return () => clearTimeout(id);
  }, [fit, amplitude, start, duration]);

  const totalMs = start + duration + 150;
  const ivSub = iv.filter((p) => !p.spiked).sort((a, b) => a.injectionNa - b.injectionNa);
  const fiSorted = [...fi].sort((a, b) => a.injectionNa - b.injectionNa);
  // Least-squares slope of the subthreshold IV points: mV per nA = GΩ.
  const n = ivSub.length;
  const sx = ivSub.reduce((a, p) => a + p.injectionNa, 0);
  const sy = ivSub.reduce((a, p) => a + p.steadyMv, 0);
  const sxx = ivSub.reduce((a, p) => a + p.injectionNa ** 2, 0);
  const sxy = ivSub.reduce((a, p) => a + p.injectionNa * p.steadyMv, 0);
  const rinGohm = n > 1 ? (n * sxy - sx * sy) / (n * sxx - sx * sx) : NaN;
  const vMin = trace ? Math.min(...trace.voltageMv) : -100;
  const vMax = trace ? Math.max(...trace.voltageMv) : 40;
  const pad = Math.max(5, (vMax - vMin) * 0.08);
  const maxRate = Math.max(10, ...fiSorted.map((p) => p.rateHz));

  const control = (label, value, set, min, max, step, unit) => (
    <label>{label}<output>{value} {unit}</output>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={(e) => set(Number(e.currentTarget.value))} />
    </label>
  );

  return (
    <div class="current-clamp">
      <style>{`.current-clamp{font-variant-numeric:tabular-nums}.current-clamp .controls,.current-clamp .plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.current-clamp .controls{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--panel)}.current-clamp label{display:grid;gap:10px;font-size:.9rem}.current-clamp output{opacity:.7}.current-clamp input,.current-clamp select{width:100%;accent-color:#2679ad}.current-clamp .plot{border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:16px;background:var(--panel);min-width:0}.current-clamp h2{font-size:1.25rem;font-weight:400;margin:0 0 12px}.current-clamp svg text{font-family:system-ui,sans-serif;font-size:12px;fill:currentColor}.current-clamp table{width:100%;border-collapse:collapse}.current-clamp td,.current-clamp th{padding:10px;text-align:left;border-bottom:1px solid var(--border);font-size:.9rem}.current-clamp code{display:block;padding:12px;overflow:auto}.current-clamp .note{opacity:.7;font-size:.85rem;margin-top:8px}@media(max-width:700px){.current-clamp .plots{grid-template-columns:1fr}}`}</style>
      <div class="controls">
        {control('Step amplitude', amplitude, setAmplitude, -100, 300, 5, 'pA')}
        {control('Step start', start, setStart, 50, 400, 10, 'ms')}
        {control('Step duration', duration, setDuration, 100, 1000, 20, 'ms')}
        <label>Model<output>571654895 soma · {SOMA_AREA_UM2.toFixed(1)} µm² · 34 °C · dt {0.025} ms</output></label>
      </div>
      <div class="plots">
        <section class="plot">
          <h2>Somatic voltage</h2>
          {trace && (
            <Plot
              series={[{ points: Array.from(trace.timeMs, (t, i) => [t, trace.voltageMv[i]]) }]}
              minX={0} maxX={totalMs} minY={vMin - pad} maxY={vMax + pad}
              xLabel="Time (ms)" yLabel="Voltage (mV)"
              marks={[{ from: start, to: start + duration }]}
            />
          )}
          <div class="note">Shaded band: current step · spike event: upward {SPIKE_THRESHOLD_MV} mV crossing, 2 ms refractory</div>
        </section>
        <section class="plot">
          <h2>Run</h2>
          <table>
            <tbody>
              <tr><th>Resting potential</th><td>{trace ? fmt(trace.restMv, 2) : ''} mV</td></tr>
              <tr><th>Step-end mean (last 50 ms)</th><td>{trace ? fmt(trace.stepEndMeanMv, 2) : ''} mV</td></tr>
              <tr><th>Spikes during step</th><td>{trace ? trace.spikeCount : ''}</td></tr>
              <tr><th>Rate during step</th><td>{trace ? fmt(trace.countRateHz, 1) : ''} Hz</td></tr>
              <tr><th>First-spike latency</th><td>{trace?.latencyMs != null ? `${fmt(trace.latencyMs, 1)} ms` : ''}</td></tr>
              <tr><th>Input resistance (IV slope)</th><td>{sweepDone ? fmt(rinGohm, 2) : ''} GΩ</td></tr>
            </tbody>
          </table>
          <code>{'C dV/dt = Iinj − gleak(V − Eleak) − Σ gion(V − Eion)'}<br/>{'Spikes: upward −25 mV crossing, linear interpolation'}</code>
        </section>
        <section class="plot">
          <h2>Steady-state IV</h2>
          <Plot
            series={[{ points: ivSub.map((p) => [pA(p.injectionNa), p.steadyMv]), dots: true }]}
            minX={-100} maxX={10} minY={-240} maxY={-80}
            xLabel="Injected current (pA)" yLabel="Voltage (mV)"
          />
          <div class="note">Mean of last 50 ms of a {SWEEP_PROTOCOL.durationMs} ms step · depolarizing points that spike omitted</div>
        </section>
        <section class="plot">
          <h2>f-I curve</h2>
          <Plot
            series={[{ points: fiSorted.map((p) => [pA(p.injectionNa), p.rateHz]), dots: true, color: '#b15d36' }]}
            minX={0} maxX={300} minY={0} maxY={maxRate}
            xLabel="Injected current (pA)" yLabel="Rate (Hz)"
          />
          <div class="note">Spike count in a {SWEEP_PROTOCOL.durationMs} ms window · rate falls above ~160 pA: depolarization block{sweepDone ? '' : ' · sweep computing'}</div>
        </section>
      </div>
    </div>
  );
}
