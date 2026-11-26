import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,grid,mounts} from './solver.mjs';
const $=x=>document.getElementById('desk-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const gText=v=>Math.round(v*1000)/1000;
const reported={clear:'Clear',touching:'Touching without overlap',overhang:'Off the breadboard edge',collision:'The bases intersect'};
function go(id,p){s=act(s,id,p);draw();}
function draw(){
 const r=s.result;
 $('active').value=s.active;
 const keys=['col','row'];for(const k of keys)$('field-'+k).value=String(s.pos[s.active][k]);
 $('status').textContent=s.error||reported[r.status];
 $('distance').textContent=gText(r.centerDistanceMm)+' mm';
 $('gap').textContent=r.edgeGapMm===null?'—':gText(r.edgeGapMm)+' mm';
 $('overlap').textContent=gText(r.overlapMm3)+' mm³';
 const parts=[];for(const id of Object.keys(mounts)){
  const a=r.mounts[id],e=$('mount-'+id),t=$('label-'+id),ov=r['overhang'+id];
  e.setAttribute('x',a.center.x-a.size.width/2);e.setAttribute('y',a.center.z-a.size.depth/2);
  e.classList.toggle('active',s.active===id);t.setAttribute('x',a.center.x);t.setAttribute('y',a.center.z+7);
  if(id==='B'&&r.collision)t.setAttribute('dx','16');else t.removeAttribute('dx');
  for(const [side,v] of Object.entries(ov))if(v>0)parts.push(id+' '+side+' '+v+' mm');
 }
 $('overhang').textContent=parts.length?parts.join(' · '):'None';draw3D();
}
$('active').onchange=e=>go('select',e.target.value);
$('fields').onsubmit=e=>{e.preventDefault();go('place',{col:$('field-col').valueAsNumber,row:$('field-row').valueAsNumber});};
$('presets').onclick=e=>{const key=e.target.closest('[data-preset]')?.dataset.preset;if(key==='reset')go('reset');else if(key)go('preset',key);};
$('plan').onclick=e=>{
 const selected=e.target.closest('[data-mount]')?.dataset.mount;
 if(selected){go('select',selected);return;}
 const p=$('plan'),mat=p.getScreenCTM();if(!mat)return;
 const v=new DOMPoint(e.clientX,e.clientY).matrixTransform(mat.inverse());
 if(Math.abs(v.x)<=grid.width/2&&Math.abs(v.y)<=grid.depth/2)go('snap',{x:v.x,z:v.y});
};
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download='sciencedesk-layout-rev-'+s.result.revision+'.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500);};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.004,9),o=new OrbitControls(c,can);o.minDistance=.17;o.maxDistance=7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);




 const views={bench:[[1.45,1.43,2.26],[0,.438,.024]],top:[[0,2.54,.029],[0,.782,0]],rear:[[-1.58,1.31,-1.92],[0,.461,0]],anchors:[[.56,1.36,.78],[-.1,.792,-.025]]};
 let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const model=(await new GLTFLoader().loadAsync('/equipment/11-06/sciencedesk-sdpm7590.glb')).scene;
 world.add(model);
 const nodes=Object.fromEntries(Object.keys(mounts).map(id=>[id,model.getObjectByName('mount_'+id)]));
 const deck=model.getObjectByName('breadboard'),helpers={};
 for(const [id,n] of Object.entries(nodes)){
  const a=mounts[id],line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(a.width/1000,.003,a.depth/1000)),new THREE.LineBasicMaterial({color:0x123043,depthTest:true}));
  line.position.y=.0008;line.userData.visualOnly=true;n.add(line);helpers[id]=line;
 }
 draw3D=()=>{const r=s.result;for(const [id,n] of Object.entries(nodes)){const p=r.mounts[id].center;n.position.set(p.x/1000,deck.position.y,p.z/1000);const line=helpers[id];line.visible=s.active===id||r.collision||Object.values(r['overhang'+id]).some(v=>v>0);line.material.color.setHex(r.collision?0xeb543d:Object.values(r['overhang'+id]).some(v=>v>0)?0xd89b2a:0x0f5967);}render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;
 const hit=()=>{for(const h of ray.intersectObject(model,true)){
  let x=h.object,a,ignore=false;do{a??=x.userData.action;ignore=ignore||x.userData.visualOnly||!x.visible;x=x.parent}while(x&&x!==sc);
  if(ignore)continue;
  if(a==='grid'){const p=world.worldToLocal(h.point.clone());if(p.y>=deck.position.y-.004)go('snap',{x:1000*p.x,z:1000*p.z});}
  else if(a?.startsWith('select:'))go('select',a.split(':')[1]);
  break;
 }};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};
 status.textContent='3D asset loaded · 1,080 modeled hole openings and two dry mounts.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,0,-.95);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Plan and placement controls still work.';}}
draw();setup();
