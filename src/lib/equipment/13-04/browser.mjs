import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,grid,plane,selection} from '../../../../public/equipment/13-04/solver.mjs';
const $=k=>document.getElementById('vs-'+k), colors={0:'#33424c',17:'#e7ad57',35:'#51c9c9'};
const [nx,ny]=grid.shape,[dx,dy]=grid.spacingUm, scale=25,sx=scale*dx,sy=scale*dy,x0=160,y0=51;
let state=blank(),pose=()=>{};
function plot(){
 const p=plane(state.z,state.profile), c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText(`Plane ${p.index} · Z = ${p.centerZUm.toFixed(2)} µm`,16,26);
 if(p.available){
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++) {
   g.fillStyle=colors[p.labels[i+nx*j]];g.fillRect(x0+i*sx,y0+(ny-1-j)*sy,sx,sy);
  }
  g.strokeStyle='white';g.lineWidth=2;g.strokeRect(x0+state.xy[0]*sx,y0+(ny-1-state.xy[1])*sy,sx,sy);
 }else{
  g.fillStyle='#342f3e';g.fillRect(x0,y0,nx*sx,ny*sy);g.fillStyle='#f4ead0';g.fillText('Missing data (not background)',x0+13,y0+ny*sy/2);
 }
 g.strokeStyle='#8bb7b2';g.lineWidth=1;g.strokeRect(x0,y0,nx*sx,ny*sy);g.fillStyle='#f7edde';g.fillText('X →    Y ↑ · voxel cells shown in world scale',16,h-13);
 g.strokeStyle='#f7edde';g.lineWidth=3;g.beginPath();g.moveTo(w-95,h-19);g.lineTo(w-45,h-19);g.stroke();g.fillText('2 µm',w-96,h-25);
}
function sync(){
 const a=selection(state),r=state.report;
 $('profile').value=state.profile;$('layer').value=state.z;$('x').value=state.xy[0];$('y').value=state.xy[1];
 $('result').textContent=[`${a.description}${a.label===null?'':' [ID '+a.label+']'} · center XYZ (${a.centerUm.map(x=>x.toFixed(2)).join(', ')}) µm`,
 r?r.objects.map(o=>`${o.name}: ${o.observedVoxels} observed voxels · ${o.observedVolumeUm3.toFixed(2)} µm³`).join('\n')+(r.observedOnly?'\nMissing cells were not counted.':''):'Select or inspect the stack for observed volumes.'].join('\n');
 $('png').disabled=a.label===null;$('json').disabled=!r;plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Read the stored labels and counted observed voxels.':'Passive view updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('profile').onchange=e=>dispatch('set-profile',e.target.value);
$('layer').oninput=e=>dispatch('set-plane',e.target.valueAsNumber);
for(const k of ['x','y'])$(k).onchange=()=>dispatch('pick',{x:$('x').valueAsNumber,y:$('y').valueAsNumber});
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('plot').onclick=e=>{
 const c=$('plot'),r=c.getBoundingClientRect(),u=(e.clientX-r.left)*c.width/r.width-x0,v=(e.clientY-r.top)*c.height/r.height-y0;
 if(u>=0&&v>=0&&u<nx*sx&&v<ny*sy)dispatch('pick',{x:Math.floor(u/sx),y:ny-1-Math.floor(v/sy)});
};
function download(b,ext,mime){const u=URL.createObjectURL(b instanceof Blob?b:new Blob([b],{type:mime})),a=document.createElement('a');a.href=u;a.download='13-04-toy-stack.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('json').onclick=()=>download(JSON.stringify(state.report,null,2),'json','application/json');
$('png').onclick=()=>$('plot').toBlob(b=>{if(b)download(b,'png','image/png')},'image/png');
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.3;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/13-04/volumescope2-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('stack_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.5169397661,.3230873538),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.9,2.55,4.1],[-.45,.94,0]],shell:[[-1.23,2.13,2.73],[0,1.21,0]],display:[[-.90,1.47,1.47],[-.93,1.04,.02]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-vs-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.vsView)});
 const probe=new T.Raycaster(),target=n('plane_next_overlay');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal teaching pad only browses existing planes.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The passive label viewer still works.';console.warn(e.message)});
