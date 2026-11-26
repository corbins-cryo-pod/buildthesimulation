import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,panel,exportDrawing,targets} from '../../../../public/equipment/06-07/panel.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const signed=x=>x===0?'0':(x>0?'+':'−')+Math.abs(x);
function chart(canvas,s){
 const g=canvas.getContext('2d'),{width:w,height:h}=canvas, k=Math.min((w-58)/150,(h-55)/90), ox=(w-150*k)/2, y=h*.55, x=v=>ox+k*v;
 g.fillStyle='#243e43';g.fillRect(0,0,w,h);
 g.strokeStyle='#cbe1cd60';g.lineWidth=1.4;g.beginPath();g.moveTo(x(0),y);g.lineTo(x(150),y);g.stroke();
 for(let i=0;i<=150;i+=15){g.beginPath();g.moveTo(x(i),y-5);g.lineTo(x(i),y+5);g.stroke();}
 g.strokeStyle='#8dbaab';g.setLineDash([6,4]);g.beginPath();g.moveTo(x(75),h*.18);g.lineTo(x(75),h*.84);g.stroke();g.setLineDash([]);
 g.fillStyle='#dfeadc';g.font='13px system-ui';g.textAlign='center';g.fillText('0',x(0),y+43);g.fillText(panel.datumXMm+' datum',x(75),y+43);g.fillText('150 mm',x(150)-7,y+43);
 const start=x(s.from.displayXMm),end=x(s.to.displayXMm),d=Math.sign(end-start);
 g.strokeStyle='#f3d390';g.fillStyle='#f3d390';g.lineWidth=2.4;
 g.beginPath();g.moveTo(start,y-28);g.lineTo(end,y-28);g.stroke();
 if(d){g.beginPath();g.moveTo(end,y-28);g.lineTo(end-10*d,y-33);g.lineTo(end-10*d,y-23);g.closePath();g.fill();}
 else{g.beginPath();g.arc(start,y-28,3,0,2*Math.PI);g.fill();}
 for(const m of s.markers){g.fillStyle=s.pair.includes(m.name)?'#f3d390':'#a7c9bd';g.beginPath();g.arc(x(m.displayXMm),y,5,0,2*Math.PI);g.fill();g.fillText(m.name,x(m.displayXMm),y+23);}
 g.fillStyle='#daeadd';g.fillText(s.mirrored?'MIRRORED DRAWING':'ORIGINAL DRAWING',w/2,24);g.textAlign='left';
}
function refresh(s){
 $('pair').value=s.pair;$('mirror').setAttribute('aria-pressed',String(s.mirrored));
 $('status').textContent=s.error??`${s.from.name} → ${s.to.name} · distance ${s.distanceMm} mm · signed ΔX ${signed(s.deltaMm)} mm · midpoint X ${s.midpointXMm} mm.`;
 chart($('draft'),s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
for(const k of ['mirror','reset'])$(k).onclick=()=>act(k);$('pair').onchange=e=>act('pair',e.target.value);
$('json').onclick=()=>{
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(exportDrawing(station.read()),null,2)+'\n'],{type:'application/json'}));
 a.href=url;a.download='mfcs-ez-detached-drawing.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function model(){
 const c=$('ez-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#293f45');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.001,4),o=new OrbitControls(cam,c);o.minDistance=.065;o.maxDistance=2;scene.add(new T.HemisphereLight('#edfaff','#d3baa2',2.7));
 for(const [xyz,i,col]of [[[.5,.7,.6],2.1,'#fff0d5'],[[-.5,.4,-.6],1.35,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/06-07/mfcs-ez-dormant.glb')).scene;scene.add(m);
 const paper=document.createElement('canvas');paper.width=438;paper.height=245;
 const tx=new T.CanvasTexture(paper);tx.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.184,.091),new T.MeshBasicMaterial({map:tx,toneMapped:false}));
 m.getObjectByName('Plot_texture_datum').add(picture);
 const render=()=>r.render(scene,cam);
 sync3D=s=>{chart(paper,s);tx.needsUpdate=true;render();};
 const views={whole:[[.255,.23,.67],[.125,.061,.013]],front:[[.012,.20,.42],[0,.036,.072]],rear:[[-.010,.19,-.43],[0,.034,-.06]],chart:[[.284,.18,.32],[.282,.113,.020]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · inactive MFCS-EZ shell and separate drafting panel.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The drafting panel still works.';});
