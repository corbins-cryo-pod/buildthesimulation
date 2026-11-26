import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,bumpRadiusUm,csv,fiducials,initial,observation,padRadiusUm,pads} from '../../../../public/equipment/08-04/solver.mjs';
const $=id=>document.getElementById('fp-'+id), field=()=>({xUm:$('x').valueAsNumber,yUm:$('y').valueAsNumber,deg:$('theta').valueAsNumber,defect:$('defect').checked});
let state=initial(),pose=()=>{};
function diagram(data){
 const canvas=$('overlay'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=(w-80)/1800;
 const X=x=>w/2+x*scale,Y=y=>h/2-y*scale;
 const circle=(x,y,r,c)=>{ctx.strokeStyle=c;ctx.beginPath();ctx.arc(X(x),Y(y),r*scale,0,2*Math.PI);ctx.stroke()};
 const cross=(p,col)=>{const x=X(p.xUm),y=Y(p.yUm);ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x+8,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke()};
 ctx.fillStyle='#192c30';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#43595a';ctx.lineWidth=1;
 for(let i=-750;i<=750;i+=250){ctx.beginPath();ctx.moveTo(X(i),32);ctx.lineTo(X(i),h-30);ctx.stroke()}
 for(let i=-500;i<=500;i+=250){ctx.beginPath();ctx.moveTo(35,Y(i));ctx.lineTo(w-35,Y(i));ctx.stroke()}
 ctx.font='16px sans-serif';ctx.fillStyle='#f9eed4';ctx.fillText(state.opticsParked?'Last overlay, retained for comparison':'Vision alignment overlay',16,23);
 ctx.lineWidth=2;for(const p of pads){circle(p.xUm,p.yUm,padRadiusUm,'#f7b966');ctx.fillStyle='#f7b966';ctx.fillText(p.id,X(p.xUm)+24,Y(p.yUm)-15)}
 for(const p of data.centers)circle(p.xUm,p.yUm,bumpRadiusUm,'#7af0dd');
 for(const p of fiducials)cross(p,'#f7b966');for(const p of data.fiducials)cross(p,'#7af0dd');
 ctx.fillStyle='#f7b966';ctx.fillText('Carrier pads and fiducials',16,h-12);ctx.fillStyle='#7af0dd';ctx.fillText('Die bumps and fiducials',w-205,h-12);
}
function sync(){
 const data=observation(state.pose,state.aligned),format=(n,k=3)=>Math.abs(n)<10**(-k)*.5?(0).toFixed(k):n.toFixed(k);
 $('optics').textContent=state.opticsParked?'Restore overlay optics':'Park optics';$('arm').textContent=state.armDown?'Raise arm':'Lower arm (dry)';
 $('correction').textContent=data.correction?`Inverse: Δx ${format(data.correction.xUm)} µm, Δy ${format(data.correction.yUm)} µm, θ ${format(data.correction.deg)}° · fit RMS ${format(data.correction.rmsUm,6)} µm`:`Measured: Δx ${format(data.measured.xUm)} µm, Δy ${format(data.measured.yUm)} µm, θ ${format(data.measured.deg)}°`;
 $('pairs').replaceChildren(...data.connections.map(p=>{const row=document.createElement('tr');for(const x of [p.bumpId+' → '+p.padId,format(p.distanceUm),format(100*p.overlapFraction,1)+'%',p.status]){const td=document.createElement('td');td.textContent=x;row.append(td)}return row}));
 $('json').disabled=$('csv').disabled=!state.placement;diagram(data);pose(data);
}
function dispatch(type,payload){
 const n=$('status');try{state=action(state,{type,payload});if(type==='reset'){for(const [id,key] of [['x','xUm'],['y','yUm'],['theta','deg']])$(id).value=state.pose[key];$('defect').checked=state.pose.defect}
 n.classList.remove('error');n.textContent=type==='record'?`Saved placement revision ${state.placement.revision}. Geometric checks only.`:type==='align'?'Fiducials aligned. Park optics before the dry placement check.':'Virtual fixture state updated.';
 }catch(e){n.classList.add('error');n.textContent=e.message} sync();
}
for(const id of ['x','y','theta','defect'])$(id).addEventListener('change',()=>dispatch('configure',field()));
for(const k of ['align','optics','arm','record','reset'])$(k).onclick=()=>dispatch(k);
function save(body,ext,mime){const u=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=u;a.download='08-04-placement.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('json').onclick=()=>save(JSON.stringify(state.placement,null,2),'json','application/json');
$('csv').onclick=()=>save(csv(state.placement),'csv','text/csv');
sync();
async function view(){
 const el=$('view'),renderer=new T.WebGLRenderer({antialias:true});el.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xaabec2,2.65));const key=new T.DirectionalLight(0xfff5dd,2.6);key.position.set(.42,1,.81);scene.add(key);
 const camera=new T.PerspectiveCamera(35,1,.002,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.08;orbit.maxDistance=3.2;
 const {scene:model}=await new GLTFLoader().loadAsync('/equipment/08-04/fineplacer-lambda.glb');scene.add(model);
 const node=n=>model.getObjectByName(n),arm=node('placer_arm'),carriage=node('optical_carriage'),stage=node('carrier_stage'),die=node('virtual_die');
 const views={overall:[[.99,.72,1.36],[.16,.27,0]],stage:[[.35,.31,.49],[0,.17,.043]],rear:[[.86,.64,-1.02],[.19,.25,-.015]]};
 const render=()=>renderer.render(scene,camera);
 function snap(k){camera.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();render()}
 pose=data=>{
  carriage.position.x=state.opticsParked?.113:0;arm.rotation.x=state.armDown?Math.PI/2:0;
  // Stage is a physical-scale illustration of correction. Overlay is the magnified numerical instrument.
  const t=data.correction;stage.position.x=(t?.xUm??0)*1e-6;stage.position.z=.080-(t?.yUm??0)*1e-6;stage.rotation.y=(t?.deg??0)*Math.PI/180;
  die.visible=true;render();
 };
 orbit.addEventListener('change',render);new ResizeObserver(()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();render()}).observe(el);
 for(const b of document.querySelectorAll('[data-fp-view]'))b.onclick=()=>snap(b.dataset.fpView);
 const targets=[node('optics_toggle'),node('arm_toggle')],ray=new T.Raycaster();let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='optics_toggle'?'optics':'arm')});
 snap('overall');sync();$('ready').textContent='Metric 3D model loaded. Turquoise optics control and amber arm control are clickable.';
}
view().catch(e=>{$('ready').textContent='3D viewer unavailable. The optical overlay, geometry and exports still work.';console.warn(e.message)});
