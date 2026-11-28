/*
 * Peripheral foundry articles. Metres at the outer group, mm in the construction
 * functions. No native solver, test fixture or selected traveler is mutated.
 * Basis: the cuff lab's Cuff.geom/point/bench; the TIME-4H engine's constants,
 * positions and apertures; rolled-microchannels' RMF geometry; StentBench's
 * published, geom and sites. Dimensions not specified there are display choices.
 * Components resolve and stay on their own workpiece; a carrier isn't part of the
 * implant. Nothing here is a manufacturing instruction or a product CAD model.
 */
const TAU=2*Math.PI, clip=(x,l=0,h=1)=>Math.max(l,Math.min(h,x));
const val=(x,d,l,h)=>x!==''&&x!=null&&Number.isFinite(+x)?clip(+x,l,h):d;
const smooth=x=>(x=clip(x),x*x*(3-2*x));
const mix=(a,b,t)=>a+(b-a)*t;
const selectors=Object.freeze({
  'self-closing-cuff-foundry':'cuff','time-4h-foundry':'time',
  'rolled-microchannels-foundry':'roll','stentrode-foundry':'stent',
});
const ROLLS=Object.freeze({
  wire150:[.150,59,true,true],g150:[.150,59,true,false],g100:[.100,84,true,false],
  g50:[.050,143,true,false],open50:[.050,143,false,false],counter84:[.100,84,true,true],
});
const MATS={
  silicon:[0x506d83,.42],glass:[0x90b9bc,.16],pc:[0xa8cfba,.18],au:[0xe5ae52,.52],
  cover:[0xb1cfaa,.18],pedot:[0x35627a,.35],ppy:[0x785a81,.23],tail:[0xba9059,.23],
  pi:[0xc99d53,.22],capped:[0xb59862,.16],pt:[0xcbd5d9,.52],ir:[0x3d5977,.4],
  ceramic:[0xe3dcc3,.12],connector:[0x424c50,.27],jacket:[0x729790,.18],
  pdms:[0x79bcae,.14],lid:[0xa1cfc1,.14],su8:[0xce9855,.26],latent:[0xe5bd7b,.2],
  paa:[0xba8f91,.12],wire:[0xd2d6cc,.48],ni:[0xa8c2bf,.38],tracer:[0xa49368,.45],
};
const cube=(x0,x1,y0,y1,z0,z1)=>[
 [x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],
 [x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
// Split faces at hard edges (an edge isn't a false bevel); consistent winding.
class Batch {
  constructor(){this.xyz=[];this.ix=[]}
  face(...pts){const j=this.xyz.length/3;for(const p of pts)this.xyz.push(...p);for(let k=1;k<pts.length-1;k++)this.ix.push(j,j+k,j+k+1)}
  box(x0,x1,y0,y1,z0,z1){const p=cube(x0,x1,y0,y1,z0,z1);
    for(const f of [[3,2,1,0],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,4,7,3],[1,2,6,5]])this.face(...f.map(i=>p[i]));return this}
  // A continuous box with a changing section: preserve the two end faces only.
  ribbon(sections){if(sections.length<2)return this;
    this.face(...sections[0].slice().reverse());
    for(let i=1;i<sections.length;i++)for(let k=0;k<4;k++){
      const j=(k+1)%4;this.face(sections[i-1][k],sections[i-1][j],sections[i][j],sections[i][k]);}
    this.face(...sections.at(-1));return this}
  disc(cx,cy,cz,r,h,n=16){const aa=[],bb=[];for(let i=0;i<n;i++){
    let a=-TAU*i/n;aa.push([cx+r*Math.cos(a),cy,cz+r*Math.sin(a)]);bb.push([cx+r*Math.cos(a),cy+h,cz+r*Math.sin(a)]);}
    this.face(...aa.slice().reverse());this.face(...bb);
    for(let i=0;i<n;i++){let j=(i+1)%n;this.face(aa[i],aa[j],bb[j],bb[i]);}return this}
  rod(a,b,r,n=8){const sub=(p,q)=>p.map((v,i)=>v-q[i]),cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],
    unit=p=>{const d=Math.hypot(...p)||1;return p.map(x=>x/d)},dir=unit(sub(b,a)),
    u=unit(cross(dir,Math.abs(dir[2])>.9?[1,0,0]:[0,0,1])),v=cross(dir,u);
    const aa=[],bb=[];for(let i=0;i<n;i++){const t=TAU*i/n,off=u.map((x,j)=>r*(x*Math.cos(t)+v[j]*Math.sin(t)));aa.push(a.map((x,j)=>x+off[j]));bb.push(b.map((x,j)=>x+off[j]));}
    this.face(...aa.slice().reverse());this.face(...bb);for(let i=0;i<n;i++){let j=(i+1)%n;this.face(aa[i],aa[j],bb[j],bb[i]);}return this}
}
const B=()=>new Batch();
// Support bookkeeping deliberately excludes fixtures (e.g. the mandrel itself).
function kit(T,palette){
 const root=new T.Group(),geoms=[],nodes=[];
 function add(label,material,batch,parent=root){if(!batch.xyz.length)return null;
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.xyz,3));g.setIndex(batch.ix);
   g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();geoms.push(g);
   const mesh=new T.Mesh(g,palette[material]);mesh.name=label;mesh.userData.profileComponent=true;parent.add(mesh);nodes.push(mesh);return mesh}
 function node(label,p=root){const n=new T.Group();n.name=label;p.add(n);return n}
 function bounds(){root.updateMatrixWorld(true);const bb=new T.Box3(),b=new T.Box3();
   root.traverseVisible(n=>{if(n.geometry)bb.union(b.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld));});return bb}
 return {root,add,node,nodes,geoms,bounds};
}
const arrived=(idx,target,u)=>idx>target?1:idx===target?u:0;
const sectionRect=(w0,w1,y0,y1,z)=>[[w0,y0,z],[w1,y0,z],[w1,y1,z],[w0,y1,z]];
function strip(x0,x1,h0,h1,s0,s1,n){
 const q=B(),secs=[];for(let j=0;j<=n;j++)secs.push(sectionRect(x0,x1,h0,h1,mix(s0,s1,j/n)));return q.ribbon(secs);
}
// A foil is curved in BOTH material directions by the helical cuff map. A
// single width-spanning quad creates a triangular chord across the rolled lumen.
function cuffSheet(x0,x1,h0,h1,z0,z1,m=8,n=84){
 const b=B();
 for(let a=0;a<m;a++)for(let j=0;j<n;j++){
   const x=mix(x0,x1,a/m),X=mix(x0,x1,(a+1)/m),z=mix(z0,z1,j/n),Z=mix(z0,z1,(j+1)/n);
   b.face([x,h1,z],[x,h1,Z],[X,h1,Z],[X,h1,z]);
   b.face([x,h0,z],[X,h0,z],[X,h0,Z],[x,h0,Z]);
   if(a===0)b.face([x,h0,z],[x,h0,Z],[x,h1,Z],[x,h1,z]);
   if(a===m-1)b.face([X,h0,z],[X,h1,z],[X,h1,Z],[X,h0,Z]);
   if(j===0)b.face([x,h0,z],[x,h1,z],[X,h1,z],[X,h0,z]);
   if(j===n-1)b.face([x,h0,Z],[X,h0,Z],[X,h1,Z],[x,h1,Z]);
 }return b;
}
// Clip a coating to the intersection of its land and its actual mask opening.
// Both circular contours are tessellated, not claimed to be measured artwork.
function maskedDisc(b,x,z,land,offset,opening,h,film,coverage){
 const n=24,ring=(cx,r)=>Array.from({length:n},(_,j)=>[cx+r*Math.cos(TAU*j/n),z+r*Math.sin(TAU*j/n)]);
 let pts=ring(x,land);const aperture=ring(x+offset,opening);
 for(let i=0;i<n&&pts.length;i++){const p=aperture[i],q=aperture[(i+1)%n],cross=v=>(q[0]-p[0])*(v[1]-p[1])-(q[1]-p[1])*(v[0]-p[0]);
   const input=pts;pts=[];for(let j=0;j<input.length;j++){const a=input[j],c=input[(j+1)%input.length],u=cross(a),v=cross(c);
     if(u>=-1e-12)pts.push(a);
     if((u>0)!==(v>0)&&Math.abs(u-v)>1e-12){let t=u/(u-v);pts.push([mix(a[0],c[0],t),mix(a[1],c[1],t)]);}
   }
 }
 if(pts.length<3||coverage<=0)return;
 const X=pts.reduce((a,c)=>a+c[0],0)/pts.length,Z=pts.reduce((a,c)=>a+c[1],0)/pts.length;
 pts=pts.map(([ox,oz])=>[mix(X,ox,Math.sqrt(coverage)),mix(Z,oz,Math.sqrt(coverage))]);
 const hi=pts.map(([x,z])=>[x,h+film,z]),lo=pts.map(([x,z])=>[x,h,z]);
 b.face(...hi.slice().reverse());b.face(...lo);
 for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length;b.face(lo[i],hi[i],hi[j],lo[j]);}
}
function lineStrip(b,x0,z0,x1,z1,w,h,y,n=1){const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz)||1,
 nx=w*.5*dz/len,nz=-w*.5*dx/len;
 const ss=[];for(let k=0;k<=n;k++){const t=k/n,x=mix(x0,x1,t),z=mix(z0,z1,t);ss.push([[x-nx,y,z-nz],[x+nx,y,z+nz],[x+nx,y+h,z+nz],[x-nx,y+h,z-nz]]);}
 return b.ribbon(ss)}
function deform(meshes,map){
 for(const mesh of meshes){if(!mesh)continue;
   const g=mesh.geometry,p=g.attributes.position;
   const baseline=mesh.userData.initial??(mesh.userData.initial=p.array.slice());
   for(let j=0;j<p.count;j++){const off=j*3;map(baseline[off],baseline[off+1],baseline[off+2],p.array,off);}
   p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 }
}
function cfgCuff(s){return {layout:+s.layout===28?28:3,stack:['3:4','3:5.4'].includes(s.stack)?s.stack:'2:4',
  release:['tether','tear'].includes(s.release)?s.release:'clear',drive:s.breakNet==='drive'||s.drive===false,breakNet:s.breakNet==='first'?'first':'none',
  edge:val(s.edge,0,0,165),dx:val(s.dx,0,-40,40),yaw:val(s.yaw,0,-.4,.4),bond:val(s.bond,0,-120,120),skew:val(s.skew,0,-45,45),
  ppy:val(s.ppy,100,0,100),pedot:val(s.pedot,100,0,100),diameter:val(s.diameter??s.d,1.4,.8,3)}}
function makeCuff(T,p,s,section){
 const k=kit(T,p),{add}=k,L=10.7,W=2.1,N=s.layout,base=+s.stack.split(':')[0]/1000,th=section?Math.max(.025,base):base;
 const clear=section?.023:.0026, routeH=section?.01:.00011; // only contrast relief is enlarged in microscope
 const substrate=add('Temporary Si carrier coupon (outline illustrative)','silicon',B().box(-1.55,1.55,-.24,0,-.55,L+.55)),
  foil=add('Flexible permanent parylene-C base','pc',cuffSheet(-W/2,W/2,0,th,0,L));
 const v=[foil], gold=B(),tearLink=B(),bus=B(),sites=B(),coat=B(),pp=B(),ffc=B(),pad=B(),stripes=14,apertures=[];
 for(let i=0;i<N;i++){
   const side=N===3?(i===1?-1:1):(i%2?-1:1),idx=N===3?i:Math.floor(i/2),m=N===3?3:14;
   const z=.45+idx*(L-.9)/(m-1),x=side*.84,lane=side*(.56+.20*(idx+.5)/m),padX=(i/N-.5)*1.28;
   // Radius 20µm and mask radius 16µm are native overlap assumptions, not recovered masks.
   gold.disc(x,th,z,.020,routeH);const brk=s.breakNet==='first'&&i===0||s.edge>=32+idx*8&&side>0;
   if(!brk)lineStrip(s.release==='tear'&&i===N-1?tearLink:gold,x,z,lane,z-.16,.008,routeH,th,3);
   lineStrip(gold,lane,z-.16,lane,.15,.008,routeH,th,Math.max(1,Math.ceil(z/.24)));
   lineStrip(gold,lane,.15,padX,.015,.008,routeH,th,2);
   const d=(s.dx+(z-L/2)*1000*Math.tan(s.yaw*Math.PI/180))*.001;
   // Actual overlap is solved in the native model; no fabricated isolated islands on a missed pad.
   apertures.push([x+d,z,.016,16]);
   maskedDisc(sites,x,z,.020,d,.016,th+routeH,.1*routeH,1);
   maskedDisc(coat,x,z,.020,d,.016,th+routeH*1.15,routeH*.24,s.pedot/100);
   pad.box(padX-.012,padX+.012,th,th+routeH,-.15,.16);
 }
 // Independent actuator trunk and diagonal stripe paths, not recording contacts.
 lineStrip(bus,0,.02,0,s.drive?L*.43:L-.14,.020,routeH,th,56);
 if(s.drive)lineStrip(bus,0,L*.47,0,L-.14,.020,routeH,th,30);
 for(let j=0;j<stripes;j++){
   const z=.24+(L-.85)*j/(stripes-1);
   lineStrip(bus,-.50,z,.50,z+.32,.040,routeH,th,6);
   if(s.ppy>0)lineStrip(pp,-.50,z,-.50+s.ppy/100,z+.32*s.ppy/100,.056,section?.018:+s.stack.split(':')[1]/1000,th+clear+routeH,6);
 }
 const perforations=B(),bounds=[0,...Array.from({length:85},(_,i)=>(i+1)*L/86).filter(v=>apertures.every(([x,z])=>Math.abs(z-v)>.021)),L];
 const xs=[-W/2,...Array.from({length:7},(_,i)=>(i+1)*W/8-W/2).filter(x=>apertures.every(h=>Math.abs(h[0]-x)>.021)),W/2];
 for(let j=1;j<bounds.length;j++)for(let i=1;i<xs.length;i++){
   const a=bounds[j-1],b=bounds[j],l=xs[i-1],r=xs[i];
   perforated(T,perforations,l,r,a,b,th+routeH*1.45,th+clear,
    apertures.filter(h=>h[1]>=a&&h[1]<b&&h[0]>=l&&h[0]<r),
    [i===1,j===bounds.length-1,i===xs.length-1,j===1]);
 }
 const pierced=add('Registration apertures through parylene overcoat (not painted circles)','cover',perforations);
 const intact=add('Edge-net segment retained until the tear witness','au',tearLink);
 const sense=add('Independent Ti/Au recording traces and lands','au',gold),
  drive=add('Gold drive bus and diagonal actuator lands','au',bus),
  over=add('Intact parylene cover before the contact mask','cover',cuffSheet(-W/2,W/2,th+routeH*1.45,th+clear,0,L)),
  windows=add('Exposed recording lands at registered apertures','au',sites),
  ink=add('PEDOT:PSS sensing finish (not actuator)','pedot',coat),
  actuator=add('PPy(DBS) actuator stripes (not sensing coating)','ppy',pp),
  cable=add('Short FFC segment; length cropped','tail',ffc.box(-.74,.74,.012,.095,-2.1,.015)),
  fingers=add('Symbolic FFC terminals; not source pin locations','au',pad);
 for(const m of [sense,intact,drive,over,pierced,windows,ink,actuator])if(m)v.push(m);
 const A=37*Math.PI/180,ca=Math.cos(A),sa=Math.sin(A);let last=null,lastPeel=null;
 return {...k,run(i,u){
   const on=(n)=>arrived(i,n,u)>.06;
   const releasePhase=arrived(i,6,u),released=releasePhase>.98&&s.release!=='tether';
   substrate.visible=i>0&&!released;foil.visible=on(1);sense.visible=drive.visible=on(2);over.visible=on(3)&&!on(4);pierced.visible=on(4);
   if(intact)intact.visible=on(2)&&releasePhase<.78;
   const join=arrived(i,7,u);cable.position.z=-1.1*(1-join);
   if(windows)windows.visible=on(4);if(ink)ink.visible=on(5);cable.visible=fingers.visible=on(7);if(actuator)actuator.visible=on(8);
   // The moving article's tip/FFC do not teleport to a separate cylindrical mesh.
   // As in native playback: free/constrained wrap followed by reopening, no kinetics.
   const rm=s.diameter/2+(base+.00011+(+s.stack.split(':')[1]/1000))/2;
   const measured={'2:4':.47333,'3:4':.995,'3:5.4':.75}[s.stack];
   const canCurl=!s.drive&&s.release!=='tether'&&s.ppy>0&&Math.abs(s.bond+s.skew*.5)<=33&&Math.abs(s.dx)<155;
   const peak=1/Math.max(rm,measured/Math.max(.0001,s.ppy/100*(1-Math.abs(s.dx)/155)));
   const cycle=i===10&&canCurl?(u<.51?smooth(u/.49):1-smooth((u-.56)/.44)):0;
   const curvature=peak*cycle;
   const peel=i===6?Math.sin(Math.PI*u)*.74:0;
   if(last!==curvature||lastPeel!==peel){
     const one=(x,h,z,out,j)=>{
       const a=(Math.max(0,z)*ca-x*sa),az=a*curvature;
       const zz=(Math.max(0,z)-L/2)*sa+x*ca;
       let circum=curvature>1e-9?Math.sin(az)/curvature:a;
       let yy=curvature>1e-9?(1-Math.cos(az))/curvature:0;
       circum-=h*Math.sin(az);yy+=h*Math.cos(az);
       let ax=zz;if(z<0){circum+=z*ca*Math.cos(az);yy+=z*ca*Math.sin(az);ax+=z*sa;}
       // Rotate the original planar strip so the long flat arm lies along +Z.
       const c=circum-L/2*ca;
       out[j]=-c*sa+ax*ca;out[j+1]=yy+peel*Math.pow(clip(z/L),2);out[j+2]=c*ca+ax*sa+L/2;
     };
     deform(v,one);last=curvature;lastPeel=peel;
   }
   return {activeFeature:cycle>.03?'helical-wrap':on(8)?'actuator-stripes':on(7)?'cabled-foil':released?'released-foil':on(5)?'sensing-coating':on(4)?'contact-windows':on(3)?'insulated-foil':on(2)?'sense-and-drive':on(1)?'parylene-film':'blank',
    shape:i===0?'none':released?'assembly':'panel',senseSiteCount:on(2)?N:0,nativeSiteCount:on(2)?N:0,nativeApertureCount:on(4)?N:0,carrierAttached:substrate.visible,
    teachingBranch:N===3?'Three-site phantom demonstrator':'28-site instrumented layout; mandrel comparison modeled',
    scaleNote:'Reported 10.7 × 2.1 mm interfacing strip. Traces, access markers, FFC stub and shape interpolation are teaching geometry; bench cycles back to the flat state.'};
 }};
}
// Polygon aperture walls and both material faces. Pin pads do not stand in for holes.
function perforated(T,b,x0,x1,z0,z1,h0,h1,holes,outerEdges){
 const outer=[[x0,z0],[x0,z1],[x1,z1],[x1,z0]],
  inners=holes.map(o=>Array.from({length:o[3]??12},(_,j)=>[o[0]+o[2]*Math.cos(TAU*j/(o[3]??12)),o[1]+o[2]*Math.sin(TAU*j/(o[3]??12))])),
  loops=[outer,...inners],all=loops.flat(),v=loops.map(row=>row.map(([x,z])=>new T.Vector2(x,z)));
 const tris=T.ShapeUtils.triangulateShape(v[0],v.slice(1));
 for(const f of tris){const a=f.map(j=>all[j]);if((a[1][0]-a[0][0])*(a[2][1]-a[0][1])-(a[1][1]-a[0][1])*(a[2][0]-a[0][0])>0)a.reverse();
   b.face(...a.map(([x,z])=>[x,h1,z]));b.face(...a.slice().reverse().map(([x,z])=>[x,h0,z]));}
 for(const l of loops)for(let j=0;j<l.length;j++){if(outerEdges&&l===outer&&!outerEdges[j])continue;const a=l[j],c=l[(j+1)%l.length];b.face([a[0],h1,a[1]],[a[0],h0,a[1]],[c[0],h0,c[1]],[c[0],h1,c[1]]);}
 return b;
}
function cfgTime(s){return {thickness:val(s.thickness,12,4,40),blocked:Math.round(val(s.blocked,0,0,109)),windowLeg:s.windowLeg==='GR'?'GR':'GL',overlay:val(s.overlay,0,0,100)}}
function hexGround(){const a=[];for(let q=-9;q<=9;q++)for(let r=-9;r<=9;r++)a.push({q,r,x:q+r/2,y:r*Math.sqrt(3)/2,d:q*q+q*r+r*r});return a.sort((i,j)=>i.d-j.d||i.r-j.r||i.q-j.q).slice(0,109)}
function makeTime(T,p,s,section,eng){
 const k=kit(T,p),{add,node}=k, t=section?.055:s.thickness/1000,coverT=t*.48,metalT=section?.009:.0003,underT=t*.52;
 const groups=[],fields=[],probe=.64,leg=.83; // all arm outlines, MFI shape and cable routing are illustrative
 const carrier=add('Temporary silicon support, bounded coupon witness','silicon',B().box(-3.35,1.72,-.26,0,-4.75,3.20));
 const f=eng?.positions?.(),spots=eng?.apertures??hexGround();
 for(let face=0;face<2;face++){
   const group=node((face?'R':'L')+' movable flex face'),sgn=face?1:-1,dx=sgn*leg,sz=3.02;
   const ext=.58,groundZ=-3.93,circles=[],holes=[],b=B(),m=B(),act=B(),ground=B(),paint=B();
   b.box(dx-probe/2,dx+probe/2,0,underT,-3.18,sz);
   b.box(dx-ext-.14,dx+ext+.14,0,underT,groundZ-ext,groundZ+ext);
   b.box(dx-.28,dx+.28,0,underT,groundZ+ext,-3.18);
   const base=add('Polyimide '+(face?'right':'left')+' arm with independent return tab','pi',b,group);
   const xyz=(f??[]).filter(q=>q.side===(face?'R':'L'));
   for(let j=0;j<7;j++){
     const z=(xyz[j]?.xMm??(.75*j+.375*face))-2.43;
     const r=.040; // source diameter 80 µm
     const land=.048; // nominal native overlap witness
     const lane=dx-.21+.065*j;
     m.disc(dx,underT,z,land,metalT,20);lineStrip(m,dx,z,lane,z-.09,.014,metalT,underT);
     lineStrip(m,lane,z-.09,lane,-2.99,.014,metalT,underT);
     const ox=dx+s.overlay/1000;
     circles.push([ox,z,r,16]);
     if(s.overlay<88){
       // Native bench calculates circular overlap. The finite recess above metal
       // clips the larger Pt landing; no electrical identity assigned to insulation.
       act.disc(dx,underT+metalT,z,land,metalT*.65,20);
     }
   }
   // One Pt return landing per leg. Windows are separate holes over that COMMON bus.
   const hx=dx,hz=groundZ,pitch=.096,coverH=underT+metalT*1.75;
   const nx=s.windowLeg===(face?'GR':'GL')?s.blocked:0;
   for(let j=nx;j<spots.length;j++)holes.push([hx+spots[j].x*pitch+s.overlay/1000,hz+spots[j].y*pitch,.040,10]);
   m.box(dx-ext+.025,dx+ext-.025,underT,underT+metalT,groundZ-ext+.026,groundZ+ext-.026);
   lineStrip(m,dx,groundZ+ext,dx,-2.91,.08,metalT,underT);
   const routes=add('Seven Pt routes and common return landing','pt',m,group);
   const closed=B().box(dx-probe/2,dx+probe/2,coverH,coverH+coverT,-3.18,sz)
      .box(dx-ext-.14,dx+ext+.14,coverH,coverH+coverT,groundZ-ext,groundZ+ext);
   const c0=add('Closed upper PI before window opening','capped',closed,group);
   const open=perforated(T,B(),dx-probe/2,dx+probe/2,-3.18,sz,coverH,coverH+coverT,circles);
   // Shift the synthetic overlay limit up to 100 µm without moving an aperture
   // outside its tab; model pad width itself is not a measured outline.
   perforated(T,open,dx-ext-.14,dx+ext+.14,groundZ-ext,groundZ+ext,coverH,coverH+coverT,holes);
   const c1=add('PI with physical active and common-return aperture walls','capped',open,group);
   const iro=add('Active SIROF finish visible through electrically independent windows','ir',act,group);
   groups.push(group);fields.push({base,routes,c0,c1,iro,holes:holes.length});
 }
 // Split bridge at the hinge: each half follows its corresponding arm (no stretch).
 const bridge=[];
 for(let i=0;i<2;i++){const q=B().box(i?0:-leg,i?leg:0,0,underT,-3.22,-2.93);
   bridge.push(add('U bridge half '+(i+1),'pi',q,groups[i]));}
 // The fixed transverse exit remains at ~90° to the folded shaft (L silhouette).
 const transition=add('Transverse PI exit to MFI (schematic outline)','pi',B().box(-3.14,-.76,0,underT,-3.30,-2.85));
 const ceramic=add('External screen-printed ceramic transition','ceramic',B().box(-4.13,-2.86,0,.23,-3.66,-2.48));
 const lands=B(),wires=B(),pins=B();
 for(let i=0;i<16;i++){const j=i%8,row=i>>3,z=-3.53+.129*j,py=.12+row*.13;
   lands.box(-3.93,-3.1,py,py+.022,z-.035,z+.035);
   wires.rod([-3.88,py+.022,z],[-4.42,py+.045,-3.39+j*.092],.020,6);
   wires.rod([-4.42,py+.045,-3.39+j*.092],[-7.4,py+.045,-3.39+j*.092],.020,6);
   pins.box(-7.91,-7.50,py,py+.073,z-.035,z+.035);
 }
 const contacts=add('Sixteen path identities on the ceramic, illustrative pins','au',lands),
  cable=add('Sixteen cropped cable leads; not full physical cable length','wire',wires),
  housing=add('Connector body (non-OEM illustration)','connector',B().box(-7.62,-7.33,0,.41,-3.68,-2.45)),
  tips=add('Teaching sixteen-position breakout','au',pins),
  strain=add('Localized silicone transition witness; never over active shaft','jacket',B().box(-4.60,-4.03,.01,.34,-3.60,-2.51));
 return {...k,run(i,u){
   const on=n=>arrived(i,n,u)>.04,fold=arrived(i,8,u),opened=on(5);
   // Finite hinge offset keeps the two finished faces on opposite OUTER surfaces.
   // After release, the right leg folds under the left, around the z axis.
   const ang=-Math.PI*fold;
   groups[1].rotation.z=ang;
   groups[1].position.y=-fold*.006;
   const peel=arrived(i,7,u);carrier.visible=on(1)&&peel<.99;carrier.position.x=.94*peel;carrier.position.y=-.22*peel;
   for(const a of fields){a.base.visible=on(2);a.routes.visible=on(3);a.c0.visible=on(4)&&!opened;a.c1.visible=opened;if(a.iro)a.iro.visible=on(6);}
   for(const b of bridge)b.visible=on(2);
   transition.visible=on(2);
   ceramic.visible=contacts.visible=on(9);cable.visible=housing.visible=tips.visible=on(10);strain.visible=on(11);
   return {shape:i===0?'none':on(7)?'assembly':'panel',activeFeature:on(11)?'protected-exit':on(10)?'sixteen-wire-fanout':on(9)?'mfi-ceramic':fold>.01?'opposed-face-fold':on(7)?'released-U':on(6)?'active-SIROF':opened?'active-and-return-windows':on(4)?'pi-cover':on(3)?'Pt-routing':on(2)?'pi-base':'blank',
     nativeSiteCount:on(3)?14:0,nativeApertureCount:opened?14+fields.reduce((sum,a)=>sum+a.holes,0):0,returnNetCount:on(3)?2:0,
     carrierAttached:carrier.visible,cableLeadCount:on(10)?16:0,physicalFoldProgress:fold,
     scaleNote:'14 active contacts (Ø80 µm, pitch 0.75 mm, opposing stagger 0.375 mm). Each 109-hole return is one net. U-to-L motion, tab outlines, cropped 16-wire cable and transition are illustrative; no OEM pinout.'};
 }};
}
const rc=.245, pitchR=.150/TAU;
const primitive=r=>(r*Math.hypot(r,pitchR)+pitchR*pitchR*Math.asinh(r/pitchR))/(2*pitchR);
const arcStart=primitive(rc),arc=t=>primitive(rc+pitchR*t)-arcStart;
function theta(s){if(s<=0)return 0;let lo=0,hi=s/rc;for(let j=0;j<27;j++){const m=(lo+hi)/2;if(arc(m)<s)lo=m;else hi=m;}return (lo+hi)/2}
const head=['design','base','basePlasma','su8','expose','develop'];
function sequence(mode){const r=ROLLS[mode];return r[2]?[...head,'lid','bondPlasma','cap','releaseCap','releaseWeb','roll',...(r[3]?['wire']:[]),'inspect']:[...head,'openQC']}
function rollBatches(s0,s1,y0,y1,n,z=5){const b=B(),rows=[];for(let i=0;i<=n;i++){
 const x=mix(s0,s1,i/n);rows.push([[x,y0,z],[x,y0,-z],[x,y1,-z],[x,y1,z]]);
 }return b.ribbon(rows);}
function cfgRoll(s,branch){const mode=[s.mode,branch].find(v=>Object.hasOwn(ROLLS,v))??'wire150';return {mode,driftPct:val(s.driftPct,100,0,100)}}
function makeRoll(T,p,s,section,eng){
 const k=kit(T,p),{add}=k,[w,count,rollable,wireable]=ROLLS[s.mode],pw=.020,web=count*(w+pw)+pw;
 const seq=sequence(s.mode),maxT=theta(web),du=.15;const native=rollable?eng?.getGeometry?.(s.mode,s.driftPct):null;
 const geomCenters=Array.from({length:count},(_,i)=>({s:pw+(w+pw)*i+w/2,t:theta(pw+(w+pw)*i+w/2)}));
 const arr=geomCenters.map(({s,t})=>({weight:1-s/web,turn:Math.floor(t/TAU)+1})),inner=arr.filter(a=>a.turn<=2),outer=arr.filter(a=>a.turn===arr.at(-1).turn),
  avg=v=>v.reduce((t,a)=>t+a.weight,0)/v.length,aw=avg(inner),bw=avg(outer),delta=({50:.25,100:.025,150:.075})[Math.round(w*1000)];
 const edges=[[0,0]];for(let i=0;i<count;i++){
   const {s:ss,t}=geomCenters[i],rr=rc+pitchR*t+.015; // band centre at +15 µm
   const repair=1+(aw>bw?delta*s.driftPct/100*(arr[i].weight-bw)/(aw-bw):0),dt=Math.asin(Math.min(.8,w*repair/(2*rr))),
    nd=native?.channels[i]?.angularBounds??[Math.max(0,t-dt,i?(t+geomCenters[i-1].t)/2+.001:0),Math.min(maxT,t+dt,i<count-1?(t+geomCenters[i+1].t)/2-.001:maxT)];
   edges.push([ss-w/2,nd[0]],[ss+w/2,nd[1]]);
 }edges.push([web,maxT]);
 const samples=new Map();
 function point(sx){
   if(samples.has(sx))return samples.get(sx);
   let lo=0,hi=edges.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(edges[m][0]<=sx)lo=m;else hi=m;}
   const a=edges[lo],b=edges[hi],f=clip((sx-a[0])/(b[0]-a[0]||1)),
    th=mix(a[1],b[1],f),r=rc+pitchR*th,co=Math.cos(th),si=Math.sin(th),
    o={th,r,co,si,sarc:arc(th)};samples.set(sx,o);return o;
 }
 const lo=add('Lower treated glass (temporary illustrative coupon)','glass',B().box(-.25,web+.25,-.445,-.075,-5.25,5.25));
 const base=add('40 µm PDMS floor winding continuously','pdms',rollBatches(0,web,-.075,-.035,192)),
   precursor=add('Continuous SU-8 precursor (no open lumens)','su8',B().box(0,web,-.035,.065,-5,5));
 const wbs=B(),latent=B(),sacrificial=B();
 for(let j=0;j<=count;j++){const a=j*(w+pw),b=a+pw;
   const o=rollBatches(a,b,-.035,.065,2);const offset=wbs.xyz.length/3;wbs.xyz.push(...o.xyz);wbs.ix.push(...o.ix.map(c=>c+offset));
   if(j<count){latent.box(a,b,.065,.067,-5,5);sacrificial.box(b,b+w,0,1,-5,5);}}
 const gaps=add('Precursor being cleared between permanent walls','su8',sacrificial);gaps.position.y=-.035;
 const walls=add('Permanent SU-8 partitions; patterned spaces remain empty','su8',wbs),
  exposure=add('Latent pattern contrast (display only, not new material)','latent',latent),
  lid=add('10 µm permanent PDMS roof, not an end cap','lid',rollBatches(0,web,.065,.075,192)),
  top=add('Upper glass support, removed independently','glass',B().box(-.18,web+.18,.082,.33,-5.18,5.18)),
  release=add('Sacrificial PAA support (visibility exaggerated)','paa',B().box(0,web,.075,.082,-5,5));
 const wires=B();
 if(wireable)for(let j=0;j<8;j++){
   const idx=Math.floor(count*(j+.50)/8);const c=native?.channels[idx]?.centerUm;
   // Native theta centers are retained (not angle-midpoint assumptions).
   const ss=geomCenters[idx],rr=rc+pitchR*ss.t+.015;
   const x=c?c[0]/1000:rr*Math.cos(ss.t),y=c?c[1]/1000:rr*Math.sin(ss.t);
   const tangentLength=Math.hypot(rc,pitchR),tx=pitchR/tangentLength,ty=rc/tangentLength;
   const X=x*tx+y*ty,Y=x*ty-y*tx;wires.rod([X,Y,0],[X,Y,1.74],.03,12);
 }
 const lead=add('Eight 60 µm instrumented lumens; map is a teaching assignment','wire',wires);
 let lastFold,foldCache=-1;
 return {...k,seq,run(i,u){
   const id=seq[i]??seq.at(-1),f=n=>{const j=seq.indexOf(n);return j>=0?arrived(i,j,u):0},on=n=>f(n)>.035;
   const rl=f('releaseWeb'),ru=f('releaseCap');
   lo.visible=i>0&&rl<.995;lo.position.y=-.28*rl;lo.position.x=-.45*rl;
   base.visible=on('base');precursor.visible=on('su8')&&!on('develop');
   gaps.visible=id==='develop'&&u>.035&&u<.998;gaps.scale.y=Math.max(.00001,.10*(1-u));
   exposure.visible=on('expose')&&!on('develop');walls.visible=on('develop');
   lid.visible=rollable&&on('lid');top.visible=release.visible=lid.visible&&ru<.995;
   const separated=lid.visible?(1-f('cap'))*.85:0;
   lid.position.y=separated;top.position.y=release.position.y=separated+.8*(id==='releaseCap'?u:0);
   const fold=f('roll');
   if(fold!==foldCache){
     const cut=maxT*fold,sc=arc(cut),rad=rc+pitchR*cut,co=Math.cos(cut),si=Math.sin(cut),
      norm=Math.hypot(pitchR,rad),tx=(pitchR*co-rad*si)/norm,ty=(pitchR*si+rad*co)/norm,
      tc=Math.hypot(pitchR,rc),t0x=pitchR/tc,t0y=rc/tc,flatEase=smooth(fold*10);
     const map=(sx,h,z,buffer,j)=>{
       let X=sx,Y=h;if(fold>0){
         const e=point(sx),pr=e.th<=cut,
          rx=pr?(e.r+h)*e.co:rad*co+tx*(e.sarc-sc)+co*h,
          ry=pr?(e.r+h)*e.si:rad*si+ty*(e.sarc-sc)+si*h;
         // A rigid rotation of the finished native spiral. No filled central cylinder.
         // Remove start-frame offset only while flat; final wire positions share this frame.
         X=mix(sx,rx*t0x+ry*t0y,flatEase);Y=mix(h,rx*t0y-ry*t0x,flatEase);
       }
       buffer[j]=X;buffer[j+1]=Y;buffer[j+2]=z*mix(1,.3,smooth((fold-.64)/.36));
     };
     deform([base,walls,lid],map);foldCache=fold;
   }
   if(lead){const r=f('wire');lead.visible=r>.02;lead.position.z=1.6*(1-r);}
   const rolled=fold>=.99;
   return {shape:i===0?'none':on('releaseWeb')?'assembly':'panel',
    activeFeature:lead?.visible?'registered-wires':rolled?'rolled-lumens':fold>0?'winding-ducts':on('cap')?'capped-ducts':top.visible?'separate-cap':walls.visible?'open-grooves':exposure.visible?'latent-wall-pattern':precursor.visible?'wall-precursor':base.visible?'PDMS-floor':'blank',
    carrierAttached:lo.visible,upperCarrierAttached:top.visible,permanentCapJoined:on('cap'),patternedGrooves:walls.visible?count:0,
    enclosedLumenCount:on('cap')?count:0,installedWireCount:lead?.visible?8:0,wireDiameterUm:lead?.visible?60:undefined,
    nominalLumenWidthUm:w*1000,rolledAxisLengthMm:rolled?3:undefined,teachingBranch:s.mode,
    scaleNote:'PDMS floor 40 µm / SU-8 walls 20 × 100 µm / roof 10 µm. The 3 mm trim and open axial mouths preserve the groove identities; core, winding shape and wire assignment are reconstructed.'+
      (s.mode==='counter84'?' Eight wires in the 84-lumen scaffold are counterfactual.':s.mode==='open50'?' Uncapped, unrolled flat witness; lumen and wire counts stay zero.':'')};
 }};
}
function cfgStent(s){return {diameter:val(s.diameter,3,1,3),fault:['open','frame','bridge','swap'].includes(s.fault)?s.fault:'none',site:Math.round(val(s.site,0,0,7)),cover:val(s.cover,0,0,100)}}
function makeStent(T,p,s,section,eng){
 const k=kit(T,p),{add,node}=k,L=eng?.published?.length??31.1,d0=3,N=8,rows=12,az=8,discR=.375,discH=.050;
 const baseG=eng?.geom?.(3),nativeSites=baseG?eng.sites(baseG):Array.from({length:N},(_,i)=>({row:2+i,column:(2+i*3)%az}));
 const dia=section?.11:.070; // Strut cross section NOT published: visible cylinder, not stent vendor CAD.
 const rail=B(),frame=node('Supplied nitinol research scaffold'),pole=(t,z,r)=>[Math.cos(t)*r,Math.sin(t)*r,z];
 for(let j=0;j<rows;j++)for(let c=0;c<az;c++)if(!((j+c)%2))for(const sign of [-1,1]){
   // The native crossed-node grid wraps once around the axis; no enclosing tube.
   for(let m=0;m<3;m++){const t0=(c+sign*m/3)*TAU/az,t1=(c+sign*(m+1)/3)*TAU/az,
    z0=L*((j+m/3)/rows-.5),z1=L*((j+(m+1)/3)/rows-.5);
    rail.rod(pole(t0,z0,1.5),pole(t1,z1,1.5),dia*.5,7);}
 }
 add('Open diamond lattice (teaching strut thickness)','ni',rail,frame);
 const targets=[],discs=[],stubs=[],covers=[],pathLines=[],pins=B(),padRoot=node('Assumed proximal breakout map');
 const zprox=-L/2,breakoutZ=-L/2-1.72;
 const axialBundle=B(),body=B().box(-.63,.63,-.40,.40,breakoutZ-.58,breakoutZ+.15);
 add('Symbolic connector envelope, not OEM housing','connector',body,padRoot);
 const flatQ=new T.Quaternion(),mountedQ=[];
 for(let j=0;j<N;j++){
   const f=nativeSites[j],ang=f.column*TAU/az,grp=node('D'+(j+1)+' disc–wire subassembly'),z=L*(f.row/rows-.5);
   targets.push([ang,z]);mountedQ.push(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),ang-Math.PI/2));
   add('Platinum disc Ø0.75 × 0.05 mm','pt',B().disc(0,0,0,discR,discH,24),grp);
   // Wires bonded to backside, no phantom wire going through the platinum face.
   const leadR=section?.031:.0125,wire=B();
   if(s.fault==='open'&&j===s.site)wire.rod([0,-.045,-.31],[0,-.045,-.82],leadR,8);
   else {wire.rod([0,-.016,0],[0,-.045,-.27],leadR,8);wire.rod([0,-.045,-.27],[0,-.045,-.82],leadR,8);}
   const stub=add('Illustrative disc joint and 25 µm-core lead segment','tracer',wire,grp);stubs.push(stub);discs.push(grp);
   // Optional native straight-edge obscuration witness applied only at the chosen contact.
   let cap=null;
   if(j===s.site&&s.cover>0){
     const lim=-discR+2*discR*s.cover/100,th=Math.acos(clip(lim/discR,-1,1)),cont=[];
     for(let m=0;m<=32;m++){const t=mix(th,TAU-th,m/32);cont.push([discR*Math.cos(t),discH+.001,discR*Math.sin(t)]);}
     const patch=B();patch.face(...cont.reverse());cap=add('Hypothetical straight-edge coverage; no extra conductive path','jacket',patch,grp);
   }covers.push(cap);
   // Preserve separation near the crossings: eight distinct explicit teaching traces.
   const pts=B(),r=1.5+dia*.5-.045,r0=1.5+dia*.5,ownZ=z-.82;
   const a=ang+(j%2?1:-1)*.075;
   pts.rod(pole(ang,ownZ,r),pole(a,ownZ-.24,r0),leadR,8);
   pts.rod(pole(a,ownZ-.24,r0),pole(a,zprox,r0),leadR,8);
   const trace=add('Assumed insulated path C'+(j+1),'tracer',pts,frame);pathLines.push(trace);
   const px=-.52+.34*(j%4),py=j<4?-.15:.15;
   axialBundle.rod(pole(a,zprox,r0),[px,py,breakoutZ+.16],leadR,8);
   pins.box(px-.067,px+.067,py-.045,py+.045,breakoutZ-.89,breakoutZ-.52);
 }
 const harness=add('Assumed wire fan-in, not recovered historical routing','tracer',axialBundle),
  terminals=add('C1…C8 teaching fixture terminals','au',pins,padRoot);
 const dzRef=Math.hypot(L/rows,Math.PI*d0/az);
 return {...k,run(i,u){
   const on=n=>arrived(i,n,u)>.03;
   const at=arrived(i,3,u),mounted=at>=.999,tests=i>=5,parts=arrived(i,1,u),cabled=on(4);
   const d=tests?(i===5?(u<.54?mix(3,2,smooth(u/.54)):mix(2,s.diameter,smooth((u-.54)/.46))):s.diameter):d0;
   const length=rows*Math.sqrt(dzRef**2-(Math.PI*d/az)**2),sz=length/L,rr=d/2+dia/2;
   frame.scale.set(d/3,d/3,sz);padRoot.visible=harness.visible=cabled;
   padRoot.position.z=zprox*(sz-1);
   harness.scale.set(d/3,d/3,sz);
   for(let j=0;j<N;j++){
     const grp=discs[j],[ang,z]=targets[j],t=smooth(clip((at-j*.018)/(.87)));
     // A separate row of face-up discs is carried alongside the scaffold
     // BEFORE mounting; no extra completed implant or sites in the lumen.
     const trayX=3.00, trayY=-d0/2, trayZ=L*(j+.6)/(N+.3)-L/2;
     grp.visible=parts>j*.075+.001;grp.position.set(mix(trayX,rr*Math.cos(ang),t),mix(trayY,rr*Math.sin(ang),t),mix(trayZ,z*sz,t));
     grp.quaternion.copy(flatQ).slerp(mountedQ[j],t);
     stubs[j].visible=on(2);if(covers[j])covers[j].visible=on(3);pathLines[j].visible=cabled;
   }
   return {shape:'assembly',activeFeature:i===5&&u>.02&&u<.98?'mandrel-sweep':cabled?'eight-pin-breakout':mounted?'mounted-discs':at>.01?'crossover-transfer':on(2)?'disc-wire-joints':parts>.01?'loose-discs':'supplied-lattice',
     nativeSiteCount:discs.filter(m=>m.visible).length,mountedSiteCount:mounted?8:0,nativeApertureCount:undefined,
     scaffoldDiameterMm:d,scaffoldLengthMm:length,installedWireCount:on(2)?8:0,symbolicTerminalCount:cabled?8:0,carrierAttached:false,
     scaleNote:'2016 research article: nominal 31.1 × Ø3 mm supplied scaffold; 8 platinum discs Ø0.75 × 0.05 mm. Crossings, strut section and lead routes are illustrative; not Synchron product CAD or a nitinol mechanics simulation.'};
 }};
}
/** Portable Three.js injection. No DOM, WebGL import, clock, native side-effects or external assets. */
export function makeDeviceProfiles(T,{section=false}={}){
 const group=new T.Group(),unit=new T.Group();group.name='Persistent peripheral foundry article';group.add(unit);
 const p={};for(const [n,[color,metalness]] of Object.entries(MATS)){
   const glass=n==='glass';p[n]=new T.MeshStandardMaterial({color,metalness,roughness:glass?.42:metalness>.4?.35:.52,side:T.DoubleSide,
     transparent:glass,opacity:glass?.31:1,depthWrite:!glass});p[n].name=n;
 }
 const blank={shape:'none',activeFeature:'none',canExplode:false,layerCount:0,layers:[],exploded:0,visible:false,
  nativeOutline:false,nativeSiteCount:0,nativeApertureCount:0,scaleNote:'Digital design or unresolved input. No physical article.'};
 let live=null,key='',lastRun='',last={...blank},disposed=false;
 const release=()=>{if(!live)return;unit.remove(live.root);live.geoms.forEach(g=>g.dispose());live.root.clear();live=null;};
 function update(a={}){
   if(disposed)return last;const au=a.authored??{},data=a.dataset??au.dataset??{},profile=a.profile??au.deviceProfile,code=selectors[profile];
   if(!code){group.visible=false;lastRun='';return last={...blank};}
   const native=data.config??data.settings??data.p??data;
   const branch=a.branch??au.branch??data.branch;
   const cfg=code==='cuff'?cfgCuff(native):code==='time'?cfgTime(native):code==='roll'?cfgRoll(native,branch):cfgStent(native);
   const fingerprint=code+JSON.stringify(cfg);
   if(fingerprint!==key||!live){
     release();const engine=code==='roll'?globalThis.RMF:code==='time'?globalThis.T4:
       code==='stent'&&typeof StentBench!=='undefined'?StentBench:undefined;
     live=(code==='cuff'?makeCuff:code==='time'?makeTime:code==='roll'?makeRoll:makeStent)(T,p,cfg,section,engine);
     live.root.name=profile;unit.add(live.root);key=fingerprint;lastRun='';
   }
   const phase=a.phaseId??au.phaseId??data.phaseId??'',n=code==='roll'?live.seq.length:code==='cuff'?11:code==='time'?13:8;
   const match=typeof phase==='string'&&phase.match(/^(?:time|cuff|stent)-(\d+)$/);
   const resolved=code==='roll'&&typeof phase==='string'?live.seq.indexOf(phase.replace(/^roll-/,'')):match?Number(match[1])-1:-1;
   const i=resolved>=0?Math.min(n-1,resolved):Math.round(val(a.stage??au.deviceStage??data.stage,0,0,n-1));
   const progress=val(a.progress,0,0,1);
   const u=au.verified===false?0:Math.round(64*smooth((progress-.57)/.24))/64;
   const state=i+':'+u;
   // The outer group may be hidden or transformed by the machine transfer renderer;
   // always restore visibility, but don't remesh identical frames.
   if(lastRun===state){
     group.visible=last.visible;return last;
   }
   lastRun=state;const out=live.run(i,u);
   const invisible=out.shape==='none'||live.nodes.every(m=>!m.visible);
   if(invisible){group.visible=false;return last={...blank,profile,stage:i,...out,shape:'none',visible:false};}
   // Bounds are computed in the article's own millimetre coordinate space,
   // independent of the outer machine/chuck's position, tilt and stage scale.
   const b=new T.Box3(),qb=new T.Box3(),m4=new T.Matrix4();
   live.root.traverseVisible(o=>{if(!o.geometry)return;m4.identity();
     for(let q=o;q&&q!==live.root;q=q.parent){q.updateMatrix();m4.premultiply(q.matrix);}
     b.union(qb.copy(o.geometry.boundingBox).applyMatrix4(m4));});
   if(b.isEmpty()){group.visible=false;return last={...blank,profile,stage:i};}
   const dims=b.getSize(new T.Vector3()),mid=b.getCenter(new T.Vector3()),maxDim=Math.max(dims.x,dims.y,dims.z,1e-6);
   // Final bounds may legitimately shrink after a carrier exit, trim or fold.
   const scale=section?.070/maxDim:.001;unit.scale.setScalar(scale);unit.position.set(-mid.x*scale,-b.min.y*scale,-mid.z*scale);
   group.visible=true;
   return last={...blank,...out,visible:true,profile,stage:i,teaching3d:true,
    widthMm:maxDim,authoredWidthMm:undefined,substrateThicknessMm:dims.y,thicknessMm:dims.y,
    nativeOutlineLengthMm:dims.z,nativeOutlineWidthMm:dims.x,physicalBoundsMm:[dims.x,dims.y,dims.z],
    layerCount:1,layers:['Assembled article (component view)'],canExplode:false,exploded:0,
    explodeBlockedReason:'The device view preserves conductor, hinge, lumen and package relationships.',
    scaleNote:out.scaleNote+(section?' Magnified view; thin-film and fine-lead relief may be exaggerated.':'')};
 }
 function dispose(){if(disposed)return;disposed=true;release();for(const m of Object.values(p))m.dispose();group.clear();group.visible=false;last={...blank};}
 group.visible=false;return {group,update,dispose};
}
