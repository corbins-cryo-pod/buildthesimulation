import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/01-06/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,loadFor,mounted}=await import(/* @vite-ignore */url);
const app=document.querySelector('#rack01'),$=k=>app.querySelector('#rk-'+k),f=x=>Number(x.toFixed(2)).toString();
let state=initial(),refresh=()=>{},busy=false;
function status(msg,e=false){$('status').textContent=msg;$('status').dataset.error=String(e);}
function value(){return {u:Number($('u').value),w:Number($('w').value)};}
async function act(a,v){
 if(busy)return;busy=true;
 try{
  const q=await dispatch(state,a,v);state=q.state;
  if(a==='reset'){$('u').value='9';$('w').value='120';}
  status(q.message,!q.ok);
 }catch(e){status('Operation not completed: '+e.message,true);}finally{busy=false;sync();}
}
for(const a of ['door','pull','power','mount','archive','restore','damage','reset','remove'])$(a).onclick=()=>act(a,a==='mount'?value():undefined);
for(const a of ['u','w'])$(a).onchange=()=>sync();
$('file').onchange=async e=>{const file=e.currentTarget.files[0];if(!file)return;try{if(file.size>250000)throw Error('The virtual archive limit is 250 kB.');await act('import',JSON.parse(await file.text()));}catch(e){status('Import: '+e.message,true);}e.target.value='';};
$('export').onclick=()=>{if(!state.pack)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(state.pack,null,2)+'\n'],{type:'application/json'}));a.download=state.pack.runId+'-rack-archive.json';a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),700);};
function sync(){
 $('door').textContent=state.door?'Close cabinet':'Open cabinet';$('pull').textContent=state.pull?'Seat NAS tray':'Extend NAS tray';$('power').textContent=state.power?'UPS standby':'Enable virtual UPS';
 for(const [a,v] of [['door',state.door],['pull',state.pull],['power',state.power]])$(a).setAttribute('aria-pressed',String(v));
 const q=loadFor(state);$('load').textContent=f(q.realW)+' W / 1,000 W · '+f(q.apparentVA)+' VA / 1,440 VA · '+f(q.estimatedA)+' A estimated at 120 V · '+(q.within?'within limits':'OVERBUDGET');
 $('load').dataset.error=String(!q.within);$('mounts').textContent=[...mounted,...(state.module?[state.module]:[])].map(m=>m.id.toUpperCase()+' U'+m.u+(m.heightU>1?'–'+(m.u+m.heightU-1):'')).join(' · ');
 $('export').disabled=!state.pack;$('restore').disabled=!state.pack;$('damage').disabled=!state.pack;$('remove').disabled=!state.module;
 $('checks').replaceChildren();
 if(state.result?.checks)for(const c of state.result.checks){const li=document.createElement('li');li.textContent=c.id+' ← '+c.parentId+' · '+c.bytes+' bytes · '+(c.ok?'MATCH':'MISMATCH')+' · SHA-256 '+c.actualSha256;$('checks').append(li);}
 $('event').textContent=state.result?.event?'Restore event · '+state.result.event.sampleId+' · revision '+state.result.event.restoredRevision:state.pack?'Archived run: '+state.pack.runId+' · revision '+state.pack.revision:'No archive in this page session.';
 refresh();
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.008,8),ren=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 ren.setPixelRatio(Math.min(devicePixelRatio,1.6));ren.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#263741');host.append(ren.domElement);ren.domElement.setAttribute('aria-label','Custom metric 12U rack with a hinged front door, NAS tray, removable compute module and UPS.');
 const controls=new OrbitControls(cam,ren.domElement),draw=()=>ren.render(scene,cam);controls.minDistance=.22;controls.maxDistance=4;controls.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x82979d,2.35));
 for(const [v,i] of [[[.4,1.1,1.3],2.25],[[-.9,1.3,-.9],1.45]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(v);scene.add(l);}
 const g=new T.GridHelper(2.4,24,0x728d91,0x4b636b);g.position.y=-.003;scene.add(g);
 const [o,m]=await Promise.all([new GLTFLoader().loadAsync(path+'rack.glb'),fetch(path+'interaction.json').then(r=>r.json())]);scene.add(o.scene);
 const get=n=>{const out=[];o.scene.traverse(q=>{if(q.name===n)out.push(q);});if(out.length!==1)throw Error('Missing or ambiguous node '+n);return out[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const door=get(m.parts.hinge),tray=get(m.parts.tray),sled=get(m.parts.movableModule),target=get('mount_target'),targetY=target.position.y,restY=sled.position.y,restZ=tray.position.z,led=get('ups_key');
 led.material=led.material.clone();const proxies=m.actions.map(a=>{const p=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(p);p.userData.action=a;return [get(a.node),p];});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null;
 function pick(e){if(cam.position.z<.05)return null;const b=ren.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);return ray.intersectObjects(proxies.filter(([n])=>state.door||n.name==='door_handle'||n.name==='ups_key').map(([,p])=>p))[0]?.object.userData.action;}
 ren.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 ren.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=pick(e);if(a)act(a.action,a.action==='mount'?value():undefined);}down=null;};
 ren.domElement.onpointermove=e=>{const a=pick(e);ren.domElement.style.cursor=a?'pointer':'grab';ren.domElement.title=a?.label??'Orbit the rack';};
 refresh=()=>{
  door.rotation.y=state.door?m.motion.openDeg*Math.PI/180:0;tray.position.z=restZ+(state.pull?m.motion.travelZ:0);sled.visible=!!state.module;sled.position.y=restY+((state.module?.u??9)-9)*m.motion.rackUnitY;target.position.y=targetY+(value().u-9)*m.motion.rackUnitY;
  led.material.color.set(state.power?(loadFor(state).within?'#67b89a':'#e0804b'):'#536065');
  scene.updateMatrixWorld(true);for(const [n,p] of proxies){n.getWorldPosition(p.position);n.getWorldQuaternion(p.quaternion);p.updateMatrixWorld();}
  draw();
 };
 const poses={orbit:[[.85,.80,1.23],[0,.32,.02]],front:[[0,.43,1.37],[0,.315,.13]],rail:[[.43,.54,.95],[-.085,.27,.19]],rear:[[.56,.59,-1.17],[.01,.32,-.21]]};
 function pose(k){cam.position.fromArray(poses[k][0]);controls.target.fromArray(poses[k][1]);controls.update();draw();}
 app.querySelectorAll('[data-rk-view]').forEach(b=>b.onclick=()=>pose(b.dataset.rkView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 pose('orbit');refresh();$('model').textContent='Metric GLB loaded · Cabinet, drive tray and slot placement';$('model').dataset.loaded='true';
}
sync();viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The virtual archive controls still work.';$('viewer').style.display='none';});
