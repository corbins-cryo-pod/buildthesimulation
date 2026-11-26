import fs from 'node:fs';import {initial,replay} from './pull.mjs';
const u=n=>new URL(n,import.meta.url),p=JSON.parse(fs.readFileSync(u('reference-plan.json')));
const e=replay(initial(),'B1').event,b=fs.readFileSync(u('dage-4000.glb')),j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
const base=j.nodes.find(n=>n.name==='Base_425w_730d'),cover=j.nodes.find(n=>n.name==='Top_cover_670');
const a={KNOWN_PEAK:e.peak.forceN,CLASS:e.classification,BOND_STATE:e.postTest.bonds.map(b=>b.state),REVISION:[e.preTest.revision,e.postTest.revision],
 MACHINE_ENVELOPE:[base.scale[0]*1000,(cover.translation[1]+cover.scale[1]/2)*1000,base.scale[2]*1000]};
for(const z of p.cases){z.actual=a[z.id];z.pass=[z.expected].flat().every((x,i)=>typeof x==='number'?Math.abs([z.actual].flat()[i]-x)<1e-8:[z.actual].flat()[i]===x);}
if(p.cases.some(z=>!z.pass))throw Error('Reference case did not pass');
for(const [n,b] of [['verification.json',p],['example-event.json',e]])fs.writeFileSync(u(n),JSON.stringify(b,null,2)+'\n');
console.log('PASS',Object.keys(a));
