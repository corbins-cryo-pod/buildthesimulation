import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
import {initial,dispatch,measure,preset,toCsv,parseFixture} from '../public/equipment/09-02/solver.mjs';
const dir=new URL('../public/equipment/09-02/',import.meta.url), base=initial(), fixed=JSON.parse(readFileSync(new URL('acceptance.json',dir)));
const run=s=>{const v=measure(s);assert.equal(v.ok,true,v.message);return v.result;};
const r=run(base), cap={...base,mode:'CV',fixture:preset('capacitor'),startV:-1,stopV:1,points:5}, c=run(cap), cf=run({...cap,frequencyHz:100000});
const get=(out,v)=>out.points.find(p=>Math.abs(p.commandV-v)<1e-10);
const actual={
 'ohm-below':get(r,.1).currentA,'ohm-negative':get(r,-.2).currentA,'limit-current':get(r,.4).currentA,'limit-terminal':get(r,.4).terminalV,'limit-flag':get(r,.4).flag,'limit-inverse':get(r,-.4).terminalV,
 'ohm-controls':get(run({...base,fixture:preset('resistor',2000)}),.4).currentA,
 'cv-level':c.points[0].capacitanceF,'cv-flat':Math.max(...c.points.map(p=>p.capacitanceF))-Math.min(...c.points.map(p=>p.capacitanceF)),
 'cap-susceptance':get(c,0).susceptanceS,'cap-current':get(c,0).acCurrentArms,'cap-frequency-response':get(cf,0).acCurrentArms/get(c,0).acCurrentArms,
 'probe-open':measure({...base,probeDown:false}).code,'wrong-fixture':measure({...cap,fixture:preset()}).code};
const rows=fixed.cases.map(q=>({...q,actual:actual[q.id],pass:q.tolerance===undefined?actual[q.id]===q.expect:Math.abs(actual[q.id]-q.expect)<=q.tolerance}));
for(const row of rows)test(row.id,()=>assert.equal(row.pass,true,JSON.stringify(row)));
test('lowering an unwired fixture and operating standby cannot measure',()=>{assert.equal(dispatch({...base,wired:false},'seat').code,'not-wired');assert.equal(dispatch({...base,power:false},'run').code,'standby');});
test('range guards and compliance count',()=>{assert.equal(r.complianceCount,4);assert.equal(measure({...base,stopV:2}).code,'sweep');assert.equal(measure({...cap,signalVrms:.2}).code,'ac-signal');assert.equal(measure({...base,complianceA:.0000001}).code,'compliance');});
test('no compliance is claimed exactly at ± current limit; descending command preserved',()=>{const b=run({...base,startV:.25,stopV:-.25,points:3});assert.deepEqual(b.points.map(p=>p.flag),['OK','OK','OK']);assert.deepEqual(b.points.map(p=>p.terminalV),[.25,0,-.25]);});
test('fixture IDs, prior revisions and typed contacts survive CSV/JSON export',()=>{const t={...preset(),sampleId:'CORBIN-CAL',revision:5,contacts:[{id:'B_CONTACT',role:'LO'},{id:'A_CONTACT',role:'HI'}]};const s=dispatch(base,'import',t).state;assert.equal(s.probeDown,false);const out=run({...s,probeDown:true,sequence:9});assert.equal(out.parent.revision,5);assert.equal(out.revision,10);assert.ok(toCsv(out).includes('CORBIN-CAL,5,CORBIN-CAL-IV-10,10,simulated,B1517A HRSMU,A_CONTACT,B_CONTACT'));assert.equal(parseFixture({...t,contacts:[t.contacts[0],t.contacts[0]]}).code,'contacts');});
if(process.env.REFRESH_0902==='1'){
 for(const [f,d] of Object.entries({'verification.json':{evidence:fixed.evidence,rows},'resistor-coupon.json':preset(),'capacitor-coupon.json':preset('capacitor'),'example-iv.json':r,'example-cv.json':c}))writeFileSync(new URL(f,dir),JSON.stringify(d,null,2)+'\n');
}
