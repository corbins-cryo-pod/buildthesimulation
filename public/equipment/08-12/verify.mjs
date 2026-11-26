import fs from 'node:fs';import {createStation,assemblyRecord} from './assembly.mjs';
const u=x=>new URL(x,import.meta.url),plan=JSON.parse(fs.readFileSync(u('reference-plan.json')));
const a=createStation();a.dispatch('remove');const empty=a.read().feedback.code;a.dispatch('place');a.dispatch('rotate');const reversed=a.dispatch('join').error.code;
a.dispatch('rotate');const b=assemblyRecord(a.dispatch('join'));const correct=Object.fromEntries(b.jointStates.map(j=>[j.pin,j.net]));
const raw=fs.readFileSync(u('dde-bench.glb')),j=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12)));
const v={EMPTY:empty,REVERSED:reversed,CORRECT:correct,ENVELOPE:j.nodes.find(n=>n.name==='DDE_D_envelope').scale.map(d=>d*1e3)};
for(const r of plan.cases){r.actual=v[r.id];r.pass=JSON.stringify(r.actual)===JSON.stringify(r.expected);}
if(plan.cases.some(r=>!r.pass))throw Error('Independent acceptance failed');
for(const [p,o] of [['verification.json',plan],['example-assembly.json',b]])fs.writeFileSync(u(p),JSON.stringify(o,null,2)+'\n');
console.log('PASS',Object.keys(v));
