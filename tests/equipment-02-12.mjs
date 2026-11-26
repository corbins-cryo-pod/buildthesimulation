import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,camera,capture,defaults,initial,profile,projected,raster,mtf,worldAt} from '../public/equipment/02-12/solver.mjs';
const dir=new URL('../public/equipment/02-12/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const a=capture(defaults),b=capture({...defaults,objective:20},2,1),view=profile(defaults),raw=get('lv100nd.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=x=>g.nodes.find(q=>q.name===x), bbox=x=>{
 const d=g.meshes[n(x).mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]);return [0,1,2].map(i=>Math.max(...d.map(a=>a.max[i]))-Math.min(...d.map(a=>a.min[i])));
};
const reject=f=>{try{f();return false}catch{return true}};
const actual={'fov-10':a.scale.fovUm[0],'fov-20':b.scale.fovUm[0],'peak-period-10':a.measurement.pixelPitch,'peak-period-20':b.measurement.pixelPitch,
 'physical-pitch-10':a.measurement.pitchUm,'physical-pitch-20':b.measurement.pitchUm,'rayleigh-10':a.optics.rayleighUm,'rayleigh-20':b.optics.rayleighUm,'incoherent-cutoff':mtf(view.cutoffCycPerUm,view),
 'defocus-reduces-fine-contrast':capture({...defaults,focusUm:3}).optics.finePatchContrastTransfer<a.optics.finePatchContrastTransfer,
 'bad-objective-rejected':reject(()=>capture({...defaults,objective:13})),'stand-base-width':bbox('base_footprint')[0]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),baseGltfXyzM:bbox('base_footprint'),mainStandNominalHeightM:n('trinocular_port_cap').translation[1]+bbox('trinocular_port_cap')[1]/2};
const proof={schema:'bts.reflected-inspection.verification.v1',metrics,cases,scope:'Synthetic calibrated image coordinates and ideal circular optics; not vendor camera validation, true hardware accuracy or headset testing.'};
if(process.argv.includes('--write-proof')){
 put('example-metadata.json',b);put('verification.json',proof);
 writeFileSync('/tmp/bts-lv100nd-example.pgm',Buffer.concat([Buffer.from('P5\n512 320\n255\n'),Buffer.from(raster(profile(b.settings)))]));
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'02-12',asset:'/equipment/02-12/lv100nd.glb',scale:'1 glTF unit = 1 m, +Y up, +Z toward operator',metrics,implementation:'Desktop and future XR share independent action(state, action). No headset tested.',nodes:[
  {node:'objective_action',label:'Index 10× / 20× objective',action:{type:'objective'},diameterM:.022},
  {node:'objective_turret',axis:[0,1,0],detentsDeg:[0,-72],pivotM:[0,.306,.031]},
  {node:'focus_knob',label:'Return focus to nominal zero',action:{type:'focus'},diameterM:.062},
  {node:'stage_translation',label:'XY and focus motion',visualMovement:'55:1 transverse and 45:1 vertical exaggeration'}
 ]});
}
test('Two objective-pitch references, focus transfer, geometry and optical cutoff',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.ok(Math.abs(metrics.mainStandNominalHeightM-.506)<1e-6);assert.ok(Math.abs(metrics.baseGltfXyzM[2]-.386)<1e-6);
 for(const k of ['objective_action','objective_turret','objective_10x','objective_20x','focus_knob','stage_translation'])assert.ok(n(k));
 const r=profile({...defaults,objective:20,xUm:13.4,yUm:5,focusUm:7}),xy=worldAt(r,235,25),uv=projected(r,...xy);assert.ok(Math.abs(uv[0]-235)<1e-10&&Math.abs(uv[1]-25)<1e-10);
 assert.equal(mtf(0,r),1);assert.ok(raster(r).length===camera.widthPx*camera.heightPx);
});
test('Image capture, export scale bar, action transitions and invalid inputs',()=>{
 let s=action(initial(),{type:'capture'});assert.equal(s.result.scale.barPx,40);s=action(s,{type:'objective'});assert.equal(s.settings.objective,20);
 s=action(s,{type:'capture'});assert.deepEqual(s.result,b);assert.deepEqual(read('example-metadata.json'),b);assert.equal(s.result.scale.barPx,80);
 s=action(s,{type:'focus'});assert.equal(s.result,null);assert.equal(s.settings.focusUm,0);
 for(const objective of [10,20])assert.equal(capture({...defaults,xUm:3.4,objective}).measurement.pitchUm,40);
 assert.equal(capture({...defaults,objective:20,yUm:90}).fixtureMark.inField,false);
 assert.throws(()=>capture({...defaults,focusUm:50}),/±30/);
});
