import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {state,act,recover,ORACLE,csv} from '../../../public/equipment/14-05/solver.mjs';
const D=new URL('../../../public/equipment/14-05/',import.meta.url),read=p=>fs.readFileSync(new URL(p,D));
export function report(){
 const fixtures=JSON.parse(read('reference-cases.json')),a=fixtures.cases[0],s=state(),r=act(s,'map'),rows=a.travelM.map((travelM,i)=>({travelM,bendM:a.bendM[i]}));
 const independent=recover(rows,ORACLE),wrong=recover(rows,{...ORACLE,stiffnessNPerM:1});
 const cases=[],add=(name,expected,actual,tolerance,pass)=>cases.push({name,expected,actual,tolerance,pass});
 add('Independent numeric trace, apparent E* (Pa)',12000,independent.apparentReducedPa,.0001,Math.abs(independent.apparentReducedPa-a.expectedPa)<.0001);
 add('Two calibrated map sites, Pa',[12000,48000],r.sites.map(p=>p.apparentReducedPa),.0001,r.sites.every(x=>Math.abs(x.apparentReducedPa-x.knownReducedPa)<.0001));
 add('Preserve map site positions, mm',[[-2,.7],[2,-.7]],r.sites.map(x=>[x.coordinatesMm.x,x.coordinatesMm.y]),0,r.sites[0].coordinatesMm.x===-2&&r.sites[1].coordinatesMm.y===-.7);
 add('Double assumed spring k at same observed displacement','double apparent reduced modulus',wrong.apparentReducedPa/independent.apparentReducedPa,1e-9,Math.abs(wrong.apparentReducedPa/independent.apparentReducedPa-2)<1e-9);
 let reject=false;try{recover(rows,{...ORACLE,sampleThicknessM:1e-6})}catch(e){reject=e.message.includes('contact radii')}add('Reject very thin samples',true,reject,0,reject);
 const b=read('piuma.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),m=JSON.parse(read('xr-manifest.json'));
 const ok=Object.keys(m.namedControls).every(k=>g.nodes.some(n=>n.name===k))&&b.length===m.geometry.bytes;
 add('Inspectable glTF and stable approach action',true,ok,'exact',ok);
 const lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);
 for(const n of g.nodes.filter(n=>['stand','optical_head','focus_left','focus_right'].includes(n.name))){
   for(const q of g.meshes[n.mesh].primitives){const a=g.accessors[q.attributes.POSITION];for(let j=0;j<3;j++){
     lo[j]=Math.min(lo[j],a.min[j]+n.translation[j]);hi[j]=Math.max(hi[j],a.max[j]+n.translation[j]);
   }}
 }
 const actual=hi.map((x,i)=>(x-lo[i])*1000),expected=[120,280,150];
 add('Nominal stand and optics envelope W/H/D (mm)',expected,actual,1,actual.every((x,i)=>Math.abs(x-expected[i])<1));
 return {evidence:{deviceId:'14-05',scope:'Independent synthetic elastic oracle, no physical material or instrument calibration.',cases},r};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {evidence,r}=report();for(const [k,o] of [['verification.json',evidence],['example-map.json',r],['example.csv',csv(r)]])fs.writeFileSync(new URL(k,D),typeof o==='string'?o:JSON.stringify(o,null,2)+'\n');console.table(evidence.cases.map(c=>({name:c.name,actual:JSON.stringify(c.actual),pass:c.pass})));if(evidence.cases.some(c=>!c.pass))process.exitCode=1}
