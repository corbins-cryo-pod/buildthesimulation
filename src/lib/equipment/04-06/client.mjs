import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/04-06/footprint.mjs';
const $=k=>document.getElementById('wet-'+k),views={front:[[1.38,1.96,3.78],[.24,.80,.10]],rear:[[1.64,1.74,-3.14],[0,.83,0]],board:[[1.59,1.42,.96],[1.20,.855,.290]]};
let st=initial(),r,c,o,s,g,tile;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st);$('footprint').textContent=q.projectedTileMm.join(' × ')+' mm';$('margin').textContent=q.totalClearanceMm.map(v=>(v>=0?'+':'')+v).join(' / ')+' mm';$('label').textContent=q.orientationDeg+'° · '+(q.fits?'Fits projected outline':'Outside projected outline');
 $('label').dataset.fits=q.fits?'yes':'no';if(tile)tile.rotation.y=q.orientationDeg*Math.PI/180;render();
}
function action(a){st=reduce(st,a);refresh()}
for(const k of ['turn','reset'])$(k).onclick=()=>action(k);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='04-06-offline-footprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.018,15);o=new OrbitControls(c,cv);o.minDistance=.15;o.maxDistance=6;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x67726e,2.8));const k=new T.DirectionalLight(0xffffff,3);k.position.set(1.6,2.0,1.9);s.add(k);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/04-06/wet-bench.glb')).scene;tile=g.getObjectByName('Footprint_gold_token');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the unrelated gold tile.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])action(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the separate footprint calculation is still available.'}}
refresh();init();
