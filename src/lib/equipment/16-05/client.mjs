import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('tray-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toFixed(3)).toString();
function sync(){for(const [k,v] of Object.entries(s.configuration))els[k].value=String(v);}
function go(id,p){s=act(s,id,p);if(['example','reset','oversized'].includes(id))sync();draw()}
function draw(){const r=s.result?.clearance;
 $('section').textContent=s.section?'Show locked exterior':'Show geometry section';
 $('section').setAttribute('aria-pressed',String(s.section));
 $('state').textContent=s.error||(s.section?'Geometry section only. No door action.':'Exterior representation. Latch displayed locked.');
 $('result').textContent=r?(r.fits?'Fits nominal envelope':'Does not fit nominal envelope')+' · aperture '+fmt(r.apertureMarginMm)+' mm · static door plane '+fmt(r.doorPlaneMarginMm)+' mm.':'No tray geometry evaluated.';
 $('json').disabled=!r;draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='trayId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('check')};
for(const k of ['section','example','oversized','reset'])$(k).onclick=()=>go(k);
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=(r.trayId.replace(/[^\w-]/g,'_')||'tray')+'-r'+r.revision+'-geometry.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(38,1,.008,8),o=new OrbitControls(c,can);o.minDistance=.19;o.maxDistance=4;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[-1.054,.84,1.916],[0,.265,.031]],front:[[0,.36,1.89],[0,.249,.070]],section:[[1.04,1.28,1.47],[-.05,.235,-.01]],rear:[[-1.09,.88,-1.76],[0,.27,-.04]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(!k||r.xr.isPresenting)return;if(k==='section'&&!s.section)go('section');look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/16-05/3870ea-tray-gauge.glb')).scene;world.add(m);
 const outer=['shell','closed_door','locked_latch','rear_cosmetic'].map(k=>m.getObjectByName(k));
 const carrier=m.getObjectByName('carrier'),pieces=['carrier','lower_well','rear_well','rails'].map(k=>m.getObjectByName(k));
 function outline(z,color){const pts=Array.from({length:48},(_,i)=>new THREE.Vector3(-.082+.191*Math.cos(i*Math.PI/24),.263+.191*Math.sin(i*Math.PI/24),z));
   const l=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:.74}));world.add(l);return l;}
 const frontLine=outline(.355,0xc96645),backLine=outline(-.370,0x49a49f);
 let previous=false;draw3D=()=>{outer.forEach(x=>x.visible=!s.section);pieces.forEach(x=>x.visible=s.section);frontLine.visible=backLine.visible=s.section;const d=s.result?.input;
  if(d){carrier.scale.set(d.widthMm/286,d.heightMm/25,d.depthMm/675);carrier.position.z=-.370+d.depthMm/2000;}
  else{carrier.scale.set(1,1,1);carrier.position.z=-.0325;}
  if(previous!==s.section&&!r.xr.isPresenting)look(s.section?'section':'bench');previous=s.section;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric static shell and empty carrier.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,.89,-.95);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Passive geometry controls still work.';}}
sync();draw();setup();
