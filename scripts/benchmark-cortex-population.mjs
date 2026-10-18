// Run separately from tests/builds. CPU integration only; no browser/FPS claim.
import { writeFileSync, readFileSync } from 'node:fs';
import { cpus, platform, arch } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { getExampleConfig } from '../src/lib/cortex/examples.js';
import { freshPopulation, planPopulation, runPopulation } from '../src/lib/cortex/population.js';
const config = getExampleConfig('extracellular-soma-spike');
config.protocol.amplitudeUa = 20; // Fully supported 3D grid benchmark; separate from default 40 µA cloud.
const cases = [];
for (const count of [1, 8, 16, 64, 17]) {
  const cloud = count === 17;
  const caseConfig = cloud ? getExampleConfig('extracellular-soma-spike') : config;
  const settings = cloud ? freshPopulation() : { ...freshPopulation(), layout: 'grid', center: 'target', count };
  const plan = planPopulation(caseConfig, settings, { allowUnsupported: true });
  const result = runPopulation(caseConfig, settings);
  assert.equal(result.cells.length, count);
  const solved = result.cells.filter(c => c.status === 'simulated');
  assert.ok(solved.every(c => c.somaMv.every(Number.isFinite)));
  assert.ok(result.neuralUv.every(values => values.every(Number.isFinite)));
  assert.ok(result.diagnostics.outputBytes <= plan.retainedOutputUpperBytes);
  assert.ok(solved.every(c => c.maxKclResidualNa < 1e-8));
  const row = { count, simulatedCells: solved.length, excludedCells: count - solved.length,
    settings, amplitudeUa: caseConfig.protocol.amplitudeUa, elapsedMs: result.diagnostics.elapsedMs,
    initialization: result.targetResult.initialization.conditioningCache,
    outputBytes: result.diagnostics.outputBytes, outputBudgetBytes: plan.retainedOutputUpperBytes,
    maxReachableDetailedArraysBytes: plan.liveNumericWorkingUpperBytes,
    compartmentsPerCell: plan.capacity.nodesPerCell,
    membraneCompartmentsPerCell: plan.capacity.membraneCompartmentsPerCell,
    somaEventCells: solved.filter(c => c.response.soma.thresholdEventCount > 0).length,
    somaWaveformEvidenceCells: solved.filter(c => c.response.soma.waveformEvidenceCount > 0).length,
    localOnlyCells: solved.filter(c => c.response.membraneThresholdCrossings.compartmentCount > 0 && !c.response.soma.thresholdEventCount).length,
    maxKclResidualNa: Math.max(...solved.map(c => c.maxKclResidualNa)),
    cells: result.cells.map(({ id, status, reason, somaUm, response, elapsedMs }) => ({ id, status, reason, somaUm, elapsedMs,
      localCrossings: response?.membraneThresholdCrossings.compartmentCount ?? null,
      somaEvents: response?.soma.thresholdEventCount ?? null,
      waveformEvidence: response?.soma.waveformEvidenceCount ?? null,
      firstSomaMs: response?.soma.firstCrossingTimeMs ?? null })) };
  cases.push(row);
  console.log(JSON.stringify({ ...row, cells: undefined }));
}
const files = ['src/lib/cortex/population.js', 'src/lib/cortex/experiment.js', 'src/lib/cortex/active-cable.js', 'scripts/benchmark-cortex-population.mjs'];
const report = { schemaVersion: 'cortex-population-benchmark/1', generatedAt: new Date().toISOString(),
  runtime: { node: process.version, cpu: cpus()[0].model, platform: platform(), arch: arch() }, config,
  scope: 'Sequential Node CPU measurements. First case computes conditioning; later cases reuse the identical state. No browser, GPU, FPS or process/browser peak-memory measurement. Retained numeric bytes exclude objects, geometry, exports, caches and allocator/GC overhead.',
  uniqueSpecimens: 1, cases,
  sourceHashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])) };
writeFileSync('docs/cortex/benchmarks/population-latest.json', JSON.stringify(report, null, 2) + '\n');
