import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const asset='/equipment/09-11/';
import {parseCSV} from '../../../../public/equipment/09-11/solver.mjs';
import {createStation,interactionMap} from '../../../../public/equipment/09-11/station.mjs';
async function boot(){
const station=createStation(),$=id=>document.getElementById(id),form=$('settings'),els=form.elements;
let draw3=()=>{},sceneRoot=null,activeInput=null;const num=['ampUv','signalHz','signalPhase','refHz','refPhase','tauMs','poles','durationMs','rangeMv','interfererUv','interfererHz'];
function status(msg,bad=false){$('status').textContent=msg;$('status').classList.toggle('error',bad)}
function syncForm(){const s=station.read();for(const [k,v] of Object.entries(s.config)){if(els.namedItem(k))els.namedItem(k).value=String(v)}
 for(const n of ['ampUv','signalHz','signalPhase','durationMs','interfererUv','interfererHz','signalId'])els.namedItem(n).disabled=s.config.source==='import';
 $('cable').textContent=s.config.connected?'Disconnect A':'Connect A';$('cable').setAttribute('aria-pressed',String(s.config.connected));
}
function action(name,arg,notice){const s=station.dispatch(name,arg);syncForm();drawAll();
 if(s.error)status(s.error.message,true);else if(s.result)status('Acquisition complete · '+s.result.signalId+' / revision '+s.result.revision);else if(notice)status(notice);return s}
function readForm(){const o={source:els.source.value,signalId:els.signalId.value};for(const n of num)o[n]=els[n].value===''?NaN:Number(els[n].value);return o}
function meters(r){return r?[...['xV','yV','rV'].map(k=>(r.final[k]*1e6).toFixed(2)+' µV'),r.final.phaseDeg===null?'undefined':r.final.phaseDeg.toFixed(2)+'°']:['—','—','—','—']}
function drawAll(){
 const s=station.read(),r=s.result;document.querySelectorAll('[data-meter]').forEach((e,i)=>e.textContent=meters(r)[i]);$('csv').disabled=$('json').disabled=!r;
 $('stats').textContent=r?'X (green) and Y (amber) versus time. '+r.sampleCount.toLocaleString()+' integrated samples at '+r.sampleRateHz.toFixed(1)+' Hz; display stride '+r.displayStride+'. ENBW '+r.filter.enbwHz.toPrecision(4)+' Hz. 1% step settling: '+(r.filter.onePercentStepTimeS*1000).toFixed(1)+' ms ('+(r.filter.startupWindowElapsed?'startup interval elapsed':'record too short for 1% step settling')+').':'No current output. Acquire after a connection or setting changes.';
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#182428';g.fillRect(0,0,w,h);g.fillStyle='#d9e1d6';g.font='18px sans-serif';if(!r){g.fillText('Acquire to display X and Y.',24,38);draw3();return}
 const rows=r.trace,highest=Math.max(1e-12,...rows.flatMap(q=>[Math.abs(q[2]),Math.abs(q[3])]))*1.08,lo=rows[0][0],hi=rows.at(-1)[0];
 const x=t=>78+(w-112)*(t-lo)/(hi-lo),y=v=>h/2-v*(h-70)/(highest*2);
 g.strokeStyle='#607277';g.lineWidth=1;g.beginPath();g.moveTo(78,h/2);g.lineTo(w-26,h/2);g.stroke();
 g.fillText('+'+(highest*1e6).toPrecision(3)+' µV',6,29);g.fillText('0',46,h/2+5);g.fillText('−'+(highest*1e6).toPrecision(3),6,h-28);g.fillText('0 ms',78,h-7);g.fillText(((hi-lo)*1000).toFixed(1)+' ms',w-155,h-7);
 for(const [i,color] of [[2,'#97e3c1'],[3,'#f3c07a']]){g.strokeStyle=color;g.lineWidth=3;g.beginPath();rows.forEach((row,j)=>j?g.lineTo(x(row[0]),y(row[i])):g.moveTo(x(row[0]),y(row[i])));g.stroke()}draw3()
}
form.oninput=()=>{station.dispatch('configure',readForm());if(els.source.value==='import'&&activeInput)station.dispatch('loadWaveform',activeInput);for(const n of ['ampUv','signalHz','signalPhase','durationMs','interfererUv','interfererHz','signalId'])els[n].disabled=els.source.value==='import';drawAll();status('Settings changed; acquire a new measurement.')};
$('run').onclick=()=>action('acquire');$('phase90').onclick=()=>action('phase90',null,'Reference phase stepped by +90°.');$('cable').onclick=()=>action('toggleCable',null,'Input connection changed.');
$('example').onclick=()=>{activeInput=null;$('input-file').textContent='';action('defaults');action('acquire')};
$('beat').onclick=()=>{action('defaults');action('configure',{signalHz:1050,refHz:1000,signalPhase:0,durationMs:400},'50 Hz difference tone loaded; acquire to see X/Y rotate.')};
function load(txt,filename){let wave;try{wave=filename.endsWith('.json')?JSON.parse(txt):parseCSV(txt,els.signalId.value||'CSV-INPUT');if(wave?.schema!=='bts.waveform.voltage.v1'||!Array.isArray(wave.volts)||wave.volts.length<32||wave.volts.length>160000)throw Error('Not a supported uniformly sampled voltage waveform.');activeInput=wave;action('loadWaveform',wave,'Waveform loaded; acquire to demodulate.');$('input-file').textContent=filename+' · '+wave.signalId+' · '+wave.volts.length+' samples.'}
 catch(e){activeInput=null;action('loadWaveform',null);$('input-file').textContent='';status('Import rejected: '+e.message,true)}}
$('upload').onchange=async()=>{const f=$('upload').files?.[0];if(!f)return;if(f.size>3e6){activeInput=null;action('loadWaveform',null);status('File exceeds 3 MB.',true);return};load(await f.text(),f.name);$('upload').value=''};
$('load-file-example').onclick=async()=>{try{const r=await fetch(asset+'example-signal.csv');if(!r.ok)throw Error(r.status);load(await r.text(),'example-signal.csv')}catch(e){status('Example unavailable: '+e.message,true)}};
async function loadScope(){
 // The first URL always resolves to the actual scope export when both releases are live.
 // An identical, locally archived fixture permits the exercise during staggered deployments.
 for(const candidate of ['/equipment/09-04/example-lockin-capture.csv',asset+'scope-capture.csv']){
  try{const r=await fetch(candidate);if(!r.ok)continue;const body=await r.text();if(!body.includes('time_s,voltage_V')||!body.startsWith('#'))continue;
   action('defaults');load(body,'09-04 / example-lockin-capture.csv');if(!activeInput)continue;
   action('acquire');return;
  }catch{}
 }
 status('Could not load the 09-04 capture. Upload a two-column scope export instead.',true)
}
$('load-scope').onclick=loadScope;
function save(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('json').onclick=()=>{const r=station.read().result;if(r)save('sr860-measurement.json',JSON.stringify(r,null,2),'application/json')};
$('csv').onclick=()=>{const r=station.read().result;if(r)save('sr860-demodulated.csv',['# sampleId='+r.signalId,'# contactId='+r.contactId,'# revision='+r.revision,'# kind=simulated demodulation',r.columns.join(','),...r.trace.map(q=>q.map(v=>v===null?'':v).join(','))].join('\n')+'\n','text/csv')};
syncForm();drawAll();if(new URLSearchParams(location.search).get('from')==='09-04')await loadScope();
try{
 const el=$('inst'),renderer=new T.WebGLRenderer({canvas:el,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));renderer.setClearColor('#253139');renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(31,1,.003,8),ctrl=new OrbitControls(cam,el);ctrl.minDistance=.11;ctrl.maxDistance=2.4;ctrl.enablePan=true;
 scene.add(new T.HemisphereLight(0xfafcf9,0xb7ab98,2.15));const light=new T.DirectionalLight(0xfff1d9,2.2);light.position.set(.4,.8,.7);scene.add(light);const back=new T.DirectionalLight(0xd5f1ff,1.5);back.position.set(-.6,.45,-.55);scene.add(back);
 const rend=()=>renderer.render(scene,cam),views={orbit:[[.47,.29,.76],[0,.06,0]],front:[[0,.069,1.11],[0,.067,0]],rear:[[0,.069,-1.11],[0,.067,0]],input:[[-.11,.082,.54],[-.16,.037,.21]]};
 function view(v){const [p,t]=views[v]||views.orbit;cam.position.fromArray(p);ctrl.target.fromArray(t);ctrl.update();rend();el.dataset.view=v}
 ctrl.addEventListener('change',rend);document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('reset-view').onclick=()=>view('orbit');
 const resize=()=>{const b=el.parentElement.getBoundingClientRect();renderer.setSize(Math.max(1,b.width),Math.max(1,b.height),false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();rend()};new ResizeObserver(resize).observe(el.parentElement);view('orbit');
 const gltf=await new GLTFLoader().loadAsync(asset+'sr860.glb');sceneRoot=gltf.scene;scene.add(sceneRoot);
 const plug=sceneRoot.getObjectByName('Input_A_plug'),knob=sceneRoot.getObjectByName('Knob_phase'),surface=sceneRoot.getObjectByName('Screen_active');if(!surface||!plug||!knob)throw Error('Missing named interaction node');
 const screen=document.createElement('canvas');screen.width=640;screen.height=480;const tex=new T.CanvasTexture(screen);tex.colorSpace=T.SRGBColorSpace;surface.material=new T.MeshBasicMaterial({map:tex});const g=screen.getContext('2d');
 draw3=()=>{const s=station.read();plug.visible=s.config.connected;knob.rotation.z=-s.config.refPhase*Math.PI/180;g.fillStyle='#0a1118';g.fillRect(0,0,640,480);g.fillStyle='#e5e8eb';g.font='bold 23px sans-serif';g.fillText('SR860   ·   '+s.config.refHz+' Hz    /    '+s.config.tauMs+' ms',14,33);
 const values=meters(s.result);['X','Y','R','θ'].forEach((k,i)=>{const x=16+(i%2)*315,y=81+Math.floor(i/2)*142;g.fillStyle=['#8de683','#74dafa','#eee16e','#ecab73'][i];g.font='26px sans-serif';g.fillText(k,x,y);g.font='bold 39px sans-serif';g.fillText(values[i],x,y+58)});g.fillStyle='#d7e4dc';g.font='23px sans-serif';g.fillText(s.config.connected?'A CONNECTED   ·   CLASSIC RC':'A DISCONNECTED',18,405);g.fillText(s.result?'SIMULATED ACQUISITION':'READY / NO ACQUISITION',18,447);tex.needsUpdate=true;rend()};
 let down;el.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);el.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:(e.clientX-b.left)/b.width*2-1,y:-(e.clientY-b.top)/b.height*2+1},cam);const found=ray.intersectObject(sceneRoot,true).find(h=>h.object.visible&&h.object.parent?.visible);let n=found?.object;while(n&&!interactionMap[n.name])n=n.parent;if(n)action(interactionMap[n.name],null,'Instrument control changed.')});
 draw3();$('load-status').textContent='Metric GLB loaded · 296 named nodes · 103 KiB. Reference-informed exterior, not factory CAD.';el.dataset.ready='true';
}catch(e){$('load-status').textContent='3D model unavailable here ('+e.message+'). The experiment, trace and exports still run.'}

}
boot().catch(e=>{document.getElementById("status").textContent="Station failed to initialize: "+e.message});
