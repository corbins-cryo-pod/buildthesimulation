import { cpus, platform, arch, totalmem } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { freshConfig, ENGINE_VERSION } from '../src/lib/cortex/config.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const peak = (a) => a.reduce((s, x) => Math.max(s, Math.abs(x)), 0);
const measures = (r) => ({
  peakExcursionMv: r.diagnostics.maxExcursionMv,
  peakNeuralA_Uv: peak(r.neuralUv[0]),
  maxConservationResidualNa: r.diagnostics.maxConservationResidualNa,
  maxKclResidualNa: r.diagnostics.maxKclResidualNa,
});
const relative = (a, b) => Math.abs(a / b - 1);
const report = {
  schemaVersion: 'cortex-benchmark/1',
  engineVersion: ENGINE_VERSION,
  generatedAt: new Date().toISOString(),
  sourceBaseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  runtime: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    systemMemoryBytes: totalmem(),
  },
  scope:
    'Node CPU solver only; no browser FPS/GPU measurements; outputBytes excludes JS heap, renderer and serialization',
  cases: [],
  refinement: {},
  sensitivity: [],
};
for (const mode of ['synaptic-recording', 'extracellular-stimulation', 'intracellular-current']) {
  const config = freshConfig();
  config.protocol.mode = mode;
  runExperiment(config); // warm-up; not timed as a sample
  const samples = Array.from({ length: 7 }, () => runExperiment(config));
  const times = samples.map((r) => r.diagnostics.elapsedMs).sort((a, b) => a - b),
    result = samples.at(-1);
  report.cases.push({
    mode,
    config,
    repetitions: 7,
    elapsedMs: { min: times[0], median: times[3], max: times[6] },
    medianWallSecondsPerBiologicalSecond: times[3] / config.solver.durationMs,
    outputBytes: result.diagnostics.outputBytes,
    compartments: result.diagnostics.compartments,
    frames: result.timeMs.length,
    ...measures(result),
  });
}
const config = freshConfig(),
  baseline = runExperiment(config);
config.solver.dtMs /= 2;
const temporal = runExperiment(config);
config.neuron.segmentLengthUm /= 2;
const spatial = runExperiment(config);
report.refinement = {
  baseline: { config: baseline.config, ...measures(baseline) },
  halfDt: { config: temporal.config, ...measures(temporal) },
  halfSegmentAfterHalfDt: { config: spatial.config, ...measures(spatial) },
  temporalRelativeChange: {
    peakExcursion: relative(
      baseline.diagnostics.maxExcursionMv,
      temporal.diagnostics.maxExcursionMv,
    ),
    peakNeuralA: relative(peak(baseline.neuralUv[0]), peak(temporal.neuralUv[0])),
  },
  spatialRelativeChange: {
    peakExcursion: relative(
      temporal.diagnostics.maxExcursionMv,
      spatial.diagnostics.maxExcursionMv,
    ),
    peakNeuralA: relative(peak(temporal.neuralUv[0]), peak(spatial.neuralUv[0])),
  },
  gate: 'Each reported relative change < 0.01; default synaptic benchmark only',
};
for (const sigma of [0.15, 0.3, 0.6]) {
  const c = freshConfig();
  c.tissue.conductivitySPerM = sigma;
  report.sensitivity.push({
    parameter: 'conductivitySPerM',
    value: sigma,
    interpretation: 'Assumed sensitivity sweep, not biological confidence interval',
    ...measures(runExperiment(c)),
  });
}
const shifted = freshConfig();
shifted.implant.translationUm[0] = -100;
report.sensitivity.push({
  parameter: 'implant.translationUm[0]',
  value: -100,
  ...measures(runExperiment(shifted)),
});
await mkdir(new URL('../docs/cortex/benchmarks/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../docs/cortex/benchmarks/latest.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      cases: report.cases.map(
        ({ mode, elapsedMs, medianWallSecondsPerBiologicalSecond, maxConservationResidualNa }) => ({
          mode,
          elapsedMs,
          medianWallSecondsPerBiologicalSecond,
          maxConservationResidualNa,
        }),
      ),
      temporal: report.refinement.temporalRelativeChange,
      spatial: report.refinement.spatialRelativeChange,
    },
    null,
    2,
  ),
);
