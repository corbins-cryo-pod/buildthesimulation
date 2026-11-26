import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('dry-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const human={clear:'Puck is fully inside',touching:'Puck touches one edge',outside:'Puck crosses the opening'};
const mm=x=>x===0?'0 mm':(x>0?'+':'−')+Math.abs(x)+' mm';
function go(id,p){s=act(s,id,p);$('pose').value=s.pose;draw();}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?human[r.status]:'No gauge read.');
 $('minimum').textContent=r?mm(r.minimumClearanceMm):'—';$('json').disabled=!r;
 if(r){for(const [k,v] of Object.entries(r.marginsMm))$(k).textContent=mm(v);
  const disk=$('disk');disk.setAttribute('cx',170+1.5*r.centerMm.x);disk.setAttribute('cy',106+1.5*r.centerMm.z);disk.setAttribute('class',r.status);
  $('position').textContent='Center: X '+r.centerMm.x+' mm, Z '+r.centerMm.z+' mm';
 }draw3D();
}
$('pose').onchange=e=>go('select',e.target.value);$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.poseId+'.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.004,9),o=new OrbitControls(c,can);o.minDistance=.095;o.maxDistance=5;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);




 const views={bench:[[1.19,1.57,2.19],[.014,.572,.057]],case:[[-.957,1.255,.928],[-.472,.876,-.016]],gauge:[[.682,1.569,.394],[.526,.810,.073]],keys:[[.841,1.324,.814],[.526,.804,.179]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/15-14/concept-cabinet-dry-gauge.glb')).scene;world.add(m);
 const puck=m.getObjectByName('gauge_puck'),base=puck.position.clone();const mats=[];
 puck.traverse(x=>{if(x.isMesh&&!Array.isArray(x.material)&&x.material.name==='dullgold'){x.material=x.material.clone();mats.push(x.material);}});
 const shade={clear:0x9c690e,touching:0x287686,outside:0xb95835};
 draw3D=()=>{const d=s.result;if(d){puck.position.x=base.x+d.centerMm.x/1000;puck.position.z=base.z+d.centerMm.z/1000;for(const x of mats)x.color.setHex(shade[d.status]);}render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · inert concept cabinet and separate working dry gauge.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.17,0,-.87);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Dry gauge controls still work.';}}
go('view');setup();
