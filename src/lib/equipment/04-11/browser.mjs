import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,markers,measure} from '../../../../public/equipment/04-11/solver.mjs';
const $=k=>document.getElementById('gx-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,m=3,point=([x,y])=>[285+x*m,200-y*m],a=measure(state.mode),[x,y]=point(a.centerMm);
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText('Detached circle drawing · '+state.mode,16,26);
 g.beginPath();g.arc(x,y,a.radiusMm*m,0,2*Math.PI);g.fillStyle='#24474f';g.fill();g.lineWidth=1.5;g.strokeStyle='#83bdbb';g.stroke();
 g.beginPath();g.moveTo(x-8,y);g.lineTo(x+8,y);g.moveTo(x,y-8);g.lineTo(x,y+8);g.stroke();g.lineWidth=1;
 const ps=[...markers,a.heldOutPointMm];
 for(const [i,p] of ps.entries()){const [u,v]=point(p);g.beginPath();g.arc(u,v,i===3?5:4,0,2*Math.PI);g.fillStyle=i===3?'#f4d68d':'#a9e8dc';g.fill();g.fillText('ABCD'[i],u+10,v+4);}
 g.fillStyle='#f4ead0';g.fillText('+X →   +Y ↑   independent layout (mm)',16,h-19);
 g.strokeStyle='#f4ead0';g.lineWidth=3;g.beginPath();g.moveTo(w-139,h-23);g.lineTo(w-79,h-23);g.stroke();g.fillText('20 mm',w-136,h-29);
}
function sync(){
 const r=state.report;$('mode').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`Center (${r.centerMm.join(', ')}) mm · radius ${r.radiusMm.toFixed(2)} mm\nPoint D residual ${r.radialResidualMm.toFixed(2)} mm`:'Inspect the drawing to calculate its center and point D residual.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Measured the drawing only. Point D was not used to fit the circle.':'Detached drawing updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('mode').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='04-11-circle.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.30;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/04-11/minimill-gx-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('circle_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.366,.244),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.45,2.54,3.90],[.39,.89,0]],shell:[[.16,1.78,2.95],[0,1.23,.11]],display:[[1.31,1.48,1.30],[1.022,1.01,.14]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-gx-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.gxView)});
 const probe=new T.Raycaster(),target=n('detached_diagram_switch');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal badge switches independent drawing views only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached circle inspection still works.';console.warn(e.message)});
