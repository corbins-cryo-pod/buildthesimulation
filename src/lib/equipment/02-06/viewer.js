import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function initPAS(){
 const $=id=>document.getElementById('pas-'+id);
 const fields=['waferDiameter_mm','waferThickness_mm','reticleThickness_mm','rows','columns','fieldWidth_mm','fieldHeight_mm','pitchX_mm','pitchY_mm','offsetX_mm','offsetY_mm','overlayX_nm','overlayY_nm','rotation_urad','edgeExclusion_mm','partialPolicy','dose_mJ_cm2','sampleId','parentRevision','reticleId'];
 const textFields=new Set(['partialPolicy','sampleId','reticleId']);
 const solverUrl='/equipment/02-06/solver.mjs';
 let mod;try{mod=await import(/* @vite-ignore */ solverUrl)}catch(e){$('status').textContent='Cannot load solver: '+e.message;return}
 const {solve,defaultJob,geometricDoseAt}=mod;
 const opticsUrl='/equipment/02-06/optics.mjs';let optical;try{optical=await import(/* @vite-ignore */ opticsUrl)}catch(e){$('status').textContent='Cannot load optics: '+e.message;return}
 const {opticalAssay,defaultOptics}=optical;
 const optKeys=Object.keys(defaultOptics);let assay=null,waferPattern=null,reticlePattern=null,lastTexture='';
 let plan=null,done=0,state='EMPTY',token=0,busy=false,committed=null,current=-1,cut=false,asset=null,renderer=null,scene=null,camera=null,controls=null,stage=null,wafer=null,reticle=null,beam=null,viewName='whole';
 const posStage=new THREE.Vector3(),posWafer=new THREE.Vector3(),posReticle=new THREE.Vector3();
 const $buttons=['auto','load-reticle','load-wafer','align','step','unload','export','csv'];
 function setStatus(msg){$('status').textContent=msg}
 function settings(){const j={projectionScale:.2};for(const k of fields)j[k]=textFields.has(k)?$(k).value:($(k).value.trim()===''?NaN:Number($(k).value));j.shapes=JSON.parse($('shapes').value);j.optics=Object.fromEntries(optKeys.map(k=>[k,k==='source'?$(k).value:($(k).value.trim()===''?NaN:Number($(k).value))]));return j}
 function populate(j){for(const k of fields)$(k).value=j[k];$('shapes').value=JSON.stringify(j.shapes,null,2);for(const k of optKeys)$(k).value=(j.optics||defaultOptics)[k]??defaultOptics[k]}
 function sync(){
  $('state').textContent=state;$('auto').disabled=busy||!plan||state!=='EMPTY';$('load-reticle').disabled=busy||!plan||state!=='EMPTY';$('load-wafer').disabled=busy||state!=='RETICLE LOADED';$('align').disabled=busy||state!=='WAFER LOADED';$('step').disabled=busy||!['ALIGNED','EXPOSING'].includes(state);$('unload').disabled=busy||state!=='COMPLETE';$('export').disabled=!committed;$('csv').disabled=!committed;
  $('progress').max=plan?.fields.length||1;$('progress').value=done;
  for(const k of [...fields,...optKeys])$(k).disabled=state!=='EMPTY'||busy;$('shapes').disabled=state!=='EMPTY'||busy;$('import').disabled=busy||state!=='EMPTY';
  if(wafer){wafer.visible=!['EMPTY','RETICLE LOADED','UNLOADED'].includes(state);const a=wafer.getObjectByName('Specimen-wafer'),b=wafer.getObjectByName('Specimen-resist');const j=plan?.job;const diameter=(j?.waferDiameter_mm||100)/1000,thickness=(j?.waferThickness_mm||.525)/1000;if(a){a.scale.set(diameter,thickness,diameter);a.position.y=.8725+thickness/2}if(b){b.scale.set(diameter,.000003,diameter);b.position.y=.8725+thickness+.0000015}}
  if(reticle){reticle.visible=state!=='EMPTY'&&state!=='UNLOADED';const a=reticle.getObjectByName('Reticle-152mm');if(a)a.scale.y=(plan?.job.reticleThickness_mm||6.35)/1000}
  if(beam)beam.visible=false;
  draw();drawOptics();updateTextures();
 }
 function path(ctx,pts,project){ctx.beginPath();pts.forEach((p,i)=>{const [x,y]=project(...p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath()}
 function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2)}
 function canvasSetup(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#15212a';c.fillRect(0,0,canvas.width,canvas.height);return c}
 function draw(){
  const rc=$('reticle-map'),wc=$('wafer-map'),rctx=canvasSetup(rc),wctx=canvasSetup(wc);if(!plan){$('result').textContent='No valid job.';return}
  const j=plan.job,p=(x,y)=>[rc.width/2+x*(rc.width-48)/152.4,rc.height/2-y*(rc.width-48)/152.4];
  rctx.fillStyle='#26323c';rctx.fillRect(24,24,rc.width-48,rc.height-48);rctx.strokeStyle='#e9e1c4';rctx.lineWidth=2;const fw=j.fieldWidth_mm*5,fh=j.fieldHeight_mm*5;path(rctx,[[-fw/2,-fh/2],[fw/2,-fh/2],[fw/2,fh/2],[-fw/2,fh/2]],p);rctx.stroke();
  rctx.fillStyle='#c7e3df';for(const f of j.shapes){path(rctx,[[f.x_mm,f.y_mm],[f.x_mm+f.w_mm,f.y_mm],[f.x_mm+f.w_mm,f.y_mm+f.h_mm],[f.x_mm,f.y_mm+f.h_mm]],p);rctx.fill()}
  rctx.fillStyle='#eee';rctx.font='12px monospace';rctx.fillText('RETICLE 152.4 mm',10,15);rctx.fillText('q = 0.2',10,rc.height-9);
  const scale=(wc.width-48)/j.waferDiameter_mm,project=(x,y)=>[wc.width/2+x*scale,wc.height/2-y*scale],radius=j.waferDiameter_mm*scale/2,usable=plan.exposureDomain.radius_mm*scale;
  circle(wctx,wc.width/2,wc.height/2,radius);wctx.fillStyle='#465b70';wctx.fill();wctx.strokeStyle='#a6bfd0';wctx.lineWidth=2;wctx.stroke();circle(wctx,wc.width/2,wc.height/2,usable);wctx.setLineDash([5,4]);wctx.strokeStyle='#ced4db';wctx.stroke();wctx.setLineDash([]);
  wctx.save();circle(wctx,wc.width/2,wc.height/2,usable);wctx.clip();
  for(let i=0;i<Math.min(done,plan.fields.length);i++){const f=plan.fields[i];if(!f.exposed)continue;wctx.fillStyle='#e1b5f6';for(const a of f.features){if(a.exposed){path(wctx,a.actualCorners_mm,project);wctx.fill()}}}
  wctx.restore();
  for(let i=0;i<plan.fields.length;i++){const f=plan.fields[i];wctx.strokeStyle=f.coverage==='full'?'#77d1a6':f.coverage==='partial'?'#ecbd60':'#e87f81';wctx.globalAlpha=i<done?1:.55;wctx.lineWidth=i===current?3:1.4;path(wctx,f.actualCorners_mm,project);wctx.stroke();wctx.globalAlpha=1;const [x,y]=project(...f.actualCenter_mm);if(x>15&&x<wc.width-35&&y>10&&y<wc.height-12){wctx.font='10px monospace';wctx.fillStyle='#e3e9ed';wctx.fillText(f.id,x-12,y+4)}}
  wctx.fillStyle='#eee';wctx.font='12px monospace';wctx.fillText(j.waferDiameter_mm+' mm wafer · '+done+'/'+plan.fields.length,10,15);
  const completed=plan.fields.slice(0,done).filter(f=>f.exposed).length;const warnings=plan.fields[0].features.filter(f=>f.belowRatedResolution).length;
  $('result').textContent=(committed?'Committed revision '+committed.revision+' · ':state==='EMPTY'?'Preview · ':'Running · ')+completed+' / '+plan.tally.exposed+' fields exposed; '+plan.tally.full+' full, '+plan.tally.partial+' partial, '+plan.tally.outside+' outside; maximum overlay '+plan.maxOverlay_nm.toFixed(2)+' nm; '+warnings+' reticle feature(s) below rated resolution.';
 }
 function inspect(){if(!plan)return;const f=plan.fields[Number($('field').value)||0];if(!f)return;current=plan.fields.indexOf(f);$('probe').textContent=f.id+' · '+f.coverage+' · nominal ('+f.nominalCenter_mm.map(x=>x.toFixed(4)).join(', ')+') mm · actual ('+f.actualCenter_mm.map(x=>x.toFixed(6)).join(', ')+') mm · overlay ('+f.overlay_nm.map(x=>x.toFixed(2)).join(', ')+') nm · '+f.features.map(a=>a.reticleShapeId+': '+(a.projectedWidth_mm*1000).toFixed(3)+' × '+(a.projectedHeight_mm*1000).toFixed(3)+' µm'+' · '+a.coverage+(a.belowRatedResolution?' (below rating)':'')).join('; ');draw()}
 function preview(){committed=null;done=0;current=-1;try{const j=settings();plan=solve(j);assay=opticalAssay(j.optics,j.dose_mJ_cm2);plan.aerialAssay=assay;lastTexture='';$('field').replaceChildren(...plan.fields.map((f,i)=>new Option(f.id+' — '+f.coverage,String(i))));setStatus('Valid job. Load reticle or run example.');inspect()}catch(e){plan=null;assay=null;lastTexture='';$('field').replaceChildren();$('probe').textContent='Correct invalid input.';setStatus(e.message)}sync()}
 function reset(){token++;busy=false;state='EMPTY';committed=null;done=0;current=-1;posStage.set(0,0,0);posWafer.set(0,0,0);posReticle.set(0,0,0);preview()}
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function animate(pos,to,ms,t){const from=pos.clone(),start=performance.now();while(t===token){const q=Math.min(1,(performance.now()-start)/ms);pos.lerpVectors(from,to,q*q*(3-2*q));if(q===1)return;await wait(16)}}
 async function action(a,t){if(t!==token)return false;
  if(a==='reticle'&&state==='EMPTY'){if(!plan){setStatus('Invalid job: correct parameters first.');return false}state='RETICLE LOADED';posReticle.set(-.58,0,0);sync();setStatus('Transferring reticle to projection position…');await animate(posReticle,new THREE.Vector3(),250,t)}
  else if(a==='wafer'&&state==='RETICLE LOADED'){state='WAFER LOADED';posWafer.set(.51,.17,.13);sync();setStatus('Prealigning and transferring wafer…');await animate(posWafer,new THREE.Vector3(),350,t)}
  else if(a==='align'&&state==='WAFER LOADED'){state='ALIGNED';sync();setStatus('Global alignment applied; programmed overlay error is retained.')}
  else if(a==='step'&&['ALIGNED','EXPOSING'].includes(state)){state='EXPOSING';const f=plan.fields[done];current=done;$('field').value=String(done);sync();if(f.coverage!=='outside'){const v=new THREE.Vector3(-f.nominalCenter_mm[0]/1000,0,f.nominalCenter_mm[1]/1000);await Promise.all([animate(posStage,v,140,t),animate(posWafer,v,140,t)]);if(t!==token)return false;if(beam)beam.visible=f.exposed;await wait(70);if(beam)beam.visible=false}if(t!==token)return false;done++;setStatus(f.id+' · '+(f.exposed?'exposed':f.coverage==='outside'?'outside / skipped':'partial / skipped'));if(done===plan.fields.length){committed=plan;state='COMPLETE';setStatus('Exposure complete. Inspect or export the sample revision.')}inspect();sync()}
  else if(a==='unload'&&state==='COMPLETE'){await Promise.all([animate(posStage,new THREE.Vector3(),180,t),animate(posWafer,new THREE.Vector3(.51,.17,.13),250,t)]);if(t!==token)return false;state='UNLOADED';setStatus('Wafer returned. Exposure revision retained.');sync()}
  else return false;return t===token;
 }
 async function manual(a){if(busy)return;busy=true;const t=++token;sync();try{await action(a,t)}catch(e){if(t===token)setStatus(e.message)}finally{if(t===token){busy=false;sync()}}}
 $('auto').onclick=async()=>{if(busy||!plan){setStatus('Correct invalid job before running.');return}busy=true;const t=++token;sync();try{for(const a of ['reticle','wafer','align'])if(!await action(a,t))return;while(t===token&&done<plan.fields.length)if(!await action('step',t))break}catch(e){if(t===token)setStatus(e.message)}finally{if(t===token){busy=false;sync()}}};
 for(const [id,a] of [['load-reticle','reticle'],['load-wafer','wafer'],['align','align'],['step','step'],['unload','unload']])$(id).onclick=()=>manual(a);
 $('reset').onclick=reset;for(const k of [...fields,...optKeys,'shapes'])$(k).addEventListener('input',()=>{if(state==='EMPTY'&&!busy)preview()});
 $('field').onchange=inspect;
 $('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const j=JSON.parse(await file.text());if(state!=='EMPTY'||busy)throw Error('Reset before importing');solve(j);opticalAssay(j.optics||defaultOptics,j.dose_mJ_cm2);populate(j);reset();if(plan)setStatus('Imported valid job.')}catch(e){setStatus('Import rejected: '+e.message)}finally{$('import').value=''}};
 function download(name,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 $('export').onclick=()=>{if(committed)download('pas5500-exposure.json',JSON.stringify(committed,null,2),'application/json')};
 $('csv').onclick=()=>{if(committed)download('pas5500-overlay.csv',['field,nominal_x_mm,nominal_y_mm,actual_x_mm,actual_y_mm,overlay_x_nm,overlay_y_nm,coverage,exposed',...committed.fields.map(f=>[f.id,...f.nominalCenter_mm,...f.actualCenter_mm,...f.overlay_nm,f.coverage,f.exposed].join(','))].join('\n'),'text/csv')};

 function drawOptics(){
  const canvas=$('opt-map'),ctx=canvasSetup(canvas),readout=$('opt-result'),note=$('opt-note');$('opt-export').disabled=!assay;$('opt-csv').disabled=!assay;
  if(!assay){readout.textContent='No valid assay — correct job or optical parameters.';note.textContent='';return}
  const a=assay,p=a.parameters,m=a.metrics,W=canvas.width,H=canvas.height,left=55,right=W-18,top=52,bottom=H-65,th=p.threshold_mJ_cm2,max=Math.max(th,1,...a.dose_mJ_cm2)*1.12,xx=i=>left+(right-left)*i/a.intensity.length,yy=d=>bottom-(bottom-top)*d/max;
  ctx.strokeStyle='#58707b';ctx.fillStyle='#e5edf0';ctx.font='12px monospace';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=top+(bottom-top)*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillText((max*(1-i/4)).toFixed(0),left-6,y+4)}
  ctx.textAlign='left';ctx.fillText('mJ/cm²',5,15);ctx.fillText('0',left,bottom+16);ctx.fillText(p.waferPitch_um.toFixed(2)+' µm',right-58,bottom+16);
  for(let i=0;i<a.intensity.length;i++){const phase=i/a.intensity.length,open=Math.min(phase,1-phase)<p.clearFraction/2;ctx.fillStyle=open?'#bce4df':'#34414b';ctx.fillRect(xx(i),23,Math.ceil((right-left)/a.intensity.length),15);ctx.fillStyle=a.dose_mJ_cm2[i]>=th?'#d9a9f5':'#34414b';ctx.fillRect(xx(i),bottom+27,Math.ceil((right-left)/a.intensity.length),15)}
  ctx.setLineDash([6,4]);ctx.strokeStyle='#e8c375';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(left,yy(th));ctx.lineTo(right,yy(th));ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#c4e9fa';ctx.lineWidth=2.5;ctx.beginPath();for(let i=0;i<=a.intensity.length;i++){const x=xx(i),y=yy(a.dose_mJ_cm2[i%a.intensity.length]);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.stroke();
  readout.textContent='Aerial contrast '+(100*m.contrast).toFixed(1)+'% · peak '+(m.maxIntensity*p.dose_mJ_cm2).toFixed(2)+' mJ/cm² · nominal clear width '+(1000*m.nominalClearWidth_um).toFixed(1)+' nm · threshold proxy '+(1000*m.aboveThresholdWidth_um).toFixed(1)+' nm · '+a.method.sourcePoints+' source samples.';
  const educational=p.source==='coherent'||(p.source==='disk'&&(p.sigmaOuter<.35||p.sigmaOuter>.8))||(p.source==='annular'&&(p.sigmaOuter>.85||p.sigmaInner>.20||p.sigmaOuter-p.sigmaInner<.25));
  note.textContent=(educational?'Educational extrapolation beyond the catalog illumination limits; not a real recipe. ':'Idealized illumination within conservative catalog bounds. ')+'The threshold is an assumption, not a resist fit; contrast and width are simulated only.';
 }
 function textureFor(group,name){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.renderOrder=3;group.add(mesh);return {canvas,tex,mesh}}
 function updateTextures(){if(!waferPattern||!reticlePattern)return;const signature=String(done)+':'+String(!!plan);if(lastTexture===signature)return;lastTexture=signature;for(const p of [waferPattern,reticlePattern]){const ctx=p.canvas.getContext('2d');ctx.clearRect(0,0,512,512);p.tex.needsUpdate=true;p.mesh.visible=!!plan}if(!plan)return;
  const j=plan.job,w=waferPattern,rr=reticlePattern,d=j.waferDiameter_mm,th=j.waferThickness_mm/1000,rt=j.reticleThickness_mm/1000;
  w.mesh.position.set(.14,.8725+th+.000013,-.07);w.mesh.scale.set(d/1000,d/1000,1);
  rr.mesh.position.set(.14,1.52+rt/2+.00001,-.07);rr.mesh.scale.set(.1524,.1524,1);
  const c=rr.canvas.getContext('2d'),s=512/152.4;c.fillStyle='#202b34';c.fillRect(0,0,512,512);c.fillStyle='#bce4df';for(const a of j.shapes)c.fillRect(256+a.x_mm*s,256-(a.y_mm+a.h_mm)*s,a.w_mm*s,a.h_mm*s);
  const ctx=w.canvas.getContext('2d'),scale=512/d,project=(x,y)=>[256+x*scale,256-y*scale];ctx.save();circle(ctx,256,256,plan.exposureDomain.radius_mm*scale);ctx.clip();ctx.fillStyle='#ddb5f4';for(const f of plan.fields.slice(0,done)){if(f.exposed)for(const a of f.features)if(a.exposed){path(ctx,a.actualCorners_mm,project);ctx.fill()}}ctx.restore();w.tex.needsUpdate=true;rr.tex.needsUpdate=true;
 }
 function pointDose(e){if(!plan)return;const canvas=$('wafer-map'),bounds=canvas.getBoundingClientRect(),sx=(e.clientX-bounds.left)*canvas.width/bounds.width,sy=(e.clientY-bounds.top)*canvas.height/bounds.height,scale=(canvas.width-48)/plan.job.waferDiameter_mm,x=(sx-canvas.width/2)/scale,y=(canvas.height/2-sy)/scale;const dose=geometricDoseAt({...plan,fields:plan.fields.slice(0,done)},x,y);$('dose-probe').textContent='Wafer ('+x.toFixed(3)+', '+y.toFixed(3)+') mm · completed ideal dose '+dose.toFixed(1)+' mJ/cm²';}
 $('wafer-map').addEventListener('pointermove',pointDose);$('wafer-map').addEventListener('pointerdown',pointDose);
 $('opt-export').onclick=()=>{if(assay)download('pas5500-aerial-grating.json',JSON.stringify(assay,null,2),'application/json')};
 $('opt-csv').onclick=()=>{if(assay)download('pas5500-aerial-grating.csv',['x_um,intensity_normalized,dose_mJ_cm2',...assay.x_um.map((x,i)=>[x,assay.intensity[i],assay.dose_mJ_cm2[i]].join(','))].join('\n'),'text/csv')};

 populate(defaultJob);preview();
 const host=$('view');
 function setView(v){viewName=v;if(!camera||!controls)return;const preset={whole:[[-3.3,2.5,3.7],[0,1,0]],front:[[0,1.25,4.2],[0,1.05,0]],right:[[3.8,1.5,.02],[0,1,0]],rear:[[.02,1.5,-4],[0,1,0]],reticle:[[.95,1.83,1.14],[.14,1.52,-.07]],stage:[[.69,1.18,.75],[.14,.86,-.07]],handler:[[1.6,1.65,1.65],[.55,1,.75]]}[v]||[[-3.3,2.5,3.7],[0,1,0]];
  if(['reticle','stage','handler'].includes(v)){cut=true;applyCut()}else {cut=false;applyCut()}camera.position.set(...preset[0]);controls.target.set(...preset[1]);controls.update()
 }
 function applyCut(){if(asset){const group=asset.getObjectByName('group-enclosure');if(group)group.visible=!cut}$('cut').setAttribute('aria-pressed',String(cut))}
 $('cut').onclick=()=>{cut=!cut;applyCut()};for(const b of document.querySelectorAll('[data-pas-view]'))b.onclick=()=>setView(b.dataset.pasView);
 try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;host.appendChild(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color('#263139');camera=new THREE.PerspectiveCamera(40,1,.01,30);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.17;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.91;const grid=new THREE.GridHelper(8,32,0x596773,0x42515c);scene.add(grid,new THREE.HemisphereLight(0xf0f4ff,0x746655,2));const key=new THREE.DirectionalLight(0xfff4df,3);key.position.set(-3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0xc5ddff,1.8);rim.position.set(4,2,-3);scene.add(rim);function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();setView('whole');
  new GLTFLoader().load('/equipment/02-06/pas5500.glb',g=>{asset=g.scene;scene.add(asset);stage=asset.getObjectByName('group-stage');wafer=asset.getObjectByName('group-wafer');reticle=asset.getObjectByName('group-reticle');beam=asset.getObjectByName('group-beam');if(!stage||!wafer||!reticle||!beam){$('model').textContent='Asset missing functional groups';return}waferPattern=textureFor(wafer,'Wafer-exposure-overlay');reticlePattern=textureFor(reticle,'Reticle-artwork-overlay');lastTexture='';$('model').textContent='GLB loaded · 111 named components · live specimen overlays · meters';$('model').dataset.loaded='true';$('save-view').disabled=false;applyCut();sync()},undefined,e=>{$('model').textContent='3D asset failed to load: '+String(e)});
  renderer.setAnimationLoop(()=>{if(stage)stage.position.copy(posStage);if(wafer)wafer.position.copy(posWafer);if(reticle)reticle.position.copy(posReticle);controls.update();renderer.render(scene,camera)});
  $('save-view').onclick=()=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='pas5500-'+viewName+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)},'image/png')};
 }catch(e){$('model').textContent='WebGL unavailable; numerical experiment remains usable. '+e.message}
}
