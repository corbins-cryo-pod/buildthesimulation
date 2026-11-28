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

let webglAvailable;
let glLoader;
function getWebgl(){
  if(webglAvailable===undefined){
    try{
      const c=document.createElement('canvas');
      const gl=c.getContext('webgl2');
      webglAvailable=!!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    }catch{webglAvailable=false;}
  }
  return webglAvailable;
}
function moduleForAsset(){
  return glLoader ??= Promise.all([
    import('/vendor/three/three.module.js'),
    import('./cleanroom-gltf.js')
  ]);
}
export function mountCleanroom(container){
  if(!cssRequested){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=new URL('cleanroom-player.css',base);
    document.head.append(link); cssRequested=true;
  }
  const room=document.createElement('section');room.className='cr-room';room.hidden=true;room.setAttribute('aria-label','Cleanroom walkthrough');
  room.innerHTML=`<header><div class="cr-kicker">Cleanroom walkthrough</div><h3 class="cr-heading"></h3><div class="cr-status cr-route"></div><div class="cr-source"></div><button class="cr-model-toggle" type="button" hidden>View register model</button></header>
  <div class="cr-grid"><section class="cr-machine" aria-label="Machine and specimen motion"><div class="cr-visual"><svg viewBox="0 0 560 305" aria-hidden="true"></svg></div><ol class="cr-phases" aria-label="Station sequence">${phases.map(x=>`<li>${x}</li>`).join('')}</ol><div class="cr-status cr-caption"></div></section>
  <section class="cr-controls" aria-label="Process programming"><h4></h4><p class="cr-status cr-command"></p><dl></dl></section></div>
  <div class="cr-compare"><div class="cr-card"><div class="cr-kicker">Incoming specimen</div><svg viewBox="0 0 240 58" aria-hidden="true"></svg><p></p></div><div class="cr-card"><div class="cr-kicker">Outgoing specimen</div><svg viewBox="0 0 240 58" aria-hidden="true"></svg><p class="cr-result"></p></div></div>
  <p class="cr-qualify"></p>`;
  container.append(room);
  const q=s=>room.querySelector(s),visual=q('.cr-visual'),svg=q('.cr-visual svg'),source=q('.cr-source'),caption=q('.cr-caption'),result=q('.cr-result');
  const toggle=q('.cr-model-toggle');
  const [cardIn,cardOut]=room.querySelectorAll('.cr-card svg'),chips=[...room.querySelectorAll('.cr-phases li')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let token=0,scene=null,art=null,step={},model=null,stepProgress=0,e='none',spec='film',afterSpec='film',last=-1,programRow=-2,formChanged=false,modelOnly=false,fitLimit='';
  function clear3D(){
    token++;
    if(scene){scene.free();scene=null;}
    svg.hidden=false;
  }
  async function open3D(config,animation=true){
    if(!config.assetUrl||(animation&&!config.wafer?.poses?.length)) return;
    if(!getWebgl()){txt(caption,'Cutaway schematic · WebGL is unavailable on this device');return;}
    const serial=token;
    let renderer;
    try{
      let [T, {GLTFLoader}]=await moduleForAsset();
      if(serial!==token)return;
      const gltf=await new GLTFLoader().loadAsync(config.assetUrl);
      const disposeModel=o=>{o.traverse(n=>{if(n.isMesh){
        n.geometry?.dispose();for(const material of [n.material].flat().filter(Boolean)){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}
      }});};
      if(serial!==token){disposeModel(gltf.scene);return;}
      renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
      const world=new T.Scene();world.background=new T.Color(0x1a2d27);
      const station=gltf.scene, rot=config.assetRotation||[0,0,0], off=config.assetOffset||[0,0,0];
      station.rotation.set(...rot);
      station.position.set(...off);
      if(Array.isArray(config.assetScale)) station.scale.set(...config.assetScale);
      else station.scale.setScalar(config.assetScale||1);
      world.add(station);
      for(const name of animation?config.hideNodes||[]:[]){const n=station.getObjectByName(name);if(n)n.visible=false;}
      world.add(new T.HemisphereLight(0xfdf9e2,0x496459,2.55));
      const key=new T.DirectionalLight(0xe1f9e9,3);key.position.set(2,4,3);world.add(key);
      const fill=new T.DirectionalLight(0xffeeb8,1.25);fill.position.set(-3,3,-2);world.add(fill);
      const box=new T.Box3().setFromObject(station), floor=new T.GridHelper(Math.max(2.8,3*box.getSize(new T.Vector3()).length()),24,0x7f9e8b,0x3b584c);
      floor.position.set((box.min.x+box.max.x)/2,box.min.y-.012,(box.min.z+box.max.z)/2); world.add(floor);
      const camera=new T.PerspectiveCamera(35,1,.00002,70), target=config.camera?.target||[0,.6,0];
      if(!animation||config.camera?.autoFit){
        const center=box.getCenter(new T.Vector3()), rad=box.getSize(new T.Vector3()).length()*.5;
        camera.position.copy(center).add(new T.Vector3(1.32,.95,2.2).multiplyScalar(Math.max(.01,rad)));
        camera.lookAt(center);
      }else {camera.position.set(...(config.camera?.eye||[2,1.55,2]));camera.lookAt(...target);}
      const mm1=Number(step.sizeMm||config.wafer.nominalMm)||100;
      const dia=mm1*.001,shape=spec==='wafer'?'round':'square';
      const dims={shape,diameterMm:shape==='round'?mm1:undefined,sizeMm:shape==='square'?mm1:undefined};
      const geometry=shape==='round'?new T.CylinderGeometry(dia*.5,dia*.5,Math.max(.0008,dia*.01),64):new T.BoxGeometry(dia,Math.max(.0008,dia*.01),dia);
      const plate=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x93bbb5,roughness:.26,metalness:.17,emissive:0x203f39}));
      world.add(plate);
      renderer.domElement.setAttribute('aria-hidden','true');visual.append(renderer.domElement);
      const draw=p=>{
        const {position,rotation,visible,nodeOps}=(animation&&sampleCleanroomPose(config,registerMotion(p),dims)) || {};
        for(const op of nodeOps||[]){
          const n=station.getObjectByName(op.name);if(!n)continue;
          if(op.position)n.position.set(...op.position);
          if(op.rotation)n.rotation.set(...op.rotation);
          if(op.visible!==undefined)n.visible=op.visible;
        }
        if(position)plate.position.set(...position); if(rotation)plate.rotation.set(...rotation);
        plate.visible=visible!==false&&!!position;
        plate.material.color.set(p>.8&&e!=='measure'&&e!=='none'?0xe9bd70:0x9bd7cc);
        const w=visual.clientWidth,h=visual.clientHeight;if(!w||!h)return;
        if(camera.aspect!==w/h){camera.aspect=w/h;camera.updateProjectionMatrix();}
        const r=renderer.getSize(new T.Vector2());if(r.x!==w||r.y!==h)renderer.setSize(w,h,false);
        renderer.render(world,camera);
      };
      const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>draw(stepProgress)):null;
      observer?.observe(visual);
      scene={draw,free(){
        observer?.disconnect();disposeModel(station); plate.material.dispose();plate.geometry.dispose();floor.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
      }};
      renderer.domElement.addEventListener('webglcontextlost',()=>{if(token===serial){
        clear3D();room.dataset.render='schematic';txt(caption,'Schematic fallback. The register model could not stay active on this device.');
      }});
      svg.hidden=true;
      txt(caption,animation?('3D Equipment Register model · '+(step.sizeMm?step.sizeMm+' mm virtual specimen':config.wafer.nominalMm+' mm Register demonstration specimen; workflow size not specified')+' · simplified dry motion'):'Original 3D Equipment Register model · inspection only; loading path not verified');
      room.dataset.render='register';
      draw(stepProgress);
    }catch{
      renderer?.dispose();if(serial===token)txt(caption,'Schematic fallback. The register model could not load on this device.');
    }
  }
  function setStep(value){
    step=value||{};room.hidden=false;clear3D();room.dataset.render='schematic';modelOnly=false;last=-1;programRow=-2;stepProgress=0;e=effectOf(step);
    spec=step.nonphysical?'none':step.workpieceShape||specimenOf(step.specimen||'');
    afterSpec=step.outgoingShape||(step.afterSpecimen?specimenOf(step.afterSpecimen):spec);
    formChanged=spec!==afterSpec;
    model=step.equipmentId ? getCleanroomModel(step.equipmentId) : null;
    const fitShape=spec==='wafer'?'round':spec==='die'&&step.sizeMm?'square':null;
    let imageFits=model?.kind==='register-asset'&&!!model.wafer?.poses?.length&&model.handling!=='detached-witness'&&fitShape&&(!model.wafer.shape||model.wafer.shape===fitShape)&&!formChanged&&!['handoff','none'].includes(e);
    fitLimit='';
    if(model?.wafer?.poses?.length&&fitShape&&step.sizeMm){
      const posed=sampleCleanroomPose(model,.5,{shape:fitShape,diameterMm:step.sizeMm,sizeMm:step.sizeMm});
      if(posed?.status==='incompatible')fitLimit=posed.fit.reason;
      if(!posed?.position||posed.visible===false) imageFits=false;
    }
    const name=step.machine||model?.title||toolTypes[e]?.[0]||toolTypes.none[0];
    txt(q('.cr-heading'),name);
    txt(q('.cr-route'),[step.transferFrom?'From '+step.transferFrom:'',step.specimen,step.operation].filter(Boolean).join(' · '));
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
    txt(caption,fitLimit?'Fit gate · '+fitLimit:imageFits?'Schematic while 3D is available to load · modeled loading path':'Cutaway schematic · not a claim about actual machine internals');
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
      fitLimit?'The outgoing card describes the modeled or published target, not a result of this mismatched register fixture.':'',model?.limit||'', 'Motion and cross-sections are illustrative, not to scale. '+(step.context==='atlas'?'The Atlas shows evidence and handoffs, not physical production.':'The lab’s native controls run the process model.')
    ].filter(Boolean).join(' '));
    toggle.hidden=!model?.assetUrl||!!imageFits;
    txt(toggle,'View register model');
    toggle.setAttribute('aria-pressed','false');
    setProgress(0);
    if(imageFits)open3D(model);
  }
  toggle.addEventListener('click',()=>{
    if(!model?.assetUrl)return;
    modelOnly=!modelOnly;clear3D();room.dataset.render='schematic';
    toggle.setAttribute('aria-pressed',String(modelOnly));
    txt(toggle,modelOnly?'Return to loading animation':'View register model');
    if(modelOnly)open3D(model,false);
    else txt(caption,'Cutaway schematic · no verified loading path for this specimen');
  });
  function setProgress(value){
    if(!art)return;
    const p=stepProgress=clamp(value),i=phaseIndex(p), drawP=reduced.matches?(i>=4?1:i>=1?.4:0):p;
    room.dataset.phase=phases[i].toLowerCase();
    if(i!==last){
      last=i;
      chips.forEach((ch,k)=>{ch.classList.toggle('cr-active',k===i);if(k===i)ch.setAttribute('aria-current','step');else ch.removeAttribute('aria-current');});
      const command=fitLimit
        ? ['Carry the incoming specimen to the fit gate.','Stop before inserting the specimen.','Compare the workpiece and fixture dimensions.','No process runs on this fixture.','Review the expected output separately from this equipment check.']
        : e==='none'&&step.kind==='unknown'
        ? ['Identify the current workflow boundary.','No supported machine insertion.','Review what is and is not known.','No process is animated.','Do not infer material changes from this checkpoint.']
        : spec==='none'
        ? ['Open the current virtual record.','No physical specimen is loaded.','Review the software or fixture controls.','Show the modeled calculation or review.','Review the outgoing virtual record.']
        : e==='handoff'
        ? ['Bring the specimen to the boundary.','Stage the specimen in a transfer carrier.','Verify the handoff conditions.','Hold at the evidence boundary.','Show only the stated outgoing specimen.']
        : ['Carry the incoming specimen to this station.','Seat the specimen in the illustrated holder.','Review the known controls and recipe limits.','Run the modeled operation.','Remove the specimen and compare the result.'];
      txt(q('.cr-command'),command[i]);

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
    scene?.draw(drawP);
  }
  function onMotion(){setProgress(stepProgress);}
  reduced.addEventListener?.('change',onMotion);
  return {setStep,setProgress,destroy(){reduced.removeEventListener?.('change',onMotion);clear3D();room.remove();}};
}
export const LAB_STAGE_MS=7000;
export function mountLabCleanroom(container,slug){
  const player=mountCleanroom(container);
  let key='',previous=null,active=null;
  return {
    paint(index,p,details={}){
      const signature=JSON.stringify([index,details]);
      if(signature!==key){
        let stage=stageForLab(slug,index,details);
        if(active&&active.index!==index)previous=active.stage;
        stage={...stage,transferFrom:stage.transferFrom||(previous?.machine||'')};
        player.setStep(stage);
        active={index,stage};
        key=signature;
      }
      player.setProgress(p);
    },
    reset(){key='';previous=null;active=null;},
    destroy:player.destroy,
  };
}
/* Clock used by lab players that previously advanced only via setTimeout. */
export function mountTimedCleanroom(container,slug){
  const lab=mountLabCleanroom(container,slug);
  let raf=0,start=0,elapsed=0,duration=LAB_STAGE_MS,index=0,details={},live=false,done=null,inProgress=false;
  const update=t=>{
    if(!live)return;
    if(!start)start=t;
    const u=Math.min(duration,elapsed+t-start);
    lab.paint(index,u/duration,details);
    if(u<duration){raf=requestAnimationFrame(update);return;}
    live=false;inProgress=false;start=0;elapsed=0;const cb=done;done=null;cb?.();
  };
  return {
    start(i,value,callback,time=LAB_STAGE_MS){cancelAnimationFrame(raf);index=i;details=value;done=callback;duration=time;start=0;elapsed=0;inProgress=true;live=true;lab.paint(index,0,details);raf=requestAnimationFrame(update);},
    pause(){if(!live)return;elapsed+=start?performance.now()-start:0;start=0;live=false;cancelAnimationFrame(raf);},
    resume(){if(!inProgress)return false;live=true;raf=requestAnimationFrame(update);return true;},
    preview(i,value){cancelAnimationFrame(raf);live=false;inProgress=false;done=null;lab.paint(i,1,value);},
    reset(){cancelAnimationFrame(raf);live=false;inProgress=false;done=null;lab.reset();}
  };
}
