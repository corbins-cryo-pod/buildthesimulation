import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('cold-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toPrecision(5)).toString();
function sync(){for(const k of ['dummyId','widthMm','depthMm','heightMm'])els[k].value=String(s.configuration[k]);}
function go(id,p){s=act(s,id,p);if(['example','reset','oversize'].includes(id))sync();draw()}
function draw(){const r=s.result?.clearance;
 $('view').textContent=s.open?'Show closed exterior':'Show cold cavity';$('view').setAttribute('aria-pressed',String(s.open));
 $('rotate').setAttribute('aria-pressed',String(s.configuration.quarterTurn));
 $('status').textContent=s.error||(s.open?'Cold cavity visible. No operating state.':'Exterior view, non-operational.');
 $('result').textContent=r?(r.fits?'Fits nominal shelf':'Does not fit nominal shelf')+' · width '+fmt(r.widthPerSideMm)+' mm each side · depth '+fmt(r.depthPerSideMm)+' mm each side · headroom '+fmt(r.headroomMm)+' mm.':'No shelf clearance evaluated.';
 $('json').disabled=!r;draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='dummyId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('check')};
for(const k of ['view','rotate','oversize','example','reset'])$(k).onclick=()=>go(k);
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=(r.dummyId.replace(/[^\w-]/g,'_')||'tray')+'-r'+r.revision+'-dry-shelf.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.13;o.maxDistance=4;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.83,.79,1.72],[0,.34,.035]],front:[[0,.455,1.50],[0,.33,.075]],shelf:[[.235,.60,.95],[0,.314,.16]],rear:[[.70,.71,-1.41],[0,.32,-.07]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(!k||r.xr.isPresenting)return;if(k==='shelf'&&!s.open)go('view');look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/03-10/vulcan-3-1750.glb')).scene;world.add(m);
 const door=m.getObjectByName('visual_door'),tray=m.getObjectByName('dry_tray'),location=door.position.clone(),links=['left','right'].map(k=>{const y=m.getObjectByName('display_link_'+k);return [y,y.position.clone()]});
 draw3D=()=>{door.position.copy(location);if(s.open)door.position.set(0,.795,.225);door.rotation.x=s.open?-1.53:0;for(const [link,p] of links){link.position.copy(p);if(s.open)link.position.y=.627-5.52*.506;link.scale.y=s.open?5.52:1;}
  tray.visible=s.open&&!!s.result?.clearance.fits;
  if(tray.visible){const d=s.configuration;tray.scale.set(d.widthMm/250,d.heightMm/45,d.depthMm/180);tray.rotation.y=d.quarterTurn?Math.PI/2:0;}render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric enclosure and passive shelf.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,.68,-.82);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Dry shelf controls still work.';}}
sync();draw();setup();
