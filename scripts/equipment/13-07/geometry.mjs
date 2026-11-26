import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/13-07/',import.meta.url),buf=readFileSync(new URL('leica-uc7.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const n=j.nodes.find(q=>q.name==='DISPLAY_DIAGONAL_10_4'),p=j.meshes[n.mesh].primitives[0],a=j.accessors[p.attributes.POSITION],d=new Vector3(...a.max).sub(new Vector3(...a.min)).multiplyScalar(1000);
const f=boxes.get('REFERENCE_FOOTPRINT').getSize(new Vector3()).multiplyScalar(1000),rows=[['documented blank panel diagonal',Math.hypot(d.x,d.y),264.16],['estimated footprint X',f.x,415],['estimated footprint Z',f.z,505]].map(([label,v,e])=>{if(Math.abs(v-e)>.03)throw Error(label+' '+v+' not '+e);return{label,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.03}});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0);
const acts=[['PAIR_A','pair','A','Inspect card pair A'],['PAIR_B','pair','B','Inspect card pair B'],['GAUGE_ZOOM','zoom',undefined,'Toggle display-only zoom']];
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'13-07',units:'m',axes:'+X right, +Y up, +Z front',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions:acts.map(([node,action,value,label])=>({node,action,value,label,boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}})),actionModule:'gauge.mjs',interactionNotes:'Attach passive synthetic chart material to local +Z of DRY_PAD_SCREEN. Real instrument exterior and original controller are dormant. Documented screen diagonal; other dimensions approximate.',verification:rows},null,2)+'\n');console.log('Metric checks:',rows.length,'triangles:',tri);
