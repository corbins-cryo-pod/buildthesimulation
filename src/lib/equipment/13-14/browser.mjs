import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,drawing,titles} from '../../../../public/equipment/13-14/solver.mjs';
const $=k=>document.getElementById('hm-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,t=drawing(state.id),m=3.35,x0=204,y0=381;
 const pt=([x,y])=>[x0+x*m,y0-y*m];
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText(titles[state.id],16,27);
 for(let i=-40;i<=110;i+=10){g.strokeStyle=i===0?'#9ebfbd':'#3d5961';g.beginPath();g.moveTo(...pt([i,0]));g.lineTo(...pt([i,98]));g.stroke();}
 for(let i=0;i<=90;i+=10){g.strokeStyle=i===0?'#9ebfbd':'#3d5961';g.beginPath();g.moveTo(...pt([-40,i]));g.lineTo(...pt([110,i]));g.stroke();}
 const vertices=t.verticesMm.map(pt);
 g.beginPath();g.moveTo(...vertices[0]);vertices.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.fillStyle='#376e70';g.fill();g.lineWidth=2;g.strokeStyle='#9bdfd5';g.stroke();g.lineWidth=1;
 for(const [i,[x,y]] of vertices.entries()){g.beginPath();g.arc(x,y,4,0,2*Math.PI);g.fillStyle='#f0d49c';g.fill();g.fillText(t.pointIds[i],x+9,y+3);}
 g.fillStyle='#f4ead0';g.fillText('+X →    +Y ↑  Draft points in mm',16,h-18);
 g.beginPath();g.moveTo(w-115,h-21);g.lineTo(w-48,h-21);g.lineWidth=3;g.strokeStyle='#f4ead0';g.stroke();g.fillText('20 mm',w-112,h-29);
}
function sync(){
 const r=state.report;$('draft').value=state.id;$('json').disabled=!r;
 $('result').textContent=r?`P→R: ${r.diagonalPrMm} mm · area: ${r.areaMm2} mm²\nPerimeter: ${r.perimeterMm} mm · offset: (${r.shiftMm.join(', ')}) mm`:'Inspect the fixed drawing to calculate lengths and area.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Recorded measurements. The original diagram was not modified.':'Draft display updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('draft').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='13-14-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.155;orbit.maxDistance=4;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/13-14/hm325a-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('detached_diagram_screen_anchor').add(new T.Mesh(new T.PlaneGeometry(.210,.150),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[1.28,.85,1.43],[.145,.134,0]],shell:[[-.65,.68,1.16],[-.05,.15,.02]],display:[[.50,.46,.74],[.426,.126,.02]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-hm-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.hmView)});
 const probe=new T.Raycaster(),target=n('detached_diagram_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal badge switches the detached diagrams only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached diagram inspection still works.';console.warn(e.message)});
