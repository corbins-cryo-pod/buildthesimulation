import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,analyze,blank,labels,shape,snapshot} from '../../../../public/equipment/15-09/solver.mjs';
const $=k=>document.getElementById('iv-'+k);let state=blank(),pose=()=>{};
function rawCanvas(){
 const c=document.createElement('canvas'),[w,h]=shape;c.width=w;c.height=h;
 const g=c.getContext('2d'),a=g.createImageData(w,h),gray=snapshot(state.mode);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dst=4*((h-1-y)*w+x),v=gray[y*w+x];a.data[dst]=a.data[dst+1]=a.data[dst+2]=v;a.data[dst+3]=255;
 }
 g.putImageData(a,0,0);return c;
}
function plot(){
 const c=$('plot'),g=c.getContext('2d'),{width:w,height:h}=c,r=analyze(state.mode),x=31,y=101,p=244,q=p*2/3,hl=355,hr=624,base=309,peak=183;
 g.fillStyle='#162d35';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4ead0';g.fillText(labels[state.mode]+' · authored digital codes',16,28);
 g.imageSmoothingEnabled=false;g.drawImage(rawCanvas(),x,y,p,q);g.strokeStyle='#9db4b3';g.strokeRect(x,y,p,q);
 g.fillText('48 × 32 authored pixels',x,y+q+26);
 g.strokeStyle='#789897';g.lineWidth=1;g.beginPath();g.moveTo(hl,base-peak);g.lineTo(hl,base);g.lineTo(hr,base);g.stroke();
 for(const [i,n] of r.histogram.entries())if(n){
  const u=hl+i/255*(hr-hl-3);g.fillStyle=i===0||i===255?'#eec483':'#83c9c1';g.fillRect(u,base-peak*n/r.pixelCount,3,peak*n/r.pixelCount);
 }
 g.fillStyle='#f4ead0';g.fillText('Histogram · pixels per code',hl,91);g.fillText('1,536',hl,base-peak-12);
 g.fillText('0',hl,base+24);g.fillText('255',hr-29,base+24);
 g.fillText('Authored 8-bit codes; endpoints do not prove optical clipping.',16,h-19);
}
function sync(){
 const r=state.report;$('case').value=state.mode;$('json').disabled=$('png').disabled=!r;
 $('result').textContent=r?`Mean ${r.meanCode.toFixed(3)} · population deviation ${r.popStdCode.toFixed(3)} codes\nCodes 0 / 255: ${r.lowEndpointPixels} / ${r.highEndpointPixels} of ${r.pixelCount} pixels`:'Inspect to count all 256 grayscale code bins.';plot();pose();
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');q.textContent=type==='inspect'?'Counted the integer codes in the fixed authored image.':'Detached image changed.';}catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
$('case').onchange=e=>dispatch('select',e.target.value);
for(const k of ['cycle','inspect','reset'])$(k).onclick=()=>dispatch(k);
function download(blob,ext){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='15-09-digital-pattern.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);}
$('json').onclick=()=>download(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'}),'json');
$('png').onclick=()=>rawCanvas().toBlob(b=>{if(b)download(b,'png')},'image/png');
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbf,2.63));const key=new T.DirectionalLight(0xfff3d9,2.45);key.position.set(2,3,3);scene.add(key);
 const cam=new T.PerspectiveCamera(37,1,.012,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.27;orbit.maxDistance=7;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/15-09/ivis-spectrum-static.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),t=new T.CanvasTexture($('plot'));t.colorSpace=T.SRGBColorSpace;
 n('intensity_view_anchor').add(new T.Mesh(new T.PlaneGeometry(.375,.242),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[2.76,2.68,4.20],[.33,1.05,0]],shell:[[-1.03,2.44,2.75],[.022,1.398,.16]],display:[[1.16,1.51,1.37],[.762,.974,.04]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(v){cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{t.needsUpdate=true;host.dataset.drawing=state.mode;draw();};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-iv-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.ivView)});
 const probe=new T.Raycaster(),target=n('standalone_pattern_switch');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();probe.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(probe.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');pose();host.dataset.ready='true';$('ready').textContent='Metric documentary model loaded. The teal badge changes only the detached digital pattern.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The detached grayscale pattern inspection still works.';console.warn(e.message)});
