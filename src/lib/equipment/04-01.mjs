export const example = {
  "sampleId": "SiN-coupon-001",
  "parentRevision": "r0",
  "waferMm": 100,
  "durationMin": 5,
  "maskNm": 150,
  "maskRate": 7.5,
  "openUm": 20,
  "lateralRatio": 0,
  "layers": [
    {
      "material": "Si3N4",
      "thicknessNm": 100,
      "rateNmMin": 10
    },
    {
      "material": "SiO2 (illustrative stop)",
      "thicknessNm": 250,
      "rateNmMin": 0
    }
  ],
  "calibration": "Yale Oxford-80 family approximate SiN rate 10 nm/min; PMMA 5–10 nm/min midpoint; oxide stop rate assumed, not calibrated on selected Stanford tool."
};
export function simulate(s) {
  const number=(v,min,max,name)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(name+" outside supported range");return v};
  if(typeof s.sampleId!=="string"||!s.sampleId.trim()||s.sampleId.length>100)throw new Error("Sample ID required");
  number(s.waferMm,1,200,"Wafer diameter (mm)"); number(s.durationMin,0,60,"Time (min)");
  number(s.maskNm,0,100000,"Mask thickness (nm)"); number(s.maskRate,0,10000,"Mask rate (nm/min)");
  number(s.openUm,0.5,100,"Opening width (µm)");number(s.lateralRatio,0,1,"Lateral/vertical rate ratio");
  if(!Array.isArray(s.layers)||s.layers.length<1||s.layers.length>4)throw new Error("Provide 1–4 layers");
  for(const l of s.layers){if(typeof l.material!=="string"||!l.material.trim())throw new Error("Material required");number(l.thicknessNm,0.01,100000,"Layer thickness");number(l.rateNmMin,0,10000,"Layer rate")}
  const nx=101,ny=51,dxUm=100/nx,dyUm=50/ny;const depthNm=[],maskRemainingNm=[],remainingLayersNm=[];
  const total=s.layers.reduce((a,l)=>a+l.thicknessNm,0), maskTime=s.maskRate>0?s.maskNm/s.maskRate:s.maskNm===0?0:Infinity;
  const lateral=s.layers[0].rateNmMin*s.lateralRatio/1000;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const x=(i+.5)*dxUm-50, dist=Math.max(0,Math.abs(x)-s.openUm/2),open=dist===0;
    let t=Math.max(0,s.durationMin-(open?0:Math.min(maskTime,lateral>0?dist/lateral:Infinity)));
    const rem=s.layers.map(l=>{if(l.rateNmMin===0){t=0;return l.thicknessNm}const etched=Math.min(l.thicknessNm,t*l.rateNmMin);t=Math.max(0,t-etched/l.rateNmMin);return l.thicknessNm-etched});
    remainingLayersNm.push(rem);depthNm.push(total-rem.reduce((a,b)=>a+b,0));maskRemainingNm.push(open?0:Math.max(0,s.maskNm-s.maskRate*s.durationMin));
  }
  const center=(ny>>1)*nx+(nx>>1);
  return {schema:"bts.etch-result.v1",deviceId:"04-01",sampleId:s.sampleId,parentRevision:s.parentRevision??"r0",revision:(s.parentRevision??"r0")+"-rie1",kind:"simulated",settings:JSON.parse(JSON.stringify(s)),grid:{nx,ny,dxUm,dyUm,originUm:[-50,-25],layout:"row-major; coordinates at cell centers"},depthNm,maskRemainingNm,remainingLayersNm,summary:{centerDepthNm:depthNm[center],edgeDepthNm:depthNm[(ny>>1)*nx],maxDepthNm:Math.max(...depthNm),centerRemainingNm:remainingLayersNm[center],protectedMaskNm:maskRemainingNm[(ny>>1)*nx],breakthrough:depthNm[center]>=total-1e-8}};
}
