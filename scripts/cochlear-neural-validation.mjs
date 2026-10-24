/** Recalculate the quantitative neural implementation-verification report. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createNerveModel, simulateFiber } from '../src/lib/cochlear/nerve.js';

const reference = JSON.parse(readFileSync(new URL('../docs/cochlear/nerve-reference.json', import.meta.url), 'utf8'));
const model = createNerveModel();
const leadFields = [Float64Array.from(model.positionsMm, y => 1 / (4 * Math.PI / 3 * Math.hypot(0.5, y)))];
function differences(actual, expected, sampleCount = expected[0].length) {
  let sum = 0; let count = 0; let maximum = 0;
  for (let k = 0; k < expected.length; k++) for (let j = 0; j < sampleCount; j++) {
    const difference = Math.abs(actual[k][j] - expected[k][j]);
    sum += difference * difference; count++; maximum = Math.max(maximum, difference);
  }
  return { rmsDifferenceMv: Math.sqrt(sum / count), maximumDifferenceMv: maximum, comparedSamples: count };
}

const authorComparisons = reference.cases.map(c => {
  const response = simulateFiber({ model, leadFields, durationMs: c.durationMs, dtUs: 1,
    phaseWidthUs: c.widthUs, gapUs: c.gapUs, pulseForm: c.pulseForm,
    recordCompartments: c.recordCompartments,
    events: c.onsetUs.map(onsetUs => ({ onsetUs, contactIndex: 0, amplitudeUA: c.amplitudeUA })) });
  return { case: c.name, ...differences(response.membraneMv, c.membraneMv),
    browserSpikeTimesMs: response.spikeTimesMs, referenceSpikeTimesMs: c.referenceSpikeTimesMs,
    spikeThresholdMv: -5, referenceSampleIntervalUs: 20 };
});

const train = { model, leadFields, durationMs: 8, phaseWidthUs: 50, gapUs: 8,
  spikeThresholdMv: 0, events: [1000, 3000, 5000].map(onsetUs => ({ onsetUs, contactIndex: 0, amplitudeUA: 500 })) };
const fine = simulateFiber({ ...train, dtUs: 0.25 });
const convergence = [0.5, 1, 2, 5].map(dtUs => {
  const result = simulateFiber({ ...train, dtUs });
  return { dtUs, referenceDtUs: 0.25, ...differences(result.membraneMv, fine.membraneMv),
    spikeTimesMs: result.spikeTimesMs, referenceSpikeTimesMs: fine.spikeTimesMs,
    maximumSpikeTimeDifferenceUs: Math.max(...result.spikeTimesMs.map((t, i) => Math.abs(t - fine.spikeTimesMs[i]) * 1000)),
    spikeThresholdMv: 0 };
});
const lookup = simulateFiber({ ...train, dtUs: 1 });
const exact = simulateFiber({ ...train, dtUs: 1, useLookup: false });
const lookupComparison = { ...differences(lookup.membraneMv, exact.membraneMv),
  maximumSpikeTimeDifferenceUs: Math.max(...lookup.spikeTimesMs.map((t, i) => Math.abs(t - exact.spikeTimesMs[i]) * 1000)),
  voltageTableSpacingMv: 0.025, dtUs: 1 };
const thresholdChecks = reference.publishedThresholds.rows.map(c => {
  const response = factor => simulateFiber({ model, leadFields, durationMs: 6, dtUs: 5,
    phaseWidthUs: c.phaseWidthUs, gapUs: 0, pulseForm: c.pulseForm, recordCompartments: [],
    events: [{ onsetUs: 2000, contactIndex: 0, amplitudeUA: c.thresholdUA * factor }] });
  return { ...c, dtUs: 5, phaseGapUs: 0,
    spikesAt99_5Percent: response(0.995).spikeTimesMs.length,
    spikesAt100_5Percent: response(1.005).spikeTimesMs.length };
});
const report = {
  generatedAt: new Date().toISOString(), modelId: model.id, compartmentCount: model.compartmentCount,
  authorReference: { source: reference.sourceRepository, sourceBlobSha1: reference.sourceBlobSha1, brianVersion: reference.brianVersion },
  interpretation: 'Numerical implementation verification against published model behavior, not independent validation of human physiology or perception.',
  authorComparisons, convergence, lookupComparison, thresholdChecks,
  recommendedTimestepUs: 1,
  limitations: [
    'The neuron has deterministic channels and no added long-term adaptation mechanism.',
    'Geometry and model parameters are generic, not individualized to a recipient.',
    'The browser uses identical frustum axial conductances for membrane and extracellular coupling. The author stimulus generator uses midpoint-diameter resistance approximations for its extracellular drive; small waveform differences are therefore expected.',
    'Published threshold reproduction uses the original 5 us numerical step. Smaller steps change thresholds as the numerical solution converges.',
    'Reported waveform errors are unaligned point-by-point comparisons; steep action-potential edges amplify small latency differences.',
    'A successful numerical benchmark does not validate speech understanding, perceived sound, clinical programming, or implant safety.',
  ],
};
writeFileSync(new URL('../docs/cochlear/neural-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ authorComparisons, convergence, lookupComparison, thresholdChecks }, null, 2));
