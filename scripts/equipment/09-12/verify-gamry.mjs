// Usage: node scripts/equipment/09-12/verify-gamry.mjs PATH_TO_PINNED_09-01_SOLVER.mjs
import fs from 'node:fs';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
import {toGamryEisConfig} from '../../../public/equipment/09-12/gamry-adapter.mjs';
import {measure} from '../../../public/equipment/09-12/station.mjs';
const source=process.argv[2];if(!source)throw Error('Provide public/equipment/09-01/solver.mjs from exact pinned commit.');
const expected='415fb75df1887a7c09629800a88555dd5ed5742a';
const sha256=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
if(sha256!=='ed76c8a65a344a32e92e3a49b04de1a6de43b1f85635ccf810ebdcb725174779')throw Error('Receiver solver differs from the pinned revision.');
const {initial,solve}=await import(pathToFileURL(source));
const fixtures=[['uniform slab',{}],['slab + parallel interface RC',{model:'parallel-rc',parentRevision:7,contactId:'RING-07'}]];
const cases=fixtures.map(([test,settings])=>{
 const local=measure(settings).result,mapping=toGamryEisConfig(local);
 const out=solve({...initial().config,...mapping.config},mapping.nextParentRevision);
 const f=out.points.map((p,i)=>Math.abs(local.samples[i][0]-p.frequencyHz));
 const diffs=out.points.map((p,i)=>Math.hypot(local.samples[i][1]-p.reOhm,local.samples[i][2]-p.imOhm));
 const actual=Math.max(...diffs),tolerance=1e-9;
 const pass=out.overloadCount===0&&actual<=tolerance&&Math.max(...f)<1e-8&&out.sampleId===local.sampleId&&out.inputRevision===local.revision&&mapping.inputMetadata.contactId===local.contactId;
 return {test,expectedMaxAbsComplexDifferenceOhm:0,actualMaxAbsComplexDifferenceOhm:actual,toleranceOhm:tolerance,points:out.points.length,inputRevision:out.inputRevision,outputRevision:out.revision,sourceContactId:mapping.inputMetadata.contactId,pass};
});
if(!cases.every(x=>x.pass))throw Error(JSON.stringify(cases));
const receipt={validation:'Headless numerical interoperation with the pinned staged 09-01 solver; not a claim of live receiver, devices or calibration.',
 receiver:'https://github.com/corbins-cryo-pod/buildthesimulation/blob/'+expected+'/public/equipment/09-01/solver.mjs',sha256,cases};
const root=new URL('../../../public/equipment/09-12/',import.meta.url);
for(const [name,o] of [['gamry-compatibility.json',receipt],['example-gamry-input.json',toGamryEisConfig(measure().result)]])fs.writeFileSync(new URL(name,root),JSON.stringify(o,null,2)+'\n');
console.log(JSON.stringify(receipt));
