/* Original educational model. No vendor CAD, firmware, surgical procedures, or control interfaces. */
const StentBench = (() => {
"use strict";
const PI=Math.PI, N=8, axial=12, around=8;
const published=Object.freeze({reference:"Oxley et al. 2016, Fig. 2c and Online Methods",length:31.1,diameter:3,discDiameter:0.75,discThickness:0.050,wireCore:0.025,nominalCrossingSpacing:2.5,sites:N,units:"mm"});
const stations=[
 ["01","Scaffold intake","Supplier input","The 2016 research prototype started with a bought self-expanding nitinol stent. The sandbox does not manufacture the scaffold from silicon, guess its alloy treatment, or recover its CAD.","No registered stent production line.","The reference card identifies the original 31.1 mm × 3.0 mm nominal scaffold. Its drawn lattice is explicitly assumed."],
 ["02","Platinum discs","Documented dimensions","Eight 750 µm discs appear in the illustrated 2016 assembly. The paper reports 50 µm disc thickness. The circular-face inspector derives area from geometry, not an electrochemical measurement.","12-01 · stereo microscope (reference metrology); 04-10 · candidate laser only, not validated for the discs.","Compare the nominal face area with the inspector’s circular geometry. A face is not a complete electrical channel."],
 ["03","Disc–wire joints","Specialist process","The paper identifies a resistance-welded interface between platinum discs and 25 µm-core insulated Pt/W wires. The simulator adds one modeled joint per disc; it does not operate a welder.","Original resistance micro-welder: external. 08-08 is a package seam welding reference, not its substitute.","A missing joint breaks the wire-to-disc link while leaving both objects visible."],
 ["04","Crossover mounting","Published concept · inferred layout","The published contacts attach to repeating strut crossings. Here the crossing net, polar angles and site order are synthetic, not photogrammetry. The straight-edge obstruction in the detail view represents a hypothetical contact partly covered at mounting.","08-10 · dispensing class; 12-01 · visual inspection. Qualified material/cure fixture: external.","Masking an electrode face changes exposed area; on its own it does not disconnect the welded metal."],
 ["05","Proximal breakout","Teaching substitute","The source routes wires along the scaffold and lead to external connections. Here an explicit eight-pin fixture, C1 through C8, provides traceability. It is not the published connector pinout.","16-13 · test connectors; 12-01 · optical inspection.","Trace each individual pin to a disc. An apparently intact bundle can still contain a swapped pair."],
 ["06","Mandrel sweep","Geometric surrogate","A smooth, ideal cylinder constrains the drawn scaffold diameter. The model preserves a diagonal on an unwrapped cylinder; there is no force law, strut stress, hysteresis or calibrated nonlinear nitinol.","14-01 · test-frame class; a matching inert mandrel fixture is assumed.","The reference diameter must return the nominal length. Any other computed length is a model result, not a measured collapsed length."],
 ["07","Continuity audit","Boolean test fixture","The graph has eight connector pins, eight individual wire nodes, eight electrode discs and one conductive frame. A pin only passes if it reaches exactly its own disc and no other pin or frame.","09-03 · source-measure unit class; 16-13 · breakout fixture.","Check both off-diagonal paths and isolation to the frame. The graph does not predict resistance or saline impedance."],
 ["08","Compare and export","Virtual traveler","Compare with a baseline, isolate any defect and save the geometry, connectivity matrix, assumed site locations, variant, steps and evidence references.","01-01 · design record; 01-05 · derived QA dataset.","Distinguish geometry, electrical identity and source scope in the report. Finishing these stations does not make a clinical device."]
];
const refs=[
 {id:'OX16',title:'Oxley et al. (2016), original stent-electrode',url:'https://doi.org/10.1038/nbt.3428',locator:'Fig. 2c and Online Methods, “Stentrode fabrication”',scope:'Nominal source scaffold and disk/wire dimensions; eight discs in the illustrated example. No machine-ready lattice drawing or complete pin map is claimed.'},
 {id:'SW23',title:'Mitchell et al. (2023), SWITCH',url:'https://doi.org/10.1001/jamaneurol.2022.4847',locator:'Methods, implanted devices',scope:'Later 16-electrode sensing system with an implantable receiver/transmitter. The reported 0.3 mm² electrode surface area is not a measurement of the 2016 eight-disc fixture.'},
 {id:'KA25',title:'Kacker et al. (2025), later recordings in two participants',url:'https://pubmed.ncbi.nlm.nih.gov/40048825/',locator:'Device description; channel-specific tables',scope:'Different 16-contact system; published channel retention, dimensions and recordings do not define an older eight-site pin map.'},
 {id:'NK25',title:'Nankai University (2025), separate interventional BCI',url:'https://en.nankai.edu.cn/2025/0911/c22796a577326/page.htm',locator:'Institutional platform description',scope:'Independent system. Its unknown manufacturing details are not filled with Synchron data.'}
];
const faultNames={none:'No electrical fault',open:'Open disc–wire joint',frame:'Wire shorted to frame',bridge:'Bridge to next wire',swap:'Two connector labels swapped'};
function norm(s={}){
 const val=(v,def,min,max)=>{let n=typeof v==='number'?v:Number(v);return v==null||!Number.isFinite(n)?def:Math.min(max,Math.max(min,n))};
 return {stage:Math.round(val(s.stage,0,0,7)),diameter:val(s.diameter,3,1,3),site:Math.round(val(s.site,0,0,7)),inspect:Math.round(val(s.inspect,0,0,7)),fault:Object.hasOwn(faultNames,s.fault)?s.fault:'none',cover:val(s.cover,0,0,100),rotation:val(s.rotation,22,-180,180),view:['volume','flat'].includes(s.view)?s.view:'volume'};
}
function geom(d=3){
 const D=norm({diameter:d}).diameter, D0=published.diameter, x0=published.length/axial, b0=PI*D0/around, b=PI*D/around;
 const diag=Math.hypot(x0,b0),dx=Math.sqrt(Math.max(0,diag*diag-b*b));
 return {diameter:D,length:axial*dx,pitch:dx,arcStep:b,diagonal:diag,axialIntervals:axial,azimuthDivisions:around,unit:'mm',metric:'unwrapped cylindrical surface'};
}
function aperture(c=0){
 const frac=norm({cover:c}).cover/100,r=published.discDiameter/2,h=2*r*frac,x=r-h;
 const full=PI*r*r,occluded=r*r*Math.acos(Math.max(-1,Math.min(1,x/r)))-x*Math.sqrt(Math.max(0,r*r-x*x));
 return {full,exposed:Math.min(full,Math.max(0,full-occluded)),depth:h,exposedFraction:Math.min(1,Math.max(0,1-occluded/full)),unit:'mm²'};
}
function sites(g){
 // Eight selected model crossings; arbitrary positions on the illustrative grid, not reconstructed author coordinates.
 return Array.from({length:N},(_,i)=>({id:'D'+(i+1),row:2+i,column:(2+i*3)%around,x:(2+i)*g.pitch,theta:(2+i*3)%around*2*PI/around}));
}
function graph(s0){
 const s=norm(s0),g=Array.from({length:3*N+1},()=>[]),edge=(a,b)=>{g[a].push(b);g[b].push(a)}, F=3*N;
 const adj=(s.site+1)%N;let active = s.stage>=6, assembled=s.stage>=4;
 for(let i=0;i<N;i++){
  if(s.stage>=2 && !(s.fault==='open'&&i===s.site)) edge(N+i,2*N+i);
  if(assembled) {
   let k=i;
   if(s.fault==='swap'){if(i===s.site)k=adj;else if(i===adj)k=s.site;}
   edge(i,N+k);
  }
 }
 if(s.stage>=3 && s.fault==='frame')edge(s.site+N,F);
 if(assembled&&s.fault==='bridge')edge(s.site+N,adj+N);
 const reach=x=>{let seen=new Set([x]),q=[x];while(q.length){const a=q.pop();for(const b of g[a])if(!seen.has(b)){seen.add(b);q.push(b)}}return seen;};
 const rows=Array.from({length:N},(_,i)=>{
  const r=reach(i), ds=[],cp=[];
  for(let j=0;j<N;j++){if(r.has(2*N+j))ds.push(j);if(j!==i&&r.has(j))cp.push(j)}
  let f=r.has(F),ok=active&&ds.length===1&&ds[0]===i&&!f&&cp.length===0;
  const reason=!active?'Not audited':f?'Frame short':cp.length?'Bridged pins':!ds.length?'Open':ds[0]!==i?'Misassigned':'Pass';
  return {pin:i,discs:ds,otherPins:cp,frame:f,pass:active?ok:null,reason}
 });
 return {testEnabled:active,breakoutAssembled:assembled,rows,passCount:active?rows.filter(r=>r.pass).length:null,count:N};
}
function result(s0){
 let s=norm(s0),g=geom(s.stage>=5?s.diameter:3),test=graph(s);
 let areas=Array.from({length:N},(_,i)=>aperture(s.stage>=3&&s.site===i?s.cover:0)); let a=areas[s.inspect];
 return {schema:'bts.stentrode.bench/1',referencePreset:'Oxley_2016_Fig2c_reconstruction',settings:s,geometry:g,aperture:a,exposedAreaByDisc:areas.map(x=>x.exposed),siteLocations:sites(g),continuity:test,apertureGate:s.stage>=3?(a.exposedFraction>=0.95-1e-12):null,
 disclaimer:'Illustrative eight-site pinout and idealized scaffold; binary dry continuity, not electrical impedance. No measured force, lifetime, clinical result or later product fabrication.'};
}
function diff(a,b){
 if(!a||!b||!a.continuity.testEnabled||!b.continuity.testEnabled)return null;
 const rc=r=>JSON.stringify([r.discs,r.otherPins,r.frame]);
 return {mapDelta:b.continuity.rows.filter((r,i)=>rc(r)!==rc(a.continuity.rows[i])).map(r=>r.pin+1), lengthChangeMm:b.geometry.length-a.geometry.length, areaDeltaByDiscMm2:b.exposedAreaByDisc.map((x,i)=>x-a.exposedAreaByDisc[i]), passesChange:b.continuity.passCount-a.continuity.passCount};
}
function obj(setting) {
 const z=result(setting);if(z.settings.stage<5)return null;
 const g=z.geometry,D=g.diameter,R=D/2,dx=g.pitch,M=g.azimuthDivisions,K=g.axialIntervals,nseg=36,tau=2*PI,rd=published.discDiameter/2;
 let out=['# BTS OX-16 inert geometry / v1','# Coordinates in millimetres. For SI metres, scale by 0.001 on import.','# Screen exaggeration is NOT present in this export.','# Scaffold edges are zero-width illustrative centerlines: not vendor CAD, a certified stent or a measured strut section.','# Disc envelopes retain nominal diameter and thickness. Assumed angular positions, generic pin map and optional aperture mask.','# No wires with invented routing, forces, impedance, surgical geometry or tissue.'],count=0;
 const vertex=(x,y,z)=>{out.push('v '+[x,y,z].map(v=>v.toFixed(8)).join(' '));return ++count;};
 out.push('o Assumed_Scaffold_Centerlines');const index=[];
 for(let i=0;i<=K;i++){index[i]=[];for(let j=0;j<M;j++){if((i+j)%2)continue;const t=tau*j/M;index[i][j]=vertex(i*dx,R*Math.cos(t),R*Math.sin(t));}}
 for(let i=0;i<K;i++)for(let j=0;j<M;j++)if((i+j)%2===0)for(const k of [-1,1])out.push('l '+index[i][j]+' '+index[i+1][(M+j+k)%M]);
 for(const [i,c] of z.siteLocations.entries()){
  const co=Math.cos(c.theta),si=Math.sin(c.theta),t=published.discThickness,ring=[[],[]];
  out.push('o D'+(i+1)+'_Nominal_Platinum_Disc');
  for(let layer=0;layer<2;layer++)for(let j=0;j<nseg;j++){const a=tau*j/nseg,xx=rd*Math.cos(a),tt=rd*Math.sin(a),rr=R+t*layer;ring[layer].push(vertex(c.x+xx,rr*co+tt*si,rr*si-tt*co));}
  out.push('f '+ring[0].slice().reverse().join(' '));out.push('f '+ring[1].join(' '));
  for(let j=0;j<nseg;j++){const k=(j+1)%nseg;out.push('f '+[ring[0][j],ring[0][k],ring[1][k],ring[1][j]].join(' '));}
  if(i===z.settings.site&&z.settings.cover>0){
   const f=z.settings.cover/100;const cut=-rd+2*rd*f,theta=Math.acos(Math.max(-1,Math.min(1,cut/rd)));const seg=Math.max(3,Math.ceil(36*(2*PI-2*theta)/(2*PI)));const poly=[];
   // One open witness surface: the small offset avoids z-fighting; do not assign physical film thickness.
   const rr=R+t+0.0002;out.push('o D'+(i+1)+'_Assumed_Obstruction_Witness');
   const lim=f>=1?seg-1:seg;
   for(let j=0;j<=lim;j++){const a=theta+(2*PI-2*theta)*j/seg,xx=rd*Math.cos(a),tt=rd*Math.sin(a);poly.push(vertex(c.x+xx,rr*co+tt*si,rr*si-tt*co));}
   out.push('f '+poly.join(' '));
  }
 }
 return out.join('\n')+'\n';
}
return {obj,published,stations,refs,faultNames,norm,geom,aperture,sites,graph,result,diff};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=StentBench;
