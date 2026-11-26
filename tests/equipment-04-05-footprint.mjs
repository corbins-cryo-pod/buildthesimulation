import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createStation,compare,exportChart} from '../public/equipment/04-05/footprint.mjs';
test('geometric chart fit and named actions',()=>{
 const s=createStation();assert.deepEqual(s.read().signedSideMarginsMm,[55,25]);
 assert.equal(s.hit('Chart_rotate_key').contained,false);assert.deepEqual(s.read().signedSideMarginsMm,[-75,155]);
 assert.equal(s.hit('Chart_frame_key').contained,true);assert.deepEqual(s.read().signedSideMarginsMm,[75,155]);
 assert.throws(()=>compare('narrow',30),RangeError);assert.equal(s.dispatch('setFrame','unknown').frame,'wide');
 assert.equal(exportChart(s.read()).comparison.revision,'1');assert.equal(exportChart(s.read()).units,'mm');
});
test('exact geometry evidence and loadable small GLB',()=>{
 const v=JSON.parse(readFileSync(new URL('../public/equipment/04-05/verification.json',import.meta.url)));
 const b=readFileSync(new URL('../public/equipment/04-05/diener-nano.glb',import.meta.url));
 assert.equal(v.checks.length,10);assert.ok(v.checks.every(v=>v.pass));assert.equal(b.subarray(0,4).toString(),'glTF');assert.ok(b.length<45000);
});
