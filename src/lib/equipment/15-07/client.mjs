import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportRuler,targets,graphic} from '../../../../public/equipment/15-07/ruler.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const signed=n=>(n===0?'':n>0?'+':'−')+Math.abs(n).toFixed(3);
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas, mx=50,my=54, k=Math.min((w-117)/graphic.columns,(h-100)/graphic.rows), pw=k*graphic.columns,ph=k*graphic.rows;
 const x=i=>mx+i*k,y=i=>my+(i+.5)*k, m=s.measurement, rx=mx+pw+18;
 const line=(x0,y0,x1,y1,col,d=1)=>{g.beginPath();g.strokeStyle=col;g.lineWidth=d;g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();};
 g.fillStyle='#283e43';g.fillRect(0,0,w,h);g.fillStyle='#1e3239';g.fillRect(mx,my,pw,ph);
 for(let i=0;i<=graphic.columns;i+=8)line(x(i),my,x(i),my+ph,'#9dc4b335',.8);
 for(let j=0;j<graphic.rows;j+=8){line(mx,y(j),mx+pw,y(j),'#9dc4b335',.8);g.fillStyle='#c0d9cb';g.font='11px system-ui';g.fillText((j*graphic.rowPitchMm).toFixed(0)+' mm',12,y(j)+4);}
 line(x(14),y(graphic.marks.A),x(77),y(graphic.marks.A),'#f6d498',2.6);
 line(x(19),y(graphic.marks.B),x(82),y(graphic.marks.B),'#8ac9c6',2.6);
 g.fillStyle='#ffdda6';g.font='14px system-ui';g.fillText('A · row 16',x(17),y(graphic.marks.A)-10);
 g.fillStyle='#b6e1d9';g.fillText('B · row 52',x(22),y(graphic.marks.B)-10);
 yRuler(y(m.firstRow),y(m.secondRow));
 function yRuler(first,second){
  line(rx,first,rx,second,'#ece8d3',2);line(rx-7,first,rx+7,first,'#ece8d3',2);line(rx-7,second,rx+7,second,'#ece8d3',2);
  if(first!==second){const d=Math.sign(second-first);line(rx-4,second-d*8,rx,second,'#ece8d3',2);line(rx+4,second-d*8,rx,second,'#ece8d3',2);}
 }
 g.fillStyle='#dbe7da';g.font='15px system-ui';g.textAlign='center';g.fillText('STATIC DRAWN REFERENCE · NOT AN ACQUIRED IMAGE',w/2,27);
 g.fillText('Rule: 0.125 mm per row · '+m.separationMm.toFixed(3)+' mm',w/2,h-18);g.textAlign='left';
}
function refresh(s){
 const m=s.measurement;$('pair').value=s.pair;$('reverse').setAttribute('aria-pressed',String(s.reversed));
 $('status').textContent=s.error??`${s.from} → ${s.to} · ${Math.abs(m.deltaRows)} rows · ${m.separationMm.toFixed(3)} mm separation · signed ${signed(m.signedMm)} mm.`;
 chart($('static-ruler'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['reverse','reset'])$(k).onclick=()=>act(k);$('pair').onchange=e=>act('pair',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportRuler(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=u;a.download='vevo3100-detached-ruler.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function model(){
 const c=$('vevo-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#34494b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.002,9),o=new OrbitControls(cam,c);o.minDistance=.10;o.maxDistance=6;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[1.2,2.4,2.6],2.9,'#fff0d5'],[[-1.7,1.8,-2.2],2.3,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/15-07/vevo3100-console.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=468;paper.height=420;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.476,.42718),new T.MeshBasicMaterial({map:tx,toneMapped:false}));m.getObjectByName('Invariant_graphic_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[1.39,1.73,3.24],[.34,.78,.034]],front:[[-.45,1.16,2.43],[0,.82,.04]],rear:[[.76,1.33,-2.6],[0,.78,0]],chart:[[.77,1.28,1.23],[.76,.997,.183]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · Vevo 3100 cart and separate ruler display.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The detached ruler still works.';});
