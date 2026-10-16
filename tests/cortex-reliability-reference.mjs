import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { reliabilityReferenceCases } from '../scripts/cortex-reliability-reference-input.mjs';
import { runExperiment } from '../src/lib/cortex/experiment.js';

const root = new URL('../', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(new URL(path, root));
const fixtureBytes = read('tests/fixtures/cortex-reliability-neuron.json');
const fixture = JSON.parse(fixtureBytes);
const inputs = reliabilityReferenceCases();
const comparisonSourcePaths = [
  'tests/cortex-reliability-reference.mjs', 'scripts/cortex-reliability-reference-input.mjs',
  'src/lib/cortex/active-cable.js', 'src/lib/cortex/active-channels.js',
  'src/lib/cortex/active-morphology.js', 'src/lib/cortex/models/allen571654895.json',
  'src/lib/cortex/experiment.js', 'src/lib/cortex/response-analysis.js',
  'src/lib/cortex/volume-conductor.js', 'src/lib/cortex/config.js',
];
const comparisonSourceHashes = Object.fromEntries(comparisonSourcePaths.map(p => [p, hash(read(p))]));
const metrics = [];
const provenance = {completed: false, passed: false};
const limits = Object.freeze({voltageRmsMv: .1, voltageMaximumMv: 1, eventTimeMs: .1,
  currentRelativeRms: .01, currentFloorNa: 1e-4, signalRelativeRms: .01, signalFloorUv: 1e-4});

test('new spatial references retain native runtime, source, geometry and compiled-library provenance', () => {
  try {
  assert.equal(fixture.generator.neuronVersion, '9.0.1');
  assert.equal(fixture.generator.lfpykitVersion, '0.6.2');
  assert.equal(fixture.generator.inputSha256, hash(JSON.stringify(inputs)+'\n'));
  assert.equal(fixture.cases.length, 11);
  assert.deepEqual(fixture.cases.map(c => c.id).sort(), inputs.map(c => c.id).sort());
  assert.match(fixture.generator.compiledMechanismLibrarySha256, /^[a-f0-9]{64}$/);
  assert.ok(fixture.generator.compiledMechanismLibraryBytes > 0);
  assert.ok(fixture.generator.compiler.gcc && fixture.generator.compiler['g++']);
  for (const line of read('scripts/cortex-reference-requirements.txt').toString().split('\n')) {
    if (!line.includes('==') || line.startsWith('#')) continue;
    const [name, version] = line.split('==');
    assert.equal(fixture.generator.installedPackages[name], version);
  }
  for (const [path, expected] of Object.entries(fixture.generator.sourceHashes))
    assert.equal(hash(read(path)), expected, path);
  for (const prior of fixture.generator.orchestrationHistory ?? [])
    assert.equal(hash(prior.sourceText), prior.sourceSha256, 'Preserved prior orchestration source');
  for (const ref of fixture.cases) {
    assert.ok(ref.geometryAudit.worldPositionUm < 1e-9);
    assert.ok(ref.geometryAudit.membraneGeometryAbsolute < 1e-9);
  }
  provenance.passed = true;
  } catch (error) {
    provenance.error = error.message;
    throw error;
  } finally {
    provenance.completed = true;
  }
});

for (const ref of fixture.cases) test(`${ref.id}: independently generated boundary dynamics`, () => {
  let m = {id: ref.id, completed: false, passed: false, status: 'running'};
  try {
  const input = inputs.find(c => c.id === ref.id);
  assert.deepEqual(ref.config, input.config);
  assert.deepEqual(ref.physicalIndices, input.nodes.flatMap((n,i) => n.areaUm2 > 0 ? [i] : []));
  assert.equal(ref.completeTrace.compartments, ref.physicalIndices.length);
  const r = runExperiment(input.config), n = r.diagnostics.compartments;
  const compressed = read('tests/fixtures/'+ref.completeTrace.file);
  assert.equal(hash(compressed), ref.completeTrace.sha256);
  const packed = gunzipSync(compressed), p = ref.physicalIndices.length;
  const frames = ref.completeTrace.frames, size = frames*p;
  assert.equal(r.timeMs.length, frames);
  assert.equal(packed.byteLength, size*8);
  const voltage = new Float64Array(p), current = new Float64Array(p);
  let vsq=0, vmax=0, isq=0, ipeak=0, somaSq=0, somaMax=0;
  for (let frame=0; frame<frames; frame++) for (let j=0; j<p; j++) {
    const k=frame*p+j, i=ref.physicalIndices[j];
    voltage[j] += packed.readInt32LE(k*4);
    current[j] += packed.readInt32LE((size+k)*4);
    const v=voltage[j]*ref.completeTrace.voltageQuantumMv;
    const im=current[j]*ref.completeTrace.currentQuantumNa;
    const e=r.membraneMv[frame*n+i]-v;
    vsq+=e*e; vmax=Math.max(vmax,Math.abs(e));
    isq+=(r.membraneCurrentNa[frame*n+i]-im)**2;
    ipeak=Math.max(ipeak,Math.abs(im));
    if (i===0) {somaSq+=e*e; somaMax=Math.max(somaMax,Math.abs(e));}
  }
  m={...m, meshUm:input.config.neuron.segmentLengthUm, dtMs:input.config.solver.dtMs,
    amplitudeUa:input.config.protocol.amplitudeUa, mode:input.config.protocol.mode,
    voltageRmsMv:Math.sqrt(vsq/size), voltageMaximumMv:vmax,
    somaVoltageRmsMv:Math.sqrt(somaSq/frames), somaVoltageMaximumMv:somaMax,
    membraneCurrentRmsNa:Math.sqrt(isq/size), nativePeakCurrentNa:ipeak,
    browserSomaCrossings:r.spikes.map(s=>s.timeMs), nativeSomaCrossings:ref.spikeTimesMs,
    nativeEarliestLocalCrossing:ref.earliestLocalCrossing,
    nativeSampledSomaPeakMv:ref.sampledSomaPeakMv,
    browserAnyLocalCrossing:[...r.firstCrossingByCompartment].some(Number.isFinite),
    nativeAnyLocalCrossing:ref.firstCrossingTimesMs.some(t=>t!==null),
    thresholdWindowEndMs:15,
    browserLocalCrossingBy15Ms:[...r.firstCrossingByCompartment].some(t=>Number.isFinite(t)&&t<=15),
    nativeLocalCrossingBy15Ms:ref.firstCrossingTimesMs.some(t=>t!==null&&t<=15),
    nativeNewCrossingsAfter15Ms:ref.firstCrossingTimesMs.filter(t=>t!==null&&t>15).length,
    browserSomaWaveformEvidenceCount:r.responseAnalysis?.soma.waveformEvidenceCount??null,
    nativeMaxConservationResidualNa:ref.maxConservationResidualNa,
    browserMaxConservationResidualNa:r.diagnostics.maxConservationResidualNa,
    browserMaxKclResidualNa:r.diagnostics.maxKclResidualNa,
    maximumFirstCrossingTimeErrorMs:0,
    signals:{}};
  for (const field of ['neuralUv','appliedUv','totalUv']) {
    m.signals[field]=[];
    for (let ch=0; ch<2; ch++) {
      let sq=0, max=0, peak=0;
      for (let f=0; f<frames; f++) {
        const a=ref.signals[field][f][ch], e=r[field][ch][f]-a;
        sq+=e*e; max=Math.max(max,Math.abs(e)); peak=Math.max(peak,Math.abs(a));
      }
      m.signals[field].push({rmsUv:Math.sqrt(sq/frames), maximumUv:max, nativePeakUv:peak});
    }
  }
  m.localCrossingClassificationMismatchCount = 0;
  for (const i of ref.physicalIndices) {
    const t = ref.firstCrossingTimesMs[i], browser = r.firstCrossingByCompartment[i];
    if ((t !== null) !== Number.isFinite(browser)) m.localCrossingClassificationMismatchCount++;
    if (t !== null && Number.isFinite(browser))
      m.maximumFirstCrossingTimeErrorMs = Math.max(m.maximumFirstCrossingTimeErrorMs, Math.abs(browser-t));
  }
  m.maximumSomaCrossingTimeErrorMs = r.spikes.length === ref.spikeTimesMs.length
    ? Math.max(0, ...r.spikes.map((s,i) => Math.abs(s.timeMs-ref.spikeTimesMs[i]))) : null;
  m.gates = {
    voltageRms: m.voltageRmsMv < limits.voltageRmsMv,
    voltageMaximum: vmax < limits.voltageMaximumMv,
    membraneCurrentRms: m.membraneCurrentRmsNa < Math.max(limits.currentFloorNa,limits.currentRelativeRms*ipeak),
    globalLocalClassification20Ms: m.browserAnyLocalCrossing === m.nativeAnyLocalCrossing,
    globalLocalClassification15Ms: m.browserLocalCrossingBy15Ms === m.nativeLocalCrossingBy15Ms,
    somaCrossingCount: r.spikes.length === ref.spikeTimesMs.length,
    somaCrossingTimes: m.maximumSomaCrossingTimeErrorMs !== null && m.maximumSomaCrossingTimeErrorMs < limits.eventTimeMs,
    compartmentCrossingClassification: m.localCrossingClassificationMismatchCount === 0,
    compartmentCrossingTimes: m.maximumFirstCrossingTimeErrorMs < limits.eventTimeMs,
    recordingSignals: Object.values(m.signals).flat().every(s => s.rmsUv < Math.max(limits.signalFloorUv,limits.signalRelativeRms*s.nativePeakUv)),
    conservation: r.diagnostics.maxConservationResidualNa < 1e-8,
    localKcl: r.diagnostics.maxKclResidualNa < 1e-8,
  };
  // Every metric is complete before assertions can abort. Failed or interrupted
  // cases retain explicit status rather than publishing default-zero errors.
  m.completed = true;
  for (const [gate, passed] of Object.entries(m.gates)) assert.ok(passed, `${m.id}: ${gate}`);
  m.passed = true;
  m.status = 'passed';
  console.log(`${m.id}: RMS ${m.voltageRmsMv.toExponential(3)} mV, max ${vmax.toExponential(3)} mV; local ${m.nativeAnyLocalCrossing}, soma ${ref.spikeTimesMs.length}`);
  } catch (error) {
    m.status = m.completed ? 'failed' : 'error';
    m.error = error.message;
    throw error;
  } finally {
    metrics.push(m);
  }
});

after(()=>{
  const fixtureUnchanged = hash(fixtureBytes) === hash(read('tests/fixtures/cortex-reliability-neuron.json'));
  const comparisonSourcesUnchanged = Object.entries(comparisonSourceHashes).every(([p, expected]) => hash(read(p)) === expected);
  const completed = provenance.completed && fixtureUnchanged && comparisonSourcesUnchanged && metrics.length === inputs.length && metrics.every(m => m.completed);
  const passed = completed && provenance.passed && metrics.every(m => m.passed);
  if(process.env.CORTEX_RELIABILITY_REPORT) writeFileSync(process.env.CORTEX_RELIABILITY_REPORT,
    JSON.stringify({schemaVersion:'cortex-reliability-comparison/2',generatedAt:new Date().toISOString(),
      status: completed ? (passed ? 'passed' : 'failed') : 'incomplete', completed, passed,
      expectedCaseCount: inputs.length, completedCaseCount: metrics.filter(m => m.completed).length,
      provenance, fixtureUnchanged, nativeFixtureSha256:hash(fixtureBytes),
      comparisonSourceHashes, comparisonSourcesUnchanged, nodeVersion:process.version,
      comparisonConvention:'Identical mesh, fixed timestep, initialization, original mechanisms and point-source forcing. Full physical membrane traces; unshifted samples.',
      limits,cases:metrics},null,2)+'\n');
});
