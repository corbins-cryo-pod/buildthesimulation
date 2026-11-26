import fs from 'node:fs';
import {createStation,file,projection,targets} from './optics.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),ref=g('reference-plan.json'), vr=g('vr-station.json');
const s=createStation(),low=s.hit('Etched_reference_coupon'),example=file(low);s.hit('Focus_dial');const high=s.hit('Etched_reference_coupon');
s.dispatch('focus',40);const unfocused=s.hit('Etched_reference_coupon');s.dispatch('focus',80);s.dispatch('pan',{x:25,y:0});const moved=s.hit('Etched_reference_coupon');
const xyz=t=>[t.xUm,t.yUm,t.zUm];
const b=fs.readFileSync(p('slicescope-optical.glb')),nodes=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))).nodes, n=k=>nodes.find(n=>n.name===k);
const rows=[['Lower focal target','ETCH-A',low.capture.id,'ID',0],['Lower camera center',[32,33],low.capture.pixel,'px',0],
 ['Lower sample-space coordinate',[-40,15,0],xyz(low.capture),'µm',[5,5,10]],['Upper focal target','ETCH-B',high.capture.id,'ID',0],
 ['Upper camera center',[49,26],high.capture.pixel,'px',0],['Upper sample-space coordinate',[45,-20,80],xyz(high.capture),'µm',[5,5,10]],
 ['Mid-plane visible target count',0,projection(unfocused).filter(x=>x.selectable).length,'targets',0],['Pan of +25 µm shifts target pixel',44,moved.capture.pixel[0],'px',0],
 ['Inverse map preserves sample X',45,moved.capture.xUm,'µm',1e-9],['XY base width',ref.geometryMm.mountWidth/1000,n('Motorized_XY_base_157p2x300').scale[0],'m',1e-8],
 ['XY base depth',ref.geometryMm.mountDepth/1000,n('Motorized_XY_base_157p2x300').scale[2],'m',1e-8],
 ['Named XR rays',3,vr.hitTargets.filter(x=>n(x.node)&&targets[x.node][0]===x.action).length,'hits',0]];
const result={equipment:'10-05',basis:ref.independentBasis,scope:'Synthetic contrast and geometry only. Not optics calibration or biological imaging.',checks:rows.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:Array.isArray(expected)?expected.every((v,i)=>Math.abs(v-actual[i])<=(tolerance[i]??0)):tolerance?Math.abs(expected-actual)<=tolerance:expected===actual}))};
for(const [n,x]of [['verification.json',result],['example-capture.json',example]])fs.writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
for(const c of result.checks)console.log(c.pass?'PASS':'FAIL',c.id,JSON.stringify(c.actual),c.unit);
if(result.checks.some(c=>!c.pass))process.exitCode=1;
