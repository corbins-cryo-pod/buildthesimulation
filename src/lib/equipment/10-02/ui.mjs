import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {act,state,csv,calibration} from '../../../../public/equipment/10-02/adc.mjs';
const base='/equipment/10-02/', $=id=>document.getElementById('dd-'+id);
async function boot(){
 const s=state();let syncView=()=>{},sourceVersion=0;
 function status(text,err=false){$('status').textContent=text;$('status').classList.toggle('error',err)}
 function graph(){
  const r=s.result,canvas=$('plot'),g=canvas.getContext('2d');if(!g)return;
  const w=canvas.width,h=canvas.height;g.fillStyle='#203034';g.fillRect(0,0,w,h);g.lineWidth=1;g.strokeStyle='#52686a';
  const box=[67,20,w-93,h-65];for(let i=0;i<=4;i++){const x=box[0]+box[2]*i/4,y=box[1]+box[3]*i/4;g.beginPath();g.moveTo(x,box[1]);g.lineTo(x,box[1]+box[3]);g.moveTo(box[0],y);g.lineTo(box[0]+box[2],y);g.stroke()}
  g.fillStyle='#ecedde';g.font='16px sans-serif';if(!r){g.fillText('Acquire a record to plot volts against time.',box[0]+10,h/2);$('probe').textContent='No record.';return}
  const c=r.channels[Number($('ch').value)||0],v=c.samples;let hi=-Infinity,lo=Infinity;for(const a of v){hi=Math.max(hi,a);lo=Math.min(lo,a)}let margin=(hi-lo)*.08||.003;hi+=margin;lo-=margin;
  const X=i=>box[0]+i/Math.max(1,v.length-1)*box[2],Y=x=>box[1]+(hi-x)/(hi-lo)*box[3];
  for(let i=0;i<=4;i++){const t=r.t0S+(v.length-1)*r.dtS*i/4;g.fillText(Number(t.toPrecision(4))+' s',X((v.length-1)*i/4)-14,h-14);g.fillText(Number((hi-(hi-lo)*i/4).toPrecision(3))+' V',3,box[1]+i*box[3]/4+5)}
  // Draw bin extrema for long captures so a short transient cannot vanish by decimation.
  g.strokeStyle='#78dac5';g.lineWidth=2;g.beginPath();const stride=Math.max(1,Math.ceil(v.length/box[2]));let pen=false;
  for(let start=0;start<v.length;start+=stride){let L=start,H=start;for(let i=start+1;i<Math.min(start+stride,v.length);i++){if(v[i]<v[L])L=i;if(v[i]>v[H])H=i}for(const i of [Math.min(L,H),Math.max(L,H)]){if(pen)g.lineTo(X(i),Y(v[i]));else g.moveTo(X(i),Y(v[i]));pen=true}}g.stroke();
  g.fillStyle='#f7ac5b';let last=-Infinity;for(let i=0;i<v.length;i++)if(c.overload[i]&&X(i)-last>=2){g.fillRect(X(i)-2,Y(v[i])-3,4,6);last=X(i)}
  const i=Math.min(v.length-1,Number($('i').value));g.strokeStyle='#b5c9ec';g.setLineDash([5,5]);g.beginPath();g.moveTo(X(i),box[1]);g.lineTo(X(i),box[1]+box[3]);g.stroke();g.setLineDash([]);
  $('probe').textContent=c.terminal+' • '+c.id+'  /  n = '+i+'\n'+(r.t0S+i*r.dtS).toPrecision(7)+' s\n'+v[i].toPrecision(8)+' V\nSigned code '+c.codes[i]+'  /  '+(c.overload[i]===0?'within range':c.overload[i]>0?'over high rail':'under low rail');
 }
 function sync(){
  for(const [name,key,n1,n2] of [['power','power','Power on','Power off'],['usb','usb','USB connected','USB disconnected'],['lead','connected','Source connected','Source disconnected']]){
   $(name).textContent=s[key]?n1:n2;$(name).setAttribute('aria-pressed',String(s[key]))
  }
  const r=s.result;$('json').disabled=$('csv').disabled=$('i').disabled=$('ch').disabled=!r;
  $('map').value=String(s.firstInput);$('rate').value=Number.isFinite(s.rateHz)?String(s.rateHz):'';const w=s.input;
  $('input-note').textContent=w?w.sampleId+' · rev '+w.revision+' · '+w.channels.length+' channel(s) · '+w.channels[0].samples.length+' supplied samples per channel at '+Number((1/w.dtS).toPrecision(6))+' Hz.':'No valid waveform loaded.';
  $('ch').replaceChildren();if(r){
   r.channels.forEach((c,i)=>$('ch').add(new Option(c.terminal+' · '+c.id,String(i))));
   $('i').max=String(r.channels[0].codes.length-1);$('i').value='0';
   $('metrics').textContent=r.channels[0].codes.length+' samples/channel · '+r.channels.length+' channel(s) · '+(r.dtS*1000).toPrecision(5)+' ms interval · '+r.channels.reduce((sum,c)=>sum+c.overload.reduce((a,b)=>a+(b!==0),0),0)+' input overload(s) · revision '+r.revision+'.';
  }else{$('i').max='0';$('metrics').textContent='No current record.'}
  graph();syncView()
 }
 function dispatch(a,p){
  try{act(s,a,p);status(a==='run'?'Acquisition complete. Input overloads, if present, are flagged rather than silently rescaled.':'Configuration updated. Acquire a new record.')}catch(e){status(e.message,true)}sync()
 }
 function save(data,name,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}
 $('run').onclick=()=>dispatch('run');$('power').onclick=()=>dispatch('power');$('usb').onclick=()=>dispatch('usb');$('lead').onclick=()=>dispatch('connected');
 $('rate').oninput=e=>dispatch('rate',e.target.valueAsNumber);$('map').onchange=e=>dispatch('map',+e.target.value);$('i').oninput=$('ch').onchange=graph;
 $('json').onclick=()=>{if(s.result)save(JSON.stringify(s.result,null,2),'10-02-acquisition.json','application/json')};$('csv').onclick=()=>{if(s.result)save(csv(s.result),'10-02-samples.csv','text/csv')};
 function clearInput(){s.input=null;s.result=null;sync()}
 $('file').onchange=async e=>{const v=++sourceVersion;clearInput();$('source').value='file';try{const f=e.target.files[0];if(!f||f.size>12000000)throw Error('Choose a JSON waveform below 12 MB.');const w=JSON.parse(await f.text());if(v===sourceVersion)dispatch('source',w)}catch(e){if(v===sourceVersion)status(e.message,true)}};
 $('source').onchange=async e=>{const v=++sourceVersion,src=e.target.value;clearInput();if(src==='file'){status('Choose a voltage waveform JSON file.');return}
  try{const w=src==='ramp'?calibration():await (await fetch(base+'multiclamp-input.json')).json();if(v===sourceVersion)dispatch('source',w)}catch(e){if(v===sourceVersion)status('Source unavailable: '+e.message,true)}};
 dispatch('run'); // initial example is already complete; control changes invalidate its result.
 try{await viewer(s,dispatch,fn=>{syncView=fn;syncView()})}catch(e){$('view-status').textContent='3D unavailable here. All acquisition controls and exports still work.';console.warn('Digidata viewer: '+e.message)}
}
async function viewer(s,dispatch,setSync){
 const host=$('stage'),renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.setClearColor(0xdce0dd);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');host.append(renderer.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.add(new T.HemisphereLight(0xffffff,0xbacbd2,2.3));const key=new T.DirectionalLight(0xfffcf2,2.5);key.position.set(.3,1.1,.7);scene.add(key);
 const camera=new T.PerspectiveCamera(34,1,.005,15),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.075;controls.maxDistance=1.8;controls.maxPolarAngle=Math.PI*.94;
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(base+'digidata-1550b.glb'),fetch(base+'xr-manifest.json').then(r=>r.json())]);root.add(g.scene);
 const node=n=>g.scene.getObjectByName(n),C=controls.target;let view='Overall',immersive=false,screen=null;
 function render(){if(!immersive)renderer.render(scene,camera)}
 const cam={
  Overall:[[.31,.28,.69],[0,.055,.02]],Front:[[0,.064,.967],[0,.064,.15]],Inputs:[[.169,.114,.436],[.143,.066,.15]],Rear:[[0,.09,-.95],[0,.061,-.15]],Station:[[.52,.40,.91],[.135,.072,-.015]]
 };
 function goto(v){view=v;camera.position.set(...cam[v][0]);C.set(...cam[v][1]);controls.update();sync()}
 const hp=Object.entries(m.interactionNodes).map(([k,o])=>({k,act:o,box:new T.Box3(new T.Vector3(...o.boundsM.min),new T.Vector3(...o.boundsM.max))}));
 const rx=new T.Raycaster(),tmp=new T.Vector3(),mat=new T.Matrix4(),localRay=new T.Ray();
 function pick(ray){root.updateMatrixWorld(true);mat.copy(root.matrixWorld).invert();localRay.copy(ray).applyMatrix4(mat);let best=Infinity,target=null;
  for(const h of hp){if((h.k==='signal_patch'&&!s.connected))continue;
   const b=h.box.clone();if(h.k==='signal_patch')b.translate(node('signal_patch').position);b.expandByScalar(h.k.startsWith('AI')?.002:.001);if(!localRay.intersectBox(b,tmp))continue;const d=tmp.distanceTo(localRay.origin);if(d<best){best=d;target=h.act}}
  if(immersive&&screen){const hits=rx;hits.ray.copy(ray);const h=hits.intersectObject(screen)[0];if(h&&h.distance<best&&h.uv){const {x,y}=h.uv;if(y<.32){if(x<.33)dispatch('run');else if(x<.66)dispatch('rate',s.rateHz===1000?2000:1000);else dispatch('connected')}return}}
  if(target)dispatch(target.action,target.index);
 }
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;down=null;const b=renderer.domElement.getBoundingClientRect();rx.setFromCamera(new T.Vector2(((e.clientX-b.left)/b.width)*2-1,1-((e.clientY-b.top)/b.height)*2),camera);pick(rx.ray)});
 const cv=document.createElement('canvas');cv.width=860;cv.height=340;const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;screen=new T.Mesh(new T.PlaneGeometry(.48,.19),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));screen.position.set(0,.245,-.023);root.add(screen);
 function updateScreen(){const g=cv.getContext('2d');g.fillStyle='#16373e';g.fillRect(0,0,860,340);g.fillStyle='#f1e9d9';g.font='bold 34px sans-serif';g.fillText('DIGIDATA 1550B  /  ACQUISITION',24,50);g.font='26px sans-serif';g.fillText('AI'+s.firstInput+'   •   '+s.rateHz+' Hz   •   '+(s.power&&s.usb&&s.connected?'connected':'not ready'),24,111);g.fillText(s.result?s.result.channels[0].codes.length+' samples   /   revision '+s.result.revision:'No current acquisition',24,158);g.font='22px sans-serif';g.fillText('Point at a front BNC to map a signal.',24,200);
  ['Acquire','Change rate','Patch lead'].forEach((l,i)=>{g.fillStyle='#356569';g.fillRect(7+i*285,244,274,84);g.fillStyle='#fff';g.fillText(l,24+i*285,294)});tex.needsUpdate=true}
 function sync(){
  node('signal_patch').visible=s.connected;node('signal_patch').position.set(.0207*(s.firstInput%4),s.firstInput>=4?-.027:0,0);
  node('generic_host').visible=view==='Station'||immersive;node('usb_lead').visible=(view==='Station'||immersive)&&s.usb;node('POWER_LED').visible=s.power&&s.usb;node('READY_LED').visible=s.power&&s.usb;
  screen.visible=immersive;updateScreen();render();
 }
 for(const b of document.querySelectorAll('[data-dd-view]'))b.onclick=()=>goto(b.dataset.ddView);controls.addEventListener('change',render);
 const ro=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();if(!immersive)renderer.setSize(w,h,false);render()});ro.observe(host);goto('Overall');setSync(sync);
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const b=$('vr');b.hidden=false;b.onclick=async()=>{try{const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});immersive=true;root.position.set(0,.9,-.67);screen.visible=true;controls.enabled=false;await renderer.xr.setSession(session);sync();renderer.setAnimationLoop(()=>renderer.render(scene,camera));session.addEventListener('end',()=>{renderer.setAnimationLoop(null);immersive=false;root.position.set(0,0,0);controls.enabled=true;goto(view)})}catch(e){$('view-status').textContent='Could not start VR session: '+e.message}};
  for(let i=0;i<2;i++){const ctrl=renderer.xr.getController(i);scene.add(ctrl);const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-.8)]),new T.LineBasicMaterial({color:0xffbf69}));ctrl.add(line);ctrl.addEventListener('select',()=>{const pos=new T.Vector3().setFromMatrixPosition(ctrl.matrixWorld);const dir=new T.Vector3(0,0,-1).transformDirection(ctrl.matrixWorld);pick(new T.Ray(pos,dir))})}
 }
 $('view-status').textContent='3D asset loaded · 1:1 scale · '+m.geometry.triangles.toLocaleString()+' triangles · '+m.geometry.primitives+' draw primitives.';
}
boot().catch(e=>{$('status').textContent='Could not initialize the acquisition bench: '+e.message;});
