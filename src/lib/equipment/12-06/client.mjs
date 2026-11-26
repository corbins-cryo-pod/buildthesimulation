import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,section,displayIntensity,file,targets} from '../../../../public/equipment/12-06/stack.mjs';
const S=createStation(),$=id=>document.getElementById(id),raw=document.createElement('canvas');let update=()=>{};
function draw(s,m){
 raw.width=m.width;raw.height=m.height;
 const r=raw.getContext('2d'),d=r.createImageData(m.width,m.height);
 for(let i=0;i<m.data.length;i++){
  const u=displayIntensity(m.data[i],s.window),k=i*4;
  d.data[k]=24+176*u;d.data[k+1]=37+199*u;d.data[k+2]=48+178*u;d.data[k+3]=255;
 }
 r.putImageData(d,0,0);const c=$('raster');c.width=m.width;c.height=m.height;c.style.aspectRatio=(m.width*m.spacingUm[0])+' / '+(m.height*m.spacingUm[1]);
 const g=c.getContext('2d');g.drawImage(raw,0,0);
 if(s.result?.present){
  const [a,b,x,y]=s.result.edgeBoundsUm,p=m.spacingUm;g.strokeStyle='#e8b875';g.lineWidth=.6;g.strokeRect(a/p[0]+.5,b/p[1]+.5,(x-a)/p[0],(y-b)/p[1]);
 }
}
function refresh(s){
 const m=section(s.mode,s.index),p=s.result;
 $('xy').setAttribute('aria-pressed',String(s.mode==='XY'));$('xz').setAttribute('aria-pressed',String(s.mode==='XZ'));
 $('contrast').value=s.window;$('slice').max=s.mode==='XY'?20:47;$('slice').value=s.index;
 $('slice-value').textContent=m.fixedAxis+' = '+m.fixedCoordinateUm+' µm · index '+m.index;
 $('axes').textContent=m.width+' × '+m.height+' voxels · '+m.spacingUm.join(' × ')+' µm per voxel in '+s.mode+' (physical display aspect).';
 $('status').textContent=s.error??(p?(p.present?s.mode+' inset: '+p.extentUm.join(' × ')+' µm · '+p.voxelCount+' bright voxels.':'No bright inset in this section.'):'Measure the bright inset in the selected '+s.mode+' section.');
 draw(s,m);update();
}
function act(k,p){refresh(S.dispatch(k,p));}
$('xy').onclick=()=>act('plane','XY');$('xz').onclick=()=>act('plane','XZ');$('slice').oninput=e=>act('index',Number(e.target.value));
$('contrast').onchange=e=>act('window',e.target.value);$('measure').onclick=()=>act('measure');$('center').onclick=()=>act('center');$('reset').onclick=()=>act('reset');
function dl(n,b){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('export-json').onclick=()=>dl('nlo-inert-section.json',new Blob([JSON.stringify(file(S.read()),null,2)+'\n'],{type:'application/json'}));
$('export-png').onclick=()=>raw.toBlob(b=>{if(b)dl('nlo-inert-section.png',b);},'image/png');
async function model(){
 const c=$('nlo-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#2a3e44');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.002,14),o=new OrbitControls(cam,c);o.minDistance=.1;o.maxDistance=8;
 scene.add(new T.HemisphereLight('#effaff','#d3c2ae',2.6));
 for(const [a,i,col]of [[[2,3,2],3.5,'#fff0dc'],[[-2,1.4,-1],2.4,'#cdeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...a);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/12-06/lsm980-nlo-display.glb')).scene;scene.add(m);
 const monitor=document.createElement('canvas');monitor.width=256;monitor.height=144;
 const tx=new T.CanvasTexture(monitor);tx.colorSpace=T.SRGBColorSpace;const panel=new T.Mesh(new T.PlaneGeometry(.451,.254),new T.MeshBasicMaterial({map:tx,toneMapped:false}));
 panel.userData.action='cyclePlane';m.getObjectByName('Monitor_raster_datum').add(panel);
 const render=()=>r.render(scene,cam);
 update=()=>{
  const s=S.read(),v=section(s.mode,s.index),d=monitor.getContext('2d');d.fillStyle='#132830';d.fillRect(0,0,256,144);d.imageSmoothingEnabled=false;
  const physicalW=v.width*v.spacingUm[0],physicalH=v.height*v.spacingUm[1],r=Math.min(230/physicalW,111/physicalH),w=physicalW*r,h=physicalH*r;
  d.drawImage(raw,(256-w)/2,21,w,h);d.fillStyle='#dbe7df';d.font='12px system-ui';d.fillText(s.mode+' · '+v.fixedAxis+' '+v.fixedCoordinateUm+' µm',13,16);tx.needsUpdate=true;render();
 };
 const v={whole:[[2.5,2.05,3.73],[.1,.808,.04]],stand:[[-.27,1.52,.975],[-.565,1.259,.072]],scanner:[[.3,1.49,.72],[-.12,1.025,-.161]],desk:[[1.48,1.34,1.13],[1.03,.960,.03]]};
 function set(k){const [a,b]=v[k]??v.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let a=h.object;while(a){const x=a.userData.action??targets[a.name];if(x){act(x);return;}a=a.parent;}}
 };
 set('whole');update();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · documentary upright setup; no powered components.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Read-only stack and exports still work.';});
