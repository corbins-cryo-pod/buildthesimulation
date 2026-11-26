import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root = new URL('../public/equipment/07-03/',import.meta.url);
const bytes = readFileSync(new URL('microscope.glb',root));
const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
function mesh(name) {
  const node = scene.getObjectByName(name);
  assert.ok(node,'Missing '+name);
  return node;
}
const bounds = name => new Box3().setFromObject(mesh(name),true);
const size = name => bounds(name).getSize(new Vector3()).multiplyScalar(1000);
const center = name => bounds(name).getCenter(new Vector3()).multiplyScalar(1000);
const rows = [];
function reference(test,expected,value,tolerance) {
  const actual = Number(value.toFixed(4));
  rows.push({test,expected,actual,units:'mm',tolerance,outcome:Math.abs(actual-expected)<=tolerance?'Pass':'Fail'});
}
scene.updateMatrixWorld(true);
const stand = size('StandCore');
const stage = size('PlainStage');
const camera = size('DS-Fi3_camera_body');
reference('Stand width',236,stand.x,3);
reference('Stand depth',564,stand.z,5);
reference('Stand height',471,stand.y,2);
reference('Plain stage width',170,stage.x,.1);
reference('Plain stage depth',247,stage.z,.1);
reference('Stage surface above bench',200,bounds('PlainStage').max.y*1000,.2);
reference('Ocular center spacing at illustrated setting',64,center('Ocular_front_lens_-1').distanceTo(center('Ocular_front_lens_1')),.1);
reference('Height at top of eyeguards at 64 mm pupil spacing',406,bounds('Eye_guard_1').max.y*1000,1);
reference('DS-Fi3 head width across its front face',100,camera.z,.1);
reference('DS-Fi3 head depth along the camera port',66,camera.x,.1);
reference('DS-Fi3 head height',65,camera.y,.1);
// Verify the operating rotation through the same glTF transform chain as the viewer.
const indexed = mesh('NosepieceIndex');
const neutral = indexed.quaternion.clone();
const slideBottom = bounds('Micrometer_substrate').min.y*1000;
for (const [slot,mag,workingDistance] of [[0,10,6.2],[1,20,3.1]]) {
  indexed.quaternion.copy(neutral);
  indexed.rotateY(-slot * 2*Math.PI/5);
  scene.updateMatrixWorld(true);
  const end = 'Objective_front_glass_'+slot;
  const position = center(end);
  reference(mag+'× maximum objective collar diameter',27,size('CFI_ADL_barrel_'+slot).x,.1);
  reference(mag+'× indexed objective axis offset from field center',0,Math.hypot(position.x,position.z),.1);
  reference(mag+'× working clearance to slide underside',workingDistance,slideBottom-bounds(end).max.y*1000,.15);
}
const output = {basis:'Dimensions measured from transformed GLB vertices in millimeters. The stand is evaluated without the detachable camera and stage accessories. The 2–5 mm envelope allowance is an engineering reconstruction tolerance for external fittings and published drawing/catalogue differences. The 0.1–0.2 mm limits check modeled datums and numeric assembly, not physical manufacturing tolerances.',tests:rows};
const file = new URL('geometry-verification.json',root);
if (process.env.WRITE_TS2_GEOMETRY_REPORT === '1') writeFileSync(file,JSON.stringify(output,null,2)+'\n');
test('07-03 GLB geometry and both indexed poses satisfy their dimensional references',()=>{
  for(const row of rows) assert.equal(row.outcome,'Pass',JSON.stringify(row));
  assert.deepEqual(JSON.parse(readFileSync(file)),output);
  for(const name of ['FocusCarriage','FineFocusL','FineFocusR','SpecimenCarrier','StageMicrometer','SpecimenSlide','EpiSelector','DiaIndicator','EpiIndicator']) mesh(name);
});
