import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/10-16/',import.meta.url),buf=readFileSync(new URL('vt1200s-reference.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['BASE_LENGTH_DATUM','x',250],['VT1200S_EXTERNAL','y',230],['BASE_LENGTH_DATUM','z',600],['CONTROLLER_DATUM','x',150],['CONTROLLER_DATUM','y',72],['CONTROLLER_DATUM','z',190],['COUPON_DATUM','x',48],['COUPON_DATUM','y',4],['COUPON_DATUM','z',28]].map(([n,k,e])=>{const actual=boxes.get(n).getSize(new Vector3())[k]*1000;if(Math.abs(actual-e)>.03)throw Error(n+' '+k+' is '+actual+' not '+e);return {node:n,axis:k,expectedMm:e,actualMm:+actual.toFixed(4),toleranceMm:.03}});
const interactions=[['COUPON_POSE','rotate','Rotate virtual witness'],['LANDMARK_P1','landmark','Read P1 label','P1'],['LANDMARK_P2','landmark','Read P2 label','P2'],['WITNESS_TRAY','verify','Verify geometric clearance']];
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const manifest={schema:'bts.xr-instrument.v1',equipmentId:'10-16',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions:interactions.map(([node,action,label,value])=>({node,action,label,value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}})),actionModule:'fit.mjs',salientNote:'Static unused Leica exterior; all interaction is confined to a separate inert match-fit demonstration. Use live pick transforms for a rotated/offset coupon. No headset runtime verified.',verification:rows};
writeFileSync(new URL('xr.json',dir),JSON.stringify(manifest,null,2)+'\n');console.log('Exported GLB dimensions:',rows.length,'passed; triangles:',tri);
