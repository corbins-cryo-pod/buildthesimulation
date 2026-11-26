import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,initial} from '../../../../public/equipment/08-11/solver.mjs';
import example from '../../../../public/equipment/08-11/example-artwork.json';
const $=id=>document.getElementById('pm-'+id);let state=initial(example),pose=()=>{};
function draw(){
 const c=$('map'),g=c.getContext('2d'),{width:w,height:h}=c,[W,H]=state.source.outlineMm,S=Math.min((w-130)/W,(h-100)/H),x0=(w-W*S)/2,y0=(h+H*S)/2;
 const x=a=>x0+a*S,y=b=>y0-b*S;
 g.fillStyle='#182f33';g.fillRect(0,0,w,h);g.font='16px sans-serif';g.fillStyle='#f7e9cf';g.fillText('Top copper · board frame in mm',17,23);
 g.fillStyle='#415a51';g.strokeStyle='#c7d7ba';g.fillRect(x0,y(H),W*S,H*S);g.strokeRect(x0,y(H),W*S,H*S);
 const colors=['#e7a45a','#90dfcf'],byId=new Map();state.report?.components.forEach(c=>c.rectangleIds.forEach(id=>byId.set(id,c.status==='short'?'#f68564':colors[state.source.nets.findIndex(n=>n.id===c.intendedNetIds[0])]??'#cdb888')));
 for(const r of state.source.rectangles){
  const [a,b,A,B]=r.boundsMm;g.fillStyle=byId.get(r.id)??'#e0a568';g.fillRect(x(a),y(B),(A-a)*S,(B-b)*S);if(r.padId){g.fillStyle='#142529';g.fillText(r.padId,x(a)+4,y(B)+17)}
 }
 const p=state.report?.crossNetPairs[0];
 if(p){
  const a=p.closestPointsMm[0],b=p.closestPointsMm[1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  g.strokeStyle=p.status==='width-available'?'#cdffe0':'#fb8369';g.lineWidth=2;g.beginPath();g.moveTo(x(a[0]),y(a[1]));g.lineTo(x(b[0]),y(b[1]));g.stroke();
  g.beginPath();g.arc(x(mx),y(my),Math.max(3,state.diameterMm*S/2),0,2*Math.PI);g.stroke();
  g.beginPath();g.moveTo(x(mx),y(my));g.lineTo(x(mx)-28,y(my)-25);g.lineTo(x(mx)-55,y(my)-25);g.stroke();
  g.fillStyle='#fbefe1';g.fillText(p.clearanceMm.toFixed(3)+' mm',x(mx)-118,y(my)-30);
 }
 g.fillStyle='#f7e9cf';g.fillText(W+' × '+H+' mm',x0,h-17);g.fillText('No cuts or commands are generated',Math.max(x0+110,w-280),h-17);
}
function sync(){
 $('hood').textContent=state.hoodOpen?'Close display hood':'Open display hood';
 $('result').textContent=state.report?[...state.report.netChecks.map(n=>n.netId+' · '+n.status),...state.report.crossNetPairs.slice(0,8).map(p=>p.rectangleIds.join(' ↔ ')+' · '+p.clearanceMm.toFixed(3)+' mm · '+p.status),...(!state.report.crossNetPairs.length?['No separated unlike-net components available for a gap check.']:[])].join('\n'):'No inspection result.';
 $('loaded').textContent=state.source.sampleId+' · '+state.source.revision;$('export').disabled=!state.report;draw();pose();
}
function dispatch(type,payload){
 const msg=$('status');try{state=action(state,{type,payload});msg.classList.remove('error');msg.textContent=type==='inspect'?'Inspection revision '+state.revision+' created without modifying the artwork.':type==='artwork'?'Inert coupon loaded.':'Display updated.'}catch(e){msg.classList.add('error');msg.textContent=e.message}sync();
}
$('hood').onclick=()=>dispatch('hood');$('inspect').onclick=()=>dispatch('inspect');$('example').onclick=()=>dispatch('artwork',example);
$('diameter').onchange=e=>{dispatch('diameter',e.target.valueAsNumber);if(e.target.valueAsNumber!==state.diameterMm)e.target.value=state.diameterMm};
$('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>120000)throw Error('Artwork exceeds 120 kB.');dispatch('artwork',JSON.parse(await f.text()))}catch(err){$('status').classList.add('error');$('status').textContent=err.message}finally{e.target.value=''}};
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='08-11-inspection-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function view(){
 const el=$('view'),renderer=new T.WebGLRenderer({antialias:true});el.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa9b9bb,2.52));const k=new T.DirectionalLight(0xfff6e2,2.35);k.position.set(.7,1.5,.9);scene.add(k);
 const camera=new T.PerspectiveCamera(37,1,.002,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.12;orbit.maxDistance=3.1;
 const {scene:model}=await new GLTFLoader().loadAsync('/equipment/08-11/protomat-s104.glb');scene.add(model);
 const node=n=>model.getObjectByName(n),hood=node('acoustic_hood'),base=node('coupon_anchor'),group=new T.Group();base.add(group);
 const m=new T.MeshStandardMaterial({color:0x44594a}),copper=new T.MeshStandardMaterial({color:0xc57633,metalness:.4,roughness:.45}),closed=new T.MeshStandardMaterial({color:0xcf694a,metalness:.1});let src=null,lastReport=null;
 const views={overall:[[1.07,.94,1.24],[0,.25,0]],platen:[[.18,.52,.61],[0,.29,.11]],rear:[[.87,.68,-1.14],[0,.25,-.094]]};
 const render=()=>renderer.render(scene,camera);
 function snap(v){camera.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();render()}
 pose=()=>{
  hood.rotation.x=state.hoodOpen?-.78:0;
  if(src!==state.source||lastReport!==state.report){
   for(const ob of [...group.children]){ob.geometry.dispose();group.remove(ob)}
   const [W,H]=state.source.outlineMm,put=(x,z,w,h,d,Y,M)=>{const ob=new T.Mesh(new T.BoxGeometry(w,d,h),M);ob.position.set(x,Y,z);group.add(ob)};
   put(0,0,W*.001,H*.001,.0015,.0005,m);
   const warn=new Set(state.report?.crossNetPairs.filter(p=>p.status==='too-narrow').flatMap(p=>p.rectangleIds));
   for(const r of state.source.rectangles){const [a,b,A,B]=r.boundsMm;put(((a+A-W)/2)*.001,-((b+B-H)/2)*.001,(A-a)*.001,(B-b)*.001,.0002,.00135,warn.has(r.id)?closed:copper)}
   src=state.source;lastReport=state.report;
  }render();
 };
 orbit.addEventListener('change',render);new ResizeObserver(()=>{if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();render()}).observe(el);
 for(const b of document.querySelectorAll('[data-pm-view]'))b.onclick=()=>snap(b.dataset.pmView);
 const targets=[node('hood_handle'),node('inspect_target')],ray=new T.Raycaster();let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='hood_handle'?'hood':'inspect')});
 snap('overall');sync();$('ready').textContent='Metric GLB loaded · drag to orbit; choose the hood handle or inspect marker.';
}
view().catch(e=>{$('ready').textContent='3D unavailable. The measured geometry exercise and report are still available.';console.warn(e.message)});
