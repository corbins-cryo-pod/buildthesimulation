import {readFileSync,writeFileSync} from 'node:fs';
import {createStation,inspect,exportDrawing,targets} from './panel.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('mfcs-ez-dormant.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const by=n=>g.nodes.find(x=>x.name===n), shell=by('White_rounded_casing'),a=g.accessors[g.meshes[shell.mesh].primitives[0].attributes.POSITION];
const bounds=a.min.map((v,i)=>(a.max[i]-v)*shell.scale[i]), checks=[];
function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
ck('Datasheet casing width',.230,bounds[0],'m',1e-7);ck('Datasheet casing depth',.160,bounds[2],'m',1e-7);ck('Datasheet casing height',.063,bounds[1],'m',1e-7);
[.401,.551,.696,.842].forEach((q,i)=>ck('OEM photo normalized front center '+(i+1),q,(by('Front_sealed_center_'+(i+1)).translation[0]+.115)/.230,'fraction of W',.025));
const s=createStation(),base=s.read(), r=s.hit('Panel_mirror_key');
ck('A→B neighboring spacing',30,base.distanceMm,'mm');ck('Mirror signs change',-30,r.deltaMm,'mm');ck('Mirror spacing is invariant',30,r.distanceMm,'mm');
ck('All span A→D',90,inspect('AD').distanceMm,'mm');ck('A→D midpoint on datum',75,inspect('AD').midpointXMm,'mm');
ck('Empty interval A→A',0,inspect('AA').distanceMm,'mm');
const fail=s.dispatch('pair','outside');ck('Unknown selection rejected',true,Boolean(fail.error)&&fail.pair==='AB');
ck('Detached hit target names resolved',2,m.hitTargets.filter(x=>targets[x.node]===x.action&&by(x.node)).length);
const write=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
write('verification.json',{schema:'bts.mfcs-ez.geometry-evidence.v1',scope:'Casing and photo proportions, not fluid or electrical performance; separate illustrated coordinates only',checks});write('example-panel.json',exportDrawing(base));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
