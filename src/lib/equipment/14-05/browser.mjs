import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {state,act,csv,SITES} from '../../../../public/equipment/14-05/solver.mjs';
const s=state(), $=id=>document.getElementById('pi-'+id);let pose=()=>{};
function plot(){
 const c=$('chart'),g=c.getContext('2d'),r=s.result,w=c.width,h=c.height;
 g.fillStyle='#19353c';g.fillRect(0,0,w,h);g.font='16px sans-serif';g.fillStyle='#f3e9d0';g.fillText('Force (nN)',14,19);g.fillText('Indentation δ (µm)',w/2-63,h-10);
 if(!r){g.fillText('Run the two-site reference to show the force curves.',23,h/2);return}
 const site=r.sites,Xmax=Math.max(...site.map(x=>Math.max(...x.trace.map(p=>p.indentationM))))*1e6,Ymax=Math.max(...site.map(x=>Math.max(...x.trace.map(p=>Math.max(p.forceN,p.fitForceN)))))*1e9;
 const X=x=>62+x/(Xmax||1)*(w-115),Y=y=>31+(1-y/(Ymax||1))*(h-84);
 for(let i=0;i<5;i++){let x=X(Xmax*i/4),y=Y(Ymax*i/4);g.strokeStyle='#567275';g.beginPath();g.moveTo(x,31);g.lineTo(x,h-53);g.moveTo(62,y);g.lineTo(w-53,y);g.stroke();g.fillStyle='#f3e9d0';g.fillText((Xmax*i/4).toFixed(2),x-15,h-32);g.fillText((Ymax*i/4).toFixed(0),4,y+4)}
 for(const s of site){const col=s.siteId==='A'?'#ecae64':'#66d6d9';g.strokeStyle=col;g.fillStyle=col;g.lineWidth=2;g.beginPath();s.trace.forEach((p,i)=>i?g.lineTo(X(p.indentationM*1e6),Y(p.fitForceN*1e9)):g.moveTo(X(p.indentationM*1e6),Y(p.fitForceN*1e9)));g.stroke();
  s.trace.filter((_,i)=>i%5===0).forEach(p=>{g.beginPath();g.arc(X(p.indentationM*1e6),Y(p.forceN*1e9),3,0,2*Math.PI);g.fill()});
 }
}
function sync(){
 $('load').textContent=s.loaded?'Unload fixture':'Load fixture';$('move').textContent=s.approached?'Retract probe':'Approach';$('site').value=s.site;
 $('json').disabled=$('csv').disabled=!s.result;$('results').textContent=s.result?s.result.sites.map(o=>[o.siteId+' ('+o.coordinatesMm.x+', '+o.coordinatesMm.y+') mm','Fit '+(o.apparentReducedPa/1000).toFixed(4)+' kPa  |  Reference '+(o.knownReducedPa/1000).toFixed(1)+' kPa','Residual RMS '+(o.residualRmsN*1e9).toExponential(2)+' nN'].join('\n')).join('\n\n'):'No current map acquired.';
 plot();pose();
}
function run(a,p){
 const x=$('status');
 try{act(s,a,p);x.textContent=s.result?'Acquired '+s.result.sites.length+' site(s). Compare fits and reference coordinates.':'Fixture updated.';x.classList.remove('error')}
 catch(e){x.textContent=e.message;x.classList.add('error')}
 sync();
}
for(const [i,a] of [['load','load'],['move','approach'],['run','acquire'],['map','map']])$(i).onclick=()=>run(a);
$('site').onchange=e=>run('site',+e.target.value);
for(const [i,k,scale] of [['radius','radiusM',1e-6],['k','stiffnessNPerM',1],['thick','sampleThicknessM',1e-3]])$(i).onchange=e=>run('set',{[k]:e.target.valueAsNumber*scale});
$('depth').onchange=e=>run('depth',e.target.valueAsNumber*1e-6);
function download(x,file,type){const u=URL.createObjectURL(new Blob([x],{type})),a=document.createElement('a');a.href=u;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
$('json').onclick=()=>s.result&&download(JSON.stringify(s.result,null,2),'14-05-indentation-map.json','application/json');
$('csv').onclick=()=>s.result&&download(csv(s.result),'14-05-indentation-curves.csv','text/csv');
sync();
async function model(){
 const stage=$('view'),r=new T.WebGLRenderer({antialias:true});r.setClearColor(0xd7dddf);r.setPixelRatio(Math.min(devicePixelRatio||1,1.8));r.xr.enabled=true;r.xr.setReferenceSpaceType('local-floor');stage.append(r.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.add(new T.HemisphereLight(0xffffff,0xb4c6c9,2.9));const key=new T.DirectionalLight(0xfff9e9,2.5);key.position.set(.35,.7,.53);scene.add(key);
 const cam=new T.PerspectiveCamera(35,1,.001,10),orbit=new OrbitControls(cam,r.domElement);orbit.minDistance=.04;orbit.maxDistance=1.6;
 const a=await new GLTFLoader().loadAsync('/equipment/14-05/piuma.glb');root.add(a.scene);const n=k=>a.scene.getObjectByName(k);
 const options={overall:[[.27,.25,.48],[0,.13,0]],probe:[[.061,.117,.19],[0,.074,.026]],rear:[[.25,.21,-.45],[0,.14,-.025]]};let v='overall',xr=false;
 const draw=()=>{if(!xr)r.render(scene,cam)};
 function snap(x){v=x;cam.position.set(...options[x][0]);orbit.target.set(...options[x][1]);orbit.update();draw()}
 pose=()=>{const p=SITES[s.site];n('xy_stage').position.x=-p.xMm/1000;n('xy_stage').position.z=.023+p.yMm/1000;n('coupon_pair').visible=s.loaded;n('probe_carriage').position.y=s.approached?-.005:0;draw()};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!xr&&stage.clientWidth&&stage.clientHeight){r.setSize(stage.clientWidth,stage.clientHeight,false);cam.aspect=stage.clientWidth/stage.clientHeight;cam.updateProjectionMatrix();draw()}}).observe(stage);
 for(const a of document.querySelectorAll('[data-pi-camera]'))a.onclick=()=>snap(a.dataset.piCamera);
 const pick=new T.Raycaster(),hot=n('approach_input');
 function select(ray){root.updateMatrixWorld(true);pick.ray.copy(ray);if(pick.intersectObject(hot,true).length)run('approach')}
 let p=null;r.domElement.addEventListener('pointerdown',e=>p=[e.clientX,e.clientY]);r.domElement.addEventListener('pointerup',e=>{if(!p||Math.hypot(e.clientX-p[0],e.clientY-p[1])>5)return;p=null;const q=stage.getBoundingClientRect();pick.setFromCamera(new T.Vector2(2*(e.clientX-q.left)/q.width-1,1-2*(e.clientY-q.top)/q.height),cam);select(pick.ray)});
 snap(v);pose();
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const b=$('vr');b.hidden=false;b.onclick=async()=>{try{const g=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});xr=true;orbit.enabled=false;root.position.set(0,.87,-.49);await r.xr.setSession(g);r.setAnimationLoop(()=>r.render(scene,cam));g.addEventListener('end',()=>{r.setAnimationLoop(null);xr=false;orbit.enabled=true;root.position.set(0,0,0);snap(v)})}catch(e){$('ready').textContent=e.message}};
  for(let i=0;i<2;i++){const c=r.xr.getController(i);scene.add(c);c.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:0xffbe6a})));c.addEventListener('select',()=>select(new T.Ray(new T.Vector3().setFromMatrixPosition(c.matrixWorld),new T.Vector3(0,0,-1).transformDirection(c.matrixWorld))))}
 }
 $('ready').textContent='3D asset loaded · nominal metric scale · 1,618 triangles.';
}
model().catch(e=>{$('ready').textContent='3D unavailable. The Hertz exercise and exports still work.';console.warn(e.message)});
