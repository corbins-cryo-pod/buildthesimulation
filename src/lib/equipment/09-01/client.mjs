import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {initial,act,csv,waveform,contacts} from './solver.mjs';
const $=x=>document.querySelector(x),form=$('#rx-config'),els=form.elements,canvas=$('#rx-canvas'),msg=$('#rx-status');
const fmt=x=>x===null?'—':Number(x.toPrecision(6)).toString();
let s=initial(),bench=null,update3D=()=>{},resultLine='No data acquired.',paintXR=()=>{};
const uiScale={cF:1e6,currentRangeA:1000,vRms:1000};
function sync(){for(const [key,v] of Object.entries(s.config))els[key].value=String(typeof v==='number'?+(v*(uiScale[key]??1)).toPrecision(10):v)}
function send(action,payload){
 s=act(s,action,payload);if(action==='preset'||action==='cvDemo')sync();
 refresh();
}
function refresh(){
 $('#power').textContent=s.power?'Power off':'Power on';$('#cable').textContent=s.cable?'Unplug DB25':'Seat DB25';
 for(const k of contacts){const b=$('[data-lead='+k+']');b.textContent=k+(s.leads[k]?' ✓':' open');b.setAttribute('aria-pressed',String(s.leads[k]));}
 const c=s.config,r=s.result;msg.textContent=s.error||(!s.power?'Power off.':!s.cable?'DB25 disconnected.':contacts.some(k=>!s.leads[k])?'Connect all four leads.':r?'Acquisition complete.':'Ready for acquisition.');
 form.querySelectorAll('[data-mode]').forEach(el=>el.hidden=el.dataset.mode!==c.mode);
 els.rsOhm.disabled=c.pure;els.rpOhm.disabled=c.pure;$('#json').disabled=!r;$('#csv').disabled=!r;$('#wave').disabled=!r||c.mode!=='cv';
 if(!r)resultLine='No data acquired.';
 else if(c.mode==='eis'){
  const good=r.points.filter(p=>!p.overload),p=good.reduce((a,b)=>a===null||Math.abs(b.phaseDeg+45)<Math.abs(a.phaseDeg+45)?b:a,null);
  resultLine=p?'Rev '+r.revision+' · Closest to −45°: '+fmt(p.frequencyHz)+' Hz, '+fmt(p.magnitudeOhm)+' Ω, '+fmt(p.phaseDeg)+'°. '+r.overloadCount+' overloads.':'All '+r.overloadCount+' readings overloaded; choose a larger range or smaller drive.';
  if(r.fit)resultLine+=' '+(r.fit.totalResistanceOhm?'Fit total R '+fmt(r.fit.totalResistanceOhm)+' Ω.':(r.fit.rpOhm===null?'Fit pure capacitor':'Fit Rs '+fmt(r.fit.rsOhm)+' Ω, Rp '+fmt(r.fit.rpOhm)+' Ω')+', C '+fmt(r.fit.cF*1e6)+' µF; RMS residual '+fmt(r.fit.rmsComplexResidualOhm)+' Ω.');
 } else {
  const good=r.points.filter(p=>!p.overload).map(p=>p.currentA*1e6);resultLine='Rev '+r.revision+' · '+r.points.length+' readings over '+fmt(r.points.at(-1).timeS)+' s. '+(good.length?'Current '+fmt(Math.min(...good))+' to '+fmt(Math.max(...good))+' µA. ':'No unflagged current. ')+r.overloadCount+' overloads.';
 }$('#rx-result').textContent=resultLine;plot(r);update3D();paintXR();
}
form.addEventListener('input',ev=>{const f=ev.target,k=f.name;if(!k)return;const v=k==='sampleId'||k==='mode'?f.value:k==='pure'?f.value==='true':f.value===''?NaN:Number(f.value)/(uiScale[k]??1);send('set',{[k]:v})});
form.addEventListener('submit',ev=>{ev.preventDefault();send('run')});
for(const k of contacts)$('[data-lead='+k+']').onclick=()=>send('lead:'+k);
$('#power').onclick=()=>send('power');$('#cable').onclick=()=>send('cable');$('#presetEis').onclick=()=>send('preset');$('#presetCv').onclick=()=>send('cvDemo');
for(const [id,make] of Object.entries({json:r=>JSON.stringify(r,null,2)+'\n',csv,wave:r=>JSON.stringify(waveform(r),null,2)+'\n'}))$('#'+id).onclick=()=>{if(!s.result)return;const r=s.result,d=make(r),csvMode=id==='csv',u=URL.createObjectURL(new Blob([d],{type:csvMode?'text/csv':'application/json'})),a=document.createElement('a');a.href=u;a.download=(r.sampleId.replace(/[^\w-]/g,'_')||'sample')+'-r'+r.revision+'-'+(id==='wave'?'cv-voltage':r.configuration.mode)+(csvMode?'.csv':'.json');a.click();setTimeout(()=>URL.revokeObjectURL(u),1400)};
function plot(r){
 const svg=$('#rx-chart'),th=$('#rx-rows-head'),tb=$('#rx-rows');svg.replaceChildren();th.replaceChildren();tb.replaceChildren();if(!r)return;
 const n='http://www.w3.org/2000/svg',a=(tag,props,t)=>{const e=document.createElementNS(n,tag);for(const k in props)e.setAttribute(k,props[k]);if(t!==undefined)e.textContent=t;svg.append(e);};
 const eis=r.configuration.mode==='eis',ok=r.points.filter(p=>!p.overload),u=eis?['Re Z (Ω)','−Im Z (Ω)']:['Driven potential (V)','Current (µA)'];
 const pair=p=>eis?[p.reOhm,-p.imOhm]:[p.driveV,1e6*p.currentA];
 const xs=ok.map(p=>pair(p)[0]),ys=ok.map(p=>pair(p)[1]);
 const loX=Math.min(0,...xs),loY=Math.min(0,...ys),hiX=Math.max(0,...xs),hiY=Math.max(0,...ys);
 const dx=hiX-loX||1,dy=hiY-loY||1,X=x=>100+(x-loX)/dx*555,Y=y=>194-(y-loY)/dy*149;
 for(const v of [0,.5,1]){const z=loY+dy*v,xx=loX+dx*v;a('line',{x1:100,x2:655,y1:Y(z),y2:Y(z),stroke:'currentColor',opacity:.25});a('text',{x:7,y:Y(z)+5,fill:'currentColor','font-size':12},fmt(z));a('text',{x:X(xx)-13,y:216,fill:'currentColor','font-size':12},fmt(xx))}
 a('text',{x:7,y:25,fill:'currentColor','font-size':15},u[1]);a('text',{x:510,y:239,fill:'currentColor','font-size':15},u[0]);
 let d='',beg=true;for(const p of r.points){if(p.overload){beg=true;continue;}const [x,y]=pair(p);d+=(beg?'M':'L')+X(x)+' '+Y(y);beg=false;}
 a('path',{d,fill:'none',stroke:'currentColor','stroke-width':2.5});for(const p of ok){const [x,y]=pair(p);a('circle',{cx:X(x),cy:Y(y),r:2,fill:'currentColor'});}
 const heads=eis?['Hz','Z′ Ω','Z″ Ω','|Z| Ω','Phase °','Est. mA rms','Flag']:['Time s','V','Branch V','Current µA','Est. µA','Slope V/s','Flag'];
 const h=document.createElement('tr');th.append(h);for(const v of heads){const t=document.createElement('th');t.textContent=v;h.append(t)}
 for(const p of r.points){const tr=document.createElement('tr');tb.append(tr);const vals=eis?[p.frequencyHz,p.reOhm,p.imOhm,p.magnitudeOhm,p.phaseDeg,p.estimatedCurrentRmsA*1000]:[p.timeS,p.driveV,p.branchVoltageV,p.currentA===null?null:p.currentA*1e6,p.estimatedCurrentA*1e6,p.slopeVps];for(const v of [...vals.map(fmt),p.overload?'Overload':'OK']){const td=document.createElement('td');td.textContent=v;tr.append(td)}}
}
async function display(){
 const note=$('#rx-asset');
 try{
  const rend=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});rend.setPixelRatio(Math.min(devicePixelRatio,1.7));rend.outputColorSpace=THREE.SRGBColorSpace;rend.xr.enabled=true;
  const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);scene.background=new THREE.Color('#eae7dc');
  scene.add(new THREE.HemisphereLight(0xf9f0d5,0xa9bfcb,2.4));for(const [v,color,intensity] of [[[1,2,2],0xffffff,2.6],[[-1,1,-1],0xd5f0ff,1.6]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...v);scene.add(l);}
  const camera=new THREE.PerspectiveCamera(35,1,.003,10),orbit=new OrbitControls(camera,canvas);
  orbit.minDistance=.08;orbit.maxDistance=1.8;const render=()=>rend.render(scene,camera);
  orbit.addEventListener('change',render);
  const sized=()=>{const b=canvas.getBoundingClientRect();rend.setSize(b.width,b.height,false);camera.aspect=b.width/Math.max(b.height,1);camera.updateProjectionMatrix();render()};
  new ResizeObserver(()=>{if(!rend.xr.isPresenting)sized()}).observe(canvas);
  let viewName='bench';
  const views={bench:[[.48,.36,.70],[.092,.086,.10]],front:[[0,.095,.58],[0,.095,.02]],rear:[[0,.095,-.53],[0,.095,-.01]],side:[[.65,.12,.04],[.01,.08,.005]],work:[[.27,.26,.47],[.151,.016,.288]]};
  const view=k=>{viewName=k;const v=views[k];camera.position.set(...v[0]);orbit.target.set(...v[1]);orbit.update();render()};$('#rx-views').addEventListener('click',e=>{if(e.target.dataset.view&&!rend.xr.isPresenting)view(e.target.dataset.view)});sized();view(viewName);
  bench=(await new GLTFLoader().loadAsync('/equipment/09-01/reference-600-plus.glb')).scene;world.add(bench);
  const find=k=>bench.getObjectByName(k);const wireNodes=['plug','trunk','splitter','parked'];
  const paintIndicator=(name,color)=>find(name).traverse(o=>{if(o.isMesh&&o.material.name!=='chrome'){if(!o.userData.isolated){o.material=o.material.clone();o.userData.isolated=true}o.material.emissive.setHex(color);o.material.emissiveIntensity=color===0?.02:.48;}});
  update3D=()=>{for(const n of wireNodes)find(n).visible=s.cable;
    for(const k of contacts)find('lead_'+k).visible=s.cable&&s.leads[k];
    find('rear_rocker').rotation.x=s.power?.16:-.16;
    paintIndicator('led_cell',s.power&&s.result?0x48d37b:0);paintIndicator('led_power',s.power?0x3f8cff:0);paintIndicator('led_usb',s.power?0x27dabb:0);paintIndicator('led_overload',s.result?.overloadCount?0xff7027:0);render()};
  const ray=new THREE.Raycaster(),pos=new THREE.Vector2();let press;
  const hit=(r)=>{const found=r.intersectObject(world,true);for(const h of found){let o=h.object,visible=true,a;
    do{visible&&=o.visible;a??=o.userData.action;o=o.parent}while(o&&o!==scene);if(!visible)continue;if(a)send(a);break;}};
  canvas.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});canvas.addEventListener('pointerup',e=>{if(!press||Math.hypot(press[0]-e.clientX,press[1]-e.clientY)>4)return;const b=canvas.getBoundingClientRect();pos.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(pos,camera);hit(ray)});
  note.textContent='3D asset loaded · meter scale; operable rear switch, DB25, and four dummy-cell leads.';update3D();
  const xr=$('#rx-xr');if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr')){
   // Separate host panel in immersive mode, intentionally not part of the Gamry's enclosure.
   const pad=new THREE.Group();world.add(pad);pad.position.set(.11,.22,.20);pad.visible=false;
   const cards=(id,title,width,y)=>{const cv=document.createElement('canvas');cv.width=768;cv.height=160;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const o=new THREE.Mesh(new THREE.PlaneGeometry(width,.04),new THREE.MeshBasicMaterial({map:tex}));o.position.set(0,y,0);if(id)o.userData.action=id;pad.add(o);
    return (value=title)=>{const ctx=cv.getContext('2d');ctx.fillStyle='#132e37';ctx.fillRect(0,0,768,160);ctx.font='bold 47px sans-serif';ctx.fillStyle='#feebcc';ctx.fillText(value,22,99,724);tex.needsUpdate=true;};};
   const r0=cards('run','Run experiment',.20,.04),r1=cards(null,'',.28,0),r2=cards('cvDemo','Load capacitor CV demo',.20,-.04);r0();r2();paintXR=()=>r1(s.error||(s.result?resultLine:'Connected / ready to acquire'));
   xr.disabled=false;xr.textContent='Enter VR';xr.onclick=async()=>{if(rend.xr.isPresenting){await rend.xr.getSession().end();return;}
    try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});rend.xr.setReferenceSpaceType('local-floor');world.position.set(0,.93,-.64);pad.visible=true;paintXR();orbit.enabled=false;camera.position.set(0,0,0);camera.quaternion.identity();await rend.xr.setSession(session);xr.textContent='Exit VR';rend.setAnimationLoop(render);session.addEventListener('end',()=>{rend.setAnimationLoop(null);world.position.set(0,0,0);pad.visible=false;orbit.enabled=true;sized();view(viewName);xr.textContent='Enter VR'});}catch(e){world.position.set(0,0,0);pad.visible=false;orbit.enabled=true;view(viewName);note.textContent='Could not start immersive VR: '+e.message;}};
   for(let i=0;i<2;i++){const controller=rend.xr.getController(i);scene.add(controller);const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0xe5c78c}));controller.add(beam);controller.addEventListener('select',()=>{ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);hit(ray)})}
  }
 }catch(e){note.textContent='3D unavailable: '+e.message+'. Controls and measurements still work.'}
}
sync();refresh();display();
