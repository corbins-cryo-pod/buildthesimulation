import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,exportLedger,gross} from '../../../../public/equipment/16-06/solver.mjs';
const $=id=>document.getElementById('ae-'+id);
let state=blank(),pose=()=>{};
const meter=document.createElement('canvas');meter.width=600;meter.height=128;
const formatted=x=>x===null||x===undefined?'– – – –':x.toFixed(4)+' g';
function sync(){
 const m=state.measurement,label=m?.status??(state.doorOpen?'draft-open':'waiting'),show=formatted(m?.displayG);
 $('door').textContent=state.doorOpen?'Close draft shield':'Open draft shield';
 $('reading').textContent=m?.status==='overload'?'OVERLOAD':show;
 $('detail').textContent=[`Nominal gross: ${gross(state).toFixed(4)} g / 109 g`,`Stored tare: ${state.tareG.toFixed(4)} g`,`Reading state: ${label}`,state.calibrationId].join('\n');
 $('log').replaceChildren(...state.ledger.map(x=>{const li=document.createElement('li');li.textContent='r'+x.revision+' · '+x.sampleId+' · '+formatted(x.displayG);return li}));
 $('export').disabled=!state.ledger.length;
 const g=meter.getContext('2d');g.fillStyle='#0b191a';g.fillRect(0,0,600,128);g.fillStyle='#a8ffd5';g.font='83px monospace';g.textAlign='center';g.fillText(m?.status==='overload'?'OVER':show,300,92);
 pose();
}
function dispatch(type,payload){
 const s=$('status');try{
  state=action(state,{type,payload});s.classList.remove('error');
  s.textContent=type==='example'?'Accepted example: 0.0000 g after tare, then 5.0000 g after adding the inert reference. Both saved.':type==='settle'?(state.measurement.status==='stable'?'Valid reading at simulated t = 5 s.':state.measurement.status==='overload'?'Gross load is over 109 g. Tare does not increase capacity.':'No valid reading. Close the shield or repeat the modeled settling step.'):type==='tare'?'Stored the current stable gross estimate as tare.':type==='record'?'Recorded a stable reading with calibration provenance.':type==='calibrate'?'Applied the ideal virtual 100 g gain reference; settle again to show a reading.':'Virtual balance state updated.';
  if(type==='reset'||type==='example'){$('gain').value=0;$('noise').checked=false;$('seed').value=state.seed;$('mass').value=5}
 }catch(e){s.classList.add('error');s.textContent=e.message}sync();
}
for(const k of ['door','vessel','unload','settle','tare','record','calibrate','example','reset'])$(k).onclick=()=>dispatch(k);
$('weight').onclick=()=>dispatch('weight',$('mass').valueAsNumber);
$('gain').onchange=e=>dispatch('gain',e.target.valueAsNumber);
for(const k of ['seed','noise'])$(k).onchange=()=>dispatch('noise',{enabled:$('noise').checked,seed:$('seed').valueAsNumber});
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportLedger(state),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='16-06-weighing.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function view(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xaabbc0,2.45));const light=new T.DirectionalLight(0xfff4e3,2.43);light.position.set(.60,.96,.87);scene.add(light);
 const cam=new T.PerspectiveCamera(36,1,.002,12),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.074;orbit.maxDistance=2;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/16-06/ae100.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),texture=new T.CanvasTexture(meter);texture.colorSpace=T.SRGBColorSpace;
 const pad=new T.Mesh(new T.PlaneGeometry(.148,.029),new T.MeshBasicMaterial({map:texture}));pad.rotation.x=-1.09;n('display_texture_anchor').add(pad);
 const door=n('right_draft_door'),vessel=n('vessel_2g'),weight=n('weight_reference');
 const views={overall:[[.46,.31,.52],[0,.131,0]],pan:[[.25,.17,.28],[0,.097,.098]],rear:[[.35,.29,-.49],[0,.148,-.077]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(k){cam.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 pose=()=>{door.position.z=.083-(state.doorOpen?.132:0);vessel.visible=state.vessel;weight.visible=state.weightG>0;weight.position.y=state.vessel?.096:.091;texture.needsUpdate=true;draw()};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-ae-view]').forEach(b=>{b.onclick=()=>snap(b.dataset.aeView)});
 const ray=new T.Raycaster(),targets=[n('door_handle'),n('tare_bar'),n('calibrate_handle')];let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(({door_handle:'door',tare_bar:'tare',calibrate_handle:'calibrate'})[hit.name])});
 snap('overall');pose();$('ready').textContent='Metric GLB loaded · door and tare bar clickable; live readout matched to the form.';
}
view().catch(e=>{$('ready').textContent='3D unavailable. The virtual tare and readings still work.';console.warn(e.message)});
