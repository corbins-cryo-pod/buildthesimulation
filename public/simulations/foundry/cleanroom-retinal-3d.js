/*
 * Solid 3-D teaching excerpt from Wang–Palanker (2012), §§2.1.1–2.1.4.
 * Footprints, width, contact diameter, Si depth and pitch come from the active
 * native research model's coupon(). Its seven-hex diagram is NOT mask CAD.
 * Never synthesize a specimen for the proprietary PRIMA/bench/unknown paths.
 * Geometry is composed in µm, then converted to metres once. Undocumented
 * support thicknesses, liner/metal widths, implant regions and routes are
 * schematic. This is geometry, not a recipe, optical solver or tissue model.
 */
const SLUG='retinal-photovoltaic-foundry',TAU=2*Math.PI,EPS=1e-7;
const IDS=['soi','window','drie','fill','cmp','n-plus','p-plus','anneal','route','nitride','reopen','electrode','release'];
const FEATURES=['soi-teaching-coupon','isolation-windows','etched-to-BOX','lined-trench-fill','planarized-polysilicon','n-plus-regions','p-plus-contacts','lower-optical-film','three-junction-series-links','nitride-contact-openings','selective-interpixel-reopen','central-and-return-IrOx','released-research-coupon'];
const clamp=(x,l=0,h=1)=>Math.max(l,Math.min(h,x));
const ramp=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v)};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2;
const clean=p=>p.filter((a,i)=>{const b=p[(i+1)%p.length];return Math.hypot(a[0]-b[0],a[1]-b[1])>EPS});
// Clip a convex polygon against n·p >= c (Sutherland–Hodgman).
function half(poly,n,c){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],u=dot(n,a)-c,v=dot(n,b)-c;
    if(u>=-EPS)out.push(a);
    if((u>EPS&&v< -EPS)||(u< -EPS&&v>EPS)){
      const t=u/(u-v);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
  }
  return clean(out);
}
function partition(poly,planes){
  let core=poly;const outside=[];
  for(const [n,c] of planes){
    const piece=half(core,[-n[0],-n[1]],-c);if(piece.length>=3&&Math.abs(area(piece))>EPS)outside.push(piece);
    core=half(core,n,c);if(core.length<3)break;
  }
  return {core,outside};
}
const polar=(x,z,r,a)=>[x+r*Math.cos(a),z+r*Math.sin(a)];
const disk=(x,z,r,n=28)=>Array.from({length:n},(_,j)=>polar(x,z,r,j*TAU/n));
const scaleAt=(p,x,z,f)=>p.map(([a,b])=>[x+(a-x)*f,z+(b-z)*f]);
function ring(out,inner){return out.map((a,i)=>[a,out[(i+1)%out.length],inner[(i+1)%out.length],inner[i]])}
function planes(poly){return poly.map(([x,z],i)=>{const [bx,bz]=poly[(i+1)%poly.length],n=[z-bz,bx-x];return [n,n[0]*x+n[1]*z]})}
function subtractHoles(poly,holes){let pieces=[poly];for(const hole of holes)pieces=pieces.flatMap(p=>partition(p,planes(hole)).outside);return pieces}
function stroke(a,b,w){
  const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz),x=-dz*w/(2*d),z=dx*w/(2*d);
  return [[a[0]-x,a[1]-z],[b[0]-x,b[1]-z],[b[0]+x,b[1]+z],[a[0]+x,a[1]+z]];
}
// Unit-height closed prisms. Batch by physical material/function so updating a
// live etch/fill does not allocate geometry every animation frame on mobile.
function builder(T,cut){
  const vertices=[],indices=[];
  function face(pts){
    const k=vertices.length/3;for(const p of pts)vertices.push(...p);
    for(let i=1;i<pts.length-1;i++)indices.push(k,k+i,k+i+1);
  }
  function add(raw){
    let p=cut==null?raw:half(raw,...cut);
    if(p.length<3||Math.abs(area(p))<EPS)return;
    if(area(p)<0)p=[...p].reverse();
    face(p.map(([x,z])=>[x,0,z]));face(p.map(([x,z])=>[x,1,z]).reverse());
    for(let i=0;i<p.length;i++){const [x,z]=p[i],[b,c]=p[(i+1)%p.length];face([[x,0,z],[x,1,z],[b,1,c],[b,0,c]])}
  }
  function perforate(outer,voids){
    const p=cut==null?outer:half(outer,...cut);
    if(p.length<3||Math.abs(area(p))<EPS)return;
    const active=[];let intersecting=false;
    for(const h of voids){
      const overlap=partition(h,planes(p)).core,inside=Math.abs(area(overlap)),want=Math.abs(area(h));
      if(inside<EPS)continue;
      if(Math.abs(inside-want)>1e-5)intersecting=true;
      active.push(h);
    }
    if(!active.length){add(p);return}
    // A partial hole breaks the cut face: clip the affected polygon into
    // convex fragments. Complete vias instead use one continuous cap with
    // triangulated holes and no internal coplanar walls.
    if(intersecting){for(const fragment of subtractHoles(p,active))add(fragment);return}
    const loops=[p,...active.map(h=>[...h].reverse())],v=loops.flat();
    const ids=T.ShapeUtils.triangulateShape(loops[0].map(a=>new T.Vector2(...a)),loops.slice(1).map(h=>h.map(a=>new T.Vector2(...a))));
    // Earcut emits a consistent top orientation; normalize to x/z winding.
    for(const tr of ids){const tri=tr.map(ii=>v[ii]);if(area(tri)<0)tri.reverse();
      face(tri.map(([x,z])=>[x,0,z]));face(tri.map(([x,z])=>[x,1,z]).reverse());}
    for(const loop of loops)for(let j=0;j<loop.length;j++){
      const [x,z]=loop[j],[b,c]=loop[(j+1)%loop.length];face([[x,0,z],[x,1,z],[b,1,c],[b,0,c]]);
    }
  }
  function finish(){
    if(!indices.length)return null;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
  }
  return {add,perforate,finish};
}
const MATERIAL={
  silicon:[0x678ba0,.38,.34],handle:[0x394e61,.48,.29],box:[0xbce1d6,.48,.08],
  liner:[0xd7ece0,.43,.07],fill:[0xc68553,.47,.20],mask:[0xbcd1bb,.47,.08],
  n:[0x69afd8,.52,.13],p:[0xbd7994,.52,.13],opt:[0x628fa4,.42,.17,.48],
  metal:[0xe2bd76,.32,.61],nitride:[0x75a8b1,.39,.18,.49],ir:[0x4a505c,.63,.44],
  irEdge:[0x727e8d,.56,.46],fault:[0xd4785f,.54,.18]
};
const PT={
  handle:['handle','Sacrificial silicon handle; thickness illustrative'],
  boxSi:['box','BOX below silicon and retained in-pixel fill'],
  boxGap:['box','Suspended BOX at the interpixel boundary'],
  wafer:['silicon','30 µm device silicon · preserved diode regions'],
  innerSi:['silicon','Silicon initially occupying internal channels'],outerSi:['silicon','Silicon initially occupying interpixel channels'],
  mask:['mask','Patterned thermal-oxide hard mask'],innerLiner:['liner','Internal thermal-oxide sidewalls'],
  outerLiner:['liner','External thermal-oxide sidewalls'],innerFill:['fill','Persistent internal polysilicon'],
  outerFill:['fill','Sacrificial external polysilicon'],cap:['fill','Polysilicon surface overburden'],
  n:['n','n⁺ junction locations · teaching markers'],p:['p','p⁺ contact locations · teaching markers'],
  optical:['opt','Lower optical film'],vias:['metal','First metal vias · schematic dimensions'],
  links:['metal','Two series links and isolated terminal routes inside each pixel'],
  nitride:['nitride','Nitride coating with second-via openings'],upperVia:['metal','Second-via metal contact nodes'],
  irCenter:['ir','Central IrOₓ contact'],irRing:['irEdge','Separate circumferential IrOₓ return'],
  defect:['fault','Selected synthetic edge obstruction; not manufacturing evidence']
};
function validCoupon(c,size){
  return [70,140,280].includes(+size)&&c?.widthUm===+size&&c.thicknessUm===30&&c.outerGapUm===5&&
    c.modelCenterDistanceUm===c.widthUm+c.outerGapUm&&c.activeDiameterUm==={70:20,140:40,280:80}[size]&&
    Array.isArray(c.pixels)&&c.pixels.length===7&&c.pixels.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.poly?.length===6&&p.poly.every(q=>q.length===2&&q.every(Number.isFinite)));
}
function assemble(T,section,c,fault,target,materials){
  const w=c.widthUm, gap=c.outerGapUm, d=gap/2, liner=.58;
  // The standalone section camera fits at a world-space minimum of 1 mm.
  // Uniform optical magnification only in the inspector; carrier actor is 1:1.
  const group=new T.Group();group.name=section?'Clipped seven-pixel teaching patch · magnified':'Wang research seven-pixel teaching patch';
  group.scale.setScalar((section?20:1)*1e-6);
  const physicalFault=['trench','stringer','oxide'].includes(fault);
  // Section the selected C–N edge longitudinally. A fixed front half-plane
  // would hide N2/N3 entirely and falsely suggest that the defect vanished.
  const focus=section&&physicalFault?c.pixels[target]:null;
  const yaw=focus?Math.atan2(focus.y,focus.x):0;
  if(section)group.rotation.y=yaw;
  const cut=section?[[Math.sin(yaw),-Math.cos(yaw)],-w*.10]:null;
  const b=Object.fromEntries(Object.keys(PT).map(k=>[k,builder(T,cut)]));
  const add=(k,polys)=>{for(const p of polys)b[k].add(p)};
  for(const pixel of c.pixels){
    const {x,y:z,poly}=pixel;
    const full=scaleAt(poly,x,z,(w+gap)/w),oxide=scaleAt(poly,x,z,(w+2*liner)/w);
    b.handle.add(full);b.boxSi.add(poly);b.cap.add(full);
    const gaps=ring(full,poly);
    add('boxGap',gaps);add('outerSi',gaps);add('outerLiner',ring(oxide,poly));add('outerFill',ring(full,oxide));
    const via=[],nplus=[],pplus=[],sectors=[];
    // Three true wedge islands; phases match the native oblique figure's
    // threefold symmetry. These are not recovered original mask coordinates.
    for(let j=0;j<3;j++){
      const a=Math.PI/2+j*TAU/3, h=a+TAU/3, mid=(a+h)/2;
      const ns=[[-Math.sin(a),Math.cos(a)],[Math.sin(h),-Math.cos(h)]];
      const cuts=t=>ns.map(n=>[n,n[0]*x+n[1]*z+t]);
      const cell=partition(poly,cuts(0)).core, carved=partition(cell,cuts(d)), filled=partition(cell,cuts(d-liner));
      const walls=partition(filled.core,cuts(d)).outside;
      b.wafer.add(carved.core);b.mask.add(carved.core);sectors.push(carved.core);
      add('innerSi',carved.outside);add('innerLiner',walls);add('innerFill',filled.outside);
      const n=polar(x,z,.29*w,mid-.21),p=polar(x,z,.29*w,mid+.21);nplus.push(n);pplus.push(p);
      b.n.add(disk(...n,w*.073));b.p.add(disk(...p,w*.045));
      for(const site of [n,p]){const v=disk(...site,w*.021,12);via.push(v);b.vias.add(v)}
    }
    const center=[x,z],endAngle=Math.PI/2+2*TAU/3+.83;
    const nearestNormal=Math.round(endAngle/(Math.PI/3))*Math.PI/3;
    const far=polar(x,z,w*.415/Math.cos(endAngle-nearestNormal),endAngle);
    // One endpoint -> n0, then p0 -> n1 and p1 -> n2, then p2 -> return.
    const chains=[[center,nplus[0]],[pplus[0],nplus[1]],[pplus[1],nplus[2]],[pplus[2],far]];
    for(const [a,h] of chains)b.links.add(stroke(a,h,w*.021));
    const endpoints=[center,far].map(p=>disk(...p,w*.023,16));
    for(const ep of endpoints)b.upperVia.add(ep);
    // Thin film coverage follows the isolated islands. Apertures are actually
    // cut in the solid, not drawn as dots above a closed coating.
    for(const island of sectors)b.optical.perforate(island,via);
    // The second dielectric bridges the filled in-pixel partitions and covers
    // the series routes. Neither film bridges the reopened interpixel gap.
    b.nitride.perforate(poly,endpoints);
    b.irCenter.add(disk(x,z,c.activeDiameterUm/2,36));
    add('irRing',ring(scaleAt(poly,x,z,.86),scaleAt(poly,x,z,.80)));
  }
  if(['trench','stringer','oxide'].includes(fault)){
    const p=c.pixels[target],dir=[p.x/c.modelCenterDistanceUm,p.y/c.modelCenterDistanceUm];
    const a=dir.map(x=>x*(w/2-w*.023)),h=dir.map(x=>x*(w/2+gap+w*.023));
    b.defect.add(stroke(a,h,.11*w));
  }
  const parts={};
  for(const [k,[mt,label]] of Object.entries(PT)){
    const geom=b[k].finish();if(!geom)continue;
    const materialKey=k==='defect'?({oxide:'box',stringer:'metal',trench:'fault'}[fault]||mt):mt;
    const o=new T.Mesh(geom,materials[materialKey]);o.name=k==='defect'?label+' · '+fault+' · C–N'+target:label;o.userData.pvPart=k;
    if(k==='defect')o.userData.syntheticMaterial={trench:'unetched silicon',stringer:'metal',oxide:'insulating BOX'}[fault];
    if(k==='optical'||k==='nitride')o.renderOrder=k==='optical'?2:3;
    parts[k]=o;group.add(o);
  }
  function show(k,y,height){
    const o=parts[k];if(!o)return;
    o.visible=height>.00001;if(o.visible){o.position.y=y;o.scale.y=height}
  }
  const nominalWidth=(Math.max(...c.pixels.flatMap(v=>v.poly.map(p=>p[0])))-Math.min(...c.pixels.flatMap(v=>v.poly.map(p=>p[0]))))*.001;
  function update(i,p){
    const v=k=>i>k?1:i<k?0:p;
    const formed=v(1),depth=v(2),fill=v(3),cmp=v(4), n=v(5),pc=v(6), anneal=v(7),route=v(8),coat=v(9),reopen=v(10),el=v(11),release=v(12);
    const handleRemaining=1-ramp(0,.77,release),acrossBOX=1-ramp(.76,1,release);
    // Device and oxide seat on the receding support. Only across-gap BOX
    // disappears; BOX beneath the silicon is intentionally retained.
    const handleH=16*handleRemaining,boxH=1.5,y0=handleH+boxH,t=c.thicknessUm,top=y0+t;
    const maskH=1.25*formed*(1-anneal),optH=.9*anneal,metalH=.85*route,nitH=.95*coat;
    show('handle',0,handleH);show('boxSi',handleH,boxH);show('boxGap',handleH,boxH*acrossBOX);
    show('wafer',y0,t);show('innerSi',y0,(1-depth)*t);show('outerSi',y0,(1-depth)*t);
    show('mask',top,maskH);show('innerLiner',y0,t*ramp(0,.40,fill));show('outerLiner',y0,t*ramp(0,.40,fill));
    show('innerFill',y0,(t+maskH)*ramp(.12,.87,fill));show('outerFill',y0,(t+maskH)*ramp(.12,.87,fill)*(1-reopen));
    show('cap',top+maskH,3.6*ramp(.65,1,fill)*(1-cmp));
    // Doping is shown by symbolic colored regions, not fabricated physical
    // deposit height or validated diffusion depth.
    show('n',top+maskH+.005,.14*n);show('p',top+maskH+.006,.14*pc);
    show('optical',top+.16,optH);show('vias',top+.16,optH*route);
    show('links',top+.16+optH,metalH);
    const metTop=top+.16+optH+metalH;
    show('nitride',metTop,nitH);show('upperVia',metTop,nitH*el);
    show('irCenter',metTop+nitH,1.25*el);show('irRing',metTop+nitH,1.25*el);
    if(fault==='trench')show('defect',y0,depth*3.3);
    if(fault==='stringer')show('defect',metTop+nitH,el*.75);
    if(fault==='oxide')show('defect',handleH,boxH*release);
    const f=FEATURES[i===0||p>0?i:i-1];
    const gapState=depth<=0?'uncut':depth<1?'etching':fill<=0?'open-to-BOX':fill<1?'lining-and-filling':reopen<=0?'filled':reopen<1?'reopening':'selectively-reopened';
    const strata=['handle','boxSi','wafer','mask','innerLiner','innerFill','cap','optical','links','nitride','irCenter'].filter(k=>parts[k]?.visible);
    return {shape:release>=1?'die':'panel',widthMm:nominalWidth+(release>=1?2*liner:gap)*.001,thicknessMm:(metTop+nitH+1.25*el)*.001,
      nominalPatchWidthMm:nominalWidth,totalThicknessAuthored:false,deviceLayerThicknessUm:t,substrateThicknessMm:t*.001,authoredWidthMm:undefined,authoredThickness:true,section,canExplode:false,exploded:0,
      layerCount:strata.length,materialStrata:strata.map(k=>PT[k][1]),activeFeature:f,
      explodeBlockedReason:'Use the exposed cut face to distinguish in-pixel fill from the interpixel opening. The crop is not an exploded vendor layer model.',
      scaleNote:'Seven-pixel Wang research excerpt; not an entire wafer or commercial mask. Native in-plane widths and 30 µm Si; schematic thin films, support and routes.'+(section?' Section cut, uniformly magnified.':''),
      nativeSiteCount:7,nominalPixelWidthUm:w,centerDiameterUm:c.activeDiameterUm,intraPixelJunctionCount:3,
      processFraction:p,etchedDepthUm:t*depth,externalTrench:gapState,internalFillPresent:fill>0,overburdenPresent:parts.cap.visible,
      underSiBOX:true,acrossGapBOX:acrossBOX>0||fault==='oxide'&&release===1,carrierAttached:handleRemaining>0,
      syntheticFaultEdge:['trench','stringer','oxide'].includes(fault)&&parts.defect?.visible?'C–N'+target:null,
      releaseResult:i<12||p<1?'not-released':['trench','stringer','oxide'].includes(fault)?'obstructed':'clear',
      evidence:'Wang et al. (2012), §§2.1.1–2.1.4; 10.1088/1741-2560/9/4/046014. Native seven-pixel teaching patch; not PRIMA.'};
  }
  return {group,update,dispose(){Object.values(parts).forEach(o=>o.geometry.dispose());group.clear()}};
}
export function makeRetinaWorkpiece(T,{section=false}={}){
  const group=new T.Group();group.name='Wang retinal research workpiece';group.visible=false;
  const materials=Object.fromEntries(Object.entries(MATERIAL).map(([k,[color,roughness,metalness,alpha=1]])=>[k,new T.MeshStandardMaterial({color,roughness,metalness,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1})]));
  let live=null,key=null,disposed=false;
  function hide(){group.visible=false;group.userData.workpiece=null;return null}
  return {group,update({profile,phaseId,branch,progress=0,dataset={}}={}){
    if(disposed||profile!==SLUG||branch!=='wang'||(dataset?.route&&dataset.route!=='wang')||dataset?.mode&&dataset.mode!=='traveler')return hide();
    const i=IDS.findIndex(id=>phaseId==='pv-'+id);if(i<0||!Number.isFinite(progress))return hide();
    if(![70,140,280].includes(Number(dataset?.size)))return hide();
    const c=dataset?.coupon??globalThis.PVModel?.coupon?.(dataset.size);
    if(!validCoupon(c,dataset?.size))return hide();
    const fault=dataset.fault??'nominal',target=Number(dataset.target??1);
    if(!['nominal','trench','stringer','oxide','shade','leakage'].includes(fault)||!Number.isInteger(target)||target<1||target>6)return hide();
    const next=[c.widthUm,fault,target].join(':');
    if(next!==key){if(live){group.remove(live.group);live.dispose()}live=assemble(T,section,c,fault,target,materials);key=next;group.add(live.group)}
    group.visible=true;const meta=live.update(i,ramp(.57,.81,progress));group.userData.workpiece=meta;return meta;
  },dispose(){if(disposed)return;disposed=true;live?.dispose();live=null;key=null;for(const m of Object.values(materials))m.dispose();group.clear();group.visible=false}};
}
