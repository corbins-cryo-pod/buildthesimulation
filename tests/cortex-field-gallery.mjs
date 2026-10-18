import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sources,sample} from '../src/lib/cortex/gallery-field.js';
const data=JSON.parse(await readFile(new URL('../public/models/cortex/field-gallery.json',import.meta.url)));
test('gallery panel currents, exposed area, physical signs and similarity scaling',()=>{
  for(const model of Object.values(data.shapes)){
    assert.ok(Math.abs(model.panels.length*model.hx*model.hy-Math.PI)<1e-12);
    assert.ok(Math.abs(model.panels.reduce((a,p)=>a+p[2],0)-1)<1e-12);
    assert.ok(model.panels.every(p=>p[2]>0));
    const src=sources(model),a=sample(src,20,10,25,25,1),b=sample(src,40,20,50,50,1),neg=sample(src,20,10,25,25,-1);
    assert.ok(Math.abs(a.potential/b.potential-2)<1e-12);
    assert.ok(Math.abs(a.field/b.field-4)<1e-12);
    assert.equal(neg.potential,-a.potential);assert.equal(neg.field,a.field);
    assert.deepEqual(sample(src,0,0,25,25,0),{potential:0,field:0});
    assert.equal(sample(src,0,0,4,25,1),null);
    const far=sample(src,0,0,25000,25,1);
    assert.ok(Math.abs(far.potential/(1e-6/(2*Math.PI*.3*.025)*1000)-1)<1e-5);
    assert.ok(Math.abs(far.field/(1e-6/(2*Math.PI*.3*.025**2))-1)<1e-5);
  }
});
test('browser sampler agrees with independent analytical disk potential and gradient',()=>{
  const src=sources(data.shapes.disk),a=25,sigma=.3;
  function reference(x,y,z){const r=Math.hypot(x,y);return Math.asin(2*a/(Math.hypot(r-a,z)+Math.hypot(r+a,z)))/(2*Math.PI*sigma*a*1e-6)*.001;}
  for(const p of [[0,0,5],[25,0,5],[0,0,25],[10,20,50],[150,100,300]]){
    const actual=sample(src,...p,a,1),v=reference(...p),h=.001;
    const gradient=p.map((_,axis)=>{const plus=[...p],minus=[...p];plus[axis]+=h;minus[axis]-=h;return (reference(...plus)-reference(...minus))/(2*h)*1000;});
    assert.ok(Math.abs(actual.potential/v-1)<.03);
    assert.ok(Math.abs(actual.field/Math.hypot(...gradient)-1)<.07);
  }
});
test('gallery Worker builds complete top and side comparisons with guarded samples',async()=>{
  const originalFetch=globalThis.fetch,originalSelf=globalThis.self;
  let result;
  globalThis.fetch=async()=>({ok:true,json:async()=>data});
  globalThis.self={postMessage:value=>{result=value;}};
  try {
    await import('../src/lib/cortex/gallery-worker.js');
    await self.onmessage({data:{id:1,cards:Object.keys(data.shapes).map(shape=>({shape,diameter:50})),plane:'top',height:10}});
    assert.equal(result.id,1);assert.equal(result.maps.length,4);
    for(const map of result.maps){assert.equal(map.values.length,65**2);assert.ok(map.values.every(v=>v&&Number.isFinite(v.potential)&&v.field>0));}
    await self.onmessage({data:{id:2,cards:[25,50,100].map(diameter=>({shape:'ring',diameter})),plane:'side',height:10}});
    assert.equal(result.id,2);assert.equal(result.maps.length,3);
    for(const map of result.maps){assert.ok(map.values.some(v=>v===null));assert.ok(map.values.some(v=>v&&v.potential>0));}
  }finally{globalThis.fetch=originalFetch;globalThis.self=originalSelf;}
});
