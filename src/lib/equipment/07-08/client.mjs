import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportComparison,targets} from '../../../../public/equipment/07-08/shapes.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const names={octagon:'Regular octagon',square:'Square',disk:'Disk'},fm=x=>x.toFixed(2);
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas,k=Math.min(h,w)*.35/s.radiusMm, cx=w/2,cy=h*.51,rr=s.radiusMm*k,x=v=>cx+v*k,y=v=>cy-v*k;
 g.fillStyle='#273f43';g.fillRect(0,0,w,h);
 g.strokeStyle='#bfd6cd44';g.lineWidth=1;g.beginPath();g.moveTo(cx-rr-16,cy);g.lineTo(cx+rr+16,cy);g.moveTo(cx,cy-rr-15);g.lineTo(cx,cy+rr+15);g.stroke();
 if(s.overlay){g.strokeStyle='#a2c5b4';g.lineWidth=2;g.setLineDash([5,6]);g.beginPath();g.arc(cx,cy,rr,0,Math.PI*2);g.stroke();g.setLineDash([]);}
 g.strokeStyle='#efd18a';g.fillStyle='#e4b96755';g.lineWidth=2.5;g.beginPath();
 if(s.vertices){for(let i=0;i<s.vertices.length;i++){const p=s.vertices[i];if(i)g.lineTo(x(p[0]),y(p[1]));else g.moveTo(x(p[0]),y(p[1]));}g.closePath();}
 else g.arc(cx,cy,rr,0,2*Math.PI);
 g.fill();g.stroke();
 for(const p of s.vertices??[]){g.fillStyle='#f0d998';g.beginPath();g.arc(x(p[0]),y(p[1]),3.2,0,Math.PI*2);g.fill();}
 g.fillStyle='#dceadd';g.font='13px system-ui';g.textAlign='center';g.fillText(names[s.shape]+' · radius 24 mm',cx,28);g.fillText(s.overlay?'Dashed outline: reference disk':'Reference outline hidden',cx,h-12);g.textAlign='left';
}
function refresh(s){
 $('shape').value=s.shape;$('overlay').setAttribute('aria-pressed',String(s.overlay));$('overlay').textContent=(s.overlay?'Hide':'Show')+' reference circle';
 $('status').textContent=s.error??`${names[s.shape]} · area ${fm(s.areaMm2)} mm² · ${fm(s.coveragePct)}% of reference disk · perimeter ${fm(s.perimeterMm)} mm.`;
 chart($('shape-chart'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['overlay','reset'])$(k).onclick=()=>act(k);$('shape').onchange=e=>act('select',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportComparison(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='octo-detached-shape.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('octo-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,4),o=new OrbitControls(cam,c);o.minDistance=.08;o.maxDistance=2.8;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.5));
 for(const [xyz,i,col]of [[[.26,.70,.65],1.9,'#fff0d5'],[[-.42,.37,-.52],1.3,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/07-08/octo-documentary.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=480;paper.height=336;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.196,.139),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Shape_texture_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[.30,.43,.90],[.128,.108,.02]],front:[[-.063,.30,.60],[0,.107,.109]],side:[[-.70,.37,-.21],[0,.107,0]],chart:[[.355,.23,.414],[.347,.148,.045]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · legacy enclosure and separate shape plaque.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The shape comparison still works.';});
