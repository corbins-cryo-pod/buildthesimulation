import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,blank,imageTrack} from '../public/equipment/12-09/solver.mjs';
const d=new URL('../public/equipment/12-09/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('elyra7-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
const bounds=g.meshes[n('large_active_tabletop').mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]);
const span=i=>Math.max(...bounds.map(x=>x.max[i]))-Math.min(...bounds.map(x=>x.min[i]));
const w=imageTrack('wide').analysis.frequency,s=imageTrack('narrow').analysis.frequency;
let rejected=false;try{action(blank(),{type:'capture'})}catch{rejected=true}
const actual={frequency:w.cyclesPerUm,pitch:w.pitchUm,'frequency-vector-angle':w.vectorDeg,'wide-contrast':w.contrast,'narrow-contrast':s.contrast,
 'contrast-increases':s.contrast>w.contrast,'flat-has-no-frequency':imageTrack('flat').analysis.frequency===null,'missing-image-flag':imageTrack('missing').analysis.status==='missing-input',
 'hardware-command-rejected':rejected,'table-width':span(0),'table-depth':span(2)};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0)};
const proof={schema:'bts.staged-grating.verification.v1',metrics,cases,scope:'Only analytic inert image comparison and nominal table plan dimensions were verified.'};
const example=action(action(blank(),{type:'cycle'}),{type:'inspect'}).report;
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('comparison-example.json',example);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'12-09',asset:'/equipment/12-09/elyra7-static.glb',scale:'glTF meters, +Y up, +Z operator; images use separate micrometers.',metrics,scope:'No headsets tested. Actions address the teaching display, not microscope hardware.',nodes:[{node:'image_select_overlay',label:'Cycle fixed image comparison',action:{type:'cycle'},boundsM:[.110,.014,.046]},{node:'comparison_display_anchor',label:'Passive teaching display texture',boundsM:[.417,.254]}]});
}
test('Analytic grating in known DFT bins, contrast, empty/missing distinction and physical anchors',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(w.binXY,[5,3]);assert.deepEqual(s.binXY,[5,3]);
 for(const k of ['axio_observer_7_sr_lower','elyra_pattern_module_dormant','duolink_outer_block','image_select_overlay','comparison_display_anchor']) assert.ok(n(k));
});
test('Passive action revisions, selected sample export and error state',()=>{
 assert.deepEqual(example,read('comparison-example.json'));assert.equal(example.selectedValues.length,4096);
 let q=action(blank(),{type:'inspect'});q=action(q,{type:'set-track',payload:'missing'});assert.equal(q.report,null);
 q=action(q,{type:'inspect'});assert.equal(q.report.analysis.status,'missing-input');assert.equal(q.report.selectedValues,null);assert.equal(q.report.parentRevision,1);
 assert.throws(()=>action(q,{type:'set-track',payload:'camera'}),/Unknown/); assert.deepEqual(action(q,{type:'reset'}),blank());
});
