import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,slots,exportFile,poses,targets} from '../../../../public/equipment/16-11/handling.mjs';
const S=createStation(),$=id=>document.getElementById(id);let draw=()=>{};
function refresh(s){
 $('wafer-select').value=s.selectedId;$('status').classList.toggle('error',!!s.attempt&&!s.attempt.ok);$('status').textContent=s.attempt?.message??(s.selectedId+' selected. Choose a destination.');
 const tb=$('wafers');tb.replaceChildren();
 for(const w of s.wafers){const tr=document.createElement('tr');tr.dataset.wafer=w.id;for(const x of [w.id,w.diameterMm+' mm',slots[w.siteId].label,w.orientationDeg+'°']){const td=document.createElement('td');td.textContent=x;tr.append(td);}tb.append(tr);}
 $('ledger').textContent='Custody ledger revision '+s.ledgerRevision+' · '+s.transfers.length+' successful transfer'+(s.transfers.length===1?'':'s')+'.';draw();
}
function act(k,p){const s=S.dispatch(k,p);refresh(s);return s;}
for(const w of S.read().wafers)$('wafer-select').append(new Option(w.id+' · '+w.diameterMm+' mm',w.id));
for(const [k,s] of Object.entries(slots))$('slot-select').append(new Option(s.label,k,k==='cassette-100-A01',k==='cassette-100-A01'));
$('wafer-select').onchange=e=>act('select',e.target.value);
$('transfer').onclick=()=>act('transfer',$('slot-select').value);
$('place-fit').onclick=()=>act('transfer','cassette-100-A02');$('place-small').onclick=()=>act('transfer','small-carrier');
$('reset').onclick=()=>act('reset');$('empty-source').onclick=()=>act('transferFrom',{source:'cassette-100-A03',target:'staging-100'});
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportFile(S.read()),null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='wafer-custody.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function scene(){
 const c=$('handling-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293d45');r.setPixelRatio(Math.min(devicePixelRatio,1.7));
 const W=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.001,9),o=new OrbitControls(cam,c);o.minDistance=.11;o.maxDistance=2.3;
 W.add(new T.HemisphereLight('#eff8ff','#c9c7af',2.5));
 for(const [xyz,col,i] of [[[1,2,1.4],'#fff0d8',3.4],[[-1,.7,-1],'#d0ebfc',2.7]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);W.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/16-11/handling-station.glb')).scene;W.add(m);
 const wafers=S.read().wafers.map(w=>({key:w.node,root:m.getObjectByName(w.node)}));
 const render=()=>r.render(W,cam),cams={overview:[[.62,.56,.78],[0,.013,.005]],slots:[[.0,.18,.41],[-.035,.024,-.089]],trays:[[.42,.36,.39],[.013,.022,.108]],plan:[[0,.98,.0001],[0,0,0]]};
 draw=()=>{
  for(const p of poses(S.read())){
   const n=wafers.find(w=>w.key===p.node).root;n.position.set(...p.positionM);n.rotation.y=p.rotationRad;
  }
  render();
 };
 function set(k){const [p,q]=cams[k]??cams.overview;cam.position.set(...p);o.target.set(...q);o.update();draw();}
 document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>set(b.dataset.camera));$('camera-reset').onclick=()=>set('overview');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of ray.intersectObject(m,true)){let a=h.object;while(a){if(Object.hasOwn(targets,a.name)){refresh(S.hit(a.name));return;}a=a.parent;}}
 };
 set('overview');c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · round wafers and individually indexed cassette slots.';
}
refresh(S.read());scene().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Transfer and export still work.';});
