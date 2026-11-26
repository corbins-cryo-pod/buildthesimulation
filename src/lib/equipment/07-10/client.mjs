import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,vertices,sides} from './solver.mjs';
const $=x=>document.getElementById('aria-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);$('side').value=s.side;draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?'Fixed diagram '+r.sourceId+' · side '+r.side:'No diagram read.');
 $('result').textContent=r?r.side+' = '+r.length+' drawing units. Signed components: X '+r.dx+', Y '+r.dy+'.':'No length read.';
 $('json').disabled=!r;for(const e of $('diagram').querySelectorAll('[data-side]'))e.classList.toggle('selected',s.side===e.dataset.side);draw3D();}
$('side').onchange=e=>go('select',e.target.value);
$('diagram').onclick=e=>{const k=e.target.closest('[data-side]')?.dataset.side;if(k)go('select',k);};
$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.side+'-length.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.16;o.maxDistance=7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[1.77,1.78,3.65],[.016,.78,.02]],front:[[-.02,1.31,3.33],[.016,.79,.065]],exterior:[[-1.27,1.58,1.96],[-.535,1.12,-.043]],desk:[[1.021,1.453,1.216],[.615,.998,.118]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/07-10/bd-facsaria-ii.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=440;cv.height=278;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.359,.200),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.615,1.109,.024);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result;g.fillStyle='#162a36';g.fillRect(0,0,440,278);g.fillStyle='#b0d7df';g.font='bold 19px monospace';g.fillText('IMMUTABLE TRIANGLE DRAWING',24,33);
  const x=n=>209+n*21,y=n=>174-n*21;for(const [k,[a,b]] of Object.entries(sides)){const u=vertices[a],v=vertices[b];g.lineWidth=k===s.side?4:2;g.strokeStyle=k===s.side?'#e7b878':'#82adb8';g.beginPath();g.moveTo(x(u[0]),y(u[1]));g.lineTo(x(v[0]),y(v[1]));g.stroke();}
  for(const [k,[px,py]] of Object.entries(vertices)){g.beginPath();g.arc(x(px),y(py),4,0,2*Math.PI);g.fillStyle='#bfdbdf';g.fill();g.font='16px monospace';g.fillText(k,x(px)+8,y(py)-7);}
  if(d){g.fillStyle='#eed9a9';g.font='17px monospace';g.fillText(d.side+'  |  '+d.length+' drawing units',24,261);}tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · sealed outer shell and separate abstract diagram desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.30,0,-.92);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Detached diagram controls still work.';}}
go('view');setup();
