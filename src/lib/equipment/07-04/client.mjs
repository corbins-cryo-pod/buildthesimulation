import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,fixtures,W,H} from './solver.mjs';
const $=x=>document.getElementById('cc2-'+x),can=$('model'),bitmap=$('raster'),ctx=bitmap.getContext('2d');
let s=initial(),draw3D=()=>{};
function go(id,p){s=act(s,id,p);$('frame').value=s.frame;draw()}
function draw(){const r=s.result,m=r?.measurement;
 $('status').textContent=s.error||(r?'Locked synthetic source · '+fixtures[r.frameId].label:'No frame read.');
 $('result').textContent=m?.status==='complete'?m.widthPx+' × '+m.heightPx+' pixels · '+m.widthMm+' × '+m.heightMm+' mm · '+m.areaMm2+' mm².':m?.status==='edge-clipped'?'Shape touches the frame edge: full dimensions withheld. '+m.visiblePixels+' visible bright pixels.':m?.status==='blank'?'No shape: full dimensions withheld.':'No readout.';
 $('json').disabled=!r;$('png').disabled=!r;
 const im=ctx.createImageData(W,H);for(let i=0;i<W*H;i++){const z=r?.raster.grayscale[i]??0;im.data.set([z,z,z,255],i*4);}ctx.putImageData(im,0,0);
 const q=$('bounds');if(m?.visibleBoundsPx){const [l,t,x,b]=m.visibleBoundsPx;q.setAttribute('x',l);q.setAttribute('y',t);q.setAttribute('width',x-l+1);q.setAttribute('height',b-t+1);q.setAttribute('stroke',m.edgeClipped?'#e0a275':'#81c489');q.setAttribute('display','inline');}else q.setAttribute('display','none');
 draw3D();}
$('frame').onchange=e=>go('select',e.target.value);
$('reset').onclick=()=>{go('reset');go('view')};
function save(u,ext){if(!s.result)return;const n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.frameId+'.'+ext;n.click();}
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'}));save(u,'json');setTimeout(()=>URL.revokeObjectURL(u),1500)};
$('png').onclick=()=>{if(s.result)save(bitmap.toDataURL('image/png'),'png')};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(36,1,.001,4),o=new OrbitControls(c,can);o.minDistance=.06;o.maxDistance=3;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.46,.51,1.34],[.02,.15,.026]],front:[[0,.27,1.18],[.008,.150,.034]],exterior:[[-.53,.40,.75],[-.218,.152,-.013]],desk:[[.515,.449,.584],[.258,.180,.042]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/07-04/echo-cellcyte-gen2.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=430;cv.height=286;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.248,.160),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.255,.261,-.006);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result,m=d?.measurement;g.fillStyle='#152932';g.fillRect(0,0,430,286);g.fillStyle='#b1d7db';g.font='bold 19px monospace';g.fillText('LOCKED GEOMETRY IMAGE',24,33);
  g.imageSmoothingEnabled=false;g.drawImage(bitmap,102,50,224,168);
  if(m?.visibleBoundsPx){const [l,t,r,b]=m.visibleBoundsPx;g.strokeStyle=m.edgeClipped?'#e0a275':'#81c489';g.lineWidth=2;g.strokeRect(102+l*1.75,50+t*1.75,(r-l+1)*1.75,(b-t+1)*1.75);}
  if(d){g.fillStyle='#e6cf9d';g.font='17px monospace';g.fillText(m.status==='complete'?m.widthMm+' x '+m.heightMm+' mm | STATIC FIXTURE':m.status==='edge-clipped'?'CLIPPED / NO DIMENSIONS':'BLANK REFERENCE',24,260);}tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · dimensioned dormant frame and separate image desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.16,.94,-.63);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Detached raster controls still work.';}}
go('view');setup();
