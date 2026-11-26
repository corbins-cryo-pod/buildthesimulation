import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/10-04/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,waveform}=await import(/* @vite-ignore */url);
const root=document.querySelector('#epc10'),$=k=>root.querySelector('#ep-'+k),n=(x,p=3)=>Number(x.toFixed(p)).toString();
let s=initial(),render3d=()=>{};
function status(t,e=false){$('status').textContent=t;$('status').dataset.error=String(e);}
function act(a,v){const q=dispatch(s,a,v);s=q.state;status(q.message,!q.ok);sync();}
for(const a of ['power','host','connect','run','reset'])$(a).onclick=()=>act(a);
for(const k of ['holding','step','durationMs'])$(k).onchange=e=>act('settings',{[k]:e.currentTarget.valueAsNumber});
for(const k of ['rsMOhm','rlMOhm','cPf'])$(k).onchange=e=>act('fixture',{[k]:e.currentTarget.valueAsNumber});
$('range').onchange=e=>act('settings',{range:e.currentTarget.value});
$('mode').onchange=e=>act('mode',e.currentTarget.value);
$('file').onchange=async e=>{const f=e.currentTarget.files[0];if(!f)return;try{if(f.size>16000)throw Error('Use an inert fixture JSON below 16 kB.');act('import',JSON.parse(await f.text()));}catch(e){status('Import: '+e.message,true);}e.target.value='';};
function save(r,kind){
 if(!r)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(kind==='monitor'?waveform(r):r)],{type:'application/json'}));a.href=u;a.download='epc10-'+kind+'-run'+r.runSequence+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),800);
}
$('full').onclick=()=>save(s.result,'trace');$('monitor').onclick=()=>save(s.result,'monitor');
function sync(){
 for(const k of ['holding','step','durationMs','range','mode'])$(k).value=s.settings[k];
 for(const k of ['rsMOhm','rlMOhm','cPf'])$(k).value=s.fixture[k];
 const cc=s.settings.mode==='IC',u=cc?'pA':'mV';
 $('holdUnit').textContent=u;$('stepUnit').textContent=u;$('range').disabled=cc;$('range-note').textContent=cc?'IC uses an explicit virtual monitor scale.':'Current range marks monitor clipping; the ideal current trace stays unchanged.';
 for(const [a,k,on,off] of [['power','powered','Virtual standby','Power virtual amplifier'],['host','host','Disconnect virtual host','Connect virtual host'],['connect','connected','Disconnect electronic dummy','Connect electronic dummy']]){$(a).textContent=s[k]?on:off;$(a).setAttribute('aria-pressed',String(s[k]));}
 $('links').textContent=[s.powered?'amp on':'amp in standby',s.host?'host linked':'host disconnected',s.connected?'dummy connected':'dummy disconnected'].join(' · ');
 $('full').disabled=$('monitor').disabled=!s.result;
 const r=s.result;
 $('identity').textContent=s.fixture.sampleId+' · incoming revision '+s.fixture.parentRevision;
 if(r){const v=r.mode==='IC',S=v?1000:1e12,U=v?'mV':'pA';$('result').textContent='Ideal settled response '+n(r.summary.settledPrimarySI*S,4)+' '+U+' · τ '+n(r.summary.tauMs,4)+' ms · '+r.summary.clippedSamples+' clipped monitor samples.';$('details').textContent='Virtual acquisition '+r.acquisition.clockHz.toLocaleString()+' samples/s · '+r.calibrationId+' · run '+r.runSequence+'.';}
 else {$('result').textContent='Run to see the passive dummy response.';$('details').textContent='';}
 plot();render3d();
}
function plot(){
 const canvas=$('plot'),g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,l=68,t=56,r=w-25,b=h-60;
 g.fillStyle='#172e3a';g.fillRect(0,0,w,h);g.fillStyle='#bfdce1';g.font='bold 21px sans-serif';g.fillText('EPC 10 USB / ELECTRONIC DUMMY',18,35);
 const a=s.result;if(!a){g.font='16px sans-serif';g.fillText('Waiting for virtual acquisition.',19,69);return;}
 const cc=a.mode==='IC',scale=cc?1000:1e12,units=cc?'mV':'pA',data=a.records,d=cc?data.electrodeV:data.currentA,
       vals=d.map(v=>v*scale),obs=data.monitorV.map(v=>v*scale/a.acquisition.monitorScaleVPerSI),time=data.timeS.at(-1)*1000,
       minimum=Math.min(0,...vals),maximum=Math.max(0,...vals),spread=maximum-minimum||1,min=minimum-spread*.12,max=maximum+spread*.12,
       X=x=>l+x/time*(r-l),Y=y=>b-(y-min)/(max-min)*(b-t);
 g.strokeStyle='#54747e';g.lineWidth=1;g.font='15px sans-serif';
 for(let j=0;j<=5;j++){const x=l+j/5*(r-l),y=b-j/5*(b-t);g.beginPath();g.moveTo(x,t);g.lineTo(x,b);g.moveTo(l,y);g.lineTo(r,y);g.stroke();g.fillText(n(time*j/5,1),x-5,b+24);g.fillText(n(min+(max-min)*j/5,1),7,y+4);}
 g.fillText('time (ms) · measured quantity '+units,l,b+49);
 for(const [data,color] of [[vals,'#77e1cc'],[a.summary.clippedSamples?obs:null,'#f0af73']])if(data){
  g.strokeStyle=color;g.lineWidth=2.2;g.beginPath();data.forEach((v,j)=>j?g.lineTo(X(a.records.timeS[j]*1000),Y(v)):g.moveTo(X(0),Y(v)));g.stroke();
 }
 if(a.summary.clippedSamples){g.fillStyle='#f0af73';g.fillText('orange: clipped virtual monitor',w*.61,35);}
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.004,9),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));r.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#263c49');host.append(r.domElement);r.domElement.setAttribute('aria-label','Metric HEKA EPC 10 USB Single, Red Star headstage, inert circuit and illustrative software host.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.16;orbit.maxDistance=4;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x758a94,2.1));
 for(const [p,i] of [[[.4,.9,1.2],2.3],[[-.68,.76,-.85],1.43]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(p);scene.add(l);}
 const ground=new T.GridHelper(2.2,32,0x6a8a91,0x4d6772);ground.position.y=-.002;scene.add(ground);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'epc10.glb'),fetch(path+'interaction.json').then(x=>x.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(q=>{if(q.name===n)a.push(q)});if(a.length!==1)throw Error('Missing named model binding '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const dummy=get(m.parts.dummy),home=dummy.position.z,led=get(m.parts.runLed),clip=get(m.parts.clippingLed),usb=get('software_usb');
 for(const v of [led,clip,usb])v.material=v.material.clone();
 const proxies=m.actions.map(a=>{const p=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(p);p.userData.a=a;return [get(a.node),p];});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null;
 function hit(e){if(cam.position.z<.04)return null;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);return ray.intersectObjects(proxies.map(([,p])=>p))[0]?.object.userData.a;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=hit(e);if(a)act(a.action,a.action==='mode'?(s.settings.mode==='IC'?'VC':'IC'):undefined);}down=null;};
 r.domElement.onpointermove=e=>{const a=hit(e);r.domElement.style.cursor=a?'pointer':'grab';r.domElement.title=a?.label??'Orbit the bench';};
 render3d=()=>{
  dummy.position.z=home+(s.connected?0:m.motion.dummyDisconnectZ);
  led.material.color.set(s.powered?'#74c59c':'#3f5149');clip.material.color.set(s.result?.summary.clippedSamples?'#f97061':'#633a38');usb.material.color.set(s.host?'#95d9a5':'#60686d');
  scene.updateMatrixWorld(true);for(const [n,p] of proxies){n.getWorldPosition(p.position);n.getWorldQuaternion(p.quaternion);p.updateMatrixWorld();}
  draw();
 };
 const poses={orbit:[[.70,.55,1.05],[.235,.078,.03]],front:[[.02,.22,.87],[.02,.078,.095]],head:[[.501,.274,.431],[.333,.064,.095]],rear:[[-.45,.32,-.84],[-.037,.084,-.105]]};
 function pose(k){cam.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 root.querySelectorAll('[data-ep-view]').forEach(b=>b.onclick=()=>pose(b.dataset.epView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 pose('orbit');render3d();$('model').textContent='Metric GLB loaded · Main unit, Red Star headstage and electronic dummy';$('model').dataset.loaded='true';
}
act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The electronic dummy still runs.';$('viewer').style.display='none';});
