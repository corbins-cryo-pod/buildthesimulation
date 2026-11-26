import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=id=>document.getElementById(id),form=$('bond-form'),els=form.elements,canvas=$('bond-model');let s=initial(),update=()=>{};
const fmt=x=>Number(x.toPrecision(6)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))els[k].value=String(v)}
function go(id,p){s=act(s,id,p);if(id==='reset'||id==='apex')sync();paint()}
function paint(){const r=s.result;$('bond-status').textContent=s.error||(s.seated?'Package seated.':'Package lifted.');$('bond-seat').textContent=s.seated?'Lift package':'Seat package';
 $('bond-result').textContent=!r?'No clearance checked.':(r.intersects?'Collision':r.layoutPass?'Clearance pass':'Margin or footprint failed')+' · '+(r.gapUm===null?'No transverse overlap':fmt(r.gapUm)+' µm vertical gap')+' · '+(r.padFit?'footprints fit':'footprints exceed pad')+' · ideal endpoints '+(r.connectivity.idealEligible?'eligible':'blocked')+'.';
 for(const k of ['json','csv'])$('bond-'+k).disabled=!r;chart(r);update();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('run')};
for(const k of ['seat','apex','reset'])$('bond-'+k).onclick=()=>go(k);
for(const k of ['json','csv'])$('bond-'+k).onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-ribbon.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
function chart(r){const q=$('bond-chart');q.replaceChildren();if(!r)return;const c=r.configuration,max=Math.max(c.apexUm+c.thicknessUm/2,c.blockHeightUm,1),X=x=>64+455*x/c.spanUm,Y=z=>171-140*z/(max*1.13);
 const add=(tag,p,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in p)e.setAttribute(k,p[k]);if(t!==undefined)e.textContent=t;q.append(e)};
 add('line',{x1:56,x2:535,y1:Y(0),y2:Y(0),stroke:'currentColor'});const lo=Math.max(0,c.blockXUm-c.blockLengthUm/2),hi=Math.min(c.spanUm,c.blockXUm+c.blockLengthUm/2);
 add('rect',{x:X(lo),y:Y(c.blockHeightUm),width:X(hi)-X(lo),height:Y(0)-Y(c.blockHeightUm),fill:'#b87953',opacity:r.gapUm===null?.28:.66});
 const a=r.points.map(p=>X(p.xUm)+' '+Y(p.lowerZUm)),b=[...r.points].reverse().map(p=>X(p.xUm)+' '+Y(p.upperZUm));add('path',{d:'M'+[...a,...b].join('L')+'Z',fill:r.intersects?'#a85746':'#b2903f',opacity:.85});
 add('text',{x:5,y:20,fill:'currentColor','font-size':14},'Height Z (µm)');add('text',{x:53,y:191,fill:'currentColor','font-size':13},'PAD-A · 0');add('text',{x:420,y:191,fill:'currentColor','font-size':13},'PAD-B · '+c.spanUm+' µm');}
async function view(){const line=$('bond-asset');try{
 const r=new THREE.WebGLRenderer({canvas,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#edeae2');
 sc.add(new THREE.HemisphereLight(0xfff7e6,0xa7b4c8,2.45));for(const [p,c,k] of [[[1,2,2],0xfffcf0,2.4],[[-2,2,-2],0xb5dbf1,1.2]]){const l=new THREE.DirectionalLight(c,k);l.position.set(...p);sc.add(l)}
 const cam=new THREE.PerspectiveCamera(35,1,.003,10),orbit=new OrbitControls(cam,canvas);orbit.minDistance=.10;orbit.maxDistance=3;
 const render=()=>r.render(sc,cam),size=()=>{const {width,height}=canvas.getBoundingClientRect();r.setSize(width,height,false);cam.aspect=width/Math.max(1,height);cam.updateProjectionMatrix();render()};orbit.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(canvas);
 const views={bench:[[.86,.63,1.27],[0,.253,.015]],front:[[0,.265,1.33],[0,.265,.028]],side:[[1.21,.53,.085],[0,.25,0]],work:[[.20,.355,.52],[0,.165,.155]]};let key='bench';const look=k=>{key=k;cam.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();render()};
 $('bond-views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)look(e.target.dataset.view)};size();look(key);
 const m=(await new GLTFLoader().loadAsync('/equipment/08-02/ks-4523d.glb')).scene;world.add(m);const work=m.getObjectByName('workholder'),pkg=m.getObjectByName('package'),lever=m.getObjectByName('lever'),op=work.position.y;
 update=()=>{pkg.visible=s.seated;work.position.y=op+(s.seated?0:.012);lever.rotation.x=s.config.apexUm===160?.24:0;render()};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a,valid=true;do{a??=x.userData.action;valid&&=x.visible;x=x.parent}while(x&&x!==sc);if(!valid)continue;if(a)go(a);else if(h.object===pkg||h.object.parent===pkg)go('seat');break;}};
 canvas.onpointerdown=e=>press=[e.clientX,e.clientY];canvas.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=canvas.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);hit()};line.textContent='3D asset loaded · metric bench, clickable holder, lever and keypad.';update();
 const x=$('bond-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const ss=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');orbit.enabled=false;world.position.set(0,.88,-.83);cam.position.set(0,0,0);cam.quaternion.identity();await r.xr.setSession(ss);r.setAnimationLoop(render);x.textContent='Exit VR';ss.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);orbit.enabled=true;size();look(key);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);orbit.enabled=true;look(key);line.textContent='Could not start VR: '+e.message;}};
 for(let i=0;i<2;i++){const c=r.xr.getController(i);sc.add(c);c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.5)]),new THREE.LineBasicMaterial({color:0xefbf7a})));c.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(c.matrixWorld);hit()});}
 }
 }catch(e){line.textContent='3D unavailable: '+e.message+'. Clearance checks remain usable.';}}
sync();paint();view();
