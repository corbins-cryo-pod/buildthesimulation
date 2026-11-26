import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,points} from './solver.mjs';
const $=x=>document.getElementById('lx-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);$('point').value=s.point;draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?'Diagram '+r.sourceId+' · '+r.pointId:'No locator readout.');
 $('result').textContent=r?r.pointId+' ('+r.x+', '+r.y+') · '+r.distance+' diagram units from the origin.':'No point read.';
 $('json').disabled=!r;
 for(const e of $('diagram').querySelectorAll('[data-point]'))e.classList.toggle('selected',s.point===e.dataset.point);draw3D();}
$('point').onchange=e=>go('select',e.target.value);
$('diagram').onclick=e=>{const k=e.target.closest('[data-point]')?.dataset.point;if(k)go('select',k);};
$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.pointId+'-readout.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(37,1,.001,4),o=new OrbitControls(c,can);o.minDistance=.048;o.maxDistance=3;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.38,.48,1.08],[.018,.205,.04]],front:[[0,.30,1.01],[.027,.208,.06]],exterior:[[-.38,.51,.71],[-.134,.232,-.012]],desk:[[.46,.32,.47],[.278,.112,.085]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/06-03/cellink-lumen-x-gen3.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=430;cv.height=270;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.191,.101),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.276,.139,.025);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result;g.fillStyle='#162a36';g.fillRect(0,0,430,270);g.fillStyle='#b0d7df';g.font='bold 19px monospace';g.fillText('ABSTRACT LOCATOR / READ ONLY',24,34);
  const x=n=>210+n*11,y=n=>144-n*10;g.strokeStyle='#547d89';g.beginPath();g.moveTo(x(-12),y(0));g.lineTo(x(12),y(0));g.moveTo(x(0),y(-9));g.lineTo(x(0),y(9));g.stroke();
  for(const [k,[px,py]] of Object.entries(points)){if(k===s.point){g.strokeStyle='#e5b36f';g.beginPath();g.moveTo(x(0),y(0));g.lineTo(x(px),y(py));g.stroke();}g.beginPath();g.arc(x(px),y(py),k===s.point?6:4,0,2*Math.PI);g.fillStyle=k===s.point?'#f0c88c':'#9bcad0';g.fill();}
  if(d){g.fillStyle='#eed9a9';g.font='17px monospace';g.fillText(d.pointId+'  |  '+d.distance+' diagram units',24,252);}tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · dormant Gen 3 shell and independent diagram desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.26,1.00,-.58);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Abstract diagram controls still work.';}}
go('view');setup();
