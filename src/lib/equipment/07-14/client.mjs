import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportDrawing,targets} from '../../../../public/equipment/07-14/drawing.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const names={strip:'Strip',rectangle:'Rectangle',square:'Square'},signed=(d,u)=>d===0?'same':(d>0?'+':'−')+Math.abs(d)+' '+u;
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas,k=Math.min((w-82)/100,(h-81)/100), cx=w/2,cy=h*.53;
 const rect=(a,b)=>[cx-a*k/2,cy-b*k/2,a*k,b*k];
 g.fillStyle='#273f43';g.fillRect(0,0,w,h);
 g.strokeStyle='#bfd6cd34';g.lineWidth=.8;
 for(let j=-5;j<=5;j++){g.beginPath();g.moveTo(cx+j*10*k,cy-43*k);g.lineTo(cx+j*10*k,cy+43*k);g.moveTo(cx-50*k,cy+j*8*k);g.lineTo(cx+50*k,cy+j*8*k);g.stroke();}
 const [a,b]=s.displayDimensionsMm,q=rect(a,b);
 g.strokeStyle='#f3d18d';g.fillStyle='#dcaa5f66';g.lineWidth=2.4;g.fillRect(...q);g.strokeRect(...q);
 g.strokeStyle='#b7d4c4';g.lineWidth=2.1;g.setLineDash([6,5]);g.strokeRect(...rect(40,40));g.setLineDash([]);
 g.fillStyle='#dceadd';g.font='13px system-ui';g.textAlign='center';g.fillText(names[s.shape]+' · '+a+' × '+b+' mm · '+s.degrees+'°',cx,25);
 g.fillText('Dashed outline: 40 × 40 mm reference square',cx,h-14);g.textAlign='left';
}
function refresh(s){
 $('shape').value=s.shape;$('rotate').setAttribute('aria-pressed',String(s.degrees===90));
 $('status').textContent=s.error??`${s.displayDimensionsMm.join(' × ')} mm · area ${s.areaMm2} mm² (${signed(s.differenceAreaMm2,'mm²')}) · perimeter ${s.perimeterMm} mm (${signed(s.differencePerimeterMm,'mm')}).`;
 chart($('drawing'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['rotate','reset'])$(k).onclick=()=>act(k);$('shape').onchange=e=>act('select',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportDrawing(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='tsx-detached-drawing.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('tsx-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.002,12),o=new OrbitControls(cam,c);o.minDistance=.10;o.maxDistance=8;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.5));
 for(const [xyz,i,col]of [[[2,3,2.5],1.9,'#fff0d5'],[[-2,2,-3],1.3,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/07-14/tsx60086a-documentary.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=480;paper.height=320;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.507,.338),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Drawing_plane_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[1.91,2.19,4.41],[.37,1,.042]],front:[[-.62,1.45,3.4],[0,.98,.24]],rear:[[.98,1.65,-3.9],[0,1,0]],chart:[[.85,1.21,1.16],[.892,1.018,.194]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · sealed TSX60086A enclosure and separate drawing plaque.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The drawing comparison still works.';});
