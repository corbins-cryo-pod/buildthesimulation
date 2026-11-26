import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,labels,shape} from '../../../../public/equipment/15-03/solver.mjs';
const $=k=>document.getElementById('cw-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,s=10,x=283,y=235,pt=([u,v])=>[x+u*s,y-v*s],r=shape(state.mode);
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.mode]+' · detached artwork',16,27);
 for(let i=-15;i<=22;i+=5){
  g.strokeStyle=i===0?'#8fbbb7':'#3c595e';g.beginPath();g.moveTo(...pt([i,-14]));g.lineTo(...pt([i,16]));if(i<=15){g.moveTo(...pt([-17,i]));g.lineTo(...pt([24,i]));}g.stroke();
 }
 const a=r.verticesMm.map(pt);g.beginPath();g.moveTo(...a[0]);a.slice(1).forEach(p=>g.lineTo(...p));
 if(r.areaMm2){g.closePath();g.fillStyle='#478b88';g.fill()}g.strokeStyle='#c6e7db';g.lineWidth=2;g.stroke();
 for(const [x,y] of a){g.fillStyle='#edc875';g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();}
 if(r.centroidMm){const [u,v]=pt(r.centroidMm);g.strokeStyle='#f7dfa2';g.beginPath();g.moveTo(u-6,v);g.lineTo(u+6,v);g.moveTo(u,v-6);g.lineTo(u,v+6);g.stroke();}
 g.fillStyle='#f4ead0';g.fillText('+X →    +Y ↑    unrelated paper coordinates (mm)',16,h-18);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=!r;
 $('result').textContent=r?`${r.markId} · filled area ${r.areaMm2} mm²\n`+(r.centroidMm?`Centroid (${r.centroidMm.join(', ')}) mm · perimeter ${r.perimeterMm.toFixed(3)} mm`:'Collinear marks do not define an enclosed area, perimeter or area centroid.'):'Inspect to read the area and centroid of the selected authored shape.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Inspected only the fixed artwork geometry.':'Detached artwork changed.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='15-03-artwork.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.27;orbit.maxDistance=7;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/15-03/catwalk-xt-107-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('ink_card_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.341,.233),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.92,2.25,4.03],[.255,.76,0]],shell:[[-.76,1.92,2.49],[0,1.145,.12]],display:[[1.25,1.47,1.20],[.971,.955,-.03]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-cw-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.cwView)});
 const probe=new T.Raycaster(),target=n('separate_stamp_cycle_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge changes only the detached artwork card.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached artwork comparison still works.';console.warn(e.message)});
