import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('s100-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toFixed(4)).toString();
function sync(){for(const [k,v] of Object.entries(s.configuration))els[k].value=String(v);}
function go(id,p){s=act(s,id,p);if(['example','reset','offset'].includes(id))sync();draw()}
function draw(){const r=s.result;
 $('place').textContent=s.positioned?'Remove dummy':'Position inert dummy';
 $('status').textContent=s.error||(s.positioned?'External dummy positioned. Cabinet remains static.':'No dummy positioned.');
 $('result').textContent=r?(r.fits?'Fits original dry gauge':'Does not fit original dry gauge')+' · radial margin '+fmt(r.marginMm)+' mm · center offset '+fmt(r.offsetMm)+' mm.':'No fit result.';
 $('json').disabled=!r;draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='dummyId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('check')};
for(const k of ['place','example','offset','reset'])$(k).onclick=()=>go(k);
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=(r.dummyId.replace(/[^\w-]/g,'_')||'dummy')+'-r'+r.revision+'-dry-fit.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.10;o.maxDistance=4;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.79,1.39,2.32],[.062,.53,.041]],front:[[0,.655,2.05],[.03,.54,.06]],guard:[[-.30,1.42,.80],[-.171,.938,-.02]],gauge:[[.64,1.035,.56],[.42,.760,.107]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/03-05/savannah-s100.glb')).scene;world.add(m);
 const dummy=m.getObjectByName('dummy'),guide=new THREE.Mesh(new THREE.RingGeometry(.0556,.0565,48),new THREE.MeshBasicMaterial({color:'#c5b66f',side:THREE.DoubleSide}));guide.position.set(.421,.767,.134);guide.rotation.x=-Math.PI/2;world.add(guide);
 draw3D=()=>{const {diameterMm:d,offsetXmm:x,offsetZmm:z}=s.configuration,ok=[d,x,z].every(Number.isFinite)&&d>0&&d<=140&&Math.max(Math.abs(x),Math.abs(z))<=25;
   dummy.visible=s.positioned&&ok;if(ok){dummy.scale.set(d/100,1,d/100);dummy.position.set(.421+x*.001,s.result?.fits ? .763 : .788,.134+z*.001);}
   guide.material.color.set(s.result?s.result.fits?'#4dba86':'#cc7049':'#c5b66f');render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric static cabinet and separate dry gauge.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.28,0,-.65);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Dry alignment controls still work.';}}
sync();draw();setup();
