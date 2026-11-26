import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,evaluate,labels} from '../../../../public/equipment/07-06/solver.mjs';
const $=k=>document.getElementById('ep-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,r=evaluate(state.mode),x=w/2,y=261,m=525;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.mode]+' · detached statics card',16,27);
 g.strokeStyle='#93bebb';g.lineWidth=4;g.beginPath();g.moveTo(53,y);g.lineTo(w-57,y);g.stroke();
 g.fillStyle='#839d9c';g.beginPath();g.moveTo(x,y);g.lineTo(x-32,y+54);g.lineTo(x+32,y+54);g.closePath();g.fill();
 g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText('reference pivot',x-75,y+84);
 for(const p of r.points){
  const u=x+p.xM*m, initial=y-p.forceDownN*21;
  g.lineWidth=3;g.strokeStyle='#efc776';g.fillStyle='#efc776';g.beginPath();g.moveTo(u,initial);g.lineTo(u,y-14);g.stroke();
  g.beginPath();g.moveTo(u,y-5);g.lineTo(u-8,y-19);g.lineTo(u+8,y-19);g.closePath();g.fill();
  g.fillText(`${p.id}: ${p.forceDownN} N ↓`,u-46,initial-12);
  g.fillStyle='#f4ead0';g.fillText(`${p.xM.toFixed(2)} m`,u-29,y+25);
 }
 g.fillStyle='#f4ead0';g.fillText('X →   Downward loads   Positive moment: counterclockwise',16,h-21);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`L: +${r.points[0].signedMomentNm.toFixed(2)} N·m · R: ${r.points[1].signedMomentNm.toFixed(2)} N·m\nNet moment: ${r.netMomentNm.toFixed(2)} N·m · ${r.classification}`:'Inspect to read both signed contributions and the net static moment.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Measured only the fixed diagram at its reference pivot.':'Detached statics card updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='07-06-statics.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.15;orbit.maxDistance=4;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/07-06/eppendorf-5810r-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('detached_statics_screen_anchor').add(new T.Mesh(new T.PlaneGeometry(.275,.188),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[1.15,1.16,2.12],[.17,.169,.01]],shell:[[-.63,.87,1.83],[-.021,.174,.02]],display:[[.70,.40,.73],[.614,.167,.05]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-ep-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.epView)});
 const probe=new T.Raycaster(),target=n('detached_statics_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge switches only the detached statics cards.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached statics comparison still works.';console.warn(e.message)});
