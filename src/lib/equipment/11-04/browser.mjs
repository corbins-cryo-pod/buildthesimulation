import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,labels,view} from '../../../../public/equipment/11-04/solver.mjs';
const $=k=>document.getElementById('dc-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,s=11,x=w/2,y=h/2,point=([u,v])=>[x+u*s,y-v*s],v=view(state.mode);
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.mode]+' · independent inked card',16,27);
 for(let i=-15;i<=15;i+=5){
  g.strokeStyle=i===0?'#acc8c5':'#39545a';
  g.beginPath();g.moveTo(...point([i,-16]));g.lineTo(...point([i,16]));g.moveTo(...point([-19,i]));g.lineTo(...point([19,i]));g.stroke();
 }
 const [a,b]=v.plot.map(p=>point(p.viewMm));g.strokeStyle='#eccc84';g.lineWidth=2;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
 for(const p of v.plot){const [u,z]=point(p.viewMm);g.beginPath();g.arc(u,z,5,0,2*Math.PI);g.fillStyle='#f2d78f';g.fill();g.fillText(p.id,u+9,z-8);}
 g.fillStyle='#f4ead0';g.fillText('+X →    +Y ↑    Note: original points stay fixed',16,h-17);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`A→B: (${r.vectorMm.join(', ')}) mm · distance ${r.pairLengthMm.toFixed(6)} mm\n`+r.plot.map(p=>`${p.id} authored (${p.xyMm.join(', ')}) → view (${p.viewMm.join(', ')}) mm`).join('\n'):'Inspect to measure the signed vector and distance on the displayed card.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Read the paper coordinates only.':'The detached card orientation changed.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='11-04-coordinate-card.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.12;orbit.maxDistance=3;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/11-04/doric-nc500-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('coordinate_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.151,.103),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[.65,.59,1.35],[.190,.063,.002]],console:[[-.47,.48,.81],[.106,.025,.003]],cube:[[.469,.179,.322],[.297,.027,0]],display:[[.56,.22,.35],[.513,.112,.015]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-dc-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.dcView)});
 const probe=new T.Raycaster(),target=n('detached_card_switch');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge switches only the separate coordinate card.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached coordinate card still works.';console.warn(e.message)});
