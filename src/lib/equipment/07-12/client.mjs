import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,points,picks} from '../../../../public/equipment/07-12/geometry-card.mjs';
const $=k=>document.getElementById('qs-'+k),views={front:[[.55,.53,1.20],[.09,.162,.05]],rear:[[.55,.49,-1.07],[0,.19,0]],board:[[.43,.36,.44],[.307,.118,.123]]};
let st=initial(),r,c,o,s,g;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st),p=points(st).map(([x,y])=>[36+x*10,85-y*10]);
 $('card').value=q.card;$('annotation').setAttribute('points',p.map(v=>v.join(',')).join(' '));$('annotation').setAttribute('fill',q.hasEnclosedArea?'#d5a35c80':'none');
 for(let i=0;i<3;i++){
  const [x,y]=p[i],n=$('p'+i),l=$('l'+i);n.setAttribute('cx',x);n.setAttribute('cy',y);l.setAttribute('x',x+2);l.setAttribute('y',y+13);
 }
 $('readout').textContent=q.hasEnclosedArea?'Enclosed area '+q.area+' square units':'No enclosed area · 0 square units';
 $('sides').textContent=q.edgeLengths.join(' / ')+' units';
 if(g)g.traverse(o=>{if(o.name.startsWith('Offline_annotated_'))o.visible=q.card==='triangle';if(o.name.startsWith('Offline_flat_'))o.visible=q.card==='flat'});render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('card').onchange=()=>act('card',$('card').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='07-12-offline-geometry.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.008,8);o=new OrbitControls(c,cv);o.minDistance=.08;o.maxDistance=3;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.8));const l=new T.DirectionalLight(0xffffff,3);l.position.set(.51,.95,.71);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/07-12/quantstudio3.glb')).scene;s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate geometry card.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true).find(q=>picks[q.object.name]);if(q)act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the offline geometry card still works.'}}
refresh();init();
