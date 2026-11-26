import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/16-09/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,effectiveRpm,exportRun,isHot}=await import(/* @vite-ignore */url);
const app=document.querySelector('#ika16'),$=k=>app.querySelector('#ik-'+k),f=(x,n=2)=>x===null?'—':Number(x.toFixed(n)).toString();
let s=initial(),repaint=()=>{};
function status(text,err=false){$('status').textContent=text;$('status').dataset.error=String(err);}
function act(a,v){const q=dispatch(s,a,v);s=q.state;status(q.message,!q.ok);sync();}
for(const a of ['power','load','probe','heat','stir','run','reset'])$(a).onclick=()=>act(a);
for(const k of ['rpm','setC','durationS'])$(k).onchange=e=>act('settings',{[k]:e.currentTarget.valueAsNumber});
$('ambient').onchange=e=>act('fixture',{ambientC:e.currentTarget.valueAsNumber});
$('mode').onchange=e=>act('fixture',{mode:e.currentTarget.value});
$('file').onchange=async e=>{const file=e.currentTarget.files[0];if(!file)return;try{if(file.size>16000)throw Error('Use a phantom JSON below 16 kB.');act('import',JSON.parse(await file.text()));}catch(e){status('Import: '+e.message,true);}e.target.value='';};
$('export').onclick=()=>{if(!s.history.length)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(exportRun(s),null,2)+'\n'],{type:'application/json'}));a.href=u;a.download='hotplate-'+s.fixture.vesselId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),700);};
function sync(){
 for(const k of ['rpm','setC','durationS'])$(k).value=s.settings[k];
 $('ambient').value=s.fixture.ambientC;$('mode').value=s.fixture.mode;$('setC').disabled=s.fixture.mode==='equilibrium';
 const opts={power:[s.power,'Virtual standby','Enable virtual power'],load:[s.loaded,'Remove inert vessel','Place inert vessel'],probe:[s.probe,'Retract virtual probe','Insert virtual probe'],heat:[s.heat,'Turn simulated heat off','Turn simulated heat on'],stir:[s.stir,'Turn stirring off','Turn stirring on']};
 for(const [a,[v,y,n]] of Object.entries(opts)){$(a).textContent=v?y:n;$(a).setAttribute('aria-pressed',String(v));}
 $('export').disabled=s.history.length===0;
 $('temperature').textContent='Plate '+f(s.plateC)+' °C · '+(s.loaded&&s.probe?'probe '+f(s.vesselC)+' °C':'probe not connected')+' · '+f(effectiveRpm(s),0)+' rpm modeled agitation.';
 $('flag').textContent=isHot(s)?'HOT · modeled plate above 50 °C.':'Modeled HOT threshold not exceeded.';$('flag').dataset.hot=String(isHot(s));
 $('meta').textContent=s.fixture.vesselId+' · revision '+s.fixture.revision+' · '+f(s.timeS,0)+' virtual s.';
 plot();repaint();
}
function plot(){
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height,l=65,r=w-24,t=53,b=h-64,stirLine=b+14;
 const tracks=s.history.flatMap(q=>q.data),span=Math.max(100,s.timeS),lo=Math.floor((Math.min(s.fixture.ambientC,...tracks.map(p=>p.plateC))-4)/5)*5,hi=Math.max(lo+10,Math.ceil((Math.max(s.fixture.ambientC,...tracks.map(p=>p.plateC))+2)/5)*5),X=x=>l+x/span*(r-l),Y=y=>b-(y-lo)/(hi-lo)*(b-t);
 g.fillStyle='#162d39';g.fillRect(0,0,w,h);g.fillStyle='#bed9df';g.font='bold 20px sans-serif';g.fillText('VIRTUAL PLATE AND PHANTOM TEMPERATURE',16,33);
 g.font='14px sans-serif';g.lineWidth=1;g.strokeStyle='#4e6873';
 for(let j=0;j<=5;j++){const x=l+(r-l)*j/5,y=b-(b-t)*j/5;g.beginPath();g.moveTo(x,t);g.lineTo(x,b);g.moveTo(l,y);g.lineTo(r,y);g.stroke();g.fillText(f(span*j/5,0),x-5,b+36);g.fillText(f(lo+(hi-lo)*j/5,0),24,y+5);}
 g.fillText('°C',20,t-12);g.fillText('virtual time (s)',l,b+56);
 for(const [key,col] of [['plateC','#e7a76d'],['probeC','#80e6d1']]){
  g.strokeStyle=col;g.lineWidth=2.4;
  for(const seg of s.history){g.beginPath();let started=false;for(const p of seg.data)if(p[key]!==null){started?g.lineTo(X(p.timeS),Y(p[key])):g.moveTo(X(p.timeS),Y(p[key]));started=true;}g.stroke();}
 }
 g.fillStyle='#e7a76d';g.fillText('plate',w*.53,32);g.fillStyle='#80e6d1';g.fillText('probe',w*.65,32);g.fillStyle='#bc9fe0';g.fillText('stirring',w*.78,32);
 g.strokeStyle='#bc9fe0';g.lineWidth=4;
 for(const seg of s.history)if(seg.data[0].stirring){g.beginPath();g.moveTo(X(seg.data[0].timeS),stirLine);g.lineTo(X(seg.data.at(-1).timeS),stirLine);g.stroke();}
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(39,1,.005,9),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));r.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#273944');host.append(r.domElement);r.domElement.setAttribute('aria-label','Metric C-MAG HS 7 with controllable front knobs, rear standby and inert vessel probe.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.15;orbit.maxDistance=2.4;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x818c93,2.2));
 for(const [v,i] of [[[.3,.65,.52],2.6],[[-.44,.38,-.6],1.4]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(v);scene.add(l);}
 const ground=new T.GridHelper(.9,24,0x688b94,0x50666c);ground.position.y=-.002;scene.add(ground);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'ika-hs7.glb'),fetch(path+'interaction.json').then(x=>x.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(q=>{if(q.name===n)a.push(q)});if(a.length!==1)throw Error('Missing model binding '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const vessel=get(m.parts.vessel),probe=get(m.parts.probe),rotor=get(m.parts.rotor),home=probe.position.y,heater=get(m.parts.heaterLamp),hot=get(m.parts.hotLamp),display=get(m.parts.display),heat=get('heat_knob'),stir=get('stir_knob');
 const text=document.createElement('canvas');text.width=250;text.height=92;const ctx=text.getContext('2d'),texture=new T.CanvasTexture(text);texture.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.PlaneGeometry(.035,.015),new T.MeshBasicMaterial({map:texture}));face.position.z=.0033;display.add(face);
 for(const x of [heater,hot])x.material=x.material.clone();
 const targets=m.actions.map(a=>{const p=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(p);p.userData.a=a;return [get(a.node),p];});
 const ray=new T.Raycaster(),pointer=new T.Vector2();let down=null,frame=0;
 function pick(e){
  const b=r.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(pointer,cam);
  const candidates=targets.filter(([,p])=>{const a=p.userData.a.id;return a==='standby'?cam.position.z<0:['heating','mixing'].includes(a)?cam.position.z>0:a==='place'?!s.loaded:s.loaded;});
  return ray.intersectObjects(candidates.map(([,p])=>p))[0]?.object.userData.a;
 }
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=pick(e);if(a)act(a.action);}down=null;};
 r.domElement.onpointermove=e=>{const a=pick(e);r.domElement.style.cursor=a?'pointer':'grab';r.domElement.title=a?.label??'Orbit the hotplate';};
 function tick(t){frame=0;if(!effectiveRpm(s)||document.hidden)return;rotor.rotation.y=t/1000*2*Math.PI*m.motion.rotorDisplayHz;draw();frame=requestAnimationFrame(tick);}
 repaint=()=>{
  vessel.visible=s.loaded;probe.position.y=home+(s.probe?0:m.motion.probeLiftM);
  if(!effectiveRpm(s))rotor.rotation.y=s.phaseTurns*2*Math.PI;
  else if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
  heat.rotation.z=s.heat?-.45-(s.settings.setC-50)*.019:0;stir.rotation.z=effectiveRpm(s)?-.25-(s.settings.rpm-100)*.0011:0;
  heater.material.color.set(s.heat?'#f6584c':'#633238');hot.material.color.set(isHot(s)?'#ff8e46':'#8a5b39');
  ctx.fillStyle='#241215';ctx.fillRect(0,0,250,92);ctx.textAlign='center';ctx.font='bold 66px monospace';ctx.fillStyle='#f46a5e';ctx.fillText(isHot(s)&&!s.heat?'HOT':s.power?(s.heat?String(s.settings.setC):'—'):'',125,69);texture.needsUpdate=true;
  scene.updateMatrixWorld(true);for(const [n,p] of targets){n.getWorldPosition(p.position);n.getWorldQuaternion(p.quaternion);p.updateMatrixWorld(true);}draw();
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else repaint();});
 const poses={orbit:[[.37,.32,.48],[0,.089,0]],front:[[0,.154,.60],[0,.087,.045]],plate:[[.185,.346,.257],[0,.125,-.033]],rear:[[.337,.223,-.458],[0,.08,-.075]]};
 function pose(k){cam.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 app.querySelectorAll('[data-ik-view]').forEach(b=>b.onclick=()=>pose(b.dataset.ikView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 pose('orbit');repaint();$('model').textContent='Metric GLB loaded · Controls, vessel and sample probe';$('model').dataset.loaded='true';
}
sync();act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The numerical phantom still runs.';$('viewer').style.display='none';});
