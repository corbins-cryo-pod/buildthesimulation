import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,blank,defaults,insert,seat} from '../../../../public/equipment/10-14/solver.mjs';
const $=k=>document.getElementById('df-'+k);let state=blank(),pose=()=>{};
const form=()=>({xMm:$('xMm').valueAsNumber,yMm:$('yMm').valueAsNumber,leftTag:$('leftTag').value,rightTag:$('rightTag').value});
function sketch(){
 const c=$('diagram'),g=c.getContext('2d'),{width:w,height:h}=c,s=1.6, X=x=>w*.31+x*s,Y=y=>h*.51-y*s,p=state.parameters;
 g.fillStyle='#1a3035';g.fillRect(0,0,w,h);g.fillStyle='#f3e6cc';g.font='16px monospace';g.fillText('Dry XY recess',20,26);g.fillText('Detached display tags',w*.59,26);
 const box=(x,y,W,D)=>[X(x-W/2),Y(y+D/2),W*s,D*s];
 g.lineWidth=2;g.strokeStyle='#91e2dc';g.strokeRect(...box(0,0,seat.widthMm,seat.depthMm));
 if(state.visible){const b=box(p.xMm,p.yMm,insert.widthMm,insert.depthMm);g.fillStyle=state.result?.fitStatus==='interference'?'#a75b43':'#a47b4b';g.fillRect(...b);g.strokeStyle='#f2bf79';g.strokeRect(...b);}
 if(state.tagsVisible){
  for(const [i,col,label] of [[0,'#497db6',p.leftTag],[1,'#ae683d',p.rightTag]]){
   const x=w*.56+i*119;g.fillStyle=col;g.fillRect(x,111,99,43);g.fillStyle='#fff4da';g.fillText(label,x+20,138);
  }
 }else{g.fillText('Labels hidden',w*.60,130)}
 g.fillStyle='#f3e6cc';g.fillText('No electrical connection',w*.58,177);g.fillText('X → · Y ↑ · distances in mm',18,h-13);
}
function sync(){
 const r=state.result,p=state.parameters;
 $('insert').textContent=state.visible?'Hide display block':'Show display block';$('tags').textContent=state.tagsVisible?'Hide tag labels':'Show tag labels';
 $('result').textContent=r?[`Fit: ${r.fitStatus}`,`L/R: ${r.marginMm.left.toFixed(2)} / ${r.marginMm.right.toFixed(2)} mm`,`Front/back: ${r.marginMm.front.toFixed(2)} / ${r.marginMm.back.toFixed(2)} mm`,'Tags: '+(r.labels.matchesReference?'match drawing':'do not match drawing'),'Detached throughout'].join('\n'):'No inspection report yet.';
 $('export').disabled=!r;sketch();pose(p);
}
function dispatch(type,payload){
 const q=$('status');try{state=action(state,{type,payload});q.classList.remove('error');
  if(type==='reset')for(const [k,v] of Object.entries(defaults))$(k).value=v;
  q.textContent=type==='inspect'?'Dry drawing check completed. Plugs remain detached.':'Only the display changed.';
 }catch(e){q.classList.add('error');q.textContent=e.message}sync();
}
for(const k of ['reset','inspect','insert','tags'])$(k).onclick=()=>dispatch(k,k==='inspect'?form():undefined);
for(const k of Object.keys(defaults))$(k).onchange=()=>dispatch('set',form());
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='10-14-dry-inspection.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xadc1c1,2.66));const key=new T.DirectionalLight(0xfff3dc,2.4);key.position.set(.8,.95,.72);scene.add(key);
 const cam=new T.PerspectiveCamera(36,1,.002,10),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.08;orbit.maxDistance=2;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/10-14/dry-fixture.glb');scene.add(root);
 const n=k=>root.getObjectByName(k),block=n('inert_block'),labels=['left','right'].map(side=>{
  const c=document.createElement('canvas');c.width=250;c.height=115;
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(.039,.018),new T.MeshBasicMaterial({map:t}));n('tag_'+side+'_anchor').add(mesh);return {c,t,mesh};
 });
 const views={overall:[[.50,.39,.62],[0,.042,0]],mount:[[.10,.34,.41],[-.067,.042,.005]],tags:[[.29,.19,.31],[.114,.072,.014]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(k){cam.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 pose=p=>{
  block.visible=state.visible;block.position.set(-.075+p.xMm*.001,.041,-.009-p.yMm*.001);
  labels.forEach(({c,t,mesh},i)=>{const g=c.getContext('2d');g.fillStyle=['#274d73','#784123'][i];g.fillRect(0,0,250,115);g.fillStyle='#f4ecd6';g.font='56px monospace';g.textAlign='center';g.fillText(i?p.rightTag:p.leftTag,125,78);t.needsUpdate=true;mesh.visible=state.tagsVisible});
  draw();
 };
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-df-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.dfView)});
 const ray=new T.Raycaster(),targets=[n('block_display_toggle'),n('tag_display_toggle')];let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='block_display_toggle'?'insert':'tags')});
 snap('overall');pose(state.parameters);$('ready').textContent='Metric dry display loaded. The two teal badges toggle the block and labels only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The dry clearance check is still available.';console.warn(e.message)});
