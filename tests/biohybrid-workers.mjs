import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {setImmediate as nextEventLoopTurn} from 'node:timers/promises';

function harness(module){
  const worker=new Worker(new URL('./helpers/biohybrid-worker-harness.mjs',import.meta.url),{workerData:{module}});
  const messages=[],waiters=[];let failure=null,exitCode=null;
  const rejectWaiters=error=>{for(const waiter of waiters.splice(0))waiter.reject(error);};
  worker.on('message',message=>{
    messages.push(message);
    for(let i=waiters.length-1;i>=0;i--)if(waiters[i].predicate(message)){
      const [waiter]=waiters.splice(i,1);waiter.resolve(message);
    }
  });
  worker.on('error',error=>{failure=error;rejectWaiters(error);});
  worker.on('exit',code=>{exitCode=code;rejectWaiters(new Error(`Worker exited (${code}) before the requested message.`));});
  const waitFor=predicate=>{
    const existing=messages.find(predicate);if(existing)return Promise.resolve(existing);
    if(failure)return Promise.reject(failure);
    if(exitCode!==null)return Promise.reject(new Error(`Worker has exited (${exitCode}).`));
    return new Promise((resolve,reject)=>waiters.push({predicate,resolve,reject}));
  };
  return {worker,messages,waitFor,get exitCode(){return exitCode;}};
}

test('biohybrid workers: real transfer preserves source arrays, request identity and the original recording', {timeout:30000}, async()=>{
  const transport=harness('worker.js');
  try{
    await transport.waitFor(message=>message.__harness==='ready');
    const id='source-transport';transport.worker.postMessage({id,settings:{}});
    const message=await transport.waitFor(message=>message.id===id&&message.type==='result');
    const transfer=await transport.waitFor(message=>message.id===id&&message.__harness==='transfer');
    const result=message.result;
    assert.equal(result.metrics.recruitedHosts,3);
    assert.equal(result.metrics.recordingPeakToPeakUv[1],9.745329941385737);
    assert.ok(result.timeMs instanceof Float64Array);
    assert.ok(result.voltageMv instanceof Float32Array);
    assert.equal(result.timeMs.length,801);
    assert.equal(transfer.transferredBufferCount,3+result.traces.length+result.recordings.length*5);
    assert.equal(transfer.allTransferredBuffersDetached,true);
    assert.equal(transfer.populationSourceBufferCount,6);
    assert.equal(transfer.allPopulationSourceBuffersDetached,true);
    for(const recording of result.recordings){
      for(const key of ['graftUv','hostUv','neuralUv','artifactUv','totalUv']){
        assert.ok(recording[key] instanceof Float64Array,`${recording.id}.${key}`);
        assert.equal(recording[key].length,result.timeMs.length);
        assert.ok(recording[key].every(Number.isFinite));
      }
      for(let frame=0;frame<result.timeMs.length;frame++){
        assert.ok(Math.abs(recording.neuralUv[frame]-recording.graftUv[frame]-recording.hostUv[frame])<1e-10);
        assert.equal(recording.totalUv[frame],recording.neuralUv[frame]+recording.artifactUv[frame]);
      }
    }
    const progress=transport.messages.filter(item=>item.type==='progress');
    assert.ok(progress.length>1);
    assert.ok(progress.every(item=>item.id===id));
    assert.equal(progress.at(-1).progress,1);
    assert.equal(transport.messages.some(item=>item.type==='error'),false);
  }finally{await transport.worker.terminate();}
});

test('biohybrid workers: actual protocol worker delivers monotone progress and matched-control summaries', {timeout:30000}, async()=>{
  const transport=harness('protocol-worker.js');
  try{
    await transport.waitFor(message=>message.__harness==='ready');
    const id='protocol-transport';
    transport.worker.postMessage({id,baseSettings:{graftCount:1,hostCount:1,connectedHosts:1,pulseCount:1,durationMs:25},protocol:{kind:'causal'}});
    const {result}=await transport.waitFor(message=>message.id===id&&message.type==='result');
    assert.equal(result.protocol.kind,'causal');
    assert.equal(result.summary.totalRuns,3);
    assert.equal(result.summary.failedRuns,0);
    assert.equal(result.summary.allControlsQuiet,true);
    assert.equal(result.cases[0].comparison.lostHosts,1);
    assert.equal(result.cases[0].synapsesOff.settings.synapticWeightUs,0);
    const progress=transport.messages.filter(message=>message.type==='progress');
    assert.ok(progress.length>3);
    assert.equal(progress[0].progress,0);
    assert.equal(progress.at(-1).progress,1);
    assert.equal(progress.at(-1).completed,3);
    assert.ok(progress.every((message,index)=>message.id===id&&message.total===3&&Number.isFinite(message.progress)
      &&message.progress>=0&&message.progress<=1&&(index===0||message.progress>=progress[index-1].progress)));
    assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
  }finally{await transport.worker.terminate();}
});

test('biohybrid workers: invalid solver and protocol requests return identified errors without fabricated results', {timeout:30000}, async()=>{
  const scenarios=[
    {module:'worker.js',request:{id:'invalid-solver',settings:{dtMs:0}},pattern:/dtMs/},
    {module:'protocol-worker.js',request:{id:'invalid-protocol',baseSettings:{},protocol:{kind:'sweep',axis:'stimAmplitudeUa',values:[-12,-12]}},pattern:/unique/},
  ];
  for(const scenario of scenarios){
    const transport=harness(scenario.module);
    try{
      await transport.waitFor(message=>message.__harness==='ready');
      transport.worker.postMessage(scenario.request);
      const error=await transport.waitFor(message=>message.id===scenario.request.id&&message.type==='error');
      assert.match(error.message,scenario.pattern);
      assert.equal(transport.messages.some(message=>message.type==='result'),false);
    }finally{await transport.worker.terminate();}
  }
});

test('biohybrid workers: terminating a real running protocol prevents a late completed result', {timeout:30000}, async()=>{
  const transport=harness('protocol-worker.js');
  try{
    await transport.waitFor(message=>message.__harness==='ready');
    const id='cancelled-protocol';
    transport.worker.postMessage({id,baseSettings:{},protocol:{kind:'sweep',axis:'stimAmplitudeUa',values:[-6,-10,-14,-18,-22,-26,-30],paired:true}});
    // A positive fraction proves the actual cable solver has advanced. Wait
    // for this state transition, not an arbitrary wall-clock sleep.
    const progress=await transport.waitFor(message=>message.id===id&&message.type==='progress'&&message.progress>0);
    assert.equal(progress.total,14);
    assert.ok(progress.completed<progress.total&&progress.progress<1);
    await transport.worker.terminate();
    assert.notEqual(transport.exitCode,null);
    assert.equal(transport.messages.some(message=>message.id===id&&message.type==='result'),false);
    const deliveredAtExit=transport.messages.length;
    await nextEventLoopTurn();
    assert.equal(transport.messages.length,deliveredAtExit,'No messages may arrive after the terminated worker has exited.');
    assert.equal(transport.messages.some(message=>message.id===id&&message.type==='result'),false);
  }finally{await transport.worker.terminate();}
});
