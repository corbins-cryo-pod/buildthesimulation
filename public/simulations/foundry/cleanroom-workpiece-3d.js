/**
 * Display-only 3D specimens for the foundry player, not a process solver.
 *
 * Main specimen is XZ-centred, Y-up, with its bottom seating plane at Y=0.
 * Orient and transport the returned group from the controller. The wafer diameter
 * is the requested size in metres. Physical thickness may be passed as
 * authored.thicknessMm; an unprovided thickness is a labelled display default.
 * The separate section is deliberately magnified and is not at wafer scale.
 * update() consumes full station progress (0–1); before the Run phase the
 * incoming view stays unchanged. All meshes survive phase and station changes.
 * For makeSection() only, pass explode (0–1) to separate its current visible,
 * supported material layers; this is an inspection pose, not physical delamination.
 */
const SHAPES = Object.freeze(['wafer','panel','die','film','assembly','none']);
const COLOUR = Object.freeze({
  silicon:0x7698a6, siliconEdge:0x496779, thinFilm:0xa5a1aa,
  oxide:0x79c3b2, glass:0x71c9ce, nitride:0x428f9d,
  resist:0xcb8ec3, polymer:0xc18261, dielectric:0x77b1a7,
  tin:0x9e927b, gold:0xecc16c, metal:0xaed0db, platinum:0xc5d6db, carbon:0x49565a,
  board:0x4b7f6a, substrate:0x608090
});
const RUN_BEGIN=.57, RUN_END=.81;
const ISOLATORS=new Set(['oxide','nitride','dielectric','resist','polymer','glass']);
const LABEL=Object.freeze({silicon:'Silicon',glass:'Glass',polymer:'Polymer',oxide:'Oxide',
  nitride:'Nitride',resist:'Photoresist',dielectric:'Dielectric',tin:'Titanium nitride',
  metal:'Metal',gold:'Gold',platinum:'Platinum',carbon:'Carbon',substrate:'Substrate'});
const BOARD_SEAT=.62, BOARD_HALF_X=.475;
const PCB_TYPES=new Set(['pcb','flex-headstage','carrier']);
const EXPLODE_GAP=.009, BOND_LIMIT=128, ARC_STEPS=10;
const THINNING=/grind|thinn|thickness profile/i;
const clamp = x => Math.max(0,Math.min(1,x));
const smooth = x => {const t=clamp(x);return t*t*(3-2*t);};
const hasShape = x => typeof x==='string'&&SHAPES.includes(x);
const number = (x,lo,hi) => typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi?x:undefined;
const scaleColour = (n,scale) => (Math.min(255,Math.round((n>>>16)*scale))<<16)|
  (Math.min(255,Math.round(((n>>>8)&255)*scale))<<8)|Math.min(255,Math.round((n&255)*scale));

function waferRim() {
  // The notch is an illustrative orientation datum; mark dimensions are not an
  // inferred vendor wafer specification. The circle diameter itself is exact.
  const focus=Math.PI/2, spread=.023;
  const angles=[];
  for(let i=0;i<112;i++){
    const a=2*Math.PI*i/112;
    if(Math.abs(a-focus)>spread)angles.push([a,.5]);
  }
  for(const [d,r] of [[-spread,.5],[-.011,.494],[0,.4915],[.011,.494],[spread,.5]])angles.push([focus+d,r]);
  return angles.sort((a,b)=>a[0]-b[0]).map(([t,r])=>[r*Math.cos(t),r*Math.sin(t)]);
}
const rectangle=(x,z)=>[[-x,-z],[x,-z],[x,z],[-x,z]];
const WAFER=waferRim();
const DIES=rectangle(.5,.32);
const FILM=rectangle(.5,.36);
const BLOCK=rectangle(.5,.31);
const PANEL=rectangle(.5,.5);
const SHANK=[[-.5,-.19],[-.21,-.19],[-.10,-.043],[.40,-.030],[.50,0],[.40,.030],[-.10,.043],[-.21,.19],[-.5,.19]];
const SHANK_WINDOWS=[[-.385,-.10,.038,.039],[-.325,-.10,.038,.039],[-.385,.10,.038,.039],[-.325,.10,.038,.039]];
const SHANK_GROOVES=[[-.39,0,.029,.31],[-.30,0,.029,.29]];
const SHANK_REAR=[[-.345,-.057,.21,.018],[-.345,.057,.21,.018]];
const windows=[];
for(const x of [-.19,0,.19])for(const z of [-.14,.11])windows.push([x,z,.066,.070]);
const grooves=[[-.26,0,.034,.42],[-.086,0,.034,.50],[.086,0,.034,.50],[.26,0,.034,.42]];
const backGrooves=grooves.map(([x,z,w,l])=>[z,x,l,w]);
function from2D(T,outline,holes=[]){
  // XY artwork becomes horizontal XZ; extrusion axis becomes world +Y.
  const s=new T.Shape();
  for(let i=0;i<outline.length;i++){
    const [x,z]=outline[i];i===0?s.moveTo(x,-z):s.lineTo(x,-z);
  }
  s.closePath();
  for(const [x,z,w,l] of holes){
    const p=new T.Path();
    p.moveTo(x-w/2,-z-l/2);p.lineTo(x-w/2,-z+l/2);
    p.lineTo(x+w/2,-z+l/2);p.lineTo(x+w/2,-z-l/2);
    p.closePath();s.holes.push(p);
  }
  const g=new T.ExtrudeGeometry(s,{depth:1,steps:1,bevelEnabled:false,curveSegments:1});
  g.rotateX(-Math.PI/2);
  // Trigonometric roundoff of the rotation must not lift the seating plane.
  const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<1e-8)p.setY(i,0);
  p.needsUpdate=true;
  g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}
function materialKey(text){
  if(/\b(?:parylene|polyimide|epoxy|polymer|encapsulant|encapsulation)\b/i.test(text))return 'polymer';
  if(/\b(?:porous\s+)?tin\b|titanium nitride/i.test(text))return 'tin';
  if(/\bplatinum\b|\bpt\b/i.test(text))return 'platinum';
  if(/\b(?:carbon|graphene|graphite|cnt|nanotube)\b/i.test(text))return 'carbon';
  if(/\b(?:gold|au)\b|ti\/au\/ti|electroplat/i.test(text))return 'gold';
  if(/\b(?:aluminum|aluminium|al\s+metal|metal|interconnect|bond pad)\b/i.test(text))return 'metal';
  if(/\bglass\b/i.test(text))return 'glass';
  if(/\bsin(?:x|ₓ|₃n₄|3n4)?\b|(?:silicon|lower|upper|bottom|top)\s+nitride/i.test(text))return 'nitride';
  if(/\boxide\b|sio₂|sio2|overburden|dielectric\s+fill/i.test(text))return 'oxide';
  if(/\bresist\b|photoimage|latent image/i.test(text))return 'resist';
  if(/protect|passivat|insulat|dielectric|compensation film|barrier|coating/i.test(text))return 'dielectric';
  return '';
}
function plan(text){
  const s=String(text??'').toLowerCase();
  const material=materialKey(s);
  const printed=/(?:printed|latent|projected|photoimage|mask witness|gate image|dose image)/.test(s);
  const recess=/(?:trench(?:es)?|rear relief|front relief|edge cuts|diced|kerfs?)/.test(s)&&
    !/(?:printed isolation|no face relief|filled trench|fill(?:ed|ing)? regions|uncut|planarized isolation)/.test(s);
  const dent=!printed&&!recess&&/(?:via access|which .*window|windows? clear|openings? patterned|patterned (?:tip|pad|contact|electrode) openings|(?:open|clear|exposed) (?:bond|pad|contact|electrode) window|bond openings)/.test(s);
  const conductor=['metal','gold','tin','platinum','carbon'].includes(material);
  const siteFaces=conductor&&/exposed(?:-| )site|only .*site|contact finish/.test(s);
  const patterned=conductor&&!siteFaces&&/(?:trace|routing|site|pad|interconnect|conductive path)/.test(s)&&!/blanket/.test(s);
  const under=/(?:material stack|interconnect|patterned trace|underlying dielectric|insulation stack|upper nitride|upper sin|exposed-site|window|passivation|protecti(?:ve|on))/.test(s);
  const soi=/\bsoi\b|silicon[- ]on[- ]insulator|buried oxide|\bbox (?:layer|clear)/.test(s);
  const board=/(?:pcb|board|flex\/headstage|flex\/connector)/.test(s);
  return {material,printed,recess,dent,patterned,siteFaces,under,board,soi,back:false,fill:false,boxClear:false,knownLayer:false};
}
function feature(state,id){
  if(!id)return;
  state.fill=false;state.siteFaces=false;
  if(id==='filled-trenches'||id==='glass-filled-trenches'){
    state.recess=true;state.fill=true;state.dent=false;state.printed=false;state.patterned=false;
    if(!state.material)state.material=id==='glass-filled-trenches'?'glass':'dielectric';
  }else if(id==='blank'||id==='insulating-film'||id==='blanket-film'){
    state.recess=false;state.dent=false;state.printed=false;state.patterned=false;
    if(id==='blank'){state.material='';state.under=false;}
    else if(!state.material)state.material='dielectric';
  }else if(id==='trenches'||id==='front-trenches'||id==='back-trenches'){
    state.recess=true;state.printed=false;state.dent=false;state.patterned=false;
    state.back=id==='back-trenches';
  }else if(id==='openings'||id==='box-clear'){
    state.dent=true;state.recess=false;state.printed=false;state.patterned=false;
    if(id==='box-clear'){state.material='oxide';state.soi=true;state.back=true;state.boxClear=true;}
  }else if(id==='resist-image'){
    state.printed=true;state.recess=false;state.dent=false;state.patterned=false;
    state.material='resist';
  }else if(id==='site-faces'){
    state.recess=false;state.dent=true;state.printed=false;state.patterned=false;state.siteFaces=true;
    if(!state.material)state.material='metal';
  }else if(id==='metal'||id==='metal-traces'||id==='conductive-pattern'){
    state.recess=false;state.dent=false;state.printed=false;state.patterned=true;
    if(!['gold','tin','metal','platinum','carbon'].includes(state.material)&&!(id==='conductive-pattern'&&state.material==='polymer'))state.material='metal';
  }
}
function target(effect,before,after,authored) {
  const from=plan(before), to=plan(after);
  if(authored?.stack==='soi'||from.soi)to.soi=true;
  if(authored?.stack==='soi')from.soi=true;
  if(authored?.stack==='bulk'){from.soi=false;to.soi=false;}
  if(authored?.beforeMaterial&&Object.hasOwn(COLOUR,authored.beforeMaterial))from.material=authored.beforeMaterial;
  if(authored?.afterMaterial&&Object.hasOwn(COLOUR,authored.afterMaterial))to.material=authored.afterMaterial;
  from.knownLayer=!!(authored?.beforeFeature||authored?.beforeMaterial);
  to.knownLayer=!!(authored?.afterFeature||authored?.feature||authored?.afterMaterial);
  feature(from,authored?.beforeFeature);feature(to,authored?.afterFeature??authored?.feature);
  const rear=['bottom','back','rear'].includes(authored?.face);
  if(rear){from.back=true;to.back=true;}
  if(effect==='fill'&&(from.recess||to.fill)){to.recess=true;to.fill=true;if(!to.material)to.material='dielectric';if(from.back)to.back=true;}
  if(effect==='polish'&&!to.material&&from.material)to.material=from.material;
  const overlayChange=!['none','measure','test','inspection','handoff','transfer','clean','heat','assemble'].includes(effect);
  const different=String(before??'')!==String(after??'')||!!authored?.afterFeature||!!authored?.feature;
  let outgoing=to;
  if(!overlayChange||!different) outgoing=from;
  else if(effect==='coat'&&!to.material)outgoing={...to,material:'resist'};
  else if(effect==='deposit'&&!to.material)outgoing={...to,material:'dielectric'};
  else if(effect==='pattern'&&!to.printed&&!to.patterned&&!to.dent)outgoing={...to,printed:true};
  // Carry known colours forward when a summary names only results.
  if(overlayChange&&different&&!outgoing.material&&from.material&&!outgoing.recess&&effect!=='etch'&&authored?.afterFeature!=='blank')outgoing={...outgoing,material:from.material};
  return {from,to:outgoing,shapeAfter:to,change:different&&overlayChange};
}
function authoredWidth(shape,size,section){
  if(section) return shape==='assembly'?.165:.172;
  const nominal=number(size,.25,460);
  return (nominal??(shape==='wafer'?150:shape==='panel'?30:shape==='die'?5:shape==='film'?26:24))/1000;
}
function authoredThickness(shape,w,thick,section) {
  if(section) return shape==='assembly'?.023:.0175;
  const known=number(thick,.003,12);
  if(known!==undefined)return known/1000;
  if(shape==='wafer')return w<=.105?.000525:w<=.16?.000675:w<=.21?.000725:.000775;
  if(shape==='panel')return .00070;
  if(shape==='film')return .00014;
  if(shape==='assembly')return .00105;
  return .00042;
}

function create(T,section) {
  const group=new T.Group();
  group.name=section?'Workpiece — magnified 3D inspection witness':'Workpiece — persistent 3D specimen';
  const geometries=new Set(),materials=new Set();
  const assemblyState={attached:false,bonded:false,encapsulated:false,plated:false};
  const metadata={section,diameterMm:undefined,widthMm:undefined,authoredWidthMm:undefined,thicknessMm:undefined,substrateThicknessMm:undefined,authoredThickness:false,shape:'none',scaleNote:'',activeFeature:'none',layerCount:0,layers:[],canExplode:false,exploded:0,explodeBlockedReason:null,assemblyState};
  group.userData.workpiece=metadata;
  function geo(g){geometries.add(g);return g;}
  function mat(options){const m=new T.MeshStandardMaterial(options);materials.add(m);return m;}
  function lm(options){const m=new T.LineBasicMaterial(options);materials.add(m);return m;}
  function bodyMat(c){return mat({color:c,roughness:.43,metalness:.26});}
  const silicon=[bodyMat(COLOUR.silicon),bodyMat(COLOUR.siliconEdge)];
  const copper=mat({color:COLOUR.gold,metalness:.64,roughness:.29,emissive:0x493211,emissiveIntensity:.16});
  const muted=mat({color:0x83a49b,roughness:.68,metalness:.18});
  const buriedMat=mat({color:COLOUR.oxide,roughness:.57,metalness:.07});
  const recessFloor=mat({color:0x385c63,roughness:.75,metalness:.12});
  const carbonA=mat({color:0x435052,roughness:.67,metalness:.2,polygonOffset:!section,polygonOffsetFactor:-1,polygonOffsetUnits:-5});
  const carbonB=mat({color:0x60786d,roughness:.66,metalness:.25,polygonOffset:!section,polygonOffsetFactor:-1,polygonOffsetUnits:-6});
  const pcb=mat({color:COLOUR.board,roughness:.62});
  const flex=mat({color:COLOUR.polymer,roughness:.61});
  const box=geo(new T.BoxGeometry(1,1,1));box.translate(0,.5,0);
  const bases=[];
  function mesh(p,g,m,name){const x=new T.Mesh(g,m);x.name=name;p.add(x);return x;}
  function slab(p,g,m,name){return mesh(p,g,m,name);}
  function bar(p,x,z,w,l,h,y,m,name=''){const b=mesh(p,box,m,name);b.position.set(x,y,z);b.scale.set(w,h,l);return b;}
  function layerPair(){return [mat({color:COLOUR.dielectric,metalness:.19,roughness:.45,polygonOffset:!section,polygonOffsetFactor:-1,polygonOffsetUnits:-3}),mat({color:0x568e89,metalness:.10,roughness:.57})];}
  function lines(p,points,m,name){
    const g=geo(new T.BufferGeometry());
    g.setAttribute('position',new T.Float32BufferAttribute(points,3));
    const l=new T.LineSegments(g,m);l.name=name;p.add(l);return l;
  }
  function surfaceGrid(p,round){
    const xyz=[], ruler=[], max=round?.445:.47, zmax=round?.445:.29;
    for(let j=-4;j<=4;j++){
      const d=j*.090,cap=round?Math.sqrt(max*max-d*d):zmax;
      xyz.push(d,0,-cap,d,0,cap);
      const dz=j*(round?.09:.06),capx=round?Math.sqrt(zmax*zmax-dz*dz):max;
      xyz.push(-capx,0,dz,capx,0,dz);
    }
    for(const [x,z] of [[-.222,-.149],[.222,-.149],[-.222,.149],[.222,.149]]){
      const dx=Math.sign(x)*-.040,dz=Math.sign(z)*-.031;
      ruler.push(x,0,z,x+dx,0,z,x,0,z,x,0,z+dz);
    }
    const marks=lm({color:0xb9e8db,transparent:true,opacity:.61,depthWrite:false});
    return [lines(p,xyz,marks,'Reticle guide grid (illustrative)'),lines(p,ruler,lm({color:0xffce7d,transparent:true,opacity:.94,depthWrite:false}),'Selected-region inspection brackets')];
  }
  function metalPattern(parent,shank) {
    const r=new T.Group();r.name='Surface metallization lines and contact pads';parent.add(r);
    if(shank){
      for(const z of [-.019,-.006,.006,.019]){bar(r,-.015,z,.81,.004,1,0,copper);bar(r,-.42,z,.055,.008,1,0,copper);}
      return r;
    }
    for(const [i,z] of [-.135,-.045,.045,.135].entries()){
      const xl=-.31,xr=.28,y=.002+(.0002*i),w=.009;
      bar(r,(xl+xr)/2,z,xr-xl,w,1,y,copper);
      bar(r,xl,z,.060,.043,1,y,copper);
      bar(r,xr,z,.051,.039,1,y,copper);
      if(i===1||i===2)bar(r,-.02,z/2,w,Math.abs(z),1,y,copper);
    }
    return r;
  }
  function makeSurface(shape,outline) {
    const isShank=shape==='shank'&&!section;
    const open=isShank?SHANK_WINDOWS:windows;
    const frontSlots=isShank?SHANK_GROOVES:section?grooves.map(([x,z,w,l])=>[x,z,w*1.55,l]):grooves;
    const rearSlots=isShank?SHANK_REAR:section?backGrooves.map(([x,z,w,l])=>[x,z,w,l*1.55]):backGrooves;
    const f=new T.Group(); f.name='Specimen: '+shape;group.add(f);bases.push(f);
    const flat=geo(from2D(T,outline));
    const body=mesh(f,flat,silicon,'Solid silicon body');
    const under=slab(f,flat,[mat({color:COLOUR.oxide,roughness:.62}),mat({color:0x68aea4,roughness:.62})],'Insulation layer witness');
    const lM=layerPair(), full=slab(f,flat,lM,'Blanket surface layer');
    const win=slab(f,geo(from2D(T,outline,open)),lM,'Upper surface with actual opening voids');
    const trench=slab(f,geo(from2D(T,outline,frontSlots)),silicon,'Front silicon ribs with recessed trench geometry');
    const backTrench=slab(f,geo(from2D(T,outline,rearSlots)),silicon,'Backside ribs and orthogonal trench witness');
    const buried=slab(f,flat,buriedMat,'Buried oxide witness within the silicon');
    const device=slab(f,flat,silicon,'Silicon device layer over buried oxide');
    const stop=slab(f,flat,muted,'Reference mask plate');
    const donorSheets=[];
    for(let i=0;i<4;i++)donorSheets.push(slab(f,flat,[i%2?carbonB:carbonA,carbonB],'Illustrative donor sheet '+(i+1)));
    const [grid,locator]=surfaceGrid(f,shape==='wafer');
    const metal=metalPattern(f,isShank);
    const sites=new T.Group();sites.name='Independent metallized site faces';f.add(sites);
    for(const [x,z,w,l] of open)bar(sites,x,z,w*.69,l*.69,1,0,copper,'Metallized contact face only');
    const image=new T.Group();image.name='Pattern image witness · not an etched silicon opening';f.add(image);
    for(const [x,z,w,d] of open){
      const r=[x-w*.5,0,z-d*.5,x+w*.5,0,z-d*.5,x+w*.5,0,z-d*.5,x+w*.5,0,z+d*.5,
        x+w*.5,0,z+d*.5,x-w*.5,0,z+d*.5,x-w*.5,0,z+d*.5,x-w*.5,0,z-d*.5];
      lines(image,r,lm({color:0xf1c4e8,transparent:true,opacity:.93,depthWrite:false}),'Authored window outline');
    }
    const plugs=new T.Group();plugs.name='Outgoing cut volume (retracts into modeled voids)';f.add(plugs);
    for(const [x,z,w,d] of frontSlots)bar(plugs,x,z,w*.999,d*.999,1,0,silicon[0]);
    const backPlugs=new T.Group();backPlugs.name='Outgoing backside-cut volume';f.add(backPlugs);
    for(const [x,z,w,d] of rearSlots)bar(backPlugs,x,z,w*.999,d*.999,1,0,silicon[0]);
    const fills=new T.Group();fills.name='Material filling only the front trench voids';f.add(fills);
    const backFills=new T.Group();backFills.name='Material filling only the back trench voids';f.add(backFills);
    for(const [x,z,w,d] of frontSlots)bar(fills,x,z,w*.973,d*.985,1,0,lM[0]);
    for(const [x,z,w,d] of rearSlots)bar(backFills,x,z,w*.973,d*.985,1,0,lM[0]);
    const floor=new T.Group();floor.name='Front trench floors';f.add(floor);
    const backFloor=new T.Group();backFloor.name='Back trench floors';f.add(backFloor);
    for(const [x,z,w,d] of frontSlots)bar(floor,x,z,w*.996,d*.996,1,0,recessFloor);
    for(const [x,z,w,d] of rearSlots)bar(backFloor,x,z,w*.996,d*.996,1,0,recessFloor);
    const windowPlugs=new T.Group();windowPlugs.name='Removable top-material windows';f.add(windowPlugs);
    for(const [x,z,w,d] of open)bar(windowPlugs,x,z,w*.999,d*.999,1,0,lM[0]);
    const orientation=shape==='wafer'&&!section?lines(f,[-.024,0,.486,-.012,0,.492,.012,0,.492,.024,0,.486],lm({color:0xf1e5ba,transparent:true,opacity:.8}),'Notch orientation guides'):null;
    return {f,body,under,full,win,trench,backTrench,buried,device,stop,donorSheets,grid,locator,metal,sites,image,plugs,backPlugs,fills,backFills,floor,backFloor,windowPlugs,lM,orientation};
  }
  const compact=section?BLOCK:DIES, floppy=section?BLOCK:FILM;
  const shapes={
    wafer:makeSurface('wafer',section?BLOCK:WAFER),
    panel:makeSurface('panel',section?BLOCK:PANEL),
    die:makeSurface('die',compact),
    shank:makeSurface('shank',section?BLOCK:SHANK),
    film:makeSurface('film',floppy)
  };
  // Reserve one source-backed die branch per specimen. New measured input can
  // replace its buffers once; no render tick creates objects or appends nodes.
  const nativeRoot=new T.Group();nativeRoot.name='Source-backed silicon die';group.add(nativeRoot);bases.push(nativeRoot);
  const nativeBody=mesh(nativeRoot,box,silicon[0],'Extracted native die outline');
  const nativeFilmPair=layerPair();
  const nativeFilm=mesh(nativeRoot,box,nativeFilmPair[0],'Representative surface film on extracted die');
  const siteDotMat=mat({color:0xecc876,metalness:.31,roughness:.42,emissive:0x463218,emissiveIntensity:.21,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-3});
  const siteDotsGeo=geo(new T.CylinderGeometry(.5,.5,1,12));siteDotsGeo.translate(0,.5,0);
  const siteDots=new T.InstancedMesh(siteDotsGeo,siteDotMat,1024);
  siteDots.name='Exact physical site centers (illustrative location markers)';
  nativeRoot.add(siteDots);siteDots.count=0;
  const dotMatrix=new T.Matrix4();
  let nativeOutlineRef,nativeSitesRef,nativeMarkerUm,nativeOpenX,nativeOpenZ,nativeGeom=null,nativeHoleG=null,nativeFrame=null,nativeMm=0,nativeX0=0,nativeZ0=0,nativeDenom=1,nativeTurn=false;
  let exactApertures=0;
  let nativeSizeX=0,nativeSizeZ=0;
  const pair=(a)=>Array.isArray(a)&&a.length>=2&&number(a[0],-1e7,1e7)!==undefined&&number(a[1],-1e7,1e7)!==undefined;
  function assignNative(outline,sites,markerUm,opening){
    if(outline!==nativeOutlineRef){
      nativeOutlineRef=outline;nativeSitesRef=undefined;
      if(nativeGeom){nativeGeom.dispose();geometries.delete(nativeGeom);nativeGeom=null;}
      if(nativeHoleG){nativeHoleG.dispose();geometries.delete(nativeHoleG);nativeHoleG=null;}
      nativeFrame=null;nativeMm=0;siteDots.count=0;exactApertures=0;
      if(Array.isArray(outline)&&outline.length>=3&&outline.length<=192&&outline.every(pair)){
        let xl=Infinity,xh=-Infinity,zl=Infinity,zh=-Infinity;
        for(const p of outline){if(p[0]<xl)xl=p[0];if(p[0]>xh)xh=p[0];if(p[1]<zl)zl=p[1];if(p[1]>zh)zh=p[1];}
        nativeSizeX=(xh-xl)/1000;nativeSizeZ=(zh-zl)/1000;
        if(nativeSizeX>.001&&nativeSizeZ>.001&&nativeSizeX<=150&&nativeSizeZ<=150){
          nativeTurn=zh-zl>xh-xl;nativeDenom=Math.max(xh-xl,zh-zl);nativeX0=(xl+xh)/2;nativeZ0=(zl+zh)/2;
          const frame=outline.map(p=>{
            const x=(p[0]-nativeX0)/nativeDenom,z=(p[1]-nativeZ0)/nativeDenom;
            return nativeTurn?[z,-x]:[x,z];
          });
          nativeFrame=frame;nativeGeom=geo(from2D(T,frame));nativeBody.geometry=nativeGeom;nativeFilm.geometry=nativeGeom;
          nativeMm=nativeDenom/1000;
        }
      }
    }
    if(!nativeMm)return false;
    const ax=number(opening?.[0],.15,120),az=number(opening?.[1],.15,120);
    if(sites!==nativeSitesRef||markerUm!==nativeMarkerUm||ax!==nativeOpenX||az!==nativeOpenZ){
      nativeSitesRef=sites;nativeMarkerUm=markerUm;nativeOpenX=ax;nativeOpenZ=az;siteDots.count=0;
      if(nativeHoleG){nativeHoleG.dispose();geometries.delete(nativeHoleG);nativeHoleG=null;exactApertures=0;}
      if(Array.isArray(sites)&&sites.length<=siteDots.instanceMatrix.count&&sites.every(pair)){
        const marker=number(markerUm,.5,80)??8;
        const exact=ax!==undefined&&az!==undefined;
        const wx=(exact?(nativeTurn?az:ax):marker)/nativeDenom,wz=(exact?(nativeTurn?ax:az):marker)/nativeDenom;
        const holes=[];
        function inside(x,z){
          let yes=false;
          for(let k=0,j=nativeFrame.length-1;k<nativeFrame.length;j=k++){
            const a=nativeFrame[k],b=nativeFrame[j];
            if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
          }
          return yes;
        }
        siteDots.geometry=exact?box:siteDotsGeo;
        for(let i=0;i<sites.length;i++){
          const x=(sites[i][0]-nativeX0)/nativeDenom,z=(sites[i][1]-nativeZ0)/nativeDenom;
          const rx=nativeTurn?z:x,rz=nativeTurn?-x:z;
          dotMatrix.makeScale(wx,1,wz);dotMatrix.setPosition(rx,0,rz);siteDots.setMatrixAt(i,dotMatrix);
          if(exact&&inside(rx-wx/2,rz-wz/2)&&inside(rx-wx/2,rz+wz/2)&&inside(rx+wx/2,rz-wz/2)&&inside(rx+wx/2,rz+wz/2))holes.push([rx,rz,wx,wz]);
        }
        if(holes.length){nativeHoleG=geo(from2D(T,nativeFrame,holes));exactApertures=holes.length;}
        siteDots.count=sites.length;siteDots.instanceMatrix.needsUpdate=true;siteDots.computeBoundingBox();siteDots.computeBoundingSphere();
      }
    }
    return true;
  }
  const assembled=new T.Group();assembled.name='Specimen: assembly';group.add(assembled);bases.push(assembled);
  const boardGroup=new T.Group();boardGroup.name='Generic board/die connection witness';assembled.add(boardGroup);
  const boardBase=bar(boardGroup,0,0,.95,.61,BOARD_SEAT,0,pcb,'Circuit carrier');
  const genericBonded=new T.Group();genericBonded.name='Unspecified board witness';boardGroup.add(genericBonded);
  bar(genericBonded,-.06,0,.30,.25,.22,BOARD_SEAT,silicon[0],'Generic silicon die');
  bar(boardGroup,-.38,0,.11,.28,.25,.62,muted,'Connector witness');
  for(let i=0;i<5;i++){
    const z=(i-2)*.042;
    bar(genericBonded,-.255,z,.059,.014,.079,.64,copper,'Illustrative bond terminal');
    // Explicit elevated middle section makes bonds readable obliquely.
    bar(genericBonded,-.204,z,.074,.005,.035,.79,copper,'Bond loop section');
    bar(genericBonded,-.165,z,.017,.01,.14,.69,copper);
  }
  for(let i=0;i<3;i++)bar(genericBonded,.291,(i-1)*.074,.22,.013,.05,.62,copper,'Illustrative carrier trace');
  const mounted=new T.Group();mounted.name='Source-shaped probe mounted to the illustrative local carrier';boardGroup.add(mounted);
  const mountBody=mesh(mounted,box,silicon[0],'Mounted native outline'),mountFilm=mesh(mounted,box,nativeFilmPair[0],'Mounted opening witness');
  const mountedSiteMat=mat({color:COLOUR.metal,metalness:.46,roughness:.38,emissive:0x354a52,emissiveIntensity:.21,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-3});
  const mountDots=new T.InstancedMesh(siteDotsGeo,mountedSiteMat,0);mountDots.name='Mounted native site centers';mounted.add(mountDots);
  mountDots.instanceMatrix=siteDots.instanceMatrix;mountDots.count=0;
  // One buffer for layout-derived die pad positions and diagrammatic wire arcs.
  // The source does not locate the landing center or wire length on the PCB.
  const bondingMat=mat({color:COLOUR.metal,metalness:.51,roughness:.49,emissive:0x40545a,emissiveIntensity:.12});
  const padDots=new T.InstancedMesh(box,bondingMat,BOND_LIMIT);
  padDots.name='Source die bond-pad positions · marker widths illustrative';
  padDots.count=0;padDots.frustumCulled=false;mounted.add(padDots);
  const padMatrix=new T.Matrix4(), bondFrame=new Float64Array(BOND_LIMIT*2);
  const wireGeometry=geo(new T.BufferGeometry());
  wireGeometry.boundingBox=new T.Box3();
  const wireXYZ=new T.BufferAttribute(new Float32Array(BOND_LIMIT*ARC_STEPS*6),3);
  wireXYZ.setUsage(T.DynamicDrawUsage);wireGeometry.setAttribute('position',wireXYZ);wireGeometry.setDrawRange(0,0);
  const wireArcs=new T.LineSegments(wireGeometry,lm({color:0xffcf8c,transparent:true,opacity:.96}));
  wireArcs.name='Wire loops · actual die pads, assumed PCB landings';wireArcs.frustumCulled=false;boardGroup.add(wireArcs);
  const epoxy=bar(boardGroup,0,0,1,1,1,BOARD_SEAT,mat({color:0xd1996c,metalness:.04,roughness:.48,
    transparent:true,opacity:.46,depthWrite:false}),'Local wire-bond encapsulant · illustrative relief');
  epoxy.renderOrder=2;
  let padRef,padOutlineRef,padCount=0,padMaxX=0,padVersion=0,wirePadVersion=-1,wireX,wireY,wireLX,wireLZ,wireSY;
  function assignPadFrame(centers){
    if(centers===padRef&&padOutlineRef===nativeOutlineRef)return;
    padRef=centers;padOutlineRef=nativeOutlineRef;padCount=0;padMaxX=0;padVersion++;
    if(Array.isArray(centers)&&centers.length<=BOND_LIMIT&&centers.every(pair)){
      for(const p of centers){
        const x=(p[0]-nativeX0)/nativeDenom,z=(p[1]-nativeZ0)/nativeDenom;
        const rx=nativeTurn?z:x,rz=nativeTurn?-x:z;
        if(Math.abs(rx)>.501||Math.abs(rz)>.501)continue;
        bondFrame[2*padCount]=rx;bondFrame[2*padCount+1]=rz;padCount++;
        padMaxX=Math.max(padMaxX,rx+.5);
        const marker=.01/Math.max(1,nativeMm);
        padMatrix.makeScale(marker,1,marker);padMatrix.setPosition(rx,0,rz);
        padDots.setMatrixAt(padCount-1,padMatrix);
      }
    }
    padDots.count=padCount;padDots.instanceMatrix.needsUpdate=true;padDots.computeBoundingBox();
  }
  function renderWires(mx,lx,lz,dieTop,boardScaleY){
    if(padVersion===wirePadVersion&&mx===wireX&&dieTop===wireY&&lx===wireLX&&lz===wireLZ&&boardScaleY===wireSY)return;
    wirePadVersion=padVersion;wireX=mx;wireY=dieTop;wireLX=lx;wireLZ=lz;wireSY=boardScaleY;
    const a=wireXYZ.array,baseY=BOARD_SEAT,rise=section?.17:.085;
    const height=BOARD_SEAT+dieTop/boardScaleY;let p=0,minX=Infinity,maxX=-Infinity,maxZ=0,maxY=baseY;
    for(let i=0;i<padCount;i++){
      const x=mx+lx*bondFrame[i*2],z=lz*bondFrame[i*2+1];
      const side=z<0?-1:1, z2=side*Math.min(.27,Math.max(.074,Math.abs(z)+.058));
      const x2=Math.min(BOARD_HALF_X-.021,x-.004);
      let px=x,py=height,pz=z;
      for(let j=1;j<=ARC_STEPS;j++){
        const u=j/ARC_STEPS,nx=x+(x2-x)*u,ny=height+(baseY-height)*u+Math.sin(Math.PI*u)*rise,nz=z+(z2-z)*u;
        a[p++]=px;a[p++]=py;a[p++]=pz;a[p++]=nx;a[p++]=ny;a[p++]=nz;px=nx;py=ny;pz=nz;maxY=Math.max(maxY,ny);
      }
      minX=Math.min(minX,x,x2);maxX=Math.max(maxX,x,x2);maxZ=Math.max(maxZ,Math.abs(z2));
    }
    wireXYZ.needsUpdate=true;wireGeometry.setDrawRange(0,p/3);
    if(padCount){
      wireGeometry.boundingBox.min.set(minX,baseY,-maxZ);
      wireGeometry.boundingBox.max.set(maxX,maxY,maxZ);
      epoxy.position.set((minX+maxX)/2,BOARD_SEAT+.002,0);
      epoxy.scale.set(Math.min(.95,maxX-minX+.022),maxY-BOARD_SEAT+.018,Math.min(.60,maxZ*2+.027));
    }
  }
  const laminate=new T.Group();laminate.name='Generic flexible assembly witness';assembled.add(laminate);
  bar(laminate,-.04,0,.91,.50,.35,0,flex,'Flexible carrier');
  bar(laminate,.245,0,.32,.43,.23,.35,muted,'Support island');
  for(const z of [-.15,-.05,.05,.15])bar(laminate,-.13,z,.52,.016,.06,.36,copper,'Illustrative flex interface');
  let cachedBefore,cachedAfter,cachedEffect,cachedKey,cachedBeforeKey,cachedBeforeMat,cachedAfterMat,cachedFace,cachedStack;
  let state=target('none','','',null), disposed=false;
  let active='', paintedBody=-1;
  function setFilm(key,s) {
    const col=COLOUR[key]??COLOUR.dielectric;
    if(s.paint===col)return;s.paint=col;
    s.lM[0].color.setHex(col);
    s.lM[1].color.setHex(scaleColour(col,.77));
    const metal=key==='gold'||key==='metal'||key==='tin'||key==='platinum';
    s.lM[0].metalness=metal?.58:.14;s.lM[0].roughness=metal?.32:.48;
  }
  const part=(m,y,h,on)=>{m.visible=on&&h>1e-12;m.position.y=y;m.scale.y=Math.max(1e-10,h);};
  function registerLayer(label,gap){return (metadata.layers.push(label)-1)*gap;}
  function finishLayers(explode){
    metadata.layerCount=metadata.layers.length;
    metadata.canExplode=metadata.layerCount>1&&!metadata.explodeBlockedReason;
    metadata.exploded=metadata.canExplode?explode:0;
  }
  function renderSurface(shape,form,w,t,planState,next,blend,changing,action,authored,gap,substrate){
    const s=shapes[form];
    s.f.scale.set(w,1,w);
    const bodyT=section&&action==='thin'?t*(1-.35*blend):t;
    // Main shape: physically small overlays and an unchanged nominal substrate.
    // Section only adds enlarged relief in order to show layers separately.
    const layer=section?.005:.0000014, tiny=section?.0011:.000030;
    const go=changing&&blend>1e-4;
    const current=go&&blend>=.26?next:planState;
    const back=current.back||go&&next.back;
    const visibleUnder=current.under&&current.material!=='glass'&&!back;
    const justTrench=go&&next.recess&&!planState.recess;
    const justWindow=go&&next.dent&&!planState.dent&&!(section&&next.boxClear);
    const showingBoxClear=section&&current.boxClear;
    const nowTrench=current.recess||justTrench||showingBoxClear;
    const nowWindow=!nowTrench&&(current.dent||current.siteFaces||justWindow);
    const lip=section?.009:.000019;
    const tr=nowTrench?(justTrench?lip*(.26+.74*blend):lip):0;
    const countBefore=Number.isInteger(authored?.donorLayersBefore)?number(authored.donorLayersBefore,0,4):undefined;
    const countAfter=Number.isInteger(authored?.donorLayersAfter)?number(authored.donorLayersAfter,0,4):undefined;
    const modeledDonors=countBefore!==undefined&&countAfter!==undefined&&!nowTrench&&!nowWindow;
    const coating=!!current.material&&current.material!=='silicon'&&!current.patterned&&!modeledDonors;
    const fresh=go&&next.material!==planState.material&&!justWindow&&!nowTrench;
    const polished=action==='polish'?1-.65*blend:1;
    const applied=layer*(fresh?Math.max(.05,blend):1)*polished;
    const bottomRelief=back&&!section?(nowTrench?tr:(nowWindow||coating)?applied:0):0;
    const core=bodyT-bottomRelief;
    // Resolve the SOI layers only in the enlarged witness. Sub-micrometre
    // coplanar caps would z-fight in a machine-scale camera.
    const showSOI=section&&current.soi&&shape==='wafer';
    const buried=showSOI?core*.115:0;
    const device=showSOI?core*.16:0;
    const handle=core-buried-device;
    if(section)registerLayer(showSOI?'Silicon handle':LABEL[substrate]??'Substrate',gap);
    const boxY=showSOI?registerLayer(showingBoxClear?'Buried oxide (BOX), opened locally':'Buried oxide (BOX)',gap):0;
    const deviceY=showSOI?registerLayer('Silicon device layer',gap):0;
    part(s.body,bottomRelief,handle,true);
    // A BOX opening changes the buried oxide geometry itself. It is not a
    // second oxide coating painted on top of the separated device stack.
    s.buried.geometry=showingBoxClear?s.backTrench.geometry:s.body.geometry;
    part(s.buried,bottomRelief+handle+boxY,buried,showSOI);
    part(s.device,bottomRelief+handle+buried+deviceY,device,showSOI);
    const fillLevel=nowTrench&&(current.fill||go&&next.fill)?(planState.fill?.967:.967*blend):0;
    if(nowTrench){
      // The trench walls, voids, cut-remnants and cured infill are one local
      // structure. Never separate these into fake sheets in the viewer.
      const y=bottomRelief?0:bodyT+(back?0:deviceY);
      part(s.trench,y,tr,!back);
      part(s.backTrench,y,tr,back);
      const remain=tr*(justTrench?1-blend:0);
      part(s.plugs,y,remain,justTrench&&!back);
      part(s.backPlugs,bottomRelief?tr-remain:y,remain,justTrench&&back);
      part(s.fills,y,tr*fillLevel,fillLevel>0&&!back);
      part(s.backFills,bottomRelief?tr*(1-fillLevel):y,tr*fillLevel,fillLevel>0&&back);
      part(s.floor,y,section?.00030:.0000005,!back&&fillLevel<=0);
      part(s.backFloor,bottomRelief?tr-.000001:y,section?.00030:.0000005,back&&fillLevel<=0&&!showingBoxClear);
    }else{
      part(s.trench,0,0,false);part(s.backTrench,0,0,false);
      part(s.plugs,0,0,false);part(s.backPlugs,0,0,false);
      part(s.fills,0,0,false);part(s.backFills,0,0,false);part(s.floor,0,0,false);part(s.backFloor,0,0,false);
    }
    const topKey=current.siteFaces?(ISOLATORS.has(planState.material)?planState.material:'dielectric'):current.material||(nowWindow?'dielectric':'');
    setFilm(topKey,s);
    const hasSurface=section&&current.knownLayer&&!nowTrench&&!modeledDonors&&(coating||nowWindow||current.patterned)&&!showingBoxClear;
    const surfaceOffset=hasSurface?registerLayer(`${LABEL[topKey]??'Surface'}${nowWindow?' film with openings':current.patterned?' patterned film':' film'}`,gap):deviceY;
    // A purely illustrative contrast liner moves with its authored surface;
    // it is not evidence of a second film or an independently separable layer.
    part(s.under,bodyT+surfaceOffset,layer,visibleUnder&&!showingBoxClear);
    const substrateTop=bottomRelief?0:bodyT+(visibleUnder?layer:0)+surfaceOffset;
    part(s.full,substrateTop,applied,coating&&!nowWindow&&!nowTrench);
    part(s.win,substrateTop,applied,nowWindow&&!nowTrench);
    const fillHeight=applied*(justWindow?1-blend:0);
    part(s.windowPlugs,bottomRelief?applied-fillHeight:substrateTop,fillHeight,justWindow);
    s.stop.visible=false;
    const donorHeight=section?.0018:.0000006;
    let visibleDonorCount=0;
    for(let j=0;j<s.donorSheets.length;j++){
      const carries=!modeledDonors?0:j<countBefore?1:j<countAfter&&blend>0?(blend<1?2:1):0;
      const donorOffset=section&&carries?registerLayer('Graphene donor-sheet witness '+(j+1),gap)-surfaceOffset:0;
      part(s.donorSheets[j],substrateTop+donorHeight*j+(carries===2?((section?.008:.00028)*(1-blend)):0)+donorOffset,donorHeight*.89,carries>0);
      if(carries>0)visibleDonorCount++;
    }
    const surfaceY=bottomRelief?bodyT:nowTrench?bodyT+tr+(back?0:deviceY):substrateTop+((coating||nowWindow)?applied:0)+visibleDonorCount*(donorHeight+gap);
    s.grid.visible=!section&&(shape==='wafer'||shape==='panel');
    s.grid.position.y=surfaceY+tiny;
    s.grid.material.opacity=(current.printed||current.patterned||nowTrench)?.43:.29;
    s.locator.position.y=surfaceY+tiny*1.2;
    s.locator.visible=(shape==='wafer'&&!section)||section;
    if(s.orientation)s.orientation.position.y=surfaceY+tiny;
    s.metal.position.y=surfaceY+tiny*.25;
    s.metal.scale.y=section?.00115:.000013;
    s.metal.visible=current.patterned&&!nowTrench;
    const siteHeight=section?.00155:.000009;
    const newSites=current.siteFaces&&!planState.siteFaces;
    part(s.sites,bottomRelief?applied-siteHeight:substrateTop+applied*.46,siteHeight*(newSites?Math.max(.06,blend):1),current.siteFaces&&!nowTrench);
    if(s.metal.visible||s.sites.visible){const col=COLOUR[current.material]??COLOUR.metal;copper.color.setHex(col);}
    s.image.position.y=surfaceY+tiny*1.35;
    s.image.visible=current.printed&&!nowTrench;
    metadata.face=back?'rear':'front';
    metadata.donorLayers=visibleDonorCount;
    metadata.activeFeature=visibleDonorCount?'donor-layers':showingBoxClear?'box-clear':fillLevel>0?'filled-trenches':nowTrench?'trenches':s.sites.visible?'site-faces':nowWindow?'openings':s.metal.visible?'metal':s.image.visible?'pattern':coating?'film':'blank';
  }
  function renderAssembly(w,t,run,hasSource,switched,effect,authored,gap){
    assembled.scale.set(w,t,w);
    const dims=authored?.boardSizeMm;
    const actualBoard=Array.isArray(dims)&&number(dims[0],.5,120)!==undefined&&number(dims[1],.5,120)!==undefined;
    const pinned=typeof authored?.assemblyType==='string'&&authored.assemblyType.length>0;
    const type=pinned?authored.assemblyType:null;
    const useBoard=pinned?PCB_TYPES.has(type):actualBoard||hasSource||(switched?state.shapeAfter:state.from).board||(effect==='assemble'&&state.shapeAfter.board);
    const longest=actualBoard?Math.max(dims[0],dims[1]):undefined;
    if(actualBoard){
      if(section)assembled.scale.z=w*(Math.min(dims[0],dims[1])/longest)*(.95/.61);
      else assembled.scale.set(longest/950,t,Math.min(dims[0],dims[1])/610);
    }
    metadata.boardOutlineAuthored=actualBoard&&useBoard;
    if(metadata.boardOutlineAuthored)metadata.authoredWidthMm=longest;
    metadata.assemblyType=type??(useBoard?'carrier-witness':'laminate-witness');
    boardGroup.visible=useBoard;laminate.visible=!useBoard;
    boardBase.material=type==='flex-headstage'?flex:pcb;
    copper.color.setHex(COLOUR.gold);
    const milestone=authored?.verified!==false&&(run>=.61||switched)?(authored?.assemblyAfter??authored?.assemblyBefore):authored?.assemblyBefore;
    const attached=hasSource&&(milestone?.attached??true);
    const bonded=attached&&milestone?.bonded===true;
    const encapsulated=bonded&&milestone?.encapsulated===true;
    const plated=attached&&milestone?.plated===true;
    assemblyState.attached=!!attached;assemblyState.bonded=bonded;
    assemblyState.encapsulated=encapsulated;assemblyState.plated=plated;
    genericBonded.visible=useBoard&&!hasSource&&!milestone;
    mounted.visible=useBoard&&attached;
    if(section)registerLayer(type==='pcb'?'PCB carrier':type==='flex-headstage'?'Flex/headstage carrier witness':useBoard?'Carrier witness':'Flexible carrier witness',gap);
    wireArcs.visible=false;epoxy.visible=false;
    if(mounted.visible){
      const thicknessUm=number(authored?.shankThicknessUm??authored?.deviceLayerUm,.01,250);
      const long=section?(actualBoard?w*.95*nativeMm/longest:w*.58):nativeMm/1000;
      const thick=section?.0039:(thicknessUm??23)/1e6, film=section?.00105:.0000014;
      metadata.mountedDieThicknessUm=thicknessUm??23;
      assignPadFrame(authored?.bondPadCentersUm);
      const overlap=padCount?Math.min(.91,Math.max(.16,padMaxX+.072)):.23;
      const lx=long/assembled.scale.x,lz=long/assembled.scale.z;
      const mx=BOARD_HALF_X+(.5-overlap)*lx;
      if(section&&bonded)metadata.explodeBlockedReason='Bonded die and carrier stay connected; the inspector does not stretch or break the wire bonds.';
      const dieGap=section?registerLayer('Mounted silicon die',bonded?0:gap):0;
      mounted.scale.set(lx,1/t,lz);
      mounted.position.set(mx,BOARD_SEAT+dieGap/t,0);
      mountBody.geometry=nativeGeom;mountBody.scale.y=thick;
      mountFilm.geometry=nativeHoleG??nativeGeom;mountFilm.visible=!!nativeHoleG;mountFilm.position.y=thick;mountFilm.scale.y=film;
      mountDots.geometry=siteDots.geometry;mountDots.count=siteDots.count;mountDots.boundingSphere=siteDots.boundingSphere;mountDots.boundingBox=siteDots.boundingBox;
      mountDots.position.y=thick+film*1.08;mountDots.scale.y=section?.00033:.0000012;
      mountedSiteMat.color.setHex(plated?COLOUR.gold:type==='flex-headstage'?COLOUR.tin:COLOUR.metal);
      mountedSiteMat.emissive.setHex(plated?0x583d14:0x354a52);
      nativeFilmPair[0].color.setHex(COLOUR.nitride);
      padDots.visible=padCount>0;padDots.position.y=thick+film*1.12;padDots.scale.y=section?.00065:.0000018;
      metadata.nativeBondPadCount=padCount;
      if(bonded&&padCount){
        renderWires(mx,lx,lz,padDots.position.y+.5*padDots.scale.y,t);
        wireArcs.visible=true;epoxy.visible=encapsulated;
        metadata.bondWireCount=padCount;
        metadata.bondLandingEvidence='Layout-derived die centers; PCB landing centers and wire arches are illustrative.';
      }
    }
    metadata.activeFeature=useBoard?'carrier':'laminate';
  }
  function update(args={}) {
    if(disposed)return metadata;
    const {shape='wafer',sizeMm,effect='none',before='',after='',progress=0,outgoingShape,authored}=args;
    const explode=section&&Number.isFinite(args.explode)?clamp(args.explode):0;
    const gap=explode*EXPLODE_GAP;
    const a=hasShape(shape)?shape:'none', b=hasShape(outgoingShape)?outgoingShape:a;
    const phase=number(progress,-1e9,1e9)??0;
    const run=smooth((phase-RUN_BEGIN)/(RUN_END-RUN_BEGIN));
    const swapping=b!==a;
    const switched=swapping&&run>=.61;
    const display=switched?b:a;
    const providedFeature=authored?.afterFeature??authored?.feature;
    if(before!==cachedBefore||after!==cachedAfter||effect!==cachedEffect||providedFeature!==cachedKey||
       authored?.beforeFeature!==cachedBeforeKey||authored?.face!==cachedFace||authored?.stack!==cachedStack||
       authored?.beforeMaterial!==cachedBeforeMat||authored?.afterMaterial!==cachedAfterMat){
      state=target(effect,before,after,authored);
      cachedBefore=before;cachedAfter=after;cachedEffect=effect;cachedKey=providedFeature;
      cachedBeforeKey=authored?.beforeFeature;cachedFace=authored?.face;cachedStack=authored?.stack;
      cachedBeforeMat=authored?.beforeMaterial;cachedAfterMat=authored?.afterMaterial;
    }
    const profile=switched?authored?.outgoingProfile:authored?.profile;
    const hasSource=(display==='die'||display==='assembly')&&!!authored?.outlineUm&&assignNative(authored.outlineUm,authored.sitesUm,authored.siteMarkerUm,authored.siteOpeningUm);
    const withNative=display==='die'&&hasSource;
    const form=withNative?'native':display==='die'&&(profile==='utah-square'||profile==='square-coupon')?'panel':display==='die'&&profile==='shank'?'shank':display;
    if(form!==active){
      active=form;
      for(const f of bases)f.visible=display==='assembly'?f===assembled:withNative?f===nativeRoot:f===shapes[form]?.f;
    }
    group.visible=display!=='none';
    const chosenSize=switched?(authored?.outgoingSizeMm??args.outgoingSizeMm):sizeMm;
    const chosenThickness=switched?(authored?.outgoingThicknessMm??args.outgoingThicknessMm):(authored?.thicknessMm??args.thicknessMm);
    const w=withNative&&!section?nativeMm/1000:authoredWidth(display,chosenSize,section);
    const dieUm=withNative?number(authored?.shankThicknessUm??authored?.deviceLayerUm,.01,250):undefined;
    const t=section&&withNative?.0041:authoredThickness(display,w,chosenThickness??(dieUm?dieUm/1000:undefined),section);
    metadata.widthMm=display==='none'?undefined:w*1000;
    metadata.authoredWidthMm=display==='none'?undefined:withNative?nativeMm:number(chosenSize,.25,460);
    metadata.diameterMm=display==='wafer'&&!section?w*1000:undefined;
    metadata.shape=display;metadata.profile=profile;metadata.substrateThicknessMm=display==='none'?undefined:t*1000;
    metadata.thicknessMm=metadata.substrateThicknessMm;
    metadata.authoredThickness=number(chosenThickness,.003,12)!==undefined||dieUm!==undefined;
    metadata.nativeOutline=hasSource;metadata.nativeOutlineWidthMm=hasSource?nativeSizeX:undefined;
    metadata.nativeOutlineLengthMm=hasSource?nativeSizeZ:undefined;metadata.nativeSiteCount=hasSource?siteDots.count:undefined;
    metadata.nativeApertureCount=hasSource?exactApertures:undefined;
    metadata.activeFeature='none';metadata.face='front';metadata.boardOutlineAuthored=false;metadata.mountedDieThicknessUm=undefined;metadata.donorLayers=0;
    metadata.layers.length=0;metadata.layerCount=0;metadata.exploded=0;metadata.canExplode=false;metadata.explodeBlockedReason=null;
    metadata.assemblyType=undefined;metadata.nativeBondPadCount=undefined;metadata.bondWireCount=0;metadata.bondLandingEvidence=undefined;
    assemblyState.attached=false;assemblyState.bonded=false;assemblyState.encapsulated=false;assemblyState.plated=false;
    if(display==='none'){
      metadata.scaleNote='Digital record or unresolved input; no visible workpiece.';
      return metadata;
    }
    const sub=(switched?authored?.outgoingSubstrate:authored?.substrate)??(display==='panel'?'glass':display==='film'?'polymer':'silicon');
    const bodyColor=sub&&Object.hasOwn(COLOUR,sub)?COLOUR[sub]:display==='panel'?COLOUR.glass:display==='film'?COLOUR.polymer:COLOUR.silicon;
    if(paintedBody!==bodyColor){paintedBody=bodyColor;silicon[0].color.setHex(bodyColor);silicon[1].color.setHex(scaleColour(bodyColor,.66));}
    if(display==='assembly')renderAssembly(w,t,run,hasSource,switched,effect,authored,gap);
    else if(withNative){
      const cur=switched?state.shapeAfter:state.change&&run>=.38?state.to:state.from;
      nativeRoot.scale.set(w,1,w);nativeBody.scale.y=t;
      nativeFilm.visible=(cur.dent||authored?.siteOpeningUm)&&!!nativeHoleG||ISOLATORS.has(cur.material);
      nativeFilm.geometry=(cur.dent||authored?.siteOpeningUm)&&nativeHoleG?nativeHoleG:nativeGeom;
      if(section)registerLayer('Silicon die',gap);
      const filmOffset=section&&nativeFilm.visible&&!!cur.knownLayer?registerLayer(nativeHoleG?'Surface film with site openings':'Surface film',gap):0;
      const filmHeight=section?.00105:.0000014;
      nativeFilm.position.y=t+filmOffset;nativeFilm.scale.y=filmHeight;
      if(nativeFilm.visible)nativeFilmPair[0].color.setHex(COLOUR[cur.material]??COLOUR.dielectric);
      siteDots.position.y=t+filmHeight*1.12+(section?0:.000000232);siteDots.scale.y=section?.00032:.0000012;
      metadata.activeFeature='authored-outline';
    }else{
      const cur=switched?state.shapeAfter:state.from;
      const thinning=effect==='thin'||effect==='grind'||(effect==='dice'||effect==='etch')&&THINNING.test(after);
      renderSurface(display,form,w,t,cur,state.to,switched?1:run,!swapping&&state.change,thinning?'thin':effect,authored,gap,sub);
    }
    if(section)finishLayers(explode);
    metadata.scaleNote=section?'Layer heights and feature sizes are exaggerated for inspection.':
      metadata.authoredWidthMm!==undefined?'Nominal plan scale. Thin-film contrast and illustrative markers are not process dimensions.':
        'Footprint and feature contrast are display proxies; the source did not specify the size.';
    return metadata;
  }
  function dispose(){
    if(disposed)return;
    disposed=true;
    siteDots.dispose?.();mountDots.dispose?.();padDots.dispose?.();
    for(const m of materials)m.dispose();
    for(const g of geometries)g.dispose();
    group.clear();group.visible=false;
  }
  update({shape:'none'});
  return {group,update,dispose};
}
/** Physical-scale plan footprint and nominal seating. */
export const makeWorkpiece = (THREE) => create(THREE,false);
/** Section only: enlarged contrast and layer heights, same input/state contract. */
export const makeSection = (THREE) => create(THREE,true);
