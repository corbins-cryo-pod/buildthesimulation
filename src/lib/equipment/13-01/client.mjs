import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,fixture,W,H} from './solver.mjs';
const $=x=>document.getElementById('g560-'+x),can=$('model'),bitmap=$('raster'),ctx=bitmap.getContext('2d');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);$('frame').value=s.frame;draw()}
function draw(){const r=s.result,a=r?.measurement;
 $('status').textContent=s.error||(r?'Stored synthetic fixture · '+fixture[r.frameId].label:'No synthetic frame loaded.');
 $('result').textContent=a?a.pitchPx+' pixels · '+a.pitchUm+' µm pitch · ratio '+a.ratio+' to normal · '+a.edgeIndices.length+' rising edges.':'No pitch measured.';
 $('json').disabled=!r;$('png').disabled=!r;const image=ctx.createImageData(W,H);
 for(let i=0;i<W*H;i++){const z=r?.raster.pixels[i]??0;image.data.set([z,z,z,255],i*4);}
 ctx.putImageData(image,0,0);draw3D();}
$('frame').oninput=e=>go('select',e.target.value);
$('toggle').onclick=()=>go('toggle');$('reset').onclick=()=>{go('reset');go('view')};
function save(u,ext){const r=s.result,n=document.createElement('a');n.href=u;n.download=r.sampleId+'-'+r.frameId+'-r'+r.revision+'.'+ext;n.click();}
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'}));save(u,'json');setTimeout(()=>URL.revokeObjectURL(u),1500)};
$('png').onclick=()=>{if(s.result)save(bitmap.toDataURL('image/png'),'png')};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.22;o.maxDistance=7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[1.62,1.80,3.34],[.065,.89,.06]],front:[[0,1.37,3.21],[.065,.90,.06]],chamber:[[-1.05,1.48,1.58],[-.41,1.13,.068]],viewer:[[.86,1.48,1.37],[.498,.98,.078]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/13-01/zeiss-geminisem-560.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=480;cv.height=260;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.290,.172),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.34,1.010,-.049);screen.userData.action='view';world.add(screen);
 draw3D=()=>{g.fillStyle='#142635';g.fillRect(0,0,480,260);g.fillStyle='#bdddeb';g.font='bold 20px monospace';g.fillText('STORED GEOMETRIC REFERENCE',22,41);g.imageSmoothingEnabled=false;g.drawImage(bitmap,25,62,430,170);
  if(s.result){g.font='16px monospace';g.fillText('PITCH '+s.result.measurement.pitchUm+' µm · SYNTHETIC',25,252);}tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · closed model and separate grating desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.45,0,-.84);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Passive grating controls still work.';}}
go('view');setup();
