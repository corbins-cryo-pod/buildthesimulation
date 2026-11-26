/** Run with optional SR560 fixture path, defaulting to the integrated repository. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial,dispatch} from '../../../public/equipment/09-05/solver.mjs';
const waveform=JSON.parse(readFileSync(process.argv[2]??'public/equipment/09-10/example-preamp-waveform.json','utf8'));
const route=dispatch(initial(),'import',waveform);assert.equal(route.ok,true,route.message);
const setting=dispatch(route.state,'set',{vDiv:.5,msDiv:.2,levelV:0});assert.equal(setting.ok,true,setting.message);
const scan=dispatch(setting.state,'sweep');assert.equal(scan.ok,true,scan.message);
const r=scan.result;assert.equal(r.outcome,'triggered');
assert.ok(Math.abs(r.summary.visibleDivisions-4)<1e-8);
assert.ok(Math.abs(r.summary.estimatedPeriodS-.001)<1e-10);
assert.equal(r.summary.clipped,false);
console.log(JSON.stringify({classification:'Simulated data handoff from actual SR560 fixture; no hardware measurements',parent:r.parent,settings:r.settings,summary:r.summary},null,2));
