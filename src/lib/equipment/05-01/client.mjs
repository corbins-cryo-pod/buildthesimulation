import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const dir='/equipment/05-01/',url=new URL(dir+'solver.mjs',location.origin).href;
const {initial,step,csv}=await import(/* @vite-ignore */ url);
const el=document.querySelector('#dektakxt'),$=k=>el.querySelector('#prof-'+k);
const ids=['length','center','points','radius','range','speed','tilt','noise','repeats','direction','level'];
const fmt=(x,n=6)=>Number(x.toFixed(n)).toString();
let s=initial(),out=null,update3D=()=>{},play=()=>{};
function status(message,e=false){$('status').textContent=message;$('status').dataset.error=String(e);}
function act(a,v){const q=step(s,a,v);if(!q.ok){if(a==='scan')out=null;status(q.message,true);sync();return;}
 s=q.state;out=q.result??null;
 status(out?'Acquired '+out.runs.length+' trace(s).':a==='hood'?(s.hood?'Hood open; stylus parked.':'Hood closed. Lower the stylus to scan.'):'Setting applied.');
 sync();if(out)play(out.runs[0].trace);
}
for(const k of ids)$(k).onchange=e=>act('settings',{[k]:k==='level'?e.target.checked:k==='direction'?e.target.value:e.target.tagName==='SELECT'?Number(e.target.value):e.target.valueAsNumber});
for(const k of ['hood','power','load','tower','standard','scan','reset'])$(k).onclick=()=>act(k);
$('mill').onclick=async()=>{try{const f=await fetch(dir+'ionmill-input-example.json');if(!f.ok)throw Error('Example unavailable');act('import',{raw:await f.json(),example:true});}catch(e){status(e.message,true);}};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;
 try{if(f.size>1e6)throw Error('Use a JSON file below 1 MB.');act('import',{raw:JSON.parse(await f.text()),row:$('row').value===''?undefined:$('row').valueAsNumber});}catch(err){status('Import: '+err.message,true);}
 e.target.value='';
};
function download(body,type,ext){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download='DektakXT-'+out.scanRevision+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>out&&download(JSON.stringify(out),'application/json','json');$('csv').onclick=()=>out&&download(csv(out),'text/csv','csv');
function draw(c){
 const g=c.getContext('2d'),w=c.width,h=c.height,k=w/700;
 g.fillStyle=s.power?'#122b3a':'#152027';g.fillRect(0,0,w,h);if(!s.power)return;
 g.fillStyle='#bcf5ee';g.font='bold '+24*k+'px sans-serif';g.fillText('DEKTAK XT / SURFACE TRACE',18*k,34*k);
 const p=91*k,q=64*k,r=w-28*k,b=h-61*k;
 const x0=s.center-s.length/2, x1=s.center+s.length/2;
 const all=out?out.runs.flatMap(n=>n.trace.map(v=>v.z)):[0,10],lo=Math.min(...all),hi=Math.max(...all),pad=Math.max(.004,.11*(hi-lo)),y0=lo-pad,y1=hi+pad;
 const X=x=>p+(x-x0)/(x1-x0)*(r-p),Y=y=>b-(y-y0)/(y1-y0)*(b-q);
 g.strokeStyle='#516a73';g.lineWidth=k;g.font=15*k+'px sans-serif';
 for(let i=0;i<=6;i++){const x=p+(r-p)*i/6;g.beginPath();g.moveTo(x,q);g.lineTo(x,b);g.stroke();if(i%2===0)g.fillText(fmt(x0+(x1-x0)*i/6,1),x-10*k,b+20*k);}
 for(let i=0;i<=4;i++){const y=q+(b-q)*i/4;g.beginPath();g.moveTo(p,y);g.lineTo(r,y);g.stroke();g.fillText(fmt(y1-(y1-y0)*i/4,3),8*k,y+5*k);}
 g.fillText('Z / µm',10*k,q-9*k);g.fillText('Sample X / µm',p,b+49*k);
 if(!out)return;
 g.save();g.beginPath();g.rect(p,q,r-p,b-q);g.clip();
 for(const [a,b] of out.windowsUm){g.fillStyle='#52786e66';g.fillRect(X(a),q,X(b)-X(a),h);}
 for(const run of out.runs){g.strokeStyle=run.direction==='forward'?'#7ce4d1':'#f4d480';g.lineWidth=2.4*k;g.setLineDash(run.direction==='reverse'?[7*k,4*k]:[]);g.beginPath();run.trace.forEach((e,i)=>i?g.lineTo(X(e.x),Y(e.z)):g.moveTo(X(e.x),Y(e.z)));g.stroke();}
 g.restore();
}
function sync(){
 ids.forEach(k=>k==='level'?$(k).checked=s[k]:$(k).value=s[k]);
 $('hood').textContent=s.hood?'Close draft hood':'Open draft hood';$('hood').setAttribute('aria-pressed',String(s.hood));
 $('tower').textContent=s.down?'Raise stylus tower':'Lower stylus tower';$('power').textContent=s.power?'Power off':'Power on';$('load').textContent=s.loaded?'Unload sample':'Load sample';
 $('sample').textContent=s.loaded?s.sample.sampleId+' · revision '+s.sample.revision:'No sample installed.';
 $('csv').disabled=$('json').disabled=!out;
 $('result').textContent=out?fmt(out.meanStepUm)+' µm mean step · '+out.runs.map(x=>x.direction).join(' / '):'No current acquisition.';
 $('uncertainty').textContent=out?(out.modeledExpandedUm===null?'Repeat scans to estimate modeled uncertainty.':'Modeled U (k=2): '+fmt(out.modeledExpandedUm*1000,4)+' nm · repeat SD '+fmt(out.sampleSdUm*1000,4)+' nm')+(out.referenceExpandedUm?' · separate reference interval ±'+fmt(out.referenceExpandedUm*1000)+' nm':''):'';
 $('rows').replaceChildren();
 for(const o of out?.runs??[]){const tr=document.createElement('tr');for(const x of [o.direction,fmt(o.signedStepUm),fmt(o.slopeUmPerMm),o.counts.join(' / '),fmt(o.trace.at(-1).time)]){const d=document.createElement('td');d.textContent=x;tr.append(d);} $('rows').append(tr);}
 draw($('graph'));update3D();
}
async function model(){
 const host=$('viewer'),scene=new T.Scene(),c=new T.PerspectiveCamera(42,1,.007,8),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#293941');host.append(r.domElement);r.domElement.setAttribute('aria-label','Orbitable metric DektakXT, hinged lid and working stage. The same controls are available as form buttons.');
 const o=new OrbitControls(c,r.domElement),render=()=>r.render(scene,c);o.addEventListener('change',render);o.minDistance=.13;o.maxDistance=3;
 scene.add(new T.HemisphereLight(0xffffff,0x708088,2.4));
 for(const [p,b] of [[[.60,.75,.81],2.0],[[-.48,.49,-.48],1.2]]){const l=new T.DirectionalLight(0xffffff,b);l.position.fromArray(p);scene.add(l);}
 const grid=new T.GridHelper(1.8,30,0x648b94,0x4e6469);grid.position.y=-.002;scene.add(grid);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(dir+'dektakxt.glb'),fetch(dir+'interaction.json').then(r=>r.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(x=>{if(x.name===n)a.push(x)});if(a.length!==1)throw Error('Missing action node '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);get(m.contacts.stylus);
 const hood=get('hood_hinge'),tower=get('stylus_tower'),towerY=tower.position.y,stage=get('scan_stage'),stageZ=stage.position.z,part=get('coupon_anchor'),led=get('status_lamp');
 led.material=led.material.clone();
 const surface=document.createElement('canvas');surface.width=700;surface.height=403;
 const tex=new T.CanvasTexture(surface);tex.colorSpace=T.SRGBColorSpace;
 get('display_anchor').add(new T.Mesh(new T.PlaneGeometry(.358,.207),new T.MeshBasicMaterial({map:tex,toneMapped:false})));
 const targets=m.controls.map(a=>{const x=new T.Mesh(new T.BoxGeometry(...a.size),new T.MeshBasicMaterial({visible:false}));x.userData=a;scene.add(x);return [get(a.node),x];});
 let token=0,delta=0,down=null;
 function move(){
  hood.rotation.x=s.hood?m.angleDeg*Math.PI/180:0;tower.position.y=towerY+(s.down?0:m.towerLiftM);stage.position.z=stageZ+delta;part.visible=s.loaded;
  led.material.color.set(s.power?'#68f298':'#3a5a42');led.material.emissive.set(s.power?'#258941':'#000000');
  scene.updateMatrixWorld(true);
  for(const [n,x] of targets){n.getWorldPosition(x.position);if(x.userData.offset)x.position.add(new T.Vector3(...x.userData.offset));x.updateMatrixWorld(true);}
  render();
 }
 const ray=new T.Raycaster(),v=new T.Vector2();
 function hit(e){if(c.position.z<-.01)return null;const b=r.domElement.getBoundingClientRect();v.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(v,c);return ray.intersectObjects(targets.map(x=>x[1]))[0]?.object.userData;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=hit(e);if(a)act(a.action);}down=null;};
 r.domElement.onpointermove=e=>{const a=hit(e);r.domElement.style.cursor=a?'pointer':'grab';r.domElement.title=a?.label??'Orbit the profiler';};
 update3D=()=>{token++;delta=0;draw(surface);tex.needsUpdate=true;move();};
 play=trace=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const t=performance.now(),n=++token;
  function frame(at){if(n!==token)return;
   const u=Math.max(0,Math.min(trace.length-1,Math.floor((at-t)/1100*trace.length)));
   delta=(trace[u].x-(trace[0].x+trace.at(-1).x)/2)/1e6;move();
   if(u<trace.length-1)requestAnimationFrame(frame);else{delta=0;move();}
  } requestAnimationFrame(frame);
 };
 const views={orbit:[[.50,.50,1.18],[-.16,.20,.03]],front:[[0,.30,.88],[0,.25,.07]],stage:[[.30,.37,.52],[0,.226,.067]],rear:[[.39,.41,-.87],[0,.20,-.13]],display:[[-.537,.31,.60],[-.537,.31,.06]]};
 const to=k=>{c.position.fromArray(views[k][0]);o.target.fromArray(views[k][1]);o.update();render();};
 el.querySelectorAll('[data-prof-view]').forEach(b=>b.onclick=()=>to(b.dataset.profView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();render();}).observe(host);
 to('orbit');update3D();$('model').textContent='Metric GLB loaded · 5 spatial actions and scan motion';$('model').dataset.loaded='true';
}
sync();act('scan');model().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'; numerical station still works.';$('viewer').style.display='none';});
