import fs from 'node:fs';
import {createStation,exportFile,pose,readiness,targets} from './continuity.mjs';
const p=n=>new URL(n,import.meta.url),get=n=>JSON.parse(fs.readFileSync(p(n))), plan=get('reference-plan.json');
const s=createStation(),a=s.read();s.hit('Key_A_face');const b=s.hit('Key_B_face'),c=s.hit('Key_A_face');
const d=s.dispatch('seat',{branch:'A',token:'square-B'}),e=s.hit('Key_A_face');
const glb=fs.readFileSync(p('blind-fixture.glb')), n=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12))).nodes,m=get('vr-station.json');
const k=(st,i)=>readiness(st)[i].edgeId;
const values=[
 ['Independent branch truth table',plan.expected,[a,b,c,d,e].map(st=>readiness(st).map(x=>x.ready)),'flags','exact'],
 ['Successful/rejected ledger revision',plan.expectedRevisions,[a,b,c,d,e].map(st=>st.ledgerRevision),'revisions','exact'],
 ['Wrong key result','key-mismatch',d.note.code,'code','exact'],
 ['Other branch retains B edge',k(b,1),k(c,1),'edge ID','exact'],
 ['Restored A edge keeps original ID',k(b,0),k(e,0),'edge ID','exact'],
 ['Token A Z withdrawal',.022,pose(a).A.tokenZ-pose(b).A.tokenZ,'m',1e-8],
 ['Nominal wall board scale',[.86,.41,.028],n.find(node=>node.name==='WallPanel_860').scale,'m','exact'],
 ['Ray targets mapped',6,m.hitTargets.filter(h=>n.some(x=>x.name===h.node)&&targets[h.node][0]===h.action&&targets[h.node][1]===h.actionPayload).length,'hits','exact']
];
const result={equipment:'16-14',basis:plan.independentBasis,scope:'Virtual Boolean labels and nominal geometry; no physical flow or operation benchmarking.',checks:values.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance==='exact'?JSON.stringify(expected)===JSON.stringify(actual):Math.abs(expected-actual)<=tolerance}))};
for(const [f,v] of [['verification.json',result],['example-continuity.json',exportFile(e)]])fs.writeFileSync(p(f),JSON.stringify(v,null,2)+'\n');
for(const x of result.checks)console.log(x.pass?'PASS':'FAIL',x.id,JSON.stringify(x.actual),x.unit);
if(result.checks.some(x=>!x.pass))process.exitCode=1;
