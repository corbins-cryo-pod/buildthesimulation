import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {state,act,fixture,toWorld,toLocal,waveform,csv} from '../../../public/equipment/05-07/station.mjs';
const dir=new URL('../../../public/equipment/05-07/',import.meta.url),read=n=>fs.readFileSync(new URL(n,dir)),put=(n,s)=>fs.writeFileSync(new URL(n,dir),typeof s==='string'?s:JSON.stringify(s,null,2)+'\n');
function contactState(){const s=state();s.tips.forEach((t,index)=>act(s,'tip',{...t,index,gapM:0}));return s}
export function verify(){
 const rows=[],add=(id,expected,actual,units,tolerance,pass)=>rows.push({id,expected,actual,units,tolerance,outcome:pass?'PASS':'FAIL'});
 function num(id,e,a,u,t){add(id,e,a,u,t,Number.isFinite(a)&&Math.abs(a-e)<=t)}
 const s=contactState(),normal=act(s,'run'),last=r=>r.rows.at(-1);
 num('known resistor',1000,normal.terminalOhm,'Ω',.001);num('plus 1 volt',.001,last(normal).currentA,'A',1e-9);num('minus 1 volt',-.001,normal.rows[0].currentA,'A',1e-9);
 act(s,'tip',{index:0,...s.tips[0],gapM:1e-6});const open=act(s,'run');add('lift', ['open-contact','raised-tip',0,null],[open.topology,open.contacts[0].status,last(open).currentA,open.terminalOhm],'status, status, A, Ω','exact; 1 fA',open.topology==='open-contact'&&open.contacts[0].status==='raised-tip'&&last(open).currentA===0&&open.terminalOhm===null);
 act(s,'tip',{index:0,...s.tips[0],xM:s.tips[0].xM+55e-6,gapM:0});const missed=act(s,'run');
 add('off-pad','missed-pad',missed.contacts[0].status,'status','exact',missed.topology==='open-contact'&&missed.contacts[0].status==='missed-pad');
 let moved=false;try{act(s,'stage',{xM:.001,yM:0,thetaRad:0});moved=true}catch{}
 add('stage lock',false,moved,'no stage update or export','exact',!moved&&s.stage.xM===0&&s.result===null);
 const t=contactState(),f=fixture();f.resistors=[{id:'R1',a:'a',b:'c',ohm:1000},{id:'R2',a:'c',b:'b',ohm:1000},{id:'R3',a:'a',b:'b',ohm:2000}];t.coupon=f;t.contactOhm=5;
 const n=act(t,'run');num('series parallel including contacts',1010,n.terminalOhm,'Ω',.001);num('network current',1/1010,last(n).currentA,'A',1e-9);
 const k=contactState();k.sweep.currentLimitA=.0005;const a=act(k,'run');num('compliance terminal',.5,last(a).terminalV,'V',1e-6);num('compliance current',.0005,last(a).currentA,'A',1e-9);
 const transform={xM:.001,yM:-.002,thetaRad:5*Math.PI/180},start={xM:.0005,yM:0};const world=toWorld(start,transform),back=toLocal(world,transform);num('transform x',.001498097349045873,world.xM,'m',1e-12);num('roundtrip x',start.xM,back.xM,'m',1e-12);num('roundtrip y',0,back.yM,'m',1e-12);
 const ext=JSON.parse(read('keithley-setup.json')),ss=contactState();act(ss,'smu',ext);const routed=act(ss,'run');num('upstream request points',11,routed.rows.length,'points',0);num('upstream terminal current mismatch',0,Math.max(...routed.rows.map((p,i)=>Math.abs(p.currentA-ext.points[i].currentA))),'A',1e-9);
 const mesh=read('summit-11000b.glb'),N=mesh.readUInt32LE(12),payload=JSON.parse(mesh.subarray(20,20+N));
 function bbox(ids){const lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);
 for(const name of ids){const d=payload.nodes.find(n=>n.name===name);for(const p of payload.meshes[d.mesh].primitives){const a=payload.accessors[p.attributes.POSITION];for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],a.min[j]+d.translation[j]);hi[j]=Math.max(hi[j],a.max[j]+d.translation[j])}}}
 return hi.map((m,j)=>(m-lo[j])*1000)}
 const pb=bbox(['platen']),en=bbox(['platform','optics','bridge','rear','console','platen']);
 add('platen',[745,20,595],pb,'mm W/H/D',1,pb.every((x,i)=>Math.abs(x-[745,20,595][i])<=1));
 add('station',[862,811,831],en,'mm W/H/D',1,en.every((x,i)=>Math.abs(x-[862,811,831][i])<=1));
 const m=JSON.parse(read('xr-manifest.json')),valid=Object.keys(m.nodes).every(k=>payload.nodes.some(n=>n.name===k));add('XR anchors',true,valid,'GLB stable node IDs','exact',valid&&m.budget.bytes===mesh.length);
 return {report:{deviceId:'05-07',scope:'Analytical reference and nominal geometry; no empirical hardware/headset test.',rows},normal,open,routed,coupon:fixture()};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=verify();for(const [key,value] of [['verification.json',r.report],['contact-example.json',r.normal],['open-example.json',r.open],['coupon-example.json',r.coupon],['settled-volts.json',waveform(r.routed)],['contact-example.csv',csv(r.normal)]])put(key,value);console.table(r.report.rows.map(({id,outcome,actual})=>({id,outcome,actual:JSON.stringify(actual)})));if(r.report.rows.some(r=>r.outcome!=='PASS'))process.exitCode=1}
