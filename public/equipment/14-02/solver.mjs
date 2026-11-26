// Euler–Bernoulli ideal three-point bend of a single inert rectangular beam. No hardware control.
export const schema='bts.flexure-three-point.v1';
export const defaults=()=>({sampleId:'elastic-beam-01',widthMm:10,thicknessMm:2,lengthMm:54,spanMm:40,modulusGPa:3,dropMm:.4,cellN:500});
export const initial=()=>({config:defaults(),loaded:true,tared:true,result:null,error:'',revision:0});
const req=(x,msg)=>{if(!x)throw Error(msg)},ok=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validate(c){
 req(c&&typeof c.sampleId==='string'&&c.sampleId.trim().length&&c.sampleId.length<=96,'Enter a specimen ID.');
 req(ok(c.spanMm,20,160),'Support span must be positive and 20–160 mm.');
 req(ok(c.widthMm,2,25)&&ok(c.thicknessMm,.5,8)&&ok(c.lengthMm,20,200),'Beam geometry outside the virtual fixture bounds.');
 req(c.spanMm/c.thicknessMm>=16,'Use support span at least 16× thickness for the slender-beam model.');
 req(c.lengthMm>=c.spanMm+Math.max(4,2*c.thicknessMm),'Beam is too short: allow at least 2 mm per side and at least one thickness per side.');
 req(ok(c.modulusGPa,.1,30)&&ok(c.dropMm,0,5),'Use 0.1–30 GPa and 0–5 mm deflection.');
 req([50,500].includes(c.cellN),'Choose the 500 N cell or a virtual 50 N readout limit.');
}
const lin=(points)=>{
 const q=points.filter(p=>p.forceN!==null&&p.deltaM>0),den=q.reduce((a,p)=>a+p.deltaM*p.deltaM,0);return den?q.reduce((a,p)=>a+p.deltaM*p.forceN,0)/den:null;
};
export function solve(c,inputRevision=0){
 validate(c);req(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid input revision.');
 const b=c.widthMm/1000,h=c.thicknessMm/1000,L=c.spanMm/1000,E=c.modulusGPa*1e9,I=b*h**3/12,k=48*E*I/L**3;
 const points=Array.from({length:51},(_,i)=>{
  const deltaM=c.dropMm*i/50000,ideal=k*deltaM,strain=6*h*deltaM/L**2,domainExceeded=deltaM>L*.025+1e-14||strain>.02+1e-14,overRange=!domainExceeded&&ideal>c.cellN*(1+1e-15),
        forceN=domainExceeded||overRange?null:ideal;
  return {i,deltaM,modelDemandN:domainExceeded?null:ideal,forceN,maxFlexStressPa:forceN===null?null:3*forceN*L/(2*b*h*h),outerFiberStrain:domainExceeded?null:strain,modelValid:!domainExceeded,domainExceeded,overRange};
 });
 return {schema,deviceId:'14-02',kind:'simulated',model:'Instron 5969 / three-point fixture',sampleId:c.sampleId,inputRevision,revision:inputRevision+1,configuration:{...c},
  fixture:{kind:'symmetric-three-point-bend',spanM:L,supportIds:['roller-left','roller-right'],noseId:'central-nose'},
  section:{widthM:b,thicknessM:h,lengthM:c.lengthMm/1000,secondMomentM4:I},units:{deltaM:'m',forceN:'N',modelDemandN:'N',maxFlexStressPa:'Pa',outerFiberStrain:'1',stiffnessNPerM:'N/m'},
  analyticStiffnessNPerM:k,fittedStiffnessNPerM:lin(points),points,
  flags:{overRange:points.filter(p=>p.overRange).length,outsideDomain:points.filter(p=>p.domainExceeded).length},
  provenance:{method:'Euler–Bernoulli three-point bend (rigid frictionless supports, central point force)',measuredHardware:false,history:[{deviceId:'14-02',operation:'elastic flexure',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,p){
 const reset={...s,result:null,error:''};
 if(id==='reset')return initial();
 if(id==='set')return {...reset,tared:p.spanMm!==undefined||p.thicknessMm!==undefined||p.lengthMm!==undefined||p.sampleId!==undefined?false:s.tared,config:{...s.config,...p},revision:p.sampleId!==undefined&&p.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='load')return {...reset,loaded:!s.loaded,tared:false};
 if(id==='tare'){try{req(s.loaded,'Place a virtual beam first.');validate(s.config);return {...reset,tared:true};}catch(e){return {...reset,error:e.message}}}
 if(id==='span'){const span=s.config.spanMm===40?80:40;return act(s,'set',{spanMm:span,lengthMm:span+14});}
 if(id==='run'){try{req(s.loaded,'Place a virtual beam first.');validate(s.config);req(s.tared,'Zero the central nose after placing the beam or moving the supports.');const result=solve(s.config,s.revision);return {...s,error:'',result,revision:result.revision};}catch(e){return {...reset,error:e.message}}}
 throw Error('Unknown flexure action.');
}
export function csv(r){
 const q=x=>'"'+String(x).replace(/"/g,'""')+'"',k=Object.keys(r.points[0]);
 return ['sampleId,revision,kind,fixture,span_m,'+k.join(','),...r.points.map(p=>[q(r.sampleId),r.revision,r.kind,r.fixture.kind,r.fixture.spanM,...k.map(a=>p[a]??'')].join(','))].join('\n')+'\n';
}
