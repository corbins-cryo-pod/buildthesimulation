import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,project,W,H} from './solver.mjs';
const $=x=>document.getElementById('v12-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toFixed(3)).toString();
function go(id,p){s=act(s,id,p);$('zoom').value=String(s.zoom);draw()}
function draw(){const r=s.result,p=r?.pointerSampleMm;
 $('status').textContent=s.error||(r?fmt(r.visualMagnification)+'× nominal visual magnification · '+fmt(r.frame.horizontalFieldMm)+' mm horizontal field':'No inspection image.');
 $('result').textContent=r?'1 mm pitch '+fmt(r.calibration.gridSpacingPx)+' px · raised point L−R '+fmt(r.fiducial.raisedDisparityPx)+' px.':'No fit data.';
 $('pointer').textContent=p?'Pointer on ruler plane: ('+[p.xMm,p.yMm,p.zMm].map(fmt).join(', ')+') mm.':'Click either view or choose ruler center to read coordinates.';
 $('json').disabled=!r;for(const k of ['L','R'])chart($(k),k,r);draw3D();}
$('zoom').onchange=e=>go('zoom',Number(e.target.value));
for(const k of ['center','cycle'])$(k).onclick=()=>go(k);
$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=r.sampleId+'-r'+r.revision+'-stereo.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
for(const k of ['L','R'])$(k).onclick=e=>{const ig=$(k),matrix=ig.getScreenCTM();if(!matrix)return;const p=ig.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const {x,y}=p.matrixTransform(matrix.inverse());go('pointer',[x,y])};
function chart(svg,k,r){svg.replaceChildren();if(!r)return;
 const add=(tag,a,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const j in a)e.setAttribute(j,a[j]);if(t!==undefined)e.textContent=t;svg.append(e)};
 const point=(x,y,z=0)=>project(r.zoomFactor,k,{xMm:x,yMm:y,zMm:z});
 const line=(a,b,color,weight)=>add('line',{x1:a.xPx,y1:a.yPx,x2:b.xPx,y2:b.yPx,stroke:color,'stroke-width':weight});
 const p0=point(-7,5),p1=point(7,-5),p=point(0,0);
 add('rect',{x:p0.xPx,y:p0.yPx,width:p1.xPx-p0.xPx,height:p1.yPx-p0.yPx,fill:'#cadee0',stroke:'#617e87'});
 for(let x=-7;x<=7;x++)line(point(x,-5),point(x,5),x===0?'#2b5a72':'#6c959f',x===0?1.6:.75);
 for(let y=-5;y<=5;y++)line(point(-7,y),point(7,y),y===0?'#2b5a72':'#6c959f',y===0?1.6:.75);
 add('circle',{cx:p.xPx,cy:p.yPx,r:3,fill:'#294656'});
 const f=k==='L'?r.fiducial.left:r.fiducial.right;
 add('circle',{cx:f.xPx,cy:f.yPx,r:6,fill:'#d18b34',stroke:'#533615','stroke-width':1.5});
 const q=r.pointerSampleMm;if(q){const g=point(q.xMm,q.yMm);add('path',{d:'M'+g.xPx+' '+(g.yPx-6)+'v12m-6 -6h12',stroke:'#e04d27','stroke-width':2});}
 add('rect',{x:9,y:H-32,width:r.calibration.scaleBarPx+59,height:27,fill:'#f3f1e8',opacity:.96});
 add('line',{x1:15,y1:H-18,x2:15+r.calibration.scaleBarPx,y2:H-18,stroke:'#294656','stroke-width':4});
 add('text',{x:23+r.calibration.scaleBarPx,y:H-13,fill:'#294656','font-size':14},'1 mm');}
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(39,1,.001,4),o=new OrbitControls(c,can);o.minDistance=.043;o.maxDistance=2;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.32,.36,.70],[0,.175,.046]],front:[[0,.22,.56],[0,.171,.054]],ruler:[[.187,.171,.231],[0,.064,.08]],oculars:[[.192,.426,.338],[0,.316,.105]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/12-01/zeiss-discovery-v12.glb')).scene;world.add(m);
 const mark=new THREE.Mesh(new THREE.RingGeometry(.00095,.0013,16),new THREE.MeshBasicMaterial({color:0xde6337,side:THREE.DoubleSide}));mark.rotation.x=-Math.PI/2;world.add(mark);
 draw3D=()=>{const p=s.result?.pointerSampleMm;mark.visible=!!p&&Math.abs(p.xMm)<=7&&Math.abs(p.yMm)<=5;if(p)mark.position.set(p.xMm*.001,.064,.079-p.yMm*.001);render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric optical silhouette and inert ruler.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,.92,-.48);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Ideal stereo controls still work.';}}
go('view');setup();
