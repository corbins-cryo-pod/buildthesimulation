import { readFileSync,writeFileSync } from 'node:fs';
import { Box3,Vector3,Quaternion,Matrix4 } from 'three';
import { defaults,simulate,exampleSamples,analyze,importCSV,replay } from '../../../public/equipment/07-02/solver.mjs';
const base=new URL('../../../public/equipment/07-02/',import.meta.url);
export const read=file=>readFileSync(new URL(file,base),'utf8');
function bounds(){
  const glb=readFileSync(new URL('geometry/heracell-vios-160i.glb',base));
  const length=glb.readUInt32LE(12),doc=JSON.parse(glb.toString('utf8',20,20+length));
  const bin=28+length,parts={},all=new Box3();
  function visit(id,parent){
    const n=doc.nodes[id],matrix=new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1]))).premultiply(parent);
    if(n.mesh!==undefined){
      const part=new Box3();
      for(const p of doc.meshes[n.mesh].primitives){
        const a=doc.accessors[p.attributes.POSITION],v=doc.bufferViews[a.bufferView];
        if(a.componentType!==5126 || a.type!=='VEC3')throw Error('Expected float position triplets');
        let offset=bin+(a.byteOffset??0)+(v.byteOffset??0);
        for(let i=0;i<a.count;i++,offset+=v.byteStride??12){
          part.expandByPoint(new Vector3(glb.readFloatLE(offset),glb.readFloatLE(offset+4),glb.readFloatLE(offset+8)).applyMatrix4(matrix));
        }
      }
      all.union(part);parts[n.name]=part;
    }
    for(const c of n.children??[])visit(c,matrix);
  }
  for(const id of doc.scenes[doc.scene??0].nodes)visit(id,new Matrix4());
  return {parts,all};
}
export function verify(){
  const rows=[];
  function check(test,expected,actual,unit,tolerance){
    rows.push({test,expected,actual:Number(actual.toFixed(8)),unit,tolerance,pass:Math.abs(expected-actual)<=tolerance});
  }
  const {all,parts}=bounds(),size=all.getSize(new Vector3()).multiplyScalar(1000);
  check('Geometry · closed cabinet width',637,size.x,'mm',0.5);
  check('Geometry · closed cabinet height',905,size.y,'mm',0.5);
  check('Geometry · closed cabinet depth',790,size.z,'mm',0.5);
  check('Geometry · clear chamber width',470,1000*(parts['ChamberSide+1'].min.x-parts['ChamberSide-1'].max.x),'mm',.1);
  check('Geometry · largest width error across three 423 mm shelves',0,Math.max(...[1,2,3].map(i=>Math.abs(parts['Shelf'+i].getSize(new Vector3()).x*1000-423))),'mm',.1);
  const fixture=importCSV('time_s,temp_C,co2_pct,glass_open\n0,,2,0\n15,,3.5,1\n25,,4.5,0\n40,,6,0','linear arithmetic fixture');
  const [a,b]=analyze(fixture,[{...exampleSamples[0],enter_s:10,leave_s:30},{...exampleSamples[1],enter_s:25,leave_s:40}]).samples;
  check('Analytic · mean of clipped linear ramp',4,a.statistics.co2_pct.mean,'vol %',1e-10);
  check('Analytic · threshold crossing at 25 s',15,a.statistics.co2_pct.below_s,'s',1e-10);
  check('Interval · door overlap',10,a.glassOpen_s,'s',0);
  check('Boundary · entry at closing edge',0,b.glassOpen_s,'s',0);
  const opening=simulate({...defaults,start_s:0,open_s:15});
  check('Analytic · first CO₂ exchange half-life',2.52,opening.readings[15].co2_pct,'vol %',1e-9);
  const twice=simulate({...defaults,start_s:0,open_s:30});
  check('Control · two open half-lives',1.28,twice.readings[30].co2_pct,'vol %',1e-9);
  check('Control · glass remains closed',5,simulate({...defaults,glass:false}).readings.at(-1).co2_pct,'vol %',1e-9);
  let blocked=0;try{simulate({...defaults,gasConnected:false});}catch{blocked=1;}
  check('Interlock · disconnected supply rejected',1,blocked,'boolean',0);
  const tc=replay(read('records/tc180-co2.csv'),'tc'),temp=replay(read('records/center-temperature.csv'),'temperature');
  const trough=tc.readings.reduce((a,b)=>b.co2_pct<a.co2_pct?b:a);
  check('Manufacturer plot · TC minimum',0.70,trough.co2_pct,'vol %',.05);
  check('Manufacturer plot · TC minimum time',318,trough.time_s,'s',6);
  check('Manufacturer plot · centre temperature minimum',28.2,Math.min(...temp.readings.map(r=>r.temp_C)),'°C',.12);
  const [early,late]=analyze(tc,exampleSamples).samples;
  check('Register · sample A includes low CO₂',.70,early.statistics.co2_pct.min,'vol %',.05);
  check('Register · sample B after recovery',5,late.statistics.co2_pct.min,'vol %',.05);
  check('Register · late sample below 4.5 vol %',0,late.statistics.co2_pct.below_s,'s',0);
  check('Register · early sample inferred door overlap',30,early.glassOpen_s,'s',0);
  return rows;
}
if(process.argv.includes('--write')){
  const rows=verify();if(rows.some(r=>!r.pass))throw Error(JSON.stringify(rows.filter(r=>!r.pass)));
  writeFileSync(new URL('verification.json',base),JSON.stringify(rows,null,2)+'\n');
}
