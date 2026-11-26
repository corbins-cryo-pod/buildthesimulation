import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import{initial,reduce,report,markers,width,height,fixedRaster,picks}from'../../../../public/equipment/11-08/graphic.mjs';
const $=k=>document.getElementById('or-'+k),views={front:[[-.145,.135,.317],[.049,.045,.010]],rear:[[-.145,.108,-.231],[0,.045,-.004]],board:[[.174,.137,.166],[.132,.030,.031]]};
let st=initial(),r,c,o,s,g;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function paintFixed(){
 const ctx=$('raster').getContext('2d'),im=ctx.createImageData(width,height);
 fixedRaster.forEach((p,i)=>im.data.set([p+12,p+23,p+29,255],4*i));ctx.putImageData(im,0,0);
}
function refresh(){
 const q=report(st),p=markers(st).map(v=>v.map(n=>n+.5));$('span').value=q.span;
 $('line').setAttribute('x1',p[0][0]);$('line').setAttribute('y1',p[0][1]);$('line').setAttribute('x2',p[1][0]);$('line').setAttribute('y2',p[1][1]);
 for(let i=0;i<2;i++){$('dot'+i).setAttribute('cx',p[i][0]);$('dot'+i).setAttribute('cy',p[i][1])}
 $('readout').textContent=q.distancePx+' px · '+q.distanceGraphicUnits+' graphic units';render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('span').onchange=()=>act('span',$('span').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='11-08-offline-graphic.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.002,2);o=new OrbitControls(c,cv);o.minDistance=.025;o.maxDistance=1;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.75));const l=new T.DirectionalLight(0xffffff,3.1);l.position.set(-.19,.25,.18);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/11-08/orca-v3.glb')).scene;s.add(g);render();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate gold legend.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the authored ruler graphic remains usable.'}}
paintFixed();refresh();init();
