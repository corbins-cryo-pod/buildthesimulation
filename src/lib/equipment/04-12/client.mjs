import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/04-12/overlap.mjs';
const $=k=>document.getElementById('evg-'+k),views={front:[[1.18,1.64,3.29],[.25,.72,.02]],shell:[[.38,1.5,1.49],[-.20,1.19,.03]],board:[[1.18,1.54,.78],[.81,.824,.181]]};
let st=initial(),r,c,o,s,g,tile;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st);$('offset').value=st.offset;$('readout').textContent=(q.sharedAreaFraction*100)+'% shared area';$('moving').setAttribute('x',15+60*st.offset);$('shared').setAttribute('x',15+60*st.offset);$('shared').setAttribute('width',60*q.sharedAreaFraction);
 if(tile)tile.position.x=.749+.12*st.offset;render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('offset').onchange=()=>act('offset',Number($('offset').value));
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='04-12-offline-overlap.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.015,14);o=new OrbitControls(c,cv);o.minDistance=.12;o.maxDistance=6;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.8));const l=new T.DirectionalLight(0xffffff,3);l.position.set(1.05,2.1,1.7);s.add(l);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/04-12/evg501.glb')).scene;tile=g.getObjectByName('Offline_gold_square');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the gold square on the detached board.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the detached square diagram is still available.'}}
refresh();init();
