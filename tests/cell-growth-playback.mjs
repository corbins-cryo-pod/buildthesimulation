import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,stepSimulation,serializeSimulation} from '../src/lib/cell-growth/engine.js';
import {playbackStep} from '../src/lib/cell-growth/playback.js';
import {Worker} from 'node:worker_threads';

test('slow viewing extends frame duration without reducing the physics timestep',()=>{
 assert.deepEqual(playbackStep(.05,.005,10),{hours:.05,frameDuration:1400});
 assert.deepEqual(playbackStep(.05,.025,10),{hours:.05,frameDuration:280});
 assert.deepEqual(playbackStep(.05,.1,10),{hours:.1,frameDuration:140});
 assert.deepEqual(playbackStep(.05,.5,10),{hours:.5,frameDuration:140});
 assert.equal(playbackStep(.05,.5,.02).hours,.02);
});

test('all four playback choices preserve the same full seeded morphology and random state',()=>{
 const initial=createSimulation({source:'immature',cellCount:1,seed:101,branching:2});stepSimulation(initial,12);
 const expected=serializeSimulation(initial);stepSimulation(expected,2);
 for(const speed of [.005,.025,.1,.5]){
  const actual=serializeSimulation(initial);
  while(actual.timeHours<14-1e-8)stepSimulation(actual,playbackStep(actual.config.dtHours,speed,14-actual.timeHours).hours);
  assert.deepEqual(actual,expected,`speed ${speed} must not change the experiment`);
 }
});

test('the actual worker pauses slow playback at a complete state and exports/restores it',async()=>{
 const moduleUrl=new URL('../src/lib/cell-growth/worker.js',import.meta.url).href;
 const worker=new Worker(`
  const {parentPort}=require('node:worker_threads');
  global.self={postMessage:message=>parentPort.postMessage(message)};
  import(${JSON.stringify(moduleUrl)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));
 `,{eval:true});
 const receive=predicate=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{worker.off('message',listener);reject(new Error('Worker message timed out'));},10000);
  const listener=data=>{if(data.type==='error'){clearTimeout(timer);worker.off('message',listener);reject(new Error(data.message));}else if(predicate(data)){clearTimeout(timer);worker.off('message',listener);resolve(data);}};
  worker.on('message',listener);
 });
 const request=async(message,predicate)=>{const response=receive(predicate);worker.postMessage(message);return response;};
 try{
  const initial=await request({type:'init',config:{source:'immature',cellCount:1,seed:101}},d=>d.type==='state');
  const frame=await request({type:'play',speed:.005,until:1},d=>d.type==='state'&&d.playing);
  assert.equal(frame.state.timeHours,.05);assert.equal(frame.frameDuration,1400);
  const paused=await request({type:'pause'},d=>d.type==='state'&&!d.playing);
  assert.deepEqual(paused.state,frame.state);
  const saved=await request({type:'export',format:'json'},d=>d.type==='export');
  assert.deepEqual(JSON.parse(saved.content),paused.state);
  const assay=await request({type:'transmission',cellId:0},d=>d.type==='transmission');
  assert.ok(assay.reference.spikes.length>0);assert.equal(assay.blocked.transmission,false);
  const afterAssay=await request({type:'export',format:'json'},d=>d.type==='export');
  assert.deepEqual(JSON.parse(afterAssay.content),paused.state,'electrical testing must preserve the worker growth state');
  const csv=await request({type:'export',format:'csv'},d=>d.type==='export');
  assert.match(csv.content,/timeHours,totalAxonLength,totalDendriteLength/);
  const swc=await request({type:'export',format:'swc',cellId:0},d=>d.type==='export');
  assert.ok(swc.content.split('\n').filter(line=>line&&!line.startsWith('#')).every(line=>line.trim().split(/\s+/).length===7));
  const restored=await request({type:'restore',document:JSON.stringify(initial.state)},d=>d.type==='state'&&d.restored);
  assert.deepEqual(restored.state,initial.state);assert.equal(restored.playing,false);
 }finally{await worker.terminate();}
});
