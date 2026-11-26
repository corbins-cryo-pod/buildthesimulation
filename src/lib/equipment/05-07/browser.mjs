import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {state,act,fixture,toWorld,toLocal,pick,csv,waveform,METRIC} from '../../../../public/equipment/05-07/station.mjs';
const p='/equipment/05-07/', $=id=>document.getElementById('ps-'+id),s=state();
let visual=()=>{}, version=0, selected=0, msg='';
const f=(x,d=6)=>Number(x).toPrecision(d);
function status(x,e=false){msg=x;$('status').textContent=x;$('status').classList.toggle('error',e)}
const microscope=$('scope'),width=microscope.width,height=microscope.height;
const zoom=240000; // nominal 3.17 mm horizontal reticle, independent of screen pixels
const scopePoint=(x,y)=>[width/2+x*zoom,height/2-y*zoom];
function microscopeDraw(){
 const g=microscope.getContext('2d');g.fillStyle='#142a34';g.fillRect(0,0,width,height);
 const [zeroX,zeroY]=scopePoint(0,0);g.strokeStyle='#688086';g.lineWidth=1;
 g.beginPath();g.moveTo(zeroX-380,zeroY);g.lineTo(zeroX+380,zeroY);g.moveTo(zeroX,zeroY-210);g.lineTo(zeroX,zeroY+210);g.stroke();
 g.font='17px sans-serif';g.fillStyle='#eae3c9';g.fillText('CONTACT ALIGNMENT  /  STATION FRAME',15,27);
 if(s.drawerOpen){g.fillText('Chuck in load position. Insert drawer for alignment.',20,62);return}
 for(const p of s.coupon?.pads??[]){
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>{const o=toWorld({xM:p.xM+i*p.widthM/2,yM:p.yM+j*p.heightM/2},s.stage);return scopePoint(o.xM,o.yM)});
  g.fillStyle='#bb9054';g.beginPath();for(const [i,c] of corners.entries()){if(i===0)g.moveTo(...c);else g.lineTo(...c)}g.closePath();g.fill();
  const center=toWorld(p,s.stage),a=scopePoint(center.xM,center.yM);g.fillStyle='#eae3c9';g.fillText(p.id,a[0]-22,a[1]-24);
 }
 s.tips.forEach((t,i)=>{const a=scopePoint(t.xM,t.yM),info=pick(t,s),clr=i===0?'#f7a651':'#78daef';g.strokeStyle=clr;g.lineWidth=i===selected?3:1.2;g.beginPath();g.arc(...a,8,0,Math.PI*2);g.moveTo(a[0]-30,a[1]+27);g.lineTo(...a);g.stroke();g.fillStyle=clr;g.fillText(t.id+' · '+info.status,a[0]-38,a[1]+58)});
 const step=100e-6*zoom;g.fillStyle='#d3d3bd';g.fillRect(28,height-28,step,3);g.fillText('100 µm',28+step+8,height-20);
}
function graph(){
 const c=$('iv'),g=c.getContext('2d'),r=s.result,w=c.width,h=c.height;
 g.fillStyle='#142a34';g.fillRect(0,0,w,h);g.fillStyle='#e7e4d3';g.font='16px sans-serif';
 if(!r){g.fillText('Run a sweep to see voltage and current.',18,28);return}
 const left=72,top=28,W=w-112,H=h-82;
 const v=Math.max(.001,...r.rows.map(p=>Math.abs(p.requestedV))),i=Math.max(1e-6,...r.rows.map(p=>Math.abs(p.currentA)));
 const X=x=>left+(x/v+1)/2*W,Y=y=>top+(1-y/i)/2*H;
 g.strokeStyle='#617479';g.beginPath();g.moveTo(left,Y(0));g.lineTo(left+W,Y(0));g.moveTo(X(0),top);g.lineTo(X(0),top+H);g.stroke();
 g.fillText(f(i*1e3,3)+' mA',3,top+9);g.fillText('−'+f(i*1e3,3),4,top+H);g.fillText('−'+f(v,3)+' V',left-13,h-16);g.fillText('Terminal V',w/2-22,h-16);g.fillText('+'+f(v,3),left+W-20,h-16);
 g.strokeStyle='#70daca';g.lineWidth=2;g.beginPath();r.rows.forEach((a,j)=>{if(j)g.lineTo(X(a.terminalV),Y(a.currentA));else g.moveTo(X(a.terminalV),Y(a.currentA))});g.stroke();
 for(const a of r.rows){g.fillStyle=a.compliance?'#f9aa52':'#88ebd7';g.beginPath();g.arc(X(a.terminalV),Y(a.currentA),3,0,2*Math.PI);g.fill()}
}
function sync(refresh=true){
 $('shield').textContent=s.shieldOpen?'Close shield':'Open shield';$('drawer').textContent=s.drawerOpen?'Insert drawer':'Extend drawer';$('link').textContent=s.connected?'SMU connected':'SMU disconnected';
 s.tips.forEach((t,i)=>{$(i?'land-lo':'land-hi').textContent=(t.gapM<=METRIC.contactGapM?'Raise ':'Land ')+t.id});
 if(refresh){
  $('x').value=f(s.stage.xM*1e3,8);$('y').value=f(s.stage.yM*1e3,8);$('theta').value=f(s.stage.thetaRad*180/Math.PI,8);
  const t=s.tips[selected];$('tipx').value=f(t.xM*1e6,8);$('tipy').value=f(t.yM*1e6,8);$('gap').value=f(t.gapM*1e6,8);$('ohm').value=s.contactOhm;
 }
 const r=s.result,a=r?.rows.at(-1);$('json').disabled=$('csv').disabled=$('wave').disabled=!r;
 $('results').textContent=r?[
  r.topology.toUpperCase().replaceAll('-',' '),r.contacts.map(x=>x.tipId+' → '+(x.padId??x.status)).join(' · '),
  r.terminalOhm===null?'Terminal resistance: unresolved (open)':'Terminal '+f(r.terminalOhm)+' Ω · DUT '+f(r.dutOhm)+' Ω',
  f(a.requestedV,5)+' V requested → '+f(a.terminalV,5)+' V / '+f(a.currentA*1e3,5)+' mA',
  r.rows.filter(x=>x.compliance).length+' compliance point(s) · '+r.sampleId+' • rev '+r.revision
 ].join('\n'):'No current sweep.';
 microscopeDraw();graph();visual();
}
function command(a,arg){
 try{act(s,a,arg);status(s.result?'Sweep complete: '+s.result.topology+'.':a==='smu'?'SourceMeter request loaded. Acquire to measure this fixture.':'Fixture updated.')}catch(e){status(e.message,true)}
 sync(a!=='contactOhm');
}
function toggleTip(index){const t=s.tips[index];command('tip',{...t,index,gapM:t.gapM>METRIC.contactGapM?0:METRIC.raisedTipM})}
function demo(){
 try{
  for(let i=0;i<2;i++)if(!s.drawerOpen)act(s,'tip',{index:i,...s.tips[i],gapM:METRIC.raisedTipM});
  if(!s.drawerOpen){if(!s.shieldOpen)act(s,'shield');act(s,'drawer')}
  act(s,'load',fixture());act(s,'drawer');act(s,'shield');if(!s.connected)act(s,'connect');act(s,'contactOhm',0);
  s.tips.forEach((t,i)=>act(s,'tip',{index:i,xM:i?.0005:-.0005,yM:0,gapM:0}));act(s,'run');status('1 kΩ reference acquired. Raise HI or LO, then measure again.');
 }catch(e){status(e.message,true)}sync();
}
for(const [id,key] of [['shield','shield'],['drawer','drawer'],['link','connect'],['run','run']])$(id).onclick=()=>command(key);
$('load').onclick=()=>command('load',fixture());$('demo').onclick=demo;$('land-hi').onclick=()=>toggleTip(0);$('land-lo').onclick=()=>toggleTip(1);
$('tip').onchange=e=>{selected=Number(e.target.value);sync()};
$('stage-apply').onclick=()=>command('stage',{xM:$('x').valueAsNumber/1e3,yM:$('y').valueAsNumber/1e3,thetaRad:$('theta').valueAsNumber*Math.PI/180});
$('tip-apply').onclick=()=>command('tip',{index:selected,xM:$('tipx').valueAsNumber/1e6,yM:$('tipy').valueAsNumber/1e6,gapM:$('gap').valueAsNumber/1e6});
$('ohm').oninput=e=>command('contactOhm',e.target.valueAsNumber);
microscope.onclick=e=>{const a=microscope.getBoundingClientRect(),x=(e.clientX-a.left)*width/a.width,y=(e.clientY-a.top)*height/a.height;command('tip',{index:selected,xM:(x-width/2)/zoom,yM:(height/2-y)/zoom,gapM:s.tips[selected].gapM})};
$('import').onchange=async e=>{const v=++version;s.result=null;sync();try{const file=e.target.files[0];if(!file||file.size>250000)throw Error('Choose a JSON file below 250 KB.');const data=JSON.parse(await file.text());if(v===version)command(data.schema==='bts.smu-resistive-sweep.v1'?'smu':'load',data)}catch(e){if(v===version)status(e.message,true)}};
$('blk').onclick=async()=>{const v=++version;try{const r=await fetch(p+'keithley-setup.json');if(!r.ok)throw Error('SourceMeter example unavailable.');const j=await r.json();if(v===version)command('smu',j)}catch(e){status(e.message,true)}};
function save(data,filename,type){const o=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=o;a.download='05-07-'+filename;a.click();setTimeout(()=>URL.revokeObjectURL(o),3000)}
$('json').onclick=()=>s.result&&save(JSON.stringify(s.result,null,2),'contact-sweep.json','application/json');
$('csv').onclick=()=>s.result&&save(csv(s.result),'readings.csv','text/csv');
$('wave').onclick=()=>s.result&&save(JSON.stringify(waveform(s.result),null,2),'settled-volts.json','application/json');
sync();
async function viewer(){
 const host=$('stage'),ren=new T.WebGLRenderer({antialias:true});ren.setPixelRatio(Math.min(devicePixelRatio||1,1.8));ren.setClearColor(0xd5dfdf);ren.xr.enabled=true;ren.xr.setReferenceSpaceType('local-floor');host.append(ren.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.add(new T.HemisphereLight(0xffffff,0x9cb0b7,2.6));const light=new T.DirectionalLight(0xfff5e6,2.6);light.position.set(.6,1.4,1);scene.add(light);
 const cam=new T.PerspectiveCamera(36,1,.001,20),orbit=new OrbitControls(cam,ren.domElement);orbit.minDistance=.006;orbit.maxDistance=5;orbit.maxPolarAngle=Math.PI*.94;
 const [a,m]=await Promise.all([new GLTFLoader().loadAsync(p+'summit-11000b.glb'),fetch(p+'xr-manifest.json').then(r=>r.json())]);root.add(a.scene);const node=n=>a.scene.getObjectByName(n);
 const views={'Overall':[[1.01,.89,1.86],[.055,.395,.045]],'Load bay':[[.84,.59,1.34],[.066,.22,.17]],'Positioners':[[.54,.68,.51],[.052,.326,.032]],'Rear':[[1.25,.77,-1.62],[0,.39,-.023]],'Bench':[[1.27,.98,1.96],[.30,.384,.025]]};
 let mode='Overall',xr=false,gesture=null,lastCoupon=null;
 const cv=document.createElement('canvas');cv.width=820;cv.height=416;const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 const screen=new T.Mesh(new T.PlaneGeometry(.46,.234),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));screen.position.set(.607,.394,-.037);root.add(screen);
 function redraw(){if(!xr)ren.render(scene,cam)}
 function goto(v){mode=v;cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();art()}
 function paint(){const g=cv.getContext('2d');g.fillStyle='#132e37';g.fillRect(0,0,820,416);g.fillStyle='#f1e5c9';g.font='bold 40px sans-serif';g.fillText('SUMMIT 11000B-AP',22,53);g.font='25px sans-serif';g.fillText(s.result?(s.result.topology+'   '+(s.result.terminalOhm??'OPEN')+' Ω'):'HI / LO   •   waiting for a sweep',22,105);g.fillText(msg.slice(0,65),22,158);
  ['1 kΩ demo','HI tip','LO tip','Acquire'].forEach((t,i)=>{g.fillStyle='#3e676d';g.fillRect(7+i*205,289,192,106);g.fillStyle='white';g.fillText(t,22+i*205,351)});tex.needsUpdate=true;}
 const coupon=new T.Group();node('coupon').add(coupon);
 const mat=new T.MeshStandardMaterial({color:0x344563,roughness:.42,metalness:.45}),gold=new T.MeshStandardMaterial({color:0xf0bb63,roughness:.45,metalness:.55});
 function part(size,xyz,m){const a=new T.Mesh(new T.BoxGeometry(...size),m);a.position.set(...xyz);coupon.add(a)}
 function art(){
  node('door_pivot').rotation.y=s.shieldOpen?-1.55:0;node('drawer').position.set(.054,s.drawerOpen?-.018:0,.0215+(s.drawerOpen?METRIC.loadExtensionM:0));
  node('stage_xy').position.set(s.stage.xM,0,-s.stage.yM);node('rotor').rotation.y=s.stage.thetaRad;
  for(const t of s.tips)node('tip_'+t.id).position.set(.054+t.xM,.3054+t.gapM,.0215-t.yM);
  if(s.coupon!==lastCoupon){lastCoupon=s.coupon;for(const m of [...coupon.children]){coupon.remove(m);m.geometry.dispose()}if(s.coupon){
   const [w,h]=s.coupon.sizeM;part([w,.00054,h],[0,.3051,0],mat);
   for(const pad of s.coupon.pads)part([pad.widthM,.00005,pad.heightM],[pad.xM,.305375,-pad.yM],gold);
  }}
  const bench=mode==='Bench'||xr;node('smu').visible=screen.visible=bench;node('smu_lead').visible=bench&&s.connected;paint();redraw();
 }
 const rc=new T.Raycaster();
 function click(ray){root.updateMatrixWorld(true);rc.ray.copy(ray);
  const targets=Object.keys(m.nodes).map(node).filter(x=>x.visible);if(xr)targets.push(screen);
  for(const hit of rc.intersectObjects(targets,true)){
   let t=hit.object;while(t&&t!==screen&&!m.nodes[t.name])t=t.parent;if(!t)continue;
   if(t===screen){if(hit.uv?.y<.31){const k=Math.round(Math.floor(hit.uv.x*4));if(k===0)demo();else if(k===3)command('run');else toggleTip(k-1)}return}
   const act=m.nodes[t.name].action;if(act==='tip0'||act==='tip1')toggleTip(+act.slice(-1));else command(act);return
  }
 }
 const cv3=ren.domElement;cv3.addEventListener('pointerdown',e=>gesture=[e.clientX,e.clientY]);cv3.addEventListener('pointerup',e=>{if(!gesture||Math.hypot(gesture[0]-e.clientX,gesture[1]-e.clientY)>5)return;gesture=null;const b=cv3.getBoundingClientRect();rc.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),cam);click(rc.ray)});
 for(const b of document.querySelectorAll('[data-ps-view]'))b.onclick=()=>goto(b.dataset.psView);
 orbit.addEventListener('change',redraw);new ResizeObserver(()=>{if(host.clientWidth&&host.clientHeight&&!xr){ren.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();redraw()}}).observe(host);
 visual=art;goto(mode);
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const btn=$('xr');btn.hidden=false;btn.onclick=async()=>{try{
   const event=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});xr=true;orbit.enabled=false;root.position.set(-.16,.78,-1.0);await ren.xr.setSession(event);art();ren.setAnimationLoop(()=>ren.render(scene,cam));
   event.addEventListener('end',()=>{ren.setAnimationLoop(null);xr=false;root.position.set(0,0,0);orbit.enabled=true;goto(mode)});
  }catch(e){$('ready').textContent='VR session not available: '+e.message}};
  for(let i=0;i<2;i++){const ctl=ren.xr.getController(i);scene.add(ctl);ctl.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1.4)]),new T.LineBasicMaterial({color:0xffcf68})));ctl.addEventListener('select',()=>click(new T.Ray(new T.Vector3().setFromMatrixPosition(ctl.matrixWorld),new T.Vector3(0,0,-1).transformDirection(ctl.matrixWorld))))}
 }
 $('ready').textContent='3D asset loaded · 1:1 scale · '+m.budget.triangles.toLocaleString()+' triangles.';
}
viewer().catch(e=>{$('ready').textContent='3D unavailable. The microscope alignment and I–V controls still work.';console.warn('Summit viewer: '+e.message)});
