import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANATOMY_REFERENCE, createAnatomyScene, sampleAnatomyCenterline } from '../src/lib/cochlear/anatomy.js';
import { createGeometry } from '../src/lib/cochlear/geometry.js';
import { createNerveModel } from '../src/lib/cochlear/nerve.js';
import { normalizeSettings } from '../src/lib/cochlear/config.js';

const atlas=JSON.parse(readFileSync(new URL('../public/assets/cochlear/openear-zeta-atlas.json',import.meta.url),'utf8'));
const validation=JSON.parse(readFileSync(new URL('../docs/cochlear/anatomy-validation.json',import.meta.url),'utf8'));
const model=createNerveModel(),geometry=createGeometry(normalizeSettings());
const near=(a,b,tolerance=1e-8)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,`${a} differs from ${b} by more than ${tolerance}`);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const transform=(p,m)=>[0,1,2].map(i=>m[4*i]*p[0]+m[4*i+1]*p[1]+m[4*i+2]*p[2]+m[4*i+3]);
const descriptors=s=>[...s.meshes,...s.paths,...s.markers];
function validMesh(mesh){assert.equal(mesh.positions.length%3,0);assert.equal(mesh.indices.length%3,0);assert.ok(mesh.positions.every(Number.isFinite),mesh.id);assert.ok(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.positions.length/3),mesh.id);}
function components(mesh){
  const parent=Array.from({length:mesh.positions.length/3},(_,i)=>i),used=new Set(mesh.indices);
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<mesh.indices.length;i+=3){const a=root(mesh.indices[i]);parent[root(mesh.indices[i+1])]=a;parent[root(mesh.indices[i+2])]=a;}
  const groups=new Map();for(const i of used){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(mesh.positions.slice(i*3,i*3+3));}
  return [...groups.values()].map(points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))}));
}
const prepared=new Map();
const scene=mode=>{if(!prepared.has(mode))prepared.set(mode,createAnatomyScene(geometry,model,{mode,atlas,selectedFiber:13,implantProfile:'cochlear-ci622'}));return prepared.get(mode);};

test('cochlear anatomy: measured source provenance and compact native meshes remain inspectable',()=>{
  assert.equal(atlas.schema,'cochlear-anatomy-atlas-v1');assert.equal(atlas.units,'mm');assert.equal(atlas.coordinateFrame,'native');
  assert.equal(atlas.source.license,'CC BY 4.0');assert.equal(atlas.source.datasetDoi,'10.5281/zenodo.1473724');assert.equal(atlas.source.archiveMd5Verified,false);
  assert.equal(atlas.meshes.length,3);assert.equal(atlas.meshes.reduce((sum,m)=>sum+m.indices.length/3,0),22500);
  for(const m of atlas.meshes){validMesh(m);assert.match(m.sourceMemberSha256,/^[a-f0-9]{64}$/);assert.ok(m.originalTriangleCount>m.indices.length/3);assert.equal(m.sourceBoundsMm.length,2);}
});

test('cochlear anatomy: display transform is rigid, right-handed, and shared with the centreline',()=>{
  const m=atlas.nativeToDisplayRowMajor,r=ANATOMY_REFERENCE;
  assert.deepEqual(m,r.nativeToDisplayRowMajor);assert.deepEqual(m.slice(12),[0,0,0,1]);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)near(m[4*i]*m[4*j]+m[4*i+1]*m[4*j+1]+m[4*i+2]*m[4*j+2],i===j?1:0,2e-9);
  const det=m[0]*(m[5]*m[10]-m[6]*m[9])-m[1]*(m[4]*m[10]-m[6]*m[8])+m[2]*(m[4]*m[9]-m[5]*m[8]);near(det,1,2e-9);
  for(let i=0;i<r.centerline.nativePoints.length;i++){near(distance(transform(r.centerline.nativePoints[i],m),r.centerline.displayPoints[i]),0,2e-5);}
  for(const mesh of atlas.meshes){const a=mesh.positions.slice(0,3),b=mesh.positions.slice(-3);near(distance(a,b),distance(transform(a,m),transform(b,m)),1e-7);}
});

test('cochlear anatomy: source-derived medial curve and conservative clearances have independent geometric evidence',()=>{
  const c=ANATOMY_REFERENCE.centerline;
  assert.equal(c.displayPoints.length,181);assert.ok(c.lengthMm>22&&c.lengthMm<23);assert.ok(c.lengthMm<35);
  for(let i=0;i<c.arcMm.length;i++){if(i)assert.ok(c.arcMm[i]>c.arcMm[i-1]);assert.ok(c.clearanceMm[i]>0);assert.ok(c.conservativeClearanceMm[i]>0&&c.conservativeClearanceMm[i]<c.clearanceMm[i]);}
  const first=sampleAnatomyCenterline(0),last=sampleAnatomyCenterline(c.lengthMm);near(distance(first.point,c.displayPoints[0]),0);near(distance(last.point,c.displayPoints.at(-1)),0);
  assert.equal(validation.centerline.allInsideOriginalST,true);assert.equal(validation.centerline.testedPolylineSamples,1981);assert.ok(validation.centerline.minimumDistanceToOriginalSTSurfaceMm>.19);
  for(const m of validation.meshes){assert.equal(m.originalWatertight,true);assert.equal(m.displayWatertight,true);assert.ok(Math.abs(m.relativeVolumeChangePercent)<.2);assert.ok(m.originalToDisplayDistance.maximumSampledMm<.03);}
});

test('cochlear anatomy: scene preparation preserves all electrical coordinates and cable data',()=>{
  const before=JSON.stringify(geometry),positions=Array.from(model.positionsMm),types=[...model.type];
  for(const mode of ['whole','cutaway','organ','array']){const s=scene(mode);assert.ok(s.meshes.length);for(const m of s.meshes)validMesh(m);assert.ok(s.bounds.min.every((x,i)=>Number.isFinite(x)&&x<s.bounds.max[i]));}
  assert.equal(JSON.stringify(geometry),before);assert.deepEqual(Array.from(model.positionsMm),positions);assert.deepEqual(model.type,types);
});

test('cochlear anatomy: generic source disk radius and normalized place mapping remain explicit display quantities',()=>{
  const s=scene('whole');const contacts=s.meshes.filter(m=>m.role==='reference-contact');assert.equal(contacts.length,geometry.contacts.length);
  for(const m of contacts){const source=geometry.contacts[m.contactIndex],center=m.positions.slice(0,3);for(let i=3;i<m.positions.length;i+=3)near(distance(center,m.positions.slice(i,i+3)),source.radiusMm,1e-9);}
  const moved=createGeometry(normalizeSettings({radialDistanceMm:1.25}));const other=createAnatomyScene(moved,model,{mode:'whole',atlas});
  assert.notEqual(moved.contacts[0].positionMm[2],geometry.contacts[0].positionMm[2]);
  assert.deepEqual(other.meshes.find(m=>m.role==='reference-contact').positions,contacts[0].positions,'Electrical radial distance must not pretend to register an unmeasured3D electrode–neuron separation.');
  assert.match(s.notes.join(' '),/normalized arc length/);assert.match(s.notes.join(' '),/unrolled homogeneous conductor/);
});

test('cochlear anatomy: representative type I routes include selection and actual published compartment indices',()=>{
  const s=scene('cutaway'),routes=s.paths.filter(p=>p.role==='model-type-I');
  assert.ok(routes.length<=8);assert.ok(routes.some(p=>p.fiberIndex===13));
  for(const p of routes){assert.equal(p.points.length,65);assert.deepEqual(p.compartmentIndices,Array.from({length:65},(_,i)=>i));}
  const sheaths=s.paths.filter(p=>p.role==='model-myelin');assert.ok(sheaths.length);
  for(const p of sheaths)for(const index of p.compartmentIndices){assert.ok(model.type[index].endsWith('internode'));assert.ok(index<15||index>24);}
  for(const m of s.markers.filter(m=>m.role==='model-soma'))assert.equal(m.compartmentIndex,model.somaIndex);
});

test('cochlear anatomy: reconstructed cells form one inner and three outer rows in the actual mesh topology',()=>{
  const s=scene('organ'),inner=components(s.meshes.find(m=>m.role==='inner-hair-cell')),outer=components(s.meshes.find(m=>m.role==='outer-hair-cell'));
  assert.equal(inner.length,10);assert.equal(outer.length,30);
  const rows=new Map();for(const cell of outer){const center=(cell.min[0]+cell.max[0])/2,key=Math.round(center*1000);rows.set(key,(rows.get(key)||0)+1);}
  assert.equal(rows.size,3);assert.deepEqual([...rows.values()],[10,10,10]);
  const innerZ=inner.map(c=>(c.min[2]+c.max[2])/2).sort((a,b)=>a-b);for(let i=1;i<innerZ.length;i++)near(innerZ[i]-innerZ[i-1],.016,1e-8);
});

test('cochlear anatomy: sampled stereocilia are solid cylinders with three distinct height ranks per hair cell class',()=>{
  const bundles=components(scene('organ').meshes.find(m=>m.role==='stereocilia'));assert.equal(bundles.length,40*27);
  const inner=bundles.filter(b=>b.max[0]<0),outer=bundles.filter(b=>b.min[0]>0);assert.equal(inner.length,10*27);assert.equal(outer.length,30*27);
  for(const items of [inner,outer])assert.equal(new Set(items.map(b=>Math.round((b.max[1]-b.min[1])*1e7))).size,3);
  assert.ok(bundles.every(b=>b.max[0]>b.min[0]&&b.max[2]>b.min[2]));
});

test('cochlear anatomy: basal, reticular and tectorial surfaces are distinct and cells/type II have no replay associations',()=>{
  const s=scene('organ'),bm=s.meshes.find(m=>m.role==='basilar-membrane'),rl=s.meshes.find(m=>m.role==='reticular-lamina'),tm=s.meshes.find(m=>m.role==='tectorial-membrane');
  const ys=m=>m.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys(bm))<Math.min(...ys(rl)));assert.ok(Math.max(...ys(rl))<Math.min(...ys(tm)));
  for(const d of descriptors(s).filter(d=>d.role!=='model-terminal')){assert.equal(d.fiberIndex,undefined);assert.equal(d.compartmentIndices,undefined);}
  const modeled=s.paths.filter(p=>p.role==='model-terminal');assert.equal(modeled.length,1);assert.equal(modeled[0].fiberIndex,13);assert.ok(modeled[0].compartmentIndices.every(i=>i===0));
  assert.ok(s.paths.filter(p=>p.role==='anatomical-type-II').length>=3);assert.match(s.provenanceLabel,/Procedural/);
});

test('cochlear anatomy: device inspection retains placement metadata and cannot acquire generic solver identities',()=>{
  for(const pose of ['bench','inserted']){const s=createAnatomyScene(geometry,model,{mode:'array',atlas,implantProfile:'medel-flex28',implantPose:pose});
    assert.equal(s.implantContacts.length,19);assert.ok(s.implantPlacement);assert.equal(s.implant.contacts,s.implantContacts);
    for(const d of descriptors(s)){assert.equal(d.contactIndex,undefined);assert.equal(d.fiberIndex,undefined);assert.equal(d.compartmentIndices,undefined);}
    assert.match(s.notes.join(' '),/separate from the generic reference experiment/);
  }
});

test('cochlear anatomy: unavailable surface assets expose the reconstruction rather than claiming measured meshes',()=>{
  const s=createAnatomyScene(geometry,model,{mode:'whole',atlas:null});assert.ok(s.paths.some(p=>p.id==='reconstructed-ST'));assert.equal(s.meshes.some(m=>m.role==='measured-scala'),false);
  assert.match(s.provenanceLabel,/surface asset unavailable/);assert.match(s.notes.join(' '),/not the original mesh/);
});
