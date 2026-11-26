import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {initial,dispatch,capture,response,toCsv} from '../public/equipment/09-10/solver.mjs';
const dir=new URL('../public/equipment/09-10/',import.meta.url), s=initial();
const v=JSON.parse(readFileSync(new URL('acceptance.json',dir)));
const result=q=>{const p=capture(q);assert.equal(p.ok,true,p.message);return p.result};
const before=result(s), b=result({...s,loadOhm:50});
const equal={schema:'bts.analog-waveform.v1',sampleId:'RC-COMMON',revision:4,dtS:1/256000,channels:[]};
const a=Array.from({length:2048},(_,i)=>.01*Math.sin(2*Math.PI*i/256));
equal.channels=[{id:'A',unit:'V',samples:a},{id:'B',unit:'V',samples:a}];
const m={
 gain:before.summary.outputVpp,matched:b.summary.outputVpp,'low-cutoff':response({...s,filter:'lp'},1000).amplitude,
 'high-phase':response({...s,filter:'hp'},1000).phase*180/Math.PI,'two-pole':response({...s,filter:'lp2'},1000).amplitude,
 'common-mode':result({...s,input:equal}).summary.outputVpp,'dc-ac':response({...s,coupling:'AC'},0).amplitude,
 overload:capture({...s,gain:1000}).code,'ac-bandpass':capture({...s,coupling:'AC',filter:'bp'}).code
};
const rows=v.cases.map(t=>{const actual=m[t.id],pass=t.tolerance===undefined?actual===t.expected:Math.abs(actual-t.expected)<=t.tolerance;return {...t,actual,pass};});
for(const t of rows)test(t.id,()=>assert.equal(t.pass,true,JSON.stringify(t)));
test('imported sampled sine settles to predicted LP attenuation',()=>{
 const y=result({...s,filter:'lp',gain:10,source:'A',input:equal}).channels[0].samples.slice(1024);
 assert.ok(Math.abs(Math.max(...y)-Math.min(...y)-.2/Math.sqrt(2))<1e-4);
});
test('input format, missing channel, clock and power boundaries',()=>{
 const a={...equal,channels:[equal.channels[0]]};
 assert.equal(dispatch(s,'import',{schema:'invalid'}).code,'waveform-format');
 assert.equal(capture({...s,input:a}).code,'input-routing');
 assert.equal(capture({...s,source:'A',filter:'lp',lpHz:10000,input:{...a,dtS:.001}}).code,'sample-clock');
 assert.equal(capture({...s,power:false}).code,'standby');
});
test('captured fixture and provenance round-trip in both formats',()=>{
 assert.equal(before.schema,'bts.analog-waveform.v1');assert.equal(before.dtS,1/256000);assert.equal(before.channels[0].unit,'V');assert.equal(before.channels[0].samples.length,8192);assert.ok(toCsv(before).startsWith('time_s,output_V\n0,0\n'));
 assert.deepEqual(result({...s,input:equal}).parent,{source:'Imported file',sampleId:'RC-COMMON',revision:4});
});
if(process.env.REFRESH_0910==='1'){
 writeFileSync(new URL('verification.json',dir),JSON.stringify({origin:v.origin,rows},null,2)+'\n');
 writeFileSync(new URL('example-preamp-waveform.json',dir),JSON.stringify(before)+'\n');
}
