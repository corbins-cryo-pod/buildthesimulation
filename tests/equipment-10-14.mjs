import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,blank,defaults,evaluate,seat} from '../public/equipment/10-14/solver.mjs';
const dir=new URL('../public/equipment/10-14/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const centered=evaluate(defaults), raw=get('dry-fixture.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k),box=k=>{
 const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);return [0,1,2].map(i=>Math.max(...a.map(t=>t.max[i]))-Math.min(...a.map(t=>t.min[i])));
};
const reject=f=>{try{f();return false}catch{return true}},fit=evaluate({...defaults,xMm:12}), tags=evaluate({...defaults,leftTag:'TAG-B',rightTag:'TAG-A'});
const actual={'centered-left':centered.marginMm.left,'centered-back':centered.marginMm.back,'off-center-right':fit.marginMm.right,
 'touch-right':evaluate({...defaults,xMm:10}).fitStatus,
 'empty-check-rejected':reject(()=>action(action(blank(),{type:'insert'}),{type:'inspect'})),
 'notes-do-not-connect':tags.labels.plugState==='detached and power-disconnected'&&reject(()=>action(blank(),{type:'connect'})),
 'labels-match-default':centered.labels.matchesReference,'swapped-labels-flagged':tags.labels.matchesReference,
 'invalid-offset-rejected':reject(()=>evaluate({...defaults,xMm:46})),'base-width':box('baseplate')[0],'base-depth':box('baseplate')[2],'mock-block-width':box('solid_mock_block')[0]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),baseXyzM:box('baseplate'),solidBlockXyzM:box('solid_mock_block')};
const proof={schema:'bts.dry-mount.verification.v1',metrics,cases,scope:'Dry visual envelope and detached visual tags only. No physical fixture, connection, physiology, or headset test.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-report.json',centered);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'10-14',asset:'/equipment/10-14/dry-fixture.glb',scale:'glTF in meters, +Y up, front +Z',metrics,scope:'Display actions only; no connection or immersed specimen. No headset tested.',nodes:[{node:'block_display_toggle',label:'Show or hide the solid display block',action:{type:'insert'},boundsM:[.046,.006,.013]},{node:'tag_display_toggle',label:'Show or hide detached visual labels',action:{type:'tags'},boundsM:[.046,.006,.013]}]});
}
test('Locked dry recess, nominal metric GLB and text labels',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.deepEqual(centered,read('example-report.json'));assert.equal(fit.fitStatus,'interference');
 const left=n('fixed_mount_side').translation[0],right=n('fixed_mount_side.001').translation[0];
 assert.ok(Math.abs((right-left-box('fixed_mount_side')[0])*1000-seat.widthMm)<1e-4);
 const front=n('fixed_mount_end').translation[2],back=n('fixed_mount_end.001').translation[2];
 assert.ok(Math.abs((front-back-box('fixed_mount_end')[2])*1000-seat.depthMm)<1e-4);
 for(const k of ['block_display_toggle','tag_display_toggle','tag_left_anchor','tag_right_anchor','inert_block'])assert.ok(n(k));
});
test('Dry inspection revision, visibility, disconnected state and validation',()=>{
 let s=action(blank(),{type:'tags'});assert.equal(s.tagsVisible,false);
 s=action(s,{type:'inspect'});s=action(s,{type:'inspect',payload:{...defaults,leftTag:'TAG-B'}});
 assert.equal(s.result.parentRevision,1);assert.equal(s.result.labels.matchesReference,false);
 assert.equal(s.result.labels.plugState,'detached and power-disconnected');assert.throws(()=>action(s,{type:'stimulate'}),/Only disconnected/);
});
