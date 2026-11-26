import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,csv,orientations,phantom,section} from '../../../../public/equipment/12-03/solver.mjs';
const $=k=>document.getElementById('lsm-'+k);let state=blank(),pose=()=>{};
function plot(p){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,[nx,ny]=p.shape,[dx,dy]=p.spacingUm;
 const s=Math.min((w-120)/(nx*dx),(h-90)/(ny*dy)),sx=dx*s,sy=dy*s,x=(w-nx*sx)/2,y=(h+ny*sy)/2;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='15px monospace';g.fillStyle='#f4ead0';g.fillText(`${p.orientation} · ${p.fixedAxis} = ${p.fixedCoordinateUm.toFixed(2)} µm`,16,24);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const u=Math.min(1,Math.max(0,p.values[i+nx*j]-phantom.background));
  g.fillStyle='rgb('+[Math.round(24+218*u),Math.round(37+166*u),Math.round(51+103*u)].join(',')+')';g.fillRect(x+i*sx,y-(j+1)*sy,sx+.15,sy+.15);
 }
 g.strokeStyle='#77a29f';g.lineWidth=1;g.strokeRect(x,y-ny*sy,nx*sx,ny*sy);
 g.fillStyle='#ecf6e6';g.fillText(`${p.displayAxes[0]} →  ${p.displayAxes[1]} ↑ · center samples in µm`,16,h-12);
 const bar=s*.5;g.strokeStyle='#fff5df';g.lineWidth=3;g.beginPath();g.moveTo(w-35-bar,h-19);g.lineTo(w-35,h-19);g.stroke();g.fillText('0.5 µm',w-88,h-25);
}
function sync(){
 const p=section(state.orientation,state.index,state.channel),r=state.report,axis=orientations[state.orientation].fixed;
 $('orientation').value=state.orientation;$('channel').value=state.channel;$('slice').max=phantom.shape[axis]-1;$('slice').value=state.index;
 $('result').textContent=[`${p.shape.join(' × ')} samples · ${p.spacingUm.join(' × ')} µm`,`Fixed ${p.fixedAxis} = ${p.fixedCoordinateUm.toFixed(2)} µm`,r?r.widths.map(o=>o.axis+' FWHM: '+(o.widthUm===null?'unresolved at constant background':o.widthUm.toFixed(6)+' µm')).join('\n'):'No full-width report yet.'].join('\n');
 $('csv').disabled=$('json').disabled=$('png').disabled=!r;plot(p);pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='measure'?'Reported analytic phantom widths through its center. The display slice was retained.':'Passive preview updated.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
for(const k of ['orientation','channel'])$(k).onchange=e=>dispatch(k,e.target.value);
$('slice').oninput=e=>dispatch('slice',e.target.valueAsNumber);
for(const k of ['cycle','measure','reset'])$(k).onclick=()=>dispatch(k);
function download(b,ext,mime){const u=URL.createObjectURL(b instanceof Blob?b:new Blob([b],{type:mime})),a=document.createElement('a');a.href=u;a.download='12-03-phantom.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('json').onclick=()=>download(JSON.stringify(state.report,null,2),'json','application/json');
$('csv').onclick=()=>download(csv(state.report),'csv','text/csv');
$('png').onclick=()=>$('plot').toBlob(b=>{if(b)download(b,'png','image/png')},'image/png');
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.3;orbit.maxDistance=8;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/12-03/lsm980-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('section_display_anchor').add(new T.Mesh(new T.PlaneGeometry(.411,.254),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[3.05,2.60,4.15],[.125,.77,0]],optics:[[1.05,1.66,1.71],[-.02,1.09,.0]],display:[[1.36,1.46,1.35],[.968,.98,-.040]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-lsm-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.lsmView)});
 const probe=new T.Raycaster(),target=n('plane_select_overlay');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();$('ready').textContent='Metric documentary model loaded. The teal teaching pad only changes the plotted plane.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The synthetic planes and width calculations still work.';console.warn(e.message)});
