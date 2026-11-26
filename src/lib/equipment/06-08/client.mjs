import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,frames} from './solver.mjs';
const $=x=>document.getElementById('fez-'+x),can=$('model');
let s=initial(),draw3D=()=>{};
const signed=v=>v===0?'0':(v>0?'+':'−')+Math.abs(v);
function go(id,p){s=act(s,id,p);$('frame').value=s.frame;draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error||(r?'Fixed drawing '+r.sourceId+' · '+frames[r.frameId].label:'No comparison.');
 $('result').textContent=r?(r.contained?'Contained in the drawing':'Overhang in the drawing')+' · X '+signed(r.marginXMm)+' mm per side · Z '+signed(r.marginZMm)+' mm per side.':'No readout.';
 $('json').disabled=!r;
 const f=$('outline'),bar=$('overhang');if(r){const sc=1.57,w=r.frame.widthMm*sc,h=r.frame.depthMm*sc;
  f.setAttribute('x',190-w/2);f.setAttribute('y',101-h/2);f.setAttribute('width',w);f.setAttribute('height',h);f.setAttribute('stroke',r.contained?'#41696b':'#a35342');
  if(r.marginXMm<0){bar.setAttribute('d','M'+(190-r.witness.widthMm*sc/2)+' 101h'+(-r.marginXMm*sc)+'M'+(190+r.frame.widthMm*sc/2)+' 101h'+(-r.marginXMm*sc));}
  else bar.removeAttribute('d');
 }draw3D();}
$('frame').onchange=e=>go('select',e.target.value);
$('reset').onclick=()=>{go('reset');go('view')};
$('json').onclick=()=>{if(!s.result)return;const u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'})),n=document.createElement('a');n.href=u;n.download=s.result.sourceId+'-'+s.result.frameId+'-comparison.json';n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(36,1,.001,4),o=new OrbitControls(c,can);o.minDistance=.035;o.maxDistance=2;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.225,.247,.528],[.052,.058,.022]],front:[[.048,.103,.482],[.046,.061,.018]],exterior:[[-.175,.174,.261],[-.058,.067,-.012]],desk:[[.253,.182,.242],[.109,.053,.049]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/06-08/fluigent-flow-ez.glb')).scene;world.add(m);
 const cv=document.createElement('canvas');cv.width=430;cv.height=268;const g=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.119,.065),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(.108,.088,.026);screen.userData.action='view';world.add(screen);
 draw3D=()=>{const d=s.result;g.fillStyle='#152932';g.fillRect(0,0,430,268);g.fillStyle='#b1d7db';g.font='bold 19px monospace';g.fillText('FIXED OUTLINE COMPARISON',23,32);
  if(d){const rect=(dims,col)=>{const w=dims.widthMm*1.6,h=dims.depthMm*1.6;g.strokeStyle=col;g.strokeRect(216-w/2,135-h/2,w,h);};
   g.lineWidth=2.5;rect(d.frame,d.contained?'#81d3a2':'#ed936f');g.setLineDash([5,4]);rect(d.witness,'#abbec8');g.setLineDash([]);
   g.fillStyle='#e6cf9d';g.font='17px monospace';g.fillText('X '+signed(d.marginXMm)+' / Z '+signed(d.marginZMm)+' mm PER SIDE',22,247);}
  tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · exact nominal shell and detached outline desk.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(-.10,1.08,-.43);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Detached drawing controls still work.';}}
go('view');setup();
