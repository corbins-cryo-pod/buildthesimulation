import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,defaults,roles,limits,interaction,toCSV,projectPose} from '../../../../public/equipment/09-12/station.mjs';

const root='/equipment/09-12/',station=createStation(),$=id=>document.getElementById(id),form=$('controls');
const wiring=[...document.querySelectorAll('select[data-role]')],buttons=[...document.querySelectorAll('button[data-cable]')];
let draw3=()=>{},nyquist=false;
const status=(s,error=false)=>{$('status').textContent=s;$('status').classList.toggle('problem',error)};
function sync(s){
 for(const [k,v] of Object.entries(s.config))form.elements[k].value=Number.isNaN(v)?'':String(v);
 for(const sel of wiring)sel.value=s.wiring[sel.dataset.role];
 for(const b of buttons){const k=b.dataset.cable,connected=s.wiring[k]!=='open';b.textContent=(connected?'Disconnect ':'Connect ')+k;b.setAttribute('aria-pressed',String(connected));}
 $('lift').textContent=s.lifted?'Lower cartridge':'Raise cartridge';$('lift').setAttribute('aria-pressed',String(s.lifted));
 for(const x of ['rpOhm','capUf'])form.elements[x].disabled=s.config.model==='slab';
}
function act(id,payload,description='Settings changed. Acquire a new sweep.'){
 const s=station.dispatch(id,payload);sync(s);
 if(s.error)status(s.error.message,true);
 else if(s.result){status('Sweep complete · '+s.result.sampleId+' / revision '+s.result.revision+'. Simulated, not a hardware measurement.');$('point').value='0';}
 else status(description);
 refresh();draw3();
}
const format=(a,u='')=>new Intl.NumberFormat(undefined,{maximumSignificantDigits:5}).format(a)+(u?' '+u:'');
const value=(n,v)=>document.querySelector('[data-meter="'+n+'"]').textContent=v;
function refresh(){
 const o=station.read().result,p=$('point');p.disabled=$('json').disabled=$('csv').disabled=!o;
 if(o)p.max=o.samples.length-1;
 const q=o?.samples[Math.min(Number(p.value),o.samples.length-1)];
 for(const [key,v] of Object.entries(q?{sol:format(o.cellCircuit.solutionOhm,'Ω'),freq:format(q[0],'Hz'),mag:format(q[3],'Ω'),deg:format(q[4],'°'),cur:q[7]>=.001?format(q[7]*1e3,'mA'):format(q[7]*1e6,'µA')}:{sol:'—',freq:'—',mag:'—',deg:'—',cur:'—'}))value(key,v);
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#233530';g.fillRect(0,0,w,h);g.fillStyle='#e5eee4';g.font='22px system-ui';
 if(!o){g.fillText('Acquire a sweep to display simulated data.',40,43);return;}
 const X=nyquist?s=>s[1]:s=>Math.log10(s[0]),Y=nyquist?s=>-s[2]:s=>s[3];
 const xs=o.samples.map(X),ys=o.samples.map(Y),a=Math.min(...xs),b=Math.max(...xs),d=Math.max(...ys),pad=b-a||Math.max(.01,a*.12);
 const xlo=nyquist?a-pad*.04:a,xhi=nyquist?b+pad*(a===b?1:.04):b,ymax=Math.max(d*1.12,nyquist?.01:1);
 const px=130,ex=w-45,py=h-55,ey=35,gx=r=>px+(ex-px)*(X(r)-xlo)/(xhi-xlo),gy=r=>py-(py-ey)*Y(r)/ymax;
 g.strokeStyle='#6c877c';g.lineWidth=1;g.beginPath();g.moveTo(px,ey);g.lineTo(px,py);g.lineTo(ex,py);g.stroke();
 g.fillText(nyquist?'−Im Z [Ω]':'|Z| [Ω]',15,30);g.fillText(format(ymax),15,ey+16);g.fillText('0',100,py);
 g.fillText(nyquist?'Re Z [Ω]':'Frequency [Hz, log]',w/2-80,h-15);
 g.fillText(format(nyquist?xlo:o.samples[0][0]),px,py+32);g.fillText(format(nyquist?xhi:o.samples.at(-1)[0]),w-162,py+32);
 g.strokeStyle='#9dd9b9';g.lineWidth=3;g.beginPath();o.samples.forEach((r,i)=>i?g.lineTo(gx(r),gy(r)):g.moveTo(gx(r),gy(r)));g.stroke();
 if(q){g.fillStyle='#f1c783';g.beginPath();g.arc(gx(q),gy(q),8,0,Math.PI*2);g.fill();}
}
form.oninput=()=>{
 const fields=Object.keys(defaults).map(k=>[k,typeof defaults[k]==='number'?form.elements[k].valueAsNumber:form.elements[k].value]);
 const s=station.dispatch('configure',Object.fromEntries(fields));
 for(const x of ['rpOhm','capUf'])form.elements[x].disabled=s.config.model==='slab';
 status('Settings changed. Acquire a new sweep.');refresh();draw3();
};
wiring.forEach(s=>s.onchange=()=>act('wire',{lead:s.dataset.role,terminal:s.value}));
buttons.forEach(b=>b.onclick=()=>act('toggle'+b.dataset.cable));
$('lift').onclick=()=>act('toggleLift');$('acquire').onclick=()=>act('acquire');
$('double').onclick=()=>{const sigmaSm=station.read().config.sigmaSm*2;if(!Number.isFinite(sigmaSm)||sigmaSm>limits.sigmaSm[1]){status('Doubling would exceed the virtual conductivity range.',true);return;}act('configure',{sigmaSm},'Conductivity doubled. Acquire to see solution resistance halve.');};
$('example').onclick=()=>act('defaults',null,'Ready. Acquire to measure the ideal 100 Ω slab.');
$('point').oninput=refresh;
$('plot-mode').onclick=()=>{nyquist=!nyquist;$('plot-mode').textContent=nyquist?'Show frequency plot':'Show Nyquist plot';$('plot-mode').setAttribute('aria-pressed',String(nyquist));$('plot-caption').textContent=nyquist?'Nyquist convention: real Z versus negative imaginary Z. Export retains signed Im(Z).':'Log frequency versus impedance magnitude. The marker reports phase and current.';refresh();};
function save(name,body,type){
 const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('json').onclick=()=>{const r=station.read().result;if(r)save('three-electrode-cell-boundary.json',JSON.stringify(r,null,2)+'\n','application/json');};
$('csv').onclick=()=>{const r=station.read().result;if(r)save('three-electrode-impedance-spectrum.csv',toCSV(r),'text/csv');};

async function viewport(){
 const canvas=$('fixture'),r=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(1.6,devicePixelRatio));r.setClearColor('#263936');r.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.002,6),ctrl=new OrbitControls(camera,canvas);ctrl.minDistance=.065;ctrl.maxDistance=.64;
 scene.add(new T.HemisphereLight('#f7fbf8','#b5c0ae',2.25));
 for(const [p,color,n] of [[[.11,.25,.20],'#fff7db',3.2],[[-.14,.13,-.14],'#d3ebe6',2]]){const l=new T.DirectionalLight(color,n);l.position.set(...p);scene.add(l);}
 const model=(await new GLTFLoader().loadAsync(root+'cell-fixture.glb')).scene;scene.add(model);
 const get=name=>{const o=model.getObjectByName(name);if(!o)throw Error('Missing model component '+name);return o;};
 const lift=get('Lift_cartridge'),probe=get('Probe_WE'),electrode=get('WE_contact_square'),path=get('Uniform_path'),volume=get('Active_window'),glass=get('Glass_vessel_shell'),ring=get('Lid_outer_ring'),clips=Object.fromEntries(roles.map(k=>[k,get('Clip_'+k)]));
 for(const [i,k] of roles.entries()){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#eaf5e9';g.font='bold 44px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(k,64,64);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(.014,.014),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set([-.003,.007,.025][i],.0182,.053);scene.add(m);
 }
 const render=()=>r.render(scene,camera),views={bench:[[.20,.17,.25],[0,.047,0]],ports:[[.12,.205,.175],[0,.086,0]],sense:[[.105,.097,.17],[0,.041,0]],rear:[[-.19,.135,-.225],[0,.044,0]]};
 draw3=()=>{
  const p=projectPose(station.read());lift.position.y=p.liftY;probe.position.x=p.workingX;electrode.scale.y=electrode.scale.z=p.side;
  volume.position.x=p.conductiveCenterX;path.scale.set(...p.conductiveVolume);path.visible=p.conductiveVisible;
  glass.visible=ring.visible=canvas.dataset.view!=='sense';
  for(const k of roles){clips[k].position.set(...p.clips[k].translation);clips[k].rotation.y=p.clips[k].yawRad;}
  render();
 };
 function view(v){const [from,to]=views[v]||views.bench;camera.position.set(...from);ctrl.target.set(...to);canvas.dataset.view=v;ctrl.update();draw3();}
 for(const b of document.querySelectorAll('button[data-view]'))b.onclick=()=>view(b.dataset.view);
 $('reset-view').onclick=()=>view('bench');ctrl.addEventListener('change',render);
 new ResizeObserver(()=>{const b=canvas.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;r.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}).observe(canvas.parentElement);
 let start;canvas.onpointerdown=e=>start=[e.clientX,e.clientY];
 canvas.onpointerup=e=>{
  if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
  const b=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},camera);
  for(const h of ray.intersectObject(model,true)){let n=h.object,k=null,visible=true;while(n){if(!n.visible){visible=false;break;}if(!k&&Object.hasOwn(interaction,n.name))k=n.name;n=n.parent;}if(visible&&k){act(interaction[k]);return;}}
 };
 view('bench');$('model-status').textContent='Metric GLB loaded · 100 named nodes · 38.4 KiB. Original CAD dimensions.';canvas.dataset.ready='true';
}
sync(station.read());refresh();
viewport().catch(e=>{$('model-status').textContent='3D unavailable: '+e.message+'. The experiment and downloads still work.';});
