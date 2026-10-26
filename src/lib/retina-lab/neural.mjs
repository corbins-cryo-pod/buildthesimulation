import { morphology } from "./anatomy.mjs";
import {
  createOpsin,
  advanceOpsin,
  opening,
  spectralWeight,
  pulseAt,
} from "./optics.mjs";

export const NEURAL_NOTE =
  "Exploratory retinal response, not fitted to human recordings. Recruitment thresholds, reduced synaptic weights, survival and percept decoder are assumptions. Population sites represent samples, not literal cell counts.";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const recruitment = (drive, threshold) =>
  -Math.expm1(-Math.max(0, drive) / threshold);
export function runNetwork(c, cells, drive) {
  const n = cells.length,
    steps = Math.ceil(c.neural.durationMs / c.neural.timeStepMs),
    dt = c.neural.durationMs / steps,
    width = c.neural.gridSize;
  const vm = new Float64Array(n).fill(-65),
    bip = new Float64Array(n),
    amac = new Float64Array(n),
    adapt = new Float64Array(n),
    refractory = new Float64Array(n),
    counts = new Uint32Array(n),
    activity = new Float64Array(n),
    peakActivity = new Float64Array(n);
  const opsin = createOpsin(c.optical.opsin, n),
    spikes = [],
    frames = [],
    traces = {
      timeMs: [],
      voltageMv: [],
      bipolar: [],
      amacrine: [],
      populationHz: [],
      photocurrentPa: [],
    },
    index = c.neural.selectedIndex,
    neighbours = Array.from({ length: n }, (_, i) =>
      [
        i % width ? i - 1 : -1,
        i % width < width - 1 ? i + 1 : -1,
        i >= width ? i - width : -1,
        i < n - width ? i + width : -1,
      ].filter((x) => x >= 0),
    );
  const frameStride = Math.max(1, Math.round(5 / dt)),
    gain = Math.exp(-dt / c.neural.tauMs);
  let intervalSpikes = 0;
  frames.push({
    timeMs: 0,
    activity: Float32Array.from(activity),
    voltageMv: Float32Array.from(vm),
    bipolar: Float32Array.from(bip),
    amacrine: Float32Array.from(amac),
  });
  for (const key of Object.keys(traces))
    traces[key].push(
      key === "voltageMv" ? (c.fidelity === "recruitment" ? null : -65) : 0,
    );
  for (let step = 1; step <= steps; step++) {
    const t = Math.min(step * dt, c.neural.durationMs),
      mid = t - dt / 2,
      ePulse = drive.electricalEnvelope(mid),
      pvPulse = drive.photovoltaicEnvelope(mid),
      oPulse = pulseAt(
        mid,
        c.optical.pulseMs,
        c.optical.frequencyHz,
        c.optical.delayMs,
      );
    const nextBip = new Float64Array(n),
      nextAmac = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const cell = cells[i],
        sv = cell.survival,
        light = drive.optical[i] * oPulse;
      advanceOpsin(
        opsin,
        i,
        vm[i],
        light * spectralWeight(c.optical.opsin, c.optical.wavelengthNm),
        dt,
      );
      const photoConductance = 3 * c.optical.expression * opening(opsin, i),
        photoPa = photoConductance * (0 - vm[i]);
      const directPhoto = c.optical.target === "ganglion" ? photoPa / 180 : 0,
        bcPhoto = c.optical.target === "bipolar" ? photoPa / 180 : 0;
      const native = c.tissue.naturalVision
        ? drive.scene[i] * sv.photoreceptor
        : 0;
      adapt[i] =
        adapt[i] * Math.exp(-dt / 80) + native * (1 - Math.exp(-dt / 80));
      const contrast = cell.on
        ? Math.max(0, native - 0.5 * adapt[i])
        : Math.max(0, adapt[i] - native);
      const bcInput =
        sv.bipolar *
        (recruitment(
          drive.bipolarMv[i] * Math.max(0, pvPulse),
          c.neural.bipolarThresholdMv,
        ) +
          bcPhoto +
          contrast);
      nextBip[i] = bip[i] * gain + (1 - gain) * bcInput;
      const lateral =
        neighbours[i].reduce((s, j) => s + bip[j], 0) /
        Math.max(1, neighbours[i].length);
      nextAmac[i] =
        amac[i] * Math.exp(-dt / 25) + (1 - Math.exp(-dt / 25)) * lateral;
      const electrical =
        recruitment(drive.ganglionMv[i], c.neural.thresholdMv) *
        Math.max(0, ePulse);
      const excitation =
        sv.ganglion *
        Math.max(
          0,
          c.neural.electricalGainMv * electrical +
            c.neural.synapticGainMv *
              (directPhoto + nextBip[i] - c.neural.lateral * nextAmac[i]),
        );
      if (c.fidelity === "recruitment") {
        activity[i] =
          sv.ganglion *
          recruitment(
            drive.ganglionMv[i] / c.neural.thresholdMv +
              (drive.bipolarMv[i] * sv.bipolar) / c.neural.bipolarThresholdMv +
              directPhoto +
              bcPhoto +
              contrast,
            1,
          );
      } else {
        refractory[i] -= dt;
        if (refractory[i] <= 0) {
          vm[i] =
            -65 +
            (vm[i] + 65) * Math.exp(-dt / 12) +
            excitation * (1 - Math.exp(-dt / 12));
          if (vm[i] >= -50) {
            spikes.push({ cell: i, timeMs: t });
            counts[i]++;
            intervalSpikes++;
            vm[i] = -65;
            refractory[i] = 2;
          }
        }
        activity[i] =
          activity[i] * Math.exp(-dt / 20) + (refractory[i] === 2 ? 1 : 0);
      }
      peakActivity[i] = Math.max(peakActivity[i], activity[i]);
      if (i === index && (step % frameStride === 0 || step === steps))
        traces.photocurrentPa.push(photoPa);
    }
    bip.set(nextBip);
    amac.set(nextAmac);
    if (step % frameStride === 0 || step === steps) {
      frames.push({
        timeMs: t,
        activity: Float32Array.from(activity),
        voltageMv: Float32Array.from(vm),
        bipolar: Float32Array.from(bip),
        amacrine: Float32Array.from(amac),
      });
      traces.timeMs.push(t);
      traces.voltageMv.push(c.fidelity === "recruitment" ? null : vm[index]);
      traces.bipolar.push(bip[index]);
      traces.amacrine.push(amac[index]);
      traces.populationHz.push(
        intervalSpikes / ((n * frameStride * dt) / 1000),
      );
      intervalSpikes = 0;
    }
  }
  const response = Float32Array.from(
    counts,
    (v) => (v * 1000) / c.neural.durationMs,
  );
  if (c.fidelity === "recruitment") response.set(peakActivity);
  const sensitivity = [0.5, 1, 2].map((factor) => ({
    thresholdFactor: factor,
    meanRecruitment:
      cells.reduce(
        (s, cell, i) =>
          s +
          cell.survival.ganglion *
            recruitment(
              drive.ganglionMv[i] / c.neural.thresholdMv +
                (drive.bipolarMv[i] * cell.survival.bipolar) /
                  c.neural.bipolarThresholdMv,
              factor,
            ),
        0,
      ) / n,
  }));
  return {
    cells,
    response,
    frames,
    traces,
    spikes,
    counts,
    units: c.fidelity === "recruitment" ? "unitless recruitment" : "spikes/s",
    sensitivity,
    note: NEURAL_NOTE,
    model:
      c.fidelity === "recruitment"
        ? "bounded recruitment surrogate"
        : "coupled ON/OFF bipolar–amacrine + leaky integrate-and-fire RGC",
    sampling:
      "Density-reduced functional population. Spatial convergence is separate from anatomical cell density.",
  };
}

// Rate equations derived from the retinal Fohlmeister family, as retained in
// ModelDB 267391 (Italiano et al. 2022) spike.mod. Na, delayed K and A currents.
// Calcium currents/dynamics are omitted: explicitly a reduced active-cable model.
function ratio(x, scale) {
  return Math.abs(x) < 1e-7 ? scale : x / -Math.expm1(-x / scale);
}
export function retinalRates(v) {
  return [
    [0.6 * ratio(v + 30, 10), 20 * Math.exp(-(v + 55) / 18)],
    [0.4 * Math.exp(-(v + 50) / 20), 6 / (1 + Math.exp(-(v + 20) / 10))],
    [0.02 * ratio(v + 40, 10), 0.4 * Math.exp(-(v + 50) / 80)],
    [0.006 * ratio(v + 90, 10), 0.1 * Math.exp(-(v + 30) / 10)],
    [0.04 * Math.exp(-(v + 70) / 20), 0.6 / (1 + Math.exp(-(v + 40) / 10))],
  ];
}
export function cableSystem(nodes) {
  const lengths = nodes.map((p, i) =>
    i
      ? Math.max(
          1,
          Math.hypot(
            p.xUm - nodes[p.parent].xUm,
            p.yUm - nodes[p.parent].yUm,
            p.depthUm - nodes[p.parent].depthUm,
          ),
        )
      : 2 * p.radiusUm,
  );
  return nodes.map((p, i) => {
    const parent = nodes[p.parent],
      length = lengths[i];
    const area = i
      ? 2 * Math.PI * p.radiusUm * length
      : 4 * Math.PI * p.radiusUm ** 2;
    const axial = i
      ? 1e9 /
        (110 *
          1e4 *
          (length / (2 * Math.PI * p.radiusUm ** 2) +
            lengths[p.parent] / (2 * Math.PI * parent.radiusUm ** 2)))
      : 0;
    const soma = p.type === "soma",
      ais = p.type === "ais",
      axon = p.type === "axon";
    return {
      ...p,
      length,
      area,
      capacitancePf: 0.01 * area,
      axialNs: axial,
      naNs: area * (ais ? 7 : soma || axon ? 0.7 : 0.4),
      kNs: area * (soma || ais || axon ? 0.18 : 0.12),
      aNs: area * (axon ? 0 : soma || ais ? 0.54 : 0.36),
      leakNs: area * 0.00005,
    };
  });
}
/** Backward Euler tree solve with extracellular potential differences. Gauge invariant. */
export function solveTree(compartments, diag, rhs) {
  const d = Float64Array.from(diag),
    b = Float64Array.from(rhs),
    x = new Float64Array(d.length);
  for (let i = d.length - 1; i > 0; i--) {
    const p = compartments[i].parent,
      g = compartments[i].axialNs;
    d[p] -= (g * g) / d[i];
    b[p] += (g * b[i]) / d[i];
  }
  x[0] = b[0] / d[0];
  for (let i = 1; i < d.length; i++)
    x[i] = (b[i] + compartments[i].axialNs * x[compartments[i].parent]) / d[i];
  return x;
}
export function runCable(
  c,
  cell,
  fieldAt,
  {
    injectionPa = c.neural.cableInjectionPa,
    synapticDrive = 0,
    opticalDrive = 0,
    passive = false,
    nodes = morphology(cell),
  } = {},
) {
  const compartments = cableSystem(nodes),
    n = nodes.length,
    dt = c.neural.cableDtMs,
    steps = Math.ceil(c.neural.durationMs / dt),
    v = new Float64Array(n).fill(-65),
    gates = Array.from({ length: n }, () =>
      retinalRates(-65).map(([a, b]) => a / (a + b)),
    ),
    opsin = createOpsin(c.optical.opsin, n);
  const timeMs = [],
    voltageMv = [],
    compartmentFrames = [],
    spikes = [];
  let last = -65;
  for (let k = -Math.ceil(20 / dt); k < steps; k++) {
    const t = (k + 0.5) * dt,
      phi = t >= 0 ? fieldAt(t) : new Float64Array(n),
      d = new Float64Array(n),
      b = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const q = compartments[i],
        rates = retinalRates(clamp(v[i], -150, 100));
      for (let j = 0; j < 5; j++) {
        const [a, z] = rates[j],
          inf = a / (a + z);
        gates[i][j] = inf + (gates[i][j] - inf) * Math.exp(-dt * (a + z));
      }
      const [m, h, nn, p, qq] = gates[i],
        gna = passive ? 0 : q.naNs * m * m * m * h,
        gk = passive ? 0 : q.kNs * nn ** 4 + q.aNs * p ** 3 * qq;
      const light =
        t >= 0
          ? opticalDrive *
            pulseAt(
              t,
              c.optical.pulseMs,
              c.optical.frequencyHz,
              c.optical.delayMs,
            )
          : 0;
      advanceOpsin(
        opsin,
        i,
        v[i],
        light * spectralWeight(c.optical.opsin, c.optical.wavelengthNm),
        dt,
      );
      const gphoto =
        c.optical.target === "ganglion"
          ? q.area * 0.002 * c.optical.expression * opening(opsin, i)
          : 0;
      const synaptic =
        t >= 0
          ? typeof synapticDrive === "function"
            ? synapticDrive(t)
            : synapticDrive
          : 0;
      const gsyn = q.type === "dendrite" ? q.area * 0.002 * synaptic : 0;
      d[i] = q.capacitancePf / dt + gna + gk + q.leakNs + gphoto + gsyn;
      b[i] =
        (q.capacitancePf / dt) * v[i] + gna * 35 + gk * -75 + q.leakNs * -62.5;
      if (t >= 0 && t < Math.min(100, c.neural.durationMs) && i === 0)
        b[i] += injectionPa;
    }
    for (let i = 1; i < n; i++) {
      const { parent: p, axialNs: g } = compartments[i];
      d[i] += g;
      d[p] += g;
      b[i] += g * (phi[p] - phi[i]);
      b[p] += g * (phi[i] - phi[p]);
    }
    v.set(solveTree(compartments, d, b));
    if (!v.every(Number.isFinite))
      throw Error("Active cable produced a nonfinite voltage.");
    if (t >= 0) {
      if (last < 0 && v[0] >= 0) spikes.push((k + 1) * dt);
      if ((k + 1) % Math.max(1, Math.round(0.2 / dt)) === 0) {
        timeMs.push((k + 1) * dt);
        voltageMv.push(v[0]);
      }
      if ((k + 1) % Math.max(1, Math.round(5 / dt)) === 0)
        compartmentFrames.push({
          timeMs: (k + 1) * dt,
          voltageMv: Float32Array.from(v),
        });
    }
    last = v[0];
  }
  return {
    nodes,
    compartments: compartments.length,
    timeMs,
    voltageMv,
    compartmentFrames,
    spikes,
    peakMv: Math.max(...voltageMv),
    model:
      "Reduced retinal Na/K/A active tree cable; no Ca dynamics. Procedural morphology; no human electrophysiological calibration.",
    integration:
      "Implicit axial/membrane solve; Rush–Larsen gates; 20 ms dark equilibration",
    sources: [
      "https://modeldb.science/267391",
      "https://doi.org/10.1152/jn.1997.78.4.1935",
    ],
  };
}
