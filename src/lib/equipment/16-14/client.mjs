import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportFile,readiness,targets,pose} from '../../../../public/equipment/16-14/continuity.mjs';
const S=createStation(),$=id=>document.getElementById(id);let updateModel=()=>{};
function refresh(s){
 $('toggle-a').textContent=(s.labeled.A?'Remove':'Seat')+' A · triangle';
 $('toggle-b').textContent=(s.labeled.B?'Remove':'Seat')+' B · square';
 $('status').textContent=s.note?.text??'Both markers are unseated.';$('status').classList.toggle('err',!!s.note&&!s.note.ok);
 $('rev').textContent='Continuity ledger revision '+s.ledgerRevision+'.';const rows=$('rows');rows.replaceChildren();
 for(const r of readiness(s)){const tr=document.createElement('tr');tr.dataset.station=r.instrumentId;tr.dataset.ready=String(r.ready);for(const v of [r.instrumentId,r.key,r.ready?'Ready':'Unlinked',r.edgeId??'None']){const td=document.createElement('td');td.textContent=v;tr.append(td);}rows.append(tr);}
 updateModel();
}
function act(t,p){const s=S.dispatch(t,p);refresh(s);}
$('both').onclick=()=>{S.dispatch('seat',{branch:'A',token:'triangle-A'});const s=S.dispatch('seat',{branch:'B',token:'square-B'});refresh(s);$('status').textContent='Both matching markers seated. Both stations are ready.';};
$('toggle-a').onclick=()=>act('toggle','A');$('toggle-b').onclick=()=>act('toggle','B');$('wrong').onclick=()=>act('seat',{branch:'A',token:'square-B'});$('reset').onclick=()=>act('reset');
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportFile(S.read()),null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='blind-label-continuity.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function scene(){
 const c=$('fixture-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#283d43');r.setPixelRatio(Math.min(devicePixelRatio,1.65));
 const w=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.001,12),o=new OrbitControls(cam,c);o.minDistance=.1;o.maxDistance=2.9;
 w.add(new T.HemisphereLight('#eff8ff','#c9c7af',2.6));
 for(const [xyz,col,i] of [[[1,2,1.5],'#fff1db',3.2],[[-1,.7,-1],'#ccedff',2.0]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);w.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/16-14/blind-fixture.glb')).scene;w.add(m);
 const render=()=>r.render(w,cam),led={A:new T.MeshBasicMaterial({color:'#86e8b6'}),B:new T.MeshBasicMaterial({color:'#ffc671'})},
 dark=new T.MeshStandardMaterial({color:'#303d3d'}), nodes={};
 for(const a of ['A','B'])nodes[a]=[m.getObjectByName('Token_'+a+'_slide'),m.getObjectByName('Station_'+a+'_status')];
 updateModel=()=>{for(const [id,x] of Object.entries(pose(S.read()))){nodes[id][0].position.z=x.tokenZ;nodes[id][1].material=x.led?led[id]:dark;}render();};
 const cams={whole:[[.65,.47,1.21],[.018,.218,.01]],a:[[-.35,.36,.31],[-.243,.283,-.075]],b:[[.37,.36,.31],[.243,.283,-.075]],rear:[[-.58,.48,-1.19],[.025,.20,-.01]]};
 function set(k){const [p,q]=cams[k]??cams.whole;cam.position.set(...p);o.target.set(...q);o.update();updateModel();}
 document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>set(b.dataset.camera));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of ray.intersectObject(m,true)){let a=h.object;while(a){if(Object.hasOwn(targets,a.name)){refresh(S.hit(a.name));return;}a=a.parent;}}
 };
 set('whole');c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · original sealed panel and solid dry markers.';
}
refresh(S.read());scene().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Continuity inspection and export still work.';});
