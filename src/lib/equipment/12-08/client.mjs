import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv,NX,NY} from './solver.mjs';
const $=x=>document.getElementById('lat-'+x),can=$('model'),bitmap=$('map'),ctx=bitmap.getContext('2d');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);$('plane').value=String(s.plane);draw()}
function pixel(context,r){const image=context.createImageData(NX,NY),col={0:[26,39,48],70:[88,167,176],150:[239,170,77]};
 r?.plane.values.forEach((v,i)=>{const [R,G,B]=col[v];image.data.set([R,G,B,255],i*4)});
 if(!r)for(let i=0;i<NX*NY;i++)image.data.set([26,39,48,255],i*4);
 if(r?.voxel)image.data.set([253,241,192,255],(r.voxel.y*NX+r.voxel.x)*4);
 context.putImageData(image,0,0);}
function draw(){const r=s.result,v=r?.voxel;
 $('status').textContent=s.error||(r?'Read-only index '+r.plane.index+' · Z '+r.plane.zUm+' µm.':'No plane read.');
 $('result').textContent=r?r.plane.nonzero+' nonzero voxels · plane sum '+r.plane.sum+' synthetic units.':'No plane values.';
 $('point').textContent=v?'Voxel ('+[v.x,v.y,v.k].join(', ')+') · center ('+[v.xUm,v.yUm,v.zUm].join(', ')+') µm · value '+v.value+'.':'Click a pixel or enter X and Y indices.';
 $('json').disabled=!r;$('csv').disabled=!r;pixel(ctx,r);draw3D();}
$('plane').oninput=e=>go('select',Number(e.target.value));
for(const k of ['prev','next'])$(k).onclick=()=>go(k);
$('reset').onclick=()=>{go('reset');go('view')};
$('form').onsubmit=e=>{e.preventDefault();const f=e.target.elements;go('voxel',[f.x.value===''?NaN:Number(f.x.value),f.y.value===''?NaN:Number(f.y.value)])};
bitmap.onclick=e=>{const b=bitmap.getBoundingClientRect();go('voxel',[Math.floor((e.clientX-b.left)*NX/b.width),Math.floor((e.clientY-b.top)*NY/b.height)])};
for(const k of ['json','csv'])$(k).onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([k==='json'?JSON.stringify(r,null,2)+'\n':csv(r)],{type:k==='json'?'application/json':'text/csv'})),n=document.createElement('a');n.href=u;n.download=r.sampleId+'-z'+r.plane.index+'-r'+r.revision+'.'+k;n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.1;o.maxDistance=5;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[1.08,1.38,2.35],[.02,.59,.06]],front:[[0,.91,2.23],[0,.62,.06]],enclosure:[[.55,1.56,1.05],[-.09,1.00,-.01]],viewer:[[.62,1.37,.83],[.31,.95,.11]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/12-08/lattice-lightsheet-7.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=400;cv.height=240;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.198,.117),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.322,1.022,.073);screen.userData.action='view';world.add(screen);
 draw3D=()=>{g.fillStyle='#182a36';g.fillRect(0,0,400,240);g.fillStyle='#b9dfe7';g.font='bold 20px monospace';g.fillText('SYNTHETIC STACK / STORED',20,31);g.imageSmoothingEnabled=false;g.drawImage(bitmap,77,46,245,179);
  if(s.result){g.font='16px monospace';g.fillText('Z '+s.result.plane.index,22,229);}tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · sealed module and separate stored-stack desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.27,0,-.70);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Read-only stack controls still work.';}}
go('view');setup();
