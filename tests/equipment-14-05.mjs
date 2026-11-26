import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {report} from '../scripts/equipment/14-05/verify.mjs';
import {state,act,ORACLE,csv} from '../public/equipment/14-05/solver.mjs';
test('independent Hertz reference and position-preserving map',()=>{const a=report();assert.ok(a.evidence.cases.every(t=>t.pass));assert.deepEqual(a.evidence,JSON.parse(fs.readFileSync(new URL('../public/equipment/14-05/verification.json',import.meta.url))))});
test('approach/motion interlocks and out-of-domain guard',()=>{const s=state();assert.throws(()=>act(s,'acquire'));act(s,'approach');assert.throws(()=>act(s,'site',1));const r=act(s,'acquire');assert.match(csv(r),/apparent_Estar_Pa/);act(s,'depth',4e-6);assert.throws(()=>act(s,'acquire'),/10%/);assert.equal(s.result,null);act(s,'approach');act(s,'load');assert.throws(()=>act(s,'map'))});
