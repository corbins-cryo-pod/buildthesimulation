import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CLEANROOM_MODELS, CLEANROOM_MODEL_SUMMARY, getCleanroomModel, sampleCleanroomPose } from '../public/simulations/foundry/cleanroom-models.js';
import { stageForLab } from '../public/simulations/foundry/cleanroom-data.js';
import { phaseIndex, reducedPose, displayElapsed, registerMotion } from '../public/simulations/foundry/cleanroom-player.js';

test('Register animation fits the actual model and deliberately rejects mismatched specimens', () => {
  assert.equal(CLEANROOM_MODEL_SUMMARY.register,199);
  for(const m of Object.values(CLEANROOM_MODELS)){
    if(m.assetUrl)assert.ok(existsSync(new URL('..'+('/public'+m.assetUrl),import.meta.url)),m.assetUrl);
  }
  const deep=getCleanroomModel('04-03');
  assert.equal(sampleCleanroomPose(deep,.8,{diameterMm:200}).status,'incompatible');
  const seated=sampleCleanroomPose(deep,1,{diameterMm:150});
  assert.equal(seated.status,'match');
  assert.equal(seated.seated,true);
  assert.deepEqual(seated.position,[0,1.169,.02]);
  assert.equal(sampleCleanroomPose('02-03',1,{shape:'round',sizeMm:100}).visible,false);
});

test('Playback seats before setup/run and returns along the loading path', () => {
  assert.deepEqual([0,.2,.4,.65,.9].map(phaseIndex),[0,1,2,3,4]);
  assert.deepEqual([0,.32,.54,.81,1].map(registerMotion),[0,1,1,1,0]);
});

test('Specimen custody retains the authored branch before and after transformation', () => {
  for(const [route,count] of [['neuropixels-foundry',20],['masmanidis-64d-foundry',18],['graphene-stack-compare',12]]){
    for(const branch of route==='graphene-stack-compare'?['clear','delft']:[undefined]){
      const rows=Array.from({length:count},(_,i)=>stageForLab(route,i,{branch}));
      assert.ok(rows.every(s=>s.before&&s.after&&s.settings.length>0));
      for(let i=1;i<rows.length;i++)assert.equal(rows[i].before,rows[i-1].after,route+':'+i);
    }
  }
  assert.equal(stageForLab('neuropixels-foundry',17).outgoingShape,'assembly');
  assert.equal(stageForLab('neuropixels-family',0).workpieceShape,'none');
  assert.equal(stageForLab('rolled-microchannels-foundry',6,{phaseId:'roll-openQC'}).kind,'inspection');
});


test('display time cannot skip a phase on a cold frame or in short reduced-motion timing', () => {
  assert.deepEqual([0,.2,.4,.65,.9].map(reducedPose),[0,.244,.445,.742,1]);
  assert.equal(displayElapsed(2700,7000),280);
  assert.equal(displayElapsed(2700,850,2),102);
  assert.equal(displayElapsed(16,7000,2),32);
});
