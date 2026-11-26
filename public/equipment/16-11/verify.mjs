import fs from 'node:fs';
import {createStation,exportFile,poses,targets} from './handling.mjs';
const p=n=>new URL(n,import.meta.url),get=n=>JSON.parse(fs.readFileSync(p(n)));
const e=get('reference-plan.json').expected,st=createStation(),a=st.read(),b=st.hit('Slot_A02_handle'),c=st.hit('Carrier_75_tab');
const d=new Uint8Array(fs.readFileSync(p('handling-station.glb'))),v=new DataView(d.buffer),j=JSON.parse(new TextDecoder().decode(d.subarray(20,20+v.getUint32(12,true)))),nums=j.nodes;
const sols=[['Source before move',e.initial,a.wafers[0].siteId,'fixture',0],['Matching cassette destination',e.validDestination,b.wafers[0].siteId,'fixture',0],
 ['Insufficient diameter',e.diameterDeficitMm,c.attempt.diameterDeficitMm,'mm',0],['Custody after rejected placement',e.validDestination,c.wafers[0].siteId,'fixture',0],
 ['Only successful placement changes ledger',e.custodyRecordsAfterBoth,c.transfers.length,'records',0],
 ['Unique wafer ID',e.copiesOfWafer,c.wafers.filter(w=>w.id==='W100-01').length,'copies',0],
 ['Datum preserved',e.orientationDeg,c.wafers[0].orientationDeg,'deg',0],
 ['100 mm wafer model scale',[.1,.000525,.1],nums.find(x=>x.name==='W100_01').scale,'m',1e-8],
 ['150 mm wafer model scale',[.15,.000675,.15],nums.find(x=>x.name==='W150_01').scale,'m',1e-8],
 ['Destination pose matches slot datum',nums.find(x=>x.name==='Slot_A02_datum').translation,poses(b)[0].positionM,'m',1e-8],
 ['Named hit targets',12,get('vr-station.json').hitTargets.filter(n=>nums.some(x=>x.name===n.node)&&targets[n.node][0]===n.action).length,'targets',0]];
const o={equipment:'16-11',basis:get('reference-plan.json').reference,scope:'Exact nominal compatibility and metric scene verification, not physical tracking or collision physics.',checks:sols.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:Array.isArray(expected)?expected.every((x,i)=>Math.abs(x-actual[i])<=tolerance):expected===actual}))};
for(const [n,x] of [['verification.json',o],['example-custody.json',exportFile(c)]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
for(const x of o.checks)console.log(x.pass?'PASS':'FAIL',x.id,JSON.stringify(x.actual),x.unit);
if(o.checks.some(x=>!x.pass)) process.exitCode=1;
