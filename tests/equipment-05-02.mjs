import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {initial,act,solve,csv,carrier,optics} from '../public/equipment/05-02/solver.mjs';
const dir=new URL('../public/equipment/05-02/',import.meta.url),read=n=>fs.readFileSync(new URL(n,dir)),ref=JSON.parse(read('reference-plan.json')),c=initial().config;
const cfg={'catalogue-tilt-mask':{type:'flat'},'inert-step':{},'periodic-roughness':{type:'texture',roughUm:.2,mask:false,sx:0,sy:0},'scan-window':{sx:0,sy:0,stepUm:6,mask:false,halfSpanUm:2}};
const cases=JSON.parse(read('verification.json'));
for(const f of ref.fixtures)test(f.id,()=>{let observed;if(f.id==='no-coupon'){
 const s=act(act(act(initial(),'stage'),'load'),'run');assert.equal(s.result,null);assert.equal(s.error,f.expected);observed=s.error;
 }else{
 const r=solve({...c,...cfg[f.id]}),both={...r,...r.metrics};observed={};
 for(const [k,v] of Object.entries(f.expected)){observed[k]=both[k];if(v===null)assert.equal(both[k],v,k);else assert.ok(Math.abs(both[k]-v)<=f.tolerances[k],k);}
 assert.equal(r.mask.filter(Boolean).length,r.invalidCount);assert.ok(r.heightsUm.every((z,i)=>(z===null)===r.mask[i]));
 }
 const published=cases.find(x=>x.id===f.id);assert.ok(published.pass);if(typeof observed==='string')assert.equal(observed,published.actual);else for(const [k,v] of Object.entries(observed))if(v===null)assert.equal(published.actual[k],null);else assert.ok(Math.abs(v-published.actual[k])<=(f.tolerances[k]||0));
});
test('Same slopes under both optics and 4× smaller pitch',()=>{const l=solve({...c,type:'flat'}),h=solve({...c,type:'flat',objective:20});assert.equal(l.grid.dxUm/h.grid.dxUm,4);assert.ok(Math.abs(l.metrics.sx-h.metrics.sx)<1e-12);assert.ok(Math.abs(l.metrics.sy-h.metrics.sy)<1e-12);assert.equal(h.grid.dyUm,5);assert.equal(carrier(0,optics[5].coherenceSigmaUm,.8),.8);});
test('All-null result without contrast, revisions, format and solver synchronization',()=>{let s=act(initial(),'run');s=act(s,'set',{contrast:.01});s=act(s,'run');assert.equal(s.result.inputRevision,1);assert.equal(s.result.revision,2);assert.equal(s.result.metrics,null);assert.equal(s.result.invalidCount,3072);assert.match(csv(s.result),/low-contrast/);assert.equal(csv(s.result).split('\n').length,3074);
 assert.equal(read('solver.mjs').toString(),fs.readFileSync(new URL('../src/lib/equipment/05-02/solver.mjs',import.meta.url),'utf8'));
 const example=JSON.parse(read('example-heightmap.json'));assert.equal(example.heightsUm.length,3072);assert.equal(example.sampleId,c.sampleId);
});
test('Metric GLB, labeled action metadata and model budget',()=>{const g=read('contour-gt-k.glb'),j=JSON.parse(g.toString('utf8',20,20+g.readUInt32LE(12))),m=JSON.parse(read('interactions.json'));assert.equal(g.readUInt32LE(0),0x46546c67);assert.equal(m.bytes,g.length);assert.ok(m.bytes<1048576&&m.triangles<30000&&m.drawCalls<65);assert.equal(m.motion.stageTravelZMeter,.08);for(const [k,v] of Object.entries(m.actions)){const o=j.nodes.find(n=>n.name===k);assert.equal(o.extras.action,v.action);assert.ok(o.extras.boundsM.every(b=>b>0&&b<.3));assert.doesNotThrow(()=>act(initial(),v.action));}assert.ok(JSON.parse(read('geometry-check.json')).checks.every(x=>x.pass));});
