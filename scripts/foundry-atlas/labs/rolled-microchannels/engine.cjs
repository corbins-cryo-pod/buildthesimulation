/* SPDX-License-Identifier: MIT. Inert teaching reconstruction, not a released mask or qualified process. */
(function(g){
'use strict';
const TAU=2*Math.PI;
const C=Object.freeze({
  pdmsBaseUm:40,pdmsLidUm:10,heightUm:100,su8WallUm:20,flatAxialWallUm:10000,rollLengthUm:3000,
  assumedCoreInnerRadiusUm:170,wireDiameterUm:60,wireStockLengthUm:100000,exposedTipLengthUm:500,
  assumedDistalWireOccupancyLengthUm:1500,assumedPlugLengthUm:250,assumedStencilLengthUm:100,
  benchViscosityPaS:0.001,teachingOwnMin:.80,teachingNeighborMax:.02,seriesOddTerms:41
});
const modeList=[
 {id:'wire150', label:'150 µm roll · 59 lumens / 8 wires',short:'Instrumented article',status:'Documented build',note:'§§2.2, 3.7 and Fig. 9: eight 304 stainless microwires in a 150 × 100 µm scaffold. Those eight identities are diagrammed, not recovered.',widthUm:150,count:59,wireCount:8,rolled:true,innerAreaRise:.075},
 {id:'g100',label:'100 µm roll · 84 lumens / no assigned wires',short:'84-lumen geometry',status:'Documented geometry',note:'§§2.1, 3.1 and Fig. 3: 84 lumens. Not the geometry used for the paper’s eight-wire interface.',widthUm:100,count:84,wireCount:0,rolled:true,innerAreaRise:.025},
 {id:'g50',label:'50 µm roll · 143 lumens / no assigned wires',short:'Narrow-lumen geometry',status:'Documented geometry',note:'§§2.1, 3.1: 143 lumens. The nominal width is smaller than the 60 µm wire diameter. This is not a wired build.',widthUm:50,count:143,wireCount:0,rolled:true,innerAreaRise:.25},
 {id:'g150',label:'150 µm roll · 59 lumens / no assigned wires',short:'Wide-lumen geometry',status:'Documented geometry',note:'§§2.1, 3.1: 59 lumens. This branch isolates geometry before optional electrical outfitting.',widthUm:150,count:59,wireCount:0,rolled:true,innerAreaRise:.075},
 {id:'open50',label:'50 µm open strip · uncapped witness',short:'Uncapped flat strip',status:'Documented branch',note:'§3.1 and Fig. 3A: uncapped, unrolled grooves. The virtual mask uses the 143-groove witness layout for inspection; the pictured sample’s full groove count is not established.',widthUm:50,count:143,wireCount:0,rolled:false,innerAreaRise:0},
 {id:'counter84',label:'100 µm roll · 84 lumens / 8 hypothetical wires',short:'84-lumen counterfactual',status:'Teaching only',note:'Compare eight hypothetical 60 µm wires in the 100 × 100 µm geometry. The actual eight-wire build used the 150 µm width. This is not a reconstructed specimen.',widthUm:100,count:84,wireCount:8,rolled:true,innerAreaRise:.025}
].map(Object.freeze);
const MODES=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(modeList.map(x=>[x.id,x]))));
const stages={
 design:{name:'Draft the wall mask',basis:'Source geometry / redrawn mask',desc:'Choose one documented geometry before assigning channels. The lithographic layout sets wall and lumen widths. No original GDS or individual rolled lumen maps are available.',gate:'Count slots, not electrical paths. Flat pitch = wall width + lumen width.',tools:['01-01']},
 base:{name:'Receive the lower PDMS on glass',basis:'Methods §2.1 · Fig. 2.1',desc:'The source spins lower PDMS on Ti/Au-coated glass. Ti/Au is an anti-adhesion carrier treatment, not conductor metallization for the readout.',gate:'Verify the nominal 40 µm base and label the carrier a temporary layer.',tools:['03-01','02-07']},
 basePlasma:{name:'Activate the base surface',basis:'Methods §2.1 · Fig. 2.2',desc:'Surface preparation supports adhesion between the PDMS and the SU-8. The virtual action represents a change of material state, not a plasma recipe.',gate:'A surface witness belongs to the PDMS/SU-8 interface, not the future PDMS cap bond.',tools:['03-12']},
 su8:{name:'Apply the wall precursor',basis:'Methods §2.1 · Fig. 2.3',desc:'The patterned layer becomes tall SU-8 partitions on the PDMS base. At this point no through-ducts or separate sensing nets exist.',gate:'Nominal SU-8 height is 100 µm. Check it on an optical section or dummy coupon.',tools:['02-07','05-02']},
 expose:{name:'Transfer the wall pattern',basis:'Methods §2.1 · Fig. 2.4',desc:'Optical patterning defines walls and clear widths. The illustrative stripes are not recovered production mask artwork. The register’s aligner is a capability match, not a historic tool identification.',gate:'Track the axial wall length on the flat coupon separately from the final 3 mm trim.',tools:['02-01','02-12']},
 develop:{name:'Inspect the open grooves',basis:'Fig. 2.5 & Fig. 3A',desc:'Development leaves SU-8 walls on the lower PDMS. The source also uses these open flat specimens before any cap step. Do not route a pressurized lumen model through bare grooves.',gate:'Look for wall gaps and count groove openings. Open specimen ends here if selected.',tools:['04-06','02-12','05-02']},
 openQC:{name:'Check the open witness',basis:'Source control · virtual inspection',desc:'The open witness ends without a roof, roll, wires or pressurized bench test. Inspect cross-sectional dimensions without calling it a fluidic tube.',gate:'A measured groove spacing is valid; confined-flow and electrical results are not applicable.',tools:['12-01','05-02']},
 lid:{name:'Prepare the cap on its own carrier',basis:'Methods §2.1 · Fig. 2.6',desc:'A separate second glass carrier supports a dissolvable PAA release layer under a nominal 10 µm PDMS cap. The lower Ti/Au stack and top PAA layer have distinct release roles.',gate:'Verify which PDMS face becomes the cap. PAA is not part of the final wall stack.',tools:['02-07','16-09']},
 bondPlasma:{name:'Prepare the cap bond interface',basis:'Methods §2.1 · Fig. 2.7',desc:'The source depicts activation of the grooved lower assembly for cap attachment. This second activation is distinct from the earlier lower-base activation.',gate:'Keep the cap-transfer surface separate from electrode conductors. There are still zero sensing wires.',tools:['03-12']},
 cap:{name:'Bring cap and partitions together',basis:'Fig. 2.8 & Fig. 3B',desc:'The thin cap closes the open grooves without plugging them. A continuous cover is not the same thing as the perforated alignment plate used in the later inert test.',gate:'Inspect across neighboring channels for cover gaps, blocked mouths or wall discontinuities.',tools:['16-09','02-12']},
 releaseCap:{name:'Release the top carrier',basis:'Methods §2.1 · Fig. 2.9',desc:'The source reports dissolving the PAA support for cap transfer. The simulation marks it sacrificial; it does not represent material handling or process timing.',gate:'Capped ducts remain when the second glass carrier and PAA support are withdrawn.',tools:['04-06','12-01']},
 releaseWeb:{name:'Free the web from the lower carrier',basis:'Methods §2.1 · Fig. 2.10',desc:'Remove the temporary carriers from the closed strip. The flat section shows 40 µm floor, 100 µm wall height and 10 µm lid, a nominal stack of 150 µm.',gate:'A final web section contains PDMS and SU-8, not either carrier or release film.',tools:['12-01']},
 roll:{name:'Roll across the grooves and trim',basis:'Methods §2.1 · Fig. 3C–D',desc:'The winding direction is transverse to the grooves. Each lumen runs axially through the 3 mm trimmed roll. A small central void between turns is separate from the patterned channels.',gate:'A face-on lumen count survives winding. Do not count the open core as an extra patterned aperture.',tools:['12-01','05-02']},
 wire:{name:'Register the wire branch',basis:'Methods §2.2 / Results §3.7 + fixture',desc:'The documented article has eight 60 µm, insulated 304 stainless wires terminating within selected 150 µm lumens. In the counterfactual, the same diameters are deliberately overlaid on the 84-lumen geometry as a comparison.',gate:'Use an explicit eight-entry mapping; dried/blocked lumens and electrically open wires must retain distinct identities.',tools:['12-01','16-13']},
 inspect:{name:'Inspect the section and test two paths',basis:'Independent virtual bench / user controls',desc:'Apply an idealized test plate to the roll and inspect same-ID aperture overlap before predicting benign-fluid transfer. Separately test symbolic wire terminal identity. Neither test verifies the other.',gate:'Log pattern count, aperture coverage, path availability and electrical identity independently.',tools:['12-01','06-07','09-03']}
};
const defaults=(mode='wire150')=>{const m=MODES[mode]||MODES.wire150;const w=wireSites(m);return {mode:m.id,driftPct:m.rolled?100:0,dxUm:0,dyUm:0,plugSite:w[3]?.lumen||Math.min(20,m.count),plugPct:0,pressurePa:80,fault:'none',faultWire:4}};
function wireSites(m){
 // No original lumen numbering. Space eight deterministic witness sites across the ordered winding.
 return Array.from({length:m.wireCount},(_,i)=>({index:i+1, id:'W'+String(i+1).padStart(2,'0'),lumen:Math.floor(m.count*(i+.50)/m.wireCount)+1}));
}
function normalize(input){
 const a=input&&typeof input==='object'?input:{},m=MODES[a.mode]||MODES.wire150,d=defaults(m.id);
 const v=(k,x,y)=>{const w=a[k];const q=(w===null||w===''||w===undefined)?NaN:Number(w);return Number.isFinite(q)?Math.min(y,Math.max(x,q)):d[k]};
 return {mode:m.id,driftPct:m.rolled?v('driftPct',0,100):0,dxUm:m.rolled?v('dxUm',-190,190):0,dyUm:m.rolled?v('dyUm',-190,190):0,plugSite:Math.round(v('plugSite',1,m.count)),plugPct:m.rolled?v('plugPct',0,100):0,pressurePa:v('pressurePa',0,250),fault:m.wireCount&&['none','open','swap','bridge'].includes(a.fault)?a.fault:'none',faultWire:m.wireCount?Math.round(v('faultWire',1,8)):0};
}
function sequence(id){const m=MODES[id]||MODES.wire150,head=['design','base','basePlasma','su8','expose','develop'];return m.rolled?[...head,'lid','bondPlasma','cap','releaseCap','releaseWeb','roll',...(m.wireCount?['wire']:[]),'inspect']:[...head,'openQC']}
function areaSigned(p){let s=0;for(let i=0;i<p.length;i++){let n=p[(i+1)%p.length];s+=p[i][0]*n[1]-p[i][1]*n[0]}return s/2}
const area=p=>Math.abs(areaSigned(p)),ccw=p=>areaSigned(p)<0?[...p].reverse():p;
const xy=(r,t)=>[r*Math.cos(t),r*Math.sin(t)];
const bounding=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
const overlaps=(a,b)=>a[0]<b[2]+1e-8&&b[0]<a[2]+1e-8&&a[1]<b[3]+1e-8&&b[1]<a[3]+1e-8;
const shift=(p,dx,dy)=>p.map(([x,y])=>[x+dx,y+dy]);
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function clipConvex(subject,clip){
 let out=subject;
 for(let j=0;j<clip.length&&out.length;j++){
   const A=clip[j],B=clip[(j+1)%clip.length],p=out;out=[];
   for(let i=0;i<p.length;i++){
     const u=p[i],w=p[(i+1)%p.length],x=cross(A,B,u),y=cross(A,B,w),ci=x>=-1e-8,ni=y>=-1e-8;
     if(ci)out.push(u);
     if(ci!==ni&&Math.abs(x-y)>1e-15){const t=x/(x-y);out.push([u[0]+t*(w[0]-u[0]),u[1]+t*(w[1]-u[1])]);}
   }
 }
 return out;
}
const totalH=C.pdmsBaseUm+C.heightUm+C.pdmsLidUm, radialR0=C.assumedCoreInnerRadiusUm+totalH/2,k=totalH/TAU, hh=totalH/2;
const bandMin=-hh+C.pdmsBaseUm,bandMax=bandMin+C.heightUm,midOff=(bandMin+bandMax)/2;
const rk=t=>radialR0+k*t,spiralAt=(t,off=0)=>xy(rk(t)+off,t);
const integral=r=>(r*Math.hypot(r,k)+k*k*Math.asinh(r/k))/(2*k),s0=integral(radialR0);
const arc=t=>integral(rk(t))-s0;
function thetaAt(s){if(s<=0)return 0;let lo=0,hi=s/radialR0;for(let i=0;i<28;i++){const md=(lo+hi)/2;if(arc(md)<s)lo=md;else hi=md;}return (lo+hi)/2}
const bandPoly=(a,b,lo,hi)=>ccw([spiralAt(a,lo),spiralAt(a,hi),spiralAt(b,hi),spiralAt(b,lo)]);
function outline(a,b,lo,hi,samples=150){const ts=Array.from({length:samples+1},(_,i)=>a+(b-a)*i/samples);return [...ts.map(t=>spiralAt(t,hi)),...ts.reverse().map(t=>spiralAt(t,lo))]}
const cache={};
function getGeometry(mode,drift=100){
 const m=MODES[mode]||MODES.wire150;drift=m.rolled&&Number.isFinite(drift)?Math.max(0,Math.min(100,drift)):0;const memo=m.id+'/'+drift;if(cache[memo])return cache[memo];
 const w=m.widthUm, pitch=w+C.su8WallUm, webWidth=m.count*pitch+C.su8WallUm,z=C.rollLengthUm,per=[];
 for(let i=0;i<m.count;i++){
   const s=C.su8WallUm+i*pitch+w/2,a=m.rolled?thetaAt(s):0;
   per.push({lumen:i+1,flatCenterUm:s,thetaRad:a,turn:m.rolled?Math.floor(a/TAU)+1:null,weight:1-s/webWidth});
 }
 const turns=m.rolled?per.at(-1).turn:null,inner=per.filter(x=>x.turn<=2),outer=per.filter(x=>x.turn===turns),mean=x=>x.reduce((q,r)=>q+r.weight,0)/x.length;
 const aW=mean(inner),bW=mean(outer),maxT=m.rolled?thetaAt(webWidth):0;
 const channels=per.map((p,i)=>{
   let w2=w;
   if(m.rolled&&aW>bW)w2*=1+(m.innerAreaRise*drift/100)*(p.weight-bW)/(aW-bW);
   let poly,center,zAngle,ends=null;
   if(m.rolled){
     const rr=rk(p.thetaRad)+midOff,dt=Math.asin(Math.min(.8,w2/(2*rr))),
       L=Math.max(0,p.thetaRad-dt, i?(p.thetaRad+per[i-1].thetaRad)/2+.001:0),
       H=Math.min(maxT,p.thetaRad+dt,(i<per.length-1?(p.thetaRad+per[i+1].thetaRad)/2-.001:maxT));
     ends=[L,H];poly=bandPoly(L,H,bandMin,bandMax); center=spiralAt(p.thetaRad,midOff);zAngle=p.thetaRad;
   }else{center=[p.flatCenterUm-webWidth/2,C.pdmsBaseUm+C.heightUm/2];zAngle=null;poly=ccw([[center[0]-w/2,C.pdmsBaseUm],[center[0]+w/2,C.pdmsBaseUm],[center[0]+w/2,C.pdmsBaseUm+C.heightUm],[center[0]-w/2,C.pdmsBaseUm+C.heightUm]])}
   return {...p,widthUm:w2,nominalWidthUm:w,heightUm:C.heightUm,nominalAreaUm2:w*C.heightUm,idealAreaUm2:w2*C.heightUm,sectionPolygonUm:poly,sectionAreaUm2:area(poly),bbox:bounding(poly),centerUm:center,angularBounds:ends,angleForDrawingRad:zAngle};
 });
 const bd=m.rolled?bounding(outline(0,maxT,-hh,hh,720)):[-webWidth/2,0,webWidth/2,C.pdmsBaseUm+C.heightUm];
 const A=channels.filter(x=>x.turn<=2),B=channels.filter(x=>x.turn===turns),avg=q=>q.reduce((p,c)=>p+c.idealAreaUm2,0)/q.length;
 // A bounded memo avoids a long slider session retaining many full models.
 if(Object.keys(cache).length>30)for(const u of Object.keys(cache))delete cache[u];
 return cache[memo]={mode:m.id,webWidthUm:webWidth,flatPitchUm:pitch,nominalThicknessUm:m.rolled?totalH:C.pdmsBaseUm+C.heightUm,axialLengthUm:m.rolled?z:C.flatAxialWallUm,
   turns: m.rolled?maxT/TAU:null,angularSpanRad:maxT,spanXUm:bd[2]-bd[0],spanYUm:bd[3]-bd[1],bbox:bd,innerAverageAreaRisePct:m.rolled?100*(avg(A)/avg(B)-1):null,channels};
}
function register(channels,dx,dy){
 if(Math.abs(dx)+Math.abs(dy)<1e-10)return channels.map(c=>({ ownFraction:1,neighborFraction:0,hits:[{lumen:c.lumen,fraction:1}]}));
 const pts=channels.map(c=>{let p=shift(c.sectionPolygonUm,dx,dy);return {id:c.lumen,p,b:bounding(p)}});
 return channels.map(c=>{
   const hits=[];for(const other of pts){
     if(!overlaps(c.bbox,other.b))continue;
     const f=area(clipConvex(c.sectionPolygonUm,other.p))/c.sectionAreaUm2;
     if(f>1e-7)hits.push({lumen:other.id,fraction:Math.max(0,Math.min(1,f))});
   }
   return {ownFraction:hits.find(h=>h.lumen===c.lumen)?.fraction||0,
   neighborFraction:Math.min(1,hits.filter(h=>h.lumen!==c.lumen).reduce((a,b)=>a+b.fraction,0)),hits};
 });
}
function rectK(wUm,hUm){
 const w=Math.max(wUm,hUm)*1e-6,h=Math.min(wUm,hUm)*1e-6;if(!Number.isFinite(w)||!Number.isFinite(h)||h<=0)return 0;
 let sum=0;for(let j=0;j<C.seriesOddTerms;j++){let n=2*j+1;sum+=Math.tanh(n*Math.PI*w/(2*h))/n**5;}
 return w*h**3/12*(1-(192/Math.PI**5)*(h/w)*sum);
}
function hydraulicR(w,h,l){
 if(l<=0)return 0;const k=rectK(w,h);return k>0?C.benchViscosityPaS*l*1e-6/k:Infinity;
}
function rowFlow(ch,wire,fraction,plugPct,pressure){
 const w=ch.widthUm,h=ch.heightUm,wireArea=wire?Math.PI*(C.wireDiameterUm/2)**2:0,freeArea=ch.idealAreaUm2-wireArea,
   wireLen=wire?C.assumedDistalWireOccupancyLengthUm:0;
 const equivalent=f=>Math.sqrt(Math.max(0,Math.min(1,f))),cf=equivalent(freeArea/ch.idealAreaUm2),f=equivalent(fraction),u=1-plugPct/100;
 const R=hydraulicR(w,h,C.rollLengthUm-C.assumedPlugLengthUm-wireLen)+hydraulicR(w*cf,h*cf,wireLen)+
   hydraulicR(w*u,h,C.assumedPlugLengthUm)+hydraulicR(w*f,h*f,C.assumedStencilLengthUm);
 // µL/min, m^3 × 10^9 µL/m^3 × 60 s/min.
 return {freeAreaUm2:Math.max(0,freeArea),mappedFlowUlMin:Number.isFinite(R)?pressure/R*60e9:0,resistancePaSecPerM3:Number.isFinite(R)?R:null,wireAreaUm2:wireArea};
}
function dryTest(m,x){
 const sites=wireSites(m),n=sites.length,node=Array.from({length:2*n},(_,i)=>i),find=i=>node[i]===i?i:(node[i]=find(node[i])),join=(a,b)=>{node[find(b)]=find(a)},t=x.faultWire-1,j=t===n-1?t-1:t+1;
 for(let i=0;i<n;i++){const p=x.fault==='swap'&&i===t?j:x.fault==='swap'&&i===j?t:i;if(!(x.fault==='open'&&i===t))join(i,n+p)}
 if(n&&x.fault==='bridge')join(n+t,n+j);
 const matrix=sites.map((_,i)=>sites.map((_,j)=>find(i)===find(n+j)));
 const rows=sites.map((p,i)=>{const links=sites.filter((_,j)=>matrix[i][j]);return {...p,detectedWireIds:links.map(w=>w.id),detectedLumens:links.map(w=>w.lumen),correct:matrix[i][i]&&links.length===1&&matrix.filter(r=>r[i]).length===1}});
 return {rows,matrix,isolatedCorrect:rows.filter(r=>r.correct).length,connectedTerminals:rows.filter(r=>r.detectedWireIds.length).length,wires:sites};
}
function solve(input){
 const config=normalize(input),m=MODES[config.mode],g=getGeometry(m.id,config.driftPct),dry=dryTest(m,config),by=Object.fromEntries(dry.wires.map(w=>[w.lumen,w])),reg=m.rolled?register(g.channels,config.dxUm,config.dyUm):[];
 const rows=g.channels.map((c,i)=>{
   const wire=by[c.lumen]||null,plugPct=config.plugSite===c.lumen?config.plugPct:0;
   if(!m.rolled)return {...c,wireId:null,physicalPatency:null,fixtureQualified:null,registration:null,plugPct:0,flow:null};
   const f=reg[i],physicalPatency=plugPct<100;
   let flow=rowFlow(c,Boolean(wire),f.ownFraction,plugPct,config.pressurePa);
   return {...c,wireId:wire?.id||null,physicalPatency,fixtureQualified:physicalPatency&&f.ownFraction+1e-9>=C.teachingOwnMin&&f.neighborFraction<=C.teachingNeighborMax+1e-9,
       registration:f,plugPct,flow};
 });
 return {config,mode:m,geometry:g,rows,dry,
   stats:{patterned:rows.length,physicalPatent: m.rolled?rows.filter(r=>r.physicalPatency).length:null,
   fixtureQualified:m.rolled?rows.filter(r=>r.fixtureQualified).length:null,registrationLoss:m.rolled?rows.filter(r=>r.registration.ownFraction+1e-9<C.teachingOwnMin||r.registration.neighborFraction>C.teachingNeighborMax+1e-9).length:null,
   waterPathModelSumUlMin:m.rolled?rows.reduce((a,b)=>a+b.flow.mappedFlowUlMin,0):null,
   installedWires:m.wireCount,correctElectrical:dry.isolatedCorrect,
   nominalWireFreeAreaUm2:m.wireCount?(m.widthUm*C.heightUm-Math.PI*(C.wireDiameterUm/2)**2):null,
   nominalWireFaceAndSideAreaMm2:m.wireCount?(Math.PI*C.wireDiameterUm*C.exposedTipLengthUm+Math.PI*(C.wireDiameterUm/2)**2)*1e-6:null},
   referenceNotes:m.wireCount?{tripolar:{outsideWireConductors:2,electricallyCoupled:true,referenceNetCount:1},bipolar:{outsideWireConductors:1,referenceNetCount:1},benchScope:'External returns described in §2.2. Neither is among the eight intraluminal wires. Ground/reference outcomes are not simulated.'}:null};
}
function meshOBJ(input){
 const x=normalize(input),m=MODES[x.mode],g=getGeometry(m.id,x.driftPct),z=m.rolled?C.rollLengthUm:C.flatAxialWallUm;
 let out=['# Build the Simulation / inert microchannel witness','# Units: mm. No clinical geometry, tolerances, or released production mask.','# Roll, aperture locations and wire identities are reconstructed teaching geometry.', 'mtllib microchannel-witness.mtl']; let cursor=1;
 const write=(name,mat,pts,faces)=>{
   out.push('g '+name,'usemtl '+mat);
   for(const p of pts)out.push('v '+p.map(c=>(c/1000).toFixed(8)).join(' '));
   for(const f of faces)out.push('f '+f.map(i=>i+cursor).join(' '));cursor+=pts.length;
 };
 const rail=(name,mat,a,b,lo,hi,n=4)=>{
   if(b-a<1e-7)return;let pts=[], faces=[];
   for(let i=0;i<=n;i++){let t=a+(b-a)*i/n;let p=m.rolled?spiralAt(t,lo):[t,lo],q=m.rolled?spiralAt(t,hi):[t,hi];pts.push([...p,0],[...q,0],[...q,z],[...p,z]);}
   faces.push([0,1,2,3]);for(let i=0;i<n;i++)for(let j=0;j<4;j++)faces.push([4*i+j,4*(i+1)+j,4*(i+1)+(j+1)%4,4*i+(j+1)%4]);
   faces.push([4*n+3,4*n+2,4*n+1,4*n]);write(name,mat,pts,faces);
 };
 if(m.rolled){
   let a=0,max=g.angularSpanRad;rail('PDMS_base','pdms',0,max,-hh,bandMin,192);rail('PDMS_lid','pdms',0,max,bandMax,hh,192);
   for(const q of g.channels){let [l,h]=q.angularBounds;rail('SU8_wall_'+q.lumen,'su8',a,l,bandMin,bandMax,Math.max(2,Math.ceil((l-a)*14)));a=h;}
   rail('SU8_final_wall','su8',a,max,bandMin,bandMax);
 }else{
   const s=-g.webWidthUm/2;rail('PDMS_base','pdms',s,-s,0,C.pdmsBaseUm,1);
   for(let j=0;j<=m.count;j++){let w=s+j*g.flatPitchUm;rail('SU8_wall_'+(j+1),'su8',w,w+C.su8WallUm,C.pdmsBaseUm,C.pdmsBaseUm+C.heightUm,1)}
 }
 for(const s of wireSites(m)){
   const [cx,cy]=g.channels[s.lumen-1].centerUm,R=C.wireDiameterUm/2,N=18,Z0=z-C.assumedDistalWireOccupancyLengthUm,Z1=z+240;let P=[],F=[];
   for(let zz of [Z0,Z1])for(let j=0;j<N;j++){const a=TAU*j/N;P.push([cx+R*Math.cos(a),cy+R*Math.sin(a),zz])}
   F.push(Array.from({length:N},(_,i)=>N-1-i));for(let i=0;i<N;i++)F.push([i,(i+1)%N,(i+1)%N+N,i+N]);F.push(Array.from({length:N},(_,i)=>i+N));
   write(s.id+'_witness','wire',P,F);
 }
 return {obj:out.join('\n')+'\n',
  mtl:'# Display materials only\nnewmtl pdms\nKd 0.40 0.68 0.56\nnewmtl su8\nKd 0.80 0.58 0.28\nnewmtl wire\nKd 0.75 0.78 0.74\n'};
}
const api={C,modeList,MODES,stages,sequence,defaults,normalize,wireSites,
 area,ccw,clipConvex,register,arc,thetaAt,outline,spiralAt,bandPoly,bandMin,bandMax,halfThickness:hh,
 getGeometry,rectK,hydraulicR,rowFlow,solve,meshOBJ};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.RMF=api;
})(typeof globalThis!=='undefined'?globalThis:this);
