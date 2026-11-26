import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const base='/equipment/14-03/',url=new URL(base+'solver.mjs',location.origin).href;
const {initial,dispatch,newtonian,maxwell,csv}=await import(/* @vite-ignore */ url);
const app=document.querySelector('#dhr2'),$=k=>app.querySelector('#dhr-'+k),fmt=(x,n=4)=>Number(x.toFixed(n)).toString();
let state=initial(),out=null,repaint=()=>{},animate=()=>{};
const keys=['strainPct','gapMm','startHz','stopHz','count'];
function status(t,bad=false){$('status').textContent=t;$('status').dataset.error=String(bad);}
function act(k,v){
 const q=dispatch(state,k,v);if(!q.ok){if(k==='run')out=null;status(q.message,true);return sync();}
 state=q.state;out=q.result??null;status(out?'Acquired '+out.points.length+' specimen frequency points.':'Setting applied.');
 sync();if(out)animate(out.points[Math.floor(out.points.length/2)].imposedAngleRad);
}
for(const id of keys)$(id).onchange=e=>act('settings',{[id]:e.target.valueAsNumber});
for(const id of ['power','head','load','run','reset'])$(id).onclick=()=>act(id);
$('newton').onclick=()=>act('sample',newtonian());$('maxwell').onclick=()=>act('sample',maxwell());
$('file').onchange=async e=>{const a=e.target.files[0];if(!a)return;try{if(a.size>5000)throw Error('Use a sample JSON below 5 kB.');act('sample',JSON.parse(await a.text()));}catch(err){status(err.message,true);}e.target.value='';};
function download(j){if(!out)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([j?JSON.stringify(out):csv(out)],{type:j?'application/json':'text/csv'}));a.href=u;a.download='dhr2-'+out.runRevision+(j?'.json':'.csv');a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>download(true);$('csv').onclick=()=>download(false);
function draw(){
 const x=$('plot'),g=x.getContext('2d'),p=76,q=57,r=x.width-22,b=x.height-62;
 g.fillStyle='#152e3b';g.fillRect(0,0,x.width,x.height);
 g.fillStyle='#c2ebed';g.font='bold 23px sans-serif';g.fillText('OSCILLATORY MODULUS  /  PA',17,35);
 const y=out?out.points.flatMap(x=>[x.storagePa,x.lossPa]):[1],max=Math.max(...y,1e-9)*1.12;
 const fmin=out?.inputs.startHz??.1,fmax=out?.inputs.stopHz??10;
 const X=f=>p+(r-p)*Math.log(f/fmin)/Math.log(fmax/fmin),Y=v=>b-v/max*(b-q);
 g.strokeStyle='#507078';g.font='15px sans-serif';
 for(let i=0;i<=4;i++){
  const yy=q+i*(b-q)/4,xx=p+i*(r-p)/4;
  g.beginPath();g.moveTo(p,yy);g.lineTo(r,yy);g.moveTo(xx,q);g.lineTo(xx,b);g.stroke();
  g.fillText(fmt(max*(1-i/4),3),7,yy+5);g.fillText(fmt(fmin*(fmax/fmin)**(i/4),3),xx-12,b+23);
 }
 g.fillText('Frequency (Hz) · log axis',p,b+49);
 if(!out)return;
 for(const [k,color] of [['storagePa','#89e8d6'],['lossPa','#ffd17e']]){
  g.strokeStyle=color;g.fillStyle=color;g.lineWidth=2.4;g.beginPath();
  for(const [i,o] of out.points.entries()){const x=X(o.frequencyHz),y=Y(o[k]);i?g.lineTo(x,y):g.moveTo(x,y);}
  g.stroke();for(const o of out.points){g.beginPath();g.arc(X(o.frequencyHz),Y(o[k]),3.7,0,2*Math.PI);g.fill();}
 }
}
function sync(){
 for(const k of keys)$(k).value=state[k];
 $('head').textContent=state.engaged?'Raise upper fixture':'Lower to test gap';$('head').setAttribute('aria-pressed',String(state.engaged));
 $('power').textContent=state.power?'Standby':'Power on';
 $('load').textContent=state.loaded?'Remove sample':'Load last sample';
 $('sample').textContent=state.loaded?state.sample.sampleId+' · '+state.sample.material+' · revision '+state.sample.revision:'No sample loaded.';
 $('json').disabled=$('csv').disabled=!out;
 $('fit').textContent=out?'Newtonian diagnostic fit: '+fmt(out.fit.viscosityPaS,6)+' Pa·s, loss residual RMS '+fmt(out.fit.lossRMSEPa,6)+' Pa.':'Run a sweep to inspect signed moduli and torque.';
 $('rows').replaceChildren();
 for(const y of out?.points??[]){
  const t=document.createElement('tr');
  for(const x of [fmt(y.frequencyHz),fmt(y.storagePa),fmt(y.lossPa),fmt(y.phaseDegrees),fmt(y.torqueAmplitudeNm*1e6),fmt(y.imposedAngleRad*1e3)]){const d=document.createElement('td');d.textContent=x;t.append(d);}
  $('rows').append(t);
 }
 draw();repaint();
}
async function viewer(){
 const host=$('viewer'),sc=new T.Scene(),c=new T.PerspectiveCamera(40,1,.005,8),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.outputColorSpace=T.SRGBColorSpace;r.setPixelRatio(Math.min(devicePixelRatio,1.5));sc.background=new T.Color('#24343d');host.append(r.domElement);r.domElement.setAttribute('aria-label','Orbitable Discovery HR-2. Fixture and equivalent buttons are synchronized.');
 const orbit=new OrbitControls(c,r.domElement),render=()=>r.render(sc,c);orbit.minDistance=.13;orbit.maxDistance=4;orbit.addEventListener('change',render);
 sc.add(new T.HemisphereLight(0xffffff,0x818c90,2));for(const [p,i] of [[[.60,.90,.95],2.2],[[-.66,.65,-.83],1.3]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(p);sc.add(l);}
 const floor=new T.GridHelper(1.8,25,0x66898d,0x465e62);floor.position.y=-.002;sc.add(floor);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(base+'dhr2.glb'),fetch(base+'interaction.json').then(v=>v.json())]);sc.add(g.scene);
 const get=n=>{let a=[];g.scene.traverse(o=>{if(o.name===n)a.push(o);});if(a.length!==1)throw Error('bad model node '+n);return a[0];};
 get(m.frame.placementAnchor);get(m.fixture.lowerContact);m.ports.forEach(get);
 const head=get(m.fixture.head),home=head.position.y,spindle=get(m.fixture.spindle),liquid=get(m.fixture.sample);
 const targets=m.actions.map(q=>{const p=new T.Mesh(new T.BoxGeometry(...q.sizeM),new T.MeshBasicMaterial({visible:false}));p.userData.q=q;sc.add(p);return {target:get(q.node),p};});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null,token=0;
 function hit(e){if(c.position.z<.03)return null;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,c);return ray.intersectObjects(targets.map(a=>a.p))[0]?.object.userData.q;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const h=hit(e);if(h)act(h.action);}down=null;};
 r.domElement.onpointermove=e=>{const h=hit(e);r.domElement.style.cursor=h?'pointer':'grab';r.domElement.title=h?.label??'Orbit the instrument';};
 repaint=()=>{
  token++;spindle.rotation.y=0;
  const gap=Number.isFinite(state.gapMm)?Math.max(.3,Math.min(2,state.gapMm)):1;
  head.position.y=home+(state.engaged?(gap-1)*.001:m.fixture.raisedLiftM);
  liquid.visible=state.loaded;liquid.scale.y=state.engaged?gap:1;
  sc.updateMatrixWorld(true);for(const x of targets){x.target.getWorldPosition(x.p.position);x.p.updateMatrixWorld(true);}render();
 };
 animate=a=>{
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const n=++token,t=performance.now();
  function frame(now){
   if(n!==token)return;const elapsed=Math.max(0,now-t);
   spindle.rotation.y=a*Math.sin(elapsed/1000*2*Math.PI);render();
   if(elapsed<1600)requestAnimationFrame(frame);else{spindle.rotation.y=0;render();}
  }requestAnimationFrame(frame);
 };
 const poses={orbit:[[.73,.76,1.24],[.10,.37,0]],front:[[.04,.46,1.11],[.04,.33,.09]],stage:[[.20,.34,.44],[0,.245,.08]],rear:[[.45,.59,-1.16],[.08,.30,-.04]]};
 function pose(k){c.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();render();}
 app.querySelectorAll('[data-dhr-view]').forEach(b=>b.onclick=()=>pose(b.dataset.dhrView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render();}).observe(host);
 pose('orbit');repaint();$('model').textContent='Metric GLB loaded · plate, gap and spindle actions';$('model').dataset.loaded='true';
}
sync();act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The numerical exercise still works.';$('viewer').style.display='none';});
