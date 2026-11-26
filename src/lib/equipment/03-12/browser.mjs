import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,defaults,housing,initial} from '../../../../public/equipment/03-12/solver.mjs';
const $=k=>document.getElementById('hp-'+k),fields=Object.keys(defaults);
let state=initial(),pose=()=>{};const form=()=>Object.fromEntries(fields.map(k=>[k,$(k).valueAsNumber]));
function diagram(){
 const canvas=$('diagram'),g=canvas.getContext('2d'),{width:w,height:h}=canvas,p=state.p;
 const s=Math.min((w-120)/Math.max(425,p.gaugeW),(h-76)/Math.max(335,p.gaugeD)),x0=w/2,y0=h/2+3;
 g.fillStyle='#182f34';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f5ecd3';g.fillText('Outline only · top view',18,24);
 if(state.grid){
  g.strokeStyle='#7fe5d6';g.lineWidth=2;g.strokeRect(x0-p.gaugeW*s/2,y0-p.gaugeD*s/2,p.gaugeW*s,p.gaugeD*s);
  g.fillStyle='#7fe5d6';g.fillText(`Invented ${p.gaugeW} × ${p.gaugeD} mm frame`,18,h-12);
 }
 g.save();g.translate(x0+p.xMm*s,y0-p.yMm*s);g.rotate(-p.yawDeg*Math.PI/180);g.fillStyle=state.result?.minimumMm<0?'#8d503a':'#6c6955';g.strokeStyle='#efba77';g.lineWidth=2;
 g.fillRect(-housing.widthMm*s/2,-housing.depthMm*s/2,housing.widthMm*s,housing.depthMm*s);g.strokeRect(-housing.widthMm*s/2,-housing.depthMm*s/2,housing.widthMm*s,housing.depthMm*s);
 g.strokeStyle='#fbe4bd';g.beginPath();g.moveTo(-47*s,housing.depthMm*s/2);g.lineTo(47*s,housing.depthMm*s/2);g.stroke();g.restore();
}
function sync(){
 const r=state.result;
 $('grid').textContent=state.grid?'Hide invented frame':'Show invented frame';
 $('result').textContent=r?[r.status,`Projected size ${r.projectionMm.width.toFixed(3)} × ${r.projectionMm.depth.toFixed(3)} mm`,`Margins L/R ${r.marginsMm.leftMm.toFixed(3)} / ${r.marginsMm.rightMm.toFixed(3)} mm`,`Front/back ${r.marginsMm.frontMm.toFixed(3)} / ${r.marginsMm.backMm.toFixed(3)} mm`].join('\n'):'No footprint report yet.';
 $('export').disabled=!r;diagram();pose();
}
function dispatch(type,payload){
 const b=$('status');try{
  state=action(state,{type,payload});b.classList.remove('error');
  if(type==='reset'||type==='quarterTurn')fields.forEach(k=>{$(k).value=state.p[k]});
  b.textContent=type==='inspect'?'Static fit result saved. It is not a physical installation check.':type==='quarterTurn'?'Only the virtual exterior orientation changed.':'Teaching visualization updated.';
 }catch(e){b.classList.add('error');b.textContent=e.message}sync();
}
for(const k of ['grid','quarterTurn','inspect','reset'])$(k).onclick=()=>dispatch(k,k==='inspect'?form():undefined);
for(const k of fields)$(k).onchange=()=>dispatch('configure',form());
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='03-12-footprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa6bbbe,2.62));const light=new T.DirectionalLight(0xfff2d9,2.4);light.position.set(.8,1.1,.8);scene.add(light);
 const camera=new T.PerspectiveCamera(36,1,.002,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.08;orbit.maxDistance=2;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/03-12/pdc32g2-static.glb');scene.add(root);
 const g=new T.BufferGeometry(),line=new T.LineLoop(g,new T.LineBasicMaterial({color:0x177977}));scene.add(line);const pos=new T.BufferAttribute(new Float32Array(12),3).setUsage(T.DynamicDrawUsage);g.setAttribute('position',pos);line.frustumCulled=false;
 const views={overall:[[.44,.36,.58],[0,.104,0]],rear:[[.37,.30,-.53],[0,.103,0]],top:[[.001,.71,.005],[0,0,0]]};
 const draw=()=>renderer.render(scene,camera);
 function snap(v){camera.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();draw()}
 pose=()=>{
  const {xMm,yMm,yawDeg,gaugeW,gaugeD}=state.p;root.position.set(xMm*.001,0,-yMm*.001);root.rotation.y=yawDeg*Math.PI/180;
  const x=gaugeW*.0005,z=gaugeD*.0005;
  pos.setXYZ(0,-x,0,-z);pos.setXYZ(1,x,0,-z);pos.setXYZ(2,x,0,z);pos.setXYZ(3,-x,0,z);pos.needsUpdate=true;line.visible=state.grid;draw();
 };
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-hp-view]').forEach(a=>{a.onclick=()=>snap(a.dataset.hpView)});
 const targets=['grid_overlay_target','turn_overlay_target'].map(k=>root.getObjectByName(k)),ray=new T.Raycaster();let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='grid_overlay_target'?'grid':'quarterTurn')});
 snap('overall');pose();$('ready').textContent='Static model loaded. The colored teaching markers do not act on instrument controls.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. Footprint calculations and export still work.';console.warn(e.message)});
