window.FoundryTimeScenes=(E,cfg)=>{
'use strict';
const {C,rect,line,dot,poly,group,label,path,arrow,panel,stretch:e,mix,seqPoints,lengthLabel}=BTSFoundryPlay.gfx;
const current=E.solve(cfg), pos=E.positions(), p=[165,220,272,324,377,430,482],x0=96,x1=510;
const short=['Separate the nets','Incoming wafer','Base insulation','Trace pattern','Cover insulation','Independent openings','Active-site finish','Release the film','Fold witness','Ceramic handoff','Terminate the cable','Protect the transition','Fixture witness'];
const notes=[
 'Fourteen active shaft nets and two separate return legs. L and R labels are explanatory net identities, not manufacturer pin numbers.',
 'The reported silicon wafer is a temporary thin-film fabrication carrier, not a CMOS shank.',
 'The lower polyimide layer forms the flexible support. Layer height and display time are illustrative.',
 'Platinum routing is drawn above a silicon carbide adhesion interface. Schematic conductors only, with no invented author masks.',
 'A distinct polyimide insulating cover closes over the conductors. Metal routing and exposed windows remain separate.',
 'Representative active wells and grouped return openings are revealed. Each return leg has 109 openings on one net rather than 109 separately addressable terminals.',
 'Iridium oxide marks the active sites only. This does not set the unrecovered ground finish or predict real electrochemical behavior.',
 'The polymer piece leaves the temporary silicon support. Contact identities survive the change in shape.',
 'Follow the reported U-to-L change as a schematic fold. The viewer shows an idealized motion and does not model the real laminate strain.',
 'A screen-printed ceramic and microflex interconnection are received at an external process boundary, not fabricated by the virtual equipment.',
 'Sixteen symbolic wires connect the end of the assembly to the teaching connector. Neither the drawing nor its order is an OEM pinout.',
 'Protection closes around the cable transition, not over the active windows. The real coating thickness is not inferred here.',
 'The fixture asks two different questions: whether an intended buried conductor is reachable, and whether a passive loop has an exposed return. Playing does not run or record the test.'
];
const lay=(y,h,c,u=1)=>rect(x0,y,(x1-x0)*u,h,c,'#c5d1b5',.65);
const si=()=>lay(181,39,C.si)+label(112,206,'TEMPORARY Si CARRIER',{color:C.night});
function trackMap(u){
 let r=rect(104,76,409,49,'#426454','#9bbb9f',1,'rx="6"')+rect(104,149,409,50,'#426454','#9bbb9f',1,'rx="6"');
 for(let i=0;i<pos.length;i++){const o=pos[i],x=126+72*o.xMm,y=o.side==='L'?101:172;
  r+=group(dot(x,y,5.2,C.gold,C.paper,.55)+label(x,y+19,o.net,{size:10,anchor:'middle'}),e(i*.02,.6+i*.024,u));
 }
 const g1=e(.4,.9,u);
 r+=path('M449 116v100h32M477 164v66h-62','none',C.gold,2);
 r+=group(rect(473,209,29,14,C.blue,'#e6f0ce',.7)+rect(407,221,28,14,C.blue,'#e6f0ce',.7)+label(487,220,'GL',{color:C.night,size:9,anchor:'middle'})+label(421,232,'GR',{color:C.night,size:9,anchor:'middle'}),g1);
 return r+label(34,104,'L face',{size:11})+label(34,177,'R face',{size:11});
}
function windows(u,i){
 let r=si()+lay(164,17,C.poly)+lay(153,10,'#cbae74');
 const y=123,h=30; const spots=[156,248,394,457];
 let prev=x0;
 for(const x of spots){const z=i===4?0:18*e(.02,.95,u);r+=rect(prev,y,x-z/2-prev,h,'#80b59e','#bfceb2',.6);prev=x+z/2;}
 r+=rect(prev,y,x1-prev,h,'#80b59e','#bfceb2',.6);
 if(i===5)r+=label(120,90,'CONTACT WINDOWS',{color:C.mint});
 if(i===6){for(const x of [156,248])r+=rect(x-8,153-e(0,.8,u)*7,16,Math.max(0,e(0,.8,u)*7),C.blue);r+=label(119,92,'ACTIVE SIROF ONLY',{color:C.blue});}
 return r;
}
function groupedField(cx,cy,u){
 let r=rect(cx-47,cy-41,94,82,'#577361','#c6d0aa',1,'rx="5"'),n=0;
 for(const h of E.apertures){
  const k=e(.45+h.id*.001,.85+h.id*.001,u);
  r+=group(dot(cx+h.x*6.6,cy+h.y*6.6,1.8,C.blue),k);
  n++;
 }
 return r+label(cx,cy+58,n+' openings / 1 net',{size:11,anchor:'middle',color:C.mint});
}
function bend(u){
 const a=[[130,82],[130,154],[134,186],[160,207],[223,207],[247,199],[261,177],[261,86]],
 b=[[142,80],[142,128],[144,173],[151,192],[188,196],[245,196],[303,196],[390,196]];
 const pts=a.map((v,i)=>[mix(v[0],b[i][0],u),mix(v[1],b[i][1],u)]);
 let r=poly(pts,'none','#96bea5',25,'polyline')+poly(pts,'none',C.gold,2,'polyline');
 for(let i=0;i<6;i++){
   let t=i/5, xx=mix(129,mix(149,365,t),u),yy=mix(102+t*84,194,u);
   r+=dot(xx,yy,3.2,C.gold,C.paper,.7);
 }
 r+=label(513,117,u<.45?'PLANAR U':'FOLDED L',{anchor:'end',color:C.mint})
   +label(513,145,'two faces / two returns',{anchor:'end',color:C.muted,size:11});return r;
}
function pack(i,u){
 const pts=[[96,119],[221,119],[350,119],[487,119]],t=['Thin film','MFI ceramic','16-wire path','Fixture'];
 let r='';
 pts.forEach(([x,y],j)=>{
  let k=j<i-8?1:j===i-8?e(.03,.91,u):.38;
  if(i===12)k=1;
  const nx=x+(j===1&&i===9?mix(14,0,u):0);
  r+=group(rect(nx-53,y-27,105,55,j===1?'#a7ab88':'#4f7566','#9db6a0',1,'rx="6"')+
   label(nx,y+4,t[j],{anchor:'middle',size:12,color:j===1?C.night:C.paper}),k);
  if(j<3)r+=line(x+55,y,x+72,y,C.gold,2);
 });
 if(i===9)r+=label(80,185,'EXTERNAL QUALIFIED HANDOFF — NOT A LOCAL PROCESS',{color:C.gold,size:12});
 if(i===10)for(let j=0;j<16;j++)r+=group(line(298,158+j*3,410,158+j*3,j===7||j===15?C.blue:C.gold,1.05),e(j*.026,.58+j*.021,u));
 if(i===11){r+=rect(295,94,mix(13,96,u),49,'#bcbd9e','none',1,'rx="8" opacity=".45"');r+=label(91,199,'Protection at transition only',{size:12,color:C.mint});}
 return r;
}
function bench(u){
 const X1=68,X2=453;
 let r='';
 current.loops.forEach((o,j)=>{
  const y=55+j*12.1, fk=e(j*.039,.45+j*.038,u);
  r+=label(31,y+3,o.site,{size:10})+dot(X2,y,2.6,o.qualified?C.mint:C.red);
  r+=line(X1,y,mix(X1,X2-7,fk),y,o.qualified?C.mint:C.red,1.15,o.qualified?'':'stroke-dasharray="4 4"');
  r+=label(500,y+3,o.returnNet,{size:10,color:C.blue});
 });
 return r+label(32,234,'Virtual preview · no result recorded',{color:C.gold,size:11});
}
return E.sampleStage.map((name,i)=>({id:'time-'+(i+1),name,detail:notes[i],duration:[5,8,12].includes(i)?3150:2270,draw:u=>{
 let a=panel('TIME-4H',short[i]);
 if(i===0)a+=trackMap(u);
 else if(i===1)a+=group(si(),e(.02,.96,u));
 else if(i===2)a+=si()+lay(164,17,C.poly,u)+label(110,153,'POLYIMIDE BASE',{color:C.mint});
 else if(i===3){a+=si()+lay(164,17,C.poly)+lay(160,4,'#7e9f93',u)+lay(153,7,C.gold,u);a+=label(107,138,'Pt + SiC INTERFACE',{color:C.gold});}
 else if(i===4){a+=si()+lay(164,17,C.poly)+lay(154,10,'#d7b379')+lay(121,33,'#83b29d',u);a+=label(107,109,'UPPER POLYIMIDE',{color:C.mint});}
 else if(i===5){a+=group(windows(u,i),1-e(.58,.86,u));a+=group(groupedField(195,127,u)+groupedField(403,127,u),e(.44,.87,u));}
 else if(i===6)a+=windows(u,i);
 else if(i===7){
  a+=si();const pts=Array.from({length:33},(_,j)=>{const t=j/32;return [96+411*t,163-60*u*Math.sin(t*1.25)]});
  a+=poly(pts,'none',C.poly,17,'polyline')+poly(pts.map(([x,y])=>[x,y-2]),'none',C.gold,2.6,'polyline')+label(106,82,'PEEL BOUNDARY',{color:C.mint});
 }else if(i===8)a+=bend(u);
 else if(i<12)a+=pack(i,u);
 else a+=bench(u);
 return a;
}}));
};
