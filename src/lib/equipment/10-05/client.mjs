import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {calibration,createStation,file,pose,raster,targets} from '../../../../public/equipment/10-05/optics.mjs';
const S=createStation(),$=id=>document.getElementById(id),c=calibration;let update=()=>{};
const raw=document.createElement('canvas');raw.width=c.widthPx;raw.height=c.heightPx;
function image(s){
 const ctx=raw.getContext('2d'),out=raster(s),im=ctx.createImageData(c.widthPx,c.heightPx);
 for(let i=0;i<out.length;i++){const n=out[i];im.data.set([n,n,n,255],i*4);}ctx.putImageData(im,0,0);
 const e=$('preview').getContext('2d');e.drawImage(raw,0,0);
 e.strokeStyle='#b9efce';e.lineWidth=1;e.beginPath();e.moveTo(65,55.5);e.lineTo(75,55.5);e.stroke();
 const p=s.capture?.pixel;if(p){e.strokeStyle='#8aebb9';e.strokeRect(p[0]-7.5,p[1]-7.5,15,15);}
}
function refresh(s){
 $('focus').value=s.focusUm;$('focus-value').textContent=s.focusUm+' µm';$('pan-x').value=s.stageXUm;$('pan-y').value=s.stageYUm;
 $('out-json').disabled=!s.capture;const a=s.capture;
 $('status').textContent=s.error??(a?a.id+' captured: X '+a.xUm+' µm, Y '+a.yUm+' µm, Z '+a.zUm+' µm · pixel '+a.pixel.join(', ')+'.':'Focus '+s.focusUm+' µm. Capture or click an in-focus mark.');
 image(s);update();
}
function act(k,p){refresh(S.dispatch(k,p));}
$('focus').oninput=e=>act('focus',Number(e.target.value));
$('low').onclick=()=>act('focus',0);$('high').onclick=()=>act('focus',80);$('home').onclick=()=>act('home');$('pick').onclick=()=>act('pick');
for(const k of ['pan-x','pan-y'])$(k).onchange=()=>act('pan',{x:$('pan-x').valueAsNumber,y:$('pan-y').valueAsNumber});
$('preview').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();act('pick',{u:Math.floor((e.clientX-r.left)*c.widthPx/r.width),v:Math.floor((e.clientY-r.top)*c.heightPx/r.height)});};
function save(n,b){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('out-json').onclick=()=>save('slicescope-inert-capture.json',new Blob([JSON.stringify(file(S.read()),null,2)+'\n'],{type:'application/json'}));
$('out-png').onclick=()=>raw.toBlob(x=>{if(x)save('slicescope-inert-focal-plane.png',x);},'image/png');
async function model(){
 const el=$('scope-model'),r=new T.WebGLRenderer({canvas:el,antialias:true});r.setClearColor('#32444a');r.setPixelRatio(Math.min(devicePixelRatio,1.65));
 const w=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,9),o=new OrbitControls(cam,el);o.minDistance=.055;o.maxDistance=3;
 w.add(new T.HemisphereLight('#f0fcff','#d7c6b1',3.45));
 for(const [xyz,k,col]of [[[1,2,1.4],4.2,'#fff0dc'],[[-1,1.4,-1],3.15,'#d0edff']]){const l=new T.DirectionalLight(col,k);l.position.set(...xyz);w.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/10-05/slicescope-optical.glb')).scene;w.add(m);
 const obj=m.getObjectByName('Objective_focus_group'),xy=m.getObjectByName('Chart_stage_xy'),render=()=>r.render(w,cam);
 update=()=>{const p=pose(S.read());obj.position.y=p.objectiveY;xy.position.x=p.stageX;xy.position.z=p.stageZ;render();};
 const view={whole:[[.72,.58,1.0],[.023,.274,.014]],objective:[[.295,.315,.49],[.001,.267,.050]],stage:[[.35,.34,.48],[.001,.174,.07]],rear:[[-.62,.54,-.98],[.032,.27,.0]]};
 function set(k){const [a,b]=view[k]??view.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=el.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(el.parentElement);
 let start;el.onpointerdown=e=>start=[e.clientX,e.clientY];el.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=el.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let a=h.object;while(a){if(Object.hasOwn(targets,a.name)){act(...targets[a.name]);return;}a=a.parent;}}
 };
 set('whole');update();el.dataset.ready='true';$('asset').textContent='Metric GLB loaded · motorized stage base and post dimensions anchored to drawings.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Focal chart and exports still work.';});
