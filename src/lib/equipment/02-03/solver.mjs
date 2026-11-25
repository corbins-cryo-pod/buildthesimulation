export const EXAMPLE={
  "sampleId": "MLA-COUPON-001",
  "parentRevision": 0,
  "resist": "virtual-positive-resist",
  "coupon_mm": 10,
  "thickness_mm": 0.5,
  "field_um": 100,
  "height_um": 100,
  "pitch_um": 1,
  "dose_mJ_cm2": 80,
  "offset_um": 0,
  "overlay_um": 0,
  "shapes": [
    {
      "id": "trace-01",
      "x": 10,
      "y": 46,
      "w": 180,
      "h": 8,
      "level": 127
    },
    {
      "id": "pad-L",
      "x": 10,
      "y": 30,
      "w": 20,
      "h": 40,
      "level": 127
    },
    {
      "id": "pad-R",
      "x": 170,
      "y": 30,
      "w": 20,
      "h": 40,
      "level": 127
    },
    {
      "id": "fiducial",
      "x": 30,
      "y": 15,
      "w": 10,
      "h": 5,
      "level": 64
    }
  ]
};
export function expose(job){
 const n=(v,lo,hi,name)=>{if(!Number.isFinite(v)||v<lo||v>hi)throw Error(name+" outside "+lo+"–"+hi);return v};
 if(typeof job.sampleId!=="string"||!job.sampleId.trim()||job.sampleId.length>100||typeof job.resist!=="string"||!job.resist.trim())throw Error("Sample and resist IDs required");
 n(job.parentRevision,0,1e9,"Parent revision");if(!Number.isInteger(job.parentRevision))throw Error("Revision must be integer");
 const coupon=n(job.coupon_mm,6,150,"Square coupon (mm)"),thickness=n(job.thickness_mm,0.1,6.3,"Thickness (mm)"),f=n(job.field_um,20,500,"Virtual stripe width"),h=n(job.height_um,20,500,"Virtual stripe length"),p=n(job.pitch_um,0.5,5,"Sampling pitch"),d=n(job.dose_mJ_cm2,0,500,"Commanded dose"),off=n(job.offset_um,-20,20,"Relative lateral shift"),ov=n(job.overlay_um,-20,20,"Global overlay shift");
 const nx=2*f/p,ny=h/p;if(!Number.isInteger(f/p)||!Number.isInteger(ny)||nx*ny>500000)throw Error("Stripe and height must divide by pitch; maximum 500,000 pixels");
 if(2*f>coupon*1000||h>coupon*1000)throw Error("Pattern exceeds coupon");
 if(!Array.isArray(job.shapes)||job.shapes.length<1||job.shapes.length>128)throw Error("Provide 1–128 vector rectangles");
 const ids=new Set();for(const s of job.shapes){if(typeof s.id!=="string"||!s.id||ids.has(s.id))throw Error("Unique shape IDs required");ids.add(s.id);n(s.x,0,2*f,"Rectangle x");n(s.y,0,h,"Rectangle y");n(s.w,1,2*f,"Rectangle width");n(s.h,1,h,"Rectangle height");if(s.x+s.w>2*f||s.y+s.h>h)throw Error("Rectangle outside nominal window");n(s.level,0,127,"Gray level");if(!Number.isInteger(s.level))throw Error("Gray level must be integer");}
 const map=new Float32Array(nx*ny),nominal=new Float32Array(nx*ny);let max=0,area=0,total=0;
 for(let i=0;i<ny;i++)for(let j=0;j<nx;j++){const u=(j+.5)*p,v=(i+.5)*p,shift=ov+(j>=nx/2?off:0);let a=0,b=0;for(const s of job.shapes){if(u>=s.x&&u<s.x+s.w){if(v>=s.y&&v<s.y+s.h)a=Math.max(a,s.level);if(v-shift>=s.y&&v-shift<s.y+s.h)b=Math.max(b,s.level)}}const k=i*nx+j;nominal[k]=a*d/127;map[k]=b*d/127;max=Math.max(max,map[k]);if(map[k]>0)area+=p*p;total+=map[k]*p*p;}
 const seam=(col)=>{let sum=0,w=0;for(let i=0;i<ny;i++){const a=map[i*nx+col];sum+=(i+.5)*p*a;w+=a}return w?sum/w:null};
 const left=seam(nx/2-1),right=seam(nx/2);return {schema:"bts.mla150.exposure.v1",deviceId:"02-03",kind:"simulated-commanded-dose",sampleId:job.sampleId,parentRevision:job.parentRevision,revision:job.parentRevision+1,resist:job.resist,job:JSON.parse(JSON.stringify(job)),coordinateFrame:{origin:"lower-left of local coupon-centered nominal write window",u:"machine Y, left to right",v:"machine X, back to front; displayed down",unit:"um",pixelCenters:true},grid:{nx,ny,pitch_um:p,order:"row-major; u fastest; v increasing",units:"mJ/cm2",dose:Array.from(map),nominal:Array.from(nominal)},fields:[{id:"stripe-1",u0_um:0,u1_um:f,vOffset_um:ov},{id:"stripe-2",u0_um:f,u1_um:2*f,vOffset_um:ov+off}],metrics:{peakDose_mJ_cm2:max,exposedArea_um2:area,integratedEnergy_mJ:total*1e-8,seamLeftCentroid_um:left,seamRightCentroid_um:right,seamDelta_um:left===null||right===null?null:right-left},history:[{operation:"maskless exposure",source:"ideal vector raster, no optical PSF or resist development",wavelength_nm:405,writeMode:"II"}]};
}
export function verify(){
 const j={...EXAMPLE,shapes:[{id:"line",x:10,y:46,w:180,h:8,level:127}]};
 const a=expose(j),b=expose({...j,offset_um:4}),c=expose({...j,dose_mJ_cm2:40}),o=expose({...j,overlay_um:3}),q=expose({...j,offset_um:.6});
 const nx=a.grid.nx,ny=a.grid.ny;let unchanged=true;for(let i=0;i<ny;i++)for(let x=0;x<nx/2;x++)if(a.grid.dose[i*nx+x]!==b.grid.dose[i*nx+x])unchanged=false;
 let invalid=false;try{expose({...j,coupon_mm:2})}catch{invalid=true}
 const row=(test,expected,actual,units,tolerance)=>({test,expected,actual,units,tolerance,pass:typeof expected==="number"?Math.abs(expected-actual)<=tolerance:actual===expected});
 return [row("Aligned line: seam centroid difference",0,a.metrics.seamDelta_um,"µm",0),row("Programmed +4 µm shift",4,b.metrics.seamDelta_um,"µm",1),row("Unaffected first stripe",true,unchanged,"boolean",0),row("Subpixel lateral shift",.6,q.metrics.seamDelta_um,"µm",1),row("Half dose: peak",40,c.metrics.peakDose_mJ_cm2,"mJ/cm²",1e-6),row("Uniform line area (180 × 8)",1440,a.metrics.exposedArea_um2,"µm²",0),row("Integrated energy (80 × 1440 × 10⁻⁸)",.001152,a.metrics.integratedEnergy_mJ,"mJ",1e-10),row("Global overlay moves both centroids",3,o.metrics.seamLeftCentroid_um-a.metrics.seamLeftCentroid_um,"µm",0),row("Reject undersized coupon",true,invalid,"boolean",0)];
}
