import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {camera,createStation,image,pose,save,scale,targets} from '../../../../public/equipment/12-02/reticle.mjs';
const S=createStation(),$=id=>document.getElementById(id);let update=()=>{};
const raw=document.createElement('canvas');raw.width=camera.widthPx;raw.height=camera.heightPx;
function plot(s){
 const a=raw.getContext('2d'),b=image(s),f=a.createImageData(raw.width,raw.height);
 for(let i=0;i<b.length;i++){const k=i*4;f.data[k]=f.data[k+1]=f.data[k+2]=b[i];f.data[k+3]=255;}a.putImageData(f,0,0);
 const d=$('raster').getContext('2d');d.drawImage(raw,0,0);
 if(s.result){d.strokeStyle='#308874';d.lineWidth=1.4;for(const x of s.result.peakColumnsPx){d.beginPath();d.moveTo(x,s.result.row-8);d.lineTo(x,s.result.row+8);d.stroke();}}
}
function refresh(s){
 const a=scale(s.mag),f=s.result;$('focus').value=s.defocusUm;$('focus-val').textContent=s.defocusUm+' µm';
 for(const i of [10,20])$('mag'+i).setAttribute('aria-pressed',String(i===s.mag));
 $('fov').textContent='400 × 256 px · '+a.pixelUm.toFixed(3)+' µm/px · horizontal field of view '+a.fovWidthUm.toFixed(1)+' µm.';
 $('status').textContent=s.error??(f?'Measured '+f.measuredPitchUm.toFixed(2)+' µm pitch ('+f.meanSpacingPx.toFixed(2)+' px between lines).':'Focus '+s.defocusUm+' µm at '+s.mag+'×. Press Measure physical pitch.');
 $('json-out').disabled=!f;plot(s);update();
}
function act(k,p){refresh(S.dispatch(k,p));}
$('focus').oninput=e=>act('focus',Number(e.target.value));$('mag10').onclick=()=>act('objective',10);$('mag20').onclick=()=>act('objective',20);
$('measure').onclick=()=>act('measure');$('reset').onclick=()=>act('reset');
function dl(n,b){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json-out').onclick=()=>dl('ti2-reticle-measurement.json',new Blob([JSON.stringify(save(S.read()),null,2)+'\n'],{type:'application/json'}));
$('image-out').onclick=()=>raw.toBlob(b=>{if(b)dl('ti2-inert-reticle.png',b);},'image/png');
async function model(){
 const c=$('ti2-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#304248');r.setPixelRatio(Math.min(devicePixelRatio,1.7));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,10),o=new OrbitControls(cam,c);o.minDistance=.06;o.maxDistance=4;
 scene.add(new T.HemisphereLight('#effaff','#d3bfa7',2.8));
 for(const [a,k,col]of [[[1,2,1.4],3.6,'#fff2df'],[[-1,1.3,-1],2.4,'#d4edff']]){const l=new T.DirectionalLight(col,k);l.position.set(...a);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/12-02/nikon-ti2-optical.glb')).scene;scene.add(m);
 const turn=m.getObjectByName('Nosepiece_switch'),render=()=>r.render(scene,cam);
 update=()=>{const p=pose(S.read());turn.rotation.y=p.nosepieceRotationRad;turn.position.y=p.nosepieceY;render();};
 const v={whole:[[.77,.57,1.08],[.042,.305,.004]],stage:[[.39,.31,.43],[.016,.304,.040]],side:[[.95,.45,.15],[0,.32,-.03]],rear:[[-.74,.52,-1.04],[.02,.32,-.027]]};
 function set(k){const [a,b]=v[k]??v.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),q=new T.Raycaster();q.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of q.intersectObject(m,true)){let a=h.object;while(a){if(Object.hasOwn(targets,a.name)){act(targets[a.name]);return;}a=a.parent;}}
 };
 set('whole');update();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · Ti2-E single-layer exterior.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Reticle imaging and exports still work.';});
