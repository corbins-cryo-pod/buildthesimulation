import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePerceptReference, loadPerceptReference, parsePerceptReference, predictPercept, visualToRetinal, retinalToVisual, biphasicFactors, referenceDigest } from '../src/lib/retinal-implant/percept.mjs';

const root = new URL('../public/assets/retinal-implant/', import.meta.url);
const fixtures = new URL('./fixtures/retinal-percept/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('axon-reference.json', root)));
const cases = JSON.parse(readFileSync(new URL('manifest.json', fixtures)));
const parts = manifest.storage.chunks.map(p => readFileSync(new URL(p.file, root)));
const reference = await decodePerceptReference(manifest, Buffer.concat(parts));
const close = (a,b,t=1e-10) => assert(Math.abs(a-b)<=t, `${a} != ${b}`);
const single = [{id:'S',xUm:800,yUm:700,amplitudeUa:100,thresholdUa:50}];

for (const c of cases.cases) test(`retinal percept native golden: ${c.name}`, () => {
  const bytes=readFileSync(new URL(c.file,fixtures));assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);
  const expected=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4),actual=predictPercept(reference,c.config);
  assert.equal(actual.width,c.width);assert.equal(actual.height,c.height);assert.equal(actual.brightness.length,expected.length);
  let max=0,sum=0;for(let i=0;i<expected.length;i++){assert(Number.isFinite(actual.brightness[i]));const d=Math.abs(actual.brightness[i]-expected[i]);max=Math.max(max,d);sum+=d*d;}
  if(!c.peak)assert.equal(max,0);else{assert(max/c.peak<5e-6,`Peak normalized max ${max/c.peak}`);assert(Math.sqrt(sum/expected.length)/c.peak<5e-7,`Peak normalized RMS ${Math.sqrt(sum/expected.length)/c.peak}`);}
});

test('retinal coordinates preserve the native signs and separately fitted equations',()=>{
  for(const row of cases.coordinates){const r=visualToRetinal(...row.visual),v=retinalToVisual(...row.retinal);close(r.xUm,row.retinal[0],1e-8);close(r.yUm,row.retinal[1],1e-8);close(v.xDeg,row.reverseVisual[0],1e-10);close(v.yDeg,row.reverseVisual[1],1e-10);}
  const r=visualToRetinal(3,4),v=retinalToVisual(r.xUm,r.yUm);assert(r.xUm>0&&r.yUm<0);assert(Math.abs(v.xDeg-3)>.01);
});
test('reference compression is lossless and each bounded chunk is independently checksummed',()=>{
  assert.equal(createHash('sha256').update(new Uint8Array(reference.buffer)).digest('hex'),manifest.dataSha256);
  for(let i=0;i<parts.length;i++){assert(parts[i].length<=65536);assert.equal(parts[i].length,manifest.storage.chunks[i].bytes);assert.equal(createHash('sha256').update(parts[i]).digest('hex'),manifest.storage.chunks[i].sha256);}
  assert.equal(reference.eyes.RE.bundleCount,638);assert.equal(reference.eyes.LE.segmentCount,123122);
});
test('public loader resolves only the manifest and declared local chunks',async()=>{
  const paths=[];const fetcher=async path=>{paths.push(path);const name=path.split('/').at(-1);const b=readFileSync(new URL(name,root));return new Response(b,{status:200});};
  const r=await loadPerceptReference('/test-assets',fetcher);assert.equal(r.manifest.dataSha256,manifest.dataSha256);assert.equal(paths.length,parts.length+1);assert(paths.every(p=>p.startsWith('/test-assets/')));
});
test('corrupt or incompatible reference data fails instead of displaying substituted anatomy',async()=>{
  const broken=Buffer.from(parts[0]);broken[10]^=1;
  await assert.rejects(()=>loadPerceptReference('/test',async path=>new Response(path.endsWith('.json')?JSON.stringify(manifest):path.endsWith('000.bin')?broken:readFileSync(new URL(path.split('/').at(-1),root)))),/checksum/);
  assert.throws(()=>parsePerceptReference({...manifest,referenceVersion:'other'},reference.buffer),/version/);
  assert.throws(()=>parsePerceptReference(manifest,new ArrayBuffer(8)),/size/);
});
test('zero input has exact zero output and undefined centroids',()=>{
  const p=predictPercept(reference,{electrodes:[]});assert(p.brightness.every(x=>x===0));assert.equal(p.metrics.intensityCentroidDeg,null);assert.equal(p.metrics.supportCentroidDeg,null);assert.equal(p.metrics.supportAreaDeg2,0);assert.equal(p.metadata.sampling.warning,null);
});
test('multiple contacts sum along the path before selecting a maximum',()=>{
  const electrodes=[{id:'A',xUm:-600,yUm:600,amplitudeUa:100,thresholdUa:50},{id:'B',xUm:200,yUm:900,amplitudeUa:90,thresholdUa:50}];
  const both=predictPercept(reference,{electrodes,lambdaUm:1500}),a=predictPercept(reference,{electrodes:[electrodes[0]],lambdaUm:1500}),b=predictPercept(reference,{electrodes:[electrodes[1]],lambdaUm:1500});
  let maxDifference=0;for(let i=0;i<both.brightness.length;i++)maxDifference=Math.max(maxDifference,a.brightness[i]+b.brightness[i]-both.brightness[i]);assert(maxDifference>1,'Sum of independently maximized phosphenes would be a different model.');
});
test('electrical gap, contact diameter, and conductivity do not silently change fitted percept spreads',()=>{
  const a=predictPercept(reference,{electrodes:single});const b=predictPercept(reference,{electrodes:single.map(e=>({...e,zUm:900,radiusUm:250})),gapUm:900,conductivitySm:.05,diameterUm:500});assert.deepEqual(a.brightness,b.brightness);
});
test('left-eye native geometry approximately mirrors right-eye percepts without changing y convention',()=>{
  const r=predictPercept(reference,{electrodes:single}),l=predictPercept(reference,{electrodes:single.map(e=>({...e,xUm:-e.xUm})),eye:'LE'});let max=0;for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)max=Math.max(max,Math.abs(r.brightness[y*r.width+x]-l.brightness[y*r.width+r.width-1-x]));assert(max/r.metrics.peakBrightness<5e-6);assert.equal(r.yDeg[0],15);assert.equal(r.xDeg[0],-15);
});
test('pulse coefficients reproduce the pinned Argus-II refit and retain amplitude-independent streak factor',()=>{
  const a=biphasicFactors(2,.45,20,300,700),b=biphasicFactors(3,.45,20,300,700);close(a.brightness,.1492147*2*(.054326+2.095*.45)+.0163851*20);close(a.streak,b.streak);assert(b.size>a.size);assert(b.brightness>a.brightness);
});
test('the fine and coarse grids share native sample positions',()=>{
  const c=predictPercept(reference,{electrodes:single}),f=predictPercept(reference,{electrodes:single,gridStepDeg:.25});for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)close(c.brightness[y*c.width+x],f.brightness[2*y*f.width+2*x],1e-8);
});
test('percept boundary tails and undersampled narrow spreads are disclosed',()=>{
  const edge=cases.cases.find(c=>c.name==='axon-edge-clipped');assert(predictPercept(reference,edge.config).metrics.appreciableTailAtBoundary);
  const narrow=predictPercept(reference,{model:'biphasic',electrodes:[{...single[0],amplitudeUa:1}]});assert(narrow.metadata.sampling.spreadBelowCentralGridInterval);assert.match(narrow.metadata.sampling.warning,/grid/);
});
test('invalid physical values and unsupported reference grids reject clearly',()=>{
  for(const patch of [{rhoUm:0},{lambdaUm:1},{frequencyHz:-1},{gridStepDeg:1},{eye:'both'},{model:'membrane'},{electrodes:[{...single[0],xUm:NaN}]},{electrodes:[{...single[0],amplitudeUa:-1}]},{model:'biphasic',electrodes:[{...single[0],thresholdUa:0}]}])assert.throws(()=>predictPercept(reference,{electrodes:single,...patch}));
});
test('SHA-256 fallback agrees with independent digest for known and complete-reference data',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});
  try {assert.equal(await referenceDigest(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');assert.equal(await referenceDigest(reference.buffer),manifest.dataSha256);}finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});
