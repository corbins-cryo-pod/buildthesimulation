import fs from 'node:fs';import {measure,analyzeHarmonic,replay} from './dma.mjs';
const u=n=>new URL(n,import.meta.url),plan=JSON.parse(fs.readFileSync(u('verification-plan.json'))),b=fs.readFileSync(u('q800.glb'));
const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),body=j.nodes.find(n=>n.name==='Base_460x560');
const a=measure().result.fit,c=measure({deltaMpa:0,e0Mpa:12}).result.fit;
const v=analyzeHarmonic(replay(11,.001,9*Math.cos(Math.PI/6),9*Math.sin(Math.PI/6),.37),11);
const actual={CORNER:[a.storageMpa,a.lossMpa],PHASOR:[v.storageMpa,v.lossMpa],LIMIT:[c.storageMpa,c.lossMpa],AMPLITUDE:measure({strainPercent:.3}).result.fit.forceAmplitudeN/a.forceAmplitudeN,FOOTPRINT:[body.scale[0]*1e3,body.scale[2]*1e3]};
for(const x of plan.checks){x.actual=actual[x.id];x.pass=[x.actual].flat().every((p,i)=>Math.abs(p-[x.expected].flat()[i])<=x.tolerance);}
if(plan.checks.some(x=>!x.pass))throw Error('Independent check failed');
fs.writeFileSync(u('verification.json'),JSON.stringify(plan,null,2)+'\n');console.log('PASS',Object.keys(actual));
