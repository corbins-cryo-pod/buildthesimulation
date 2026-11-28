window.FoundryCuffScenes=(E,D,model,diameter)=>{
'use strict';
const {C,rect,line,dot,poly,path,label,ell,group,arrow,tick,panel,stretch:e,mix,lengthLabel,seqPoints}=BTSFoundryPlay.gfx;
const {p,n,channels}=model, [base,ppy]=p.stack.split(':');
const xs=ch=>141+30*(ch.u-.12),ys=ch=>ch.side>0?118:176;
const plateSet=['Pattern the strip','Temporary carrier','Sensing traces and bus','Protected flex','Register the windows','Separate surface coating','Release from temporary support','Connect interface pads','Distinct active stripes','Electrical witness','Inert-mandrel witness'];
const details=[
  `Display layout: ${n} sensing sites and ${base} / ${ppy} µm PaC / PPy film pair. Coordinate layout and play timing are explanatory.`,
  'Silicon is temporary. This view adds the first permanent Parylene C film above it.',
  'Individual sensing tracks and the actuator bus appear as separate conductors. Fine geometries are schematic.',
  'The insulating overlayer covers tracks before the independent perimeter pattern is defined.',
  'Temporary mask openings move into registration with metal lands. Offset is magnified for visibility.',
  'PEDOT:PSS forms the contact surface; it is not the PPy actuator. The gold underneath remains a distinct path.',
  'The patterned flex separates from the silicon carrier. If the selected release branch retains a tether, the animation keeps it attached.',
  'The flex cable and anisotropic joint meet the pad bank. Apparent overlap can still reach the wrong pin.',
  'PPy(DBS) coverage develops on the separate actuator stripes, not across the sensing sites.',
  'Trace the intended-fixture endpoints as well as electrode exposure. The animation only previews the check; consult the bench to run it.',
  'Wrap and reopening are shown on a nonliving rigid cylinder. Shape progression is a visual interpolation, not measured actuation kinetics.'
];
const carrier=(x=96,y=179,w=405)=>rect(x,y,w,43,C.si,'#bed0bf',1)+line(x,y+38,x+w,y+38,'#466b69',3);
const strip=()=>rect(104,91,402,108,'#8bb4a1','#c9d8b7',1.3,'rx="7"')+rect(426,112,83,60,'#b8ce9f','#b8d1b8',1,'rx="4"');
function drawTracks(u,withPads=false,withSites=true){
 let s='';
 for(let i=0;i<n;i++){
  const ch=channels[i],x=xs(ch),y=ys(ch),d2=Math.floor(i/(n===28?2:1));
  const k=e(i/n*.25,.85+i/n*.15,u),a0=x,b0=y,a1=Math.min(470,x+14+3*(i%3)),b1=y+(y>145?-1:1)*(8+(i%5)*4);
  let pts=[[a0,b0],[a1,b1],[433,b1],[478,125+(i+1)*33/(n+1)]];
  s+=poly(seqPoints(pts,k),'none',C.gold,n>3?1.15:2,'polyline');
  if(p.breakNet==='first'&&i===0&&k>.45)s+=line(a1+9,b1,a1+19,b1,C.dark,3);
  if(withSites)s+=group(dot(x,y,n>3?3.7:7,C.gold,'#634f3d',1),e(.18,.72,k));
 }
 s+=line(118,147,mix(118,495,u),147,C.amber,3.5);
 if(p.breakNet==='drive'&&u>.4)s+=line(320,147,333,147,C.dark,5);
 if(withPads)for(let i=0;i<n+1;i++){const y=119+49*i/Math.max(1,n);s+=rect(474,y,n===3?22:14,n===3?7:1.3,C.gold)}
 return s;
}
function sectionStack(i,u){
 let q=carrier(95,183);
 const paint=(y,h,c,w=405)=>rect(95,y,w,h,c,'#c9d7bb',.55);
 if(i>=1)q+=paint(165,18,C.poly,i===1?405*e(0,.9,u):405);
 if(i>=2)q+=paint(157,8,C.gold,i===2?405*u:405);
 if(i>=3)q+=paint(140,17,'#a7c9ad',i===3?405*u:405);
 return q;
}
function last(u){
 const cycle=u<.5?e(.04,.5,u):1-e(.56,.98,u),ret=E.bench(model,D,.4,diameter),rm=ret.rm||diameter/2;
 const R=ret.valid&&ret.k!=null&&ret.k>0&&cycle>1e-5?1/(ret.k*cycle):null;
 const vv=[],N=65;
 for(let j=0;j<=N;j++){
  const s=E.L*j/N;
  vv.push([E.point(s,-E.W/2,R,rm),E.point(s,E.W/2,R,rm)]);
 }
 const px=(xyz)=>[xyz[0]*45+xyz[2]*21, -xyz[1]*39+xyz[2]*10],A=vv.map(pair=>pair.map(px)),ALL=A.flat();
 const cx=(Math.min(...ALL.map(x=>x[0]))+Math.max(...ALL.map(x=>x[0])))/2;
 const cy=(Math.min(...ALL.map(x=>x[1]))+Math.max(...ALL.map(x=>x[1])))/2;
 const cv=v=>{let [x,y]=px(v);return [x-cx+299,y-cy+138]};
 let shapes='';
 const [x,y]=cv([0,0,0]),dr=14*diameter;
 shapes+=group(ell(x-94,y,dr*.3,dr,'#78908a',C.blue,1)+rect(x-94,y-dr,188,dr*2,'#788d83','#afc6ad',.7)+ell(x+94,y,dr*.3,dr,'#668f87',C.blue,1),.52);
 const fields=vv.slice(1).map((a,i)=>({depth:(a[0][1]+a[1][1])/2, p:[...vv[i],a[1],a[0]].map(cv),i}));
 for(const x of fields.sort((a,b)=>a.depth-b.depth)){
  shapes+=poly(x.p,x.i%7===0?'#bd9963':x.i%2?'#78a08e':'#7da696','#a7c1a6',.35);
 }
 return shapes+label(28,227,!ret.valid?'Preview held: '+ret.status:R?'Geometric wrap preview':'Flat-state reference',{color:ret.valid?C.mint:C.red,size:13})+label(570,227,`Inert Ø ${diameter.toFixed(2)} mm`,{anchor:'end',color:C.blue,size:12});
}
return E.stages.map((st,i)=>({id:'cuff-'+(i+1),name:st.name,detail:details[i],duration:i===10?4100:2400,draw:u=>{
 let q=panel('CUFF',plateSet[i]);
 if(i===0){
   q+=group(strip(),e(0,.5,u));
   for(const c of channels){const k=e(.11,.92,u),x=xs(c),y=ys(c);q+=group(dot(x,y,n>3?4.2:7,C.gold,C.paper,.7),k);}
   q+=lengthLabel(104,216,402,'10.7 mm nominal sensing section');
   q+=label(113,62,`${n} SENSE POSITIONS / CHOSEN FILM PAIR ${base}:${ppy}`,{color:C.mint,size:12});
 }else if(i===1){
   q+=carrier(96,181)+rect(96,164,405*u,17,C.poly,'#d0dfc0',1);
   q+=label(113,209,'TEMPORARY SILICON',{color:C.night})+label(113,152,'PARYLENE C BASE',{color:C.mint,size:12});
 }else if(i===2){
   q+=strip()+drawTracks(u);
   q+=label(116,75,'SENSE NETS',{color:C.gold})+label(415,78,'DRIVE BUS',{color:C.gold});
 }else if(i===3){
   q+=strip()+drawTracks(1);
   q+=group(rect(103,88,403*e(0,.55,u),112,'#b5d4a9',C.paper,1,'rx="7"'),.59);
   let x=502-p.edge*.48*e(.48,1,u);
   q+=line(x,86,x,207,p.edge?C.red:C.gold,2,'stroke-dasharray="5 5"');
   q+=label(112,68,p.edge?'ILLUSTRATIVE EDGE INCURSION':'SEPARATE OUTLINE CUT',{color:p.edge?C.red:C.mint});
 }else if(i===4||i===5){
   q+=strip()+group(drawTracks(1,false,true),.38);
   for(const ch of channels){const x=xs(ch),y=ys(ch),dx=ch.dev*.43,dy=i===4?mix(-21,0,u):0,xx=x+(i===4?mix(34,dx,u):dx);
     q+=dot(x,y,n>3?4.9:7,C.gold);
     q+=dot(xx,y+dy,n>3?4.0:6,'none',C.paper,1.1);
     if(i===5)q+=group(dot(xx,y,n>3?4:6,C.blue),e(0,.95,u)*ch.effective);
   }
   q+=label(113,74,i===4?'LAND AND MASK ARE SEPARATE':'COATING OVER THE WINDOW',{color:C.mint});
   q+=label(109,226,'Shapes and offsets enlarged',{color:C.muted,size:11});
 }else if(i===6){
   q+=carrier(95,191);
   const h=mix(0,p.release==='tether'?31:67,u),bend=p.release==='tether'?36:62;
   const pts=Array.from({length:39},(_,j)=>{const x=97+10.4*j,t=j/38,y=178-h*e(.08,1,t)-Math.sin(t*Math.PI)*u*bend*.5;return [x,y]});
   q+=poly(pts,'none',C.poly,14,'polyline')+poly(pts.map(([x,y])=>[x,y-2]),'none',C.gold,1.5,'polyline');
   if(p.release==='tether')q+=line(97,177,97,195,C.red,3);
   if(p.release==='tear'&&u>.7)q+=path('M380 129l4 13 5-3','none',C.red,2);
   q+=label(107,226,p.release==='tether'?'TETHER RETAINED':'CARRIER STAYS BEHIND',{color:C.paper,size:12});
 }else if(i===7){
   q+=strip()+drawTracks(1,true);
   let x=mix(529,473,u),dy=p.bond*.14;
   q+=rect(x,107+dy,117,76,'#8cad99',C.paper,1,'rx="4"');
   for(let i=0;i<=n;i++){const y=119+49*i/Math.max(1,n);q+=rect(x,y+dy+p.skew*.13*(i/n-.5),24,n>3?1.2:6,C.gold);}
   q+=group(rect(478,110,16,62,'#b89368',C.paper,1),e(.62,1,u)*.72)+label(102,73,'PAD BAND AND FLEX CABLE',{color:C.mint});
 }else if(i===8){
   q+=strip()+group(drawTracks(1,true),.56);
   for(let j=0;j<14;j++){const x=130+j*21,z=e(j/23,.74+j/53,u)*p.ppy/100;q+=line(x,154,x+15*z,154-47*z,'#786184',6);}
   q+=label(109,74,'PPy(DBS) DRIVE STRIPES',{color:C.mint});
 }else if(i===9){
   q+=strip()+group(drawTracks(1,true),.62);
   for(let j=0;j<n;j++){
     let ch=channels[j],x=xs(ch),y=ys(ch),k=e(j/n*.71,.11+j/n*.81,u);
     q+=group(dot(x,y,n>3?3.7:6,ch.dc?C.mint:C.red),k);
   }
   q+=label(107,71,'VIRTUAL CONTINUITY PATHS',{color:C.mint})+label(111,227,'Preview only · no test recorded',{color:C.muted,size:12});
 }else q+=last(u);
 return q;
}}));
};
