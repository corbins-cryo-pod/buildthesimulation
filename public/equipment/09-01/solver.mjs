// Original ideal linear circuit solver. All input/output numbers in SI; no device or browser access.
export const schema='bts.electronic-dummy-cell.v1',contacts=['WE','WS','RE','CE'];
export const initial=()=>({power:true,cable:true,leads:Object.fromEntries(contacts.map(k=>[k,true])),result:null,error:'',revision:0,config:{sampleId:'rc-reference-01',rsOhm:0,rpOhm:1000,cF:1e-6,pure:false,mode:'eis',fLo:1,fHi:1e5,n:81,vRms:.01,halfSpanV:.2,scanVps:.1,currentRangeA:.006}});
const inR=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b, need=(ok,s)=>{if(!ok)throw Error(s)};
function valid(c){
 need(c&&['eis','cv'].includes(c.mode),'Choose EIS or cyclic voltammetry.');
 need(typeof c.sampleId==='string'&&c.sampleId.trim().length>0&&c.sampleId.length<=96,'Enter a valid sample ID.');
 need(inR(c.rsOhm,0,1e5)&&inR(c.rpOhm,1,1e7)&&inR(c.cF,0,.01),'Passive load bounds: Rs 0–100 kΩ, Rp 1 Ω–10 MΩ, C 0–10 mF.');
 need(typeof c.pure==='boolean'&&(!c.pure||c.cF>0),'Use positive capacitance in pure-capacitor mode.');
 need(Number.isInteger(c.n)&&inR(c.n,5,301),'Use 5–301 points.');
 need(inR(c.currentRangeA,.000001,.6),'Modeled current full-scale must be 1 µA–600 mA.');
 if(c.mode==='eis'){need(inR(c.fLo,.01,1e5)&&inR(c.fHi,c.fLo,1e5),'Frequency must be ascending within 0.01 Hz–100 kHz (equal endpoints allowed).');need(inR(c.vRms,.0001,.05),'Use 0.1–50 mV RMS excitation.');}
 else {need(inR(c.halfSpanV,.005,1)&&inR(c.scanVps,.00001,10),'Use 5 mV–1 V vertices and scan 0.01 mV/s–10 V/s.');}
}
export function impedance(rs,rp,c,f,pure=false){
 const w=2*Math.PI*f;if(pure)return [0,-1/(w*c)];
 const x=w*rp*c,den=1+x*x;return [rs+rp/den,-rp*x/den];
}
export function ramp(rs,rp,c,pure,drive,slope,dt,vOld){
 // Exact branch-voltage advance on a continuous linear segment E(t)=E0+m*t. expm1 avoids small-dt cancellation.
 const E=drive+slope*dt;
 if(pure)return {vCapV:E,currentA:c*slope};
 if(rs===0)return {vCapV:E,currentA:E/rp+c*slope};
 if(c===0)return {vCapV:E*rp/(rs+rp),currentA:E/(rs+rp)};
 const alpha=rp/(rs+rp),tau=rs*alpha*c;
 const a=-Math.expm1(-dt/tau),vCapV=vOld+a*(alpha*drive-vOld)+alpha*slope*(dt-tau*a);
 return {vCapV,currentA:(E-vCapV)/rs};
}
// Fit the passive single-time-constant topology in closed form, using a separate algebraic inversion of valid samples.
export function fitRandles(points,c){
 const good=points.filter(p=>!p.overload&&p.imOhm<0);if(c.pure){if(!good.length)return null;const cap=good.reduce((a,p)=>a-1/(2*Math.PI*p.frequencyHz*p.imOhm),0)/good.length;return {rsOhm:0,rpOhm:null,cF:cap,fitCount:good.length,rmsComplexResidualOhm:Math.sqrt(good.reduce((a,p)=>a+(p.imOhm+1/(2*Math.PI*p.frequencyHz*cap))**2,0)/good.length)};}
 if(c.cF===0){const ok=points.filter(x=>!x.overload);return ok.length?{rsOhm:null,rpOhm:null,totalResistanceOhm:ok.reduce((a,p)=>a+p.reOhm,0)/ok.length,cF:0,fitCount:ok.length,rmsComplexResidualOhm:0}:null;}
 if(good.length<3)return null;
 // (-ImZ)/w = Rp*tau/(1+w²tau²); invert so y(t)=intercept+slope*w².
 const maxIm=Math.max(...good.map(p=>-p.imOhm));const g=good.filter(p=>-p.imOhm>maxIm*.01);if(g.length<3)return null;
 const xy=g.map(p=>{const w=2*Math.PI*p.frequencyHz;return [w*w,w/(-p.imOhm)];});
 const ax=xy.reduce((a,p)=>a+p[0],0)/g.length,ay=xy.reduce((a,p)=>a+p[1],0)/g.length;
 const vv=xy.reduce((a,p)=>a+(p[0]-ax)**2,0);if(vv===0)return null;const m=xy.reduce((a,p)=>a+(p[0]-ax)*(p[1]-ay),0)/vv,b=ay-m*ax;
 if(!(m>0&&b>0))return null;const tau=Math.sqrt(m/b),rp=1/(b*tau),cap=tau/rp,rs=Math.max(0,g.reduce((a,p)=>a+p.reOhm-rp/(1+(2*Math.PI*p.frequencyHz*tau)**2),0)/g.length);
 if(![rs,rp,cap].every(Number.isFinite))return null;
 let rms=Math.sqrt(good.reduce((a,p)=>{const [re,im]=impedance(rs,rp,cap,p.frequencyHz);return a+(re-p.reOhm)**2+(im-p.imOhm)**2;},0)/good.length);
 return {rsOhm:rs,rpOhm:rp,cF:cap,fitCount:g.length,rmsComplexResidualOhm:rms};
}
export function solve(c,inputRevision=0){
 valid(c);need(Number.isSafeInteger(inputRevision)&&inputRevision>=0,'Invalid measurement revision.');
 let points,fit=null;const rs=c.rsOhm,rp=c.rpOhm,cap=c.cF,source=c.pure?'ideal capacitor':'series resistance + parallel RC';
 if(c.mode==='eis'){
  points=Array.from({length:c.n},(_,k)=>{
   const frequencyHz=c.fLo*(c.fHi/c.fLo)**(k/(c.n-1));const [re,im]=impedance(rs,rp,cap,frequencyHz,c.pure),mag=Math.hypot(re,im),estimatedCurrentRmsA=c.vRms/mag;
   const overload=Math.SQRT2*estimatedCurrentRmsA>c.currentRangeA,phaseDeg=Math.atan2(im,re)*180/Math.PI;
   return {k,frequencyHz,driveRmsV:c.vRms,estimatedCurrentRmsA,reOhm:overload?null:re,imOhm:overload?null:im,magnitudeOhm:overload?null:mag,phaseDeg:overload?null:phaseDeg,overload};
  });
  fit=fitRandles(points,c);
 }else{
  const h=c.halfSpanV,m=c.scanVps,L=2*h/m,len=Math.max(2,Math.floor((c.n-1)/2)),dt=L/len;
  let v=c.pure?-h:-h*rp/(rs+rp);points=[];
  for(let k=0;k<=len*2;k++){
   const up=k<=len,start=up?-h:h,sign=up?1:-1,age=up?k:k-len,slope=sign*m,driveV=start+slope*age*dt;
   let z;if(k===0)z=ramp(rs,rp,cap,c.pure,driveV,slope,0,v);else z=ramp(rs,rp,cap,c.pure,driveV-slope*dt,slope,dt,v);v=z.vCapV;
   const overload=Math.abs(z.currentA)>c.currentRangeA;points.push({k,timeS:k*dt,driveV,branchVoltageV:v,estimatedCurrentA:z.currentA,currentA:overload?null:z.currentA,slopeVps:slope,overload});
  }
 }
 return {schema,deviceId:'09-01',kind:'simulated',model:'Gamry Reference 600+ / 985-00150',source,sampleId:c.sampleId,inputRevision,revision:inputRevision+1,contacts:{WE:'RC-HI',WS:'RC-HI',RE:'RC-LO',CE:'RC-LO'},units:{frequencyHz:'Hz',timeS:'s',driveV:'V',driveRmsV:'V RMS',estimatedCurrentRmsA:'A RMS',branchVoltageV:'V',currentA:'A',estimatedCurrentA:'A',slopeVps:'V/s',reOhm:'Ω',imOhm:'Ω',magnitudeOhm:'Ω',phaseDeg:'deg'},configuration:{...c},points,fit,overloadCount:points.filter(p=>p.overload).length,provenance:{method:'ideal linear circuit; analytical phasor or exact piecewise ramp',topology:source,measuredOnHardware:false,history:[{operation:c.mode,deviceId:'09-01',parentRevision:inputRevision,resultRevision:inputRevision+1}]}};
}
export function act(s,id,payload){
 const idle={...s,result:null,error:''};
 if(id==='preset')return initial();
 if(id==='cvDemo')return act(initial(),'set',{mode:'cv',pure:true,cF:2.2e-6});
 if(id==='power')return {...idle,power:!s.power};
 if(id==='cable')return {...idle,cable:!s.cable};
 if(id.startsWith('lead:')){const k=id.split(':')[1];if(!contacts.includes(k))throw Error('Unknown lead');return {...idle,leads:{...s.leads,[k]:!s.leads[k]}}}
 if(id==='set')return {...idle,config:{...s.config,...payload},revision:payload.sampleId!==undefined&&payload.sampleId!==s.config.sampleId?0:s.revision};
 if(id==='run'){
  try{need(s.power,'Turn on instrument power.');need(s.cable,'Seat the DB25 cell cable.');const open=contacts.filter(k=>!s.leads[k]);need(open.length===0,'Open '+open.join(', ')+' lead. Connect all four leads before acquiring.');const result=solve(s.config,s.revision);return {...s,error:'',result,revision:result.revision};}catch(e){return {...idle,error:e.message};}}
 throw Error('Unknown bench action');
}
export function csv(r){
 const f=[...Object.keys(r.points[0])];const cell=x=>typeof x==='string'?'"'+x.replace(/"/g,'""')+'"':x??'';
 return [['sampleId','revision','kind','WE','WS','RE','CE',...f].join(','),...r.points.map(p=>[r.sampleId,r.revision,r.kind,...Object.values(r.contacts),...f.map(x=>p[x])].map(cell).join(','))].join('\n')+'\n';
}
export function waveform(r){
 if(r.configuration.mode!=='cv')throw Error('EIS frequency points are not waveform samples.');
 return {schema:'bts.analog-waveform.v1',sampleId:r.sampleId,revision:r.revision,kind:'simulated',dtS:r.points[1].timeS,channels:[{id:'WS_minus_RE',unit:'V',samples:r.points.map(p=>p.driveV)}],provenance:{sourceDeviceId:'09-01',sourceSchema:r.schema,contacts:r.contacts,description:'Continuous ideal triangle voltage, uniformly sampled on both legs.'}};
}
