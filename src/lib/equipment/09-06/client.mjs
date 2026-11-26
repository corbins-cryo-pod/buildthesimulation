import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const solverUrl=new URL('/equipment/09-06/solver.mjs',window.location.origin).href;
const {dispatch,initial,views,toCsv}=await import(/* @vite-ignore */ solverUrl);
const section=document.getElementById('gen336');
const $=id=>section.querySelector('#gen-'+id);
let state=initial(),result=null,sceneUpdate=()=>{};
const colors=['#edba41','#69bf66'],bound={};
function setStatus(msg,err=false){$('status').textContent=msg;$('status').dataset.error=String(err)}
function run(action,value) {
 const answer=dispatch(state,action,value);
 if(!answer.ok){setStatus(answer.message,true);return false;}
 state=answer.state;
 if(answer.result) {result=answer.result;setStatus('Capture '+result.revision+' · '+result.channels[0].samples.length+' points per enabled output.');}
 else if(!['focus'].includes(action)) {result=null;setStatus(action==='load-example'?'Matched load example ready. Select Capture outputs.':'Setting applied. Capture to refresh measurements.');}
 sync();return true;
}
function draw(c, small=false){
 const g=c.getContext('2d'),w=c.width,h=c.height;
 g.fillStyle='#1b272a';g.fillRect(0,0,w,h);
 const pad=small?24:45, top=small?49:22, ph=h-top-pad,pw=w-pad-12;
 g.strokeStyle='#3c5257';g.lineWidth=1;
 for(let i=0;i<=10;i++){const x=pad+i*pw/10;g.beginPath();g.moveTo(x,top);g.lineTo(x,top+ph);g.stroke();}
 for(let i=0;i<=8;i++){const y=top+i*ph/8;g.beginPath();g.moveTo(pad,y);g.lineTo(w-12,y);g.stroke();}
 g.fillStyle='#b8d1d2';g.font=(small?16:13)+'px system-ui';
 if(!small){g.fillText('V',13,top+8);g.fillText(result?((result.channels[0].samples.length-1)*result.dtS*1000).toFixed(2)+' ms':'time',w-90,h-13);g.fillText('0',pad,h-13);}
 if(small){
   g.fillStyle=colors[0];g.font='bold 19px system-ui';g.fillText('CH1 '+(state.powered&&state.channels[0].enabled?'ON':'OFF'),pad,26);
   g.fillStyle=colors[1];g.fillText('CH2 '+(state.powered&&state.channels[1].enabled?'ON':'OFF'),w/2,26);
 }
 if(!result){g.fillStyle='#a6b6b7';g.fillText(state.powered?'Capture for a waveform':'Standby',pad+10,top+30);return;}
 const hi=Math.max(.005,...result.channels.map(ch=>Math.abs(ch.metrics.meanV)+ch.metrics.theoreticalVpp/2))*1.13;
 if(!small){for(const [text,y] of [[hi.toPrecision(3),top+11],['0',top+ph/2],[-Number(hi.toPrecision(3)),top+ph]])g.fillText(text,1,y);}
 for(const ch of result.channels){
   g.strokeStyle=colors[ch.id==='CH1'?0:1];g.lineWidth=small?2:1.6;g.beginPath();
   const n=ch.samples.length,slices=Math.min(pw,n);
   for(let i=0;i<slices;i++){
     const x=pad+i*pw/(slices-1),j=Math.floor(i*(n-1)/(slices-1)),y=top+ph*(.5-.5*ch.samples[j]/hi);
     if(!i)g.moveTo(x,y);else g.lineTo(x,y);
   }
   g.stroke();
 }
}
function asLoad(x){return x==='high'?null:Number(x);}
function asChoice(x){return x===null?'high':String(x);}
function sync(){
 const ch=state.channels[state.focus],read=views(state),v=read[state.focus];
 $('channel').value=state.focus;$('function').value=ch.function;
 $('frequency').value=ch.frequencyHz;$('amp').value=Number(v.amplitudeVpp.toPrecision(10));$('offset').value=Number(v.offsetV.toPrecision(10));
 $('phase').value=ch.phaseDeg;$('duty').value=ch.dutyPct;$('reference').value=asChoice(ch.referenceOhms);$('load').value=asChoice(ch.loadOhms);
 $('clock').value=state.clockHz;$('duration').value=1000*state.durationS;
 for(let i=0;i<2;i++){$('output'+i).setAttribute('aria-pressed',String(state.channels[i].enabled));$('output'+i).textContent='CH'+(i+1)+' output '+(state.channels[i].enabled?'on':'off');}
 $('power').textContent=state.powered?'Enter standby':'Power on';
 $('actual').textContent='CH'+(state.focus+1)+' load: '+v.actualVpp.toFixed(4)+' Vpp · '+v.actualOffsetV.toFixed(4)+' V offset'+(ch.referenceOhms!==ch.loadOhms?' · display/load mismatch':'');
 $('capture').disabled=!state.powered;
 $('json').disabled=$('csv').disabled=!result;
 $('result').textContent=result?result.channels.map(c=>c.id+': '+c.metrics.sampledVpp.toFixed(4)+' Vpp sampled, '+c.metrics.rmsV.toFixed(4)+' V RMS, '+(1000*c.metrics.powerW).toFixed(3)+' mW, '+(c.metrics.nominalFrequencyHz??'DC')+(c.metrics.nominalFrequencyHz?' Hz':'')+'; '+c.events.length+' rising events').join(' | '):'No current capture.';
 draw($('trace'));sceneUpdate();
}
function save(s,name,mime){
 const u=URL.createObjectURL(new Blob([s],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(u),500);
}
for(const [id,action,value] of [['example','load-example'],['capture','capture'],['power','power'],['output0','toggle-output',0],['output1','toggle-output',1]])$(id).addEventListener('click',()=>run(action,value));
$('json').addEventListener('click',()=>result&&save(JSON.stringify(result),'33622a-waveform.json','application/json'));
$('csv').addEventListener('click',()=>result&&save(toCsv(result),'33622a-waveform.csv','text/csv'));
$('channel').addEventListener('change',e=>run('focus',Number(e.target.value)));
$('reference').addEventListener('change',e=>run('configure',{referenceOhms:asLoad(e.target.value)}));
$('load').addEventListener('change',e=>run('configure',{loadOhms:asLoad(e.target.value)}));
for(const [id,key] of [['function','function'],['frequency','frequencyHz'],['amp','amplitudeVpp'],['offset','offsetV'],['phase','phaseDeg'],['duty','dutyPct']])$(id).addEventListener('change',e=>run('configure',{[key]:id==='function'?e.target.value:e.target.valueAsNumber}));
for(const id of ['clock','duration'])$(id).addEventListener('change',()=>run('clock',{clockHz:$('clock').valueAsNumber,durationS:$('duration').valueAsNumber/1000}));
run('load-example');
async function viewer(){
 const host=$('viewer'), scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.004,5);
 const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});
 scene.background=new THREE.Color('#263439');renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));
 renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Orbitable 33622A, use keyboard-accessible controls beside the model');
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.minDistance=.115;controls.maxDistance=1.7;
 const render=()=>renderer.render(scene,camera);
 controls.addEventListener('change',render);
 scene.add(new THREE.HemisphereLight(0xffffff,0x647474,2.4));
 for(const [p,l] of [[[.4,.8,.7],2.6],[[-.3,.5,-.7],1.6]]){const sun=new THREE.DirectionalLight(0xffffff,l);sun.position.fromArray(p);scene.add(sun);}
 const floor=new THREE.GridHelper(.9,18,0x6c8585,0x566d6e);floor.position.y=-.002;scene.add(floor);
 const [gltf,b]=await Promise.all([new GLTFLoader().loadAsync('/equipment/09-06/33622a.glb'),fetch('/equipment/09-06/interaction.json').then(r=>r.json())]);
 const model=gltf.scene;scene.add(model);
 const find=n=>{const hits=[];model.traverse(x=>{if(x.name===n)hits.push(x)});if(hits.length!==1)throw Error('Expected exactly one '+n);return hits[0];};
 find(b.frame.placementAnchor);b.ports.forEach(x=>find(x.node));
 const screen=find('front_lcd'),canvas=document.createElement('canvas');
 canvas.width=512;canvas.height=264;
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const displayFace=new THREE.Mesh(new THREE.PlaneGeometry(.0988,.0508),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
 displayFace.position.z=.00053;screen.add(displayFace);
 const targets=b.controls.map(entry=>{
   const o=find(entry.node),p=new THREE.Mesh(new THREE.BoxGeometry(...entry.targetSizeM),new THREE.MeshBasicMaterial({visible:false}));
   p.name='target_'+entry.id;p.userData.entry=entry;scene.add(p);o.getWorldPosition(p.position);return p;
 });
 scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),vec=new THREE.Vector2(),colorsOrig={};
 for(const cert of b.controls){const o=find(cert.node);if(o.material&&o.material.color){o.material=o.material.clone();colorsOrig[cert.node]=o.material.color.clone();}}
 sceneUpdate=()=>{
  const p=state.powered;
  draw(canvas,true);tex.needsUpdate=true;
  for(const [n,color] of [['front_power','#729c87'],['front_ch1','#b89a41'],['front_ch2','#6dab57']]){
   const c=find(n).material.color;if(p&&(n==='front_power'||state.channels[n==='front_ch1'?0:1].enabled))c.set(color);else c.copy(colorsOrig[n]);
  }
  render();
 };
 function hit(e){
  const r=renderer.domElement.getBoundingClientRect();
  vec.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);
  ray.setFromCamera(vec,camera);
  return ray.intersectObjects(targets,false)[0]?.object.userData.entry;
 }
 let start=[];
 renderer.domElement.addEventListener('pointermove',e=>{const entry=hit(e);renderer.domElement.style.cursor=entry?'pointer':'grab';renderer.domElement.title=entry?.label??'Drag to orbit; scroll to zoom';});
 renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;const entry=hit(e);if(entry)run(entry.action,entry.value);});
 const poses={orbit:[[.38,.27,.48],[0,.046,0]],front:[[0,.075,.49],[0,.05,.10]],rear:[[0,.08,-.53],[0,.05,-.10]],outputs:[[.145,.079,.345],[.059,.026,.13]]};
 function pose(v){camera.position.fromArray(poses[v][0]);controls.target.fromArray(poses[v][1]);controls.update();render();}
 section.querySelectorAll('[data-gen-view]').forEach(n=>n.addEventListener('click',()=>pose(n.dataset.genView)));
 function resize(){const w=host.clientWidth,h=Math.max(12,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
 new ResizeObserver(resize).observe(host);resize();pose('orbit');sceneUpdate();
 // Independent centerline ray test from operator-side approach; no immersive session claim.
 for(const target of targets){const p=target.position.clone();ray.set(p.add(new THREE.Vector3(0,0,.25)),new THREE.Vector3(0,0,-1));const winner=ray.intersectObjects(targets,false)[0]?.object;if(winner!==target)throw Error('3D interaction target obstructed: '+target.name);}
 $('3d-status').textContent='3D asset loaded · true scale · '+targets.length+' validated front-panel targets';
 $('3d-status').dataset.loaded='true';
}
viewer().catch(err=>{$('3d-status').textContent='3D view unavailable: '+err.message+'; all numerical controls still work.';$('viewer').style.display='none';});
