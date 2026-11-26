import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=q=>document.querySelector(q),form=$('#t-config'),fields=form.elements,canvas=$('#t-model');
let s=initial(),updateModel=()=>{};
const num=(n,p=5)=>n===null?'—':Number(n.toPrecision(p)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))fields[k].value=String(v)}
function go(action,value){s=act(s,action,value);if(action==='reset')sync();draw()}
function draw(){
 for(const k of ['upper','lower'])$('#t-'+k).textContent=(s[k]?'Open ':'Close ')+k+' grip';$('#t-load').textContent=s.loaded?'Remove coupon':'Place coupon';
 $('#t-status').textContent=s.error||(s.loaded?'Mounted':'Coupon absent')+' · '+(s.upper&&s.lower?'grips closed':'one or both grips open')+' · '+(s.zeroSet?'zero set.':'zero required.');
 const r=s.result,e=r?.points.at(-1);
 $('#t-result').textContent=r?'Revision '+r.revision+' · Last force '+(e.forceN===null?'withheld':num(e.forceN)+' N')+' · Initial slope '+(r.fit.stiffnessNPerM===null?'not fitted':num(r.fit.stiffnessNPerM/1000)+' N/mm')+' · Modulus '+(r.fit.modulusPa===null?'not fitted':num(r.fit.modulusPa/1e9)+' GPa')+' · '+r.overRangeCount+' over range; '+r.outsideDomainCount+' outside domain.':'No measurement yet.';
 for(const k of ['json','csv'])$('#t-'+k).disabled=!r;plot($('#t-force'),r,'force');plot($('#t-stress'),r,'stress');updateModel();
}
form.addEventListener('submit',e=>{e.preventDefault();go('run')});form.addEventListener('input',e=>{const {name:k,value:v}=e.target;if(k)go('set',{[k]:k==='sampleId'?v:v===''?NaN:Number(v)})});
for(const k of ['upper','lower','load','zero','reset'])$('#t-'+k).onclick=()=>go(k);
for(const k of ['json','csv'])$('#t-'+k).onclick=()=>{if(!s.result)return;const r=s.result,d=k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n',u=URL.createObjectURL(new Blob([d],{type:k==='csv'?'text/csv':'application/json'})),link=document.createElement('a');link.href=u;link.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-tension.'+k;link.click();setTimeout(()=>URL.revokeObjectURL(u),1600)};
function plot(svg,r,key){svg.replaceChildren();if(!r)return;const a=(tag,props,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in props)e.setAttribute(k,props[k]);if(t!==undefined)e.textContent=t;svg.append(e)};
 const force=key==='force',points=r.points.map(x=>({x:force?x.crossheadM*1000:x.engineeringStrain===null?null:x.engineeringStrain*100,y:force?x.forceN:x.engineeringStressPa===null?null:x.engineeringStressPa/1e6,flag:x.overRange})),
 xmax=Math.max(1e-6,...points.map(p=>p.x??0)),ymax=Math.max(1,...points.map(p=>p.y??0)),X=x=>60+460*x/xmax,Y=y=>155-121*y/ymax;
 for(const i of [0,.5,1]){a('line',{x1:60,y1:Y(i*ymax),x2:520,y2:Y(i*ymax),stroke:'currentColor',opacity:.22});a('text',{x:2,y:Y(i*ymax)+5,fill:'currentColor','font-size':12},num(i*ymax));a('text',{x:X(i*xmax)-9,y:177,fill:'currentColor','font-size':12},num(i*xmax));}
 let d='',start=true;for(const p of points){if(p.x===null||p.y===null){start=true;if(p.flag&&p.x!==null)a('circle',{cx:X(p.x),cy:30,r:2,fill:'#aa573e'});continue;}d+=(start?'M':'L')+X(p.x)+' '+Y(p.y);start=false;}
 a('path',{d,fill:'none',stroke:'currentColor','stroke-width':2.5});
 a('text',{x:12,y:17,fill:'currentColor','font-size':14},force?'Force (N)':'Engineering stress (MPa)');a('text',{x:299,y:193,fill:'currentColor','font-size':13},force?'Crosshead (mm)':'Gauge strain (%)');
}
async function three(){
 const status=$('#t-asset');
 try{
 const ren=new THREE.WebGLRenderer({canvas,antialias:true});ren.setPixelRatio(Math.min(devicePixelRatio,1.7));ren.outputColorSpace=THREE.SRGBColorSpace;ren.xr.enabled=true;
 const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);scene.background=new THREE.Color('#ebe8df');
 scene.add(new THREE.HemisphereLight(0xfff7e4,0x9caebd,2.5));const sunlight=new THREE.DirectionalLight(0xfffdfa,2.2);sunlight.position.set(2,3,3);scene.add(sunlight);const rim=new THREE.DirectionalLight(0xa5d2ff,1.2);rim.position.set(-2,2,-2);scene.add(rim);
 const camera=new THREE.PerspectiveCamera(33,1,.004,14),orbit=new OrbitControls(camera,canvas);orbit.minDistance=.19;orbit.maxDistance=6;
 const render=()=>ren.render(scene,camera);orbit.addEventListener('change',render);
 const size=()=>{const {width,height}=canvas.getBoundingClientRect();ren.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();render()};new ResizeObserver(()=>{if(!ren.xr.isPresenting)size()}).observe(canvas);
 const views={bench:[[1.25,1.3,2.65],[-.20,.69,0]],front:[[0,.69,2.61],[0,.69,0]],side:[[2.4,.91,.08],[0,.68,0]],rear:[[.36,.96,-2.5],[0,.68,0]],grips:[[.19,.493,.64],[.009,.367,.143]]};
 let active='bench';const view=k=>{active=k;camera.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();render()};
 $('#t-views').onclick=e=>{if(e.target.dataset.view&&!ren.xr.isPresenting)view(e.target.dataset.view)};size();view(active);
 const model=(await new GLTFLoader().loadAsync('/equipment/14-01/instron-5944.glb')).scene;world.add(model);
 const n=k=>model.getObjectByName(k),cross=n('crosshead'),upper=n('upper_grip'),lower=n('lower_grip'),uj=n('upper_jaw'),lj=n('lower_jaw'),coupon=n('coupon'),y0=upper.position.y;
 const cv=document.createElement('canvas');cv.width=512;cv.height=312;const ctx=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.298,.179),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(-.56,.77,.190);screen.userData.action='run';world.add(screen);
 updateModel=()=>{const e=s.result?.points.at(-1),d=e?.crossheadM??0,g=e?.gaugeM??0;
  cross.position.y=d;upper.position.y=y0+d;uj.position.set(s.upper?0:.009,d,0);lj.position.x=s.lower?0:.009;
  upper.rotation.y=s.upper?0:.08;lower.rotation.y=s.lower?0:-.08;
  coupon.visible=s.loaded;coupon.scale.set(s.config.widthMm/5,(s.config.gaugeMm+g*1000)/25,s.config.thicknessMm);
  ctx.fillStyle='#172931';ctx.fillRect(0,0,512,312);ctx.fillStyle='#bdd9ea';ctx.font='bold 30px sans-serif';ctx.fillText('5944  /  TENSION',20,48);
  ctx.font='23px sans-serif';ctx.fillText(s.config.cellN+' N range  /  '+(s.zeroSet?'Zeroed':'Zero required'),20,96);
  ctx.fillStyle='#faf0c8';ctx.fillText(e?(e.forceN===null?'Reading withheld':num(e.forceN)+' N'):'Select display to run',20,176);
  ctx.fillStyle='#bdd9ea';ctx.fillText('SIMULATED  /  ACQUIRE',20,264);tex.needsUpdate=true;render();};
 const ray=new THREE.Raycaster(),p=new THREE.Vector2();let press;
 const hit=()=>{for(const h of ray.intersectObject(world,true)){let o=h.object,a,visible=true;do{a??=o.userData.action;visible&&=o.visible;o=o.parent}while(o&&o!==scene);if(!visible)continue;if(a)go(a);break;}};
 canvas.addEventListener('pointerdown',e=>press=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=canvas.getBoundingClientRect();p.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(p,camera);hit()});
 status.textContent='3D asset loaded · meter-scale frame, clickable load train and host panel.';updateModel();
 const x=$('#t-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){
  x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(ren.xr.isPresenting){await ren.xr.getSession().end();return;}try{const v=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});ren.xr.setReferenceSpaceType('local-floor');world.position.set(.18,.76,-.93);orbit.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();await ren.xr.setSession(v);ren.setAnimationLoop(render);x.textContent='Exit VR';v.addEventListener('end',()=>{ren.setAnimationLoop(null);world.position.set(0,0,0);orbit.enabled=true;size();view(active);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);orbit.enabled=true;view(active);status.textContent='Could not start VR: '+e.message;}};
  for(let i=0;i<2;i++){const c=ren.xr.getController(i);scene.add(c);c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.3)]),new THREE.LineBasicMaterial({color:0xffd294})));c.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(c.matrixWorld);hit()});}
 }
 }catch(e){status.textContent='3D unavailable: '+e.message+'. Measurement controls remain usable.';}
}
sync();draw();three();
