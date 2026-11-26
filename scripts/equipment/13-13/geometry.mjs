import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/13-13/',import.meta.url),buf=readFileSync(new URL('cm3050s.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['FULL_WIDTH_DEPTH_DATUM','x',800],['FULL_WIDTH_DEPTH_DATUM','z',766],['CM3050S_CLOSED_EQUIPMENT','y',1040],['CM3050S_CLOSED_EQUIPMENT','x',882],['READER_SCREEN','x',363]].map(([node,k,expectedMm])=>{const v=boxes.get(node).getSize(new Vector3())[k]*1000;if(Math.abs(v-expectedMm)>.05)throw Error(node+' '+k+' '+v+' not '+expectedMm);return{node,axis:k,expectedMm,actualMm:+v.toFixed(5),toleranceMm:.05}});
const arm=boxes.get('LOW_FRONT_ARMREST').max.y*1000;if(Math.abs(arm-840)>.05)throw Error('Nominal armrest '+arm);rows.push({node:'LOW_FRONT_ARMREST',axis:'y-top',expectedMm:840,actualMm:+arm.toFixed(5),toleranceMm:.05});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const actions=['P','Q'].map(value=>{const node='READ_'+value;return{node,action:'select',value,label:'Read fixed mark '+value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'13-13',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,actionModule:'card.mjs',interactionNotes:'Separate immutable synthetic coordinate card. Attach chart visual to +Z of READER_SCREEN. Equipment is static and nonfunctional.',verification:rows},null,2)+'\n');console.log('Metric check count:',rows.length,'and triangle count:',tri);
