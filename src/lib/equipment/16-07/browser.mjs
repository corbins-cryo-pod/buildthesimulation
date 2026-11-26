import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,csv,defaults} from '../../../../public/equipment/16-07/solver.mjs';
const $=k=>document.getElementById('wb-'+k), fields=Object.keys(defaults).filter(k=>k!=='mode');
let state=blank(),pose=()=>{};
const screen=document.createElement('canvas');screen.width=540;screen.height=236;
function chart(){
 const c=$('chart'),g=c.getContext('2d'),{width:w,height:h}=c;
 g.fillStyle='#193238';g.fillRect(0,0,w,h);g.fillStyle='#f4e8cc';g.font='16px monospace';g.fillText('Temperature (°C)',15,23);g.fillText('Simulated exposure (s)',w/2-85,h-10);
 const r=state.result;if(!r){g.fillText('Run the thermal dummy example.',55,h/2);return}
 const temp=r.history.flatMap(p=>[p.bathC,p.dummyC]),lo=Math.floor(Math.min(...temp)-.8),hi=Math.ceil(Math.max(...temp)+.8),v=r.history[state.cursor],X=x=>57+x*(w-89)/r.parameters.durationS,Y=y=>35+(1-(y-lo)/(hi-lo))*(h-94);
 for(let i=0;i<=4;i++){
  const a=r.parameters.durationS*i/4,b=lo+(hi-lo)*i/4;
  g.strokeStyle='#557074';g.lineWidth=1;g.beginPath();g.moveTo(X(a),35);g.lineTo(X(a),h-59);g.moveTo(57,Y(b));g.lineTo(w-32,Y(b));g.stroke();
  g.fillStyle='#f4e8cc';g.fillText(a.toFixed(0),X(a)-10,h-36);g.fillText(b.toFixed(1),7,Y(b)+4);
 }
 g.strokeStyle='#f0c181';g.beginPath();g.moveTo(X(v.timeS),35);g.lineTo(X(v.timeS),h-59);g.stroke();
 for(const [key,col] of [['bathC','#7ae1db'],['dummyC','#f4a76a']]){
  g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();r.history.forEach((p,i)=>i?g.lineTo(X(p.timeS),Y(p[key])):g.moveTo(X(p.timeS),Y(p[key])));g.stroke();
  g.fillStyle=col;g.beginPath();g.arc(X(v.timeS),Y(v[key]),4,0,2*Math.PI);g.fill();g.fillText(key==='bathC'?'Bath':'Inert dummy',key==='bathC'?w-172:w-115,23);
 }
}
function sync(){
 const p=state.settings,r=state.result,row=r?.history[state.cursor],bath=row?.bathC??(p.mode==='held'?p.setC:p.bath0C),dummy=row?.dummyC??p.dummy0C;
 $('lid').textContent=state.lidOpen?'Close lid':'Open lid';$('load').textContent=state.loaded?'Remove inert dummy':'Place inert dummy';$('seek').disabled=$('tau').disabled=$('json').disabled=$('csv').disabled=!r;
 $('tau').disabled=!r||r.parameters.tauDummyS>r.parameters.durationS;
 $('seek').max=(r?.history.length??1)-1;$('seek').value=state.cursor;
 $('bath0C').disabled=$('tauBathS').disabled=p.mode==='held';
 $('results').textContent=[`Bath ${bath.toFixed(4)} °C · inert dummy ${state.loaded?dummy.toFixed(4)+' °C':'not loaded'}`,row?`Exposure ${row.timeS.toFixed(2)} s · output r${r.revision}`:'No simulated exposure yet.',r?.oneTauReference?.gapClosedFraction===null?'Zero initial gap; fraction undefined.':r?.oneTauReference?`Held-bath one-τ reference: ${(100*r.oneTauReference.gapClosedFraction).toFixed(4)}% of initial gap`:''].filter(Boolean).join('\n');
 const g=screen.getContext('2d');g.fillStyle='#203835';g.fillRect(0,0,540,236);g.font='65px monospace';g.fillStyle='#b1f2cb';g.fillText(bath.toFixed(1)+' °C',28,89);g.font='35px monospace';g.fillText('SET '+p.setC.toFixed(1)+' °C',28,173);
 chart();pose(row);
}
function values(){return {mode:$('mode').value,...Object.fromEntries(fields.map(k=>[k,$(k).valueAsNumber]))}}
function dispatch(type,payload){
 const b=$('status');try{
  state=action(state,{type,payload});b.classList.remove('error');
  b.textContent=type==='run'?'Exposure computed. Scrub time or jump to one dummy time constant.':type==='seek'?'Readout moved to the selected exposure time.':type==='load'?(state.loaded?'Inert dummy placed.':'Inert dummy absent.'):'Bath state updated.';
  if(type==='reset'){$('mode').value=state.settings.mode;fields.forEach(k=>{$(k).value=state.settings[k]});}
 }catch(e){b.classList.add('error');b.textContent=e.message}sync();
}
for(const k of ['lid','load','run','reset'])$(k).onclick=()=>dispatch(k,k==='run'?values():undefined);
for(const k of ['mode',...fields])$(k).onchange=()=>dispatch('configure',values());
$('seek').oninput=e=>dispatch('seek',e.target.valueAsNumber);
$('tau').onclick=()=>{if(state.result)dispatch('seek',state.result.history.findIndex(x=>x.timeS===state.settings.tauDummyS))};
function save(body,ext,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download='16-07-temperature-history.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('json').onclick=()=>save(JSON.stringify(state.result,null,2),'json','application/json');$('csv').onclick=()=>save(csv(state.result),'csv','text/csv');
sync();
async function view(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xaabfc4,2.63));const light=new T.DirectionalLight(0xfff1d9,2.40);light.position.set(.68,1.2,.91);scene.add(light);
 const camera=new T.PerspectiveCamera(36,1,.002,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.085;orbit.maxDistance=2.1;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/16-07/isotemp-gpd05.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),lid=n('gable_lid'),sample=n('inert_dummy'),t=new T.CanvasTexture(screen);t.colorSpace=T.SRGBColorSpace;
 n('display_texture_anchor').add(new T.Mesh(new T.PlaneGeometry(.066,.033),new T.MeshBasicMaterial({map:t})));
 const views={overall:[[.54,.50,.65],[0,.157,0]],tank:[[.183,.408,.288],[0,.16,0]],rear:[[.462,.43,-.51],[0,.154,-.018]]};
 const draw=()=>renderer.render(scene,camera);
 function snap(k){camera.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 pose=()=>{lid.rotation.x=state.lidOpen?-Math.PI/2:0;sample.visible=state.loaded;t.needsUpdate=true;draw()};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-wb-view]').forEach(b=>{b.onclick=()=>snap(b.dataset.wbView)});
 const ray=new T.Raycaster(),handle=n('lid_handle');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);if(ray.intersectObject(handle,true).length)dispatch('lid')});
 snap('overall');pose();$('ready').textContent='Metric GLB loaded. The black handle and the matching button move the same lid.';
}
view().catch(e=>{$('ready').textContent='3D unavailable. The thermal model, plots and exports still work.';console.warn(e.message)});
