import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act} from './solver.mjs';
const $=x=>document.getElementById('witness-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toPrecision(5)).toString();
function sync(){for(const [k,v] of Object.entries(s.configuration))els[k].value=String(v);}
function go(id,p){if(id==='pocket'){s=act(s,'set',{pocket:Number(p)});sync();}
 else{s=act(s,id,p);if(['example','reset'].includes(id))sync();}draw()}
function draw(){const r=s.result;
 $('cover').textContent=s.open?'Replace visual cover':'Lift visual cover';$('seat').textContent=s.seated?'Remove inert witness':'Seat inert witness';
 $('status').textContent=s.error||((s.open?'Visual cover raised. ':'Visual cover down. ')+(s.seated?'Witness in P'+s.configuration.pocket+'.':'No witness seated.'));
 $('result').textContent=r?'Ideal optical shadow '+fmt(r.lightShadow.rasterLengthMm*1000)+' μm · '+r.lightShadow.shadowCells+' of 16 cells shadowed · '+fmt(r.radialRecessMarginMm)+' mm recess fit per side.':'No optical comparison yet.';
 $('json').disabled=!r;
 const v=$('map');v.replaceChildren();
 for(const cell of r?.lightShadow.profile??[]){const p=document.createElement('span');p.style.background=cell.relativeIllumination?'#7fbdc7':'#203542';p.title=fmt(cell.xMm*1000)+' μm: '+(cell.relativeIllumination?'lit':'shadowed');p.setAttribute('aria-hidden','true');v.append(p)}
 draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('read')};
for(const k of ['cover','seat','example','reset'])$(k).onclick=()=>go(k);
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=(r.sampleId.replace(/[^\w-]/g,'_')||'witness')+'-r'+r.revision+'-optical.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.15;o.maxDistance=5;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[1.61,1.78,3.31],[.015,.845,.035]],front:[[0,.987,2.88],[.045,.859,.06]],carrier:[[.56,1.68,1.06],[.341,1.011,-.057]],rack:[[-1.39,1.56,1.77],[-.43,.901,.065]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/03-01/bjd-1800-witness.glb')).scene;world.add(m);
 const lid=m.getObjectByName('display_cover'),disc=m.getObjectByName('witness'),y=lid.position.y,dy=disc.position.y;
 const pockets=Array.from({length:6},(_,i)=>m.getObjectByName('recess_'+(i+1)));
 const ring=new THREE.Mesh(new THREE.RingGeometry(.053,.0565,36),new THREE.MeshBasicMaterial({color:'#f7c168',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;world.add(ring);
 draw3D=()=>{lid.position.y=y+(s.open?.3:0);disc.visible=s.seated;const p=pockets[s.configuration.pocket-1]??pockets[0];disc.position.set(p.position.x,dy,p.position.z);ring.position.set(p.position.x,.977,p.position.z);ring.visible=s.open;
  const d=s.configuration.diameterMm/100;if(Number.isFinite(d)&&d>0)disc.scale.set(d,1,d);render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · original metric silhouette and carrier.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.30,0,-.98);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Passive worksheet controls still work.';}}
sync();draw();setup();
