import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { freshActiveConfig } from '../src/lib/cortex/config.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const start = freshActiveConfig();
const summary = (r) => ({
  config: r.config,
  elapsedMs: r.diagnostics.elapsedMs,
  outputBytes: r.diagnostics.outputBytes,
  frames: r.diagnostics.frames,
  compartments: r.diagnostics.compartments,
  conditioning: r.initialization.conditioningCache,
  somaSpikes: r.spikes,
  firstCrossing: r.diagnostics.firstThresholdCrossing,
  peakSomaMv: Math.max(
    ...r.timeMs.map((_, k) => r.membraneMv[k * r.diagnostics.compartments + (r.somaIndex ?? 0)]),
  ),
  peakNeuralUv: Math.max(...r.neuralUv[0].map(Math.abs)),
  conservationNa: r.diagnostics.maxConservationResidualNa,
  kclNa: r.diagnostics.maxKclResidualNa,
});
const cold = runExperiment(start),
  warm = runExperiment(start),
  halfDt = structuredClone(start);
halfDt.solver.dtMs /= 2;
const fine = structuredClone(halfDt);
fine.neuron.segmentLengthUm = 20;
const cases = [
  summary(cold),
  summary(warm),
  summary(runExperiment(halfDt)),
  summary(runExperiment(fine)),
];
function threshold(config, mode) {
  const c = structuredClone(config);
  c.protocol.mode = mode;
  if (mode === 'extracellular-stimulation') {
    c.protocol.sourceContactIds = ['r4-c4', 'r4-c5'];
    c.recording.contactIds = ['r3-c3', 'r3-c6'];
  }
  let low = 0,
    high = mode === 'intracellular-current' ? 1.2 : 40;
  for (let k = 0; k < 6; k++) {
    const amplitude = (low + high) / 2;
    c.protocol[mode === 'intracellular-current' ? 'injectionNa' : 'amplitudeUa'] = amplitude;
    const r = runExperiment(c),
      event =
        mode === 'intracellular-current'
          ? r.spikes.some((s) => s.timeMs <= 15)
          : Array.from(r.firstCrossingByCompartment).some((t) => Number.isFinite(t) && t <= 15);
    if (event) high = amplitude;
    else low = amplitude;
  }
  return {
    mode,
    criterion: mode === 'intracellular-current' ? 'soma' : 'any membrane',
    windowEndMs: 15,
    thresholdMv: -25,
    dtMs: c.solver.dtMs,
    maximumSegmentUm: c.neuron.segmentLengthUm,
    lowerNoCrossing: low,
    upperCrossing: high,
    units: mode === 'intracellular-current' ? 'nA' : 'µA',
  };
}
const thresholds = [start, halfDt, fine].flatMap((c) =>
  ['intracellular-current', 'extracellular-stimulation'].map((mode) => threshold(c, mode)),
);
const report = {
  schemaVersion: 'cortex-active-benchmark/1',
  engineVersion: cold.engineVersion,
  generatedAt: new Date().toISOString(),
  runtime: { node: process.version, cpu: cpus()[0].model },
  scope:
    'Node CPU solver, including declared conditioning on cold runs; output arrays only; no browser FPS or whole-process peak memory',
  cases,
  thresholds,
};
writeFileSync(
  new URL('../docs/cortex/benchmarks/active-latest.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  cases.map((c) => ({
    dtMs: c.config.solver.dtMs,
    segmentUm: c.config.neuron.segmentLengthUm,
    elapsedMs: c.elapsedMs,
    spikes: c.somaSpikes,
    first: c.firstCrossing,
    peakNeuralUv: c.peakNeuralUv,
    conditioning: c.conditioning,
  })),
);
