import test from 'node:test';
import assert from 'node:assert/strict';
import {runSimulation} from '../src/lib/biohybrid/model.js';
import {summarizeRun} from '../src/lib/biohybrid/protocols.js';

test('biohybrid boundary: the sampled -12/-18 µA response endpoints retain host counts at half dt',()=>{
  // Frozen endpoint criterion, not a fitted or universal stimulation threshold.
  // Retain the full default population, 40 ms duration and two-pulse waveform.
  const points=[{stimAmplitudeUa:-12,expectedRecruitedHosts:0},{stimAmplitudeUa:-18,expectedRecruitedHosts:3}];
  for(const {stimAmplitudeUa,expectedRecruitedHosts} of points){
    const coarse=summarizeRun(runSimulation({stimAmplitudeUa,dtMs:.005}));
    const fine=summarizeRun(runSimulation({stimAmplitudeUa,dtMs:.0025}));
    assert.deepEqual({...fine.settings,dtMs:coarse.settings.dtMs},coarse.settings);
    assert.equal(coarse.settings.durationMs,40);
    assert.equal(coarse.settings.pulseCount,2);
    assert.equal(fine.diagnostics.frames,coarse.diagnostics.frames);
    assert.equal(fine.diagnostics.steps,2*coarse.diagnostics.steps);
    assert.equal(coarse.metrics.recruitedHosts,expectedRecruitedHosts,`${stimAmplitudeUa} µA, production dt`);
    assert.equal(fine.metrics.recruitedHosts,expectedRecruitedHosts,`${stimAmplitudeUa} µA, half dt`);
    assert.deepEqual(fine.hosts.map(host=>[host.id,host.somaSpikes]),coarse.hosts.map(host=>[host.id,host.somaSpikes]));
    for(const host of [...coarse.hosts,...fine.hosts]){
      assert.equal(host.somaSpikes,host.spikeTimesMs.length);
      assert.equal(host.firstSpikeMs,host.spikeTimesMs[0]??null);
      assert.ok(host.spikeTimesMs.every(time=>Number.isFinite(time)&&time>=0&&time<=coarse.settings.durationMs));
    }
  }
});
