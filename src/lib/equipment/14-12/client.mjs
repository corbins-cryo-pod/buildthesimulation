import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=x=>document.getElementById(x),form=$('env-form'),els=form.elements,can=$('env-model');let s=initial(),model=()=>{};
const n=x=>Number(x.toPrecision(7)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))els[k].value=String(v)}
function go(id,p){s=act(s,id,p);if(id==='reset')sync();redraw()}
function redraw(){const r=s.result;$('env-door').textContent=s.door?'Close door':'Open door';$('env-load').textContent=s.loaded?'Remove phantom':'Place phantom';$('env-load').disabled=!s.door;
 $('env-status').textContent=s.error?(s.code+': '+s.error):(s.door?'Door open. ':'Door closed. ')+(s.loaded?'Phantom present.':'No phantom.');
 $('env-result').textContent=!r?'No profile run.':r.oneTau?'At one time constant: '+n(r.oneTau.temperatureC)+' °C'+(r.oneTau.fraction===null?' (no temperature change).':'; '+n(100*r.oneTau.fraction)+'% of the step.'):'Hold ends before one time constant; last phantom temperature '+n(r.points.at(-1).phantomC)+' °C.';
 $('env-json').disabled=!r;$('env-csv').disabled=!r;chart(r);model();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('run')};
for(const k of ['door','load','reset'])$('env-'+k).onclick=()=>go(k);
for(const k of ['json','csv'])$('env-'+k).onclick=()=>{const r=s.result;if(!r)return;const url=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=url;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-thermal.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(url),1400)};
function chart(r){const q=$('env-plot');q.replaceChildren();if(!r)return;
 const add=(tag,props,t)=>{const x=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in props)x.setAttribute(k,props[k]);if(t!==undefined)x.textContent=t;q.append(x)};
 const lo=Math.min(r.configuration.initialC,r.configuration.stepC),hi=Math.max(lo+1,r.configuration.initialC,r.configuration.stepC),X=t=>64+470*t/r.configuration.holdS,Y=z=>155-118*(z-lo)/(hi-lo);
 for(const [a,b,t] of [[4,18,'Temperature (°C)'],[2,Y(lo)+3,n(lo)],[2,Y(hi)+3,n(hi)],[64,177,'0 s'],[465,177,n(r.configuration.holdS)+' s']])add('text',{x:a,y:b,fill:'currentColor','font-size':13},t);
 add('line',{x1:64,x2:534,y1:Y(r.configuration.stepC),y2:Y(r.configuration.stepC),stroke:'currentColor','stroke-dasharray':'4 4',opacity:.55});add('path',{d:r.points.map((p,i)=>(i?'L':'M')+X(p.tS)+' '+Y(p.phantomC)).join(' '),fill:'none',stroke:'#608da7','stroke-width':3});if(r.oneTau)add('circle',{cx:X(r.oneTau.tS),cy:Y(r.oneTau.temperatureC),r:4,fill:'#bc8458'});}
async function view(){const status=$('env-asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,10),orbit=new OrbitControls(c,can);orbit.minDistance=.23;orbit.maxDistance=4;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 orbit.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);
 const views={bench:[[1.07,.86,1.56],[.01,.35,0]],front:[[0,.345,1.48],[0,.345,0]],side:[[1.44,.52,.02],[0,.34,0]],rack:[[-.45,.53,1.04],[0,.33,.23]],rear:[[.35,.60,-1.55],[0,.36,0]]};let active='bench';
 const show=x=>{active=x;c.position.set(...views[x][0]);orbit.target.set(...views[x][1]);orbit.update();render();};
 $('env-views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)show(e.target.dataset.view)};size();show(active);
 const m=(await new GLTFLoader().loadAsync('/equipment/14-12/espec-sh-262.glb')).scene;world.add(m);const find=x=>m.getObjectByName(x),door=find('chamber_door'),p=find('thermal_phantom');
 const ghost=new THREE.Mesh(new THREE.BoxGeometry(.056,.008,.038),new THREE.MeshStandardMaterial({color:0x8cacc4,transparent:true,opacity:.53}));ghost.position.set(0,.309,.279);ghost.userData.action='load';world.add(ghost);
 const cv=document.createElement('canvas');cv.width=500;cv.height=258;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.149,.076),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(-.022,.632,.392);screen.userData.action='run';world.add(screen);
 model=()=>{door.rotation.y=s.door?1.46:0;p.visible=s.loaded;ghost.visible=s.door&&!s.loaded;
 g.fillStyle='#102b3a';g.fillRect(0,0,500,258);g.fillStyle='#a9e6ea';g.font='bold 37px sans-serif';g.fillText('SH-262  /  VIRTUAL',24,58);
 g.font='29px sans-serif';g.fillText(s.config.stepC+' °C   /   '+s.config.rhPercent+'% RH',24,114);g.fillStyle='#f0ddad';g.fillText(s.door?'DOOR OPEN':s.result?'PHANTOM '+n(s.result.points.at(-1).phantomC)+' °C':'SELECT TO RUN',24,195);tex.needsUpdate=true;render()};
 const ray=new THREE.Raycaster(),nd=new THREE.Vector2();let press;
 const hit=()=>{for(const h of ray.intersectObject(world,true)){let o=h.object,a,visible=true;do{a??=o.userData.action;visible&&=o.visible;o=o.parent}while(o&&o!==sc);if(!visible)continue;if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();nd.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(nd,c);hit();};
 status.textContent='3D asset loaded · metric cabinet, working door and selectable controls.';model();
 const x=$('env-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){
  x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,.81,-.89);orbit.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);orbit.enabled=true;size();show(active);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);orbit.enabled=true;show(active);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}
 }
 }catch(e){status.textContent='3D unavailable: '+e.message+'. The thermal test still works.';}}
sync();redraw();view();
