import fs from 'node:fs';
import {replay,fixture,csv,targets} from './replay.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),vr=g('vr-station.json'),plan=g('reference-plan.json');
const a=replay(fixture()),b=replay(fixture(false)),m=a.markers[0],at=a.samples[m.zeroBasedSample],gb=fs.readFileSync(p('open-ephys-gen3-display.glb')),ns=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))).nodes;
const shell=ns.find(n=>n.name==='Top_shell_overlay');
const tests=[
 ['Received order independent of output order',['blk-2','blk-0','blk-3'],a.receivedBlocks,'block IDs',0],
 ['Channel order',['A','B'],a.channelIds,'channels',0],['Missing indexes',[1004,1005,1006,1007],a.samples.filter(s=>s.valuesMv===null).map(s=>s.counter),'samples',0],
 ['Trigger original counter',1010,m.counter,'sample',0],['Trigger relative time',.010,m.timeS,'s',1e-12],
 ['Marker original sample channels',[10,110],at.valuesMv,'mV',0],['Restored replay has no absent samples',0,b.gapSampleCount,'samples',0],
 ['Recovery preserves marker time',m.timeS,b.markers[0].timeS,'s',1e-12],
 ['CAD-anchored rounded shell width',plan.caseDimensionsMm.width/1000,shell.scale[0],'m',1e-8],
 ['CAD-anchored rounded shell depth',plan.caseDimensionsMm.depth/1000,shell.scale[2],'m',1e-8],
 ['CAD-anchored shell height',plan.caseDimensionsMm.height/1000,shell.translation[1]+shell.scale[1]/2,'m',1e-8],
 ['Named scene actions',3,vr.hitTargets.filter(h=>ns.some(n=>n.name===h.node)&&targets[h.node]===h.action).length,'hits',0]
];
const data={equipment:'10-10',basis:plan.independentBasis,scope:'Synthetic integer clock checks and passive case envelope only. No hardware signal validation.',checks:tests.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance?Math.abs(expected-actual)<=tolerance:JSON.stringify(expected)===JSON.stringify(actual)}))};
for(const [n,x]of [['verification.json',data],['example-input.json',fixture()],['example-replay.json',a]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
fs.writeFileSync(p('example-replay.csv'),csv(a));
for(const c of data.checks)console.log(c.pass?'PASS':'FAIL',c.id,JSON.stringify(c.actual),c.unit);
if(data.checks.some(c=>!c.pass))process.exitCode=1;
