import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,defaults,fit,gauge,initial} from '../public/equipment/03-06/solver.mjs';
const dir=new URL('../public/equipment/03-06/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const centered=fit(defaults),shifted=fit({...defaults,xMm:3,yMm:4}),tall=fit({...defaults,heightMm:12}),tangent=fit({...defaults,xMm:3});
const b=get('fiji-g2-static.glb'),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
const box=k=>{const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);return [0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])))};
const outer=[box('nominal_footprint')[0],n('electronics_tower').translation[1]+box('electronics_tower')[1]/2,box('nominal_footprint')[2]];
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'reference-lateral':centered.radialMarginMm,'reference-vertical':centered.verticalMarginMm,'reference-fits':centered.status,
 '3-4-offset-lateral':shifted.radialMarginMm,'off-center-rejected':shifted.status,'height-oversize-margin':tall.verticalMarginMm,'height-oversize-rejected':tall.status,'touch-boundary':tangent.status,
 'negative-diameter-rejected':reject(()=>fit({...defaults,diameterMm:-200})),'exterior-length':outer[0],'exterior-depth':outer[2],'exterior-height':outer[1]};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:b.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),envelopeXyzM:outer};
const proof={schema:'bts.ald-cabinet.verification.v1',metrics,cases,scope:'Exterior scale and independent invented-gauge arithmetic only. Register film/cycle acceptance was not run; no process model or actual OEM fit validation.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-report.json',centered);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'03-06',asset:'/equipment/03-06/fiji-g2-static.glb',scale:'glTF meter with +Y up and +Z toward the front',metrics,scope:'Named inspection-only controls for a possible XR viewer; no real equipment commands or headset testing',nodes:[
 {node:'cabinet_inspection_toggle',label:'Show or hide teaching cutaway',action:{type:'cutaway'},boundsM:[.074,.048,.005]},
 {node:'static_fit_button',label:'Evaluate teaching geometry only',action:{type:'inspect'},boundsM:[.049,.048,.005]},
 {node:'teaching_gauge',label:'Invented gauge, not OEM',radiusM:gauge.radiusMm/1000},
 {node:'dry_carrier',label:'Inert training disk'}
 ]});
}
test('Locked clearance calculations and static drawing envelope',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 for(const k of ['cabinet_inspection_toggle','static_fit_button','inspection_shroud','reactor_external_shell','teaching_gauge','dry_carrier'])assert.ok(n(k));
 assert.deepEqual(centered,read('example-report.json'));assert.match(centered.gauge.provenance,/not Veeco/);
});
test('Only safe inspection actions, output provenance and boundaries',()=>{
 let s=action(initial(),{type:'cutaway'});assert.equal(s.cutaway,true);
 s=action(s,{type:'inspect'});assert.equal(s.result.radialMarginMm,3);
 s=action(s,{type:'inspect',payload:{...defaults,xMm:3,yMm:4}});assert.equal(s.result.parentRevision,1);
 assert.equal(s.result.status,'interference-in-mockup');
 s=action(s,{type:'carrier'});assert.throws(()=>action(s,{type:'inspect'}),/inert/);
 assert.throws(()=>action(s,{type:'start-process'}),/Unknown/);assert.throws(()=>fit({...defaults,heightMm:100}),/heightMm/);
});
