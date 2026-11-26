import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/10-11/',import.meta.url),buf=readFileSync(new URL('maxone.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['hub width','HUB_DATUM','x',280],['hub depth','HUB_DATUM','z',185],['hub height','HUB_DATUM','y',90],['recorder width','RECORDER_DATUM','x',95],['recorder length','RECORDER_DATUM','z',150],['recorder height','RECORDER_DATUM','y',25],['PSM ring diameter','PSM_RING','x',24],['PSM ring height','PSM_RING','y',8],['active rectangle width','SENSING_AREA','x',3.85],['active rectangle length','SENSING_AREA','z',2.10]].map(([label,n,k,expectedMm])=>{const actualMm=boxes.get(n).getSize(new Vector3())[k]*1000,toleranceMm=.03;return{label,expectedMm,actualMm,toleranceMm,pass:Math.abs(actualMm-expectedMm)<=toleranceMm}});
if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(x=>!x.pass)));const controls=[['PSM_CHIP','mount','Seat or remove the empty chip'],['SENSING_AREA','focus','Select ideal grid coordinates via ray hit in sensor-local XY'],['HUB_STATUS','run','Replay selected electrical routes']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/10-11/maxone.glb',station:'/equipment/10-11/array.mjs',dispatch:'act(state,action,value); station() initializes; focus takes a row-major site index',unit:'m',up:'+Y',front:'+Z',origin:'Bench floor under system. Ideal map x right, y rear (+Y within sensing plane; global −Z on asset).',geometry:{rows,nodes:j.nodes.length,bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),minM:round(total.min),maxM:round(total.max)},controls,note:'Metric mockup, simplified connectors and chip internals. No vendor mapping or physical headset session.'},null,2)+'\n')
