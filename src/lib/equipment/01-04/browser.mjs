import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,dims,exportAnnotation,initial,lookup,makeExample,worldFromIndex} from '../../../../public/equipment/01-04/solver.mjs';
const $=id=>document.getElementById('cc-'+id);let state=initial(),pose=()=>{},mapViewport=null;
const gauge=document.createElement('canvas');gauge.width=480;gauge.height=300;
function diagram(){
 const c=$('map'),g=c.getContext('2d'),{width:w,height:h}=c,{level,volume,cursor}=state, d=dims(level),[nx,ny]=d, snap=lookup(volume,level,cursor), vz=snap.indexVox[2], [dx,dy]=snap.voxelSizeNm;
 const scale=Math.min((w-125)/(nx*dx),(h-117)/(ny*dy)),cx=dx*scale,cy=dy*scale,width=nx*cx,height=ny*cy,x0=(w-width)/2,y0=(h+height)/2-3;
 mapViewport={x0,y0,cx,cy,width,height,vz};
 const X=x=>x0+x*cx,Y=y=>y0-y*cy,color=(value,id)=>{
  const a=Math.min(215,value),rgb=id===17?[Math.round(a*.36),a,Math.round(a*.90)]:id===52?[a,Math.round(a*.62),Math.round(a*.49)]:id?[a,a,Math.round(a*.55)]:[Math.round(a*.7),Math.round(a*.83),a];return 'rgb('+rgb.join(',')+')';
 };
 g.fillStyle='#182f34';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f4e7ca';g.fillText(`XY · ${level?'2× coarse':'native'} · displayed Z index ${vz}`,16,26);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const p=lookup(volume,level,worldFromIndex(volume,level,[i,j,vz]));g.fillStyle=color(p.intensity,p.segmentId);g.fillRect(X(i),Y(j+1),cx+.3,cy+.3)}
 g.lineWidth=1;g.strokeStyle='#27484e';
 for(let i=0;i<=nx;i++){g.beginPath();g.moveTo(X(i),Y(0));g.lineTo(X(i),Y(ny));g.stroke()}
 for(let j=0;j<=ny;j++){g.beginPath();g.moveTo(X(0),Y(j));g.lineTo(X(nx),Y(j));g.stroke()}
 const seam=X(nx/2);g.strokeStyle='#e6b370';g.lineWidth=2;g.setLineDash([7,4]);g.beginPath();g.moveTo(seam,Y(0)+5);g.lineTo(seam,Y(ny)-15);g.stroke();g.setLineDash([]);
 g.fillStyle='#f4e7ca';g.font='13px monospace';g.fillText('tile seam',seam-34,Y(ny)-19);g.fillText('left tile',X(0),Y(0)+18);g.fillText('right tile',X(nx)-77,Y(0)+18);g.fillText('X → · Y ↑ · corner in nm',16,h-10);
 const pt=v=>[X((v[0]-volume.originNm[0])/dx),Y((v[1]-volume.originNm[1])/dy)];
 const active=state.nodes.filter(n=>lookup(volume,level,n.worldNm).indexVox[2]===vz);
 for(const n of active){
  const [x,y]=pt(n.worldNm),prev=active.find(a=>a.id===n.prevNodeId);g.strokeStyle='#ffdd82';g.fillStyle='#ffe9ac';g.lineWidth=2;
  if(prev){g.beginPath();g.moveTo(...pt(prev.worldNm));g.lineTo(x,y);g.stroke()}
  g.beginPath();g.arc(x,y,4,0,2*Math.PI);g.fill();
 }
 const [x,y]=pt(cursor);g.strokeStyle='#fff9ea';g.beginPath();g.arc(x,y,9,0,2*Math.PI);g.stroke();
 const gg=gauge.getContext('2d');gg.fillStyle='#143139';gg.fillRect(0,0,480,300);gg.font='21px monospace';gg.fillStyle='#90dccf';gg.fillText('SEGMENT PROVENANCE',28,47);gg.fillStyle='#eee4ce';[
  'Segment '+snap.segmentId, 'Tile '+snap.tileId+' / level '+level,'XYZ '+cursor.join(', ')+' nm','Revision '+state.revision,'Nodes '+state.nodes.length
 ].forEach((l,i)=>gg.fillText(l,28,94+39*i));
}
function sync(){
 const view=lookup(state.volume,state.level,state.cursor),native=lookup(state.volume,0,state.cursor);
 $('zoom').textContent=state.level?'Show native voxels':'Show 2× coarse';$('slice').value=native.indexVox[2];
 $('details').textContent=[`Canonical world XYZ: ${state.cursor.join(', ')} nm`,`Label ${view.segmentId} · ${view.tileId} tile · index [${view.indexVox.join(', ')}]`,`Scale ${view.voxelSizeNm.join(' × ')} nm · ${state.nodes.length} trace nodes`,state.volume.volumeId+' / '+state.volume.revision+ ' · annotation r'+state.revision].join('\n');
 $('history').replaceChildren(...state.nodes.map(n=>{const a=document.createElement('li');a.textContent=n.id+' · label '+n.segmentId+' · ['+n.worldNm.join(', ')+'] nm';return a}));diagram();pose();
}
function dispatch(type,payload){
 const box=$('status');try{state=action(state,{type,payload});box.classList.remove('error');box.textContent=type==='demo'?'Three nodes saved across both tiles. The cursor is on the seam; switch resolution to compare.':type==='zoom'?'Canonical world point and annotations did not move.':'Console updated.'}catch(e){box.classList.add('error');box.textContent=e.message}sync();
}
for(const k of ['zoom','add','demo','clear'])$(k).onclick=()=>dispatch(k);
$('slice').oninput=e=>dispatch('slice',e.target.valueAsNumber);
$('input').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('Synthetic fixture file exceeds 100 kB.');dispatch('load',JSON.parse(await f.text()))}catch(err){$('status').classList.add('error');$('status').textContent=err.message}finally{e.target.value=''}};
$('reload').onclick=()=>dispatch('load',makeExample());
$('map').onclick=e=>{
 const c=$('map'),r=c.getBoundingClientRect(),xx=(e.clientX-r.left)*c.width/r.width,yy=(e.clientY-r.top)*c.height/r.height,{x0,y0,cx,cy,width,height,vz}=mapViewport;
 if(xx<x0||xx>=x0+width||yy>y0||yy<=y0-height)return;
 const p=worldFromIndex(state.volume,state.level,[Math.floor((xx-x0)/cx),Math.floor((y0-yy)/cy),vz]);p[2]=state.cursor[2];dispatch('select',p);
};
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(exportAnnotation(state),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='01-04-annotation.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa0b6bb,2.72));const light=new T.DirectionalLight(0xfff2d9,2.1);light.position.set(1.5,2,1.1);scene.add(light);
 const camera=new T.PerspectiveCamera(36,1,.01,20),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.22;orbit.maxDistance=5;
 const {scene:model}=await new GLTFLoader().loadAsync('/equipment/01-04/connectomics-console.glb');scene.add(model);const n=id=>model.getObjectByName(id);
 const textures=[$('map'),gauge].map(c=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t});
 for(const [i,[id,w,h]] of [['primary_texture_anchor',.720,.407],['side_texture_anchor',.445,.279]].entries())n(id).add(new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textures[i]})));
 const views={overall:[[2.04,1.69,2.65],[0,.67,0]],screens:[[.12,1.25,1.68],[.05,1.055,.08]],controls:[[.41,1.24,.81],[.24,.84,.18]]};
 const draw=()=>renderer.render(scene,camera);
 function snap(k){camera.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 pose=()=>{textures.forEach(t=>{t.needsUpdate=true});draw()};
 orbit.addEventListener('change',draw);new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();draw()}).observe(host);
 for(const b of document.querySelectorAll('[data-cc-view]'))b.onclick=()=>snap(b.dataset.ccView);
 const ray=new T.Raycaster(),targets=[n('zoom_trackball'),n('annotation_key')];let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);const hit=ray.intersectObjects(targets,false)[0]?.object;if(hit)dispatch(hit.name==='zoom_trackball'?'zoom':'add')});
 snap('overall');pose();$('ready').textContent='Metric workstation loaded. Both monitor textures follow the current synthetic viewer state.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The slice viewer and annotations still work.';console.warn(e.message)});
