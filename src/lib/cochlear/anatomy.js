/**
 * Registered anatomical display of the Cochlear Implant Laboratory.
 *
 * Macro surfaces: one CC BY 4.0 OpenEar human specimen (ZETA).
 * Microanatomy: explicitly reconstructed histology. No mesh here is an
 * electrical-conductivity boundary, nerve solver geometry or surgical model.
 * See docs/cochlear/ANATOMY_SOURCES.md and the asset's original-member hashes.
 */
import atlasReference from './atlas-reference.json' with { type: 'json' };
import { createImplantGeometry } from './implantGeometry.js';
import { createNeuronAnatomyScene } from './neuronAnatomy.js';

export const ANATOMY_ATLAS_URL = '/assets/cochlear/openear-zeta-atlas.json';
export const ANATOMY_REFERENCE = atlasReference;
const C = Object.freeze({ bone:'#d7cdb7', st:'#73b4ae', sv:'#9eabc6', sm:'#e5c789', bm:'#c87d75', rm:'#d7c4a3', tm:'#aeb5ce', nerve:'#c49a52', myelin:'#e0c99a', soma:'#d18a50', ihc:'#df9b80', ohc:'#ae87ad', support:'#86a69a', stereo:'#e5c682', synapse:'#bd6d59', typeII:'#7c98bb', inactive:'#9c9d96', metal:'#c8c9ce', carrier:'#919a9d' });
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a);return n>1e-12?mul(a,1/n):[1,0,0];};
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const bezier=(a,b,c,d,t)=>add(add(mul(a,(1-t)**3),mul(b,3*(1-t)**2*t)),add(mul(c,3*(1-t)*t*t),mul(d,t**3)));
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
let atlasPromise, lastAtlasError='';
const convertedCache=new WeakMap();

/** Failure returns null; the registered centreline reconstruction remains usable. */
export function loadAnatomyAtlas() {
  if(!atlasPromise) atlasPromise=(async()=>{
    try {
      const response=await fetch(ANATOMY_ATLAS_URL);
      if(!response.ok) throw new Error(`Anatomical atlas HTTP ${response.status}`);
      const atlas=await response.json();
      if(atlas.schema!=='cochlear-anatomy-atlas-v1'||atlas.units!=='mm'||!Array.isArray(atlas.meshes)) throw new Error('Invalid anatomical atlas metadata.');
      for(const mesh of atlas.meshes) if(!Array.isArray(mesh.positions)||mesh.positions.length%3||!Array.isArray(mesh.indices)||mesh.indices.length%3||!mesh.positions.every(Number.isFinite)||!mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.positions.length/3)) throw new Error('Invalid anatomical mesh.');
      return atlas;
    } catch(error) {lastAtlasError=String(error?.message||error);return null;}
  })();
  return atlasPromise;
}

/** Physical ST arc sampling; 35-mm place mapping is performed separately. */
export function sampleAnatomyCenterline(arcMm, centerline=atlasReference.centerline) {
  const distances=centerline.arcMm, points=centerline.displayPoints, s=clamp(arcMm,0,centerline.lengthMm);
  let lo=0,hi=distances.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(distances[mid]<s)lo=mid;else hi=mid;}
  const t=clamp((s-distances[lo])/Math.max(1e-12,distances[hi]-distances[lo]));
  const point=lerp(points[lo],points[hi],t);
  const tangent=norm(lerp(centerline.tangents[lo],centerline.tangents[hi],t));
  const inward=norm(lerp(centerline.inwardNormals[lo],centerline.inwardNormals[hi],t));
  const superior=norm(lerp(centerline.superiorNormals[lo],centerline.superiorNormals[hi],t));
  return {point,tangent,inward,superior,clearance: centerline.clearanceMm[lo]+t*(centerline.clearanceMm[hi]-centerline.clearanceMm[lo]),arcMm:s};
}
const placeFrame=(placeMm)=>sampleAnatomyCenterline(clamp(placeMm/35)*atlasReference.centerline.lengthMm);

function freshScene(mode){return {meshes:[],paths:[],markers:[],labels:[],notes:[],legend:[],mode,up:[0,1,0],units:'mm',provenanceLabel:'OpenEar ZETA · human CT + serial-section atlas; reconstructed microanatomy'};}
function label(scene,id,text,position,layer='anatomy',priority=1){scene.labels.push({id,text,position,layer,priority});}
function path(scene,id,points,radii,color,layer='anatomy',extra={}){scene.paths.push({id,points,radii,color,opacity:1,layer,radialSegments:6,...extra});}
function marker(scene,id,position,radius,color,layer='anatomy',extra={}){scene.markers.push({id,position,radius,color,layer,widthSegments:10,heightSegments:6,...extra});}
function mesh(id,color,layer='anatomy',opacity=1,role){return {id,positions:[],indices:[],color,opacity,layer,role};}
function appendTube(target,points,radius,sides=6,radii) {
  if(points.length<2)return;
  const start=target.positions.length/3;
  for(let i=0;i<points.length;i++) {
    const t=norm(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));
    const u=norm(cross(t,Math.abs(t[1])>.9?[1,0,0]:[0,1,0])),v=cross(t,u),r=radii?.[i]??radius;
    for(let k=0;k<sides;k++){const a=2*Math.PI*k/sides;target.positions.push(...add(points[i],add(mul(u,r*Math.cos(a)),mul(v,r*Math.sin(a)))));}
    if(i)for(let k=0;k<sides;k++){const a=start+(i-1)*sides+k,b=start+(i-1)*sides+(k+1)%sides,c=start+i*sides+k,d=start+i*sides+(k+1)%sides;target.indices.push(a,b,c,b,d,c);}
  }
  for(let k=1;k<sides-1;k++)target.indices.push(start,start+k+1,start+k,start+(points.length-1)*sides,start+(points.length-1)*sides+k,start+(points.length-1)*sides+k+1);
}
function appendEllipsoid(target,position,radii,longitude=8,latitude=5) {
  const start=target.positions.length/3;
  for(let j=0;j<=latitude;j++)for(let k=0;k<=longitude;k++){const p=Math.PI*j/latitude,a=2*Math.PI*k/longitude;target.positions.push(position[0]+radii[0]*Math.sin(p)*Math.cos(a),position[1]+radii[1]*Math.cos(p),position[2]+radii[2]*Math.sin(p)*Math.sin(a));}
  for(let j=0;j<latitude;j++)for(let k=0;k<longitude;k++){const a=start+j*(longitude+1)+k,b=a+longitude+1;if(j)target.indices.push(a,b,a+1);if(j<latitude-1)target.indices.push(a+1,b,b+1);}
}
/** Representative flask-shaped IHC, broad basally with a narrow apical neck. */
function appendInnerHairCell(target,plate,z) {
  const profiles=[
    [0,.0033,.0027,.002], [.12,.0078,.005,.0015], [.32,.011,.0065,.0005],
    [.50,.0102,.0062,-.0001], [.69,.0075,.0056,-.0007],
    [.84,.0052,.0049,-.0012], [1,.0054,.0049,-.0015],
  ];
  const start=target.positions.length/3,rows=20,sides=12,bottom=.017,top=.069;
  let section=0;
  for(let j=0;j<=rows;j++){
    const u=j/rows;while(section<profiles.length-2&&u>profiles[section+1][0])section++;
    const a=profiles[section],b=profiles[section+1],t=clamp((u-a[0])/(b[0]-a[0]));
    const before=profiles[Math.max(0,section-1)],after=profiles[Math.min(profiles.length-1,section+2)];
    const interpolate=k=>{
      const width=b[0]-a[0],ma=width*(b[k]-before[k])/(b[0]-before[0]),mb=width*(after[k]-a[k])/(after[0]-a[0]);
      return (2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*ma+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*mb;
    };
    const rx=interpolate(1),rz=interpolate(2),x=-.079+interpolate(3),y=bottom+(top-bottom)*u;
    for(let k=0;k<sides;k++){const angle=2*Math.PI*k/sides;target.positions.push(x+rx*Math.cos(angle),y,z+rz*Math.sin(angle));}
    if(j)for(let k=0;k<sides;k++){const a=start+(j-1)*sides+k,b=start+(j-1)*sides+(k+1)%sides,c=start+j*sides+k,d=start+j*sides+(k+1)%sides;target.indices.push(a,c,b,b,c,d);}
  }
  const base=target.positions.length/3;target.positions.push(-.077,bottom,z,-.0805,top,z);
  for(let k=0;k<sides;k++){target.indices.push(base,start+(k+1)%sides,start+k,base+1,start+rows*sides+k,start+rows*sides+(k+1)%sides);}
  const cap=plate.positions.length/3;plate.positions.push(-.0805,top+.00008,z);
  for(let k=0;k<sides;k++){const angle=2*Math.PI*k/sides;plate.positions.push(-.0805+.00535*Math.cos(angle),top+.00008,z+.00485*Math.sin(angle));}
  for(let k=0;k<sides;k++)plate.indices.push(cap,cap+1+k,cap+1+(k+1)%sides);
}
function appendRibbon(target,left,right) {
  const start=target.positions.length/3;
  for(let i=0;i<left.length;i++){target.positions.push(...left[i],...right[i]);if(i){const a=start+2*(i-1);target.indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
}
function addDisk(scene,id,center,normal,radius,color,extra={}) {
  const t=norm(normal),u=norm(cross(t,Math.abs(t[1])>.9?[1,0,0]:[0,1,0])),v=cross(t,u),m=mesh(id,color,'implant',1,'contact');
  m.positions.push(...center);
  for(let i=0;i<20;i++){const angle=i*Math.PI/10;m.positions.push(...add(center,add(mul(u,radius*Math.cos(angle)),mul(v,radius*Math.sin(angle)))));}
  for(let i=0;i<20;i++)m.indices.push(0,i+1,(i+1)%20+1);
  scene.meshes.push({...m,...extra});
}
function compactMesh(original,accept) {
  const positions=[],indices=[],mapping=new Map();
  for(let i=0;i<original.indices.length;i+=3){const ids=original.indices.slice(i,i+3),pts=ids.map(j=>original.positions.slice(j*3,j*3+3));const center=mul(add(add(pts[0],pts[1]),pts[2]),1/3);if(!accept(center,pts))continue;for(const j of ids){if(!mapping.has(j)){mapping.set(j,positions.length/3);positions.push(...original.positions.slice(j*3,j*3+3));}indices.push(mapping.get(j));}}
  return {...original,positions,indices};
}
/** Cut triangles at interpolated zero contours, retaining shared edge vertices. */
function clipMesh(original,signedDistance) {
  const input=original.positions, values=Array.from({length:input.length/3},(_,i)=>signedDistance(input.slice(i*3,i*3+3)));
  const positions=[],indices=[],mapping=new Map();
  const vertex=i=>({key:`v${i}`,point:input.slice(i*3,i*3+3),distance:values[i],index:i});
  const append=v=>{if(!mapping.has(v.key)){mapping.set(v.key,positions.length/3);positions.push(...v.point);}return mapping.get(v.key);};
  for(let i=0;i<original.indices.length;i+=3){
    const polygon=original.indices.slice(i,i+3).map(vertex),clipped=[];
    for(let k=0;k<3;k++){
      const a=polygon[k],b=polygon[(k+1)%3],insideA=a.distance>=0,insideB=b.distance>=0;
      if(insideA)clipped.push(a);
      if(insideA!==insideB){const t=a.distance/(a.distance-b.distance);clipped.push({key:`e${Math.min(a.index,b.index)}-${Math.max(a.index,b.index)}`,point:lerp(a.point,b.point,t),distance:0});}
    }
    for(let k=1;k<clipped.length-1;k++)indices.push(append(clipped[0]),append(clipped[k]),append(clipped[k+1]));
  }
  return {...original,positions,indices};
}
function largestMeshComponent(original) {
  const count=original.positions.length/3,parent=Array.from({length:count},(_,i)=>i);
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<original.indices.length;i+=3){const a=root(original.indices[i]);parent[root(original.indices[i+1])]=a;parent[root(original.indices[i+2])]=a;}
  const counts=new Map();for(const i of original.indices){const r=root(i);counts.set(r,(counts.get(r)||0)+1);}
  const selected=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0],accepted=new Set();
  for(let i=0;i<count;i++)if(root(i)===selected)accepted.add(i);
  const positions=[],indices=[],mapping=new Map();
  for(let i=0;i<original.indices.length;i+=3)if(accepted.has(original.indices[i]))for(const j of original.indices.slice(i,i+3)){if(!mapping.has(j)){mapping.set(j,positions.length/3);positions.push(...original.positions.slice(j*3,j*3+3));}indices.push(mapping.get(j));}
  return {...original,positions,indices};
}
function nearestFrame(point) {
  const c=atlasReference.centerline;let best=0,d=Infinity;
  for(let i=0;i<c.displayPoints.length;i++){const q=sub(point,c.displayPoints[i]),distance=dot(q,q);if(distance<d){best=i;d=distance;}}
  let segment=best,t=0,closest=c.displayPoints[best];
  for(let i=Math.max(0,best-1);i<=Math.min(best,c.displayPoints.length-2);i++){const a=c.displayPoints[i],v=sub(c.displayPoints[i+1],a),u=clamp(dot(sub(point,a),v)/dot(v,v)),p=add(a,mul(v,u)),q=sub(point,p),distance=dot(q,q);if(distance<=d){d=distance;segment=i;t=u;closest=p;}}
  const next=Math.min(segment+1,c.displayPoints.length-1);
  return {point:closest,inward:norm(lerp(c.inwardNormals[segment],c.inwardNormals[next],t)),superior:norm(lerp(c.superiorNormals[segment],c.superiorNormals[next],t)),clearance:c.clearanceMm[segment]+t*(c.clearanceMm[next]-c.clearanceMm[segment]),distance:Math.sqrt(d),index:segment};
}
function measuredMeshes(atlas) {
  if(convertedCache.has(atlas))return convertedCache.get(atlas);
  const r=atlas.nativeToDisplayRowMajor;
  const result=atlas.meshes.map(original=>{
    const positions=[];
    for(let i=0;i<original.positions.length;i+=3){const [x,y,z]=original.positions.slice(i,i+3);positions.push(r[0]*x+r[1]*y+r[2]*z+r[3],r[4]*x+r[5]*y+r[6]*z+r[7],r[8]*x+r[9]*y+r[10]*z+r[11]);}
    const transformed={...original,positions};
    if(original.id==='scala-vestibuli-vestibular-labyrinth') {
      const entry=atlasReference.centerline.entryFrame;
      return clipMesh(clipMesh(transformed,p=>{const f=nearestFrame(p);return Math.max(1.10,2*f.clearance+.58)-f.distance;}),p=>dot(sub(p,entry.position),entry.tangent)+.12);
    }
    if(original.id==='cochleovestibular-nerve') {
      const axis=atlasReference.centerline.estimatedModiolarAxisPoint;
      return largestMeshComponent(clipMesh(clipMesh(transformed,p=>p[1]+2.5),p=>2.1-Math.hypot(p[0]-axis[0],p[2]-axis[2])));
    }
    return transformed;
  });convertedCache.set(atlas,result);return result;
}
function addMacroSurfaces(scene,atlas,cutaway) {
  if(atlas?.meshes?.length) {
    for(const m of measuredMeshes(atlas)){
      const isST=m.id==='scala-tympani',isNerve=m.id==='cochleovestibular-nerve';
      const cropped=cutaway&&!isNerve?clipMesh(m,p=>{const f=nearestFrame(p);return .08-dot(sub(p,f.point),norm([.2,.35,1]));}):m;
      if(cropped.indices.length)scene.meshes.push({...cropped,color:isST?C.st:isNerve?'#c0b291':C.sv,opacity:isNerve?.12:cutaway?.48:.55,layer:isNerve?'nerve':'scala',role:isNerve?'measured-nerve':'measured-scala'});
    }
  } else {
    // Reconstructed surfaces follow the measured ST medial curve; this is a
    // transparent fallback, not a claim that the unavailable meshes loaded.
    const frames=Array.from({length:101},(_,i)=>sampleAnatomyCenterline(atlasReference.centerline.lengthMm*i/100));
    path(scene,'reconstructed-ST',frames.map(f=>f.point),frames.map(f=>f.clearance),C.st,'scala',{opacity:.35,radialSegments:10,role:'reconstructed-scala'});
    path(scene,'reconstructed-SV',frames.map(f=>add(f.point,mul(f.superior,f.clearance*1.4))),frames.map(f=>f.clearance*.8),C.sv,'scala',{opacity:.25,radialSegments:10,role:'reconstructed-scala'});
    scene.notes.push(`Measured surface asset unavailable${lastAtlasError?` (${lastAtlasError})`:''}. Lumen surfaces are reconstructed around the measured ST centreline; they are not the original mesh.`);
  }
  const frames=Array.from({length:111},(_,i)=>sampleAnatomyCenterline(atlasReference.centerline.lengthMm*(.025+.95*i/110)));
  const bm=mesh('basilar-membrane',C.bm,'membrane',.92,'basilar-membrane'),rm=mesh('reissner-membrane',C.rm,'membrane',.32,'reissner-membrane'),sm=mesh('scala-media',C.sm,'scala',.23,'reconstructed-scala-media'),osl=mesh('osseous-spiral-lamina',C.bone,'bone',.85,'osseous-lamina');
  const bmInner=[],bmOuter=[],medial=[],rmOuter=[];
  frames.forEach((f,i)=>{
    const u=i/(frames.length-1),width=.13+.29*u,roof=add(f.point,mul(f.superior,.72*f.clearance));
    const outer=add(roof,mul(f.inward,-.58*f.clearance)),inner=add(outer,mul(f.inward,width));
    bmInner.push(inner);bmOuter.push(outer);medial.push(add(inner,mul(f.inward,Math.max(.15,1.25*(1-u)))));rmOuter.push(add(outer,mul(f.superior,.35+.10*(1-u))));
  });
  appendRibbon(bm,bmInner,bmOuter);appendRibbon(osl,medial,bmInner);appendRibbon(rm,medial,rmOuter);appendRibbon(sm,bmOuter,rmOuter);
  scene.meshes.push(bm,rm,sm,osl);
  // Organ of Corti is a small ridge, not a nerve or electrode tube.
  path(scene,'organ-of-corti-ridge',bmInner.map((p,i)=>add(p,add(mul(frames[i].inward,-.035),mul(frames[i].superior,.035)))),.035,C.ohc,'organ',{radialSegments:5,role:'reconstructed-organ'});
  const axis=atlasReference.centerline.estimatedModiolarAxisPoint;
  const core=mesh('reconstructed-modiolus',C.bone,'bone',cutaway?.36:.48,'modiolus');
  const rows=24,sides=20,minY=-1.9,maxY=1.95;
  for(let j=0;j<=rows;j++){const u=j/rows,r=.95*(1-u)+.16,y=minY+(maxY-minY)*u;for(let k=0;k<=sides;k++){const a=2*Math.PI*k/sides;core.positions.push(axis[0]+r*Math.cos(a),y,axis[2]+r*.85*Math.sin(a));}}
  for(let j=0;j<rows;j++)for(let k=0;k<sides;k++){const a=j*(sides+1)+k;if(cutaway&&Math.sin((k+.5)*2*Math.PI/sides)>.15)continue;core.indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
  scene.meshes.push(core);
  label(scene,'modiolus','Modiolus · reconstructed bony core',[axis[0],-.6,axis[2]],'bone',3);
  const f=sampleAnatomyCenterline(atlasReference.centerline.lengthMm*.25);
  label(scene,'st',atlas?'Scala tympani · measured lumen':'Scala tympani · centreline reconstruction',f.point,'scala',4);
  label(scene,'sv',atlas?'Scala vestibuli · measured surface':'Scala vestibuli · reconstructed position',add(f.point,mul(f.superior,.9)),'scala',3);
  label(scene,'sm','Scala media · reconstructed wedge',add(f.point,add(mul(f.superior,.58),mul(f.inward,-.24))),'scala',3);
  label(scene,'bm','Basilar membrane',bmOuter[44],'membrane',2);
  label(scene,'rm','Reissner’s membrane',rmOuter[58],'membrane',2);
  label(scene,'osl','Osseous spiral lamina',medial[34],'bone',1);
  label(scene,'base','Basal entry / round-window region',atlasReference.centerline.displayPoints[0],'landmark',4);
  label(scene,'apex','Apical scala / helicotrema region',atlasReference.centerline.displayPoints.at(-1),'landmark',4);
}
function addGenericArray(scene,geometry) {
  const contacts=geometry?.contacts??[];
  const points=contacts.map(c=>placeFrame(c.positionMm[0]).point);
  if(points.length>1){const first=contacts[0].positionMm[0],last=contacts.at(-1).positionMm[0];const smooth=Array.from({length:91},(_,i)=>placeFrame(first+(last-first)*i/90).point);path(scene,'reference-carrier',smooth,.105,C.carrier,'implant',{radialSegments:10,role:'reference-carrier'});}
  for(const contact of contacts){const f=placeFrame(contact.positionMm[0]);addDisk(scene,`source-${contact.index}`,add(f.point,mul(f.inward,.11)),f.inward,contact.radiusMm,contact.active?C.metal:C.inactive,{contactIndex:contact.index,role:'reference-contact'});}
  if(contacts.length)label(scene,'generic-array','Generic calculated source array · display mapping',points[Math.floor(points.length/2)],'implant',5);
}
function nerveCurve(fiber,model) {
  const f=placeFrame(fiber.placeMm),axis=atlasReference.centerline.estimatedModiolarAxisPoint;
  const roof=add(f.point,mul(f.superior,.72*f.clearance+.045)),start=add(roof,mul(f.inward,.06));
  const radial=norm([axis[0]-start[0],0,axis[2]-start[2]]),distance=Math.hypot(axis[0]-start[0],axis[2]-start[2]);
  const soma=add(start,add(mul(radial,Math.max(.35,distance*.58)),mul(f.superior,-.04)));
  const end=[axis[0]+.2+fiber.index*.004,-3.5,axis[2]-.25];
  const p=model.positionsMm,first=p[0],last=p.at(-1),soma0=p[15],soma1=p[24];
  const points=Array.from(p,(value,index)=>{
    if(index<15){const t=clamp((value-first)/(soma0-first));return bezier(start,add(start,mul(radial,.3)),add(soma,mul(radial,-.2)),add(soma,mul(radial,-.045)),t);}
    if(index<=24)return add(soma,mul(radial,((value-soma0)/(soma1-soma0)-.5)*.09));
    const t=clamp((value-soma1)/(last-soma1));return bezier(add(soma,mul(radial,.045)),add(soma,add(mul(radial,.4),[0,-.3,0])),[axis[0]+.15,-2.2,axis[2]-.1],end,t);
  });return {points,soma,start};
}
function addNerves(scene,geometry,model,selectedFiber) {
  if(!model?.positionsMm||!geometry?.fibers?.length)return;
  const all=geometry.fibers,chosen=new Set([clamp(Number(selectedFiber)||0,0,all.length-1)]);
  for(let i=0;i<7;i++)chosen.add(Math.round(i*(all.length-1)/6));
  for(const index of [...chosen].sort((a,b)=>a-b)){
    const fiber=all[index],active=fiber.alive!==false,{points,soma,start}=nerveCurve(fiber,model);
    path(scene,`type-I-${index}`,points,.009,active?C.nerve:C.inactive,'nerve',{fiberIndex:index,compartmentIndices:points.map((_,i)=>i),radialSegments:5,opacity:active?1:.2,role:'model-type-I'});
    // Human ganglion somata are bare; the myelin is restricted to processes.
    marker(scene,`soma-${index}`,soma,.045,active?C.soma:C.inactive,'nerve',{fiberIndex:index,compartmentIndex:model.somaIndex,scale:[1,.85,1],opacity:active?1:.2,role:'model-soma'});
    for(let j=1;j<model.compartmentCount-1;j++)if(model.type[j].endsWith('internode')){
      const a=lerp(points[j-1],points[j],.18),b=lerp(points[j],points[j+1],.82);
      path(scene,`myelin-${index}-${j}`,[a,points[j],b],.016,C.myelin,'myelin',{fiberIndex:index,compartmentIndices:[j,j,j],radialSegments:5,opacity:active?.95:.16,role:'model-myelin'});
    }
    marker(scene,`terminal-${index}`,start,.013,C.synapse,'nerve',{fiberIndex:index,compartmentIndex:0,widthSegments:6,heightSegments:4});
  }
  const selected=all[clamp(Number(selectedFiber)||0,0,all.length-1)],curve=nerveCurve(selected,model);
  label(scene,'sgn','Spiral ganglion · bare human somata',curve.soma,'nerve',5);
  label(scene,'type-I','Type I afferent · mapped model compartments',curve.points[7],'nerve',3);
  const f=placeFrame(17.5),p=add(f.point,add(mul(f.superior,.72*f.clearance+.03),mul(f.inward,-.1)));
  const typeII=Array.from({length:14},(_,i)=>{const g=placeFrame(17.5-i*.10);return add(g.point,add(mul(g.superior,.72*g.clearance+.025),mul(g.inward,-.1)));});
  typeII.unshift(add(p,mul(f.inward,.6)),add(p,mul(f.inward,.2)));
  path(scene,'type-II-outer-spiral',typeII,.008,C.typeII,'nerve',{radialSegments:5,role:'anatomical-type-II'});
  label(scene,'type-II','Type II outer-spiral afferent · anatomy only',typeII[8],'nerve',2);
  scene.notes.push('A bounded representative set of type I fibers is shown. Their curved routes are reconstructed display paths; compartment colors alone can show the actual cable replay. Neurites and somata are enlarged for visibility. Type II fibers and measured nerve trunks are anatomical context only.');
}
function organScene(geometry,model,selectedFiber) {
  const scene=freshScene('organ');scene.title='Organ of Corti';scene.subtitle='Reconstructed human microanatomy · millimetre coordinates, micrometre scale';scene.provenanceLabel='Procedural histology informed by human SEM/TEM studies';
  const ihc=mesh('inner-hair-cells',C.ihc,'hair-cell',1,'inner-hair-cell'),ohc=mesh('outer-hair-cells',C.ohc,'hair-cell',1,'outer-hair-cell'),support=mesh('supporting-cells',C.support,'support',.88,'supporting-cell'),stereo=mesh('stereocilia',C.stereo,'hair-cell',1,'stereocilia'),nuclei=mesh('cell-nuclei','#96765e','hair-cell',1,'nucleus'),synapses=mesh('ribbon-synapses',C.synapse,'nerve',1,'synapse'),plate=mesh('inner-cuticular-plates','#dab5a5','hair-cell',1,'cuticular-plate');
  const bm=mesh('organ-basilar-membrane',C.bm,'membrane',.9,'basilar-membrane');appendRibbon(bm,[[-.235,0,-.095],[-.235,0,.095]],[[.235,0,-.095],[.235,0,.095]]);scene.meshes.push(bm);
  const reticular=mesh('reticular-lamina','#d4a6a5','membrane',.25,'reticular-lamina');appendRibbon(reticular,[[-.098,.071,-.087],[-.098,.071,.087]],[[.147,.073,-.087],[.147,.073,.087]]);scene.meshes.push(reticular);
  const canopy=mesh('tectorial-membrane',C.tm,'membrane',.35,'tectorial-membrane');const left=[],right=[];
  // The tallest OHC bundles approach the canopy underside; IHC bundles remain
  // free beneath it. This is static topology, not a mechanical attachment model.
  for(let i=0;i<=30;i++){const x=-.215+.375*i/30,y=.0768+.026*x+.4*Math.max(0,-x)**2;left.push([x,y,-.092]);right.push([x,y,.092]);}appendRibbon(canopy,left,right);scene.meshes.push(canopy);
  const fiberIndex=clamp(Number(selectedFiber)||0,0,Math.max(0,(geometry?.fibers?.length??1)-1));
  for(let j=0;j<10;j++){
    const z=(j-4.5)*.016;
    appendInnerHairCell(ihc,plate,z);appendEllipsoid(nuclei,[-.079,.031,z],[.006,.006,.004]);
    // Inner hair-cell bundles form shallow arcs; OHC bundles are chevrons.
    for(let row=0;row<3;row++)for(let c=0;c<9;c++){const w=(c-4)/4,x=-.083+row*.0013+.0006*w*w,zz=z+w*.0042,h=.003+row*.00125;appendTube(stereo,[[x,.069,zz],[x,.069+h,zz]],.00023,4, [.00027,.00017]);}
    for(let row=0;row<3;row++){
      const x=.025+row*.037,top=.073+row*.001,bottom=.023-row*.001;
      appendTube(ohc,[[x,bottom,z],[x+.002,(top+bottom)/2,z],[x+.003,top,z]],.004,8,[.0037,.0045,.0038]);
      appendEllipsoid(nuclei,[x,.030,z],[.0032,.0045,.003]);
      appendTube(support,[[x-.004,.002,z],[x-.002,.014,z],[x,bottom,z]],.0032,6);
      appendTube(support,[[x-.004,.012,z],[x+.010,.046,z+.003],[x+.015,.073,z+.006]],.0014,5);
      for(let rank=0;rank<3;rank++)for(let c=0;c<9;c++){const w=(c-4)/4,xx=x-.001+Math.abs(w)*.0018+rank*.0011,zz=z+w*.0034,h=.0022+rank*.00115;appendTube(stereo,[[xx,top,zz],[xx,top+h,zz]],.00023,4,[.00026,.00016]);}
      appendEllipsoid(synapses,[x,bottom-.002,z],[.0015,.001,.0015],6,4);
    }
    // Pillar legs enclose a real triangular tunnel between IHC and OHC rows.
    appendTube(support,[[-.052,.001,z],[-.023,.036,z],[-.011,.071,z]],.0026,6);
    appendTube(support,[[.009,.001,z],[-.001,.037,z],[-.011,.071,z]],.003,6);
    appendEllipsoid(support,[.163,.030,z],[.013,.029,.007],10,6);
    appendEllipsoid(support,[-.106,.026,z],[.009,.026,.007],10,6);
    for(let n=0;n<3;n++){
      const zz=z+(n-1)*.0026,points=[[-.225,.009,zz-.008],[-.16,.012,zz-.004],[-.11,.015,zz],[-.083,.017,zz]];
      const isModel=j===5&&n===1&&model;
      path(scene,`organ-afferent-${j}-${n}`,points,.00075,C.nerve,'nerve',{radialSegments:5,role:isModel?'model-terminal':'anatomical-type-I',...(isModel?{fiberIndex,compartmentIndices:[0,0,0,0]}:{})});
      appendEllipsoid(synapses,[-.083,.018,zz],[.0014,.0011,.0012],6,4);
    }
  }
  // The sparse type-II arbor turns basally and passes beneath multiple OHCs.
  for(let row=0;row<3;row++){
    const x=.025+row*.037,points=[[-.22,.005,.067],[-.07,.006,.067],[x,.013,.067],[x,.017,.049],[x,.017,-.075]];
    path(scene,`organ-type-II-${row}`,points,.00055,C.typeII,'nerve',{radialSegments:5,role:'anatomical-type-II'});
    for(let j=0;j<9;j++)path(scene,`organ-type-II-terminal-${row}-${j}`,[[x,.017,(j-4.5)*.016],[x,.021,(j-4.5)*.016]],.0004,C.typeII,'nerve',{radialSegments:4,role:'anatomical-type-II'});
  }
  scene.meshes.push(ihc,ohc,support,stereo,nuclei,synapses,plate);
  label(scene,'ihc','One row of inner hair cells',[-.079,.054,-.07],'hair-cell',5);
  label(scene,'ohc','Three rows of outer hair cells',[.065,.057,.065],'hair-cell',5);
  label(scene,'cilia','Graded stereocilia · arcs and chevrons',[.063,.082,-.015],'hair-cell',4);
  label(scene,'tm','Tectorial membrane · translucent canopy',[-.145,.082,.02],'membrane',4);
  label(scene,'rl','Reticular lamina',[.145,.074,.06],'membrane',3);
  label(scene,'pillar','Pillar cells / tunnel of Corti',[-.02,.033,-.07],'support',4);
  label(scene,'deiters','Deiters supporting cells',[.098,.015,.05],'support',3);
  label(scene,'bm','Basilar membrane',[.19,0,-.06],'membrane',4);
  label(scene,'synapse','Afferent contacts beneath IHCs',[-.09,.017,.02],'nerve',3);
  label(scene,'ii','Type II outer-spiral arbor · static anatomy',[.10,.017,-.055],'nerve',2);
  scene.notes.push('This is a reconstructed representative patch, not a scan or complete cell census. Three outer rows illustrate the usual organization; some human regions have a fourth row. Cell proportions and the bundle staircase are anatomical; displayed stereocilia counts are sampled.', 'Hair cells, stereocilia, synapses, supporting cells and type II fibers are not simulated. One selected type I terminal can carry compartment-0 voltage replay; that color is not hair-cell transduction.', 'The tectorial membrane, reticular lamina and basilar membrane are distinct surfaces. No mechanical motion, endolymph flow or acoustic amplification is calculated.');
  scene.legend=[{label:'Inner hair cells',color:C.ihc,layer:'hair-cell'},{label:'Outer hair cells',color:C.ohc,layer:'hair-cell'},{label:'Supporting cells',color:C.support,layer:'support'},{label:'Type I afferents',color:C.nerve,layer:'nerve'},{label:'Type II afferents',color:C.typeII,layer:'nerve'}];
  scene.scaleBarMm=.05;scene.scaleBarUm=50;scene.camera={position:[.34,.23,.33],target:[0,.041,0],fov:38};
  return finishBounds(scene);
}
function finishBounds(scene) {
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const include=p=>{if(finite3(p))p.forEach((v,k)=>{min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);});};
  for(const m of scene.meshes)for(let i=0;i<m.positions.length;i+=3)include(m.positions.slice(i,i+3));
  for(const p of scene.paths)for(const q of p.points)include(q);
  for(const m of scene.markers){include(add(m.position,[m.radius,m.radius,m.radius]));include(sub(m.position,[m.radius,m.radius,m.radius]));}
  if(!Number.isFinite(min[0])){min.splice(0,3,-1,-1,-1);max.splice(0,3,1,1,1);}
  scene.bounds={min,max};return scene;
}

/**
 * Scene coordinates are right-handed mm. All generic solver-place-to-curve
 * mappings are explicit display registrations. Array mode is device inspection
 * and deliberately has no solver contact/fiber association.
 */
export function createAnatomyScene(geometry,model,{mode='cutaway',implantProfile,implantPose='bench',selectedFiber=0,atlas=null}={}) {
  if(mode==='neuron')return createNeuronAnatomyScene(geometry,model,selectedFiber);
  if(mode==='organ')return organScene(geometry,model,selectedFiber);
  const scene=freshScene(mode),cutaway=mode==='cutaway'||mode==='array';
  if(mode==='array') {
    const implant=createImplantGeometry(implantProfile,{pose:implantPose,centerline:atlasReference.centerline,radialSegments:12});
    if(implantPose==='inserted')addMacroSurfaces(scene,atlas,true);
    for(const key of ['meshes','paths','markers','labels'])scene[key].push(...(implant[key]??[]));
    scene.implant={profileId:implant.profile?.id,placement:implant.placement,contacts:implant.contacts};
    scene.implantPlacement=implant.placement;scene.implantContacts=implant.contacts;
    scene.notes.push(...(implant.notes??[]),'Manufacturer device inspection is separate from the generic reference experiment. No voltage replay, field solution or Greenwood assignment is associated with these vendor contacts.');
    scene.title=implant.profile?.name??implant.profile?.label??'Implant geometry';scene.subtitle=implantPose==='inserted'?'Physical arc placement in the measured scala · geometric illustration':'Unimplanted carrier and contact geometry · physical millimetres';
    scene.provenanceLabel=implantPose==='inserted'?'OpenEar ZETA + sourced manufacturer dimensions':'Sourced manufacturer dimensions; reconstructed carrier details';
    finishBounds(scene);const center=mul(add(scene.bounds.min,scene.bounds.max),.5),extent=Math.max(...sub(scene.bounds.max,scene.bounds.min));
    scene.camera={position:add(center,[extent*.65,extent*.65,extent*.95]),target:center,fov:40};scene.scaleBarMm=implantPose==='inserted'?1:5;return scene;
  }
  addMacroSurfaces(scene,atlas,cutaway);addNerves(scene,geometry,model,selectedFiber);addGenericArray(scene,geometry);
  scene.title=mode==='whole'?(atlas?'Human cochlea · measured anatomy':'Human cochlea · centreline reconstruction'):'Cochlear cutaway';
  scene.subtitle='OpenEar ZETA scalae · reconstructed membranes and neural microstructure';
  if(!atlas)scene.provenanceLabel='Measured ST centreline + reconstructed lumens; surface asset unavailable';
  scene.notes.unshift(atlas?'Measured scala surfaces share their original specimen registration. Membranes, modiolus, organ of Corti and individual neural routes are reconstructed anatomy.':'The measured ST centreline is available, but these lumen surfaces are reconstructions. Membranes, modiolus, organ of Corti and individual neural routes are reconstructed anatomy.', 'The 35 mm reference place axis maps by normalized arc length to this specimen’s 22.247 mm ST medial curve for display only. Electrical fields and cable integration continue in the original unrolled homogeneous conductor. Display distances must not be used as calculated electrode–neuron distances.');
  scene.legend=[{label:'Scala tympani',color:C.st,layer:'scala'},{label:'Scala vestibuli',color:C.sv,layer:'scala'},{label:'Scala media',color:C.sm,layer:'scala'},{label:'Basilar partition',color:C.bm,layer:'membrane'},{label:'Type I fibers',color:C.nerve,layer:'nerve'},{label:'Bone / lamina',color:C.bone,layer:'bone'}];
  scene.camera={position:[10,7,12],target:[-.4,-.3,.2],fov:40};scene.scaleBarMm=1;return finishBounds(scene);
}
