import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {state,act,analyze,interferogram,reconstruct,sampling,DX,csv} from '../../../public/equipment/05-11/solver.mjs';
const dir=new URL('../../../public/equipment/05-11/',import.meta.url),url=x=>new URL(x,dir),read=x=>fs.readFileSync(url(x)),save=(x,d)=>fs.writeFileSync(url(x),typeof d==='string'?d:JSON.stringify(d,null,2)+'\n');
export function proof(){
 const cases=[], add=(id,expected,actual,unit,tolerance,pass)=>cases.push({id,expected,actual,unit,tolerance,outcome:pass?'PASS':'FAIL'}),num=(id,e,a,u,t)=>add(id,e,a,u,t,Math.abs(e-a)<=t);
 const decade={schema:'bts.ftir-intensity.v1',sampleId:'DECIMAL-ATTENUATION',revision:0,rows:[600,780,900,1000,1200,1500,2000,2800,3200,3800].map(w=>({wavenumberCm:w,background:2,sample:w>=900&&w<=1500?.2:2})),provenance:{kind:'synthetic independent ratio fixture'}};
 const d=analyze(decade);num('known attenuation overall maximum error',0,Math.max(...d.rows.map((p,i)=>Math.abs(p.absorbance-(decade.rows[i].sample===.2?1:0)))),'base-10 absorbance',1e-12);
 const N=4096,M=N/2,p=sampling(N);num('Nyquist',8000,p.nyquistCm,'cm^-1',1e-12);num('bin pitch',3.90625,p.wavenumberPitchCm,'cm^-1',1e-12);num('maximum OPD',.128,p.maxAbsOpdCm,'cm',1e-12);
 const t=w=>Float64Array.from({length:N},(_,i)=>Math.cos(2*Math.PI*w*(i-M)*DX));
 const top=y=>y.reduce((a,b)=>b.intensity>a.intensity?b:a),rect=reconstruct(t(1500),'rect'),hann=reconstruct(t(1500),'hann');
 num('on-bin analytic tone',1500,top(rect).wavenumberCm,'cm^-1',1e-12);num('on-bin amplitude',2048,top(rect).unnormalizedMagnitude,'unnormalized DFT',1e-9);
 num('off-bin nearest frequency',1023.4375,top(reconstruct(t(1024),'rect')).wavenumberCm,'cm^-1',1e-12);
 num('Hann nearest leakage',.5,hann[383].intensity/hann[384].intensity,'normalized ratio',1e-10);num('Rectangular nearest leakage',0,rect[383].intensity/rect[384].intensity,'normalized ratio',1e-10);
 const e=state();act(e,'background');act(e,'load','BLANK');act(e,'clamp');const blank=act(e,'acquire');
 num('identical blank',0,Math.max(...blank.rows.map(x=>Math.abs(x.absorbance))),'base-10 absorbance',1e-12);
 act(e,'clamp');act(e,'load','PMMA');act(e,'clamp');const result=act(e,'acquire'),max=result.rows.reduce((a,b)=>b.absorbance>a.absorbance?b:a);
 add('synthetic PMMA option','PMMA',result.matches[0]?.key,'label','exact',result.matches[0]?.key==='PMMA');num('PMMA imposed center',1728,max.wavenumberCm,'cm^-1',p.wavenumberPitchCm);
 act(e,'window','rect');let error='';try{act(e,'acquire')}catch(r){error=r.message}
 add('stale background rejection','explicit error and no export',error,'status','exact',error.includes('fresh')&&e.result===null);
 const b=read('nicolet-is50.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),m=JSON.parse(read('xr-manifest.json'));
 const find=k=>g.nodes.find(n=>n.name===k),nom=g.meshes[find('molded_base').mesh].primitives[0].attributes.POSITION,a=g.accessors[nom],metric=[1000*(a.max[0]-a.min[0]),1000*(a.max[2]-a.min[2])];
 const expected=[603.123,736.4984];add('native base width and depth',expected,metric,'mm W/D',.75,metric.every((v,i)=>Math.abs(v-expected[i])<=.75));
 const xyz=['sample_lid_hinge','atr_pressure_arm','atr_deck','atr_touch','power_switch'];add('VR stable glTF actions',true,xyz.every(k=>find(k)), 'names/asset size','exact',xyz.every(k=>find(k))&&m.geometry.bytes===b.length);
 return {report:{deviceId:'05-11',scope:'Analytical/synthetic reference only. No hardware calibration, measured library or physical headset validation.',cases},result,decade};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const a=proof();save('verification.json',a.report);save('example-output.json',a.result);save('decade-example.json',a.decade);save('example-output.csv',csv(a.result));console.table(a.report.cases.map(c=>({id:c.id,actual:JSON.stringify(c.actual),status:c.outcome})));if(a.report.cases.some(c=>c.outcome!=='PASS'))process.exitCode=1}
