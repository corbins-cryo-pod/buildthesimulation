import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import{initial,reduce,report,columns,picks}from'../../../../public/equipment/15-10/art.mjs';
const $=k=>document.getElementById('en-'+k),ns='http://www.w3.org/2000/svg',views={front:[[1.26,1.94,3.5],[.27,.70,.04]],case:[[.87,1.62,1.47],[0,.87,.02]],board:[[.89,1.35,.84],[.65,.756,.205]]};
let st=initial(),r,c,o,s,g;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function node(n,a){const e=document.createElementNS(ns,n);for(const [k,v] of Object.entries(a))e.setAttribute(k,v);return e}
function staticArt(){const a=columns.flatMap(({top,bottom},i)=>[top,bottom].filter(Number.isFinite).map(j=>node('rect',{x:9+i*13,y:j*5+8,width:7,height:3,rx:.6,fill:'#ceeee7'})));$('art').replaceChildren(...a)}
function refresh(){
 const q=report(st),i=columns.findIndex(k=>k.id===q.column),x=8+i*13;
 $('column').value=st.index;$('highlight').setAttribute('x',x);$('gap').setAttribute('x1',x+4.5);$('gap').setAttribute('x2',x+4.5);
 $('gap').setAttribute('visibility',q.status==='two-marks'?'visible':'hidden');
 $('readout').textContent=q.status==='missing-mark'?'Column '+q.column+' · missing lower mark; no result':'Column '+q.column+' · '+q.rowSteps+' row steps · '+q.separationGraphicUnits+' graphic units';
 render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('column').onchange=()=>act('column',Number($('column').value));
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='15-10-offline-art.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.016,14);o=new OrbitControls(c,cv);o.minDistance=.14;o.maxDistance=6;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.7));const l=new T.DirectionalLight(0xffffff,3.1);l.position.set(.82,1.65,1.45);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/15-10/envisu-c2300.glb')).scene;s.add(g);render();$('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate gold column tab.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the fixed art card remains usable.'}}
staticArt();refresh();init();
