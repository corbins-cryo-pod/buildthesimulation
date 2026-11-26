import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/07-11/',import.meta.url),buf=readFileSync(new URL('spectramax-i3x.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['I3X_STANDALONE_DORMANT','x',392],['I3X_STANDALONE_DORMANT','z',605.5],['I3X_STANDALONE_DORMANT','y',325],['CHART_SCREEN','x',286],['CHART_SCREEN','y',173]].map(([node,k,e])=>{const v=boxes.get(node).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.05)throw Error(node+' '+k+' '+v+' not '+e);return{node,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.05}});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const actions=['A','B','U'].map(value=>{const node='PICK_'+value;return{node,action:'read',value,label:'Read disconnected printed graphic '+value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'07-11',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,actionModule:'chart.mjs',interactionNotes:'Chart texture goes on +Z face of CHART_SCREEN. Only the independent chart reader has action anchors. Hardware enclosure is dormant.',verification:rows},null,2)+'\n');console.log('Metric checks:',rows.length,'triangles:',tri);
