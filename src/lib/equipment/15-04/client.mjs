import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,points} from './solver.mjs';
const $=x=>document.getElementById('wp-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const describe={adjacent:'Adjacent authored points',missing:'No coordinate stored. The marker is hidden.', 'no-adjacent':'Coordinate available; no adjacent pair.'};
const fmt=x=>String(Math.round(x*1e4)/1e4);
function go(id,p){s=act(s,id,p);draw()}
function draw(){
 const r=s.result,p=r.coordinateMm,d=r.deltaMm;
 $('status').textContent=s.error||describe[r.status];$('time').textContent=fmt(r.tS)+' s';
 $('coord').textContent=p?'('+p.x+', '+p.y+') mm':'Missing';
 $('delta').textContent=d?'ΔX '+d.x+' mm · ΔY '+d.y+' mm':'Not available';
 $('length').textContent=d?fmt(d.length)+' mm over '+fmt(r.elapsedS)+' s':'Not available';
 $('index').textContent='Index '+r.index+' / '+(points.length-1);
 for(const n of $('timeline').querySelectorAll('[data-index]'))n.setAttribute('aria-pressed',String(+n.dataset.index===s.index));
 for(const n of $('diagram').querySelectorAll('[data-index]'))n.classList.toggle('active',+n.dataset.index===s.index);
 for(const n of $('diagram').querySelectorAll('[data-end]'))n.classList.toggle('active',+n.dataset.end===s.index);
 $('prev').disabled=s.index===0;$('next').disabled=s.index===points.length-1;
 draw3D();
}
$('timeline').onclick=e=>{const n=e.target.closest('[data-index]');if(n)go('select',+n.dataset.index);};
$('diagram').onclick=e=>{const n=e.target.closest('[data-index]');if(n)go('select',+n.dataset.index);};
$('prev').onclick=()=>go('previous');$('next').onclick=()=>go('next');$('reset').onclick=()=>go('reset');
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-index-'+s.result.index+'.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.004,9),o=new OrbitControls(c,can);o.minDistance=.105;o.maxDistance=6;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);




 const views={bench:[[1.15,1.65,2.18],[.01,.660,.016]],screen:[[.470,1.564,1.493],[.032,1.015,.045]],keys:[[.743,1.356,.957],[.365,.827,.178]],rear:[[-1.2,1.60,-1.96],[0,.641,0]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const model=(await new GLTFLoader().loadAsync('/equipment/15-04/waypoint-console.glb')).scene;world.add(model);
 const cv=document.createElement('canvas');cv.width=640;cv.height=348;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.528,.286),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(-.099,1.125,-.074);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result;g.fillStyle='#152935';g.fillRect(0,0,640,348);
  g.fillStyle='#8cc8ce';g.font='bold 21px monospace';g.fillText('AUTHORED WAYPOINT CONSOLE',23,34);
  const x=v=>61+12*v,y=v=>271-12*v;g.lineWidth=1;g.strokeStyle='#456976';g.beginPath();g.moveTo(x(0),y(18));g.lineTo(x(0),y(0));g.lineTo(x(19),y(0));g.stroke();
  for(let i=1;i<points.length;i++){const p=points[i].coordinateMm,q=points[i-1].coordinateMm;if(!p||!q)continue;g.lineWidth=i===s.index?4:2;g.strokeStyle=i===s.index?'#edbb82':'#79abb6';g.beginPath();g.moveTo(x(q.x),y(q.y));g.lineTo(x(p.x),y(p.y));g.stroke();}
  for(const [i,p] of points.entries()){const v=p.coordinateMm;if(!v)continue;g.beginPath();g.arc(x(v.x),y(v.y),i===s.index?6:3,0,2*Math.PI);g.fillStyle=i===s.index?'#ffd499':'#acc5ca';g.fill();}
  g.fillStyle='#9bc6cb';g.font='17px monospace';g.fillText('INDEX '+d.index+' · '+fmt(d.tS)+' S',322,93);
  g.fillStyle='#f1d6aa';g.font='bold 19px monospace';g.fillText(d.coordinateMm?'('+d.coordinateMm.x+', '+d.coordinateMm.y+') MM':'MISSING COORDINATE',322,135);
  g.font='17px monospace';g.fillText(d.deltaMm?'OFFSET '+fmt(d.deltaMm.length)+' MM':'NO ADJACENT OFFSET',322,170);
  g.fillStyle='#82a9b7';g.font='15px monospace';g.fillText('STATIC GRAPHIC  /  NO CAPTURE',24,322);tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · illustrative desk and offline waypoint display.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.16,0,-.91);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Waypoint controls still work.';}}
draw();setup();
