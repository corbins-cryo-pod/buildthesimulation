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
function rasterStripe(rectangles,nx,ny,pitch,start,end,shift,fullDose){
 const width=end-start,x0=start*pitch,x1=end*pitch,y1=ny*pitch;
 const shapes=rectangles.filter(s=>s.level>0&&fullDose>0).map(s=>({x0:Math.max(x0,s.x),x1:Math.min(x1,s.x+s.w),y0:Math.max(0,s.y+shift),y1:Math.min(y1,s.y+s.h+shift),level:s.level})).filter(s=>s.x1>s.x0&&s.y1>s.y0);
 const xs=[...new Set([x0,x1,...shapes.flatMap(s=>[s.x0,s.x1])])].sort((a,b)=>a-b),ys=[...new Set([0,y1,...shapes.flatMap(s=>[s.y0,s.y1])])].sort((a,b)=>a-b);
 const out=new Float64Array(width*ny);let area=0,energy=0;
 for(let i=0;i<xs.length-1;i++){
  const a=xs[i],b=xs[i+1],mid=(a+b)/2,active=shapes.filter(s=>mid>=s.x0&&mid<s.x1);if(!active.length)continue;
  for(let j=0;j<ys.length-1;j++){
   const c=ys[j],d=ys[j+1],v=(c+d)/2;let level=0;for(const s of active)if(v>=s.y0&&v<s.y1)level=Math.max(level,s.level);if(!level)continue;
   const dose=fullDose*level/127,A=(b-a)*(d-c);area+=A;energy+=A*dose;
   const lx=Math.max(start,Math.floor(a/pitch)),rx=Math.min(end-1,Math.ceil(b/pitch)-1),ly=Math.max(0,Math.floor(c/pitch)),ry=Math.min(ny-1,Math.ceil(d/pitch)-1);
   for(let y=ly;y<=ry;y++){const oy=Math.max(0,Math.min(d,(y+1)*pitch)-Math.max(c,y*pitch));for(let x=lx;x<=rx;x++){const ox=Math.max(0,Math.min(b,(x+1)*pitch)-Math.max(a,x*pitch));out[y*width+x-start]+=dose*ox*oy/(pitch*pitch)}}
  }
 }
 return {out,area,energy};
}
function renderDose(rectangles,nx,ny,p,d,shifts){
 const half=nx/2,l=rasterStripe(rectangles,nx,ny,p,0,half,shifts[0],d),r=rasterStripe(rectangles,nx,ny,p,half,nx,shifts[1],d);
 const map=new Float64Array(nx*ny);
 for(let y=0;y<ny;y++){map.set(l.out.subarray(y*half,(y+1)*half),y*nx);map.set(r.out.subarray(y*half,(y+1)*half),y*nx+half)}
 let peak=0;for(const v of map)peak=Math.max(peak,v);
 return {map,peak,area:l.area+r.area,energy:(l.energy+r.energy)*1e-8};
}
function seamCentroids(map,nx,ny,p){
 const seam=col=>{let sum=0,w=0;for(let i=0;i<ny;i++){const a=map[i*nx+col];sum+=(i+.5)*p*a;w+=a}return w?sum/w:null};
 const left=seam(nx/2-1),right=seam(nx/2);return {left,right,delta:left===null||right===null?null:right-left}
}
export function expose(job){
 if(!job||typeof job!=='object'||Array.isArray(job))throw Error('Job must be an object');
 const n=(v,lo,hi,name)=>{if(!Number.isFinite(v)||v<lo||v>hi)throw Error(name+" outside "+lo+"–"+hi);return v};
 if(typeof job.sampleId!=="string"||!job.sampleId.trim()||job.sampleId.length>100||typeof job.resist!=="string"||!job.resist.trim())throw Error("Sample and resist IDs required");
 n(job.parentRevision,0,1e9,"Parent revision");if(!Number.isInteger(job.parentRevision))throw Error("Revision must be integer");
 const coupon=n(job.coupon_mm,6,150,"Square coupon (mm)"),thickness=n(job.thickness_mm,0.1,6.3,"Thickness (mm)"),f=n(job.field_um,20,500,"Virtual stripe width"),h=n(job.height_um,20,500,"Virtual stripe length"),p=n(job.pitch_um,0.5,5,"Sampling pitch"),d=n(job.dose_mJ_cm2,0,500,"Commanded dose"),off=n(job.offset_um,-20,20,"Relative lateral shift"),ov=n(job.overlay_um,-20,20,"Global overlay shift");
 const nx=2*f/p,ny=h/p;if(!Number.isInteger(f/p)||!Number.isInteger(ny)||nx*ny>500000)throw Error("Stripe and height must divide by pitch; maximum 500,000 pixels");
 if(2*f>coupon*1000||h>coupon*1000)throw Error("Pattern exceeds coupon");
 if(!Array.isArray(job.shapes)||job.shapes.length<1||job.shapes.length>128)throw Error("Provide 1–128 vector rectangles");
 const ids=new Set();for(const s of job.shapes){if(!s||typeof s!=="object"||typeof s.id!=="string"||!s.id||ids.has(s.id))throw Error("Unique shape IDs required");ids.add(s.id);n(s.x,0,2*f,"Rectangle x");n(s.y,0,h,"Rectangle y");n(s.w,1,2*f,"Rectangle width");n(s.h,1,h,"Rectangle height");if(s.x+s.w>2*f||s.y+s.h>h)throw Error("Rectangle outside nominal window");n(s.level,0,127,"Gray level");if(!Number.isInteger(s.level))throw Error("Gray level must be integer");}
 const actual=renderDose(job.shapes,nx,ny,p,d,[ov,ov+off]),ideal=renderDose(job.shapes,nx,ny,p,d,[0,0]);
 const {map,peak:max,area,energy}=actual,nominal=ideal.map;
 const measured=seamCentroids(map,nx,ny,p),baseline=seamCentroids(nominal,nx,ny,p);
 const left=measured.left,right=measured.right,delta=measured.delta;
 return {schema:"bts.mla150.exposure.v1",deviceId:"02-03",kind:"simulated-commanded-dose",sampleId:job.sampleId,parentRevision:job.parentRevision,revision:job.parentRevision+1,resist:job.resist,job:JSON.parse(JSON.stringify(job)),coordinateFrame:{origin:"back-left of local coupon-centered nominal write window",u:"machine Y, left to right",v:"machine X, back to front; displayed down",unit:"um",pixelCenters:true,pixelValues:"area-average over square pixel centered at (index+0.5)*pitch"},grid:{nx,ny,pitch_um:p,order:"row-major; u fastest; v increasing",units:"mJ/cm2",dose:Array.from(map),nominal:Array.from(nominal)},fields:[{id:"stripe-1",u0_um:0,u1_um:f,vOffset_um:ov},{id:"stripe-2",u0_um:f,u1_um:2*f,vOffset_um:ov+off}],metrics:{peakDose_mJ_cm2:max,exposedArea_um2:area,integratedEnergy_mJ:energy,nominalEnergy_mJ:ideal.energy,clippedEnergy_mJ:Math.max(0,ideal.energy-energy),nominalSeamDelta_um:baseline.delta,seamResidual_um:delta===null||baseline.delta===null?null:delta-baseline.delta,seamLeftCentroid_um:left,seamRightCentroid_um:right,seamDelta_um:delta},history:[{operation:"maskless exposure",source:"area-integrated ideal vector raster; no optical PSF or resist development",wavelength_nm:405,writeMode:"II"}]};
}
export function verify(){
 const j={...EXAMPLE,shapes:[{id:"line",x:10,y:46,w:180,h:8,level:127}]};
 const a=expose(j),b=expose({...j,offset_um:4}),c=expose({...j,dose_mJ_cm2:40}),o=expose({...j,overlay_um:3}),q=expose({...j,offset_um:.6});
 const nx=a.grid.nx,ny=a.grid.ny;let unchanged=true;for(let i=0;i<ny;i++)for(let x=0;x<nx/2;x++)if(a.grid.dose[i*nx+x]!==b.grid.dose[i*nx+x])unchanged=false;
 let invalid=false;try{expose({...j,coupon_mm:2})}catch{invalid=true}
 const row=(test,expected,actual,units,tolerance)=>({test,expected,actual,units,tolerance,pass:typeof expected==="number"?Math.abs(expected-actual)<=tolerance:actual===expected});
 const narrow=expose({...j,shapes:[{id:"thin",x:10.25,y:46.25,w:179.5,h:1,level:127}]});
 const overlap=expose({...j,shapes:[{id:"a",x:10,y:20,w:10,h:10,level:127},{id:"b",x:15,y:20,w:10,h:10,level:64}]});
 const clipping=expose({...j,shapes:[{id:"edge",x:90,y:95,w:20,h:5,level:127}],offset_um:4});
 const asymmetric=expose({...j,shapes:[{id:"a",x:90,y:20,w:10,h:5,level:127},{id:"b",x:100,y:25,w:10,h:5,level:127}]});
 const empty=expose({...j,dose_mJ_cm2:0});
 return [row("Exact fractional pixel area",179.5,narrow.metrics.exposedArea_um2,"µm²",1e-9),row("Fractional pixel energy",179.5*80e-8,narrow.metrics.integratedEnergy_mJ,"mJ",1e-12),row("Overlap uses maximum gray", (100*80+50*80*64/127)*1e-8,overlap.metrics.integratedEnergy_mJ,"mJ",1e-12),row("Shifted edge clipping loss",40*80e-8,clipping.metrics.clippedEnergy_mJ,"mJ",1e-12),row("Asymmetric nominal seam baseline",5,asymmetric.metrics.nominalSeamDelta_um,"µm",1e-9),row("Baseline-corrected residual",0,asymmetric.metrics.seamResidual_um,"µm",1e-9),row("Zero dose seam undefined",null,empty.metrics.seamDelta_um,"µm",0),row("Aligned line: seam centroid difference",0,a.metrics.seamDelta_um,"µm",0),row("Programmed +4 µm shift",4,b.metrics.seamDelta_um,"µm",1),row("Unaffected first stripe",true,unchanged,"boolean",0),row("Subpixel lateral shift",.6,q.metrics.seamDelta_um,"µm",1e-9),row("Half dose: peak",40,c.metrics.peakDose_mJ_cm2,"mJ/cm²",1e-6),row("Uniform line area (180 × 8)",1440,a.metrics.exposedArea_um2,"µm²",0),row("Integrated energy (80 × 1440 × 10⁻⁸)",.001152,a.metrics.integratedEnergy_mJ,"mJ",1e-10),row("Global overlay moves both centroids",3,o.metrics.seamLeftCentroid_um-a.metrics.seamLeftCentroid_um,"µm",0),row("Reject undersized coupon",true,invalid,"boolean",0)];
}
