// Regenerate the published example and evidence from the checked-in independent references.
import fs from 'node:fs';
import {measure,defaults,toCSV} from './station.mjs';
const file=(n)=>new URL(n,import.meta.url),read=n=>JSON.parse(fs.readFileSync(file(n))),write=(n,data)=>fs.writeFileSync(file(n),JSON.stringify(data,null,2)+'\n');
const plan=read('verification-plan.json');
const solve=(p,w,l)=>measure(p,w,l).result;
const res=solve();
const b=fs.readFileSync(file('cell-fixture.glb')),j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
const f=1/(2*Math.PI*500*10e-6);
const actual={
 SLAB:res.cellCircuit.solutionOhm,DOUBLE:solve({sigmaSm:2}).cellCircuit.solutionOhm,AREA:solve({areaMm2:400}).cellCircuit.solutionOhm,
 OPEN_RE:measure({}, {WE:'WE',RE:'open',CE:'CE'}).code,SWAPPED_RE:measure({}, {WE:'RE',RE:'WE',CE:'CE'}).code,
 RC_CORNER:solve({model:'parallel-rc',startHz:f,stopHz:f*10}).samples[0].slice(1,3),CURRENT:res.samples[0][7],
 VIAL_OD:j.nodes.find(x=>x.name==='Glass_vessel_shell').scale[0]*1e3,OPEN_LID:measure(defaults,undefined,true).code
};
const cases=plan.cases.map(t=>{const a=actual[t.id],x=Array.isArray(a)?a:[a],e=Array.isArray(t.expected)?t.expected:[t.expected];return {...t,actual:a,pass:x.every((k,i)=>typeof k==='number'?Math.abs(k-e[i])<=t.tolerance:k===e[i])}});
if(cases.some(x=>!x.pass))throw Error(JSON.stringify(cases.filter(x=>!x.pass)));
write('verification.json',{record:'09-12',method:'Analytic, geometry and interlock verification. Not comparison with physical data.',cases});
write('example-boundary.json',res);fs.writeFileSync(file('example-spectrum.csv'),toCSV(res));
console.log(`PASS ${cases.length}/${cases.length}: `+cases.map(x=>x.id).join(', '));
