import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,datumMm} from './solver.mjs';
const $=x=>document.getElementById('mp-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toPrecision(6)).toString(), tup=v=>'('+v.map(fmt).join(', ')+')';
function sync(){for(const [k,v] of Object.entries(s.configuration))els[k].value=String(v);}
function go(id,p){s=act(s,id,p);if(['reset','limit','nudge'].includes(id))sync();draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?r.local.blockedAxes.length?'Clamped '+r.local.blockedAxes.join(', ')+' to the virtual travel bound.':'Requested virtual pose applied.':'No command applied.');
 $('result').textContent=r?'Applied stage '+tup(r.local.appliedStageMm)+' mm · sample tip '+tup(r.sample.tipSampleMm)+' mm.':'No pose calculated.';
 $('json').disabled=!r;draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('move')};
for(const k of ['limit','reset'])$(k).onclick=()=>go(k);
for(const k of ['X','Y','Z'])$('nudge-'+k).onclick=()=>go('nudge',k);
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=r.sampleId+'-r'+r.revision+'-pose.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(38,1,.002,4),o=new OrbitControls(c,can);o.minDistance=.045;o.maxDistance=2;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.45,.46,.94],[-.058,.058,.035]],front:[[0,.17,.99],[-.065,.072,.023]],stage:[[.38,.243,.37],[.166,.078,.015]],control:[[-.028,.276,.375],[.014,.046,.146]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/10-07/sutter-mp285.glb')).scene;world.add(m);
 const sliders=['slide_x','slide_xy','slide_z'].map(k=>{const n=m.getObjectByName(k);return [n,n.position.clone()];});
 const origin=new THREE.Vector3(.2085,.125,.016);
 for(const [p,k] of [[new THREE.Vector3(1,0,0),0xc26755],[new THREE.Vector3(0,0,-1),0x4d9e70],[new THREE.Vector3(0,1,0),0x4291bc]])world.add(new THREE.ArrowHelper(p,origin,.023,k,.005,.004));
 const mark=new THREE.Mesh(new THREE.SphereGeometry(.0026,16,10),new THREE.MeshBasicMaterial({color:'#f4ad4c'}));world.add(mark);
 const cv=document.createElement('canvas');cv.width=420;cv.height=100;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.187,.040),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(-.218,.062,.126);world.add(screen);
 draw3D=()=>{const ans=s.result,q=ans?.local.appliedStageMm??[0,0,0],p=ans?.sample.tipSampleMm??datumMm;
  sliders.forEach(([n,home],j)=>n.position.set(home.x+q[0]/1000,home.y+(j===2?q[2]/1000:0),home.z-(j>0?q[1]/1000:0)));
  mark.position.set(origin.x+p[0]/1000,origin.y+p[2]/1000,origin.z-p[1]/1000);
  g.fillStyle='#101f23';g.fillRect(0,0,420,100);g.font='19px monospace';g.fillStyle='#a9d5c4';g.fillText('VIRTUAL STAGE · local mm',14,30);g.font='22px monospace';g.fillText(tup(q),14,70);tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric controller and virtual translation axes.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,.97,-.55);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Virtual pose controls still work.';}}
sync();draw();setup();
