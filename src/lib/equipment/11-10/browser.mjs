import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,labels,solve} from '../../../../public/equipment/11-10/solver.mjs';
const $=k=>document.getElementById('mt-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,r=solve(state.mode),open=state.mode==='gap', wire='#92c4bf', ink='#f7e8c2';
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle=ink;g.fillText(labels[state.mode]+' · detached drawing',17,28);
 const path=points=>{g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.stroke()};
 g.strokeStyle=wire;g.lineWidth=3;path([[280,170],[107,170],[107,247]]);path([[379,170],[552,170],[552,320],[107,320],[107,294]]);
 if(!open)path([[280,170],[379,170]]);
 else {path([[280,170],[303,170]]);path([[356,170],[379,170]]);g.strokeStyle='#eeb971';path([[306,168],[349,149]]);}
 for(const x of [173,433]){
  g.fillStyle='#235359';g.fillRect(x,153,81,34);g.strokeStyle=ink;g.lineWidth=2;g.strokeRect(x,153,81,34);
 }
 g.strokeStyle=ink;g.beginPath();g.arc(107,270,24,0,Math.PI*2);g.stroke();
 g.fillStyle=ink;g.fillText('3.3 kΩ',180,142);g.fillText('6.8 kΩ',440,142);g.fillText('1 V drawing reference',137,277);
 g.fillText('R1',201,219);g.fillText('R2',455,219);
 g.fillStyle=open?'#ffc483':'#9cddcc';g.fillText(open?'ideal open gap':'continuous connection',open?270:238,107);
 g.fillStyle=ink;g.fillText('Calculated current: '+r.currentMicroamp.toFixed(4)+' µA',18,h-22);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`Current: ${r.currentMicroamp.toFixed(4)} µA · total R: ${r.equivalentOhm===null?'open (no finite equivalent)':r.equivalentOhm+' Ω'}\nR1: ${r.resistiveDrops[0].dropV.toFixed(6)} V · R2: ${r.resistiveDrops[1].dropV.toFixed(6)} V · gap: ${r.gapDropV.toFixed(6)} V`:'Inspect to calculate the current and voltage drops on the unrelated paper illustration.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Computed ideal values from the authored card. No station state changed.':'Detached card changed.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='11-10-series-card.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.12;orbit.maxDistance=3;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/11-10/fixture-concept-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('circuit_card_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.168,.111),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[.56,.40,.72],[.133,.067,0]],shell:[[-.43,.37,.60],[.012,.061,0]],display:[[.32,.23,.34],[.287,.095,.026]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-mt-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.mtView)});
 const probe=new T.Raycaster(),target=n('detached_card_select_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge changes only the detached paper circuit snapshot.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The passive card comparison still works.';console.warn(e.message)});
