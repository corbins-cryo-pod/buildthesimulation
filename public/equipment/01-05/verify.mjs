import {analyze,createStation,example,exportFile} from './analysis.mjs';
import fs from 'node:fs';
const path=n=>new URL(n,import.meta.url),get=n=>JSON.parse(fs.readFileSync(path(n)));
const p=get('reference-plan.json'),s=createStation();
const a=s.dispatch('run'), f=exportFile(a), R=a.result;
const once=createStation();once.dispatch('load',JSON.parse(JSON.stringify(f)));const reload=once.dispatch('run').result;
once.dispatch('trigger');const next=once.dispatch('run').result;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const n=(a,b,t=1e-10)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<=t);
const mb=fs.readFileSync(path('analysis-console.glb')), g=JSON.parse(mb.subarray(20,20+mb.readUInt32LE(12))), manifest=get('vr-station.json');
const cases=[
 ['A/B event counts',[2,2],R.summary.map(c=>c.count),'events','exact'],
 ['A/B/A/B IDs',['A','B','A','B'],R.events.map(e=>e.channelId),'channels','exact'],
 ['Trigger alignment',p.timeOffsetsMs,R.events.map(e=>e.offsetMs),'ms',1e-10],
 ['Waveform means A then B',Object.values(p.meanWaveformUV).flat(),R.summary.flatMap(c=>c.meanWaveformUV),'µV',1e-10],
 ['Trigger change -1 sample',p.sampleOffsets.map(i=>i-1),next.events.map(e=>e.offsetSamples),'samples','exact'],
 ['Export and reload vs independent offsets',p.sampleOffsets,reload.events.map(e=>e.offsetSamples),'samples',1],
 ['Metric tabletop', [1.1,.031,.62],g.nodes.find(e=>e.name==='ConsoleTop_1100x620').scale,'m',1e-9],
 ['VR named scene targets',5,manifest.hitTargets.filter(t=>g.nodes.some(n=>n.name===t.node)).length,'targets','exact'],
];
const out={equipment:'01-05',basis:p.independentBasis,scope:'Synthetic software and nominal geometry checks only, no device or data benchmarking.',checks:cases.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance==='exact'?eq(actual,expected):n(actual,expected,tolerance)}))};
for(const [name,data] of [['verification.json',out],['example-recording.json',example()],['example-result.json',f]])fs.writeFileSync(path(name),JSON.stringify(data,null,2)+'\n');
for(const x of out.checks)console.log(x.pass?'PASS':'FAIL',x.id,JSON.stringify(x.actual),x.unit);
if(out.checks.some(c=>!c.pass))process.exitCode=1;
