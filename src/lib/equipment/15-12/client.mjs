import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,clip,exportRecord,csvRecord,targets,source,indexToTimeMs} from '../../../../public/equipment/15-12/offline.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas, x=i=>50+(w-77)*i/(source.sampleCount-1),y=v=>h-44-(h-93)*v/10;
 const c=clip(s.clipId), evt=s.result?.clips.find(q=>q.id===c.id),line=(a,b,d,e,color)=>{g.strokeStyle=color;g.beginPath();g.moveTo(a,b);g.lineTo(d,e);g.stroke();};
 g.fillStyle='#294149';g.fillRect(0,0,w,h);g.fillStyle='#64847936';g.fillRect(x(source.window[0]),y(10),x(source.window[1])-x(source.window[0]),y(0)-y(10));
 g.font='12px system-ui';g.fillStyle='#cee6dc';g.lineWidth=.8;
 for(let j=0;j<=10;j+=2){line(x(0),y(j),x(127),y(j),'#b6cfc333');g.fillText(j,27,y(j)+4);}
 for(let i=0;i<=120;i+=20){line(x(i),y(0),x(i),y(10),'#b6cfc333');g.fillText(indexToTimeMs(i).toFixed(1),x(i)-7,y(0)+19);}
 g.fillText('Voltage (mV)',12,23);g.fillText('Offset from source index 32 (ms)',w-224,h-7);
 g.setLineDash([4,4]);line(x(0),y(s.thresholdMv),x(127),y(s.thresholdMv),'#e8c989');g.setLineDash([]);
 g.beginPath();g.strokeStyle='#b4ddd3';g.lineWidth=1.6;
 c.dataMv.forEach((v,i)=>i?g.lineTo(x(i),y(v)):g.moveTo(x(i),y(v)));g.stroke();
 if(evt?.qualifies){g.fillStyle='#edc782';g.beginPath();g.arc(x(evt.peakIndex),y(evt.windowMaxMv),4.5,0,2*Math.PI);g.fill();}
 g.fillStyle='#e6efe2';g.fillText('Fixed clip '+c.id+' · shaded offline window',w/2-104,43);
}
function refresh(s){
 $('threshold').value=s.thresholdMv;$('clip').value=s.clipId;
 const r=s.result, f=r?.first;
 $('status').textContent=s.error??(r?(f?'First qualifying record '+f.id+' · sample '+f.peakIndex+' · '+f.peakOffsetMs.toFixed(2)+' ms after source index.':'No record qualifies at '+r.thresholdMv+' mV in the offline window.'):'Ready: four authored records, '+s.thresholdMv+' mV offline criterion, samples 62–102 only.');
 $('json').disabled=!r;$('csv').disabled=!r;
 const tbody=$('summary').tBodies[0];tbody.replaceChildren();
 if(r){for(const q of r.clips){const row=tbody.insertRow();for(const cell of [q.id,q.windowMaxMv+' mV',q.qualifies?'Yes':'No',q.peakOffsetMs===null?'Not assigned':q.peakOffsetMs.toFixed(2)+' ms'])row.insertCell().textContent=cell;}}
 else{const cell=tbody.insertRow().insertCell();cell.colSpan=4;cell.textContent='Analyze the fixed file to compare records.';}
 chart($('curve'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['analyze','reset'])$(k).onclick=()=>act(k);$('threshold').onchange=e=>act('threshold',Number(e.target.value));$('clip').onchange=e=>act('clip',e.target.value);
function dl(n,string,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([string],{type}));a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>dl('tdt-offline-result.json',JSON.stringify(exportRecord(station.read()),null,2)+'\n','application/json');
$('csv').onclick=()=>dl('tdt-offline-source.csv',csvRecord(station.read()),'text/csv');
async function model(){
 const c=$('rz-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,6),o=new OrbitControls(cam,c);o.minDistance=.045;o.maxDistance=3.4;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[.6,.82,.82],2.9,'#fff0d5'],[[-.6,.66,-.76],2.3,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/15-12/rz6-ra4pa-exteriors.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=486;paper.height=276;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.382,.21694),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Offline_graph_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[.53,.52,1.20],[.09,.152,-.12]],front:[[-.085,.29,.72],[0,.076,.097]],medusa:[[.409,.233,.31],[.363,.022,.03]],chart:[[.015,.40,.31],[.013,.287,-.295]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · fixed electronics cases and separate offline viewer.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The offline analysis still works.';});
