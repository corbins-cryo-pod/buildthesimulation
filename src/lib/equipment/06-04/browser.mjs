import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,clearance,objectMm,windowMm} from '../../../../public/equipment/06-04/solver.mjs';
const $=k=>document.getElementById('f4-'+k);let state=blank(),pose=()=>{};
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,s=2.55,x=w/2,y=214,a=clearance(state.mode),dx=a.centerMm[0]*s;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText('Detached display · front projection (X,Z)',16,26);
 const area=([ww,_yy,hh],xx)=>[x+xx-ww*s/2,y-hh*s/2,ww*s,hh*s];
 g.strokeStyle='#8cbeb9';g.lineWidth=2;g.strokeRect(...area(windowMm,0));
 g.fillStyle=a.status==='outside'?'#b86250':a.status==='touching'?'#b49a4e':'#569990';
 g.fillRect(...area(objectMm,dx));g.strokeStyle='#fff2d5';g.strokeRect(...area(objectMm,dx));
 g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText('X →    Z ↑  All values in millimeters',16,h-20);
 g.fillText('Right gap '+a.faces[0].plusMm+' mm',x-63,50);g.fillText('Y depth remains fixed (see readout)',x-168,h-57);
}
function sync(){
 const a=clearance(state.mode),r=state.report;$('mode').value=state.mode;$('json').disabled=!r;
 $('result').textContent=(r?`Result: ${a.status.toUpperCase()} · minimum ${a.minimumMm} mm\n`:'')+a.faces.map(f=>`${f.axis}: − face ${f.minusMm} mm · + face ${f.plusMm} mm`).join('\n');
 plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Checked only the detached display. Negative gaps mean the outline crosses a face.':'Detached display position updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('mode').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('json').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='06-04-clearance.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.135;orbit.maxDistance=3;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/06-04/form4-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k), block=n('detached_demo_block'),neutralX=block.position.x;
 block.material=block.material.clone();
 const views={overall:[[1.40,1.01,1.58],[.21,.275,0]],rear:[[-.51,.65,-1.45],[0,.277,-.01]],display:[[.57,.47,.69],[.466,.12,.025]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{const s=clearance(state.mode);block.position.x=neutralX+s.centerMm[0]/1000;block.material.color.setHex(s.status==='outside'?0xd96846:s.status==='touching'?0xd3ad57:0x64aba9);host.dataset.blockOffsetMm=String(s.centerMm[0]);draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-f4-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.f4View)});
 const probe=new T.Raycaster(),target=n('detached_position_switch');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge changes detached display positions only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached clearance comparison still works.';console.warn(e.message)});
