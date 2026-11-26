import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {action,blank,csv,halfWidth,intensity,phantom,section,xyz} from '../public/equipment/12-03/solver.mjs';
const dir=new URL('../public/equipment/12-03/',import.meta.url),get=k=>readFileSync(new URL(k,dir)),read=k=>JSON.parse(get(k)),put=(k,v)=>writeFileSync(new URL(k,dir),JSON.stringify(v,null,2)+'\n');
const raw=get('lsm980-static.glb'),g=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12))),n=k=>g.nodes.find(q=>q.name===k),box=k=>{
 const a=g.meshes[n(k).mesh].primitives.map(q=>g.accessors[q.attributes.POSITION]);
 return [0,1,2].map(i=>Math.max(...a.map(x=>x.max[i]))-Math.min(...a.map(x=>x.min[i])));
};
const table=box('large_active_tabletop'),height=n('large_active_tabletop').translation[1]+table[1]/2,s=blank(),xy=section('XY',15,'signal'),xz=section('XZ',18,'signal'),yz=section('YZ',20,'signal'),example=action(action(s,{type:'cycle'}),{type:'measure'}).report;
const reject=f=>{try{f();return false}catch{return true}};
const actual={
 'fwhm-x':halfWidth(0,'signal').widthUm,'fwhm-y':halfWidth(1,'signal').widthUm,'fwhm-z':halfWidth(2,'signal').widthUm,'z-spacing':xz.spacingUm[1],
 'background-constant':Math.max(...section('XY',15,'background').values),'background-width-unresolved':halfWidth(2,'background').widthUm===null,
 'shared-world-plane-intersection':xy.values[18*41+20]===xz.values[15*41+20]&&xz.values[15*41+20]===yz.values[15*37+18]&&xyz(phantom.centerIndex).every(x=>Math.abs(x)<1e-12),
 'outside-plane-rejected':reject(()=>section('XZ',39,'signal')),'inactive-control-rejected':reject(()=>action(s,{type:'start-capture'})),
 'table-length':table[0],'table-depth':table[2],'table-height':height};
const cases=read('reference-cases.json').cases.map(c=>({...c,actual:actual[c.id],outcome:(typeof c.expected==='number'?Math.abs(actual[c.id]-c.expected)<=(c.tolerance??0):actual[c.id]===c.expected)?'PASS':'FAIL'}));
const metrics={bytes:raw.length,triangles:g.meshes.flatMap(m=>m.primitives).reduce((a,p)=>a+g.accessors[p.indices].count/3,0),draws:g.nodes.filter(n=>n.mesh!==undefined).reduce((a,n)=>a+g.meshes[n.mesh].primitives.length,0),tableNominalXyzM:[table[0],height,table[2]]};
const proof={schema:'bts.gaussian-phantom.verification.v1',metrics,cases,scope:'Analytic phantom math and nominal exterior layout only. No real operation, data acquisition, experimental accuracy, biology or headset test.'};
if(process.argv.includes('--write-proof')){
 put('verification.json',proof);put('example-section.json',example);
 put('xr-manifest.json',{schema:'bts.equipment.interaction.v1',deviceId:'12-03',asset:'/equipment/12-03/lsm980-static.glb',scale:'glTF meters, +Y up, +Z operator. Synthetic data grid uses micrometers in a separate logical frame.',metrics,scope:'Named passive display action only; no immersive headset test.',nodes:[{node:'plane_select_overlay',label:'Cycle analytic XY, XZ and YZ plane display',action:{type:'cycle'},boundsM:[.104,.013,.045]},{node:'section_display_anchor',label:'Live passive viewport texture',boundsM:[.411,.254]}]});
}
test('Independent analytical animal-free phantom, plane map, empty track, and model dimensions',()=>{
 assert.deepEqual(read('verification.json'),proof);for(const c of cases)assert.equal(c.outcome,'PASS',JSON.stringify(c));
 assert.deepEqual(example,read('example-section.json'));assert.deepEqual(xyz([0,0,0]),[-2,-2.16,-3]);
 assert.equal(intensity([20,18,15],'signal'),1.04);assert.deepEqual(xz.displayAxes,['X','Z']);
 for(const k of ['plane_select_overlay','section_display_anchor','lsm_scan_head_external','airyscan_2_external','inert_stage_insert'])assert.ok(n(k));
});
test('Passive plane actions, synthetic timestamp-free output, CSV and revision',()=>{
 let st=action(s,{type:'measure'});st=action(st,{type:'cycle'});assert.equal(st.orientation,'XZ');
 st=action(st,{type:'channel',payload:'background'});st=action(st,{type:'measure'});assert.ok(st.report.widths.every(x=>x.widthUm===null));
 assert.equal(st.report.parentRevision,1);assert.match(csv(st.report),/^X_um,Z_um,intensity_rel\n-2,-3,0.04\n/);
 assert.throws(()=>action(st,{type:'slice',payload:-1}),/outside/);
});
