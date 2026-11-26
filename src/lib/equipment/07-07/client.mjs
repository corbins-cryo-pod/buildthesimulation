import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,reduce,count,report,picks,width,height} from '../../../../public/equipment/07-07/count-board.mjs';
const $=k=>document.getElementById('count-'+k),views={front:[[.40,.34,.73],[.073,.098,.015]],rear:[[.28,.32,-.54],[0,.115,0]],board:[[.36,.27,.29],[.254,.052,.045]]};
const color=[[18,31,39],[223,166,75],[105,203,179],[137,168,233],[218,135,143]];
let st=initial(),r,c,o,s,g;
function render(){if(r)r.render(s,c)}
function view(k){c.position.set(...views[k][0]);o.target.set(...views[k][1]);o.update();render()}
function refresh(){
 const q=report(st),{labels}=count(st);$('card').value=q.card;
 $('measure').textContent=q.connectedGroups+' connected groups · '+q.foregroundPixels+' foreground pixels';
 const ctx=$('pattern').getContext('2d'),a=ctx.createImageData(width,height);
 labels.forEach((x,i)=>a.data.set([...color[x],255],4*i));ctx.putImageData(a,0,0);
 $('detail').textContent='Group areas: '+q.groupPixels.join(', ')+' pixels';render();
}
function act(a,v){st=reduce(st,a,v);refresh()}
$('next').onclick=()=>act('next');$('card').onchange=()=>act('card',$('card').value);
$('export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(report(st),null,2)],{type:'application/json'}));a.href=u;a.download='07-07-offline-shape-groups.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
async function init(){const cv=$('model');try{
 r=new T.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,1.75));s=new T.Scene();s.background=new T.Color(0xcbd4d0);
 c=new T.PerspectiveCamera(36,1,.006,7);o=new OrbitControls(c,cv);o.minDistance=.07;o.maxDistance=2;o.addEventListener('change',render);
 s.add(new T.HemisphereLight(0xffffff,0x67736e,2.8));const k=new T.DirectionalLight(0xffffff,3);k.position.set(.39,.67,.44);s.add(k);
 const size=()=>{const w=cv.clientWidth,h=cv.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render()};new ResizeObserver(size).observe(cv);size();view('front');
 g=(await new GLTFLoader().loadAsync('/equipment/07-07/countess-3-fl.glb')).scene;s.add(g);render();
 $('viewstatus').textContent='Metric GLB loaded · orbit, zoom, or tap the separate badge card.';
 let down;cv.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});cv.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=cv.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),c);
  const q=ray.intersectObject(g,true).find(q=>picks[q.object.name]);if(q)act(picks[q.object.name].action);
 });
 for(const k of Object.keys(views))$(k).onclick=()=>view(k);
 }catch(e){$('viewstatus').textContent='3D unavailable; the fixed toy diagrams still work.'}}
refresh();init();
