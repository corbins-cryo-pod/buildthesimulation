import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DEFAULTS,VERSION,advect} from './core.mjs';
import {H01_ASSET} from './anatomy.mjs';
const mounted=new WeakMap();
const cleanGroup=group=>{for(const object of [...group.children]){object.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});group.remove(object);}};
const format=(x,d=3)=>Number.isFinite(x)?Number(x).toPrecision(d):'—';
function download(name,text,type='application/json'){
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function mountLabs(){for(const el of document.querySelectorAll('[data-tissue-lab]'))if(!mounted.has(el))mounted.set(el,mount(el));}
function mount(el){
 const q=name=>el.querySelector(`[data-tm="${name}"]`),cellular=el.dataset.cellular==='true',abort=new AbortController(),listen=(node,type,fn)=>node?.addEventListener(type,fn,{signal:abort.signal});
 let disposed=false,requestId=0,anatomyId=0,frame=null,pack=null,imported=null,anatomyInfo=null,anatomyEmbedding=null,timer=null,animation=0,dragSession=null;
 let p={...DEFAULTS,size:cellular?.08:1,curved:false,handle:[0,1,0],drag:[0,.08,0]},surface=null,ghost=null,wire=null,anatomyMesh=null,lastTopology='',lastAnatomyKey='';
 const viewport=q('viewport'),status=q('status'),inspector=q('inspector');
 let renderer;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){status.textContent='WebGL unavailable';inspector.textContent='This browser could not create a 3D context. The methods page remains available.';return ()=>abort.abort();}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;viewport.prepend(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Interactive three-dimensional tissue mechanics sample');renderer.domElement.setAttribute('role','img');renderer.domElement.style.touchAction='none';
 const scene=new T.Scene();scene.background=new T.Color('#101e26');
 const camera=new T.PerspectiveCamera(38,1,.01,30);camera.position.set(1.8,1.6,2.1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.46,0);controls.enableDamping=true;controls.minDistance=.35;controls.maxDistance=6;
 scene.add(new T.HemisphereLight('#f1e2d8','#334851',2.8));const light=new T.DirectionalLight('#fff5ed',3);light.position.set(2,4,3);scene.add(light);
 const root=new T.Group(),tissueGroup=new T.Group(),anatomyGroup=new T.Group(),probeGroup=new T.Group();root.add(tissueGroup,anatomyGroup,probeGroup);scene.add(root);
 const grid=new T.GridHelper(3,24,'#46616a','#263e47');grid.position.y=-.035;scene.add(grid);
 const worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
 const anatomyWorker=cellular?new Worker(new URL('./anatomy-worker.mjs',import.meta.url),{type:'module'}):null;
 const resize=new ResizeObserver(()=>{const {width,height}=viewport.getBoundingClientRect();renderer.setSize(Math.max(1,width),Math.max(1,height),false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();});resize.observe(viewport);
 let visible=true,frames=0,fpsStart=performance.now();const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});visibility.observe(viewport);
 function draw(){if(disposed)return;animation=requestAnimationFrame(draw);if(!visible||document.hidden)return;controls.update();renderer.render(scene,camera);frames++;const now=performance.now();if(now-fpsStart>1000){q('fps').textContent=`${Math.round(frames*1000/(now-fpsStart))} render fps`;frames=0;fpsStart=now;}}draw();
 function read(){
  p={...p,n:Number(q('resolution').value),mu:Number(q('mu').value),nu:Number(q('nu').value),experiment:q('experiment').value,amplitude:Number(q('amplitude').value)/100,curved:!cellular&&q('shape').value==='cap',depth:Number(q('depth')?.value||.75)};
  if(p.experiment==='micromotion'){p.curved=false;if(p.n===4){p.n=8;q('resolution').value='8';}}
  q('resolution').querySelector('option[value="4"]').disabled=p.experiment==='micromotion';
  q('amplitude-value').textContent=`${format(p.amplitude*p.size*1000,3)} µm (${(p.amplitude*100).toFixed(1)}%)`;q('mu-value').textContent=`${p.mu.toFixed(1)} kPa`;
  if(q('depth'))q('depth').disabled=p.experiment!=='micromotion';if(q('shape'))q('shape').disabled=p.experiment==='micromotion';
  q('experiment-note').textContent=({grab:'Drag a surface patch with the grab tool or Shift + drag. The base is fixed; the handle prescribes displacement.',shear:'The base is clamped. The upper face is translated laterally with all three displacement components prescribed.',stretch:'The base is clamped. The upper face moves vertically; its tangential motion is free. Clamping produces nonuniform strain.',compression:'The base is clamped. The upper face is displaced downward; tangential motion is free.',indentation:'A rigid spherical tip presses on intact tissue. Frictionless nodal penalty contact; no puncture. Contact force is mesh- and penalty-sensitive.',micromotion:'A rigid, bonded cuboid moves in a pre-existing 250 × 250 µm tract. Changing depth reconstructs the unloaded tract; it does NOT simulate cutting or insertion force.'})[p.experiment];
  return {...p,drag:[...p.drag],handle:[...p.handle]};
 }
 function solve(detailed=false){if(disposed)return;const params=read();requestId++;status.textContent='Solving… previous field retained until the next result';status.dataset.ok='false';q('export').disabled=true;worker.postMessage({type:'solve',id:requestId,params,detailed});}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>solve(false),120);}
 function buildSurface(mesh){
  cleanGroup(tissueGroup);root.scale.setScalar(1/mesh.p.size);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(Float32Array.from(mesh.X),3));geometry.setIndex(new T.BufferAttribute(mesh.surface,1));geometry.computeVertexNormals();
  surface=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#d6aaa3',roughness:.83,metalness:.02,side:T.DoubleSide,transparent:true,opacity:cellular?.14:.65,depthWrite:false,vertexColors:true}));surface.frustumCulled=false;tissueGroup.add(surface);
  wire=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#c8dedc',wireframe:true,transparent:true,opacity:.16,depthWrite:false}));wire.frustumCulled=false;tissueGroup.add(wire);
  ghost=new T.Mesh(geometry.clone(),new T.MeshBasicMaterial({color:'#c6d4d8',wireframe:true,transparent:true,opacity:.07,depthWrite:false}));tissueGroup.add(ghost);updateVisibility();
 }
 function updateVisibility(){if(!surface)return;surface.material.opacity=Number(q('opacity').value)/100;wire.visible=q('wire').checked;ghost.visible=q('ghost').checked;}
 function drawProbe(params){
  cleanGroup(probeGroup);const L=params.size;
  if(params.experiment==='indentation'){
   const ball=new T.Mesh(new T.SphereGeometry(.2*L,32,20),new T.MeshStandardMaterial({color:'#d2d9dc',metalness:.7,roughness:.24}));ball.position.set(0,1.2*L-Math.abs(params.amplitude)*L,0);probeGroup.add(ball);
  }else if(params.experiment==='micromotion'){
   const length=(params.depth+.2)*L;
   const shank=new T.Mesh(new T.BoxGeometry(.25*L,length,.25*L),new T.MeshStandardMaterial({color:'#4b5761',metalness:.6,roughness:.35}));shank.position.set(params.amplitude*L,(1-params.depth)*L+length/2,0);probeGroup.add(shank);
   for(let i=0;i<6;i++){const pad=new T.Mesh(new T.BoxGeometry(.07*L,.04*L,.004*L),new T.MeshStandardMaterial({color:'#cbb784',metalness:.85,roughness:.25}));pad.position.set(params.amplitude*L,(1-params.depth+params.depth*(i+.7)/6)*L,.128*L);probeGroup.add(pad);}
  }
 }
 function recolor(){
  if(!frame||!surface)return;const {mesh,x,report}=frame,mode=q('view').value,N=x.length/3,values=new Float32Array(N);let max=0;
  for(let i=0;i<N;i++){const value=mode==='strain'?(report?.nodal?.[i*3]||0)*100:mode==='stress'?(report?.nodal?.[i*3+1]||0):Math.hypot(x[i*3]-mesh.X[i*3],x[i*3+1]-mesh.X[i*3+1],x[i*3+2]-mesh.X[i*3+2])*1000;values[i]=value;max=Math.max(max,value);}
  const colors=new Float32Array(N*3),color=new T.Color(),a=new T.Color('#2c8296'),b=new T.Color('#f0ce76');
  for(let i=0;i<N;i++){if(mode==='anatomy')color.set('#d6aaa3');else color.copy(a).lerp(b,Math.min(1,values[i]/Math.max(max,1e-12)));colors.set([color.r,color.g,color.b],i*3);}
  surface.geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  q('legend').textContent=mode==='anatomy'?'Anatomical color • no field coloring':`0 — ${format(max)} ${mode==='strain'?'% Green-strain norm':mode==='stress'?'kPa von Mises stress':'µm displacement'} · current-frame scale`;
 }
 function updateFrame(data){
  if(!frame)return;frame={...frame,x:data.x,report:data.report,params:data.params,elapsedMs:data.elapsedMs};
  surface.geometry.attributes.position.array.set(data.x);surface.geometry.attributes.position.needsUpdate=true;surface.geometry.computeVertexNormals();surface.geometry.computeBoundingSphere();
  if(anatomyMesh&&anatomyEmbedding){anatomyMesh.geometry.attributes.position.array.set(advect(frame.mesh,data.x,anatomyEmbedding));anatomyMesh.geometry.attributes.position.needsUpdate=true;anatomyMesh.geometry.computeVertexNormals();anatomyMesh.geometry.computeBoundingSphere();}
  recolor();drawProbe(data.params);const r=data.report;
  q('time').textContent=`${format(data.elapsedMs/1000)} s compute`;q('residual').textContent=format(r.residual);q('volume').textContent=`${format((r.volumeRatio-1)*100)}%`;q('strain').textContent=`${format(r.peakStrain*100)}%`;
  q('force').textContent=`${format((data.params.experiment==='indentation'?r.contactForceMN:Math.hypot(...r.reactionMN))*1000)} µN`;q('jacobian').textContent=`${format(r.minJ)} – ${format(r.maxJ)}`;
  q('contact').textContent=data.params.experiment==='indentation'?`Maximum penalty overlap: ${format(r.contactPenetrationMM*1000)} µm. This is numerical contact error, not tissue cutting.`:'';
  status.textContent=data.type==='done'?`${r.status} · ${r.iterations} iterations · residual ${format(r.residual)}`:`${data.stage<data.stages?`Load stage ${data.stage}/${data.stages}`:'Solving'} · residual ${format(r.residual)}`;
  status.dataset.ok=String(data.type==='done'&&r.status==='converged');q('export').disabled=data.type!=='done';
 }
 worker.onmessage=({data})=>{
  if(disposed||data.id!==requestId)return;
  if(data.type==='error'){status.textContent=`Solver stopped: ${data.message}`;return;}
  if(data.type==='mesh'){
   const mesh=data.mesh,topology=JSON.stringify([mesh.p.n,mesh.p.size,mesh.p.curved,mesh.p.experiment,mesh.p.depth]);
   if(topology!==lastTopology){lastTopology=topology;buildSurface(mesh);frame={mesh,x:Float32Array.from(mesh.X),report:null,params:p};cleanGroup(anatomyGroup);anatomyMesh=null;anatomyEmbedding=null;lastAnatomyKey='';buildAnatomy();}
   else frame.mesh=mesh;
   q('mesh-count').textContent=`${mesh.X.length/3} nodes · ${mesh.volumes.length} tetrahedra`;recolor();
  }else updateFrame(data);
 };
 worker.onerror=event=>{status.textContent=`Worker error: ${event.message||'could not load numerical engine'}`;};
 async function loadH01(){
  try{
   q('source-status').textContent='Loading attributed H01 reference anatomy…';
   const response=await fetch(H01_ASSET,{signal:abort.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);pack=await response.json();
   if(!Array.isArray(pack.templates)||!pack.templates.length)throw new Error('No reference cells in the source pack');
   const select=q('source');select.replaceChildren();for(const t of pack.templates){const o=document.createElement('option');o.value=String(t.sourceId);o.textContent=`H01 ${t.sourceId} · layer ${t.layer}`;select.append(o);}
   q('source-status').textContent='H01 proofread skeleton reference pack loaded. No synthetic cells.';buildAnatomy();
  }catch(error){if(!disposed)q('source-status').textContent=`H01 anatomy unavailable: ${error.message}. No substitute anatomy has been generated.`;}
 }
 function buildAnatomy(){
  if(!cellular||!frame||(!pack&&!imported))return;
  const key=JSON.stringify([lastTopology,q('source').value,!!imported]);if(key===lastAnatomyKey)return;lastAnatomyKey=key;
  q('source-status').textContent='Embedding authentic anatomy in the material coordinates…';anatomyId++;
  anatomyWorker.postMessage({id:anatomyId,mesh:frame.mesh,pack,sourceId:q('source').value,surface:imported});
 }
 if(anatomyWorker){
  anatomyWorker.onmessage=({data})=>{
   if(disposed||data.id!==anatomyId)return;
   if(data.error){q('source-status').textContent=`Anatomy import stopped: ${data.error}`;return;}
   cleanGroup(anatomyGroup);const g=new T.BufferGeometry(),positions=advect(frame.mesh,frame.x,data.embedding);g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(data.geometry.indices,1));g.computeVertexNormals();
   const colors=new Float32Array(positions.length),c=new T.Color();
   for(let i=0;i<positions.length/3;i++){const seg=data.crop?.segments[data.geometry.owners?.[i]];c.set(seg?.role==='axon'?'#d7b681':seg?.role==='dendrite'?'#90c6c8':'#ccb8d5');colors.set([c.r,c.g,c.b],i*3);}
   g.setAttribute('color',new T.BufferAttribute(colors,3));anatomyMesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.04,side:T.DoubleSide}));anatomyMesh.frustumCulled=false;anatomyGroup.add(anatomyMesh);
   anatomyEmbedding=data.embedding;anatomyInfo=data;
   q('source-status').textContent=data.crop?`${data.crop.segments.length} clipped neurite segments · H01 ${data.crop.selected} region · ${positions.length/3} tube vertices. Sparse skeleton anatomy, not dense EM membranes.`:`${positions.length/3} imported vertices · ${data.geometry.provenance.dataset}. Source provenance is supplied by the importer.`;
   q('source-detail').textContent=data.crop?`Native ROI center (mm): ${data.crop.centerMM.map(v=>format(v,6)).join(', ')}. ${data.crop.attribution} ${data.crop.license}. ${data.crop.limitations}`:`${data.geometry.provenance.sourceUrl} · ${data.geometry.provenance.license} · ${data.geometry.provenance.note}`;
  };
  anatomyWorker.onerror=event=>{q('source-status').textContent=`Anatomy worker error: ${event.message}`;};loadH01();
 }
 for(const name of ['experiment','resolution','mu','nu','shape','depth'])listen(q(name),'change',()=>{read();schedule();});
 listen(q('amplitude'),'input',()=>{p.drag=[0,Number(q('amplitude').value)/100,0];read();schedule();});
 for(const name of ['wire','ghost','opacity'])listen(q(name),'input',updateVisibility);
 listen(q('view'),'change',recolor);listen(q('solve'),'click',()=>{clearTimeout(timer);solve(true);});
 listen(q('stop'),'click',()=>{clearTimeout(timer);requestId++;worker.postMessage({type:'stop'});status.textContent='Stopped · retained field may not be at equilibrium';q('export').disabled=true;});
 listen(q('reset'),'click',()=>{q('amplitude').value='0';p.drag=[0,0,0];p.handle=[0,1,0];clearTimeout(timer);solve();});
 listen(q('camera'),'click',()=>{camera.position.set(1.8,1.6,2.1);controls.target.set(0,.46,0);controls.update();});
 listen(q('source'),'change',()=>{imported=null;lastAnatomyKey='';buildAnatomy();});
 listen(q('import'),'change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>15_000_000)throw new Error('Surface pack exceeds the 15 MB import limit');imported=JSON.parse(await file.text());lastAnatomyKey='';buildAnatomy();}catch(error){q('source-status').textContent=`Import failed: ${error.message}`;}
 });
 listen(q('export'),'click',()=>{if(!frame?.report)return;const {nodal,...report}=frame.report;
  download(`tissue-experiment-${Date.now()}.json`,JSON.stringify({schema:'bts-tissue-experiment-v1',version:VERSION,createdAt:new Date().toISOString(),parameters:frame.params,report,computeMs:frame.elapsedMs,units:{positions:'mm',stress:'kPa',force:'mN',energy:'microjoule'},referencePositions:Array.from(frame.mesh.X),positions:Array.from(frame.x),tetrahedra:Array.from(frame.mesh.tets),nodalFields:Array.from(nodal||[]),nodalFieldOrder:['Green strain norm','von Mises stress (kPa)','volume ratio J'],anatomy:anatomyInfo?.crop?{...anatomyInfo.crop,segments:undefined}:anatomyInfo?.geometry.provenance||null,limitations:'Experimental compressible neo-Hookean elastic baseline. Not a fitted human-brain constitutive law, puncture model or injury predictor. Solver convergence is not mesh convergence.'},null,2));
 });
 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(),hit=new T.Vector3();
 function ray(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);}
 listen(renderer.domElement,'pointerdown',event=>{
  if(!frame||!surface)return;ray(event);
  if(event.shiftKey||q('grab').checked){
   const intersection=raycaster.intersectObject(surface)[0];if(!intersection)return;
   let nearest=-1,dist=Infinity;const point=intersection.point.clone().multiplyScalar(p.size);
   for(let i=0;i<frame.mesh.boundary.length;i++)if(frame.mesh.boundary[i]&&frame.mesh.uv[i*3+1]>0){const d=point.distanceToSquared(new T.Vector3(...frame.x.slice(i*3,i*3+3)));if(d<dist){nearest=i;dist=d;}}
   if(nearest<0)return;
   q('experiment').value='grab';p.handle=Array.from(frame.mesh.uv.slice(nearest*3,nearest*3+3));p.drag=Array.from(frame.x.slice(nearest*3,nearest*3+3),(v,i)=>(v-frame.mesh.X[nearest*3+i])/p.size);
   const normal=camera.getWorldDirection(new T.Vector3());plane.setFromNormalAndCoplanarPoint(normal,intersection.point);dragSession={start:intersection.point.clone(),offset:[...p.drag]};controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);event.preventDefault();read();
  }else if(anatomyMesh){
   const intersection=raycaster.intersectObject(anatomyMesh)[0];if(intersection){const vertex=intersection.face.a,segment=anatomyInfo.crop?.segments[anatomyInfo.geometry.owners?.[vertex]],e=anatomyEmbedding.ids[vertex];
    let strain=0;for(let a=0;a<4;a++)strain+=(frame.report?.nodal?.[frame.mesh.tets[e*4+a]*3]||0)/4;
    inspector.textContent=segment?`H01 ${segment.id} · ${segment.role}. Local tissue Green-strain norm ≈ ${format(strain*100)}%. This is a continuum estimate, not cell-specific membrane strain.`:`Imported surface · local tissue Green-strain norm ≈ ${format(strain*100)}%.`;}
  }
 });
 listen(renderer.domElement,'pointermove',event=>{if(!dragSession)return;ray(event);if(!raycaster.ray.intersectPlane(plane,hit))return;const delta=hit.clone().sub(dragSession.start);p.drag=dragSession.offset.map((v,i)=>Math.max(-.2,Math.min(.2,v+delta.getComponent(i))));schedule();});
 const endDrag=event=>{if(!dragSession)return;dragSession=null;controls.enabled=true;if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);schedule();};
 listen(renderer.domElement,'pointerup',endDrag);listen(renderer.domElement,'pointercancel',endDrag);
 function dispose(){if(disposed)return;disposed=true;abort.abort();clearTimeout(timer);cancelAnimationFrame(animation);resize.disconnect();visibility.disconnect();worker.terminate();anatomyWorker?.terminate();controls.dispose();cleanGroup(root);grid.geometry.dispose();grid.material.dispose();renderer.dispose();renderer.domElement.remove();mounted.delete(el);}
 listen(document,'astro:before-swap',dispose);solve(false);return dispose;
}
