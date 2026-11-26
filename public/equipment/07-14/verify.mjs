import {readFileSync,writeFileSync} from 'node:fs';
import {compare,createStation,exportDrawing,targets} from './drawing.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('tsx60086a-documentary.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,device=n.find(x=>x.name==='Nominal_envelope'),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
for(const id of device.children){const q=n[id],a=g.accessors[g.meshes[q.mesh].primitives[0].attributes.POSITION];for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],q.translation[i]+a.min[i]*q.scale[i]);hi[i]=Math.max(hi[i],q.translation[i]+a.max[i]*q.scale[i]);}}
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
const e=hi.map((x,i)=>x-lo[i]);ck('Technical sheet nominal width',1.006,e[0],'m',1e-7);ck('Technical sheet nominal depth',.960,e[2],'m',1e-7);ck('Technical sheet nominal height',1.981,e[1],'m',1e-7);
ck('Front drawing parting-line height',.4648,n.find(x=>x.name==='Front_seam_datum').translation[1],'m',1e-7);
ck('Right hinge silhouettes',3,n.filter(x=>x.name.startsWith('Fixed_right_hinge_')&&x.translation[0]>.48).length);
const s=createStation(),a=s.read(),r=s.hit('Rotate_fixed_drawing');
ck('80×20 strip area',1600,a.areaMm2,'mm²');ck('Equal area, different perimeter',40,a.differencePerimeterMm,'mm');
ck('Rotated strip exchanges axes','20,80',r.displayDimensionsMm.join(','),'mm');
ck('Rotation does not change area or perimeter',true,r.areaMm2===a.areaMm2&&r.perimeterMm===a.perimeterMm);
const rect=s.hit('Choose_fixed_shape');ck('50×30 rectangle area difference',-100,rect.differenceAreaMm2,'mm²');ck('Unequal area, same perimeter',0,rect.differencePerimeterMm,'mm');
ck('Square compared to itself',true,compare('square').equalArea&&compare('square').differencePerimeterMm===0);
ck('Invalid selection preserves current shape',true,Boolean(s.dispatch('select','invalid').error)&&s.read().shape==='rectangle');
ck('Detached ray targets present',2,m.hitTargets.filter(x=>n.some(y=>y.name===x.node)&&targets[x.node]===x.action).length);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.tsx60086a.exterior-geometry.v1',scope:'Source dimensions and separate fixed rectangles only; no instrument performance or workflow',checks});wr('example-drawing.json',exportDrawing(a));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
