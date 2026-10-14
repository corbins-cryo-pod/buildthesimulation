/* Non-primitive membrane meshing. All distances use the active specimen's units.
 * Triangle surfaces are visualization meshes, not numerically validated membranes.
 */
const T=window.ATLAS_ENGINE;
const V=(x=0,y=0,z=0)=>Array.isArray(x)?new T.Vector3(...x):new T.Vector3(x,y,z);
const PALETTE={sensory:0x47d9e8,motor:0xf2a56a,other:0xbb8ce5,glia:0x728eaa,myelin:0xc7b786,skin:0x8ab9cf};
const seedRandom=seed=>{let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;}};
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const plus=(a,b)=>a.map((x,i)=>x+b[i]);
function decodeArray(b64,Type){const b=atob(b64),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Type(u.buffer);}
function decodeGeometry(data){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(decodeArray(data.p,Float32Array),3));g.setIndex(new T.BufferAttribute(decodeArray(data.i,Uint32Array),1));g.computeVertexNormals();g.computeBoundingSphere();return g;}
function cellColor(id){return new T.Color().setHSL(((id*0.61803398875)%1+1)%1,.66,.60);}
function surfaceMaterial(color,opacity=1){return new T.MeshStandardMaterial({color,roughness:.49,metalness:.08,emissive:color,emissiveIntensity:.12,transparent:opacity<1,opacity,depthWrite:opacity>=.98,side:T.DoubleSide});}

class Membrane {
 constructor(){this.p=[];this.n=[];this.f=[];}
 vert(p,n){this.p.push(p.x,p.y,p.z);this.n.push(n.x,n.y,n.z);return this.p.length/3-1;}
 tri(a,b,c){this.f.push(a,b,c);}
 append(g,matrix=null){const p=g.attributes.position,n=g.attributes.normal,offset=this.p.length/3;const nm=matrix?new T.Matrix3().getNormalMatrix(matrix):null;for(let i=0;i<p.count;i++){const a=V().fromBufferAttribute(p,i),b=n?V().fromBufferAttribute(n,i):V(0,1,0);if(matrix){a.applyMatrix4(matrix);b.applyMatrix3(nm).normalize();}this.vert(a,b);}const idx=g.index?.array;for(let i=0;i<(idx?idx.length:p.count);i++)this.f.push(offset+(idx?idx[i]:i));}
 sweep(input,radii,seed=1,sides=8,cap=true){
  if(input.length<2)return;const pts=input.map(p=>p.isVector3?p:V(p));const offset=this.p.length/3;let u=null;const phase=seed*.713;
  for(let k=0;k<pts.length;k++){
   const d=pts[Math.min(k+1,pts.length-1)].clone().sub(pts[Math.max(k-1,0)]).normalize();
   if(d.lengthSq()<.01)d.set(0,1,0);
   if(u){u.addScaledVector(d,-u.dot(d));if(u.lengthSq()<.01)u=null;}
   if(!u)u=new T.Vector3().crossVectors(d,Math.abs(d.y)>.9?V(1,0,0):V(0,1,0));
   u.normalize();const w=new T.Vector3().crossVectors(d,u).normalize();
   const rr=typeof radii==='number'?radii:radii[k];const ell=1+.08*Math.sin(k*.09+phase);
   for(let j=0;j<sides;j++){
    const a=j/sides*Math.PI*2,mod=1+.035*Math.cos(3*a+k*.11+phase)+.015*Math.sin(5*a-k*.13);
    const disp=u.clone().multiplyScalar(Math.cos(a)*ell).addScaledVector(w,Math.sin(a)/ell).multiplyScalar(Math.max(rr,.00001)*mod);
    const normal=u.clone().multiplyScalar(Math.cos(a)/ell).addScaledVector(w,Math.sin(a)*ell).normalize();this.vert(pts[k].clone().add(disp),normal);
   }
  }
  for(let k=0;k<pts.length-1;k++)for(let j=0;j<sides;j++){const a=offset+k*sides+j,b=offset+(k+1)*sides+j,c=offset+k*sides+(j+1)%sides,d=offset+(k+1)*sides+(j+1)%sides;this.tri(a,c,b);this.tri(c,d,b);}
  if(cap){const t0=pts[0].clone().sub(pts[1]).normalize(),t1=pts.at(-1).clone().sub(pts.at(-2)).normalize();const a=this.vert(pts[0],t0),b=this.vert(pts.at(-1),t1);for(let j=0;j<sides;j++){this.tri(a,offset+(j+1)%sides,offset+j);const last=offset+(pts.length-1)*sides;this.tri(b,last+j,last+(j+1)%sides);}}
 }
 curve(controls,radius,seed=1,steps=55,taper=.3,sides=8){
  const cv=new T.CatmullRomCurve3(controls.map(p=>p.isVector3?p:V(p)),false,'centripetal');
  const pts=cv.getPoints(steps);const radii=pts.map((p,k)=>radius*(1-taper*k/steps)*(1+.04*Math.sin(k*.21+seed)));
  this.sweep(pts,radii,seed,sides);return pts;
 }
 shell(center,axes,seed=1,rows=30,sides=48,cut=1){
  // Sculpted context capsule/lamella. Shape changes across longitudinal sections.
  // This is used for biologically capsule-shaped support structures, not as generic neurons.
  const off=this.p.length/3;
  const pp=[];
  for(let i=0;i<=rows;i++){
   const ph=Math.PI*(.005+.99*i/rows);const y=Math.cos(ph),w=Math.sin(ph);
   for(let j=0;j<=sides;j++){
    const a=2*Math.PI*(j/sides*cut+(1-cut)*.5),d=1+.06*Math.sin(a*3+seed*.12)*w*w+.03*Math.sin(ph*5+seed);
    const x=Math.cos(a)*w*axes[0]*d+.035*axes[0]*Math.sin(ph*3),z=Math.sin(a)*w*axes[2]*d;
    const p=V(center[0]+x,center[1]+y*axes[1],center[2]+z);const n=V(x/(axes[0]*axes[0]),y/axes[1],z/(axes[2]*axes[2])).normalize();this.vert(p,n);
   }
  }
  for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=off+i*(sides+1)+j,b=a+sides+1;this.tri(a,a+1,b);this.tri(a+1,b+1,b);}
 }
 sheet(center,extent,seed=1,rows=20,cols=30){const off=this.p.length/3;for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=i/rows,v=j/cols,x=(u-.5)*extent[0],z=(v-.5)*extent[2],y=Math.sin(x*.035+seed)*extent[1]*.5+Math.cos(z*.055+seed)*extent[1]*.3;this.vert(V(center[0]+x,center[1]+y,center[2]+z),V(0,1,0));}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=off+i*(cols+1)+j,b=a+cols+1;this.tri(a,a+1,b);this.tri(a+1,b+1,b);}}
 tree(p,d,length,radius,depth,seed=1,spines=false){const rand=seedRandom(seed);const points=[V(p)];let dir=V(d).normalize(),pos=V(p);for(let i=1;i<=12;i++){dir.multiplyScalar(.93).add(V((rand()-.5)*.21,(rand()-.5)*.21,(rand()-.5)*.21)).normalize();pos=pos.clone().addScaledVector(dir,length/12);points.push(pos);}this.sweep(points,points.map((_,k)=>radius*(1-.42*k/12)),seed,7);
  if(spines&&depth<2)for(let i=3;i<11;i+=4){const axis=V(rand()-.5,rand()-.5,rand()-.5).normalize(),tip=points[i].clone().addScaledVector(axis,2.1);this.sweep([points[i],points[i].clone().addScaledVector(axis,1.4),tip],[.24,.18,.56],seed+i,6);}
  if(depth>0){const side=V().crossVectors(dir,V(rand()-.5,rand()-.5,rand()-.5)).normalize();for(let k=0;k<2;k++)this.tree(points.at(-1).toArray(),dir.clone().multiplyScalar(.75).addScaledVector(side,(k?1:-1)*(.45+rand()*.3)).normalize().toArray(),length*(.59+rand()*.14),radius*(.57+rand()*.08),depth-1,seed+37+k*932,spines);}
 }
 geometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setIndex(this.f);g.computeBoundingSphere();return g;}
}
function transformedSoma(template,position,axes,turn=0){const m=new T.Matrix4().compose(V(position),new T.Quaternion().setFromAxisAngle(V(0,1,0),turn),V(axes));return template.clone().applyMatrix4(m);}
window.ATLAS_POSE_EXTENDED=false;
function posePoint(v){return[v[0],v[2]-1250,-v[1]-95];}
window.ATLAS_GEOMETRY={T,V,PALETTE,seedRandom,mix,plus,decodeGeometry,cellColor,surfaceMaterial,Membrane,transformedSoma,posePoint};
