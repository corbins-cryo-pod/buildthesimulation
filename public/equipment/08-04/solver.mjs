export const defaultPose=Object.freeze({xUm:120,yUm:-55,deg:2,defect:true});
const f=(id,xUm,yUm)=>Object.freeze({id,xUm,yUm});
export const sample=Object.freeze({dieId:'BTS-08-04-SYN-DIE',carrierId:'BTS-08-04-SYN-CARRIER',designRevision:'registration-coupon-r1'});
export const pads=Object.freeze([f('A',-420,-260),f('B',-190,170),f('C',80,-230),f('D',240,305),f('E',430,40)]);
export const fiducials=Object.freeze([f('F1',-605,-355),f('F2',518,-195),f('F3',47,525)]);
export const bumpRadiusUm=35,padRadiusUm=55,minOverlap=.5;
const rad=d=>d*Math.PI/180, deg=a=>a*180/Math.PI;
export function map(p,t){
 const a=rad(t.deg),c=Math.cos(a),s=Math.sin(a);
 return {...p,xUm:c*p.xUm-s*p.yUm+t.xUm,yUm:s*p.xUm+c*p.yUm+t.yUm};
}
export function inverse(t){return map({xUm:-t.xUm,yUm:-t.yUm,deg:-t.deg},{xUm:0,yUm:0,deg:-t.deg})}
export function fit(from,to){
 if(!Array.isArray(from)||!Array.isArray(to)||from.length!==to.length||from.length<2||from.length>30||new Set(from.map(p=>p?.id)).size!==from.length||from.some((p,i)=>!p||!to[i]||p.id!==to[i].id||![p.xUm,p.yUm,to[i].xUm,to[i].yUm].every(Number.isFinite)))throw Error('At least two finite, uniquely labeled fiducial pairs are required.');
 const centroid=a=>['xUm','yUm'].map(k=>a.reduce((s,p)=>s+p[k],0)/a.length),[ax,ay]=centroid(from),[bx,by]=centroid(to);
 let c=0,s=0;
 for(let i=0;i<from.length;i++){const x=from[i].xUm-ax,y=from[i].yUm-ay,X=to[i].xUm-bx,Y=to[i].yUm-by;c+=x*X+y*Y;s+=x*Y-y*X}
 if(Math.hypot(c,s)<1e-8)throw Error('Fiducials do not constrain rotation. Use distinct markers.');
 const a=Math.atan2(s,c),co=Math.cos(a),si=Math.sin(a),t={xUm:bx-co*ax+si*ay,yUm:by-si*ax-co*ay,deg:deg(a)};
 return {...t,rmsUm:Math.sqrt(from.reduce((z,p,i)=>{const q=map(p,t);return z+(q.xUm-to[i].xUm)**2+(q.yUm-to[i].yUm)**2},0)/from.length)};
}
export function circleOverlap(a,b,d){
 if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(d)||a<=0||b<=0||d<0)throw Error('Invalid circle geometry.');
 if(d>=a+b)return 0;
 if(d<=Math.abs(a-b))return Math.min(a,b)**2/a**2;
 const clip=x=>Math.min(1,Math.max(-1,x)), a2=a*a,b2=b*b,d2=d*d;
 const area=a2*Math.acos(clip((d2+a2-b2)/(2*d*a)))+b2*Math.acos(clip((d2+b2-a2)/(2*d*b)))-.5*Math.sqrt(Math.max(0,(-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));
 return Math.max(0,Math.min(1,area/(Math.PI*a2)));
}
export function validatePose(p){
 if(!p||![p.xUm,p.yUm,p.deg].every(Number.isFinite)||Math.abs(p.xUm)>250||Math.abs(p.yUm)>250||Math.abs(p.deg)>5||typeof p.defect!=='boolean')throw Error('Enter ±250 µm XY and ±5° for the synthetic field.');
 return {...p};
}
export function observation(pose,align=false){
 const p=validatePose(pose),forward={xUm:p.xUm,yUm:p.yUm,deg:p.deg},seen=fiducials.map(k=>map(k,forward));
 const measured=fit(fiducials,seen),correction=align?fit(seen,fiducials):null;
 const observed=pads.map(k=>map(k.id==='E'&&p.defect?{...k,xUm:k.xUm+120}:k,forward));
 const centers=correction?observed.map(k=>map(k,correction)):observed;
 const connections=centers.map((b,i)=>{
  const influences=pads.map(pad=>{const distanceUm=Math.hypot(b.xUm-pad.xUm,b.yUm-pad.yUm);return {padId:pad.id,distanceUm,overlap:circleOverlap(bumpRadiusUm,padRadiusUm,distanceUm)}});
  const intended=influences[i],other=influences.filter(c=>c.padId!==intended.padId&&c.overlap>1e-12);
  return {bumpId:b.id,padId:pads[i].id,bumpCenterUm:[b.xUm,b.yUm],padCenterUm:[pads[i].xUm,pads[i].yUm],distanceUm:intended.distanceUm,overlapFraction:intended.overlap,otherPadIds:other.map(c=>c.padId),status:other.length?'unintended-overlap':intended.overlap>=minOverlap?'geometric-pass':intended.overlap===0?'no-overlap':'partial'};
 });
 return {measured,correction,fiducials:correction?seen.map(k=>map(k,correction)):seen,centers,connections};
}
export function initial(){return {pose:{...defaultPose},aligned:false,opticsParked:false,armDown:false,revision:0,placement:null};}
export function action(s,{type,payload}){
 switch(type){
  case 'configure': return {...s,pose:validatePose(payload),aligned:false,armDown:false,placement:null};
  case 'align': if(s.opticsParked||s.armDown)throw Error('Return the optics to the overlay position with the arm raised.');return {...s,aligned:true,placement:null};
  case 'optics': if(s.armDown)throw Error('Raise the pick arm before moving the optics.');return {...s,opticsParked:!s.opticsParked};
  case 'arm': if(!s.opticsParked&&!s.armDown)throw Error('Park the optics before swinging down the arm.');return {...s,armDown:!s.armDown};
  case 'record': {
   if(!s.aligned||!s.armDown)throw Error('Align the fiducials, park the optics, and lower the arm before recording.');
   const m=observation(s.pose,true), revision=s.revision+1;
   return {...s,revision,placement:{schema:'bts.flip-chip.placement.v1',deviceId:'08-04',origin:'synthetic-geometry',sample,revision,parentRevision:revision===1?null:revision-1,coordinateFrame:'carrier, face-down die already mirrored to the carrier view, +x right/+y away from operator; micrometers and CCW degrees',input:{...s.pose,bumpRadiusUm,padRadiusUm,minOverlap},measuredPose:m.measured,appliedCorrection:m.correction,connections:m.connections,bondState:'placement-check-only; no physical attachment or electrical continuity predicted'}};
  }
  case 'reset': return initial();
  default:throw Error('Unknown placement action.');
 }
}
export function csv(p){return ['die_id,carrier_id,design_revision,placement_revision,bump_id,pad_id,bump_x_um,bump_y_um,pad_x_um,pad_y_um,offset_um,overlap_fraction,status',...p.connections.map(r=>[p.sample.dieId,p.sample.carrierId,p.sample.designRevision,p.revision,r.bumpId,r.padId,...r.bumpCenterUm,...r.padCenterUm,r.distanceUm,r.overlapFraction,r.status].join(','))].join('\n')+'\n'}
