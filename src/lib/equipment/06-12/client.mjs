import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStation,fixture,jsonRecord,csvRecord,targets} from '../../../../public/equipment/06-12/spring.mjs';
const $=id=>document.getElementById(id),station=createStation();let sync3D=()=>{};
const fmt=(x,n=3)=>Number(x.toFixed(n)).toString(), fit=x=>x===null?'unavailable':x.toFixed(5)+' mN/µm';
function curves(s){
 const c=$('curve'),g=c.getContext('2d'),X=d=>49+d*2.57,Y=f=>236-f*40;
 g.fillStyle='#243b42';g.fillRect(0,0,c.width,c.height);
 g.font='12px system-ui';g.strokeStyle='#91b6aa55';g.fillStyle='#d6e9e2';g.lineWidth=.8;
 for(let i=0;i<=160;i+=20){g.beginPath();g.moveTo(X(i),Y(0));g.lineTo(X(i),Y(5));g.stroke();g.fillText(i,X(i)-7,252);}
 for(let i=0;i<=5;i++){g.beginPath();g.moveTo(X(0),Y(i));g.lineTo(X(160),Y(i));g.stroke();g.fillText(i,31,Y(i)+4);}
 g.fillText('Travel (µm)',381,268);g.fillText('Force (mN)',10,18);
 g.strokeStyle='#c3d3bb';g.setLineDash([3,4]);g.beginPath();g.moveTo(X(fixture.gapUm),Y(0));g.lineTo(X(fixture.gapUm),Y(5));g.stroke();g.setLineDash([]);
 g.fillText('contact',X(fixture.gapUm)+5,50);
 const q=s.result;
 if(!q){g.fillStyle='#bdcbc6';g.fillText('Run to plot the virtual trace',191,133);return;}
 g.strokeStyle='#f5c778';g.lineWidth=1.3;g.setLineDash([4,4]);g.beginPath();q.rows.forEach((p,i)=>i?g.lineTo(X(p.travelUm),Y(p.idealMn)):g.moveTo(X(p.travelUm),Y(p.idealMn)));g.stroke();g.setLineDash([]);
 for(const p of q.rows){g.beginPath();g.arc(X(p.travelUm),Y(p.displayedMn),2.6,0,Math.PI*2);g.fillStyle='#b0dccf';g.fill();}
 g.fillStyle='#f5c778';g.fillText('— ideal',283,20);g.fillStyle='#b0dccf';g.fillText('• rounded display',347,20);
}
function spring(s){
 const p=s.preview,c=$('spring-schematic'),g=c.getContext('2d'),opening=Math.max(0,fixture.gapUm-p.travelUm);
 const left=72,tip=245+.53*opening-.54*p.springCompressionUm, motor=383-.57*p.travelUm;
 const hook=(start,end,cy,col)=>{g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.moveTo(start,cy);for(let j=1;j<14;j++)g.lineTo(start+(end-start)*j/14,cy+((j%2)?8:-8));g.lineTo(end,cy);g.stroke();};
 g.fillStyle='#243b42';g.fillRect(0,0,c.width,c.height);
 hook(left,245-.54*p.springCompressionUm,79,'#e3b965');hook(tip+7,motor,79,'#9fd2c9');
 g.fillStyle='#d9e4d8';g.fillRect(left-6,53,7,52);g.fillRect(tip,62,6,35);g.fillRect(motor,53,7,52);
 g.font='13px system-ui';g.fillStyle='#edd39a';g.fillText('dry spring',81,33);g.fillStyle='#bbddd1';g.fillText('sensing beam',341,33);
 g.font='12px system-ui';g.fillText('Schematic motion exaggerated',154,132);
}
function refresh(s){
 $('spring').value=s.springK.toString();$('travel').value=s.travelUm;$('motion').textContent=s.travelUm+' µm';
 const p=s.preview;const x=p.overload?'virtual force exceeds display ceiling':p.contact?'load '+fmt(p.displayedMn)+' mN; spring '+fmt(p.springCompressionUm,2)+' µm and beam '+fmt(p.beamDeflectionUm,2)+' µm':'no load';
 $('preview-state').textContent=(s.showPreview?'Preview':'Home')+': virtual approach '+p.travelUm+' µm; '+x+'.';
 $('togglePreview').textContent=s.showPreview?'Show home':'Preview motion';
 const q=s.result;
 $('status').textContent=s.error??(q?'Peak '+fmt(q.peakDisplayedMn)+' mN · apparent slope '+fit(q.fits.effectiveMnPerUm)+' · recovered spring '+fit(q.fits.springMnPerUm)+'.':'Ready: '+s.travelUm+' µm request; 25 µm open gap.');
 $('json').disabled=!q;$('csv').disabled=!q;curves(s);spring(s);sync3D(s);
}
function act(k,v){refresh(station.dispatch(k,v));}
$('run').onclick=()=>act('run');$('reset').onclick=()=>act('reset');$('togglePreview').onclick=()=>act('togglePreview');
$('spring').onchange=e=>act('stiffness',Number(e.target.value));$('travel').oninput=e=>act('travel',Number(e.target.value));
function download(name,s,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([s],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>download('microtester-virtual-spring.json',JSON.stringify(jsonRecord(station.read()),null,2)+'\n','application/json');
$('csv').onclick=()=>download('microtester-virtual-spring.csv',csvRecord(station.read()),'text/csv');
async function model(){
 const c=$('mt-model'),r=new T.WebGLRenderer({canvas:c,antialias:true});r.setClearColor('#32484b');r.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.001,6),o=new OrbitControls(cam,c);o.minDistance=.035;o.maxDistance=3;scene.add(new T.HemisphereLight('#edfaff','#c0afa2',3));
 for(const [xyz,i,col]of [[[.6,.85,.55],3.4,'#fff0d5'],[[-.4,.65,-.52],2.65,'#dbeaff']]){const l=new T.DirectionalLight(col,i);l.position.set(...xyz);scene.add(l);}
 const m=(await new GLTFLoader().loadAsync('/equipment/06-12/microtester-g2.glb')).scene;scene.add(m);
 const motor=m.getObjectByName('Virtual_motor_datum'),probe=m.getObjectByName('Virtual_follower'),strip=m.getObjectByName('Virtual_spring_strip');
 const orig=[motor.position.x,probe.position.x,strip.position.x];
 const render=()=>r.render(scene,cam);
 sync3D=s=>{const p=s.preview;motor.position.x=orig[0]-p.travelUm*1e-6;probe.position.x=orig[1]-(p.travelUm-p.beamDeflectionUm)*1e-6;
 strip.position.x=orig[2]-p.springCompressionUm*.5e-6;strip.scale.x=1-p.springCompressionUm/15000;render();};
 const views={whole:[[-.35,.49,.89],[0,.103,.022]],front:[[-.21,.238,.42],[-.14,.093,.044]],detail:[[.23,.20,.26],[.164,.115,.008]],rear:[[.37,.43,-.83],[0,.10,0]]};
 function set(k){const[a,b]=views[k]??views.whole;cam.position.set(...a);o.target.set(...b);o.update();render();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>set(b.dataset.view));$('camera-reset').onclick=()=>set('whole');o.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},cam);
  for(const {object} of ray.intersectObject(m,true)){const action=targets[object.name];if(action){act(action);return;}}
 };
 set('whole');sync3D(station.read());c.dataset.ready='true';$('asset').textContent='Metric GLB loaded · G2 and invented dry spring fixture.';
}
refresh(station.read());model().catch(e=>{$('asset').textContent='3D unavailable: '+e.message+'. The dry spring example still works.';});
