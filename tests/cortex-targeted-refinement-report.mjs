import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { windowAverage, biphasicAverage } from '../src/lib/cortex/experiment.js';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT));
const hash = (p) => createHash('sha256').update(read(p)).digest('hex');
const valueHash = (value) => createHash('sha256').update(value).digest('hex');
const reportPath = 'docs/cortex/benchmarks/targeted-refinement-latest.json';
const report = JSON.parse(read(reportPath));
const provenance = JSON.parse(read('docs/cortex/benchmarks/targeted-refinement-provenance.json'));
const declared = [[40, .00125], [20, .00125], [10, .00125], [5, .00125], [10, .000625], [5, .000625], [2.5, .000625]];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('targeted refinement retains the complete predeclared mesh/time matrix and evaluated boundaries', () => {
  assert.equal(report.status, 'completed');
  assert.deepEqual(report.matrix.map((r) => [r.meshUm, r.dtMs]), declared);
  for (const [mesh, dt] of declared) {
    const matching = (c) => c.config.neuron.segmentLengthUm === mesh && c.config.solver.dtMs === dt;
    assert.equal(report.fixedCases.filter((c) => c.kind === 'local' && matching(c)).length, 1);
    const thresholds = report.thresholds.filter(matching);
    assert.equal(thresholds.length, 1);
    const t = thresholds[0];
    assert.equal(t.trials.length, 13, 'both initial endpoints and eleven bisections retained');
    assert.ok(t.trials.some((r) => r.amplitudeUa === 0 && !r.anyLocalCrossing));
    assert.ok(t.trials.some((r) => r.amplitudeUa === 40 && r.anyLocalCrossing));
    assert.ok(t.trials.some((r) => r.amplitudeUa === t.lowerNoCrossingUa && !r.anyLocalCrossing));
    assert.ok(t.trials.some((r) => r.amplitudeUa === t.upperCrossingUa && r.anyLocalCrossing));
    assert.ok(t.upperCrossingUa > t.lowerNoCrossingUa);
    const width = (t.upperCrossingUa - t.lowerNoCrossingUa) / t.upperCrossingUa;
    near(t.relativeWidth, width);
    const sorted = [...t.trials].sort((a, b) => a.amplitudeUa - b.amplitudeUa);
    const monotonic = sorted.every((r, i) => !r.anyLocalCrossing || sorted.slice(i).every((later) => later.anyLocalCrossing));
    assert.equal(t.sampledMonotonicity, monotonic);
    assert.equal(t.precisionPass, monotonic && width <= report.limits.thresholdRelativeWidth);
    for (const r of t.trials) if (r.firstLocalCrossing) assert.ok(r.firstLocalCrossing.timeMs <= 15);
  }
  for (const mesh of [10, 5]) for (const dt of [.00125, .000625]) for (const kind of ['intracellular', 'moved-soma'])
    assert.equal(report.fixedCases.filter((c) => c.kind === kind && c.config.neuron.segmentLengthUm === mesh && c.config.solver.dtMs === dt).length, 1);
});

test('targeted report matches frozen numerical sources, criteria and full-import supplemental provenance', () => {
  assert.equal(report.sourceUnchangedDuringStudy, true);
  for (const [p, expected] of Object.entries(report.sourceHashes)) assert.equal(hash(p), expected, p);
  assert.equal(hash('docs/cortex/TARGETED_REFINEMENT.md'), report.criteriaSha256);
  assert.equal(provenance.pass, true);
  assert.equal(provenance.schemaVersion, 'cortex-targeted-provenance/1');
  assert.ok(['before-run-full-graph', 'during-run-supplement'].includes(provenance.captureMode));
  assert.equal(provenance.studySourceHashesMatch, true);
  assert.equal(provenance.studyReportSha256, hash(reportPath));
  assert.equal(provenance.criteriaSha256, report.criteriaSha256);
  assert.equal(provenance.generatorSha256, hash('scripts/cortex-targeted-refinement-audit.mjs'));
  assert.equal(provenance.importedInputsUnchanged, true);
  assert.equal(provenance.pulseHelpersUnchanged, true);
  assert.ok(Object.keys(provenance.capturedInputHashes).length > 0);
  for (const [p, expected] of Object.entries(provenance.capturedInputHashes)) assert.equal(provenance.importedFiles[p], expected, p);
  assert.deepEqual(Object.keys(provenance.pulseHelperHashes).sort(), ['biphasicAverage', 'windowAverage']);
  assert.equal(provenance.pulseHelperHashes.windowAverage, valueHash(windowAverage.toString()));
  assert.equal(provenance.pulseHelperHashes.biphasicAverage, valueHash(biphasicAverage.toString()));
  if (provenance.captureMode === 'before-run-full-graph') assert.deepEqual(Object.keys(provenance.capturedInputHashes).sort(), Object.keys(provenance.importedFiles).sort());
  for (const [p, expected] of Object.entries(provenance.importedFiles)) assert.equal(hash(p), expected, p);
  for (const p of ['src/lib/cortex/config.js', 'src/lib/cortex/world.js', 'src/lib/cortex/experiment.js', 'src/lib/cortex/implants.js', 'src/lib/devices/catalog.js']) assert.ok(provenance.importedFiles[p], p);
  const native = report.nativeMeshProvenance.generator;
  assert.equal(native.modelGeneratorSha256, hash('scripts/cortex-active-model.py'));
  assert.match(native.mechanismLibrarySha256, /^[a-f0-9]{64}$/);
  for (const [name, expected] of Object.entries(native.sourceHashes)) {
    const directory = name.endsWith('.mod') ? 'scripts/cortex-active-mechanisms' : 'public/models/cortex/allen571654895';
    assert.equal(hash(`${directory}/${name}`), expected, name);
  }
});

test('targeted refinement preserves physical geometry and reports unsuccessful scientific gates honestly', () => {
  assert.equal(report.harnessProductionCheck.pass, true);
  assert.deepEqual(report.geometryInvariants.map((r) => r.meshUm), [40, 20, 10, 5, 2.5]);
  for (const r of report.geometryInvariants) {
    assert.equal(r.topologyMatches, true);
    assert.ok(r.maxRelativeIntegralDifference <= report.limits.invariantRelative);
    assert.ok(r.maxEndpointDifferenceUm <= report.limits.endpointUm);
    assert.equal(r.pass, true);
  }
  assert.equal(report.limits.thresholdEnvelopeRelative, .02, 'unchanged original threshold gate');
  assert.equal(report.limits.voltageRmsMv, 1);
  assert.equal(report.limits.voltageMaximumMv, 5);
  const allRuns = [...report.fixedCases, ...report.thresholds.flatMap((t) => t.trials)];
  for (const r of allRuns) {
    assert.ok(Number.isFinite(r.maxKclResidualNa) && Number.isFinite(r.maxConservationResidualNa));
    assert.equal(r.currentAccountingPass, r.maxKclResidualNa <= report.limits.currentResidualNa && r.maxConservationResidualNa <= report.limits.currentResidualNa);
  }
  assert.equal(report.summary.currentAccountingPass, allRuns.every((r) => r.currentAccountingPass));
  const expectedPairs = [];
  for (const kind of ['local', 'intracellular', 'moved-soma']) {
    for (const dt of [.00125, .000625]) expectedPairs.push(`${kind}-10um-${dt}ms>${kind}-5um-${dt}ms`);
    for (const mesh of [10, 5]) expectedPairs.push(`${kind}-${mesh}um-0.00125ms>${kind}-${mesh}um-0.000625ms`);
  }
  expectedPairs.push('local-40um-0.00125ms>local-20um-0.00125ms', 'local-20um-0.00125ms>local-10um-0.00125ms', 'local-5um-0.000625ms>local-2.5um-0.000625ms');
  const pairKey = (c) => `${c.coarse}>${c.fine}`;
  assert.deepEqual(report.comparisons.map(pairKey).sort(), expectedPairs.sort());
  assert.deepEqual(report.thresholdComparisons.map(pairKey).sort(), expectedPairs.filter((key) => key.startsWith('local-')).sort());
  for (const c of report.thresholdComparisons) {
    const a = report.thresholds.find((t) => t.id === c.coarse), b = report.thresholds.find((t) => t.id === c.fine);
    assert.ok(a && b);
    const midpoint = (b.lowerNoCrossingUa + b.upperCrossingUa) / 2;
    const envelope = Math.max(Math.abs(a.lowerNoCrossingUa - b.upperCrossingUa), Math.abs(a.upperCrossingUa - b.lowerNoCrossingUa)) / midpoint;
    near(c.conservativeEnvelopeRelativeDifference, envelope);
    near(c.midpointRelativeDifference, Math.abs((a.lowerNoCrossingUa + a.upperCrossingUa) / 2 - midpoint) / midpoint);
    assert.equal(c.pass, a.precisionPass && b.precisionPass && envelope <= report.limits.thresholdEnvelopeRelative);
  }
  for (const c of report.comparisons) {
    const a = report.fixedCases.find((r) => r.id === c.coarse), b = report.fixedCases.find((r) => r.id === c.fine);
    assert.ok(a && b);
    assert.equal(c.events.localMatches, a.anyLocalCrossing === b.anyLocalCrossing);
    assert.equal(c.events.countsMatch, a.somaCrossingTimesMs.length === b.somaCrossingTimesMs.length);
    if (c.events.countsMatch) assert.deepEqual(c.events.somaTimingDifferencesMs, a.somaCrossingTimesMs.map((v, i) => Math.abs(v - b.somaCrossingTimesMs[i])));
    const firstDifference = a.firstLocalCrossing && b.firstLocalCrossing ? Math.abs(a.firstLocalCrossing.timeMs - b.firstLocalCrossing.timeMs) : null;
    assert.equal(c.events.firstTimingDifferenceMs, firstDifference);
    const eventsPass = c.events.countsMatch && c.events.localMatches && c.events.somaTimingDifferencesMs.every((v) => v <= report.limits.eventTimeMs) && (firstDifference === null || firstDifference <= report.limits.eventTimeMs);
    assert.equal(c.events.pass, eventsPass);
    for (const v of c.voltage) assert.equal(v.pass, v.rmsMv <= report.limits.voltageRmsMv && v.maximumMv <= report.limits.voltageMaximumMv && v.positionDifferenceUm <= report.limits.endpointUm);
    for (const v of c.neural) { near(v.normalizedRms, v.rmsUv / v.denominatorUv); assert.equal(v.pass, v.normalizedRms <= report.limits.neuralNormalizedRms); }
    for (const v of c.artifact) assert.equal(v.pass, v.maximum <= report.limits.artifactMaximumUv);
    assert.equal(c.pass, c.voltage.every((v) => v.pass) && c.neural.every((v) => v.pass) && c.artifact.every((v) => v.pass) && eventsPass && a.currentAccountingPass && b.currentAccountingPass);
  }
  assert.deepEqual(report.summary.thresholdComparisons, { passed: report.thresholdComparisons.filter((c) => c.pass).length, total: report.thresholdComparisons.length });
  assert.deepEqual(report.summary.waveformComparisons, { passed: report.comparisons.filter((c) => c.pass).length, total: report.comparisons.length });
});
