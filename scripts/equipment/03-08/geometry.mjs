import {readFileSync,writeFileSync} from 'node:fs';import {Box3,Matrix4,Quaternion,Vector3} from 'three';
const dir=new URL('../../../public/equipment/03-08/',import.meta.url),buf=readFileSync(new URL('labcoter2.glb',dir)),j=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)));
const boxes=new Map(),round=v=>v.toArray().map(x=>+x.toFixed(6)),xyz=(arr,def)=>new Vector3(...(arr??def));
function visit(i,parent){
 const node=j.nodes[i],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(xyz(node.translation,[0,0,0]),new Quaternion(...(node.rotation??[0,0,0,1])),xyz(node.scale,[1,1,1]));
 const world=parent.clone().multiply(local),b=new Box3();
 for(const p of j.meshes[node.mesh]?.primitives??[]){const a=j.accessors[p.attributes.POSITION];b.union(new Box3(xyz(a.min),xyz(a.max)).applyMatrix4(world))}
 for(const k of node.children??[])b.union(visit(k,world));
 boxes.set(node.name,b);return b;
}
const total=new Box3();for(const n of j.scenes[j.scene].nodes)total.union(visit(n,new Matrix4()));
const mm=(n,k)=>{const b=boxes.get(n);return (k==='top'?b.max.y:b.getSize(new Vector3())[k])*1e3};const rows=[['cabinet width','CABINET_FOOTPRINT','x',495],['cabinet depth','CABINET_FOOTPRINT','z',604],['system nominal height','NOMINAL_CHAMBER','top',1283],['chamber nominal width','NOMINAL_CHAMBER','x',304.8],['chamber nominal height','NOMINAL_CHAMBER','y',304.8],['authored dry coupon width','WITNESS_RECT','x',8],['authored dry coupon depth','WITNESS_RECT','z',5]].map(([label,n,k,expectedMm])=>({label,expectedMm,actualMm:mm(n,k),toleranceMm:.06,pass:Math.abs(mm(n,k)-expectedMm)<=.06}));if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(r=>!r.pass)));
const controls=[['CHAMBER_PANE','cutaway','Toggle display-only exterior sleeve'],['WITNESS_COUPON','inspect','Read pre-authored geometry tags']].map(([mesh,action,label])=>({mesh,action,label,minM:round(boxes.get(mesh).min),maxM:round(boxes.get(mesh).max)}));writeFileSync(new URL('xr.json',dir),JSON.stringify({schema:'bts.station.xr.v1',asset:'/equipment/03-08/labcoter2.glb',station:'/equipment/03-08/witness.mjs',dispatch:'station(); act(state,action,value)',unit:'m',up:'+Y',front:'+Z',origin:'Floor at centre of main cabinet.',controls,geometry:{rows,nodes:j.nodes.length,triangles:j.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+j.accessors[p.indices].count/3,0),bytes:buf.length,minM:round(total.min),maxM:round(total.max)},scope:'Exterior approximations only. Cover toggle hides the visual sleeve; it does not animate a real mechanism or expose a service diagram.'},null,2)+'\n')
