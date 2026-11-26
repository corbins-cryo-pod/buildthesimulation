import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,section,file,targets} from '../../../../public/equipment/13-03/sections.mjs';
const S=createStation(),$=id=>document.getElementById(id),raw=document.createElement('canvas');let update=()=>{};
function plot(s,m){
 raw.width=m.width;raw.height=m.height;const a=raw.getContext('2d'),im=a.createImageData(m.width,m.height);
 for(let i=0;i<m.pixels.length;i++)im.data.set(m.pixels[i]?[32,56,64,255]:[147,177,164,255],4*i);
 a.putImageData(im,0,0);const c=$('section');c.width=m.width;c.height=m.height;const g=c.getContext('2d');g.drawImage(raw,0,0);
 if(s.result?.present){const [x,y,r,b]=s.result.sectionEdgeBoundsUm,d=m.spacingUm;g.strokeStyle='#f1b573';g.lineWidth=.55;g.strokeRect(x/d,y/d,(r-x)/d,(b-y)/d);}
}
function refresh(s){
 const m=section(s.mode,s.index),o=s.result;
 for(const k of ['XY','XZ'])$(k.toLowerCase()).setAttribute('aria-pressed',String(k===s.mode));
 $('slice').max=s.mode==='XY'?23:31;$('slice').value=s.index;$('position').textContent=m.axis+' = '+m.coordinateUm+' µm · index '+m.index;
 $('axes').textContent=m.width+' × '+m.height+' voxels · 2 µm per voxel. Light = solid, dark = void.';
 $('status').textContent=s.error??(o?(o.present?s.mode+' cavity: '+o.sectionExtentUm.join(' × ')+' µm, '+o.cavityAreaUm2+' µm².':'No cavity in this section.')+' Block cavity volume: '+o.cavityVolumeUm3+' µm³.':'Inspect and measure the selected '+s.mode+' section.');
 plot(s,m);update();
}
function act(k,p){refresh(S.dispatch(k,p));}
$('xy').onclick=()=>act('plane','XY');$('xz').onclick=()=>act('plane','XZ');$('center').onclick=()=>act('center');$('measure').onclick=()=>act('measure');$('reset').onclick=()=>act('reset');$('slice').oninput=e=>act('index',Number(e.target.value));
function dl(n,b){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>dl('hydra-inert-cavity.json',new Blob([JSON.stringify(file(S.read()),null,2)+'\n'],{type:'application/json'}));
$('png').onclick=()=>raw.toBlob(b=>{if(b)dl('hydra-inert-section.png',b);},'image/png');
async function model(){
 const c=$('hydra-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#2a3f45');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.002,14),o=new OrbitControls(cam,c);o.minDistance=.08;o.maxDistance=7;
 scene.add(new T.HemisphereLight('#eff9ff','#cdbca8',2.6));
 for(const [a,i,col]of [[[2,3,2],3.45,'#fff1d9'],[[-2,1.4,-1],2.4,'#cdeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...a);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/13-03/hydra-cx-display.glb')).scene;scene.add(m);
 const tex=document.createElement('canvas');tex.width=256;tex.height=152;
 const tx=new T.CanvasTexture(tex);tx.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.PlaneGeometry(.402,.252),new T.MeshBasicMaterial({map:tx,toneMapped:false}));face.userData.action='cyclePlane';m.getObjectByName('Section_monitor_datum').add(face);
 const render=()=>r.render(scene,cam);
 update=()=>{
  const s=S.read(),p=section(s.mode,s.index),g=tex.getContext('2d');g.fillStyle='#172b33';g.fillRect(0,0,256,152);g.imageSmoothingEnabled=false;const scale=Math.min(220/p.width,118/p.height),w=p.width*scale,h=p.height*scale;
  g.drawImage(raw,(256-w)/2,27,w,h);g.fillStyle='#d4ebe3';g.font='12px system-ui';g.fillText(s.mode+' · '+p.axis+' '+p.coordinateUm+' µm',12,17);tx.needsUpdate=true;render();
 };
 const views={whole:[[2.24,2.08,3.69],[.04,.963,.07]],front:[[-.30,1.32,1.34],[-.332,1.328,.08]],desk:[[1.31,1.28,1.34],[.775,.931,.10]],rear:[[-2.15,1.8,-3.2],[-.217,1,.0]]};
 function set(k){const [a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let a=h.object;while(a){const k=a.userData.action??targets[a.name];if(k){act(k);return;}a=a.parent;}}
 };
 set('whole');update();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · sealed documentary Helios 5 Hydra CX exterior.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Read-only sections and exports still work.';});
