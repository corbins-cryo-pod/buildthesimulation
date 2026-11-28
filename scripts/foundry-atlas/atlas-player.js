/* Source-aware workflow playback: schematic keyframes, not fabrication parameters. */
((root)=>{
'use strict';
const list=x=>Array.isArray(x)?x:[];
const allowed=(step,v)=>!list(step.only).length||Boolean(v&&step.only.includes(v.id));
const evidenceNames={documented:'Documented step',reference:'Reference / inferred',external:'External or unverified',boundary:'Evidence boundary'};
const lessons={
 prepare:['Preparation','Place a neutral workpiece on the virtual presentation plate.'],
 layout:['Layout or definition','Show a pattern moving onto a neutral design witness.'],
 coat:['Material addition','Show a new schematic film above the existing stack. Thickness is not scaled.'],
 expose:['Pattern writing','Scan an optical marker across a representative pattern, not the device mask.'],
 remove:['Material removal','Show a schematic region opening. No rates, sources or process settings are inferred.'],
 release:['Release','Lift a drawn film from a temporary carrier. Motion is illustrative.'],
 bond:['Assembly or connection','Bring a drawn component and its matching terminals together. Not a real fixture.'],
 inspect:['Bench or inspection','Scan an abstract witness and reveal an illustrative trace, not data.'],
 handoff:['Process handoff','Transfer the workflow token to the next listed station. The action is not further specified.'],
 boundary:['Evidence boundary','The handoff stops at this boundary. No missing operation is inferred.']
};
function classify(step){
 if(!step||step.status==='external')return 'boundary';
 const title=String(step?.title||'').trim().toLowerCase();
 if(/^(?:stop|exclude|do not|mark .*boundary|identify .*outside|reserve .*external|separate .*proprietary)/.test(title))return 'boundary';
 if(/^(?:test|verify|check|inspect|measure|sweep|characteri[sz]e|qualify|evaluate|exercise|compare|audit|validate|replay|observe|screen|benchmark)\b|\b(?:continuity check|impedance check|inspection)$/.test(title))return 'inspect';
 if(/^(?:release|peel|detach|free|lift[- ]off)\b/.test(title)||/\b(?:release|lift[- ]off) the (?:film|mesh|shank)\b/.test(title))return 'release';
 if(/^(?:bond|align and bond|laminate|package|connect|attach|assemble|mount|terminate|join|mate|integrate|wire|seal|weld|spool)\b/.test(title))return 'bond';
 if(/^(?:etch|open|strip|mill|dice|drill|trim|thin|grind|polish|shape|sharpen|cut|dealloy|split|ablate|machine)\b|\b(?:open .*windows|deep[- ]etch|oxygen etch)\b/.test(title))return 'remove';
 if(/^(?:deposit|coat|overcoat|plate|passivate|sputter|evaporate|oxidize|cure|encapsulate|grow|cast|overmold)\b|\b(?:deposit .*film|polymer deposition|co.sputter)\b/.test(title))return 'coat';
 if(/^(?:expose|pattern|write)\b|\b(?:lithography|laser writing|photopattern)\b/.test(title))return 'expose';
 if(/^(?:lay out|design|draw|map|define|specify|choose|calculate|fix|freeze|capture|plan|select|establish)\b/.test(title))return 'layout';
 if(/^(?:receive|prepare|load|accept|start|clean|condition|identify|bring|set up|record|begin)\b/.test(title))return 'prepare';
 return 'handoff';
}
function makePlan(p,v){
 const steps=list(p?.steps),variants=list(p?.variants);
 const decorate=(s,i)=>({step:s,index:i,kind:classify(s)});
 const items=steps.map(decorate);
 const scope=p?.evidence;
 if(v?.status==='incompatible')return {kind:'boundary',steps:[],message:'This configuration is not a compatible process. The comparison and its limits are shown instead of a fabrication sequence.'};
 if(scope==='out-of-scope')return {kind:'boundary',steps:[],message:'This profile is outside the modeled manufacturing scope. Review its stated limits; no manufacturing animation is asserted.'};
 if(!items.length)return {kind:'boundary',steps:[],message:'This profile has no modeled handoffs to animate.'};
 if(v){
  const named=items.filter(x=>allowed(x.step,v));
  return named.length?{kind:'sequence',steps:named,branch:v,message:v.status==='external'?'External branch. Unknown operations stop at an evidence boundary.':'Animation follows the applicable handoffs for this branch.'}:{kind:'boundary',steps:[],message:'No handoff in this route is assigned to the selected branch.'};
 }
 if(items.some(x=>list(x.step.only).length)){
  const candidates=variants.filter(z=>z.status!=='incompatible'&&items.some(x=>allowed(x.step,z)));
  const preferred=candidates.find(z=>z.status==='documented')||candidates.find(z=>z.status==='reference')||candidates[0];
  const common=items.filter(x=>!list(x.step.only).length);
  if(preferred)return {kind:'branch',steps:common,suggested:preferred,branch:null,message:'This route has branch-specific steps. Play selects the named branch below so distinct alternatives never run as one process.'};
  if(!common.length)return {kind:'boundary',steps:[],message:'Select a compatible configuration to see its handoffs. Alternatives cannot be combined.'};
  return {kind:'sequence',steps:common,branch:null,message:'Only handoffs shared across branches are shown. Select a named branch for the full route.'};
 }
 return {kind:'sequence',steps:items,branch:null,message:'Animation follows the listed handoffs, not a physical or production recipe.'};
}

const plateDuration=3600, equipmentDuration=7000;
let rendererModule;
function loadRenderer(){
 if(!/^https?:$/.test(location.protocol))return Promise.reject(Error('This file is offline.'));
 rendererModule??=import(new URL('/simulations/foundry/cleanroom-player.js',location.href).href)
  .catch(error=>{rendererModule=undefined;throw error;});
 return rendererModule;
}
const clamp=x=>Math.max(0,Math.min(1,x));
const easing=x=>{const z=clamp(x);return z*z*(3-2*z)};
const dark='#142d28', forest='#294b40', muted='#9bb5a3', ivory='#e7e6cb', copper='#e3ba74', aqua='#a4c7b8', red='#e5967a';
const rect=(x,y,w,h,f,s='none',misc='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+f+'" stroke="'+s+'" '+misc+'/>';
const path=(d,s,w=2,misc='')=>'<path d="'+d+'" fill="none" stroke="'+s+'" stroke-width="'+w+'" stroke-linecap="round" '+misc+'/>';
const circle=(x,y,r,f,s='none',misc='')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'" stroke="'+s+'" '+misc+'/>';
const group=(name,l)=>'<g data-part="'+name+'">'+l+'</g>';
const type=(x,y,s,color=ivory,size=10)=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="ui-monospace,monospace" font-size="'+size+'" letter-spacing=".9">'+s+'</text>';
const dots=(x=213,y=134)=>Array.from({length:8},(_,i)=>circle(x+16*i,y,2.1,copper)).join('');
function plate(x=190,y=123){return '<path d="M'+x+' '+y+'h152l20 14H'+(x+19)+'z" fill="#49695a" stroke="'+muted+'" stroke-width="1.1"/>'+rect(x+19,y+14,153,10,'#28463c',muted);}
const holder=()=>rect(172,151,198,14,forest,muted)+rect(205,165,131,7,'#1e3d32',forest);
function ledge(){
 return path('M207 127H343M207 132H343',copper,1.4)+dots(215,129);
}
function drawing(kind){
 const foundation='<svg class="workflow-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 544 224" aria-hidden="true"><defs><pattern id="wf-mesh" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#8ab39b" stroke-opacity=".18" stroke-width=".6"/></pattern></defs>'+rect(0,0,544,224,dark)+rect(16,15,512,194,'url(#wf-mesh)','#527365')+type(34,43,'WORKFLOW PLATE / '+kind.toUpperCase(),copper,11)+type(34,193,'SCHEMATIC  ·  NOT TO SCALE',muted,9);
 const guide=holder()+path('M272 75v83',muted,1,'stroke-dasharray="2 6" opacity=".35"');
 let s='';
 switch(kind){
 case 'prepare':
  s=guide+group('shuttle',plate()+ledge())+path('M77 118h56m-8-6 8 6-8 6',aqua,1.5)+type(63,102,'CARRIER',muted)+rect(379,91,106,70,'#1a3b30','#658577')+path('M392 106h75m-75 13h60m-60 13h70',muted,1.2)+group('check',path('M421 145l8 6 13-12',copper,2.4));break;
 case 'layout':
  s=guide+plate()+group('mask',rect(198,74,142,43,'#2b5a47',muted)+path('M214 88h110m-110 9h110m-110 9h110',copper,1.25)+Array.from({length:8},(_,i)=>circle(216+i*15,98,2.4,ivory)).join(''))+group('result',ledge())+type(370,119,'DESIGN WITNESS',muted);break;
 case 'coat':
  s=guide+plate()+rect(232,65,79,14,forest,muted)+group('droplets',circle(242,91,2.3,copper)+circle(269,87,3,copper)+circle(303,91,2.4,copper))+group('film',rect(194,117,151,5,copper,copper)+path('M193 118h151',ivory,1))+type(365,118,'NEW FILM',muted);break;
 case 'expose':
  s=guide+plate()+rect(198,95,145,12,'#3c6a58',muted)+dots(212,101)+group('sweep',rect(200,73,21,12,aqua,muted)+path('M205 86l-8 37m17-37 9 37',aqua,2,'opacity=".7"')+rect(203,110,15,19,'#baddbb66','none'))+group('result',ledge())+type(373,105,'PATTERN',muted);break;
 case 'remove':
  s=guide+plate()+rect(199,115,141,7,copper,copper)+group('opened',rect(242,113,24,11,dark,dark)+rect(290,113,24,11,dark,dark))+group('sweep',path('M208 73v38',aqua,2)+path('M204 78h8m-11 8h14',copper,1.7))+type(376,119,'OPENING',muted);break;
 case 'release':
  s=guide+plate()+path('M198 126h147',muted,1,'stroke-dasharray="3 5"')+group('lift',rect(206,119,143,9,'#5d8265',copper)+path('M219 122h114',copper,1.3)+dots(218,123))+path('M420 134V89m-5 5 5-5 5 5',aqua,1.5)+type(395,154,'RELEASE',muted);break;
 case 'bond':
  s=guide+plate()+dots(214,128)+group('component',rect(207,79,128,28,'#537b66',muted)+Array.from({length:8},(_,i)=>rect(213+16*i,107,7,5,copper)).join(''))+group('check',path('M365 115l8 6 14-12',aqua,2.8))+type(386,143,'PAIR TERMINALS',muted);break;
 case 'inspect':
  s=holder()+plate(72,116)+path('M98 126h110m-100 7h110',copper,1.1)+group('scan',path('M97 95v38',aqua,2)+rect(92,93,10,4,copper))+rect(272,77,209,79,'#1c3c31','#739383')+path('M289 122h178m-130-37v59m45-59v59m45-59v59',muted,.6,'opacity=".65"')+group('trace',path('M290 124h39l7-7 9 14 10-26 11 18h26l11-11 14 12h41',aqua,2,'pathLength="1" stroke-dasharray="1"'))+type(293,172,'ILLUSTRATIVE SIGNAL, NOT DATA',muted,8.5);break;
 case 'boundary':
  s=rect(65,79,183,74,forest,muted)+type(85,109,'AVAILABLE EVIDENCE',aqua)+path('M85 122h113m-113 11h127',muted,1.2)+path('M292 71v89',red,2.2,'stroke-dasharray="5 5"')+group('stop',circle(290,116,14,dark,red)+path('M284 110l12 12m0-12-12 12',red,2.1))+rect(327,79,151,74,'#203d33','#4d675a','stroke-dasharray="4 4"')+type(345,111,'OUTSIDE SCOPE',red)+type(345,132,'NO ASSUMED STEP',muted,8.5);break;
 default:
  s=rect(80,84,131,62,forest,muted)+rect(334,84,133,62,'#2d5246',muted)+path('M217 114h111m-6-6 6 6-6 6',muted,2)+type(94,105,'INPUT',aqua)+type(348,105,'HANDOFF',aqua)+group('token',rect(123,117,44,11,copper,'#efcf92'));break;
 }
 return foundation+s+'</svg>';
}
function pose(parts,kind,t){
 const u=easing(t),part=n=>parts[n],move=(n,x,y=0)=>part(n)?.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+')'),vis=(n,v)=>part(n)?.setAttribute('opacity',String(Math.round(clamp(v)*1000)/1000));
 switch(kind){
 case 'prepare':move('shuttle',-120*(1-u));vis('check',(u-.7)*4);break;
 case 'layout':move('mask',0,-12+17*u);vis('result',(u-.35)*1.8);break;
 case 'coat':move('droplets',0,25*u);vis('droplets',Math.min(u*4,(1-u)*4));vis('film',u);break;
 case 'expose':move('sweep',120*u);vis('result',u);break;
 case 'remove':move('sweep',125*u);vis('opened',u);break;
 case 'release':move('lift',16*u,-45*u);break;
 case 'bond':move('component',0,16*u);vis('check',(u-.55)*3);break;
 case 'inspect':move('scan',118*u);part('trace')?.firstElementChild?.setAttribute('stroke-dashoffset',String(1-u));break;
 case 'boundary':vis('stop',Math.max(.35,u));break;
 default:move('token',252*u);break;
 }
}

const glyph='<svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16"><path fill="currentColor" d="M4 2v12l10-6z"/></svg>';
const pauseGlyph='<svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16"><path fill="currentColor" d="M3 2h3v12H3zm7 0h3v12h-3z"/></svg>';
function create(el,profile,variant,actions={}){
 const plan=makePlan(profile,variant),motion=matchMedia('(prefers-reduced-motion: reduce)');
 el.dataset.playerPlan=plan.kind;
 el.dataset.playerProfile=profile.id;el.dataset.playerVariant=variant?.id||'';
 if(plan.kind==='boundary'){
  el.innerHTML='<div class="workflow-top"><div><p class="overline">Workflow player</p><h4 id="workflow-heading">Scope boundary</h4></div><span class="tag external">No playable sequence</span></div><p class="workflow-note"></p><div class="workflow-plate" aria-hidden="true">'+drawing('boundary')+'</div><div class="workflow-copy"><p>Read the route’s stated limitations. The atlas does not fill missing manufacturing information with a schematic recipe.</p></div>';
  el.querySelector('.workflow-note').textContent=plan.message;
  return {destroy(){}};
 }
 if(plan.kind==='branch'){
  el.innerHTML='<div class="workflow-top"><div><p class="overline">Workflow player</p><h4 id="workflow-heading">Play a configuration</h4></div><span class="tag">Branch required</span></div><p class="workflow-note"></p><div class="workflow-controls"><button type="button" class="wf-play" id="workflow-play">'+glyph+'Play workflow</button><button type="button" class="wf-control" id="workflow-pick">Choose another configuration</button></div><p class="workflow-preview" id="workflow-branch-preview"></p>';
  el.querySelector('.workflow-note').textContent=plan.message;
  const play=el.querySelector('#workflow-play');
  play.setAttribute('aria-describedby','workflow-branch-preview');
  el.querySelector('#workflow-branch-preview').textContent='Play will select: '+plan.suggested.label+'.';
  play.addEventListener('click',()=>actions.selectBranch?.(plan.suggested.id));
  el.querySelector('#workflow-pick').addEventListener('click',()=>actions.focusBranch?.());
  return {destroy(){}};
 }
 el.innerHTML='<div class="workflow-top"><div><p class="overline">Workflow player</p><h4 id="workflow-heading">Play this sequence</h4></div><span class="tag" id="workflow-mode"></span></div><p class="workflow-note"></p><div class="workflow-controls" role="group" aria-label="Playback controls"><button type="button" class="wf-play" id="workflow-play">'+glyph+'Play workflow</button><button type="button" class="wf-control" id="workflow-prev" aria-label="Previous handoff">← Prev</button><button type="button" class="wf-control" id="workflow-next" aria-label="Next handoff">Next →</button><button type="button" class="wf-control" id="workflow-replay">Replay</button><label class="wf-speed" for="workflow-speed">Speed<select id="workflow-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div><div class="workflow-progress" aria-hidden="true"><span></span></div><div class="workflow-equipment-view" hidden></div><div class="workflow-plate"></div><div class="workflow-stations" hidden aria-label="Stations in this handoff"><p class="workflow-station-note"></p><div class="workflow-station-list" role="group" aria-label="Inspect a station"></div><div class="workflow-station-link"></div></div><div class="workflow-copy"><div class="workflow-position"><span class="detail-eyebrow" id="workflow-position"></span><span class="tag" id="workflow-evidence"></span></div><h5 id="workflow-step"></h5><p id="workflow-caption"></p><p id="workflow-context"></p><button type="button" class="text-btn" id="workflow-read">Open handoff details ↓</button></div><p class="wf-limits" id="workflow-limits"></p><p class="sr-only" id="workflow-live" role="status" aria-atomic="true"></p>';
 const $=s=>el.querySelector(s),bar=$('.workflow-progress span'),face=$('.workflow-plate');
 const equipped=$('.workflow-equipment-view'),rail=$('.workflow-stations'),railNote=$('.workflow-station-note'),stationList=$('.workflow-station-list'),stationLink=$('.workflow-station-link');
 const go=$('#workflow-play'),prev=$('#workflow-prev'),next=$('#workflow-next'),again=$('#workflow-replay'),pace=$('#workflow-speed');
 const header=$('#workflow-mode'),record=$('#workflow-position'),label=$('#workflow-evidence'),stageTitle=$('#workflow-step'),context=$('#workflow-context'),caption=$('#workflow-caption'),live=$('#workflow-live'),limits=$('#workflow-limits');
 const items=root.AtlasCleanroomScenes?.makeScenes(profile,variant,plan.steps, actions.lookupEquipment)||plan.steps;
 const total=items.reduce((n,item)=>n+(item.stations?.length||0),0);
 const offsets=items.reduce((a,item)=>[...a,a[a.length-1]+(item.stations?.length||0)],[0]);
 let state='ready',index=0,station=0,span=0,last=null,speed=1,ticket=0,parts={},renderer,dead=false,manualPose=false,painted=-1,visibleItem=-1;
 const rich=()=>Boolean(renderer),duration=()=>rich()?equipmentDuration:plateDuration,current=()=>items[index]?.stations?.[station],stationCount=()=>rich()?(items[index]?.stations?.length||1):1;
 function cue(text){live.textContent=text;}
 function form(){
  el.dataset.playerState=state;
  const copy=state==='playing'?'Pause':state==='paused'?'Resume':state==='finished'?'Play again':'Play workflow';
  go.innerHTML=(state==='playing'?pauseGlyph:glyph)+copy;
  prev.disabled=index===0;next.disabled=index===items.length-1;
  again.disabled=state==='ready';
  const scope=plan.branch?.label||'Baseline';
  header.textContent=scope+(motion.matches?' · Static preview':'');
 }
 function unavailable(){
  const ratio=clamp(span/duration());
  try{renderer?.destroy()}catch{}
  renderer=undefined;equipped.replaceChildren();equipped.hidden=true;face.hidden=false;rail.hidden=true;
  station=0;span=ratio*plateDuration;painted=-1;
  el.dataset.playerRender='schematic';
  delete el.dataset.playerStation;delete el.dataset.playerEquipment;delete el.dataset.playerStationKind;
  limits.textContent=location.protocol==='file:'?'Offline view: workflow diagrams are available. Open the online atlas for equipment-model animation.':'Equipment models are unavailable here. This schematic player preserves the route, evidence and handoff controls.';
 }
 function paint(progress){
  const fraction=motion.matches?(state==='finished'?1:0):progress;
  const order=rich()?offsets[index]+station:index;
  bar.style.transform='scaleX('+((order+fraction)/(rich()?total:items.length)).toFixed(4)+')';
  const poseAt=rich()?progress:(motion.matches?1:progress);
  if(rich()){
   if(painted!==poseAt){
    painted=poseAt;
    try{renderer.setProgress(poseAt)}catch{unavailable();show(manualPose);}
   }
  }else pose(parts,items[index].kind,poseAt);
 }
 function updateStations(){
  const scene=current(),count=stationCount(),stations=items[index].stations;
  rail.hidden=false;
  railNote.textContent=count>1?'Station '+(station+1)+' of '+count+' in this handoff':'Station in this handoff';
  if(visibleItem!==index){
   const children=document.createDocumentFragment();
   for(const [i,s] of stations.entries()){
    const b=document.createElement('button');b.type='button';b.dataset.wfStation=String(i);
    b.textContent=(count>1?(i+1)+' · ':'')+s.stationLabel;
    b.setAttribute('aria-label','Station '+(i+1)+': '+s.operation);
    b.title=s.operation;
    children.append(b);
   }
   stationList.replaceChildren(children);visibleItem=index;
  }
  for(const b of stationList.children){
   if(Number(b.dataset.wfStation)===station)b.setAttribute('aria-current','step');
   else b.removeAttribute('aria-current');
  }
  stationLink.replaceChildren();
  const url=actions.stationUrl?.(scene.equipmentUrl);
  if(url){
   const a=document.createElement('a');a.href=url;a.textContent='Open register simulator '+scene.equipmentId+' ↗';
   stationLink.append(a);
  }
  if(scene.independent){
   const note=document.createElement('span');note.textContent='Separate witness';stationLink.append(note);
  }
  el.dataset.playerStation=String(station+1);
  el.dataset.playerEquipment=scene.equipmentId||'';
  el.dataset.playerStationKind=scene.kind;
 }
 function show(final=false){
  const item=items[index],s=item.step,reported=s.status==='external'||item.kind==='boundary'?'external':s.status;
  el.dataset.playerScene=item.kind;el.dataset.playerIndex=String(item.index+1);
  record.textContent='Handoff '+(index+1)+' of '+items.length+' · route step '+String(item.index+1).padStart(2,'0');
  label.className='tag '+(['documented','reference','external'].includes(reported)?reported:'');
  label.textContent=evidenceNames[reported]||'Unclassified step';
  stageTitle.textContent=s.title;
  const detail=String(s.detail||'').trim();
  caption.textContent=detail.length>290?detail.slice(0,286).replace(/\s+\S*$/,'')+'…':detail||lessons[item.kind][1];
  const candidate=list(s.tools);
  context.textContent=reported==='external'?'See the source and limits in the handoff. This player does not supply an undisclosed operation.':(candidate.length?'Register references: '+candidate.join(', ')+'. See the handoff for compatibility and basis.':'No equipment candidate is assigned. Review the handoff for evidence and limits.');
  const scene=current();
  if(rich()&&scene){
   try{renderer.setStep(scene);painted=-1;updateStations();}
   catch{unavailable();}
  }
  if(!rich()){
   face.innerHTML=drawing(item.kind);parts=Object.fromEntries([...face.querySelectorAll('[data-part]')].map(x=>[x.dataset.part,x]));
   face.setAttribute('role','img');face.setAttribute('aria-label',lessons[item.kind][1]);
  }
  paint(final?1:clamp(span/duration()));form();
 }
 function stop(){cancelAnimationFrame(ticket);ticket=0;last=null;}
 function frame(now){
  if(state!=='playing'||!el.isConnected)return;
  if(last!==null)span+=Math.min(100,now-last)*speed;last=now;
  const length=duration();
  if(span>=length){
   paint(1);
   if(index===items.length-1&&station===stationCount()-1){
    span=length;state='finished';paint(1);form();stop();cue('Sequence complete. '+items.length+' applicable handoffs shown.');return;
   }
   span-=length;
   if(station+1<stationCount())station++;
   else{
    index++;station=0;cue('Handoff '+(index+1)+': '+items[index].step.title+'.');
   }
   show();
  }else paint(clamp(span/length));
  ticket=requestAnimationFrame(frame);
 }
 function start(reset=false){
  if(state==='playing'){if(!reset)return;stop();}
  if(reset||state==='finished'){index=0;station=0;span=0;}
  manualPose=false;state='playing';last=null;show();cue('Playing handoff '+(index+1)+': '+items[index].step.title+'.');
  ticket=requestAnimationFrame(frame);
 }
 function pause(){if(state!=='playing')return;stop();state='paused';form();cue('Paused at handoff '+(index+1)+'.');}
 function isManual(i,j){
  stop();state='paused';index=i;station=j;span=0;manualPose=true;show(true);
  cue('Handoff '+(index+1)+': '+items[index].step.title+'. '+(rich()?'Station: '+current().stationLabel+'. ':'')+'Playback is paused.');
 }
 function manual(delta){const i=index+delta;if(i>=0&&i<items.length)isManual(i,0);}
 const onVisibility=()=>{if(document.hidden)pause()};
 const onMotion=()=>{form();paint(manualPose||state==='ready'||state==='finished'?1:clamp(span/duration()))};
 document.addEventListener('visibilitychange',onVisibility);motion.addEventListener?.('change',onMotion);
 go.addEventListener('click',()=>state==='playing'?pause():start());
 prev.addEventListener('click',()=>manual(-1));next.addEventListener('click',()=>manual(1));again.addEventListener('click',()=>start(true));
 pace.addEventListener('change',()=>{speed=Number(pace.value);});
 stationList.addEventListener('click',e=>{
  const b=e.target.closest('button[data-wf-station]');
  if(rich()&&b)isManual(index,Number(b.dataset.wfStation));
 });
 $('#workflow-read').addEventListener('click',()=>{pause();actions.readStep?.(items[index].index)});
 $('.workflow-note').textContent=plan.message;
 unavailable();show();
 if(total&&/^https?:$/.test(location.protocol)){
  el.dataset.playerRender='loading';
  limits.textContent='Loading equipment models. Basic handoff diagrams are available now.';
  loadRenderer().then(mod=>{
   if(dead||!el.isConnected)return;
   const ratio=clamp(span/duration());
   equipped.hidden=false;
   try{
    renderer=mod.mountCleanroom(equipped);
    if(!renderer||['setStep','setProgress','destroy'].some(k=>typeof renderer[k]!=='function'))throw Error('Invalid equipment player');
    face.hidden=true;span=ratio*equipmentDuration;
    el.dataset.playerRender='equipment';
    limits.textContent='Register models are teaching comparisons. Settings show what this handoff controls, not qualified machine values. The same carrier moves only where supported; separate witnesses and external handoffs are marked.';
    show(manualPose||state==='ready'||state==='finished');
   }catch{unavailable();show(manualPose);}
  }).catch(()=>{if(!dead&&el.isConnected){unavailable();show(manualPose);}});
 }
 return {start, destroy(){dead=true;stop();try{renderer?.destroy()}catch{}document.removeEventListener('visibilitychange',onVisibility);motion.removeEventListener?.('change',onMotion);}};
}
const api={makePlan,classify,create};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AtlasWorkflowPlayer=api;
})(globalThis);
