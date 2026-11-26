// Original, passive wettability teaching model. Coordinate convention: pixels x right, y down;
// baseline angle clockwise in image coordinates. Physical angle measured through liquid.
export const defaults=Object.freeze({sampleId:'WET-COUPON-01',contactId:'ZONE-A',parentRevision:0,volumeUl:5,thetaDeg:90,imageRollDeg:0,umPerPx:15,noise:0,baselineShiftPx:0,threshold:120,focusMm:0});
export const bounds={volumeUl:[1,10],thetaDeg:[40,140],imageRollDeg:[-12,12],umPerPx:[5,40],noise:[0,22],baselineShiftPx:[-12,12],threshold:[50,190],focusMm:[-20,25]};
export const frame={width:424,height:284,baselineY:210.5};
const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,ok=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
const err=(code,message)=>({ok:false,code,message});
export function cap(thetaDeg,volumeUl){
 const theta=rad(thetaDeg),c=Math.cos(theta),k=1-c,r=Math.cbrt(3*volumeUl/(Math.PI*k*k*(2+c)));
 return {radiusMm:r,centerVMm:-r*c,heightMm:r*k,diameterMm:2*r*Math.sin(theta),thetaDeg,volumeUl};
}
export function baseTransform(w,baseline){
 const a=rad(baseline.angleDeg),c=Math.cos(a),s=Math.sin(a),x0=(w-1)/2,y0=baseline.yAtCenterPx;
 return {local:(x,y)=>[(x-x0)*c+(y-y0)*s,(x-x0)*s-(y-y0)*c],pixel:(u,v)=>[x0+u*c+v*s,y0+u*s-v*c]};
}
export function synthetic(config={}){
 const p={...defaults,...config};
 for(const k of ['volumeUl','thetaDeg','imageRollDeg','umPerPx','noise'])if(!ok(p[k],...bounds[k]))return err('setting',k+' is outside the virtual range.');
 const {width:w,height:h,baselineY}=frame,baseline={angleDeg:p.imageRollDeg,yAtCenterPx:baselineY},t=baseTransform(w,baseline);
 const z=cap(p.thetaDeg,p.volumeUl),scale=1000/p.umPerPx,R=z.radiusMm*scale,v0=z.centerVMm*scale;
 const pixels=new Uint8Array(w*h);let seed=0x6c73fa35;
 function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 for(let y=0,k=0;y<h;y++)for(let x=0;x<w;x++,k++){
  const [u,v]=t.local(x,y);let covered=0;
  // 4×4 area sampling (pixel centers at integer coordinates).
  if(v<-.73||Math.hypot(u,v-v0)<R-.73&&v>.73)covered=16;
  else if(v<.73||Math.abs(Math.hypot(u,v-v0)-R)<.73){
   for(let j=0;j<4;j++)for(let i=0;i<4;i++){
    const [a,b]=t.local(x+(2*i-3)/8,y+(2*j-3)/8);
    if(b<0||a*a+(b-v0)**2<=R*R)covered++;
   }
  }
  pixels[k]=Math.round(225-195*covered/16+(random()+random()-1)*p.noise);
 }
 return {ok:true,image:{width:w,height:h,pixels,baseline,provenance:{origin:'simulated',kind:'grayscale orthographic ray mask',cap:z,umPerPx:p.umPerPx,noiseAmplitudeDn:p.noise,noiseSeed:'0x6c73fa35'}}};
}
function fitCircle(ps){
 let m=0,n=0;for(const [x,y] of ps){m+=x;n+=y}m/=ps.length;n/=ps.length;
 let XX=0,YY=0,XY=0,B=0,C=0,R=0;
 for(const [a,b] of ps){const x=a-m,y=b-n,r=x*x+y*y;XX+=x*x;YY+=y*y;XY+=x*y;B+=x*r/2;C+=y*r/2;R+=r;}
 const det=XX*YY-XY*XY;if(!(det>1e-10))return null;
 let u=(YY*B-XY*C)/det,v=(XX*C-XY*B)/det;
 const r=Math.sqrt(R/ps.length+u*u+v*v);u+=m;v+=n;
 return {u,v,r,rms:Math.sqrt(ps.reduce((a,[x,y])=>a+(Math.hypot(x-u,y-v)-r)**2,0)/ps.length)};
}
export function measure(image,params={}){
 const p={...defaults,...params},w=image?.width,h=image?.height,I=image?.pixels;
 const b=params.baseline??image?.baseline;
 const identifier=x=>typeof x==='string'&&/^[a-z0-9._-]{1,80}$/i.test(x);
 if(!identifier(p.sampleId)||!identifier(p.contactId)||!Number.isSafeInteger(p.parentRevision)||p.parentRevision<0||p.parentRevision>99999999)return err('identity','Use letters, digits, period, dash or underscore in sample/contact IDs and a valid parent revision.');
 if(!Number.isInteger(w)||!Number.isInteger(h)||!ok(w,64,1920)||!ok(h,64,1200)||!I||I.length!==w*h)return err('image','Expected a nonblank 64–1,920 by 64–1,200 pixel grayscale frame.');
 if(!b||!ok(b.yAtCenterPx,h*.18,h*.94)||!ok(b.angleDeg,-20,20)||!ok(p.umPerPx,...bounds.umPerPx)||!ok(p.threshold,...bounds.threshold))return err('setting','Supply a visible baseline and valid angle, pixel size and threshold.');
 const t=baseTransform(w,b);let touched=false;
 // Sampling the full above-baseline border catches cut-off overhangs and apex.
 for(let y=0;y<h;y++)for(const x of [0,w-1])if(I[y*w+x]<p.threshold&&t.local(x,y)[1]>2.2)touched=true;
 for(let x=0;x<w;x++)if(I[x]<p.threshold&&t.local(x,0)[1]>2.2)touched=true;
 if(touched)return err('clipped','The droplet silhouette touches an image edge. Reduce magnification, center the view, or use an unclipped image.');
 const ps=[];
 function cross(x,y,dx,dy,G,next){
  if((G<p.threshold)===(next<p.threshold))return;
  const a=(p.threshold-G)/(next-G),q=t.local(x+dx*a,y+dy*a);
  if(q[1]>2.2)ps.push(q);
 }
 // Find subpixel threshold crossings in both axes, including side overhangs.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=y*w+x,G=I[k];if(x+1<w)cross(x,y,1,0,G,I[k+1]);if(y+1<h)cross(x,y,0,1,G,I[k+w]);
 }
 if(ps.length<45)return err('contour','Insufficient isolated drop edge above baseline. Check illumination, threshold, baseline, and drop size.');
 const q=fitCircle(ps);if(!q||q.r<8||!(q.r>Math.abs(q.v)))return err('baseline','The fitted circle must cross the marked baseline twice.');
 const theta=v=>deg(Math.acos(Math.max(-1,Math.min(1,-v/q.r)))),angle=theta(q.v),i=Math.sqrt(q.r*q.r-q.v*q.v),uL=q.u-i,uR=q.u+i;
 if(angle<20||angle>160||!ok(q.rms,0,Math.max(1,q.r*.017)))return err('shape','The selected edge is not consistent with the supported single circular-cap fit.');
 const nearGround=ps.filter(([,v])=>v<Math.max(6,q.r*.085));
 if(!nearGround.some(([u])=>u<q.u)||!nearGround.some(([u])=>u>q.u))return err('baseline','Both sides of the fitted droplet must approach the marked baseline.');
 const L=t.pixel(uL,0),R=t.pixel(uR,0),rmsDeg=deg(q.rms/q.r),baselineDeg=Math.max(Math.abs(angle-theta(q.v-1)),Math.abs(angle-theta(q.v+1))),spread=baselineDeg+rmsDeg;
 return {ok:true,result:{
  schema:'bts.sessile-drop-fit.v1',instrumentId:'05-08',model:'KRÜSS DSA100B Basic with CF04 and manual 500 µL glass syringe',sampleId:p.sampleId,contactId:p.contactId,parentRevision:p.parentRevision,revision:p.parentRevision+1,
  provenance:{image:image.provenance??{origin:'user-supplied; not authenticated'},method:'BTS grayscale threshold crossing + centered algebraic least-squares circle; shared symmetric arc',derivedGeometryOnly:true},
  calibration:{widthPx:w,heightPx:h,pixelSizeUm:p.umPerPx,baseline:b,thresholdDn:p.threshold},angles:{leftDeg:angle,rightDeg:angle},
  fit:{centerLocalPx:[q.u,q.v],radiusPx:q.r,radialRmsPx:q.rms,edgeSamples:ps.length,leftContactPx:L,rightContactPx:R},
  geometry:{baseDiameterMm:2*i*p.umPerPx/1000,heightMm:(q.r+q.v)*p.umPerPx/1000,radiusMm:q.r*p.umPerPx/1000},
  uncertainty:{angleSpreadDeg:spread,baselineOnePixelDeg:baselineDeg,radialResidualProxyDeg:rmsDeg,interpretation:'Conservative sensitivity to ±1 px uniform baseline fit offset plus angular residual proxy. Not statistical confidence, accuracy or bias calibration; image roll error is not included.'}
 },edge:ps.map(([u,v])=>t.pixel(u,v))};
}
