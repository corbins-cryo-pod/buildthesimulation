import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

export async function mount(root){
 const $=id=>root.querySelector('#'+id),status=$('eb-status'),view=$('eb-view');
 const solverUrl='/equipment/02-05/solver.mjs';
 const S=await import(/* @vite-ignore */ solverUrl);
 const {defaults,example,frame,solve,validate,advance,transitions,exportResult,pointAcceptance,doseAt,estimate}=S;
 let state='idle',result=null,active=null,busy=false,run=0,events=[],model=null,renderer=null,camera=null,controls=null,scene=null,parts={},cutaway=false;
 let lastPattern=null,lastParams=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const positions={
  whole:[[3.6,2.65,4.0],[.12,1.16,-.19]],
  front:[[.08,1.45,4.1],[.08,1.22,0]],
  side:[[4.1,1.55,.05],[.12,1.2,-.1]],
  rear:[[2.8,2.4,-3.8],[.15,1.2,-.2]],
  lock:[[1.24,1.84,1.42],[.36,1.54,.20]],
  stage:[[.15,1.80,1.0],[-.31,1.12,.02]],
  holder:[[.9,2.08,.83],[.36,1.665,.2]],
 };
 const labels={vent:'Vent load lock',open:'Open door',mount:'Mount sample',align:'Prealign holder',seal:'Close door',pump:'Pump down',transfer:'Transfer to stage',write:'Expose pattern',finish:'Finish write',return:'Return to cassette',unload:'Unload sample'};
 const actions=['vent','open','mount','align','seal','pump','transfer','write','return','unload'];
 const inputs=Object.keys(defaults);
 for(const k of inputs)$( 'eb-'+k).value=defaults[k];
 $('eb-pattern').value=JSON.stringify(example,null,2);
 function parameters(){return Object.fromEntries(inputs.map(k=>[k,Number($('eb-'+k).value)]));}
 function pattern(){return JSON.parse($('eb-pattern').value);}
 function config(){const p=pattern(),c=parameters();validate(p,c);return {p,c};}
 function say(text,error=false){status.textContent=text;status.dataset.error=error?'true':'false';}
 function download(name,data,mime='application/json'){
  const blob=data instanceof Blob?data:new Blob([data],{type:mime}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);
 }
 function updateModel(){
  if(!model)return;
  const opened=['open','mounted','aligned','unload-vented','unloaded'].includes(state);
  parts['lock-door'].rotation.y=opened?-Math.PI*.62:0;
  parts['chamber-cover'].visible=!cutaway;
  const atStage=['ready','writing','complete'].includes(state);
  const out=['open','mounted','aligned','unload-vented','unloaded'].includes(state);
  const holder=parts['sample-holder'];
  holder.position.set(...(atStage?[-.266,1.04,.004]:out?[.36,1.47,.54]:[.36,1.665,.20]));
  holder.visible=state!=='idle';
  parts['sample-chip'].visible=!['idle','vented','open','unloaded'].includes(state);
  parts['resist-layer'].visible=parts['sample-chip'].visible;
  parts['beam-indicator'].visible=state==='writing'&&cutaway;
  parts['beam-indicator'].scale.setScalar(1);
  parts['lamp-0'].material.emissive.setHex(state==='writing'?0x0aaa55:0x000000);
  // Virtual stage is intentionally stationary at the centered field; its actual travel is not animated at exaggerated scale.
  if(renderer)renderer.render(scene,camera);
 }
 function refresh(){
  $('eb-state').textContent=state.replaceAll('-',' ').toUpperCase();
  for(const a of actions){const btn=root.querySelector('[data-step="'+a+'"]');btn.disabled=busy||!transitions[state]?.[a];}
  $('eb-auto').disabled=busy||state==='writing';
  $('eb-reset').disabled=busy;
  for(const k of inputs)$('eb-'+k).disabled=busy;
  $('eb-pattern').disabled=busy;
  $('eb-example').disabled=busy;
  $('eb-export').disabled=!result||busy;
  $('eb-csv').disabled=!result||busy;
  $('eb-progress').value=state==='complete'||state==='returned'||state==='unload-vented'||state==='unloaded'?100:state==='writing'?$('eb-progress').value:0;
  updateModel();
 }
 function invalidate(){
  result=null;active=null;lastPattern=null;lastParams=null;
  $('eb-result').textContent='No committed exposure. Run the configured experiment.';
  $('eb-progress').value=0;
  for(const id of ['eb-dose-map','eb-mask-map']){const ctx=$(id).getContext('2d');ctx.fillStyle='#152029';ctx.fillRect(0,0,256,256);}
  refresh();
 }
 function reset(){if(busy)return;state='idle';events=[];invalidate();say('Ready. Vent the load lock or run the example sequence.');}
 function setState(a){state=advance(state,a);events.push({action:a,state,at:new Date().toISOString()});refresh();}
 function showResult(out,p,c){
  lastPattern=clone(p);lastParams={...c};result=out;
  const t=out.timing;
  $('eb-result').textContent='Peak '+out.peak.toFixed(2)+' µC/cm² eq. · predicted cleared area '+out.clearedUm2.toFixed(4)+' µm² · ideal beam-on '+t.beamOnS.toFixed(4)+' s · charge '+(t.chargeC*1e9).toPrecision(4)+' nC · '+t.shots.toLocaleString()+' estimated shots · minimum mean dwell '+t.minDwellNs.toFixed(2)+' ns';
  const n=frame.n,peak=Math.max(out.peak,c.threshold,1);
  for(const [id,mask] of [['eb-dose-map',false],['eb-mask-map',true]]){
   const ctx=$(id).getContext('2d'),im=ctx.createImageData(n,n);
   for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const k=j*n+i,u=((n-1-j)*n+i)*4,v=Math.min(1,out.map[k]/peak);
    const rgb=mask?(out.mask[k]?[228,222,198]:[22,32,41]):[Math.round(24+230*v),Math.round(39+160*v*v),Math.round(68+95*(1-v)*v)];
    im.data.set([...rgb,255],u);
   }ctx.putImageData(im,0,0);
   if(!mask){ctx.strokeStyle='#71e6ef';ctx.lineWidth=.65;ctx.beginPath();
    for(const [x,y,x1,y1] of out.contour){ctx.moveTo((x-frame.originUm[0])/frame.stepUm,n-(y-frame.originUm[1])/frame.stepUm);ctx.lineTo((x1-frame.originUm[0])/frame.stepUm,n-(y1-frame.originUm[1])/frame.stepUm);}ctx.stroke();}
  }
  $('eb-scale').textContent='Dose scale: 0–'+peak.toFixed(1)+' µC/cm² equivalent. Cyan: predicted clearing boundary. Field of view 1.28 × 1.28 µm; 5 nm pixels.';
  refresh();
 }
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function expose(){
  const {p,c}=config();
  setState('write');busy=true;refresh();say('Calculating normalized deposited-dose field; animation is accelerated.');
  try{
   await wait(50);const out=solve(p,c);
   const time=performance.now(),duration=1800;
   while(performance.now()-time<duration){$('eb-progress').value=Math.min(99,(performance.now()-time)/duration*100);await wait(35);}
   setState('finish');active='run-'+Date.now()+'-'+(++run);showResult(out,p,c);say('Exposure complete. The sample is exposed, not developed. Return holder, vent and unload.');
  }catch(e){state='ready';say(e.message,true);throw e;}finally{busy=false;refresh();}
 }
 async function step(a){
  if(busy)return;
  try{
   if(a==='mount'||a==='transfer')config();
   if(a==='write'){await expose();return;}
   setState(a);
   say(labels[a]+' → '+state.replaceAll('-',' ')+'.');
  }catch(e){say(e.message,true);}
 }
 for(const a of actions)root.querySelector('[data-step="'+a+'"]').addEventListener('click',()=>step(a));
 $('eb-auto').addEventListener('click',async()=>{
  if(busy)return;try{config();reset();busy=true;refresh();for(const a of ['vent','open','mount','align','seal','pump','transfer']){setState(a);say(labels[a]+' · time compressed');await wait(180);}
  busy=false;await expose();for(const a of ['return','vent','unload']){busy=true;setState(a);await wait(180);}say('Example completed and unloaded. Export the exposed resist revision.');}
  catch(e){say(e.message,true);}finally{busy=false;refresh();}
 });
 $('eb-reset').addEventListener('click',reset);
 $('eb-example').addEventListener('click',()=>{for(const k of inputs)$('eb-'+k).value=defaults[k];$('eb-pattern').value=JSON.stringify(example,null,2);reset();});
 for(const el of [...inputs.map(k=>$('eb-'+k)),$('eb-pattern')])el.addEventListener('input',()=>{if(!busy){reset();say('Configuration changed. Prior exposure cleared; re-run the sequence.');}});
 $('eb-export').addEventListener('click',()=>{if(result)download('ebpg-'+active+'.json',JSON.stringify(exportResult(lastPattern,lastParams,result,active,events)));});
 $('eb-csv').addEventListener('click',()=>{if(!result)return;const rows=['sample_id,run_id,x_um,y_um,dose_uC_cm2_equiv,predicted_clear'];for(let j=0;j<frame.n;j++)for(let i=0;i<frame.n;i++){const k=j*frame.n+i;rows.push([JSON.stringify(lastPattern.sampleId.replaceAll('"','""')),active,(frame.originUm[0]+(i+.5)*frame.stepUm).toFixed(5),(frame.originUm[1]+(j+.5)*frame.stepUm).toFixed(5),result.map[k].toFixed(6),result.mask[k]].join(','));}download('ebpg-'+active+'.csv',rows.join('\n'),'text/csv');});
 for(const id of ['eb-dose-map','eb-mask-map'])$(id).addEventListener('pointermove',e=>{if(!result)return;const r=e.currentTarget.getBoundingClientRect(),i=Math.min(255,Math.max(0,Math.floor((e.clientX-r.left)/r.width*256))),j=255-Math.min(255,Math.max(0,Math.floor((e.clientY-r.top)/r.height*256)));$('eb-probe').textContent='x '+(frame.originUm[0]+(i+.5)*frame.stepUm).toFixed(4)+' µm · y '+(frame.originUm[1]+(j+.5)*frame.stepUm).toFixed(4)+' µm · '+result.map[j*256+i].toFixed(2)+' µC/cm² eq.';});
 // Executable verification. Expected values and tolerances are fixed before evaluation.
 const a=pointAcceptance(),q={...example,rectangles:[{id:'square',x:-.007,y:-.007,w:.014,h:.014,factor:1}]},g=doseAt(q,{...defaults,eta:0,dose:100},0,0),t=estimate({...example,rectangles:[{id:'unit',x:0,y:0,w:1,h:1,factor:1}]},{...defaults,dose:100,current:1});
 const checks=[['Point mass, padded two-scale grids',2,a.combined,1e-6,'unit dose'],['Point linearity',0,a.maxResidual,1e-12,'unit dose/cell'],['Gaussian square center, erf(1)² × 100',71.01446926,g,1e-4,'µC/cm² eq.'],['1 µm², 100 µC/cm², 1 nA',.001,t.beamOnS,1e-12,'s'],['Double current',.0005,estimate({...example,rectangles:[{id:'unit',x:0,y:0,w:1,h:1,factor:1}]},{...defaults,dose:100,current:2}).beamOnS,1e-12,'s']];
 for(const [name,expected,actual,tol,unit] of checks){const tr=document.createElement('tr');for(const v of [name,expected,actual.toPrecision(12),unit,tol,Math.abs(actual-expected)<=tol?'PASS':'FAIL']){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('eb-checks').append(tr);}
 refresh();invalidate();
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setClearColor(0x202b34,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
  view.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Orbitable three-dimensional EBPG instrument reconstruction');
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.025,30);controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.10;controls.maxDistance=12;controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xf0f4ff,0x626b72,2.4));
  const key=new THREE.DirectionalLight(0xfff0d8,3.2);key.position.set(3,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0xc6e3ff,1.4);fill.position.set(-4,2,-3);scene.add(fill);
  const grid=new THREE.GridHelper(8,32,0x61707b,0x34444d);grid.position.y=-.007;scene.add(grid);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshStandardMaterial({color:0x43515a,roughness:.92}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
  const gltf=await new GLTFLoader().loadAsync('/equipment/02-05/ebpg5200.gltf');model=gltf.scene;scene.add(model);model.traverse(n=>{if(n.name)parts[n.name]=n;});
  for(const k of ['lock-door','sample-holder','sample-chip','resist-layer','chamber-cover','beam-indicator','lamp-0'])if(!parts[k])throw Error('Missing component '+k);
  parts['lamp-0'].material=parts['lamp-0'].material.clone();
  function resize(){const w=Math.max(1,view.clientWidth),h=Math.max(1,view.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(view);resize();
  function preset(name){if(name==='stage')cutaway=true;else if(name==='whole'||name==='front'||name==='rear'||name==='side')cutaway=false;
   if(name==='holder'){const p=parts['sample-holder'].position;camera.position.set(p.x+.25,p.y+.35,p.z+.32);controls.target.copy(p);}
   else{const [pos,target]=positions[name];camera.position.set(...pos);controls.target.set(...target);}
   $('eb-cut').setAttribute('aria-pressed',String(cutaway));controls.update();updateModel();}
  root.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>preset(el.dataset.view)));
  $('eb-cut').addEventListener('click',()=>{cutaway=!cutaway;$('eb-cut').setAttribute('aria-pressed',String(cutaway));updateModel();});
  $('eb-glb').disabled=false;
  $('eb-glb').addEventListener('click',async()=>{try{const copy=model.clone(true);copy.traverse(n=>{n.visible=true;});const m=copy.getObjectByName('lock-door');m.rotation.y=0;copy.getObjectByName('sample-holder').position.set(.36,1.665,.2);const out=await new GLTFExporter().parseAsync(copy,{binary:true,onlyVisible:false});download('raith-ebpg5200.glb',out,'model/gltf-binary');}catch(e){say('GLB export failed: '+e.message,true);}});
  $('eb-render').disabled=false;$('eb-render').addEventListener('click',()=>{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(blob)download('ebpg-view.png',blob,'image/png');});});
  preset('whole');$('eb-model-status').textContent='3D asset loaded · '+Object.keys(parts).length+' named objects. Drag to orbit, scroll/pinch to zoom.';
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
 }catch(e){$('eb-model-status').textContent='3D unavailable: '+e.message+'. Numerical workspace remains available.';}
}
