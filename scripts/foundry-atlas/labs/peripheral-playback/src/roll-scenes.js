window.FoundryRollScenes=(E,cfg,lot)=>{
'use strict';
const {C,rect,line,dot,poly,group,label,path,arrow,panel,stretch:e,mix,clamp,lengthLabel,tick}=BTSFoundryPlay.gfx;
const S=E.C,m=lot.mode,g=lot.geometry,N=m.count,wire=m.wireCount;
const panelNames={design:'Wall mask',base:'Lower carrier',basePlasma:'Promote adhesion',su8:'Wall precursor',expose:'Transfer the pattern',develop:'Develop the grooves',openQC:'Open witness',lid:'Separate cap carrier',bondPlasma:'Prepare the bond',cap:'Close the grooves',releaseCap:'Remove upper support',releaseWeb:'Free the strip',roll:'Wind across the grooves',wire:'Selected wire routes',inspect:'Check paths separately'};
const notes={
 design:`${m.widthUm} µm nominal lumen width plus ${S.su8WallUm} µm wall pitch contribution. The strip count comes from the selected branch; the animation uses a representative window.`,
 base:'The lower Ti/Au-treated glass supports the permanent PDMS base. The metals are not the sensor contacts.',
 basePlasma:'The lower PDMS interface is indicated before wall formation; the display does not reproduce a plasma recipe.',
 su8:'The wall precursor sits above the base. The two material layers remain separate.',
 expose:'The moving pattern shows where permanent wall material is retained. It does not represent a qualified exposure.',
 develop:'Open grooves emerge between the retained SU-8 walls. They are not enclosed ducts.',
 openQC:'The uncapped branch stops here. No cap, rolling, pressure test or readout wire is added.',
 lid:'The upper PDMS cap starts separately above a temporary PAA layer on a second glass carrier.',
 bondPlasma:'The lower groove assembly is prepared for cap bonding. This is separate from lower-base adhesion.',
 cap:'The cap lowers onto the wall tops and closes the grooves without becoming an extra channel.',
 releaseCap:'The water-soluble PAA support is removed in the source. The visual transfer removes that layer, not the cap.',
 releaseWeb:'The capped ribbon leaves its lower temporary carrier. Only PDMS and SU-8 remain in the membrane.',
 roll:`The strip winds transverse to the grooves. The illustrated mouths stay parallel with the roll axis; the core is not one of the ${N} patterned lumens.`,
 wire:m.id==='counter84'?'Eight witnesses are superimposed for comparison only. This is not the measured source article.':'Only eight of the 59 mouths receive readout wires in the source 150 µm article. Positions are not the original numbered pin map.',
 inspect:'The virtual stencil approaches the cut face; shifted apertures, plugs and dry conductor identity are kept separate. The dedicated Test panel runs these checks.'
};
const xa=82,wb=438,baseY=189,wh=64,roof=baseY-wh;
const span=()=>lengthLabel(xa,233,wb,`${N} modeled ${m.rolled?'lumens':'open grooves'} · ${m.widthUm} µm nominal width`);
const lower=(showGlass=true)=> (showGlass?rect(xa,baseY+19,wb,27,C.si,'#b8cbb6',.75):'')+rect(xa,baseY,wb,19,C.poly,'#b8cbb6',.75);
const floorNum=8,period=wb/floorNum,wallW=Math.max(7, period*20/(m.widthUm+20));
const wallset=(y=roof,a=1)=>Array.from({length:floorNum+1},(_,k)=>rect(xa+k*(wb-wallW)/floorNum,y,wallW,wh,C.amber,'#dec48e',.75,'opacity="'+a+'"')).join('');
function spread(u,kind){
 let r='';for(let i=0;i<floorNum;i++){
  const t=e(i*.047,.7+i*.045,u),x=xa+wallW+i*(wb-wallW)/floorNum;
  if(kind==='mask'){
   r+=group(rect(x,78,22,11,C.gold)+arrow(x+11,95,x+11,121,C.blue,1.2),t);
  }else if(kind==='surface'){
   const y=(i%2?2:-1)*Math.sin(u*Math.PI*2), a=x-2;
   r+=group(path('M'+a+' '+(baseY-8+y)+'l4 -4 4 4 4 -4 4 4','none',C.blue,2),t);
  }else if(kind==='develop'){
   r+=rect(xa+i*(wb-wallW)/floorNum+wallW,roof,(wb-wallW)/floorNum-wallW,wh,'#896b43','none',1,'opacity="'+(1-t).toFixed(2)+'"');
  }
 }
 return r;
}
function band(q,project,lo,hi,u,color,samples=110){
 const xa=[],xb=[];
 for(let i=0;i<=samples;i++){const ss=q.webWidthUm*i/samples,a=E.thetaAt(ss);xa.push(project(a,lo));xb.push(project(a,hi));}
 return poly([...xa,...xb.reverse()],color,'#9eb6a3',.65);
}
function rolled(u,{dx=0,dy=0,showStencil=false,showWires=false,sectionOnly=false,scaled=null}={}){
  const cut=u*g.angularSpanRad,S0=E.arc(cut),h=.0001, A=E.spiralAt(cut),A1=E.spiralAt(cut+h),tan0=[A1[0]-A[0],A1[1]-A[1]],l=Math.hypot(...tan0),tan=tan0.map(a=>a/l),rad=[Math.cos(cut),Math.sin(cut)];
  const model=(a,off)=>a<=cut?E.spiralAt(a,off):[A[0]+rad[0]*off+tan[0]*(E.arc(a)-S0),A[1]+rad[1]*off+tan[1]*(E.arc(a)-S0)];
  let extent=[];
  for(let j=0;j<=80;j++){const a=g.angularSpanRad*j/80;extent.push(model(a,-E.halfThickness),model(a,E.halfThickness));}
  const xs=extent.map(q=>q[0]),ys=extent.map(q=>q[1]),lx=Math.min(...xs),hx=Math.max(...xs),ly=Math.min(...ys),hy=Math.max(...ys);
  const sx=scaled?.cx||299,sy=scaled?.cy||138,k=Math.min((scaled?.w||430)/Math.max(1,hx-lx),(scaled?.h||170)/Math.max(1,hy-ly));
  const P=([x,y])=>[sx+(x-(lx+hx)/2)*k,sy-(y-(ly+hy)/2)*k],Q=(a,off)=>P(model(a,off));
  let r=band(g,Q,-E.halfThickness,E.halfThickness,u,C.amber)+band(g,Q,-E.halfThickness,E.bandMin,u,C.poly)+band(g,Q,E.bandMax,E.halfThickness,u,'#84b4a2');
  lot.rows.forEach((row,i)=>{
    const [a,b]=row.angularBounds,pts=[[a,E.bandMin],[a,E.bandMax],[b,E.bandMax],[b,E.bandMin]].map(([t,o])=>Q(t,o));
    const bad=sectionOnly&&row.plugPct===100,sel=sectionOnly&&row.lumen===cfg.plugSite;
    r+=poly(pts,bad?'#844e39':C.night,sel?C.paper:'#a98a54',sel?1.7:.35);
    if(showWires&&row.wireId){const [x,y]=P(row.centerUm);r+=dot(x,y,2.7,C.gold,C.paper,.4);}
    if(showStencil){
      const xx=row.sectionPolygonUm.map(([x,y])=>P([x+dx,y+dy]));r+=group(poly(xx,'#ad6f53',C.bright||C.gold,.65),.35);
    }
  });
  return r;
}
function axialWires(u){
 let r=rolled(1,{showWires:true,scaled:{cx:154,cy:141,w:202,h:160}})+rect(319,96,204,88,'#567664','#adbf9a',1,'rx="6"');
 for(let j=0;j<wire;j++){
  const y=106+j*9.4,k=e(j*.045,.58+j*.046,u);
  r+=line(541,y,mix(541,416,k),y,C.gold,1.8)+group(dot(416,y,2,C.blue),e(.69,1,k));
 }
 r+=label(419,207,'Axial witness / '+wire+' selected',{anchor:'middle',size:11,color:C.mint});
 return r;
}
return E.sequence(cfg.mode).map((key,i)=>({id:'roll-'+key,name:E.stages[key].name,detail:notes[key],duration:['roll','wire','inspect'].includes(key)?3450:2320,draw:u=>{
 let a=panel('MICROCHANNEL',panelNames[key]);
 if(key==='design'){
  for(let j=0;j<=floorNum;j++){const x=xa+j*(wb-wallW)/floorNum;a+=rect(x,88,wallW,100,C.gold,'#cdb380',.6,'opacity="'+e(j*.042,.68+j*.033,u).toFixed(2)+'"');}
  a+=span()+label(xa,69,`STRIP MASK / ${m.widthUm} µm CLEAR`,{color:C.mint});
 }else if(key==='base'){a+=rect(xa,baseY+19,wb,26,C.si,'#b8cbb6',.75)+rect(xa,baseY,wb*u,19,C.poly,'#b8cbb6',.75)+label(xa,176,'PDMS / Ti–Au treated glass',{color:C.mint});}
 else if(key==='basePlasma')a+=lower()+spread(u,'surface')+label(xa,167,'ADHESION BOUNDARY',{color:C.blue});
 else if(key==='su8'||key==='expose'){a+=lower()+rect(xa,roof,wb*(key==='su8'?u:1),wh,'#876d50','#ad956a',.9);if(key==='expose')a+=spread(u,'mask');a+=label(xa,roof-16,'SU-8 PRECURSOR',{color:C.gold});}
 else if(key==='develop'||key==='openQC'){
  a+=lower()+wallset()+ (key==='develop'?spread(u,'develop'):'');
  if(key==='openQC')a+=arrow(120,82,mix(120,470,u),82,C.blue)+label(xa,69,'UNCAPPED / NO CONFINED FLOW',{color:C.mint});
  a+=span();
 }else if(key==='lid'||key==='bondPlasma'){
  a+=lower()+wallset()+rect(xa,56,wb,18,C.si)+'<g opacity="'+(key==='lid'?e(0,.8,u):1).toFixed(2)+'">'+rect(xa,74,wb,7,C.pink)+rect(xa,81,wb,12,C.poly)+'</g>';
  if(key==='bondPlasma')a+=group(line(xa+6,roof-2,mix(xa+6,xa+wb-6,u),roof-2,C.blue,3,'stroke-dasharray="6 6"'),.92);
 }else if(key==='cap'){
  let y=mix(85,roof-12,u);
  a+=lower()+wallset()+rect(xa,y-23,wb,16,C.si)+rect(xa,y-7,wb,7,C.pink)+rect(xa,y,wb,12,C.poly);
 }else if(key==='releaseCap'){
  a+=lower()+wallset()+rect(xa,roof-12,wb,12,C.poly)+group(rect(xa,roof-35-35*u,wb,15,C.si)+rect(xa,roof-20-35*u,wb,8,C.pink),1-u);
  a+=label(xa,71,'TEMPORARY UPPER SUPPORT LEAVES',{color:C.mint});
 }else if(key==='releaseWeb'){
  const dy=37*u;
  a+=rect(xa,baseY+19,wb,24,C.si)+rect(xa,baseY-dy,wb,19,C.poly)+wallset(roof-dy)+rect(xa,roof-12-dy,wb,12,C.poly);
 }else if(key==='roll'){a+=rolled(e(0,.91,u));}
 else if(key==='wire')a+=axialWires(u);
 else a+=rolled(1,{dx:mix(-96,cfg.dxUm,u),dy:mix(69,cfg.dyUm,u),showStencil:true,showWires:wire>0,sectionOnly:true})+label(28,236,'Aperture overlap ≠ electrical continuity',{color:C.mint,size:11});
 return a;
}}));
};
