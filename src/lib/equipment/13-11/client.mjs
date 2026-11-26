import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/13-11/geometry-card.mjs';
const $=k=>document.getElementById('cpd-'+k);
const views={front:[[.57,.65,1.22],[.12,.14,.04]],rear:[[.52,.59,-.88],[0,.16,-.025]],board:[[.52,.39,.54],[.34,.083,.14]]};
let st=initial(),r,c,o,s,g,cube;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){const q=report(st);$('ratio').value=st.ratio;$('edge').textContent=q.edgeRatio;$('area').textContent=q.surfaceAreaRatio;$('volume').textContent=q.volumeRatio;
 if(cube){cube.scale.setScalar(st.ratio);cube.position.y=.0695+.028*st.ratio}render()}
function action(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>action('next');$('ratio').onchange=()=>action('ratio',Number($('ratio').value));
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='13-11-offline-cube.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.015,8);o=new OrbitControls(c,cv);o.minDistance=.08;o.maxDistance=3;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x64736e,2.9));const k=new T.DirectionalLight(0xffffff,3);k.position.set(.6,1.3,1.15);s.add(k);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/13-11/cpd300.glb')).scene;cube=g.getObjectByName('Offline_comparison_cube');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the gold cube on the separate stand.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])action(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the independent diagram readout is still available.'}}
refresh();init();
