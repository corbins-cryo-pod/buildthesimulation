import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,measure,aggregate,picks} from '../../../../public/equipment/12-11/area-board.mjs';
const $=k=>document.getElementById('lmd-'+k);let state=initial(),r,c,o,s,g;
const views={front:[[.63,.78,1.50],[.12,.27,.07]],side:[[.99,.63,1.0],[0,.36,-.026]],board:[[.65,.42,.80],[.43,.037,.276]]};
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const m=measure(state),list=state.vertices.map(v=>v.join(',')).join(' '),ns='http://www.w3.org/2000/svg';$('edge').setAttribute('points',list);$('fill').setAttribute('points',state.closed?list:'');
 $('vertices').replaceChildren(...state.vertices.map(([x,y])=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r','0.7');return dot}));
 $('area').textContent=m?m.areaGridUnits2.toLocaleString('en-US')+' grid units² · '+m.vertexCount+' vertices':state.vertices.length+(state.vertices.length===1?' vertex':' vertices')+' · open polygon';
 $('export').disabled=!m;
}
function action(a,v){try{state=reduce(state,a,v);$('notice').textContent='';refresh()}catch(e){$('notice').textContent=e.message}}
for(const k of ['example','clear','undo','close'])$(k).onclick=()=>action(k);
$('add').onclick=()=>action('add',[$('x').valueAsNumber,$('y').valueAsNumber]);
$('chart').addEventListener('click',e=>{const svg=$('chart'),mt=svg.getScreenCTM();if(!mt)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(mt.inverse());action('add',[Math.round(p.x),Math.round(p.y)])});
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(aggregate(state),null,2)],{type:'application/json'}));a.href=u;a.download='12-11-offline-area-r'+state.revision+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));
 s=new T.Scene();s.background=new T.Color(0xcbd5d0);c=new T.PerspectiveCamera(36,1,.012,8);o=new OrbitControls(c,cv);o.minDistance=.11;o.maxDistance=4;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x667174,2.8));const k=new T.DirectionalLight(0xffffff,3);k.position.set(.57,1,1);s.add(k);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/12-11/lmd7.glb')).scene;s.add(g);render();$('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate grid board.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true).find(q=>picks[q.object.name]);if(q)action(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the offline geometry board still works.'}}
action('example');init();
