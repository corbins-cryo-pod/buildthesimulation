export const DEFAULT={
  "sampleId": "SI-CEE-001",
  "revision": 0,
  "diameterMm": 100,
  "rpm": 4000,
  "referenceUm": 1.6,
  "exponent": 0.5,
  "edgeFraction": 0.12,
  "tauS": 8,
  "bakeA": {
    "plateC": 100,
    "seconds": 50
  },
  "bakeB": {
    "plateC": 110,
    "seconds": 90
  }
};
export function simulate(p){
 const check=(v,a,b,n)=>{if(!Number.isFinite(v)||v<a||v>b)throw new RangeError(n+" must be "+a+"–"+b);};
 if(!p||typeof p.sampleId!=="string"||!p.sampleId.trim()||p.sampleId.length>80)throw new RangeError("Sample ID required");check(p.revision,0,999999,"Revision");if(!Number.isInteger(p.revision))throw new RangeError("Revision must be integer");
 if(![75,100,125,150,200].includes(p.diameterMm))throw new RangeError("Unsupported round wafer; select compatible virtual chuck");
 check(p.rpm,2000,6000,"Spin speed");check(p.referenceUm,.1,20,"Reference µm");check(p.exponent,.2,.8,"Exponent");check(p.edgeFraction,0,.5,"Edge fraction");check(p.tauS,1,60,"Time constant");
 for(const k of ["bakeA","bakeB"]){if(!p[k])throw new RangeError("Both schedules required");check(p[k].plateC,30,300,"Plate °C");check(p[k].seconds,1,300,"Bake seconds");}
 const n=41,R=p.diameterMm/2,pitch=p.diameterMm/n,h=p.referenceUm*(p.rpm/4000)**(-p.exponent),values=[];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const r=Math.hypot(i-20,j-20)*pitch/R;values.push(r<=1?h*(1+p.edgeFraction*Math.exp(-(1-r)/.045)):null);}
 const map={n,pitchMm:pitch,originMm:[-R+pitch/2,-R+pitch/2],frame:"wafer center; x right, y away; row major",unit:"µm",values};
 const v=values.filter(x=>x!==null),ramp=p.rpm/1000,spinHistory=[{timeS:0,rpm:0},{timeS:ramp,rpm:p.rpm},{timeS:ramp+30,rpm:p.rpm},{timeS:2*ramp+30,rpm:0}];
 const specimen=(suffix,b)=>{const trace=[],at=t=>({timeS:t,plateC:b.plateC,waferC:b.plateC+(23-b.plateC)*Math.exp(-t/p.tauS)});for(let i=0;i<b.seconds;i++)trace.push(at(i));trace.push(at(b.seconds));return {sampleId:p.sampleId+"-"+suffix,parentSampleId:p.sampleId,parentRevision:p.revision,revision:p.revision+1,material:"illustrative resist",coating:{calibrationId:"user-prebake-powerlaw-v1",referenceRpm:4000,referenceUm:p.referenceUm,exponent:p.exponent,edgeFraction:p.edgeFraction,centerUm:h,meanUm:v.reduce((a,b)=>a+b,0)/v.length,spinHistory,preBakeMap:map},bake:{mode:"contact",schedule:b,tauS:p.tauS,ambientC:23,temperatureHistory:trace,finalWaferC:trace.at(-1).waferC},postBakeThicknessUm:null,history:[{operation:"spin",durationS:2*ramp+30},{operation:"contact-bake",durationS:b.seconds}]}};
 return {schema:"bts.cee200cbx.paired-resist.v1",instrumentId:"02-08",dataKind:"simulated",input:JSON.parse(JSON.stringify(p)),units:{length:"mm",film:"µm",temperature:"°C",time:"s",spin:"rpm"},specimenA:specimen("A",p.bakeA),specimenB:specimen("B",p.bakeB),limitations:["Synthetic user calibration, not a measured resist curve","Constant preheated plate and lumped wafer; no solvent transport, shrinkage, cooldown or verified downstream importer"]};
}
