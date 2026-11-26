import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,reference,picks,ys} from '../../../../public/equipment/13-05/lattice.mjs';
const $=k=>document.getElementById('jem-'+k),ns='http://www.w3.org/2000/svg';
const views={front:[[2.1,2.59,4.7],[.25,1.03,.15]],column:[[.55,2.15,2.28],[-.45,1.55,.08]],board:[[2.08,1.68,1.78],[1.51,.65,.628]]};
let st=initial(),r,c,o,s,g;function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function node(k,a){const n=document.createElementNS(ns,k);for(const [p,v] of Object.entries(a))n.setAttribute(p,v);return n}
function refresh(){
 const t=report(st),p=reference(st);$('plate').value=st.plate;const [a,,,,b]=p.centersPx;
 $('dots').replaceChildren(...ys.flatMap(cy=>p.centersPx.flatMap(cx=>[node('circle',{cx,cy,r:3.4,fill:'#b3d9cf',opacity:.21}),node('circle',{cx,cy,r:1.6,fill:'#e7efdb'})])));
 $('mark').replaceChildren(node('path',{d:'M'+a+' 96v7h'+(b-a)+'v-7',fill:'none',stroke:'#fcc784','stroke-width':1}));
 $('result').textContent=t.pitchNm.toFixed(2)+' nm ('+t.pitchAngstrom.toFixed(1)+' Å) · '+t.spanPx+' px across '+t.intervals+' intervals';
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('compare').onclick=()=>act('compare');$('plate').onchange=()=>act('plate',$('plate').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='13-05-'+reference(st).id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.04,18);o=new OrbitControls(c,cv);o.minDistance=.2;o.maxDistance=8;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x657575,2.9));const k=new T.DirectionalLight(0xffffff,3);k.position.set(1.2,2.5,2.9);s.add(k);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/13-05/jem1400plus.glb')).scene;s.add(g);render();$('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the separate lattice board.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true).find(q=>picks[q.object.name]);if(q)act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the fixed offline lattices are still shown.'}}
refresh();init();
