import fs from 'node:fs';
import {compare,targets} from './maps.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n)));
const o=compare(),b=compare('baseline'),glb=fs.readFileSync(p('auto-306-display.glb')), nodes=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12))).nodes;
const plan=g('reference-plan.json'), manifest=g('vr-station.json'), left=o.coupons.L,right=o.coupons.R,deck=nodes.find(n=>n.name==='Deck_880x595'),rim=nodes.find(n=>n.name==='Guard_top_edge');
const inputs=[
 ['Mirror residual',0,o.comparison.maxMirrorDeltaNm,'nm',0],
 ['Left/right mean',717/9, left.summary.meanNm,'nm',1e-8],
 ['Identical mirrored mean',left.summary.meanNm,right.summary.meanNm,'nm',0],
 ['Half range normalized by mean',7200/956,left.summary.halfRangeOverMeanPercent,'%',1e-8],
 ['Unchanged blank increment',0,b.coupons.L.summary.maxNm+b.coupons.R.summary.maxNm,'nm',0],
 ['Cabinet width',plan.closedCabinetMm[0]/1000,deck.scale[0],'m',1e-8],
 ['Cabinet depth',plan.closedCabinetMm[1]/1000,deck.scale[2],'m',1e-8],
 ['Guard nominal top',(plan.guardMaximumYmm/1000),rim.translation[1]+rim.scale[1]/2,'m',1e-8],
 ['Named ray targets',3,manifest.hitTargets.filter(h=>nodes.some(n=>n.name===h.node)&&targets[h.node][0]===h.action).length,'hits',0],
];
const res={equipment:'03-02',basis:plan.basis,scope:'Independent arithmetic/metric checks, not measured deposition or prediction.',checks:inputs.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:Math.abs(expected-actual)<=tolerance}))};
for(const [n,x] of [['verification.json',res],['example-maps.json',o],['blank-reference.json',b]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
for(const x of res.checks)console.log(x.pass?'PASS':'FAIL',x.id,x.actual,x.unit);
if(res.checks.some(x=>!x.pass))process.exitCode=1;
