import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/15-05/',import.meta.url),buf=readFileSync(new URL('biospec-closed.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['MAGNET_SHELL_1650','x',1650],['BRUKER_7030_USR_V2_DOCUMENTARY','z',1900],['CHART_FACE','x',607]].map(([node,k,e])=>{const v=boxes.get(node).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.15)throw Error(node+' '+k+' '+v+' not '+e);return{node,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.15}});
const rim=j.nodes.find(n=>n.name==='BORE_RIM_300'),p=j.meshes[rim.mesh].primitives[0],a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],base=28+buf.readUInt32LE(12)+(v.byteOffset??0)+(a.byteOffset??0);let rMin=Infinity;
for(let k=0;k<a.count;k++){const i=base+k*(v.byteStride??12);rMin=Math.min(rMin,Math.hypot(buf.readFloatLE(i),buf.readFloatLE(i+4)-.985));}
if(Math.abs(rMin*2000-300)>.15)throw Error('Rim inner diameter '+(rMin*2000));rows.push({node:rim.name,measurement:'innerDiameter',expectedMm:300,actualMm:+(rMin*2000).toFixed(5),toleranceMm:.15});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const actions=['A','B','U'].map(value=>{const node='FRAME_'+value;return{node,action:'picture',value,label:'Inspect authored geometric card '+value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'15-05',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,actionModule:'phantom.mjs',interactionNotes:'Only the physically detached, unconnected geometry display has ray actions. The instrument exterior is a static exhibit, not an MRI volume or hardware system.',verification:rows},null,2)+'\n');console.log('Metric checks:',rows.length,'triangles:',tri);
