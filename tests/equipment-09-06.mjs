import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {capture,initial,dispatch,display,toCsv} from '../public/equipment/09-06/solver.mjs';
const dir = new URL('../public/equipment/09-06/',import.meta.url);
const suite=JSON.parse(readFileSync(new URL('acceptance.json',dir)));
function state(s,a,p){const r=dispatch(s,a,p);assert.equal(r.ok,true,r.message);return r.state}
const demo=state(initial(),'load-example');
const run=s=>{const r=capture(s);assert.equal(r.ok,true,r.message);return r.result};
const base=run(demo), matched=base.channels[0];
const open=run(state(demo,'configure',{loadOhms:null})).channels[0];
const r75=run(state(demo,'configure',{loadOhms:75})).channels[0];
const ref=state(demo,'configure',{referenceOhms:null});
const entries={
 match:matched.metrics.sampledVpp,open:open.metrics.sampledVpp,power:matched.metrics.powerW,period:open.events[1].timeS-open.events[0].timeS,
 '75ohm':r75.metrics.sampledVpp,'reference-change':display(ref.channels[0]).amplitudeVpp,
 'quarter-duty':run(state(demo,'configure',{function:'square',loadOhms:null,dutyPct:25})).channels[0].metrics.meanV,
 'bad-headroom':dispatch(demo,'configure',{referenceOhms:null,amplitudeVpp:20,offsetV:1}).code,
 'bad-grid':capture(state(demo,'clock',{clockHz:10000,durationS:.032})).code,
 'output-off':capture(initial()).code
};
const rows=suite.cases.map(x=>{const actual=entries[x.id],pass=x.tolerance===undefined?actual===x.expected:Math.abs(actual-x.expected)<=x.tolerance;return {...x,actual,pass}});
for(const r of rows) test(r.id,()=>assert.equal(r.pass,true,JSON.stringify(r)));
test('case changes only how front panel is scaled',()=>assert.deepEqual(run(ref).channels[0].samples,matched.samples));
test('null instead of Infinity survives analog JSON',()=>{const x=JSON.parse(JSON.stringify(base));assert.equal(x.schema,'bts.analog-waveform.v1');assert.equal(x.channels[0].samples.length,8192);assert.equal(x.dtS,1/256000);assert.ok(toCsv(x).startsWith('time_s,CH1_V\n0,0\n'));});
test('trigger timestamp and guarded invalid action',()=>{assert.equal(matched.events[0].timeS,0);assert.equal(matched.events[1].timeS,.001);assert.equal(dispatch(initial(),'step-frequency',3).ok,false);assert.equal(dispatch(demo,'bogus').code,'action');});
test('two independently enabled outputs use same sample clock',()=>{const second=state(state(demo,'focus',1),'toggle-output',1);const trial=run(second);assert.equal(trial.channels[1].id,'CH2');assert.equal(trial.channels[1].samples.length,trial.channels[0].samples.length);});
if(process.env.REFRESH_0906==='1'){
 writeFileSync(new URL('verification.json',dir),JSON.stringify({origin:suite.origin,rows},null,2)+'\n');
 writeFileSync(new URL('example-waveform.json',dir),JSON.stringify(base)+'\n');
}
