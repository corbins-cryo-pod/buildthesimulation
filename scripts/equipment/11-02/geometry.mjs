import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/11-02/',import.meta.url),buf=readFileSync(new URL('doric-closed.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['DORIC_LDMD1_DORMANT','x',175],['DORIC_LDMD1_DORMANT','z',105],['DORIC_LDMD1_DORMANT','y',50],['DORIC_CLDM_CAPPED','x',64],['DORIC_CLDM_CAPPED','z',56],['DORIC_CLDM_CAPPED','y',22],['HEAD_NOMINAL_BODY','x',24.6],['HEAD_NOMINAL_BODY','z',36.8],['HEAD_NOMINAL_BODY','y',12]].map(([node,k,e])=>{const v=boxes.get(node).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.05)throw Error(node+' '+k+' '+v+' not '+e);return{node,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.05}});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const actions=['A','B','U'].map(value=>{const node='SYMBOL_'+value;return{node,action:'read',value,label:'Read disconnected generic tile '+value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'11-02',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,actionModule:'symbols.mjs',interactionNotes:'Attach the abstract shapes chart to +Z of SYMBOL_SCREEN. All actions are confined to the unrelated card viewer. No hardware interfaces are exposed.',verification:rows},null,2)+'\n');console.log('Metric checks:',rows.length,'triangles:',tri);
