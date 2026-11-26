// Independent educational axial tension DMA. No hardware interfaces or motion/temperature commands.
export const defaults=Object.freeze({sampleId:'INERT-POLYMER-DEMO',siteId:'GAUGE-A',parentRevision:0,gaugeMm:18,widthMm:4,thicknessMm:.5,strainPercent:.15,frequencyHz:1.5915494309189535,temperatureC:23,e0Mpa:10,deltaMpa:40,tauRefS:.1,activationKj:45,mode:'inert'});
export const limits=Object.freeze({gaugeMm:[5,25],widthMm:[1,8],thicknessMm:[.05,2],strainPercent:[.01,.5],frequencyHz:[.05,100],temperatureC:[5,65],e0Mpa:[.1,100],deltaMpa:[0,100],tauRefS:[.001,10],activationKj:[0,60]});
const bad=(code,message)=>({ok:false,code,message}),omega=f=>2*Math.PI*f;
export function complexModulus(f,p){
 const tau=p.tauRefS*Math.exp(1000*p.activationKj/8.314462618*(1/(p.temperatureC+273.15)-1/296.15)),a=omega(f)*tau,q=p.deltaMpa/(1+a*a);
 return {realMpa:p.e0Mpa+q*a*a,imagMpa:q*a,tauS:tau};
}
// Samples are uniformly spaced over full cycles, with convention exp(+j omega t).
export function analyzeHarmonic(rows,f){
 if(!Array.isArray(rows)||rows.length<32||!Number.isFinite(f)||f<=0)return null;
 let ex=0,ey=0,sx=0,sy=0;
 for(const [t,strain,stressPa] of rows){
  if(![t,strain,stressPa].every(Number.isFinite))return null;
  const a=omega(f)*t,co=Math.cos(a),si=-Math.sin(a);ex+=strain*co;ey+=strain*si;sx+=stressPa*co;sy+=stressPa*si;
 }
 const denom=ex*ex+ey*ey;if(!(denom>1e-18))return null;
 const er=(sx*ex+sy*ey)/denom,ei=(sy*ex-sx*ey)/denom,angle=Math.atan2(ei,er)*180/Math.PI;
 return {storageMpa:er/1e6,lossMpa:ei/1e6,magnitudeMpa:Math.hypot(er,ei)/1e6,phaseDeg:angle,tanDelta:er===0?null:ei/er,strainAmplitude:2*Math.hypot(ex,ey)/rows.length,stressAmplitudePa:2*Math.hypot(sx,sy)/rows.length};
}
export function replay(f,epsilon,reMpa,imMpa,phase=0){
 return Array.from({length:512},(_,i)=>{
  const t=i/(64*f),a=omega(f)*t+phase,c=Math.cos(a),s=Math.sin(a);
  return [t,epsilon*c,epsilon*1e6*(reMpa*c-imMpa*s)];
 });
}
export function measure(input={},loaded=true,furnaceOpen=false){
 const p={...defaults,...input};
 if(furnaceOpen)return bad('open-fixture','Lower the virtual furnace before running a test.');
 if(!loaded)return bad('empty-grips','Seat the inert coupon in the virtual grips to continue.');
 if(!/^[a-z0-9._-]{1,80}$/i.test(p.sampleId)||!/^[a-z0-9._-]{1,80}$/i.test(p.siteId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>99999999)return bad('identity','Sample/site IDs and parent revision are invalid.');
 if(!['inert','known'].includes(p.mode))return bad('mode','Choose a supported passive reference.');
 for(const [k,[a,b]] of Object.entries(limits))if(!Number.isFinite(p[k])||p[k]<a||p[k]>b)return bad('setting',k+' is outside the virtual range.');
 const M=p.mode==='known'?{realMpa:9*Math.cos(Math.PI/6),imagMpa:4.5,tauS:null}:complexModulus(p.frequencyHz,p),epsilon=p.strainPercent/100;
 const rows=replay(p.frequencyHz,epsilon,M.realMpa,M.imagMpa,.47),fit=analyzeHarmonic(rows,p.frequencyHz),area=p.widthMm*p.thicknessMm*1e-6;
 const F=fit.stressAmplitudePa*area,du=epsilon*p.gaugeMm*1e3;
 if(F>18)return bad('force','Requested virtual force exceeds the documented 18 N upper envelope. Reduce strain or area.');
 const freq=Array.from({length:41},(_,i)=>.05*(100/.05)**(i/40)).map(f=>{
  const x=p.mode==='known'?M:complexModulus(f,p);return [f,x.realMpa,x.imagMpa,Math.atan2(x.imagMpa,x.realMpa)*180/Math.PI];
 });
 const trace=rows.map(([t,e,s])=>[t,e,s,e*p.gaugeMm*1e3,s*area]);
 return {ok:true,result:{schema:'bts.axial-dma.v1',equipmentId:'14-06',sampleId:p.sampleId,siteId:p.siteId,parentRevision:p.parentRevision,revision:p.parentRevision+1,source:'synthetic inert reference; not actual hardware measurements',configuration:p,dimensions:{gaugeLengthM:p.gaugeMm/1000,widthM:p.widthMm/1000,thicknessM:p.thicknessMm/1000,areaM2:area},fit:{...fit,forceAmplitudeN:F,displacementAmplitudeUm:du,temperatureC:p.temperatureC,frequencyHz:p.frequencyHz,relaxationTimeS:M.tauS},record:{sampleRateHz:p.frequencyHz*64,cycles:8,columns:['time_s','axial_strain_1','axial_stress_Pa','displacement_um','force_N'],trace},sweep:{columns:['frequency_Hz','E_storage_MPa','E_loss_MPa','phase_deg'],rows:freq}}};
}
export function csv(r){return ['# origin=simulated','# sampleId='+r.sampleId,'# siteId='+r.siteId,'# revision='+r.revision,r.record.columns.join(','),...r.record.trace.map(x=>x.join(','))].join('\n')+'\n';}
