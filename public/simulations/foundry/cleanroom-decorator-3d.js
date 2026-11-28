/**
 * Continuous, metre-scale teaching cleanroom. Geometry describes the exhibition
 * space, NOT the original foundry, its environmental class or a qualified utility.
 * All materials, reflection fields and sign lettering are generated locally.
 *
 * Coordinates: tools at (4.5 * bay, 0, 0), service wall to -Z, open corridor +Z.
 * Camera-side walls cut away from outside; the room stays closed inside.
 * Bay components share prebatched meshes/materials; changing the active station
 * does not recreate the room or allocate a render target.
 */
const DEFAULT_PITCH = 4.5;
const DEPTH_BACK = 3.0;
const DEPTH_FRONT = 6.9;
const H = 3.72;
const WING = 5.4; // unoccupied vestibule at either end of the equipment row.
const frost = Object.freeze({
  coat: '#e0b667', pattern: '#e0b667', deposit: '#87bdb5', etch: '#87bdb5',
  dice: '#acd0c0', assemble: '#d4ad78', measure: '#9dc4da', inspect: '#9dc4da',
  handoff: '#bcc2aa', clean: '#95bcb6', heat: '#dcb887',
});
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi,v));
const finite = (v,fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const smooth = (a,b,x) => { const s = clamp((x-a)/(b-a),0,1); return s*s*(3-2*s); };
const frac = x => x-Math.floor(x);
function seedRandom(seed=43) {
  let a = seed>>>0;
  return () => {
    a = (a*1664525+1013904223)>>>0;
    return a / 4294967296;
  };
}
function dotUV(u,v,cu,cv,w,h,c,s) {
  const dx=(u-cu),dy=(v-cv);
  const a=(dx*c-dy*s)/w,b=(dx*s+dy*c)/h;
  return Math.max(0,1-a*a-b*b);
}
function makeEpoxy(T) {
  // A sealed epoxy surface with small mineral chips and faint elongate roller
  // streaks. Physical-scale UVs keep the flake size independent of room length.
  const N=256,rng=seedRandom(1384),count=N*N;
  const aggregate=new Float32Array(count), rough=new Uint8Array(count*4);
  for(let i=0;i<count;i++) aggregate[i]=(rng()-.5)*1.9;
  for(let n=0;n<3750;n++){
    const x=rng()*N,y=rng()*N,r=.4+rng()*1.45,dir=rng()*Math.PI;
    const w=r*(1+rng()),h=r*(.45+.5*rng()),ink=(rng()<.66?4.8:-6.2)*(.3+.7*rng());
    const ceil=Math.ceil(w+h)+1,c=Math.cos(dir),s=Math.sin(dir);
    for(let yy=Math.floor(y-ceil);yy<=y+ceil;yy++)for(let xx=Math.floor(x-ceil);xx<=x+ceil;xx++){
      const o=dotUV(xx+.5,yy+.5,x,y,w,h,c,s);
      if(o>0)aggregate[((yy+N)%N)*N+((xx+N)%N)]+=ink*o;
    }
  }
  const color=new Uint8Array(count*4);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const i=y*N+x,k=i*4;
    const seam = Math.min(x,N-1-x,y,N-1-y) < 1 ? -4.2 : 0;
    const roll=.5*Math.sin(x/N*Math.PI*10)+.4*Math.cos(y/N*Math.PI*8)+.35*Math.sin((x+y)/N*Math.PI*4);
    const n=aggregate[i]+roll+seam;
    color[k]=84+n;color[k+1]=105+n*1.03;color[k+2]=103+n*.95;color[k+3]=255;
    const g=clamp(184+aggregate[i]*2.8+roll*2.3+seam*1.2,145,205);
    rough[k]=g;rough[k+1]=g;rough[k+2]=g;rough[k+3]=255;
  }
  const mk=(data,srgb)=>{
    const t=new T.DataTexture(data,N,N,T.RGBAFormat,T.UnsignedByteType);
    t.name=srgb?'Satin teal epoxy · mineral aggregate':'Epoxy · microroughness';
    t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
    t.generateMipmaps=true;t.anisotropy=2;
    if(srgb)t.colorSpace=T.SRGBColorSpace;
    t.needsUpdate=true;
    return t;
  };
  return [mk(color,true),mk(rough,false)];
}
function makeBrushedFinish(T) {
  // Local mill finish: parallel fine striation roughness, not dark stripes in
  // the albedo. The lighting and reflected windows still determine the colour.
  const n=128,h=64,data=new Uint8Array(n*h*4),rng=seedRandom(3155);
  for(let y=0;y<h;y++){
    const strand=204+(rng()-.5)*57,phase=rng()*Math.PI*2;
    for(let x=0;x<n;x++){
      const v=clamp(strand+6*Math.cos(x/n*Math.PI*4+phase)+(rng()-.5)*12,145,251),i=4*(y*n+x);
      data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;
    }
  }
  const t=new T.DataTexture(data,n,h,T.RGBAFormat,T.UnsignedByteType);t.name='Brushed stainless · satin roughness';
  t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.anisotropy=4;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;
  return t;
}
function makeStudioField(T) {
  // Compact signed-direction HDR environment for the existing PBR metal and
  // silicon. It contains real angular lights and a low floor bounce, not a
  // painted reflection of a fictitious machine. No screen-space reflection pass.
  const w=192,h=96,bytes=new Uint16Array(w*h*4),half=T.DataUtils.toHalfFloat;
  const softRect=(a,b,c,d,wx,wy,k=.1) => (1-smooth(wx*(1-k),wx*(1+k),Math.abs(a-c)))*(1-smooth(wy*(1-k),wy*(1+k),Math.abs(b-d)));
  for(let v=0;v<h;v++)for(let u=0;u<w;u++){
    const theta=(v+.5)/h*Math.PI,phi=(u+.5)/w*2*Math.PI-Math.PI;
    const dx=Math.sin(theta)*Math.cos(phi),dy=-Math.cos(theta),dz=Math.sin(theta)*Math.sin(phi);
    const up=smooth(-.25,.7,dy);
    let r=.105+.13*up,g=.135+.15*up,b=.133+.14*up;
    if(dy>.03){
      // Directional patches from linear diffusers on an imaginary ceiling.
      const x=dx/dy,z=dz/dy;
      for(const j of [-1.55,1.2]){
        const l=softRect(x,z,j,.05,.13,2.15,.14)+.6*softRect(x,z,j,-2.7,.13,.45,.16);
        r+=5.1*l;g+=5.5*l;b+=5.4*l;
      }
      const n=softRect(x,z,.05,.0,.65,.5,.18);
      r+=.52*n;g+=.58*n;b+=.59*n;
    }
    if(dz<-.25){
      const x=dx/-dz,y=dy/-dz;
      const win=softRect(x,y,-.20,.27,1.25,.28,.12);
      r+=1.20*win;g+=.91*win;b+=.51*win;
    } else if(dz>.12){
      const x=dx/dz,y=dy/dz;
      const win=softRect(x,y,.23,.12,.88,.33,.20);
      r+=.61*win;g+=.89*win;b+=.92*win;
    }
    const i=(v*w+u)*4;bytes[i]=half(r);bytes[i+1]=half(g);bytes[i+2]=half(b);bytes[i+3]=half(1);
  }
  const t=new T.DataTexture(bytes,w,h,T.RGBAFormat,T.HalfFloatType);
  t.name='Cleanroom light field · local synthetic HDR';t.mapping=T.EquirectangularReflectionMapping;
  t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;
  return t;
}
function makeShadow(T) {
  const n=64,arr=new Uint8Array(n*n*4);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=Math.abs((i+.5)/n*2-1),y=Math.abs((j+.5)/n*2-1);
    // Smooth rectangular footprint, not meant to reproduce an instrument's feet.
    const radius=(x**3.5+y**3.5)**(1/3.5);
    const offset=((x*.98)**3.1+(y*1.04)**3.1)**(1/3.1);
    const a=(1-smooth(.23,.98,radius))*.29+(1-smooth(.27,.69,offset))*.15;
    const p=(j*n+i)*4;arr[p]=32;arr[p+1]=46;arr[p+2]=42;arr[p+3]=Math.round(a*255);
  }
  const t=new T.DataTexture(arr,n,n,T.RGBAFormat,T.UnsignedByteType);
  t.name='Soft architectural contact tone';t.minFilter=t.magFilter=T.LinearFilter;t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;
  return t;
}

// Geometry combiner for the architecture only. Primitive transform and tint are
// baked once; each bay then reuses a handful of culled mesh instances.
function builder(T,cubes,cylinder) {
  const buckets=new Map(),v=new T.Vector3(),n=new T.Vector3(),m=new T.Matrix4(),m3=new T.Matrix3();
  const pos=new T.Vector3(),q=new T.Quaternion(),e=new T.Euler(),scale=new T.Vector3(),color=new T.Color();
  const push=(material,geom,px,py,pz,sx,sy,sz,tint,ax=0,ay=0,az=0)=>{
    let row=buckets.get(material);if(!row){row={p:[],n:[],c:[],uv:material.roughnessMap?[]:null};buckets.set(material,row);}
    m.compose(pos.set(px,py,pz),q.setFromEuler(e.set(ax,ay,az)),scale.set(sx,sy,sz));
    m3.getNormalMatrix(m);color.set(tint);
    const point=geom.attributes.position,normal=geom.attributes.normal,idx=geom.index,ct=idx?idx.count:point.count;
    for(let j=0;j<ct;j++){
      const i=idx?idx.getX(j):j;
      v.fromBufferAttribute(point,i).applyMatrix4(m);row.p.push(v.x,v.y,v.z);
      n.fromBufferAttribute(normal,i).applyNormalMatrix(m3);row.n.push(n.x,n.y,n.z);
      row.c.push(color.r,color.g,color.b);
      if(row.uv){
        // Physical planar UVs on steel: preserve local brush scale on trim,
        // louvers, fittings and any independently placed bay/door panels.
        if(Math.abs(n.y)>.70)row.uv.push(v.x/.29,v.z/.079);
        else if(Math.abs(n.z)>.70)row.uv.push(v.x/.29,v.y/.079);
        else row.uv.push(v.z/.29,v.y/.079);
      }
    }
  };
  const box=(...a)=>push(a[0],cubes,...a.slice(1));
  const tube=(...a)=>push(a[0],cylinder,...a.slice(1));
  const finish=(name)=>{
    const group=new T.Group();group.name=name;
    for (const [material,d] of buckets){
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(d.p,3));
      geo.setAttribute('normal',new T.Float32BufferAttribute(d.n,3));
      geo.setAttribute('color',new T.Float32BufferAttribute(d.c,3));
      if(d.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(d.uv,2));
      geo.computeBoundingSphere();const mesh=new T.Mesh(geo,material);mesh.name=material.name;
      group.add(mesh);
    }
    return group;
  };
  return {box,tube,finish};
}
function labelKind(d) {
  const t=String(d?.effect||d?.kind||'').toLowerCase();
  if(/lith|coat|pattern|mask|exposure/.test(t))return 'pattern';
  if(/attac|bond|assembl|connect/.test(t))return 'assemble';
  if(/inspec|meas|metrol|test|readout/.test(t))return 'measure';
  if(/receiv|handoff|boundar|refer|unknown|custody/.test(t))return 'handoff';
  return ['deposit','etch','dice','clean','heat'].find(k=>t.includes(k))||'process';
}
function makeLabel(T,index,details) {
  const doc=typeof document!=='undefined'?document:null;
  if(!doc||typeof doc.createElement!=='function')return null;
  const c=doc.createElement('canvas');c.width=1024;c.height=156;
  const g=c.getContext('2d');if(!g)return null;
  const bay=String(index+1).padStart(2,'0'),category=labelKind(details);
  const ink=frost[category]||'#b7cfbe';
  g.fillStyle='#203c3e';g.fillRect(0,0,1024,156);
  g.fillStyle=ink;g.fillRect(0,0,10,156);
  g.fillStyle='#dfdfc9';g.fillRect(182,20,1.5,115);
  g.font='600 18px Arial, sans-serif';g.fillStyle='#b0c4b9';g.fillText('B A Y',32,44);
  g.font='600 64px Arial, sans-serif';g.fillStyle='#f3ead2';g.fillText(bay,29,115);
  g.font='600 16px Arial, sans-serif';g.fillStyle=ink;g.fillText('F O U N D R Y    /    C L E A N R O O M',205,46);
  const title=String(details?.title||details?.machine||'Process station').trim().slice(0,256).replace(/\s+/g,' ');
  let text=title,font=43;g.font='500 '+font+'px Arial, sans-serif';
  while(font>27&&g.measureText(text).width>782){font--;g.font='500 '+font+'px Arial, sans-serif';}
  if(g.measureText(text).width>782){while(text.length>1&&g.measureText(text+'…').width>782)text=text.slice(0,-1);text=text.trimEnd()+'…';}
  g.fillStyle='#f0ecd9';g.fillText(text,205,111);
  const t=new T.CanvasTexture(c);t.name='Bay '+bay+' · '+title;t.colorSpace=T.SRGBColorSpace;
  t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;
  return t;
}
function ceilingMat(T,warm=false) {
  // Emissive honeycomb filter face; the grille frame and vanes are still solids.
  const n=64,a=new Uint8Array(4*n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const line=(x%8===0||y%16===0),v=line?118:Math.round(187+7*Math.cos(2*Math.PI*x/8));
    const i=4*(y*n+x);a[i]=v+(warm?5:0);a[i+1]=v+2;a[i+2]=v;a[i+3]=255;
  }
  const t=new T.DataTexture(a,n,n,T.RGBAFormat);t.name='HEPA panel · mesh weave';t.wrapS=t.wrapT=T.RepeatWrapping;
  t.repeat.set(4,5);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;
  return t;
}

function makeCeiling(T) {
  // Two 600 × 1,200 nominal tiles per repeat. A wide neutral gasket and fine
  // shallow bevel stay visible in a grazing view without multiplying draw calls.
  const n=256,data=new Uint8Array(n*n*4),rand=seedRandom(84736);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const sx=Math.min(x%128,127-x%128),sy=Math.min(y,255-y),seam=Math.min(sx,sy);
    const grazing=seam===0?-36:seam===1?-15:seam===2?-4:seam===3?2:0;
    const variation=1.8*Math.cos(2*Math.PI*y/n)+(rand()-.5)*2+grazing;
    const off=x>128?1.5:0,i=4*(y*n+x);
    data[i]=153+variation+off;data[i+1]=165+variation+off;
    data[i+2]=156+variation+off;data[i+3]=255;
  }
  const t=new T.DataTexture(data,n,n,T.RGBAFormat);
  t.name='Service ceiling · modular gaskets';t.colorSpace=T.SRGBColorSpace;
  t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.anisotropy=4;
  t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
function makePerimeter(T,cube,cyl,{matte:p,metal:m,lit:l,clearGlass:g}) {
  const metal=0x93a69d,bone=0xbcc8bd,graph=0x425b56,seal=0x697e73;
  const terminal=builder(T,cube,cyl),B=terminal.box,S=terminal.tube;
  // Endwall located well beyond the transfer route. Coordinates are local to
  // the inward-facing surface; the viewer sees a resolved room at both ends.
  const w=DEPTH_FRONT+2.1;
  B(p,0,H/2,-.086,w,H,.164,0xc4cec2);
  B(p,0,.068,.008,w,.136,.050,seal);
  B(m,0,.128,.025,w,.022,.026,metal);
  B(m,0,2.40,-.001,w,.022,.035,0x8c9e93);
  B(p,0,H-.085,-.005,w,.164,.125,0x92a397);
  for(let x=-w/2+.64;x<w/2;x+=1.20)B(p,x,1.91,.0001,.008,3.49,.007,0x97a79d);
  // A flush dual-panel vestibule door with two recessed windows, stop and
  // manual pulls. No operative doors or directional emergency guidance inferred.
  const d=.52;
  B(p,d,1.12,.005,1.96,2.24,.106,graph);
  for(const side of [-1,1]){
    const x=d+side*.467;
    B(p,x,1.105,.069,.915,2.15,.043,0xb4c1b6);
    B(m,x,.315,.097,.817,.40,.012,0x91a397);
    B(p,x,1.64,.10,.56,.705,.035,graph);
    B(m,x,1.64,.117,.530,.676,.018,metal);
    B(p,x,1.64,.127,.496,.641,.014,0x6c8e88);
    B(p,x-side*.136,1.64,.137,.012,.625,.006,0xa4b9aa);
    B(g,x,1.64,.151,.496,.641,.005,0xb6c9c3);
    B(m,x-side*.296,1.038,.126,.055,.166,.024,0x7e9387);
    B(m,x-side*.296,1.038,.166,.019,.113,.061,metal);
  }
  B(p,d,2.27,.021,1.99,.098,.137,0x9aac9f);
  B(p,d,2.57,.006,.85,.178,.045,graph);
  B(m,d+.028,2.578,.031,.43,.028,.009,0xa4b6ab);
  B(l,d-.292,2.58,.037,.055,.051,.014,0xd5c7a6);
  // Flush observation light at the end of the aisle, with stainless reveal and
  // standoff bumper. Far-wall glass and service bulkhead have separate depths.
  const wx=-2.11;
  B(p,wx,1.65,-.004,2.17,1.04,.07,graph);
  B(m,wx,1.65,.039,2.105,.982,.033,metal);
  B(p,wx,1.65,.058,2.046,.922,.026,0x76928c);
  B(p,wx,1.68,.076,2.027,.086,.008,0x658078);
  B(g,wx,1.65,.093,2.032,.918,.010,0xb1cbc0);
  B(m,wx,1.65,.11,.035,.947,.033,metal);
  for(let i=0;i<9;i++)B(p,wx-.91+i*.224,1.51,.12,.091,.019,.007,bone);
  B(m,wx,.715,.11,2.3,.061,.054,metal);
  for(const x of [wx-.9,wx+.9])S(m,x,.713,.060,.041,.102,.041,seal,Math.PI/2);
  // Coherent rear extension between the last equipment bay and the end-wall
  // vestibule. It is purposefully not another operative or numbered machine.
  const bay=builder(T,cube,cyl),W=bay.box;
  W(p,0,H/2,-2.18,WING,H,.164,0xbac6b9);
  W(p,0,.062,-2.075,WING,.125,.063,seal);
  W(m,0,.128,-2.051,WING,.022,.03,metal);
  W(p,0,H-.05,-2.13,WING,.145,.245,0x81978c);
  W(m,0,2.39,-2.073,WING,.016,.032,0x9eaaa0);
  for(let x=-2.20;x<2.6;x+=1.2)W(p,x,1.82,-2.091,.010,3.34,.010,0x8ea195);
  const sx=.54;
  W(p,sx,1.62,-2.08,3.54,1.24,.086,graph);
  W(m,sx,1.62,-2.032,3.49,1.195,.041,metal);
  W(p,sx,1.62,-2.006,3.409,1.103,.029,0x68918c);
  W(p,sx,1.82,-1.984,3.407,.14,.012,0x72988f);
  W(p,sx,1.32,-1.983,3.402,.16,.012,0x567b73);
  W(g,sx,1.62,-1.96,3.408,1.099,.009,0xb5cfc1);
  for(const x of [sx-.57,sx+.57])W(m,x,1.62,-1.934,.046,1.137,.044,metal);
  for(let i=0;i<13;i++)W(p,sx-1.55+i*.259,1.51,-1.931,.10,.018,.005,bone);
  W(m,sx,1.044,-1.96,3.53,.039,.120,metal);
  W(p,-1.91,1.57,-2.038,.405,.48,.076,0x93a59c);
  W(p,-1.91,1.61,-1.995,.271,.22,.024,0x788f87);
  W(l,-2.004,1.45,-1.978,.037,.023,.009,0xc4caa5);
  W(p,0,-.002,1.14,WING-.01,.005,.023,0xaeb6a0);
  W(p,0,-.001,1.21,WING-.01,.005,.013,0x73887f);
  // Full-height front observation partition: a solid sill/header with two
  // translucent laminates, protection dots, real jambs and a service aisle
  // beyond. Open area, not a photograph or an alpha-cutout wall.
  const frontage=builder(T,cube,cyl),F=frontage.box;
  const fw=DEFAULT_PITCH,fylo=.78,fyhi=2.70;
  F(p,0,fylo/2,-.055,fw,fylo,.11,0xb7c4b9);
  F(p,0,(H+fyhi)/2,-.055,fw,H-fyhi,.11,0xb5c3b8);
  F(p,0,.059,.018,fw,.118,.066,seal);
  F(m,0,fylo+.008,.023,fw,.067,.14,metal);
  F(m,0,fyhi-.010,.023,fw,.057,.13,metal);
  for(const x of [-fw*.5+.023,-.75,.75,fw*.5-.023]){
    F(p,x,(fylo+fyhi)/2,.012,.048,fyhi-fylo,.108,graph);
    F(m,x,(fylo+fyhi)/2,.062,.035,fyhi-fylo,.035,metal);
  }
  F(g,0,(fylo+fyhi)/2,-.004,fw-.025,fyhi-fylo-.048,.010,0xb8d3c9);
  for(let i=0;i<12;i++)F(p,-fw/2+.19+i*.375,1.48,.029,.120,.020,.007,0xbacbbb);
  // Unoccupied parallel corridor, with its wall beyond the entry glazing.
  F(p,0,1.69,-.88,fw,3.45,.10,0x859c92);
  F(p,0,1.25,-.81,fw,.34,.027,0x738c82);
  F(m,-fw*.25,1.71,-.78,.029,2.04,.041,0x96a89c);
  F(m,fw*.25,1.71,-.78,.029,2.04,.041,0x96a89c);
  F(l,0,2.49,-.78,fw-.14,.045,.026,0xcad5bb);
  return {end:terminal.finish('Cleanroom vestibule · pressure door and sidelight'),
    wing:bay.finish('Cleanroom vestibule · observation wall'),front:frontage.finish('Observer corridor · glazing and frame')};
}

export function decorateRoom(T,scene) {
  if(!T?.BoxGeometry||!scene?.add)throw new Error('A Three.js namespace and scene are required.');
  const root=new T.Group();root.name='Continuous Cleanroom | architectural environment';
  root.userData={role:'cleanroom-architecture',units:'metres',reconstruction:'Illustrative teaching facility; not original fabrication site geometry.'};
  scene.add(root);
  const env=(!scene.environment&&T.DataUtils?.toHalfFloat)?makeStudioField(T):null;
  const oldEnv=scene.environment||null,oldIntensity=scene.environmentIntensity;
  if(env){scene.environment=env;scene.environmentIntensity=.75;}
  const textures=[],materials=[];if(env)textures.push(env);
  const standard=(label,params={})=>{const m=new T.MeshStandardMaterial(params);m.name=label;materials.push(m);return m;};
  const plain=(label,params={})=>{const m=new T.MeshBasicMaterial(params);m.name=label;materials.push(m);return m;};
  const matte=standard('Powder-coated panels + hardware',{vertexColors:true,roughness:.64,metalness:.1});
  const brushed=makeBrushedFinish(T);textures.push(brushed);
  const metal=standard('Satin stainless millwork',{vertexColors:true,roughness:.40,roughnessMap:brushed,metalness:.70,envMapIntensity:1.04});
  const lit=plain('Luminaires and wayfinding',{vertexColors:true,toneMapped:false});
  const clearGlass=standard('Vision glazing',{vertexColors:true,metalness:.14,roughness:.1,envMapIntensity:1,
    transparent:true,opacity:.235,depthWrite:false,side:T.FrontSide});
  const cube=new T.BoxGeometry(1,1,1),cyl=new T.CylinderGeometry(.5,.5,1,12);
  const [floorColor,floorRough]=makeEpoxy(T),ffut=ceilingMat(T),shadowTexture=makeShadow(T);
  textures.push(floorColor,floorRough,ffut,shadowTexture);
  const floorMaterial=standard('ESD satin epoxy',{color:0xffffff,map:floorColor,roughness:.50,roughnessMap:floorRough,metalness:.12,envMapIntensity:1.35});
  const floorGeo=new T.PlaneGeometry(1,1);floorGeo.rotateX(-Math.PI/2);
  const floor=new T.Mesh(floorGeo,floorMaterial);floor.name='Seamless cleanroom floor';
  floor.position.y=-.008;root.add(floor);
  const filterMat=standard('Ceiling filter media',{color:0xffffff,map:ffut,roughness:.8,side:T.FrontSide});
  const filterGeo=new T.PlaneGeometry(1.02,.60);filterGeo.rotateX(Math.PI/2);
  const shadowMat=plain('Localized ambient floor tone',{map:shadowTexture,transparent:true,depthWrite:false,opacity:.72});
  const shadowGeo=new T.PlaneGeometry(2.5,1.95);shadowGeo.rotateX(-Math.PI/2);
  const signGeo=new T.PlaneGeometry(2.28,.347);
  const templates=new Map(),bays=new Map();let focus=null,dead=false;
  // The suspended ceiling's *underside* is visible from below. Its shell has no
  // artificial top face: a camera lifted above the room can still inspect the
  // process, instead of colliding with an opaque roof. The recessed fittings
  // hanging below the shell are always truly three dimensional.
  const ceilingAlbedo=makeCeiling(T);textures.push(ceilingAlbedo);
  const ceilingMaterial=standard('Clip-in ceiling · pressed metal and gasket',{
    color:0xffffff,map:ceilingAlbedo,roughness:.67,metalness:.12,side:T.FrontSide});
  const ceilingGeo=new T.PlaneGeometry(1,1);ceilingGeo.rotateX(Math.PI/2);
  const ceiling=new T.Mesh(ceilingGeo,ceilingMaterial);ceiling.name='Cutaway / inward facing clean ceiling';root.add(ceiling);
  const perimeter=new T.Group();perimeter.name='Outer service and gowning vestibules';root.add(perimeter);
  const shellParts=makePerimeter(T,cube,cyl,{matte,metal,lit,clearGlass});
  const wingL=shellParts.wing.clone(true),wingR=shellParts.wing.clone(true);
  const endL=shellParts.end.clone(true),endR=shellParts.end.clone(true);
  endL.rotation.y=Math.PI/2;endR.rotation.y=-Math.PI/2;
  const front=new T.Group();front.name='Operator-side double-height glazing / exterior cutaway';
  const slab=new T.Mesh(cube,standard('Raised floor substructure',{color:0x546963,metalness:.28,roughness:.54}));
  slab.name='Raised-access floor edge';
  perimeter.add(wingL,wingR,endL,endR,front,slab);perimeter.visible=ceiling.visible=false;
  let frontCapacity=0;
  function fitFrontage(minX,maxX,z) {
    const n=Math.max(1,Math.ceil((maxX-minX)/DEFAULT_PITCH));
    if(n>frontCapacity){
      for(const child of [...front.children]){front.remove(child);child.dispose();}
      frontCapacity=2**Math.ceil(Math.log2(n));
      for(const src of shellParts.front.children){
        const mesh=new T.InstancedMesh(src.geometry,src.material,frontCapacity);
        mesh.name=src.name;front.add(mesh);
      }
    }
    // All bays on the observer wall share one draw per material across the room.
    // Inward normal for template is local +Z, transformed to world -Z.
    const pitch=(maxX-minX)/n,mat=new T.Matrix4().makeRotationY(Math.PI);
    mat.scale(new T.Vector3(pitch/DEFAULT_PITCH,1,1));
    for(const mesh of front.children){
      mesh.count=n;
      for(let i=0;i<n;i++)mesh.setMatrixAt(i,mat.setPosition(minX+(i+.5)*pitch,0,z));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    }
  }
  // The world owner calls this once after framing each camera, before rendering.
  // No renderer or Scene callbacks are replaced; external timing / diagnostics
  // and WebXR applications can use the standard Three.js event chain untouched.
  const point=new T.Vector3(),vp=new T.Matrix4(),frustum=new T.Frustum(),frontBounds=new T.Box3();
  front.visible=false;
  function setView(cam){
    if(dead||!perimeter.visible||!cam?.isCamera)return;
    cam.getWorldPosition(point);
    // Window, mullion and steel skins all cut out if the camera is outside
    // them. Removing a whole wall from the exterior preserves an unobstructed
    // inspection at maximum zoom; within the gallery all four walls are real.
    endL.visible=point.x>endL.position.x+.15;
    endR.visible=point.x<endR.position.x-.15;
    frustum.setFromProjectionMatrix(vp.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
    front.visible=point.z<frontBounds.min.z-.08&&frustum.intersectsBox(frontBounds);
  }
  function template(amber,door){
    const key=Number(amber)+'/'+Number(door);
    if(templates.has(key))return templates.get(key);
    const b=builder(T,cube,cyl),B=b.box,S=b.tube;
    const p=matte,m=metal,l=lit,g=clearGlass;
    const bone=0xccd3c4,stone=0xa5b4a9,seal=0x435751,lightSteel=0xa9b3aa,shadow=0x425655,
      graphite=0x344b47,cream=0xcbd3c7,back=0x70938b,trim=0x78968f;
    const z=-2.10; // clean, front-of-house wall surface; chases lie beyond it.
    // Secondary service corridor behind vision glazing makes parallax visible.
    B(p,0,1.55,-2.90,DEFAULT_PITCH,.1+3.0,.10,0x8da49a);
    B(p,0,1.55,-2.83,DEFAULT_PITCH,.12,.038,0x4d776f);
    B(p,0,1.41,-2.82,DEFAULT_PITCH,.009,.03,0xbdc9bd);
    B(p,0,2.25,-2.79,DEFAULT_PITCH,.20,.12,0xa6b8ad);
    B(m,-1.6,1.54,-2.76,.048,2.52,.052,0x8da198);
    B(m,1.1,1.54,-2.74,.037,2.51,.045,0x869c92);
    S(m,0,2.14,-2.65,.034,DEFAULT_PITCH,.034,0x8eaca4,0,0,Math.PI/2);
    S(m,0,2.07,-2.67,.024,DEFAULT_PITCH,.024,0x93a69b,0,0,Math.PI/2);
    // Observation windows are not flat images. Distinct depths in the service
    // chase keep pipes, shelving and backlighting moving relative to the glass.
    const backX=door?-1.27:.79;
    B(p,backX,1.48,-2.79,.82,.39,.124,amber?0x9b875b:0x69847e);
    B(p,backX-.20,1.52,-2.70,.28,.22,.057,amber?0xb5a47e:0x8dada1);
    B(p,backX+.16,1.44,-2.70,.27,.11,.053,amber?0x746b57:0x637c78);
    B(m,backX,1.26,-2.70,1.07,.039,.24,amber?0x968f72:0x7d968d);
    // Cove, skirting, and double-skinned modular service panel.
    B(p,0,.052,z+.017,DEFAULT_PITCH,.102,.20,0x61746c);
    B(m,0,.093,z+.082,DEFAULT_PITCH,.022,.045,lightSteel);
    B(p,0,.455,z,DEFAULT_PITCH,.70,.105,stone);
    B(p,0,.91,z-.005,DEFAULT_PITCH,.21,.095,bone);
    B(p,0,2.94,z,DEFAULT_PITCH,1.46,.105,cream);
    // Recessed panel split lines; broader facing only above sight glass.
    for(const x of [-2.22,-.78,.77,2.23]){
      B(p,x,.55,z+.056,.009,.92,.006,0x85968b);
      B(p,x,3.37,z+.053,.009,.64,.010,0x99a499);
    }
    const wx=door?-.55:0,ww=door?2.89:4.08,wlo=1.02,wh=1.20,wy=wlo+wh/2;
    B(p,wx,wlo,z+.036,ww+.16,.07,.22,seal);
    B(m,wx,wlo+.015,z+.095,ww+.15,.035,.13,lightSteel);
    B(m,wx,wlo-.007,z+.13,ww+.16,.012,.12,0xa5b9b0);
    B(p,wx,wlo+wh,z-.02,ww+.15,.072,.16,seal);
    B(m,wx,wlo+wh+.012,z+.049,ww+.15,.035,.075,lightSteel);
    for(const x of [wx-ww/2,wx+ww/2]){
      B(p,x,wy,z, .084,wh,.132,seal);B(m,x,wy,z+.05,.050,wh,.058,lightSteel);
    }
    // Two panes plus narrow solid aluminium mullions; green edge on the jamb.
    B(g,wx,wy,z-.019,ww-.04,wh-.045,.006,amber?0xe8b46b:0xadcac5);
    B(m,wx+.03,wy,z+.020,.042,wh,.072,trim);
    B(p,wx+.064,wy,z+.061,.005,wh,.018,0x4e6e63);
    // A soft amber filter belongs to the *depicted* lithography zone, not every bay.
    if(amber){
      // The amber backing belongs to the *far wall*, not the sight glass.
      // A filter-tone plenum remains behind the steel pipework / service shelf.
      B(p,wx,wy,-2.84,ww-.03,wh+.1,.008,0xb4a478);
      B(l,wx,wy+.408,-2.79,ww-.11,.020,.010,0xddc28b);
      B(m,wx-.83,wy,-2.68,.022,wh-.10,.038,0x9f9e78);
      B(m,wx-.83,wy+.47,-2.64,.065,.04,.055,0x7f8065);
    }
    // Safety manifestation stripes, broken to keep interior depth visible.
    const nMarks=door?8:12;
    for(let j=0;j<nMarks;j++){
      const xx=wx-ww/2+.19+j*(ww-.36)/(nMarks-1);
      B(p,xx,1.46,z-.007,.106,.019,.004,amber?0xd5c18f:0xc8d3c6);
    }
    // Low-return grille: recessed dark base with a stop flange and actual louvers.
    const grilleX=door?-.66:-1.02,gw=1.52;
    B(m,grilleX,.46,z+.061,gw,.375,.033,lightSteel);
    B(p,grilleX,.46,z+.081,gw-.04,.332,.007,graphite);
    for(let j=0;j<11;j++)B(m,grilleX,.318+j*.028,z+.093,gw-.06,.009,.020,0x8c9d93,-.40);
    for(const x of [grilleX-gw/2+.052,grilleX+gw/2-.052]){
      S(m,x,.621,z+.084,.009,.003,.009,0x6b7a71,Math.PI/2);
      S(m,x,.300,z+.084,.009,.003,.009,0x6b7a71,Math.PI/2);
    }
    if(door){
      // A flush service door behind the bay, never in the wafer's walking path.
      const dx=1.61;
      B(p,dx,1.087,z+.080,1.02,2.15,.08,seal);
      B(p,dx,1.089,z+.131,.948,2.08,.04,bone);
      B(m,dx,.278,z+.152,.87,.36,.018,0x93a69b);
      B(p,dx,1.575,z+.153,.47,.70,.027,graphite);
      B(m,dx,1.574,z+.17,.444,.67,.021,lightSteel);
      B(p,dx,1.577,z+.183,.405,.628,.012,0x6e918b);
      B(p,dx,1.59,z+.19,.024,.60,.004,0x8da8a0);
      B(m,dx-.32,1.03,z+.168,.055,.185,.015,0x83968b);
      S(m,dx-.29,1.03,z+.21,.020,.15,.020,0x84978f,0,0,Math.PI/2);
      B(p,dx,2.208,z+.08,1.024,.064,.07,stone);
    }
    // Vertical service raceway, solid quick-connect blanks, identification bands,
    // and stainless kickrail. Utilities are unconnected architectural context.
    const ux=-1.99;
    B(p,ux,1.457,z+.092,.265,2.45,.142,0xbdc6b9);
    B(m,ux-.123,1.46,z+.166,.014,2.44,.026,lightSteel);
    B(m,ux+.123,1.46,z+.166,.014,2.44,.026,lightSteel);
    B(p,ux,1.226,z+.164,.189,.525,.012,0x789088);
    for(let j=0;j<3;j++){
      const yy=1.056+j*.135;
      B(p,ux,yy+.038,z+.179,.12,.016,.008,[0x87a99b,0x6f8c98,0xc6ac78][j]);
      S(m,ux,yy,z+.184,.06,.046,.06,0xa4b6ab,Math.PI/2);
      S(p,ux,yy,z+.211,.033,.009,.033,graphite,Math.PI/2);
    }
    // Number plate mounting body (the individual sign texture is outside the template).
    B(m,0,2.616,z+.081,2.37,.405,.046,0x9baa9f);
    B(p,0,2.616,z+.114,2.306,.363,.027,0x253f3c);
    B(m,0,2.387,z+.061,DEFAULT_PITCH,.012,.032,0x85988a);
    // Ceiling is recessed toward the rear so room / overhead views do not clip.
    // Coated coffers and lights are modeled solids, but no near wall occludes the operator.
    B(p,0,H-.052,z-.11,DEFAULT_PITCH,.125,.28,0x82968e);
    B(m,0,H-.139,z-.063,DEFAULT_PITCH,.029,.18,0x657e78);
    for(const gx of [-1.25,1.25]){
      const cz=-1.15;
      B(p,gx,H-.048,cz,1.12,.09,.71,0xa7b6ab);
      B(m,gx,H-.10,cz,1.079,.02,.652,0x6c837a);
      // Quiet twin-line LED rows around, not over, the virtual machine.
      B(m,gx,H-.047,.11,.239,.093,2.07,0x7f948b);
      B(l,gx,H-.097,.11,.173,.012,2.006,0xe7efe5);
      B(p,gx,H-.107,.11,.012,.008,2.004,0xc4d1c2);
    }
    // Slim ribs announce the repeating module scale at a distance.
    for(const xx of [-2.24,0,2.24]){
      B(m,xx,H+.012,-.61,.032,.034,3.2,0x9baaa0);
    }
    // Cross rails keep the visible filter/LED assemblies physically supported,
    // including in an exterior cutaway where the ceiling's faces are removed.
    for(const zz of [-1.17,.22])B(m,0,H+.023,zz,DEFAULT_PITCH,.034,.038,0x94a79c);
    // Floor striping: deliberately isolated from safety or route validity claims.
    // Paired threshold markings give the moving wafer a stable spatial reference.
    B(p,0,-.002,1.14,4.492,.005,.023,0xb2b9a1);
    B(p,0,-.001,1.21,4.492,.005,.013,0x71897d);
    for(const x of [-1.69,1.69]){
      B(p,x,-.001,.94,.027,.006,.35,0xa7b3a3);
      B(p,x+(x<0?.11:-.11),-.001,.78,.234,.006,.022,0xa7b3a3);
    }
    for(let i=0;i<6;i++){
      B(p,-.43+i*.13,-.001,1.305,.042,.005,i===0?.117:.063,i===0?0xceba88:0x8a9e91);
    }
    const grp=b.finish('Bay envelope · '+(amber?'amber':'clear')+' · '+(door?'door':'glazing'));
    for(const x of [-1.25,1.25]){
      const mesh=new T.Mesh(filterGeo,filterMat);mesh.name='FFU pleated media';mesh.position.set(x,H-.113,-1.15);
      grp.add(mesh);
    }
    const sh=new T.Mesh(shadowGeo,shadowMat);sh.name='Instrument contact shade';sh.position.set(0,-.0003,-.12);
    sh.renderOrder=1;grp.add(sh);

    templates.set(key,grp);return grp;
  }
  function dropSign(holder){
    if(!holder.sign)return;
    holder.root.remove(holder.sign);holder.sign.material.map?.dispose();
    holder.sign.material.dispose();holder.sign=null;
  }
  function signFor(index,details,holder){
    dropSign(holder);
    const tex=makeLabel(T,index,details);if(!tex)return;
    const mat=new T.MeshBasicMaterial({map:tex,side:T.FrontSide,toneMapped:false});
    mat.name='Wayfinding | '+(details.title||index+1);
    const sign=new T.Mesh(signGeo,mat);sign.name='BAY '+String(index+1).padStart(2,'0')+' | '+String(details.title||'Station');
    sign.position.set(0,2.616,-1.963);holder.root.add(sign);holder.sign=sign;
  }
  function updateFloor(){
    if(!bays.size){perimeter.visible=ceiling.visible=floor.visible=false;return;}
    let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
    for(const {x,z,pitch} of bays.values()){
      x0=Math.min(x0,x-pitch/2);x1=Math.max(x1,x+pitch/2);
      z0=Math.min(z0,z-DEPTH_BACK);z1=Math.max(z1,z+DEPTH_FRONT);
    }
    const oldMin=x0,oldMax=x1;x0-=WING;x1+=WING;
    const dx=x1-x0,dz=z1-z0;
    ceiling.visible=perimeter.visible=floor.visible=true;
    floor.scale.set(dx,1,dz);floor.position.set((x0+x1)/2,-.008,(z0+z1)/2);
    ceiling.scale.set(dx,1,dz);ceiling.position.set((x0+x1)/2,H+.047,(z0+z1)/2);
    slab.scale.set(dx,.14,dz);slab.position.set((x0+x1)/2,-.079,(z0+z1)/2);
    fitFrontage(x0,x1,z1);
    frontBounds.min.set(x0,-.01,z1-.14);frontBounds.max.set(x1,H+.04,z1+1.02);
    ceilingAlbedo.repeat.set(dx/1.2,dz/1.2);
    ceilingAlbedo.offset.set(frac(x0/1.2),frac(z0/1.2));
    // fixed inward-facing room terminals beyond the nearest process tools.
    for(const [end,x] of [[endL,x0],[endR,x1]]){
      end.position.set(x,0,(z1+z0+.9)/2);end.scale.x=(dz-.9)/(DEPTH_FRONT+2.1);
    }
    for(const [wing,x] of [[wingL,oldMin-WING/2],[wingR,oldMax+WING/2]])wing.position.set(x,0,z0+DEPTH_BACK);
    for(const map of [floorColor,floorRough]){
      map.repeat.set(dx/.90,dz/.90);map.offset.set(frac(x0/.90),frac(-z1/.90));
    }
  }
  function removeBay(row){
    dropSign(row);
    root.remove(row.root);
  }
  function ensureBay(index,origin,details={}){
    if(dead)return null;
    const i=Math.max(0,Math.trunc(finite(index)));
    const x=finite(Array.isArray(origin)?origin[0]:origin?.x);
    const z=finite(Array.isArray(origin)?origin[2]:origin?.z);
    details=details&&typeof details==='object'?details:{};
    const pitch=clamp(finite(details.pitch,DEFAULT_PITCH)||DEFAULT_PITCH,3.35,8);
    const title=String(details.title||details.machine||'Process station');
    const cat=labelKind(details);
    const amber=cat==='pattern'||/lithograph|exposure|aligner|maskless|photoresist/i.test(title);
    const door=(i%3===0);
    const mark=title+'|'+cat,templateKey=Number(amber)+'/'+Number(door);
    const old=bays.get(i);
    if(old&&old.x===x&&old.z===z&&old.pitch===pitch&&old.templateKey===templateKey){
      if(old.mark!==mark){
        old.mark=mark;old.label={title,kind:details.kind,effect:details.effect};
        if(old.root.visible)signFor(i,old.label,old);
      }
      return old.root;
    }
    if(old)removeBay(old);
    const instance=template(amber,door).clone(true);
    instance.name='Architecture bay '+(i+1);
    instance.position.set(x,0,z);instance.scale.x=pitch/DEFAULT_PITCH;
    const row={root:instance,x,z,pitch,mark,templateKey,sign:null,label:{title,kind:details.kind,effect:details.effect}};
    instance.visible=focus===null||Math.abs(focus-i)<=4;
    if(instance.visible)signFor(i,row.label,row);
    root.add(instance);bays.set(i,row);updateFloor();
    return instance;
  }
  function setFocus(index) {
    const n=Number(index);focus=index!=null&&Number.isFinite(n)?Math.trunc(n):null;
    for(const [i,row] of bays){
      row.root.visible=focus===null||Math.abs(i-focus)<=4;
      // A route may have many dozens of stages. Keep only the visible sign
      // atlases in GPU and DOM-canvas memory; structural solids share geometry.
      if(!row.root.visible)dropSign(row);
      else if(!row.sign)signFor(i,row.label,row);
    }
  }
  function reset(){for(const row of bays.values())removeBay(row);bays.clear();focus=null;updateFloor();}
  function dispose(){
    if(dead)return;dead=true;reset();
    const geometry=new Set([cube,cyl,floorGeo,filterGeo,shadowGeo,signGeo,ceilingGeo]);
    for(const child of front.children)child.dispose();
    for(const group of [shellParts.end,shellParts.wing,shellParts.front])group.traverse(n=>{if(n.geometry)geometry.add(n.geometry);});
    for(const grp of templates.values())grp.traverse(n=>{if(n.geometry)geometry.add(n.geometry);});
    geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    if(env&&scene.environment===env){scene.environment=oldEnv;if(oldIntensity!==undefined)scene.environmentIntensity=oldIntensity;}
    scene.remove(root);templates.clear();
  }
  floor.visible=false;
  return {ensureBay,setFocus,setView,reset,dispose,group:root,bayPitch:DEFAULT_PITCH,
    getStats(){return {bays:bays.size,visible:[...bays.values()].filter(b=>b.root.visible).length,templates:templates.size,residentSigns:[...bays.values()].filter(b=>b.sign).length,environmentOwned:Boolean(env),pitch:DEFAULT_PITCH};}};
}
