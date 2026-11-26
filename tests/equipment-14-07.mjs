import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {initial,trace,fixture,replay,dispatch,toCsv} from '../public/equipment/14-07/solver.mjs';
const dir=new URL('../public/equipment/14-07/',import.meta.url),r=x=>JSON.parse(readFileSync(new URL(x,dir))),w=(x,v)=>writeFileSync(new URL(x,dir),JSON.stringify(v,null,2)+'\n');
const i=initial(),run=x=>{const v=replay(x);assert.equal(v.ok,true,v.message);return v.result;};
const g=run(i),n=run({...i,record:fixture('net'),taredMg:null}),blank=fixture('gross',true);
const a={'gross-initial':g.initialMg,'gross-final':g.terminalMg,'gross-retained':g.terminalPercent,'net-retained':n.terminalPercent,loss:g.removedMg,'net-ignore-tare':run({...i,record:fixture('net'),taredMg:100}).terminalPercent,'blank-corrected':run({...i,record:blank}).terminalPercent,'blank-ignored':run({...i,record:blank,applyBlank:false}).terminalPercent,'missing-tare':replay({...i,taredMg:null}).code};
const f=r('acceptance.json'),rows=f.cases.map(v=>({...v,actual:a[v.id],pass:v.tolerance===undefined?v.expected===a[v.id]:Math.abs(v.expected-a[v.id])<=v.tolerance}));
for(const t of rows)test(t.id,()=>assert.ok(t.pass,JSON.stringify(t)));
test('instrument state guards and empty-pan retare preserve sample identity',()=>{
 assert.equal(dispatch(i,'tare').code,'open');let s=dispatch(i,'chamber').state;assert.equal(dispatch(s,'tare').code,'tare');
 s=dispatch(s,'load').state;s=dispatch(s,'tare').state;assert.equal(s.taredMg,2);s=dispatch(s,'load').state;s=dispatch(s,'chamber').state;assert.equal(run(s).sampleId,g.sampleId);
});
test('invalid order and negative corrected readings fail',()=>{
 const v=fixture();v.points[1].timeS=v.points[0].timeS;assert.equal(trace(v).code,'series');assert.equal(replay({...i,taredMg:22}).code,'mass');
});
test('gross/net all points preserve both units and exact curve',()=>{
 assert.deepEqual(g.rows.map(x=>x.correctedMg),n.rows.map(x=>x.correctedMg));
 assert.equal(g.panId,'Q50-VIRTUAL-PAN-01');assert.equal(g.units.temperatureC,'°C');assert.ok(toCsv(g).includes('time_s,temperature_C'));
});
if(process.env.REFRESH_1407==='1'){w('verification.json',{scope:f.scope,rows});w('example-gross.json',i.record);w('example-net.json',fixture('net'));w('example-replay.json',g);}
