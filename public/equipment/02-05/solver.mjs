// 02-05: normalized effective-dose model. All pattern coordinates are micrometers.
export const version = 'ebpg-dose-1.0.0';
export const defaults = {dose:650,current:1,pitch:5,alpha:7,beta:31.2,eta:0.74,threshold:400};
export const frame = {n:256, stepUm:0.005, originUm:[-0.64,-0.64], rowOrder:'y increasing', coordinates:'chip centered; +x right, +y up'};
export const example = {schema:'bts.ebpg.pattern.v1',sampleId:'EBPG-COUPON-001',revision:'r0',substrate:'Si',resistThicknessNm:500,chipMm:10,rectangles:[
...Array.from({length:7},(_,i)=>({id:'line-'+(i+1),x:-0.29+i*0.085,y:-0.29,w:0.035,h:0.58,factor:1})),
{id:'isolated-line',x:0.36,y:-0.29,w:0.035,h:0.58,factor:1},
{id:'contact-A',x:-0.48,y:-0.48,w:0.18,h:0.12,factor:1},
{id:'contact-B',x:0.28,y:0.36,w:0.18,h:0.12,factor:1},
{id:'density-context',x:1,y:-45,w:65,h:90,factor:1}
]};
export function erf(x) {
 if(x===0)return 0;
 const s=Math.sign(x),a=Math.abs(x),t=1/(1+0.3275911*a);
 return s*(1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t)*Math.exp(-a*a));
}
export function interval(x,lo,hi,width) { return Math.max(0,0.5*(erf((hi-x)/width)-erf((lo-x)/width))); }
export function validate(p,c) {
 if(!p || p.schema!=='bts.ebpg.pattern.v1'||typeof p.sampleId!=='string'||!p.sampleId.trim()||typeof p.revision!=='string'||!p.revision.trim()) throw Error('Pattern schema, sample ID and parent revision required.');
 if(p.substrate!=='Si'||p.resistThicknessNm!==500||p.chipMm!==10) throw Error('This model accepts a 10 mm Si chip with a 500 nm resist proxy only.');
 const limits={dose:[10,3000],current:[0.1,350],pitch:[1,20],alpha:[3,50],beta:[10,60],eta:[0,2],threshold:[10,3000]};
 for(const [k,[lo,hi]] of Object.entries(limits)) if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi) throw Error(k+' must be '+lo+'–'+hi+'.');
 if(!Array.isArray(p.rectangles)||!p.rectangles.length||p.rectangles.length>128) throw Error('Supply 1–128 axis-aligned rectangles.');
 const ids=new Set();
 for(const q of p.rectangles){
  if(typeof q.id!=='string'||!q.id.trim()||ids.has(q.id))throw Error('Shape IDs must be unique.');ids.add(q.id);
  if(![q.x,q.y,q.w,q.h,q.factor].every(Number.isFinite)||q.w<0.005||q.h<0.005||q.factor<0.05||q.factor>5||q.x< -500||q.y< -500||q.x+q.w>500||q.y+q.h>500) throw Error('Rectangle must lie inside a centered 1 mm field; minimum dimension 5 nm and dose factor 0.05–5.');
  if(q.w<c.pitch/1000||q.h<c.pitch/1000) throw Error('Shot pitch exceeds a rectangle dimension.');
 }
 const timing=estimate(p,c);
 if(timing.minDwellNs<8-1e-8) throw Error('Requested average dwell below 8 ns (125 MHz ceiling); reduce current, increase dose or increase pitch.');
 return timing;
}
export function estimate(p,c){
 let area=0,chargeC=0,shots=0,minDwellNs=Infinity;
 for(const q of p.rectangles){
  const a=q.w*q.h, Q=c.dose*q.factor*a*1e-14, n=Math.ceil(q.w*1000/c.pitch-1e-10)*Math.ceil(q.h*1000/c.pitch-1e-10);
  area+=a;chargeC+=Q;shots+=n;minDwellNs=Math.min(minDwellNs,Q/(c.current*1e-9)/n*1e9);
 }
 return {areaUm2:area,chargeC,shots,minDwellNs,beamOnS:chargeC/(c.current*1e-9)};
}
export function doseAt(p,c,x,y) {
 let d=0;
 for(const q of p.rectangles){
 const A=c.alpha/1000,B=c.beta;
 const f=interval(x,q.x,q.x+q.w,A)*interval(y,q.y,q.y+q.h,A);
 const g=interval(x,q.x,q.x+q.w,B)*interval(y,q.y,q.y+q.h,B);
 d+=c.dose*q.factor*(f+c.eta*g)/(1+c.eta);
 }
 return d;
}
export function solve(p,c) {
 const timing=validate(p,c),{n,stepUm:dx,originUm:[ox,oy]}=frame;
 const map=new Float64Array(n*n),mask=new Uint8Array(n*n);
 for(const q of p.rectangles){
  const ax=[],ay=[],bx=[],by=[];
  for(let i=0;i<n;i++){
   const x=ox+(i+0.5)*dx,y=oy+(i+0.5)*dx;
   ax.push(interval(x,q.x,q.x+q.w,c.alpha/1000));ay.push(interval(y,q.y,q.y+q.h,c.alpha/1000));
   bx.push(interval(x,q.x,q.x+q.w,c.beta));by.push(interval(y,q.y,q.y+q.h,c.beta));
  }
  const scale=c.dose*q.factor/(1+c.eta);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)map[j*n+i]+=scale*(ax[i]*ay[j]+c.eta*bx[i]*by[j]);
 }
 let peak=0,cleared=0;const contour=[];
 for(let k=0;k<map.length;k++){peak=Math.max(peak,map[k]);mask[k]=+(map[k]>=c.threshold);cleared+=mask[k];}
 // Boundary segments in chip coordinates, thresholded at pixel centers (not interpolated).
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)if(mask[j*n+i]){
  const x=ox+i*dx,y=oy+j*dx;
  if(i===0||!mask[j*n+i-1])contour.push([x,y,x,y+dx]);
  if(i===n-1||!mask[j*n+i+1])contour.push([x+dx,y,x+dx,y+dx]);
  if(j===0||!mask[(j-1)*n+i])contour.push([x,y,x+dx,y]);
  if(j===n-1||!mask[(j+1)*n+i])contour.push([x,y+dx,x+dx,y+dx]);
 }
 return {map,mask,contour,timing,peak,clearedUm2:cleared*dx*dx};
}
export function pointAcceptance(c=defaults) {
 // Independently integrate cell masses on two padded grids (one per Gaussian).
 // Centers ±2 widths; common domain ±8 widths; 16 cells per width; 256² each.
 let combined=0,isolated=0,maxResidual=0;
 for(const [width,weight] of [[c.alpha/1000,1/(1+c.eta)],[c.beta,c.eta/(1+c.eta)]]){
  const step=width/16, n=256, left=-8*width;
  const rowA=[],rowB=[],rowY=[];
  for(let i=0;i<n;i++){const lo=left+i*step,hi=lo+step;rowA.push(interval(-2*width,lo,hi,width));rowB.push(interval(2*width,lo,hi,width));rowY.push(interval(0,lo,hi,width));}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const a=weight*rowA[i]*rowY[j],b=weight*rowB[i]*rowY[j];
   const both=weight*(rowA[i]+rowB[i])*rowY[j];
   combined+=both;isolated+=a+b;maxResidual=Math.max(maxResidual,Math.abs(both-a-b));
  }
 }
 return {combined,isolated,maxResidual,conservationError:Math.abs(combined-2),pass:Math.abs(combined-2)<1e-6&&Math.abs(combined-isolated)<1e-10&&maxResidual<1e-12};
}
export function exportResult(p,c,out,runId,events=[]) {
 return {schema:'bts.ebpg.exposure.v1',equipmentId:'02-05',model:'Raith EBPG 5200+ (UPenn 10-position cassette)',solverVersion:version,origin:'simulated',runId,sample:{id:p.sampleId,parentRevision:p.revision,revision:p.revision+'-ebpg-'+runId,substrate:p.substrate,chipMm:p.chipMm,resistThicknessNm:p.resistThicknessNm,state:'exposed, undeveloped'},history:events,pattern:p,parameters:{...c,energyKeV:100},frame:{...frame,doseUnit:'uC/cm^2 equivalent',contourUnit:'um',maskMeaning:'1 = predicted clearing after ideal positive development'},dose:Array.from(out.map),thresholdMask:Array.from(out.mask),contourSegments:out.contour,timing:out.timing,peak:out.peak,clearedUm2:out.clearedUm2,provenance:{kernel:'normalized double Gaussian; 500 nm resist/Si proxy, Georgia Tech proximity.pdf Table I; threshold assumed',notMeasured:true}};
}
export const transitions={idle:{vent:'vented'},vented:{open:'open'},open:{mount:'mounted'},mounted:{align:'aligned'},aligned:{seal:'sealed'},sealed:{pump:'vacuum'},vacuum:{transfer:'ready'},ready:{write:'writing'},writing:{finish:'complete'},complete:{return:'returned'},returned:{vent:'unload-vented'},'unload-vented':{unload:'unloaded'},unloaded:{}};
export function advance(state,action){const next=transitions[state]?.[action];if(!next)throw Error('Interlock: '+action+' unavailable in '+state+'.');return next;}
