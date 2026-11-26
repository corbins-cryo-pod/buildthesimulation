import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {act,state,film,geometry,measurement,sheetCSV,PITCH,CAL} from '../../../public/equipment/05-06/resmap.mjs';
const p=new URL('../../../public/equipment/05-06/',import.meta.url),f=n=>new URL(n,p);
export function examples(){
 const standard=film(),a=state();act(a,'lid');const output=act(a,'scan','edge');
 const voltages={schema:'bts.sheet-voltage-map.v1',sampleId:standard.sampleId,revision:standard.revision,diameterM:standard.diameterM,provenance:{type:'simulated terminal voltages; this is not measured data',calibrationId:CAL},sites:output.rows.map(({siteId,site,angleRad,currentA,voltageV,reversedVoltageV})=>({siteId,...site,angleRad,currentA,voltageV,reversedVoltageV}))};
 return {standard,output,voltages};
}
export function report(){
 const refs=JSON.parse(fs.readFileSync(f('reference-cases.json'))),cases=[],{standard,output,voltages}=examples();
 const known=refs.cases.find(x=>x.id==='infinite').expected,spot={xM:0,yM:0},off={xM:.0405,yM:0};
 function add(id,expected,actual,units,tolerance,ok){cases.push({id,expected,actual,units,tolerance,outcome:ok?'PASS':'FAIL'})}
 function numeric(id,expect,actual,units,tol){add(id,expect,actual,units,tol,Number.isFinite(actual)&&Math.abs(expect-actual)<=tol)}
 const plane=measurement(standard,spot,0,{boundary:'infinite',currentA:.001});
 numeric('infinite',known,plane.voltageV*1000,'mV',1e-9);
 numeric('material',100,output.rows[0].sheetOhmSq,'Ω/sq',1e-9);
 numeric('radial',4.49925,geometry(.1,off,0).fOhmsPerOhm,'Ω/sq per Ω',6e-6);
 numeric('tangential',4.49961,geometry(.1,off,Math.PI/2).fOhmsPerOhm,'Ω/sq per Ω',6e-6);
 const forward=measurement(standard,off,0,{currentA:.001,offsetV:.0005}),reverse=measurement(standard,off,0,{currentA:-.001,offsetV:.0005});
 numeric('reversal',0,forward.oddV+reverse.oddV,'V',1e-12);
 numeric('offset',.0005,forward.estimatedOffsetV,'V',1e-12);
 numeric('resistance under reversal',100,reverse.sheetOhmSq,'Ω/sq',1e-9);
 const er=output.rows.at(-1);add('edge-check',true,er.edgeMultiplier<output.rows[0].edgeMultiplier&&Math.abs(100-er.sheetOhmSq)<1e-9&&er.apparentInfiniteOhmSq>100,'more voltage at edge; corrected R unchanged','exact direction; 1e-9 Ω/sq',er.edgeMultiplier<output.rows[0].edgeMultiplier&&Math.abs(100-er.sheetOhmSq)<1e-9&&er.apparentInfiniteOhmSq>100);
 const rejection=(id,fn,rx)=>{try{fn();add(id,'Rejection','No error','','exact',false)}catch(e){add(id,'Rejection',e.message,'','exact',rx.test(e.message))}};
 rejection('coverage',()=>geometry(.1,{xM:.049,yM:0},0),/P4/);
 rejection('overload',()=>measurement({...standard,resistivityOhmM:.002},spot,0,{currentA:.01}),/overload/);
 const s=state();rejection('mechanical',()=>act(s,'run'),/close shield/);act(s,'lid');act(s,'head');
 const saved={...s.site};rejection('motion-probe-down',()=>act(s,'move',off),/Raise the probe/);
 add('motion unchanged',saved,s.site,'m',0,saved.xM===s.site.xM&&saved.yM===s.site.yM&&s.result===null);
 const r=act(state(),'infer',voltages);add('inferred voltage map',voltages.sites.length,r.rows.length,'sites; same sample ID, one revision increment',0,r.rows.length===voltages.sites.length&&r.sampleId===voltages.sampleId&&r.revision===voltages.revision+1);
 const b=fs.readFileSync(f('resmap-178.glb')),J=b.readUInt32LE(12),asset=JSON.parse(b.subarray(20,20+J)),mdat=28+J;
 const find=id=>asset.nodes.find(x=>x.name===id),m=JSON.parse(fs.readFileSync(f('xr-manifest.json')));
 // Envelope defined on chassis baseline plus closed top cover. Rack fittings, cables and host are excluded.
 const names=['cabinet','shield'],lo=[Infinity,Infinity,Infinity],hi=lo.map(()=>-Infinity);
 for(const name of names){const node=find(name),offsets=name==='shield'?find('shield_hinge').translation:node.translation;for(const pr of asset.meshes[node.mesh].primitives){const a=asset.accessors[pr.attributes.POSITION],v=asset.bufferViews[a.bufferView],off=mdat+(v.byteOffset??0);for(let i=0;i<a.count;i++)for(let k=0;k<3;k++){const x=b.readFloatLE(off+i*12+4*k)+offsets[k];lo[k]=Math.min(lo[k],x);hi[k]=Math.max(hi[k],x)}}}
 const sizes=hi.map((x,i)=>1000*(x-lo[i])),expected=[304.8,254,482.6];add('metric',expected,sizes,'mm, chassis and closed lid',.6,sizes.every((v,i)=>Math.abs(v-expected[i])<=.6));
 const ids=['P1','P2','P3','P4'],pitch=ids.slice(1).map((name,i)=>1e3*(find(name).translation[0]-find(ids[i]).translation[0]));
 add('physical-pitch',[1,1,1],pitch,'mm',.001,pitch.every(d=>Math.abs(d-PITCH*1e3)<=.001)&&find('probe_yaw').children.length===4);
 add('XR anchors',true,Object.keys(m.interactionNodes).every(id=>Boolean(find(id)))&&m.geometry.bytes===b.length,'present; binary size matches',0,Object.keys(m.interactionNodes).every(id=>Boolean(find(id)))&&m.geometry.bytes===b.length);
 return {deviceId:'05-06',scope:'Analytical/NBS published reference numbers and extracted model coordinates. No empirical hardware or XR test.',cases};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=report(),{standard,output,voltages}=examples();for(const [key,obj] of [['film-example',standard],['example-map',output],['voltage-map-example',voltages],['verification',r]])fs.writeFileSync(f(key+'.json'),JSON.stringify(obj,null,2)+'\n');fs.writeFileSync(f('example-map.csv'),sheetCSV(output));console.table(r.cases.map(({id,outcome,actual})=>({id,outcome,actual:JSON.stringify(actual)})));if(r.cases.some(c=>c.outcome!=='PASS'))process.exitCode=1}
