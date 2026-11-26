import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initial,act,validate,inspect} from '../public/equipment/04-10/solver.mjs';
const u=n=>new URL('../public/equipment/04-10/'+n,import.meta.url),j=n=>JSON.parse(readFileSync(u(n),'utf8')),f=validate(j('chart-pair.json')),rows=[];
const at=(id,expected,actual,unit='',tolerance=0)=>{
 const pass=typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual;
 rows.push({id,expected,actual,unit,tolerance,pass});assert.ok(pass,id+'; actual='+actual);
};
test('two preprinted widths and stable archived IDs',()=>{
 for(const row of [5,18,30]){
  const q=inspect(f,{...initial(),row});
  at('Chart A width, row '+row,4.5,q.measurements[0].widthMm,'mm');
  at('Chart B width, row '+row,6.5,q.measurements[1].widthMm,'mm');
  at('Chart difference, row '+row,2,q.differenceBMinusAMm,'mm');
  assert.deepEqual(q.measurements.map(t=>t.chartId),['R4-EXHIBIT-A','R4-EXHIBIT-B']);
  assert.equal(q.thermalWidth.value,null);
 }
 const q=act(f,initial(),'next');assert.equal(inspect(f,q.state).displayChartId,'R4-EXHIBIT-B');
 assert.deepEqual(inspect(f,q.state).measurements,inspect(f,initial()).measurements);
});
test('blank, invalid row and invalid fixture',()=>{
 for(const row of [0,4,31,35]){
  const q=inspect(f,{...initial(),row});
  at('Blank row '+row,null,q.differenceBMinusAMm);
  assert.deepEqual(q.measurements.map(t=>t.widthMm),[null,null]);
 }
 const s=initial();for(const row of [-1,36,NaN,2.1])assert.equal(act(f,s,'row',row).state,s);
 const bad=structuredClone(f);bad.charts[0].rows[18][1]++;assert.throws(()=>validate(bad),/Malformed/);
});
test('metric enclosed GLB and only a detached action',async()=>{
 const b=readFileSync(u('protolaser-r4.glb')),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),m=j('interaction.json'),s=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
 const ps=g.meshes.flatMap(x=>x.primitives),stats={bytes:b.length,nodes:g.nodes.length,primitives:ps.length,triangles:ps.reduce((a,x)=>a+g.accessors[x.indices].count/3,0)};
 if(process.env.BTS_UPDATE_04_10==='1')writeFileSync(u('asset-metrics.json'),JSON.stringify(stats,null,2)+'\n');else assert.deepEqual(j('asset-metrics.json'),stats);
 assert.ok(stats.bytes<2e6&&stats.primitives<=40&&stats.triangles<5e4);
 function get(n){const a=[];s.traverse(o=>{if(o.name===n)a.push(o);});assert.equal(a.length,1,n);return a[0];}
 for(const n of [m.frame.placementAnchor,...Object.values(m.parts),...m.actions.map(a=>a.node)])get(n);
 assert.deepEqual(get(m.frame.placementAnchor).getWorldPosition(new Vector3()).toArray(),[0,0,0]);
 assert.deepEqual(m.ports,[]);assert.deepEqual(m.actions.map(x=>[x.action,x.mode]),[['next','read-only']]);
 const cab=new Box3().setFromObject(get(m.parts.cabinet)),app=new Box3().setFromObject(get(m.parts.review)),[w,h,d]=cab.getSize(new Vector3()).toArray().map(x=>1e3*x);
 assert.ok(app.max.x<cab.min.x&&Math.abs(cab.min.y)<.000001);
 at('Vendor closed cabinet W',910,w,'mm',.5);at('Vendor closed cabinet H',1650,h,'mm',.5);at('Vendor closed cabinet D',795,d,'mm',.5);
});
test('source and example export preserve dimensions, revisions, IDs and verification evidence',()=>{
 assert.deepEqual(j('example-comparison.json'),inspect(f,initial()));
 const results={scope:'Nominal closed documentary cabinet and width of fixed synthetic printed charts. Not instrument operation, processing or headset evidence.',rows};
 if(process.env.BTS_UPDATE_04_10==='1')writeFileSync(u('verification.json'),JSON.stringify(results,null,2)+'\n');else assert.deepEqual(j('verification.json'),results);
});
