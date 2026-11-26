import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {OPTICS, makeExample, acquire, measurePitch, measureDistance} from '../public/equipment/07-03/optics.mjs';

const url=name=>new URL(`../public/equipment/07-03/${name}.json`,import.meta.url);
const read=name=>JSON.parse(readFileSync(url(name),'utf8'));
const run=overrides=>acquire({...makeExample(),...overrides});
const ten=run({}), twenty=run({objective:20});
const verifier=read('verification');
const contrast=frame=>{
  let lo=255,hi=0;
  for(let i=1;i<frame.pixels.length;i+=4){
    lo=Math.min(lo,frame.pixels[i]);hi=Math.max(hi,frame.pixels[i]);
  }
  return hi-lo;
};
function checkGate(job) {
  try{run(job);return 'enabled';}
  catch(error){assert.match(error.message,/Fluorescence requires/);return 'rejected';}
}
const actuals={
  pitch10:ten.metadata.measurement.pitchUm,
  pitch20:twenty.metadata.measurement.pitchUm,
  ratio:twenty.metadata.measurement.pitchPx/ten.metadata.measurement.pitchPx,
  fov10:ten.metadata.fovUm.width,
  scale20:measureDistance({...makeExample(),objective:20},[10,15],[62.5,15]).distanceUm,
  'fluor-off':checkGate({variant:'Ts2',mode:'fluorescence'}),
  'fluor-on':contrast(run({mode:'fluorescence',fixture:'neurites'}))>0,
  defocus:contrast(run({objective:20,focusUm:10}))<contrast(twenty),
  'epi-absent':checkGate({epiInstalled:false,mode:'fluorescence'}),
  'clipped-marks':[run({objective:20,stageYUm:42}).metadata.measurement,run({stageYUm:65}).metadata.measurement]
};
function compare(actual,row){
  if(typeof row.tolerance==='number')assert.ok(Math.abs(actual-row.expected)<=row.tolerance,`${row.id}: ${actual} vs ${row.expected}`);
  else assert.deepEqual(actual,row.expected);
}
if(process.argv.includes('--record')){
  for(const row of verifier.tests){compare(actuals[row.id],row);row.actual=actuals[row.id];row.outcome='Pass';}
  writeFileSync(url('verification'),JSON.stringify(verifier,null,2)+'\n');
}
for(const row of verifier.tests)test(`07-03 / ${row.id}`,()=>{
  compare(actuals[row.id],row);assert.deepEqual(actuals[row.id],row.actual);assert.equal(row.outcome,'Pass');
});

test('XY pan retains calibrated pitch on the engraved region, silence outside it',()=>{
  const panned=run({stageXUm:8.9,stageYUm:1.45});
  assert.ok(Math.abs(panned.metadata.measurement.pitchUm-10)<panned.metadata.pixelSizeUm);
  assert.equal(run({stageYUm:145}).metadata.measurement,null);
});

test('blank or unmarked image contains no synthesized measurement',()=>{
  const fake={...ten,pixels:new Uint8ClampedArray(ten.pixels.length)};
  assert.equal(measurePitch(fake),null);
  const dark=run({mode:'fluorescence',fixture:'micrometer'});
  assert.equal(contrast(dark),0);assert.equal(dark.metadata.measurement,null);
});

test('calibrated raster at matching pixel pitch reproduces the interior grayscale values',()=>{
  const pixels=Uint8Array.from({length:OPTICS.width*OPTICS.height},(_,i)=>(i*13)%255);
  const r={width:OPTICS.width,height:OPTICS.height,pixelSizeUm:ten.metadata.pixelSizeUm,channel:'phase',sourceName:'known-pattern',pixels};
  const job={...makeExample(),fixture:'raster'};
  const result=acquire(job,r);
  for(const idx of [500,1000,2000,40000])assert.equal(result.pixels[4*idx],pixels[idx]);
  assert.equal(result.metadata.source.kind,'calibrated-raster-resample');
  assert.equal(result.metadata.optics.diffractionSigmaUm,null);
  assert.throws(()=>acquire({...job,mode:'fluorescence'},r),/channel/);
  assert.throws(()=>acquire(job,{...r,pixelSizeUm:0}),/calibration/);
  assert.throws(()=>acquire(job,{...r,pixels:[44,89]}),/8-bit/);
  assert.throws(()=>acquire(job),/Load a raster/);
});

test('revision and prior sample records are retained without mutating input',()=>{
  const old={deviceId:'07-02',operation:'incubator-release'};
  const job={...makeExample(),sampleId:'VIOS-A',parentRevision:7,history:[old],contactIds:['C11'],fixture:'neurites'};
  const {metadata}=acquire(job);
  assert.equal(metadata.parentRevision,7);assert.equal(metadata.revision,8);assert.equal(metadata.sampleId,'VIOS-A');
  assert.deepEqual(metadata.history[0],old);assert.equal(metadata.history[1].sampleId,'VIOS-A');
  assert.deepEqual(metadata.contactIds,['C11']);
  metadata.history[0].operation='changed';metadata.contactIds[0]='updated';
  assert.equal(job.history[0].operation,'incubator-release');assert.deepEqual(job.contactIds,['C11']);
});

test('invalid physical settings and measurement endpoints are reported',()=>{
  for(const [override,pattern] of [
    [{objective:15},/objective/],[{mode:'darkfield'},/Choose phase/],[{focusUm:13},/focus|Focus/],
    [{variant:'Ts2-R'},/stand/],[{stageYUm:NaN},/field center/],[{sampleId:''},/sample ID/],
    [{fixture:'C11'},/calibrated raster/],[{parentRevision:-1},/revision/]
  ])assert.throws(()=>run(override),pattern);
  assert.throws(()=>measureDistance(makeExample(),[-1,0],[2,2]),/pixel centers/);
});

test('published PNG and metadata pair reproduce the pixel-derived acquisition',()=>{
  const {imageFile,scaleBarBurnedIn,rulerMeasurement,...acquisition} = read('example-acquisition');
  assert.deepEqual(acquisition,ten.metadata);
  assert.equal(imageFile,'example-acquisition.png');
  assert.equal(scaleBarBurnedIn,true);
  assert.equal(rulerMeasurement,null);
  const png=readFileSync(new URL(`../public/equipment/07-03/${imageFile}`,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),acquisition.width);
  assert.equal(png.readUInt32BE(20),acquisition.height);
  assert.ok(png.includes(Buffer.from(acquisition.sampleId)));
});
