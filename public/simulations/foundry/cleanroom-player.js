/* Display-only cleanroom storyboard. The existing lab owns process state and computation. */
import {getCleanroomModel, sampleCleanroomPose} from './cleanroom-models.js';
import {stageForLab} from './cleanroom-data.js';

const base = new URL('./', import.meta.url);
let cssRequested = false;
const SVG = 'http://www.w3.org/2000/svg';
const phases = ['Transfer','Load','Set up','Run','Unload'];
export const PHASE_ENDS = Object.freeze([.16,.32,.57,.81,1]);
const clamp = (x) => Math.max(0,Math.min(1,Number(x)||0));
export const registerMotion = p => p<=.32 ? clamp(p/.32) : p<=.81 ? 1 : clamp((1-p)/(1-.81));
export const reducedPose = p => [0,.244,.445,.742,1][phaseIndex(p)];
export const phaseIndex = p => Math.max(0, PHASE_ENDS.findIndex(end=>clamp(p)<=end));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
function node(name,attrs={},parent){
  const n=document.createElementNS(SVG,name);
  for(const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
  if(parent) parent.append(n);
  return n;
}
const txt=(n,value)=>{if(n.textContent!==value)n.textContent=value;};
const path=(s,d,fill,stroke='#89a99b',w=1)=>node('path',{d,fill,stroke,'stroke-width':w,'stroke-linejoin':'round'},s);
const rect=(s,x,y,width,height,fill,stroke='none',rx=0)=>node('rect',{x,y,width,height,fill,stroke,rx},s);
const ellipse=(s,cx,cy,rx,ry,fill,stroke='none')=>node('ellipse',{cx,cy,rx,ry,fill,stroke},s);
const label=(s,x,y,t,color='#b9cbc3',size=12)=>{let n=node('text',{x,y,fill:color,'font-size':size,'font-family':'system-ui, sans-serif','font-weight':700},s);n.textContent=t;return n;};

export function effectOf(step){
  if (step.effect) return step.effect;
  const t=(step.operation||'').toLowerCase();
  if(step.kind==='handoff')return 'handoff';
  if(step.kind==='test'||step.kind==='inspection')return 'measure';
  if(/clean|rinse|descum|dehydrat/.test(t))return 'clean';
  if(/dice|dicing|singulat|laser cut|saw |grind|lap|polish|cut |slant/.test(t))return 'dice';
  if(/etch|liftoff|lift.off|strip|release|dissolv/.test(t))return 'etch';
  if(/litho|exposure|align|mask|develop|pattern|writing|writer/.test(t))return 'pattern';
  if(/spin|coating|coat resist/.test(t))return 'coat';
  if(/deposit|sputter|evaporat|plate|cvd|passivat|metall|implant|oxid/.test(t))return 'deposit';
  if(/anneal|cure|hotplate|bake|thermal/.test(t))return 'heat';
  if(/bond|package|laminat|form|join|wind|adhes|assembly|mount|connector|weld|encapsulat/.test(t))return 'assemble';
  if(/inspect|characteri[sz]|test|measur|map |qa|check|record|verify|witness|bench|probe/.test(t))return 'measure';
  return 'none';
}
const toolTypes={
  coat:['Spinner / film station','Chuck','side'],
  pattern:['Patterning / exposure station','Mask or write field','side'],
  deposit:['Film / deposition station','Process chamber','round'],
  etch:['Removal / release station','Process zone','round'],
  dice:['Cut / singulation station','Workholding stage','side'],
  assemble:['Assembly fixture','Fixture','bench'],
  measure:['Inspection / readout station','Sample stage','bench'],
  clean:['Clean / rinse station','Sample carrier','bath'],
  heat:['Thermal station','Sample shelf','round'],
  handoff:['Transfer / external boundary','Transfer tray','transfer'],
  none:['Workflow station','Specimen zone','transfer']
};
function sampleShape(s,spec,fill='#90b9b5',size=1){
  if(spec==='none')return;
  if(spec==='wafer') {
    ellipse(s,0,4,36*size,9*size,'#314849','#8aa9a8');
    ellipse(s,0,0,36*size,9*size,fill,'#c3e1d7');
    path(s,`M ${-6*size} ${8*size} h ${12*size}`,'none','#182a27',2);
  } else if(spec==='die'){
    path(s,`M ${-23*size} 1 l ${18*size} ${-8*size} ${29*size} ${4*size} ${-13*size} ${10*size} Z`,fill,'#c3e1d7');
  } else if(spec==='assembly'){
    path(s,`M ${-26*size} 6 Q ${-5*size} -11 ${18*size} -2 L ${29*size} -7`,'none',fill,6);
    ellipse(s,-24*size,5,4,3,'#ffe6a8');
  } else {
    path(s,`M ${-36*size} 1 l ${25*size} ${-10*size} ${47*size} ${6*size} ${-23*size} ${12*size} Z`,fill,'#c3e1d7');
  }
}
export function specimenOf(value='') {
  const t=value.toLowerCase();
  if(/\bwafer\b/.test(t)&&!/(non.wafer|no wafer|wafer.free)/.test(t))return 'wafer';
  if(/array|shank|pixel|\bdie\b|chip|coupon|block|silicon piece/.test(t))return 'die';
  if(/cuff|stent|carrier lead|tube|assembly|probe|scaffold|laminate|implant|wire/.test(t))return 'assembly';
  return 'film';
}
function visualCue(value=''){
  const t=value.toLowerCase();
  if(/dice|singulat|individual|separate|cut kerf|trenche/.test(t))return 'dice';
  if(/cured|baked|annealed/.test(t))return 'heat';
  if(/metal|gold|platinum|tin|oxide|dielectric|encapsulat|passivat/.test(t))return 'deposit';
  if(/pattern|mask|traces|sites|electrode openings|exposed/.test(t))return 'pattern';
  if(/resist|polyimide|coated|film|layer/.test(t))return 'coat';
  return 'none';
}
function cross(s,spec,e,displayText){
  s.replaceChildren();
  if(spec==='none'){label(s,44,34,'VIRTUAL RECORD ONLY','#a8cdbd',12);return;}
  if(spec==='assembly'){
    const g=node('g',{transform:'translate(123 32) scale(1.65)'},s);
    sampleShape(g,spec,e==='assemble'?'#e8be70':'#9dc8bd');
    if(e==='assemble') for(let i=0;i<5;i++)ellipse(s,95+i*11,34-i,2.3,2.5,'#f0d394');
    return;
  }
  const unit=spec==='die'?41:176,x=spec==='die'?104:31;
  const layer=['coat','pattern','deposit','etch','heat'].includes(e);
  rect(s,x,32,unit,10,'#426966','#a5c0b8',1);
  const film=e==='deposit'?'#ebc171':e==='heat'?'#9bd1ad':'#d38eb1';
  if(layer&&e!=='pattern'&&e!=='etch')rect(s,x,25,unit,7,film,'none',1);
  if(e==='pattern'||e==='etch'||e==='dice'){
    const count=spec==='die'?3:6, pitch=unit/count;
    for(let i=0;i<count;i++){
      if(e==='dice'){ if(i)rect(s,x+i*pitch-1,32,3,10,'#152724'); }
      else rect(s,x+i*pitch+2,24,pitch*.66,e==='etch'?9:8,film,'none',1);
    }
  }
  if(!displayText||/not (published|specified|shown|documented|disclosed)|no fabrication/i.test(displayText)) {
    path(s,`M${x-5} 23 H${x+unit+5}`,'none','#9eb8ac',1);
  }
}
function schematic(s,e,spec,transferFrom){
  s.replaceChildren();
  rect(s,0,0,560,305,'#10211e');
  path(s,'M0 241 H560 L560 305 H0Z','#1a2f2a','none');
  for(let x=-330;x<950;x+=65)path(s,`M280 224 L${x} 305`,'none','#345047',.7);
  for(let y=238;y<306;y+=17)path(s,`M0 ${y} H560`,'none','#345047',.7);
  const [title,seat,style]=(toolTypes[e]||toolTypes.none);
  rect(s,28,31,120,23,'#293f35','#597268',4);label(s,36,47,'CUTAWAY SCHEMATIC','#f9d187',11);
  ellipse(s,363,243,163,24,'#0c1816');
  if(transferFrom){
    path(s,'M25 223 H118 L137 208 H48Z','#465e55','#91ac9c');
    path(s,'M25 223 V234 H119 L137 219 V208 M43 234 V250 M112 234 V250','none','#91ac9c',2);
    label(s,28,266,'INCOMING CARRIER','#a3c1b3',10);
  }
  if(style==='transfer'){
    path(s,'M216 166 383 166 443 143 277 143 Z','#5d7c70','#c0d2c6',1.3);
    path(s,'M216 166 H383 L443 143 V157 L383 182 H216Z','#354c45');
    path(s,'M226 183 V236 H237 V183 M369 182 V236 H380 V182 M424 161 V216 H435 V158','none','#8da79b',2);
    label(s,326,121,seat);
    const wafer=node('g',{},s);sampleShape(wafer,spec);return {wafer,style};
  }
  const front=style==='bench'?147:71;
  path(s,`M259 ${front} L312 ${front-27} H477 L428 ${front}Z`,'#859b92','#a7c1b2',1.2);
  path(s,`M428 ${front} L477 ${front-27} V210 L428 238Z`,'#3a554b','#87a399',1.2);
  rect(s,259,front,169,238-front,'#5a766c','#adc2ba',6);
  rect(s,267,211,150,13,'#344c45','#789488',2);
  rect(s,268,front+12,106,117-(front-71)*.72,'#243a32','#acc4b7',5);
  if(style==='round')ellipse(s,321,142,45,33,'#142825','#acc4b7');
  if(style==='bath') {rect(s,273,157,96,30,'#386e6c','#9bd2c8',2);path(s,'M272 159 Q296 153 319 159 T369 159','none','#83d0c6',1.4);}
  if(style==='bench'){path(s,'M320 83h30v46h-15v44h-14v-39h-16v-13h15Z','#93a99c','#e0eee6');ellipse(s,328,169,21,5,'#475e50','#94ac9d');}
  const rim=path(s,'M268 174 h108 l38-15 h-108z','#a1b5aa','#c1d2ca');
  rect(s,379,front+13,39,34,'#1b3227','#b7c6b7',4);
  rect(s,385,front+20,25,13,'#6da68b','#172e22',2);
  ellipse(s,389,front+39,2.3,2.3,'#e9c77b');ellipse(s,398,front+39,2.3,2.3,'#c1efcd');
  path(s,'M109 206 C146 205 217 191 320 170','none','#75978b',1.8).setAttribute('stroke-dasharray','5 7');
  path(s,'M305 167 l15 3 -12 8','none','#a8bcaf',1.7);
  const zone=node('g',{opacity:0},s);
  if(e==='pattern') {
    path(zone,'M312 111 H344 L355 168 H301 Z','#6caa983f','#b5eccc',1);
    for(let x=304;x<350;x+=8)path(zone,`M${x} 169 l8 -5`,'none','#d5f3ae',1.2);
  } else if(e==='dice'){
    ellipse(zone,327,144,17,18,'#a9c8c3','#effbec');
    path(zone,'M327 127 V161 M310 144 H344 M314 132 L340 156 M339 132 L314 156','none','#355b4f',1.2);
  } else if(e==='deposit'||e==='etch'){
    const hue=e==='deposit'?'#eac171':'#8bcbdd';
    for(let j=0;j<13;j++)ellipse(zone,285+(j*39)%78,119+(j*23)%44,1.8,2.8,hue);
    path(zone,'M284 164 Q323 152 363 164','none',hue,1.2);
  } else if(e==='coat') {
    ellipse(zone,325,167,40,11,'none','#d39abc');
    path(zone,'M288 159 Q314 146 345 156 L344 151 M362 175 Q333 185 308 174 L309 180','none','#e1afd1',2);
  } else if(e==='measure') {
    path(zone,'M331 145 V173 M316 169 H346','none','#bff7e2',2);
  } else ellipse(zone,325,147,38,16,e==='heat'?'#efa776':'#7adbce');
  const wafer=node('g',{},s);sampleShape(wafer,spec);
  const door=node('g',{},s);
  if(style==='side'||style==='round') {
    rect(door,267,front+11,9,126-(front-71)*.72,'#c6d5cd','#7b958a',2);
    rect(door,269,front+42,5,27,'#e6c97e','#355b4d',1);
  }
  label(s,321,266,title,'#e1ede4',12);
  return {wafer,zone,rim,door,style};
}
function pose2D(p,style){
  const load=smooth((p-.10)/.22), out=smooth((p-.81)/.19);
  const sy=style==='transfer'?159:174;
  return {x:mix(mix(78,319,load),158,out),y:mix(mix(223,sy,load),208,out),size:mix(mix(1,.58,load),.9,out)};
}

let worldModule;
function moduleForWorld(){
  return worldModule??=import('./cleanroom-world-3d.js');
}
function displayRecord(value){
  const step=value||{};
  const effect=effectOf(step);
  const spec=step.nonphysical?'none':step.workpieceShape||specimenOf(step.specimen||'');
  const afterSpec=step.outgoingShape||(step.afterSpecimen?specimenOf(step.afterSpecimen):spec);
  const model=step.equipmentId?getCleanroomModel(step.equipmentId):null;
  const shape=spec==='wafer'?'round':['die','panel'].includes(spec)&&step.sizeMm?'square':null;
  const mm=step.sizeMm;
  const canTrack=!!model?.wafer?.poses?.length&&shape;
  const paired=canTrack&&mm?sampleCleanroomPose(model,.5,{shape,diameterMm:mm,sizeMm:mm}):null;
  const fitLimit=paired?.status==='incompatible'?paired.fit.reason:'';
  const imageFits=Boolean(model?.kind==='register-asset'&&canTrack&&mm&&model.handling!=='detached-witness'&&
    (!model.wafer.shape||model.wafer.shape===shape)&&spec===afterSpec&&!['handoff','none'].includes(effect)
    &&paired?.status==='match'&&step.allowModelMotion!==false&&!step.nativeHold);
  return {...step,effect,spec,afterSpec,model,fitLimit,imageFits};
}
export function mountCleanroom(container,{onSpeedChange}={}){
  if(!cssRequested){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=new URL('cleanroom-player.css',base);
    document.head.append(link); cssRequested=true;
  }
  const room=document.createElement('section');room.className='cr-room';room.hidden=true;room.setAttribute('aria-label','Cleanroom walkthrough');
  room.innerHTML=`<header><div class="cr-kicker">Continuous 3D cleanroom</div><h3 class="cr-heading"></h3><div class="cr-status cr-route"></div><div class="cr-source"></div></header>
  <div class="cr-grid"><section class="cr-machine" aria-label="Machine and specimen motion"><div class="cr-viewbar" aria-label="3D camera views" role="group" hidden>
    <button type="button" data-cr-view="follow" aria-pressed="true">Follow specimen</button><button type="button" data-cr-view="room" aria-pressed="false">Room view</button>
    <button type="button" data-cr-view="setup" aria-pressed="false">Operator panel</button>
    <button type="button" data-cr-view="inspect" aria-pressed="false">Inspect 3D stack</button><button type="button" data-cr-view="reticle" aria-pressed="false" hidden>Source reticle</button><button type="button" data-cr-view="register" aria-pressed="false" hidden>Register model</button>
    <button type="button" data-cr-explode aria-pressed="false" hidden>Separate layers</button>
    <button type="button" data-cr-site-focus aria-pressed="false" hidden>Focus selected site</button><button type="button" data-cr-bond-focus aria-pressed="false" hidden>Focus die bond pad</button><button type="button" data-cr-enlarge aria-expanded="false">Enlarge 3D</button><label class="cr-speed" hidden>Tour speed <select aria-label="Tour speed"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
    </div><div class="cr-visual"><div class="cr-loading">Opening the 3D cleanroom…</div><div class="cr-artifact-label" aria-hidden="true" hidden></div><div class="cr-reticle-key" hidden></div><div class="cr-inset-label" aria-hidden="true">Magnified · 3D</div><div class="cr-cutaway-label" aria-hidden="true">Chamber cutaway · symbolic process cue</div><div class="cr-inspect-labels" hidden><span>Incoming 3D specimen</span><span>Outgoing 3D specimen</span></div><svg viewBox="0 0 560 305" aria-hidden="true"></svg></div><ol class="cr-phases" aria-label="Station sequence">${phases.map(x=>`<li>${x}</li>`).join('')}</ol><div class="cr-status cr-caption"></div><button type="button" class="cr-retry" hidden>Retry 3D</button></section>
  <section class="cr-controls" aria-label="Process programming"><h4></h4><p class="cr-status cr-command"></p><dl></dl></section></div>
  <div class="cr-compare"><div class="cr-card"><div class="cr-kicker">Incoming specimen</div><svg viewBox="0 0 240 58" aria-hidden="true"></svg><p></p></div><div class="cr-card"><div class="cr-kicker">Outgoing specimen</div><svg viewBox="0 0 240 58" aria-hidden="true"></svg><p class="cr-result"></p></div></div>
  <p class="cr-qualify"></p><dialog class="cr-dialog" aria-label="Enlarged 3D cleanroom"></dialog>`;
  container.append(room);
  const q=s=>room.querySelector(s),visual=q('.cr-visual'),svg=q('.cr-visual svg'),source=q('.cr-source'),caption=q('.cr-caption'),result=q('.cr-result');
  const bar=q('.cr-viewbar'),visualLoading=q('.cr-loading'),inspectLabels=q('.cr-inspect-labels'),artifactLabel=q('.cr-artifact-label'),reticleKey=q('.cr-reticle-key');
  const modeButtons=[...bar.querySelectorAll('[data-cr-view]')],explodeButton=q('[data-cr-explode]'),speedControl=q('.cr-speed');
  const dialog=q('.cr-dialog'),machine=q('.cr-machine'),enlargeButton=q('[data-cr-enlarge]'),retry=q('.cr-retry'),siteButton=q('[data-cr-site-focus]'),bondButton=q('[data-cr-bond-focus]');
  const machineAnchor=document.createComment('3D viewport home');machine.before(machineAnchor);
  if(typeof dialog.showModal!=='function')enlargeButton.hidden=true;
  function restoreViewport(){
    if(machine.parentNode===dialog)machineAnchor.after(machine);
    enlargeButton.setAttribute('aria-expanded','false');txt(enlargeButton,'Enlarge 3D');
    requestAnimationFrame(()=>world?.refreshViewport());
  }
  dialog.addEventListener('close',restoreViewport);
  enlargeButton.addEventListener('click',()=>{
    if(dialog.open){dialog.close();return;}
    dialog.append(machine);
    try{
      dialog.showModal();
      enlargeButton.setAttribute('aria-expanded','true');txt(enlargeButton,'Exit enlarged view');
      enlargeButton.focus({preventScroll:true});
      requestAnimationFrame(()=>world?.refreshViewport());
    }catch{restoreViewport();}
  });
  if(typeof onSpeedChange==='function'){speedControl.hidden=false;speedControl.lastElementChild.addEventListener('change',e=>onSpeedChange(Number(e.target.value)));}
  const [cardIn,cardOut]=room.querySelectorAll('.cr-card svg'),chips=[...room.querySelectorAll('.cr-phases li')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let world=null,initializing=false,failed=false,disposed=false,prepared=[],art=null,step={},model=null,stepProgress=0,e='none',spec='film',afterSpec='film',last=-1,programRow=-2,formChanged=false,fitLimit='',mode='follow',exploded=false,siteFocused='whole';
  function fallback(){
    if(disposed)return;
    failed=true;world?.dispose();world=null;
    if(dialog.open)dialog.close();
    room.dataset.render='schematic';bar.hidden=true;inspectLabels.hidden=true;visualLoading.hidden=true;visual.removeAttribute('tabindex');retry.hidden=false;
    txt(caption,'2D accessibility fallback · this browser could not start the 3D viewer');
  }
  function updateMode(){
    for(const b of modeButtons)b.setAttribute('aria-pressed',String(b.dataset.crView===mode));
    inspectLabels.hidden=mode!=='inspect';
    explodeButton.hidden=mode!=='inspect';
    explodeButton.setAttribute('aria-pressed',String(exploded));
    txt(explodeButton,exploded?'Stack layers':'Separate layers');
    room.dataset.view=mode;
  }
  function updateWorldStatus({render,hasExact,hasReticle,canInspect,canExplode,assetFailed}={}){
    if(disposed||failed)return;
    room.dataset.render=render||'teaching-3d';bar.hidden=false;visualLoading.hidden=true;retry.hidden=true;
    const m=world?.getState().mode;
    if(m)mode=m;
    modeButtons.find(x=>x.dataset.crView==='inspect').hidden=!canInspect;
    modeButtons.find(x=>x.dataset.crView==='register').hidden=!hasExact;
    modeButtons.find(x=>x.dataset.crView==='reticle').hidden=!hasReticle;
    updateMode();
    explodeButton.disabled=!canExplode;
    explodeButton.title=canExplode?'Separate supported layers vertically':'No separate layer spacing is supported for these states';
    artifactLabel.hidden=!step.specimenIdentity?.label||mode==='inspect'||mode==='register'||mode==='setup';
    reticleKey.hidden=mode!=='reticle';
    const mapping=world?.getState().mapping;
    let sourceSite=mode==='reticle'&&!!mapping&&step.surfaceFeatures?.reticleStage64D>=3;
    siteButton.hidden=bondButton.hidden=!sourceSite;
    siteButton.setAttribute('aria-pressed',String(siteFocused==='site'));
    bondButton.setAttribute('aria-pressed',String(siteFocused==='bond'));
    txt(siteButton,siteFocused==='site'?'Show full reticle':'Focus selected site');
    txt(bondButton,siteFocused==='bond'?'Show full reticle':'Focus die bond pad');
    txt(reticleKey,mapping?'CH '+mapping.channel+' · '+mapping.face+' PCB pin '+mapping.connectorPin+' · Intan index '+mapping.amplifierZero+ ' (0-based)'+(siteFocused==='site'?' · 90 µm recording-site detail':siteFocused==='bond'?' · 180 µm die-pad detail':''):'Source reticle witness · before pattern transfer where applicable');
    const fit=step.nativeHold?'Native simulation hold · '+step.nativeHold:fitLimit?'Fit gate · '+fitLimit:step.kind==='unknown'?'External evidence boundary · no local process shown':
      render==='register'?'Original 3D Equipment Register model · modeled dry handling':
      assetFailed?'Register model unavailable · 3D teaching fixture shown':'3D teaching fixture · not an as-built machine';
    txt(caption,mode==='reticle'?'Source mask witness · target geometry, not measured yield. Cyan marks the selected circuit; buried traces are diagnostic.':mode==='register'?'Original 3D register exterior · no specimen is processed in this view':
      mode==='inspect'?(exploded?'Layer spacing and thickness are exaggerated. Only layers present in the teaching model are separated.':'Drag either 3D sample to rotate both. Layer height and feature width are enlarged.'):
      mode==='setup'?'Virtual operator panel · shows documented or simulated inputs, not vendor operating instructions':fit);
  }
  function ensureWorld(){
    if(world||initializing||failed||disposed)return;
    initializing=true;room.dataset.render='loading-3d';visualLoading.hidden=false;retry.hidden=true;
    moduleForWorld().then(({createCleanroomWorld})=>{
      if(disposed)return;
      world=createCleanroomWorld(visual,{onFailure:fallback,onState:updateWorldStatus});
      if(!world){fallback();return;}
      world.prepare(prepared);
      if(art){world.setStep(step);world.setProgress(viewProgress(),reduced.matches);}
    }).catch(fallback).finally(()=>{initializing=false;});
  }
  retry.addEventListener('click',()=>{
    if(disposed||initializing)return;
    failed=false;worldModule=null;mode='follow';exploded=false;updateMode();
    visual.setAttribute('tabindex','0');ensureWorld();
  });
  function viewProgress(){
    return reduced.matches?reducedPose(stepProgress):stepProgress;
  }
  function setStep(value){
    step=displayRecord(value);room.hidden=false;
    last=-1;programRow=-2;stepProgress=0;
    ({effect:e,spec,afterSpec,model,fitLimit}=step);
    formChanged=spec!==afterSpec;
    const name=step.machine||model?.title||toolTypes[e]?.[0]||toolTypes.none[0];
    const id=step.specimenIdentity;
    txt(artifactLabel,id?.label?'Tracked field '+id.label+(id.channel?' · CH '+id.channel:''):'');
    room.dataset.artifactIdentity=id?.label||'';
    txt(q('.cr-heading'),name);
    txt(q('.cr-route'),[step.transferFrom?'From '+step.transferFrom:'',id?.label?'Tracked field '+id.label:'',step.specimen,step.operation].filter(Boolean).join(' · '));
    source.replaceChildren();
    const href=model?.sourceUrl||(step.equipmentId?'/simulations/equipment/?id='+encodeURIComponent(step.equipmentId):'');
    if(href){
      source.append(document.createTextNode((step.equipmentId||'Equipment Register')+' · '));
      const link=document.createElement('a');link.href=href;link.textContent='Open Equipment Register';source.append(link);
    }else txt(source,'No specific machine assigned in the evidence.');
    art=schematic(svg,fitLimit?'handoff':e,spec,step.transferFrom);
    const change=step.kind!=='test'&&step.kind!=='inspection'&&!['none','handoff','measure','clean'].includes(e)&&!!step.after&&step.before!==step.after;
    if(formChanged||change){
      art.outgoing=node('g',{},svg);
      sampleShape(art.outgoing,afterSpec,({coat:'#d38eb1',deposit:'#ebc171',heat:'#a5cb9c',pattern:'#bca1d9',etch:'#9fc4d0',dice:'#bef3d9',assemble:'#dfbb78'})[e]||'#9ec5b9');
      if(e==='pattern'||e==='etch'||e==='dice')for(let i=-14;i<18;i+=7)path(art.outgoing,`M${i} -4 l-3 8`,'none','#406966',1);
    }
    if(!world)txt(caption,failed?'2D accessibility fallback · this browser could not start the 3D viewer':'Loading 3D models and specimen geometry…');
    txt(q('.cr-controls h4'),(fitLimit||e==='handoff')?'Transfer gate':e==='measure'?'Inspection / readout setup':'Operator setup');
    const settings=q('.cr-controls dl');settings.replaceChildren();
    const rows=(step.settings||[]).filter(x=>Array.isArray(x)&&x.length===2);
    for(const [k,v] of rows.length?rows:[['Operation',step.operation||'Not specified'],['Recipe / settings','Not disclosed or not specified for this stage']]){
      const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      txt(dt,k);txt(dd,String(v));div.append(dt,dd);settings.append(div);
    }
    txt(q('.cr-card p'),step.before||'Incoming state not specified.');
    txt(result,step.after||'No outgoing change is specified.');
    cross(cardIn,spec,visualCue(step.before||''),step.before);
    const stateChanges=step.kind!=='test'&&step.kind!=='inspection'&&!['none','handoff','measure','clean'].includes(e)&&!!step.after&&step.before!==step.after;
    cross(cardOut,afterSpec,stateChanges?e:visualCue(step.before||''),step.after);
    txt(q('.cr-qualify'),[
      step.evidence||'Illustrative operation only. No missing production recipe is inferred.',
      step.nativeWitness?.summary?'Native candidate: '+step.nativeWitness.summary+'.':'',
      fitLimit?'The outgoing card describes the modeled or published target, not a result of this mismatched register fixture.':'',model?.limit||'', 'Motion and cross-sections are illustrative, not to scale. '+(step.context==='atlas'?'The Atlas shows evidence and handoffs, not physical production.':'The lab’s native controls run the process model.')
    ].filter(Boolean).join(' '));
    if(mode==='register'||(mode==='inspect'&&spec==='none'))mode='follow';
    updateMode();
    if(world)world.setStep(step);
    else ensureWorld();
    setProgress(0);
  }
  function setMode(next){
    if(!world)return;
    if(next==='inspect'&&spec==='none')return;
    world.setMode(next);
    const state=world.getState();mode=state.mode;
    updateWorldStatus({render:state.model,hasExact:state.hasExact,hasReticle:state.hasReticle,canExplode:state.canExplode,assetFailed:state.assetFailed,canInspect:spec!=='none'});
  }
  for(const b of modeButtons)b.addEventListener('click',()=>setMode(b.dataset.crView));
  function focusCircuit(part){
    if(!world||mode!=='reticle'||!world.getState().mapping)return;
    siteFocused=siteFocused===part?'whole':part;world.setSiteFocus(siteFocused);const state=world.getState();
    updateWorldStatus({render:state.model,hasExact:state.hasExact,hasReticle:state.hasReticle,canExplode:state.canExplode,assetFailed:state.assetFailed,canInspect:spec!=='none'});
  }
  siteButton.addEventListener('click',()=>focusCircuit('site'));
  bondButton.addEventListener('click',()=>focusCircuit('bond'));
  explodeButton.addEventListener('click',()=>{
    if(!world||mode!=='inspect'||!world.getState().canExplode)return;
    exploded=!exploded;world.setExploded(exploded);const state=world.getState();
    updateWorldStatus({render:state.model,hasExact:state.hasExact,hasReticle:state.hasReticle,canExplode:state.canExplode,assetFailed:state.assetFailed,canInspect:true});
  });
  visual.addEventListener('keydown',ev=>{
    if(!world)return;
    const map={ArrowLeft:[-.14,0,0],ArrowRight:[.14,0,0],ArrowUp:[0,-.1,0],ArrowDown:[0,.1,0],'+':[0,0,-.12],'-':[0,0,.12]};
    if(map[ev.key]){ev.preventDefault();world.adjust(...map[ev.key]);}
    if(ev.key==='Home'){ev.preventDefault();world.resetCamera();}
  });
  visual.setAttribute('tabindex','0');
  visual.setAttribute('aria-label','3D viewport. Drag or use arrow keys to orbit; pinch or use plus and minus to zoom; Home resets the camera.');
  function setProgress(value){
    if(!art)return;
    const p=stepProgress=clamp(value),i=phaseIndex(p), drawP=reduced.matches?reducedPose(p):p;
    room.dataset.phase=phases[i].toLowerCase();
    if(i!==last){
      last=i;
      chips.forEach((ch,k)=>{ch.classList.toggle('cr-active',k===i);if(k===i)ch.setAttribute('aria-current','step');else ch.removeAttribute('aria-current');});
      const command=step.nativeHold
        ? ['Bring the specimen to the modeled check.','Keep the specimen supported.','Review the native simulation result.','Hold: '+step.nativeHold,'No qualified outgoing workpiece is inferred.']
        : fitLimit
        ? ['Carry the incoming specimen to the fit gate.','Stop before inserting the specimen.','Compare the workpiece and fixture dimensions.','No process runs on this fixture.','Review the expected output separately from this equipment check.']
        : e==='none'&&step.kind==='unknown'
        ? ['Identify the current workflow boundary.','No supported machine insertion.','Review what is and is not known.','No process is animated.','Do not infer material changes from this checkpoint.']
        : spec==='none'
        ? ['Open the current virtual record.','No physical specimen is loaded.','Review the software or fixture controls.','Show the modeled calculation or review.','Review the outgoing virtual record.']
        : e==='handoff'
        ? ['Bring the specimen to the boundary.','Stage the specimen in a transfer carrier.','Verify the handoff conditions.','Hold at the evidence boundary.','Show only the stated outgoing specimen.']
        : ['Carry the incoming specimen to this station.','Seat the specimen in the illustrated holder.','Review the known controls and recipe limits.','Run the modeled operation.','Remove the specimen and compare the result.'];
      const carrier=step.surfaceFeatures;
      const detail=carrier?.carrierBefore===false&&carrier?.carrierAfter===true&&i===3?'Turn the selected wafer front-side down onto the temporary support.':
        carrier?.carrierBefore===true&&carrier?.carrierAfter===false&&i===3?'Separate the selected die from its temporary carrier, then inspect the released die on its own.':
        carrier?.carrierBefore===true&&carrier?.carrierAfter===true&&i===4?'Unload the workpiece with its support still attached.':command[i];
      txt(q('.cr-command'),detail);

      result.closest('.cr-card').dataset.revealed=String(i===4);
      cardOut.style.opacity=i<4?.38:1;
    }
    const lines=q('.cr-controls dl').children;
    const row=i<2?-1:i>2?lines.length:Math.min(lines.length-1,Math.floor(clamp((p-.32)/.25)*lines.length));
    if(row!==programRow){
      programRow=row;
      Array.from(lines).forEach((n,k)=>{
        n.classList.toggle('cr-pending',k>row);
        n.classList.toggle('cr-entered',k===row&&i===2);
      });
    }
    const {x,y,size}=pose2D(e==='none'&&step.kind==='unknown'?0:drawP,art.style), transform=`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${size.toFixed(3)})`;
    art.wafer.setAttribute('transform',transform);
    if(art.outgoing){
      art.outgoing.setAttribute('transform',transform);
      art.wafer.setAttribute('opacity',drawP>.82?0:1);art.outgoing.setAttribute('opacity',drawP>.82?1:0);
    }
    if(art.door)art.door.setAttribute('transform',`translate(${-12*smooth(drawP/.24)+12*smooth((drawP-.38)/.19)-11*smooth((drawP-.8)/.15)} 0)`);
    if(art.zone)art.zone.setAttribute('opacity',(drawP>=.57&&drawP<.81)?(reduced.matches?.5:.20+.42*Math.sin(Math.PI*(drawP-.57)/.24)):0);
    world?.setProgress(drawP,reduced.matches);
  }
  function reveal(){
    if(disposed)return;
    const run=()=>requestAnimationFrame(()=>{
      const box=visual.getBoundingClientRect();
      if(box.bottom>innerHeight+22||box.top<12)visual.scrollIntoView({block:'center',behavior:'instant'});
    });
    const stylesheet=document.querySelector('link[href$="cleanroom-player.css"]');
    if(stylesheet&&!stylesheet.sheet)stylesheet.addEventListener('load',run,{once:true});
    else run();
  }
  function onMotion(){setProgress(stepProgress);}
  reduced.addEventListener?.('change',onMotion);
  return {
    setStep,setProgress,setMode,reveal,
    prepare(steps=[]){prepared=steps.map(displayRecord);world?.prepare(prepared);},
    reset(){prepared=[];mode='follow';exploded=false;siteFocused='whole';world?.reset();updateMode();},
    getState(){return world?.getState()||{mode,hasWebGL:false,phase:stepProgress,render:room.dataset.render};},
    destroy(){if(disposed)return;disposed=true;if(dialog.open)dialog.close();reduced.removeEventListener?.('change',onMotion);world?.dispose();room.remove();}
  };
}
export const LAB_STAGE_MS=7000;
// A shader compile can stall a frame. Preserve a visible checkpoint without
// making the rest of an ordinary 7-second station crawl on a slow browser.
export function displayElapsed(delta,duration,rate=1){
  return Math.max(0,Math.min(280,delta,duration*.12/rate))*rate;
}
export function mountLabCleanroom(container,slug,opts){
  const player=mountCleanroom(container,opts);
  let key='',previous=null,active=null,planned=false;
  function prime(branch){
    const total={'utah-array-fabrication':5,'utah-slant-compare':6,'neuropixels-foundry':20,
      'masmanidis-64d-foundry':18,'neuropixels-family':5,'flex-rigid-ecog-foundry':16,
      'ptnrgrid-foundry':19,'graphene-stack-compare':12,'mesh-electronics-foundry':10,'neurogrid-oect-foundry':8}[slug];
    if(total)player.prepare(Array.from({length:total},(_,index)=>({...stageForLab(slug,index,{branch}),trackKey:slug+':'+index})));
    planned=true;
  }
  return {
    paint(index,p,details={}){
      const signature=JSON.stringify([index,details]);
      if(active&&details.branch!==active.branch){
        player.reset();planned=false;previous=null;active=null;key='';
      }
      if(!planned)prime(details.branch);
      if(signature!==key){
        let stage=stageForLab(slug,index,details);
        if(active&&active.index!==index)previous=active.stage;
        stage={...stage,trackKey:slug+':'+(slug==='rolled-microchannels-foundry'?(details.phaseId||index):index),transferFrom:stage.transferFrom||(previous?.machine||'')};
        player.setStep(stage);
        active={index,stage,branch:details.branch};
        key=signature;
      }
      player.setProgress(p);
    },
    getState:player.getState,reveal:player.reveal,
    reset(){key='';previous=null;active=null;planned=false;player.reset();},
    destroy:player.destroy,
  };
}
/* Clock used by lab players that previously advanced only via setTimeout. */
export function mountTimedCleanroom(container,slug,options={}){
  let raf=0,start=0,loadedAt=0,opened=false,elapsed=0,duration=LAB_STAGE_MS,index=0,details={},live=false,done=null,inProgress=false,rate=1;
  const setRate=value=>{
    if(![.5,1,2].includes(value))return;
    if(live&&start){
      const now=performance.now();
      elapsed=Math.min(duration,elapsed+displayElapsed(now-start,duration,rate));
      start=now;
    }
    rate=value;
  };
  const lab=mountLabCleanroom(container,slug,{onSpeedChange:options.speed===false?undefined:setRate});
  const update=t=>{
    if(!live)return;
    if(!loadedAt)loadedAt=t;
    if((lab.getState().render==='loading-3d'||lab.getState().hasWebGL&&!lab.getState().hasPresented)&&t-loadedAt<4500){raf=requestAnimationFrame(update);return;}
    if(start)elapsed+=displayElapsed(t-start,duration,rate);
    start=t;
    const u=Math.min(duration,elapsed);
    lab.paint(index,u/duration,details);
    if(u<duration){raf=requestAnimationFrame(update);return;}
    live=false;inProgress=false;start=0;elapsed=0;const cb=done;done=null;cb?.();
  };
  return {
    start(i,value,callback,time=LAB_STAGE_MS){cancelAnimationFrame(raf);index=i;details=value;done=callback;duration=time;start=0;loadedAt=0;elapsed=0;inProgress=true;live=true;lab.paint(index,0,details);if(!opened){opened=true;lab.reveal();}raf=requestAnimationFrame(update);},
    pause(){if(!live)return;elapsed+=start?displayElapsed(performance.now()-start,duration,rate):0;start=0;live=false;cancelAnimationFrame(raf);},
    resume(){if(!inProgress)return false;live=true;raf=requestAnimationFrame(update);return true;},
    preview(i,value){cancelAnimationFrame(raf);live=false;inProgress=false;done=null;lab.paint(i,1,value);},
    reset(){cancelAnimationFrame(raf);live=false;inProgress=false;done=null;lab.reset();}
  };
}
