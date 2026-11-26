import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {EXAMPLE,expose,verify} from './solver.mjs';
const asset='/equipment/02-03/';
const $=id=>document.getElementById('mla-'+id);
const root=document.querySelector('#mla');
if(root) initialize().catch(e=>{$('status').textContent='Initialization failed: '+e.message;});
async function initialize(){
 const keys=Object.keys(EXAMPLE).filter(k=>k!=='shapes');
 let result=null,runToken=0,open=false,loaded=false,vacuum=false,busy=false,cut=false,stagePosition=0,progress=0,sceneModel,renderer,controls,camera,scene,inside,aidPlaced=false,whiteLight=false,activeJob=null,importToken=0;
 const modelState={coupon_mm:EXAMPLE.coupon_mm,thickness_mm:EXAMPLE.thickness_mm};
 const say=s=>$('status').textContent=s;
 const getJob=()=>{const j={};for(const k of keys){const el=$(k);j[k]=typeof EXAMPLE[k]==='number'?(el.value.trim()===''?NaN:Number(el.value)):el.value}j.shapes=JSON.parse($('shapes').value);return j};
 function setJob(j){for(const k of keys)$(k).value=j[k]??EXAMPLE[k];$('shapes').value=JSON.stringify(j.shapes??EXAMPLE.shapes,null,2)}
 const getNode=n=>sceneModel?.getObjectByName(n);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function render(){if(renderer&&scene&&camera)renderer.render(scene,camera)}
 function syncModel(){
  const window=getNode('loading_window'),stage=getNode('stage'),coupon=getNode('coupon'),surface=getNode('coupon_surface'),housing=getNode('housing'),led=getNode('emission_led'),vd=getNode('vacuum_display');
  if(window){window.position.y=open?-.72:0;window.visible=!cut}
  if(housing)housing.visible=!cut;
  if(stage){let u=0,v=0;if(busy&&activeJob){const f=activeJob.field_um,h=activeJob.height_um,second=progress>=.5,t=second?2*progress-1:2*progress;u=(second?.5:-.5)*f;v=(second?.5-t:t-.5)*h+activeJob.overlay_um+(second?activeJob.offset_um:0)}stage.position.x=-.10-u*1e-6;stage.position.z=.075+stagePosition-v*1e-6}
  if(inside){inside.color.set(whiteLight?0xffffff:0xffbd62);inside.intensity=whiteLight?2.8:1.7}
  if(coupon)coupon.visible=loaded;
  const aid=getNode('small_coupon_adjustment_aid');if(aid){aid.visible=aidPlaced&&modelState.coupon_mm<=20;const scale=modelState.coupon_mm/10;for(const child of aid.children){if(child.userData.basePosition===undefined){child.userData.basePosition=child.position.toArray();child.userData.baseScale=child.scale.toArray()}const p=child.userData.basePosition,s=child.userData.baseScale;child.position.set(p[0]*scale,p[1],p[2]*scale);child.scale.set(s[0]*scale,s[1],s[2]*scale)}}
  if(surface){surface.scale.set(modelState.coupon_mm/1000,modelState.thickness_mm/1000,modelState.coupon_mm/1000);surface.position.y=modelState.thickness_mm/2000}
  if(led){led.material.color.set(busy?0xc52a35:0x202020);led.material.emissive.set(busy?0x8c1016:0)}
  if(vd){vd.material.color.set(vacuum?0x2e925b:0x25343a)}
  render()
 }
 function update(){
  $('state').textContent=busy?'EXPOSING':open?'WINDOW OPEN':vacuum?'VACUUM HELD':loaded?'LOADED':'READY';
  $('window').textContent=open?'Close window':'Open window';$('window').disabled=busy;
  $('load').disabled=busy||!open||loaded||whiteLight;$('vacuum').disabled=busy||!loaded||!open;$('vacuum').textContent=vacuum?'Release vacuum':'Engage vacuum';$('aid').disabled=busy||!open||!loaded||!vacuum||!aidPlaced;$('light').textContent=whiteLight?'White light: ON':'White light: OFF';$('light').disabled=busy||loaded;$('light').setAttribute('aria-pressed',String(whiteLight));$('cancel').disabled=!busy;
  $('write').disabled=busy||open||!loaded||!vacuum||aidPlaced||whiteLight;$('unload').disabled=busy||!open||!loaded||vacuum;
  $('example').disabled=busy||loaded;$('import').disabled=busy||loaded;$('run-info').textContent=busy?(progress<.5?'Stripe 1 / 2 · forward scan':'Stripe 2 / 2 · reverse scan'):aidPlaced?'Positioning aid present · motion blocked':loaded?'Sample on chuck': 'No sample loaded';
  for(const k of keys)$(k).disabled=busy||(loaded&&['sampleId','parentRevision','resist','coupon_mm','thickness_mm'].includes(k));
  $('shapes').disabled=busy;$('progress').value=progress;syncModel();
 }
 function clearResult(){result=null;$('dose-scale').textContent='No result · dose scale unavailable';$('probe').textContent='Move over dose map to inspect coordinates.';$('export').disabled=true;$('csv').disabled=true;$('readout').textContent='No committed exposure for current settings.';for(const id of ['map','nominal']){const c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height)}}
 function reset(){runToken++;importToken++;open=false;loaded=false;vacuum=false;busy=false;progress=0;stagePosition=0;cut=false;aidPlaced=false;whiteLight=false;activeJob=null;$('cut').setAttribute('aria-pressed','false');clearResult();setJob(EXAMPLE);say('Ready. Load the example or edit the layout.');update()}
 function toggleWindow(){if(busy)throw Error('Window interlock: exposure in progress');if(!open)stagePosition=.12;open=!open;say(open?'Window open; stage at virtual loading position.':'Window closed; motion enabled.');update()}
 function load(){if(!open||busy||loaded||whiteLight)throw Error('Open window and switch off white light before loading');const j=getJob();expose(j);Object.assign(modelState,{coupon_mm:j.coupon_mm,thickness_mm:j.thickness_mm});loaded=true;aidPlaced=true;clearResult();say('Coupon placed on vacuum chuck with virtual positioning aid.');update()}
 function engage(){if(!open||!loaded||busy)throw Error('Load a coupon first');vacuum=!vacuum;say(vacuum?(aidPlaced?'Vacuum hold engaged. Remove positioning aid before motion.':'Vacuum hold engaged.'):'Vacuum released. Coupon may be unloaded.');update()}
 function removeAid(){if(!open||!loaded||!vacuum||busy||!aidPlaced)throw Error('Engage vacuum and open window before removing aid');aidPlaced=false;say('Positioning aid removed; close window before exposure.');update()}
 function toggleLight(){if(busy||loaded)throw Error('White light is only available in this model with no coated sample loaded');whiteLight=!whiteLight;say(whiteLight?'White chamber light on. Switch it off before loading.':'Safelight only; ready to load.');update()}
 function cancel(){if(!busy)return;runToken++;busy=false;progress=0;activeJob=null;clearResult();say('Virtual exposure cancelled; no complete result committed. Partial physical dose is not modeled.');update()}
 function draw(c,arr,g,seam){c.width=g.nx;c.height=g.ny;const ctx=c.getContext('2d'),im=ctx.createImageData(g.nx,g.ny),max=result.job.dose_mJ_cm2||1;for(let k=0;k<arr.length;k++){const q=Math.max(0,Math.min(1,arr[k]/max)),i=k*4;im.data[i]=18+q*225;im.data[i+1]=28+q*157;im.data[i+2]=40+q*45;im.data[i+3]=255}ctx.putImageData(im,0,0);if(seam){/* seam is a CSS overlay; do not overwrite dose pixels */}}
 function show(r){result=r;draw($('nominal'),r.grid.nominal,r.grid,false);draw($('map'),r.grid.dose,r.grid,true);const m=r.metrics;$('readout').textContent='Sample '+r.sampleId+' · revision '+r.revision+' · peak '+m.peakDose_mJ_cm2.toFixed(2)+' mJ/cm² · area '+m.exposedArea_um2.toFixed(2)+' µm² · seam Δ '+(m.seamDelta_um===null?'not measurable':m.seamDelta_um.toFixed(3)+' µm')+' · residual '+(m.seamResidual_um===null?'not measurable':m.seamResidual_um.toFixed(3)+' µm')+' · clipped energy '+m.clippedEnergy_mJ.toExponential(2)+' mJ · grid '+r.grid.nx+' × '+r.grid.ny+' at '+r.grid.pitch_um+' µm';$('dose-scale').textContent='0–'+r.job.dose_mJ_cm2+' mJ/cm² · '+(r.grid.nx*r.grid.pitch_um)+' × '+(r.grid.ny*r.grid.pitch_um)+' µm · pixel-area means';$('export').disabled=false;$('csv').disabled=false}
 async function write(){if(open||!loaded||!vacuum||busy||aidPlaced||whiteLight)throw Error('Exposure requires a held coupon, removed aid, safelight and closed window');const r=expose(getJob()),token=++runToken;clearResult();busy=true;activeJob=r.job;stagePosition=0;progress=0;say('Writing two virtual stripes (accelerated demonstration).');update();for(let i=1;i<=30;i++){await wait(45);if(token!==runToken)return;progress=i/30;update()}if(token!==runToken)return;busy=false;activeJob=null;progress=1;show(r);say('Exposure complete; virtual latent image committed. Open window to unload.');update()}
 function unload(){if(!open||!loaded||busy||vacuum)throw Error('Open window and release vacuum before unloading');loaded=false;aidPlaced=false;vacuum=false;say('Coupon removed. Committed result remains available for export.');update()}
 function action(id,fn){$(id).addEventListener('click',async()=>{try{await fn()}catch(e){say('Rejected: '+e.message)}})}
 action('window',toggleWindow);action('load',load);action('vacuum',engage);action('write',write);action('unload',unload);action('reset',reset);action('aid',removeAid);action('light',toggleLight);action('cancel',cancel);
 action('example',async()=>{if(loaded||busy)throw Error('Unload or reset first');expose(getJob());if(whiteLight)toggleLight();if(!open)toggleWindow();load();engage();removeAid();toggleWindow();await write()});
 $('cut').addEventListener('click',()=>{cut=!cut;$('cut').setAttribute('aria-pressed',String(cut));syncModel()});
 for(const k of [...keys,'shapes'])$(k).addEventListener('input',()=>{if(!busy){clearResult();say('Settings changed. Run exposure to generate a fresh result.');update()}});
 $('import').addEventListener('change',async e=>{try{const f=e.target.files?.[0];if(!f)return;if(f.size>200000)throw Error('Job file too large');const token=++importToken;const j=JSON.parse(await f.text());if(token!==importToken||loaded||busy)throw Error('Import superseded by instrument state change');expose(j);setJob(j);clearResult();say('Valid layout and specimen imported.')}catch(e){say('Import rejected: '+e.message)}finally{e.target.value=''}});
 function download(name,content,type){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
 action('export',()=>{if(result)download('mla150-exposure.json',JSON.stringify(result),'application/json')});
 action('csv',()=>{if(!result)return;const g=result.grid,lines=['u_um,v_um,stripe_id,dose_mJ_cm2,nominal_mJ_cm2'];for(let y=0;y<g.ny;y++)for(let x=0;x<g.nx;x++){const k=y*g.nx+x;lines.push([(x+.5)*g.pitch_um,(y+.5)*g.pitch_um,x<g.nx/2?'stripe-1':'stripe-2',g.dose[k],g.nominal[k]].join(','))}download('mla150-dose.csv',lines.join('\n'),'text/csv')});
 $('map').addEventListener('pointermove',e=>{if(!result)return;const g=result.grid,b=e.target.getBoundingClientRect(),x=Math.min(g.nx-1,Math.max(0,Math.floor((e.clientX-b.left)/b.width*g.nx))),y=Math.min(g.ny-1,Math.max(0,Math.floor((e.clientY-b.top)/b.height*g.ny)));$('probe').textContent='u='+((x+.5)*g.pitch_um).toFixed(2)+' µm · v='+((y+.5)*g.pitch_um).toFixed(2)+' µm · dose='+g.dose[y*g.nx+x].toFixed(2)+' mJ/cm²'});
 for(const r of verify()){const tr=document.createElement('tr');for(const v of [r.test,r.expected,r.actual,r.units,r.tolerance,r.pass?'PASS':'FAIL']){const td=document.createElement('td');td.textContent=String(v);tr.append(td)}$('verification').append(tr)}
 reset();
 try{
  const box=$('view');renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x333c43);camera=new THREE.PerspectiveCamera(40,1,.01,40);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.12;controls.maxDistance=12;controls.addEventListener('change',render);
  scene.add(new THREE.HemisphereLight(0xf4f5f7,0x57616b,2.1));for(const [p,intensity] of [[[3,5,5],3.5],[[-3,3,-2],2],[[0,3,1],1]]){const l=new THREE.DirectionalLight(0xffffff,intensity);l.position.set(...p);scene.add(l)}
  inside=new THREE.PointLight(0xffbd62,1.7,2);inside.position.set(0,1.5,.25);scene.add(inside);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:0x42494e,roughness:.75}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
  box.replaceChildren(renderer.domElement);const resize=()=>{const w=box.clientWidth,h=box.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render()}};new ResizeObserver(resize).observe(box);
  const views={whole:[[3.4,2.5,4.0],[.12,1,0]],front:[[0,1.04,4.2],[0,1.04,0]],right:[[4.1,1.1,0],[0,1.05,0]],rear:[[2.1,1.9,-3.6],[0,1,0]],stage:[[.64,1.50,1.17],[-.05,1.20,.05]],chuck:[[.13,1.45,.62],[-.10,1.13,.075]]};
  function view(v){const a=views[v];if(!a)return;if(v==='stage'||v==='chuck'){cut=true;$('cut').setAttribute('aria-pressed','true')}else{cut=false;$('cut').setAttribute('aria-pressed','false')}camera.position.set(...a[0]);controls.target.set(...a[1]);controls.update();syncModel()}
  for(const b of root.querySelectorAll('[data-mla-view]'))b.addEventListener('click',()=>view(b.dataset.mlaView));
  view('whole');resize();const gltf=await new GLTFLoader().loadAsync(asset+'mla150.gltf');sceneModel=gltf.scene;scene.add(sceneModel);
  // Original lettering, not a copied manufacturer logo.
  const texCanvas=document.createElement('canvas');texCanvas.width=1024;texCanvas.height=160;const t=texCanvas.getContext('2d');t.clearRect(0,0,1024,160);t.fillStyle='#a92135';t.font='bold 56px sans-serif';t.fillText('HEIDELBERG',10,63);t.fillStyle='#4c555c';t.font='40px sans-serif';t.fillText('INSTRUMENTS',10,111);t.font='bold 54px sans-serif';t.fillText('MLA 150',765,72);const tex=new THREE.CanvasTexture(texCanvas);tex.colorSpace=THREE.SRGBColorSpace;const lettering=new THREE.Mesh(new THREE.PlaneGeometry(1.02,.16),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));lettering.name='fascia_lettering';lettering.position.set(0,1.75,.652);getNode('housing')?.add(lettering);
  for(const n of ['emission_led','vacuum_display']){const o=getNode(n);if(o)o.material=o.material.clone()}
  $('model-status').textContent='Metric glTF loaded · '+gltf.scene.getObjectByName('MLA150').children.length+' instrument groups';$('glb').disabled=false;view('whole');
  action('glb',async()=>{if(!sceneModel)return;const glb=await new GLTFExporter().parseAsync(sceneModel,{binary:true,onlyVisible:false});download('mla150.glb',new Blob([glb],{type:'model/gltf-binary'}))});
 }catch(e){$('model-status').textContent='3D unavailable: '+e.message+' · numerical experiment remains available.';if(!renderer)$('view').textContent='WebGL unavailable in this browser.'}
}
