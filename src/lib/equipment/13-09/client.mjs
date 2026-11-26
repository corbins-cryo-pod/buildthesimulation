import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,output,landmarks,tags,SOURCE_ID} from './solver.mjs';
const $=x=>document.getElementById('afs-'+x),can=$('model'),drawing=$('drawing');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);draw()}
function draw(){
 $('feature').value=s.feature;$('tag').value=s.tag;
 $('status').textContent=s.error||'Drawing '+SOURCE_ID+' · revision '+s.revision+' · '+s.notes.length+' tags.';
 $('json').disabled=s.notes.length===0;
 const body=$('notes');body.replaceChildren();for(const n of s.notes){const row=document.createElement('tr');
  for(const c of [n.ordinal,landmarks[n.feature].label,tags[n.tag],n.xyMm.join(', ')]){const d=document.createElement('td');d.textContent=String(c);row.append(d)}body.append(row);}
 const circles=drawing.querySelectorAll('[data-feature]');for(const q of circles){const k=q.dataset.feature;q.classList.toggle('selected',k===s.feature);q.classList.toggle('tagged',s.notes.some(n=>n.feature===k));}draw3D();}
$('feature').onchange=e=>go('feature',e.target.value);$('tag').onchange=e=>go('tag',e.target.value);
$('form').onsubmit=e=>{e.preventDefault();go('add')};
for(const k of ['example','reset'])$(k).onclick=()=>go(k);
drawing.addEventListener('click',e=>{const f=e.target.closest('[data-feature]');if(f)go('feature',f.dataset.feature)});
$('json').onclick=()=>{if(!s.notes.length)return;const u=URL.createObjectURL(new Blob([JSON.stringify(output(s),null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=SOURCE_ID+'-r'+s.revision+'-notes.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.12;o.maxDistance=5;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[1.02,1.43,2.56],[.07,.66,.06]],front:[[0,.97,2.22],[.02,.65,.04]],exterior:[[-.77,1.29,1.49],[-.28,.69,.015]],desk:[[.93,1.33,1.12],[.43,.92,.122]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/13-09/leica-em-afs2.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=440;cv.height=274;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.269,.170),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.400,.976,.055);world.add(screen);
 draw3D=()=>{g.fillStyle='#142935';g.fillRect(0,0,440,274);g.fillStyle='#a8cddc';g.font='bold 19px monospace';g.fillText('INERT DRAWING / NOTATIONS',20,29);
  g.fillStyle='#246173';g.fillRect(128,64,183,126);for(const [k,v] of Object.entries(landmarks)){g.beginPath();g.arc(220+v.xyMm[0]*4.5,127-v.xyMm[1]*4.5,k===s.feature?8:5,0,Math.PI*2);g.fillStyle=s.notes.some(n=>n.feature===k)?'#9fdc91':k===s.feature?'#f4bb73':'#afc9d4';g.fill();}
  g.fillStyle='#d1e9ee';g.font='17px monospace';g.fillText(landmarks[s.feature].label,20,228);g.fillText('Revision '+s.revision,20,253);tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · closed exterior and detached documentation desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.28,0,-.73);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Documentation controls still work.';}}
draw();setup();
