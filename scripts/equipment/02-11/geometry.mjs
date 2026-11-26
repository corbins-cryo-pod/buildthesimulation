import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/02-11/',import.meta.url),buf=readFileSync(new URL('acs200.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
import {fixture} from '../../../public/equipment/02-11/handling.mjs';
const rows=[['published cabinet footprint width','FOOTPRINT','x',1850],['published cabinet footprint depth','FOOTPRINT','z',1500],...['01','02','03'].map(i=>['wafer '+i+' diameter','WAFER_'+i,'x',200]),['dry chuck seat diameter','CH_200','x',200]].map(([label,n,k,expectedMm])=>{const actualMm=boxes.get(n).getSize(new Vector3())[k]*1000,toleranceMm=.08;return{label,expectedMm,actualMm,toleranceMm,pass:Math.abs(actualMm-expectedMm)<=toleranceMm}});
if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(r=>!r.pass)));const controls=[['ADVANCE_KEY','advance','Advance one dry pose'],['COVER_HANDLE','cover','Toggle display cutaway'],['DRY_SCREEN','run','Complete virtual dry batch']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/02-11/acs200.glb',station:'/equipment/02-11/handling.mjs',dispatch:'act(state,action,value), station(), report(state)',unit:'m',up:'+Y',front:'+Z',origin:'Floor at cabinet centre, physical scale. Marker positions are illustrative dry pose stations.',fixture,controls,geometry:{rows,nodes:j.nodes.length,bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),minM:round(total.min),maxM:round(total.max)},limit:'Internal XYZ/tooling, three drawn cassette slots and cabinet height are estimates. No vendor safety or robot trajectory simulation.'},null,2)+'\n')
