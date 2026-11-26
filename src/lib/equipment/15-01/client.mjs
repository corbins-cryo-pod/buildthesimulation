import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportIllustration,targets} from '../../../../public/equipment/15-01/triangles.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas,[a,b,c]=s.sides;
 const k=Math.min((w-64)/15,(h-81)/12), left=(w-c*k)/2, y=h*.70;
 g.fillStyle='#273f43';g.fillRect(0,0,w,h);g.strokeStyle='#91b1a840';g.strokeRect(12,12,w-24,h-24);
 g.font='14px system-ui';g.textAlign='center';g.fillStyle='#ccded1';g.fillText('STATIC TRIANGLE ARTWORK · '+s.sides.join(' / '),w/2,29);
 const line=(x0,y0,x1,y1,color,dash=[])=>{g.strokeStyle=color;g.lineWidth=2.3;g.setLineDash(dash);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([]);};
 const mark=(str,x,y)=>{if(s.labels){g.fillStyle='#e8ddaa';g.fillText(str,x,y);}};
 if(s.kind==='closed'){
  const vx=(b*b+c*c-a*a)/(2*c),vy=Math.sqrt(Math.max(0,b*b-vx*vx)),top=[left+vx*k,y-vy*k],right=left+c*k;
  g.fillStyle='#e0b5754d';g.strokeStyle='#f1ca81';g.lineWidth=2.2;g.beginPath();g.moveTo(left,y);g.lineTo(...top);g.lineTo(right,y);g.closePath();g.fill();g.stroke();
  mark(b,(left+top[0])/2-12,(y+top[1])/2-3);mark(a,(right+top[0])/2+14,(y+top[1])/2-3);mark(c,w/2,y+21);
 }else{
  const yy=y-51;line(left,y,left+c*k,y,'#b6cfc1');
  line(left,yy,left+a*k,yy,'#f2cf90');line(left+(c-b)*k,yy,left+c*k,yy,'#f2cf90');
  if(s.kind==='impossible')line(left+a*k,yy,left+(c-b)*k,yy,'#ec9375',[4,3]);
  mark(a,left+a*k/2,yy-13);mark(b,left+(c-b/2)*k,yy-13);mark(c,w/2,y+21);
 }
 g.fillStyle='#d6e7dc';g.fillText(s.kind==='closed'?'Three sides enclose a filled area.':s.kind==='flat'?'Equality: the short sides just meet in a line.':'The short sides leave a '+s.gapLength+'-unit gap.',w/2,h-24);g.textAlign='left';
}
function refresh(s){
 $('shape').value=s.id;$('labels').setAttribute('aria-pressed',String(s.labels));$('labels').textContent=(s.labels?'Hide':'Show')+' length labels';
 $('status').textContent=s.error??(s.kind==='closed'?'Closed triangle · area '+s.area.toFixed(2)+' square units · perimeter '+s.totalSideLength+' units.':s.kind==='flat'?'Collapsed line · area 0.00 square units.':'Cannot close · gap 1 unit · no triangle area.');
 chart($('triangle-card'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['labels','reset'])$(k).onclick=()=>act(k);$('shape').onchange=e=>act('select',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportIllustration(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='kopf940-detached-triangle.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('kopf-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,5),o=new OrbitControls(cam,c);o.minDistance=.05;o.maxDistance=2.8;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[.74,.8,.9],2.6,'#fff0d5'],[[-.61,.55,-.7],1.65,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/15-01/kopf940-outline.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=480;paper.height=320;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.234,.156),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Triangle_card_plane').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[-.26,.54,1.13],[.134,.131,.05]],front:[[-.36,.364,.62],[-.046,.127,.018]],side:[[.67,.365,-.36],[-.043,.112,.0]],chart:[[.415,.25,.50],[.384,.183,.069]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · static outline and separate triangle card.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The triangle artwork still works.';});
