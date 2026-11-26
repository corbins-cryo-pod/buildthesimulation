import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,imageTrack,titles} from '../../../../public/equipment/12-09/solver.mjs';
const $=k=>document.getElementById('ely-'+k);let state=blank(),pose=()=>{};
function drawImage(track){
 const p=imageTrack(track),c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,s=5,side=64*s,x=(w-side)/2,y=(h-side)/2;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText(titles[track]+' · synthetic comparison',16,25);
 if(!p.available){g.fillText('No image staged for this track',x-24,y+side/2);return}
 for(let j=0;j<64;j++)for(let i=0;i<64;i++){
  const u=p.values[i+64*j];g.fillStyle='rgb('+[Math.round(34+213*u),Math.round(39+194*u),Math.round(56+146*u)].join(',')+')';g.fillRect(x+i*s,y+(63-j)*s,s,s);
 }
 g.strokeStyle='#8bb7b2';g.lineWidth=1;g.strokeRect(x,y,side,side);g.fillStyle='#f7edde';
 g.fillText('X →    Y ↑ · equal intensity scale',16,h-14);
 g.strokeStyle='#fff5df';g.lineWidth=3;g.beginPath();g.moveTo(w-85,h-19);g.lineTo(w-35,h-19);g.stroke();g.fillText('1 µm',w-80,h-27);
}
function sync(){
 const r=state.report,f=r?.analysis.frequency, p=imageTrack(state.track);$('track').value=state.track;
 $('result').textContent=f?[
  `Frequency: ${f.cyclesPerUm.toFixed(6)} cycles/µm; pitch: ${f.pitchUm.toFixed(6)} µm`,
  `Frequency vector: ${f.vectorDeg.toFixed(3)}° CCW from +X (unoriented axis)`,
  `Relative contrast: ${f.contrast.toFixed(6)}`].join('\n'):r?(r.available?'Constant image: no measurable frequency.':'This comparison image is missing. No frequency or contrast is reported.'):'Inspect to estimate frequency and contrast from the displayed pixels.';
 $('png').disabled=!p.available;$('json').disabled=!r;drawImage(state.track);pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?`Inspected: ${state.report.analysis.status}.`:'Comparison display updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('track').onchange=e=>dispatch('set-track',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
function download(b,ext,mime){const u=URL.createObjectURL(b instanceof Blob?b:new Blob([b],{type:mime})),a=document.createElement('a');a.href=u;a.download='12-09-grating.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('json').onclick=()=>download(JSON.stringify(state.report,null,2),'json','application/json');
$('png').onclick=()=>$('plot').toBlob(b=>{if(b)download(b,'png','image/png')},'image/png');
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.3;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/12-09/elyra7-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('comparison_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.417,.254),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[3.05,2.60,4.15],[.125,.77,0]],optics:[[1.14,1.70,2.02],[-.02,1.13,.02]],display:[[1.36,1.46,1.35],[.968,.98,-.040]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-ely-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.elyView)});
 const probe=new T.Raycaster(),target=n('image_select_overlay');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal teaching pad only cycles the fixed images.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The passive unavailable, flat and analytic patterns still work.';console.warn(e.message)});
