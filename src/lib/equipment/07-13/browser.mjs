import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,board,evaluate,labels} from '../../../../public/equipment/07-13/solver.mjs';
const $=k=>document.getElementById('ls-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,s=4,x=119,y=376,r=evaluate(state.mode);
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.mode],16,27);
 const rect=t=>[x+t.min[0]*s,y-t.max[1]*s,(t.max[0]-t.min[0])*s,(t.max[1]-t.min[1])*s];
 g.lineWidth=2;g.strokeStyle='#91b5b7';g.strokeRect(...rect(board));
 for(const [i,t] of r.tiles.entries()){
  const q=rect(t);g.fillStyle=['rgba(254,187,94,.68)','rgba(57,191,186,.69)','rgba(130,140,207,.68)'][i];g.fillRect(...q);g.strokeStyle='#f1dfb9';g.strokeRect(...q);
  g.fillStyle='#fff2d2';g.fillText(t.id,q[0]+7,q[1]+21);
 }
 g.fillStyle='#f4ead0';g.fillText('+X →   +Y ↑ · imaginary art poster in mm',16,h-16);
 g.strokeStyle='#f4ead0';g.lineWidth=3;g.beginPath();g.moveTo(w-150,h-22);g.lineTo(w-70,h-22);g.stroke();g.fillText('20 mm',w-145,h-28);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`Board state: ${r.label} · tile union ${r.occupiedMm2} mm²\nA/B overlap: ${r.pairs[0].overlapAreaMm2} mm² · B minimum boundary gap ${r.clearances[1].signedMinMm} mm`:'Inspect to calculate area and relative positions.';
 plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Inspected only the three authored rectangles on the poster.':'Detached poster updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='07-13-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.28;orbit.maxDistance=7;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/07-13/worthington-ls6000-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('packing_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.328,.222),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.41,1.98,3.38],[.38,.55,0]],shell:[[-.78,1.71,2.63],[0,.66,0]],display:[[1.27,1.47,1.17],[.915,.95,.05]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-ls-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.lsView)});
 const probe=new T.Raycaster(),target=n('detached_packing_switch');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge only switches the detached poster layouts.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached poster comparison still works.';console.warn(e.message)});
