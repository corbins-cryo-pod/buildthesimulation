// Single isopotential soma compartment built from the pinned Allen/Mosher
// 571654895 fitted soma mechanisms. Reuses the Cortex Laboratory integrator
// (createActiveCable/stepActiveCable) with one node, so kinetics, CaDynamics
// and the NEURON fixed-step convention are identical to the full model.
import { createActiveCable, stepActiveCable } from './active-cable.js';

// Membrane area of the soma sections in the pinned 571654895 morphology,
// summed over soma segments of the 10 µm variant. Not a fitted parameter.
export const SOMA_AREA_UM2 = 843.3559741984596;

export const SPIKE_THRESHOLD_MV = -25; // same convention as Cortex Laboratory
export const REFRACTORY_MS = 2;

// Fixed sweep protocols. Independent of the interactive trace controls.
export const IV_AMPLITUDES_NA = [-0.1, -0.075, -0.05, -0.03, -0.02, -0.01, -0.005, 0, 0.005, 0.0075, 0.01];
export const FI_AMPLITUDES_NA = [0.005, 0.0075, 0.01, 0.015, 0.02, 0.03, 0.05, 0.08, 0.12, 0.16, 0.2, 0.3];
export const SWEEP_PROTOCOL = { startMs: 200, durationMs: 600, tailMs: 100, dt: 0.025 };

function scaledFit(fit, densityScale) {
  if (densityScale === 1) return fit;
  const clone = structuredClone(fit);
  for (const p of clone.genome) if (p.name.startsWith('gbar')) p.value *= densityScale;
  return clone;
}

export function runCurrentClamp(fit, {
  injectionNa = 0,
  startMs = 200,
  durationMs = 600,
  tailMs = 100,
  dt = 0.025,
  sampleMs = 0.05,
  areaUm2 = SOMA_AREA_UM2,
  densityScale = 1,
} = {}) {
  const nodes = [{ id: 0, parent: -1, areaUm2, sectionType: 'soma', edgeUs: 0 }];
  const c = createActiveCable(nodes, scaledFit(fit, densityScale));
  const totalMs = startMs + durationMs + tailMs;
  const steps = Math.round(totalMs / dt);
  const sampleEvery = Math.max(1, Math.round(sampleMs / dt));
  const frames = Math.floor(steps / sampleEvery) + 1;
  const timeMs = new Float64Array(frames);
  const voltageMv = new Float64Array(frames);
  const spikes = [];
  const injection = new Float64Array(1);
  let frame = 0;
  let restSum = 0, restCount = 0;
  let endSum = 0, endCount = 0;
  let prevV = c.voltageMv[0];
  for (let k = 1; k <= steps; k++) {
    const t = k * dt;
    injection[0] = t >= startMs && t < startMs + durationMs ? injectionNa : 0;
    stepActiveCable(c, dt, { injectionNa: injection });
    const v = c.voltageMv[0];
    if (!Number.isFinite(v)) throw new Error('Non-finite soma voltage in current clamp.');
    if (prevV < SPIKE_THRESHOLD_MV && v >= SPIKE_THRESHOLD_MV) {
      const crossing = (k - 1) * dt + (dt * (SPIKE_THRESHOLD_MV - prevV)) / (v - prevV);
      if (!spikes.length || crossing - spikes.at(-1).timeMs >= REFRACTORY_MS)
        spikes.push({ timeMs: crossing });
    }
    prevV = v;
    if (t > startMs - 20 && t <= startMs) { restSum += v; restCount++; }
    if (t > startMs + durationMs - 50 && t <= startMs + durationMs) { endSum += v; endCount++; }
    if (k % sampleEvery === 0) {
      timeMs[frame] = t;
      voltageMv[frame] = v;
      frame++;
    }
  }
  const during = spikes.filter((s) => s.timeMs >= startMs && s.timeMs < startMs + durationMs);
  return {
    timeMs: timeMs.slice(0, frame),
    voltageMv: voltageMv.slice(0, frame),
    spikes,
    config: { protocol: { mode: 'intracellular-current', startMs, durationMs } },
    restMv: restCount ? restSum / restCount : NaN,
    stepEndMeanMv: endCount ? endSum / endCount : NaN,
    spikeCount: during.length,
    countRateHz: (during.length * 1000) / durationMs,
    latencyMs: during.length ? during[0].timeMs - startMs : null,
  };
}

export function ivSweep(fit, amplitudes = IV_AMPLITUDES_NA, options = {}) {
  return amplitudes.map((injectionNa) => {
    const r = runCurrentClamp(fit, { ...SWEEP_PROTOCOL, ...options, injectionNa });
    return {
      injectionNa,
      steadyMv: r.stepEndMeanMv,
      restMv: r.restMv,
      spiked: r.spikeCount > 0,
    };
  });
}

export function fiSweep(fit, amplitudes = FI_AMPLITUDES_NA, options = {}) {
  return amplitudes.map((injectionNa) => {
    const r = runCurrentClamp(fit, { ...SWEEP_PROTOCOL, ...options, injectionNa });
    return { injectionNa, count: r.spikeCount, rateHz: r.countRateHz, latencyMs: r.latencyMs };
  });
}
