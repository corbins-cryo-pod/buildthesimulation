export const defaultJob = {
  "sampleId": "PAS-WAFER-001",
  "parentRevision": 0,
  "waferDiameter_mm": 100,
  "waferThickness_mm": 0.525,
  "reticleId": "RETICLE-L-01",
  "reticleThickness_mm": 6.35,
  "projectionScale": 0.2,
  "fieldWidth_mm": 20,
  "fieldHeight_mm": 20,
  "rows": 2,
  "columns": 3,
  "pitchX_mm": 20,
  "pitchY_mm": 20,
  "offsetX_mm": 0,
  "offsetY_mm": 0,
  "overlayX_nm": 0,
  "overlayY_nm": 0,
  "rotation_urad": 0,
  "edgeExclusion_mm": 0,
  "partialPolicy": "skip",
  "dose_mJ_cm2": 100,
  "shapes": [
    {
      "id": "L-horizontal",
      "x_mm": -25,
      "y_mm": -20,
      "w_mm": 35,
      "h_mm": 5
    },
    {
      "id": "L-vertical",
      "x_mm": -25,
      "y_mm": -15,
      "w_mm": 5,
      "h_mm": 35
    },
    {
      "id": "isolated-line",
      "x_mm": 12,
      "y_mm": 10,
      "w_mm": 5,
      "h_mm": 1
    },
    {
      "id": "marker",
      "x_mm": 22,
      "y_mm": 17,
      "w_mm": 5,
      "h_mm": 5
    }
  ]
};
export function validate(j){
 const num=(k,lo,hi)=>{if(typeof j[k]!=="number"||!Number.isFinite(j[k])||j[k]<lo||j[k]>hi)throw Error(k+" must be "+lo+" to "+hi)};
 if(typeof j.sampleId!=="string"||!j.sampleId.trim()||typeof j.reticleId!=="string"||!j.reticleId.trim())throw Error("Sample and reticle IDs are required");
 num("parentRevision",0,1e9);if(!Number.isInteger(j.parentRevision))throw Error("Parent revision must be integral");
 if(![75,100,150,200].includes(j.waferDiameter_mm))throw Error("Unsupported wafer diameter (75, 100, 150, 200 mm)");
 num("waferThickness_mm",.01,1);
 if(![3.05,3.81,6.35].includes(j.reticleThickness_mm))throw Error("Unsupported reticle thickness");
 if(j.projectionScale!==.2)throw Error("275D has fixed 5:1 reduction (scale 0.2)");
 num("fieldWidth_mm",.01,27.4);num("fieldHeight_mm",.01,27.4);
 const w=j.fieldWidth_mm,h=j.fieldHeight_mm;
 if(!(w<=22&&h<=22)&&!(w<=27.4&&h<=14.7)&&!(w<=14.7&&h<=27.4))throw Error("Field exceeds documented 22 × 22 or 27.4 × 14.7 mm envelope");
 for(const k of ["rows","columns"]){num(k,1,25);if(!Number.isInteger(j[k]))throw Error(k+" must be integral")}
 num("pitchX_mm",.01,200);num("pitchY_mm",.01,200);
 if((j.columns>1&&j.pitchX_mm<w)||(j.rows>1&&j.pitchY_mm<h))throw Error("Overlapping commanded fields not supported");
 for(const k of ["offsetX_mm","offsetY_mm"])num(k,-100,100);
 for(const k of ["overlayX_nm","overlayY_nm"])num(k,-1e5,1e5);
 num("rotation_urad",-1000,1000);num("edgeExclusion_mm",0,10);num("dose_mJ_cm2",1,1000);
 if(!["skip","expose"].includes(j.partialPolicy))throw Error("Partial policy must be skip or expose");
 if(!Array.isArray(j.shapes)||j.shapes.length<1||j.shapes.length>100)throw Error("Provide 1–100 reticle rectangles");
 const seen=new Set();
 for(const s of j.shapes){if(typeof s.id!=="string"||!s.id.trim()||seen.has(s.id))throw Error("Unique shape IDs required");seen.add(s.id);
  for(const k of ["x_mm","y_mm","w_mm","h_mm"])if(typeof s[k]!=="number"||!Number.isFinite(s[k]))throw Error("Invalid reticle coordinates");
  if(s.w_mm<=0||s.h_mm<=0||s.x_mm< -w*2.5||s.x_mm+s.w_mm>w*2.5||s.y_mm< -h*2.5||s.y_mm+s.h_mm>h*2.5||s.x_mm< -76.2||s.x_mm+s.w_mm>76.2||s.y_mm< -76.2||s.y_mm+s.h_mm>76.2)throw Error("Shape outside reticle field: "+s.id);
 }
 return j;
}
export function solve(j){
 validate(j);
 const R=j.waferDiameter_mm/2-j.edgeExclusion_mm,t=j.rotation_urad*1e-6,c=Math.cos(t),s=Math.sin(t),dx=j.overlayX_nm*1e-6,dy=j.overlayY_nm*1e-6;
 const transform=(x,y)=>[c*x-s*y+dx,s*x+c*y+dy];
 const inv=(x,y)=>[c*(x-dx)+s*(y-dy),-s*(x-dx)+c*(y-dy)];
 const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const origin=inv(0,0),fields=[];
 const coverageFor=(x,y,w,h,actual)=>{const far=Math.max(...actual.map(p=>Math.hypot(...p))),near=Math.hypot(Math.max(Math.abs(origin[0]-(x+w/2))-w/2,0),Math.max(Math.abs(origin[1]-(y+h/2))-h/2,0));return far<=R+1e-9?'full':near>=R-1e-9?'outside':'partial'};
 for(let row=0;row<j.rows;row++)for(let col=0;col<j.columns;col++){
  const x=(col-(j.columns-1)/2)*j.pitchX_mm+j.offsetX_mm,y=(row-(j.rows-1)/2)*j.pitchY_mm+j.offsetY_mm;
  const w=j.fieldWidth_mm,h=j.fieldHeight_mm,nominal=rect(x-w/2,y-h/2,w,h),actual=nominal.map(p=>transform(...p)),center=transform(x,y);
  const coverage=coverageFor(x-w/2,y-h/2,w,h,actual);
  const exposed=coverage==="full"||(coverage==="partial"&&j.partialPolicy==="expose");
  const features=j.shapes.map(a=>{const q=j.projectionScale;const xx=x+a.x_mm*q,yy=y+a.y_mm*q,ww=a.w_mm*q,hh=a.h_mm*q,ideal=rect(xx,yy,ww,hh),actualFeature=ideal.map(p=>transform(...p)),featureCoverage=coverageFor(xx,yy,ww,hh,actualFeature);return {reticleShapeId:a.id,projectedWidth_mm:ww,projectedHeight_mm:hh,belowRatedResolution:Math.min(ww,hh)<.00028,nominalCorners_mm:ideal,actualCorners_mm:actualFeature,coverage:featureCoverage,exposed:exposed&&featureCoverage!=='outside',idealLocalDose_mJ_cm2:exposed&&featureCoverage!=='outside'?j.dose_mJ_cm2:0}});
  fields.push({id:"R"+(row+1)+"C"+(col+1),row,col,nominalCenter_mm:[x,y],actualCenter_mm:center,nominalCorners_mm:nominal,actualCorners_mm:actual,coverage,exposed,overlay_nm:[(center[0]-x)*1e6,(center[1]-y)*1e6],features});
 }
 const tally={full:fields.filter(f=>f.coverage==="full").length,partial:fields.filter(f=>f.coverage==="partial").length,outside:fields.filter(f=>f.coverage==="outside").length,exposed:fields.filter(f=>f.exposed).length};
 return {schema:"bts.pas5500.exposure.v1",kind:"simulated-geometric-latent-exposure",instrument:"ASML PAS 5500/275D",sampleId:j.sampleId,parentRevision:j.parentRevision,revision:j.parentRevision+1,reticleId:j.reticleId,job:JSON.parse(JSON.stringify(j)),coordinateFrame:"Wafer-centered right-handed XY, +Y upward in map; millimeters; theta CCW; stage moves opposite nominal field position",exposureDomain:{type:"circle",center_mm:[0,0],radius_mm:R,intersection:"Only exposed fields; actual feature polygons intersected implicitly with this disk. Unclipped coordinates retained."},dose:{commanded_mJ_cm2:j.dose_mJ_cm2,calibrated:false,maskPolarity:'dark-field; rectangles are clear apertures',interpretation:'Ideal top-hat dose inside union of exposed clear apertures intersected with usable wafer disk; zero outside; no diffraction in field map'},tally,maxOverlay_nm:Math.max(...fields.map(f=>Math.hypot(...f.overlay_nm))),fields,provenance:{method:"Geometric 5:1 projection; programmed poses; deterministic rigid overlay; no lens/resist model",source:"https://www.nist.gov/laboratories/tools-instruments/nanofab-tool-asml-pas5500275d-stepper",revision:"1.1"}};
}

export function geometricDoseAt(result,x_mm,y_mm){
 if(!Number.isFinite(x_mm)||!Number.isFinite(y_mm))throw Error("Finite wafer coordinates required");
 if(Math.hypot(x_mm,y_mm)>result.exposureDomain.radius_mm)return 0;
 const j=result.job,t=j.rotation_urad*1e-6,c=Math.cos(t),s=Math.sin(t),dx=x_mm-j.overlayX_nm*1e-6,dy=y_mm-j.overlayY_nm*1e-6,x=c*dx+s*dy,y=-s*dx+c*dy;
 for(const f of result.fields){if(!f.exposed)continue;for(const a of f.features){if(!a.exposed)continue;const lo=a.nominalCorners_mm[0],hi=a.nominalCorners_mm[2];if(x>=lo[0]&&x<hi[0]&&y>=lo[1]&&y<hi[1])return j.dose_mJ_cm2;}}
 return 0;
}
