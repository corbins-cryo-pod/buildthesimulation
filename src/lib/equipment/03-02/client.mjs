import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {compare,createStation,targets} from '../../../../public/equipment/03-02/maps.mjs';
const S=createStation(),$=id=>document.getElementById(id);let update=()=>{};
const heat=n=>n===0?'#d7dbd7':['#a6c5d2','#a7d7ca','#cbdc9d','#efcca0','#efb083'][Math.max(0,Math.min(4,Math.floor((n-74)/3)))];
function refresh(s){
 const maps=$('maps');maps.replaceChildren();$('cutaway').textContent=s.cutaway?'Show glass again':'Hide glass for inspection';$('export').disabled=!s.loaded;
 if(s.loaded){
  const result=compare(s.view);
  $('status').textContent=s.error??(s.view==='baseline'?'Unchanged blank: 0 nm increment on every site.':'Max mirror difference: '+result.comparison.maxMirrorDeltaNm+' nm. Mean: '+result.coupons.L.summary.meanNm.toFixed(3)+' nm per coupon.');
  for(const [side,c]of Object.entries(result.coupons)){
   const a=document.createElement('div');a.className='result'+(s.focus!=='both'&&s.focus!==side?' muted':'');a.dataset.coupon=side;
   const p=document.createElement('p');p.textContent=(side==='L'?'Left':'Right')+' · '+c.xMm[0]+'…'+c.xMm.at(-1)+' mm X';a.append(p);
   const t=document.createElement('table');t.setAttribute('aria-label',(side==='L'?'Left':'Right')+' coupon thickness in nm, rows increasing Z');
   for(const [i,row]of c.matrixNm.entries()){
    const tr=document.createElement('tr');for(const [j,x]of row.entries()){const td=document.createElement('td');td.textContent=x;td.style.background=heat(x);td.title='X '+c.xMm[j]+' mm, Z '+result.coordinates.zMm[i]+' mm';tr.append(td);}t.append(tr);
   }
   const label=document.createElement('p');const u=c.summary.halfRangeOverMeanPercent;label.textContent='Thickness (nm) · half-range/mean '+(u===null?'undefined':u.toFixed(3)+'%');a.append(t,label);maps.append(a);
  }
 } else $('status').textContent=s.error??'Synthetic paired reference ready; select Compare paired maps.';
 update();
}
function act(t,p){refresh(S.dispatch(t,p));}
$('run').onclick=()=>act('load','snapshot');$('blank').onclick=()=>act('load','baseline');$('reset').onclick=()=>act('reset');$('cutaway').onclick=()=>act('cutaway');
for(const [name,p] of [['l','L'],['r','R'],['both','both']])$('focus-'+name).onclick=()=>act('focus',p);
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(compare(S.read().view),null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='auto306-synthetic-coupon-map.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
async function model(){
 const c=$('instrument-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#283d43');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const w=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.001,14),o=new OrbitControls(cam,c);o.minDistance=.06;o.maxDistance=5;
 w.add(new T.HemisphereLight('#f1faff','#d6c5aa',2.6));
 for(const [xyz,col,i] of [[[1.5,2.1,2.0],'#ffefd4',3.3],[[-1,.7,-1],'#d2eeff',2.1]]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);w.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/03-02/auto-306-display.glb')).scene;w.add(m);
 const glass=m.getObjectByName('Inspection_shells'),coupons={};
 for(const side of ['L','R']){
  const p=m.getObjectByName('Coupon_'+side+'_plot');p.userData.action=['focus',side];coupons[side]=Array.from({length:9},(_,i)=>{
   const mesh=new T.Mesh(new T.BoxGeometry(.0096,.00022,.0096),new T.MeshBasicMaterial({color:'#ffffff'}));
   mesh.position.set((i%3-1)*.01,0,(Math.floor(i/3)-1)*.01);p.add(mesh);mesh.userData.action=['focus',side];return mesh;
  });
 }
 const render=()=>r.render(w,cam);
 update=()=>{
  const s=S.read(),o=compare(s.view);glass.visible=!s.cutaway;
  for(const [side,c]of Object.entries(coupons))c.forEach((m,i)=>{m.visible=s.loaded;m.material.color.set(heat(o.coupons[side].matrixNm.flat()[i]));});render();
 };
 const cameras={whole:[[1.26,1.46,2.39],[.012,.735,.008]],bell:[[-.60,1.46,.71],[-.19,1.24,-.06]],coupon:[[-.20,1.51,.048],[-.22,1.205,-.068]],rear:[[-1.23,1.28,-2.17],[-.014,.74,-.018]]};
 function set(k){const [p,q]=cameras[k]??cameras.whole;cam.position.set(...p);o.target.set(...q);o.update();render();}
 document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>set(b.dataset.camera));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let start;c.onpointerdown=e=>start=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const h of ray.intersectObject(m,true)){let a=h.object,seen=true,action=null;while(a){if(!a.visible)seen=false;if(!action)action=a.userData.action??(Object.hasOwn(targets,a.name)?targets[a.name]:null);a=a.parent;}if(seen&&action){act(...action);return;}}
 };
 set('whole');update();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · manual-anchored AUTO 306 exterior.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The synthetic reference comparison and export still work.';});
