// Calibrated horizontal scale with transparent, ideal stereographic geometry.
export const W=480,H=320,PITCH_MM=1,HALF_ANGLE_DEG=6,FIDUCIAL=Object.freeze({xMm:2,yMm:-1.5,zMm:2});
export const zooms=Object.freeze([.8,1.6,3.2,6.4,10]);
export const initial=()=>({zoom:.8,pose:null,result:null,error:'',revision:0});
const slope=Math.tan(HALF_ANGLE_DEG*Math.PI/180);
function scale(z){if(!zooms.includes(z))throw Error('Choose an offered zoom setting.');return W/(23.2/z);}
export function project(z,side,p){
 if(side!=='L'&&side!=='R')throw Error('Unknown stereo view.');
 const k=scale(z),sgn=side==='L'?1:-1;
 return {xPx:W/2+k*(p.xMm+sgn*p.zMm*slope),yPx:H/2-k*p.yMm};
}
export function unproject(z,point){
 const k=scale(z);if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||point[0]<0||point[0]>W||point[1]<0||point[1]>H)throw Error('Pick a point within the image.');
 return {xMm:(point[0]-W/2)/k,yMm:(H/2-point[1])/k,zMm:0};
}
export function inspect(z,pointer=null,rev=0){
 const k=scale(z),l=project(z,'L',FIDUCIAL),r=project(z,'R',FIDUCIAL);
 const q0={xMm:0,yMm:0,zMm:0},q1={...q0,xMm:1},a=project(z,'L',q0),b=project(z,'L',q1);
 return {schema:'bts.inert-stereo-grid.v1',deviceId:'12-01',kind:'simulated geometry',sampleId:'manufactured-grid-01',revision:rev+1,parentRevision:rev,zoomFactor:z,eyepieceFactor:10,visualMagnification:10*z,
  frame:{widthPx:W,heightPx:H,horizontalFieldMm:23.2/z,pixelsPerMm:k,axes:'X right, Y away/up in image; Z physical height'},
  calibration:{gridPitchMm:PITCH_MM,gridSpacingPx:b.xPx-a.xPx,scaleBarMm:1,scaleBarPx:k,halfAngleDeg:HALF_ANGLE_DEG,assumedStereoGeometry:true},
  fiducial:{sampleMm:FIDUCIAL,left:l,right:r,raisedDisparityPx:l.xPx-r.xPx,floorDisparityPx:a.xPx-project(z,'R',q0).xPx},
  pointerSampleMm:pointer,source:'Published 29 mm nominal horizontal field at 0.8×, inverse zoom scale; simplified symmetric projections. Not a calibrated optical transfer or measured depth.'};
}
export function act(s,id,p){
 if(id==='reset')return initial();
 if(id==='cycle')return act(s,'zoom',zooms[(zooms.indexOf(s.zoom)+1)%zooms.length]);
 if(id==='zoom')return act({...s,zoom:p,pose:null},'view');
 if(id==='center')return act(s,'pointer',[W/2,H/2]);
 if(id==='pointer'){try{return act({...s,pose:unproject(s.zoom,p)},'view');}catch(e){return {...s,error:e.message}}}
 if(id==='view'){try{const result=inspect(s.zoom,s.pose,s.revision);return {...s,result,revision:result.revision,error:''};}catch(e){return {...s,result:null,error:e.message}}}
 throw Error('Unknown stereo view action');
}
