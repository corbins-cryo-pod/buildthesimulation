import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,exportChart,targets} from '../../../../public/equipment/04-05/footprint.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const signed=x=>(x>=0?'+':'−')+Math.abs(x);
function drawing(canvas,s,physical=false){
 const g=canvas.getContext('2d'), {width:w,height:h}=canvas, cx=w/2, cy=h/2+(physical?-13:0), k=physical?1/3:.32;
 g.fillStyle='#253e42';g.fillRect(0,0,w,h);
 g.strokeStyle='#ffffff29';g.lineWidth=.5;
 for(let x=cx%16;x<w;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
 for(let y=cy%16;y<h;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
 const rect=(m)=>[cx-m[0]*k/2,cy-m[1]*k/2,m[0]*k,m[1]*k];
 g.strokeStyle='#bed4bf';g.lineWidth=2;g.setLineDash([6,4]);g.strokeRect(...rect(s.frameMm));g.setLineDash([]);
 if(!physical){g.fillStyle=s.contained?'#9ac6b34d':'#e798614d';g.strokeStyle=s.contained?'#a8d2bd':'#ffad74';g.lineWidth=2.4;g.fillRect(...rect(s.footprintMm));g.strokeRect(...rect(s.footprintMm));}
 g.font=physical?'12px system-ui':'14px system-ui';g.fillStyle='#e4eee0';
 g.fillText(physical?'LAYOUT ONLY':'Paper chart '+s.frameMm.join(' × ')+' mm',12,23);
 g.fillText(physical?s.orientationDeg+'° · '+(s.contained?'CONTAINED':'OVERHANG'):'Cabinet projection '+s.footprintMm.join(' × ')+' mm',12,h-13);
}
function refresh(s){
 $('frame').value=s.frame;const[x,y]=s.signedSideMarginsMm;
 $('status').textContent=s.error??s.orientationDeg+'° · '+(s.contained?'Fits drawn rectangle.':'Overhangs drawn rectangle.')+' Side margins: X '+signed(x)+' mm, Y '+signed(y)+' mm.';
 drawing($('chart'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
$('rotate').onclick=()=>act('rotate');$('reset').onclick=()=>act('reset');$('frame').onchange=e=>act('setFrame',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(exportChart(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=url;a.download='diener-nano-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function model(){
 const c=$('nano-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293f45');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.003,9),o=new OrbitControls(cam,c);o.minDistance=.13;o.maxDistance=5;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[1.4,2.6,1.5],3.1,'#fff0d5'],[[-1,1,-.9],1.65,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/04-05/diener-nano.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=378;paper.height=349;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.378,.349),new T.MeshBasicMaterial({map:tx,toneMapped:false}));picture.rotation.x=-Math.PI/2;
 m.getObjectByName('Chart_texture_datum').add(picture);const pivot=m.getObjectByName('Documentary_footprint_pivot');
 const render=()=>r.render(scene,cam);
 sync3D=s=>{pivot.rotation.y=-s.orientationDeg*Math.PI/180;drawing(paper,s,true);tx.needsUpdate=true;render();};
 const views={whole:[[1.1,1.04,1.66],[.236,.351,.035]],front:[[0,.499,1.46],[0,.396,.245]],side:[[-1.23,.52,.66],[0,.389,0]],chart:[[.64,.70,.59],[.58,.19,.04]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · dormant shell and separate paper geometry.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The paper chart still works.';});
