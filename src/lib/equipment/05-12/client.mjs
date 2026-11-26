import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {defaults,importLines,csv} from '../../../../public/equipment/05-12/diffraction.mjs';
import {createStation,pose,interactions} from '../../../../public/equipment/05-12/station.mjs';
const root='/equipment/05-12/',S=createStation(),$=id=>document.getElementById(id),form=$('xrd-setup');
let redraw=()=>{},active=null;
const tell=(txt,bad=false)=>{$('status').textContent=txt;$('status').classList.toggle('err',bad);};
function update(resultChanged=true){
 const s=S.read(),r=s.result;
 $('door').textContent=s.open?'Close virtual cabinet':'Open virtual cabinet';$('specimen').textContent=s.loaded?'Remove reference sample':'Seat reference sample';
 $('angle').value=s.angle;$('angular').textContent=s.angle.toFixed(2)+'° 2θ';form.elements.dA.disabled=s.config.source!=='single';
 $('export-csv').disabled=$('export-json').disabled=!r;
 if(resultChanged){
  const body=$('peaks');body.replaceChildren();
  for(const p of r?.peaks??[]){
   const row=document.createElement('tr');
   for(const cell of [p.label+' · '+p.phaseLabel,p.dSpacingA.toFixed(5),p.predicted2ThetaDeg?.toFixed(4)??'not allowed',p.centerDeg?.toFixed(4)??p.status,p.fwhmDeg?.toFixed(4)??'—']){
    const x=document.createElement('td');x.textContent=cell;row.append(x);
   }
   if(p.centerDeg){const btn=document.createElement('button');btn.textContent=p.centerDeg.toFixed(4);btn.onclick=()=>act('setAngle',p.centerDeg);row.children[3].replaceChildren(btn);}
   body.append(row);
  }
 }
 plot(s);redraw();
}
function act(id,p,note,sync=false){
 const s=S.dispatch(id,p);
 if(sync)for(const [k,v] of Object.entries(s.config))form.elements[k].value=Number.isNaN(v)?'':String(v);
 const cursor=id==='setAngle'||id==='stepAngle';
 if(!cursor){
  if(s.error)tell(s.error.message,true);
  else if(s.result)tell('Synthetic sweep complete · '+s.result.spectrum.length+' points · revision '+s.result.revision+'.');
  else if(note)tell(note);
  else tell('Virtual setup changed. Run a new sweep.');
 }
 update(!cursor);
}
const setup=()=>Object.fromEntries(Object.keys(defaults).map(k=>[k,typeof defaults[k]==='number'?form.elements[k].valueAsNumber:form.elements[k].value]));
form.oninput=()=>act('configure',setup());
$('angle').oninput=()=>act('setAngle',$('angle').valueAsNumber);
$('door').onclick=()=>act('toggleDoor');$('specimen').onclick=()=>act('toggleSample');
$('scan').onclick=()=>act('scan');$('clear').onclick=()=>act('reset',null,'Silicon reference seated.',true);
$('ideal').onclick=()=>{act('reset',null,null,true);act('configure',{...defaults,source:'single',wavelengthA:2,dA:2,startDeg:55,endDeg:65},'Ideal first-order 60° case loaded.',true);act('scan');};
$('import').onchange=async()=>{const f=$('import').files?.[0];if(!f)return;try{if(f.size>20000)throw Error('File exceeds 20 kB.');active={filename:f.name,lines:importLines(await f.text())};act('import',active,f.name+' loaded. Run a sweep.',true);}catch(e){tell('Import rejected: '+e.message,true);}finally{$('import').value='';}};
const chart=$('profile');
function plot(s){
 const c=chart,g=c.getContext('2d'),w=c.width,h=c.height,r=s.result;g.fillStyle='#223530';g.fillRect(0,0,w,h);g.font='22px system-ui';g.fillStyle='#e1ece0';
 if(!r){g.fillText('Run the silicon or isolated-line sweep.',40,46);return;}
 const arr=r.spectrum,a=arr[0][0],b=arr.at(-1)[0],ymax=1.1*Math.max(...arr.map(p=>p[1])),map=x=>95+(w-125)*(x-a)/(b-a);
 const y0=h-55,Y=x=>y0-x*(y0-38)/ymax;
 g.strokeStyle='#698578';g.beginPath();g.moveTo(95,36);g.lineTo(95,y0);g.lineTo(w-30,y0);g.stroke();
 g.fillText('I (a.u.)',12,27);g.fillText(ymax.toFixed(0),18,55);g.fillText(a.toFixed(1)+'°',94,h-19);g.fillText(b.toFixed(1)+'°',w-130,h-19);g.fillText('2θ',w/2-21,h-18);
 g.strokeStyle='#b7e2cd';g.lineWidth=2.2;g.beginPath();arr.forEach(([x,y],i)=>i?g.lineTo(map(x),Y(y)):g.moveTo(map(x),Y(y)));g.stroke();
 if(s.angle>=a&&s.angle<=b){const x=map(s.angle);g.strokeStyle='#edba68';g.beginPath();g.moveTo(x,34);g.lineTo(x,y0);g.stroke();}
}
chart.onclick=e=>{const r=S.read().result;if(!r)return;const b=chart.getBoundingClientRect(),uv=((e.clientX-b.left)*chart.width/b.width-95)/(chart.width-125),a=r.spectrum[0][0],z=r.spectrum.at(-1)[0];act('setAngle',a+(z-a)*Math.max(0,Math.min(1,uv)));};
function save(n,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('export-json').onclick=()=>{const r=S.read().result;if(r)save('virtual-xrd-scan.json',JSON.stringify(r,null,2),'application/json');};
$('export-csv').onclick=()=>{const r=S.read().result;if(r)save('virtual-xrd-spectrum.csv',csv(r),'text/csv');};
async function viewer(){
 const c=$('xr-model'),renderer=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#263039');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.01,20),orb=new OrbitControls(camera,c);orb.enablePan=true;orb.minDistance=.23;orb.maxDistance=8;
 scene.add(new T.HemisphereLight('#ebf8ff','#d4c1a4',2));
 for(const [p,q,i] of [[[1.2,3,2],'#ffead0',3.15],[[-2,1,-2],'#d9f2ff',2]]){const l=new T.DirectionalLight(q,i);l.position.set(...p);scene.add(l);}
 const model=(await new GLTFLoader().loadAsync(root+'dmax-b.glb')).scene;scene.add(model);const N=x=>model.getObjectByName(x);
 const left=N('Door_left'),right=N('Door_right'),holder=N('Sample_theta'),detector=N('Goniometer_2theta'),axis=N('Bragg_axis'),insert=N('Silicon_reference_insert');
 if(!left||!axis||!detector)throw Error('Missing GLB interaction nodes');
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(9),3));const line=new T.Line(geo,new T.LineBasicMaterial({color:'#ffc270'}));line.frustumCulled=false;axis.add(line);
 const render=()=>renderer.render(scene,camera),views={outside:[[2.05,1.91,3.65],[0,.97,0]],inside:[[.47,1.62,1.03],[0,1.16,-.038]],rear:[[-1.95,1.67,-3.64],[0,.95,0]]};
 redraw=()=>{
  const s=S.read(),k=pose(s),hide=c.dataset.view==='inside';left.position.x=k.leftDoorX;right.position.x=k.rightDoorX;holder.rotation.y=k.sampleAngleRad;detector.rotation.y=k.detectorAngleRad;insert.visible=k.sampleVisible;
  N('Door_glass_left').visible=N('Door_glass_right').visible=!hide;
  geo.attributes.position.array.set([-.185,0,0,0,0,0,...k.detectorOffsetM]);geo.attributes.position.needsUpdate=true;
  line.visible=hide;render();
 };
 function view(name){const [a,b]=views[name]??views.outside;camera.position.set(...a);orb.target.set(...b);c.dataset.view=name;orb.update();redraw();}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('reset-view').onclick=()=>view('outside');orb.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}).observe(c.parentElement);
 let down;c.onpointerdown=e=>down=[e.clientX,e.clientY];c.onpointerup=e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=c.getBoundingClientRect(),ray=new T.Raycaster();
  ray.setFromCamera({x:(e.clientX-b.left)*2/b.width-1,y:1-(e.clientY-b.top)*2/b.height},camera);
  for(const x of ray.intersectObject(model,true)){let a=x.object,k=null,bad=false;while(a){if(!a.visible){bad=true;break;}if(!k&&Object.hasOwn(interactions,a.name))k=interactions[a.name];a=a.parent;}if(k&&!bad){act(k);return;}}
 };
 view('outside');c.dataset.ready='true';$('model-status').textContent='Metric GLB loaded · 152 named nodes · 185 mm documented goniometer radius.';
}
update();viewer().catch(e=>{$('model-status').textContent='3D unavailable: '+e.message+'. The virtual scan still works.';});
