import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {initial,dispatch,rawZ,correctedZ,measure,toCsv} from '../public/equipment/09-07/solver.mjs';
const p=new URL('../public/equipment/09-07/',import.meta.url);
const fixture=JSON.parse(readFileSync(new URL('acceptance.json',p)));
const step=(s,a,v)=>{const q=dispatch(s,a,v);assert.equal(q.ok,true,q.message);return q.state;};
const snap=(s)=>{const q=measure(s);assert.equal(q.ok,true,q.message);return q.result;};
const initialState=initial(), std=step(step(step(initialState,'record-standard'),'mount','short'),'record-standard');
const mount=step(std,'mount','dut'), s=step(mount,'toggle-correction');
const corrected=snap(s);
const plain=step(s,'dut',{resistanceOhm:0}), bare100=rawZ(100,plain.fixture,'dut',plain.dut);
const open=rawZ(1000,s.fixture,'open',s.dut);
const rawWithoutESR=bare100[1];
const corner=snap(step(s,'dut',{resistanceOhm:1000,capacitancePf:159154.943})).rows[1];
const pDut=snap(step(s,'dut',{topology:'parallel-rc',resistanceOhm:10000})).rows[3];
const res=snap(step(s,'dut',{topology:'r',resistanceOhm:1000})).rows[3];
const higher=snap(step(s,'test-voltage',.4));
const cases={
 short:rawZ(1000,s.fixture,'short',s.dut)[0], 'open-phase':Math.atan2(open[1],open[0]-15)*180/Math.PI,
 'near-corner':corner.impedance.phaseDeg,'series-c':corrected.rows[3].impedance.seriesCapacitancePf,
 'fixture-raw-c':-1e12/(2*Math.PI*100*rawWithoutESR),'series-r':corrected.rows[3].impedance.seriesResistanceOhm,
 'parallel-c':pDut.impedance.parallelCapacitancePf,resistor:res.impedance.realOhm,
 'voltage-ratio':higher.rows[2].fixtureInputCurrentRmsA/corrected.rows[2].fixtureInputCurrentRmsA,
 'missing-standard':measure(step(step(initialState,'mount','dut'),'toggle-correction')).code,
 'stale-standard':measure(step(s,'fixture',{shuntPf:120})).code
};
const rows=fixture.cases.map(i=>{const actual=cases[i.id],pass=i.tolerance===undefined?i.expected===actual:Math.abs(i.expected-actual)<=i.tolerance;return {...i,actual,pass};});
for(const t of rows)test(t.id,()=>assert.equal(t.pass,true,JSON.stringify(t)));
test('zero shunt witness is represented by null, not invalid JSON',()=>{
 assert.equal(rawZ(1000,{seriesOhm:0,shuntPf:0},'open',s.dut),null);
 const corrected=correctedZ([0,-100],null,[0,0]);
 assert.ok(Math.abs(corrected[1]+100)<1e-12);
});
test('invalid fixture, grid, voltage and mount sequence rejected',()=>{
 assert.equal(dispatch(s,'fixture',{seriesOhm:-.1}).code,'fixture');
 assert.equal(dispatch(s,'grid',[100,100]).code,'grid');
 assert.equal(dispatch(s,'test-voltage',1.1).code,'voltage');
 assert.equal(dispatch(s,'record-standard').code,'mount-standard');
});
test('export identifies Hz, signed impedance and calibration lineage',()=>{
 assert.equal(corrected.schema,'bts.impedance-sweep.v1');assert.equal(corrected.sampleId,s.dut.id);
 assert.equal(corrected.correction.openRevision,1);assert.equal(corrected.correction.shortRevision,2);
 assert.ok(toCsv(corrected).startsWith('frequency_Hz,raw_real_ohm,raw_imag_ohm'));
 assert.deepEqual(higher.rows[2].impedance,corrected.rows[2].impedance);
});
if(process.env.REFRESH_0907==='1'){
 writeFileSync(new URL('verification.json',p),JSON.stringify({origin:fixture.origin,rows},null,2)+'\n');
 writeFileSync(new URL('example-impedance.json',p),JSON.stringify(corrected,null,2)+'\n');
}
