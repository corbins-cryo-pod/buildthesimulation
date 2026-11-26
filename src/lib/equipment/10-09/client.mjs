import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv,replay} from './solver.mjs';
const $=x=>document.getElementById('rhs-'+x),form=$('form'),can=$('model'),baseline=replay('A-01');
let s=initial(),draw3D=()=>{};
const fmt=v=>Number(v.toPrecision(5)).toString();
function go(id,p){s=act(s,id,p);$('channel').value=s.selected;draw()}
function draw(){const r=s.result,p=r?.playback;
 $('status').textContent=s.error||(p?'Stored synthetic trace · '+r.channels[0].id+' · '+p.headstageId:'No trace loaded.');
 $('result').textContent=r?'Marker '+fmt(p.markerTimeS*1000)+' ms · '+(p.relativeToAms>=0?'+':'')+fmt(p.relativeToAms)+' ms vs A-01 · '+r.channels[0].samples.length+' native samples.':'No samples available.';
 $('align').setAttribute('aria-pressed',String(s.relative));$('align').textContent=s.relative?'Show native clock':'Align labels to A-01 marker';
 $('json').disabled=!r;$('csv').disabled=!r;chart(r);draw3D();}
form.onsubmit=e=>{e.preventDefault();go('read')};$('channel').oninput=e=>go('select',e.target.value);
$('align').onclick=()=>go('align');$('reset').onclick=()=>go('reset');
for(const k of ['json','csv'])$(k).onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([k==='json'?JSON.stringify(r,null,2)+'\n':csv(r)],{type:k==='json'?'application/json':'text/csv'})),n=document.createElement('a');n.href=u;n.download=r.sampleId+'-'+r.channels[0].id+'-r'+r.revision+'.'+k;n.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
function chart(r){const svg=$('chart');svg.replaceChildren();if(!r)return;
 const vs=r.channels[0].samples,X=i=>61+i*353/(vs.length-1),Y=v=>99-v*4200;
 const add=(tag,a,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in a)e.setAttribute(k,a[k]);if(t!==undefined)e.textContent=t;svg.append(e)};
 for(const v of [-.016,-.008,0,.008,.016]){add('line',{x1:61,x2:414,y1:Y(v),y2:Y(v),stroke:'currentColor',opacity:.18});add('text',{x:51,y:Y(v)+4,'text-anchor':'end',fill:'currentColor','font-size':11},fmt(v*1000)+' mV');}
 const Xms=(i,off)=>fmt(i*r.dtS*1000-off)+' ms';
 for(const [i,o] of [[0,'start'],[40,'middle'],[80,'middle'],[120,'end']])add('text',{x:X(i),y:192,'text-anchor':o,fill:'currentColor','font-size':12},Xms(i,s.relative?20:0));
 function graph(data,color,dashes){const points=data.flatMap((v,i)=>i?[[X(i),Y(data[i-1])],[X(i),Y(v)]]:[[X(0),Y(v)]]).map(p=>p.join(',')).join(' ');
 add('polyline',{points,fill:'none',stroke:color,'stroke-width':2.65,...(dashes?{'stroke-dasharray':dashes}:{})});}
 if(r.channels[0].id!=='A-01')graph(baseline.channels[0].samples,'#7b8b8e','4 3');
 graph(vs,'#207e97');add('line',{x1:X(r.playback.markerIndex),x2:X(r.playback.markerIndex),y1:12,y2:171,stroke:'#b86d42','stroke-dasharray':'4 4','stroke-width':2});}
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(38,1,.001,4),o=new OrbitControls(c,can);o.minDistance=.031;o.maxDistance=2;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.294,.283,.724],[.001,.021,.056]],front:[[0,.137,.695],[0,.029,.091]],rear:[[.269,.204,-.60],[0,.024,-.056]],headstage:[[.043,.191,.339],[-.061,.013,.209]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{const k=e.target.dataset.view;if(k&&!r.xr.isPresenting)look(k)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/10-09/intan-rhs-m4200.glb')).scene;world.add(m);
 const lights='ABCD'.split('').map(k=>{const port=m.getObjectByName('port_'+k),l=new THREE.Mesh(new THREE.SphereGeometry(.0023,14,10),new THREE.MeshBasicMaterial({color:'#647077'}));l.position.set(port.position.x,.015,.106);world.add(l);return [k,l];});
 draw3D=()=>{for(const [k,l] of lights)l.material.color.set(s.selected[0]===k?s.result?'#64c088':'#da714b':'#62727e');render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action||(x.name?.startsWith('red_lead_')?'select:'+x.name.slice(-1)+'-01':null);visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · 1U rack with passive port targets.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,1.06,-.50);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Read-only timeline controls still work.';}}
go('read');setup();
