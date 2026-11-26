import {readFileSync,writeFileSync} from 'node:fs';
import {compare,createStation,exportComparison,targets} from './shapes.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('octo-documentary.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,device=n.find(x=>x.name==='Outer_house'),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const id of device.children){const node=n[id],a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION],q=node.rotation??[0,0,0,1],u=q.slice(0,3);
 for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]]){const v=[x,y,z].map((x,j)=>x*node.scale[j]),w=cross(u,v),t=cross(u,w);
  v.forEach((x,j)=>{const c=x+2*(q[3]*w[j]+t[j])+node.translation[j];lo[j]=Math.min(lo[j],c);hi[j]=Math.max(hi[j],c);});}
}
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
const e=hi.map((x,i)=>x-lo[i]);ck('Published width',.285,e[0],'m',1e-7);ck('Published length/depth',.465,e[2],'m',1e-7);ck('Published height',.185,e[1],'m',1e-7);
ck('Eight closed external caps',8,n.filter(x=>x.name.startsWith('Fixed_dry_external_cover_')).length);
const s=createStation(),before=s.read(), sh=s.hit('Plaque_Change_Shape');ck('Regular octagon via independent wedge formula',1152*Math.sqrt(2),before.areaMm2,'mm²',1e-8);
ck('Square diagonal 48 mm',1152,sh.areaMm2,'mm²',1e-8);
ck('Circle self-comparison margin',0,compare('disk').uncoveredMm2,'mm²',1e-8);
ck('Fixed circumdiameter',48,sh.diameterMm,'mm');
ck('Overlay change preserves numerics',true,s.hit('Plaque_Overlay_Disk').areaMm2===sh.areaMm2&&!s.read().overlay);
ck('Out-of-domain shape retains previous',true,Boolean(s.dispatch('select','outside').error)&&s.read().shape==='square');
ck('Detached ray targets resolve',2,m.hitTargets.filter(x=>n.some(y=>y.name===x.node)&&targets[x.node]===x.action).length);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.octo.documentary-shapes.verification.v1',scope:'Nominal exterior dimensions and separate authentic arithmetic only; no process parameters or outcomes',checks});wr('example-shape.json',exportComparison(before));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
