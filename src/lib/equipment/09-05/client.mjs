import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/09-05/';
const url=new URL(path+'solver.mjs',window.location.origin).href;
const {dispatch,initial,toCsv,YS,XS}=await import(/* @vite-ignore */ url);
const app=document.querySelector('#crt465b'),$=k=>app.querySelector('#crt-'+k);
const fields=[['input','input'],['channel','channel'],['probe','probe','number'],['couple','coupling'],['volts','vDiv','number'],['time','msDiv','number'],['pos','posDiv','input'],['level','levelV','input'],['slope','slope'],['mode','mode'],['intensity','intensity','number'],['focus','focus','number']];
let state=initial(),result=null,paint=()=>{};
const fmt=(x,d=4)=>Number(x.toFixed(d)).toLocaleString('en-US',{maximumFractionDigits:d});
function status(msg,err=false){$('status').textContent=msg;$('status').dataset.error=String(err);}
function run(a,v){
 const before=state,r=dispatch(state,a,v);
 if(!r.ok){status(r.message,true);sync();return false;}
 state=r.state;
 if(r.result){
  result=r.result;
  const msgs={triggered:'A sweep triggered; retrace blanked.','free-run':'AUTO: no adequate transition; sweep free-ran.',blank:'No trigger. The CRT trace is blank.','not-armed':'Single sweep not armed. Press Arm single.'};
  status(msgs[result.outcome]);
 }else{
  const cosmetic=(a==='step-intensity'||a==='step-focus'||a==='set'&&Object.keys(v??{}).every(k=>['intensity','focus'].includes(k)));
  if(!cosmetic)result=null;
  status(state.armed?'Single sweep armed.':'Setting applied.');
 }
 sync();return true;
}
function graticule(c){
 const g=c.getContext('2d'),w=c.width,h=c.height,px=.025*w,py=.03*h,cw=w-2*px,ch=h-2*py,xx=v=>px+v*cw/10,yy=v=>py+(4-v)*ch/8;
 const shadow=g.createRadialGradient(w*.49,h*.49,w*.09,w*.5,h*.5,w*.6);
 shadow.addColorStop(0,state.power?'#173c43':'#263331');shadow.addColorStop(1,state.power?'#10282c':'#162320');
 g.fillStyle=shadow;g.fillRect(0,0,w,h);
 g.strokeStyle=state.power?'#4e6b6b':'#3b4b46';g.lineWidth=Math.max(.7,w/780);
 for(let i=0;i<=10;i++){g.beginPath();g.moveTo(xx(i),yy(4));g.lineTo(xx(i),yy(-4));g.stroke();}
 for(let i=-4;i<=4;i++){g.beginPath();g.moveTo(xx(0),yy(i));g.lineTo(xx(10),yy(i));g.stroke();}
 for(let i=1;i<50;i++){const x=xx(i/5);g.beginPath();g.moveTo(x,yy(.08));g.lineTo(x,yy(-.08));g.stroke();}
 for(let i=-19;i<20;i++){const y=yy(i/5);g.beginPath();g.moveTo(xx(4.92),y);g.lineTo(xx(5.08),y);g.stroke();}
 if(!state.power||!result?.screen)return;
 g.save();g.beginPath();g.rect(px,py,cw,ch);g.clip();
 g.strokeStyle='rgba(137,251,158,'+state.intensity+')';g.shadowColor='#70efa8';g.shadowBlur=1+w/150*(1-state.focus);
 g.lineWidth=(.9+2.7*(1-state.focus))*w/550;g.beginPath();
 for(const [i,q] of result.screen.entries()){const x=xx(q.spotXDiv),y=yy(q.spotYDiv);i?g.lineTo(x,y):g.moveTo(x,y);}
 g.stroke();g.restore();
}
function sync(){
 for(const [id,k] of fields)$(id).value=String(state[k]);
 $('power').textContent=state.power?'Power off':'Power on';
 $('probe-tip').textContent='Effective tip scale: '+fmt(state.vDiv*state.probe,6)+' V/div · 10 horizontal × 8 vertical divisions';
 $('json').disabled=$('csv').disabled=!result?.screen;
 const s=result?.summary;
 $('readout').textContent=s?(result.outcome==='triggered'?'Triggered A sweep':'Free-running A sweep')+' · '+fmt(s.visibleDivisions)+' div peak to peak · '+fmt(s.tipEquivalentVpp)+' Vpp tip equivalent · '+(s.estimatedPeriodS?fmt(1000*s.estimatedPeriodS)+' ms between triggers':'period unavailable')+(s.clipped?' · off-screen deflection':''):result?'Trace blank.':'No current trace.';
 graticule($('trace'));paint();
}
for(const [id,k,kind] of fields)$(id).addEventListener('change',e=>run('set',{[k]:kind==='input'?e.target.valueAsNumber:kind?Number(e.target.value):e.target.value}));
for(const a of ['power','reset','sweep','arm'])$(a).onclick=()=>run(a);
$('file').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{if(f.size>4_000_000)throw Error('Use a signed volts file under 4 MB.');run('import',JSON.parse(await f.text()));}catch(e){status('Import: '+e.message,true);}
};
function download(s,n,m){const u=URL.createObjectURL(new Blob([s],{type:m})),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>result?.screen&&download(JSON.stringify(result),'465b-screen-sweep.json','application/json');
$('csv').onclick=()=>result?.screen&&download(toCsv(result),'465b-screen-sweep.csv','text/csv');
async function viewer(){
 const host=$('viewer'),sc=new THREE.Scene(),c=new THREE.PerspectiveCamera(36,1,.004,5),r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 sc.background=new THREE.Color('#263439');r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=THREE.SRGBColorSpace;
 host.append(r.domElement);r.domElement.setAttribute('aria-label','Orbitable Tektronix 465B with an internal CRT display. All actions are available in the form.');
 const oc=new OrbitControls(c,r.domElement),render=()=>r.render(sc,c);oc.minDistance=.09;oc.maxDistance=2;oc.addEventListener('change',render);
 sc.add(new THREE.HemisphereLight(0xffffff,0x646e72,2.0));
 for(const [p,e] of [[[.47,.6,.66],2.6],[[-.39,.4,-.67],1.6]]){const x=new THREE.DirectionalLight(0xffffff,e);x.position.fromArray(p);sc.add(x);}
 const grid=new THREE.GridHelper(1.2,24,0x648986,0x4d6565);grid.position.y=-.002;sc.add(grid);
 const [g,b]=await Promise.all([new GLTFLoader().loadAsync(path+'465b.glb'),fetch(path+'interaction.json').then(e=>e.json())]);const model=g.scene;sc.add(model);
 const find=n=>{const hits=[];model.traverse(x=>{if(x.name===n)hits.push(x);});if(hits.length!==1)throw Error('Invalid model node '+n);return hits[0];};
 find(b.frame.placementAnchor);b.ports.forEach(x=>find(x.node));model.updateMatrixWorld(true);
 const crt=find('crt_graticule'),bmp=document.createElement('canvas');bmp.width=640;bmp.height=512;
 const t=new THREE.CanvasTexture(bmp);t.colorSpace=THREE.SRGBColorSpace;
 const map=new THREE.Mesh(new THREE.PlaneGeometry(.100,.080),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
 map.position.z=.00054;crt.add(map);
 const l=['ready','power','trigger'];for(const k of l){const x=find('led_'+k);x.material=x.material.clone();}
 paint=()=>{
  graticule(bmp);t.needsUpdate=true;
  for(const k of l){const on=state.power&&(k==='power'||k==='ready'&&state.armed||k==='trigger'&&result?.outcome==='triggered');const m=find('led_'+k).material;m.color.set(on?'#82dc61':'#445548');m.emissive.set(on?'#33872d':'#000000');}
  render();
 };
 const targets=b.controls.map(x=>{const p=new THREE.Mesh(new THREE.BoxGeometry(...x.targetSizeM),new THREE.MeshBasicMaterial({visible:false}));p.userData.row=x;find(x.node).getWorldPosition(p.position);sc.add(p);return p;});
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();sc.updateMatrixWorld(true);
 for(const p of targets){ray.set(p.position.clone().add(new THREE.Vector3(0,0,.2)),new THREE.Vector3(0,0,-1));if(ray.intersectObjects(targets)[0]?.object!==p)throw Error('Interaction target obstructed: '+p.userData.row.id);}
 function hit(e){const rr=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-rr.left)/rr.width-1,1-2*(e.clientY-rr.top)/rr.height);ray.setFromCamera(v,c);return ray.intersectObjects(targets)[0]?.object.userData.row;}
 let at=null;r.domElement.addEventListener('pointerdown',e=>{at=[e.clientX,e.clientY];});
 r.domElement.addEventListener('pointerup',e=>{if(at&&Math.hypot(e.clientX-at[0],e.clientY-at[1])<6){const x=hit(e);if(x)run(x.action,x.value);}at=null;});
 r.domElement.addEventListener('pointermove',e=>{const x=hit(e);r.domElement.style.cursor=x?'pointer':'grab';r.domElement.title=x?.label??'Orbit the instrument';});
 const poses={orbit:[[.47,.30,.64],[0,.074,.017]],front:[[0,.105,.65],[0,.084,.196]],rear:[[0,.105,-.66],[0,.074,-.184]],crt:[[0,.094,.437],[0,.089,.210]]};
 function view(k){c.position.fromArray(poses[k][0]);oc.target.fromArray(poses[k][1]);oc.update();render();}
 app.querySelectorAll('[data-crt-view]').forEach(x=>x.onclick=()=>view(x.dataset.crtView));
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render();};
 new ResizeObserver(resize).observe(host);resize();view('orbit');paint();
 $('model').textContent='Metric GLB loaded · real-scale CRT · '+targets.length+' action targets';$('model').dataset.loaded='true';
}
sync();run('sweep');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'; the numerical CRT bench still works.';$('viewer').style.display='none';});
