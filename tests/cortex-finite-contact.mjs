import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {loadFiniteContact,finiteTransfer,prepareFiniteNodes,finiteCellConfig,DISK_CENTER_UM} from '../src/lib/cortex/finite-contact.js';
import {loadActiveModel} from '../src/lib/cortex/model-library.js';
import {makeWorld} from '../src/lib/cortex/world.js';
import {runFiniteExperiment as runExperiment} from '../src/lib/cortex/finite-experiment.js';
import {createPassiveCable,stepPassiveCable} from '../src/lib/cortex/passive-cable.js';
const read=p=>readFile(new URL('../public'+p,import.meta.url));
const field=await loadFiniteContact(read);
const id='allen-human-601927090/1';
await loadActiveModel(id,40,read);
const config=finiteCellConfig(id);
test('finite disk units, sign, axisymmetry, guard and whole-cell classification',()=>{
  const a=finiteTransfer(field,[0,0,1100]);
  const analytic=Math.atan(25/100)/(2*Math.PI*0.3*25e-6)*1e-3;
  assert.ok(Math.abs(a/analytic-1)<.01);
  assert.equal(finiteTransfer(field,[100,0,1100]),finiteTransfer(field,[0,100,1100]));
  assert.equal(finiteTransfer(field,[0,0,1300]),null);
  const w=makeWorld(config), prepared=prepareFiniteNodes(field,w.neuron.nodes,config);
  assert.equal(prepared.supported,true,JSON.stringify(prepared.issues.slice(0,2)));
  assert.equal(prepared.unitFieldMv.length,w.neuron.nodes.length);
  const bad=structuredClone(w.neuron.nodes);
  bad[0].pathUm=[[0,0,1100],[0,0,990],[0,0,1100]];
  assert.equal(prepareFiniteNodes(field,bad,config).supported,false);
  assert.equal(prepareFiniteNodes(field,w.neuron.nodes,config,[0,0,1200]).supported,false);
  assert.throws(()=>prepareFiniteNodes(field,w.neuron.nodes,{...config,tissue:{conductivitySPerM:0.4}}),/0.3/);
});
test('finite forcing through passive cable preserves gauge and polarity',()=>{
  const nodes=[{id:'a',parent:-1,areaUm2:100,lengthUm:10,diameterUm:2,centerUm:[0,0,1050]},
    {id:'b',parent:0,areaUm2:100,lengthUm:10,diameterUm:2,centerUm:[0,0,1100]}];
  const membrane={capacitanceUfPerCm2:1,resistanceOhmCm2:20000,axialResistivityOhmCm:150,restMv:-65};
  function run(sign,gauge=0){const c=createPassiveCable(nodes,membrane);const ve=Float64Array.from(nodes,n=>sign*finiteTransfer(field,n.centerUm)+gauge);for(let i=0;i<20;i++)stepPassiveCable(c,.005,{extracellularMv:ve});return c.voltageMv;}
  const plus=run(1),minus=run(-1),shift=run(1,20);
  for(let i=0;i<2;i++){assert.ok(Math.abs(plus[i]-shift[i])<1e-10);assert.ok(Math.abs(plus[i]+minus[i]+130)<1e-10);}
  assert.ok(plus[0]<-65 && plus[1]>-65);
});
test('human model receives finite field, emits replay and disables incompatible recordings',()=>{
  const result=runExperiment(config,()=>{},{field});
  assert.equal(result.fieldModel.model,'cortex-finite-disk/1');
  assert.deepEqual(result.fieldModel.centerUm,DISK_CENTER_UM);
  assert.ok(result.membraneMv.every(Number.isFinite));
  assert.ok(result.neuralUv.every(a=>a.every(Number.isNaN)));
  assert.ok(result.appliedUv.every(a=>a.every(Number.isNaN)));
  assert.ok(result.differentialUv.every(Number.isNaN));
  assert.ok(result.drive.some(v=>v<0)&&result.drive.some(v=>v>0));
  assert.ok(result.diagnostics.maxExcursionMv>0);
  assert.throws(()=>runExperiment(config),/Load the finite disk field/);
});
test('finite worker loads assets, transfers replay, and drops stale async loads',async()=>{
  const w=new Worker(new URL('./fixtures/cortex-finite-worker-adapter.mjs',import.meta.url),{workerData:{delayMs:20}});
  try{
    const reply=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Finite worker timed out')),60000);
      w.on('error',e=>{clearTimeout(timer);reject(e);});
      w.on('message',m=>{if(m.id!==2){clearTimeout(timer);reject(Error('Stale request emitted a message'));}if(m.type==='error'||m.type==='result'){clearTimeout(timer);resolve(m);}});
      w.postMessage({id:1,config});w.postMessage({id:2,config});
    });
    assert.equal(reply.type,'result',reply.message);
    assert.ok(reply.result.membraneMv instanceof Float64Array);
    assert.ok(reply.result.unitAppliedMvPerUa.every(Number.isFinite));
  }finally{await w.terminate();}
});
test('finite worker reports unavailable field asset without simulation output',async()=>{
  const w=new Worker(new URL('./fixtures/cortex-finite-worker-adapter.mjs',import.meta.url),{workerData:{fail:true}});
  try{
    const reply=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Worker timed out')),10000);
      w.on('error',e=>{clearTimeout(timer);reject(e);});
      w.on('message',m=>{clearTimeout(timer);resolve(m);});w.postMessage({id:1,config});
    });
    assert.equal(reply.type,'error');assert.equal(reply.result,undefined);
  }finally{await w.terminate();}
});
