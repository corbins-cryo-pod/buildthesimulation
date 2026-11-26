import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/01-01/',import.meta.url),buf=readFileSync(new URL('mask-console.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['desk width','DESK_DATUM','x',1440],['desk depth','DESK_DATUM','z',730],['CRT active width','CRT_GLASS','x',350],['CRT active height','CRT_GLASS','y',219]].map(([label,n,k,expectedMm])=>({label,expectedMm,actualMm:boxes.get(n).getSize(new Vector3())[k]*1000,toleranceMm:.05}));for(const x of rows){x.pass=Math.abs(x.expectedMm-x.actualMm)<x.toleranceMm;if(!x.pass)throw Error(x.label)}
const controls=[['LAYER_PADS','layer','pads','Show or hide contact shapes'],['LAYER_TRACES','layer','traces','Show or hide routing geometry'],['RUN_CHECK','check',null,'Check width and connectivity']].map(([mesh,action,value,label])=>({mesh,action,value,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/01-01/mask-console.glb',station:'/equipment/01-01/layout.mjs',dispatch:'act(state,action,value); station() initializes',unit:'m',up:'+Y',front:'+Z',origin:'Floor under centre of desk, no scale adjustment. CRT aperture actual mesh; planar contents shown with screen zoom only.',geometry:{rows,minM:round(total.min),maxM:round(total.max),bytes:buf.length,nodes:j.nodes.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0)},controls},null,2)+'\n')
