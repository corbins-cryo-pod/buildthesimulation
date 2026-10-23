/** Retain reproducible numerical checks; no empirical RPNI validation claimed. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { run } from 'node:test';
import {
  MODEL_VERSION, DEFAULT_CONFIG, simulate, pointPotentialUv, contactPotentialUv,
  sourceTripolesAt, linearKernelInnerProduct, oxygenSlab,
} from '../src/lib/rpni-design/model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'src/lib/rpni-design/model.mjs';
const target = path.join(root, 'src/data/rpni-design-verification.json');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const sha256 = digest(source);
const dependencies = [
  { path: 'src/lib/rpni-design/export.mjs', role: 'Experiment schema, CSV and provenance export' },
  { path: 'src/lib/rpni-design/evidence.mjs', role: 'Evidence ledger and exported claim provenance' },
].map(file => ({ ...file, sha256: digest(file.path) }));
if (process.argv.includes('--check')) {
  const report = JSON.parse(fs.readFileSync(target, 'utf8'));
  const retainedDependencies = report.engine.dependencies || [];
  const staleDependencies = retainedDependencies.length !== dependencies.length || dependencies.some(file => !retainedDependencies.some(retained => retained.path === file.path && retained.sha256 === file.sha256));
  const stale = report.engine.version !== MODEL_VERSION || report.engine.sha256 !== sha256 || staleDependencies || report.tests.files.some(file => digest(file.path) !== file.sha256);
  if (stale || !report.passed) throw new Error('Retained RPNI numerical verification is stale or failing. Run node scripts/verify-rpni-design.mjs and review the result.');
  console.log(JSON.stringify({ retainedVerification: 'current', modelVersion: MODEL_VERSION, sha256, dependencies, tests: report.tests.count, passed: report.passed }));
  process.exit(0);
}

const files = ['tests/rpni-design.mjs', 'tests/rpni-design-export.mjs'].map(file => ({ path: file, sha256: digest(file), count: 0, passed: 0, failed: 0, command: `node --test-reporter=tap ${file}` }));
const stream = run({ isolation: 'none', files: files.map(file => path.join(root, file.path)) });
for await (const event of stream) {
  if (event.type === 'test:pass' || event.type === 'test:fail') {
    const record = files.find(file => path.join(root, file.path) === event.data.file);
    if (record) { record.count++; if (event.type === 'test:pass') record.passed++; else record.failed++; }
    if (event.type === 'test:fail') throw new Error(`Verification test failed: ${event.data.name}`);
  }
}
if (files.some(file => file.count < 2 || file.failed !== 0 || file.passed !== file.count)) throw new Error(`Expected named numerical tests, not outer file-level results: ${JSON.stringify(files)}`);

const checks = [];
const check = (id, label, measured, tolerance, unit = '') => checks.push({ id, label, measured, tolerance, unit, pass: Number.isFinite(measured) && measured <= tolerance });

const expectedPoint = 2.5e-6 / (4 * Math.PI * .2 * .005) * 1e6;
const actualPoint = pointPotentialUv([1, -2, 3], [4, 2, 3], 2.5, { longitudinalSm: .2, transverseSm: .2 });
check('isotropic-si', 'Point solution versus independent isotropic SI calculation: absolute error', Math.abs(expectedPoint - actualPoint), 1e-10, 'µV');

const sigma = { longitudinalSm: .5, transverseSm: .1 };
const axialRatio = pointPotentialUv([0, 0, 0], [3, 0, 0], 1, sigma) / pointPotentialUv([0, 0, 0], [0, 3, 0], 1, sigma);
check('anisotropy-axis', 'Anisotropic axis ratio versus √(σ∥/σ⊥): absolute error', Math.abs(axialRatio - Math.sqrt(5)), 1e-12);

const diskExpected = 1000 / (2 * Math.PI * .2) * (Math.sqrt(5) - 2);
const diskActual = contactPotentialUv({ positionMm: [0, 0, 2], normal: [0, 0, 1], radiusMm: 1 }, [{ positionMm: [0, 0, 0], currentUa: 1 }], { longitudinalSm: .2, transverseSm: .2 }, { order: 8 });
check('disk-integral', 'Disk average versus closed-form on-axis integral: absolute error', Math.abs(diskActual - diskExpected), 1e-10, 'µV');
check('linear-energy', 'Triangular waveform energy versus exact 2/3 ms integral: absolute error', Math.abs(linearKernelInnerProduct([0, 1, 0], [0, 1, 0], 1) - 2 / 3 / 1000), 1e-16, 'µV²·s');

const start = performance.now(), baseline = simulate(), defaultRuntimeMs = performance.now() - start;
let currentResidual = 0;
for (const unit of baseline.motorUnits) for (const ageMs of [.01, .15, .5, 1.7, 3.2, 5, 20]) currentResidual = Math.max(currentResidual, Math.abs(sourceTripolesAt(unit, ageMs, baseline.config).reduce((s, source) => s + source.currentUa, 0)));
check('net-source-current', 'Largest net instantaneous current residual across sampled tripole phases', currentResidual, 1e-14, 'µA');

const slab = oxygenSlab(), flux = 2 * slab.diffusivityMm2S / slab.lambdaMm * Math.tanh(slab.thieleModulus), consumption = slab.consumptionPerS * slab.thicknessMm * slab.meanRatio;
check('slab-conservation', 'Two-face inward flux minus integrated first-order consumption: absolute error', Math.abs(flux - consumption), 1e-14, 'normalized concentration·mm/s');

const zero = simulate({ motorUnitsPerModule: 2, sourceAmplitudeUa: 0, contactOrder: 1, traceDurationMs: 50 });
check('zero-source', 'Largest clean voltage in a zero-source/noise-only experiment', Math.max(...zero.recording.channels.flatMap(channel => channel.cleanUv.map(Math.abs))), 0, 'µV');

const convergence = [];
for (const [parameter, value, tolerance] of [['kernelOversampling', 8, .002], ['contactOrder', 6, .001]]) {
  const refined = simulate({ [parameter]: value }, { includeRecording: false });
  baseline.summary.channels.forEach((channel, i) => {
    const coarseValue = channel.cleanRmsUv, fineValue = refined.summary.channels[i].cleanRmsUv, absoluteDifference = Math.abs(coarseValue - fineValue), relativeDifference = absoluteDifference / Math.max(1e-30, Math.abs(fineValue));
    convergence.push({ parameter, coarse: baseline.config[parameter], fine: value, channel: channel.id, metric: 'Expected clean RMS at the default benchmark', unit: 'µV', coarseValue, fineValue, absoluteDifference, relativeDifference, tolerance, pass: relativeDifference <= tolerance });
  });
}

const report = {
  schema: 'rpni-design-numerical-verification', schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  engine: { version: MODEL_VERSION, source, sha256, dependencies },
  environment: { node: process.version, platform: process.platform, architecture: process.arch },
  tests: { count: files.reduce((s, f) => s + f.count, 0), passed: files.reduce((s, f) => s + f.passed, 0), failed: files.reduce((s, f) => s + f.failed, 0), files },
  checks, convergence,
  benchmarks: { defaultRuntimeMs, defaultConfiguration: DEFAULT_CONFIG, defaultExpectedRmsUv: baseline.summary.channels.map(c => c.rmsUv), defaultExpectedCleanRmsUv: baseline.summary.channels.map(c => c.cleanRmsUv), defaultRecordingRmsUv: baseline.recording.metrics.map(c => c.rmsUv), defaultRecordingCleanRmsUv: baseline.recording.metrics.map(c => c.cleanRmsUv), defaultOxygenCenterRatio: baseline.oxygen.centerRatio, defaultOxygenMeanRatio: baseline.oxygen.meanRatio, expectedRmsInterpretation: 'Stationary centered independent-Poisson equivalent-source variance; total expected RMS includes the imposed noise variance.', recordingRmsInterpretation: 'Finite seeded, mean-removed waveform realization with independent imposed noise; it is not expected to equal ensemble RMS exactly.', timingInterpretation: 'One local Node run, not a hardware-independent or browser performance guarantee.' },
  passed: checks.every(c => c.pass) && convergence.every(c => c.pass),
  interpretation: 'Verifies stated analytical limits, implementation invariants, selected default refinements, and strict experiment schema behavior. This does not validate biological remodeling, graft survival, absolute RPNI voltage, clinical SNR, electrode safety, or a design optimum. Refinement tolerances apply only to the retained benchmark; arbitrary geometries can require additional refinement.',
};
if (!report.passed) throw new Error(`Numerical checks or refinement gates failed:\n${JSON.stringify(report, null, 2)}`);
fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ written: 'src/data/rpni-design-verification.json', version: MODEL_VERSION, sha256, tests: report.tests.count, passed: report.passed, checks: checks.length, convergence: convergence.length, defaultRuntimeMs }));
