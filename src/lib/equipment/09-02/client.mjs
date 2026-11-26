import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const prefix='/equipment/09-02/', solverURL=new URL(prefix+'solver.mjs',location.origin).href;
const {initial,dispatch,toCsv}=await import(/* @vite-ignore */ solverURL);
const app=document.querySelector('#b1500a'), $=k=>app.querySelector('#b1500-'+k);
const fmt=(x,d=5)=>Number(x.toPrecision(d)).toLocaleString('en-US',{maximumFractionDigits:9});
let state=initial(), result=null, paint=()=>{};
function status(msg,error=false){$('status').textContent=msg;$('status').dataset.error=String(error);}
function action(code,value) {
 if(code==='reset'){state={...initial(),sequence:state.sequence};result=null;status('Resistor setup restored. Ready to run.');return sync();}
 if(code==='stop'){result=null;status('Reading cleared. This solver runs one stepped sweep at a time.');return sync();}
 if(code==='cycle-mode'){code='mode';value=state.mode==='IV'?'CV':'IV';}
 if(code==='wire-IV'||code==='wire-CV'){
  const t=code.slice(-2);
  if(t!==state.mode){status('Select the matching module before connecting these leads.',true);return;}
  code='wire';
 }
 const q=dispatch(state,code,value);
 if(!q.ok){if(code==='run')result=null;status(q.message,true);sync();return;}
 state=q.state;result=q.result??null;
 if(result)status('Sweep complete: '+result.summary+'.');
 else if(code==='mode')status('Module selected. Match the coupon, connect leads, then lower the probes.');
 else if(code==='wire')status(state.wired?'Module leads connected. Lower the probes.':'Module leads disconnected; probes lifted.');
 else if(code==='seat')status(state.probeDown?'Both probes seated on the coupon.':'Probes lifted.');
 else if(code==='swap-coupon'||code==='import')status('Coupon installed; lower the probes again.');
 else status('Setting applied.');
 sync();
}
const fields=[['start','startV',1],['stop','stopV',1],['steps','points',1],['ilim','complianceA',1e6],['frequency','frequencyHz',.001],['level','signalVrms',1e3]];
for(const [k] of fields.concat([['value']]))$(k).onchange=()=>{
 const v=Object.fromEntries(fields.map(([k,x,s])=>[x,$(k).valueAsNumber/s]));
 v.value=$('value').valueAsNumber/(state.fixture.kind==='resistor'?1:1e9);
 action('settings',v);
};
$('mode').onchange=e=>action('mode',e.target.value);
for(const [k,a] of [['run','run'],['power','power'],['wire','wire'],['seat','seat'],['preset','swap-coupon'],['reset','reset']])$(k).onclick=()=>action(a);
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>20000)throw Error('Keep the coupon JSON below 20 kB.');action('import',JSON.parse(await f.text()));}catch(err){status('Coupon import: '+err.message,true);}};
function download(body,mime,ext){const u=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=u;a.download=result.measurementId+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>result&&download(JSON.stringify(result,null,2),'application/json','json');
$('csv').onclick=()=>result&&download(toCsv(result),'text/csv','csv');
function chart(canvas,screen=false){
 const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,f=w/700;
 g.fillStyle=screen?'#0e2636':'#112a36';g.fillRect(0,0,w,h);
 if(!state.power){
  g.fillStyle='#101717';g.fillRect(0,0,w,h);return;
 }
 g.fillStyle='#bde8ed';g.font='bold '+(22*f)+'px sans-serif';g.fillText(state.mode==='IV'?'HRSMU  /  I–V':'MFCMU  /  C–V',22*f,33*f);
 g.textAlign='right';g.font='bold '+(18*f)+'px sans-serif';
 g.fillText(state.probeDown&&state.wired?'READY':'CHECK FIXTURE',w-20*f,32*f);g.textAlign='left';
 const [a,b,d,e]=[88*f,65*f,w-38*f,h-65*f],scaleX=x=>a+(x+1)*.5*(d-a);
 g.strokeStyle='#4a666f';g.lineWidth=1*f;
 for(let i=0;i<=8;i++){const x=a+(d-a)*i/8;g.beginPath();g.moveTo(x,b);g.lineTo(x,e);g.stroke();}
 for(let i=0;i<=4;i++){const y=b+(e-b)*i/4;g.beginPath();g.moveTo(a,y);g.lineTo(d,y);g.stroke();}
 g.fillStyle='#abc8d0';g.font=(16*f)+'px sans-serif';
 for(const x of [-1,-.5,0,.5,1])g.fillText(String(x),scaleX(x)-6*f,e+22*f);
 g.fillText('Commanded bias  /  V',a,e+50*f);
 const iv=state.mode==='IV',k=iv?1000:1e9,field=iv?'currentA':'capacitanceF',max=iv?Math.max(.15,1.2*state.complianceA*1000||.15):Math.max(.2,1.24*(state.fixture.kind==='capacitor'?state.fixture.value*1e9:1));
 const y0=iv?-max:0,y1=max,scaleY=y=>e-(e-b)*(y-y0)/(y1-y0);
 for(let i=0;i<=4;i++)g.fillText(fmt(y0+(y1-y0)*i/4,3),8*f,scaleY(y0+(y1-y0)*i/4)+6*f);
 g.fillText(iv?'mA':'nF',25*f,56*f);
 if(!result)return;
 g.strokeStyle='#69dfce';g.lineWidth=2.7*f;g.beginPath();
 for(const [i,p] of result.points.entries()){const x=scaleX(p.commandV),y=scaleY(p[field]*k);i?g.lineTo(x,y):g.moveTo(x,y);}
 g.stroke();
 for(const p of result.points){g.fillStyle=p.flag==='COMPLIANCE'?'#ffd574':'#a6fff2';g.beginPath();g.arc(scaleX(p.commandV),scaleY(p[field]*k),4*f,0,2*Math.PI);g.fill();}
}
function sync(){
 $('mode').value=state.mode;
 for(const [k,f,s] of fields)$(k).value=Number((state[f]*s).toPrecision(10));
 $('fixture').textContent=state.fixture.sampleId+' · revision '+state.fixture.revision+' · HI → '+state.fixture.contacts.find(c=>c.role==='HI').id+' · LO → '+state.fixture.contacts.find(c=>c.role==='LO').id;
 const resistor=state.fixture.kind==='resistor',control=$('value');
 $('value-label').textContent=resistor?'Resistance (Ω)':'Capacitance (nF)';
 control.value=Number((state.fixture.value*(resistor?1:1e9)).toPrecision(10));
 control.min=resistor?'100':'0.1';control.max=resistor?'100000':'10';
 $('iv-fields').hidden=state.mode!=='IV';$('cv-fields').hidden=state.mode!=='CV';
 $('wire').textContent=state.wired?'Disconnect leads':'Connect leads';
 $('seat').textContent=state.probeDown?'Raise probes':'Lower probes';
 $('power').textContent=state.power?'Standby':'Power on';
 $('json').disabled=$('csv').disabled=!result;
 const iv=state.mode==='IV';
 $('result').textContent=result? (iv?'I–V: '+result.summary:'C–V: '+result.summary+' · '+fmt(result.points[0].acCurrentArms*1e6)+' µA RMS') : 'No current sweep. Press Run sweep to acquire.';
 $('last-title').textContent=iv?'Current (mA)':'Capacitance (nF)';
 $('rows').replaceChildren();
 for(const p of result?.points??[]){
  const tr=document.createElement('tr');
  for(const x of [p.index+1,fmt(p.commandV),fmt(p.terminalV),fmt(iv?p.currentA*1000:p.capacitanceF*1e9),p.flag]){const td=document.createElement('td');td.textContent=x;tr.append(td);}
  $('rows').append(tr);
 }
 chart($('plot'));paint();
}
async function viewer(){
 const host=$('viewer'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.007,8),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 scene.background=new THREE.Color('#28383d');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Metric B1500A with interactive display, front panel, module ports, and external probe assembly. Forms provide equivalent actions.');
 const orbit=new OrbitControls(camera,renderer.domElement),render=()=>renderer.render(scene,camera);
 orbit.addEventListener('change',render);orbit.minDistance=.13;orbit.maxDistance=3;
 scene.add(new THREE.HemisphereLight(0xffffff,0x666e73,2.2));
 for(const [p,i] of [[[-.46,.67,.73],1.9],[[.38,.67,-.48],1.2]]){const l=new THREE.DirectionalLight(0xffffff,i);l.position.fromArray(p);scene.add(l);}
 const grid=new THREE.GridHelper(1.5,30,0x678b93,0x486264);grid.position.y=-.002;scene.add(grid);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(prefix+'b1500a.glb'),fetch(prefix+'interaction.json').then(r=>r.json())]),asset=g.scene;scene.add(asset);
 const find=k=>{const hits=[];asset.traverse(o=>{if(o.name===k)hits.push(o);});if(hits.length!==1)throw Error('Missing/ambiguous model link: '+k);return hits[0];};
 m.ports.forEach(x=>find(x.node));find(m.frame.placementAnchor);find(m.fixture.contacts.HI);find(m.fixture.contacts.LO);asset.updateMatrixWorld(true);
 const glass=find('display_anchor'),screen=document.createElement('canvas'),texture=new THREE.CanvasTexture(screen);
 screen.width=700;screen.height=525;texture.colorSpace=THREE.SRGBColorSpace;
 const overlay=new THREE.Mesh(new THREE.PlaneGeometry(.3048,.2286),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));glass.add(overlay);
 const head=find(m.fixture.motion.node),seated=head.position.y,iv=find('wiring_IV'),cv=find('wiring_CV'),led=find('led_standby');led.material=led.material.clone();
 const targets=m.controls.map(row=>{
  const part=find(row.node),proxy=new THREE.Mesh(new THREE.BoxGeometry(...row.targetSizeM),new THREE.MeshBasicMaterial({visible:false}));
  proxy.userData.row=row;part.getWorldPosition(proxy.position);
  if(row.id==='seat') proxy.position.y-=.02;
  scene.add(proxy);return {part,proxy};
 });
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),proxies=targets.map(c=>c.proxy);
 let down=null;
 function hit(e){
  const b=renderer.domElement.getBoundingClientRect();mouse.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);
  ray.setFromCamera(mouse,camera);return ray.intersectObjects(proxies.filter(p=>{
   const isWiring=p.userData.row.id.startsWith('wire-'),frontSide=camera.position.z>=.05;
   return isWiring?!frontSide:frontSide;
  }))[0]?.object.userData.row;
 }
 renderer.domElement.onpointerdown=e=>{down=[e.clientX,e.clientY];};
 renderer.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const h=hit(e);if(h)action(h.action);}down=null;};
 renderer.domElement.onpointermove=e=>{const h=hit(e);renderer.domElement.style.cursor=h?'pointer':'grab';renderer.domElement.title=h?.label??'Orbit the lab equipment';};
 paint=()=>{
  chart(screen,true);texture.needsUpdate=true;
  head.position.y=seated+(state.probeDown?0:m.fixture.motion.maxM);asset.updateMatrixWorld(true);
  const spatial=targets.find(t=>t.proxy.userData.row.id==='seat');head.getWorldPosition(spatial.proxy.position);spatial.proxy.position.y-=.02;
  iv.visible=state.wired&&state.mode==='IV';cv.visible=state.wired&&state.mode==='CV';led.material.color.set(state.power?'#51de64':'#465850');led.material.emissive.set(state.power?'#1f882b':'#000000');
  render();
 };
 const poses={orbit:[[-.67,.48,.93],[.07,.14,0]],front:[[0,.18,.91],[0,.17,.245]],rear:[[0,.19,-.96],[0,.17,-.256]],probes:[[.55,.22,.63],[.335,.065,.215]],screen:[[-.034,.173,.71],[-.034,.173,.29]]};
 for(const b of app.querySelectorAll('[data-b1500-view]'))b.onclick=()=>view(b.dataset.b1500View);
 function view(k){camera.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();render();}
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();};
 new ResizeObserver(resize).observe(host);resize();view('orbit');paint();
 $('model').textContent='Metric GLB loaded · 7 mapped action targets · animated dual-probe fixture';$('model').dataset.loaded='true';
}
sync();action('run');viewer().catch(e=>{$('model').textContent='3D could not load: '+e.message+'. The electrical bench remains available.';$('viewer').style.display='none';});
