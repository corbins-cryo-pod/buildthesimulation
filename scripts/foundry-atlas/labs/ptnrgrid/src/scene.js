/* Format-stable canvas plates; no assets or WebGL required. */
((global)=>{
'use strict';
const W=1050,H=620,C={ink:'#152a26',p:'#d6e0ca',muted:'#99b3a2',rule:'#345349',gold:'#e1bc79',amber:'#d2a761',green:'#8bc6a8',cut:'#ef967f',blue:'#8cbac9',violet:'#b9abdf',ivory:'#ede3b9',glass:'#5a8d80',paper:'#182e28'};
const map={x:150,y:91,w:750,h:446}; // overwritten for the published aspect as needed
const palette={panel:[['#669789','Glass outline'],['#b8d297','150 mm field reference'],['#e1bc79','Teaching specimen']],stack:[['#679d90','Carrier'],['#d5a960','Parylene'],['#edd494','Cr / Au'],['#a6b9c3','Ti mask / cap'],['#d9e8da','Pt-rich sites']],route:[['#e1bc79','Cr/Au A'],['#83c9af','Cr/Au B'],['#ef967f','Disconnected segment'],['#bdc4eb','Direct overlap junction']],grid:[['#8bc6a8','Mapped / wet-ready'],['#ef967f','Dry net error'],['#ede3b9','Window blocked'],['#b9abdf','Incomplete dealloy'],['#d2a761','Uninspected / preview']],connect:[['#e4bd79','Film pad'],['#8bc6a8','Extender / reader'],['#ef967f','Missing or misdirected']],mold:[['#d2a761','Film section'],['#609080','Inert mold'],['#8cbac9','Fluid / air gap witness']]};
let ctx,hit;
function text(x,y,s,opts={}){ctx.save();ctx.textAlign=opts.align||'left';ctx.textBaseline=opts.baseline||'alphabetic';ctx.fillStyle=opts.color||C.p;ctx.font=(opts.weight||500)+' '+(opts.size||20)+'px ui-monospace, SFMono-Regular, Consolas, monospace';ctx.fillText(s,x,y,opts.max||1000);ctx.restore()}
function line(points,stroke,w=2,dash=[]){ctx.save();ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(x=>ctx.lineTo(...x));ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.stroke();ctx.restore()}
function poly(points,fill,stroke,w=2){ctx.save();ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(x=>ctx.lineTo(...x));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}ctx.restore()}
function rect(x,y,w,h,f,s,l=2,dash=[]){ctx.save();if(f){ctx.fillStyle=f;ctx.fillRect(x,y,w,h)}if(s){ctx.strokeStyle=s;ctx.lineWidth=l;ctx.setLineDash(dash);ctx.strokeRect(x,y,w,h)}ctx.restore()}
function circle(x,y,r,f,s,l=2){ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.strokeStyle=s;ctx.lineWidth=l;ctx.stroke()}ctx.restore()}
function cross(x,y,r,color=C.cut){line([[x-r,y-r],[x+r,y+r]],color,3);line([[x+r,y-r],[x-r,y+r]],color,3)}
function tag(x,y,n,t){text(x,y,n,{color:C.gold,size:19});text(x,y+30,t,{size:23,max:920})}
function base(name){rect(0,0,W,H,C.ink);for(let x=30;x<W;x+=24)line([[x,23],[x,H-24]],C.rule,.42);for(let y=24;y<H;y+=24)line([[29,y],[W-30,y]],C.rule,.42);rect(26,22,W-52,H-44,null,C.rule);line([[26,53],[26,22],[58,22]],C.muted,2);line([[W-27,H-55],[W-27,H-23],[W-59,H-23]],C.muted,2);text(52,58,name,{color:C.gold,size:20});hit=null}
function dim(x1,y1,x2,y2,s){line([[x1,y1],[x2,y2]],C.muted,1.5);line([[x1,y1-7],[x1,y1+7]],C.muted,1.5);line([[x2,y2-7],[x2,y2+7]],C.muted,1.5);text((x1+x2)/2,y1-10,s,{align:'center',color:C.p,size:20})}
function panel(m){
 base('FIG 01  /  CARRIER AND WRITING FIELD');
 const x=85,y=106,s=431,r=150/177.8,fx=x+s*(1-r)/2,fy=y+s*(1-r)/2;
 rect(x,y,s,s,'#24483d','#6f9f91',3);
 rect(fx,fy,s*r,s*r,'#283f34','#b8d297',3,[10,8]);
 const factor=s/177.8,w=Math.min(80,m.cfg.width)*factor,h=Math.max(14,m.cfg.height)*factor;
 const tx=x+79,ty=y+107,tail=Math.min(175,h+49);
 rect(tx,ty,w,h,m.stage>=2?'#6c5a34':'#334533',C.gold,2,[m.stage>=2?0:6,4]);
 const polyW=Math.max(45,w*.64),cx=tx+w/2;
 poly([[cx-polyW/2,ty+h],[cx+polyW/2,ty+h],[cx+38,ty+h+tail*.4],[cx-38,ty+h+tail*.4]],m.stage>=4?'#725e37':'#344638',C.amber);
 if(m.hasA){for(let i=1;i<=6;i++){line([[cx-26+i*7,ty+h*.85],[cx-16+i*5,ty+h+tail*.37]],C.gold,1.5)}}
 dim(x,y-15,x+s,y-15,'177.8 mm');
 tag(561,144,'CARRIER','7″ × 7″ × 0.06″');
 text(561,207,'177.8 × 177.8 × 1.524 mm',{size:20});
 tag(561,272,'VIRTUAL REGISTER','150 × 150 mm write field');
 text(561,332,'Panel outline ≠ written extent.',{size:18,max:400});text(561,360,'Square chuck support unverified.',{size:18,max:412});
 tag(561,430,'SPECIMEN','Illustrative placement only');
 text(561,486,'No recovered panel nesting plan.',{size:18,max:407});
 text(660,563,m.hasRelease?'FILM RELEASED':'ON TEMPORARY GLASS',{size:19,color:m.hasRelease?C.green:C.muted});
}
function plate(z,fill,stroke,hasHole=false){
 const x=120,y=390-z;
 poly([[x,y],[x+451,y],[x+546,y-67],[x+95,y-67]],fill,stroke,2);
 poly([[x,y],[x+451,y],[x+451,y+13],[x,y+13]],fill,stroke,1.8);
 poly([[x+451,y],[x+546,y-67],[x+546,y-54],[x+451,y+13]],fill,stroke,1.8);
 if(hasHole)for(let i=0;i<3;i++){ctx.save();ctx.beginPath();ctx.ellipse(x+223+i*59,y-36,14,8,0,0,2*Math.PI);ctx.fillStyle=C.ink;ctx.fill();ctx.strokeStyle=C.ivory;ctx.stroke();ctx.restore()}
}
function stack(m){
 base('FIG 02  /  EXPLODED FILM AND CONTACT');
 if(m.hasRelease){ctx.save();ctx.globalAlpha=.27;plate(-32,'#203d35',C.glass);ctx.restore();text(116,465,'GLASS REMOVED',{color:C.muted,size:19})}else plate(-31,'#2d6054',C.glass);
 if(m.stage>=1)plate(-11,'#37675b','#83a18f');
 if(m.stage>=2)plate(18,'#79582d','#ceab69');
 if(m.hasA){for(let i=0;i<6;i++)line([[200,348-i*3],[536,348-i*3],[593,311-i*3]],C.gold,3)}
 if(m.hasB){for(let i=0;i<6;i++)line([[200,335-i*3],[536,335-i*3],[593,298-i*3]],'#c5edbc',2)}
 if(m.hasSite){for(let i=0;i<5;i++){ctx.save();ctx.beginPath();ctx.ellipse(343+i*43,299-i*3,12,7,0,0,2*Math.PI);ctx.fillStyle=m.hasNR?'#c4d8cb':m.capStripped?'#b9a784':'#8cb1c5';ctx.fill();ctx.restore()}}
 if(m.stage>=9){ctx.save();ctx.globalAlpha=.72;plate(120,'#b48a48','#dfbd7c',m.hasVia);ctx.restore()}
 if(m.stage>=10&&!m.capStripped){ctx.save();ctx.globalAlpha=.56;plate(146,'#6e8794','#c9d7da');ctx.restore()}
 text(705,132,'UPPER FILM',{size:18,color:C.gold});text(705,167,'3.1 µm parylene C',{size:19,max:270});
 text(705,225,'CONTACT',{size:18,color:C.gold});text(705,259,!m.hasSite?'Not formed':m.hasNR?'Pt-rich surface':m.capStripped?'Pt–Ag alloy':'Ti-capped Pt–Ag',{size:19,max:280});
 text(705,318,'LOWER FILM',{size:18,color:C.gold});text(705,353,(m.thick==='main'?'3.5':'3.7')+' µm parylene C',{size:19,max:270});
 text(705,410,'TWO METAL DEPOSITS',{size:18,color:C.gold,max:270});text(705,445,'250 nm Au each',{size:19,max:260});
 text(51,529,'Exploded section · thickness exaggerated',{color:C.muted,size:20});text(51,562,m.thick==='main'?'Main text: nominal 6.6 µm finished film':'Supplement: 6.8 µm sum of deposited film values',{color:C.gold,size:18,max:946});
}
function route(m,row){
 base('FIG 03  /  REGISTERED TRACE WITNESS');
 const xs=[188,407,626,846],ya=229,yb=368;
 text(60,133,row.id+'    '+(row.routingClosed?'ROUTE CONTINUOUS':m.hasA?'ROUTE OPEN':'PREVIEW / NOT DEPOSITED'),{color:row.routingClosed?C.green:C.p,size:23});text(991,133,'Overlap '+m.overlap.toFixed(2)+' µm',{align:'right',size:20});
 text(68,236,'A',{color:C.gold,size:25,weight:700});text(68,376,'B',{color:C.green,size:25,weight:700});text(947,235,'PAD',{size:18});text(97,203,'SITE SIDE',{size:15});
 for(let i=0;i<3;i++){
  for(const [ar,y,col,has] of [[row.A,ya,C.gold,m.hasA],[row.B,yb,C.green,m.hasB]]){const [x1,x2]=[xs[i],xs[i+1]],mid=(x1+x2)/2;if(ar[i])line([[x1,y],[x2,y]],col,7);else if(has){line([[x1,y],[mid-18,y]],col,6);line([[mid+18,y],[x2,y]],col,6);cross(mid,y,10)}else line([[x1,y],[x2,y]],C.muted,2,[7,7])}
 }
 for(let i=0;i<4;i++){const x=xs[i];line([[x,ya],[x,yb]],m.touch?C.violet:C.muted,m.touch?4:1.1,m.touch?[]:[4,7]);circle(x,ya,9,m.hasA?C.gold:C.paper,C.gold);circle(x,yb,9,m.hasB?C.green:C.paper,C.green);text(x,412,'J'+i,{align:'center',color:C.muted,size:18})}
 text(61,501,'Same intended route, two deposits. No crossover layer.',{size:21,max:920});
 text(61,536,m.touch?'Direct-contact junctions active in the teaching graph.':'No direct-contact junctions yet. Pass B cannot rescue A.',{color:m.touch?C.green:C.ivory,size:18,max:920});
}
function stateColor(m,r){if(m.hasDry&&(r.dry==='Open'||r.dry==='Mis-mapped'||r.dry==='Short / cross-net'))return C.cut;if(m.hasWet&&r.wet==='Blocked')return C.ivory;if(m.hasWet&&r.wet==='Incomplete dealloy')return C.violet;if(m.hasDry&&r.dry==='Mapped')return C.green;return C.amber}
function grid(m,row){
 base('FIG 04  /  SITE INDEX AND INSPECTION');
 const c=m.cfg, ratio=c.id==='wide'?1:c.width/c.height;let w=Math.min(733,470*ratio),h=Math.min(470,w/ratio);
 if(c.id==='narrow'){w=Math.max(105,w);h=476}
 const x=301+(645-w)/2,y=87+(478-h)/2,dx=w/c.cols,dy=h/c.rows;
 rect(x,y,w,h,'#193c34','#7f9d86',2);
 if(c.holes&&m.hasVia&&c.id==='square'){
  for(let r=1;r<32;r++)for(let n=1;n<32;n++)circle(x+n*dx,y+r*dy,Math.min(dx,dy)*.118,'#151d1b','#547263',.65);
 }
 let rr=Math.max(1.2,Math.min(dx,dy)*.22);m.res.forEach(el=>{let px=x+(el.col+.5)*dx,py=y+(el.row+.5)*dy;circle(px,py,rr,m.hasSite?stateColor(m,el):'#637a63',null);if(m.hasDry&&el.dry!=='Mapped')cross(px,py,rr*.85);});
 const xx=x+(row.col+.5)*dx,yy=y+(row.row+.5)*dy;
 circle(xx,yy,Math.min(dx,dy)*.49+4,null,C.ivory,3);
 line([[xx-10,yy],[xx+10,yy]],C.ivory,1);line([[xx,yy-10],[xx,yy+10]],C.ivory,1);
 hit={x,y,w,h,cells:[c.cols,c.rows],n:m.n};text(53,141,c.id==='wide'?'LOGICAL MAP':'CENTER MAP',{size:20,color:C.gold});
 text(53,190,m.n.toLocaleString('en-US')+' sites',{size:27,max:220});
 text(53,240,c.pitch+' mm reported pitch',{size:18,max:237});
 text(53,276,c.width+' × '+c.height+' mm coverage',{size:18,max:237});
 text(53,345,'SELECTED',{size:17,color:C.gold});text(53,383,row.id,{size:25});
 text(53,420,m.hasDry?row.dry:(m.hasSite?'Artwork-to-site preview':'Design preview'),{size:18,max:230});
 text(53,502,c.id==='wide'?'Not a physical layout':c.id==='square'?'Centered 32 × 32 reconstruction':'Assumed lattice; not exported',{size:16,max:242,color:C.muted});
 text(52,573,'Markers and hole positions are not drawn to their micrometer scales.',{size:17,max:951,color:C.muted});
}
function connect(m,row){
 base('FIG 05  /  FILM  →  EXTENDER  →  LOGICAL OUTPUT');
 const p=[75,405,727],head=['FILM PAD','EPOXY / EXTENDER','READOUT'];
 p.forEach((x,i)=>{rect(x,153,233,314,'#213e35','#789485',2);text(x+17,191,head[i],{color:C.gold,size:20,max:195})});
 for(let i=0;i<6;i++){for(let j=0;j<3;j++)rect(p[j]+25,227+i*29,170,15,j===0?'#977941':j===1?'#53785f':'#426157',C.muted,1);}
 const breakout=row.wetWindow||m.hasEpoxy;
 line([[p[0]+233,277],[p[1],277]],row.extender?C.green:C.cut,4,row.extender?[]:[7,7]);
 line([[p[1]+233,277],[p[2],277]],row.outputIds.length?C.green:C.cut,4,row.outputIds.length?[]:[7,7]);
 text(p[0]+17,423,row.id+' virtual',{size:18,max:196});
 text(p[1]+17,423,m.hasEpoxy?(row.extender?'Continuity':'Not continuous'):'Not bonded',{size:18,max:196});
 text(p[2]+17,423,m.hasSocket?(row.outputIds.join(', ')||'No route'):'Not mated',{size:18,max:196});
 text(54,524,'16 / 32 synthetic 64-site groups; exact LGA pad order not released.',{size:18,max:939,color:C.muted});
 text(54,559,'One clean measurement does not verify continuity, isolation and mapping.',{size:18,max:939});
}
function mold(m,holes){
 base('FIG 06  /  PASSIVE WET-MOLD WITNESS');
 const relief=holes==='perforated'&&m.cfg.holes!==null;
 const y=(x)=>375-Math.sin((x-125)/825*Math.PI)*131;
 const sub=[];for(let x=125;x<=950;x+=5)sub.push([x,y(x)]);poly([...sub,[950,480],[125,480]],'#3d6c59','#83ad91',3);
 const f=(x,wrap)=>y(x)-(wrap?5:12+36*Math.exp(-Math.pow((x-345)/86,2))+27*Math.exp(-Math.pow((x-727)/76,2)));
 if(!relief){const q1=[],q2=[];for(let x=214;x<=847;x+=5){q1.push([x,f(x,false)]);q2.unshift([x,y(x)])}poly([...q1,...q2],'#426d7d','#8cbdca',1);}
 const spans=relief?[[130,315],[337,526],[550,730],[753,945]]:[[130,945]];
 spans.forEach(([l,r])=>{const a=[];for(let x=l;x<=r;x+=4)a.push([x,f(x,relief)]);line(a,C.gold,6,m.hasRelease?[]:[10,6])});
 text(54,120,relief?'PERFORATED WITNESS':'UNPERFORATED WITNESS',{size:30,color:C.gold});
 text(54,154,relief?'Symbolic relief openings and closer contact.':'Symbolic fluid or air pocket under the film.',{size:19,max:947});
 text(54,535,'Qualitative comparison only; this does not solve fluid flow or film deformation.',{size:16,max:942,color:C.muted});
 text(54,568,'The source compares similar films on a soft wet inert mold (Supplement Fig. S3).',{size:16,max:942});
}
const views={panel,stack,route,grid,connect,mold};
function paint(canvas,view,m,row,holes){ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is not available.');if(view==='route'||view==='grid'||view==='connect')views[view](m,row);else if(view==='mold')mold(m,holes);else views[view](m);return palette[view]}
function indexAt(canvas,x,y){if(!hit)return null;const b=canvas.getBoundingClientRect();const u=(x-b.left)/b.width*W,v=(y-b.top)/b.height*H,{x:mx,y:my,w,h,cells,n}=hit;if(u<mx||u>=mx+w||v<my||v>=my+h)return null;const idx=Math.floor((v-my)/h*cells[1])*cells[0]+Math.floor((u-mx)/w*cells[0]);return idx<n?idx:null}
global.PtScene={paint,indexAt};
})(globalThis);
