import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=x=>document.getElementById(x),form=$('seam-form'),els=form.elements,can=$('seam-model');let s=initial(),draw3D=()=>{};
const fmt=x=>Number(x.toPrecision(7)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))els[k].value=String(v)}
function go(id,v){s=act(s,id,v);if(id==='reset'||id==='presetEdge')sync();draw()}
function draw(){const r=s.result;
 $('seam-door').textContent=s.door?'Lower inspection shroud':'Lift inspection shroud';$('seam-seat').textContent=s.fixture?'Unseat virtual package':'Seat virtual package';$('seam-seat').disabled=!s.door;
 $('seam-status').textContent=s.error||(s.door?'Shroud raised. ':'Shroud down. ')+(s.fixture?'Package seated.':'Package absent.');
 $('seam-result').textContent=r?fmt(r.percent)+'% registered · '+fmt(r.coveredMm)+' of '+fmt(r.totalMm)+' mm · '+(r.complete?'No missing nominal length.':'Uncovered '+fmt(r.uncoveredMm)+' mm.')+' Leak rate unknown; not tested.':'No layout evaluated. Leak rate unknown.';
 $('seam-json').disabled=!r;$('seam-csv').disabled=!r;chart(r);draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:['sampleId','missingEdge'].includes(k)?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('run')};
for(const [k,a] of Object.entries({door:'door',seat:'seat',missing:'presetEdge',reset:'reset'}))$('seam-'+k).onclick=()=>go(a);
for(const k of ['json','csv'])$('seam-'+k).onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-seam-fit.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
function chart(r){const svg=$('seam-chart');svg.replaceChildren();if(!r)return;const c=r.configuration,scale=Math.min(345/(c.widthMm+9),210/(c.heightMm+9));const X=x=>237+x*scale,Y=y=>128-y*scale;
 const add=(tag,a,text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in a)e.setAttribute(k,a[k]);if(text!==undefined)e.textContent=text;svg.append(e)};
 const ln=(a,b,color,w,d)=>add('line',{x1:X(a[0]),y1:Y(a[1]),x2:X(b[0]),y2:Y(b[1]),stroke:color,'stroke-width':w,...(d?{'stroke-dasharray':d}:{})});
 for(const v of r.spans){const [a,b]=v.targetMm;ln(a,b,v.coveredMm<v.nominalMm?'#af6d52':'currentColor',4);if(v.draftMm)ln(...v.draftMm,'#719fb4',2,'5 3');}
 add('text',{x:9,y:18,fill:'currentColor','font-size':14},'Package XY (mm): target solid, transformed draft dashed');
 add('text',{x:9,y:247,fill:'currentColor','font-size':13},'Band ±'+fmt(c.bandMm)+' mm · '+r.spans.map(x=>x.id+' '+fmt(x.coveredMm)).join('  /  '));}
async function setup(){const status=$('seam-asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.18;o.maxDistance=7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);
 const views={bench:[[2,1.91,4.37],[.22,.98,.04]],front:[[0,.97,3.83],[0,.97,.02]],fixture:[[.33,1.42,1.34],[0,1.11,.22]],side:[[3.43,1.61,.12],[.09,.97,0]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('seam-views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)look(e.target.dataset.view)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/08-08/amada-wl-300a.glb')).scene;world.add(m);
 const door=m.getObjectByName('inspection_door'),pkg=m.getObjectByName('package'),y=door.position.y;
 const cv=document.createElement('canvas');cv.width=480;cv.height=280;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.35,.202),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.842,1.480,.463);screen.userData.action='run';world.add(screen);
 draw3D=()=>{door.position.y=y+(s.door?.425:0);pkg.visible=s.fixture;g.fillStyle='#102632';g.fillRect(0,0,480,280);g.fillStyle='#badde5';g.font='bold 28px sans-serif';g.fillText('PASSIVE INSPECTION',18,43);
  g.fillStyle='#f8dfa8';g.font='28px sans-serif';g.fillText(s.result?fmt(s.result.percent)+'% projected coverage':'Tap to inspect layout',18,120);g.font='18px sans-serif';g.fillText('LASER NOT SIMULATED  /  NO LEAK TEST',18,238);tex.needsUpdate=true;render()};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,vis=true;do{a??=x.userData.action;vis&&=x.visible;x=x.parent}while(x&&x!==sc);if(!vis)continue;if(a)go(a);else if(h.object===pkg||h.object.parent===pkg)go('seat');break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · metric cabinet, shroud and passive fixture.';draw3D();
 const x=$('seam-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.15,0,-1.3);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Passive layout controls still work.';}}
sync();draw();setup();
