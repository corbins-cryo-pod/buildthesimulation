import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {recordingDatasets,recordingsForDevice} from '../src/data/recordings.js';
import {validateRecording,statistics,envelope,sampleBounds,csvForChannel} from '../src/lib/recordings/signal.js';
import {validateSummary} from '../src/lib/recordings/summary.js';
const load=id=>JSON.parse(readFileSync(new URL(`../public/data/recordings/${id}.json`,import.meta.url)));
const fixture=()=>({schema:'bts-recording-v1',id:'test',title:'Test',sourceUrl:'https://example.org',segments:[{id:'a',sampleRateHz:1000,unit:'µV',channels:[{id:'one',label:'one',samples:[3,4,null,-3]}],events:[]}]});

test('all released excerpts validate; device associations resolve to the exact catalog identifier',()=>{
  const ids=new Set();
  for(const e of recordingDatasets){
    assert.ok(!ids.has(e.id));ids.add(e.id);const d=load(e.id);assert.equal(d.id,e.id);
    (e.kind==='summary'?validateSummary:validateRecording)(d);
    assert.equal(d.webExport.numericSamplesModified,false);
    for(const device of e.devices){const path=new URL(`../src/content/designs/${device.slug}.md`,import.meta.url);assert.ok(existsSync(path));assert.ok(readFileSync(path,'utf8').includes(`device_id: "${device.id}"`));assert.ok(['recorded','related'].includes(device.relationship));}
  }
});
test('invalid calibration and data shape fail visibly rather than drawing fabricated signals',()=>{
  for(const rate of [0,-1,NaN,Infinity]){const d=fixture();d.segments[0].sampleRateHz=rate;assert.throws(()=>validateRecording(d));}
  const d=fixture();d.segments[0].channels[0].samples[1]=NaN;assert.throws(()=>validateRecording(d),/samples/);
  const e=fixture();e.segments[0].channels.push({...e.segments[0].channels[0],id:'two',samples:[1,2]});assert.throws(()=>validateRecording(e),/samples/);
  const f=fixture();f.segments[0].events=[{timeSeconds:10,label:'impossible'}];assert.throws(()=>validateRecording(f),/Event/);
});
test('sample windows retain edge samples and do not read past the recording',()=>{
  assert.deepEqual(sampleBounds(1000,1000,1,.1),[900,1000]);
  assert.deepEqual(sampleBounds(1000,1000,-10,2),[0,1000]);
  assert.deepEqual(sampleBounds(1000,1000,.017,.1),[17,117]);
});
test('wide-view envelope retains single-sample artifacts, spike extrema and source gaps',()=>{
  const a=Array(1000).fill(0);a[438]=-230;a[439]=91;
  const b=envelope(a,0,1000,10);assert.equal(Math.min(...b.map(x=>x.min)),-230);assert.equal(Math.max(...b.map(x=>x.max)),91);
  assert.equal(b.reduce((n,e)=>n+e.end-e.start,0),1000);
  assert.deepEqual(envelope([null,null],0,2,1),[{start:0,end:2,min:null,max:null}]);
});
test('numeric readouts include original baseline; missing samples are excluded explicitly',()=>{
  const s=statistics([3,4,null,-3]);assert.equal(s.count,3);assert.equal(s.sum,4);assert.equal(s.peakToPeak,7);assert.equal(s.rms,Math.sqrt(34/3));assert.equal(s.mean,4/3);
  assert.equal(statistics([null,null]).rms,null);
});
test('CSV exports exact source amplitudes and timing, leaving missing samples blank',()=>{
  const d=fixture(),s=d.segments[0];const csv=csvForChannel(d,s,s.channels[0]);assert.ok(csv.includes('0.00100000000000,4'));assert.ok(csv.includes('0.00200000000000,'));assert.ok(csv.includes('0.00300000000000,-3'));
});
test('retinal counts agree independently with every retained exact spike timestamp',()=>{
  const d=load('retinal-cmos-mea');
  for(const s of d.segments){assert.equal(s.signalKind,'spike-counts');assert.equal(s.sampleRateHz,100);
    for(const c of s.channels){const bins=Array(2000).fill(0);for(const t of c.spikeTimesMicroseconds){assert.equal(t%50,0);assert.ok(t>=0&&t<20000000);bins[Math.floor(t/10000)]++;}assert.deepEqual(c.samples,bins);}
  }
});
test('BrainGate source-summary rows preserve yield denominator, missingness and study totals',()=>{
  const d=validateSummary(load('braingate-longterm')),sessions=new Set();let rows=0,missing=0;
  assert.equal(d.series.length,20);assert.equal(new Set(d.series.map(s=>s.participant)).size,14);
  for(const s of d.series)for(const p of s.points){rows++;sessions.add(`${s.participant}:${p.day}`);assert.ok(Math.abs(p.percentYield-p.nSpikingElectrodes/96*100)<1e-9);if(p.medianImpedanceKohm===null)missing++;}
  assert.equal(rows,3757);assert.equal(sessions.size,2289);assert.ok(missing>0);
});
test('Neuropixels acquisition clock and calibration retained without synthetic behavior events',()=>{
  const d=load('ibl-neuropixels-voltage');assert.equal(d.segments[0].sampleRateHz,29999.943575);
  for(const s of d.segments){assert.equal(s.events.length,0);assert.equal(s.channels.length,8);for(const c of s.channels){assert.ok(c.position);for(const sample of c.samples)assert.ok(Math.abs(sample/c.microvoltsPerAdcCount-Math.round(sample/c.microvoltsPerAdcCount))<1e-9);}}
});
test('uncertain amplitude units and absent physical coordinates remain explicit',()=>{
  for(const id of ['mirpni','sparc-cuff','wimagine-reaching'])for(const s of load(id).segments)for(const c of s.channels){assert.equal(c.unit,'source units');assert.equal(c.position,undefined);}
  const w=load('wimagine-reaching');assert.ok(w.segments[0].sampleRateHz>585&&w.segments[0].sampleRateHz<586);
});
test('retina and cuff references are explicitly related; no recordings are assigned to unmatched proprietary devices',()=>{
  assert.ok(recordingsForDevice('BTSD-STUP-0004').every(e=>e.devices.find(d=>d.id==='BTSD-STUP-0004').relationship==='related'));
  assert.ok(recordingsForDevice('BTSD-PNI-0001').every(e=>e.devices.find(d=>d.id==='BTSD-PNI-0001').relationship==='related'));
  assert.equal(recordingsForDevice('not-in-catalog').length,0);
});
