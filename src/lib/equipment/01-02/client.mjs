import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=x=>document.getElementById('slab-'+x),form=$('form'),els=form.elements,can=$('model');
let s=initial(),draw3D=()=>{};
const fmt=x=>Number(x.toPrecision(6)).toString(),err=x=>x.toExponential(2);
function sync(){for(const [k,v] of Object.entries(s.config))els[k].value=String(v)}
function go(id,v){s=act(s,id,v);if(['grid','reverse','reset'].includes(id))sync();draw()}
function draw(){const r=s.result;
 $('status').textContent=s.error|| (r?'Solved · sample '+r.sampleId+' · revision '+r.revision:'Ready to solve at '+s.config.nx+' subdivisions in X.');
 $('result').textContent=r?'Current '+fmt(r.total.currentA*1000)+' mA · center '+fmt(r.total.centerV)+' V · analytic '+fmt(r.total.exactCurrentA*1000)+' mA.':'Run the solver to read current and potential.';
 $('json').disabled=!r;$('csv').disabled=!r;
 const table=$('study');table.replaceChildren();
 for(const v of r?.study??[]){const tr=document.createElement('tr');for(const k of [v.nx+' × '+v.ny,err(v.currentErrorA),err(v.maxPotentialErrorV),err(v.relativeResidual)]){const d=document.createElement('td');d.textContent=k;tr.append(d)}table.append(tr)}
 chart(r);draw3D();}
form.oninput=e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})};
form.onsubmit=e=>{e.preventDefault();go('run')};
for(const k of ['grid','reverse','reset'])$(k).onclick=()=>go(k);
for(const k of ['json','csv'])$(k).onclick=()=>{const r=s.result;if(!r)return;const u=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'slab')+'-r'+r.revision+'-ohmic.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
function rows(r){const l=r.mesh.nx+1,j=Math.floor(r.mesh.ny/2);return r.points.slice(j*l,(j+1)*l)}
function chart(r){const svg=$('chart');svg.replaceChildren();if(!r)return;
 const ps=rows(r), lo=Math.min(0,...ps.map(x=>x.potentialV)), hi=Math.max(lo+1,...ps.map(x=>x.potentialV)), L=r.configuration.lengthMm/1000;
 const add=(tag,a,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in a)e.setAttribute(k,a[k]);if(t!==undefined)e.textContent=t;svg.append(e)};
 const X=x=>56+332*x/L,Y=v=>181-147*(v-lo)/(hi-lo);
 for(let i=0;i<=4;i++){const v=(hi-lo)*i/4+lo;add('line',{x1:56,x2:388,y1:Y(v),y2:Y(v),stroke:'currentColor',opacity:.2});add('text',{x:47,y:Y(v)+4,'text-anchor':'end',fill:'currentColor','font-size':11},fmt(v)+' V');}
 add('polyline',{points:ps.map(p=>X(p.xM)+','+Y(p.potentialV)).join(' '),fill:'none',stroke:'#338aa4','stroke-width':3});
 for(const p of ps)add('circle',{cx:X(p.xM),cy:Y(p.potentialV),r:2.8,fill:'#68b1c2'});
 add('text',{x:56,y:204,fill:'currentColor','font-size':12},'0 mm');add('text',{x:388,y:204,fill:'currentColor','font-size':12,'text-anchor':'end'},fmt(L*1000)+' mm');}
async function setup(){const status=$('asset');try{
 const r=new THREE.WebGLRenderer({canvas:can,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.xr.enabled=true;const sc=new THREE.Scene(),world=new THREE.Group();sc.add(world);sc.background=new THREE.Color('#ebe8e0');
 sc.add(new THREE.HemisphereLight(0xfff7e5,0xa6b5c2,2.45));for(const [p,co,k] of [[[1,2,2],0xfffbef,2.4],[[-2,1,-2],0xa7d2ee,1.3]]){const z=new THREE.DirectionalLight(co,k);z.position.set(...p);sc.add(z);}
 const c=new THREE.PerspectiveCamera(35,1,.006,12),o=new OrbitControls(c,can);o.minDistance=.18;o.maxDistance=7;
 const render=()=>r.render(sc,c),size=()=>{const {width,height}=can.getBoundingClientRect();c.aspect=width/Math.max(1,height);c.updateProjectionMatrix();r.setSize(width,height,false);render();};
 o.addEventListener('change',render);new ResizeObserver(()=>{if(!r.xr.isPresenting)size()}).observe(can);

 const views={bench:[[1.17,1.52,2.89],[0,.75,.0]],front:[[0,1.02,2.80],[0,.73,.02]],controls:[[.84,1.39,.88],[.20,.87,.075]],screens:[[.40,1.37,1.43],[0,1.10,-.17]]};let current='bench';const look=n=>{current=n;c.position.set(...views[n][0]);o.target.set(...views[n][1]);o.update();render();};
 $('views').onclick=e=>{if(e.target.dataset.view&&!r.xr.isPresenting)look(e.target.dataset.view)};size();look(current);
 const m=(await new GLTFLoader().loadAsync('/equipment/01-02/workstation.glb')).scene;world.add(m);
 function screen(w,h,p,action){
  const cv=document.createElement('canvas');cv.width=480;cv.height=280;const g=cv.getContext('2d'),tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;
  const n=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx}));n.position.set(...p);n.userData.action=action;world.add(n);return [g,tx];
 }
 const [g,t]=screen(.52,.296,[-.26,1.142,-.169],'run'),[ref,tr]=screen(.421,.245,[.305,1.105,-.169]);
 function cover(ctx,title){ctx.fillStyle='#192b3b';ctx.fillRect(0,0,480,280);ctx.font='bold 19px monospace';ctx.fillStyle='#a0d7e8';ctx.fillText(title,20,30)}
 draw3D=()=>{cover(g,'OHMIC FIELD / SOLVE');cover(ref,'BOUNDARY CONDITIONS');const z=s.result;
  g.fillStyle='#ffda87';g.font='22px monospace';g.fillText(z?fmt(z.total.currentA*1000)+' mA     '+fmt(z.total.centerV)+' V @ center':'Select display to solve',20,69);
  if(z){const p=rows(z),min=Math.min(...p.map(v=>v.potentialV)),max=Math.max(...p.map(v=>v.potentialV));g.strokeStyle='#a0d7e8';g.lineWidth=2.5;g.beginPath();p.forEach((v,i)=>{const x=28+418*i/(p.length-1),y=221-118*(v.potentialV-min)/(max-min||1);if(i)g.lineTo(x,y);else g.moveTo(x,y)});g.stroke();}
  g.font='17px monospace';g.fillText(s.config.nx+' X subdivisions · neutral slab',20,260);
  ref.fillStyle='#ffda87';ref.font='23px monospace';ref.fillText(String(s.config.leftV)+' V   /   '+String(s.config.rightV)+' V',47,90);
  ref.fillStyle='#4998ac';ref.fillRect(48,114,360,103);ref.fillStyle='#f0c674';ref.fillRect(46,112,15,107);ref.fillRect(396,112,15,107);ref.strokeStyle='#b8dae5';ref.setLineDash([9,6]);ref.strokeRect(61,112,335,106);ref.setLineDash([]);
  ref.fillStyle='#a0d7e8';ref.font='18px monospace';ref.fillText('Insulated sides · meters',34,255);
  t.needsUpdate=tr.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();let press;const hit=()=>{for(const h of ray.intersectObject(world,true)){let x=h.object,a;do{a??=x.userData.action;x=x.parent}while(x&&x!==sc);if(a)go(a);break;}};
 can.onpointerdown=e=>press=[e.clientX,e.clientY];can.onpointerup=e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=can.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);hit()};status.textContent='3D asset loaded · original meter-scale electrical console.';draw3D();
 const x=$('xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(r.xr.isPresenting){await r.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});r.xr.setReferenceSpaceType('local-floor');world.position.set(0,0,-1.06);o.enabled=false;c.position.set(0,0,0);c.quaternion.identity();await r.xr.setSession(v);r.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{r.setAnimationLoop(null);world.position.set(0,0,0);o.enabled=true;size();look(current);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);o.enabled=true;look(current);status.textContent='VR unavailable: '+e.message;}};
 for(let i=0;i<2;i++){const p=r.xr.getController(i);sc.add(p);p.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xe7bb86})));p.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(p.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(p.matrixWorld);hit()});}}
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Electrical solve controls still work.';}}
sync();draw();setup();
