import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadFieldPackage, STATUS, units, transformMicrometersToField} from '../js/field-sampler.js';

async function fixture() {
  const a=25e-6,r=[0,a,2*a,20*a],z=[0,a,2*a,20*a], nr=r.length,nz=z.length;
  const bytes=new Uint8Array(8*(nr+nz)+4*nr*nz),dv=new DataView(bytes.buffer);
  r.forEach((x,i)=>dv.setFloat64(i*8,x,true));z.forEach((x,i)=>dv.setFloat64((nr+i)*8,x,true));
  z.forEach((h,j)=>r.forEach((rho,i)=>dv.setFloat32(8*(nr+nz)+4*(j*nr+i),5+2e4*rho+3e4*h,true)));
  const sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  return {bytes,manifest:{schemaVersion:'finite-contact-field/1.0',geometry:{type:'axisymmetric_disk_in_insulating_plane',radiusMeters:a,tissueSide:'z>0',thicknessMeters:0,contactAreaSquareMeters:Math.PI*a*a},conductivitySiemensPerMeter:.3,coordinateFrame:{axis:'z',units:'m',handedness:'right',originMeters:[0,0,0]},domain:{shape:'finite axisymmetric cylinder',outerBoundary:'r=R or z=H grounded at 0 V',radialExtentMeters:20*a,axialExtentMeters:20*a},validity:{tissueRequiresPositiveZ:true,maxRadiusMeters:10*a,maxHeightMeters:10*a,minRimDistanceMeters:.02*a},bases:[{id:'disk_to_outer_ground',units:'V/A',normalizationCurrentAmps:1,contactCurrentsAmps:{disk:1},return:{totalCurrentAmps:-1,type:'artificial_grounded_outer_cylinder',boundary:'r=R or z=H',isFiniteReturnElectrode:false},voltageReference:'outer cylinder is 0 V',inactiveContacts:'none; single exposed conducting disk',compatibleBasisSet:'single-disk-one-outer-ground'}],data:{basisCount:1,potentialUnits:'V/A',axisUnits:'m',radialAxisByteOffset:0,axialAxisByteOffset:nr*8,potentialByteOffset:(nr+nz)*8,file:'field.bin',sha256,byteLength:bytes.length,radialCount:nr,axialCount:nz,layout:'r-f64le,z-f64le,potential-f32le-z-major',triangulation:'SW-NE'}}};
}
const close=(x,y,atol=1e-10)=>assert.ok(Math.abs(x-y)<=atol,`${x} versus ${y}`);
test('both triangle orientations, axisymmetry, current signs and cache',async()=>{
  const {manifest,bytes}=await fixture(),f=await loadFieldPackage(manifest,bytes),a=manifest.geometry.radiusMeters;
  const points=new Float64Array([.2*a,0,.7*a,.8*a,0,.3*a,0,-.2*a,.7*a,0,0,2*a]);
  const u=f.sampleUnitPotential(points);
  for(let i=0;i<4;i++){assert.equal(u.status[i],STATUS.OK);close(u.values[i],5+2e4*Math.hypot(points[3*i],points[3*i+1])+3e4*points[3*i+2]);}
  close(u.values[0],u.values[2]);
  for(const current of [0,1e-6,-1e-6,2e-6]){
    const expected=f.samplePotential(points,new Float64Array([current])),cached=f.combineCached(f.cacheUnitPotentials(points),new Float64Array([current]));
    assert.deepEqual(expected,cached);expected.values.forEach((v,i)=>close(v,u.values[i]*current));
  }
  assert.throws(()=>f.sampleUnitPotential(points,'invented'),/Unknown basis/);
  assert.throws(()=>f.samplePotential(points,new Float64Array([NaN])),/finite/);
  assert.throws(()=>f.combineCached({...f.cacheUnitPotentials(points),packageSha256:'wrong'},new Float64Array([1])),/does not match/);
});
test('triangle split is P1 SW-NE and is not bilinear interpolation',async()=>{
  const {manifest,bytes}=await fixture(),dv=new DataView(bytes.buffer),nr=manifest.data.radialCount,offset=manifest.data.potentialByteOffset;
  for(const [k,value] of [[0,0],[1,2],[nr,4],[nr+1,10]])dv.setFloat32(offset+k*4,value,true);
  manifest.data.sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const field=await loadFieldPackage(manifest,bytes),a=manifest.geometry.radiusMeters;
  const sample=field.sampleUnitPotential(new Float64Array([.8*a,0,.3*a,.2*a,0,.8*a]));
  close(sample.values[0],4);close(sample.values[1],4.4);
});
test('all boundary statuses and invalid samples remain NaN, including at zero current',async()=>{
  const {manifest,bytes}=await fixture(),f=await loadFieldPackage(manifest,bytes),a=manifest.geometry.radiusMeters;
  const p=new Float64Array([0,0,a, NaN,0,a, 0,0,0, 2*a,0,0, 0,0,-a, 20*a,0,a, 0,0,11*a, a,0,.001*a, 10*a,0,10*a]);
  const expected=[STATUS.OK,STATUS.NONFINITE,STATUS.ELECTRODE_SURFACE,STATUS.INSULATION,STATUS.INSULATION,STATUS.OUTSIDE_DOMAIN,STATUS.OUTSIDE_VALIDATED_REGION,STATUS.NEAR_RIM,STATUS.OK];
  const c=f.classifyPoints(p);assert.deepEqual([...c.status],expected);
  const s=f.samplePotential(p,new Float64Array([0]));for(let i=0;i<expected.length;i++)assert.ok(expected[i]===STATUS.OK?s.values[i]===0:Number.isNaN(s.values[i]));
  close(c.contactDistanceMeters[0],a);close(c.contactDistanceMeters[3],a);assert.ok(Number.isNaN(c.contactDistanceMeters[1]));
  assert.throws(()=>f.sampleUnitPotential([0,0,a]),/packed xyz/);
  assert.throws(()=>f.sampleUnitPotential(new Float64Array(2)),/packed xyz/);
  assert.equal(f.sampleUnitPotential(new Float64Array()).values.length,0);
});
test('checksum, schema, physical metadata, axes, truncation and protected ownership',async()=>{
  const {manifest,bytes}=await fixture();
  await assert.rejects(loadFieldPackage({...manifest,schemaVersion:'future'},bytes),/schemaVersion/);
  await assert.rejects(loadFieldPackage({...manifest,conductivitySiemensPerMeter:0},bytes),/conductivity/);
  await assert.rejects(loadFieldPackage({...manifest,bases:[{id:'disk_to_outer_ground'},{id:'other'}]},bytes),/single complete/);
  await assert.rejects(loadFieldPackage({...manifest,data:{...manifest.data,triangulation:'bilinear'}},bytes),/triangulation/);
  for(const changes of [{axisUnits:'um'},{potentialUnits:'mV/uA'},{basisCount:2},{potentialByteOffset:0}]) await assert.rejects(loadFieldPackage({...manifest,data:{...manifest.data,...changes}},bytes),/units|count|offsets/);
  await assert.rejects(loadFieldPackage({...manifest,geometry:{...manifest.geometry,thicknessMeters:1e-6}},bytes),/geometry/);
  await assert.rejects(loadFieldPackage({...manifest,validity:{...manifest.validity,tissueRequiresPositiveZ:false}},bytes),/validated region/);
  await assert.rejects(loadFieldPackage({...manifest,bases:[{...manifest.bases[0],normalizationCurrentAmps:1e-6}]},bytes),/normalized/);
  await assert.rejects(loadFieldPackage({...manifest,bases:[{...manifest.bases[0],return:{...manifest.bases[0].return,totalCurrentAmps:0}}]},bytes),/current balance/);
  await assert.rejects(loadFieldPackage({...manifest,bases:[{...manifest.bases[0],voltageReference:'infinity'}]},bytes),/gauge/);
  await assert.rejects(loadFieldPackage(manifest,bytes.slice(1)),/length mismatch/);
  const corrupt=bytes.slice();corrupt[corrupt.length-5]^=1;await assert.rejects(loadFieldPackage(manifest,corrupt),/SHA-256/);
  const wrongAxis=bytes.slice();new DataView(wrongAxis.buffer).setFloat64(8,-1,true);
  const sha256=Buffer.from(await crypto.subtle.digest('SHA-256',wrongAxis)).toString('hex');
  await assert.rejects(loadFieldPackage({...manifest,data:{...manifest.data,sha256}},wrongAxis),/strictly increasing/);
  const f=await loadFieldPackage(manifest,bytes),p=new Float64Array([0,0,25e-6]),before=f.sampleUnitPotential(p).values[0];
  bytes.fill(0);manifest.validity.maxHeightMeters=0;f.manifest.validity.maxHeightMeters=0;close(f.sampleUnitPotential(p).values[0],before);
});
test('SI conversions and rigid transforms preserve meaning',()=>{
  close(units.micrometersToMeters(25),25e-6);close(units.microampsToAmps(2),2e-6);close(units.millisecondsToSeconds(.1),1e-4);close(units.voltsToMillivolts(.002),2);
  const local=transformMicrometersToField(new Float64Array([110,200,300]),new Float64Array([100e-6,200e-6,300e-6]),new Float64Array([0,1,0,-1,0,0,0,0,1]));
  close(local[0],0);close(local[1],-10e-6);close(local[2],0);
  assert.throws(()=>transformMicrometersToField(new Float64Array([1,2,3]),[0,0,0],[2,0,0,0,1,0,0,0,1]),/orthonormal/);
});
test('generated package is loadable, finite in supported tissue, and preserves polarity',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../artifacts/disk-v1/field.json',import.meta.url),'utf8'));
  const bytes=await readFile(new URL(`../artifacts/disk-v1/${manifest.data.file}`,import.meta.url));
  const f=await loadFieldPackage(manifest,bytes),p=new Float64Array([0,0,25e-6,25e-6,0,1e-6,100e-6,0,100e-6]);
  const pos=f.samplePotential(p,new Float64Array([1e-6])),neg=f.samplePotential(p,new Float64Array([-1e-6]));
  pos.values.forEach((v,i)=>{assert.ok(v>0 && Number.isFinite(v));assert.equal(pos.status[i],STATUS.OK);assert.equal(neg.values[i],-v);});
});
