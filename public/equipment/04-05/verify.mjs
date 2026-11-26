import {readFileSync,writeFileSync} from 'node:fs';
import {compare,createStation,exportChart,targets} from './footprint.mjs';
const p=n=>new URL(n,import.meta.url), b=readFileSync(p('diener-nano.glb')), g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))), m=JSON.parse(readFileSync(p('vr-station.json')));
const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
for(const id of g.nodes.find(n=>n.name==='Cabinet').children){
 const n=g.nodes[id],a=g.accessors[g.meshes[n.mesh].primitives[0].attributes.POSITION],t=n.translation,d=n.rotation??[0,0,0,1];
 for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]]){
  // Every nonidentity rotation of a cabinet mesh is exactly about X.
  const yz=(2*d[0]*d[3]),diag=1-2*d[0]*d[0],v=[x,y,z].map((x,j)=>x*n.scale[j]);
  const q=[v[0],diag*v[1]-yz*v[2],yz*v[1]+diag*v[2]];
  q.forEach((x,j)=>{low[j]=Math.min(low[j],t[j]+x);high[j]=Math.max(high[j],t[j]+x);});
 }
}
const checks=[];function check(id,expected,actual,unit='',tolerance=0){checks.push({id,expected,actual,unit,tolerance,pass:typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual});}
const e=high.map((x,i)=>x-low[i]);
check('Nominal cabinet width',.540,e[0],'m',1e-7);check('Nominal cabinet depth',.800,e[2],'m',1e-7);check('Nominal cabinet height',.775,e[1],'m',1e-7);
const s=createStation();const first=s.read();
check('Centered narrow chart 0° X/Y','55,25',first.signedSideMarginsMm.join(','),'mm');
const rot=s.hit('Chart_rotate_key');check('Centered narrow chart 90° X/Y','-75,155',rot.signedSideMarginsMm.join(','),'mm');
check('Narrow chart rotation fails geometric containment',false,rot.contained);
const wide=s.hit('Chart_frame_key');check('Centered wide chart 90° X/Y','75,155',wide.signedSideMarginsMm.join(','),'mm');
check('Both ray targets resolve',2,m.hitTargets.filter(t=>g.nodes.some(q=>q.name===t.node)&&targets[t.node]===t.action).length);
const fail=s.dispatch('setFrame','invalid');check('Unknown chart rejected while retaining selection',true,Boolean(fail.error)&&fail.frame==='wide');
check('Orientation reversal reproduces front axis',540,compare('wide',0).footprintMm[0],'mm');
const save=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
save('verification.json',{schema:'bts.diener-nano.first-pass.v1',scope:'Independent exterior arithmetic and artificial chart only',checks});
save('example-chart.json',exportChart(rot));
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' checks passed');
if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
