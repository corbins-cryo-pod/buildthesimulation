import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/06-10/plan-view.mjs';
const $=k=>document.getElementById('dry-'+k),views={front:[[1.22,1.40,3.15],[.22,.43,.04]],furniture:[[.51,1.58,1.94],[0,.46,0]],board:[[1.39,1.40,.72],[1.106,.695,.159]]};
let st=initial(),r,c,o,s,g,tile;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st);$('pose').value=q.pose;$('readout').textContent=q.degrees.toFixed(q.pose==='diagonal'?2:0)+'° · '+q.bounds.join(' × ')+' units · '+(q.fits?'Fits outline':'Does not fit');
 $('clearance').textContent=q.totalMargin.map(v=>(v>=0?'+':'')+v).join(' / ')+' units';$('readout').dataset.fits=q.fits?'yes':'no';
 const [w,h]=q.bounds;for(const [k,v] of Object.entries({x:90-w/2,y:72.5-h/2,width:w,height:h}))$('projected').setAttribute(k,v);
 $('token').setAttribute('transform','rotate('+q.degrees+' 90 72.5)');if(tile)tile.rotation.y=-q.degrees*Math.PI/180;render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('pose').onchange=()=>act('pose',$('pose').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='06-10-offline-footprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.012,13);o=new OrbitControls(c,cv);o.minDistance=.12;o.maxDistance=6;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.7));const l=new T.DirectionalLight(0xffffff,3);l.position.set(1.05,1.8,1.35);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/06-10/dry-table.glb')).scene;tile=g.getObjectByName('Offline_footprint_token');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the gold tile on the detached stand.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the separate footprint drawing remains usable.'}}
refresh();init();
