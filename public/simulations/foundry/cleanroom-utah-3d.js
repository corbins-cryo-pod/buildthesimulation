/**
 * The actual authored D00 reference geometry from the standalone Utah lesson,
 * NOT production Utah / Blackrock masks, sharpening recipe or grade.
 * D00 archive SHA-256 e2c7fab76724840118fc033618b44ad45dd78ea68a126f7ce86b346a37d969aa.
 * D00 plan SHA-256 6ba6555e7606c6e05807bf2108c545252e07d348a98edc91861b2ad3dfe68d63.
 * D03 r4 SHA-256 45deabf8a3921ff0a9025c80c8091e9084d823f89561c2d71283fb7722f5b70d.
 * See https://buildthesimulation.com/simulations/utah-array-fabrication/
 * Jones et al., Ann Biomed Eng 20 (1992), doi:10.1007/BF02368134, and
 * US5215088A, figs. 6–9, supply historical context; the paper reports
 * the 4.2 mm square and 100 sites, but the exact enforced profile is D00’s. SI metres, Y-up; bottom of the seated object is Y=0.
 */
export const utahReference=Object.freeze({
  rows:10,columns:10,widthUm:4200,pitchUm:400,thicknessUm:1800,
  shankHeightUm:1500,kerfUm:50,roughWidthUm:350,pedestalHeightUm:100,
  rootDiameterUm:80,tipDiameterUm:10,rearDepthUm:400,frontMarkDiameterUm:10,backPadWidthUm:200,
});
const U=utahReference,um=1e-6,half=U.widthUm/2;
const centers=Array.from({length:10},(_,i)=>(i-4.5)*U.pitchUm);
const grooves=Array.from({length:9},(_,i)=>(i-4)*U.pitchUm);
const clamp=x=>Math.min(1,Math.max(0,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const scenarios=new Set(['nominal','face-bridge','off-face','mirror','shared','missing']);

// Nine stripes along one direction, ten *disjoint* segments of each stripe
// along the other. Kerf crossings have one material/volume, never two.
const intervals=centers.map((_,i)=>[
  i===0?-half:grooves[i-1]+U.kerfUm/2,
  i===9?half:grooves[i]-U.kerfUm/2,
]);
const cells=[];
for(const [zl,zh] of intervals)for(const [xl,xh] of intervals)cells.push([(xl+xh)/2,(zl+zh)/2,xh-xl,zh-zl]);
const strips=grooves.map(x=>[x,0,U.kerfUm,U.widthUm]);
for(const z of grooves)for(const [xl,xh]of intervals)strips.push([(xl+xh)/2,z,xh-xl,U.kerfUm]);
const kerfAreaUm2=strips.reduce((a,s)=>a+s[2]*s[3],0);
const tag=(r,c)=>'R'+String(r+1).padStart(2,'0')+'C'+String(c+1).padStart(2,'0');

/**
 * One stable, reusable workpiece for this lane ONLY; the separate Utah/Slant
 * comparison must not inherit its post shape or geometry. Rendering a native
 * comparison is not evidence that a stylus, saw, or a real rounding process
 * physically manufactured it. Does not advance or solve the native lesson.
 */
export function makeUtahWorkpiece(T,{section=false}={}){
  const group=new T.Group();
  group.name=section?'Utah D00 geometric witness · comparison':'Utah D00 · same authored 100-site workpiece';
  const frame=new T.Group(),body=new T.Group();
  group.add(frame);frame.add(body);frame.position.y=.5*U.thicknessUm*um;body.position.y=-frame.position.y;
  const geos=new Set(),mats=new Set(),instances=[];
  const geo=g=>(geos.add(g),g),mat=props=>{const m=new T.MeshStandardMaterial(props);mats.add(m);return m;};
  const si=mat({color:0x748f9f,roughness:.38,metalness:.42});
  const roughSi=mat({color:0x748f9f,roughness:.40,metalness:.40,flatShading:true});
  const gl=mat({color:0x62c1ba,roughness:.24,metalness:.1,emissive:0x123633,emissiveIntensity:.32});
  // Face marks are diagram annotations, not a speculative metallization film.
  const annotation=mat({color:0xedb965,emissive:0x65431d,emissiveIntensity:.36,roughness:.5});
  const rejected=mat({color:0xe68b73,emissive:0x51251e,emissiveIntensity:.28,roughness:.54});
  const box=geo(new T.BoxGeometry(1,1,1));box.translate(0,.5,0);
  const matrix=new T.Matrix4();
  function inst(g,m,items,name){
    const a=new T.InstancedMesh(g,m,items.length);
    a.name=name;a.frustumCulled=false;body.add(a);instances.push(a);
    for(let i=0;i<items.length;i++){
      const [x,z,w,l]=items[i];
      matrix.makeScale(w*um,1,l*um);matrix.setPosition(x*um,0,z*um);a.setMatrixAt(i,matrix);
    }
    a.instanceMatrix.needsUpdate=true;
    // Static X/Z instances, dynamic overall Y scaling/offset; material occupancy
    // below a rear groove floor is actual empty space or glass, not tinted Si.
    a.computeBoundingBox();a.computeBoundingSphere();
    return a;
  }
  const siliconCells=inst(box,si,cells,'Exact silicon cell bases · outer margin retained');
  const siliconStrip=inst(box,si,strips,'Silicon remaining above the rear relief');
  const glassStrip=inst(box,gl,strips,'Flush glass restricted to committed rear relief');
  function height(mesh,lo,hi){
    mesh.visible=hi-lo>1e-6;
    mesh.position.y=lo*um;mesh.scale.y=Math.max(0,hi-lo)*um;
  }

  // One shared morphable closed solid; 100 IDs retain their original centers.
  // 24 azimuth segments include all four exact rough-square corners. The
  // rounded comparator has a straight 100 µm pedestal and a linear 1400 µm
  // taper from 80 µm base diameter to the 10 µm distal face (not a sharp cone).
  const az=24,rows=3;
  const coords=new Float32Array(((rows+2)*az+2)*3),attr=new T.BufferAttribute(coords,3);
  const pinGeo=geo(new T.BufferGeometry());pinGeo.setAttribute('position',attr);
  const index=[];
  for(let k=0;k<2;k++)for(let i=0;i<az;i++){
    const a=k*az+i,b=k*az+(i+1)%az,c=a+az,d=b+az;
    index.push(a,c,b,b,c,d);
  }
  // Split cap from wall vertices: tip flats must not be smooth-shaded domes.
  const lowerCap=rows*az,upperCap=(rows+1)*az,bottom=(rows+2)*az,top=bottom+1;
  for(let i=0;i<az;i++){const j=(i+1)%az;index.push(bottom,lowerCap+i,lowerCap+j,top,upperCap+j,upperCap+i);}
  pinGeo.setIndex(index);
  const pins=new T.InstancedMesh(pinGeo,si,100);pins.name='100 physical posts · one instanced mesh';
  pins.frustumCulled=false;instances.push(pins);body.add(pins);
  const ids=[];
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    matrix.makeTranslation(centers[c]*um,0,centers[r]*um);pins.setMatrixAt(10*r+c,matrix);ids.push(tag(r,c));
  }
  pins.userData.siteIds=ids;pins.instanceMatrix.needsUpdate=true;
  let lastShape=-1;
  function profile(f){
    if(Math.abs(f-lastShape)<1e-7)return;lastShape=f;
    for(let k=0;k<rows;k++)for(let i=0;i<az;i++){
      const theta=i*Math.PI*2/az,cs=Math.cos(theta),sn=Math.sin(theta);
      const square=.5*U.roughWidthUm/Math.max(Math.abs(cs),Math.abs(sn));
      const radius=square*(1-f)+.5*(k===2?U.tipDiameterUm:U.rootDiameterUm)*f;
      const y=k===0?0:k===1?U.pedestalHeightUm:U.shankHeightUm;
      attr.setXYZ(k*az+i,radius*cs*um,y*um,radius*sn*um);
    }
    for(let i=0;i<az;i++){
      attr.setXYZ(lowerCap+i,attr.getX(i),0,attr.getZ(i));
      attr.setXYZ(upperCap+i,attr.getX(2*az+i),U.shankHeightUm*um,attr.getZ(2*az+i));
    }
    pins.material=f>.999?si:roughSi;
    attr.setXYZ(bottom,0,0,0);attr.setXYZ(top,0,U.shankHeightUm*um,0);
    attr.needsUpdate=true;pinGeo.computeVertexNormals();pinGeo.computeBoundingBox();pinGeo.computeBoundingSphere();
    pins.computeBoundingBox();pins.computeBoundingSphere();
  }
  profile(0);
  function markGeo(){
    const g=geo(new T.CylinderGeometry(.5,.5,1,20));
    g.translate(0,.5,0);return g;
  }
  const markItems=ids.map((_,i)=>[centers[i%10],centers[Math.floor(i/10)],1,1]);
  const topMarks=inst(markGeo(),annotation,markItems,'Front circular face annotations · not electrodes');
  const backMarks=inst(box,annotation,markItems,'Back square face annotations · not metal pads');
  let lastAnnotation='';
  function labels(scenario){
    if(lastAnnotation===scenario)return;
    lastAnnotation=scenario;
    const topWidth=scenario==='off-face'?11:U.frontMarkDiameterUm;
    const backWidth=scenario==='face-bridge'?420:U.backPadWidthUm;
    for(let i=0;i<100;i++){
      const [x,z]=markItems[i];
      for(const [m,w]of [[topMarks,topWidth],[backMarks,backWidth]]){
        matrix.makeScale(w*um,1,w*um);matrix.setPosition(x*um,0,z*um);m.setMatrixAt(i,matrix);
      }
    }
    topMarks.material=scenario==='off-face'?rejected:annotation;
    backMarks.material=scenario==='face-bridge'?rejected:annotation;
    topMarks.instanceMatrix.needsUpdate=true;backMarks.instanceMatrix.needsUpdate=true;
    topMarks.computeBoundingBox();backMarks.computeBoundingBox();
  }
  let dead=false;
  function update(opts={}){
    if(dead)return null;
    const authored=opts.authored||{},i=opts.stage??authored.utahStage;
    const valid=Number.isInteger(i)&&i>=0&&i<=4;
    if(!valid){group.visible=false;return {shape:'none',activeFeature:'none'};}
    group.visible=opts.enabled!==false;
    const progress=Number.isFinite(opts.progress)?clamp(opts.progress):0;
    const run=opts.blocked||opts.nativeHold||authored.verified===false?0:smooth((progress-.57)/.24);
    const phase=i+run,rear=U.rearDepthUm*clamp(phase),fill=clamp(phase-1);
    const cut=clamp(phase-2),rounded=clamp(phase-3);
    const frontCeil=U.thicknessUm-U.shankHeightUm*cut; // floor measured from back plane.
    height(siliconCells,0,frontCeil);
    height(siliconStrip,rear,frontCeil);
    const glassLo=rear*(1-fill),glassHi=Math.min(rear,frontCeil);
    height(glassStrip,glassLo,glassHi);
    profile(rounded);
    pins.visible=cut>1e-7;pins.position.y=frontCeil*um;pins.scale.y=cut;
    const chosen=typeof opts.dataset==='string'?opts.dataset:opts.dataset?.scenario??authored.scenario??'nominal';
    const scenario=scenarios.has(chosen)?chosen:'nominal';
    labels(scenario);
    // Native finish compares marks and a logical net table; no lead wires are added.
    topMarks.visible=backMarks.visible=phase>=4.5;
    // Annotations float one micrometre outside the surface solely to avoid z-fighting.
    topMarks.position.y=(U.thicknessUm+1)*um;topMarks.scale.y=.5*um;
    backMarks.position.y=-1.5*um;backMarks.scale.y=.5*um;
    const rearView=i<=1?1:i===2?1-smooth(progress/.32):0;
    frame.rotation.z=Math.PI*rearView;
    // Rotate about specimen centre; lift its envelope slightly during the turnover,
    // never intersect the workholding stage.
    frame.position.y=(Math.abs(Math.sin(frame.rotation.z))*U.widthUm*.5+
      Math.abs(Math.cos(frame.rotation.z))*U.thicknessUm*.5)*um;
    const feat=phase>=4.5?'face-annotations':rounded>.999?'tapered-100-posts':rounded>0?'post-profile-comparison':
      cut>0?'rough-100-posts':fill>0?'rear-glass-grid':rear>0?'rear-grid':'blank';
    const materialHeight=Math.max(0,glassHi-glassLo);
    const out={
      shape:'die',activeFeature:feat,face:rearView>.5?'rear':'front',widthMm:U.widthUm/1000,
      substrateThicknessMm:U.thicknessUm/1000,thicknessMm:U.thicknessUm/1000,authoredWidthMm:4.2,
      authoredThickness:true,stage:i,progress,showingComparison:section,
      siteCount:100,visiblePosts:pins.visible?100:0,shapeBlend:rounded,kerfCount:rear>0?18:0,
      rearRemovalUm:rear,frontDepthUm:U.shankHeightUm*cut,
      glassThicknessUm:materialHeight,glassVolumeUm3:materialHeight*kerfAreaUm2,
      profileSource:'Native D00 authored reference; not vendor tooling or an as-built array',
      logicalLabels:topMarks.visible?100:0,physicalLeadEdges:0,scenario,
      nativeOutline:true,nativeSiteCount:100,
    };
    group.userData.utah=out;return out;
  }
  function dispose(){
    if(dead)return;dead=true;group.removeFromParent();group.clear();
    for(const m of instances)m.dispose?.();for(const g of geos)g.dispose();for(const m of mats)m.dispose();
  }
  update({stage:0,progress:0});
  return {group,update,dispose};
}
