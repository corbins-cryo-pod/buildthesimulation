import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {defaults,csv} from '../../../../public/equipment/14-06/dma.mjs';
import {createStation,targets,pose} from '../../../../public/equipment/14-06/station.mjs';
const S=createStation(),$=k=>document.getElementById(k),form=$('settings'),root='/equipment/14-06/';
let plotMode=false,draw3=()=>{};
const note=(msg,bad=false)=>{$('status').textContent=msg;$('status').classList.toggle('q-err',bad)};
function act(k,p,sync=false){
 const s=S.dispatch(k,p);
 if(sync)for(const [key,v] of Object.entries(s.config))form.elements[key].value=String(v);
 if(k!=='viewPhase'){
  if(s.error)note(s.error.message,true);
  else if(s.result)note('Simulated response computed · '+s.result.sampleId+' / revision '+s.result.revision+'.');
  else if(s.open)note('Virtual furnace raised. Inspect or change the coupon.');
  else note('Ready. Acquire a synthetic oscillation.');
 }
 refresh();draw3();
}
form.oninput=()=>act('configure',Object.fromEntries(Object.keys(defaults).map(k=>[k,typeof defaults[k]==='number'?form.elements[k].valueAsNumber:form.elements[k].value])));
$('furnace').onclick=()=>act('toggleFurnace');$('coupon').onclick=()=>act('toggleCoupon');$('run').onclick=()=>act('acquire');
$('example').onclick=()=>{act('reset',null,true);act('acquire');};
$('phase-scrub').oninput=()=>act('viewPhase',$('phase-scrub').valueAsNumber);
$('mode-plot').onclick=()=>{plotMode=!plotMode;$('mode-plot').textContent=plotMode?'Show oscillation':'Show frequency sweep';$('chart-note').textContent=plotMode?'Storage (green) and loss (amber), in MPa. The frequency axis is logarithmic.':'Stress (amber) and strain (green) normalized to their own amplitudes. Use the readout for physical units.';refresh();};
const f=(x,u='',n=3)=>x.toFixed(n)+(u?' '+u:'');
function refresh(){
 const s=S.read(),r=s.result,a=r?.fit;
 $('furnace').textContent=s.open?'Lower virtual furnace':'Raise virtual furnace';$('coupon').textContent=s.loaded?'Unseat coupon':'Seat coupon';
 $('phase').textContent=s.phaseDeg.toFixed(0)+'°';$('phase-scrub').value=s.phaseDeg;
 $('json').disabled=$('csv').disabled=!r;
 for(const k of ['e0Mpa','deltaMpa','tauRefS','activationKj'])form.elements[k].disabled=s.config.mode==='known';
 const values=a?{storage:f(a.storageMpa,'MPa'),loss:f(a.lossMpa,'MPa'),lag:f(a.phaseDeg,'°',2),tangent:a.tanDelta===null?'undefined':f(a.tanDelta),force:f(a.forceAmplitudeN,'N',5),displ:f(a.displacementAmplitudeUm,'µm')}:{storage:'—',loss:'—',lag:'—',tangent:'—',force:'—',displ:'—'};
 Object.entries(values).forEach(([k,v])=>document.querySelector('[data-v="'+k+'"]').textContent=v);
 const c=$('chart'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#26363d';g.fillRect(0,0,w,h);g.fillStyle='#e7eee5';g.font='22px system-ui';
 if(!r){g.fillText('Measure an oscillation to view the response.',40,41);return;}
 const data=plotMode?r.sweep.rows:r.record.trace.slice(0,129);
 const X=q=>plotMode?Math.log10(q[0]):q[0],lo=X(data[0]),hi=X(data.at(-1)),scale=plotMode?Math.max(1,...data.map(q=>Math.max(q[1],q[2])))*1.15:1.15;
 const sx=q=>95+(w-138)*(X(q)-lo)/(hi-lo),sy=v=>plotMode?h-56-v*(h-100)/scale:h/2-v*(h-85)/(2*scale);
 const y0=sy(0);g.strokeStyle='#769390';g.beginPath();g.moveTo(95,28);g.lineTo(95,y0);g.lineTo(w-42,y0);g.stroke();
 g.fillText(plotMode?'MPa':'Scaled',12,30);g.fillText(plotMode?'0.05 Hz':'0 s',94,h-18);g.fillText(plotMode?'100 Hz':data.at(-1)[0].toFixed(3)+' s',w-130,h-18);if(plotMode)g.fillText(scale.toFixed(1),10,60);
 const val=(q,j)=>plotMode?q[j]:q[j]/(j===1?a.strainAmplitude:a.stressAmplitudePa);
 [[1,'#a7e0b9'],[2,'#f0bf7c']].forEach(([i,color])=>{g.beginPath();g.strokeStyle=color;g.lineWidth=2.5;data.forEach((q,j)=>j?g.lineTo(sx(q),sy(val(q,i))):g.moveTo(sx(q),sy(val(q,i))));g.stroke();});
 if(!plotMode){const x=sx([s.phaseDeg/360/s.config.frequencyHz]);g.strokeStyle='#d5dfd9';g.lineWidth=1;g.beginPath();g.moveTo(x,42);g.lineTo(x,h-50);g.stroke();}
}
function save(name,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('json').onclick=()=>{const r=S.read().result;if(r)save('q800-virtual-dma.json',JSON.stringify(r,null,2)+'\n','application/json');};
$('csv').onclick=()=>{const r=S.read().result;if(r)save('q800-strain-stress.csv',csv(r),'text/csv');};
async function model(){
 const c=$('q-model'),renderer=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});renderer.setClearColor('#293840');renderer.setPixelRatio(Math.min(1.6,devicePixelRatio));
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.001,8),controls=new OrbitControls(camera,c);controls.minDistance=.045;controls.maxDistance=4;
 scene.add(new T.HemisphereLight('#eff8ff','#d9c09d',2.15));
 for(const [pt,col,k] of [[[.65,1,.72],'#fff0d5',3.2],[[-.55,.7,-.71],'#c7e3ff',2]]){const n=new T.DirectionalLight(col,k);n.position.set(...pt);scene.add(n);}
 const rootModel=(await new GLTFLoader().loadAsync(root+'q800.glb')).scene;scene.add(rootModel);
 const get=n=>rootModel.getObjectByName(n),cap=get('Furnace_lift'),grip=get('Moving_yoke'),coupon=get('Coupon');
 const render=()=>renderer.render(scene,camera),v={bench:[[.61,.55,.83],[0,.32,0]],grips:[[.057,.345,.339],[-.091,.264,.115]],rear:[[-.59,.49,-.87],[0,.29,0]]};
 draw3=()=>{
  const p=pose(S.read());cap.position.y=p.furnaceLiftM;cap.visible=c.dataset.view!=='grips';grip.position.y=p.movingGripYM;coupon.position.y=p.couponCenterYM;coupon.scale.set(...p.couponDimensionsM);coupon.visible=p.couponVisible;render();
 };
 function view(key){const [a,b]=v[key]??v.bench;camera.position.set(...a);controls.target.set(...b);c.dataset.view=key;controls.update();draw3();}
 document.querySelectorAll('button[data-view]').forEach(e=>e.onclick=()=>view(e.dataset.view));$('reset-view').onclick=()=>view('bench');controls.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(b.width&&b.height){renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=c.getBoundingClientRect(),r=new T.Raycaster();r.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},camera);
  for(const h of r.intersectObject(rootModel,true)){let n=h.object,k=null,hide=false;while(n){if(!n.visible){hide=true;break;}if(!k&&Object.hasOwn(targets,n.name))k=targets[n.name];n=n.parent;}if(k&&!hide){act(k);return;}}
 };
 view('bench');c.dataset.ready='true';$('asset-status').textContent='Metric GLB loaded · documented 460 × 560 mm footprint and 150 mm furnace lift.';
}
refresh();model().catch(e=>{$('asset-status').textContent='3D unavailable: '+e.message+'. The numerical experiment still works.';});
