export const defaultOptics = {
  "na": 0.6,
  "source": "disk",
  "sigmaOuter": 0.65,
  "sigmaInner": 0.4,
  "waferPitch_um": 0.56,
  "clearFraction": 0.5,
  "defocus_um": 0,
  "threshold_mJ_cm2": 35
};
export function opticalAssay(p,dose_mJ_cm2,grid=81,samples=256){
 const check=(k,a,z)=>{if(typeof p[k]!=="number"||!Number.isFinite(p[k])||p[k]<a||p[k]>z)throw Error(k+" must be "+a+" to "+z)};
 check("na",.48,.6);check("sigmaOuter",0,1);check("sigmaInner",0,.99);check("waferPitch_um",.2,2.5);check("clearFraction",0,1);check("defocus_um",-2,2);check("threshold_mJ_cm2",1,1000);
 if(!["disk","annular","coherent"].includes(p.source))throw Error("Unknown source shape");
 if(p.source==="annular"&&p.sigmaInner>=p.sigmaOuter)throw Error("Annular inner radius must be smaller than outer radius");
 if(!Number.isFinite(dose_mJ_cm2)||dose_mJ_cm2<1||dose_mJ_cm2>1000)throw Error("Dose must be 1–1000 mJ/cm²");
 if(!Number.isInteger(grid)||grid<11||grid>201||grid%2!==1||!Number.isInteger(samples)||samples<128||samples>1024)throw Error("Invalid quadrature or sampling");
 const lambda=.365,spacing=lambda/(p.na*p.waferPitch_um),outer=p.source==="coherent"?0:p.sigmaOuter,inner=p.source==="annular"?p.sigmaInner:0;
 const mmax=Math.floor((1+outer+1e-12)/spacing),coeff=m=>m===0?p.clearFraction:Math.sin(Math.PI*m*p.clearFraction)/(Math.PI*m);
 const harmonicRe=new Float64Array(2*mmax+1),harmonicIm=new Float64Array(2*mmax+1);
 let rays=0,minOrders=Infinity,maxOrders=0;
 function ray(sx,sy){
   const terms=[];
   for(let m=-mmax;m<=mmax;m++){
     const u=sx+m*spacing,v=sy,r2=u*u+v*v;
     if(r2>1+1e-12)continue;
     const phase=2*Math.PI*p.defocus_um/lambda*(Math.sqrt(Math.max(0,1-p.na*p.na*r2))-1),c=coeff(m);
     if(Math.abs(c)<1e-14)continue;
     terms.push({m,re:c*Math.cos(phase),im:c*Math.sin(phase)});
   }
   rays++;minOrders=Math.min(minOrders,terms.length);maxOrders=Math.max(maxOrders,terms.length);
   for(const a of terms)for(const b of terms){const k=a.m-b.m;if(k<0)continue;harmonicRe[k]+=a.re*b.re+a.im*b.im;harmonicIm[k]+=a.im*b.re-a.re*b.im;}
 }
 if(outer===0){ray(0,0)}else for(let iy=0;iy<grid;iy++)for(let ix=0;ix<grid;ix++){
  const sx=outer*(2*(ix+.5)/grid-1),sy=outer*(2*(iy+.5)/grid-1),rho2=sx*sx+sy*sy;
  if(rho2<=outer*outer&&rho2>=inner*inner)ray(sx,sy);
 }
 if(!rays)throw Error("Source annulus too thin for sampling; widen it");
 const intensity=[],x_um=[],dose=[];
 for(let i=0;i<samples;i++){
   let I=harmonicRe[0]/rays;
   for(let k=1;k<harmonicRe.length;k++){const a=2*Math.PI*k*i/samples;I+=2*(harmonicRe[k]*Math.cos(a)-harmonicIm[k]*Math.sin(a))/rays}
   I=Math.max(0,I);x_um.push(i*p.waferPitch_um/samples);intensity.push(I);dose.push(I*dose_mJ_cm2);
 }
 const min=Math.min(...intensity),max=Math.max(...intensity),mean=harmonicRe[0]/rays,threshold=p.threshold_mJ_cm2;let above=0;
 for(let i=0;i<samples;i++){const a=dose[i],b=dose[(i+1)%samples];if(a>=threshold&&b>=threshold)above++;else if(a>=threshold||b>=threshold)above+=(Math.max(a,b)-threshold)/Math.abs(a-b)}
 const clearWidth=above*p.waferPitch_um/samples;
 return {schema:"bts.pas5500.aerial-grating.v1",kind:"simulated scalar periodic aerial image",parameters:{...p,dose_mJ_cm2,wavelength_um:lambda,reticlePitch_um:5*p.waferPitch_um,reticleClearWidth_um:5*p.waferPitch_um*p.clearFraction},method:{sourceGrid:grid,sourcePoints:rays,periodSamples:samples,minimumNonzeroOrders:minOrders,maximumNonzeroOrders:maxOrders,normalization:"ideal open field intensity = 1; uniform mutually incoherent source points",phase:"exact scalar axial propagation in air; ideal pupil; thin amplitude mask"},x_um,intensity,dose_mJ_cm2:dose,metrics:{minIntensity:min,maxIntensity:max,meanIntensity:mean,contrast:max+min>0?(max-min)/(max+min):0,aboveThresholdWidth_um:clearWidth,aboveThresholdFraction:above/samples,nominalClearWidth_um:p.waferPitch_um*p.clearFraction},limitations:"Independent 1D periodic test grating under the same commanded dose. Not a spatial aerial image of the full reticle, not calibrated resist, no polarization, aberrations, flare, wafer stack or measured process window."};
}
