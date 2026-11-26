import fs from 'node:fs';
import {section,measure,createStation,file,targets} from './stack.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),plan=g('reference-plan.json'),mr=(a,b)=>measure(section(a,b));
const a=mr('XY',7),b=mr('XZ',20),c=mr('XY',0),s=createStation();s.dispatch('measure');const d=s.dispatch('window','high');
const gb=fs.readFileSync(p('lsm980-nlo-display.glb')),m=g('vr-station.json'),j=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))),n=k=>j.nodes.find(n=>n.name===k);
const t=n('NLO_table_1800x1500'),bot=n('LSM_980_scan_base'),top=n('LSM_980_scan_cover');
const rows=[
 ['XY inset extent',[24,16],a.extentUm,'µm',0],['XZ inset extent',[24,30],b.extentUm,'µm',0],['XY mask size',96,a.voxelCount,'voxels',0],['XZ mask size',72,b.voxelCount,'voxels',0],
 ['Blank XY section',0,c.voxelCount,'voxels',0],['Display contrast preserves dimensions',[24,16],d.result.extentUm,'µm',0],
 ['Scanner width',plan.scannerMm[0]/1000,bot.scale[0],'m',1e-8],['Scanner height',plan.scannerMm[1]/1000,top.translation[1]+top.scale[1]/2-(bot.translation[1]-bot.scale[1]/2),'m',1e-8],
 ['Scanner depth',plan.scannerMm[2]/1000,bot.scale[2],'m',1e-8],['Table width',plan.tableMm[0]/1000,t.scale[0],'m',1e-8],
 ['Table height',plan.tableMm[1]/1000,t.translation[1]+t.scale[1]/2,'m',1e-8],['Named XR targets',3,m.hitTargets.filter(x=>n(x.node)&&targets[x.node]===x.action).length,'targets',0]
];
const o={equipment:'12-06',basis:plan.independentBasis,scope:'Deterministic inert voxel indexing, display and documented model envelopes; not optical acquisition or calibration.',checks:rows.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance?Math.abs(expected-actual)<=tolerance:JSON.stringify(expected)===JSON.stringify(actual)}))};
fs.writeFileSync(p('verification.json'),JSON.stringify(o,null,2)+'\n');
const example=file(d),rowsAsLines=Array.from({length:example.pixelResolution[1]},(_,i)=>'    '+example.rawIntensity.slice(i*example.pixelResolution[0],(i+1)*example.pixelResolution[0]).join(','));
const compact=JSON.stringify({...example,rawIntensity:null},null,2).replace('\"rawIntensity\": null','\"rawIntensity\": [\n'+rowsAsLines.join(',\n')+'\n  ]');
fs.writeFileSync(p('example-section.json'),compact+'\n');
for(const c of o.checks)console.log(c.pass?'PASS':'FAIL',c.id,JSON.stringify(c.actual),c.unit);
if(o.checks.some(x=>!x.pass))process.exitCode=1;
