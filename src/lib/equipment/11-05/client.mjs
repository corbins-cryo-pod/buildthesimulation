import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportReading,targets} from '../../../../public/equipment/11-05/units.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const fmt=(n,u)=>String(Number(n.toFixed(u==='dBm'?5:9))).replace(/^-/,'−');
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas,r=s.reading;
 g.fillStyle='#243d43';g.fillRect(0,0,w,h);g.strokeStyle='#9fbbb0';g.lineWidth=1;g.strokeRect(11,11,w-22,h-22);
 g.fillStyle='#c4dad0';g.textAlign='center';g.font='14px system-ui';g.fillText('FIXED NUMERICAL REFERENCE · NOT A SENSOR READING',w/2,32);
 g.fillStyle='#f0d394';g.font=(r.finite?'65':'35')+'px system-ui';
 g.fillText(r.finite?fmt(r.value,r.unit)+' '+r.unit:'No finite dBm value',w/2,h*.50);
 g.fillStyle='#dbeadd';g.font='17px system-ui';g.fillText('Original value: '+fmt(r.inputW,'W')+' W',w/2,h*.69);
 g.font='14px system-ui';g.fillText(r.unit==='dBm'?'Reference: 1 mW · logarithmic scale':'Linear unit conversion',w/2,h*.85);
 g.textAlign='left';
}
function refresh(s){
 $('value').value=s.id;$('unit').value=s.unit;const r=s.reading;
 $('status').textContent=s.error??(r.finite?'Fixed '+fmt(r.inputW*1000,'mW')+' mW = '+fmt(r.value,r.unit)+' '+r.unit+'.':r.reason+' Linear value remains 0 W.');
 chart($('number-card'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
$('reset').onclick=()=>act('reset');for(const k of ['value','unit'])$(k).onchange=e=>act(k,e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportReading(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='pm100d-numerical-reference.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('pm100d-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,4),o=new OrbitControls(cam,c);o.minDistance=.05;o.maxDistance=2;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.4));
 for(const [xyz,i,col]of [[[.4,.67,.55],2.5,'#fff0d5'],[[-.32,.41,-.5],1.9,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/11-05/pm100d-console.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=480;paper.height=272;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.167,.0946333),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Arithmetic_display_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[.20,.228,.57],[.105,.075,.010]],front:[[-.035,.093,.27],[0,.056,0]],rear:[[-.058,.096,-.27],[0,.056,-.012]],side:[[-.245,.123,.024],[-.040,.057,0]],chart:[[.23,.15,.32],[.217,.102,.045]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · console only and a distinct numerical card.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. Numerical conversion still works.';});
