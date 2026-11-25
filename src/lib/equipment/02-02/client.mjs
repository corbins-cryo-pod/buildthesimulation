import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const asset='/equipment/02-02/';
const $=id=>document.getElementById('mjb-'+id);
async function main(){
 const {defaults,demoMask,exposure,fit,pose,overlay,checkMask}=await import(/* @vite-ignore */ (asset+'solver.mjs'));
 const form=$('fields'),field=k=>form.elements.namedItem(k),keys=Object.keys(defaults).filter(k=>!['mask','loaded','clamped','contact'].includes(k));
 let inserted=true,loaded=true,clamped=true,contact=false,busy=false,cut=false,result=null,applied={xMm:0,yMm:0,thetaDeg:0},root=null,render=()=>{},couponTexture=null,maskTexture=null;
 const number=k=>field(k).value.trim()===''?NaN:Number(field(k).value);
 function read(){let mask=null;try{mask=JSON.parse($('mask').value)}catch{}return {...Object.fromEntries(keys.map(k=>[k,k==='sampleId'?field(k).value:number(k)])),mask,loaded:loaded&&inserted,clamped,contact};}
 const status=(text,fail=false)=>{$('status').textContent=text;$('status').dataset.fail=String(fail)};
 function setDefaults(){for(const k of keys)field(k).value=String(defaults[k]);$('mask').value=JSON.stringify(demoMask,null,2);}
 function blank(canvas,text){const ctx=canvas.getContext('2d');ctx.fillStyle='#202b33';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e1e0d4';ctx.font='16px Arial';ctx.textAlign='center';ctx.fillText(text,canvas.width/2,canvas.height/2);return ctx}
 function drawOverlay(){const canvas=$('overlay'),ctx=blank(canvas,'');const info=overlay({...read(),...applied});if(!info){blank(canvas,'Mask invalid');return}
 const scale=26;for(let i=0;i<2;i++){const x=130+i*240,y=158,f=info[i];ctx.strokeStyle='#52616b';ctx.strokeRect(x-105,y-105,210,210);ctx.strokeStyle='#35444e';for(let j=-3;j<=3;j++){ctx.beginPath();ctx.moveTo(x+j*scale,y-100);ctx.lineTo(x+j*scale,y+100);ctx.moveTo(x-100,y+j*scale);ctx.lineTo(x+100,y+j*scale);ctx.stroke()}
 const cross=(px,py,c)=>{ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px-18,py);ctx.lineTo(px+18,py);ctx.moveTo(px,py-18);ctx.lineTo(px,py+18);ctx.stroke();ctx.lineWidth=1};cross(x,y,'#e5c478');ctx.save();ctx.beginPath();ctx.rect(x-104,y-104,208,208);ctx.clip();cross(x+f.delta[0]*scale,y-f.delta[1]*scale,'#78c8dd');ctx.restore();ctx.fillStyle='#e1e0d4';ctx.textAlign='center';ctx.font='15px Arial';ctx.fillText(f.id,x,35);ctx.fillText('Δx '+f.delta[0].toFixed(3)+' mm',x,292);ctx.fillText('Δy '+f.delta[1].toFixed(3)+' mm',x,315);}
 }
 function drawDose(){const canvas=$('dose'),ctx=blank(canvas,result?'':'Expose to calculate dose');if(!result)return;const g=result.grid,off=document.createElement('canvas');off.width=g.nx;off.height=g.ny;const c=off.getContext('2d'),im=c.createImageData(g.nx,g.ny);
 for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const a=4*((g.ny-1-j)*g.nx+i),v=g.values[j*g.nx+i]>0;im.data.set(v?[226,184,84,255]:[42,57,72,255],a)}c.putImageData(im,0,0);const scale=Math.min(284/result.sample.widthMm,284/result.sample.heightMm),w=result.sample.widthMm*scale,h=result.sample.heightMm*scale;ctx.imageSmoothingEnabled=false;ctx.drawImage(off,250-w/2,162-h/2,w,h);ctx.strokeStyle='#d2d9d9';ctx.strokeRect(250-w/2,162-h/2,w,h);ctx.textAlign='left';ctx.font='13px Arial';ctx.fillStyle='#e1e0d4';ctx.fillText('0',14,316);ctx.fillStyle='#e2b854';ctx.fillRect(28,306,14,12);ctx.fillText(result.exposure.peakDoseMjCm2.toFixed(2)+' mJ/cm²',50,316);ctx.textAlign='right';ctx.fillStyle='#e1e0d4';ctx.fillText(result.sample.widthMm+' × '+result.sample.heightMm+' mm',486,316);
 }
 function showResult(){const el=$('result');el.replaceChildren();if(!result){el.textContent='No current exposure result.';return}const dl=document.createElement('dl');const f=n=>Number(n.toFixed(6));for(const [k,v] of [['Sample / revision',result.sampleId+' / '+result.parentRevision+' → '+result.revision],['Mask revision',result.mask.id+' / '+result.mask.revision],['Peak dose',f(result.statistics.maxDoseMjCm2)+' mJ/cm²'],['Exposed area',f(result.statistics.exposedAreaMm2)+' mm²'],['Exposed cells',result.statistics.exposedPixels+' / '+result.grid.values.length],['Grid',result.grid.nx+' × '+result.grid.ny],['Fiducial 1 residual',result.fiducials[0].residualMm.map(f).join(', ')+' mm'],['Fiducial 2 residual',result.fiducials[1].residualMm.map(f).join(', ')+' mm']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd)}el.append(dl);}
 function clear(msg){result=null;$('progress').value=0;showResult();drawDose();if(msg)status(msg);sync()}
 function modelNode(name){return root?.getObjectByName(name)}
 function sync(){
 $('slide').disabled=busy||contact;$('slide').textContent=inserted?'Withdraw slide':'Insert slide';
 $('load').disabled=busy||inserted||contact;$('load').textContent=loaded?'Unload specimen':'Load specimen';
 $('clamp').disabled=busy||contact;$('clamp').textContent=clamped?'Release mask':'Clamp mask';
 $('contact').disabled=busy||!loaded||!inserted||!clamped;$('contact').textContent=contact?'Separate coupon':'Bring into contact';
 $('apply').disabled=busy||contact||!inserted||!loaded;$('align').disabled=busy||contact||!loaded||!inserted||!clamped;
 $('run').disabled=busy||!loaded||!inserted||!clamped||!contact;$('example').disabled=busy;$('json').disabled=!result||busy;$('csv').disabled=!result||busy;
 for(const k of keys)field(k).disabled=busy||(['xMm','yMm','thetaDeg'].includes(k)&&contact)||(['widthMm','heightMm','thicknessUm','sampleId','revision'].includes(k)&&loaded);
 $('mask').disabled=busy||clamped;$('import').disabled=busy||clamped;
 $('machine').textContent=(busy?'EXPOSING':contact?'CONTACT':'SEPARATION / RELEASE')+' · '+(inserted?'slide inserted':'slide withdrawn')+' · '+(loaded?'coupon loaded':'no coupon')+' · '+(clamped?'mask clamped':'mask released')+' · applied X '+applied.xMm.toFixed(3)+' / Y '+applied.yMm.toFixed(3)+' mm / θ '+applied.thetaDeg.toFixed(2)+'°';
 drawOverlay();if(!root)return;const s=read(),transport=modelNode('transport'),stage=modelNode('stage_pose'),coupon=modelNode('coupon'),holder=modelNode('mask_holder'),microscope=modelNode('microscope'),head=modelNode('exposure_head'),lever=modelNode('contact_lever'),sep=modelNode('separation_lever');
 transport.position.x=-.095+(inserted?0:.12);
 const t=Number.isFinite(s.thicknessUm)?s.thicknessUm/1e6:.0005;
 stage.position.set(applied.xMm/1000,contact?.1888-.178-.009-t:0,-applied.yMm/1000);stage.rotation.y=applied.thetaDeg*Math.PI/180;
 coupon.visible=loaded;if(fit(s).ok){coupon.scale.set(s.widthMm/1000,t,s.heightMm/1000);coupon.position.y=.009+t/2;}
 holder.position.x=-.095-(clamped?0:.12);microscope.visible=!cut;microscope.position.z=.121+(busy?.10:0);head.position.z=-.03+(busy?.10:0);
 lever.rotation.x=contact?Math.PI:0;sep.rotation.x=contact?0:-.45;
 $('cut').setAttribute('aria-pressed',String(cut));
 if(couponTexture){const plane=couponTexture;plane.visible=loaded&&!!result;plane.position.y=.009+t+.00012;if(fit(s).ok)plane.scale.set(s.widthMm/1000,s.heightMm/1000,1);if(result){const g=result.grid,c=plane.material.map.image,ctx=c.getContext('2d');c.width=g.nx;c.height=g.ny;const image=ctx.createImageData(g.nx,g.ny);for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const k=4*((g.ny-1-j)*g.nx+i);image.data.set(g.values[j*g.nx+i]>0?[235,191,78,255]:[53,70,90,255],k)}ctx.putImageData(image,0,0);plane.material.map.needsUpdate=true;}}
 if(maskTexture){const c=maskTexture.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);const m=s.mask;if(checkMask(m).ok){ctx.fillStyle='rgba(35,48,55,0.48)';ctx.fillRect(0,0,256,256);ctx.globalCompositeOperation='destination-out';for(const f of m.clear)ctx.fillRect((f.x-f.w/2+38.1)*256/76.2,(38.1-f.y-f.h/2)*256/76.2,f.w*256/76.2,f.h*256/76.2);ctx.globalCompositeOperation='source-over';}maskTexture.material.map.needsUpdate=true;}
 render();
 }
 function apply(){const s=read(),v=pose(s);if(!v.ok){clear();status(v.code+': '+v.message+' Last valid pose retained; no new revision.',true);return false}applied={xMm:s.xMm,yMm:s.yMm,thetaDeg:s.thetaDeg};clear('Stage pose applied.');return true}
 $('apply').onclick=apply;$('align').onclick=()=>{for(const k of ['xMm','yMm','thetaDeg'])field(k).value='0';apply();status('Two nominal marks aligned by identity transform. Contact and expose.')};
 $('slide').onclick=()=>{if(contact||busy)return;inserted=!inserted;clear(inserted?'Slide inserted.':'Slide withdrawn; specimen can be exchanged.')};
 $('load').onclick=()=>{if(inserted||contact||busy)return;if(loaded){loaded=false;clear('Coupon removed. Incoming revision preserved.');return}const v=fit(read());if(!v.ok){status(v.code+': '+v.message,true);return}loaded=true;clear('Coupon fits virtual chuck and covers assumed vacuum holes.')};
 $('clamp').onclick=()=>{if(contact||busy)return;if(!clamped){const v=checkMask(read().mask);if(!v.ok){status(v.code+': '+v.message,true);return}}clamped=!clamped;clear(clamped?'Mask clamped.':'Mask withdrawn. Edit or import artwork.')};
 $('contact').onclick=()=>{if(busy)return;if(contact){contact=false;clear('Separated. Stage adjustments enabled.');return}if(!apply())return;const f=fit(read()),m=checkMask(read().mask);if(!f.ok||!m.ok){status((!f.ok?f:m).message,true);return}contact=true;sync();status('Contact engaged. Expose to calculate the latent dose map.')};
 $('cut').onclick=()=>{cut=!cut;sync()};
 for(const k of keys)field(k).addEventListener('input',()=>clear(['xMm','yMm','thetaDeg'].includes(k)?'Requested pose changed; apply it while separated.':'Settings changed. Current result cleared.'));
 $('mask').addEventListener('input',()=>clear('Mask changed. Clamp before exposing.'));
 $('import').onchange=async()=>{try{const f=$('import').files?.[0];if(!f)return;if(f.size>100000)throw Error('Mask exceeds 100 kB.');const m=JSON.parse(await f.text()),v=checkMask(m);if(!v.ok)throw Error(v.message);$('mask').value=JSON.stringify(m,null,2);clear('Mask artwork imported.')}catch(e){status('Import rejected: '+e.message,true)}finally{$('import').value=''}};
 async function run(){if(busy)return;const state=read(),r=exposure(state);if(!r.ok){clear();status(r.code+': '+r.message,true);return}busy=true;result=null;showResult();drawDose();sync();status('Virtual exposure in progress (compressed playback).');const start=performance.now();await new Promise(resolve=>{const timer=setInterval(()=>{$('progress').value=Math.min(1,(performance.now()-start)/700)},50);setTimeout(()=>{clearInterval(timer);$('progress').value=1;resolve()},700)});busy=false;result=r.sampleRevision;showResult();drawDose();status(r.message);sync()}
 $('run').onclick=run;
 $('example').onclick=()=>{if(busy)return;setDefaults();inserted=loaded=clamped=true;contact=true;applied={xMm:0,yMm:0,thetaDeg:0};clear('Aligned example loaded.');run()};
 function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('json').onclick=()=>{if(result)download('02-02-latent-dose.json',JSON.stringify(result,null,2),'application/json')};
 $('csv').onclick=()=>{if(!result)return;const g=result.grid,rows=['sample_id,revision,x_mm,y_mm,dose_mJ_cm2'];const id='"'+result.sampleId.replaceAll('"','""')+'"';for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++)rows.push([id,result.revision,g.originMm[0]+(i+.5)*g.spacingMm[0],g.originMm[1]+(j+.5)*g.spacingMm[1],g.values[j*g.nx+i]].join(','));download('02-02-dose-map.csv',rows.join('\n')+'\n','text/csv')};
 setDefaults();field('xMm').value='.6';field('yMm').value='-.4';field('thetaDeg').value='2';applied={xMm:.6,yMm:-.4,thetaDeg:2};sync();drawDose();
 try{
 const renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x29343d);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.002,15),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.05;controls.maxDistance=3;controls.enableDamping=false;
 scene.add(new THREE.HemisphereLight(0xf1f3ff,0x8a8070,2.6));const key=new THREE.DirectionalLight(0xfff0d7,3);key.position.set(1,2,1);scene.add(key);const fill=new THREE.DirectionalLight(0xc1d9ff,1.8);fill.position.set(-1,1,-1);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshStandardMaterial({color:0x39464e,roughness:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=-.007;scene.add(floor);const grid=new THREE.GridHelper(2,20,0x647681,0x465762);grid.position.y=-.006;scene.add(grid);
 render=()=>renderer.render(scene,camera);controls.addEventListener('change',render);
 function resize(){const b=$('canvas').parentElement.getBoundingClientRect();if(b.width>0&&b.height>0){renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render()}}
 const views={reset:[[.92,.62,1.1],[.065,.24,.02]],front:[[.5,.45,1.15],[.06,.23,.03]],side:[[-.98,.48,.57],[-.065,.24,0]],rear:[[-.75,.60,-1.03],[.03,.23,-.04]],load:[[.14,.31,.43],[-.07,.18,.12]],optics:[[.09,.41,.55],[-.095,.265,.12]]};
 function view(v){const [p,t]=views[v]||views.reset;camera.position.fromArray(p);controls.target.fromArray(t);controls.update();render()}
 view('reset');new ResizeObserver(resize).observe($('canvas').parentElement);
 const gltf=await new GLTFLoader().loadAsync(asset+'mjb3.glb');root=gltf.scene;scene.add(root);for(const n of ['transport','stage_pose','coupon','mask_holder','microscope','exposure_head','contact_lever','separation_lever'])if(!modelNode(n))throw Error('Missing functional node: '+n);
 function plane(parent,size,y){const c=document.createElement('canvas');c.width=c.height=256;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=y;parent.add(m);return m}
 couponTexture=plane(modelNode('stage_pose'),1,.0096);maskTexture=plane(modelNode('mask_holder'),.0762,-.00015);
 // Original label plates: not a reproduction of manufacturer artwork.
 function label(text,w,h,pos,bg='#4b4a3e',fg='#f6f0dd'){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.fillStyle=fg;g.font='bold 46px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,64);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));m.position.fromArray(pos);root.add(m)}
 label('MJB 3',.068,.015,[-.095,.145,.203]);label('LAMP POWER',.103,.015,[.35,.065,.081],'#26282a','#f2b561');
 for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{if(b.dataset.view==='load')cut=true;else cut=false;sync();view(b.dataset.view);$('canvas').scrollIntoView({block:'nearest'})});
 sync();renderer.setSize(480,300,false);camera.aspect=1.6;camera.updateProjectionMatrix();
 const prior={inserted,cut};for(const name of ['front','side','load','rear','optics']){inserted=name!=='load';cut=name==='load';sync();view(name);$('ref-'+name).src=renderer.domElement.toDataURL('image/png')};inserted=prior.inserted;cut=prior.cut;sync();resize();view('reset');
 $('model-status').textContent='3D asset loaded · GLB · physical meters · 171 named components.';
 }catch(e){$('model-status').textContent='3D viewer unavailable: '+e.message+'. Numerical workspace remains available.';}
}
main().catch(e=>{$('status').textContent='Simulator initialization failed: '+e.message;$('status').dataset.fail='true'});
