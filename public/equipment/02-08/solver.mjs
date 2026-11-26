export const DEFAULT={sampleId:"SI-CEE-001",revision:0,diameterMm:100,rpm:4000,referenceUm:1.6,exponent:.5,edgeFraction:.12,tauS:8,calibrationId:"illustrative-prebake-v2",material:"illustrative resist",calibrationKind:"illustrative",bakeA:{plateC:100,seconds:50},bakeB:{plateC:110,seconds:90}};
function check(v,a,b,n){if(!Number.isFinite(v)||v<a||v>b)throw new RangeError(n+" must be "+a+"–"+b);}
function label(v,n){if(typeof v!=="string"||!v.trim()||v.length>80||/[\r\n]/.test(v))throw new RangeError(n+" required (1–80 characters, one line)");return v.trim();}
export function fitCalibration(p1,p2){
 for(const p of [p1,p2]){check(p.rpm,2000,6000,"Calibration rpm");check(p.um,.1,20,"Calibration thickness (µm)");}
 if(p1.rpm===p2.rpm)throw new RangeError("Calibration speeds must differ");
 const exponent=Math.log(p1.um/p2.um)/Math.log(p2.rpm/p1.rpm),referenceUm=p1.um*(p1.rpm/4000)**exponent;
 check(exponent,.2,.8,"Fitted exponent");check(referenceUm,.1,20,"Fitted reference thickness");
 return {referenceUm,exponent,rangeRpm:[Math.min(p1.rpm,p2.rpm),Math.max(p1.rpm,p2.rpm)],points:[{...p1},{...p2}]};
}
export function simulate(p){
 if(!p)throw new RangeError("Input required");const id=label(p.sampleId,"Sample ID"),material=label(p.material??DEFAULT.material,"Material"),calibrationId=label(p.calibrationId??DEFAULT.calibrationId,"Calibration ID");
 check(p.revision,0,999999,"Revision");if(!Number.isInteger(p.revision))throw new RangeError("Revision must be integer");
 if(![100,125].includes(p.diameterMm))throw new RangeError("Unsupported round wafer; selected 57.2 mm chuck uses virtual 100 or 125 mm wafers only");
 check(p.rpm,2000,6000,"Spin speed");check(p.edgeFraction,0,.5,"Edge fraction");check(p.tauS,1,60,"Time constant");
 let calibrationKind=p.calibrationKind??"illustrative",referenceUm=p.referenceUm,exponent=p.exponent,rangeRpm=[2000,6000],points=null;
 if(calibrationKind==="user-points"){if(!Array.isArray(p.calibrationPoints)||p.calibrationPoints.length!==2)throw new RangeError("Two calibration points required");const fit=fitCalibration(...p.calibrationPoints);({referenceUm,exponent,rangeRpm,points}=fit);if(p.rpm<rangeRpm[0]||p.rpm>rangeRpm[1])throw new RangeError("Spin speed outside supplied calibration interval");}
 else if(calibrationKind!=="illustrative")throw new RangeError("Unknown calibration type");
 check(referenceUm,.1,20,"Reference µm");check(exponent,.2,.8,"Exponent");
 for(const k of ["bakeA","bakeB"]){if(!p[k])throw new RangeError("Both schedules required");check(p[k].plateC,30,300,"Plate °C");check(p[k].seconds,1,300,"Bake seconds");}
 const n=41,R=p.diameterMm/2,pitch=p.diameterMm/n,h=referenceUm*(p.rpm/4000)**(-exponent),values=[];
 // Normalize edge profile so center exactly equals calibrated thickness.
 const e0=Math.exp(-1/.045);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const r=Math.hypot(i-20,j-20)*pitch/R;values.push(r<=1?h*(1+p.edgeFraction*(Math.exp(-(1-r)/.045)-e0)/(1-e0)):null);}
 const v=values.filter(x=>x!==null),ramp=p.rpm/1000,spinHistory=[{timeS:0,rpm:0},{timeS:ramp,rpm:p.rpm},{timeS:ramp+30,rpm:p.rpm},{timeS:2*ramp+30,rpm:0}];
 const specimen=(suffix,b)=>{const trace=[],at=t=>({timeS:t,plateC:b.plateC,waferC:b.plateC+(23-b.plateC)*Math.exp(-t/p.tauS)});for(let i=0;i<b.seconds;i++)trace.push(at(i));trace.push(at(b.seconds));const map={n,pitchMm:pitch,originMm:[-R+pitch/2,-R+pitch/2],frame:"wafer center; x right, y away; row major",unit:"µm",values:[...values]};return {sampleId:id+"-"+suffix,parentSampleId:id,parentRevision:p.revision,revision:p.revision+1,material,substrate:{shape:"circle",material:"silicon (assumed)",diameterMm:p.diameterMm,chuckDiameterMm:57.2},coating:{calibrationId,calibrationKind,calibrationPoints:points?.map(x=>({...x}))??null,validRpm:[...rangeRpm],referenceRpm:4000,referenceUm,exponent,edgeFraction:p.edgeFraction,centerUm:h,meanUm:v.reduce((a,b)=>a+b,0)/v.length,spinHistory:spinHistory.map(x=>({...x})),preBakeMap:map},bake:{mode:"contact",schedule:{...b},tauS:p.tauS,ambientC:23,plateCondition:"preheated and stabilized before contact; waiting excluded",temperatureHistory:trace,finalWaferC:trace.at(-1).waferC,thermalExposureAboveAmbientCs:(b.plateC-23)*(b.seconds+p.tauS*Math.expm1(-b.seconds/p.tauS))},postBakeThicknessUm:null,history:[{operation:"spin",durationS:2*ramp+30},{operation:"contact-bake",durationS:b.seconds}]};};
 return {schema:"bts.cee200cbx.paired-resist.v1",instrumentId:"02-08",dataKind:"simulated",input:JSON.parse(JSON.stringify(p)),units:{length:"mm",film:"µm",temperature:"°C",time:"s",spin:"rpm",thermalExposure:"°C·s above 23 °C"},specimenA:specimen("A",p.bakeA),specimenB:specimen("B",p.bakeB),limitations:[calibrationKind==="illustrative"?"Synthetic calibration; not a measured resist curve":"User-supplied points fitted, not independently validated; fixed recipe and same material required","Constant preheated plate and lumped wafer; no solvent transport, shrinkage, cooldown or verified downstream importer"]};
}
