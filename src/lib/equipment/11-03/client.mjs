import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/11-03/readout.mjs';
const $=k=>document.getElementById('ot-'+k),views={front:[[.118,.142,.329],[.047,.010,.010]],case:[[.070,.104,.165],[-.015,.010,.010]],board:[[.171,.154,.132],[.126,.019,.001]]};
let st=initial(),r,c,o,s,g,marker;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st),cx=80+q.column*10,cy=50+q.row*10;$('mark').value=q.id;
 $('point').setAttribute('cx',cx);$('point').setAttribute('cy',cy);
 $('direct').setAttribute('d','M80 50L'+cx+' '+cy);$('axis').setAttribute('d','M80 50H'+cx+'V'+cy);
 $('readout').textContent='('+q.column+', '+q.row+') · straight '+q.straightDistance+' · along axes '+q.axisDistance;
 if(marker)marker.position.set(.126+.0063*q.column,.0198,.001+.0063*q.row);
 render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('mark').onchange=()=>act('mark',$('mark').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='11-03-offline-coordinate.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.002,2);o=new OrbitControls(c,cv);o.minDistance=.018;o.maxDistance=.75;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.7));const l=new T.DirectionalLight(0xffffff,3.1);l.position.set(.17,.28,.20);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/11-03/otpg4.glb')).scene;marker=g.getObjectByName('Offline_locator_marker');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate gold marker.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the separate geometry readout remains usable.'}}
refresh();init();
