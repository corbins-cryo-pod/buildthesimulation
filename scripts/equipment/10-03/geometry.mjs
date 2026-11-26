import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/10-03/',import.meta.url),buf=readFileSync(new URL('axopatch-200b.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['rack width','AXO_RACK_FACE','x',482.6],['rack height','AXO_RACK_FACE','y',88.9],['rack depth excluding protrusions','AXO_SHELL','z',317.5],['CV203BU case width','CV203BU_CASE','x',17.78],['CV203BU case height','CV203BU_CASE','y',19.05],['CV203BU length','CV203BU_CASE','z',106.68]].map(([label,n,k,expectedMm])=>{let actualMm=(label.startsWith('rack depth')?boxes.get("AXO_RACK_FACE").max.z-boxes.get(n).min.z:boxes.get(n).getSize(new Vector3())[k])*1000;return{label,expectedMm,actualMm,toleranceMm:.08,pass:Math.abs(expectedMm-actualMm)<=.08}});
if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(r=>!r.pass)));const controls=[['POWER','power','Toggle virtual amplifier'],['GAIN','gain','Cycle documented alpha gain'],['FILTER','filter','Cycle virtual Bessel cutoff'],['DUMMY_SWITCHED_RESISTOR','connect','Connect the inert passive source'],['AXO_METER','run','Acquire synthetic trace']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/10-03/axopatch-200b.glb',station:'/equipment/10-03/levels.mjs',dispatch:'act(state,action,value), station(), waveform(result)',origin:'Bench surface near rack centre. metre-scale, +Y up, +Z front',controls,geometry:{rows,nodes:j.nodes.length,bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),minM:round(total.min),maxM:round(total.max)},limits:'Nominal casing dimensions checked; 3 m headstage lead illustrated shortened, input box fictional. No calibration or physical headset verification.'},null,2)+'\n')
