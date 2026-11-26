import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {initial,dispatch,sweep,toCsv} from '../public/equipment/09-05/solver.mjs';
const dir=new URL('../public/equipment/09-05/',import.meta.url);
const suite=JSON.parse(readFileSync(new URL('acceptance.json',dir))),s=initial();
function run(q){const r=sweep(q);assert.equal(r.ok,true,r.message);return r.result;}
const cal=run(s),probe=run({...s,probe:10,levelV:.015});
const dc={schema:'bts.analog-waveform.v1',dtS:1/256000,sampleId:'DC-0V25',revision:3,channels:[{id:'A',unit:'V',samples:Array(8192).fill(.25)}]};
const ac=run({...s,input:'file',source:dc,mode:'AUTO',coupling:'AC'});
const armed=dispatch(s,'arm').state,one=sweep(armed);
const fixture={schema:'bts.analog-waveform.v1',dtS:1/256000,sampleId:'REGISTER-465B-2VPP-1KHZ',revision:1,channels:[{id:'A',unit:'V',samples:Array.from({length:8192},(_,i)=>Math.sin(2*Math.PI*i/256))}]};
const record=run({...s,input:'file',source:fixture,vDiv:1,msDiv:0.2,levelV:0});
const map={
 'record-vertical':record.summary.visibleDivisions,'record-horizontal':(1000*record.summary.estimatedPeriodS)/record.settings.msPerDivision,
 'cal-div':cal.summary.visibleDivisions,'cal-period':1000*cal.summary.estimatedPeriodS,'probe-division':probe.summary.visibleDivisions,'probe-scale':probe.settings.tipVoltsPerDivision,
 'screen-time':1000*cal.windowS,threshold:cal.thresholdSampleV,'ac-dc':ac.summary.inputBncVpp,'normal-blank':run({...s,levelV:.4}).outcome,
 'auto-free':run({...s,levelV:.4,mode:'AUTO'}).outcome,'single-repeat':run(one.state).outcome
};
const rows=suite.cases.map(x=>{const actual=map[x.id],pass=x.tolerance===undefined?actual===x.expected:Math.abs(x.expected-actual)<=x.tolerance;return {...x,actual,pass};});
for(const row of rows)test(row.id,()=>assert.equal(row.pass,true,JSON.stringify(row)));
test('falling and rising thresholds represent distinct phases',()=>{
 const fall=run({...s,slope:'falling'});
 assert.equal(fall.thresholdSampleV,.15);
 assert.ok(Math.abs((cal.triggerTimeS-fall.triggerTimeS)-.0005)<1e-10);
});
test('off-screen detection, window guard and power',()=>{
 assert.equal(run({...s,vDiv:.01}).summary.clipped,true);
 assert.equal(sweep({...s,input:'file',source:dc,msDiv:5}).code,'time-base');
 assert.equal(sweep({...s,power:false}).code,'standby');
});
test('export uses graticule coordinates, width and source lineage',()=>{
 const d=run({...s,input:'file',source:dc,mode:'AUTO'});
 assert.equal(d.schema,'bts.analog-trace.screen.v1');assert.equal(d.parent.sampleId,'DC-0V25');assert.equal(d.parent.revision,3);assert.equal(d.screen.at(-1).spotXDiv,10);
 assert.ok(toCsv(d).startsWith('time_since_sweep_s,x_div,y_div,bnc_input_V\n'));
 assert.equal(dispatch(s,'import',{}).code,'waveform');
});
if(process.env.REFRESH_0905==='1'){
 writeFileSync(new URL('verification.json',dir),JSON.stringify({origin:suite.origin,rows},null,2)+'\n');
 writeFileSync(new URL('example-beam-sweep.json',dir),JSON.stringify(cal)+'\n');
}
