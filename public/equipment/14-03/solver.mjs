// Ideal, passive, isothermal small-amplitude parallel-plate rotational experiment.
export const RADIUS=.02,TEMP=25;
const valid=(x,lo,hi)=>Number.isFinite(x)&&x>=lo&&x<=hi;
const bad=(code,message)=>({ok:false,code,message});
export const newtonian=()=>({schema:'bts.rheology-material.v1',sampleId:'VIRTUAL-N2',revision:1,material:'ideal Newtonian liquid',viscosityPaS:2});
export const maxwell=()=>({schema:'bts.rheology-material.v1',sampleId:'VIRTUAL-M100',revision:1,material:'ideal single-mode Maxwell liquid',modulusPa:100,relaxationS:1});
export const initial=()=>({power:true,loaded:true,engaged:true,sample:newtonian(),strainPct:1,gapMm:1,startHz:.1,stopHz:10,count:3,revision:0});
export function material(raw){
 if(!raw||raw.schema!=='bts.rheology-material.v1'||typeof raw.sampleId!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(raw.sampleId)||!Number.isInteger(raw.revision)||raw.revision<0)return bad('sample','A supported virtual material must have a specimen ID and revision.');
 const common={schema:raw.schema,sampleId:raw.sampleId,revision:raw.revision,material:raw.material};
 if(raw.material==='ideal Newtonian liquid'&&valid(raw.viscosityPaS,.001,100))return {ok:true,value:{...common,viscosityPaS:raw.viscosityPaS}};
 if(raw.material==='ideal single-mode Maxwell liquid'&&valid(raw.modulusPa,1,10000)&&valid(raw.relaxationS,.01,100))return {ok:true,value:{...common,modulusPa:raw.modulusPa,relaxationS:raw.relaxationS}};
 return bad('sample','Use Newtonian viscosity 0.001–100 Pa s or Maxwell modulus 1–10,000 Pa and 0.01–100 s relaxation.');
}
export function moduli(m,w){
 if(m.material==='ideal Newtonian liquid')return {storagePa:0,lossPa:m.viscosityPaS*w};
 const z=w*m.relaxationS,b=m.modulusPa/(1+z*z);
 return {storagePa:b*z*z,lossPa:b*z};
}
export function dispatch(s,a,v){
 if(a==='reset')return {ok:true,state:{...initial(),revision:s.revision}};
 if(a==='power')return {ok:true,state:{...s,power:!s.power,engaged:false}};
 if(a==='head')return s.power?{ok:true,state:{...s,engaged:!s.engaged}}:bad('standby','Power on before moving the upper plate.');
 if(a==='load'||a==='sample'){
  if(s.engaged)return bad('fixture','Raise the upper plate before changing the sample.');
  if(a==='load')return {ok:true,state:{...s,loaded:!s.loaded}};
  const q=material(v);if(!q.ok)return q;return {ok:true,state:{...s,loaded:true,sample:q.value}};
 }
 if(a==='settings')return {ok:true,state:{...s,...v}};
 if(a==='run')return sweep(s);
 return bad('control','Unknown control.');
}
export function sweep(s){
 if(!s.power||!s.loaded||!s.engaged)return bad('interlock','Power on, load a sample, and lower the parallel plate to the test gap.');
 const q=material(s.sample);if(!q.ok)return q;
 if(!valid(s.strainPct,.05,5)||!valid(s.gapMm,.3,2)||!valid(s.startHz,.05,20)||!valid(s.stopHz,.05,20)||s.startHz>=s.stopHz||!Number.isInteger(s.count)||!valid(s.count,3,41))return bad('range','Use ascending 0.05–20 Hz; 3–41 points; a 0.3–2 mm gap and 0.05–5% rim strain.');
 const sFraction=s.strainPct/100,m=q.value,H=s.gapMm/1000,angle=sFraction*H/RADIUS,K=Math.PI*RADIUS**3*sFraction/2;
 const points=Array.from({length:s.count},(_,i)=>{
  const f=i===0?s.startHz:i===s.count-1?s.stopHz:s.startHz*(s.stopHz/s.startHz)**(i/(s.count-1)),w=2*Math.PI*f;
  const {storagePa,lossPa}=moduli(m,w);
  return {frequencyHz:f,omegaRadS:w,storagePa,lossPa,phaseDegrees:Math.atan2(lossPa,storagePa)*180/Math.PI,rimStressPa:sFraction*Math.hypot(storagePa,lossPa),imposedAngleRad:angle,torqueAmplitudeNm:K*Math.hypot(storagePa,lossPa)};
 });
 const fit=points.reduce((a,p)=>a+p.omegaRadS*p.lossPa,0)/points.reduce((a,p)=>a+p.omegaRadS*p.omegaRadS,0);
 const rmse=Math.sqrt(points.reduce((a,p)=>a+(p.lossPa-fit*p.omegaRadS)**2,0)/points.length);
 const runRevision=s.revision+1;
 return {ok:true,state:{...s,revision:runRevision},result:{schema:'bts.rheology-sweep.v1',classification:'simulated',instrument:'TA Instruments Discovery HR-2',sampleId:m.sampleId,sampleRevision:m.revision,runRevision,material:m,geometry:{kind:'parallel plate',diameterMm:40,gapMm:s.gapMm,temperatureC:TEMP,volumeAssumingFullFillMl:Math.PI*RADIUS**2*H*1e6},inputs:{rimStrainPct:s.strainPct,startHz:s.startHz,stopHz:s.stopHz,points:s.count},units:{frequencyHz:'Hz',omegaRadS:'rad/s',storagePa:'Pa',lossPa:'Pa',imposedAngleRad:'rad',torqueAmplitudeNm:'N m'},fit:{method:'unweighted diagnostic fit of G″=ηω through zero, even for a non-Newtonian witness',viscosityPaS:fit,lossRMSEPa:rmse},points}};
}
export function csv(r){const ks=['frequencyHz','omegaRadS','storagePa','lossPa','phaseDegrees','rimStressPa','imposedAngleRad','torqueAmplitudeNm'];return ['sampleId,sampleRevision,runRevision,'+ks.join(','),...r.points.map(p=>[r.sampleId,r.sampleRevision,r.runRevision,...ks.map(k=>p[k])].join(','))].join('\n')+'\n';}
