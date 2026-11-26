import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,blank,grid,labelAt,measurements,plane,selection,xyz} from '../public/equipment/13-04/solver.mjs';
const d=new URL('../public/equipment/13-04/',import.meta.url),get=k=>readFileSync(new URL(k,d)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,d),JSON.stringify(v,null,2)+'\n');
const raw=get('volumescope2-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k);
const bounds=g.meshes[n('documented_active_display').mesh].primitives.map(p=>g.accessors[p.attributes.POSITION]);
const span=i=>Math.max(...bounds.map(x=>x.max[i]))-Math.min(...bounds.map(x=>x.min[i]));
const [prism,step]=measurements(),[_,partialStep]=measurements('gap');
const actual={'prism-count':prism.observedVoxels,'step-count':step.observedVoxels,'prism-volume':prism.observedVolumeUm3,'step-volume':step.observedVolumeUm3,
 'step-z-extent':step.observedExtentUm[2],'prism-label-center':labelAt([7,8,5]),'step-label-center':labelAt([22,10,5]),
 'known-coordinate-z':plane(5).centerZUm,'after-gap-coordinate-z':plane(10,'gap').centerZUm,
 'missing-not-zero':labelAt([0,0,9],'gap')===null&&plane(9,'gap').labels===null&&labelAt([0,0,9])===0,
 'step-observed-with-gap':partialStep.observedVoxels,'display-width':span(0),'display-height':span(1)};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0)};
const proof={schema:'bts.toy-volume-inspection.verification.v1',metrics,cases,scope:'Previously authored shapes and index/world transform; 24-inch screen geometry only. No measured console dimensions, equipment operation, registration or real samples.'};
const example=action(blank(),{type:'inspect'}).report;
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('inspection-example.json',example);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'13-04',asset:'/equipment/13-04/volumescope2-static.glb',scale:'glTF meters, +Y up, +Z operator; preauthored stack metric coordinates are separate, in micrometers.',metrics,scope:'Passive teaching plane selection only. No immersive headset test.',nodes:[{node:'plane_next_overlay',label:'Cycle preauthored plane',action:{type:'cycle'},boundsM:[.109,.015,.052]},{node:'stack_display_anchor',label:'Passive live teaching display texture',boundsM:[.5169397661,.3230873538]}]});
}
test('Locked counts, sampled world extents, missing plane, identities and metric display size',()=>{
 for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));assert.deepEqual(read('verification.json'),proof);
 assert.deepEqual(prism.boundsIndexInclusive,[[5,5,2],[10,12,7]]);assert.deepEqual(step.boundsIndexInclusive,[[18,7,5],[24,11,11]]);
 assert.equal(grid.shape[2],14);assert.equal(plane(5).labels[22+32*10],35);
 for(const k of ['closed_column_console_base','sealed_chamber_enclosure','upper_column_white_shroud','plane_next_overlay','stack_display_anchor'])assert.ok(n(k));
});
test('World mapping, wrapped passive stepping, pick, gap handling and export revisions',()=>{
 assert.deepEqual(example,read('inspection-example.json'));assert.equal(example.currentPlane.labels.length,768);
 let s=action(blank(),{type:'inspect'});s=action(s,{type:'pick',payload:{x:22,y:10}});assert.equal(selection(s).label,35);
 s=action(action(s,{type:'set-profile',payload:'gap'}),{type:'set-plane',payload:9});s=action(s,{type:'inspect'});
 assert.deepEqual(s.report.missingIndices,[9]);assert.equal(s.report.currentPlane.labels,null);assert.equal(s.report.parentRevision,1);
 assert.deepEqual(xyz([0,0,0]),[-6.2,-5.75,3]);assert.equal(action({...s,z:13},{type:'cycle'}).z,0);
 assert.throws(()=>action(s,{type:'set-plane',payload:14}),/outside/);assert.throws(()=>action(s,{type:'capture'}),/passive/);
});
