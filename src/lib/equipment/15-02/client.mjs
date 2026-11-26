import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
import{initial,reduce,report,points,picks}from'../../../../public/equipment/15-02/chart.mjs';
const $=k=>document.getElementById('sm-'+k),views={front:[[-.49,.652,1.25],[.11,.256,.018]],side:[[.85,.70,.70],[0,.267,.005]],board:[[.44,.324,.39],[.30,.079,.057]]};
let st=initial(),r,c,o,s,g;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st),[a,b]=points(st);$('scale').value=String(q.displayScale);$('span').value=q.span;
 $('zoomGroup').setAttribute('transform','translate(48 27) scale('+q.displayScale+') translate(-48 -27)');
 $('line').setAttribute('x1',a);$('line').setAttribute('x2',b);$('p0').setAttribute('cx',a);$('p1').setAttribute('cx',b);
 $('readout').textContent=q.chartSpanPx+' chart px · '+q.chartDistanceMm+' mm on the drawing';
 $('legend').textContent=q.legendPxPerMm+' chart px/mm at '+q.displayScale+'× display scale';render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('toggle').onclick=()=>act('toggle');$('scale').onchange=()=>act('zoom',Number($('scale').value));$('span').onchange=()=>act('span',$('span').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='15-02-offline-chart.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.008,7);o=new OrbitControls(c,cv);o.minDistance=.055;o.maxDistance=3;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.7));const l=new T.DirectionalLight(0xffffff,3.1);l.position.set(-.35,.77,.82);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/15-02/smz25.glb')).scene;s.add(g);render();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the gold scale tile on the separate board.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the separate geometry chart remains usable.'}}
refresh();init();
