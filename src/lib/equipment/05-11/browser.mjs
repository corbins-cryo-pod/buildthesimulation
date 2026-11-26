import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {state,act,csv,sampling,LIBRARY} from '../../../../public/equipment/05-11/solver.mjs';
const base='/equipment/05-11/', $=id=>document.getElementById('ft-'+id),s=state();let pose=()=>{},message='',attempt=0;
const f=(n,d=5)=>Number(n).toPrecision(d);
function status(t,err=false){message=t;$('status').textContent=t;$('status').classList.toggle('error',err)}
function draw(name,series,{top,left,xAxis,label,unit}){
 const c=$(name),g=c.getContext('2d'),w=c.width,h=c.height,r=[62,30,w-100,h-79];g.fillStyle='#182f36';g.fillRect(0,0,w,h);g.fillStyle='#f2ead3';g.font='16px sans-serif';g.fillText(label,18,20);g.fillText(xAxis,w/2-83,h-8);
 if(!series?.length){g.fillText(name==='opd'&&s.input?'Imported intensity: no interferogram supplied.':'Collect an acquisition first.',r[0],h/2);return}
 const values=series.flatMap(x=>x.y),hi0=Math.max(...values),lo0=Math.min(...values),pad=Math.max((hi0-lo0)*.08,1e-4),hi=hi0+pad,lo=lo0-pad;
 const X=x=>r[0]+(x-left)/(top-left)*r[2],Y=y=>r[1]+(hi-y)/(hi-lo)*r[3];
 for(let i=0;i<=4;i++){
  const x=r[0]+i*r[2]/4,y=r[1]+i*r[3]/4;g.strokeStyle='#536c71';g.lineWidth=1;g.beginPath();g.moveTo(x,r[1]);g.lineTo(x,r[1]+r[3]);g.moveTo(r[0],y);g.lineTo(r[0]+r[2],y);g.stroke();
  g.fillStyle='#f4eacf';g.font='14px sans-serif';g.fillText(f(left+(top-left)*i/4,4),x-12,h-30);g.fillText(f(hi-(hi-lo)*i/4,3),3,y+4);
 }
 for(const [i,a] of series.entries()){
  g.strokeStyle=i?'#e5aa78':'#76ddce';g.lineWidth=1.7;g.beginPath();a.x.forEach((x,j)=>{if(j)g.lineTo(X(x),Y(a.y[j]));else g.moveTo(X(x),Y(a.y[j]))});g.stroke();
 }
}
function charts(){
 const r=s.result,p=sampling(s.N),half=Math.min(232,s.N/2-1),sides=[];
 for(const a of [s.bgTrace,s.trace])if(a){
  const x=[],y=[],stride=1;for(let i=s.N/2-half;i<=s.N/2+half;i+=stride){x.push((i-s.N/2)*p.spacingCm);y.push(a[i]);}sides.push({x,y});
 }
 draw('opd',sides,{left:-half*p.spacingCm,top:half*p.spacingCm,xAxis:'OPD (cm) · center window',label:'Interferogram · background cyan / sample amber'});
 const w=r?.rows.slice().reverse(),series=w?[{x:w.map(x=>x.wavenumberCm),y:w.map(x=>x.absorbance)}]:null;
 draw('chart',series,{left:4000,top:450,xAxis:'Wavenumber (cm⁻¹)',label:'Recovered absorbance (base 10)'});
}
function sync(){
 $('power').textContent=s.power?'Power on':'Power off';$('lid').textContent=s.lid?'Close lid':'Open lid';$('load').textContent=s.loaded?'Remove coupon':'Place coupon';$('clamp').textContent=s.clamp?'Lift ATR foot':'Seat ATR foot';
 const r=s.result,$rf=$('results');$('json').disabled=$('csv').disabled=!r;$('intensity').disabled=!s.input;
 if(r){const m=r.rows.reduce((a,b)=>b.absorbance>a.absorbance?b:a),meta=r.provenance.source;
  $rf.textContent=[r.sampleId+' · revision '+r.revision,r.rows.length+' spectral bins · '+r.provenance.kind,'Strongest processed band '+f(m.wavenumberCm,6)+' cm⁻¹ / A '+f(m.absorbance),'Background '+(s.background?'ready':'not used for supplied data'),meta?.processingMode?'Paired intensities supplied; FFT bypassed':meta?.opd?'Bin pitch '+f(meta.opd.wavenumberPitchCm,7)+' cm⁻¹ · '+meta.window+' window':'Paired intensities supplied; FFT bypassed',...r.matches.map(x=>x.label+'  '+f(x.correlation,5)),r.comparison].join('\n')
 }else $rf.textContent=s.background?'Clean background acquired. No current sample result.':'No current acquisition.';
 charts();pose();
}
function cmd(k,v){try{act(s,k,v);status(k==='background'?'Clean background ready. Seat a coupon to acquire.':k==='load'?s.loaded?LIBRARY[s.loaded].label+' coupon placed.':'ATR crystal clear.':s.result?'Processed '+s.result.rows.length+' spectral points.':'Fixture configuration updated.')}catch(e){status(e.message,true)}sync()}
function toggleLoad(){cmd('load',s.loaded?null:$('coupon').value)}
function demo(){
 try{
  if(!s.power)act(s,'power');if(s.clamp)act(s,'clamp');if(s.loaded)act(s,'load',null);
  for(const [k,v] of [['N',4096],['window','hann'],['noise',0],['tilt',0],['baseline','none']])act(s,k,v);
  $('n').value='4096';$('window').value='hann';$('noise').value=0;$('tilt').value=0;$('baseline').value='none';$('coupon').value='PMMA';
  act(s,'background');act(s,'load','PMMA');act(s,'clamp');act(s,'acquire');status('PMMA-like example acquired. Inspect the band near 1730 cm⁻¹.')
 }catch(e){status(e.message,true)}sync();
}
for(const [id,a] of [['power','power'],['lid','lid'],['clamp','clamp'],['bg','background'],['run','acquire'],['process','process']])$(id).onclick=()=>cmd(a);
$('load').onclick=toggleLoad;$('demo').onclick=demo;
$('n').onchange=e=>cmd('N',+e.target.value);$('window').onchange=e=>cmd('window',e.target.value);$('noise').onchange=e=>cmd('noise',e.target.valueAsNumber/100);$('tilt').onchange=e=>cmd('tilt',e.target.valueAsNumber);$('baseline').onchange=e=>cmd('baseline',e.target.value);
$('import').onchange=async e=>{const v=++attempt;try{const file=e.target.files[0];if(!file||file.size>800000)throw Error('Pick a paired intensity JSON below 800 KB.');const a=JSON.parse(await file.text());if(v===attempt)cmd('import',a)}catch(e){if(v===attempt){s.result=s.input=s.trace=null;status(e.message,true);sync()}}};
function save(x,name,type){const u=URL.createObjectURL(new Blob([x],{type})),a=document.createElement('a');a.href=u;a.download='05-11-'+name;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}
$('json').onclick=()=>s.result&&save(JSON.stringify(s.result,null,2),'absorbance.json','application/json');$('csv').onclick=()=>s.result&&save(csv(s.result),'spectra.csv','text/csv');$('intensity').onclick=()=>s.input&&save(JSON.stringify(s.input,null,2),'intensities.json','application/json');
sync();
async function viewer(){
 const host=$('model'),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd8dddd);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');host.append(renderer.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.add(new T.HemisphereLight(0xffffff,0xa0b9bf,2.9));const l=new T.DirectionalLight(0xfff7e5,2.7);l.position.set(.63,1.1,1);scene.add(l);
 const cam=new T.PerspectiveCamera(35,1,.002,20),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.08;orbit.maxDistance=3;
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(base+'nicolet-is50.glb'),fetch(base+'xr-manifest.json').then(r=>r.json())]);root.add(g.scene);const n=k=>g.scene.getObjectByName(k);
 const views={Overall:[[.65,.67,1.38],[.02,.17,.004]],ATR:[[.39,.46,.53],[.18,.285,.219]],Bay:[[.42,.60,.85],[.00,.29,.115]],Rear:[[.58,.50,-1.23],[.015,.155,-.12]],Bench:[[.68,.77,1.66],[-.23,.19,.045]]};
 let v='Overall',xr=false,start=null;
 const cv=document.createElement('canvas');cv.width=900;cv.height=540;const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;
 const board=new T.Mesh(new T.PlaneGeometry(.328,.198),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));board.position.set(-.55,.317,.065);root.add(board);
 const q=new T.Raycaster(),draw=()=>{if(!xr)renderer.render(scene,cam)};
 function paint(){
  const c=cv.getContext('2d');c.fillStyle='#15333d';c.fillRect(0,0,900,540);c.fillStyle='#f9ecd1';c.font='bold 46px sans-serif';c.fillText('NICOLET iS50 · ATR',21,65);
  c.font='32px sans-serif';c.fillText('Background '+(s.background?'ready':'missing')+'  /  '+(s.loaded??'empty crystal'),21,137);
  c.fillText(s.result?s.result.matches[0]?.label??'No spectral match':'Awaiting acquisition',21,208);c.font='25px sans-serif';c.fillText(message.slice(0,63),21,268);
  ['Background','Load','Clamp','Acquire','PMMA'].forEach((x,i)=>{c.fillStyle='#467073';c.fillRect(7+180*i,370,166,145);c.fillStyle='white';c.fillText(x,24+180*i,455)});
  texture.needsUpdate=true;
 }
 function update(){n('sample_lid_hinge').rotation.x=s.lid?-1.32:0;n('atr_pressure_arm').position.y=s.clamp?0:.008;n('polymer_coupon').visible=Boolean(s.loaded);
  n('host_display').visible=board.visible=(v==='Bench'||xr);if(board.visible)paint();draw()}
 function goto(name){v=name;cam.position.set(...views[name][0]);orbit.target.set(...views[name][1]);orbit.update();update()}
 function select(ray){root.updateMatrixWorld(true);q.ray.copy(ray);const items=Object.keys(m.interactions).map(n);if(xr)items.push(board);
  for(const h of q.intersectObjects(items,true)){let o=h.object;while(o&&o!==board&&!m.interactions[o.name])o=o.parent;if(!o)continue;
   if(o===board){if(h.uv?.y<.32){const k=Math.min(4,Math.floor(h.uv.x*5));k===4?demo():k===1?toggleLoad():cmd(['background',null,'clamp','acquire'][k]);}return}
   const a=m.interactions[o.name].action;a==='load'?toggleLoad():cmd(a);return
  }}
 renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;start=null;const r=host.getBoundingClientRect();q.setFromCamera(new T.Vector2((e.clientX-r.left)*2/r.width-1,1-(e.clientY-r.top)*2/r.height),cam);select(q.ray)});
 new ResizeObserver(()=>{if(!xr&&host.clientWidth&&host.clientHeight){renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}}).observe(host);
 for(const b of document.querySelectorAll('[data-ft-view]'))b.onclick=()=>goto(b.dataset.ftView);
 orbit.addEventListener('change',draw);pose=update;goto('Overall');
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const b=$('vr');b.hidden=false;b.onclick=async()=>{try{const x=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});xr=true;orbit.enabled=false;root.position.set(.08,.84,-.94);await renderer.xr.setSession(x);update();renderer.setAnimationLoop(()=>renderer.render(scene,cam));x.addEventListener('end',()=>{xr=false;orbit.enabled=true;root.position.set(0,0,0);renderer.setAnimationLoop(null);goto(v)})}catch(e){$('view').textContent='Immersive mode unavailable: '+e.message}};
  for(let i=0;i<2;i++){const x=renderer.xr.getController(i);scene.add(x);x.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1.4)]),new T.LineBasicMaterial({color:0xffb65f})));x.addEventListener('select',()=>select(new T.Ray(new T.Vector3().setFromMatrixPosition(x.matrixWorld),new T.Vector3(0,0,-1).transformDirection(x.matrixWorld))))}
 }
 $('view').textContent='3D asset loaded · 1:1 scale · '+m.geometry.triangles.toLocaleString()+' triangles · '+m.geometry.drawPrimitives+' draw primitives.';
}
viewer().catch(e=>{$('view').textContent='3D unavailable; acquisition and data controls remain usable.';console.warn('Nicolet viewer: '+e.message)});
