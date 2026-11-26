// MJB3 geometry-first contact exposure surrogate. All planar distances mm.
export const limits=Object.freeze({xyMm:3,thetaDeg:15,chuckDiameterMm:25.4,apertureDiameterMm:50.8,maskSideMm:76.2});
export const demoMask={id:"NEURAL-COUPON-MASK",revision:1,clear:[
 {id:"C01",x:-3,y:2,w:1.4,h:1.4},{id:"T01",x:-3,y:0,w:.35,h:3},{id:"P01",x:-3,y:-2.5,w:1.8,h:2},
 {id:"C02",x:0,y:2,w:1.2,h:1.2},{id:"T02",x:0,y:0,w:.35,h:3},{id:"P02",x:0,y:-2.5,w:1.8,h:2},
 {id:"C03",x:3,y:2,w:1.0,h:1.0},{id:"T03",x:3,y:0,w:.35,h:3},{id:"P03",x:3,y:-2.5,w:1.8,h:2},
 {id:"F1h",x:-5,y:5,w:1.5,h:.25},{id:"F1v",x:-5,y:5,w:.25,h:1.5},
 {id:"F2h",x:5,y:5,w:1.5,h:.25},{id:"F2v",x:5,y:5,w:.25,h:1.5}],
 fiducials:[{id:"F1",x:-5,y:5},{id:"F2",x:5,y:5}]};
export const defaults={sampleId:"COUPON-001",revision:0,widthMm:16,heightMm:16,thicknessUm:500,mask:demoMask,xMm:0,yMm:0,thetaDeg:0,intensity:25,seconds:4,pitchMm:.1,loaded:true,clamped:true,contact:true};
const fail=(code,message)=>({ok:false,code,message,sampleRevision:null});
const finite=(v)=>typeof v==="number"&&Number.isFinite(v);
export function transform(x,y,s){const a=s.thetaDeg*Math.PI/180,c=Math.cos(a),n=Math.sin(a);return [c*x-n*y+s.xMm,n*x+c*y+s.yMm]}
export function inverse(x,y,s){const a=s.thetaDeg*Math.PI/180,c=Math.cos(a),n=Math.sin(a),u=x-s.xMm,v=y-s.yMm;return [c*u+n*v,-n*u+c*v]}
export function fit(s){
 if(![s.widthMm,s.heightMm,s.thicknessUm].every(finite)||s.widthMm<=0||s.heightMm<=0||s.thicknessUm<100||s.thicknessUm>1000)return fail("sample","Use positive dimensions and 100–1000 µm thickness (software bounds).");
 if(Math.hypot(s.widthMm,s.heightMm)>limits.chuckDiameterMm+1e-10)return fail("chuck","Centered rectangular coupon overhangs the 25.4 mm circular support.");
 // Virtual chuck has four explicitly assumed holes at ±3 mm, radius .5 mm, and a central hole.
 if(Math.min(s.widthMm,s.heightMm)<7)return fail("vacuum","Coupon does not cover the assumed vacuum holes.");
 return {ok:true};
}
export function pose(s){if(![s.xMm,s.yMm,s.thetaDeg].every(finite)||Math.abs(s.xMm)>3||Math.abs(s.yMm)>3||Math.abs(s.thetaDeg)>15)return fail("travel","Requested stage pose exceeds the centered 6 mm X/Y or 30° theta span.");return {ok:true}}
export function checkMask(m){if(!m||typeof m.id!=="string"||!m.id.trim()||!Number.isInteger(m.revision)||m.revision<0||!Array.isArray(m.clear)||m.clear.length<1||m.clear.length>100||!Array.isArray(m.fiducials)||m.fiducials.length!==2)return fail("mask","Mask needs an ID, nonnegative revision, 1–100 clear rectangles and two fiducials.");
 const ids=new Set();for(const f of [...m.clear,...m.fiducials]){if(!f||typeof f.id!=="string"||!f.id.trim()||ids.has(f.id)||![f.x,f.y].every(finite)||Math.abs(f.x)>38.1||Math.abs(f.y)>38.1)return fail("mask","Invalid or duplicate feature ID / coordinates.");ids.add(f.id)}
 for(const f of m.clear){if(![f.w,f.h].every(finite)||f.w<=0||f.h<=0||Math.abs(f.x)+f.w/2>38.1||Math.abs(f.y)+f.h/2>38.1)return fail("mask","A clear rectangle exceeds the mask plate.");}
 if(Math.hypot(m.fiducials[0].x-m.fiducials[1].x,m.fiducials[0].y-m.fiducials[1].y)<.01)return fail("mask","Fiducials must be distinct.");return {ok:true}}
// Coupon marks are independent of the photomask. Omission is legacy nominal
// correspondence; explicit null is a first-level exposure without alignment.
export function checkAlignment(s){
 const m=checkMask(s.mask);if(!m.ok)return m;
 if(s.couponFiducials===null)return fail("no-marks","First-level specimen has no alignment marks.");
 const marks=s.couponFiducials===undefined?s.mask.fiducials:s.couponFiducials;
 if(!Array.isArray(marks)||marks.length!==2)return fail("fiducials","Enter exactly two coupon-local marks or null for first-level exposure.");
 if(![s.widthMm,s.heightMm].every(finite)||s.widthMm<=0||s.heightMm<=0)return fail("sample","Invalid coupon dimensions.");
 const seen=new Set();
 for(const f of marks){
  if(!f||typeof f.id!=="string"||!f.id.trim()||seen.has(f.id)||![f.x,f.y].every(finite))return fail("fiducials","Coupon marks require unique IDs and finite x/y coordinates.");
  seen.add(f.id);
  if(Math.abs(f.x)>s.widthMm/2||Math.abs(f.y)>s.heightMm/2)return fail("fiducials","A coupon mark lies outside the coupon.");
 }
 const pairs=s.mask.fiducials.map(f=>({mask:f,coupon:marks.find(c=>c.id===f.id)}));
 if(pairs.some(p=>!p.coupon))return fail("fiducials","Coupon and mask mark IDs must match.");
 if(Math.hypot(pairs[1].coupon.x-pairs[0].coupon.x,pairs[1].coupon.y-pairs[0].coupon.y)<.01)return fail("fiducials","Coupon marks must be separated by at least 0.01 mm.");
 if(pairs.some(p=>Math.hypot(p.mask.x,p.mask.y)>limits.apertureDiameterMm/2))return fail("fiducials","A mask mark is outside the modeled inspection/exposure aperture.");
 return {ok:true,pairs,source:s.couponFiducials===undefined?"legacy-nominal":"explicit-coupon-marks"};
}
export function overlay(s){
 const q=checkAlignment(s);if(!q.ok||!pose(s).ok)return null;
 return q.pairs.map(({mask,coupon})=>{const [x,y]=transform(coupon.x,coupon.y,s);return {id:mask.id,target:[mask.x,mask.y],coupon:[coupon.x,coupon.y],actual:[x,y],delta:[x-mask.x,y-mask.y]}});
}
export function solveAlignment(s){
 const q=checkAlignment(s);if(!q.ok)return q;
 const [a,b]=q.pairs;
 const dx=b.coupon.x-a.coupon.x,dy=b.coupon.y-a.coupon.y,mx=b.mask.x-a.mask.x,my=b.mask.y-a.mask.y;
 const thetaDeg=Math.atan2(dx*my-dy*mx,dx*mx+dy*my)*180/Math.PI;
 const c=Math.cos(thetaDeg*Math.PI/180),n=Math.sin(thetaDeg*Math.PI/180);
 const cx=(a.coupon.x+b.coupon.x)/2,cy=(a.coupon.y+b.coupon.y)/2,tx=(a.mask.x+b.mask.x)/2,ty=(a.mask.y+b.mask.y)/2;
 const requested={xMm:tx-(c*cx-n*cy),yMm:ty-(n*cx+c*cy),thetaDeg};
 // Remove roundoff near zero and the physical bounds, not actual out-of-range poses.
 for(const [k,lim] of [["xMm",limits.xyMm],["yMm",limits.xyMm],["thetaDeg",limits.thetaDeg]]){if(Math.abs(requested[k])<1e-12)requested[k]=0;if(Math.abs(Math.abs(requested[k])-lim)<1e-12)requested[k]=Math.sign(requested[k])*lim;}
 const valid=pose(requested);if(!valid.ok)return {...valid,requested};
 const marks=overlay({...s,...requested}),rmsMm=Math.sqrt(marks.reduce((sum,f)=>sum+f.delta[0]**2+f.delta[1]**2,0)/marks.length);
 return {ok:true,pose:requested,marks,rmsMm,baselineMismatchMm:Math.hypot(mx,my)-Math.hypot(dx,dy)};
}
export function exposure(s){
 for(const f of [fit(s),pose(s),checkMask(s.mask)])if(!f.ok)return f;
 if(s.loaded!==true||s.clamped!==true||s.contact!==true)return fail("interlock","Load the coupon, clamp the mask and return to contact before exposure.");
 if(typeof s.sampleId!=="string"||!s.sampleId.trim()||s.sampleId.length>100||!Number.isInteger(s.revision)||s.revision<0||s.revision>=1e6)return fail("identity","Invalid input sample ID or revision.");
 if(![s.intensity,s.seconds,s.pitchMm].every(finite)||s.intensity<=0||s.intensity>100||s.seconds<=0||s.seconds>120||s.pitchMm<.05||s.pitchMm>.5)return fail("dose","Use intensity 0–100 mW/cm², time 0–120 s (positive), pitch 0.05–0.5 mm.");
 const nx=Math.ceil(s.widthMm/s.pitchMm),ny=Math.ceil(s.heightMm/s.pitchMm),dx=s.widthMm/nx,dy=s.heightMm/ny,dose=s.intensity*s.seconds;
 const raster=new Array(nx*ny);let lit=0;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=-s.widthMm/2+(i+.5)*dx,y=-s.heightMm/2+(j+.5)*dy;const [u,v]=transform(x,y,s);const open=u*u+v*v<=25.4**2&&s.mask.clear.some(f=>Math.abs(u-f.x)<f.w/2&&Math.abs(v-f.y)<f.h/2);raster[j*nx+i]=open?dose:0;if(open)lit++}
 const alignmentCheck=checkAlignment(s);
 if(!alignmentCheck.ok&&s.couponFiducials!==undefined&&s.couponFiducials!==null)return alignmentCheck;
 const matched=alignmentCheck.ok?overlay(s):[];
 const fiducials=matched.map(f=>({id:f.id,nominalMaskMm:f.target,couponMarkLocalMm:f.coupon,couponMarkInMaskMm:f.actual,residualMm:f.delta}));
 const alignment={status:alignmentCheck.ok?"evaluated":"not-evaluated",source:alignmentCheck.source??(s.couponFiducials===null?"first-level":"legacy-nominal"),rmsMm:matched.length?Math.sqrt(matched.reduce((sum,f)=>sum+f.delta[0]**2+f.delta[1]**2,0)/matched.length):null,...(!alignmentCheck.ok?{reason:alignmentCheck.message}:{})};
 const angle=s.thetaDeg*Math.PI/180,c=Math.cos(angle),n=Math.sin(angle),[ix,iy]=inverse(0,0,s);
 const sampleRevision={schema:"bts.lithography.latent-dose.v1",equipmentId:"02-02",provenance:"simulated ideal binary geometric hard contact; no material calibration",sampleId:s.sampleId,parentRevision:s.revision,revision:s.revision+1,sample:{widthMm:s.widthMm,heightMm:s.heightMm,thicknessUm:s.thicknessUm},mask:JSON.parse(JSON.stringify(s.mask)),alignment,pose:{xMm:s.xMm,yMm:s.yMm,thetaDeg:s.thetaDeg},maskToCoupon:[[c,n,ix],[-n,c,iy],[0,0,1]],fiducials,exposure:{mode:"ideal-hard-contact",nominalWavelengthNm:405,intensityMwCm2:s.intensity,seconds:s.seconds,peakDoseMjCm2:dose},grid:{frame:"coupon-centered, +x right, +y away from operator; row 0 at minimum y; cell centers",originMm:[-s.widthMm/2,-s.heightMm/2],spacingMm:[dx,dy],nx,ny,unit:"mJ/cm2",order:"row-major",values:raster},statistics:{exposedPixels:lit,exposedAreaMm2:lit*dx*dy,exposedFraction:lit/raster.length,maxDoseMjCm2:lit?dose:0}};
 return {ok:true,code:"ok",message:"Exposure complete; incoming coupon remains unchanged.",sampleRevision};
}
