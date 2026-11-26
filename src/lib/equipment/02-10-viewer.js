import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export async function mount(root){
 const url='/equipment/02-10/solver.mjs';
 const {fixture,ladder,defaults,validate,develop,remaining,doseToClear}=await import(/* @vite-ignore */ url);
 const get=k=>root.querySelector('#delta-'+k), fields=['initialNm','threshold','timeS','C','rMin','rMax','n','mTh'];
 const params=()=>({model:get('model-type').value,tone:get('tone').value,developer:get('developer').value,...Object.fromEntries(fields.map(k=>[k,get(k).valueAsNumber]))});
 let source=fixture(),result=null,phase='idle',busy=false,token=0,cut=false,model,scene,camera,renderer,controls,wafer,door,chuck,dispense,spray,carriage,fork,screen;
 let pos=-.248,waferY=.065,waferZ=.042,progress=0;
 const inputControls=[...get('inputs').querySelectorAll('input,select,button')];
 const message=s=>get('status').textContent=s;
 const button=(k,enabled)=>get(k).disabled=!enabled;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const points={input:[-.248,.065,.042],chuck:[0,.0645,.045],output:[.248,.065,.042]};
 function seatedPoint(name){const p=points[name].slice();if(name==='chuck')p[1]=.064+source.sample.thicknessUm/2e6;return p;}
 const active=()=>['transfer-in','develop','rinse','dry','transfer-out'].includes(phase);
 const setPos=p=>{[pos,waferY,waferZ]=p};
 function stage(next,txt){phase=next;if(txt)message(txt);refresh();}
 function refresh(){
  get('phase').textContent=phase.toUpperCase();get('progress').value=progress;
  get('specimen').textContent=source.sampleId+' · revision '+source.revision+' · '+source.sample.diameterMm+' mm wafer · '+source.grid.nx+' × '+source.grid.ny+' local ROI';
  for(const e of inputControls)e.disabled=busy;
  button('example',!busy);button('ladder',!busy);button('door',!busy&&['idle','complete'].includes(phase));button('load',!busy&&phase==='door-open');button('seal',!busy&&phase==='loaded');button('run',!busy&&phase==='sealed');button('unload',!busy&&phase==='output-open');
  button('json',!!result);button('csv',!!result);
  for(const key of ['C','rMin','rMax','n','mTh'])root.querySelector('[data-field="'+key+'"]').hidden=get('model-type').value!=='mack';
  root.querySelector('[data-field="threshold"]').hidden=get('model-type').value!=='ideal';
  const p=params(),curve=get('curve-panel');curve.hidden=p.model!=='mack';
  if(!curve.hidden){
   try{validate(source,p);const dc=doseToClear(p),mx=Math.min(10000,Math.max(100,source.grid.values.reduce((a,b)=>Math.max(a,b),0),dc===null?0:dc*1.25));
    const samples=Array.from({length:101},(_,i)=>[42+354*i/100,18+116*(1-remaining(mx*i/100,p)/p.initialNm)]);
    get('curve-line').setAttribute('d',samples.map((a,i)=>(i?'L':'M')+a.map(x=>x.toFixed(3)).join(' ')).join(' '));
    get('curve-max').textContent=mx.toPrecision(3);
    const mark=get('curve-marker');mark.style.display=dc!==null&&dc<=mx?'':'none';if(dc!==null&&dc<=mx){const x=42+354*dc/mx;mark.setAttribute('x1',String(x));mark.setAttribute('x2',String(x));}
    get('curve-readout').textContent='Calculated dose to clear: '+(dc===null?'no finite dose at these coefficients/time':dc.toFixed(3)+' mJ/cm²'+(dc>10000?' (outside accepted dose range)':''))+' · zero-dose remaining film: '+remaining(0,p).toFixed(2)+' nm.';
   }catch(e){get('curve-line').setAttribute('d','');get('curve-marker').style.display='none';get('curve-readout').textContent='Invalid recipe: '+e.message;}
  }
  if(wafer){wafer.visible=!['idle','door-open','unloaded'].includes(phase);wafer.position.set(pos,waferY,waferZ);wafer.rotation.y=0;const dia=source.sample.diameterMm;wafer.scale.set(dia/150,1,dia/150);const sub=model.getObjectByName('wafer_substrate'),res=model.getObjectByName('resist_surface');sub.scale.y=source.sample.thicknessUm/1e6;res.scale.y=(result?Math.max(.001,result.metrics.meanThicknessNm):params().initialNm||1000)*1e-9;res.position.y=sub.scale.y/2+res.scale.y/2;res.visible=!result||result.metrics.openFraction<1;res.material.color.set(result?new THREE.Color().lerpColors(new THREE.Color('#576778'),new THREE.Color('#bd7126'),Math.min(1,result.metrics.meanThicknessNm/result.recipe.initialNm)):new THREE.Color('#bd7126'));}
  if(door)door.position.y=['door-open','loaded','output-open'].includes(phase)?.44:0;
  if(spray)spray.visible=phase==='rinse'||(phase==='develop'&&params().timeS>0);
  if(screen)screen.material.color.set(active()?0x23565e:result?0x275b38:0x254779);
 }
 function paint(which,values,color){
  const c=get(which),g=source.grid;c.width=g.nx;c.height=g.ny;const ratio=g.nx*g.spacingMm[0]/(g.ny*g.spacingMm[1]);c.style.aspectRatio=String(Math.max(.2,Math.min(5,ratio)));c.style.maxWidth=Math.min(100,Math.max(.2,Math.min(5,ratio))*100)+ "%";
  const ctx=c.getContext('2d'),im=ctx.createImageData(g.nx,g.ny);
  for(let y=0;y<g.ny;y++)for(let x=0;x<g.nx;x++){const i=y*g.nx+x,j=((g.ny-1-y)*g.nx+x)*4;const rgb=color(values?.[i]??0);im.data[j]=rgb[0];im.data[j+1]=rgb[1];im.data[j+2]=rgb[2];im.data[j+3]=255;}
  ctx.putImageData(im,0,0);
 }
 const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))));
 function maps(){
  const mx=Math.max(1,source.grid.values.reduce((a,b)=>Math.max(a,b),0));
  paint('dose',source.grid.values,v=>mix([26,41,53],[235,166,63],v/mx));
  paint('thickness',result?.grid.thicknessNm,v=>result?mix([26,41,53],[230,161,58],v/result.recipe.initialNm):[38,48,58]);
  paint('open',result?.grid.open,v=>v?[245,244,232]:[38,48,58]);
  get('result').textContent=result?result.sampleId+' · revision '+result.parentRevision+' → '+result.revision+' · '+result.metrics.openCells+' / '+result.grid.open.length+' cells open ('+(result.metrics.openFraction*100).toFixed(2)+'%) · '+result.metrics.openAreaMm2.toPrecision(5)+' mm² open · mean remaining '+result.metrics.meanThicknessNm.toFixed(2)+' nm.':'No developed revision yet.';
  get('probe').textContent='Select a pixel to inspect coordinates, dose and remaining film.';
 }
 function reset(txt='Ready to load a circular wafer.'){token++;busy=false;result=null;progress=0;setPos(points.input);if(carriage)carriage.position.x=-.245;if(fork)fork.position.x=-.245;stage('idle',txt);maps();}
 function ensure(s=source,p=params()){validate(s,p);if(s.sample.diameterMm!==150)throw Error('Selected visual tooling is 150 mm. Use a 150 mm wafer in this laboratory.');}
 function guarded(fn){try{fn()}catch(e){message('Rejected: '+e.message)}}
 function load(){ensure();setPos(points.input);stage('loaded','Input cassette loaded. Close bay before transfer.')}
 function accept(s){ensure(s);source=s;reset('Latent exposure loaded. Open bay and load cassette.');}
 async function phaseFor(name,txt,start,end,ms,my){
  if(my!==token)return false;stage(name,txt);const t=performance.now();
  while(my===token){const f=Math.min(1,(performance.now()-t)/ms);progress=start+(end-start)*f;get('progress').value=progress;
   if(name==='transfer-in'||name==='transfer-out'){const a=name==='transfer-in'?seatedPoint('input'):seatedPoint('chuck'),b=name==='transfer-in'?seatedPoint('chuck'):seatedPoint('output');setPos(a.map((v,i)=>v+(b[i]-v)*f));waferY+=.045*Math.sin(Math.PI*f);if(wafer)wafer.position.set(pos,waferY,waferZ);if(carriage)carriage.position.x=pos;if(fork)fork.position.x=pos;}
   if(f===1)return true;await sleep(25);
  }return false;
 }
 async function run(){
  if(busy||phase!=='sealed')return;let p=params(),pending;
  try{ensure(source,p);pending=develop(source,p)}catch(e){message('Rejected: '+e.message);return}
  const my=++token;busy=true;result=null;maps();refresh();
  for(const step of [['transfer-in','Transfer wafer to chuck',0,.15,450],['develop','Temperature-controlled spray stage (virtual '+p.timeS+' s)',.15,.72,Math.max(50,Math.min(1800,p.timeS*35))],['rinse','Rinse (sequenced, no added dissolution)',.72,.82,350],['dry','Spin dry (sequenced)',.82,.92,350],['transfer-out','Return wafer to output cassette',.92,1,450]])if(!await phaseFor(...step,my))return;
  if(my!==token)return;busy=false;result=pending;progress=1;stage('complete','Cycle complete. Open bay to retrieve developed output.');maps();refresh();
 }
 get('door').onclick=()=>guarded(()=>{if(phase==='idle')stage('door-open','Bay open. Load cassette.');else if(phase==='complete')stage('output-open','Output cassette accessible.');});
 get('load').onclick=()=>guarded(load);get('seal').onclick=()=>stage('sealed','Bay sealed. Recipe ready.');get('run').onclick=run;
 get('unload').onclick=()=>stage('unloaded','Output removed. Export remains available.');get('reset').onclick=()=>reset();
 function preset(s,p){source=s;get('model-type').value=p.model;get('tone').value=p.tone;get('developer').value=p.developer;fields.forEach(k=>get(k).value=p[k]);reset();stage('door-open');load();stage('sealed');run();}
 get('example').onclick=()=>preset(fixture(),defaults());
 get('ladder').onclick=()=>preset(ladder(),{...defaults(),model:'mack'});
 get('fixture').onclick=()=>guarded(()=>accept(fixture()));
 get('upstream').onclick=async()=>{const my=token;try{const r=await fetch('/equipment/02-01/example-result.json');if(!r.ok)throw Error('Upstream example unavailable');const s=await r.json();if(my===token&&!busy)accept(s)}catch(e){message('Handoff rejected: '+e.message)}};
 get('import').onchange=async e=>{const f=e.target.files?.[0],my=token;if(!f)return;try{if(f.size>20e6)throw Error('Input file exceeds 20 MB');const s=JSON.parse(await f.text());if(my===token&&!busy)accept(s)}catch(e){message('Import rejected: '+e.message)}finally{e.target.value=''}};
 get('inputs').addEventListener('input',e=>{if(e.target.type!=='file'&&!busy)reset('Recipe changed. Reload specimen before running.');});
 function download(name,content,mime){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type:mime}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 get('json').onclick=()=>{if(result)download(result.sampleId+'-r'+result.revision+'-developed.json',JSON.stringify(result,null,2),'application/json')};
 get('csv').onclick=()=>{if(!result)return;const g=result.grid,[ox,oy]=g.originMm,[dx,dy]=g.spacingMm,rows=['x_mm,y_mm,dose_mJ_cm2,remaining_nm,open'];for(let i=0;i<g.dose.length;i++)rows.push([ox+(i%g.nx+.5)*dx,oy+(Math.floor(i/g.nx)+.5)*dy,g.dose[i],g.thicknessNm[i],g.open[i]].join(','));download(result.sampleId+'-r'+result.revision+'-developed.csv',rows.join('\n'),'text/csv')};
 for(const k of ['dose','thickness','open'])get(k).onclick=e=>{const g=source.grid,b=e.target.getBoundingClientRect(),x=Math.min(g.nx-1,Math.max(0,Math.floor((e.clientX-b.left)/b.width*g.nx))),y=g.ny-1-Math.min(g.ny-1,Math.max(0,Math.floor((e.clientY-b.top)/b.height*g.ny))),i=y*g.nx+x;get('probe').textContent='Cell ('+x+', '+y+') · ('+(g.originMm[0]+(x+.5)*g.spacingMm[0]).toFixed(5)+', '+(g.originMm[1]+(y+.5)*g.spacingMm[1]).toFixed(5)+') mm · '+g.values[i].toFixed(3)+' mJ/cm²'+(result?' · '+result.grid.thicknessNm[i].toFixed(3)+' nm remaining':' · not developed');};
 reset();
 const host=get('view');
 try{
  scene=new THREE.Scene();scene.background=new THREE.Color('#293640');camera=new THREE.PerspectiveCamera(38,1,.025,30);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.18;controls.maxDistance=8;
  scene.add(new THREE.HemisphereLight(0xffffff,0x627587,2.3));const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(2,4,3);scene.add(key);const fill=new THREE.DirectionalLight(0xcad8ff,1.4);fill.position.set(-3,2,-2);scene.add(fill);
  const floor=new THREE.GridHelper(5,20,0x63757d,0x3c4a54);scene.add(floor);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};
  new ResizeObserver(resize).observe(host);resize();
  const cameras={whole:[[2.1,1.8,2.55],[0,.69,0]],front:[[0,1.05,3],[0,.68,0]],side:[[3,1.15,0],[0,.68,0]],rear:[[0,1.15,-3],[0,.68,0]],bay:[[.38,1.42,1.38],[-.18,1.07,.01]],chuck:[[.2,1.42,.66],[-.18,.95,.01]],media:[[1.15,.62,1.3],[0,.4,0]]};
  function view(which){const [p,t]=cameras[which];camera.position.set(...p);controls.target.set(...t);controls.update();cut=['bay','chuck','media'].includes(which);applyCut()}
  function applyCut(){if(!model)return;for(const n of ['cabinet_door_left','cabinet_door_right','bay_left','bay_right','bay_roof','door_glazing']){const o=model.getObjectByName(n);if(o)o.visible=!cut;}get('cut').setAttribute('aria-pressed',String(cut))}
  for(const b of root.querySelectorAll('[data-camera]'))b.onclick=()=>view(b.dataset.camera);
  get('cut').onclick=()=>{cut=!cut;applyCut()};
  view('whole');
  const gltf=await new GLTFLoader().loadAsync('/equipment/02-10/delta12aq.glb');model=gltf.scene;scene.add(model);
  wafer=model.getObjectByName('sample_wafer');door=model.getObjectByName('loading_door');chuck=model.getObjectByName('chuck_pivot');dispense=model.getObjectByName('dispense_pivot');spray=model.getObjectByName('spray_indicator');carriage=model.getObjectByName('transfer_carriage');fork=model.getObjectByName('wafer_fork');screen=model.getObjectByName('monitor_display');
  for(const n of [wafer,door,chuck,dispense,spray,carriage,fork,screen])if(!n)throw Error('Missing functional GLB node');
  // Individual mesh materials must be cloned before changing display/film color.
  for(const n of [screen,model.getObjectByName('resist_surface')])n.material=n.material.clone();
  for(const name of ['door_panel_left','door_panel_right']){const o=model.getObjectByName(name);if(o?.material){o.material=o.material.clone();o.material.metalness=.96;o.material.roughness=.19;}}applyCut();refresh();get('model').textContent='3D asset loaded · 199 named nodes · metric GLB';
  renderer.setAnimationLoop(()=>{const t=performance.now()/1000;if(['develop','rinse','dry'].includes(phase)){wafer.rotation.y=t*5;chuck.rotation.y=t*5;dispense.rotation.y=phase==='dry'?-.7:.17*Math.sin(t*2);}else{dispense.rotation.y=-.55;}controls.update();renderer.render(scene,camera);});
 }catch(e){get('model').textContent='3D loading error: '+e.message+'; numerical controls remain usable.';button('cut',false);}
}
