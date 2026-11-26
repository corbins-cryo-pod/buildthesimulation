import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze,createStation,example,exportFile,targets} from '../public/equipment/01-05/analysis.mjs';
const data=p=>JSON.parse(fs.readFileSync(new URL('../public/equipment/01-05/'+p,import.meta.url)));
test('four channels assignments and ideal waveform means at reference sample 20',()=>{
 const o=analyze(example());assert.deepEqual(o.events.map(e=>e.channelId),['A','B','A','B']);assert.deepEqual(o.events.map(e=>e.offsetMs),[-4,-2,4,6]);
 assert.deepEqual(o.summary.map(c=>c.count),[2,2]);assert.deepEqual(o.summary.map(c=>c.meanWaveformUV),[[0,-15,-60,-15,0],[0,-12,-45,-12,0]]);
});
test('trigger-wheel switches by a sample, export reload recomputes despite corrupted derived data',()=>{
 const a=createStation();a.hit('Run_analysis_button');a.hit('Trigger_wheel');assert.equal(a.read().result,null);
 const out=JSON.parse(JSON.stringify(exportFile(a.dispatch('run'))));assert.equal(out.analysisRevision,2);assert.equal(out.analysis.trigger.sampleIndex,21);
 assert.deepEqual(out.analysis.events.map(x=>x.offsetSamples),[-9,-5,7,11]);out.analysis.events[0].offsetSamples=-99999;
 const b=createStation();b.dispatch('load',out);const n=exportFile(b.dispatch('run'));
 assert.deepEqual(n.analysis.events.map(e=>e.offsetMs),[-4.5,-2.5,3.5,5.5]);assert.equal(n.parentAnalysisRevision,2);
 assert.deepEqual(n.recording,example());
});
test('incompatible channels or fractional sample labels reject atomically; edge labels count without clips',()=>{
 const s=createStation();s.dispatch('run');const p=example();p.events[0].channelId='unknown';
 assert.match(s.dispatch('load',p).error,/unknown channel/);assert.equal(s.read().result.events.length,4);
 p.events[0].channelId='A';p.events[0].sampleIndex=0.5;assert.match(s.dispatch('load',p).error,/off the sample clock/);
 p.events[0].sampleIndex=0;p.startTimeS=1.5;const a=analyze(p);
 assert.equal(a.events[0].clockTimeS,1.5);assert.equal(a.summary[0].count,2);assert.equal(a.summary[0].waveformCount,1);assert.equal(a.summary[0].excludedEdgeWaveforms,1);
 p.events=[];const z=analyze(p);assert.equal(z.summary[0].count,0);assert.equal(z.summary[0].meanWaveformUV,null);
});
test('meter-scale instrument links every accessible ray target to headless actions',()=>{
 const m=data('vr-station.json'),b=fs.readFileSync(new URL('../public/equipment/01-05/analysis-console.glb',import.meta.url));
 assert.equal(b.subarray(0,4).toString(),'glTF');assert.equal(b.length,m.bytes);const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 assert.deepEqual(g.nodes.find(x=>x.name==='ConsoleTop_1100x620').scale,[1.1,.031,.62]);
 for(const h of m.hitTargets){assert.equal(targets[h.node],h.action);assert.ok(g.nodes.some(n=>n.name===h.node));assert.ok(h.boundsM.min.every((v,i)=>v<h.boundsM.max[i]));}
 assert.ok(data('verification.json').checks.every(c=>c.pass));
});
