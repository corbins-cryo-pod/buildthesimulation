/* Two SVG benches with identical plan scale and an explicit exaggerated Z diagram. */
(function(){
'use strict';
const E=globalThis.GrapheneEngine;
const colors={si:'#566e7c',pc:'#659b8e',mo:'#a98a64',carbon:'#94caba',gold:'#e2af60',ti:'#c4b4bb',cap:'#9fbdcf',silica:'#518b99',support:'#ab8671'};
const W=620,H=325;
const r=(x,n=2)=>Number(x.toFixed(n));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function txt(x,y,s,opt={}){return '<text x="'+r(x)+'" y="'+r(y)+'" fill="'+(opt.color||'#d2e7df')+'" font-family="ui-monospace, Consolas, monospace" font-size="'+(opt.size||13)+'" font-weight="'+(opt.bold?750:550)+'"'+(opt.anchor?' text-anchor="'+opt.anchor+'"':'')+'>'+esc(s)+'</text>'}
function rect(x,y,w,h,c,extra=''){return '<rect x="'+r(x)+'" y="'+r(y)+'" width="'+r(w)+'" height="'+r(h)+'" fill="'+c+'" '+extra+'/>'}
function circle(x,y,rr,c,extra=''){return '<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rr)+'" fill="'+c+'" '+extra+'/>'}
function line(x,y,x1,y1,c,extra=''){return '<path d="M'+r(x)+' '+r(y)+' L'+r(x1)+' '+r(y1)+'" stroke="'+c+'" '+extra+'/>'}
function poly(pg,c,extra=''){return '<polygon points="'+pg.map(x=>x.map(i=>r(i)).join(',')).join(' ')+'" fill="'+c+'" '+extra+'/>'}
const plate=(key,title,body,foot)=>{
  const titleId='title-'+key, pat='grid-'+key;
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+titleId+'" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><title id="'+titleId+'">'+esc(title)+'</title><defs><pattern id="'+pat+'" width="21" height="21" patternUnits="userSpaceOnUse"><path d="M21 0H0V21" fill="none" stroke="#7c9c972b" stroke-width="1"/></pattern><linearGradient id="back-'+key+'" x2="1" y2="1"><stop stop-color="#11343a"/><stop offset="1" stop-color="#10272c"/></linearGradient></defs>'+rect(0,0,W,H,'url(#back-'+key+')')+rect(0,0,W,H,'url(#'+pat+')')+
    body+rect(0,0,W,28,'#0a2327')+rect(0,H-30,W,30,'#0a2327')+
    txt(15,19,E.SAMPLE[key].id+' / '+title.toUpperCase(),{size:12,bold:true})+txt(15,H-10,foot,{size:11,color:'#afc9bf'})+'</svg>';
};
const P_X=76,P_Y=51,S=.52;
const kk=(x,y)=>[P_X+S*x,P_Y+S*y];
function measure(x,y,um){
  return line(x,y,x+um*S,y,'#c2e4d4','stroke-width="1.5"')+line(x,y-4,x,y+4,'#c2e4d4','stroke-width="1.2"')+line(x+um*S,y-4,x+um*S,y+4,'#c2e4d4','stroke-width="1.2"')+txt(x+um*S+9,y+5,um+' µm',{size:12});
}
function plan(m){
  const {key,s,d,hasCarbon,n,residue,apertureFormed,cap,backed}=m,c=key==='clear',cls=E.SAMPLE[key].id;
  const x0=P_X,y0=P_Y,x1=P_X+d.plateW*S,y1=P_Y+d.plateH*S,[xc,yc]=kk(d.siteX,d.siteY),rad=d.diameter/2*S, wr=d.routeW*S;
  const moStage=!c&&s>=1, outer=c?s>=2:s>=5;
  const [end]=kk(d.routeX2,0),[begin]=kk(d.routeX1,0),[xP]=kk(776,0);
  let g='';
  g+=rect(x0,y0,x1-x0,y1-y0,c?(s===0?colors.si:'#4a776e'):colors.silica,'rx="12" fill-opacity=".69" stroke="#b0d1c2" stroke-width="1.2"');
  g+=rect(x0+8,y0+8,x1-x0-16,y1-y0-16,'none','rx="8" stroke="#bcd9cb" stroke-opacity=".37" stroke-dasharray="4 4"');
  if(outer){
    g+=rect(end-12,yc-9,xP-end+31,18,colors.gold,'rx="3"');
    g+=rect(xP,yc-47,57,94,colors.gold,'rx="6" stroke="#edd89f" stroke-width="1.2"');
    g+=rect(xP+10,yc-39,39,78,'none','rx="2" stroke="#6f5b39" stroke-dasharray="3 3"');
  }
  if(moStage){
    const growStart=s<10?xc:begin;
    g+=rect(growStart,yc-wr/2,end-growStart,wr,colors.mo,'rx="2"');
    if(residue>0)g+=circle(xc,yc,rad,colors.mo);
    if(!m.film.moly)g+=line(begin+95,yc,begin+113,yc,'#0f3036','stroke-width="'+(wr+2)+'"');
  }
  if(hasCarbon){
    if(c&&s<7){
      for(let k=0;k<n;k++)g+=rect(x0+23+k*4,y0+20-k*2,x1-x0-54,y1-y0-40,colors.carbon,'rx="5" fill-opacity=".14" stroke="#abdfcd" stroke-opacity=".6" stroke-dasharray="7 4"');
      g+=txt(x0+28,y0+49,n+' TRANSFER'+(n===1?'':'S')+' LOGGED',{size:18,bold:true,color:'#e6f5e5'});
    }else if(c){
      g+=rect(begin,yc-wr/2,end-begin,wr,'#84b9a4','rx="3" stroke="#bcdeca" stroke-width="1"');
      for(let k=0;k<n;k++){
        let ya=yc-wr/2+(k+.5)*wr/n,grid=(end-begin)/4;
        g+=txt(begin+27,ya+2,'',{size:2})+line(begin,ya,end,ya,k%2?'#c6ead5':'#3c716b','stroke-width="'+Math.max(1,wr/n*.47)+'"');
        for(const [sheet,seg] of m.film.segDefects){if(sheet===k+1){
          g+=line(begin+grid*(seg+.45),ya,begin+grid*(seg+.55),ya,'#102a2e','stroke-width="'+Math.max(2,wr/n*.78)+'"')+
            circle(begin+(seg+.5)*grid,ya,2.2,'#f28871');
        }}
      }
    }else{
      g+=line(xc,yc-1,end,yc-1,'#a8dfcb','stroke-width="2"');
      if(!m.film.carbon)g+=line(begin+95,yc-1,begin+113,yc-1,m.film.moly?colors.mo:'#0f3036','stroke-width="'+(m.film.moly?3:8)+'"');
      if(!m.film.carbon&&!m.film.moly)g+=circle(begin+105,yc,3,'#f19c86');
    }
    g+=circle(xc,yc,rad,c&&s<7?'none':c?'#b7dbbb':'#aed6bb',c&&s<7?'stroke="#d0e9ce" stroke-width="1" stroke-dasharray="4 3"':'stroke="#cfe3c9" stroke-width=".8"');
  }
  if((c?s>=8:s>=6)){
    g+=rect(x0+14,y0+13,x1-x0-27,y1-y0-26,'#88c9b1','rx="9" fill-opacity=".13" stroke="#c1e2d3" stroke-opacity=".29"');
  }
  if(apertureFormed){
    g+=circle(xc+m.windowDx*S,yc,rad,'none','stroke="#d0eeda" stroke-width="1.1" stroke-dasharray="'+(rad>8?'4 3':'2 1')+'"');
  }
  if(cap){
    if(c)g+=circle(xc,yc,rad,colors.cap,'fill-opacity=".6" stroke="#d6e4ea" stroke-width="1.2"');
    else g+=circle(xc,yc,rad,colors.cap,'stroke="#d6e4ea" stroke-width="1.1"');
  }else if(residue){
    g+=circle(xc,yc,rad,colors.mo,'fill-opacity="'+Math.min(1,residue*.87)+'"');
  }
  const xt=148,yt=236;
  if(hasCarbon||moStage){
    g+=line(xc,yc+rad+3,xt,yt-17,'#d6eee0','stroke-width="1"')+txt(xt,yt,(c&&s<7)||!hasCarbon?'FUTURE CONTACT':'CONTACT',{color:'#d4ecd9'});
    g+=txt(xt,yt+17,d.diameter+' µm Ø'+(c?' model':''),{size:11,color:'#c3d6cd'});
  }
  if((c?s>=7:s>=1)){
    const rLab=c?'GRAPHENE INNER TRACK':'GRAPHENE / Mo INNER TRACK';
    g+=line(341,yc-8,365,125,'#a6cbbb','stroke-width="1"')+txt(332,113,hasCarbon?rLab:'Mo CATALYST',{anchor:'middle'});
  }
  if(outer)g+=txt(527,235,'Au TERMINAL',{anchor:'end',size:11,color:'#f1d68f'});
  g+=measure(88,281,100);
  const descriptor=c?(backed?'Temporary silicon carrier is still attached':s<11?'Released parylene; tail not yet fitted':'Released parylene / polyimide-backed tail'):'Retained fused silica under the whole pattern';
  return plate(key,'Plan',g,descriptor);
}
function quad(x,y,w,h,c,tile,attr=''){
  const side=73,lift=37,a=[x,y],b=[x+w,y],d=[x+side,y-lift],q=[x+w+side,y-lift];
  return poly([a,b,q,d],c,'fill-opacity="'+tile+'" stroke="#17363a" stroke-width="1.1" '+attr)+
    poly([a,[x,y+h],[x+w,y+h],b],c,'fill-opacity="'+(tile-.14)+'" stroke="#17363a" stroke-width=".9" '+attr)+
    poly([b,[x+w,y+h],[x+w+side,y-lift+h],q],c,'fill-opacity="'+(tile-.27)+'" stroke="#17363a" stroke-width=".9" '+attr);
}
function stackLayers(m){
  const c=m.key==='clear',s=m.s;
  if(c) {
    return [
      ...(m.backed?[{k:'si',v:'Temporary Si carrier',w:230,h:12}]:[]),
      ...(s>=1?[{k:'pc',v:'15 µm parylene-C base',w:224,h:8}]:[]),
      ...(s>=2?[{k:'gold',v:'Cr / Au routing',w:92,h:4}]:[]),
      ...(m.n?[{k:'carbon',v:m.n+' transferred sheet'+(m.n===1?'':'s'),w:142,h:2,n:m.n}]:[]),
      ...(m.cap?[{k:'cap',v:'Temporary SiO₂ cap',w:136,h:4}]:[]),
      ...(s>=8?[{k:'pc',v:'10 µm parylene-C cover',w:210,h:8,window:true}]:[])
    ];
  }
  return [
    ...(s===1||s>=5&&s<9?[{k:'ti',v:'Temporary backside Ti',w:230,h:4}]:[]),
    {k:'silica',v:'Retained fused silica',w:230,h:14},
    ...(s>=1?[{k:'mo',v:s>=10?'Mo retained in inner track':'Mo spans track and future contact',w:161,h:5}]:[]),
    ...(s>=3?[{k:'carbon',v:'Grown multilayer graphene',w:162,h:9,bulk:true}]:[]),
    ...(s>=5?[{k:'gold',v:'Ti / Au outer routing',w:82,h:4}]:[]),
    ...(m.cap?[{k:'cap',v:'Temporary Ti / Al cap',w:78,h:5}]:[]),
    ...(s>=6?[{k:'pc',v:'1–2 µm parylene cover',w:215,h:7,window:m.apertureFormed}]:[])
  ];
}
function section(m){
  const tags=stackLayers(m);
  const N=tags.length,start=271,delta=Math.min(36,Math.max(27,196/(N-1||1))),base=Math.max(65,start-(N-1)*delta);
  let g='', labels='';
  for(let i=0;i<N;i++){
    const l=tags[i], z=base+(N-1-i)*delta,x=l.k==='gold'?182:67;
    if(l.n){
      for(let k=0;k<l.n;k++)g+=quad(x,z+(l.n-1-k)*4,l.w,l.h,colors[l.k],.83-(l.n-1-k)*.06);
    }else{
      g+=quad(x,z,l.w,l.h,colors[l.k],l.k==='pc'?.67:.93);
      if(l.bulk)for(let j=1;j<=3;j++)g+=line(x+4,z+j*2,x+l.w-5,z+j*2,'#e3f4e49e');
      if(l.window)g+=poly([[x+41,z-10],[x+60,z-21],[x+90,z-21],[x+72,z-10]],'#17373d','stroke="#d0f2e4" stroke-width="1" stroke-dasharray="2 2"');
    }
    const tip=x+l.w+70;
    labels+=line(Math.min(tip,363),z-14,371,z-14,'#a3bbb4','stroke-width=".9"')+
      txt(381,z-10,l.v,{size:l.v.length>30?11:13,color:'#e1ece1'});
  }
  return plate(m.key,'Layer cutaway',g+labels,'Exploded Z is exaggerated. Layers, thickness and evidence remain separate.');
}
const pct=x=>Math.round(x*1000)/10+'%';
function aperture(m){
  const {key,windowDx,d,cap,hasCarbon,apertureFormed,residue}=m;
  const id='win-'+key,c0=[202,158],rad=74,dx=windowDx/(d.diameter/2)*rad,c1=[c0[0]+dx,c0[1]];
  let g='<defs><clipPath id="'+id+'">'+circle(...c1,rad,'#fff')+'</clipPath><pattern id="hatch-'+key+'" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#c8e1d9" stroke-width="1" opacity=".7"/></pattern></defs>';
  g+=circle(...c0,rad,'#37565b','fill-opacity=".62" stroke="#aedccc" stroke-width="2"');
  if(hasCarbon)g+=circle(...c0,rad,key==='clear'?'#658c77':'#546d63','fill-opacity=".8" stroke="#a9c8bc" stroke-width="1"');
  if(apertureFormed){
    if(hasCarbon){
      const fill=cap?'url(#hatch-'+key+')':residue===1?'#a38a60':key==='clear'?'#b6e5bc':'#91bba3';
      g+=circle(...c0,rad,fill,'clip-path="url(#'+id+')" fill-opacity="'+(cap||residue===1?.7:.91)+'"');
      if(!cap&&residue>0&&residue<1) {
        const theta=2*Math.PI*residue,x=c0[0]+rad*Math.cos(theta),y=c0[1]+rad*Math.sin(theta);
        g+='<path d="M'+c0[0]+' '+c0[1]+'l'+rad+' 0A'+rad+' '+rad+' 0 '+(theta>Math.PI?1:0)+' 1 '+r(x)+' '+r(y)+'Z" fill="#a58b60" fill-opacity=".9" clip-path="url(#'+id+')"/>';
      }
    }
    g+=circle(...c1,rad,'none','stroke="#e4efdb" stroke-width="1.7" stroke-dasharray="6 4"');
  }
  const label=(y,val,color)=>txt(412,y,val,{color,size:14});
  g+=line(60,158,384,158,'#8db8b1','stroke-opacity=".48" stroke-dasharray="3 3"')+
    label(80,'PHYSICAL Ø '+d.diameter+' µm','#b7dbc7')+
    label(129,'GEOMETRIC OPEN '+pct(m.geom/m.nominalA),'#e4eee0')+
    label(164,'UNCOVERED '+pct(m.clearFraction),'#bee6c7')+
    label(203,!apertureFormed?'WINDOW NOT CUT':cap?'TEMP CAP REMAINS':residue>0?'RESIDUAL Mo':'CAP CLEARED',cap||residue>0?'#e5bd8d':'#bde3d0');
  if(windowDx>0)g+=txt(398,246,'Δx '+r(windowDx,2)+' µm',{color:'#d0b794'});
  return plate(key,'Window proof',g,'Face enlarged to its own diameter. Area proof; color is not spectroscopy.');
}

function evidenceChart(key){
  const ww=600,hh=156;
  const p=(x,y,n,z={})=>txt(x,y,n,{color:'#39655b',...z});
  let plot=rect(0,0,ww,hh,'#edf0e3','rx="4"');
  if(key==='clear'){
    const xx=n=>98+143*(n-1),yy=ohm=>105-(ohm-55)*.66;
    plot+=p(14,20,'SHEET RESISTANCE · Ω/□',{bold:true,size:12})+line(70,107,554,107,'#a7b9a6')+line(70,35,70,107,'#a7b9a6');
    for(const n of [1,2,3,4])plot+=p(xx(n),126,n+' sheet'+(n===1?'':'s'),{anchor:'middle',size:11});
    for(const n of [1,2,3,4])if(n<4)plot+=line(xx(n),yy(E.interpolatedRs(n)),xx(n+1),yy(E.interpolatedRs(n+1)),'#8c653f','stroke-width="1.5" stroke-dasharray="5 4"');
    for(const n of [1,4])plot+=circle(xx(n),yy(E.interpolatedRs(n)),4.1,'#266b61')+p(xx(n)+10,yy(E.interpolatedRs(n))-4,E.interpolatedRs(n)+' Ω/□',{size:11});
    plot+=p(70,145,'Dots: reported endpoints  ·  dashed: teaching interpolation',{size:10});
    return '<svg class="witness-plot" viewBox="0 0 '+ww+' '+hh+'" role="img" aria-label="Clear sheet resistance measured at 152 ohms per square for one transfer and 76 for four transfers. Intermediate line calculated.">'+plot+'</svg>';
  }
  const xx=n=>79+(n-1000)/2000*465;
  plot+=p(14,20,'RAMAN POSITION MARKERS · cm⁻¹',{bold:true,size:12})+line(68,91,550,91,'#a7b9a6');
  for(const [tag,num] of [['D',1335],['G',1582],['2D',2660]]){
    const x=xx(num);
    plot+=line(x,49,x,91,'#496d62','stroke-width="2.1"')+circle(x,48,3.3,'#2c716a')+p(x,38,tag,{anchor:'middle',bold:true,size:13})+p(x,108,'≈'+num,{anchor:'middle',size:11});
  }
  plot+=p(65,140,'Peak positions only. Heights, widths and raw spectra not fabricated.',{size:10});
  return '<svg class="witness-plot" viewBox="0 0 '+ww+' '+hh+'" role="img" aria-label="Reported Delft Raman peak positions: D near 1335, G near 1582, and 2D near 2660 inverse centimetres. Peak heights not modeled.">'+plot+'</svg>';
}
globalThis.GrapheneVisual={render:(m,mode)=>mode==='section'?section(m):mode==='aperture'?aperture(m):plan(m),stackLayers,evidenceChart};
})();
