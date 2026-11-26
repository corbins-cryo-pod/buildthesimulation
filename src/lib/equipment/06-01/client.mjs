import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,drawing,exportReading,targets} from '../../../../public/equipment/06-01/ruler.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const signed=x=>x===0?'0':(x>0?'+':'−')+Math.abs(x);
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas,m=s.measurement;
 const k=Math.min((w-76)/80,(h-49)/60),ox=(w-80*k)/2,oy=h-30,x=v=>ox+k*v,y=v=>oy-k*v;
 g.fillStyle='#253e42';g.fillRect(0,0,w,h);g.strokeStyle='#c7ddcb40';g.lineWidth=1;
 for(let i=0;i<=80;i+=5){g.beginPath();g.moveTo(x(i),y(0));g.lineTo(x(i),y(60));g.stroke();}
 for(let i=0;i<=60;i+=5){g.beginPath();g.moveTo(x(0),y(i));g.lineTo(x(80),y(i));g.stroke();}
 g.fillStyle='#dcebdd';g.font='13px system-ui';g.fillText('0',x(0)-6,y(0)+19);g.fillText('X (µm)',x(80)-38,y(0)+19);g.fillText('Y',x(0)-21,y(60)+5);
 const start=[x(m.fromUm[0]),y(m.fromUm[1])],end=[x(m.toUm[0]),y(m.toUm[1])];
 const a=Math.atan2(end[1]-start[1],end[0]-start[0]);
 g.beginPath();g.moveTo(...start);g.lineTo(...end);g.strokeStyle='#f3d38f';g.lineWidth=2.2;g.stroke();
 if(m.distanceUm){g.beginPath();g.moveTo(...end);g.lineTo(end[0]-13*Math.cos(a-.37),end[1]-13*Math.sin(a-.37));g.lineTo(end[0]-13*Math.cos(a+.37),end[1]-13*Math.sin(a+.37));g.closePath();g.fillStyle='#f3d38f';g.fill();}
 for(const [id,p] of Object.entries(drawing.marks)){const xx=x(p[0]),yy=y(p[1]);g.beginPath();g.arc(xx,yy,3.8,0,2*Math.PI);g.fillStyle=id===m.to?'#efcb96':'#c8dfd0';g.fill();g.fillText(id,xx+7,yy-7);}
}
function refresh(s){
 $('pair').value=s.pair;const m=s.measurement;
 $('status').textContent=s.error??`${m.from} → ${m.to}: ${m.distanceUm} µm. ΔX ${signed(m.deltaUm[0])} µm, ΔY ${signed(m.deltaUm[1])} µm.`;
 chart($('ruler'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['reverse','reset'])$(k).onclick=()=>act(k);$('pair').onchange=e=>act('pair',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(exportReading(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=url;a.download='gt2-drawing-ruler.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function model(){
 const c=$('gt2-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293f45');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.003,12),o=new OrbitControls(cam,c);o.minDistance=.09;o.maxDistance=7;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[2,3,3],3.25,'#fff0d5'],[[-2,1.3,-1.4],1.8,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/06-01/gt2-documentary.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=426;paper.height=286;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.420,.281),new T.MeshBasicMaterial({map:tx,toneMapped:false}));
 m.getObjectByName('Illustration_screen_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[2.47,1.68,3.3],[.31,.72,.035]],front:[[-.37,1.11,2.67],[0,.72,.15]],side:[[-2.1,1.2,.75],[0,.76,0]],chart:[[1.01,.913,1.13],[.93,.72,.26]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · closed GT2 exterior and separate ruler plaque.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The ruler still works.';});
