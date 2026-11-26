import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/13-02/',import.meta.url),buf=readFileSync(new URL('crossbeam550.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['CABINET_ENVELOPE','x',820],['CABINET_ENVELOPE','z',1083],['CROSSBEAM550_DOCUMENTARY','y',1750],['FLOOR_PAD','x',80],['FLOOR_PAD','z',80],['INSPECTOR_SCREEN','x',487],['INSPECTOR_SCREEN','y',307]].map(([n,k,e])=>{const v=boxes.get(n).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.03)throw Error(n+' '+k+' '+v+' expected '+e);return{node:n,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.03}});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const actions=['body','void','diagonal'].map(value=>{const node='INSPECT_'+value.toUpperCase();return{node,action:'inspect',value,label:'Inspect '+value,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'13-02',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,actionModule:'section.mjs',interactionNotes:'Attach a passive synthetic diagram as a texture to the +Z face of INSPECTOR_SCREEN. Documentary case is inactive. Select only body, void or chord.',verification:rows},null,2)+'\n');console.log('Passed',rows.length,'metric checks; triangles',tri);
