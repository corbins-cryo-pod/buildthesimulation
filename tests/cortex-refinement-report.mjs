import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../',import.meta.url);
const read = p => readFileSync(new URL(p,root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = JSON.parse(read('docs/cortex/benchmarks/refinement-latest.json'));

test('bounded refinement report matches executable sources and predeclared criteria', () => {
  assert.equal(report.status,'completed');
  assert.equal(report.sourceUnchangedDuringStudy,true);
  for (const [path,hash] of Object.entries(report.sourceHashes)) assert.equal(sha(read(path)),hash,`Stale numerical study: ${path}`);
  const criteria = read('docs/cortex/REFINEMENT.md').toString().split('## Results and interpretation')[0];
  assert.equal(sha(criteria),report.acceptanceCriteriaSha256);
  assert.deepEqual(report.meshesUm,[40,20,10]);
  assert.deepEqual(report.timestepsMs,[0.005,0.0025,0.00125]);
  assert.equal(report.acceptanceSummary.geometryPass,true);
  assert.equal(report.acceptanceSummary.currentAccountingPass,true);
  assert.equal(report.acceptanceSummary.independentProvenancePass,true);
});

test('threshold brackets retain evaluated endpoints and report failed gates without relabeling them', () => {
  for (const threshold of report.thresholds) {
    assert.ok(threshold.trials.some(t=>t.amplitude === threshold.lowerNoCrossing && !t.crossed));
    assert.ok(threshold.trials.some(t=>t.amplitude === threshold.upperCrossing && t.crossed));
    assert.ok(threshold.relativeWidth <= report.limits.thresholdRelativeWidth);
  }
  for (const c of report.thresholdComparisons)
    assert.equal(c.pass,c.conservativeEnvelopeRelativeDifference <= report.limits.thresholdEnvelopeRelative);
  assert.equal(report.acceptanceSummary.thresholdComparisons.passed,report.thresholdComparisons.filter(c=>c.pass).length);
  assert.equal(report.acceptanceSummary.waveformComparisons.passed,report.comparisons.filter(c=>c.pass).length);
});
