import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/16-04/',import.meta.url),buf=readFileSync(new URL('iq7000.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const rows=[['Production width','PRODUCTION_DATUM','x',265],['Production depth','PRODUCTION_DATUM','z',350],['Production height incl. top cap','cap_crown','top',498],['Q-POD base width','QPOD_BASE','x',211],['Q-POD base depth','QPOD_BASE','z',270],['Q-POD base height','QPOD_BASE','y',53],['Q-POD top','touch_console','top',792]].map(([label,n,k,expectedMm])=>{const b=boxes.get(n),actualMm=(k==='top'?b.max.y:b.getSize(new Vector3())[k])*1000,toleranceMm=.07;return{label,expectedMm,actualMm,toleranceMm,pass:Math.abs(expectedMm-actualMm)<=toleranceMm}});
if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(r=>!r.pass)));const controls=[['VIRTUAL_DIAL','dispense','Record simulated bottle allocation'],['BOTTLE_250','bottle','Mount/remove the virtual bottle'],['CARTRIDGE_PANEL','cartridge','Illustrative cassette cutaway'],['CARTRIDGE_CUTAWAY','cartridge','Return from illustrated cutaway']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));
writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/16-04/iq7000.glb',model:'/equipment/16-04/water.mjs',dispatch:'act(state,action,value), station(), report(state)',unit:'m',up:'+Y',front:'+Z',origin:'Bench surface near midpoint of the production unit and Q-POD, scale 1:1 metres.',controls,geometry:{rows,nodes:j.nodes.length,minM:round(total.min),maxM:round(total.max),bytes:buf.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0)},scope:'Exterior proportions from Merck brochure. Local harness, controls, bottle and illustrative cartridge shown only as scenery; not a service model or physical headset verification.'},null,2)+'\n')
