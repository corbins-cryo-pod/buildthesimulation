import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,initial,inspect,lineFit} from '../public/equipment/10-08/solver.mjs';
const dir=new URL('../public/equipment/10-08/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const document=read('facets.json'), [a,b]=document.fixtures, rev=document.fixtureRevision,A=inspect(a,rev), B=inspect(b,rev);
const raw=get('bv10d-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k),box=k=>{
 const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);
 return [0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])));
};
const rigid=([x,y])=>[3+(x-y)/Math.sqrt(2),-2+(x+y)/Math.sqrt(2)],reject=f=>{try{f();return false}catch{return true}};
const actual={
 '3-4-5-angle':A.interiorDeg,'horizontal-residual':A.fittedLines.base.rmsOrthogonalMm,'inclined-residual':A.fittedLines.facet.rmsOrthogonalMm,'vertical-vs-diagonal':B.interiorDeg,
 'rigid-display-rotation-invariance':Math.abs(inspect({...a,base:a.base.map(rigid),facet:a.facet.map(rigid)},rev).interiorDeg-A.interiorDeg)<1e-10,
 'reversed-node-order-invariance':Math.abs(inspect({...a,base:[...a.base].reverse(),facet:[...a.facet].reverse()},rev).interiorDeg-A.interiorDeg)<1e-10,
 'coincident-track-rejected':reject(()=>lineFit([[0,0],[0,0]])),'isotropic-track-rejected':reject(()=>lineFit([[1,0],[-1,0],[0,1],[0,-1]])),
 'dormant-control-rejected':reject(()=>action(initial(),{type:'activate'},document)),
 'nominal-base-length':box('base_footprint')[0],'nominal-base-depth':box('base_footprint')[2],'nominal-height-anchor':n('upper_fixed_knob').translation[1]+box('upper_fixed_knob')[1]/2};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),nominalBaseXyzM:box('base_footprint'),nominalHeightAnchorM:actual['nominal-height-anchor']};
const proof={schema:'bts.facet-annotation.verification.v1',metrics,cases,scope:'Fictitious 2D inspection and static documentary GLB only. No tip geometry, biological procedure, instrument operation or headset test.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-annotation.json',A);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'10-08',asset:'/equipment/10-08/bv10d-static.glb',scale:'glTF meter with +Y up +Z toward operator',metrics,scope:'Inspection-only named virtual badge; 3D equipment has no controls. No headset tested.',nodes:[{node:'facet_selector_overlay',label:'Select a fictitious passive facet drawing',action:{type:'cycle'},boundsM:[.066,.007,.026]}]});
}
test('Independent authored angle, rigid invariance, singular failure and nominal metric anchors',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.deepEqual(A,read('example-annotation.json'));assert.ok(n('facet_selector_overlay')&&n('unpowered_disk')&&n('stereo_scope_shell'));assert.ok(lineFit(a.facet.map(([x,y],i)=>[x,y+(i===2?.1:0)])).rmsOrthogonalMm>0);
});
test('Fixture revision and passive marker never issue operations',()=>{
 let s=action(initial(),{type:'inspect'},document);assert.equal(s.result.fixtureId,'WEDGE-A');
 s=action(s,{type:'cycle'},document);assert.equal(s.result,null);s=action(s,{type:'inspect'},document);
 assert.equal(s.result.fixtureId,'WEDGE-B');assert.equal(s.result.parentRevision,1);
 assert.deepEqual(s.result.sourceTracks.facet,document.fixtures[1].facet);
 assert.throws(()=>action(s,{type:'choose',payload:7},document),/two/);
});
