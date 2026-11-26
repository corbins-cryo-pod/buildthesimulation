import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv,carrier} from './solver.mjs';
const $=q=>document.querySelector(q),form=$('#gtk-config'),el=form.elements,map=$('#gtk-map'),ctx=map.getContext('2d'),row=$('#gtk-row'),modelCanvas=$('#gtk-model');
let s=initial(),renderModel=()=>{},sweep=()=>{};
const fmt=x=>x===null?'—':x===0?'0':Math.abs(x)<1e-9?'≈0':Number(x.toPrecision(6)).toString();
function sync(){for(const [k,v] of Object.entries(s.config))el[k].value=String(v)}
function send(id,v){s=act(s,id,v);if(['reset','flatDemo','roughDemo','objective'].includes(id))sync();if(id==='run'&&s.result)sweep(s.result.scan.zStartUm,s.result.scan.zStopUm);refresh()}
function refresh(){
 const c=s.config,r=s.result,m=r?.metrics;
 $('#gtk-stage').textContent=s.stage==='scan'?'Move to load':'Center stage';$('#gtk-load').textContent=s.loaded?'Remove coupon':'Load coupon';$('#gtk-load').disabled=s.stage!=='load';
 $('#gtk-status').textContent=s.error||(s.stage==='load'?'Load position, '+(s.loaded?'coupon on tray.':'tray empty.'):s.loaded?'Centered at '+c.objective+'×. '+(r?'Scan complete.':'Ready to scan.'):'Tray empty.');
 $('#gtk-result').textContent=!r?'No height map acquired.':m?'Revision '+r.revision+' · '+r.invalidCount+' invalid of '+r.grid.nx*r.grid.ny+' · '+(m.stepUm===null?'':'Step '+fmt(m.stepUm)+' µm · ')+'Sa '+fmt(m.SaUm)+' µm · Sq '+fmt(m.SqUm)+' µm · slopes X '+fmt(m.sx)+', Y '+fmt(m.sy)+' µm/µm.':'No fitted plane; '+r.invalidCount+' invalid of '+r.grid.nx*r.grid.ny+' pixels. Widen or recenter the scan, increase visibility, or inspect mask.';
 $('#gtk-json').disabled=!r;$('#gtk-csv').disabled=!r;draw();renderModel();
}
form.addEventListener('submit',e=>{e.preventDefault();send('run')});
form.addEventListener('input',e=>{const k=e.target.name;if(!k)return;const v=e.target.value;send('set',{[k]:['sampleId','type'].includes(k)?v:['mask','noise'].includes(k)?v==='true':v===''?NaN:Number(v)})});
for(const [id,a] of Object.entries({stage:'stage',load:'load',change:'objective',reset:'reset',flat:'flatDemo',rough:'roughDemo'}))$('#gtk-'+id).onclick=()=>send(a);
for(const mode of ['json','csv'])$('#gtk-'+mode).onclick=()=>{if(!s.result)return;const r=s.result,u=URL.createObjectURL(new Blob([mode==='json'?JSON.stringify(r,null,2)+'\n':csv(r)],{type:mode==='json'?'application/json':'text/csv'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-heightmap.'+mode;a.click();setTimeout(()=>URL.revokeObjectURL(u),1400)};
row.oninput=()=>{draw();renderModel()};map.onclick=e=>{if(!s.result)return;const b=map.getBoundingClientRect();row.value=String(Math.max(0,Math.min(47,47-Math.floor(48*(e.clientY-b.top)/b.height))));draw();renderModel()};
const scale=(x,lo,hi)=>Math.min(1,Math.max(0,(x-lo)/(hi-lo||1)));
function draw(){
 const r=s.result,svg=$('#gtk-profile');svg.replaceChildren();ctx.fillStyle='#172733';ctx.fillRect(0,0,map.width,map.height);
 if(!r){$('#gtk-scale').textContent='Run a scan to view the height raster.';return}
 const good=r.heightsUm.filter(z=>z!==null),lo=good.length?Math.min(...good):0,hi=good.length?Math.max(...good):0,ni=r.grid.nx,nj=r.grid.ny,w=map.width/ni,h=map.height/nj,jj=Number(row.value);
 for(let j=0;j<nj;j++)for(let i=0;i<ni;i++){const z=r.heightsUm[j*ni+i],u=scale(z,lo,hi);ctx.fillStyle=z===null?'#172733':'hsl('+(226-183*u)+',70%,'+(39+24*u)+'%)';ctx.fillRect(i*w,(nj-1-j)*h,w,h);}
 ctx.strokeStyle='white';ctx.lineWidth=1;ctx.strokeRect(0,(nj-1-jj)*h,map.width,h);
 $('#gtk-scale').textContent=good.length?'Height '+fmt(lo)+' to '+fmt(hi)+' µm · '+r.grid.dxUm+' µm pixel pitch · charcoal = invalid.':'No valid heights in this scan.';
 const a=(tag,p,t)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in p)e.setAttribute(k,p[k]);if(t!==undefined)e.textContent=t;svg.append(e)};
 let d='',start=true;const Y=z=>167-125*scale(z,lo,hi),X=i=>70+404*i/(ni-1);
 for(let i=0;i<ni;i++){const z=r.heightsUm[jj*ni+i];if(z===null){start=true;continue;}d+=(start?'M':'L')+X(i)+' '+Y(z);start=false;}
 for(const y of [43,106,167])a('line',{x1:70,x2:475,y1:y,y2:y,stroke:'currentColor',opacity:.24});
 for(const [x,y,t] of [[5,17,'Height (µm)'],[5,49,fmt(hi)],[5,173,fmt(lo)],[64,195,fmt(r.grid.originUm[0])],[407,195,fmt(r.grid.originUm[0]+(ni-1)*r.grid.dxUm)],[369,213,'x (µm) · row '+jj]])a('text',{x,y,fill:'currentColor','font-size':'12'},t);
 a('path',{d,fill:'none',stroke:'currentColor','stroke-width':'2.25'});
}
async function setup(){
 const note=$('#gtk-asset');
 try{
  const renderer=new THREE.WebGLRenderer({canvas:modelCanvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.xr.enabled=true;
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);scene.background=new THREE.Color('#e9e8e2');scene.add(new THREE.HemisphereLight(0xfff6e5,0xa1b5ca,2.4));
  for(const [p,co,f] of [[[1,2,2],0xffffff,2.35],[[-1,1,-1],0xa6d0f4,1.2]]){let z=new THREE.DirectionalLight(co,f);scene.add(z);z.position.set(...p);}
  const camera=new THREE.PerspectiveCamera(34,1,.009,14),orbit=new OrbitControls(camera,modelCanvas);orbit.minDistance=.24;orbit.maxDistance=4;
  const render=()=>renderer.render(scene,camera);orbit.addEventListener('change',render);
  function size(){const {width,height}=modelCanvas.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();render();}
  new ResizeObserver(()=>{if(!renderer.xr.isPresenting)size()}).observe(modelCanvas);
  const views={bench:[[1.03,1.03,2.37],[-.18,.35,.02]],front:[[0,.36,1.67],[0,.36,0]],side:[[1.54,.62,.02],[0,.38,0]],rear:[[.24,.49,-1.56],[0,.35,0]],work:[[.31,.49,.72],[.005,.286,.135]]};let selected='bench';
  const view=n=>{selected=n;const [from,target]=views[n];camera.position.set(...from);orbit.target.set(...target);orbit.update();render()};
  $('#gtk-views').addEventListener('click',e=>{if(e.target.dataset.view&&!renderer.xr.isPresenting)view(e.target.dataset.view)});size();view(selected);
  const b=(await new GLTFLoader().loadAsync('/equipment/05-02/contour-gt-k.glb')).scene;world.add(b);
  const get=n=>b.getObjectByName(n),stage=get('stage'),coupon=get('coupon'),turret=get('turret'),y0=turret.position.y,c0=stage.position.z,q0=coupon.position.z;get('monitor_art').visible=false;
  let axisUm=0,token=0;const cv=document.createElement('canvas');cv.width=768;cv.height=446;const lcd=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.444,.261),new THREE.MeshBasicMaterial({map:tex}));m.position.set(-.574,.461,.052);m.name='host_acquire_panel';m.userData.action='run';world.add(m);
  renderModel=()=>{
   const load=s.stage==='load'?.08:0;stage.position.z=c0+load;coupon.position.z=q0+load;coupon.visible=s.loaded;turret.rotation.y=s.config.objective===5?0:Math.PI;
   for(const k of ['z_head','head_label'])get(k).position.y=axisUm*1e-6;turret.position.y=y0+axisUm*1e-6;
   lcd.fillStyle='#122533';lcd.fillRect(0,0,768,446);lcd.fillStyle='#bceaff';lcd.font='bold 30px sans-serif';lcd.fillText('CONTOUR GT-K  /  VIRTUAL OPTICAL BENCH',24,44);lcd.font='20px sans-serif';lcd.fillText(s.config.objective+'×    |    '+(s.stage==='load'?'LOAD':'CENTERED')+'    |    Δz '+fmt(axisUm)+' µm',24,82);
   if(s.result){lcd.imageSmoothingEnabled=false;lcd.drawImage(map,25,96,339,254);lcd.fillStyle='#f5f4e5';lcd.fillText(s.result.invalidCount+' invalid pixels',384,126);lcd.fillText(s.result.metrics?.stepUm!=null?'Step '+fmt(s.result.metrics.stepUm)+' µm':'Planar calibration',384,157);lcd.fillText(s.result.metrics?'Sa '+fmt(s.result.metrics.SaUm)+' µm':'No plane fit',384,188);}
   else{lcd.fillText(s.error||'Select this monitor to acquire',24,118,710);lcd.beginPath();lcd.strokeStyle='#9ed5eb';for(let i=0;i<340;i++){const f=carrier((i-170)/35,1,.8),x=42+2*i,y=246-100*f;i?lcd.lineTo(x,y):lcd.moveTo(x,y);}lcd.stroke();}
   lcd.fillStyle='#b6dbdf';lcd.fillText('SIMULATED  /  ACQUIRE HEIGHT MAP',24,413);tex.needsUpdate=true;render();
  };
  sweep=(z0,z1)=>{const id=++token,t0=performance.now();function tick(t){if(id!==token)return;if(!s.result){axisUm=0;renderModel();return}const f=Math.min(1,(t-t0)/550);axisUm=f<1?z0+(z1-z0)*f:0;renderModel();if(f<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)};
  const ray=new THREE.Raycaster(),p=new THREE.Vector2();let pressed;
  const select=()=>{for(const h of ray.intersectObject(world,true)){let o=h.object,a,visible=true;do{visible&&=o.visible;a??=o.userData.action;o=o.parent}while(o&&o!==scene);if(!visible)continue;if(a)send(a);break;}};
  modelCanvas.addEventListener('pointerdown',e=>pressed=[e.clientX,e.clientY]);modelCanvas.addEventListener('pointerup',e=>{if(!pressed||Math.hypot(e.clientX-pressed[0],e.clientY-pressed[1])>4)return;const v=modelCanvas.getBoundingClientRect();p.set((e.clientX-v.left)*2/v.width-1,1-(e.clientY-v.top)*2/v.height);ray.setFromCamera(p,camera);select();});
  note.textContent='3D asset loaded · meter scale; selectable stage, coupon, turret and scan monitor.';renderModel();
  const x=$('#gtk-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){x.disabled=false;x.textContent='Enter VR';x.onclick=async()=>{if(renderer.xr.isPresenting){await renderer.xr.getSession().end();return}try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});renderer.xr.setReferenceSpaceType('local-floor');world.position.set(.18,.78,-1.02);orbit.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();await renderer.xr.setSession(session);x.textContent='Exit VR';renderer.setAnimationLoop(render);session.addEventListener('end',()=>{renderer.setAnimationLoop(null);world.position.set(0,0,0);orbit.enabled=true;size();view(selected);x.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);orbit.enabled=true;view(selected);note.textContent='Immersive session not started: '+e.message;}};
   for(let i=0;i<2;i++){const c=renderer.xr.getController(i);scene.add(c);c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1.4)]),new THREE.LineBasicMaterial({color:0xc9e6ed})));c.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(c.matrixWorld);select();});}
  }
 }catch(e){note.textContent='3D unavailable: '+e.message+'. Measurement controls still work.'}
}
sync();refresh();setup();
