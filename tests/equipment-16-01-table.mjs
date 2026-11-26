import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,preset,snap,dispatch,output,transfer,hole,sweep} from '../public/equipment/16-01/solver.mjs';
const p=new URL('../public/equipment/16-01/',import.meta.url),url=n=>new URL(n,p),json=n=>JSON.parse(readFileSync(url(n),'utf8')),rows=[];
function check(id,expected,actual,unit='',tol=0){
 const pass=typeof expected==='number'&&typeof actual==='number'?Math.abs(expected-actual)<=tol:expected===actual;
 rows.push({id,expected,actual,unit,tol:typeof expected==='number'?tol:'Exact',pass});
 assert.ok(pass,id);
}
test('independent closed-form magnitudes and DC limit',()=>{
 check('Static gain',1,transfer(0).ratio,'ratio',1e-12);
 check('1 Hz nominal natural frequency',Math.sqrt(10),transfer(1).ratio,'ratio',1e-12);
 check('Isolation crossover',1,transfer(Math.SQRT2).ratio,'ratio',1e-12);
 check('5 Hz vertical displacement ratio',Math.sqrt(34/5209),transfer(5).ratio,'ratio',1e-12);
 check('5 Hz expected table peak for 10 μm base',10*Math.sqrt(34/5209),output().response.tablePeakUm,'µm',1e-11);
 assert.ok(transfer(5).phaseDeg<0);
});
test('independent force harmonic balance and lag at a non-fixture frequency',()=>{
 const {ratio,phaseDeg,kNPerM:k,cNsPerM:c,massKg:m}=transfer(2.7,60),w=2*Math.PI*2.7;
 const ph=phaseDeg*Math.PI/180;
 const x=ratio*Math.cos(ph),xi=ratio*Math.sin(ph);
 assert.ok(Math.abs((k-m*w*w)*x-c*w*xi-k)<1e-9);
 assert.ok(Math.abs((k-m*w*w)*xi+c*w*x-c*w)<1e-9);
 check('60 kg mass shifts baseline natural frequency',Math.sqrt(5/6),transfer(5,60).naturalHz,'Hz',1e-12);
});
test('separate manufacturer figures are compared, not used as fitted targets',()=>{
 assert.ok(Math.abs(transfer(5).ratio-.06)>.015);
 assert.ok(Math.abs(transfer(10).ratio-.02)>.014);
 assert.equal(sweep().length,251);
});
test('exact plate-edge and lattice specification with two witness holes',()=>{
 assert.equal(hole(0,0).xMm,-887.5);assert.equal(hole(71,47).zMm,587.5);
 const {occupied}=snap(32,35,50);
 check('Adjacent mounting-grid pitch',25,hole(33,35).xMm-occupied[0].xMm,'mm',1e-10);
 check('Two-hole witness distance',50,occupied[1].xMm-occupied[0].xMm,'mm',1e-10);
 assert.deepEqual(occupied.map(h=>h.id),['X32-Z35','X34-Z35']);
 assert.equal(snap(32,35,50.04).separationMm,50);
 assert.throws(()=>snap(32,35,50.06));
});
test('table translation preserves fixture relative transform, IDs and witness revision',()=>{
 const state=initial();const a=dispatch(state,'run').state.measured;
 const b=dispatch(dispatch(state,'shift').state,'run').state.measured;
 assert.deepEqual(a.coordinates.fixtureOriginTableMm,b.coordinates.fixtureOriginTableMm);
 assert.deepEqual(a.coordinates.fixtureQuaternionXYZW,b.coordinates.fixtureQuaternionXYZW);
 assert.deepEqual(b.coordinates.fixtureOriginWorldMm.map((v,i)=>v-a.coordinates.fixtureOriginWorldMm[i]),[250,0,-100]);
 check('Local mount position after translation','Unchanged',b.coordinates.fixtureOriginTableMm.join(',')===a.coordinates.fixtureOriginTableMm.join(',')?'Unchanged':'Moved');
 assert.equal(a.sampleId,b.sampleId);assert.equal(a.revision,b.revision);
 assert.deepEqual(a.coordinates.occupied.map(x=>x.id),b.coordinates.occupied.map(x=>x.id));
});
test('bad spacing, edge overflow and invalid physical input are rejected; no fabricated attachment',()=>{
 const s=dispatch(initial(),'settings',{spacingMm:60}).state,r=dispatch(s,'snap');
 check('Incompatible 60 mm mount','Rejected',r.ok?'Accepted':'Rejected');
 assert.equal(r.state.fit,null);assert.equal(dispatch(r.state,'run').state.measured.response.fixturePeakUm,null);
 assert.throws(()=>snap(70,47,50));assert.equal(dispatch(s,'settings',{frequencyHz:-.2}).ok,false);
 assert.equal(dispatch(s,'settings',{addedKg:102}).ok,false);
});
test('registered JSON input and output are reproducible',()=>{
 assert.deepEqual(json('example-input.json'),preset);
 assert.deepEqual(json('example-output.json'),output(preset,initial().fit));
 const r=dispatch(initial(),'import',{...preset,sampleId:'imported-fixture-123',revision:2});
 assert.equal(r.ok,true);assert.equal(r.state.fit,null);
 assert.equal(dispatch(r.state,'run').state.measured.revision,2);
});
test('actual GLB metric envelope, hole openings and exact action anchor relationships',async()=>{
 const b=readFileSync(url('optical-table.glb')),m=json('interaction.json'),size=json('asset-metrics.json');
 const glb=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const scene=glb.scene,positions=new Map();scene.traverse(n=>positions.set(n.name,(positions.get(n.name)??0)+1));
 const g=n=>scene.getObjectByName(n),xyz=n=>g(n).getWorldPosition(new T.Vector3()).toArray();
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.ports,...m.actions.map(a=>a.node)])assert.equal(positions.get(n),1,n);
 assert.deepEqual(xyz(m.frame.placementAnchor),[0,0,0]);
 const surfaced=new T.Box3().setFromObject(g(m.parts.grid)).getSize(new T.Vector3());
 check('GLB grid long axis',1800,surfaced.x*1000,'mm',.01);
 check('GLB grid short axis',1200,surfaced.z*1000,'mm',.01);
 check('GLB tabletop datum above floor',914.2,xyz(m.parts.floating)[1]*1000,'mm',.01);
 const pd=xyz(m.parts.rightPin)[0]-xyz(m.parts.leftPin)[0];check('Metric witness pin separation',50,pd*1000,'mm',.01);
 const prim=g(m.parts.grid).geometry.index;
 check('Drawn grid openings',3456,prim.count/36,'holes');
 const ray=new T.Raycaster(new T.Vector3(-.7875,.965,.4375),new T.Vector3(0,-1,0));
 assert.equal(ray.intersectObject(g(m.parts.grid)).length,0);
 ray.ray.origin.x+=.006;ray.ray.origin.z+=.001;assert.ok(ray.intersectObject(g(m.parts.grid)).length>=1);
 const before=xyz(m.parts.witness),root=g(m.parts.translation);root.position.x+=.25;root.position.z-=.1;
 const after=xyz(m.parts.witness);check('GLB witness follows root motion',.25,after[0]-before[0],'m',1e-9);assert.ok(Math.abs(after[2]-before[2]+.1)<1e-9);
 assert.ok(size.bytes===b.length&&size.bytes<2e6&&size.triangles<=5e4&&size.primitives<=40);
 for(const a of m.actions)assert.ok(a.sizeM.length===3&&a.sizeM.every(x=>Number.isFinite(x)&&x>.025&&x<.12));
});
test('recorded verification values match the runner',()=>{
 const scope='Closed-form and independent force-balance verification, registration, and actual GLB geometry. Manufacturer isolation points are comparisons only; no instrument measurements, room PSD or headset data.';
 if(process.env.BTS_UPDATE_16_01==='1')writeFileSync(url('verification.json'),JSON.stringify({scope,rows},null,2)+'\n');
 else assert.deepEqual(json('verification.json'),{scope,rows});
});
