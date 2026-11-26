import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {state,action,csv,AOI,defaultFilm,defaultSubstrate} from '../../../../public/equipment/05-04/solver.mjs';
const s=state(),$=id=>document.getElementById('as-'+id),base='/equipment/05-04/';let visual=()=>{},version=0,msg='',reference;
const f=(x,n=5)=>Number(x).toPrecision(n),next=x=>AOI[(AOI.indexOf(x)+1)%4];
function status(x,error=false){msg=x;$('status').textContent=x;$('status').classList.toggle('error',error)}
function chart(name,data,yName,xName,toXY,markers=[],domain=null){
 const c=$(name),g=c.getContext('2d'),w=c.width,h=c.height,r=[65,28,w-105,h-80];
 g.fillStyle='#182f36';g.fillRect(0,0,w,h);g.fillStyle='#f3ecd5';g.font='17px sans-serif';g.fillText(yName,15,19);g.fillText(xName,w/2-73,h-10);
 if(!data?.length){g.fillText('Run a thickness fit to see results.',r[0],h/2);return}
 const pts=data.map(toXY);const low=domain?.[0]??Math.min(...pts.map(x=>x[0])),hi=Math.max(low+1e-4,domain?.[1]??Math.max(...pts.map(x=>x[0]))),
 floor=domain?.[2]??Math.min(...pts.map(x=>x[1])),top=Math.max(floor+1e-4,domain?.[3]??Math.max(...pts.map(x=>x[1])));
 const X=v=>r[0]+(v-low)/(hi-low)*r[2],Y=v=>r[1]+(top-v)/(top-floor)*r[3];
 for(let i=0;i<5;i++){
  const x=r[0]+i*r[2]/4,y=r[1]+i*r[3]/4;g.strokeStyle='#51696f';g.beginPath();g.moveTo(x,r[1]);g.lineTo(x,r[1]+r[3]);g.moveTo(r[0],y);g.lineTo(r[0]+r[2],y);g.stroke();g.fillStyle='#f3ecd5';g.font='14px sans-serif';g.fillText(f(low+(hi-low)*i/4,4),x-10,h-32);g.fillText(f(top-(top-floor)*i/4,3),3,y+5);
 }
 if(name==='profile'){g.strokeStyle='#62d8c3';g.lineWidth=2;g.beginPath();pts.forEach((v,i)=>{if(i)g.lineTo(X(v[0]),Y(v[1]));else g.moveTo(X(v[0]),Y(v[1]))});g.stroke();}
 else pts.forEach(([x,y,z])=>{g.fillStyle=z===0?'#78ddcb':'#edac75';g.beginPath();g.arc(X(x),Y(y),3,0,2*Math.PI);g.fill()});
 for(const a of markers){g.fillStyle='#f4b46d';g.beginPath();g.arc(X(a.thicknessNm),Y(a.rmsDeg),5,0,2*Math.PI);g.fill();g.fillText(f(a.thicknessNm,6),X(a.thicknessNm)-15,Y(a.rmsDeg)-10)}
}
function sync(){
 $('source').value=s.source;$('detector').value=s.detector;
 $('power').textContent=s.power?'Power on':'Power off';$('vacuum').textContent=s.vacuum?'Vacuum on':'Vacuum off';$('load').textContent=s.loaded?'Unload film':'Load film';
 const r=s.result,met=r?.diagnostics,mid=r?.residuals.reduce((a,b)=>Math.abs(b.wavelengthNm-600)<Math.abs(a.wavelengthNm-600)?b:a);
 $('json').disabled=$('csv').disabled=!r;$('spectrum').disabled=!s.data;
 $('results').textContent=r?[
  met.status.toUpperCase().replaceAll('-',' '),
  'Best thickness '+f(r.thicknessNm,8)+' nm','RMS Ψ/Δ residual '+f(r.rmsDeg,5)+'°',
  r.rowCount+' observations · '+ r.sampleId+' · revision '+r.revision,
  mid.wavelengthNm+' nm / '+mid.angleDeg+'°: Ψ '+f(mid.psiDeg)+'° · Δ '+(mid.deltaDeg===null?'undefined':f(mid.deltaDeg)+'°'),
  met.status==='flat'?'Thickness optically unresolved throughout interval.':met.candidateCount+' comparable order(s) within '+met.agreementDeg+'° RMS.',
  met.candidates.length>1?'Orders (nm): '+met.candidates.slice().sort((a,b)=>a.thicknessNm-b.thicknessNm).map(x=>f(x.thicknessNm,6)).join(', '):''
 ].filter(Boolean).join('\n'):'No fitted revision.';
 const residuals=r?.residuals.flatMap(q=>[[q.wavelengthNm,q.psiResidualDeg,0],...(q.deltaResidualDeg===null?[]:[[q.wavelengthNm,q.deltaResidualDeg,1]])]);
 const a=Math.max(.000001,...(residuals??[]).map(v=>Math.abs(v[1])));
 chart('residual',residuals,'Residual degrees  ·  Ψ green / Δ amber','Wavelength (nm)',x=>x,[],[380,900,-a*1.1,a*1.1]);
 chart('profile',r?.profile,'RMS residual (degrees)','Film thickness (nm)',x=>[x.thicknessNm,x.rmsDeg],met?.candidates);
 visual();
}
function command(k,v){try{action(s,k,v);status(k==='data'?'Spectrum loaded: '+s.data.rows.length+' observations.':k==='acquire'?'Acquired '+s.data.rows.length+' simulated points at '+s.source+'°.':k==='fit'?'Fit complete. Inspect the thickness profile and residuals.':'Configuration changed. Acquire a spectrum or fit the loaded data.') }catch(e){status(e.message,true)}sync()}
function runFit(){
 const mode=$('mode').value,opts={maxNm:$('max').valueAsNumber};
 if(mode==='single'&&s.data){const ordered=s.data.rows.slice().sort((a,b)=>Math.abs(a.wavelengthNm-600)+10*Math.abs(a.angleDeg-70)-Math.abs(b.wavelengthNm-600)-10*Math.abs(b.angleDeg-70));opts.angleDeg=ordered[0].angleDeg;opts.wavelengthNm=ordered[0].wavelengthNm}
 command('fit',opts);
}
function getAcq(){const stack=defaultFilm();stack[0].thicknessNm=$('thickness').valueAsNumber;stack[0].n=$('index').valueAsNumber;command('acquire',{wave:Array.from({length:27},(_,i)=>380+20*i),stack,substrate:defaultSubstrate()})}
function reset(){if(reference){$('mode').value='full';$('max').value='1000';command('data',reference);runFit()}}
for(const k of ['power','vacuum','load'])$(k).onclick=()=>command(k);
for(const k of ['source','detector'])$(k).onchange=e=>command(k,+e.target.value);
$('fit').onclick=runFit;$('acquire').onclick=getAcq;$('reference').onclick=reset;
for(const k of ['max','mode'])$(k).onchange=()=>{s.result=null;status('Fit selection changed. Run a new fit.');sync()};
$('import').onchange=async e=>{const i=++version;s.data=null;s.result=null;sync();try{const file=e.target.files[0];if(!file||file.size>900000)throw Error('Choose a spectrum JSON under 900 KB.');const x=JSON.parse(await file.text());if(version===i)command('data',x)}catch(e){if(version===i)status(e.message,true)}};
function save(data,f,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download='05-04-'+f;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}
$('csv').onclick=()=>s.result&&save(csv(s.result),'residuals.csv','text/csv');
$('json').onclick=()=>s.result&&save(JSON.stringify(s.result,null,2),'fit.json','application/json');
$('spectrum').onclick=()=>s.data&&save(JSON.stringify(s.data,null,2),'spectrum.json','application/json');
sync();
fetch(base+'independent-spectrum.json').then(r=>{if(!r.ok)throw Error('Reference unavailable.');return r.json()}).then(d=>{reference=d;if(!s.data&&version===0)reset()}).catch(e=>status(e.message,true));
async function viewer(){
 const host=$('model'),r=new T.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio||1,1.8));r.setClearColor(0xd9dddd);r.xr.enabled=true;r.xr.setReferenceSpaceType('local-floor');host.append(r.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.add(new T.HemisphereLight(0xffffff,0x9fadb0,2.8));const key=new T.DirectionalLight(0xfff9ed,2.7);key.position.set(.45,.75,.8);scene.add(key);
 const cam=new T.PerspectiveCamera(35,1,.001,15),orbit=new OrbitControls(cam,r.domElement);orbit.minDistance=.075;orbit.maxDistance=2;
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(base+'alpha-se.glb'),fetch(base+'xr-manifest.json').then(r=>r.json())]);root.add(g.scene);
 const n=x=>g.scene.getObjectByName(x),C=new T.Vector3(...m.axisAnchorM);
 const views={Overall:[[.39,.324,.76],[0,.14,0]],Front:[[0,.148,.79],[0,.145,.01]],Chuck:[[.15,.255,.34],[0,.103,.037]],Side:[[.72,.25,.17],[0,.14,0]],Rear:[[.29,.258,-.70],[0,.14,-.075]]};
 let vr=false,mode='Overall',pointer=null;const beamMat=new T.LineBasicMaterial({color:0x9142e8,transparent:true,opacity:.85});
 const guide=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),C,new T.Vector3()]),beamMat);root.add(guide);
 const cv=document.createElement('canvas');cv.width=840;cv.height=420;const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 const panel=new T.Mesh(new T.PlaneGeometry(.40,.20),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));panel.position.set(0,.44,-.054);root.add(panel);panel.visible=false;
 function draw(){if(!vr)r.render(scene,cam)}
 function pose(){
  n('source_arm').rotation.z=-(90-s.source)*Math.PI/180;n('detector_arm').rotation.z=(90-s.detector)*Math.PI/180;n('sample').visible=s.loaded;
  const v=(angle,dir)=>new T.Vector3(C.x+dir*.055*Math.sin(angle*Math.PI/180),C.y+.055*Math.cos(angle*Math.PI/180),C.z);
  guide.geometry.setFromPoints([v(s.source,-1),C,v(s.detector,1)]);guide.visible=s.power&&s.source===s.detector&&s.source!==90&&s.loaded;
  if(vr){const c=cv.getContext('2d');c.fillStyle='#173239';c.fillRect(0,0,840,420);c.fillStyle='#f4e6ca';c.font='bold 40px sans-serif';c.fillText('alpha-SE · THIN FILM OPTICS',23,63);c.font='31px sans-serif';c.fillText('Source '+s.source+'°   /   detector '+s.detector+'°   /   '+(s.vacuum?'vacuum':'released'),23,132);c.fillText(s.result?'Fit '+f(s.result.thicknessNm,7)+' nm':'No current fit',23,204);c.font='24px sans-serif';c.fillText(msg.slice(0,60),23,262);['Acquire','Fit','Reference'].forEach((x,i)=>{c.fillStyle='#426e74';c.fillRect(i*280+9,296,262,109);c.fillStyle='white';c.font='29px sans-serif';c.fillText(x,i*280+32,359)});tex.needsUpdate=true}
  draw();
 }
 function go(v){mode=v;cam.position.set(...views[v][0]);orbit.target.set(...views[v][1]);orbit.update();pose()}
 const cast=new T.Raycaster();const keyNodes=Object.keys(m.interactions);
 function click(ray){cast.ray.copy(ray);root.updateMatrixWorld(true);const list=keyNodes.map(n).filter(x=>x.visible);if(vr)list.push(panel);
  for(const x of cast.intersectObjects(list,true)){
   let t=x.object;while(t&&t!==panel&&!m.interactions[t.name])t=t.parent;if(!t)continue;
   if(t===panel){if(x.uv?.y<.30)[getAcq,runFit,reset][Math.min(2,Math.floor(x.uv.x*3))]();return}
   const k=m.interactions[t.name].action;if(k==='source'||k==='detector')command(k,next(s[k]));else command(k);return;
  }
 }
 r.domElement.addEventListener('pointerdown',e=>pointer=[e.clientX,e.clientY]);r.domElement.addEventListener('pointerup',e=>{if(!pointer||Math.hypot(e.clientX-pointer[0],e.clientY-pointer[1])>5)return;pointer=null;const b=host.getBoundingClientRect();cast.setFromCamera(new T.Vector2((e.clientX-b.left)*2/b.width-1,1-(e.clientY-b.top)*2/b.height),cam);click(cast.ray)});
 new ResizeObserver(()=>{if(!vr&&host.clientWidth&&host.clientHeight){cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();r.setSize(host.clientWidth,host.clientHeight,false);draw()}}).observe(host);
 orbit.addEventListener('change',draw);for(const b of document.querySelectorAll('[data-as-view]'))b.onclick=()=>go(b.dataset.asView);
 visual=pose;go('Overall');
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const btn=$('vr');btn.hidden=false;btn.onclick=async()=>{try{const x=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});vr=true;orbit.enabled=false;root.position.set(0,.85,-.72);panel.visible=true;await r.xr.setSession(x);pose();r.setAnimationLoop(()=>r.render(scene,cam));x.addEventListener('end',()=>{vr=false;orbit.enabled=true;root.position.set(0,0,0);panel.visible=false;r.setAnimationLoop(null);go(mode)})}catch(e){$('view').textContent='VR session unavailable: '+e.message}};
  for(let i=0;i<2;i++){const z=r.xr.getController(i);scene.add(z);z.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:0xffb65a})));z.addEventListener('select',()=>click(new T.Ray(new T.Vector3().setFromMatrixPosition(z.matrixWorld),new T.Vector3(0,0,-1).transformDirection(z.matrixWorld))))}
 }
 $('view').textContent='3D asset loaded · 1:1 scale · '+m.geometry.triangles.toLocaleString()+' triangles.';
}
viewer().catch(e=>{$('view').textContent='3D not available; virtual spectrum and fitting remain usable.';console.warn('alpha-SE viewer: '+e.message)});
