/** Explicit local soma/stem/well FEM, coupled to an effective outer nerve. */
import cdt2d from './vendor/cdt2d.mjs';
import {FIELD_DEFAULTS,normalizeFieldSettings,createFieldModel,solveChannel,sampleTransfer} from './field.mjs';

export const STAGE1_FIELD_VERSION='explicit-well-fem/1.0.0-development';
export const FIELD_STAGE1_VERSION=STAGE1_FIELD_VERSION;
export const STAGE1_FIELD_LIMITS=Object.freeze({maxCells:256,maxNodes:1800000,maxTetrahedra:11000000,maxNonzeros:60000000,maxEstimatedBytes:2100000000,maxIterations:16000,relativeTolerance:2e-12});
export const STAGE1_FIELD_DEFAULTS=Object.freeze({...FIELD_DEFAULTS,sigmaWellFluid:.3,wellAngularSegments:12,localAxialStepUm:10,resolvedCellExtensionUm:20});
const fail=s=>{throw new Error(`Stage1 field calculation error: ${s}`);};
const positive=(x,k)=>{if(!Number.isFinite(x)||x<=0)fail(`${k} must be finite and positive`);};
const sum=a=>a.reduce((s,v)=>s+v,0);
const unique=a=>[...new Set(a.map(x=>Math.round(x*1e9)/1e9))].sort((a,b)=>a-b);
const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
const norm=a=>Math.sqrt(dot(a,a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const modAngle=a=>((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
function divided(a,b,n){return Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);}
function element(points,ids){
 const p=ids.map(i=>points[i]),a=p[1].map((x,i)=>x-p[0][i]),b=p[2].map((x,i)=>x-p[0][i]),c=p[3].map((x,i)=>x-p[0][i]);
 const bc=cross(b,c),ca=cross(c,a),ab=cross(a,b),det=dot(a,bc);
 if(!Number.isFinite(det)||Math.abs(det)<1e-15)fail('degenerate tetrahedron');
 const g=[bc.map(v=>v/det),ca.map(v=>v/det),ab.map(v=>v/det)];g.unshift(g[0].map((v,i)=>-v-g[1][i]-g[2][i]));
 return {volume:Math.abs(det)/6,gradients:g,determinant:det};
}
function area(points,ids){const [a,b,c]=ids.map(i=>points[i]);return norm(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])))/2;}
export function normalizeStage1FieldSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('settings must be an object');
 const special=['sigmaWellFluid','wellAngularSegments','localAxialStepUm','resolvedCellExtensionUm'];
 for(const k of Object.keys(input))if(!Object.hasOwn(FIELD_DEFAULTS,k)&&!special.includes(k)&&k!=='axialCoordinatesUm')fail(`unsupported setting ${k}`);
 const base=normalizeFieldSettings(Object.fromEntries(Object.entries(input).filter(([k])=>!special.includes(k))));
 const s={...STAGE1_FIELD_DEFAULTS,...base,...Object.fromEntries(special.filter(k=>k in input).map(k=>[k,input[k]]))};
 for(const k of special)positive(s[k],k);
 if(!Number.isInteger(s.wellAngularSegments)||s.wellAngularSegments<8||s.wellAngularSegments>48)fail('wellAngularSegments must be an integer from8 through48');
 if(s.resolvedCellExtensionUm>100)fail('resolvedCellExtensionUm exceeds100 um declared domain-extension budget');
 return Object.freeze(s);
}
function surfacesOf(m){
 if(!m?.compartments?.length)fail('explicit well field requires morphology.compartment sampling surfaces');
 return m.compartments.map(c=>{const q=c.samplingSurface;if(!q||!['cylinder','sphere-band'].includes(q.type))fail('every membrane compartment requires a supported samplingSurface');
  for(const k of ['radiusUm','zMinUm','zMaxUm'])if(!Number.isFinite(q[k]))fail(`nonfinite samplingSurface ${k}`);
  if(q.radiusUm<=0||q.zMaxUm<=q.zMinUm)fail('invalid membrane surface');
  if(!Array.isArray(q.centerUm)||q.centerUm.length!==3||!q.centerUm.every(Number.isFinite)||q.centerUm[0]!==0||q.centerUm[1]!==0)fail('shared morphology surfaces require finite local centers with x=y=0; cell translation is supplied separately');
  return q;});
}
function profileFrom(surfaces){
 const raw=surfaces.map(q=>({type:q.type,radius:q.radiusUm,a:q.zMinUm,b:q.zMaxUm,cz:q.centerUm?.[2]??0})),segments=[];
 for(const q of raw){const p=segments.at(-1);if(p&&p.type===q.type&&p.radius===q.radius&&(q.type==='cylinder'||p.cz===q.cz)&&Math.abs(p.b-q.a)<1e-7)p.b=q.b;else segments.push({...q});}
 function at(z){
  let radius=Infinity;for(const q of segments)if(z>=q.a-1e-9&&z<=q.b+1e-9)radius=Math.min(radius,q.type==='sphere-band'?Math.sqrt(Math.max(1e-8,q.radius*q.radius-(z-q.cz)**2)):q.radius);
  // At an abrupt diameter step use the smaller radius at the shared plane.
  // The interpolated exclusion then stays inside the physical cell envelope,
  // so valid membrane quadrature never lies inside an artificial oversized hole.
  return Number.isFinite(radius)?radius:raw[z<raw[0].a?0:raw.length-1].radius;
 }
 return {segments,at};
}
function checkedGeometry(geometry,settings){
 if(!geometry||typeof geometry!=='object')fail('geometry must be explicit');
 if(geometry.constructPresent===false)return {constructPresent:false,cells:[],wells:[],morphology:geometry.morphology??null};
 const {cells,wells,morphology}=geometry;
 if(!Array.isArray(cells)||!Array.isArray(wells)||!cells.length||cells.length!==wells.length)fail('each represented engineered cell needs exactly one explicit well');
 if(cells.length>STAGE1_FIELD_LIMITS.maxCells)fail('cell census exceeds256 declared field budget');
 const cellIds=new Set();for(const c of cells){if(typeof c.id!=='string'||!c.id||cellIds.has(c.id)||!Number.isFinite(c.xUm)||!Number.isFinite(c.yUm))fail('cell ids must be unique and positions finite');cellIds.add(c.id);}
 const seen=new Set(),surface=surfacesOf(morphology),profile=profileFrom(surface);
 const ws=wells.map((q,i)=>{
  const w={...q,center:q.center??[cells[i].xUm,cells[i].yUm,0],index:i};
  if(!w.id||seen.has(w.id))fail('well ids must be unique');seen.add(w.id);
  if(!Array.isArray(w.center)||w.center.length!==3||!w.center.every(Number.isFinite)||w.center[2]!==0)fail('well center must be a finite[x,y,0] coordinate');
  if(w.cellId!==cells[i].id||w.center[0]!==cells[i].xUm||w.center[1]!==cells[i].yUm)fail('each well must match its indexed cell identity and center exactly');
  for(const k of ['innerRadiusUm','halfLengthUm','wallThicknessUm','apertureRadiusUm','contactHalfWidthUm','contactHalfHeightUm','contactSeparationUm'])positive(w[k],k);
  if(w.apertureRadiusUm>=w.innerRadiusUm)fail('aperture must fit within well inner radius');
  if(w.contactSeparationUm<=2*w.contactHalfHeightUm)fail('finite source/return patches overlap');
  if(w.contactSeparationUm/2+w.contactHalfHeightUm>=w.halfLengthUm-w.wallThicknessUm)fail('contact touches an insulating endcap');
  if(w.contactHalfWidthUm>=Math.PI*w.innerRadiusUm/2)fail('contact angular span is too large');
  if(w.halfLengthUm<=w.wallThicknessUm||w.halfLengthUm+settings.resolvedCellExtensionUm>=settings.halfLengthUm)fail('well does not fit axial domain');
  const maxR=Math.max(...surface.filter(q=>q.zMaxUm>-w.halfLengthUm&&q.zMinUm<w.halfLengthUm).map(q=>q.radiusUm));
  if(maxR>=w.innerRadiusUm)fail('soma/stem envelope touches well wall');
  for(const sign of [-1,1])for(const z of [sign*w.halfLengthUm,sign*(w.halfLengthUm-w.wallThicknessUm),sign*(w.halfLengthUm-w.wallThicknessUm/2)])if(profile.at(z)>=w.apertureRadiusUm)fail('neurite radius leaves no conducting fluid aperture');
  if(Math.hypot(w.center[0],w.center[1])+w.innerRadiusUm+w.wallThicknessUm>=settings.fascicleRadiusUm*Math.cos(Math.PI/settings.angularSegments))fail('well outer wall intersects actual polygonal fascicle boundary');
  return w;
 });
 for(let i=0;i<ws.length;i++)for(let j=0;j<i;j++)if(Math.hypot(ws[i].center[0]-ws[j].center[0],ws[i].center[1]-ws[j].center[1])<=ws[i].innerRadiusUm+ws[i].wallThicknessUm+ws[j].innerRadiusUm+ws[j].wallThicknessUm)fail(`walls of ${ws[i].id} and ${ws[j].id} overlap`);
 return {constructPresent:true,cells:cells.map(c=>({...c})),wells:ws,morphology,surfaces:surface,profile};
}
function createCrossSection(s,g){
 const points=[],meta=[],edges=[],rings=[],wellIndices=[];
 function loop(coords,tags){const ids=coords.map((p,i)=>{const id=points.length;points.push(p);meta.push(tags[i]);return id;});for(let i=0;i<ids.length;i++)edges.push([ids[i],ids[(i+1)%ids.length]]);return ids;}
 const peri=s.fascicleRadiusUm+s.perineuriumThicknessUm;
 const radii=unique([s.fascicleRadiusUm,s.fascicleRadiusUm+s.perineuriumThicknessUm/2,peri,...divided(peri,s.epineuriumRadiusUm,3).slice(1),s.epineuriumRadiusUm+(s.outerRadiusUm-s.epineuriumRadiusUm)/8,(s.epineuriumRadiusUm+s.outerRadiusUm)/2,s.outerRadiusUm]);
 const refined=radii.flatMap((r,i)=>i?divided(radii[i-1],r,s.radialRefinement).slice(1):[r]);
 for(const r of refined)rings.push(loop(Array.from({length:s.angularSegments},(_,i)=>[r*Math.cos(i*2*Math.PI/s.angularSegments),r*Math.sin(i*2*Math.PI/s.angularSegments)]),Array.from({length:s.angularSegments},()=>({well:-1,radius:r}))));
 for(let wi=0;wi<g.wells.length;wi++){
  const w=g.wells[wi],phi=w.contactHalfWidthUm/w.innerRadiusUm;
  const angles=unique([...Array.from({length:s.wellAngularSegments},(_,i)=>2*Math.PI*i/s.wellAngularSegments),phi,2*Math.PI-phi]);
  const centre=points.length;points.push(w.center.slice(0,2));meta.push({well:wi,zone:-1,theta:0,fraction:0});
  const localRings=[],R=g.profile.at(w.halfLengthUm),A=Math.max(w.apertureRadiusUm,R+.1),rads=[R,(R+A)/2,A,(A+w.innerRadiusUm)/2,w.innerRadiusUm,w.innerRadiusUm+w.wallThicknessUm];
  for(let zone=0;zone<rads.length;zone++)for(let k=1;k<=(zone? s.radialRefinement:1);k++){
   const f=zone?k/s.radialRefinement:1,r=zone?rads[zone-1]+f*(rads[zone]-rads[zone-1]):rads[0];
   const ids=loop(angles.map(t=>[w.center[0]+r*Math.cos(t),w.center[1]+r*Math.sin(t)]),angles.map(theta=>({well:wi,zone,theta,fraction:f})));localRings.push({zone,fraction:f,ids});
  }
  wellIndices.push({centre,angles,rings:localRings,innerRing:localRings.find(q=>q.zone===4&&q.fraction===1).ids,outerRing:localRings.at(-1).ids});
 }
 // Interior background vertices improve the unstructured tissue triangulation.
 const pitch=40/s.radialRefinement;
 for(let y=-s.fascicleRadiusUm+pitch/2;y<s.fascicleRadiusUm;y+=pitch*Math.sqrt(3)/2)for(let x=-s.fascicleRadiusUm+pitch/2;x<s.fascicleRadiusUm;x+=pitch){
  if(Math.hypot(x,y)>=s.fascicleRadiusUm-pitch/4||g.wells.some(w=>Math.hypot(x-w.center[0],y-w.center[1])<w.innerRadiusUm+w.wallThicknessUm+pitch/5))continue;
  points.push([x,y]);meta.push({well:-1,radius:Math.hypot(x,y)});
 }
 const triangles=cdt2d(points,edges,{interior:true,exterior:true,infinity:false}).filter(t=>Math.hypot(...[0,1].map(k=>sum(t.map(i=>points[i][k]))/3))<s.outerRadiusUm);
 const classes=triangles.map(t=>{
  const ms=t.map(i=>meta[i]);
  if(ms.every(m=>m.well>=0&&m.well===ms[0].well)){
   const wi=ms[0].well,zmax=Math.max(...ms.map(m=>m.zone)),zmin=Math.min(...ms.map(m=>m.zone));
   if(zmax===0)return {well:wi,band:0};
   if(zmax<=2)return {well:wi,band:1};
   if(zmax<=4)return {well:wi,band:2};
   if(zmin>=4&&zmax===5)return {well:wi,band:3};
  }
  const r=Math.hypot(...[0,1].map(k=>sum(t.map(i=>points[i][k]))/3));
  return {well:-1,region:r<s.fascicleRadiusUm?0:r<peri?1:r<s.epineuriumRadiusUm?2:3};
 });
 const neighbours=Array.from({length:points.length},()=>new Set());for(const t of triangles)for(const i of t)for(const j of t)neighbours[i].add(j);
 for(const local of wellIndices)local.apertureTriangles=[];for(let ti=0;ti<classes.length;ti++)if(classes[ti].well>=0&&classes[ti].band===1)wellIndices[classes[ti].well].apertureTriangles.push(ti);
 return {points,meta,triangles,classes,neighbours:neighbours.map(v=>[...v].sort((a,b)=>a-b)),wellIndices,rings};
}
function axialGrid(s,g){
 if(s.axialCoordinatesUm)return [...s.axialCoordinatesUm];
 const L=Math.max(...g.wells.map(w=>w.halfLengthUm+s.resolvedCellExtensionUm)),a=[-s.halfLengthUm,s.halfLengthUm,0];
 for(const z of [120,250,500,1000,2500,5000])if(z>L&&z<s.halfLengthUm)a.push(-z,z);
 for(const w of g.wells){
  for(const sign of [-1,1])a.push(sign*w.halfLengthUm,sign*(w.halfLengthUm-w.wallThicknessUm),sign*(w.halfLengthUm-w.wallThicknessUm/2),sign*(w.halfLengthUm+s.resolvedCellExtensionUm));
  for(const sign of [-1,1])for(const d of [-w.contactHalfHeightUm,0,w.contactHalfHeightUm])a.push(sign*w.contactSeparationUm/2+d);
 }
 for(let z=-L;z<=L+1e-7;z+=s.localAxialStepUm)a.push(z);
 const eps=.1/s.axialRefinement;
 for(const q of g.profile.segments){
  if(q.b<-L||q.a>L)continue;
  for(const z of [q.a,q.b])if(z>-L&&z<L)a.push(z-eps,z,z+eps);
  if(q.type==='sphere-band')for(const f of [-.8,-.5,0,.5,.8])a.push(q.cz+f*q.radius);
 }
 const initial=unique(a.filter(z=>z>=-s.halfLengthUm&&z<=s.halfLengthUm));
 return initial.flatMap((z,i)=>i?divided(initial[i-1],z,s.axialRefinement).slice(1):[z]);
}
function atCross(s,g,crossSection,i,z){
 const m=crossSection.meta[i];if(m.well<0)return [...crossSection.points[i],z];
 const w=g.wells[m.well];if(m.zone<0)return [w.center[0],w.center[1],z];
 const extent=w.halfLengthUm+s.resolvedCellExtensionUm,R=g.profile.at(Math.max(-extent,Math.min(extent,z))),A=Math.max(w.apertureRadiusUm,R+Math.min(.1,(w.innerRadiusUm-R)/4));
 if(!(R<w.innerRadiusUm&&A<w.innerRadiusUm))fail('local neurite envelope touches cavity or warped aperture ring');
 const rads=[R,(R+A)/2,A,(A+w.innerRadiusUm)/2,w.innerRadiusUm,w.innerRadiusUm+w.wallThicknessUm];
 const r=m.zone?rads[m.zone-1]+m.fraction*(rads[m.zone]-rads[m.zone-1]):rads[0];
 return [w.center[0]+r*Math.cos(m.theta),w.center[1]+r*Math.sin(m.theta),z];
}
function regionFor(s,g,c,z){
 if(c.well<0)return c.region;
 const w=g.wells[c.well],az=Math.abs(z);
 if(az>=w.halfLengthUm+s.resolvedCellExtensionUm)return 0;
 if(c.band===0)return -1;
 if(az>=w.halfLengthUm)return 0;
 if(c.band===3)return -1;
 if(az>=w.halfLengthUm-w.wallThicknessUm&&c.band===2)return -1;
 return 4;
}
function sigmaFor(s,region){if(region===0)return [s.sigmaEndoTransverse,s.sigmaEndoTransverse,s.sigmaEndoLongitudinal];const v=[0,s.sigmaPerineurium,s.sigmaEpineurium,s.sigmaSurrounding,s.sigmaWellFluid][region];return [v,v,v];}
function indexInRow(rowPtr,col,i,j){let lo=rowPtr[i],hi=rowPtr[i+1]-1;while(lo<=hi){const mid=(lo+hi)>>1,v=col[mid];if(v===j)return mid;if(v<j)lo=mid+1;else hi=mid-1;}fail('assembly topology missing matrix entry');}

export function createStage1FieldModel(input={},geometry){
 const start=performance.now(),settings=normalizeStage1FieldSettings(input),g=checkedGeometry(geometry,settings),s=settings;
 if(!g.constructPresent){const base=Object.fromEntries(Object.keys(FIELD_DEFAULTS).map(k=>[k,s[k]]));const m=createFieldModel(base);return {...m,stage1:true,version:STAGE1_FIELD_VERSION,geometry:g,contacts:[],diagnostics:{...m.diagnostics,constructPresent:false,explicitWells:0,explicitCells:0,scope:'No engineered cells, walls or local contacts; zero implant drive.'}};}
 const crossSection=createCrossSection(s,g),axial=axialGrid(s,g),C=crossSection.points.length,T=crossSection.triangles.length,rawCount=C*axial.length;
 const maxTets=3*T*(axial.length-1);
 if(rawCount>STAGE1_FIELD_LIMITS.maxNodes||maxTets>STAGE1_FIELD_LIMITS.maxTetrahedra)fail(`declared mesh budget exceeded before assembly: ${rawCount} vertices, at most ${maxTets} tetrahedra; no wells were removed`);
 const rawPoints=Array.from({length:rawCount},(_,id)=>atCross(s,g,crossSection,id%C,axial[Math.floor(id/C)]));
 const rawTetra=new Int32Array(maxTets*4),rawRegions=new Uint8Array(maxTets),active=new Uint8Array(rawCount),prismStart=new Int32Array((axial.length-1)*T);prismStart.fill(-1);
 let nt=0,excluded=0;const regionCounts=[0,0,0,0,0];
 for(let z=0;z<axial.length-1;z++)for(let ti=0;ti<T;ti++){
  const region=regionFor(s,g,crossSection.classes[ti],(axial[z]+axial[z+1])/2);if(region<0){excluded+=3;continue;}
  const [a,b,c]=[...crossSection.triangles[ti]].sort((a,b)=>a-b).map(i=>i+z*C),A=a+C,B=b+C,D=c+C;
  prismStart[z*T+ti]=nt;
  for(const ids of [[a,b,c,A],[b,c,A,B],[c,A,B,D]]){rawTetra.set(ids,nt*4);rawRegions[nt]=region;for(const id of ids)active[id]=1;nt++;regionCounts[region]++;}
 }
 const rawToActive=new Int32Array(rawCount);rawToActive.fill(-1);const points=[],rawIndex=[],boundary=[];
 for(let i=0;i<rawCount;i++)if(active[i]){rawToActive[i]=points.length;points.push(rawPoints[i]);rawIndex.push(i);const m=crossSection.meta[i%C];boundary.push(i<C||i>=(axial.length-1)*C||(m.well<0&&Math.abs(m.radius-s.outerRadiusUm)<1e-7));}
 const n=points.length,tetrahedra=new Int32Array(nt*4),regions=rawRegions.slice(0,nt);for(let k=0;k<nt*4;k++)tetrahedra[k]=rawToActive[rawTetra[k]];
 const rowPtr=new Int32Array(n+1);let nnz=0;
 const columnsFor=i=>{const raw=rawIndex[i],z=Math.floor(raw/C),c=raw%C,cols=[];for(const dz of [-1,0,1])if(z+dz>=0&&z+dz<axial.length)for(const j of crossSection.neighbours[c]){const id=rawToActive[(z+dz)*C+j];if(id>=0)cols.push(id);}return cols.sort((a,b)=>a-b);};
 for(let i=0;i<n;i++){rowPtr[i]=nnz;nnz+=columnsFor(i).length;}rowPtr[n]=nnz;
 const estimatedBytes=n*160+nnz*20+nt*21+rawCount*16;
 if(nnz>STAGE1_FIELD_LIMITS.maxNonzeros||estimatedBytes>STAGE1_FIELD_LIMITS.maxEstimatedBytes)fail(`declared memory budget exceeded: ${nnz} matrix slots, estimated ${estimatedBytes} bytes; no geometry was simplified`);
 const col=new Int32Array(nnz),values=new Float64Array(nnz),diag=new Float64Array(n);for(let i=0;i<n;i++)col.set(columnsFor(i),rowPtr[i]);
 for(let ti=0;ti<nt;ti++){
  const ids=Array.from(tetrahedra.subarray(ti*4,ti*4+4)),e=element(points,ids),sigma=sigmaFor(s,regions[ti]);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){const v=e.volume*e.gradients[i].reduce((v,x,k)=>v+x*sigma[k]*e.gradients[j][k],0);values[indexInRow(rowPtr,col,ids[i],ids[j])]+=v;}
 }
 for(let i=0;i<n;i++){diag[i]=values[indexInRow(rowPtr,col,i,i)];if(!(diag[i]>0))fail('isolated or non-positive conducting vertex');}
 const contacts=[];
 for(let wi=0;wi<g.wells.length;wi++){
  const w=g.wells[wi],local=crossSection.wellIndices[wi],phi=w.contactHalfWidthUm/w.innerRadiusUm;
  for(const [polarity,zc]of [['source',-w.contactSeparationUm/2],['return',w.contactSeparationUm/2]]){
   const facets=[];
   for(let z=0;z<axial.length-1;z++)if(axial[z]>=zc-w.contactHalfHeightUm-1e-7&&axial[z+1]<=zc+w.contactHalfHeightUm+1e-7)for(let k=0;k<local.angles.length;k++){
    const t0=local.angles[k],t1=k+1<local.angles.length?local.angles[k+1]:2*Math.PI,tm=modAngle((t0+t1)/2);if(Math.abs(tm)>phi+1e-8)continue;
    const [a,b]=[local.innerRing[k],local.innerRing[(k+1)%local.angles.length]].sort((a,b)=>a-b),A=rawToActive[z*C+a],B=rawToActive[z*C+b],D=rawToActive[(z+1)*C+a],E=rawToActive[(z+1)*C+b];
    if(Math.min(A,B,D,E)<0)fail('contact surface has no adjacent conductor');facets.push([A,B,D],[B,D,E]);
   }
   const areas=facets.map(ids=>area(points,ids)),areaUm2=sum(areas);if(!(areaUm2>0))fail('unresolved finite contact patch');
   const load=new Map();for(let k=0;k<facets.length;k++)for(const id of facets[k])load.set(id,(load.get(id)||0)+areas[k]/(3*areaUm2));
   contacts.push({id:`${w.id}:${polarity}`,wellId:w.id,cellId:w.cellId,polarity,role:polarity,centerUm:[w.center[0]+w.innerRadiusUm,w.center[1],zc],shape:'rectangular inner-wall surface patch',halfWidthUm:w.contactHalfWidthUm,halfHeightUm:w.contactHalfHeightUm,areaUm2,facets,load:[...load]});
  }
 }
 const binSize=25,triangleBins=new Map();
 for(let ti=0;ti<T;ti++){
  const p=crossSection.triangles[ti].map(i=>crossSection.points[i]),m=crossSection.classes[ti];let bounds=[Math.min(...p.map(p=>p[0])),Math.max(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[1]))];
  if(m.well>=0&&m.band<=2){const w=g.wells[m.well];bounds=[w.center[0]-w.innerRadiusUm,w.center[0]+w.innerRadiusUm,w.center[1]-w.innerRadiusUm,w.center[1]+w.innerRadiusUm];}
  for(let bx=Math.floor(bounds[0]/binSize);bx<=Math.floor(bounds[1]/binSize);bx++)for(let by=Math.floor(bounds[2]/binSize);by<=Math.floor(bounds[3]/binSize);by++){const key=`${bx},${by}`;if(!triangleBins.has(key))triangleBins.set(key,[]);triangleBins.get(key).push(ti);}
 }
 const model={version:STAGE1_FIELD_VERSION,stage1:true,settings:s,geometry:g,points,boundary,tetrahedra,regions,rowPtr,col,values,diag,axial,crossSection,rawToActive,prismStart,contacts,triangleBins,binSize,
  diagnostics:{discretization:'conforming P1 tetrahedral FEM with explicit removed insulating volumes',nodes:n,tetrahedra:nt,excludedInsulatorOrCellTetrahedra:excluded,rawNodes:rawCount,nonzeros:nnz,estimatedBytes,explicitCells:g.cells.length,explicitWells:g.wells.length,regionTetrahedra:regionCounts,constructPresent:true,
  sourceModel:'finite surface current density on explicit inner-wall patches',wallBoundary:'natural zero normal flux; no conductive wall tetrahedra retained',apertureModel:'explicit annular conducting bore and access volume',outerBoundary:'zero Dirichlet on outer cylindrical polygon and both ends',
  localToEffectiveBoundaryUm:g.wells.map(w=>w.halfLengthUm+s.resolvedCellExtensionUm),cellRepresentation:'Explicit soma/stem/near-well neurite exclusion; distal cables embedded in effective endoneurial tensor',meshBuildSeconds:(performance.now()-start)/1000}};
 return model;
}

function multiply(model,x,out,full=false){
 const {rowPtr,col,values,boundary}=model;
 for(let i=0;i<x.length;i++){
  if(!full&&boundary[i]){out[i]=x[i];continue;}
  let s=0;for(let p=rowPtr[i];p<rowPtr[i+1];p++)if(full||!boundary[col[p]])s+=values[p]*x[col[p]];out[i]=s;
 }
}
/** IC(0) is a preconditioner only. Any diagonal shift never changes the PDE. */
function incompleteCholesky(model){
 if(model.preconditioner)return model.preconditioner;
 const start=performance.now(),{rowPtr,col,values,boundary,diag}=model,n=diag.length;
 const lowerPtr=new Int32Array(n+1);let count=0;
 for(let i=0;i<n;i++){lowerPtr[i]=count;if(!boundary[i])for(let p=rowPtr[i];p<rowPtr[i+1]&&col[p]<i;p++)if(!boundary[col[p]])count++;}lowerPtr[n]=count;
 const lowerCol=new Int32Array(count),original=new Float64Array(count);for(let i=0;i<n;i++){let q=lowerPtr[i];if(!boundary[i])for(let p=rowPtr[i];p<rowPtr[i+1]&&col[p]<i;p++)if(!boundary[col[p]]){lowerCol[q]=col[p];original[q++]=values[p];}}
 let chosen=null,failures=[];
 for(const shift of [0,1e-8,1e-6,1e-4,.001,.01,.1,1]){
  const L=Float64Array.from(original),d=new Float64Array(n);let bad=-1;
  for(let i=0;i<n;i++){
   let diagonal=boundary[i]?1:diag[i]*(1+shift);
   for(let p=lowerPtr[i];p<lowerPtr[i+1];p++){
    const j=lowerCol[p];let a=lowerPtr[i],b=lowerPtr[j],v=L[p];
    while(a<p&&b<lowerPtr[j+1]){const u=lowerCol[a],w=lowerCol[b];if(u===w){v-=L[a]*L[b];a++;b++;}else if(u<w)a++;else b++;}
    v/=d[j];if(!Number.isFinite(v)){bad=i;break;}L[p]=v;diagonal-=v*v;
   }
   if(bad>=0||!(diagonal>0)||!Number.isFinite(diagonal)){bad=i;break;}d[i]=Math.sqrt(diagonal);
  }
  if(bad<0){chosen={kind:'IC(0)',lowerPtr,lowerCol,L,d,shift,constructionSeconds:(performance.now()-start)/1000,failedShifts:failures};break;}
  failures.push({shift,firstNonPositivePivot:bad});
 }
 if(!chosen)fail('all declared incomplete-Cholesky preconditioner shifts failed');
 model.preconditioner=chosen;return chosen;
}
function precondition(M,b,out){
 const {lowerPtr,lowerCol,L,d}=M,n=b.length;
 for(let i=0;i<n;i++){let v=b[i];for(let p=lowerPtr[i];p<lowerPtr[i+1];p++)v-=L[p]*out[lowerCol[p]];out[i]=v/d[i];}
 for(let i=n-1;i>=0;i--){out[i]/=d[i];for(let p=lowerPtr[i];p<lowerPtr[i+1];p++)out[lowerCol[p]]-=L[p]*out[i];}
}
export function solveStage1Load(model,inputLoad,options={}){
 if(!model.geometry?.constructPresent)fail('no-device has no implant contacts or implant-drive solve');
 const start=performance.now(),n=model.points.length;
 if(!inputLoad||inputLoad.length!==n||Array.from(inputLoad).some(x=>!Number.isFinite(x)))fail('load must have one finite current per conducting vertex');
 const load=Float64Array.from(inputLoad),rhs=Float64Array.from(load),x=new Float64Array(n),bv=new Float64Array(n);
 if(options.boundaryMv)for(let i=0;i<n;i++)if(model.boundary[i]){const v=typeof options.boundaryMv==='function'?options.boundaryMv(model.points[i]):options.boundaryMv[i];if(!Number.isFinite(v))fail('invalid Dirichlet potential');bv[i]=v/1000;}
 for(let i=0;i<n;i++)if(model.boundary[i]){rhs[i]=bv[i];x[i]=bv[i];}else for(let p=model.rowPtr[i];p<model.rowPtr[i+1];p++)if(model.boundary[model.col[p]])rhs[i]-=model.values[p]*bv[model.col[p]];
 const r=new Float64Array(n),z=new Float64Array(n),p=new Float64Array(n),Ap=new Float64Array(n),M=incompleteCholesky(model);
 multiply(model,x,Ap);for(let i=0;i<n;i++)r[i]=rhs[i]-Ap[i];precondition(M,r,z);p.set(z);
 const rn=norm(rhs),tolerance=options.relativeTolerance??STAGE1_FIELD_LIMITS.relativeTolerance;
 if(!(tolerance>0&&tolerance<=STAGE1_FIELD_LIMITS.relativeTolerance))fail('fixed solver tolerance may not be relaxed');
 let rz=dot(r,z),res=rn?norm(r)/rn:norm(r),iterations=0;
 while(res>tolerance&&iterations<STAGE1_FIELD_LIMITS.maxIterations){
  if(options.isCancelled?.())fail('cancelled');multiply(model,p,Ap);const pAp=dot(p,Ap);if(!(pAp>0)||!Number.isFinite(pAp))fail('nonpositive PCG curvature');
  const alpha=rz/pAp;for(let i=0;i<n;i++){x[i]+=alpha*p[i];r[i]-=alpha*Ap[i];}iterations++;
  if(iterations%100===0){multiply(model,x,Ap);for(let i=0;i<n;i++)r[i]=rhs[i]-Ap[i];options.onProgress?.({iterations,relativeResidual:res});}
  res=rn?norm(r)/rn:norm(r);precondition(M,r,z);const next=dot(r,z),beta=rz?next/rz:0;for(let i=0;i<n;i++)p[i]=z[i]+beta*p[i];rz=next;
 }
 multiply(model,x,Ap);let err=0;for(let i=0;i<n;i++)err+=(Ap[i]-rhs[i])**2;const trueResidual=rn?Math.sqrt(err)/rn:Math.sqrt(err);
 if(trueResidual>1e-10||Array.from(x).some(v=>!Number.isFinite(v)))fail(`fixed true residual gate failed (${trueResidual}, ${iterations} iterations)`);
 multiply(model,x,Ap,true);let injected=0,reaction=0,interior=0;for(let i=0;i<n;i++){injected+=load[i];if(model.boundary[i])reaction+=Ap[i]-load[i];else interior+=Ap[i]-load[i];}
 const solution={model,potentialMvPerUa:Float64Array.from(x,v=>v*1000),loadUa:load,
  diagnostics:{...model.diagnostics,iterations,relativeResidual:trueResidual,sourceReturnImbalanceUa:injected,boundaryReactionUa:reaction,globalCurrentClosureUa:reaction+injected,summedInteriorResidualUa:interior,
   preconditioner:{kind:M.kind,diagonalShift:M.shift,constructionSeconds:M.constructionSeconds,failedShifts:M.failedShifts},solveSeconds:(performance.now()-start)/1000,units:{potential:'mV/uA',current:'uA',coordinates:'um',conductivity:'S/m'}}};
 solution.sample=points=>sampleStage1Points(solution,points);return solution;
}
export function solveStage1Channel(model,channel={},options={}){
 if(!model.geometry?.constructPresent)fail('true no-device contains no implant contacts; zero implant drive is required');
 const wellId=channel.wellId??model.geometry.wells[channel.index??0]?.id;
 const sourceId=channel.sourceContactId??`${wellId}:source`,returnId=channel.returnContactId??`${wellId}:return`;
 const source=model.contacts.find(q=>q.id===sourceId),sink=model.contacts.find(q=>q.id===returnId);
 if(!source||!sink||source===sink)fail('explicit source and return contact ids are required');
 const load=new Float64Array(model.points.length);for(const [i,v]of source.load)load[i]+=v;for(const [i,v]of sink.load)load[i]-=v;
 const solution=solveStage1Load(model,load,options);solution.channel={...channel,wellId,sourceContactId:source.id,returnContactId:sink.id};
 solution.pairArtifactMvPerUa=source.load.reduce((s,[i,w])=>s+w*solution.potentialMvPerUa[i],0)-sink.load.reduce((s,[i,w])=>s+w*solution.potentialMvPerUa[i],0);
 solution.diagnostics.contactAreasUm2={source:source.areaUm2,return:sink.areaUm2};solution.diagnostics.pairArtifactMvPerUa=solution.pairArtifactMvPerUa;
 solution.diagnostics.apertures=stage1ApertureDiagnostics(solution);return solution;
}
/** Discrete flux across graph cuts wholly inside each resolved annular bore. */
export function stage1ApertureDiagnostics(solution){
 const m=solution.model,C=m.crossSection.points.length,phi=solution.potentialMvPerUa,result=[];
 function planeMean(local,zi){let A=0,V=0;for(const ti of local.apertureTriangles){const ids=m.crossSection.triangles[ti].map(i=>m.rawToActive[zi*C+i]);if(ids.some(i=>i<0))fail('aperture cross-section contains missing conductor');const a=area(m.points,ids);A+=a;V+=a*sum(ids.map(i=>phi[i]))/3;}return {areaUm2:A,meanMvPerUa:V/A};}
 for(let wi=0;wi<m.geometry.wells.length;wi++){
  const w=m.geometry.wells[wi],local=m.crossSection.wellIndices[wi],crossIds=local.rings.filter(q=>q.zone<=2).flatMap(q=>q.ids);
  for(const direction of [-1,1]){
   const inner=direction*(w.halfLengthUm-w.wallThicknessUm),outer=direction*w.halfLengthUm,min=Math.min(inner,outer),max=Math.max(inner,outer),zi=m.axial.findIndex(z=>Math.abs(z-inner)<1e-7),zo=m.axial.findIndex(z=>Math.abs(z-outer)<1e-7);
   if(zi<0||zo<0)fail('aperture endpoints are not explicit mesh planes');const a=planeMean(local,zi),b=planeMean(local,zo),fluxes=[];
   for(let zl=Math.min(zi,zo);zl<Math.max(zi,zo);zl++){
    let current=0;for(const c of crossIds){const i=m.rawToActive[zl*C+c];if(i<0)continue;
     for(let p=m.rowPtr[i];p<m.rowPtr[i+1];p++){const j=m.col[p],q=m.points[j];if(Math.abs(q[2]-m.axial[zl+1])>1e-7||Math.hypot(q[0]-w.center[0],q[1]-w.center[1])>w.apertureRadiusUm+1e-7)continue;current-=m.values[p]*(phi[i]-phi[j])/1000;}
    }fluxes.push(direction*current);
   }
   const current=sum(fluxes)/fluxes.length,drop=a.meanMvPerUa-b.meanMvPerUa;
   result.push({wellId:w.id,cellId:w.cellId,direction:direction<0?'peripheral':'central',boreInnerZUm:inner,boreOuterZUm:outer,conductingAreaUm2:a.areaUm2,boreLengthUm:max-min,
    outwardCurrentUaPerUa:current,cutCurrentsUaPerUa:fluxes,currentSpreadUaPerUa:Math.max(...fluxes)-Math.min(...fluxes),meanPotentialDropMvPerUa:drop,
    measuredBoreResistanceMvPerUa:Math.abs(current)>1e-12?drop/current:null,uniformAnnulusResistanceMvPerUa:1000*(max-min)/(m.settings.sigmaWellFluid*a.areaUm2),
    meaning:'Resolved bore voltage drop divided by discrete aperture current; source/access impedance is separate. Null resistance means current too small for a stable ratio.'});
  }
 }
 return result;
}
export function locateStage1Point(model,point){
 if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))fail('sample point must contain three finite coordinates');
 if(Math.abs(point[2])>=model.settings.halfLengthUm||Math.hypot(point[0],point[1])>=model.settings.outerRadiusUm)fail('sample point is on or outside grounded domain');
 let lo=0,hi=model.axial.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(point[2]<model.axial[m])hi=m;else lo=m;}
 const candidates=model.triangleBins.get(`${Math.floor(point[0]/model.binSize)},${Math.floor(point[1]/model.binSize)}`)??[],T=model.crossSection.triangles.length;
 const slices=[lo];if(lo>0&&Math.abs(point[2]-model.axial[lo])<1e-7)slices.push(lo-1);
 for(const zz of slices)for(const ti of candidates){const first=model.prismStart[zz*T+ti];if(first<0)continue;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const k of [0,1,2,3,7,11]){const p=model.points[model.tetrahedra[first*4+k]];minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
  if(point[0]<minX-1e-7||point[0]>maxX+1e-7||point[1]<minY-1e-7||point[1]>maxY+1e-7)continue;
  for(let t=first;t<first+3;t++){const ids=Array.from(model.tetrahedra.subarray(t*4,t*4+4)),e=element(model.points,ids),delta=point.map((v,i)=>v-model.points[ids[0]][i]),w=e.gradients.map((g,i)=>(i===0?1:0)+dot(g,delta));if(Math.min(...w)>=-1e-7&&Math.max(...w)<=1+1e-7)return {ids,weights:w,tetrahedron:t};}
 }
 fail(`point [${point.join(',')}] lies inside an excluded wall/cell or outside the actual polygonal mesh`);
}
export function sampleStage1Points(solution,points){
 if(!solution.model.geometry?.constructPresent)return sampleTransfer(solution,points);
 return Float64Array.from(points,p=>{const q=locateStage1Point(solution.model,p);return q.ids.reduce((s,id,i)=>s+q.weights[i]*solution.potentialMvPerUa[id],0);});
}
function surfaceQuadrature(surface,cell,nTheta=12,nAxial=5){
 const centre=surface.centerUm??[0,0,0],cx=cell.xUm??cell.center?.[0]??0,cy=cell.yUm??cell.center?.[1]??0;
 const points=[],weights=[];
 // Uniform z is uniform area measure on both a cylinder and spherical band.
 const rules={3:[[-Math.sqrt(3/5),0,Math.sqrt(3/5)],[5/18,4/9,5/18]],
  5:[[-.906179845938664,-.5384693101056831,0,.5384693101056831,.906179845938664],[.11846344252809454,.23931433524968324,.28444444444444444,.23931433524968324,.11846344252809454]],
  7:[[-.9491079123427585,-.7415311855993945,-.4058451513773972,0,.4058451513773972,.7415311855993945,.9491079123427585],[.06474248308443485,.13985269574463834,.19091502525255947,.2089795918367347,.19091502525255947,.13985269574463834,.06474248308443485]]};
 const [abscissa,wz]=rules[nAxial];
 for(let a=0;a<abscissa.length;a++){
  const z=(surface.zMinUm+surface.zMaxUm)/2+abscissa[a]*(surface.zMaxUm-surface.zMinUm)/2;
  const r=surface.type==='sphere-band'?Math.sqrt(Math.max(0,surface.radiusUm**2-(z-centre[2])**2)):surface.radiusUm;
  for(let k=0;k<nTheta;k++){const theta=(k+.5)*2*Math.PI/nTheta;points.push([cx+r*Math.cos(theta),cy+r*Math.sin(theta),z]);weights.push(wz[a]/nTheta);}
 }
 return {points,weights};
}
export function prepareMembraneSampling(model,morphology,cell,options={}){
 if(!model.geometry?.constructPresent)fail('engineered membrane sampling is unavailable in true no-device');
 const surfaces=surfacesOf(morphology),nTheta=options.angularSamples??12;
 const nAxial=options.axialSamples??5;if(![3,5,7].includes(nAxial))fail('membrane axial quadrature supports3,5,7 points');
 if(!Number.isInteger(nTheta)||nTheta<8||nTheta>64)fail('membrane surface quadrature angular samples must be8..64');
 return surfaces.map(surface=>{
  const q=surfaceQuadrature(surface,cell,nTheta,nAxial),combined=new Map();
  for(let k=0;k<q.points.length;k++){const found=locateStage1Point(model,q.points[k]);for(let j=0;j<4;j++)combined.set(found.ids[j],(combined.get(found.ids[j])||0)+q.weights[k]*found.weights[j]);}
  const entries=[...combined],total=entries.reduce((s,[,v])=>s+v,0);if(Math.abs(total-1)>1e-12)fail('membrane current projection does not conserve unit source');
  return entries;
 });
}
export function sampleMembraneTransfer(solution,morphology,cell,options={}){
 const prepared=options.prepared??prepareMembraneSampling(solution.model,morphology,cell,options);
 return Float64Array.from(prepared,entries=>entries.reduce((s,[id,w])=>s+w*solution.potentialMvPerUa[id],0));
}
export function exportStage1FieldFixture(model,solution){
 return {schema:'explicit-well-field-fixture/1',modelVersion:STAGE1_FIELD_VERSION,settings:model.settings,points:model.points,tetrahedra:Array.from({length:model.regions.length},(_,i)=>Array.from(model.tetrahedra.subarray(i*4,i*4+4))),regions:Array.from(model.regions),boundary:model.boundary,
  conductivityByRegion:[0,1,2,3,4].map(i=>sigmaFor(model.settings,i)),channel:solution.channel,contacts:model.contacts.map(({id,wellId,role,facets,areaUm2})=>({id,wellId,role,facets,areaUm2})),potentialMvPerUa:Array.from(solution.potentialMvPerUa),loadUa:Array.from(solution.loadUa),diagnostics:solution.diagnostics};
}
