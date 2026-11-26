import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,report,picks} from '../../../../public/equipment/06-05/rectangle.mjs';
const $=k=>document.getElementById('ne-'+k),views={front:[[.78,1.17,2.24],[.18,.47,.02]],shell:[[1.17,.99,-1.14],[0,.51,0]],board:[[.94,1.05,.57],[.648,.53,.098]]};
let st=initial(),r,c,o,s,g,tile;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st);$('width').value=q.width;$('readout').textContent=q.width+' × '+q.height+' grid units · area '+q.area+' grid units² · perimeter '+q.perimeter+' grid units';
 const w=6*q.width,h=6*q.height,shape=$('diagram');for(const [k,v] of Object.entries({x:80-w/2,y:45-h/2,width:w,height:h}))shape.setAttribute(k,v);
 if(tile)tile.scale.set(q.width/10,1,q.height/10);render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('width').onchange=()=>act('width',Number($('width').value));
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='06-05-offline-rectangle.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.01,9);o=new OrbitControls(c,cv);o.minDistance=.10;o.maxDistance=4;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x63736e,2.8));const l=new T.DirectionalLight(0xffffff,3);l.position.set(1.05,1.8,1.35);s.add(l);
 const fit=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(fit).observe(cv);fit();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/06-05/ne200.glb')).scene;tile=g.getObjectByName('Offline_gold_rect');s.add(g);refresh();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom or tap the gold rectangle on the detached stand.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true)[0];if(q&&picks[q.object.name])act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the independent rectangle check is still available.'}}
refresh();init();
