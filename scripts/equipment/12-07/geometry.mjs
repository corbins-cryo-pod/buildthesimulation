import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/12-07/',import.meta.url),buf=readFileSync(new URL('lightsheet7.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['LIGHTSHEET7_MAIN_MODULE','x',800],['LIGHTSHEET7_MAIN_MODULE','y',500],['LIGHTSHEET7_MAIN_MODULE','z',450],['REPLAY_SCREEN','x',304],['REPLAY_SCREEN','y',190]].map(([n,k,e])=>{const v=boxes.get(n).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.05)throw Error(n+' '+k+' measured '+v+' not '+e);return{node:n,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.05}});
const interactions=[['REPLAY_PREV','prev','Previous stored plane'],['REPLAY_NEXT','next','Next stored plane']];
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'12-07',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions:interactions.map(([node,action,label])=>({node,action,label,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}})),actionModule:'replay.mjs',interactionNotes:'Attach offline data texture to +Z face of REPLAY_SCREEN. Main module is static decorative geometry. All actions only switch stored plane index.',verification:rows},null,2)+'\n');console.log('Exported dimensions:',rows.length,'passed; triangles:',tri);
