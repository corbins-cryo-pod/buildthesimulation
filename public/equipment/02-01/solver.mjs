// MA/BA6 Gen4; independent educational geometrical/optical model, planar units mm.
export const limits={"waferDiameterMm":150,"maskSideMm":178,"xyMm":5,"thetaDeg":5,"proximityUm":[1,300],"focusMm":[-20,20],"wavelengthNm":365,"roiSizeMm":1.28,"pitchesUm":[2,4,8,16]};
export const demoMask={"id":"NEURAL-MASK-M2","revision":2,"clear":[{"id":"C01","x":-0.35,"y":0.25,"w":0.12,"h":0.12},{"id":"T01","x":-0.35,"y":0,"w":0.024,"h":0.36},{"id":"P01","x":-0.35,"y":-0.31,"w":0.2,"h":0.2},{"id":"C02","x":0,"y":0.25,"w":0.1,"h":0.1},{"id":"T02","x":0,"y":0,"w":0.02,"h":0.36},{"id":"P02","x":0,"y":-0.31,"w":0.2,"h":0.2},{"id":"C03","x":0.35,"y":0.25,"w":0.08,"h":0.08},{"id":"T03","x":0.35,"y":0,"w":0.016,"h":0.36},{"id":"P03","x":0.35,"y":-0.31,"w":0.2,"h":0.2}],"fiducials":[{"id":"F1","x":-20,"y":0},{"id":"F2","x":20,"y":0}]};
export const defaults={"sampleId":"WAFER-MA6-001","revision":1,"diameterMm":150,"thicknessUm":675,"mask":{"id":"NEURAL-MASK-M2","revision":2,"clear":[{"id":"C01","x":-0.35,"y":0.25,"w":0.12,"h":0.12},{"id":"T01","x":-0.35,"y":0,"w":0.024,"h":0.36},{"id":"P01","x":-0.35,"y":-0.31,"w":0.2,"h":0.2},{"id":"C02","x":0,"y":0.25,"w":0.1,"h":0.1},{"id":"T02","x":0,"y":0,"w":0.02,"h":0.36},{"id":"P02","x":0,"y":-0.31,"w":0.2,"h":0.2},{"id":"C03","x":0.35,"y":0.25,"w":0.08,"h":0.08},{"id":"T03","x":0.35,"y":0,"w":0.016,"h":0.36},{"id":"P03","x":0.35,"y":-0.31,"w":0.2,"h":0.2}],"fiducials":[{"id":"F1","x":-20,"y":0},{"id":"F2","x":20,"y":0}]},"waferMarks":[{"id":"F1","x":-20,"y":0},{"id":"F2","x":20,"y":0}],"xMm":0.12,"yMm":-0.08,"thetaDeg":0.08,"focusMm":0,"mode":"hard","gapUm":20,"intensity":8,"seconds":12.5,"pitchUm":4,"roiX":0,"roiY":0,"loaded":true,"clamped":true,"engaged":true};
export function fail(code,message){return {ok:false,code,message,sampleRevision:null}}
export function finite(v){return typeof v==="number"&&Number.isFinite(v)}
export function transform(x,y,s){const a=s.thetaDeg*Math.PI/180,c=Math.cos(a),n=Math.sin(a);return [c*x-n*y+s.xMm,n*x+c*y+s.yMm]}
export function inverse(x,y,s){const a=s.thetaDeg*Math.PI/180,c=Math.cos(a),n=Math.sin(a),u=x-s.xMm,v=y-s.yMm;return [c*u+n*v,-n*u+c*v]}
export function pose(s){return [s.xMm,s.yMm,s.thetaDeg].every(finite)&&Math.abs(s.xMm)<=5&&Math.abs(s.yMm)<=5&&Math.abs(s.thetaDeg)<=5?{ok:true}:fail("travel","X/Y and theta must stay within ±5 mm and ±5 degrees.")}
export function fit(s){return s.diameterMm===150&&finite(s.thicknessUm)&&s.thicknessUm>=100&&s.thicknessUm<=10000?{ok:true}:fail("sample","Selected tooling accepts a 150 mm circular wafer; modeled thickness 100–10000 µm.")}
export function maskCheck(s){const m=s.mask,w=s.waferMarks;if(!m||typeof m.id!=="string"||!m.id.trim()||!Number.isInteger(m.revision)||m.revision<0||!Array.isArray(m.clear)||m.clear.length<1||m.clear.length>64||!Array.isArray(m.fiducials)||m.fiducials.length!==2||!Array.isArray(w)||w.length!==2)return fail("mask","Mask needs ID, revision, 1–64 clear rectangles, two fiducials and two corresponding wafer marks.");
 const all=[...m.clear,...m.fiducials];if(all.some(f=>!f||typeof f.id!=="string"||!f.id||![f.x,f.y].every(finite))||new Set(all.map(f=>f.id)).size!==all.length)return fail("mask","Invalid or duplicate feature IDs or coordinates.");
 if(m.clear.some(f=>![f.w,f.h].every(finite)||f.w<=0||f.h<=0||Math.abs(f.x)+f.w/2>89||Math.abs(f.y)+f.h/2>89))return fail("mask","Clear rectangle exceeds 178 mm plate.");
 for(let i=0;i<m.clear.length;i++)for(let j=i+1;j<m.clear.length;j++){const a=m.clear[i],b=m.clear[j];if(Math.abs(a.x-b.x)<(a.w+b.w)/2-1e-12&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1e-12)return fail("mask","Clear rectangles must not overlap (split the artwork into disjoint regions).")}
 if(m.fiducials.some(f=>Math.hypot(f.x,f.y)>75)||w.some(f=>!f||![f.x,f.y].every(finite)||Math.hypot(f.x,f.y)>75)||w.some((f,i)=>f.id!==m.fiducials[i].id))return fail("marks","Corresponding, identically ordered mark IDs must lie within the 150 mm wafer.");
 if(Math.hypot(w[1].x-w[0].x,w[1].y-w[0].y)<1||Math.hypot(m.fiducials[1].x-m.fiducials[0].x,m.fiducials[1].y-m.fiducials[0].y)<1)return fail("marks","Two marks must be separated by at least 1 mm.");return {ok:true}
}
export function overlay(s){if(!maskCheck(s).ok||!pose(s).ok)return null;return s.waferMarks.map((f,i)=>{const target=s.mask.fiducials[i],actual=transform(f.x,f.y,s);return {id:f.id,nominalMaskMm:[target.x,target.y],couponMarkInMaskMm:actual,residualMm:[actual[0]-target.x,actual[1]-target.y]}})}
export function solveAlignment(s){const v=maskCheck(s);if(!v.ok)return v;const [a,b]=s.waferMarks,[c,d]=s.mask.fiducials;const wa=Math.atan2(b.y-a.y,b.x-a.x),ma=Math.atan2(d.y-c.y,d.x-c.x);let ang=ma-wa;ang=Math.atan2(Math.sin(ang),Math.cos(ang));const thetaDeg=ang*180/Math.PI;const x=(a.x+b.x)/2,y=(a.y+b.y)/2,ux=(c.x+d.x)/2,uy=(c.y+d.y)/2;const [rx,ry]=transform(x,y,{thetaDeg,xMm:0,yMm:0});const p={xMm:ux-rx,yMm:uy-ry,thetaDeg};const check=pose(p);if(!check.ok)return check;return {ok:true,pose:p,fiducials:overlay({...s,...p})}}
export function erf(x){if(x===0)return 0;const sign=x<0?-1:1,t=1/(1+.3275911*Math.abs(x));return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x))}
export function sigmaMm(mode,gapUm){return mode==="hard"?0:.0005*Math.sqrt(.365*gapUm)}
export function transmission(x,y,rects,sigma){let sum=0;for(const f of rects){const dx=x-f.x,dy=y-f.y;if(!sigma){if(Math.abs(dx)<f.w/2&&Math.abs(dy)<f.h/2)return 1;continue}if(Math.abs(dx)>f.w/2+8*sigma||Math.abs(dy)>f.h/2+8*sigma)continue;const k=Math.SQRT2*sigma;sum+=.25*(erf((dx+f.w/2)/k)-erf((dx-f.w/2)/k))*(erf((dy+f.h/2)/k)-erf((dy-f.h/2)/k))}return Math.max(0,Math.min(1,sum))}
export function clipAxis(poly,axis,bound,sign){
 const out=[];if(!poly.length)return out;let a=poly[poly.length-1],da=sign*(a[axis]-bound);
 for(const b of poly){const db=sign*(b[axis]-bound);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])])}if(db>=0)out.push(b);a=b;da=db}return out;
}
export function polygonArea(p){if(p.length<3)return 0;let area=0;const [x,y]=p[0];for(let i=1;i<p.length-1;i++)area+=(p[i][0]-x)*(p[i+1][1]-y)-(p[i][1]-y)*(p[i+1][0]-x);return Math.abs(area)/2;}
export function circlePolygonArea(p,R=75){
 if(p.length<3)return 0;if(p.every(v=>v[0]*v[0]+v[1]*v[1]<=R*R))return polygonArea(p);
 let area=0;
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],A=dx*dx+dy*dy;if(A<1e-28)continue;
  const B=2*(a[0]*dx+a[1]*dy),C=a[0]*a[0]+a[1]*a[1]-R*R,disc=B*B-4*A*C,ts=[0,1];
  if(disc>0){const d=Math.sqrt(disc);for(const t of [(-B-d)/(2*A),(-B+d)/(2*A)])if(t>0&&t<1)ts.push(t)}
  ts.sort((a,b)=>a-b);
  for(let k=0;k<ts.length-1;k++){
   const u=[a[0]+dx*ts[k],a[1]+dy*ts[k]],v=[a[0]+dx*ts[k+1],a[1]+dy*ts[k+1]],mid=[(u[0]+v[0])/2,(u[1]+v[1])/2],cross=u[0]*v[1]-u[1]*v[0],dot=u[0]*v[0]+u[1]*v[1];
   area+=(mid[0]*mid[0]+mid[1]*mid[1]<=R*R?cross:R*R*Math.atan2(cross,dot))/2;
  }
 }
 return Math.max(0,Math.min(polygonArea(p),Math.abs(area)));
}
export function pixelPolygon(x,y,dx,c,t){const h=dx/2;return [[-h,-h],[h,-h],[h,h],[-h,h]].map(([u,v])=>[x+c*u-t*v,y+t*u+c*v]);}
export function gaussianPrimitive(x,s){const z=x/s;if(z>9)return x;if(z< -9)return 0;return x*.5*(1+erf(z/Math.SQRT2))+s/Math.sqrt(2*Math.PI)*Math.exp(-z*z/2);}
export function gaussianInterval(a,b,l,r,s){return Math.max(0,Math.min(1,(gaussianPrimitive(b-l,s)-gaussianPrimitive(a-l,s)-gaussianPrimitive(b-r,s)+gaussianPrimitive(a-r,s))/(b-a)))}
export function cellAverage(x,y,dx,c,t,rects,sigma){
 const h=dx/2,extent=h*(Math.abs(c)+Math.abs(t)),distance=Math.hypot(x,y),radius=75;
 if(distance-dx/Math.SQRT2>=radius)return 0;
 const allInside=distance+dx/Math.SQRT2<=radius,pad=extent+8*sigma;
 const candidates=rects.filter(f=>Math.abs(x-f.x)<=f.w/2+pad&&Math.abs(y-f.y)<=f.h/2+pad);
 if(!candidates.length)return 0;
 if(!sigma){
  let sum=0;const square=pixelPolygon(x,y,dx,c,t);
  for(const f of candidates){
   if(allInside&&Math.abs(x-f.x)+extent<=f.w/2&&Math.abs(y-f.y)+extent<=f.h/2)return 1;
   let p=clipAxis(square,0,f.x-f.w/2,1);p=clipAxis(p,0,f.x+f.w/2,-1);p=clipAxis(p,1,f.y-f.h/2,1);p=clipAxis(p,1,f.y+f.h/2,-1);
   sum+=allInside?polygonArea(p):circlePolygonArea(p,radius);
  }
  return Math.max(0,Math.min(1,sum/(dx*dx)));
 }
 // For unrotated, fully illuminated cells integrate separable Gaussian rectangle analytically.
 if(allInside&&Math.abs(t)<1e-12){
  let sum=0;for(const f of candidates)sum+=gaussianInterval(x-h,x+h,f.x-f.w/2,f.x+f.w/2,sigma)*gaussianInterval(y-h,y+h,f.y-f.h/2,f.y+f.h/2,sigma);return Math.max(0,Math.min(1,sum));
 }
 // Rotated or aperture-edge cells: deterministic Gauss–Legendre quadrature. Not a convergence guarantee.
 const nodes=[-.8611363115940526,-.3399810435848563,.3399810435848563,.8611363115940526],weights=[.34785484513745385,.6521451548625461,.6521451548625461,.34785484513745385];
 let sum=0;for(let i=0;i<4;i++)for(let j=0;j<4;j++){const u=h*nodes[i],v=h*nodes[j],a=x+c*u-t*v,b=y+t*u+c*v;if(a*a+b*b<=radius*radius)sum+=weights[i]*weights[j]*transmission(a,b,candidates,sigma)/4}
 return Math.max(0,Math.min(1,sum));
}
export function exposure(s){for(const check of [fit(s),pose(s),maskCheck(s)])if(!check.ok)return check;
 if(s.loaded!==true||s.clamped!==true||s.engaged!==true)return fail("interlock","Load wafer, clamp mask and engage exposure mode before running.");
 if(typeof s.sampleId!=="string"||!s.sampleId.trim()||s.sampleId.length>100||!Number.isInteger(s.revision)||s.revision<0||s.revision>=999999)return fail("identity","Invalid sample ID or revision.");
 if(!["hard","proximity"].includes(s.mode)||s.mode==="proximity"&&(!finite(s.gapUm)||s.gapUm<1||s.gapUm>300))return fail("gap","Proximity gap must be 1–300 µm; ideal hard contact uses zero.");
 if(![s.intensity,s.seconds,s.roiX,s.roiY,s.focusMm].every(finite)||s.intensity<=0||s.intensity>100||s.seconds<=0||s.seconds>120||!limits.pitchesUm.includes(s.pitchUm)||Math.abs(s.focusMm)>20)return fail("settings","Intensity >0–100 mW/cm², duration >0–120 s, supported pitch, relative focus ±20 mm (software limits).");
 const size=limits.roiSizeMm;if(Math.hypot(Math.abs(s.roiX)+size/2,Math.abs(s.roiY)+size/2)>75)return fail("roi","The full 1.28 mm square calculation region must lie on the wafer.");
 const dx=s.pitchUm/1000,n=Math.round(size/dx),ox=s.roiX-size/2,oy=s.roiY-size/2,dose=s.intensity*s.seconds,sigma=sigmaMm(s.mode,s.gapUm);
 const angle=s.thetaDeg*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);const [cx,cy]=transform(s.roiX,s.roiY,s),extent=size/2*(Math.abs(cos)+Math.abs(sin))+8*sigma;const local=s.mask.clear.filter(f=>Math.abs(cx-f.x)<=f.w/2+extent&&Math.abs(cy-f.y)<=f.h/2+extent);const values=new Array(n*n);let max=0,integral=0;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=ox+(i+.5)*dx,y=oy+(j+.5)*dx,u=cos*x-sin*y+s.xMm,v=sin*x+cos*y+s.yMm;const z=Number((dose*cellAverage(u,v,dx,cos,sin,local,sigma)).toFixed(9));values[j*n+i]=z;max=Math.max(max,z);integral+=z*dx*dx;}
 const a=s.thetaDeg*Math.PI/180,c=Math.cos(a),t=Math.sin(a),[ix,iy]=inverse(0,0,s);
 return {ok:true,code:"ok",message:"Exposure calculated; incoming wafer revision unchanged.",sampleRevision:{schema:"bts.lithography.latent-dose.v1",equipmentId:"02-01",provenance:"Simulated; area-weighted ideal hard contact or Gaussian proximity surrogate; circular illumination aperture; not calibrated resist or measured tool performance.",sampleId:s.sampleId,parentRevision:s.revision,revision:s.revision+1,sample:{diameterMm:150,widthMm:150,heightMm:150,thicknessUm:s.thicknessUm},mask:JSON.parse(JSON.stringify(s.mask)),waferMarks:JSON.parse(JSON.stringify(s.waferMarks)),pose:{xMm:s.xMm,yMm:s.yMm,thetaDeg:s.thetaDeg},maskToCoupon:[[c,t,ix],[-t,c,iy],[0,0,1]],fiducials:overlay(s),exposure:{mode:s.mode,wavelengthNm:365,intensityMwCm2:s.intensity,seconds:s.seconds,gapUm:s.mode==="hard"?0:s.gapUm,sigmaUm:sigma*1000,peakDoseMjCm2:dose,illuminationDiameterMm:150},grid:{sampling:"cell-average",integration:s.mode==="hard"?"exact rectangle/pixel/circular-aperture overlap (floating-point)":"separable Gaussian integration or 4x4 quadrature",coverage:"local-roi",outsideRoi:"unknown",frame:"wafer-centered +x right +y away from operator; row 0 minimum y; local ROI, not whole wafer",originMm:[ox,oy],spacingMm:[dx,dx],nx:n,ny:n,unit:"mJ/cm2",order:"row-major",values},statistics:{maxDoseMjCm2:max,integratedDoseTimesAreaMjCm2Mm2:integral,equivalentClearAreaMm2:integral/dose}}}
}

export function stageGeometry(transportY,stageNominalY,seatY,maskHolderY,maskPlateY,maskPlateThickness,waferThickness,gapMm,engaged){
 const maskBottom=maskHolderY+maskPlateY-maskPlateThickness/2;
 const waferTopAtRest=transportY+stageNominalY+seatY+waferThickness;
 const lift=engaged?maskBottom-waferTopAtRest-gapMm:0;
 return {lift,waferTop:waferTopAtRest+lift,maskBottom,gapMm:maskBottom-(waferTopAtRest+lift)};
}
