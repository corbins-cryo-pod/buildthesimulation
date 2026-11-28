window.FoundryRetinalScenes=(E,M,specimen)=>{
'use strict';
const {C,rect,line,dot,poly,group,label,path,arrow,panel,stretch:e,mix,lengthLabel,seqPoints}=BTSFoundryPlay.gfx;
const xl=61,xr=539, y=112, h=75, bottom=y+h,ybox=bottom,hbox=10,handle=197;
const gaps=[[165,193],[358,387]],cells=[[xl,165],[193,358],[387,xr]];
const g=M.coupon(specimen.size), aC=C.blue,bC=C.pink,body='#638d91',boxc='#a6c7c0',coat='#80a8b7',metal='#e1bd82';
const shorts={
 soi:'Receive SOI',window:'Open both mask windows',drie:'Etch to BOX',fill:'Line the walls and fill',cmp:'Planarize the surface','n-plus':'n⁺ junctions','p-plus':'p⁺ contacts',
 anneal:'Lower optical film',route:'First metal / series link',nitride:'Passivate and open contacts',reopen:'Remove outer fill only',electrode:'Separate electrode features',release:'Remove temporary handle'
};
const descriptions={
 soi:`Wang–Palanker research branch, ${g.widthUm} µm nominal pixel. The 30 µm silicon device layer, buried oxide (BOX) and handle are distinct; vertical thickness is enlarged.`,
 window:'The oxide hard mask registers an in-pixel boundary and a future between-pixel boundary. The two trench roles differ after release.',
 drie:'The animated slot advances from the front to the buried oxide. The drawing does not supply etcher settings or a process depth calibration.',
 fill:'A liner remains at each silicon wall as polysilicon fills both representative isolation gaps. This is the fill described in the research process.',
 cmp:'The surface overburden disappears while both isolation fills remain. A qualified endpoint or polish recipe is not implied.',
 'n-plus':'Blue marks identify the reported n⁺ photodiode regions; the physical movement is an explanatory mask/depth indication, not a dopant profile.',
 'p-plus':'Separate rose marks indicate p⁺ contact regions. They are not the same physical step as the n⁺ regions.',
 anneal:'The older surface oxide gives way to the lower optical layer. This does not predict optical film performance or temperature history.',
 route:'The Ti/Pt series link crosses an internal partition between diode regions. It does not intentionally join independent neighboring pixels.',
 nitride:'A nitride coating protects the routes while the second contact openings are revealed. The film stack is schematic.',
 reopen:'Only the boundary between pixels is cleared of its sacrificial fill here. The internal oxide-lined isolation remains.',
 electrode:'The central electrode and circumferential return are separate features. The animation does not represent light-driven tissue stimulation or commercial PRIMA fabrication.',
 release:'The handle and selected suspended BOX are removed. The remaining research witness is separated from the temporary support; playback does not run the bench checks.'
};
function strip(y,h,c,arr=cells){let r='';for(const [a,b] of arr)r+=rect(a,y,b-a,h,c,'#abc6b9',.4);return r;}
function details(gate,i,u){
 const j=M.index,wave=(list,col,q,ww)=>list.map((x,k)=>rect(x,y,ww*e(k*.085,.6+k*.095,q),9,col)).join('');
 let r='';
 if(i===0)r+=group(rect(xl,y,xr-xl,h,body,'#a6c7b9',.75),e(0,.9,u));
 else{
  const depth=i<j.drie?0:i===j.drie?h*e(0,.95,u):h;
  r+=strip(y,h,body);
  for(const [a,b] of gaps){if(depth<h)r+=rect(a,y+depth,b-a,h-depth,body,'#a3bfb2',.45);}
 }
 let z=1;
 if(i===j.release)z=1-e(.24,.99,u);
 if(z>0)r+=group(rect(xl,handle+36*(1-z),xr-xl,34,C.iron,'#91ad9f',.75)+label(299,handle+23+36*(1-z),'HANDLE',{anchor:'middle',size:11}),z);
 r+=rect(xl,ybox,358-xl,hbox,boxc,'#c1d7c3',.5)+rect(387,ybox,xr-387,hbox,boxc,'#c1d7c3',.5);
 if(i<j.release||gate.residualBOX||u<.65)r+=group(rect(358,ybox,29,hbox,gate.residualBOX?C.red:boxc),i===j.release&&!gate.residualBOX?1-e(.36,.65,u):1);
 if(i>=j.window&&i<j.anneal){
  for(const [a,b] of cells)r+=rect(a,y-10,(b-a)*(i===j.window?u:1),10,boxc);
 }
 if(i===j.window)gaps.forEach(([a,b])=>{r+=group(arrow((a+b)/2,80,(a+b)/2,107,C.gold,1.25),e(.48,1,u));});
 if(i>=j.fill){
    gaps.forEach(([a,b],k)=>{
      const fraction=i===j.fill?e(.05,.9,u):k===1&&i===j.reopen?1-e(0,.89,u):k===1&&i>j.reopen?0:1;
      if(fraction>0)r+=rect(a+2,bottom-h*fraction,b-a-4,h*fraction,C.amber,'#d7c196',.6);
      const z=i===j.fill?e(0,.43,u):1;
      r+=line(a+1,y,a+1,y+h*z,boxc,2)+line(b-1,y,b-1,y+h*z,boxc,2);
    });
 }
 if(i===j.fill||i===j.cmp){const z=i===j.fill?e(.66,1,u):1-e(0,.9,u);r+=rect(xl,y-18*z-10,xr-xl,18*z,C.amber,'#d0ad6c',z>.01?.5:0);
  if(i===j.cmp){const cx=mix(xl+18,xr-43,u);r+=rect(cx,y-49,35,15,'#8ca398',C.paper,.65)+path('M'+cx+' '+(y-32)+'h34','none',C.blue,1.4);}
 }
 if(i>=j['n-plus'])r+=wave([104,238,433],aC,i===j['n-plus']?u:1,22);
 if(i>=j['p-plus'])r+=wave([135,301,487],bC,i===j['p-plus']?u:1,19);
 if(i>=j.anneal)r+=strip(y-7,7,coat,i===j.anneal?cells.map(([a,b])=>[a,a+(b-a)*u]):cells);
 if(i>=j.route){
   const x=e(.01,.95,i===j.route?u:1);
   const trace=pts=>poly(seqPoints(pts,x),'none',metal,4.2,'polyline');
   r+=trace([[142,y+2],[142,y-17],[247,y-17],[247,y+2]])+trace([[105,y+1],[105,y-17],[93,y-17]])+trace([[312,y+1],[312,y-17],[325,y-17]])+
      trace([[441,y+1],[441,y-17],[430,y-17]])+trace([[495,y+1],[495,y-17],[507,y-17]]);
 }
 if(i>=j.nitride){
   for(const [a,b] of cells){
    const y0=y-26,w=b-a;
    let ww=i===j.nitride?w*e(.02,.67,u):w;
    r+=rect(a,y0,ww,6,'#80a5bf');
   }
   const al=i===j.nitride?e(.63,1,u):1;
   for(const a of [94,137,232,301,432,490])r+=rect(a,y-26,8*al,6,C.bg);
 }
 if(i>=j.electrode){
   for(const [ix,[a,b]] of [[93,114],[229,262],[436,457],[489,508]].entries()){
     const z=i===j.electrode?e(ix*.17,.48+ix*.17,u):1;
     r+=rect(a,y-38,(b-a)*z,10,'#f2c889','#ffe5b0',.6,'rx="2"');
   }
 }
 if(gate.siliconWeb)r+=rect(gaps[1][0],bottom-10,gaps[1][1]-gaps[1][0],10,C.red);
 if(gate.surfaceStringer)r+=path('M346 '+(y-33)+'q30 13 54 0','none',C.red,4);
 if(i===j.reopen||i===j.fill)r+=label(180,65,'IN-PIXEL',{anchor:'middle',size:11,color:C.gold})+label(374,65,'BETWEEN PIXELS',{anchor:'middle',size:11,color:C.gold});
 if(i===j.route)r+=label(181,61,'SERIES BRIDGE INSIDE ONE PIXEL',{anchor:'middle',size:11,color:C.gold});
 if(i===j['p-plus']||i===j['n-plus'])r+=label(73,70,i===j['n-plus']?'n⁺ REGION':'n⁺ AND p⁺ REGIONS',{color:C.mint,size:12});
 return r;
}
return E.stages.map((stage,i)=>{
 const gg=M.geometry({...specimen,route:'wang',stage:i});
 return {id:'pv-'+stage.id,name:stage.title,detail:descriptions[stage.id]||stage.fact,duration:['drie','reopen','release'].includes(stage.id)?3100:2350,
 draw:u=>panel('PV–12',shorts[stage.id])+details(gg,i,u)};
});
};
