import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function boot(){
const base='/equipment/10-01/', $=id=>document.querySelector('#mc-'+id);
const stationUrl=base+'station.mjs';
const {station}=await import(/* @vite-ignore */ stationUrl);
const api=station(), ctrlNames=['holding','step','durationMs','rmMOhm','cmPf','rsMOhm','gain','sampleId'];
let diagramTexture,visualSync=()=>{},lastSummary='';
function msg(s,err=false){$('status').textContent=s;$('status').dataset.err=String(err);}
function act(a,v){try{const s=api.dispatch(a,v);msg(a==='run'?'Sweep complete. The monitor and both export files are current.':a==='example'?'Example restored. Run sweep to record.':'Settings changed. Run a fresh sweep.');return s}catch(e){sync(api.snapshot());msg(e.message,true)}}
function draw(r){
 const c=$('plot'),ctx=c.getContext('2d'),w=c.width,h=c.height;
 ctx.fillStyle='#202d33';ctx.fillRect(0,0,w,h);ctx.font='18px system-ui';ctx.fillStyle='#f7edcf';
 if(!r){ctx.fillText('AWAITING SWEEP',54,92);if(diagramTexture)diagramTexture.needsUpdate=true;return}
 const IC=r.parameters.mode==='IC',col=r.columns,vals=(IC?col.electrodeV:col.currentA),scale=IC?1e3:1e12,tmax=col.timeS.at(-1)*1000;
 let lo=0,hi=0;for(const x of vals){lo=Math.min(lo,x*scale);hi=Math.max(hi,x*scale)}if(hi===lo){hi+=1;lo-=1}
 const xa=83,xb=w-30,ya=49,yb=188,xd=i=>xa+(xb-xa)*i/(vals.length-1),yd=x=>yb-(x-lo)*(yb-ya)/(hi-lo);
 ctx.font='17px system-ui';for(let i=0;i<=4;i++){let f=i/4,x=xa+(xb-xa)*f;ctx.strokeStyle='#435157';ctx.beginPath();ctx.moveTo(x,ya);ctx.lineTo(x,251);ctx.stroke();ctx.fillStyle='#e3e0d0';ctx.fillText(Number((tmax*f).toFixed(2))+'',x-6,274)}
 ctx.fillStyle='#eedbaa';ctx.fillText('CH 1  ·  '+(IC?'ELECTRODE VOLTAGE (mV)':'CLAMP CURRENT (pA)'),xa,27);
 for(const [v,y] of [[hi,ya],[lo,yb]])ctx.fillText(Number(v.toPrecision(4))+'',4,y+5);
 // Retain min/max within each pixel column so a fast VC peak never disappears.
 ctx.strokeStyle='#79e0ce';ctx.lineWidth=2;ctx.beginPath();const stride=Math.max(1,Math.floor(vals.length/(xb-xa)));
 for(let i=0;i<vals.length;i+=stride){let mn=i,mx=i;for(let j=i+1;j<Math.min(vals.length,i+stride);j++){if(vals[j]<vals[mn])mn=j;if(vals[j]>vals[mx])mx=j}
  for(const k of [i,Math.min(mn,mx),Math.max(mn,mx),Math.min(vals.length-1,i+stride-1)]){ctx[i===0&&k===0?'moveTo':'lineTo'](xd(k),yd(vals[k]*scale))}}
 ctx.stroke();ctx.fillStyle='#e4c48b';ctx.fillText('CMD',8,230);ctx.strokeStyle='#e4c48b';ctx.beginPath();
 const yv=v=>230-(r.parameters.step===0?0:(v-r.parameters.holding*(IC?1e-12:1e-3))/Math.abs(r.parameters.step*(IC?1e-12:1e-3))*13);
 for(let i=0;i<vals.length;i++){if(i&&i<vals.length-1&&col.commandSI[i]===col.commandSI[i-1]&&col.commandSI[i]===col.commandSI[i+1])continue;ctx[i?'lineTo':'moveTo'](xd(i),yv(col.commandSI[i]))}ctx.stroke();ctx.fillText('time (ms)',w-120,290);
 if(diagramTexture)diagramTexture.needsUpdate=true;
}
function sync(s){
 $('mode').value=s.params.mode;for(const key of ctrlNames){const v=s.params[key],el=$(key);if(document.activeElement!==el||String(v)!==el.value&&Number(el.value)!==v)el.value=Number.isNaN(v)?'':String(v)}
 document.querySelectorAll('.command-unit').forEach(el=>el.textContent=s.params.mode==='IC'?' (pA)':' (mV)');
 $('power').textContent='Power: '+(s.powered?'on':'off');$('power').setAttribute('aria-pressed',s.powered);
 $('load').textContent=s.params.connected?'Disconnect CELL':'Connect CELL';$('load').setAttribute('aria-pressed',s.params.connected);
 const r=s.result;lastSummary=r?'τ = '+Number(r.summary.tauMs.toPrecision(6))+' ms · '+(r.parameters.mode==='IC'?'equilibrium electrode voltage '+Number((r.summary.settledPrimarySI*1000).toPrecision(6))+' mV':'equilibrium leak current '+Number((r.summary.settledPrimarySI*1e12).toPrecision(6))+' pA')+' · '+r.columns.timeS.length.toLocaleString()+' simulated samples · '+r.summary.clippedSamples+' clipped.':'No current trace. Run sweep to record.';
 $('result').textContent=lastSummary;$('wave').disabled=$('all').disabled=!r;draw(r);visualSync(s);
}
api.subscribe(sync);sync(api.snapshot());
$('power').onclick=()=>act('power');$('load').onclick=()=>act('load');$('example').onclick=()=>act('example');$('run').onclick=()=>act('run');$('mode').onchange=e=>act('mode',e.target.value);
for(const k of ctrlNames){const f=$(k);f.addEventListener(k==='gain'?'change':'input',()=>act('set',{[k]:k==='sampleId'?f.value:f.value===''?NaN:Number(f.value)}))}
function save(kind){const r=api.snapshot().result;if(!r)return;const value=kind==='wave'?api.export():r;const blob=new Blob([JSON.stringify(value)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.sampleId.replace(/[^\w-]/g,'_')+'-r'+r.revision+(kind==='wave'?'-primary':'-sweep')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('wave').onclick=()=>save('wave');$('all').onclick=()=>save('all');

async function mount(){
 const box=$('view'),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power',alpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.xr.enabled=true;box.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#2a3740');const camera=new THREE.PerspectiveCamera(36,1,.008,14);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=false;orbit.minDistance=.045;orbit.maxDistance=1.9;orbit.maxPolarAngle=Math.PI*.94;
 const group=new THREE.Group();scene.add(group);const light=new THREE.HemisphereLight(0xf0f5ff,0xabbab7,2.4);scene.add(light);
 const lamp=new THREE.DirectionalLight(0xffefe2,2.5);lamp.position.set(-1,2,1);scene.add(lamp);
 const model=(await new GLTFLoader().loadAsync(base+'multiclamp.glb')).scene;group.add(model);
 const presets={full:[[.39,.36,.76],[0,.045,.065]],face:[[.01,.135,.68],[0,.055,.145]],cell:[[.184,.116,.405],[.098,.015,.252]],rear:[[-.18,.24,-.69],[0,.055,-.105]]};
 function view(key){const [p,t]=presets[key];camera.position.fromArray(p);orbit.target.fromArray(t);if(box.clientWidth<450&&key==='full'){camera.position.multiplyScalar(1.2)}orbit.update();needs=true}
 let needs=true;function resize(){let w=box.clientWidth,h=box.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();needs=true}}
 const ro=new ResizeObserver(resize);ro.observe(box);resize();view('full');document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>view(el.dataset.view));
 const floor=new THREE.Mesh(new THREE.BoxGeometry(.78,.01,.7),new THREE.MeshStandardMaterial({color:0x536068,roughness:.94}));floor.position.y=-.006;group.add(floor);
 const hit=[],specs=[['POWER_switch','power',.014],['PATCH1U_load','load',.027]];
 for(const [name,action,radius] of specs){const part=model.getObjectByName(name);if(!part)throw Error('Missing mesh '+name);const geom=new THREE.Mesh(new THREE.SphereGeometry(radius,8,6),new THREE.MeshBasicMaterial({visible:false}));geom.name=name+'_rayTarget';geom.userData={action,label:name};if(name==='PATCH1U_load')geom.position.y=.015;part.add(geom);hit.push(geom)}
 const load=model.getObjectByName('PATCH1U_load'),home=load.position.clone(),power=model.getObjectByName('POWER_switch');const lamps={};for(const key of ['CH1_IC_LED','CH1_VC_LED','CH1_OL_LED','POWER_lamp','STATUS_lamp']){const m=model.getObjectByName(key);m.material=m.material.clone();lamps[key]=m}
 const vrPanel=new THREE.Group();group.add(vrPanel);vrPanel.visible=false;
 function labelPlane(name,title,x,y,action,value){
  const c=document.createElement('canvas');c.width=384;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#23343c';cx.fillRect(0,0,c.width,c.height);cx.strokeStyle='#cfb57c';cx.lineWidth=5;cx.strokeRect(3,3,378,122);cx.fillStyle='#fff3d9';cx.font='bold 36px sans-serif';cx.textAlign='center';cx.fillText(title,192,76);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const o=new THREE.Mesh(new THREE.PlaneGeometry(.108,.036),new THREE.MeshBasicMaterial({map:tex}));o.name=name;o.position.set(x,y,-.05);o.userData={action,value,label:title};vrPanel.add(o);hit.push(o);
 }
 for(const [i,entry] of [['IC','ui_mode_IC','mode','IC'],['VC','ui_mode_VC','mode','VC'],['Run sweep','ui_run','run',null]].entries())labelPlane(entry[1],entry[0],(i-1)*.118,.17,entry[2],entry[3]);
 diagramTexture=new THREE.CanvasTexture($('plot'));diagramTexture.colorSpace=THREE.SRGBColorSpace;
 const monitor=new THREE.Mesh(new THREE.PlaneGeometry(.40,.106),new THREE.MeshBasicMaterial({map:diagramTexture}));monitor.position.set(0,.26,-.05);vrPanel.add(monitor);
 const ray=new THREE.Raycaster();function select(){const found=ray.intersectObjects(hit.filter(o=>o.parent!==vrPanel||vrPanel.visible),false)[0];if(found){act(found.object.userData.action,found.object.userData.value);return true}return false}
 let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height),camera);select()});
 for(let i=0;i<2;i++){const c=renderer.xr.getController(i);scene.add(c);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.2)]),new THREE.LineBasicMaterial({color:0xefc97d}));c.add(line);c.addEventListener('selectstart',()=>{const rot=new THREE.Matrix4().extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rot).normalize();select()})}
 const vr=$('vr');if(navigator.xr){try{if(await navigator.xr.isSessionSupported('immersive-vr')){vr.hidden=false;vr.onclick=async()=>{try{const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});await renderer.xr.setSession(s)}catch(e){msg('VR unavailable: '+e.message,true)}}}}catch{}}
 renderer.xr.addEventListener('sessionstart',()=>{group.position.set(0,.88,-.55);vrPanel.visible=true;needs=true});renderer.xr.addEventListener('sessionend',()=>{group.position.set(0,0,0);vrPanel.visible=false;view('full')});
 visualSync=s=>{load.position.copy(home);if(!s.params.connected)load.position.z+=.018;power.rotation.x=s.powered?0:.38;for(const [k,m] of Object.entries(lamps)){const on=s.powered&&(k==='POWER_lamp'||k==='STATUS_lamp'||k==='CH1_'+s.params.mode+'_LED'||k==='CH1_OL_LED'&&s.result?.summary.clippedSamples>0);const col=k.includes('OL')?0xff8840:0x40e084;m.material.color.setHex(on?col:0x253030);m.material.emissive.setHex(on?col:0x000000);m.material.emissiveIntensity=on?.3:0}needs=true};
 visualSync(api.snapshot());orbit.addEventListener('change',()=>{needs=true});renderer.setAnimationLoop(()=>{if(needs||renderer.xr.isPresenting){renderer.render(scene,camera);needs=false}});box.dataset.ready='true';$('model').textContent='3D instrument loaded · 1:1 scale · orbit/zoom enabled.';
}
mount().catch(e=>{$('view').querySelector('canvas')?.remove();$('model').textContent='Original render shown. 3D viewer unavailable: '+e.message+'. The experiment still runs.'});

}
boot().catch(e=>{document.querySelector("#mc-status").textContent="Station unavailable: "+e.message});
