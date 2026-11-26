import {readFileSync,writeFileSync} from 'node:fs';
import {coupon,targets,scanRow,createStation,file,heightAt} from './coupon.mjs';
const p=n=>new URL(n,import.meta.url), m=JSON.parse(readFileSync(p('vr-station.json')));
const bytes=readFileSync(p('ace600-closed.glb')), g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const mns=[Infinity,Infinity,Infinity],mxs=[-Infinity,-Infinity,-Infinity];
function visit(i,t0=[0,0,0]){
 const n=g.nodes[i],t=n.translation.map((x,j)=>x+t0[j]);
 if(n.mesh!==undefined){
  const a=g.accessors[g.meshes[n.mesh].primitives[0].attributes.POSITION];
  const q=n.rotation??[0,0,0,1],d=q[3],u=q.slice(0,3);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]]){
   const v=[x,y,z].map((x,j)=>x*n.scale[j]), c=cross(u,v),r=cross(u,c);
   const pt=v.map((x,j)=>x+2*(d*c[j]+r[j])+t[j]);
   pt.forEach((x,j)=>{mns[j]=Math.min(mns[j],x);mxs[j]=Math.max(mxs[j],x);});
  }
 }
 for(const j of n.children??[])visit(j,t);
}
visit(g.nodes.findIndex(x=>x.name==='Cabinet'));
const checks=[];
function ck(id,expected,actual,unit='',tolerance=0){
 checks.push({id,expected,actual,unit,tolerance,pass:typeof expected==='number'?Math.abs(expected-actual)<=tolerance:expected===actual});
}
const ext=mxs.map((x,j)=>x-mns[j]);
ck('Cabinet width',.300,ext[0],'m',1e-7);ck('Cabinet depth',.540,ext[2],'m',1e-7);ck('Cabinet height',.640,ext[1],'m',1e-7);
const s=createStation(),example=file(s.hit('Read_Passive_Step'));
const row=scanRow(12).points.map(x=>x.heightNm);
ck('Central raised bins',16,row.filter(x=>x===36).length,'bins');
ck('Central surrounding bins',24,row.filter(x=>x===0).length,'bins');
ck('Central edge samples','0,36,36,0',[row[11],row[12],row[27],row[28]].join(','),'nm');
ck('Blank row raised bins',0,scanRow(2).points.filter(x=>x>0).length,'bins');
ck('Half-open right edge',0,heightAt(14,6.25),'nm');
ck('Point-to-reference step',36,example.measurement.stepNm,'nm');
s.hit('Pick_Surround_Point');ck('Unraised comparison remains zero',0,s.dispatch('read').measurement.stepNm,'nm');
const e=s.dispatch('row',24);ck('Invalid row rejected without state or revision change',true,Boolean(e.error)&&e.row===12&&file(e).coupon.revision===coupon.revision);
ck('Named passive 3D targets',3,m.hitTargets.filter(x=>targets[x.node]===x.action&&g.nodes.some(n=>n.name===x.node)).length);
ck('GLB is lightweight',true,m.bytes===bytes.length&&bytes.length<100000);
const save=(n,x)=>writeFileSync(p(n),JSON.stringify(x,null,2)+'\n');
save('verification.json',{schema:'bts.verification.ace600.v1',scope:'Geometric benchmark only; no experimental metrology or hardware validation',checks});
save('example-coupon.json',example);
if(checks.some(x=>!x.pass)){console.error(checks.filter(x=>!x.pass));process.exitCode=1;}
console.log(checks.filter(x=>x.pass).length+'/'+checks.length+' benchmarks passed');
