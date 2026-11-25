export const CAL={
  "id": "merck-az1512-150mm-graph-v1",
  "resist": "AZ 1512",
  "diameter_mm": 150,
  "points": [
    [
      500,
      3.9
    ],
    [
      1000,
      2.7
    ],
    [
      1500,
      2.2
    ],
    [
      2000,
      1.9
    ],
    [
      2500,
      1.7
    ],
    [
      3000,
      1.5
    ],
    [
      3500,
      1.45
    ]
  ],
  "holdout": {
    "rpm": 4000,
    "um": 1.35,
    "tolerance_um": 0.15
  },
  "source": "https://smif.pratt.duke.edu/sites/smif.pratt.duke.edu/files/operating/tds_az_1500_series.pdf#page=1",
  "note": "Approximate graph readings, not raw measurements. ±0.15 µm graph-reading acceptance band (roughly three pixels on inspected plot); no measurement uncertainty reported. 4000 rpm reserved before fitting."
};
export const EXAMPLE={
  "schema": "bts.spin-coater.job.v1",
  "sampleId": "SI-WAFER-150-001",
  "parentRevision": 0,
  "resistId": "AZ 1512",
  "diameter_mm": 150,
  "offsetX_mm": 0,
  "offsetZ_mm": 0,
  "spreadRPM": 500,
  "spread_s": 20,
  "rpm": 4000,
  "hold_s": 35,
  "accel_rpm_s": 1000,
  "edgeAmplitude": 0.35,
  "edgeWidth_mm": 2,
  "dispense_mL": 2,
  "contactIds": [],
  "calibrationId": "merck-az1512-150mm-graph-v1"
};
export function fit(points){let sx=0,sy=0,sxx=0,sxy=0;for(const [rpm,h] of points){const x=Math.log(rpm/1000),y=Math.log(h);sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}const n=points.length,b=(n*sxy-sx*sy)/(n*sxx-sx*sx);return {A:Math.exp((sy-b*sx)/n),n:-b}}
export function central(rpm){const p=fit(CAL.points);return p.A*(rpm/1000)**(-p.n)}
export function validate(j){const range=(name,lo,hi)=>{if(typeof j[name]!=="number"||!Number.isFinite(j[name])||j[name]<lo||j[name]>hi)throw Error(name+" outside "+lo+"–"+hi)};if(j.schema!=="bts.spin-coater.job.v1"||typeof j.sampleId!=="string"||!j.sampleId.trim()||j.resistId!==CAL.resist||j.calibrationId!==CAL.id)throw Error("Invalid sample or unsupported resist/calibration");range("parentRevision",0,1e9);if(!Number.isInteger(j.parentRevision))throw Error("Revision must be an integer");range("diameter_mm",50,150);range("offsetX_mm",-10,10);range("offsetZ_mm",-10,10);range("rpm",500,4000);range("spreadRPM",100,500);range("spread_s",1,60);range("hold_s",35,60);range("accel_rpm_s",100,3000);range("edgeAmplitude",0,1);range("edgeWidth_mm",.5,5);range("dispense_mL",.1,5);if(!Array.isArray(j.contactIds)||j.contactIds.some(x=>typeof x!=="string"))throw Error("Invalid contact IDs");const offset=Math.hypot(j.offsetX_mm,j.offsetZ_mm);if(j.diameter_mm/2-offset<21)throw Error("Wafer does not cover assumed seal radius (21 mm)");if(offset>2)throw Error("Centering fault: teaching limit 2 mm");if(j.dispense_mL<2*(j.diameter_mm/150)**2)throw Error("Insufficient dispense for assumed coverage; teaching threshold, not wetting calibration");return j}
export function speedHistory(j){const steps=[];let time=0,rpm=0;for(const [label,target,duration] of [["spread",j.spreadRPM,j.spread_s],["coat",j.rpm,j.hold_s],["stop",0,0]]){const ramp=Math.abs(target-rpm)/j.accel_rpm_s;steps.push({label:label+" ramp",start_s:time,end_s:time+ramp,start_rpm:rpm,end_rpm:target});time+=ramp;rpm=target;if(duration){steps.push({label:label+" hold",start_s:time,end_s:time+duration,start_rpm:rpm,end_rpm:rpm});time+=duration}}return {steps,total_s:time}}
export function simulate(input){const j=validate(input);const r=j.diameter_mm/2,h=central(j.rpm),offset=Math.hypot(j.offsetX_mm,j.offsetZ_mm),n=81,pitch=2*r/(n-1);const values=[];let min=Infinity,max=-Infinity,sum=0,count=0;for(let z=0;z<n;z++)for(let x=0;x<n;x++){const X=x*pitch-r,Z=z*pitch-r,R=Math.hypot(X,Z);if(R>r+1e-8){values.push(null);continue}const v=h*(1+j.edgeAmplitude*Math.exp(-((r-R)/j.edgeWidth_mm)))*(1+0.04*(j.offsetX_mm*X+j.offsetZ_mm*Z)/(2*r));values.push(+v.toFixed(6));min=Math.min(min,v);max=Math.max(max,v);sum+=v;count++}return {schema:"bts.spin-coater.resist-layer.v1",sampleId:j.sampleId,parentRevision:j.parentRevision,revision:j.parentRevision+1,contactIds:[...j.contactIds],resistId:j.resistId,calibrationId:CAL.id,provenance:{kind:"simulated",central:"empirical graph fit; post-spin reference condition unspecified in datasheet",edge:"uncalibrated radial exponential; offset term illustrative",source:CAL.source,fit:fit(CAL.points),calibrationDiameter_mm:150,warning:j.diameter_mm!==150?"Diameter differs from calibration; transfer is unvalidated.":"Graph fit does not validate individual wafer",recipeWarning:"Time, acceleration and volume are interlocks/history only; empirical thickness assumes comparable process, not transient fluid or bake."},wafer:{shape:"circle",diameter_mm:j.diameter_mm,offsetX_mm:j.offsetX_mm,offsetZ_mm:j.offsetZ_mm,offset_mm:offset},recipe:{...j,contactIds:[...j.contactIds]},history:speedHistory(j),metrics:{central_um:h,min_um:min,max_um:max,mean_um:sum/count,range_um:max-min},grid:{nx:n,nz:n,pitch_mm:pitch,origin_mm:[-r,-r],frame:"wafer-centered x,z; x right, z front; row-major +z; null outside",units:"µm",values}}}
export function verify(){const rows=[];const near=(test,expected,actual,unit,tolerance)=>rows.push({test,expected,actual,unit,tolerance,pass:Math.abs(actual-expected)<=tolerance});const reject=(test,change)=>{let actual=0;try{simulate({...EXAMPLE,...change})}catch{actual=1}near(test,1,actual,"rejected",0)};near("Held-out Merck graph point (not raw measured data)",CAL.holdout.um,central(4000),"µm",CAL.holdout.tolerance_um);near("Independent Montana State published recipe (reported ±0.476 µm; uncertainty type unspecified)",1.3,central(4000),"µm",.476);near("Power law reference: doubling speed scales by 2^-n",2**(-fit(CAL.points).n),central(2000)/central(1000),"ratio",1e-12);const out=simulate(EXAMPLE),u=simulate({...EXAMPLE,edgeAmplitude:0});near("Uniform centered film, edge bead off",0,u.metrics.range_um,"µm",1e-12);near("Center point unaffected by edge at 150 mm",out.metrics.central_um,out.grid.values[40*81+40],"µm",1e-6);near("Boundary bead at x=R",out.metrics.central_um*1.35,out.grid.values[40*81+80],"µm",1e-6);near("Recipe time: spread 20 + coat 35 + total ramp 8",63,out.history.total_s,"s",1e-9);near("Revision increments",1,out.revision,"revision",0);reject("Off-center sample", {offsetX_mm:3});reject("Out-of-calibration speed",{rpm:4500});reject("Invalid small sample",{diameter_mm:40});reject("Insufficient dose",{dispense_mL:.1});reject("Wrong calibration",{calibrationId:"unknown"});return rows}