import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { DEFAULT_SETTINGS, MODEL_VERSION, EXPORT_SCHEMA, PARAMETER_REGISTER, normalizeSettings, validateBudget, BUDGET } from '../src/lib/axon-interface/settings.mjs';
import { createCohort, randomStream } from '../src/lib/axon-interface/geometry.mjs';
import { selectivityMetrics, bracketThreshold, orderedAmplitudeSweep } from '../src/lib/axon-interface/metrics.mjs';
import { runProtocol, runStudy, phaseAverage, buildMorphology, propagatedOutput } from '../src/lib/axon-interface/protocol.mjs';
import { resultJSON, importSettings, matrixCSV, eventCSV, timeSeriesCSV, cascadeCSV } from '../src/lib/axon-interface/export.mjs';
import { acceptWorkerMessage } from '../src/lib/axon-interface/requests.mjs';

// A small explicit cohort, not a reduced resolution hidden inside the solver.
// Two complete executions (direct and real Worker) establish exact replay.
const SMALL = Object.freeze({ axonCount: 4, channelCount: 1, durationMs: 2,
  dtMs: 0.00125, sampleDtMs: 0.05, passiveSegments: 3, amplitudeUa: 200, seed: 2048 });
let smoke;
const smokeProgress = [];
function completedSmoke() {
  if (!smoke) smoke = runProtocol(SMALL, { onProgress: p => smokeProgress.push(p) });
  return smoke;
}
function withoutElapsed(result) {
  const value = structuredClone(result);
  delete value.diagnostics.elapsedMs;
  return value;
}

function transport() {
  const worker = new Worker(new URL('./helpers/axon-interface-worker-harness.mjs', import.meta.url));
  const messages = [], waiters = [];
  let failure = null, exitCode = null;
  const reject = error => { for (const waiter of waiters.splice(0)) waiter.reject(error); };
  worker.on('message', message => {
    messages.push(message);
    for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].predicate(message)) {
      const [waiter] = waiters.splice(i, 1); waiter.resolve(message);
    }
  });
  worker.on('error', error => { failure = error; reject(error); });
  worker.on('exit', code => { exitCode = code; reject(new Error(`Worker exited (${code}) before the expected message.`)); });
  return {
    worker, messages, get exitCode() { return exitCode; },
    waitFor(predicate) {
      const previous = messages.find(predicate); if (previous) return Promise.resolve(previous);
      if (failure) return Promise.reject(failure);
      if (exitCode !== null) return Promise.reject(new Error(`Worker has exited (${exitCode}).`));
      return new Promise((resolve, reject) => waiters.push({ predicate, resolve, reject }));
    }
  };
}

test('axon interface: deterministic anatomy is independent of stimulus, conductivity and occupancy controls', () => {
  const a = createCohort(normalizeSettings(SMALL));
  assert.deepEqual(a, createCohort(normalizeSettings(SMALL)));
  assert.deepEqual(a, createCohort(normalizeSettings({ ...SMALL, amplitudeUa: 0,
    perineuriumResistivityOhmM: 4000, seedingLambda: 3, contactAreaUm2: 20000 })));
  assert.notDeepEqual(a.cells, createCohort(normalizeSettings({ ...SMALL, seed: 2049 })).cells);
  const one = randomStream(42, 'anatomy'), two = randomStream(42, 'anatomy'), other = randomStream(42, 'fabrication');
  const first = Array.from({ length: 6 }, one); Array.from({ length: 400 }, other);
  assert.deepEqual(first, Array.from({ length: 6 }, two));
  assert.equal(a.census, 4);
  assert.ok(a.cells.every(c => c.originalHostIdentity === null));
});

test('axon interface: malformed imports and unsupported scientific settings are rejected', () => {
  const s = normalizeSettings(SMALL);
  const wrap = settings => JSON.stringify({ schema: EXPORT_SCHEMA, modelVersion: MODEL_VERSION, settings });
  assert.deepEqual(importSettings(wrap(s)), s);
  for (const text of ['{', 'null', '[]', '{}', wrap({}), JSON.stringify({ schema: 'wrong', modelVersion: MODEL_VERSION, settings: s })])
    assert.throws(() => importSettings(text));
  const missing = { ...s }; delete missing.dtMs;
  assert.throws(() => importSettings(wrap(missing)), /every normalized setting|Missing/);
  assert.throws(() => importSettings(wrap({ ...s, temperatureC: 6.3 })), /temperatureC/);
  assert.throws(() => importSettings(wrap({ ...s, dtMs: '0.00125' })), /finite number/);
  assert.throws(() => normalizeSettings({ fiberDiameterUm: 9 }), /tabulated/);
  assert.throws(() => normalizeSettings({ nodeCount: 12 }), /odd/);
  assert.throws(() => normalizeSettings({ passiveSegments: 2 }), /1, 3, or 5/);
  assert.throws(() => normalizeSettings({ sourceOffsetUm: Infinity }), /finite/);
  assert.throws(() => normalizeSettings(JSON.parse('{"constructor":3}')), /Unknown parameter/);
  assert.throws(() => normalizeSettings({ wellPitchUm: 20, somaDiameterUm: 30 }), /do not fit/);
  assert.ok(Object.isFrozen(s));
  assert.equal(new Set(PARAMETER_REGISTER.map(p => p.key)).size, Object.keys(DEFAULT_SETTINGS).length);
  assert.ok(PARAMETER_REGISTER.every(p => p.units && p.provenance && ['experimental','mathematical','estimated','hypothetical'].includes(p.evidence)));
});

test('axon interface: co-recruitment, duplicate channels and failed audits cannot inflate exclusive yield', () => {
  const rows = [[1,0,0,0], [0,1,1,0], [1,0,0,0], [0,0,0,1]];
  const local = [[0,0,0,0], [0,1,0,0], [0,0,0,0], [0,0,0,1]];
  const eligible = [[1,0,0,0], [0,0,0,0], [1,0,0,0], [0,0,0,0]];
  const m = selectivityMetrics(rows, local, [0,0,0,0], 4, { initiationEligible: eligible });
  assert.equal(m.engineeredExclusiveCount, 2);
  assert.equal(m.sharedOnlyCount, 2);
  assert.equal(m.engineeredLocalDependentExclusiveCount, 1);
  assert.equal(m.engineeredCausalExclusiveCount, 1);
  assert.equal(m.matrixRank, 3);
  assert.equal(m.uniformSingleChannelInformationBits, 1.5);
  assert.deepEqual(m.channels[1].members, [1,2]);
  assert.equal(m.classes[3][3], 'persists with local silencing');
  assert.equal(m.originalHostY, null);
  assert.equal(m.originalHostCensus, null);
  assert.equal(m.hypotheticalCompleteB3.originalHostY, 0);
  const noInitiation = selectivityMetrics(rows, local, [0,0,0,0], 4);
  assert.equal(noInitiation.engineeredCausalExclusiveCount, null);
  const failed = selectivityMetrics(rows, local, [0,0,0,0], 4, { auditValid: false, initiationEligible: eligible });
  for (const key of ['engineeredExclusiveCount','engineeredCausalExclusiveCount','sharedOnlyCount','anyRecruitment','matrixRank','uniformSingleChannelInformationBits']) assert.equal(failed[key], null, key);
  assert.throws(() => selectivityMetrics([[null,0,0,0]], [[0,0,0,0]], [0,0,0,0], 4), /binary/);
  assert.throws(() => selectivityMetrics([[1,0]], [[0,0]], [0,0], 4), /cohort/);
});

test('axon interface: sampled thresholds retain nonmonotonicity and reject failed samples', () => {
  assert.deepEqual(orderedAmplitudeSweep(10), [0,5,7.5,10,12.5,15]);
  const r = bracketThreshold([0,1,2,3], [false,true,false,true]);
  assert.deepEqual(r.crossings, [[0,1],[2,3]]);
  assert.equal(r.nonmonotonic, true);
  assert.equal(r.interpolation, 'none');
  assert.throws(() => bracketThreshold([0,1,2], [false,null,true]), /valid binary/);
  assert.throws(() => bracketThreshold([0,2,1], [false,false,true]), /ordered/);
  assert.throws(() => bracketThreshold([0,1,1], [false,false,true]), /ordered/);
});

test('axon interface: charge-balanced phases integrate correctly without requiring display alignment', () => {
  const s = normalizeSettings({ ...SMALL, stimulusStartMs: 0.5002, phaseWidthMs: 0.1007, phaseGapMs: 0.0253 });
  let negative = 0, positive = 0;
  for (let k = 0; k < s.durationMs/s.dtMs; k++) {
    const q = phaseAverage(s, k*s.dtMs)*s.dtMs;
    if (q < 0) negative += q; else positive += q;
  }
  assert.ok(Math.abs(negative+s.amplitudeUa*s.phaseWidthMs) < 1e-10);
  assert.ok(Math.abs(positive-s.amplitudeUa*s.phaseWidthMs) < 1e-10);
  assert.ok(Math.abs(negative+positive) < 1e-10);
});

test('axon interface: explicit work budgets and cancellation reject before partial results exist', () => {
  const huge = normalizeSettings({ axonCount: 256, channelCount: 4, nodeCount: 21,
    passiveSegments: 5, durationMs: 10, dtMs: 0.000625, sampleDtMs: 0.0025 });
  assert.throws(() => validateBudget(huge, buildMorphology(huge).compartments.length), /work budget/);
  assert.throws(() => validateBudget(normalizeSettings(SMALL), 0), /positive integer/);
  // A default six-amplitude sweep exceeds the combined declared work budget.
  let began = false;
  assert.throws(() => runStudy(DEFAULT_SETTINGS, 'amplitude', { onProgress: () => { began = true; } }), /budget/);
  assert.equal(began, false);
  assert.throws(() => runProtocol(SMALL, { shouldCancel: () => true }), /cancelled/);
});

test('axon interface: propagation diagnostics reject simultaneous and implausibly fast crossings', () => {
  const m = buildMorphology(normalizeSettings(SMALL));
  const eventCase = t => {
    const nodeEventTimes = Array.from({ length: m.nodes }, () => []);
    [m.nodes-4,m.nodes-3,m.nodes-2].forEach((n,i) => { nodeEventTimes[n] = [t[i]]; });
    return { nodeEventTimes };
  };
  assert.equal(propagatedOutput(eventCase([1,1,1]), m).recruited, false);
  assert.equal(propagatedOutput(eventCase([1,1.000001,1.000002]), m).recruited, false);
  assert.equal(propagatedOutput(eventCase([1,1.02,1.04]), m).recruited, true);
  assert.equal(propagatedOutput(eventCase([1,1.02,1.04]), m, { notBeforeMs: 1.1 }).recruited, false);
});

test('axon interface: complete small-cohort protocol keeps controls, geometry and source decomposition matched', { timeout: 90000 }, () => {
  const r = completedSmoke();
  assert.equal(r.auditComplete, true);
  assert.equal(r.auditValid, true);
  assert.equal(r.settings.axonCount, 4);
  assert.deepEqual(r.geometry, createCohort(r.settings));
  assert.equal(r.morphology.compartments.length, 311);
  assert.equal(r.pairTraces.length, 4);
  assert.ok(r.workBudget.actualRetainedValues <= r.workBudget.retainedValues);
  assert.ok(r.workBudget.actualRetainedValues <= BUDGET.maxSavedValues);
  assert.equal(r.controls.find(c => c.id === 'junction').status, 'not applicable');
  assert.equal(r.controls.find(c => c.id === 'no-construct').status, 'not modeled');
  assert.equal(r.metrics.originalHostY, null);
  assert.ok(r.matrices.wholeSilenced.every(row => row.every(v => !v)));
  for (const p of r.pairTraces) for (const key of ['assigned','localSilenced','wholeSilenced']) {
    const trace = p[key];
    assert.equal(trace.timeMs[0], 0);
    assert.equal(trace.timeMs.at(-1), r.settings.durationMs);
    assert.deepEqual(trace.voltageMv.map(v => v[0]), trace.indices.map(i => r.sharedInitialState.v[i]));
  }
  const solverIntervals = new Map(Array.from({ length: Math.round(r.settings.durationMs/r.settings.dtMs) }, (_,k) => [(k+1)*r.settings.dtMs,k*r.settings.dtMs]));
  for (const c of r.recordings) for (let i = 0; i < c.timeMs.length; i++) {
    assert.equal(c.hostUv[i], 0);
    assert.equal(c.totalUv[i], c.artifactUv[i]+c.engineeredUv[i]+c.hostUv[i]);
    assert.equal(c.appliedStepEndMs[i], c.timeMs[i]);
    // The solver applies the waveform at k*dt. A saved state after that step
    // must retain that exact interval, rather than recomputing it by t-dt,
    // which can have a different IEEE rounding. Exact equality is preserved.
    assert.equal(c.appliedStepStartMs[i], i===0?0:solverIntervals.get(c.timeMs[i]));
    assert.equal(c.stimulusUa[i], i===0?0:phaseAverage(r.settings,c.appliedStepStartMs[i]));
    assert.ok([c.totalUv[i],c.engineeredUv[i],c.artifactUv[i]].every(Number.isFinite));
  }
  assert.equal(smokeProgress.at(-1).fraction, 1);
  assert.ok(smokeProgress.every((p,i) => Number.isFinite(p.fraction) && p.fraction>=0 && p.fraction<=1 && (!i || p.fraction>=smokeProgress[i-1].fraction)));
});

test('axon interface: JSON and CSV retain original settings, limits, controls, units and missing biological quantities', { timeout: 90000 }, () => {
  const r = completedSmoke(), settingsBefore = structuredClone(r.settings), exported = resultJSON(r), parsed = JSON.parse(exported);
  assert.equal(parsed.schema, EXPORT_SCHEMA);
  assert.equal(parsed.modelVersion, MODEL_VERSION);
  assert.deepEqual(importSettings(exported), r.settings);
  assert.deepEqual(parsed.settings, settingsBefore);
  assert.deepEqual(parsed.matrices, r.matrices);
  assert.deepEqual(parsed.geometry, r.geometry);
  assert.deepEqual(parsed.controls, r.controls);
  assert.deepEqual(parsed.limitations, r.limitations);
  assert.equal(parsed.quantityUnits.fieldTransfer, 'mV/µA');
  assert.equal(parsed.quantityUnits.recording, 'µV');
  assert.equal(parsed.metrics.originalHostY, null);
  assert.ok(parsed.cascade.some(x => x.count === null && /survival/.test(x.label)));
  const nextControlState = { ...r.settings, amplitudeUa: 999 };
  assert.notEqual(nextControlState.amplitudeUa, parsed.settings.amplitudeUa);
  assert.deepEqual(r.settings, settingsBefore);
  assert.equal(matrixCSV(r).split('\n').length, 1+Object.keys(r.matrices).length*r.settings.channelCount);
  assert.equal(eventCSV(r).split('\n').length, 1+r.events.length);
  assert.equal(timeSeriesCSV(r).split('\n').length, 1+r.recordings.reduce((n,c) => n+c.timeMs.length,0));
  assert.equal(cascadeCSV(r).split('\n').length, 1+r.cascade.length);
  for (const csv of [matrixCSV(r),eventCSV(r),timeSeriesCSV(r),cascadeCSV(r)]) assert.match(csv.split('\n')[0], /model_version.*audit_valid/);
  const failed = { ...r, auditValid: false };
  assert.match(matrixCSV(failed), /raw_diagnostic_audit_failed/);
  assert.throws(() => resultJSON({ ...r, auditComplete: false }), /completed/);
  assert.throws(() => resultJSON({ ...r, diagnostics: { ...r.diagnostics, invented: Infinity } }), /nonfinite/);
  assert.throws(() => resultJSON({ ...r, diagnostics: { ...r.diagnostics, invented: new Float64Array([NaN]) } }), /nonfinite/);
});

test('axon interface: production request guard rejects malformed and superseded messages', () => {
  for (const type of ['progress','result','study','error']) {
    assert.equal(acceptWorkerMessage({ id: 2, type }, 2), true);
    assert.equal(acceptWorkerMessage({ id: 1, type }, 2), false);
  }
  for (const message of [null,{}, {id:'2',type:'result'}, {id:2,type:'unknown'}, {id:2.1,type:'result'}]) assert.equal(acceptWorkerMessage(message,2), false);
});

test('axon interface: real Worker replay matches direct calculation and late results fail the production request guard', { timeout: 120000 }, async () => {
  const expected = completedSmoke(), older = transport(), newer = transport();
  try {
    await Promise.all([older.waitFor(m => m.__harness==='ready'), newer.waitFor(m => m.__harness==='ready')]);
    older.worker.postMessage({ id: 101, settings: SMALL });
    await older.waitFor(m => m.id===101 && m.type==='progress' && m.fraction>=0.025 && m.fraction<1);
    const currentRequestId = 102;
    newer.worker.postMessage({ id: currentRequestId, settings: { dtMs: 0 } });
    const currentError = await newer.waitFor(m => m.id===currentRequestId && m.type==='error');
    assert.equal(acceptWorkerMessage(currentError,currentRequestId), true);
    assert.match(currentError.message, /dtMs/);
    const old = await older.waitFor(m => m.id===101 && (m.type==='result'||m.type==='error'));
    assert.equal(old.type, 'result', old.message);
    assert.deepEqual(withoutElapsed(old.result), withoutElapsed(expected));
    assert.equal(acceptWorkerMessage(old,currentRequestId), false);
    assert.ok(older.messages.filter(m => m.type==='progress').every(m => m.id===101));
    assert.equal(newer.messages.some(m => m.type==='result'), false);
  } finally { await Promise.all([older.worker.terminate(),newer.worker.terminate()]); }
});

test('axon interface: terminating the actual running Worker prevents a late completed result', { timeout: 90000 }, async () => {
  const t = transport();
  try {
    await t.waitFor(m => m.__harness==='ready');
    t.worker.postMessage({ id: 201, settings: { ...SMALL, axonCount: 8, channelCount: 2 } });
    // This transition is emitted after at least the actual baseline calculation,
    // not after an arbitrary wall-clock sleep or a mocked progress event.
    await t.waitFor(m => m.id===201 && m.type==='progress' && m.fraction>=0.025 && m.fraction<1);
    await t.worker.terminate();
    assert.notEqual(t.exitCode,null);
    assert.equal(t.messages.some(m => m.id===201 && m.type==='result'),false);
    const count=t.messages.length;
    await nextTurn();
    assert.equal(t.messages.length,count);
  } finally { await t.worker.terminate(); }
});
