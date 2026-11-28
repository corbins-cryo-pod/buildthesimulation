(()=>{'use strict';
const E=UtahBench,$=s=>document.getElementById(s),ns='http://www.w3.org/2000/svg',f=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Math.abs(n)<1e-9?0:n);
const scale=(v,l,h,outL,outH)=>outL+(v-l)*(outH-outL)/(h-l),clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const ds=(tag,t='',attrs={})=>{const e=document.createElement(tag);if(t!=='')e.textContent=t;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
const se=(g,tag,attrs,t)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(t!==undefined)n.textContent=t;g.append(n);return n;};
const line=(g,x1,y1,x2,y2,stroke,extra={})=>se(g,'line',{x1,y1,x2,y2,stroke,...extra});
const rect=(g,x,y,width,height,fill,extra={})=>se(g,'rect',{x,y,width:Math.max(0,width),height:Math.max(0,height),fill,...extra});
const tx=(g,x,y,s,fill='#e2e6d1',size=11,a={})=>se(g,'text',{x,y,fill,'font-size':size,'font-family':'ui-monospace,monospace',...a},s);
const poly=(g,points,fill,extra={})=>se(g,'polygon',{points:points.map(a=>a.join(',')).join(' '),fill,...extra});
const workflow=[
 {key:'blank',short:'Silicon',title:'Start with a silicon section',basis:'01 / MODEL START',body:'Start with the selected neighbor boundary before either face is cut. The taller Slant tip envelope is a separate geometry comparison.'},
 {key:'groove',short:'Rear groove',title:'Open the rear groove',basis:'02 / HISTORICAL FIG. 6',body:'The historical route creates the grid from the rear face first. This slice shows only one open groove, not the whole grid or a tool path.'},
 {key:'glass',short:'Glass fill',title:'Fill the rear groove with glass',basis:'03 / HISTORICAL FIG. 7',body:'The drawn glass occupies the rear groove. The front-to-rear meeting has not happened yet; silicon still spans the upper region in this slice.'},
 {key:'front',short:'Front cut',title:'Bring the opposing cut down',basis:'04 / HISTORICAL FIGS. 8–9',body:'The front opening creates a separate plane. The draw uses the selected cut’s midpoint, not a blade profile or an etch-shaped shank.'},
 {key:'geometry',short:'Inspect cuts',title:'Check overlap and retained glass',basis:'05 / VIRTUAL GEOMETRY',body:'Compare lateral overlap and worst along-edge depth. A missed join, a zero-margin contact and a breach remain different observations.'},
 {key:'continuity',short:'Continuity',title:'Trace virtual output identity',basis:'06 / SYNTHETIC BENCH',body:'Touching or removing glass does not by itself create a modeled conductor. The existing Boolean fixture counts only the geometry assumptions and faults selected below.'}
];
const reducedWorkflow=matchMedia('(prefers-reduced-motion: reduce)'), WORKFLOW_DWELL=1850;
let workflowStage=0,workflowState='ready',workflowTimer,workflowMotion;
const Wdrop=()=>{clearTimeout(workflowTimer);workflowTimer=undefined;workflowMotion?.cancel();};
function workflowAnnounce(s){$('workflow-live').textContent=s;}
function workflowStop(notify=false){
 if(workflowState!=='playing')return;
 Wdrop();workflowState='paused';renderWorkflow();
 if(notify)workflowAnnounce('Workflow paused at step '+(workflowStage+1)+'.');
}
function workflowReplay(){
 if(workflowState==='playing'){workflowStop(true);return;}
 if(!q||q.error)return;
 if(workflowState!=='paused'||workflowStage===workflow.length-1)workflowStage=0;
 workflowState='playing';workflowShow(workflowStage,true);
 if($('workflow-plate').getBoundingClientRect().bottom>innerHeight)$('workflow-player').scrollIntoView({block:'start',behavior:'auto'});
 workflowQueue();
}
function workflowQueue(){
 clearTimeout(workflowTimer);
 workflowTimer=setTimeout(()=>{
  workflowTimer=undefined;
  if(workflowState!=='playing')return;
  const next=workflowStage+1;
  if(next>=workflow.length-1)workflowState='complete';
  workflowShow(next,true);
  if(workflowState==='playing')workflowQueue();
 },WORKFLOW_DWELL);
}
function workflowShow(i,motion=false){
 workflowStage=clamp(i,0,workflow.length-1);
 if(workflowStage===workflow.length-1&&!q?.error&&!q?.outOfEnvelope)test();
 renderWorkflow();
 workflowAnnounce('Step '+(workflowStage+1)+', '+workflow[workflowStage].title+(workflowState==='complete'?'. Workflow complete.':'.'));
 workflowMotion?.cancel();
 const art=$('workflow-plate');
 if(motion&&!reducedWorkflow.matches&&art.animate)workflowMotion=art.animate([{opacity:.45},{opacity:1}],{duration:320,easing:'ease-out'});
}
function renderWorkflow(){
 const a=workflow[workflowStage],e=sectionEdge,step=workflowStage,valid=!!(q&&!q.error&&e);
 $('workflow-player').dataset.state=workflowState;
 $('workflow-play').textContent={ready:'Play workflow',playing:'Pause workflow',paused:'Resume workflow',complete:'Replay workflow'}[workflowState];
 $('workflow-play').disabled=!valid;
 $('workflow-state').textContent={ready:'Ready',playing:'Playing',paused:'Paused',complete:'Complete'}[workflowState];
 $('workflow-position').textContent=(step+1)+' / '+workflow.length;
 $('workflow-progress').max=workflow.length;$('workflow-progress').value=step+1;
 for(const b of $('workflow-steps').querySelectorAll('button')){
  b.disabled=!valid;
  if(Number(b.dataset.workflowStep)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
 }
 $('workflow-basis').textContent=a.basis;$('workflow-title').textContent=a.title;$('workflow-description').textContent=a.body;
 const g=$('workflow-plate').querySelector('g'),read=$('workflow-readout');g.replaceChildren();read.dataset.warning='false';
 if(!valid){read.textContent='A valid fixture configuration is required. Edit the existing inputs below.';read.dataset.warning='true';$('workflow-plate-desc').textContent=read.textContent;return;}
 const o=q.o,range=Math.max(200,Math.abs(e.frontCenter-e.backCenter)+o.frontKerf/2+20,o.rearKerf/2+20),origin=e.backCenter;
 const top=Math.max(o.glassDepth+78,e.floorMax+61,340),bottom=Math.min(-26,e.floorMin-9),X=x=>scale(x-origin,-range,range,32,478),Y=z=>scale(z,bottom,top,176,42);
 const yf=Y(0),yr=Y(o.glassDepth),yt=Y(top),bLo=X(e.backLo),bHi=X(e.backHi),fLo=X(e.frontLo),fHi=X(e.frontHi);
 rect(g,0,0,510,219,pal.bg);
 tx(g,31,22,'FRONT',pal.soft,12);tx(g,476,22,e.aName+'  ↔  '+e.bName,pal.gold,12,{'text-anchor':'end'});
 rect(g,32,yt,446,yf-yt,'#748176',{stroke:'#a4b19f','stroke-width':1,'data-layer':'silicon'});
 if(step>=1)rect(g,bLo,yr,bHi-bLo,yf-yr,step<2?'#243a30':'#79b6a3',{stroke:pal.mint,'stroke-width':1.1,'data-layer':step<2?'empty-rear-groove':'glass'});
 if(step>=3){
  const cut=Y(e.floorAtCenter);
  rect(g,fLo,yt-.6,fHi-fLo,Math.min(yf,cut)-yt+.6,pal.bg,{stroke:pal.gold,'stroke-width':1.15,'data-layer':'front-cut'});
  if(Math.abs(e.floorMax-e.floorMin)>1e-7)
   for(const h of [e.floorMin,e.floorMax])line(g,fLo,Y(h),fHi,Y(h),pal.gold,{'stroke-dasharray':'3 3','stroke-width':.7});
 }
 line(g,29,yf,481,yf,'#c3d3c0',{'stroke-width':1,'stroke-dasharray':'4 3'});
 if(step>=4){
  const xx1=Math.max(bLo,fLo),xx2=Math.min(bHi,fHi);
  if(xx2>xx1){const yy=Math.min(197,yf+13);line(g,xx1,yy,xx2,yy,pal.gold,{'stroke-width':1.8,'data-layer':'registered-span'});}
  if(e.siliconCandidate){
   const yrisk=Y(Math.max(0,Math.min(top,(o.glassDepth+e.floorAtCenter)/2)));
   if(e.lateralClearance<0){const start=e.frontCenter>e.backCenter?bHi:fHi,end=e.frontCenter>e.backCenter?fLo:bLo;line(g,start,yrisk,end,yrisk,pal.rust,{'stroke-width':4,'data-layer':'web-marker'});}
   else if(xx2>xx1)line(g,xx1,yrisk,xx2,yrisk,pal.rust,{'stroke-width':4,'data-layer':'web-marker'});
  }else if(e.breach&&xx2>xx1)line(g,xx1,yf,xx2,yf,pal.rust,{'stroke-width':3.6,'data-layer':'breach-marker'});
 }
 tx(g,32,203,'REAR · DATUM',pal.soft,12);
 tx(g,477,203,step===0?'INTACT SECTION':step===1?'OPEN REAR GROOVE':step===2?'GLASS IN REAR GROOVE':step===3?'OPPOSING FRONT OPENING':step===4?'MODEL OVERLAP WITNESS':'INERT NETWORK CHECK',pal.mint,11,{'text-anchor':'end'});
 let label=['One selected boundary in a symbolic silicon block.','Open at the rear face; no front cut or glass yet.','Glass witness present; the front is still uncut.','Front opening shown at the current boundary midpoint.'][step];
 if(step===4){label='Lateral overlap '+f(e.lateralClearance)+' µm · depth margin '+f(e.depthMargin)+' µm · retained cap '+f(e.capMin)+' µm.';read.dataset.warning=String(e.siliconCandidate||e.tangent||e.breach);}
 if(step===5){
  if(q.outOfEnvelope||!t||t.error){label=q.outOfEnvelope?'Network withheld outside the nearest-neighbor model.':t?.error||'No current fixture result. Run the continuity check again after editing.';read.dataset.warning='true';}
  else{label=t.isolated+' isolated · '+t.open+' open · '+t.ambiguous+' ambiguous outputs. '+t.parked+' parked corner roots.';read.dataset.warning=String(t.open+t.ambiguous>0);}
 }
 read.textContent=label;$('workflow-plate-desc').textContent=a.title+'. '+label+' Boundary: '+e.aName+' to '+e.bName+'.';
}

const major=['frontKerf','rearKerf','glassDepth','toe','pitchX','pitchY','offsetX','offsetY','slope'];
let q=null,t=null,first=true,sectionEdge=null;
const field=n=>$(n).value.trim()===''?NaN:Number($(n).value);
const selectCount=(s,n,label,v=0)=>{s.replaceChildren(...Array.from({length:n},(_,i)=>ds('option',label+(i+1),{value:i})));s.value=String(clamp(v,0,n-1));};
const pal={mint:'#a6d4be',gold:'#e4be72',amber:'#f1bf8a',rust:'#f0a087',bg:'#20362d',soft:'#ccd8c7',stroke:'#7d9b88'};
if(location.protocol==='file:')document.querySelectorAll('a[href^="/"]').forEach(a=>a.href='https://buildthesimulation.com'+a.getAttribute('href'));
function read(){
 const o={range:$('range').value,grade:$('grade').value,uniform:Number($('uniform').value),measured:$('measured').value,slopeAxis:$('slopeAxis').value};
 for(const k of major)o[k]=field(k);
 return Object.assign(o, readFault());
}
function readFault(){return {accountWeb:$('accountWeb').checked,open:$('open').checked,bridge:$('bridge').checked,faultRow:Number($('edgeRow').value),faultCol:Number($('edgeCol').value),bridgeAxis:$('edgeAxis').value};}
function edgeChoices(row=Number($('edgeRow').value),col=Number($('edgeCol').value)){
 const a=$('edgeAxis').value;selectCount($('edgeRow'),a==='y'?9:10,'Row ',row);selectCount($('edgeCol'),a==='x'?9:10,'Column ',col);
}
function fixturePreset(name){
 const ex=E.examples[name];if(!ex)return;
 const o={...E.base,...ex.options};
 for(const k of major)$(k).value=o[k];
 $('slopeAxis').value=o.slopeAxis;$('open').checked=o.open;$('bridge').checked=o.bridge;$('accountWeb').checked=o.accountWeb;
 $('edgeAxis').value=o.bridgeAxis;let r=o.faultRow,c=o.faultCol;
 if(name==='shift'){r=4;c=8;}
 if(name==='cap'){r=4;c=0;}
 edgeChoices(r,c);$('reg').open=['shift','cap'].includes(name);render(true);
 for(const b of document.querySelectorAll('[data-example]'))b.setAttribute('aria-pressed',String(b.dataset.example===name));
}
function unpress(){for(const b of document.querySelectorAll('[data-example]'))b.setAttribute('aria-pressed','false');}
function plotAx(kind){
 const g=$(kind+'Fig').querySelector('g');g.replaceChildren();if(!q||q.error)return;
 const slant=kind==='slant',sc=Number($('rotation').value);
 function xyz(x,y,z=0){const [u,v]=E.isoXY(x,y,sc);return[210+.0406*(u+v),177+.0148*(u-v)-.050*z];}
 const v=[[-2000,-2000],[2000,-2000],[2000,2000],[-2000,2000]];
 const lower=v.map(([x,y])=>xyz(x,y,-145)),upper=v.map(([x,y])=>xyz(x,y));
 poly(g,lower,'#50665a',{stroke:'#5f7a66','stroke-width':1});
 // Screen-facing base walls, sorted from the far face to the viewer.
 const walls=v.map((_,i)=>({i,j:(i+1)%4,y:(upper[i][1]+upper[(i+1)%4][1])/2})).sort((a,b)=>a.y-b.y);
 for(const w of walls.slice(-2))poly(g,[lower[w.i],lower[w.j],upper[w.j],upper[w.i]],'#738678',{stroke:'#99ad97','stroke-width':.8});
 poly(g,upper,'#7b8c72',{stroke:'#a1b69c','stroke-width':1});
 for(let i=1;i<10;i++){let a=E.rail(i);line(g,...xyz(a,-2000),...xyz(a,2000),'#b7bba2',{'stroke-width':.58,opacity:.6});line(g,...xyz(-2000,a),...xyz(2000,a),'#b7bba2',{'stroke-width':.58,opacity:.6});}
 const pos=q.nodes.map(n=>({...n,d:xyz(n.x,n.y)[1]})).sort((a,b)=>a.d-b.d||a.row-b.row);
 for(const n of pos){
  const h=slant?n.h:n.u,cxy=xyz(n.x,n.y),pt=xyz(n.x,n.y,h),top=xyz(n.x,n.y,h*.28),baseW=3.5,w=1.9;
  const color=slant?h>q.g.min+.65*q.g.spread?'#ecce89':h<q.g.min+.31*q.g.spread?'#b3d7b1':'#d3d4a0':'#d9dcc1';
  poly(g,[[cxy[0]-baseW,cxy[1]+1],[top[0]-w,top[1]],[pt[0],pt[1]],[top[0]+w,top[1]],[cxy[0]+baseW,cxy[1]+1]],color,{stroke:'#293d33','stroke-width':.65});
  line(g,pt[0],pt[1]+3,cxy[0],cxy[1],'#f5ebc9',{'stroke-width':.45,opacity:.65});
 }
 if(slant){
  const coords=[];
  for(let i=0;i<10;i++){
   const j=q.g.reverse?9-i:i;const x=q.g.axis==='x'?E.coord(j):E.coord(5),y=q.g.axis==='x'?E.coord(5):E.coord(j);
   coords.push(xyz(x,y,q.g.heights[i]));
  }
  se(g,'polyline',{points:coords.map(a=>a.join(',')).join(' '),fill:'none',stroke:'#f3cf83','stroke-width':1.55,'stroke-dasharray':'4 3'});
  for(const [x,y] of [coords[0],coords.at(-1)])se(g,'circle',{cx:x,cy:y,r:3.3,fill:'#ffd889',stroke:'#36392c'});
 }
 const mark=xyz(-1935,1935);se(g,'circle',{cx:mark[0],cy:mark[1],r:6,fill:'#20352c',stroke:'#e1cb8c'});tx(g,mark[0],mark[1]+3,'A',pal.gold,8,{'text-anchor':'middle'});
 tx(g,17,251,'COMMON SCALE · AXES FIXED TO COUPON',pal.soft,9);
 tx(g,401,251,'FIXTURE SKETCH',pal.soft,9,{'text-anchor':'end'});
}
function facts(){
 const node=$('facts');node.replaceChildren();$('rowBand').replaceChildren();
 for(const [x,l] of [['400 µm','Nominal center pitch'],['3,600 µm','Center span, not 4 mm outline'],[f(q.g.spread)+' µm','Slant tip-height spread'],[f(q.g.angle)+'°','Endpoint-to-endpoint profile angle']]){
  const d=ds('div');d.append(ds('strong',x),ds('span',l));node.append(d);
 }
 q.g.heights.forEach((h,i)=>{const d=ds('div',f(h));d.append(ds('span','Row '+(i+1)+' · µm'));$('rowBand').append(d);});
 $('leftSub').textContent=(q.o.uniform/1000).toFixed(2)+' mm equal shanks';
 $('rightSub').textContent=(q.g.min/1000).toFixed(2)+'–'+(q.g.max/1000).toFixed(2)+' mm · '+(q.g.kind==='entered'?'entered':'interpolated');
 const order=q.g.monotone==='nonmonotone'?' The entered height list reverses direction between some rows; the angle only joins its endpoints.':q.g.monotone==='decreasing'?' The height decreases in the selected direction.':'';
 $('rangeNote').textContent=q.g.scope+order;
}
function elevation(){
 const g=$('elevation').querySelector('g');g.replaceChildren();
 if(!q||q.error)return;
 const dist=.081,origin=71,base=188,x=i=>origin+i*E.P*dist,y=h=>base-h*dist;
 const olive='#335d53',orange='#875521',axis='#827e69',ink='#354439',grid='#d4cdb8';
 for(let m=0;m<=2000;m+=500){
  const yy=y(m);line(g,origin,yy,x(9),yy,grid,{'stroke-width':.8,'stroke-dasharray':m===0?'none':'3 2'});
  tx(g,origin-9,yy+3,m===0?'0':f(m),ink,10,{'text-anchor':'end'});
 }
 for(let i=0;i<10;i++)line(g,x(i),base-3,x(i),base+4,axis,{'stroke-width':1});
 line(g,origin,base,x(9),base,axis,{'stroke-width':1.05});line(g,origin,y(2000),origin,base,axis,{'stroke-width':1.05});
 tx(g,20,29,'µm',ink,10);
 line(g,origin,y(q.o.uniform),x(9),y(q.o.uniform),olive,{'stroke-width':2,'stroke-dasharray':'6 4'});
 const points=q.g.heights.map((v,i)=>[x(i),y(v)]);
 se(g,'polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:orange,'stroke-width':2});
 for(const [xx,yy] of points)se(g,'circle',{cx:xx,cy:yy,r:3.25,fill:'#dbad60',stroke:orange,'stroke-width':.8});
 const grade=q.o.grade[1]==='+'?'+'+q.o.grade[0].toUpperCase():'−'+q.o.grade[0].toUpperCase();
 tx(g,origin,210,'FIRST',ink,10);tx(g,x(9),210,'TENTH',ink,10,{'text-anchor':'end'});
 tx(g,(origin+x(9))/2,210,'3,600 µm  '+grade+' →',ink,10,{'text-anchor':'middle'});
 const info='The dashed uniform profile is '+f(q.o.uniform)+' µm. The Slant endpoints are '+f(q.g.heights[0])+' and '+f(q.g.heights[9])+' µm along '+grade+'.';
 $('elevationDesc').textContent=info;
 $('elevationNote').textContent=info+' Both axes use the same scale.';
}
function plan(){
 const fig=$('plan'),g=fig.querySelector('g');g.replaceChildren();if(!q||q.error)return;
 const isRear=$('face').value==='rear',face=isRear?'rear':'front',aa=sectionEdge,x0=150,y0=147,k=224/E.SIZE;
 const xy=(x,y)=>{let p=E.mapFace(face,x,y);return [x0+p.x*k,y0-p.y*k];};
 const L=x0-112,T=y0-112;
 const clip=se(g,'clipPath',{id:'overlayClip'});rect(clip,L,T,224,224,'white');
 rect(g,L,T,224,224,'#314a3e',{stroke:'#93aa97','stroke-width':1});
 const overlay=se(g,'g',{'clip-path':'url(#overlayClip)'});
 function strip(isX,c,which){
  const front=which==='front',low=front?c.frontLo:c.backLo,high=front?c.frontHi:c.backHi,center=front?c.front:c.back,fill=front?'#e5ba62':'#79bda8';
  if(isX){let xl=xy(low,0)[0],xh=xy(high,0)[0];rect(overlay,Math.min(xl,xh),T,Math.abs(xh-xl),224,fill,{opacity:front?.20:.29});line(overlay,xy(center,0)[0],T,xy(center,0)[0],T+224,fill,{'stroke-width':.68,'stroke-dasharray':front?'none':'3 2',opacity:.82});}
  else {let yh=xy(0,high)[1],yl=xy(0,low)[1];rect(overlay,L,yh,224,yl-yh,fill,{opacity:front?.20:.29});line(overlay,L,xy(0,center)[1],L+224,xy(0,center)[1],fill,{'stroke-width':.68,'stroke-dasharray':front?'none':'3 2',opacity:.82});}
 }
 for(const ax of ['x','y'])for(const c of q.axes[ax].cuts.filter(v=>v.internal)){strip(ax==='x',c,'rear');strip(ax==='x',c,'front');}
 // Each candidate physical web is drawn perpendicular to the separating cut.
 for(const e of q.edges.filter(a=>a.siliconCandidate)){const A=q.nodes[e.a],B=q.nodes[e.b],[x,y]=xy((A.x+B.x)/2,(A.y+B.y)/2);line(g,x+(e.axis==='x'?-3.5:0),y+(e.axis==='y'?-3.5:0),x+(e.axis==='x'?3.5:0),y+(e.axis==='y'?3.5:0),pal.rust,{'stroke-width':2,'stroke-linecap':'round'});}
 let fStates=t&&!t.error?t.records:null;
 for(const n of q.nodes){
  const [x,y]=xy(n.x,n.y),active=aa&&(n.id===aa.a||n.id===aa.b),state=fStates?.[n.id].status;
  const fill=state==='open'?'#f08f75':state==='ambiguous'?'#f2b769':n.corner?'#233a30':pal.soft;
  const c=se(g,'circle',{cx:x,cy:y,r:active?6.3:3.55,fill,stroke:active?'#fff1a6':n.corner?pal.mint:'#30483d','stroke-width':active?2:.9,'data-r':n.row,'data-c':n.col,class:'site'});
  se(c,'title',{},n.name+(n.corner?' · parked corner':state?' · '+state:'')+(active?' · selected boundary':''));
 }
 if(aa){const a=q.nodes[aa.a],b=q.nodes[aa.b],pa=xy(a.x,a.y),pb=xy(b.x,b.y);
  line(g,...pa,...pb,aa.siliconCandidate?pal.rust:pal.gold,{'stroke-width':1.9,'pointer-events':'none'});
 }
 const [xa,ya]=xy(-1940,1935);se(g,'circle',{cx:xa,cy:ya,r:6,fill:'#182a23',stroke:pal.gold});tx(g,xa,ya+3,'A',pal.gold,8,{'text-anchor':'middle'});
 tx(g,36,24,isRear?'REAR FACE · X MIRRORED':'NEEDLE FACE · +X RIGHT',pal.mint,12);
 tx(g,18,158,'+Y',pal.soft,9);tx(g,265,249,isRear?'−X':'+X',pal.soft,9);
 line(g,36,275,58,275,pal.gold,{'stroke-width':2});tx(g,63,278,'front cut',pal.soft,9);
 line(g,164,275,186,275,pal.mint,{'stroke-width':2,'stroke-dasharray':'3 2'});tx(g,191,278,'rear glass',pal.soft,9);
 if(q.g.spread>0){
  const dr=q.g.axis==='x'?1:0,sg=q.g.reverse?-1:1,pp1=xy(-dr*sg*850,-(1-dr)*sg*850),pp2=xy(dr*sg*850,(1-dr)*sg*850);
  const x1=pp1[0],y1=pp1[1],x2=pp2[0],y2=pp2[1];
  // Show nominal row order in the bottom margin with a proper mirrored horizontal sign.
  const sign=x2===x1?y1>y2?'↑':'↓':x2>x1?'→':'←';
  tx(g,36,295,'Slant row order '+sign+' · selected grade axis',pal.soft,9);
 }
 $('planDesc').textContent=(isRear?'Rear view mirrors X; physical site IDs stay fixed. ':'Needle side; positive X is right. ')+(aa?aa.aName+' to '+aa.bName+' selected. ':'')+q.summary.web+' candidate boundaries are marked.';
}
function section(){
 const g=$('section').querySelector('g');g.replaceChildren();const e=sectionEdge;if(!e)return;
 const o=q.o,origin=e.backCenter,range=Math.max(220,Math.abs(e.frontCenter-origin)+o.frontKerf/2+24,o.rearKerf/2+24);
 const zmax=Math.max(o.glassDepth+78,e.floorMax+61,340),zmin=Math.min(-38,e.floorMin-12),X=x=>scale(x-origin,-range,range,27,337),Y=z=>scale(z,zmin,zmax,252,40);
 let y0=Y(0),yTop=Y(zmax),x1=X(origin-range),x2=X(origin+range),yG=Y(o.glassDepth);
 rect(g,x1,yTop,x2-x1,y0-yTop,'#748176',{stroke:'#a4b19f','stroke-width':1});
 rect(g,X(e.backLo),yG,X(e.backHi)-X(e.backLo),y0-yG,'#7ab6a4',{stroke:pal.mint,'stroke-width':.8});
 // The front cut is shown at the midspan floor; dashed markers denote extremes.
 const yH=Y(e.floorAtCenter);rect(g,X(e.frontLo),yTop-.5,X(e.frontHi)-X(e.frontLo),yH-yTop+.5,'#1e322b',{stroke:pal.gold,'stroke-width':1.1});
 line(g,x1-2,y0,x2+3,y0,'#d4ddc5',{'stroke-width':1,'stroke-dasharray':'4 3'});
 if(Math.abs(e.floorMax-e.floorMin)>1e-7){for(const h of [e.floorMin,e.floorMax])line(g,X(e.frontLo),Y(h),X(e.frontHi),Y(h),pal.gold,{'stroke-width':.8,'stroke-dasharray':'3 2'});}
 tx(g,30,22,'DETAIL · '+e.axis.toUpperCase()+'-NEIGHBOR BOUNDARY',pal.mint,12);
 tx(g,30,267,'REAR DATUM  z = 0',pal.soft,10);
 if(e.lateralClearance<0){
  const start=e.frontCenter>e.backCenter?e.backHi:e.frontHi,end=e.frontCenter>e.backCenter?e.frontLo:e.backLo,y=Y(Math.max(1,Math.min(o.glassDepth,e.floorAtCenter+15)));
  line(g,X(start),y,X(end),y,pal.rust,{'stroke-width':3.5});se(g,'circle',{cx:(X(start)+X(end))/2,cy:y,r:2.6,fill:pal.rust});
 }else if(e.depthMargin<0){
  let lo=Math.max(e.frontLo,e.backLo),hi=Math.min(e.frontHi,e.backHi),yOver=Math.min(yG,Y(e.floorMax));rect(g,X(lo),yOver,X(hi)-X(lo),Math.abs(yG-yOver),pal.rust,{opacity:.7});
 }else if(e.capMin<=1e-8){
  let lo=Math.max(e.frontLo,e.backLo),hi=Math.min(e.frontHi,e.backHi);line(g,X(lo),y0,X(hi),y0,pal.rust,{'stroke-width':3.25});
 }
 const left='Opening = '+f(o.frontKerf)+' µm';const right='Rear depth = '+f(o.glassDepth)+' µm';tx(g,30,288,left,pal.gold,10);tx(g,337,288,right,pal.mint,10,{'text-anchor':'end'});
 const adjust=e.siliconCandidate?(e.sideSilicon>0?' The cuts miss laterally.':' Part of the boundary retains a modeled silicon shelf.'):e.breach?' The modeled cut reaches the rear plane somewhere along this edge.':e.tangent?' A zero-margin contact is flagged; it is not a verified connection.':' Finite overlap joins the cuts in the rectangular model.';
 const desc=e.aName+' ↔ '+e.bName+'. Front opening shown at the selected edge’s midspan; dashed lines show floor extremes where present.'+adjust;
 $('sectionDesc').textContent=desc;$('sectionText').textContent=desc;
}
function spans(){
 $('spans').replaceChildren();
 for(const ax of ['x','y']){
  const a=q.axes[ax],li=ds('li');li.append(ds('strong',ax.toUpperCase()+' '),document.createTextNode('· front repeat '+f(a.pitch)+' µm | nine-interval span '+f(a.uncroppedFrontSpan)+' µm ('+(a.spanError>0?'+':'')+f(a.spanError)+' µm). Max interior shift '+f(a.maxInternalError)+' µm. Narrowest matched ligament '+f(a.minMatchedWidth)+' µm.'));$('spans').append(li);
 }
 const st=q.summary;
 const count=st.web+' candidate silicon '+(st.web===1?'bridge':'bridges')+' · '+st.breach+' boundaries reaching the rear plane · '+st.tangent+' tangent joins (counts can overlap).';
 const pre=q.outOfEnvelope?'Out of model: a corresponding cut moved by at least half a pitch or lost its paired ligament. Geometry remains inspectable; electrical assignment is withheld. ':st.web+st.breach+st.tangent===0?'All 180 inspected boundaries have finite overlap with retained glass in this fixture. ':'These are model flags, not a product acceptance result. ';
 $('geoNotice').textContent=pre+count;$('geoNotice').classList.toggle('warn',q.outOfEnvelope||st.web+st.breach+st.tangent>0);
}
function setCards(box,pairs){box.replaceChildren();for(const [value,label] of pairs){let d=ds('div');d.append(ds('strong',value),ds('span',label));box.append(d);}}
function clearTest(msg){
 t=null;$('channelsCsv').disabled=true;$('counts').replaceChildren();$('paths').textContent='';
 $('checkStatus').className='status idle';$('checkStatus').textContent=msg||'Inputs changed. Test the current fixture again.';
}
function view(){
 if(!q||q.error)return;
 const r=Number($('edgeRow').value),c=Number($('edgeCol').value),a=$('edgeAxis').value;sectionEdge=q.edges.find(e=>e.axis===a&&e.row===r&&e.col===c)||null;
 plotAx('uniform');plotAx('slant');elevation();plan();section();renderWorkflow();
 const e=sectionEdge;if(!e)return;
 setCards($('edgeData'),[[f(e.lateralClearance)+' µm','Signed plan-view overlap (negative = gap)'],[f(e.depthMargin)+' µm','Worst signed depth overlap (negative = shelf)'],[f(e.capMin)+' µm','Minimum retained glass cap in modeled strip']]);
 $('faultTarget').textContent='Selected '+e.aName+' → '+e.bName+' along physical +'+e.axis.toUpperCase()+'. Open applies only to '+e.aName+'.';
}
function render(reset=true){
 const o=read();q=E.evaluate(o);
 $('measuredWrap').hidden=o.range!=='measured';$('error').hidden=!q.error;$('error').textContent=q.error||'';
 if(reset)clearTest(first?'Run the virtual fixture to inspect the current cut geometry.':undefined);
 first=false;
 const bad=!!q.error;
 for(const id of ['geometryCsv','record'])$(id).disabled=bad;
 $('run').disabled=bad||q.outOfEnvelope;
 if(bad){
  $('rangeNote').textContent='Enter valid values to draw the arrays.';
  $('geoNotice').textContent=q.error;$('geoNotice').classList.add('warn');
  for(const id of ['facts','rowBand','spans','edgeData'])$(id).replaceChildren();
  for(const id of ['uniformFig','slantFig','elevation','plan','section'])$(id).querySelector('g').replaceChildren();$('sectionText').textContent='';$('elevationNote').textContent='';
  $('faultTarget').textContent='No valid section selected.';renderWorkflow();return;
 }
 facts();spans();view();
 if(q.outOfEnvelope){$('checkStatus').className='status bad';$('checkStatus').textContent='The network solver is withheld outside the nearest-neighbor registration model.';}
}
function test(){
 if(!q||q.error||q.outOfEnvelope)return;
 t=E.continuity(q,readFault());
 if(t.error){$('checkStatus').className='status bad';$('checkStatus').textContent=t.error;$('channelsCsv').disabled=true;$('counts').replaceChildren();$('paths').textContent='';return;}
 $('channelsCsv').disabled=false;
 const bad=t.open+t.ambiguous>0;
 $('checkStatus').className='status'+(bad?' bad':'');
 $('checkStatus').textContent=bad?'Identity fault found: '+t.open+' open '+(t.open===1?'output':'outputs')+', '+t.ambiguous+' '+(t.ambiguous===1?'ambiguity':'ambiguous outputs')+'.':'All 96 virtual outputs reached one expected tip each under the chosen assumptions.';
 setCards($('counts'),[[t.isolated,'Isolated output'],[t.open,'Open lead'],[t.ambiguous,'Multiple paths'],[t.parked,'Parked corner']]);
 const problems=t.records.filter(r=>['open','ambiguous'].includes(r.status)).slice(0,3).map(r=>r.name+': '+(r.paths.length===0?'no tip path':r.labels.slice(0,6).join(', ')+(r.paths.length>6?' …':'')));
 $('paths').textContent='Counted '+t.assumedEdges+' geometry-derived edges'+(t.manual?' plus the manual bridge':'')+'. '+(problems.length?problems.join(' | ')+'.':'')+(q.summary.breach||q.summary.tangent?' Glass breach and tangent flags never create an assumed electrical link by themselves.':'');
 plan();
}
function rowsData(){
 return q.edges.map(e=>({
  axis:e.axis.toUpperCase(),site_A:e.aName,site_B:e.bName,front_cut_center_um:e.frontCenter,rear_cut_center_um:e.backCenter,center_offset_um:e.centerOffset,
  signed_plan_overlap_um:e.lateralClearance,side_silicon_gap_um:e.sideSilicon,front_floor_midspan_um:e.floorAtCenter,front_floor_min_um:e.floorMin,front_floor_max_um:e.floorMax,
  signed_depth_overlap_um:e.depthMargin,residual_silicon_depth_um:e.verticalSilicon,min_retained_glass_cap_um:e.capMin,max_retained_glass_cap_um:e.capMax,
  silicon_bridge_candidate:e.siliconCandidate,reaches_rear_plane:e.breach,tangent:e.tangent,classification:e.state
 }));
}
function channelData(){
 return !t||t.error?null:t.records.map(a=>({site:a.name,row:a.row+1,column:a.col+1,nominal_x_um:a.x,nominal_y_um:a.y,modeled_uniform_height_um:a.u,modeled_slant_height_um:a.h,virtual_output:a.corner?'parked':'observed',state:a.status,possible_tip_count:a.paths.length,possible_symbolic_tips:a.labels.join('|')}));
}
function csv(r){const h=Object.keys(r[0]);return [h,...r.map(v=>h.map(k=>v[k]))].map(x=>x.join(',')).join('\r\n')+'\r\n';}
function download(mode){
 if(!q||q.error)return;
 let body='',file='utah-isolation-';
 if(mode==='geometry'){body=csv(rowsData());file+='boundaries.csv';}
 if(mode==='channels'){const r=channelData();if(!r)return;body=csv(r);file+='virtual-outputs.csv';}
 if(mode==='record'){const channels=channelData();body=JSON.stringify({
   schema:'BTS-utah-isolation-v1',synthetic:true,not_product_acceptance:true,units:{geometry:'µm',angle:'degrees'},
   base:{nominalPitch:E.P,nominalOutline:E.SIZE,nominalCenterSpan:E.SPAN,siteCount:100,fixtureOutputs:96},
   evidence:{note:q.g.scope,gradeStatus:q.g.kind,sources:Object.values(E.refs).map(([title,url,note])=>({title,url,note}))},parameters:{...q.o,...readFault()},derivedTipProfile:q.g,
   view:{rotation:Number($('rotation').value),face:$('face').value,selectedSection:sectionEdge?{a:sectionEdge.aName,b:sectionEdge.bName}:null},
   cutModelValid:!q.outOfEnvelope,boundarySummary:q.summary,
   axes:Object.fromEntries(Object.entries(q.axes).map(([ax,v])=>[ax,{frontPitch:v.pitch,pitchError:v.pitchError,uncroppedFrontRepeatSpan:v.uncroppedFrontSpan,spanError:v.spanError,maxInteriorCenterShift:v.maxInternalError,minMatchedLigament:v.minMatchedWidth,cuts:v.cuts}])),
   boundaries:rowsData(),virtualFixture:channels?{summary:{isolated:t.isolated,open:t.open,ambiguous:t.ambiguous,parked:t.parked,geometricEdgesCounted:t.assumedEdges,manualEdge:t.manual?.map(E.nodeName)??null},outputs:channels}:null
  },null,2);file+='record.json';}
 const url=URL.createObjectURL(new Blob([body],{type:mode==='record'?'application/json':'text/csv;charset=utf-8'})),a=ds('a','',{href:url,download:file});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),25000);
}
$('workflow-steps').replaceChildren(...workflow.map((a,i)=>{
 const li=ds('li'),b=ds('button','',{type:'button','data-workflow-step':i,'aria-label':'Step '+(i+1)+': '+a.title});
 b.append(ds('span',String(i+1).padStart(2,'0')),ds('span',a.short));
 b.addEventListener('click',()=>{workflowStop();if(workflowState==='complete')workflowState='ready';workflowShow(i);});
 li.append(b);return li;
}));
$('workflow-play').addEventListener('click',workflowReplay);
for(const kind of ['input','change'])document.querySelector('main').addEventListener(kind,e=>{
 if(e.target.closest('#configure,#cuts,#continuity')&&e.target.matches('input,select,textarea'))workflowStop(true);
},true);
document.querySelector('main').addEventListener('click',e=>{
 const n=e.target.closest('[data-example],[data-r],#run,#geometryCsv,#channelsCsv,#record,.jump a:not([href="#workflow-player"])');
 if(n&&!n.disabled)workflowStop(true);
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)workflowStop();});
window.addEventListener('pagehide',()=>workflowStop());
if(reducedWorkflow.addEventListener)reducedWorkflow.addEventListener('change',()=>{if(reducedWorkflow.matches)workflowMotion?.cancel();});
for(const [id,v] of Object.entries(E.examples)){const b=ds('button',v.name,{'data-example':id,'aria-pressed':'false',type:'button'});b.addEventListener('click',()=>fixturePreset(id));$('examples').append(b);}
for(const [title,url,note] of Object.values(E.refs)){const item=ds('li');item.append(ds('a',title,{href:url,rel:'noreferrer'}),ds('span',note));$('sources').append(item);}
for(const [k,[a,b]] of Object.entries(E.limits)){const node=$(k);node.min=a;node.max=b;}
for(const id of ['uniform','range','grade','measured',...major,'slopeAxis'])$(id).addEventListener('input',()=>{if(major.includes(id)||id==='slopeAxis')unpress();render(true);});
for(const id of ['face','rotation'])$(id).addEventListener('input',view);
$('edgeAxis').addEventListener('input',()=>{edgeChoices();render(true);});
for(const id of ['edgeRow','edgeCol','accountWeb','open','bridge'])$(id).addEventListener('input',()=>render(true));
$('plan').addEventListener('click',ev=>{const site=ev.target.closest('[data-r]');if(site){edgeChoices(Number(site.dataset.r),Number(site.dataset.c));render(true);}});
$('run').addEventListener('click',()=>{test();renderWorkflow();});
$('geometryCsv').addEventListener('click',()=>download('geometry'));$('channelsCsv').addEventListener('click',()=>download('channels'));$('record').addEventListener('click',()=>download('record'));
$('measured').value=E.base.measured;
const query=new URLSearchParams(location.search),example=query.get('example');
if(Object.prototype.hasOwnProperty.call(E.ranges,query.get('range')))$('range').value=query.get('range');
fixturePreset(Object.prototype.hasOwnProperty.call(E.examples,example)?example:'nominal');
})();
