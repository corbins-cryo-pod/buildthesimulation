export const CALIBRATIONS={
  "AZ 1505": {
    "id": "merck-az1505-150mm-graph-v1",
    "resist": "AZ 1505",
    "diameter_mm": 150,
    "points": [
      [
        500,
        1.55
      ],
      [
        1000,
        1.1
      ],
      [
        1500,
        0.9
      ],
      [
        2000,
        0.78
      ],
      [
        2500,
        0.73
      ],
      [
        3000,
        0.66
      ],
      [
        3500,
        0.6
      ]
    ],
    "holdout": {
      "rpm": 4000,
      "um": 0.6,
      "tolerance_um": 0.15
    },
    "source": "https://smif.pratt.duke.edu/sites/smif.pratt.duke.edu/files/operating/tds_az_1500_series.pdf#page=1",
    "note": "Approximate visual readings of Merck Rev. 03/21 graph, p. 1; 4,000 rpm excluded from fit. Acceptance band is graph-reading tolerance only, not measured uncertainty."
  },
  "AZ 1512": {
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
    "note": "Approximate visual readings of Merck Rev. 03/21 graph, p. 1; 4,000 rpm excluded from fit. Acceptance band is graph-reading tolerance only, not measured uncertainty."
  },
  "AZ 1518": {
    "id": "merck-az1518-150mm-graph-v1",
    "resist": "AZ 1518",
    "diameter_mm": 150,
    "points": [
      [
        500,
        5.7
      ],
      [
        1000,
        4
      ],
      [
        1500,
        3.2
      ],
      [
        2000,
        2.75
      ],
      [
        2500,
        2.4
      ],
      [
        3000,
        2.2
      ],
      [
        3500,
        2
      ]
    ],
    "holdout": {
      "rpm": 4000,
      "um": 1.85,
      "tolerance_um": 0.15
    },
    "source": "https://smif.pratt.duke.edu/sites/smif.pratt.duke.edu/files/operating/tds_az_1500_series.pdf#page=1",
    "note": "Approximate visual readings of Merck Rev. 03/21 graph, p. 1; 4,000 rpm excluded from fit. Acceptance band is graph-reading tolerance only, not measured uncertainty."
  },
  "AZ 1529": {
    "id": "merck-az1529-150mm-graph-v1",
    "resist": "AZ 1529",
    "diameter_mm": 150,
    "points": [
      [
        500,
        9.75
      ],
      [
        1000,
        6.75
      ],
      [
        1500,
        5.45
      ],
      [
        2000,
        4.6
      ],
      [
        2500,
        4.1
      ],
      [
        3000,
        3.75
      ],
      [
        3500,
        3.45
      ]
    ],
    "holdout": {
      "rpm": 4000,
      "um": 3.2,
      "tolerance_um": 0.2
    },
    "source": "https://smif.pratt.duke.edu/sites/smif.pratt.duke.edu/files/operating/tds_az_1500_series.pdf#page=1",
    "note": "Approximate visual readings of Merck Rev. 03/21 graph, p. 1; 4,000 rpm excluded from fit. Acceptance band is graph-reading tolerance only, not measured uncertainty."
  }
};
export const CAL=CALIBRATIONS['AZ 1512'];
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
export function central(rpm,cal=CAL){const p=fit(cal.points);return p.A*(rpm/1000)**(-p.n)}
export function calibrationOf(j){const cal=CALIBRATIONS[j.resistId];if(!cal||cal.id!==j.calibrationId)throw Error("Unknown or mismatched material calibration");return cal}
export function validate(j){const range=(name,lo,hi)=>{if(typeof j[name]!=="number"||!Number.isFinite(j[name])||j[name]<lo||j[name]>hi)throw Error(name+" outside "+lo+"–"+hi)};if(!j||typeof j!=="object"||Array.isArray(j)||j.schema!=="bts.spin-coater.job.v1"||typeof j.sampleId!=="string"||!j.sampleId.trim()||j.sampleId.length>160)throw Error("Invalid sample or job schema");calibrationOf(j);range("parentRevision",0,1e9);if(!Number.isInteger(j.parentRevision))throw Error("Revision must be an integer");range("diameter_mm",50,150);range("offsetX_mm",-10,10);range("offsetZ_mm",-10,10);range("rpm",500,4000);range("spreadRPM",100,500);range("spread_s",1,60);range("hold_s",35,60);range("accel_rpm_s",100,3000);range("edgeAmplitude",0,1);range("edgeWidth_mm",.5,5);range("dispense_mL",.1,5);if(!Array.isArray(j.contactIds)||j.contactIds.length>10000||j.contactIds.some(x=>typeof x!=="string"||!x.trim()||x.length>160)||new Set(j.contactIds).size!==j.contactIds.length)throw Error("Contact IDs must be unique nonempty strings");const offset=Math.hypot(j.offsetX_mm,j.offsetZ_mm);if(j.diameter_mm/2-offset<21)throw Error("Wafer does not cover assumed seal radius (21 mm)");if(offset>2)throw Error("Centering fault: teaching limit 2 mm");if(j.dispense_mL+1e-12<2*(j.diameter_mm/150)**2)throw Error("Insufficient dispense for assumed coverage; teaching threshold, not wetting calibration");return j}
export function speedHistory(j){const steps=[];let time=0,rpm=0;for(const [label,target,duration] of [["spread",j.spreadRPM,j.spread_s],["coat",j.rpm,j.hold_s],["stop",0,0]]){const ramp=Math.abs(target-rpm)/j.accel_rpm_s;if(ramp>0){steps.push({label:label+" ramp",start_s:time,end_s:time+ramp,start_rpm:rpm,end_rpm:target});time+=ramp}rpm=target;if(duration){steps.push({label:label+" hold",start_s:time,end_s:time+duration,start_rpm:rpm,end_rpm:rpm});time+=duration}}return {steps,total_s:time}}
export function edgeShape(radial,R,w){const edgeBase=Math.exp(-R/w);return (Math.exp(-(R-radial)/w)-edgeBase)/(1-edgeBase)}
export function localThickness(j,h,x,z){const R=j.diameter_mm/2,r=Math.hypot(x,z);if(r>R+1e-8)return null;const bead=edgeShape(Math.min(r,R),R,j.edgeWidth_mm);const asym=1+0.02*(j.offsetX_mm*x+j.offsetZ_mm*z)/R;return h*(1+j.edgeAmplitude*bead)*asym}
export function areaMean(j,h){const R=j.diameter_mm/2,w=j.edgeWidth_mm,e=Math.exp(-R/w);const avg=2*(R*w-w*w+w*w*e-e*R*R/2)/(R*R*(1-e));return h*(1+j.edgeAmplitude*avg)}
export function simulate(input){const j=validate(input),cal=calibrationOf(j),R=j.diameter_mm/2,h=central(j.rpm,cal),offset=Math.hypot(j.offsetX_mm,j.offsetZ_mm),n=81,pitch=2*R/(n-1);const values=[];let min=Infinity,max=-Infinity;for(let z=0;z<n;z++)for(let x=0;x<n;x++){const v=localThickness(j,h,x*pitch-R,z*pitch-R);if(v===null){values.push(null);continue}values.push(+v.toFixed(6));min=Math.min(min,v);max=Math.max(max,v)}const mean=areaMean(j,h);const edgeExcludedRadius=Math.max(0,R-3);const hNeg=localThickness(j,h,offset?-edgeExcludedRadius*j.offsetX_mm/offset:edgeExcludedRadius,offset?-edgeExcludedRadius*j.offsetZ_mm/offset:0);const hPos=localThickness(j,h,offset?edgeExcludedRadius*j.offsetX_mm/offset:edgeExcludedRadius,offset?edgeExcludedRadius*j.offsetZ_mm/offset:0);return {schema:"bts.spin-coater.resist-layer.v1",sampleId:j.sampleId,parentRevision:j.parentRevision,revision:j.parentRevision+1,contactIds:[...j.contactIds],resistId:j.resistId,calibrationId:cal.id,provenance:{kind:"simulated",modelVersion:"2.0",central:"empirical graph fit; exact measurement and bake conditions unspecified",edge:"uncalibrated normalized exponential and illustrative offset asymmetry",source:cal.source,fit:fit(cal.points),calibrationDiameter_mm:150,warning:j.diameter_mm!==150?"Diameter differs from calibration; transfer is unvalidated.":"Graph fit does not validate individual wafer.",recipeWarning:"Time, acceleration and volume are interlocks/history only; empirical thickness assumes comparable process, not transient fluid or bake.",mapMetrics:"mean_um is analytic area mean of teaching field; extrema/range are sampled on the 81 × 81 grid, not guaranteed continuous extrema.",calibrationPoints:cal.points.map(p=>[...p]),heldOut:{...cal.holdout,predicted_um:central(cal.holdout.rpm,cal),kind:"graph-reading, not raw data"}},wafer:{shape:"circle",diameter_mm:j.diameter_mm,offsetX_mm:j.offsetX_mm,offsetZ_mm:j.offsetZ_mm,offset_mm:offset},recipe:{...j,contactIds:[...j.contactIds]},history:speedHistory(j),metrics:{central_um:h,min_um:min,max_um:max,mean_um:mean,range_um:max-min,edgeExcluded3mm_oppositePointDifference_um:Math.abs(hPos-hNeg),edgeExcluded3mm_radius_mm:edgeExcludedRadius},grid:{nx:n,nz:n,pitch_mm:pitch,origin_mm:[-R,-R],frame:"wafer-centered x,z; x right, z front; row-major +z; null outside; grid nodes, not equal-area pixels",units:"µm",values}}}
export function verify(){const rows=[];const near=(test,expected,actual,unit,tolerance)=>rows.push({test,expected,actual,unit,tolerance,pass:Math.abs(actual-expected)<=tolerance});const reject=(test,change)=>{let actual=0;try{simulate({...EXAMPLE,...change})}catch{actual=1}near(test,1,actual,"rejected",0)};for(const cal of Object.values(CALIBRATIONS)){near(cal.resist+" held-out Merck graph point",cal.holdout.um,central(4000,cal),"µm",cal.holdout.tolerance_um)}near("Independent Montana State recipe (uncertainty type unspecified)",1.3,central(4000),"µm",.476);near("Power law reference: doubling speed scales by 2^-n",2**(-fit(CAL.points).n),central(2000)/central(1000),"ratio",1e-12);const out=simulate(EXAMPLE),u=simulate({...EXAMPLE,edgeAmplitude:0});near("Uniform centered film, bead off",0,u.metrics.range_um,"µm",1e-12);near("Analytic area mean, bead off",u.metrics.central_um,u.metrics.mean_um,"µm",1e-12);near("Center exactly equals fit at 150 mm",out.metrics.central_um,out.grid.values[40*81+40],"µm",1e-6);const small=simulate({...EXAMPLE,diameter_mm:50,edgeWidth_mm:5,edgeAmplitude:1});near("Center exactly equals fit at 50 mm and maximum bead width",small.metrics.central_um,small.grid.values[40*81+40],"µm",1e-6);near("Boundary bead at x=R",out.metrics.central_um*1.35,out.grid.values[40*81+80],"µm",1e-6);const j={...EXAMPLE,diameter_mm:50,edgeWidth_mm:5,edgeAmplitude:.8,offsetX_mm:1.2,offsetZ_mm:-.5},R=j.diameter_mm/2,h=central(j.rpm);let integration=0;const N=20000;for(let i=0;i<N;i++){const r=(i+.5)*R/N;integration+=(localThickness(j,h,r,0)+localThickness(j,h,-r,0))*r*R/N/(R*R)}near("Analytic area mean vs independent midpoint radial quadrature",integration,areaMean(j,h),"µm",1e-8);near("Opposite-point offset asymmetry sign",out.metrics.central_um*1.35*.04,localThickness({...EXAMPLE,offsetX_mm:1},out.metrics.central_um,75,0)-localThickness({...EXAMPLE,offsetX_mm:1},out.metrics.central_um,-75,0),"µm",1e-9);near("Recipe time: spread 20 + coat 35 + total ramp 8",63,out.history.total_s,"s",1e-9);near("Equal speed stages omit zero-length ramp",0,speedHistory({...EXAMPLE,rpm:500}).steps.filter(s=>s.end_s<=s.start_s).length,"segments",0);near("Revision increments",1,out.revision,"revision",0);reject("Off-center sample",{offsetX_mm:3});reject("Out-of-calibration speed",{rpm:4500});reject("Invalid small sample",{diameter_mm:40});reject("Insufficient dispense",{dispense_mL:.1});reject("Wrong calibration",{calibrationId:"unknown"});reject("Mismatched resist",{resistId:"AZ 1518"});reject("Duplicate contacts",{contactIds:["A","A"]});return rows}
