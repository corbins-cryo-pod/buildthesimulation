import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,ids,labels,readings,tile} from '../../../../public/equipment/13-08/solver.mjs';
const $=k=>document.getElementById('ice-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,t=tile(state.id);
 const [lo,,hi]=t.cornersMm,r=readings(state.id),s=3.6;
 const point=([x,y])=>[w/2+(x-(lo[0]+hi[0])/2)*s,h/2-(y-(lo[1]+hi[1])/2)*s];
 const [a,b,z,d]=t.cornersMm.map(point);
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.id]+' · authored outline',16,25);
 g.beginPath();g.moveTo(...a);[b,z,d,a].forEach(p=>g.lineTo(...p));g.fillStyle='#204d4d';g.fill();g.strokeStyle='#87d5c6';g.lineWidth=2;g.stroke();
 g.beginPath();g.setLineDash([6,5]);g.moveTo(...a);g.lineTo(...z);g.strokeStyle='#f8d38d';g.stroke();g.setLineDash([]);
 for(const p of [a,b,z,d]){g.beginPath();g.arc(...p,3,0,Math.PI*2);g.fillStyle='#f4ead0';g.fill();}
 g.fillStyle='#f4ead0';g.fillText(r.edgesMm[0]+' mm',w/2-25,a[1]+23);g.fillText(r.edgesMm[1]+' mm',z[0]+11,h/2+5);
 g.fillText('X →     Y ↑    Outline only',16,h-17);
 g.strokeStyle='#f7edde';g.lineWidth=3;g.beginPath();g.moveTo(w-137,h-24);g.lineTo(w-65,h-24);g.stroke();g.fillText('20 mm',w-131,h-31);
}
function sync(){
 const r=state.report;$('tile').value=state.id;$('json').disabled=!r;
 $('result').textContent=r?`Annotation ${r.revision} · diagonal ${r.diagonalMm.toFixed(2)} mm\nInterior unknown; the authored corners are unchanged.`:'Record an annotation to export the measured outline.';
 plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='annotate'?'Recorded detached outline dimensions only.':'Detached exhibit updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('tile').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','annotate','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='13-08-outline.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.3;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/13-08/leica-em-ice-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k), tiles=[n('detached_tile_a'),n('detached_tile_b')];
 for(const t of tiles)t.material=t.material.clone();
 const views={overall:[[2.70,2.09,3.60],[.30,.65,.03]],shell:[[.59,1.77,2.07],[-.10,.84,.05]],exhibit:[[1.32,1.41,1.39],[.93,.83,.14]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{const i=ids.indexOf(state.id);tiles.forEach((t,j)=>{t.material.emissive.setHex(i===j?0x136c63:0x000000);t.material.emissiveIntensity=i===j?.53:0;});draw()};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-ice-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.iceView)});
 const probe=new T.Raycaster(),target=n('detached_display_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal exhibit badge changes the detached tile only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The passive outline annotation still works.';console.warn(e.message)});
