import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,outlines} from './solver.mjs';
const $=x=>document.getElementById('rccs-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const sx=x=>88+23*x,sy=y=>203-23*y;
function go(id,p){s=act(s,id,p);$('outline').value=s.outline;draw()}
function draw(){const r=s.result,d=outlines[s.outline];
 $('status').textContent=s.error||(r?'Fixed drawing '+r.sourceId+' · '+d.label+' · '+r.vertexCount+' stored vertices':'No outline read.');
 $('result').textContent=r?(r.area===null?'No enclosed region. Area is undefined.':r.area+' square drawing units.'): 'No area read.';
 $('json').disabled=!r;
 if(d){const ps=d.vertices.map(([x,y])=>sx(x)+' '+sy(y));$('shape').setAttribute('d','M'+ps.join('L')+'Z');
  for(let i=0;i<6;i++){const e=$('marker-'+i),v=d.vertices[i];e.setAttribute('visibility',v?'visible':'hidden');if(v){e.setAttribute('cx',sx(v[0]));e.setAttribute('cy',sy(v[1]));}}
  $('shape').classList.toggle('flat',r?.area===null);
 }draw3D();}
$('outline').onchange=e=>go('select',e.target.value);
$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.outlineId+'-area.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.004,9),o=new OrbitControls(c,can);o.minDistance=.105;o.maxDistance=5;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);



 const views={bench:[[1.07,1.19,1.94],[.134,.795,.025]],front:[[.125,1.175,1.78],[.142,.735,.042]],exterior:[[-.519,1.296,.712],[-.15,.884,-.041]],desk:[[.761,1.294,.953],[.461,.927,.102]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/07-15/synthecon-rccs4d.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=432;cv.height=268;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.320,.197),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.461,1.006,.038);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result,p=outlines[s.outline];g.fillStyle='#162a36';g.fillRect(0,0,432,268);g.fillStyle='#b0d7df';g.font='bold 18px monospace';g.fillText('DETACHED OUTLINE READER',23,32);
  if(p){const x=a=>141+a*19,y=a=>207-a*19;g.lineWidth=3;g.strokeStyle=d?.area===null?'#d98d7c':'#a7dcbd';g.beginPath();for(const [i,v] of p.vertices.entries()){if(i)g.lineTo(x(v[0]),y(v[1]));else g.moveTo(x(v[0]),y(v[1]));}g.closePath();
   if(d?.area>0){g.fillStyle='#294e56';g.fill();}g.stroke();for(const [a,b] of p.vertices){g.beginPath();g.arc(x(a),y(b),3.5,0,2*Math.PI);g.fillStyle='#e5d8ac';g.fill();}
   if(d){g.font='16px monospace';g.fillText(d.area===null?'NO ENCLOSED REGION':d.area+' SQUARE DRAWING UNITS',22,247);}}
  tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · closed exterior and separately authored outline desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.20,0,-.77);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Detached outline controls still work.';}}
go('view');setup();
