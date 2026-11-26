import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {dispatch,hitAction} from '../../../../public/equipment/09-04/vr-adapter.mjs';
import {defaults,toCsv,csvSource,jsonSource,importSettings} from '../../../../public/equipment/09-04/solver.mjs';
const root=document.querySelector('#scope09'),$=id=>root.querySelector('#'+id),asset='/equipment/09-04/';
let distalProbe;let connected=true,src=null,r=null,scene,cam,orbit,renderer,model,display,tex,frame=0,view='reset',sourceLabel='';
const state=()=>({source:$('signal').value,sinePeakV:+$('amplitude').value,connected,rate:Number($('rate').value),secDiv:Number($('time').value)/1000,voltsDiv:Number($('scale').value),centerV:Number($('center').value),level:Number($('level').value),edge:$('edge').value,coupling:$('coupling').value,factor:Number($('factor').value)});
function applyOptions(c){for(const [id,k] of Object.entries({signal:'source',amplitude:'sinePeakV',rate:'rate',scale:'voltsDiv',center:'centerV',level:'level',edge:'edge',coupling:'coupling',factor:'factor'}))$(id).value=String(c[k]);$('time').value=String(c.secDiv*1000)}
function status(t,error=false){$('scope-status').textContent=t;$('scope-status').dataset.error=error?'yes':'no'}
function lockResult(){r=null;$('save-csv').disabled=$('save-json').disabled=true;$('cursor-a').disabled=$('cursor-b').disabled=true;$('measurement').textContent='No current capture.';$('cursor-label').textContent='';draw()}
function dirty(){lockResult();status('Settings changed. Press Single acquisition.');syncHardware()}
const eng=(v,unit)=>{if(!Number.isFinite(v))return '—';const a=Math.abs(v);return a!==0&&a<.001?(v*1e6).toFixed(2)+' µ'+unit:a!==0&&a<1?(v*1000).toFixed(3)+' m'+unit:v.toFixed(4)+' '+unit};
function single(){try{if(!$('scope-form').reportValidity()){lockResult();status('Outside supported range.',true);return}const next=dispatch(state(),{type:'single'},src).record;r=next;const m=r.measurements;
 $('cursor-a').max=$('cursor-b').max=String(r.sampling.n-1);$('cursor-a').value=String(r.sampling.triggerIndex);$('cursor-b').value=String(m.secondEdgeIndex??(r.sampling.n-1));
 $('cursor-a').disabled=$('cursor-b').disabled=$('save-csv').disabled=$('save-json').disabled=false;
 $('measurement').textContent='Vpp '+eng(m.peakToPeakV,'V')+'  ·  RMS '+eng(m.rmsV,'V')+'  ·  '+r.sampling.n.toLocaleString()+' samples  ·  trigger at sample '+r.sampling.triggerIndex+'  ·  '+(m.clipCount?m.clipCount+' samples clipped':'no clipping');
 status((m.clipCount?'CLIPPED · ':'')+'Captured '+r.sampleId+' / '+r.contactId+' · revision '+r.revision+'. '+(r.settings.source==='import'?'Imported voltage, reconstructed on selected clock.':'Generated reference signal.'));draw();syncHardware();
 }catch(e){lockResult();status(e.message,true)}}
function draw(){const c=$('scope-trace'),ctx=c.getContext('2d');const W=c.width,H=c.height,L=72,R=W-25,T=24,B=H-44;ctx.fillStyle='#101b22';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#33454f';ctx.lineWidth=1;
 for(let i=0;i<=10;i++){const x=L+(R-L)*i/10,y=T+(B-T)*i/10;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke()}
 ctx.fillStyle='#c5d4d5';ctx.font='16px ui-monospace,monospace';if(!r){ctx.fillText('CH1  ·  waiting for acquisition',L+12,T+25);if(tex)tex.needsUpdate=true;refresh();return}
 const lo=r.settings.centerV-5*r.settings.voltsDiv,hi=lo+10*r.settings.voltsDiv,Y=v=>B-(v-lo)/(hi-lo)*(B-T),X=i=>L+i/(r.sampling.n-1)*(R-L);
 ctx.fillText(eng(hi,'V'),6,T+8);ctx.fillText(eng(lo,'V'),6,B);ctx.fillText(eng(r.timeRelativeS[0],'s'),L,B+27);ctx.textAlign='right';ctx.fillText(eng(r.timeRelativeS.at(-1),'s'),R,B+27);ctx.textAlign='center';ctx.fillText('time relative to trigger',W/2,B+27);ctx.textAlign='left';
 ctx.save();ctx.beginPath();ctx.rect(L,T,R-L,B-T);ctx.clip();ctx.strokeStyle='#f9d668';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<r.voltageV.length;i++){const x=X(i),y=Y(r.voltageV[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore();
 const a=+$('cursor-a').value,b=+$('cursor-b').value;
 for(const [i,col,lab] of [[a,'#74deeb','A'],[b,'#fe9769','B']]){ctx.strokeStyle=col;ctx.fillStyle=col;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(X(i),T);ctx.lineTo(X(i),B);ctx.stroke();ctx.setLineDash([]);ctx.fillText(lab,X(i)+4,T+16)}
 $('cursor-label').textContent='Δt = '+eng((b-a)/r.sampling.rateHz,'s')+'  ·  ΔV = '+eng(r.voltageV[b]-r.voltageV[a],'V');if(tex)tex.needsUpdate=true;refresh()}
function toggle(){connected=dispatch(state(),{type:'connect'}).state.connected;$('plug').textContent=(connected?'Disconnect':'Connect')+' CH1';$('plug').setAttribute('aria-pressed',String(connected));dirty();if(!connected)status('CH1 disconnected. Connect before acquisition.',true)}
function reset(){applyOptions(defaults);connected=true;$('plug').setAttribute('aria-pressed','true');$('plug').textContent='Disconnect CH1';single();syncHardware()}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('acquire').onclick=single;$('restore').onclick=reset;$('plug').onclick=toggle;$('scope-form').addEventListener('input',dirty);$('cursor-a').oninput=$('cursor-b').oninput=draw;
$('save-csv').onclick=()=>r&&download(toCsv(r),'09-04-CH1.csv','text/csv');$('save-json').onclick=()=>r&&download(JSON.stringify({...r,cursors:[+$('cursor-a').value,+$('cursor-b').value]}),'09-04-CH1.json','application/json');
$('input-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>12e6)throw Error('File exceeds 12 MB');const t=await f.text();src=f.name.endsWith('.json')?jsonSource(JSON.parse(t)):csvSource(t,f.name);sourceLabel=f.name;
 applyOptions(importSettings(src));dirty();status('Loaded '+sourceLabel+' · '+src.contact+'. Press Single acquisition.');}catch(err){src=null;$('signal').value='import';lockResult();status(err.message,true)}};
const views={reset:[[.37,.32,.68],[0,.16,0]],front:[[0,.173,.73],[0,.173,0]],controls:[[.179,.188,.40],[.179,.188,.09]],ports:[[-.03,.065,.42],[-.03,.045,.1]],rear:[[-.32,.28,-.62],[0,.155,0]]};
function camera(v){view=v;if(!cam)return;const [p,t]=views[v];cam.position.set(...p);orbit.target.set(...t);orbit.update();refresh()}
for(const b of root.querySelectorAll('[data-view]'))b.onclick=()=>camera(b.dataset.view);
function refresh(){if(renderer&&!frame)frame=requestAnimationFrame(()=>{frame=0;renderer.render(scene,cam)})}
function syncHardware(){if(!model)return;model.traverse(o=>{if(o.name.startsWith('Probe_CH1_'))o.visible=connected});
 const c=state();if(distalProbe)distalProbe.rotation.y=c.source==='comp'?0:-.72;for(const [name,value] of [['Vertical_scale_index',Math.log2(Math.max(c.voltsDiv,1e-6)/.5)],['Timebase_scale_index',Math.log2(Math.max(c.secDiv,1e-5)/.0005)],['Trigger_level_index',c.level-1]]){
 const n=model.getObjectByName(name);if(!n)continue;const knob=model.getObjectByName(name.slice(0,-6));if(!knob)continue;const base=n.userData.rest??(n.userData.rest=n.position.clone());const theta=Number.isFinite(value)?Math.max(-2.5,Math.min(2.5,value*.4)):0;const d=base.clone().sub(knob.position);d.applyAxisAngle(new THREE.Vector3(0,0,1),theta);n.position.copy(knob.position).add(d);n.rotation.z=theta}
 refresh()}
async function modelView(){try{const el=$('scope-3d');renderer=new THREE.WebGLRenderer({canvas:el,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor('#26313a');scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(32,1,.005,5);orbit=new OrbitControls(cam,el);orbit.minDistance=.07;orbit.maxDistance=2;orbit.addEventListener('change',refresh);
 const hemi=new THREE.HemisphereLight(0xffffff,0x829aa7,2.1);scene.add(hemi);for(const [p,f] of [[[1,2,3],2.3],[[-2,1,-1],1.5]]){const light=new THREE.DirectionalLight(0xffffff,f);light.position.set(...p);scene.add(light)}
 const resize=()=>{let w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();refresh()};new ResizeObserver(resize).observe(el);resize();camera(view);
 model=(await new GLTFLoader().loadAsync(asset+'mso64b.glb')).scene;scene.add(model);
 // Swing the distal lead about the seated CH1 plug when the sample is on an external circuit.
 distalProbe=new THREE.Group();distalProbe.name='Probe_routing_pivot';distalProbe.position.set(-.156,.032,.124);model.add(distalProbe);model.updateMatrixWorld(true);
 for(const key of ['Probe_CH1_lead','Probe_CH1_barrel','Probe_CH1_tip']){const part=model.getObjectByName(key);if(part)distalProbe.attach(part)}
 tex=new THREE.CanvasTexture($('scope-trace'));tex.colorSpace=THREE.SRGBColorSpace;display=new THREE.Mesh(new THREE.PlaneGeometry(.34428,.19366),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));display.position.set(-.036,.174,.0938);scene.add(display);
 const picker=new THREE.Raycaster();let down;el.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);el.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=el.getBoundingClientRect();picker.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2),cam);const h=picker.intersectObject(model,true).find(v=>v.object.visible)?.object.name||'';const act=hitAction(h);if(act==='connect')toggle();else if(act==='single')single();else if(act){applyOptions(dispatch(state(),{type:act,direction:e.shiftKey?-1:1}).state);dirty()}});
 $('model-state').textContent='3D model loaded · 4 FlexChannels · metric GLB';syncHardware();draw();
 }catch(err){$('model-state').textContent='3D unavailable here; the acquisition and exports still work. See the rendered reference views.';console.warn(err)}}
fetch(asset+'verification.json').then(x=>x.json()).then(rows=>{const box=$('test-rows');for(const row of rows){const tr=document.createElement('tr');for(const key of ['test','expected','actual','criterion','outcome']){const td=document.createElement('td');td.textContent=row[key];tr.append(td)}box.append(tr)}}).catch(()=>{});
reset();modelView();
const sources={'09-03':{url:'/equipment/09-03/example-waveform.json'},'09-06':{url:'/equipment/09-06/example-waveform.json',params:{rate:256000,secDiv:.0005,level:0,centerV:0,voltsDiv:.125}},'10-01':{url:'/equipment/10-01/primary-example.json',params:{rate:100000,secDiv:.002,level:.05,centerV:.05,voltsDiv:.02}},'09-11':{url:'/equipment/09-11/example-signal.csv',params:{rate:64000,secDiv:.002,level:0,centerV:0,voltsDiv:.00005}}};
const key=new URLSearchParams(location.search).get('from');if(Object.hasOwn(sources,key)){(async()=>{const demo=sources[key];try{const res=await fetch(demo.url);if(!res.ok)throw Error('upstream example not published');const text=await res.text();src=demo.url.endsWith('json')?jsonSource(JSON.parse(text)):csvSource(text,key);applyOptions({...importSettings(src),...demo.params,source:'import'});single()}catch(err){status('Upstream example not available; built-in calibration remains loaded.',true)}})()}

const downstream=$('downstream');fetch('/simulations/equipment/09-11/simulator/',{method:'HEAD'}).then(x=>{if(x.ok){const a=document.createElement('a');a.href='/simulations/equipment/09-11/simulator/?from=09-04';a.textContent='Open this 2 mV capture in the lock-in';downstream.replaceChildren(a)}}).catch(()=>{});
