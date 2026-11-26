import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,fixtures} from './solver.mjs';
const $=x=>document.getElementById('icon-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const pct=v=>v===null?'Undefined (zero reference)':(v>0?'+':'')+v+'%';
function go(id,p){s=act(s,id,p);$('fixture').value=s.fixture;draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?'Authored comparison · '+r.caseLabel:'No comparison.');
 $('json').disabled=!r;
 for(const k of ['A','B']){
  const q=r?.labels[k];$(k+'-relative').textContent=q?pct(q.relativePercent):'—';$(k+'-width').textContent=q?q.referenceMm+' → '+q.comparisonMm+' mm':'—';
  if(q){$(k+'-ref').setAttribute('width',q.referenceMm*1.67);$(k+'-new').setAttribute('width',q.comparisonMm*1.67);
   $(k+'-zero').setAttribute('visibility',q.referenceMm?'hidden':'visible');}
 }draw3D();}
$('fixture').onchange=e=>go('select',e.target.value);$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.fixture+'.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.004,9),o=new OrbitControls(c,can);o.minDistance=.13;o.maxDistance=6;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);




 const views={bench:[[1.49,1.52,2.91],[.047,.619,.039]],front:[[-1.150,1.069,1.441],[-.516,.380,-.033]],rear:[[-1.17,1.00,-1.41],[-.515,.336,-.047]],desk:[[1.022,1.493,1.213],[.620,1.005,.112]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const asset=(await new GLTFLoader().loadAsync('/equipment/15-08/iconeus-one-lower-cart.glb')).scene;world.add(asset);
 const cv=document.createElement('canvas');cv.width=496;cv.height=292;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.392,.233),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.620,1.105,.0225);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result;g.fillStyle='#162a36';g.fillRect(0,0,496,292);g.fillStyle='#b0d7df';g.font='bold 19px monospace';g.fillText('DETACHED WIDTH COMPARISON',24,36);
  if(d){for(const [i,name] of ['A','B'].entries()){const q=d.labels[name],y=72+i*91;g.fillStyle='#ead5a1';g.font='bold 17px monospace';g.fillText(name,25,y+19);g.fillStyle='#79929f';g.fillRect(65,y,q.referenceMm*2.3,12);g.fillStyle='#5ac1b1';g.fillRect(65,y+17,q.comparisonMm*2.3,13);
   if(q.referenceMm===0){g.fillStyle='#dcaa70';g.fillRect(64,y,3,12);}g.fillStyle='#e8cd9b';g.font='17px monospace';g.fillText(q.relativePercent===null?'UNDEFINED':pct(q.relativePercent),345,y+22);}
  g.font='15px monospace';g.fillStyle='#92b5bc';g.fillText('ORIGINAL RECTANGLES / NOT IMAGING DATA',23,272);}
  tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · dormant lower cart and detached geometric exhibit.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.235,0,-1.02);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Detached width controls still work.';}}
go('view');setup();
