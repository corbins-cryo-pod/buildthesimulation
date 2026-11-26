import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStation,targets,pose} from '../../../../public/equipment/05-08/station.mjs';
import {defaults,baseTransform,frame} from '../../../../public/equipment/05-08/optics.mjs';
import {makeStudyZIP} from '../../../../public/equipment/05-08/archive.mjs';

const root='/equipment/05-08/',st=createStation(),$=n=>document.getElementById(n),form=$('dsa-config'),sensor=$('image');
const raw=document.createElement('canvas'),rawCtx=raw.getContext('2d'),g=sensor.getContext('2d');
let renderedImage=null,draw3=()=>{},first=null,picking=false,importSeq=0;
function tell(s,error=false){$('message').textContent=s;$('message').classList.toggle('is-error',error);}
function action(id,payload,notice,sync=false){
 const a=st.dispatch(id,payload);
 if(sync)for(const [k,v] of Object.entries(a.config))form.elements[k].value=Number.isNaN(v)?'':v;
 if(a.error)tell(a.error.message,true);
 else if(a.result)tell('Fit complete · '+a.result.sampleId+' / revision '+a.result.revision+'.');
 else if(notice)tell(notice);
 else if(id==='capture')tell('Silhouette captured. Inspect the baseline and fit a circle.');
 else if(id==='deposit')tell('Water deposited. Capture a silhouette to measure it.');
 else if(id==='toggleLight')tell(a.light?'Backlight on. Capture again.':'Backlight off.');
 else if(id==='toggleCoupon')tell(a.loaded?'Coupon seated. Deposit water.':'Coupon removed.');
 update();draw3();
}
function dataFor(im){
 const c=new ImageData(im.width,im.height);
 for(let j=0,k=0;j<im.pixels.length;j++,k+=4){c.data[k]=c.data[k+1]=c.data[k+2]=im.pixels[j];c.data[k+3]=255;}
 return c;
}
const str=(x,unit,p=3)=>x.toFixed(p)+' '+unit;
function update(){
 const s=st.read(),r=s.result,im=s.image;
 if(im!==renderedImage){
  first=null;picking=false;sensor.dataset.picking='false';renderedImage=im;
  if(im){raw.width=im.width;raw.height=im.height;rawCtx.putImageData(dataFor(im),0,0);sensor.width=im.width;sensor.height=im.height;}
  else{sensor.width=frame.width;sensor.height=frame.height;}
  const b=s.baseline??im?.baseline;$('baselineAngle').value=b?.angleDeg??0;$('baselineY').value=b?.yAtCenterPx??frame.baselineY;
 }
 const enabled=Boolean(im);
 for(const k of ['mark','png','fit','apply-baseline','baselineY','baselineAngle'])$(k).disabled=!enabled;
 $('json').disabled=$('archive').disabled=!r;
 $('sample').textContent=s.loaded?'Remove coupon':'Load coupon';$('sample').setAttribute('aria-pressed',String(s.loaded));
 $('light').textContent=s.light?'Switch off LED':'Switch on LED';$('light').setAttribute('aria-pressed',String(s.light));
 const mm=s.config.umPerPx;
 $('image-meta').textContent=im?`${im.width} × ${im.height} px · ${im.provenance.origin} · ${mm} µm/px entered calibration`:'Virtual field: 424 × 284 px. Dark silhouette on a bright background. Imports remain in your browser.';
 const values=r?{left:str(r.angles.leftDeg,'°',2),right:str(r.angles.rightDeg,'°',2),spread:str(r.uncertainty.angleSpreadDeg,'°',2),rms:str(r.fit.radialRmsPx,'px'),diam:str(r.geometry.baseDiameterMm,'mm'),height:str(r.geometry.heightMm,'mm')}:{left:'—',right:'—',spread:'—',rms:'—',diam:'—',height:'—'};
 for(const [name,v] of Object.entries(values))document.querySelector('[data-meter="'+name+'"]').textContent=v;
 overlay(s);
}
function overlay(s){
 const w=sensor.width,h=sensor.height;
 if(!s.image){g.fillStyle='#26363a';g.fillRect(0,0,w,h);g.fillStyle='#dfebdf';g.font='16px system-ui';g.fillText('Capture or import an image to fit.',20,36);return;}
 g.drawImage(raw,0,0);
 const base=s.baseline??s.image.baseline,c={...base,yAtCenterPx:base.yAtCenterPx+(Number(s.config.baselineShiftPx)||0)};
 const transform=baseTransform(w,c),[ax,ay]=transform.pixel(-w,0),[bx,by]=transform.pixel(w,0);
 g.strokeStyle='#3bcaa9';g.lineWidth=1.4;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
 if(first){g.fillStyle='#1b9e7d';g.beginPath();g.arc(...first,4,0,Math.PI*2);g.fill();}
 if(!s.result)return;
 const fit=s.result.fit,[u,v]=fit.centerLocalPx,r=fit.radiusPx;
 g.fillStyle='#e69829';
 for(const [x,y] of s.edge)g.fillRect(x-1,y-1,2,2);
 for(const [p,sign] of [[fit.leftContactPx,1],[fit.rightContactPx,-1]]){
  const [ux]=transform.local(...p),dx=ux-u,dy=-v,len=Math.min(29,r*.5),tip=transform.pixel(ux+sign*dy*len/r,-sign*dx*len/r);
  g.strokeStyle='#2e9cbd';g.lineWidth=2;g.beginPath();g.moveTo(...p);g.lineTo(...tip);g.stroke();
  g.fillStyle='#f1b342';g.beginPath();g.arc(...p,3.4,0,Math.PI*2);g.fill();
 }
}
form.oninput=()=>{const c=Object.fromEntries(Object.keys(defaults).map(k=>[k,typeof defaults[k]==='number'?form.elements[k].valueAsNumber:form.elements[k].value]));action('configure',c,'Settings updated. Capture again if the optical conditions changed.');};
$('sample').onclick=()=>action('toggleCoupon');$('light').onclick=()=>action('toggleLight');
$('deposit').onclick=()=>action('deposit');$('capture').onclick=()=>action('capture');$('fit').onclick=()=>action('fit');
$('reset').onclick=()=>{importSeq++;action('reset',null,'The example coupon is loaded.',true);};
$('example').onclick=()=>{importSeq++;action('reset',null,null,true);action('deposit');action('capture');action('fit');};
$('apply-baseline').onclick=()=>{
 const a=$('baselineAngle').valueAsNumber,y=$('baselineY').valueAsNumber,im=st.read().image;
 if(!im||!Number.isFinite(a)||Math.abs(a)>20||!Number.isFinite(y)||y<im.height*.18||y>im.height*.94){tell('Baseline exceeds the supported range. Check slope and center height.',true);return;}
 action('setBaseline',{angleDeg:a,yAtCenterPx:y},'Baseline set. Fit the image.');
};
$('mark').onclick=()=>{first=null;picking=true;sensor.dataset.picking='true';tell('Click two widely separated points at the surface edge, from left to right or right to left.');};
sensor.addEventListener('click',e=>{
 if(!picking)return;const b=sensor.getBoundingClientRect(),xy=[(e.clientX-b.left)*sensor.width/b.width,(e.clientY-b.top)*sensor.height/b.height];
 if(!first){first=xy;overlay(st.read());return;}
 const dx=xy[0]-first[0],dy=xy[1]-first[1];if(Math.abs(dx)<sensor.width*.20){tell('Use two points at least one fifth of the image width apart.',true);return;}
 const slope=dy/dx,y=first[1]+slope*((sensor.width-1)/2-first[0]),a=Math.atan(slope)*180/Math.PI;
 first=null;picking=false;sensor.dataset.picking='false';$('baselineY').value=y.toFixed(2);$('baselineAngle').value=a.toFixed(2);$('apply-baseline').click();
});
$('file').onchange=async()=>{
 const f=$('file').files?.[0];if(!f)return;const seq=++importSeq;
 try{
  if(!/^image\/(png|jpeg)$/.test(f.type)||f.size>10e6)throw Error('Choose a PNG or JPEG smaller than 10 MB.');
  const b=await createImageBitmap(f),w=b.width,h=b.height;if(w<64||h<64||w>1920||h>1200){b.close();throw Error('Use dimensions between 64×64 and 1,920×1,200 px.');}
  const c=document.createElement('canvas');c.width=w;c.height=h;const gg=c.getContext('2d');gg.fillStyle='white';gg.fillRect(0,0,w,h);gg.drawImage(b,0,0);b.close();const rgba=gg.getImageData(0,0,w,h).data,pixels=new Uint8Array(w*h);
  for(let i=0,j=0;i<pixels.length;i++,j+=4)pixels[i]=Math.round(.2126*rgba[j]+.7152*rgba[j+1]+.0722*rgba[j+2]);
  if(seq!==importSeq)return;
  action('importImage',{width:w,height:h,pixels,provenance:{origin:'user-supplied image; not authenticated',filename:f.name,conversion:'decoded local grayscale'}},'Set the coupon baseline and calibrated pixel size before fitting.');
 }catch(e){if(seq===importSeq)tell('Could not import image: '+e.message,true);}finally{$('file').value='';}
};
function save(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
const png=()=>new Promise((resolve,reject)=>raw.toBlob(b=>b?resolve(b):reject(Error('Could not encode PNG')),'image/png'));
$('json').onclick=()=>{const r=st.read().result;if(r)save('sessile-drop-fit.json',new Blob([JSON.stringify(r,null,2)+'\n'],{type:'application/json'}));};
$('png').onclick=async()=>{if(st.read().image)try{save('sessile-drop-sensor.png',await png());}catch(e){tell(e.message,true);}};
$('archive').onclick=async()=>{const r=st.read().result;if(!r)return;try{const b=await png();save('sessile-drop-study.zip',makeStudyZIP(r,new Uint8Array(await b.arrayBuffer())));}catch(e){tell(e.message,true);}};

async function viewer(){
 const c=$('model'),renderer=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});renderer.setClearColor('#283640');renderer.setPixelRatio(Math.min(1.65,window.devicePixelRatio));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.0001,6),ctrl=new OrbitControls(camera,c);ctrl.minDistance=.002;ctrl.maxDistance=3.5;
 scene.add(new T.HemisphereLight('#f4faff','#c4b8a0',2.1));
 for(const [pt,col,level] of [[[.44,1,.42],'#ffeace',3.7],[[-.6,.44,-.6],'#cce8f9',2.3]]){const l=new T.DirectionalLight(col,level);l.position.set(...pt);scene.add(l);}
 const model=(await new GLTFLoader().loadAsync(root+'dsa100b.glb')).scene;scene.add(model);
 const get=k=>{const n=model.getObjectByName(k);if(!n)throw Error('Missing mesh '+k);return n;};
 const stage=get('Lift_stage'),coupon=get('Coupon'),dropOrigin=get('Droplet_origin'),led=get('LED_field'),lightButton=get('Power_indicator');
 const lamp=new T.MeshBasicMaterial({color:'#69c4ff'}),off=new T.MeshStandardMaterial({color:'#3b4a51',roughness:.6});
 const water=new T.Mesh(new T.SphereGeometry(1,46,18),new T.MeshPhysicalMaterial({color:'#89bad1',roughness:.16,metalness:.06,transparent:true,opacity:.72,clearcoat:1,depthWrite:false}));dropOrigin.add(water);
 let key='',lastLift=0;
 const render=()=>renderer.render(scene,camera),views={bench:[[.59,.49,.87],[0,.247,0]],front:[[0,.253,.98],[0,.242,0]],optical:[[.25,.45,.47],[0,.325,.036]],coupon:[[.009,.3233,.048],[0,.321,.036]],rear:[[-.54,.50,-.85],[0,.24,0]]};
 draw3=()=>{
  const p=pose(st.read());
  if(c.dataset.view==='coupon'&&p.stageLiftM!==lastLift){camera.position.y+=p.stageLiftM-lastLift;ctrl.target.y+=p.stageLiftM-lastLift;ctrl.update();}
  lastLift=p.stageLiftM;stage.position.y=p.stageLiftM;coupon.visible=p.couponVisible;led.material=lightButton.material=p.led?lamp:off;
  water.visible=!!p.drop;
  if(p.drop){
   const z=p.drop,k=z.thetaRad.toString();
   if(key!==k){water.geometry.dispose();water.geometry=new T.SphereGeometry(1,56,28,0,2*Math.PI,0,z.thetaRad);key=k;}
   water.position.y=z.centerVM;water.scale.setScalar(z.radiusM);
  }
  render();
 };
 function view(name){const [pos,target]=views[name]??views.bench;camera.position.set(...pos);ctrl.target.set(...target);lastLift=0;c.dataset.view=name;ctrl.update();draw3();}
 for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>view(b.dataset.view);$('view-reset').onclick=()=>view('bench');
 ctrl.addEventListener('change',render);
 new ResizeObserver(()=>{const b=c.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();}).observe(c.parentElement);
 let pt;c.onpointerdown=e=>pt=[e.clientX,e.clientY];
 c.onpointerup=e=>{
  if(!pt||Math.hypot(e.clientX-pt[0],e.clientY-pt[1])>5)return;
  const b=c.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera({x:2*(e.clientX-b.left)/b.width-1,y:1-2*(e.clientY-b.top)/b.height},camera);
  for(const v of ray.intersectObject(model,true)){
   let n=v.object,which=null,visible=true;
   while(n){if(!n.visible){visible=false;break;}if(!which&&Object.hasOwn(targets,n.name))which=targets[n.name];n=n.parent;}
   if(which&&visible){action(which,null,which==='focusStep'?'Stage moved. Check virtual focus before capture.':null,which==='focusStep');return;}
  }
 };
 view('bench');$('model-state').textContent='Metric GLB loaded · 128 named nodes · 42 KiB. Photo-informed outside geometry.';c.dataset.ready='true';
}
update();viewer().catch(e=>{$('model-state').textContent='3D unavailable: '+e.message+'. Capture and analysis still work.';});
