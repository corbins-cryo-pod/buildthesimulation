import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/09-10/',url=new URL(path+'solver.mjs',window.location.origin).href;
const {dispatch,initial,toCsv,GAINS,HP,LP}=await import(/* @vite-ignore */ url);
const app=document.querySelector('#sr560'),$=k=>app.querySelector('#pre-'+k);
let state=initial(),result=null,show=()=>{},overload=false;
const fields=[['source','source',false],['couple','coupling',false],['filter','filter',false],['hp','hpHz',true],['lp','lpHz',true],['gain','gain',true],['port','outputOhm',true],['load','loadOhm','load'],['freq','freqHz','input'],['amp','ampMpp','input'],['common','commonMpp','input']];
function status(text,error=false){$('status').textContent=text;$('status').dataset.error=String(error);}
function run(a,v){
 const r=dispatch(state,a,v);
 if(!r.ok){status(r.message,true);overload=r.code.includes('overload');show();return false;}
 state=r.state;result=r.result??null;overload=false;
 status(r.result?'Captured '+r.result.channels[0].samples.length+' output points.':'Setting applied.');
 sync();return true;
}
const num=(x,n=4)=>x.toFixed(n);
function draw(){
 const c=$('trace'),g=c.getContext('2d'),w=c.width,h=c.height,p=42,plot=w-p-13;
 g.fillStyle='#1b282b';g.fillRect(0,0,w,h);g.strokeStyle='#3e5557';
 for(let i=0;i<=8;i++){const x=p+i*plot/8,y=10+i*(h-37)/8;g.beginPath();g.moveTo(x,10);g.lineTo(x,h-27);g.moveTo(p,y);g.lineTo(w-13,y);g.stroke();}
 g.fillStyle='#bbd0d1';g.font='13px system-ui';g.fillText('V',11,22);g.fillText('time →',w-70,h-10);
 if(!result){g.fillText('Capture output to plot voltage',p+8,46);return;}
 const a=result.channels[0].samples,n=a.length,m=Math.max(.0001,Math.max(...a.map(Math.abs)))*1.10;
 g.fillText(m.toPrecision(3),1,20);g.fillText('0',12,(h-17)/2);g.fillText((-m).toPrecision(3),1,h-27);
 g.fillText(num((n-1)*result.dtS*1000,2)+' ms',w-88,h-10);g.strokeStyle='#edca70';g.lineWidth=1.7;g.beginPath();
 for(let i=0;i<plot;i++){const j=Math.floor(i*(n-1)/(plot-1)),y=10+(h-37)*(.5-.5*a[j]/m),x=p+i;i===0?g.moveTo(x,y):g.lineTo(x,y);}
 g.stroke();
}
function sync(){
 for(const [id,key,k] of fields)$(id).value=k==='load'&&state[key]===null?'high':String(state[key]);
 $('invert').checked=state.invert;$('power').textContent=state.power?'Power off':'Power on';
 $('source-note').textContent=state.input?'Imported '+state.input.sampleId+' revision '+state.input.revision+' · '+state.input.channels.length+' channel(s)':'Generated two-tone electrical fixture.';
 $('json').disabled=$('csv').disabled=!result;
 $('result').textContent=result?'Output '+num(result.summary.outputVpp)+' Vpp · '+num(result.summary.outputRmsV)+' V RMS · load factor '+num(result.summary.loadFactor)+' · '+num(result.summary.inputVpp)+' Vpp input':'No current output capture.';
 draw();show();
}
for(const [id,k,t] of fields)$(id).addEventListener('change',e=>run('set',{[k]:t==='input'?e.target.valueAsNumber:t==='load'?(e.target.value==='high'?null:+e.target.value):t?Number(e.target.value):e.target.value}));
$('invert').onchange=()=>run('invert');
for(const a of ['capture','reset','power'])$(a).onclick=()=>run(a);
$('import').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  if(f.size>4_000_000)throw Error('Use a file smaller than 4 MB.');
  const record=JSON.parse(await f.text());
  if(run('import',record)&&record.channels.length===1)run('set',{source:'A'});
 }catch(e){status('Waveform import: '+e.message,true);}
};
$('generated').onclick=()=>run('import',null);
function download(payload,file,type){const u=URL.createObjectURL(new Blob([payload],{type})),a=document.createElement('a');a.href=u;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>result&&download(JSON.stringify(result),'sr560-output.json','application/json');
$('csv').onclick=()=>result&&download(toCsv(result),'sr560-output.csv','text/csv');
async function viewer(){
 const host=$('viewer'),scene=new THREE.Scene(),c=new THREE.PerspectiveCamera(37,1,.004,4),r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 scene.background=new THREE.Color('#263439');r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=THREE.SRGBColorSpace;
 r.domElement.setAttribute('aria-label','Orbitable SR560. All simulated controls are also available via keyboard in the form.');host.append(r.domElement);
 const oc=new OrbitControls(c,r.domElement),render=()=>r.render(scene,c);oc.minDistance=.085;oc.maxDistance=2;oc.addEventListener('change',render);
 scene.add(new THREE.HemisphereLight(0xffffff,0x645e5a,2.2));for(const [p,l] of [[[.4,.6,.7],2.6],[[-.3,.6,-.7],1.9]]){const x=new THREE.DirectionalLight(0xffffff,l);x.position.fromArray(p);scene.add(x);}
 const grid=new THREE.GridHelper(.95,19,0x608280,0x526b6e);grid.position.y=-.002;scene.add(grid);
 const [g,b]=await Promise.all([new GLTFLoader().loadAsync(path+'sr560.glb'),fetch(path+'interaction.json').then(e=>e.json())]);const model=g.scene;scene.add(model);
 function node(n){const a=[];model.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Missing/duplicate '+n);return a[0];}
 node(b.frame.placementAnchor);b.ports.forEach(x=>node(x.node));model.updateMatrixWorld(true);
 const named=['a','ab','b','ac','dc','gnd','inv','line','hp','lp','overload'];
 for(const x of named){const o=node('led_'+x);o.material=o.material.clone();}
 show=()=>{
  const on=new Set([state.source==='A-B'?'ab':state.source.toLowerCase(),state.coupling.toLowerCase(),'line']);
  if(state.invert)on.add('inv');
  if(['hp','hp2','bp'].includes(state.filter))on.add('hp');
  if(['lp','lp2','bp'].includes(state.filter))on.add('lp');
  if(overload)on.add('overload');
  for(const n of named){const m=node('led_'+n).material,lit=state.power&&on.has(n);m.color.set(lit?(n==='overload'?'#ff5653':'#85dc44'):'#46514c');m.emissive.set(lit?(n==='overload'?'#a32c21':'#418520'):'#000000');}
  render();
 };
 const hitMeshes=b.controls.map(x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...x.targetSizeM),new THREE.MeshBasicMaterial({visible:false}));m.userData.ctl=x;node(x.node).getWorldPosition(m.position);scene.add(m);return m;});
 scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();
 for(const m of hitMeshes){ray.set(m.position.clone().add(new THREE.Vector3(0,0,.18)),new THREE.Vector3(0,0,-1));if(ray.intersectObjects(hitMeshes)[0]?.object!==m)throw Error('Overlapping pointer targets');}
 function hit(e){const q=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-q.left)/q.width-1,1-2*(e.clientY-q.top)/q.height);ray.setFromCamera(v,c);return ray.intersectObjects(hitMeshes)[0]?.object.userData.ctl;}
 let at=null;r.domElement.addEventListener('pointerdown',e=>{at=[e.clientX,e.clientY];});
 r.domElement.addEventListener('pointerup',e=>{if(at&&Math.hypot(e.clientX-at[0],e.clientY-at[1])<6){const x=hit(e);if(x)run(x.action,x.value);}at=null;});
 r.domElement.addEventListener('pointermove',e=>{const x=hit(e);r.domElement.style.cursor=x?'pointer':'grab';r.domElement.title=x?.label??'Orbit the instrument';});
 const poses={orbit:[[.29,.24,.54],[0,.043,0]],front:[[0,.071,.48],[0,.048,.15]],rear:[[0,.08,-.52],[0,.044,-.16]],source:[[-.046,.08,.385],[-.046,.046,.186]]};
 function move(k){c.position.fromArray(poses[k][0]);oc.target.fromArray(poses[k][1]);oc.update();render();}
 app.querySelectorAll('[data-pre-view]').forEach(x=>x.onclick=()=>move(x.dataset.preView));
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render();};
 new ResizeObserver(resize).observe(host);resize();move('orbit');show();
 $('model').textContent='Metric GLB loaded · '+hitMeshes.length+' spatial controls';$('model').dataset.loaded='true';
}
sync();viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+' Numerical controls still work.';$('viewer').style.display='none';});
