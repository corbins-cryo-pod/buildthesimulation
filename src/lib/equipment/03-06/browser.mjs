import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,defaults,gauge,initial} from '../../../../public/equipment/03-06/solver.mjs';
const $=k=>document.getElementById('fj-'+k),fields=Object.keys(defaults);
let state=initial(),pose=()=>{};
const form=()=>Object.fromEntries(fields.map(k=>[k,$(k).valueAsNumber]));
function diagram(){
 const c=$('diagram'),g=c.getContext('2d'),{width:w,height:h}=c,p=state.parameters,r=state.result,d=110,scale=(Math.min(w*.54,h)-60)/(2*d),x=w*.29,y=h*.54;
 g.fillStyle='#193137';g.fillRect(0,0,w,h);g.fillStyle='#f4e8ce';g.font='16px monospace';g.fillText('Synthetic top view',19,25);
 g.fillText('Side envelope',w*.67,25);g.fillText('Teaching gauge · not equipment dimensions',19,h-13);
 g.strokeStyle='#8de4da';g.lineWidth=2;g.beginPath();g.arc(x,y,gauge.radiusMm*scale,0,2*Math.PI);g.stroke();
 if(state.carrierVisible){const px=x+p.xMm*scale,py=y-p.yMm*scale;
  g.strokeStyle=r?.radialMarginMm<0?'#ee9872':'#e7bb73';g.beginPath();g.arc(px,py,p.diameterMm/2*scale,0,2*Math.PI);g.stroke();
  g.beginPath();g.moveTo(x,y);g.lineTo(px,py);g.stroke();g.beginPath();g.arc(px,py,3,0,Math.PI*2);g.fillStyle='#e7bb73';g.fill();
 }
 const floor=h*.72,slabWidth=w*.28,origin=w*.62;
 g.strokeStyle='#8de4da';g.strokeRect(origin,floor-gauge.heightMm*5,slabWidth,gauge.heightMm*5);
 if(state.carrierVisible){g.fillStyle=r?.verticalMarginMm<0?'#ee9872':'#e7bb73';g.fillRect(origin+10,floor-p.heightMm*5,slabWidth-20,p.heightMm*5)}
 g.fillStyle='#f4e8ce';g.fillText('Axial view exaggerated',origin,floor+25);
}
function sync(){
 const r=state.result;
 $('cutaway').textContent=state.cutaway?'Hide teaching cutaway':'Show teaching cutaway';$('carrier').textContent=state.carrierVisible?'Hide teaching disk':'Show teaching disk';
 $('result').textContent=r?`Radial margin: ${r.radialMarginMm.toFixed(3)} mm\nVertical margin: ${r.verticalMarginMm.toFixed(3)} mm\n${r.status}\nInspection revision ${r.revision}`:'No static fit report yet.';
 $('export').disabled=!r;diagram();pose();
}
function dispatch(type,payload){
 const x=$('status');try{
  state=action(state,{type,payload});x.classList.remove('error');
  if(type==='reset')fields.forEach(k=>{$(k).value=state.parameters[k]});
  x.textContent=type==='inspect'?'Static result only. No tool access or real carrier loading implied.':type==='cutaway'?'Only the teaching visual state changed.':'Mock fixture updated.';
 }catch(e){x.classList.add('error');x.textContent=e.message}sync();
}
for(const k of ['cutaway','carrier','inspect','reset'])$(k).onclick=()=>dispatch(k,k==='inspect'?form():undefined);
for(const k of fields)$(k).onchange=()=>dispatch('configure',form());
$('export').onclick=()=>{
 const u=URL.createObjectURL(new Blob([JSON.stringify(state.result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='03-06-static-fit.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);
};
sync();
async function view(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xaabdc2,2.6));const light=new T.DirectionalLight(0xfff3df,2.3);light.position.set(2,3,3);scene.add(light);
 const camera=new T.PerspectiveCamera(37,1,.015,20),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.25;orbit.maxDistance=7.5;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/03-06/fiji-g2-static.glb');scene.add(root);const n=k=>root.getObjectByName(k);
 const shroud=n('inspection_shroud'),grip=n('static_shroud_grip'),carrier=n('dry_carrier'),disk=n('carrier_disk'),guide=n('teaching_gauge');
 const views={overall:[[2.6,2.27,3.05],[0,.95,0]],gauge:[[1.42,1.96,1.28],[.426,1.30,-.014]],rear:[[2.15,2.09,-2.58],[0,1,0]]};
 const draw=()=>renderer.render(scene,camera);
 function snap(v){camera.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{
  shroud.visible=grip.visible=!state.cutaway;guide.visible=state.cutaway;carrier.visible=state.cutaway&&state.carrierVisible;
  const p=state.parameters;carrier.position.x=.555+p.xMm*.001;carrier.position.z=-.052-p.yMm*.001;
  disk.scale.set(p.diameterMm/200,p.heightMm/4,p.diameterMm/200);disk.position.y=p.heightMm*.0005;
  draw();
 };
 orbit.addEventListener('change',draw);
 new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-fj-view]').forEach(b=>{b.onclick=()=>snap(b.dataset.fjView)});
 const targets=[n('cabinet_inspection_toggle'),n('static_fit_button')],ray=new T.Raycaster();let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='cabinet_inspection_toggle'?'cutaway':'inspect',hit.name==='static_fit_button'?form():undefined)});
 snap('overall');pose();$('ready').textContent='Static metric cabinet loaded. Teal shows the teaching gauge; amber checks its geometry.';
}
view().catch(e=>{$('ready').textContent='3D unavailable. Static gauge math and export remain available.';console.warn(e.message)});
