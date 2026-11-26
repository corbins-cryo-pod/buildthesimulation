import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,assemblyRecord,targets,pose} from '../../../../public/equipment/08-12/assembly.mjs';
const S=createStation(),$=n=>document.getElementById(n),root='/equipment/08-12/';
let draw=()=>{};
function update(s){
 $('status').textContent=s.error?.message??s.feedback.message;$('status').classList.toggle('iserror',!!s.error||s.feedback.code==='reversed-polarity');
 $('revision').textContent=String(s.rev);$('placement').textContent=s.placement? s.placement.id+' · '+s.placement.orientationDeg+'°':'Not populated';
 $('tool').textContent=s.tool==='join'?'T245':s.tool==='remove'?'DR560':'Inspect';
 const q=assemblyRecord(s),tab=$('pads');tab.replaceChildren();
 for(const p of q.pads){
  const state=q.jointStates.find(x=>x.padId===p.id),pending=s.joints.find(x=>x.padId===p.id&&x.state==='preview'),r=document.createElement('tr');
  for(const t of [p.id,p.net,pending?.pin??state.pin??'—',pending?'preview (open)':state.state]){
   const col=document.createElement('td');col.textContent=t;r.append(col);
  }
  tab.append(r);
 }
 draw();
}
function act(k){const s=S.dispatch(k);update(s);return s;}
for(const k of ['remove','place','rotate','join','inspect','reset'])$(k).onclick=()=>act(k);
$('example').onclick=()=>{
 for(const k of ['reset','remove','place','rotate','join'])S.dispatch(k);
 const reversed=S.read().error?.code==='reversed-polarity';
 S.dispatch('rotate');const s=act('join');
 if(reversed&&s.feedback.ok)$('status').textContent='180° orientation rejected. 0° accepted: A → VPLUS, K → RETURN.';
};
$('download').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(assemblyRecord(S.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='virtual-pcb-assembly.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function viewer(){
 const c=$('bench'),renderer=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});renderer.setClearColor('#263338');renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.002,6),ctrl=new OrbitControls(camera,c);ctrl.minDistance=.050;ctrl.maxDistance=2.4;
 scene.add(new T.HemisphereLight('#f2f9ff','#c3b593',2.35));
 for(const [xyz,col,i] of [[[.4,.7,.55],'#fff1d5',3.3],[[-.6,.3,-.6],'#b6dff4',2.25]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const model=(await new GLTFLoader().loadAsync(root+'dde-bench.glb')).scene;scene.add(model);const N=n=>model.getObjectByName(n);
 const diode=N('Diode_pose'),body=N('Diode_body'),first=N('Joined_P1'),second=N('Joined_P2'),mat=body.material,pending=new T.MeshStandardMaterial({color:'#e6822f',roughness:.4});
 for(const [text,x] of [['P1',-.024],['P2',.024]]){
  const p=document.createElement('canvas');p.width=160;p.height=64;const g=p.getContext('2d');g.fillStyle='#effde6';g.font='bold 41px system-ui';g.textAlign='center';g.fillText(text,80,47);
  const tx=new T.CanvasTexture(p),mesh=new T.Mesh(new T.PlaneGeometry(.017,.007),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.01035,.116);scene.add(mesh);
 }
 const render=()=>renderer.render(scene,camera),views={bench:[[.47,.38,.64],[-.025,.053,-.015]],board:[[.062,.120,.203],[0,.007,.104]],rear:[[.49,.32,-.58],[-.033,.064,-.04]]};
 draw=()=>{const p=pose(S.read());diode.visible=p.componentVisible;diode.rotation.y=p.orientationY;body.material=p.pending?pending:mat;first.visible=second.visible=p.joined;render();};
 function view(k){const [a,b]=views[k]??views.bench;camera.position.set(...a);ctrl.target.set(...b);ctrl.update();draw();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('reset-view').onclick=()=>view('bench');ctrl.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let p;c.onpointerdown=e=>p=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!p||Math.hypot(e.clientX-p[0],e.clientY-p[1])>5)return;const q=c.getBoundingClientRect(),ray=new T.Raycaster();
  ray.setFromCamera({x:2*(e.clientX-q.left)/q.width-1,y:1-2*(e.clientY-q.top)/q.height},camera);
  for(const h of ray.intersectObject(model,true)){let n=h.object,k=null,hidden=false;while(n){if(!n.visible){hidden=true;break;}if(!k&&Object.hasOwn(targets,n.name))k=targets[n.name];n=n.parent;}if(k&&!hidden){act(k);return;}}
 };
 view('bench');c.dataset.ready='true';$('model-status').textContent='Metric GLB loaded · 114 named nodes · documented housing envelope.';
}
update(S.read());viewer().catch(e=>{$('model-status').textContent='3D unavailable: '+e.message+'. The board scenario remains usable.';});
