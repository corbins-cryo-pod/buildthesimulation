import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [index, methods, directory, reportText, mechanicsText] = await Promise.all([
  read('dist/simulations/cell-growth/index.html'),
  read('dist/simulations/cell-growth/methods/index.html'),
  read('dist/simulations/index.html'),
  read('src/data/cell-growth-validation.json'),
  read('src/data/cell-growth-mechanics-validation.json'),
]);
const report = JSON.parse(reportText), mechanics = JSON.parse(mechanicsText);
assert.match(index, /Cell Growth Laboratory/);
assert.match(index, /simulations\/cell-growth\/methods\//);
assert.match(directory, /href="\/simulations\/cell-growth\/"/);
assert.match(methods, /Microtubule stabilization specifies initial neuronal polarization/);
assert.match(methods, /Candidate|candidate/);
assert.equal(report.allAcceptancePassed, true, 'Cell growth numerical acceptance gates must pass.');
assert.equal(report.empiricalCalibration, false, 'Preserve the explicit empirical-calibration status.');
assert.equal(mechanics.allAcceptancePassed, true, 'Cell mechanics numerical gates must pass.');
assert.equal(mechanics.modelVersion, report.modelVersion);
assert.equal(mechanics.empiricalCalibration, false);
assert.match(methods, /cell-growth-mechanics-validation/);
for (const evidence of [report, mechanics]) for (const [path, expected] of Object.entries(evidence.sourceSha256)) {
  const actual = createHash('sha256').update(await read(path)).digest('hex');
  assert.equal(actual, expected, `Verification report is stale for ${path}. Regenerate it from the final source.`);
}
const componentPath = index.match(/component-url="([^\"]*CellGrowthLaboratory[^\"]+\.js)"/)?.[1];
assert.ok(componentPath, 'Hydrated Cell Growth Lab component must be bundled.');
const component = await read(`dist${componentPath}`);
const workers = [...new Set(component.match(/worker-[A-Za-z0-9_-]+\.js/g) || [])];
assert.ok(workers.length >= 1, 'Numerical worker must be emitted as an asset.');
for (const name of workers) {
  const code = await read(`dist/_astro/${name}`);
  assert.match(code, /cell-growth\/2\.0\.0/);
  assert.match(code, /microtubules/);
}
console.log(`Cell Growth Lab integration verified: two routes, directory entry, hydrated component, ${workers.length} worker, and ${report.checks.length + mechanics.checks.length} current numerical acceptance gates.`);
