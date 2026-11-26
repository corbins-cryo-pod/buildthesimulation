import {readFileSync,writeFileSync} from 'node:fs';
import {compare,createStation,exportIllustration,targets} from './triangles.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('kopf940-outline.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,plate=n.find(x=>x.name==='Documentary_scale_plate'),a=g.accessors[g.meshes[plate.mesh].primitives[0].attributes.POSITION];
const e=a.max.map((x,i)=>(x-a.min[i])*plate.scale[i]);
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
ck('Documentary plate width',.254,e[0],'m',1e-8);ck('Documentary plate depth',.35306,e[2],'m',1e-8);
ck('Separated blank console windows',3,n.filter(x=>x.name.startsWith('Dark_label_free_window_')).length);
ck('Model supported read-only exterior',true,g.extras.noPositioningFeatures&&!g.animations);
const s=createStation(),a0=s.read(),a1=s.hit('Cycle_triangle_artwork');
ck('Independent right triangle area',24,a0.area,'units²');ck('Right triangle perimeter',24,a0.totalSideLength,'units');
ck('Wide triangle independent Heron oracle',21.33072900770,a1.area,'units²',1e-9);
ck('Triangle on exact inequality boundary',0,compare('flat').area,'units²');
ck('Impossible shape refuses an area',null,compare('impossible').area);
ck('Impossible shape gap',1,compare('impossible').gapLength,'unit');
ck('Hide labels preserves the same area',true,s.hit('Toggle_triangle_side_labels').area===a1.area&&!s.read().labels);
ck('Detached ray targets present',2,m.hitTargets.filter(x=>n.some(y=>y.name===x.node)&&targets[x.node]===x.action).length);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.kopf940.static-outline.verification.v1',scope:'Nominal plate and separate generic triangle arithmetic only; no positioning or device calibration',checks});wr('example-triangle.json',exportIllustration(a0));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
