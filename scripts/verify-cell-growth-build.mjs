import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [index, methods, directory, reportText, mechanicsText, cohortText] = await Promise.all([
  read('dist/simulations/cell-growth/index.html'),
  read('dist/simulations/cell-growth/methods/index.html'),
  read('dist/simulations/index.html'),
  read('src/data/cell-growth-validation.json'),
  read('src/data/cell-growth-mechanics-validation.json'),
  read('src/data/cell-growth-cohort-validation.json'),
]);
const report = JSON.parse(reportText), mechanics = JSON.parse(mechanicsText), cohort = JSON.parse(cohortText);
for (const [name, evidence] of [['cell-growth-validation', report], ['cell-growth-mechanics-validation', mechanics], ['cell-growth-cohort-validation', cohort]]) {
  assert.deepEqual(JSON.parse(await read(`dist/simulations/cell-growth/evidence/${name}.json`)), evidence, 'Published evidence must match the reports included in this build.');
  assert.ok(methods.includes(`/simulations/cell-growth/evidence/${name}.json`), 'Methods must link the same deployment’s evidence.');
}
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
assert.equal(cohort.modelVersion, report.modelVersion);
assert.equal(cohort.empiricalCalibration, false);
assert.equal(cohort.seedCount, 16, 'The release cohort requires the declared sixteen seeds.');
assert.equal(cohort.runs.length, 64, 'All four environments must be tested for every seed.');
assert.equal(cohort.completed, true);
assert.equal(cohort.allAcceptancePassed, true, 'The multi-seed cohort must complete with all gates passing.');
const declaredSeeds = Array.from({length:16},(_,i)=>(101+Math.imul(i,104729))>>>0);
assert.deepEqual(cohort.seeds, declaredSeeds, 'Preserve the predeclared seed cohort.');
for (const seed of declaredSeeds) for (const mode of ['culture','organoid','regeneration','biohybrid']) {
  const matches = cohort.runs.filter(run=>run.seed===seed&&run.mode===mode);
  assert.equal(matches.length, 1, `Require one complete result for ${mode}, seed ${seed}.`);
  const run=matches[0];
  assert.equal(run.passed, true);
  assert.equal(run.exactRoundTrip, true);
  assert.ok(run.reachedHours===72||run.limits.reached, 'A shorter run must explicitly report its capacity stop.');
  assert.ok(run.checkpoints.length>0&&run.checkpoints.every(check=>check.audit.passed));
}
assert.match(methods, /cell-growth-mechanics-validation/);
assert.match(methods, /elife-12387-media2/);
assert.match(methods, /jcs258983/);
assert.match(methods, /120–180/);
assert.match(methods, /cell-growth-cohort-validation/);
assert.match(methods, /media\/cell-growth\/v3-tip-motion\.mp4/);
const movie = await readFile(new URL('../dist/media/cell-growth/v3-tip-motion.mp4',import.meta.url));
assert.equal(movie.subarray(4,8).toString(), 'ftyp', 'The computed-motion example must be shipped as a playable MP4.');
for (const evidence of [report, mechanics, cohort]) for (const [path, expected] of Object.entries(evidence.sourceSha256)) {
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
  assert.match(code, /cell-growth\/3\.0\.0/);
  assert.match(code, /microtubules/);
}
console.log(`Cell Growth Lab integration verified: two routes, directory entry, hydrated component, ${workers.length} worker, ${report.checks.length + mechanics.checks.length} numerical gates and ${cohort.runs.length} multi-seed runs.`);
