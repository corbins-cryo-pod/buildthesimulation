import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/16-03/',import.meta.url),buf=readFileSync(new URL('steel-bench.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
import {bench,anchors,inventory} from '../../../public/equipment/16-03/bench.mjs';
const checks=[['worktop width','WORKTOP','x',1800],['worktop depth','WORKTOP','z',750],['BTS floor-to-worktop','WORKTOP','maxy',900],...Object.entries(inventory).flatMap(([id,o])=>['x','y','z'].map((a,k)=>[id+' '+a,id,a,o.dims[k]*1000]))];const rows=checks.map(([label,n,k,expectedMm])=>{const b=boxes.get(n),actualMm=(k==='maxy'?b.max.y:b.getSize(new Vector3())[k])*1000,toleranceMm=.08;return {label,expectedMm,actualMm,toleranceMm,pass:Math.abs(expectedMm-actualMm)<=toleranceMm}});
if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(v=>!v.pass)));const controls=[['DRAWER_HANDLE','drawer',null,'Open/close sliding drawer'],...Object.keys(inventory).map(id=>[id,'grab',id,'Grab '+id])].map(([mesh,action,value,label])=>({mesh,action,value,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/16-03/steel-bench.glb',station:'/equipment/16-03/bench.mjs',dispatch:'act(state,action,value); station() initializes; transform(state,item); report(state)',unit:'m',up:'+Y',front:'+Z',origin:'floor under bench centre; place directly in metre-scale lab',anchors,controls,motion:bench.drawer,geometry:{rows,nodes:j.nodes.length,bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),minM:round(total.min),maxM:round(total.max)},safety:'Custom illustrative design not verified on physical hardware; no tipping, load capacity or access certification.'},null,2)+'\n')
