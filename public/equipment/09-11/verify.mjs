// Execute with Node from a checkout. Regenerates all published synthetic fixtures and results.
import fs from 'node:fs';import {defaults,run,rcStep,enbw,parseCSV} from './solver.mjs';
const u=p=>new URL(p,import.meta.url);
const plan=JSON.parse(fs.readFileSync(u('./verification-plan.json'))),rows=[];
function put(i,actual){const r=plan.cases.find(x=>x.id===i),value=Array.isArray(actual)?actual:[actual],expect=Array.isArray(r.expected)?r.expected:[r.expected];rows.push({...r,actual,pass:value.every((q,j)=>typeof q==='number'?Math.abs(q-expect[j])<=r.absoluteTolerance:q===expect[j])});}
for(const [i,s,r] of [['I',0,0],['Q',90,0],['PHASE',30,30]]){const a=run({...defaults,poles:4,signalPhase:s,refPhase:r});put(i,[a.result.final.xV*1e6,a.result.final.yV*1e6]);}
const z=[0];for(let j=0;j<1000;j++)rcStep(z,1,-Math.expm1(-.001));put('TAU',z[0]);put('ENBW',enbw(1,.01));
const detuned=run({...defaults,durationMs:400,signalPhase:0,signalHz:1050}).result.trace.filter(s=>s[0]>.2);put('BEAT',1e6*detuned.reduce((a,row)=>a+row[4],0)/detuned.length);put('RANGE',run({...defaults,ampUv:20000/Math.SQRT2}).code);put('OPEN',run({...defaults,connected:false}).code);
const model=fs.readFileSync(u('./sr860.glb'));const scene=JSON.parse(model.toString('utf8',20,20+model.readUInt32LE(12)));put('BODY',scene.nodes.find(n=>n.name==='Enclosure_17in').scale.map(v=>v*1000));
const scope=parseCSV(fs.readFileSync(u('./scope-capture.csv'),'utf8'));put('SCOPE',run({...defaults,source:'import'},scope).result.final.rV*1e6);
const measure=run(defaults).result;
const file=(name,a)=>fs.writeFileSync(u('./'+name),JSON.stringify(a,null,2)+'\n');
file('verification.json',{measurementType:'analytic/synthetic verification; not measured',cases:rows});file('example-result.json',measure);
const lines=['# sampleId=SR860-SYNTH-1K','# contactId=A','# revision=0','# source=09-11','# kind=simulated input','time_s,voltage_V'];
for(let i=0;i<12801;i++)lines.push((i/64000).toFixed(9)+','+(Math.SQRT2*100e-6*Math.sin(2*Math.PI*1000*i/64000+Math.PI/6)).toPrecision(10));
fs.writeFileSync(u('./example-signal.csv'),lines.join('\n')+'\n');
const rec=run({...defaults,source:'import'},parseCSV(lines.join('\n')));if(!rec.ok||rec.result.signalId!=='SR860-SYNTH-1K')throw Error('import failed');
if(rows.some(v=>!v.pass))throw Error('Failed: '+JSON.stringify(rows.filter(v=>!v.pass)));console.log(rows.map(v=>[v.id,v.actual]));
