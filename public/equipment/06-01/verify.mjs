import {readFileSync,writeFileSync} from 'node:fs';
import {createStation,measure,exportReading,targets} from './ruler.mjs';
const p=n=>new URL(n,import.meta.url),b=readFileSync(p('gt2-documentary.glb')),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),m=JSON.parse(readFileSync(p('vr-station.json')));
const n=g.nodes,r=n.find(x=>x.name==='Cabinet'),low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(const id of r.children){const node=n[id],a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION],q=node.rotation??[0,0,0,1],u=q.slice(0,3);
 for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]]){
  const v=[x,y,z].map((x,j)=>x*node.scale[j]),w=cross(u,v),t=cross(u,w);
  v.forEach((x,j)=>{const c=x+2*(q[3]*w[j]+t[j])+node.translation[j];low[j]=Math.min(low[j],c);high[j]=Math.max(high[j],c);});
 }
}
const checks=[];function check(id,expected,actual,unit='',tolerance=0){checks.push({id,expected,actual,unit,tolerance,pass:typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual});}
const e=high.map((x,i)=>x-low[i]);check('Authored proxy width',.9,e[0],'m',1e-7);check('Authored proxy depth',.9,e[2],'m',1e-7);check('Authored proxy height',1.42,e[1],'m',1e-7);
const s=createStation(), o=s.read(),example=exportReading(o);
check('A→B by 30–40–50 triangle',50,o.measurement.distanceUm,'µm',1e-10);
check('B→A distance invariant',50,s.hit('Ruler_reverse_button').measurement.distanceUm,'µm',1e-10);
check('B→A axis signs reverse','-30,-40',s.read().measurement.deltaUm.join(','),'µm');
check('A→C horizontal length',35,measure('A','C').distanceUm,'µm',1e-10);
check('Coincident marks',0,measure('A','A').distanceUm,'µm');
check('Invalid pair preserves current selection',true,s.dispatch('pair','ZZ').pair==='AB'&&Boolean(s.read().error));
check('Passive 3D targets resolve',2,m.hitTargets.filter(x=>targets[x.node]===x.action&&n.some(y=>y.name===x.node)).length);
const wr=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
wr('verification.json',{schema:'bts.gt2.read-only-ruler.verification.v1',scope:'Authored proxy geometry and analytic drawing only; not GT2 metrology',checks});wr('example-ruler.json',example);
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
