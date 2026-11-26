import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,dot,poster,markerDistance} from '../../../../public/equipment/04-07/solver.mjs';
const $=k=>document.getElementById('dad-'+k), sx=56,sy=44,x0=106,y0=349;
let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,point=([x,y])=>[x0+x*sx,y0-y*sy];
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='17px monospace';g.fillStyle='#f4ead0';g.fillText('Detached coordinate poster · 9 × 7 printed dots',16,27);
 for(let y=0;y<poster.size[1];y++)for(let x=0;x<poster.size[0];x++){
  const [u,v]=point([x,y]),a=dot([x,y]),selected=state.index[0]===x&&state.index[1]===y;
  g.beginPath();g.arc(u,v,selected?7:(a.marker?5:3),0,2*Math.PI);
  g.fillStyle=selected?'#ffe7a9':a.marker?'#6bddcd':'#647b83';g.fill();if(a.marker)g.fillText(a.marker,u+11,v-7);
 }
 g.fillStyle='#f4ead0';g.fillText('+X →   +Y ↑ · material-independent poster',16,h-19);
 g.strokeStyle='#f4ead0';g.lineWidth=3;g.beginPath();g.moveTo(w-149,h-23);g.lineTo(w-69,h-23);g.stroke();g.fillText('20 mm',w-141,h-31);
}
function sync(){
 const r=state.report,p=dot(state.index);$('x').value=state.index[0];$('y').value=state.index[1];$('json').disabled=!r;
 $('result').textContent=`Dot [${p.index.join(', ')}]${p.marker?' · marker '+p.marker:''} · Center (${p.centerMm.join(', ')}) mm`+(r?`\nA→B vector (${r.vector.deltaMm.join(', ')}) mm · distance ${r.vector.lengthMm.toFixed(5)} mm`:'\nInspect the poster to measure the marked A→B distance.');plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Measured a line between two authored poster markers.':'Poster selection updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
for(const k of ['x','y'])$(k).onchange=()=>dispatch('pick',[$('x').valueAsNumber,$('y').valueAsNumber]);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('plot').onclick=e=>{
 const c=$('plot'),r=c.getBoundingClientRect(),x=((e.clientX-r.left)*c.width/r.width-x0)/sx,y=(y0-(e.clientY-r.top)*c.height/r.height)/sy;
 const i=Math.round(x),j=Math.round(y);if(i>=0&&i<poster.size[0]&&j>=0&&j<poster.size[1]&&Math.hypot(i-x,j-y)<.42)dispatch('pick',[i,j]);
};
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='04-07-poster.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.30;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/04-07/dad321-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('poster_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.352,.235),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.65,2.31,3.71],[.32,.85,0]],shell:[[1.36,1.64,2.06],[0,1.05,.23]],display:[[1.23,1.53,1.20],[.76,.94,.08]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-dad-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.dadView)});
 const probe=new T.Raycaster(),target=n('detached_poster_badge');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal badge changes the selected poster marker only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached poster inspection still works.';console.warn(e.message)});
