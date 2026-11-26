import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,scanRow,file,targets,coupon} from '../../../../public/equipment/13-10/coupon.mjs';
const $=id=>document.getElementById(id),S=createStation();let sync3D=()=>{};
function map(s){
 const c=$('coupon-map'),g=c.getContext('2d');
 g.fillStyle='#345658';g.fillRect(0,0,c.width,c.height);
 const cell=c.width/40,[x0,y0,x1,y1]=coupon.boundsMm.map(x=>x/coupon.pitchMm*cell);
 g.fillStyle='#ae8349';g.fillRect(x0,y0,x1-x0,y1-y0);
 g.strokeStyle='#d9e9da';g.globalAlpha=.24;g.lineWidth=.55;
 for(let i=1;i<40;i++){g.beginPath();g.moveTo(i*cell,0);g.lineTo(i*cell,c.height);g.stroke();}
 for(let i=1;i<24;i++){g.beginPath();g.moveTo(0,i*cell);g.lineTo(c.width,i*cell);g.stroke();}
 g.globalAlpha=1;g.strokeStyle='#fff1b5';g.lineWidth=1.6;
 const y=(s.row+.5)*cell,x=(s.column+.5)*cell;
 g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y);g.stroke();g.fillStyle='#ffefb1';g.beginPath();g.arc(x,y,4,0,2*Math.PI);g.fill();
 g.strokeStyle='#edfbf5';g.beginPath();g.arc(4.5*cell,12.5*cell,5.2,0,2*Math.PI);g.stroke();
}
function refresh(s){
 const d=scanRow(s.row),p=d.points[s.column], y=h=>h===36?37:72;
 $('row').value=s.row;$('column').value=s.column;$('point').textContent=`X ${p.xMm} mm, Y ${d.yMm} mm`;
 let trace='M42 '+y(d.points[0].heightNm);
 for(let i=0;i<40;i++){if(i&&d.points[i].heightNm!==d.points[i-1].heightNm)trace+='V'+y(d.points[i].heightNm);trace+='H'+(42+(i+1)*9.2);}
 $('trace').setAttribute('d',trace);$('sample-mark').setAttribute('cx',42+(s.column+.5)*9.2);$('sample-mark').setAttribute('cy',y(p.heightNm));
 $('status').textContent=s.error??(s.measurement?`Height difference: ${s.measurement.stepNm} nm at the selected point. Reference height: ${s.measurement.reference.heightNm} nm.`:'Ready. The reference point is on the surrounding flat surface.');
 map(s);sync3D();
}
const act=(k,v)=>refresh(S.dispatch(k,v));
for(const k of ['raised','surround','reset'])$(k).onclick=()=>act(k);
$('measure').onclick=()=>act('read');for(const k of ['row','column'])$(k).oninput=e=>act(k,Number(e.target.value));
$('coupon-map').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();act('row',Math.min(23,Math.max(0,Math.floor(24*(e.clientY-r.top)/r.height))));act('column',Math.min(39,Math.max(0,Math.floor(40*(e.clientX-r.left)/r.width))));};
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(file(S.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='ace600-coupon-inspection.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('ace-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293f45');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.004,9),o=new OrbitControls(cam,c);o.minDistance=.11;o.maxDistance=4;
 scene.add(new T.HemisphereLight('#edfaff','#b5a496',2.7));
 for(const [v,i,color]of [[[1,2.3,1.5],3.4,'#fff0d5'],[[-1,.95,-.55],1.6,'#cbe9ff']]){const light=new T.DirectionalLight(color,i);light.position.set(...v);scene.add(light);}
 const m=(await new GLTFLoader().loadAsync('/equipment/13-10/ace600-closed.glb')).scene;scene.add(m);
 const tx=new T.CanvasTexture($('coupon-map'));tx.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.PlaneGeometry(.214,.103),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Viewer_image_datum').add(face);
 const render=()=>r.render(scene,cam);sync3D=()=>{tx.needsUpdate=true;render();};
 const views={whole:[[.83,.82,1.52],[.16,.294,.015]],front:[[.02,.51,.94],[0,.312,.07]],side:[[-.9,.53,.41],[0,.31,0]],viewer:[[.43,.39,.61],[.39,.10,.07]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){let node=object;while(node){const action=targets[node.name.replace(/_stripe$/,'')];if(action){act(action);return;}node=node.parent;}}
 };
 set('whole');sync3D();c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · closed cabinet and separate geometric viewer.';
}
refresh(S.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The coupon viewer still works.';});
