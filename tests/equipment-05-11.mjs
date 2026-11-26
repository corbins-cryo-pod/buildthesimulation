import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {proof} from '../scripts/equipment/05-11/verify.mjs';
import {fft,state,act,analyze} from '../public/equipment/05-11/solver.mjs';
const base=new URL('../public/equipment/05-11/',import.meta.url);
test('FTIR ratio, independent DFT/magnitudes, OPD bounds, blank, window, fixture and nominal geometry',()=>{const r=proof();r.report.cases.forEach(c=>assert.equal(c.outcome,'PASS',JSON.stringify(c)));assert.deepEqual(r.report,JSON.parse(fs.readFileSync(new URL('verification.json',base))))});
test('Forward/inverse complex FFT preserves arbitrary finite signal',()=>{const x=[.11,.2,.3,2,-3,-2,-1.1,4],f=fft(x),b=fft(f.re,f.im,true);x.forEach((v,i)=>assert.ok(Math.abs(b.re[i]-v)<1e-12));});
test('Load/unload and empty/filled crystal constraints',()=>{const s=state();assert.throws(()=>act(s,'clamp'));act(s,'background');act(s,'load','PS');assert.throws(()=>act(s,'background'));act(s,'clamp');act(s,'acquire');assert.equal(s.result.matches[0].key,'PS');assert.throws(()=>act(s,'load','PE'));assert.equal(s.result,null);act(s,'clamp');act(s,'load','PE');act(s,'clamp');assert.equal(act(s,'acquire').matches[0].key,'PE')});
test('Input validation and direct import preserve ratio and provenance',()=>{const f=JSON.parse(fs.readFileSync(new URL('decade-example.json',base)));const x=act(state(),'import',f);assert.match(x.provenance.source.processingMode,/FFT bypassed/);f.rows[5].background=0;assert.throws(()=>analyze(f),/positive/);});
