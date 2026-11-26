import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('dry-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toPrecision(5)).toString();
function sync(){for(const k of ['sampleId','width','depth','height'])els[k].value=String(s.configuration[k]);}
function go(id,p){s=act(s,id,p);if(['example','reset','oversize'].includes(id))sync();draw()}
function draw(){const r=s.result?.clearance,a=s.audit;
 $('lid').textContent=s.lid?'Replace lid':'Remove dry lid';$('basket').textContent=s.raised?'Lower basket':'Lift dry basket';
 $('rotate').setAttribute('aria-pressed',String(s.configuration.quarterTurn));
 $('status').textContent=s.error||((s.lid?'Lid parked. ':'Lid in place. ')+(s.raised?'Basket lifted.':'Basket seated.'));
 $('result').textContent=r?(r.fit?'Fits':'Does not fit')+' · centered X allowance '+fmt(r.widthPerSideMm)+' mm per side · Z '+fmt(r.depthPerSideMm)+' mm per side · headroom '+fmt(r.headroomMm)+' mm.':'No dry fit evaluated.';
 $('audit-result').textContent=a?'Mock log: '+a.status+' at '+a.elapsedVirtualS+' virtual seconds, '+a.completedCycleEntries.length+' completed entries.':'No mock audit replayed.';
 $('fit-json').disabled=!r;$('audit-json').disabled=!a;$('audit').disabled=!r?.fit;draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('fit')};
for(const k of ['lid','basket','rotate','oversize','example','reset','audit'])$(k).onclick=()=>go(k);
for(const k of ['fit','audit'])$(k+'-json').onclick=()=>{const r=k==='fit'?s.result:s.audit;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=(r.sampleId.replace(/[^\w-]/g,'_')||'coupon')+'-r'+r.revision+'-'+k+'.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(40,1,.003,4),o=new OrbitControls(c,can);o.minDistance=.085;o.maxDistance=1.7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.39,.36,.59],[-.055,.145,.0]],front:[[0,.218,.62],[0,.145,0]],basket:[[.155,.53,.34],[0,.20,.044]],rear:[[.29,.302,-.51],[0,.139,-.025]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)look(e.target.dataset.view)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/16-10/bransonic-1800.glb')).scene;world.add(m);
 const lid=m.getObjectByName('lid'),basket=m.getObjectByName('basket'),coupon=m.getObjectByName('coupon'),put=lid.position.clone(),y=basket.position.y;
 draw3D=()=>{lid.position.copy(put);if(s.lid)lid.position.add(new THREE.Vector3(-.236,-.179,0));basket.position.y=y+(s.raised?.125:0);coupon.position.y=basket.position.y;
  coupon.visible=!!s.result?.clearance.fit;const f=s.configuration;
  if(coupon.visible){coupon.scale.set(f.width/100,f.height/25,f.depth/70);coupon.rotation.y=f.quarterTurn?Math.PI/2:0;}
  render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · meter-scale model, dry parts only.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(.06,.92,-.53);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Dry basket controls still work.';}}
sync();draw();setup();
