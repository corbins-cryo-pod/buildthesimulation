import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/16-01/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,sweep,table:tableSpec}=await import(/* @vite-ignore */url);
const app=document.querySelector('#optical16'),$=k=>app.querySelector('#ot-'+k),f=(x,n=3)=>Number(x.toFixed(n)).toString(),triple=v=>v.map(x=>f(x,2)).join(', ');
const fields=['ix','iz','spacingMm','xShiftMm','zShiftMm','frequencyHz','baseUm','addedKg'];
let s=initial(),render3d=()=>{};
function setStatus(message,err){$('status').textContent=message;$('status').dataset.error=String(err);}
function act(a,v){const q=dispatch(s,a,v);s=q.state;setStatus(q.message,!q.ok);sync();}
for(const a of ['snap','release','shift','load','run','reset'])$(a).onclick=()=>act(a);
for(const k of fields)$(k).onchange=e=>act('settings',{[k]:e.currentTarget.valueAsNumber});
$('file').onchange=async e=>{const file=e.currentTarget.files[0];if(!file)return;try{if(file.size>16000)throw Error('Use a JSON fixture below 16 kB.');act('import',JSON.parse(await file.text()));}catch(e){setStatus('Import: '+e.message,true);}e.target.value='';};
$('export').onclick=()=>{if(!s.measured)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(s.measured,null,2)+'\n'],{type:'application/json'}));a.href=u;a.download='optical-table-16-01-'+s.sequence+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),700);};
function sync(){
 for(const k of fields)$(k).value=s.settings[k];
 $('load').textContent=s.settings.addedKg?'Remove centered load':'Add 60 kg equivalent load';
 $('load').setAttribute('aria-pressed',String(s.settings.addedKg>0));
 $('release').disabled=!s.fit;$('export').disabled=!s.measured;
 const m=s.measured;
 $('fit').textContent=s.fit?'Mounted: '+s.fit.occupied.map(q=>q.id).join(', ')+' · relative XYZ = ('+triple(s.fit.localMm)+') mm.':'No fixture snapped to the table.';
 $('world').textContent=s.fit?'World XYZ = ('+triple(s.fit.localMm.map((v,i)=>v+[s.settings.xShiftMm,tableSpec.workingYmm,s.settings.zShiftMm][i]))+') mm.':'';
 $('result').textContent=m?'Table: '+f(m.response.tablePeakUm)+' µm peak · '+f(m.response.gainDb,2)+' dB · phase '+f(m.response.phaseDeg,1)+'°. '+(s.fit?'Mounted fixture shares this motion.':'No fixture response because mount is detached.'):'Run the selected base tone to calculate the table response.';
 $('modal').textContent=m?'Modeled fₙ = '+f(m.response.naturalHz)+' Hz · isolation crossover = '+f(m.response.crossoverHz)+' Hz.':'';
 drawPlot();render3d();
}
function drawPlot(){
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height,l=65,r=w-26,t=47,b=h-62,db=d=>Math.max(-48,Math.min(16,d)),X=x=>l+x/25*(r-l),Y=y=>t+(16-db(y))/64*(b-t);
 g.fillStyle='#152d39';g.fillRect(0,0,w,h);g.fillStyle='#bbd9df';g.font='bold 20px sans-serif';g.fillText('VERTICAL DISPLACEMENT TRANSMISSIBILITY',16,31);
 g.font='15px sans-serif';g.lineWidth=1;g.strokeStyle='#536c77';
 for(let x=0;x<=25;x+=5){g.beginPath();g.moveTo(X(x),t);g.lineTo(X(x),b);g.stroke();g.fillText(String(x),X(x)-5,b+23);}
 for(let x=-48;x<=16;x+=8){g.strokeStyle=x===0?'#a0bcc0':'#536c77';g.beginPath();g.moveTo(l,Y(x));g.lineTo(r,Y(x));g.stroke();g.fillText(String(x),18,Y(x)+5);}
 g.fillText('Base-tone frequency (Hz)',l,b+50);g.fillText('dB',14,t-9);
 g.lineWidth=2.6;g.strokeStyle='#88e9ca';g.beginPath();
 sweep(s.settings.addedKg).forEach((q,i)=>i?g.lineTo(X(q.fHz),Y(q.gainDb)):g.moveTo(X(q.fHz),Y(q.gainDb)));g.stroke();
 if(s.measured){g.fillStyle='#ffe182';g.beginPath();g.arc(X(s.settings.frequencyHz),Y(s.measured.response.gainDb),5.7,0,2*Math.PI);g.fill();}
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.010,18),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));r.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#273944');host.append(r.domElement);r.domElement.setAttribute('aria-label','Metric optical isolation table with four passive legs and a detachable two-hole witness.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.18;orbit.maxDistance=8;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x748890,2.2));
 for(const [v,i] of [[[.54,2,1.25],2.4],[[-1.5,1.45,-1.6],1.65]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(v);scene.add(l);}
 const floor=new T.GridHelper(5,36,0x6c858b,0x536973);floor.position.y=-.004;scene.add(floor);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'optical-table.glb'),fetch(path+'interaction.json').then(r=>r.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Missing model binding '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const table=get(m.parts.translation),witness=get(m.parts.witness),pendant=get(m.parts.payload),left=get(m.parts.leftPin),right=get(m.parts.rightPin),bridge=get('mount_bridge');
 const targets=m.actions.map(a=>{const proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(proxy);proxy.userData.a=a;return [get(a.node),proxy];});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null;
 function pick(e){const rect=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);ray.setFromCamera(v,cam);return ray.intersectObjects(targets.filter(([,p])=>p.userData.a.action==='release'?s.fit:cam.position.z>table.position.z+.55).map(([,p])=>p))[0]?.object.userData.a;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=pick(e);if(a)act(a.action);}down=null;};
 r.domElement.onpointermove=e=>{const a=pick(e);r.domElement.style.cursor=a?'pointer':'grab';r.domElement.title=a?.label??'Orbit the table';};
 render3d=()=>{
  table.position.x=s.settings.xShiftMm/1000;table.position.z=s.settings.zShiftMm/1000;
  pendant.visible=s.settings.addedKg>0;witness.visible=!!s.fit;
  if(s.fit){
   witness.position.x=s.fit.localMm[0]/1000;witness.position.z=s.fit.localMm[2]/1000;
   left.position.x=-s.fit.separationMm/2000;right.position.x=s.fit.separationMm/2000;bridge.scale.x=(s.fit.separationMm+19)/69;
  }
  scene.updateMatrixWorld(true);for(const [n,p] of targets){n.getWorldPosition(p.position);n.getWorldQuaternion(p.quaternion);p.updateMatrixWorld(true);}draw();
 };
 const poses={orbit:[[1.79,1.46,2.52],[0,.49,0]],front:[[.08,1.08,2.72],[0,.47,.1]],grid:[[.30,1.28,.72],[-.04,.913,.28]],rear:[[-1.65,1.36,-2.25],[0,.43,-.15]]};
 function pose(k){const shift=[table.position.x+(k==='grid'&&s.fit?s.fit.localMm[0]/1000+.0625:0),0,table.position.z+(k==='grid'&&s.fit?s.fit.localMm[2]/1000-.2875:0)];cam.position.fromArray(poses[k][0].map((v,i)=>v+shift[i]));orbit.target.fromArray(poses[k][1].map((v,i)=>v+shift[i]));orbit.update();draw();}
 app.querySelectorAll('[data-ot-view]').forEach(b=>b.onclick=()=>pose(b.dataset.otView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 render3d();pose('orbit');$('model').textContent='Metric GLB loaded · Four isolators, 25 mm grid and removable witness';$('model').dataset.loaded='true';
}
act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. Mount and numerical controls still work.';$('viewer').style.display='none';});
