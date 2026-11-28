window.FoundryStentScenes=(E,state)=>{
'use strict';
const {C,rect,line,dot,poly,group,ell,label,path,arrow,tick,panel,stretch:e,mix,seqPoints,lengthLabel}=BTSFoundryPlay.gfx;
const p=E.published, N=8, phi=state.rotation*Math.PI/180, from=E.geom(3), full=E.result({...state,stage:7});
function project(row,c,g){
 const a=c*Math.PI/4+phi, rr=45*g.diameter/3;
 return [67+row/12*449*g.length/from.length+Math.cos(a)*rr*.35,115+Math.sin(a)*rr,Math.cos(a)];
}
function grid(g,drag=0){
 const RR=45*g.diameter/3,X=67+drag,end=X+449*g.length/from.length, edges=[];
 let art=ell(X,115,RR*.35,RR,'#407060','#9cb9a7',.9);
 for(let j=0;j<12;j++)for(let c=0;c<8;c++)for(let k of [-1,1])if(!((j+c)%2)){const a=project(j,c,g),b=project(j+1,c+k,g);edges.push({a,b,z:(a[2]+b[2])/2});}
 for(const {a,b,z} of edges.sort((a,b)=>a.z-b.z))art+=line(a[0]+drag,a[1],b[0]+drag,b[1],z>=0?'#b6ceae':'#739c89',z>=0?1.6:1.1,z<0?'stroke-dasharray="4 2"':'');
 return art+ell(end,115,RR*.35,RR,'none','#b3cbb2',.9);
}
const tray=i=>[82+i*61,201];
const names=['Supplied lattice','Disc coupons','Separate disc–wire subassemblies','Crossover mounting','Wire fanout and breakout','Geometric mandrel sweep','Trace expected pin identities','Separate the records'];
const detail=[
 'The research scaffold arrives as a sourced input. The shown nitinol lattice is inferred; it is not drawn as a fabrication recipe.',
 'Lay out eight circular, nominal 750 µm platinum discs for inspection. Thickness is exaggerated only in the separate native evidence plate.',
 'In the published article insulated Pt/W leads join to discs by a specialist resistance-welding operation. The moving marks indicate only assembly topology.',
 'Each selected site moves to a drawn crossing. Positions and order are reconstructed and do not define published or product pin assignments.',
 'The route adds eight symbolic C1–C8 witness terminals, independent of the scaffold return.',
 'Change the nominal geometry against a smooth inert cylinder, not tissue. This is the lab’s diagonal-preserving geometric surrogate; there is no nitinol force law.',
 'Independent blue/gold paths illustrate the virtual net graph and the frame barrier. The native fixture remains untested by playback.',
 'Geometry, dry continuity and source evidence stay distinct. Playing this stage does not capture a baseline or export files.'
];
function gPass(id,u){
 const t=full.continuity.rows[id],ox=72,oy=62+id*22,x2=501;
 let v=line(ox,oy,ox+12,oy,C.gold,2)+label(29,oy+4,'C'+(id+1),{size:11})+label(568,oy+4,'D'+(id+1),{size:11,anchor:'end'});
 for(const dst of t.discs){const a=[ox+13,oy],b=[ox+115,oy],c=[x2-85,62+dst*22],d=[x2,62+dst*22];v+=poly(seqPoints([a,b,c,d],u),'none',dst===id&&!t.frame?C.mint:C.red,2,'polyline');}
 if(t.frame)v+=line(ox+27,oy,mix(ox+27,282,u),224,C.red,1.5,'stroke-dasharray="4 4"');
 if(!t.discs.length&&u>.75)v+=path('M178 '+(oy-5)+'l8 10m0-10-8 10','none',C.red,2);
 return v;
}
return E.stations.map((st,i)=>({id:'stent-'+(i+1),name:st[1],detail:detail[i],duration:i===3||i===5?3300:2400,draw:u=>{
 let a=panel('STENTRODE',names[i]);
 if(i<6){
   const diam=i===5?(u<.55?mix(3,2,e(0,.55,u)):mix(2,state.diameter,e(.57,1,u))):3;
   const g=i===5?E.geom(diam):from;
   a+=grid(g,i===0?mix(-94,0,u):0);
   if(i===0)a+=lengthLabel(68,216,449,u>.66?'31.1 mm nominal · sourced frame':'Intake · no electrical routes');
   if(i===1||i===2||i===3||i===4||i===5){
    E.sites(g).forEach((s,j)=>{
      const l=project(s.row,s.column,g),t=tray(j),v=i<3?0:i===3?e(j*.046,.6+j*.052,u):1;
      const x=mix(t[0],l[0],v),y=mix(i===1?mix(221,201,e(j*.04,.68,u)):t[1],l[1],v),k=i===1?e(j*.047,.7+j*.04,u):1;
      a+=group(dot(x,y,6.2,C.gold,'#e2d7ac',1),k);
      if(i===2)a+=line(x,y,mix(x,x-30,u),mix(y,y-18,u),C.amber,1.4)+group(dot(x,y,2.5,C.blue),e(.45,.91,u));
      if(i>=4){
       const y0=183+j*5, pts=[[33,y0],[50+j*4,y0],[x-17,y+11],[x,y]];
       a+=poly(seqPoints(pts,i===4?e(j*.08,.65+j*.047,u):1),'none',C.gold,1,'polyline');
       a+=rect(22,y0-1.6,9,2.7,C.gold);
      }
    });
   }
   if(i===1)a+=label(31,232,'Eight separate discs · not mounted',{color:C.gold,size:11});
   if(i===2)a+=label(29,235,'Joint indicators do not assert continuity',{color:C.muted,size:11});
   if(i===3)a+=label(29,235,'Teaching crossover map · no recovered scaffold CAD',{color:C.muted,size:11});
   if(i===4)a+=label(24,232,'C1…C8 = fixture terminals',{color:C.gold,size:11});
   if(i===5){
    a+=ell(61,115,10,45*diam/3,'none',C.blue,1.2)+label(27,222,'Inert mandrel: Ø '+diam.toFixed(2)+' mm · geometry only',{color:C.mint,size:12});
   }
 }else if(i===6){
   a+=line(266,224,450,224,C.steel,1.4,'stroke-dasharray="4 4"')+label(471,228,'FRAME',{color:C.blue,size:11});
   for(let j=0;j<N;j++)a+=gPass(j,e(j*.075,.43+j*.08,u));
 }else{
   const words=['Geometry','Continuity','Source boundary'],help=['Shape and dimensions','Pins, discs, frame','Published vs modeled'];
   words.forEach((w,j)=>{let x=29+j*185,v=e(j*.16,.45+j*.14,u),y=mix(157,82,v);
    a+=group(rect(x,y,167,109,'#396353','#a1beaa',1,'rx="6"')+label(x+12,y+28,w,{color:C.gold,size:12})+label(x+12,y+56,help[j],{size:11})+line(x+13,y+84,x+145,y+84,C.steel,1),v);
   });
 }
 return a;
}}));
};
