import fs from 'node:fs';
import {section,measure,volume,createStation,file,targets} from './sections.mjs';
const p=n=>new URL(n,import.meta.url),g=n=>JSON.parse(fs.readFileSync(p(n))),f=g('reference-plan.json'),gb=fs.readFileSync(p('hydra-cx-display.glb')),nodes=JSON.parse(gb.subarray(20,20+gb.readUInt32LE(12))).nodes,n=k=>nodes.find(n=>n.name===k),m=g('vr-station.json');
const s=createStation(),a=s.dispatch('measure'),r=a.result;s.hit('Section_monitor_screen');const b=s.dispatch('measure');s.dispatch('index',0);const b0=s.dispatch('measure');
const rows=[
 ['Known XYZ void volume',7680,volume().cavityVolumeUm3,'µm³',0],['Known void-cell count',960,volume().voidVoxelCount,'voxels',0],
 ['XY plane coordinates',21,section(a.mode,a.index).coordinateUm,'µm',0],['XY cavity extent',[24,20],r.sectionExtentUm,'µm',0],['XY cavity area',480,r.cavityAreaUm2,'µm²',0],
 ['XZ cavity extent',[24,16],b.result.sectionExtentUm,'µm',0],['XZ cavity area',384,b.result.cavityAreaUm2,'µm²',0],
 ['Blank section has no void',0,b0.result.cavityAreaUm2,'µm²',0],['Blank section does not change volume',7680,b0.result.cavityVolumeUm3,'µm³',0],
 ['Published chamber datum',f.publicScaleMm/1000,n('Chamber_width_datum_R').translation[0]-n('Chamber_width_datum_L').translation[0],'m',1e-8],
 ['Named inspection hits',3,m.hitTargets.filter(x=>n(x.node)&&targets[x.node]===x.action).length,'hits',0]
];
const y={equipment:'13-03',basis:f.independentBasis,scope:'Read-only synthetic geometry only and one published documentary datum; no image acquisition/milling model.',checks:rows.map(([id,expected,actual,unit,tolerance])=>({id,expected,actual,unit,tolerance,pass:tolerance?Math.abs(expected-actual)<=tolerance:JSON.stringify(expected)===JSON.stringify(actual)}))};
fs.writeFileSync(p('verification.json'),JSON.stringify(y,null,2)+'\n');
const aFile=file(a),d=aFile.image.pixels,lines=Array.from({length:aFile.image.pixelDimensions[1]},(_,i)=>'      '+d.slice(i*aFile.image.pixelDimensions[0],(i+1)*aFile.image.pixelDimensions[0]).join(','));
fs.writeFileSync(p('example-section.json'),JSON.stringify({...aFile,image:{...aFile.image,pixels:null}},null,2).replace('"pixels": null','"pixels": [\n'+lines.join(',\n')+'\n    ]')+'\n');
for(const x of y.checks)console.log(x.pass?'PASS':'FAIL',x.id,JSON.stringify(x.actual),x.unit);
if(y.checks.some(c=>!c.pass))process.exitCode=1;
