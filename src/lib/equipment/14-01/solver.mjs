// Inert monotonic linear tension model. No real machine control or material certification.
export const schema='bts.tensile-load-trace.v1';
export const defaults=()=>({sampleId:'polymer-reference-01',widthMm:5,thicknessMm:1,gaugeMm:25,modulusGPa:2,strokeMm:.10,speedMmMin:2,steps:51,cellN:500,frameNPerMm:0});
export const initial=()=>({config:defaults(),loaded:true,lower:true,upper:true,zeroSet:true,result:null,error:'',revision:0});
const need=(v,e)=>{if(!v)throw Error(e)},validR=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validate(c){
 need(c&&typeof c.sampleId==='string'&&c.sampleId.trim().length&&c.sampleId.length<=96,'Enter a valid specimen ID.');
 need(validR(c.widthMm,.5,12)&&validR(c.thicknessMm,.05,3)&&validR(c.gaugeMm,5,50),'Gauge ranges: width 0.5–12 mm, thickness 0.05–3 mm, length 5–50 mm.');
 need(validR(c.modulusGPa,.005,5),'Choose 0.005–5 GPa for the ideal coupon.');
 need(validR(c.strokeMm,0,3)&&validR(c.speedMmMin,.05,20),'Supported virtual stroke 0–3 mm and speed 0.05–20 mm/min.');
 need(Number.isInteger(c.steps)&&validR(c.steps,5,301),'Choose 5–301 sample points.');
 need([50,500].includes(c.cellN),'Select virtual 50 N or 500 N cell.');
 need(c.frameNPerMm===0||validR(c.frameNPerMm,25,10000),'Use a rigid train (0) or effective stiffness 25–10,000 N/mm.');
}
const slope=(p,x,y)=>{
 if(p.length<2)return null;const mx=p.reduce((s,v)=>s+v[x],0)/p.length,my=p.reduce((s,v)=>s+v[y],0)/p.length;
 let xx=0,xy=0;for(const v of p){xx+=(v[x]-mx)**2;xy+=(v[x]-mx)*(v[y]-my)}return xx>0?xy/xx:null;
};
export function solve(c,inputRevision=0){
 validate(c);need(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid revision.');
 const areaM2=c.widthMm*c.thicknessMm*1e-6,initialGaugeM=c.gaugeMm*.001,modelModulusPa=c.modulusGPa*1e9;
 const gaugeStiffnessNPerM=modelModulusPa*areaM2/initialGaugeM,frame=c.frameNPerMm*1000;
 const trainStiffnessNPerM=frame===0?gaugeStiffnessNPerM:1/(1/gaugeStiffnessNPerM+1/frame);
 const points=Array.from({length:c.steps},(_,i)=>{
  const crossheadM=(c.strokeMm/1000)*i/(c.steps-1),timeS=crossheadM/(c.speedMmMin/60000);
  const ideal=trainStiffnessNPerM*crossheadM,gaugeM=ideal/gaugeStiffnessNPerM,strain=gaugeM/initialGaugeM,
        domainExceeded=strain>.02+1e-14,overRange=!domainExceeded&&ideal>c.cellN*(1+2e-15),forceN=domainExceeded||overRange?null:ideal;
  return {i,timeS,crossheadM,gaugeM:domainExceeded?null:gaugeM,engineeringStrain:domainExceeded?null:strain,idealForceN:domainExceeded?null:ideal,forceN,engineeringStressPa:forceN===null?null:forceN/areaM2,domainExceeded,overRange};
 });
 const first=points.filter(p=>p.forceN!==null&&p.engineeringStrain<=.01+1e-14);
 return {schema,deviceId:'14-01',kind:'simulated',model:'Instron 5944 with 2710-112-style side-action grips',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,configuration:{...c},geometry:{areaM2,initialGaugeM,shape:'Original rectangular gauge dogbone'},modelModulusPa,gaugeStiffnessNPerM,trainStiffnessNPerM,units:{crossheadM:'m',gaugeM:'m',timeS:'s',forceN:'N',idealForceN:'N',engineeringStrain:'1',engineeringStressPa:'Pa',modulusPa:'Pa',stiffness:'N/m'},points,fit:{stiffnessNPerM:slope(first,'crossheadM','forceN'),modulusPa:slope(first,'engineeringStrain','engineeringStressPa'),points:first.length,domain:'unflagged gauge strain ≤1%'},overRangeCount:points.filter(p=>p.overRange).length,outsideDomainCount:points.filter(p=>p.domainExceeded).length,provenance:{model:'uniform linear gauge with optional linear load-train compliance; no yield/rupture',trainingDomain:'nonnegative engineering strain ≤0.02',physicalMeasurement:false,history:[{deviceId:'14-01',operation:'displacement-controlled tension',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,p){
 const idle={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='set'){const geom=['widthMm','thicknessMm','gaugeMm','sampleId'];const changed=geom.some(k=>p[k]!==undefined&&p[k]!==s.config[k]);return {...idle,zeroSet:changed?false:s.zeroSet,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};}
 if(id==='upper'||id==='lower')return {...idle,[id]:!s[id],zeroSet:false};
 if(id==='load'){
  if(s.lower||s.upper)return {...s,error:'Open both virtual grips to change specimens.'};
  return {...idle,loaded:!s.loaded,zeroSet:false};
 }
 if(id==='zero'){
  if(!s.loaded||!s.lower||!s.upper)return {...s,error:'Seat a specimen and close both grips before zeroing.'};
  return {...idle,zeroSet:true};
 }
 if(id==='run'){
  try{need(s.loaded,'Load a virtual coupon first.');need(s.upper&&s.lower,'Close both virtual grips before measuring.');need(s.zeroSet,'Zero the displacement datum after mounting.');const result=solve(s.config,s.revision);return {...s,error:'',result,revision:result.revision};}catch(e){return {...idle,error:e.message}}}
 throw Error('Unknown bench action');
}
export function csv(r){
 const esc=s=>'"'+String(s).replace(/"/g,'""')+'"';const keys=Object.keys(r.points[0]);
 return ['sampleId,revision,inputRevision,kind,areaM2,gaugeLengthM,'+keys.join(','),...r.points.map(p=>[esc(r.sampleId),r.revision,r.inputRevision,r.kind,r.geometry.areaM2,r.geometry.initialGaugeM,...keys.map(k=>p[k]??'')].join(','))].join('\n')+'\n';
}
