import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,cablePoints,SINK} from './solver.mjs';
const $=x=>document.getElementById('patch-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
function sync(){for(const [k,v] of Object.entries(s.configuration))els[k].value=String(v)}
function go(id,p){if(id==='toggle'&&s.configuration.plug!=='BNC')s=act(s,'plug','BNC');s=act(s,id,p);sync();draw()}
function draw(){const l=s.connection,w=s.waveform;
 $('mate').textContent=l?'Unmate cable':'Mate selected cable';
 $('status').textContent=s.error||(l?'Connected: '+l.sourcePort+' → '+l.sinkPort:'No connection. Choose a plug and receiver.');
 $('bend').textContent=s.configuration.radiusMm<20?'Illustrative bend warning: '+s.configuration.radiusMm+' mm is below the 20 mm demonstration limit.':'Demonstration bend radius: '+s.configuration.radiusMm+' mm.';
 $('result').textContent=w?'Received '+Math.max(...w.channels[0].samples)+' V on '+SINK+' · '+w.channels[0].samples.filter(v=>v!==0).length+' high samples at 0.1 ms spacing.':'No waveform received.';
 $('waveform').disabled=!w;$('connection').disabled=!l;
 chart(w);draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='radiusMm'?Number(v):v})};
form.onsubmit=e=>{e.preventDefault();s=act(s,s.connection?'unmate':'mate');sync();draw()};
$('pulse').onclick=()=>go('pulse');$('reset').onclick=()=>go('reset');
for(const k of ['waveform','connection'])$(k).onclick=()=>{const r=s[k];if(!r)return;const u=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=r.sampleId+'-r'+r.revision+'-'+k+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
function chart(r){const svg=$('chart');svg.replaceChildren();if(!r)return;
 const points=r.channels[0].samples, X=x=>56+332*x/(points.length-1),Y=v=>172-140*v/1.5;
 const add=(tag,a,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in a)e.setAttribute(k,a[k]);if(t!==undefined)e.textContent=t;svg.append(e)};
 for(const v of [0,.5,1,1.5]){add('line',{x1:56,x2:388,y1:Y(v),y2:Y(v),stroke:'currentColor',opacity:.2});add('text',{x:47,y:Y(v)+4,'text-anchor':'end',fill:'currentColor','font-size':11},String(v)+' V');}
 add('polyline',{points:points.flatMap((v,i)=>i?[[X(i),Y(points[i-1])],[X(i),Y(v)]]:[[X(0),Y(v)]]).map(p=>p.join(',')).join(' '),fill:'none',stroke:'#287f9b','stroke-width':3});
 add('text',{x:56,y:195,fill:'currentColor','font-size':12},'0 ms');add('text',{x:388,y:195,fill:'currentColor','font-size':12,'text-anchor':'end'},'5 ms');}
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(40,1,.001,3),o=new OrbitControls(c,can);o.minDistance=.045;o.maxDistance=1.36;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);


 const views={bench:[[.105,.151,.329],[0,.047,.053]],front:[[0,.092,.275],[0,.068,.024]],jack:[[.113,.104,.139],[.065,.065,.050]],tray:[[.033,.17,.14],[.005,.037,.082]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)look(e.target.dataset.view)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/16-13/connector-bench.glb')).scene;world.add(m);
 m.getObjectByName('bnc_lead').visible=false;
 const tip=m.getObjectByName('receive_plug_bnc'),z=tip.position.z;
 const lead=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#267187',roughness:.8}));world.add(lead);
 const indicator=new THREE.Mesh(new THREE.SphereGeometry(.00325,12,8),new THREE.MeshBasicMaterial({color:'#245e66'}));indicator.position.set(.066,.039,.024);world.add(indicator);
 let key='';
 draw3D=()=>{const linked=!!s.connection,show=s.configuration.plug==='BNC',cr=s.configuration.radiusMm;
  tip.position.z=z-(linked?.018:0);lead.visible=show;tip.visible=show;
  indicator.material.color.set(linked?'#36a576':'#53756c');
  if(show&&key!==cr+'-'+linked){key=cr+'-'+linked;const p=cablePoints(cr,linked).map(v=>new THREE.Vector3(...v)),path=new THREE.CurvePath();
   for(let k=1;k<p.length;k++)path.add(new THREE.LineCurve3(p[k-1],p[k]));lead.geometry.dispose();lead.geometry=new THREE.TubeGeometry(path,100,.002,10,false);}
  render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(m,true)){let x=h.object,a,visible=true;do{a??=x.userData.action;visible=visible&&x.visible;x=x.parent}while(x&&x!==sc);if(!visible)continue;if(a){const [id,p]=a.split(':');go(id,p)}break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · meter-scale connector bench.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,1.14,-.53);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Passive connection controls still work.';}}
sync();draw();setup();
