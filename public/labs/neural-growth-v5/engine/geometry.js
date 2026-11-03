/** Geometry for the Cell Growth Lab. All positions and radii are in µm. */
export const add = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const scale = (a,s) => [a[0]*s,a[1]*s,a[2]*s];
export const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length = a => Math.hypot(a[0],a[1],a[2]);
export const distance = (a,b) => length(sub(a,b));
export const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
export const unit = a => { const n=length(a); return n>1e-12?scale(a,1/n):[1,0,0]; };
export const lerp = (a,b,t) => add(a,scale(sub(b,a),t));

export function closestSegmentPoints(a,b,c,d) {
  const u=sub(b,a),v=sub(d,c),w=sub(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);
  let s=0,t=0;
  if(aa<1e-24&&cc<1e-24) return {s,t,p:[...a],q:[...c],distance:distance(a,c)};
  if(aa<1e-24) t=clamp(ee/cc,0,1);
  else if(cc<1e-24) s=clamp(-dd/aa,0,1);
  else {
    const den=aa*cc-bb*bb;
    s=den>1e-20?clamp((bb*ee-cc*dd)/den,0,1):0;
    t=(bb*s+ee)/cc;
    if(t<0) {t=0;s=clamp(-dd/aa,0,1);}
    else if(t>1) {t=1;s=clamp((bb-dd)/aa,0,1);}
  }
  const p=lerp(a,b,s),q=lerp(c,d,t);
  return {s,t,p,q,distance:distance(p,q)};
}

export function pointSegmentDistance(p,a,b) {
  const d=sub(b,a),n=dot(d,d),t=n>1e-24?clamp(dot(sub(p,a),d)/n,0,1):0;
  const q=lerp(a,b,t);
  return {distance:distance(p,q),point:q,t};
}

export function segmentSphereHit(a,b,center,radius) {
  const v=sub(b,a),w=sub(a,center),c=dot(w,w)-radius*radius;
  if(c<=0) return {t:0,point:[...a],normal:unit(w)};
  const aa=dot(v,v); if(aa<1e-24) return null;
  const bb=dot(w,v),disc=bb*bb-aa*c;
  if(disc<0) return null;
  const t=(-bb-Math.sqrt(disc))/aa;
  if(t<0||t>1) return null;
  const point=lerp(a,b,t);
  return {t,point,normal:unit(sub(point,center))};
}

/** First entry into a box expanded by clearance (conservative at corners). */
export function segmentBoxHit(a,b,center,size,clearance=0) {
  const min=center.map((v,i)=>v-size[i]/2-clearance),max=center.map((v,i)=>v+size[i]/2+clearance),d=sub(b,a);
  let enter=0,exit=1,normal=[0,0,0];
  const inside=a.every((v,i)=>v>=min[i]&&v<=max[i]);
  if(inside) {
    let best=Infinity,axis=0,sign=1;
    for(let i=0;i<3;i++) for(const s of [-1,1]) {
      const gap=s<0?a[i]-min[i]:max[i]-a[i];
      if(gap<best){best=gap;axis=i;sign=s;}
    }
    normal[axis]=sign;return {t:0,point:[...a],normal};
  }
  for(let i=0;i<3;i++) {
    if(Math.abs(d[i])<1e-14) {if(a[i]<min[i]||a[i]>max[i]) return null;continue;}
    let t1=(min[i]-a[i])/d[i],t2=(max[i]-a[i])/d[i],sign=-1;
    if(t1>t2){[t1,t2]=[t2,t1];sign=1;}
    if(t1>enter){enter=t1;normal=[0,0,0];normal[i]=sign;}
    exit=Math.min(exit,t2);if(enter>exit)return null;
  }
  return enter>=0&&enter<=1?{t:enter,point:lerp(a,b,enter),normal}:null;
}

/** Exact swept point against a finite capsule (cylinder plus both caps). */
export function segmentCapsuleHit(a,b,c,d,radius) {
  const near=pointSegmentDistance(a,c,d);
  if(near.distance<=radius) return {t:0,point:[...a],normal:unit(sub(a,near.point))};
  const axis=sub(d,c),axisLength=length(axis),u=axisLength>1e-12?scale(axis,1/axisLength):[1,0,0];
  let hit=segmentSphereHit(a,b,c,radius),other=segmentSphereHit(a,b,d,radius);
  if(other&&(!hit||other.t<hit.t))hit=other;
  if(axisLength>1e-12) {
    const v=sub(b,a),w=sub(a,c),vp=sub(v,scale(u,dot(v,u))),wp=sub(w,scale(u,dot(w,u)));
    const qa=dot(vp,vp),qb=dot(vp,wp),qc=dot(wp,wp)-radius*radius,disc=qb*qb-qa*qc;
    if(qa>1e-24&&disc>=0) {
      const t=(-qb-Math.sqrt(disc))/qa,point=lerp(a,b,t),along=dot(sub(point,c),u);
      if(t>=0&&t<=1&&along>=0&&along<=axisLength&&(!hit||t<hit.t)) {
        hit={t,point,normal:unit(sub(point,add(c,scale(u,along))))};
      }
    }
  }
  return hit;
}

/** Broad phase indexes complete capsule AABBs, including long segments. */
export class SpatialHash {
  constructor(cellSize=16){this.cellSize=cellSize;this.buckets=new Map();}
  keys(a,b,r=0){
    const lo=a.map((v,i)=>Math.floor((Math.min(v,b[i])-r)/this.cellSize)),hi=a.map((v,i)=>Math.floor((Math.max(v,b[i])+r)/this.cellSize)),keys=[];
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)keys.push(`${x},${y},${z}`);
    return keys;
  }
  insert(id,a,b,r=0){for(const key of this.keys(a,b,r)){let bucket=this.buckets.get(key);if(!bucket)this.buckets.set(key,bucket=new Set());bucket.add(id);}}
  query(a,b,r=0){const ids=new Set();for(const key of this.keys(a,b,r))for(const id of this.buckets.get(key)||[])ids.add(id);return [...ids];}
}
