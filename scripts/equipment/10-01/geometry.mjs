import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/10-01/',import.meta.url),buf=readFileSync(new URL('multiclamp.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['Rack width incl. ears',.4826,boxes.get('Rack_ear_1').max.x-boxes.get('Rack_ear_-1').min.x],['Rack nominal height',.0889,boxes.get('case_body_2U').getSize(new Vector3()).y],['Rack nominal depth',.3048,boxes.get('operator_front_plate').max.z-boxes.get('case_body_2U').min.z],...['x','y','z'].map((k,i)=>['Headstage '+['width','height','length'][i],[.0406,.0203,.0838][i],boxes.get('CV7B_case').getSize(new Vector3())[k]])].map(([label,expectedM,actualM])=>({label,expectedM,actualM,toleranceM:.000002,pass:Math.abs(expectedM-actualM)<=.000002}));
if(rows.some(r=>!r.pass))throw Error('Geometry check failed');
writeFileSync(new URL('geometry-report.json',dir),JSON.stringify({source:'700B Theory and Operation, printed p. 141. GLB geometry compared to nominal dimensions; not measurements of a physical item. AABB includes cable, protrusions and accessories, computed conservatively from transformed primitive bounds.',rows,asset:{units:'m',axis:'Y up; front +Z',bytes:buf.length,nodeCount:j.nodes.length,meshCount:j.meshes.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),minM:round(total.min),maxM:round(total.max)},controls:['POWER_switch','PATCH1U_load','CH1_PRIMARY_BNC_nut'].map(name=>({name,minM:round(boxes.get(name).min),maxM:round(boxes.get(name).max)}))},null,2)+'\n');
