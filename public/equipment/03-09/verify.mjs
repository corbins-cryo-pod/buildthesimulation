import fs from 'node:fs';
import {check,createStation,exportFile,targets} from './fit.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),plan=g('reference-plan.json'),vr=g('vr-station.json');
const gb=fs.readFileSync(p('mini-mite-display.glb')),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),nodes=j.nodes;
const s=createStation();s.dispatch('check');const out=exportFile(s.read()),small=check('small'),touch=check('touch'),large=check('large'),cover=nodes.find(n=>n.name==='Cover_406x279');
const tests=[
 ['16 × 10 mm clearance',1.5660188679,small.radialGapMm,'mm',1e-8],['Centered carrier fits','clear',small.outcome,'class',0],
 ['20 × 12 mm interference',-.6619037897,large.radialGapMm,'mm',1e-8],['Oversized carrier rejected','blocked',large.outcome,'class',0],
 ['22 mm diagonal boundary','touch',touch.outcome,'class',0],['Envelope width',plan.geometryExpectedMm[0]/1000,cover.scale[0],'m',1e-8],
 ['Envelope closed height',plan.geometryExpectedMm[1]/1000,cover.translation[1]+cover.scale[1]/2,'m',1e-8],['Envelope depth',plan.geometryExpectedMm[2]/1000,cover.scale[2],'m',1e-8],
 ['Named ray targets',5,vr.hitTargets.filter(t=>nodes.some(n=>n.name===t.node)&&targets[t.node][0]===t.action&&(targets[t.node][1]??null)===t.actionPayload).length,'hits',0]
];
const data={equipment:'03-09',basis:plan.independentBasis,scope:'Analytical mock-gauge compatibility and nominal exterior geometry only.',checks:tests.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance?Math.abs(expected-actual)<=tolerance:expected===actual}))};
for(const [n,x]of [['verification.json',data],['example-clearance.json',out]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
for(const c of data.checks)console.log(c.pass?'PASS':'FAIL',c.id,c.actual,c.unit);
if(data.checks.some(c=>!c.pass))process.exitCode=1;
