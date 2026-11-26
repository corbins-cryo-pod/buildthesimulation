import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/08-10/',import.meta.url),buf=readFileSync(new URL('ultimus-v.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const b=boxes.get('CABINET').getSize(new Vector3());const rows=[['cabinet width',225,b.x*1000],['cabinet height',95,b.y*1000],['cabinet depth',199,b.z*1000]].map(([label,expectedMm,actualMm])=>({label,expectedMm,actualMm,toleranceMm:.05,pass:Math.abs(expectedMm-actualMm)<.05}));if(rows.some(r=>!r.pass))throw Error('Metric cabinet check failed');const controls=[['CYCLE','fire','Trigger virtual volume raster'],['PEDAL','fire','Foot-trigger deposition'],['POWER','enable','Toggle virtual controller'],['PLATE','stage','Seat/remove flat coupon']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/08-10/ultimus-v.glb',station:'/equipment/08-10/dispenser.mjs',dispatch:'act(state,action,payload); station() initializes',unit:'m',up:'+Y',front:'+Z',origin:'Bench plane below cabinet centre; accessory stage at physical metres, rendered map colors are analytical',geometry:{rows,minM:round(total.min),maxM:round(total.max),nodes:j.nodes.length,bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0)},controls},null,2)+'\n')
