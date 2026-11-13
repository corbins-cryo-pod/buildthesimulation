import {finite,range,integer,vec3,add,sub,scale,dot,norm,cross,unit,frame,GL4_X,GL4_W} from './common.mjs';
export const MU0_OVER_4PI=1e-7;
export const COIL_DEFAULTS=Object.freeze({radiusUm:25,layers:6,layerPitchUm:5,segmentsPerTurn:48,trackWidthUm:2,trackThicknessUm:1,viaRadiusUm:1,gapRad:.2,returnRadiusUm:40,centerUm:[60,0,0],axis:[0,1,0],resistivityOhmM:1.68e-8});
/** Explicit series path: circular traces, vertical vias, short bridges and return leads. */
export function makeCoil(input={}) {
 for(const k of Object.keys(input)) if(!(k in COIL_DEFAULTS)) throw new Error(`Unsupported coil setting ${k}.`);
 const s={...COIL_DEFAULTS,...input};
 range(s.radiusUm,'coil radius',2,5000); integer(s.layers,'coil layers',1,8); range(s.layerPitchUm,'layer pitch',.1,500); integer(s.segmentsPerTurn,'segments per turn',12,192);
 range(s.trackWidthUm,'track width',.1,500);range(s.trackThicknessUm,'track thickness',.1,500);range(s.viaRadiusUm,'via radius',.05,250);range(s.gapRad,'trace gap',.05,1);
 range(s.returnRadiusUm,'return radius',s.radiusUm+s.trackWidthUm,10000);range(s.resistivityOhmM,'resistivity',1e-10,1);
 vec3(s.centerUm,'coil center');vec3(s.axis,'coil axis');
 if(s.layers>1&&s.layerPitchUm<=s.trackThicknessUm)throw new Error('Adjacent winding layers overlap.');
 if(2*s.radiusUm*Math.sin(s.gapRad/2)<=s.trackWidthUm)throw new Error('Trace gap is narrower than the track.');
 const basis=frame(s.axis),center=s.centerUm.map(v=>v*1e-6),segments=[],vertices=[];
 const point=(r,a,z)=>add(center,add(scale(basis.u,r*Math.cos(a)*1e-6),add(scale(basis.v,r*Math.sin(a)*1e-6),scale(basis.n,z*1e-6))));
 const areaTrack=s.trackWidthUm*s.trackThicknessUm*1e-12,areaVia=Math.PI*s.viaRadiusUm**2*1e-12;
 function edge(a,b,kind='trace'){const length=norm(sub(b,a));if(length<=1e-18)return;segments.push({a,b,lengthM:length,kind,areaM2:kind==='via'?areaVia:areaTrack,exclusionRadiusM:kind==='via'?s.viaRadiusUm*1e-6:Math.hypot(s.trackWidthUm,s.trackThicknessUm)*.5e-6});}
 const z0=-(s.layers-1)*s.layerPitchUm/2;
 for(let k=0;k<s.layers;k++) {
  const z=z0+k*s.layerPitchUm,pts=Array.from({length:s.segmentsPerTurn+1},(_,i)=>point(s.radiusUm,s.gapRad/2+(2*Math.PI-s.gapRad)*i/s.segmentsPerTurn,z));
  if(k>0){const prev=vertices.at(-1),via=point(s.radiusUm,2*Math.PI-s.gapRad/2,z);edge(prev,via,'via');edge(via,pts[0],'bridge');vertices.push(via);}
  vertices.push(...pts);for(let i=0;i<pts.length-1;i++)edge(pts[i],pts[i+1]);
 }
 const a=vertices.at(-1),b=point(s.returnRadiusUm,2*Math.PI-s.gapRad/2,z0+(s.layers-1)*s.layerPitchUm),c=point(s.returnRadiusUm,s.gapRad/2,z0),d=vertices[0];
 edge(a,b,'lead');edge(b,c,'return');edge(c,d,'lead');
 const lengthM=segments.reduce((sum,e)=>sum+e.lengthM,0),resistanceOhm=segments.reduce((sum,e)=>sum+s.resistivityOhmM*e.lengthM/e.areaM2,0);
 return {settings:{...s,centerUm:[...s.centerUm],axis:[...s.axis]},segments,lengthM,resistanceOhm,closed:true,
  boundary:'Nonmagnetic quasi-static primary field. Tissue-induced secondary electric field is not included in this component assay.',
  geometryClass:'hypothetical',resistivityClass:'estimated',resistivityMeaning:'Nominal bulk copper approximation; thin-film temperature, size effects and contacts are not fitted.'};
}
/** Exact finite straight-segment A and B in free space, outside the conductor. */
export function segmentField(p,e) {
 vec3(p,'field sample');const d=sub(e.b,e.a),L=norm(d);if(!(L>0))throw new Error('Zero-length wire segment.');
 const u=scale(d,1/L),r=sub(p,e.a),s=dot(r,u),perp=sub(r,scale(u,s)),rho2=dot(perp,perp),closest=norm(sub(r,scale(u,Math.max(0,Math.min(L,s)))));
 if(closest<=(e.exclusionRadiusM??1e-12))throw new Error('Field sample intersects finite conductor; no singularity softening used.');
 if(rho2<1e-32){const integral=s>L?Math.log(s/(s-L)):Math.log((L-s)/(-s));return {A:scale(u,MU0_OVER_4PI*integral),B:[0,0,0]};}
 const rho=Math.sqrt(rho2),Ra=Math.hypot(rho,s),Rb=Math.hypot(rho,s-L),I=Math.asinh(s/rho)-Math.asinh((s-L)/rho),f=(s/Ra-(s-L)/Rb)/rho2;
 return {A:scale(u,MU0_OVER_4PI*I),B:scale(cross(u,r),MU0_OVER_4PI*f)};
}
export function coilField(p,coil) {const A=[0,0,0],B=[0,0,0];for(const e of coil.segments){const v=segmentField(p,e);for(let j=0;j<3;j++){A[j]+=v.A[j];B[j]+=v.B[j];}}return {AperA:A,BperA:B};}
export function primaryElectric(p,coil,dIdtAperS) {finite(dIdtAperS,'dI/dt');return scale(coilField(p,coil).AperA,-dIdtAperS);}
/** Integral A/I dot dl, not a scaled electrode potential. SI output H. */
export function integrateCableLink(coil,a,b,subdivisions=4) {
 vec3(a);vec3(b);integer(subdivisions,'line quadrature subdivisions',1,128);const dl=sub(b,a);let sum=0;
 for(let k=0;k<subdivisions;k++)for(let q=0;q<4;q++){const f=(k+(GL4_X[q]+1)/2)/subdivisions,p=add(a,scale(dl,f));sum+=GL4_W[q]*dot(coilField(p,coil).AperA,dl)/(2*subdivisions);}
 return sum;
}
export function primaryCableProfile(coil,{xUm=0,yUm=0,zMinUm=-150,zMaxUm=150,samples=121,dIdtAperS=1e5}={}) {
 finite(xUm);finite(yUm);finite(zMinUm);finite(zMaxUm);finite(dIdtAperS);integer(samples,'profile samples',5,1001);if(zMaxUm<=zMinUm)throw new Error('Invalid cable window.');
 const positions=Array.from({length:samples},(_,i)=>[xUm,yUm,zMinUm+(zMaxUm-zMinUm)*i/(samples-1)]);
 const e=positions.map(p=>primaryElectric(p.map(v=>v*1e-6),coil,dIdtAperS)[2]),stepM=(zMaxUm-zMinUm)*1e-6/(samples-1);
 const gradient=e.map((_v,i)=>i===0?(e[1]-e[0])/stepM:i===samples-1?(e[i]-e[i-1])/stepM:(e[i+1]-e[i-1])/(2*stepM));
 return {positionsUm:positions,EparallelVPerM:e,gradientVPerM2:gradient,derivative:'Centered differences; one-sided at endpoints. Refinement is required.',recruitment:null};
}
/** Regularized Neumann line-integral estimate. Not a fabricated coil measurement. */
export function inductanceEstimate(coil,coreRadiusM=null) {
 if(coil.segments.length>900)throw new Error('Inductance quadrature work budget exceeded.');
 const r=coreRadiusM??Math.sqrt(coil.settings.trackWidthUm*coil.settings.trackThicknessUm/Math.PI)*1e-6;range(r,'inductance core radius',1e-9,.01);
 let total=0;
 for(let i=0;i<coil.segments.length;i++) {
  const a=coil.segments[i],da=sub(a.b,a.a),L=a.lengthM;
  total+=2*(L*Math.asinh(L/r)-Math.hypot(L,r)+r);
  for(let j=0;j<i;j++){const b=coil.segments[j],db=sub(b.b,b.a),prod=dot(da,db);if(prod===0)continue;let integral=0;
   for(let q=0;q<4;q++)for(let p=0;p<4;p++){const x=add(a.a,scale(da,(GL4_X[q]+1)/2)),y=add(b.a,scale(db,(GL4_X[p]+1)/2));integral+=GL4_W[q]*GL4_W[p]/(4*Math.hypot(norm(sub(x,y)),r));}
   total+=2*prod*integral;
  }
 }
 const L=MU0_OVER_4PI*total;if(!(L>0)||!Number.isFinite(L))throw new Error('Inductance estimate is not positive.');
 return {henry:L,coreRadiusM:r,method:'Regularized Neumann integral, analytic straight-segment self term, 4x4 Gauss cross terms.',class:'estimated',limitations:'Equal-area circular core approximation; no skin/proximity effect, substrate eddy currents, magnetic material or parasitic capacitance.'};
}
export function coilDrive(coil,{peakA=1,riseMs=.01,holdMs=0,repetitionHz=20,simultaneousChannels=1,inductanceH=0}={}) {
 range(peakA,'peak current',0,100);range(riseMs,'rise time',.00001,100);range(holdMs,'hold time',0,100);range(repetitionHz,'repetition frequency',0,10000);integer(simultaneousChannels,'simultaneous channels',1,1000000);range(inductanceH,'inductance',0,1);
 const rise=riseMs*1e-3,hold=holdMs*1e-3,duration=2*rise+hold;if(duration*repetitionHz>1)throw new Error('Pulses overlap at the requested repetition rate.');
 const energyJ=coil.resistanceOhm*peakA**2*(2*rise/3+hold),rate=peakA/rise;
 return {peakA,dIdtAperS:rate,peakVoltageEstimateV:coil.resistanceOhm*peakA+inductanceH*rate,resistanceOhm:coil.resistanceOhm,
  jouleEnergyPerPulseJ:energyJ,averageJoulePowerW:energyJ*repetitionHz,aggregateJoulePowerW:energyJ*repetitionHz*simultaneousChannels,
  waveform:'Linear rise, optional constant plateau, linear return to zero; no electrode charge-balance equivalence implied.',
  peakMagneticEnergyJ:.5*inductanceH*peakA**2,driverLossesIncluded:false,temperatureRiseC:null,safetyVerdict:null};
}
