/** Authentic, sparse H01 skeleton ROI adapter. No synthetic population or membranes.
 * Native H01 axes and relative positions retained; mm units, translation only.
 */
export const H01_ASSET='/assets/finger-pathway-atlas/v4/h01/reference-neurites.json';
export function clipSegment(a,b,lo,hi){
 let t0=0,t1=1;
 for(let r=0;r<3;r++){
  const d=b[r]-a[r];if(Math.abs(d)<1e-15){if(a[r]<lo[r]||a[r]>hi[r])return null;continue;}
  let l=(lo[r]-a[r])/d,h=(hi[r]-a[r])/d;if(l>h)[l,h]=[h,l];t0=Math.max(t0,l);t1=Math.min(t1,h);if(t0>=t1)return null;
 }
 return {a:a.map((v,r)=>v+t0*(b[r]-v)),b:a.map((v,r)=>v+t1*(b[r]-v)),t0,t1};
}
export function cropH01(pack,sourceId,size=.08){
 if(pack.units!=='mm'||!Array.isArray(pack.templates))throw new Error('H01 reference pack has unexpected units or schema');
 const selected=pack.templates.find(t=>String(t.sourceId)===String(sourceId))||pack.templates[0];
 if(!selected||!selected.somaSourceNm?.every(Number.isFinite))throw new Error('Missing H01 native position');
 const center=selected.somaSourceNm.map(v=>v/1e6),segments=[];let omitted=0;
 for(const cell of pack.templates){
  if(!cell.somaSourceNm?.every(Number.isFinite))throw new Error('Invalid H01 source coordinates');
  const origin=cell.somaSourceNm.map(v=>v/1e6);
  for(const path of cell.paths||[])for(let i=1;i<path.points.length;i++){
   const ra=path.radii[i-1],rb=path.radii[i],r=Math.max(ra,rb);
   // Large soma-skeleton radii are not interpreted as segmented soma membranes.
   if(!Number.isFinite(r)||Math.min(ra,rb)<=0||r>=size*.15){omitted++;continue;}
   const local=v=>v.map((x,a)=>x+origin[a]-center[a]+(a===1?size/2:0));
   const q=clipSegment(local(path.points[i-1]),local(path.points[i]),[-size/2+r,r,-size/2+r],[size/2-r,size-r,size/2-r]);
   if(q)segments.push({a:q.a,b:q.b,ra:ra+(rb-ra)*q.t0,rb:ra+(rb-ra)*q.t1,id:String(cell.sourceId),role:path.role||'neurite'});
  }
 }
 return {segments,centerMM:center,selected:String(selected.sourceId),omitted,source:pack.source,sourceUrl:pack.sourceUrl,license:pack.license,attribution:pack.attribution,
  sourceSha256:selected.sourceSha256,archiveSha256:pack.archiveSha256,
  limitations:'Sparse proofread skeleton subset; native-position crop, not dense neuropil. Tubes approximate skeleton radii, not segmented membranes. Passive continuum deformation; no cell-specific material, adhesion or injury prediction.'};
}
export function tubeGeometry(segments,sides=8){
 const positions=[],indices=[],owners=[];
 for(let s=0;s<segments.length;s++){
  const seg=segments[s],d=seg.b.map((v,i)=>v-seg.a[i]),len=Math.hypot(...d);if(len<1e-9)continue;d.forEach((v,i)=>d[i]=v/len);
  const u=Math.abs(d[1])<.9?[-d[2],0,d[0]]:[0,d[2],-d[1]],ul=Math.hypot(...u);u.forEach((v,i)=>u[i]=v/ul);
  const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],base=positions.length/3;
  for(let end=0;end<2;end++)for(let a=0;a<sides;a++){
   const theta=a/sides*Math.PI*2,center=end?seg.b:seg.a,r=end?seg.rb:seg.ra;
   for(let axis=0;axis<3;axis++)positions.push(center[axis]+r*(Math.cos(theta)*u[axis]+Math.sin(theta)*v[axis]));owners.push(s);
  }
  for(let a=0;a<sides;a++){const b=(a+1)%sides;indices.push(base+a,base+b,base+sides+a,base+b,base+sides+b,base+sides+a);}
 }
 return {positions:Float32Array.from(positions),indices:Uint32Array.from(indices),owners:Uint32Array.from(owners)};
}
/** Import explicit surface geometry only; provenance is mandatory and displayed. */
export function validateSurfacePack(data,L){
 if(data.schema!=='bts-cellular-surface-v1'||!['mm','um'].includes(data.units))throw new Error('Expected bts-cellular-surface-v1, in mm or um');
 if(!data.dataset||!data.sourceUrl||!data.license||!Array.isArray(data.positions)||!Array.isArray(data.indices))throw new Error('Dataset, source URL, license, positions and indices are required');
 if(!/^https?:\/\//.test(data.sourceUrl))throw new Error('Source URL must be HTTP(S)');
 if(data.positions.length%3||data.positions.length>300000||data.positions.length<9||data.indices.length%3||data.indices.length>900000)throw new Error('Invalid geometry or browser size budget exceeded');
 const scale=data.units==='um'?.001:1,P=data.positions.map(v=>v*scale),N=P.length/3;
 if(!P.every(Number.isFinite)||!data.indices.every(v=>Number.isInteger(v)&&v>=0&&v<N))throw new Error('Nonfinite coordinates or invalid triangle indices');
 for(let i=0;i<P.length;i++){const r=i%3,lo=r===1?0:-L/2,hi=r===1?L:L/2;if(P[i]<lo-1e-8||P[i]>hi+1e-8)throw new Error('Geometry outside sample. Convert to local coordinates; no automatic rescaling or recentering.');}
 return {positions:Float32Array.from(P),indices:Uint32Array.from(data.indices),provenance:{dataset:String(data.dataset),sourceUrl:data.sourceUrl,license:String(data.license),note:String(data.note||'User-supplied surface geometry; provenance not independently verified.')}};
}
