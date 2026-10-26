import { writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { loadPerceptFixture } from './load_fixture.mjs';
import { predictPercept, createTukeyWindow } from '../../src/lib/prima/percept.mjs';

const fixture = loadPerceptFixture();
function decode(text) {
  const bytes = inflateSync(Buffer.from(text, 'base64'));
  return Float64Array.from({ length: bytes.length / 8 }, (_, i) => bytes.readDoubleLE(i * 8));
}
function errors(actual, expected) {
  let maxAbsolute = 0, sumSquare = 0;
  for (let i = 0; i < actual.length; i++) {
    const error = Math.abs(actual[i] - expected[i]);
    if (!Number.isFinite(error)) throw new Error('Non-finite reference comparison.');
    maxAbsolute = Math.max(maxAbsolute, error); sumSquare += error * error;
  }
  return { maxAbsolute, rootMeanSquare: Math.sqrt(sumSquare / actual.length) };
}
const cases = fixture.cases.map(test => {
  const input = { width: test.size, height: test.size, values: decode(test.input) };
  const result = predictPercept(input, test.settings);
  const mask = createTukeyWindow(test.settings.cutoffCyclesPerImage ?? 10, test.size,
    { alpha: test.settings.taper, radiusExpansion: test.settings.radiusExpansion });
  return { name: test.name, size: test.size,
    mask: errors(mask.values, decode(test.mask)), spatial: errors(result.spatialValues, decode(test.spatial)),
    percept: errors(result.values, decode(test.expected)) };
});
const maxAbsolute = Math.max(...cases.flatMap(c => [c.mask.maxAbsolute, c.spatial.maxAbsolute, c.percept.maxAbsolute]));
if (maxAbsolute > 5e-12) throw new Error(`ProViSim reference error ${maxAbsolute} exceeds 5e-12.`);
const report = {
  schema: 'bts.prima.percept.validation.v1',
  reference: fixture.source, referenceVersions: fixture.versions,
  comparedImages: cases.length, comparedSamples: cases.reduce((sum, c) => sum + 3 * c.size * c.size, 0),
  maxAbsoluteError: maxAbsolute, acceptanceAbsoluteError: 5e-12,
  meaning: 'Numerical agreement with published percept approximation; not patient validation.',
  cases,
};
if (process.argv.includes('--write')) writeFileSync(new URL('../../docs/prima/PERCEPT_VALIDATION.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
