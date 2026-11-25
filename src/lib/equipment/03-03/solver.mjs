export function exampleCalibration(){return {schema:"bts.sputter.rate-map.v1",id:"DEMO-AL-001",material:"Al",mode:"DC",provenance:"Synthetic witness map, not measured. Centre 0.5 nm/s chosen to match WashU's general typical rate only.",source:"https://imse.washu.edu/facilities/micronanofab/deposition.html",pressure_mTorr:5,power_W:100,axis_mm:[-75,0,75],rates_nm_s:[[.42,.46,.42],[.46,.5,.46],[.42,.46,.42]]}}

export function validate(c,p){
  if(!c||c.schema!=="bts.sputter.rate-map.v1"||!c.id||!c.provenance||c.material!==p.material||c.mode!==p.mode)throw Error("Missing matching rate calibration for this target and mode.");
  if(!["Al","Ti","Cu","Nb","Zn","SiO2","SiN","ZnO"].includes(p.material))throw Error("Target not supported by this model.");
  if((["SiO2","SiN","ZnO"].includes(p.material)?"RF":"DC")!==p.mode)throw Error("Target/mode combination not supported by this teaching configuration.");
  if(!Number.isFinite(c.pressure_mTorr)||c.pressure_mTorr<=0||!Number.isFinite(c.power_W)||c.power_W<=0)throw Error("Calibration must specify positive pressure and power.");
  if(!Number.isFinite(p.pressure_mTorr)||!Number.isFinite(p.power_W)||Math.abs(c.pressure_mTorr-p.pressure_mTorr)>1e-9||Math.abs(c.power_W-p.power_W)>1e-9)throw Error("Recipe pressure/power differs from calibration; no rate extrapolation.");
  if(typeof p.sampleId!=="string"||!p.sampleId.trim()||!Number.isFinite(p.diameter_mm)||p.diameter_mm<=0||p.diameter_mm>203.2)throw Error("Enter a sample ID and diameter 0–203.2 mm.");
  if(!Number.isFinite(p.duration_s)||p.duration_s<0||p.duration_s>3600||!Number.isFinite(p.angle_deg)||Math.abs(p.angle_deg)>360||!Number.isFinite(p.rpm)||p.rpm<0||p.rpm>20||!Number.isFinite(p.threshold_nm)||p.threshold_nm<0)throw Error("Run outside teaching range: 0–3600 s, ±360°, 0–20 rpm, threshold ≥0 nm.");
  const a=c.axis_mm,g=c.rates_nm_s;if(!Array.isArray(a)||a.length<2||a.length>101||!a.every((v,i)=>Number.isFinite(v)&&(!i||v>a[i-1]))||!Array.isArray(g)||g.length!==a.length||!g.every(row=>Array.isArray(row)&&row.length===a.length&&row.every(v=>Number.isFinite(v)&&v>=0)))throw Error("Incomplete or invalid rate grid.");
  let r=p.diameter_mm/2;if(a[0]>-r||a[a.length-1]<r)throw Error("Rate map does not cover the full circular sample; no spatial extrapolation.");
}

export function bilinear(c,x,y){
  const a=c.axis_mm,g=c.rates_nm_s;function interval(q){if(q<a[0]-1e-9||q>a.at(-1)+1e-9)throw Error("Outside rate map.");let i=0;while(i<a.length-2&&q>a[i+1])i++;return [i,Math.max(0,Math.min(1,(q-a[i])/(a[i+1]-a[i])))]}
  const [i,u]=interval(x),[j,v]=interval(y);return (1-v)*((1-u)*g[j][i]+u*g[j][i+1])+v*((1-u)*g[j+1][i]+u*g[j+1][i+1])
}

export function calculate(c,p){
  validate(c,p);const R=p.diameter_mm/2,ang=p.angle_deg*Math.PI/180,turns=p.rpm*p.duration_s/60;
  // Average complete rotations once, plus remaining fractional rotation. Fixed 180 samples/revolution.
  const whole=Math.floor(turns),fraction=turns-whole;
  const rate=(x,y,a)=>bilinear(c,x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a));
  function at(x,y){if(!turns)return rate(x,y,ang);let sum=0;if(whole){for(let i=0;i<180;i++)sum+=rate(x,y,ang+2*Math.PI*(i+.5)/180);sum=sum/180*whole}if(fraction>1e-12){const n=Math.max(1,Math.ceil(fraction*180));let partial=0;for(let i=0;i<n;i++)partial+=rate(x,y,ang+2*Math.PI*fraction*(i+.5)/n);sum+=partial/n*fraction}return sum/turns}
  const points=[],N=41,step=2*R/(N-1);for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=(i-20)*step,y=(j-20)*step;if(Math.hypot(x,y)<=R+1e-9){const rate_nm_s=at(x,y);points.push({x_mm:x,y_mm:y,rate_nm_s,thickness_nm:rate_nm_s*p.duration_s})}}
  const t=points.map(q=>q.thickness_nm),mean=t.reduce((a,b)=>a+b,0)/t.length,min=Math.min(...t),max=Math.max(...t);
  return {schema:"bts.sample.sputtered-layer.v1",deviceId:"03-03",sampleId:p.sampleId,material:p.material,mode:p.mode,recipe:{...p},calibration:{...c},coordinateFrame:"sample-local x/y mm, origin centre; positive orientation rotates x toward y in calibration plane",units:{length:"mm",thickness:"nm",rate:"nm/s",stress:"not estimated"},method:"bilinear rate interpolation; midpoint angular averaging; thickness = rate × open-shutter duration",center_nm:at(0,0)*p.duration_s,mean_nm:mean,min_nm:min,max_nm:max,nonuniformity_pct:mean?(max-min)/(2*mean)*100:0,coverage_fraction:t.filter(v=>v>=p.threshold_nm).length/t.length,coverageMeaning:"fraction of sampled planar grid points meeting threshold; not step coverage",stress:null,stressReason:"No material-specific measured stress relationship supplied.",points}
}

export function defaultRecipe(){return {sampleId:"WITNESS-001",material:"Al",mode:"DC",diameter_mm:100,duration_s:120,angle_deg:0,rpm:0,pressure_mTorr:5,power_W:100,threshold_nm:50}}

export function verification(){
 const c=exampleCalibration(),p=defaultRecipe(),a=calculate(c,p),b=calculate(c,{...p,duration_s:240}),z=calculate(c,{...p,duration_s:0}),edge=a.points.find(q=>q.x_mm===50&&q.y_mm===0),rows=[];
 function check(test,expected,actual,units,tolerance){rows.push({test,expected,actual,units,tolerance,pass:typeof expected==="number"?Math.abs(actual-expected)<=tolerance:actual===expected})}
 check("Independent centre: 0.5 × 120",60,a.center_nm,"nm",1e-9);check("Register fixed-rate 1:2 duration",2,b.center_nm/a.center_nm,"ratio",1e-12);
 check("Independent linear interpolation at x=50 mm: (0.5−0.04×50/75)×120",56.8,edge.thickness_nm,"nm",1e-9);check("Zero shutter time",0,z.max_nm,"nm",1e-12);
 let rejected=false;try{calculate(null,p)}catch(e){rejected=true}check("Missing calibration rejected",true,rejected,"boolean",0);
 rejected=false;try{calculate(c,{...p,diameter_mm:180})}catch(e){rejected=true}check("Map smaller than specimen rejected",true,rejected,"boolean",0);
 rejected=false;try{calculate(c,{...p,power_W:200})}catch(e){rejected=true}check("Changed power without new calibration rejected",true,rejected,"boolean",0);
 const rot=calculate(c,{...p,rpm:10});check("Centre invariant to rotation",60,rot.center_nm,"nm",1e-9);
 const asym={...c,rates_nm_s:[[.5,.5,.5],[.4,.5,.6],[.5,.5,.5]]};const u=calculate(asym,p),v=calculate(asym,{...p,angle_deg:90});check("90° orientation transforms asymmetric map: x edge equals original y edge",u.points.find(q=>q.x_mm===0&&q.y_mm===50).thickness_nm,v.points.find(q=>q.x_mm===50&&q.y_mm===0).thickness_nm,"nm",1e-9);
 return rows
}
