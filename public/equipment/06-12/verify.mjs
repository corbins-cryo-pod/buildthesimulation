import {readFileSync,writeFileSync} from 'node:fs';
import {createStation,point,run,jsonRecord,csvRecord,targets} from './spring.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('microtester-g2.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,device=n.find(x=>x.name==='Device'),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const id of device.children){const node=n[id];if(node.mesh===undefined)continue;const a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION],q=node.rotation??[0,0,0,1],u=q.slice(0,3);
 for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]]){const v=[x,y,z].map((x,j)=>x*node.scale[j]),w=cross(u,v),t=cross(u,w);
  v.forEach((x,j)=>{const c=x+2*(q[3]*w[j]+t[j])+node.translation[j];lo[j]=Math.min(lo[j],c);hi[j]=Math.max(hi[j],c);});}
}
const checks=[];function ck(id,e,a,unit='',tolerance=0){checks.push({id,expected:e,actual:a,unit,tolerance,pass:typeof e==='number'?Math.abs(e-a)<=tolerance:e===a});}
const ext=hi.map((x,i)=>x-lo[i]);ck('Nominal width',.56,ext[0],'m',1e-7);ck('Nominal depth',.14,ext[2],'m',1e-7);ck('Nominal height',.24,ext[1],'m',1e-7);
const s=createStation(), q=s.hit('Run_virtual_trace_key'), end=q.result.rows.at(-1);
ck('Before contact (24 µm)',0,point(24,.04).displayedMn,'mN');ck('Contact boundary (25 µm)',0,point(25,.04).displayedMn,'mN');
ck('Independent force after 75 µm contact',2.4,end.idealMn,'mN',1e-8);
ck('Independent spring compression',60,end.springCompressionUm,'µm',1e-8);ck('Independent beam compression',15,end.beamDeflectionUm,'µm',1e-8);
ck('Apparent series slope',.032,q.result.fits.effectiveMnPerUm,'mN/µm',.00032);ck('Recovered dry spring slope',.04,q.result.fits.springMnPerUm,'mN/µm',.0004);
ck('All pre-contact rows zero',true,q.result.rows.filter(x=>x.travelUm<=25).every(x=>x.displayedMn===0));
ck('Sub-contact slope unavailable',true,run(19,.04).fits.springMnPerUm===null);
s.dispatch('stiffness',.08);s.dispatch('travel',160);const fault=s.dispatch('run');
ck('Overload correctly rejected',true,Boolean(fault.error)&&fault.result===null&&point(160,.08).overload);
ck('All semantic hit targets exist',2,m.hitTargets.filter(t=>targets[t.node]===t.action&&n.some(x=>x.name===t.node)).length);
ck('Motion pivots exist',3,Object.values(m.namedMotion).slice(0,3).filter(x=>n.some(y=>y.name===x)).length);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.microtester.dry-spring.verification.v1',scope:'Numeric ideal/electronic convention and nominal enclosure only; no measured device or sample data',checks});wr('example-spring.json',jsonRecord(q));writeFileSync(p('example-spring.csv'),csvRecord(q));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
