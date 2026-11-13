import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {publishedStage2,stage2StudyStatus,STAGE2_STUDY_FILES,STAGE2_ADDITIONAL_EVIDENCE} from '../src/lib/axon-interface-stage2-publication.mjs';

const directory='docs/axon-interface/stage2';
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage2-publication-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  put('physics.mjs','export const conductivity = 1;');put('publication.mjs','release schema');put('raw-field.json',{residual:1e-12});
  const sourceHashes={'physics.mjs':hash('physics.mjs')};
  const report={completeStage2:true,modelVersion:'test',openReleaseGates:[],sourceHashes:{'publication.mjs':hash('publication.mjs')},studies:{},evidenceFiles:{}};
  for(const [name,file] of Object.entries(STAGE2_STUDY_FILES)){
    const relative=`${directory}/${file}`;
    put(relative,{complete:true,passed:true,sourceHashes,rows:[{pass:true}],
      ...(name==='nested-default'?{runFiles:[{path:'raw-field.json',sha256:hash('raw-field.json')}]}:{})});
    report.studies[name]={sha256:hash(relative)};report.evidenceFiles[relative]=hash(relative);
  }
  for(const [name,file] of Object.entries(STAGE2_ADDITIONAL_EVIDENCE)){
    put(file,{complete:true,passed:true,hosted:true,modelVersion:'test',sourceHashes,
      ...(name==='components'?{requiredPass:65,requiredFail:0}:{})});report.evidenceFiles[file]=hash(file);
  }
  put(`${directory}/validation.json`,report);
  return {root,put,report,read:()=>publishedStage2({root})};
}
test('Published qualification requires all sealed passing studies and current sources',t=>{
  const f=fixture(t),r=f.read();assert.equal(r.completeStage2,true);assert.equal(r.status,'qualified');
  assert.deepEqual(r.openReleaseGates,[]);assert.equal(stage2StudyStatus(r.surface),'Passed stated checks');
});
test('Editing a passing report after collection withdraws the published qualification',t=>{
  const f=fixture(t),file=`${directory}/surface-validation.json`,r=JSON.parse(fs.readFileSync(path.join(f.root,file)));
  r.rows.push({pass:true,name:'Uncollected evidence'});f.put(file,r);
  const published=f.read();assert.equal(published.completeStage2,false);assert.equal(published.surface.passed,true);
  assert.equal(stage2StudyStatus(published.surface),'Evidence changed / uncollected');
});
test('Changed per-study source is rejected even when the top-level manifest is unchanged',t=>{
  const f=fixture(t);f.put('physics.mjs','export const conductivity = 2;');const r=f.read();
  assert.equal(r.sourceVerification.current,true);assert.equal(r.completeStage2,false);
  assert.equal(stage2StudyStatus(r.surface),'Source changed / unverified');
});
test('Missing browser evidence and changed underlying field outputs cannot remain qualified',t=>{
  const f=fixture(t);fs.unlinkSync(path.join(f.root,STAGE2_ADDITIONAL_EVIDENCE.browser));
  f.put('raw-field.json',{residual:1e-3});const r=f.read();assert.equal(r.completeStage2,false);
  assert.equal(stage2StudyStatus(r.nestedDefault),'Evidence changed / uncollected');
  assert.ok(r.openReleaseGates.some(g=>g.startsWith('browser:')));
});
test('Legacy manifests without evidence hashes remain explicitly unverified',t=>{
  const f=fixture(t);delete f.report.evidenceFiles;f.put(`${directory}/validation.json`,f.report);
  const r=f.read();assert.equal(r.completeStage2,false);assert.equal(stage2StudyStatus(r.surface),'Evidence changed / uncollected');
});
