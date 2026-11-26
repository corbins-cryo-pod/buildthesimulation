import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/15-13/',import.meta.url),buf=readFileSync(new URL('detached-locator.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['ENCLOSURE_OUTER_DATUM','x',280],['ENCLOSURE_OUTER_DATUM','z',198],['ENCLOSURE_OUTER_DATUM','y',95],['BODY_NOMINAL','x',80],['BODY_NOMINAL','z',62],['BODY_ZERO','x',84],['BODY_LARGE','z',70],['KEY_NOMINAL','x',14],['END_OF_FRONT_TAB','x',18]].map(([node,k,e])=>{const v=boxes.get(node).getSize(new Vector3())[k]*1000;if(Math.abs(v-e)>.05)throw Error(node+' '+k+' '+v+' not '+e);return{node,axis:k,expectedMm:e,actualMm:+v.toFixed(5),toleranceMm:.05}});
const keyedZ=boxes.get('END_OF_FRONT_TAB').min.z*1000,partZ=boxes.get('KEY_NOMINAL').max.z*1000;
if(Math.abs(keyedZ-partZ-2)>.05)throw Error('Nominal geometry key-tip clearance must be 2 mm');
rows.push({node:'KEY_NOMINAL to END_OF_FRONT_TAB',axis:'z',expectedMm:2,actualMm:+(keyedZ-partZ).toFixed(5),toleranceMm:.05});
const tri=j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(j.accessors[p.indices]?.count??j.accessors[p.attributes.POSITION].count)/3,0),actions=['ROTATE','CHECK'].map(k=>{const node='ACTION_'+k;return{node,action:k.toLowerCase(),label:k==='ROTATE'?'Turn the offline block by 90 degrees':'Check virtual geometry fit',boundsAtRestM:{min:round(boxes.get(node).min),max:round(boxes.get(node).max)}}});
const pivots=j.nodes.filter(n=>n.name.startsWith('BLOCK_')).map(n=>({node:n.name,translationM:n.translation,seatLocalXZ:[0,0],unseatedLocalY:.052,seatedLocalY:.012,axis:'Y'}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.xr-instrument.v1',equipmentId:'15-13',units:'m',axes:'+Y up; +Z keyed edge; X/Z plane',nominalBoundsM:{min:round(total.min),max:round(total.max)},budget:{byteLength:buf.length,nodes:j.nodes.length,triangles:tri},actions,pivots,actionModule:'fit.mjs',interactionNotes:'Resolve one named BLOCK_ preset; show only selected. Non-seating outcomes keep its pivot at rest. Only the physically separated gauge has actions; the unbuilt enclosure has none.',verification:rows},null,2)+'\n');console.log('Metric checks:',rows.length,'triangles:',tri);
