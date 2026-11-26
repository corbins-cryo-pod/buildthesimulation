import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv} from './solver.mjs';
const $=q=>document.querySelector(q),form=$('#xps-config'),el=form.elements,canvas=$('#xps-model');let s=initial(),modelUpdate=()=>{};
const fmt=(v,p=5)=>v===null?'—':Math.abs(v)<1e-10?'0':Number(v.toPrecision(p)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))el[k].value=String(v)}
function send(id,v){s=act(s,id,v);if(id==='reset'||id==='axis')sync();refresh()}
function refresh(){
 const r=s.result;
 $('#xps-door').textContent=s.door?'Close intro cover':'Open intro cover';
 $('#xps-transfer').textContent=s.position==='analysis'?'Retract to intro':'Transfer to analysis';
 $('#xps-load').textContent=s.loaded?'Remove carrier':'Place carrier';
 $('#xps-status').textContent=s.error||'Carrier '+(s.loaded?'loaded':'absent')+' · '+(s.position==='analysis'?'analysis position':'intro position')+' · cover '+(s.door?'open.':'sealed.');
 $('#xps-result').textContent=!r?'No spectrum acquired.':r.empty?'No identified components; relative percentages withheld.':'Revision '+r.revision+' · '+(r.calibration.mode==='raw'?'Uncorrected axis':'Au/Cu corrected axis')+' · Au '+fmt(r.windows[0].relativePercent)+'% / Ag '+fmt(r.windows[1].relativePercent)+'% relative signal.';
 const tbody=$('#xps-rows');tbody.replaceChildren();
 for(const w of r?.windows||[]){const tr=document.createElement('tr');for(const x of [w.lineId,fmt(w.centerEv,7),fmt(w.fwhmEv),fmt(w.areaCounts),fmt(w.responseFactor),w.relativePercent===null?'—':fmt(w.relativePercent)+'%',fmt(w.residualRmsPerEv)]){const t=document.createElement('td');t.textContent=x;tr.append(t)}tbody.append(tr)}
 $('#xps-json').disabled=!r;$('#xps-csv').disabled=!r;
 plot(r);modelUpdate();
}
form.addEventListener('input',e=>{const {name:k,value:v}=e.target;if(k)send('set',{[k]:k==='axis'||k==='sampleId'?v:v===''?NaN:Number(v)})});
form.addEventListener('submit',e=>{e.preventDefault();send('run')});
for(const k of ['door','transfer','load','reset'])$('#xps-'+k).onclick=()=>send(k);
for(const k of ['json','csv'])$('#xps-'+k).onclick=()=>{if(!s.result)return;const r=s.result,u=URL.createObjectURL(new Blob([k==='csv'?csv(r):JSON.stringify(r,null,2)+'\n'],{type:k==='csv'?'text/csv':'application/json'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-xps.'+k;a.click();setTimeout(()=>URL.revokeObjectURL(u),1400)};
function plot(r){const p=$('#xps-plots');p.replaceChildren();if(!r)return;
 const S='http://www.w3.org/2000/svg';
 for(const [index,w] of r.windows.entries()){
  const svg=document.createElementNS(S,'svg');svg.setAttribute('viewBox','0 0 535 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',w.lineId+' intensity versus binding energy');p.append(svg);
  const add=(tag,attr,t)=>{const q=document.createElementNS(S,tag);for(const k in attr)q.setAttribute(k,attr[k]);if(t!==undefined)q.textContent=t;svg.append(q)};
  const colors=['#b4893e','#628c9a'],color=colors[index],lo=w.energyEv[0],hi=w.energyEv.at(-1),yMax=Math.max(1,...w.densityPerEv);
  const X=e=>68+(e-lo)/(hi-lo)*435,Y=v=>190-153*v/yMax;
  for(const i of [0,.5,1]){
   const v=i*yMax,e=lo+i*(hi-lo);add('line',{x1:68,y1:Y(v),x2:503,y2:Y(v),stroke:'currentColor',opacity:.22});
   add('text',{x:5,y:Y(v)+4,fill:'currentColor','font-size':12},fmt(v,4));add('text',{x:X(e)-12,y:207,fill:'currentColor','font-size':12},fmt(e,6));
  }
  add('line',{x1:X(w.referenceEv),y1:34,x2:X(w.referenceEv),y2:190,stroke:'currentColor','stroke-dasharray':'4 4',opacity:.6});
  add('path',{d:w.energyEv.map((e,i)=>(i?'L':'M')+X(e)+' '+Y(w.densityPerEv[i])).join(' '),fill:'none',stroke:color,'stroke-width':3});
  add('text',{x:10,y:19,fill:'currentColor','font-size':15},w.lineId+' · counts/eV');
  add('text',{x:360,y:226,fill:'currentColor','font-size':13},r.calibration.mode+' eV');
 }
}
async function display(){
 const note=$('#xps-asset');
 try{
  const rend=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});rend.setPixelRatio(Math.min(devicePixelRatio,1.7));rend.outputColorSpace=THREE.SRGBColorSpace;rend.xr.enabled=true;
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);scene.background=new THREE.Color('#eae7de');
  scene.add(new THREE.HemisphereLight(0xfff8e4,0xa6b7c8,2.55));for(const [p,c,k] of [[[2,4,3],0xffffff,2.3],[[-2,3,-3],0xa2d3ee,1.5]]){const l=new THREE.DirectionalLight(c,k);scene.add(l);l.position.set(...p);}
  const camera=new THREE.PerspectiveCamera(34,1,.008,25),orbit=new OrbitControls(camera,canvas);orbit.minDistance=.22;orbit.maxDistance=7;
  const render=()=>rend.render(scene,camera);orbit.addEventListener('change',render);
  const size=()=>{const {width,height}=canvas.getBoundingClientRect();camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();rend.setSize(width,height,false);render()};new ResizeObserver(()=>{if(!rend.xr.isPresenting)size()}).observe(canvas);
  const views={bench:[[2,2.22,4.58],[-.326,.94,.19]],front:[[-.27,.94,4.5],[-.27,.94,.15]],side:[[3.3,1.88,1.25],[.20,.94,.12]],rear:[[1.01,1.86,-4.52],[-.25,.94,0]],work:[[.652,1.151,1.67],[.652,1.151,.60]]};
  let selected='bench';const view=n=>{selected=n;camera.position.set(...views[n][0]);orbit.target.set(...views[n][1]);orbit.update();render()};
  $('#xps-views').addEventListener('click',e=>{if(e.target.dataset.view&&!rend.xr.isPresenting)view(e.target.dataset.view)});size();view(selected);
  const m=(await new GLTFLoader().loadAsync('/equipment/05-09/versaprobe-ii.glb')).scene;world.add(m);
  const n=k=>m.getObjectByName(k),door=n('intro_cover'),arm=n('transfer_arm'),puck=n('sample_puck'),host=n('host_panel'),ax=arm.position.x,px=puck.position.x;
  const cv=document.createElement('canvas');cv.width=640;cv.height=360;const ctx=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.483,.249),new THREE.MeshBasicMaterial({map:tex}));screen.position.set(-1.444,1.322,.219);screen.name='live_host_screen';screen.userData.action='run';world.add(screen);
  const ghost=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.004,24),new THREE.MeshStandardMaterial({color:0x83b3c7,transparent:true,opacity:.5}));ghost.position.set(.66,1.12,.55);world.add(ghost);ghost.userData.action='load';ghost.name='place_carrier_target';
  modelUpdate=()=>{
   const dx=s.position==='analysis'?-.23:0;
   door.rotation.y=s.door?1.36:0;arm.position.x=ax+dx;puck.position.x=px+dx;
   puck.visible=s.loaded&&s.position==='intro'&&s.door;ghost.visible=!s.loaded&&s.position==='intro'&&s.door;
   ctx.fillStyle='#112632';ctx.fillRect(0,0,640,360);ctx.fillStyle='#bce5e7';ctx.font='bold 28px sans-serif';ctx.fillText('PHI 5000  /  VIRTUAL HOST',22,41);
   ctx.font='22px sans-serif';ctx.fillText(s.door?'INTRO COVER OPEN':s.position.toUpperCase()+' POSITION',22,83);
   if(s.result){for(const [i,w] of s.result.windows.entries()){let ymax=Math.max(1,...w.densityPerEv);ctx.strokeStyle=['#f5cb78','#92dbe6'][i];ctx.beginPath();for(let j=0;j<w.energyEv.length;j++){const x=22+i*313+j*1.17,y=235-119*w.densityPerEv[j]/ymax;j?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.fillStyle='#fff1da';ctx.fillText(w.lineId+' '+fmt(w.centerEv,7)+' eV',22+i*313,268);}}
   else{ctx.fillStyle='#fff1da';ctx.fillText(s.error||'Select screen to acquire',22,148,580);}
   ctx.fillStyle='#bce5e7';ctx.fillText('SIMULATED  /  ACQUIRE AND FIT',22,331);tex.needsUpdate=true;render();
  };
  let press;const p=new THREE.Vector2(),ray=new THREE.Raycaster();
  const hit=()=>{for(const h of ray.intersectObject(world,true)){let a,o=h.object,visible=true;do{a??=o.userData.action;visible&&=o.visible;o=o.parent}while(o&&o!==scene);if(!visible)continue;if(a)send(a);break;}};
  canvas.addEventListener('pointerdown',e=>press=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4)return;const b=canvas.getBoundingClientRect();p.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(p,camera);hit()});
  note.textContent='3D asset loaded · metre scale, compatible pointer and controller actions.';modelUpdate();
  const x=$('#xps-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(rend.xr.isPresenting){await rend.xr.getSession().end();return}
   try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});rend.xr.setReferenceSpaceType('local-floor');world.position.set(-.36,0,-1.43);orbit.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();await rend.xr.setSession(session);x.textContent='Exit VR';rend.setAnimationLoop(render);session.addEventListener('end',()=>{rend.setAnimationLoop(null);world.position.set(0,0,0);orbit.enabled=true;size();view(selected);x.textContent='Enter VR'});}
   catch(e){world.position.set(0,0,0);orbit.enabled=true;view(selected);note.textContent='Immersive session unavailable: '+e.message;}}
   for(let i=0;i<2;i++){const c=rend.xr.getController(i);scene.add(c);c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.8)]),new THREE.LineBasicMaterial({color:0xf3c98c})));c.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(c.matrixWorld);hit()});}
  }
 }catch(e){note.textContent='3D unavailable: '+e.message+'. Fit and exports still work.'}
}
sync();refresh();display();
