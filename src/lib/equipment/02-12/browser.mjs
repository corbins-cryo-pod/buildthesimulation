import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,camera,capture,coupon,defaults,initial,profile,projected,raster} from '../../../../public/equipment/02-12/solver.mjs';
const $=x=>document.getElementById('lv-'+x);
let state=initial(),pose=()=>{};
const form=()=>({objective:+$('objective').value,xUm:$('xUm').valueAsNumber,yUm:$('yUm').valueAsNumber,focusUm:$('focusUm').valueAsNumber,illumination:$('illumination').valueAsNumber});
function image(view){
 const c=$('image'),g=c.getContext('2d'),{widthPx:w,heightPx:h}=camera,a=raster(view),pix=g.createImageData(w,h);
 for(let i=0;i<a.length;i++){const v=a[i];pix.data[i*4]=Math.min(255,v+7);pix.data[i*4+1]=v;pix.data[i*4+2]=Math.max(0,v-11);pix.data[i*4+3]=255}
 g.putImageData(pix,0,0);
 const len=20/view.samplePixelUm;
 g.fillStyle='#0e2325';g.fillRect(13,h-40,len+28,28);g.strokeStyle='#fff3d8';g.lineWidth=3;g.beginPath();g.moveTo(22,h-23);g.lineTo(22+len,h-23);g.stroke();g.fillStyle='#fff3d8';g.font='12px monospace';g.fillText('20 µm',22,h-27);
 if($('mark').checked){
  const [x,y]=projected(view,...coupon.markUm);
  if(x>=0&&x<w&&y>=0&&y<h){g.strokeStyle='#74e6d0';g.lineWidth=1.2;g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.stroke();g.fillStyle='#74e6d0';g.fillText('known mark',x+10,y-9);}
 }
}
function sync(){
 const v=profile(state.settings),r=state.result;image(v);
 $('view-info').textContent=[`${v.objective.magnification}× · NA ${v.objective.na.toFixed(2)} · WD ${v.objective.workingMm} mm`,`FOV ${v.fovUm.join(' × ')} µm · ${v.samplePixelUm.toFixed(2)} µm/px`,`Rayleigh ${v.rayleighUm.toFixed(3)} µm · ideal at 550 nm`,r?.measurement.pitchUm!==null&&r?`Measured ${r.measurement.pixelPitch.toFixed(2)} px / ${r.measurement.pitchUm.toFixed(3)} µm`:'Capture to measure grating pitch.'].join('\n');
 $('json').disabled=$('png').disabled=!r;pose(v);
}
function dispatch(type,payload){
 const s=$('status');try{
  state=action(state,{type,payload});s.classList.remove('error');s.textContent=type==='capture'?(state.result.measurement.pitchUm===null?'Image captured, but no two grating transitions was measured.':'Captured optical image and measured pitch from captured pixel transitions.'):type==='focus'?'Focus returned to nominal zero.':'Optical state updated.';
  if(['reset','objective','focus'].includes(type))for(const [k,v] of Object.entries(state.settings))$(k).value=v;
 }catch(e){s.classList.add('error');s.textContent=e.message}sync();
}
for(const k of Object.keys(defaults))$(k).onchange=()=>dispatch('configure',form());
$('capture').onclick=()=>dispatch('capture',form());$('reset').onclick=()=>{$('comparison').textContent='';dispatch('reset')};$('focus').onclick=()=>dispatch('focus');$('mark').onchange=sync;
$('compare').onclick=()=>{
 try{const p=form();$('comparison').textContent=[10,20].map(objective=>{const r=capture({...p,objective});return objective+'×: '+(r.measurement.pitchUm===null?'pitch unavailable':r.measurement.pixelPitch.toFixed(2)+' px, '+r.measurement.pitchUm.toFixed(3)+' µm')}).join(' | ');}
 catch(e){$('comparison').textContent=e.message}
};
function save(u,name){const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('png').onclick=()=>$('image').toBlob(b=>{if(b)save(URL.createObjectURL(b),'02-12-inspection.png')},'image/png');
$('json').onclick=()=>save(URL.createObjectURL(new Blob([JSON.stringify({...state.result,imageOverlay:{knownMarkVisible:$('mark').checked}},null,2)],{type:'application/json'})),'02-12-inspection.json');
sync();
async function view(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa4babd,2.65));const light=new T.DirectionalLight(0xfff3de,2.45);light.position.set(.72,1.19,.85);scene.add(light);
 const c=new T.PerspectiveCamera(36,1,.002,10),orbit=new OrbitControls(c,renderer.domElement);orbit.minDistance=.105;orbit.maxDistance=2.4;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/02-12/lv100nd.glb');scene.add(root);const n=k=>root.getObjectByName(k);
 const turret=n('objective_turret'),stage=n('stage_translation');
 const views={overall:[[.58,.53,.81],[0,.24,0]],stage:[[.31,.29,.31],[0,.232,.073]],rear:[[.48,.39,-.59],[0,.23,-.06]]};
 const draw=()=>renderer.render(scene,c);
 function snap(k){c.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 pose=v=>{
  turret.rotation.y=v.objective.magnification===20?-Math.PI*2/5:0;
  // Tiny sample-frame focus and translation are exaggerated for visual legibility.
  stage.position.set(-v.settings.xUm*.000055,.189+v.settings.focusUm*.000045,.078-v.settings.yUm*.000055);
  draw();
 };
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);c.aspect=host.clientWidth/host.clientHeight;c.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-lv-view]').forEach(b=>{b.onclick=()=>snap(b.dataset.lvView)});
 const ray=new T.Raycaster(),targets=[n('objective_action'),n('focus_knob')];let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),c);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='objective_action'?'objective':'focus')});
 snap('overall');pose(profile(state.settings));$('ready').textContent='Metric model loaded. The turret target switches objective; the right focus knob returns focus to zero.';
}
view().catch(e=>{$('ready').textContent='3D unavailable. Capture and measurement still work.';console.warn(e.message)});
