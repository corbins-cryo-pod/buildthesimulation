import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {modelRegistry} from './model-registry.js';
import {loadActiveModel} from './model-library.js';
import {makeActiveMorphology} from './active-morphology.js';
import {loadFiniteContact,finiteCellConfig,prepareFiniteNodes,finiteTransfer,FINITE_MODEL} from './finite-contact.js';
export function mountFiniteLaboratory(root) {
const $=id=>root.querySelector(`#${id}`);
let disposed=false,animation,observer;
const events=new AbortController();
const listen=(element,type,handler)=>element.addEventListener(type,handler,{signal:events.signal});
const select=$('disk-cell'),status=$('disk-status'),run=$('disk-run'),slider=$('disk-frame');
let field,config,nodes=[],support,result,worker,generation=0,playing=false,selectedNode=0;
let renderer,scene,camera,controls,cellGroup,meshes=[],slices=[];
const blue=new THREE.Color('#658dff'),orange=new THREE.Color('#ff9c56');
const position=p=>new THREE.Vector3(p[0],p[1],p[2]-1000);
for(const m of modelRegistry){const o=document.createElement('option');o.value=m.id;o.textContent=m.label;select.append(o);}
select.value='allen-human-601927090/1';
function initScene(){
  const host=$('disk-scene');
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{host.textContent='3D unavailable in this browser. Sampling, membrane traces and exports remain available.';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#101c25');
  camera=new THREE.PerspectiveCamera(42,1,1,5000);camera.up.set(0,0,1);camera.position.set(480,-600,380);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,125);controls.update();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshBasicMaterial({color:'#78908c',transparent:true,opacity:.16,side:THREE.DoubleSide})));
  const disk=new THREE.Mesh(new THREE.CircleGeometry(25,64),new THREE.MeshBasicMaterial({color:'#e8d9ae',side:THREE.DoubleSide}));disk.position.z=.1;scene.add(disk);
  const g=new THREE.CylinderGeometry(250,250,250,64,1,true);g.rotateX(Math.PI/2);
  const bounds=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:'#586a76',transparent:true,opacity:.2}));bounds.position.z=125;scene.add(bounds);g.dispose();
  cellGroup=new THREE.Group();scene.add(cellGroup);
  const resize=()=>{const w=Math.max(1,host.clientWidth);renderer.setSize(w,450);camera.aspect=w/450;camera.updateProjectionMatrix();};observer=new ResizeObserver(resize);observer.observe(host);resize();
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  listen(renderer.domElement,'click',e=>{const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(meshes)[0];if(hit){selectedNode=hit.object.userData.node;updateFrame();}});
}
function drawCell(){
  if(!cellGroup)return;
  for(const m of [...cellGroup.children]){m.geometry.dispose();m.material.dispose();cellGroup.remove(m);}meshes=[];
  nodes.forEach((n,i)=>{
    if(!n.areaUm2)return;
    const add=g=>{const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:support.supported?'#83b7aa':'#dfb14d'}));m.userData.node=i;cellGroup.add(m);meshes.push(m);return m;};
    if(n.kind==='soma'){const m=add(new THREE.SphereGeometry(n.diameterUm/2,16,12));m.position.copy(position(n.centerUm));}
    else{const path=n.pathUm?.length>1?n.pathUm:[n.startUm,n.endUm];for(let j=1;j<path.length;j++){const a=position(path[j-1]),b=position(path[j]),d=b.clone().sub(a);if(d.length()<1e-8)continue;const ra=(n.pathDiameterUm?.[j-1]??n.diameterUm)/2,rb=(n.pathDiameterUm?.[j]??n.diameterUm)/2;const m=add(new THREE.CylinderGeometry(rb,ra,d.length(),6));m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}}
  });
}
function buildSlices(){
  if(!scene||slices.length)return;
  for(const axis of ['xz','yz']){
    const size=64,values=[],pixels=new Uint8Array(size*size*4);
    for(let j=0;j<size;j++)for(let i=0;i<size;i++){const x=-250+(i+.5)*500/size,z=(j+.5)*250/size;values.push(finiteTransfer(field,axis==='xz'?[x,0,1000+z]:[0,x,1000+z]));}
    const texture=new THREE.DataTexture(pixels,size,size);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(500,250),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=Math.PI/2;if(axis==='yz')mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2));mesh.position.z=125;scene.add(mesh);slices.push({mesh,texture,values,pixels});
  }
}
function colorSlices(current){for(const s of slices){s.values.forEach((v,i)=>{const a=i*4;if(v===null){s.pixels[a+3]=0;return;}const t=Math.min(Math.abs(v*current)/10,1),c=new THREE.Color('#e1e7e5').lerp(new THREE.Color(current<0?'#426bd9':'#dd7041'),t);s.pixels[a]=Math.round(c.r*255);s.pixels[a+1]=Math.round(c.g*255);s.pixels[a+2]=Math.round(c.b*255);s.pixels[a+3]=current===0?0:180;});s.texture.needsUpdate=true;}}
function clearRun(){generation++;worker?.terminate();worker=null;result=null;playing=false;$('disk-play').textContent='Play';slider.disabled=true;$('disk-play').disabled=true;$('disk-export').disabled=true;$('disk-trace').getContext('2d').clearRect(0,0,800,180);$('disk-readout').textContent='Run the cell to inspect membrane voltage and ionic currents.';}
async function prepare(){
  clearRun();support=null;const token=generation;run.disabled=true;status.textContent='Loading verified field and human morphology…';
  try{
    const length=Number($('disk-mesh').value),modelId=select.value;
    const [loaded]=await Promise.all([loadFiniteContact(),loadActiveModel(modelId,length)]);if(token!==generation)return;field=loaded;
    config=finiteCellConfig(modelId,length,[0,0,Number($('disk-offset').value)]);config.protocol.amplitudeUa=Number($('disk-current').value);config.solver.dtMs=Number($('disk-dt').value);
    nodes=makeActiveMorphology(config).nodes;selectedNode=0;support=prepareFiniteNodes(field,nodes,config);
    const compartments=$('disk-compartment');compartments.replaceChildren();nodes.forEach((n,i)=>{if(!n.areaUm2)return;const o=document.createElement('option');o.value=String(i);o.textContent=n.id;compartments.append(o);});
    drawCell();buildSlices();colorSlices(-config.protocol.amplitudeUa);
    status.textContent=support.supported?`${nodes.filter(n=>n.areaUm2).length} membrane compartments supported. Full morphology retained. Preview shows the cathodic phase; press Run for membrane response.`:`Whole neuron excluded: ${support.issues[0].reason}. ${new Set(support.issues.map(v=>v.id)).size} affected compartments. Gold means unresolved, not inactive. Choose specimen 601927090 for the supported benchmark.`;run.disabled=!support.supported;
  }catch(e){if(token===generation)status.textContent=e.message;}
}
function trace(frame){
  const canvas=$('disk-trace'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,n=nodes.length;
  const values=result.timeMs.map((_,k)=>result.membraneMv[k*n+selectedNode]),lo=Math.min(-90,...values)-2,hi=Math.max(-40,...values)+2;
  ctx.fillStyle='#101c25';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ffba7b';ctx.lineWidth=2;ctx.beginPath();values.forEach((v,k)=>{const x=40+k/(values.length-1)*(w-55),y=h-25-(v-lo)/(hi-lo)*(h-45);k?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  ctx.strokeStyle='#dfe8e8';const x=40+frame/(values.length-1)*(w-55);ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,h-25);ctx.stroke();ctx.fillStyle='#dfe8e8';ctx.font='12px sans-serif';ctx.fillText(`${hi.toFixed(0)} mV`,3,12);ctx.fillText(`${lo.toFixed(0)}`,3,h-25);ctx.fillText('0 ms',40,h-5);ctx.fillText(`${result.timeMs.at(-1)} ms`,w-55,h-5);
}
function updateFrame(){
  if(!result)return;const frame=Number(slider.value),n=nodes.length,index=frame*n+selectedNode,current=result.drive[frame];
  $('disk-compartment').value=String(selectedNode);
  for(const m of meshes){const v=result.membraneMv[frame*n+m.userData.node];m.material.color.copy(blue).lerp(orange,Math.max(0,Math.min(1,(v+100)/140)));}colorSlices(current);trace(frame);
  const v=result.membraneMv[index],ve=result.unitAppliedMvPerUa[selectedNode]*current;
  $('disk-readout').textContent=`${result.timeMs[frame].toFixed(2)} ms · ${nodes[selectedNode].id} · Vm ${v.toFixed(3)} mV · applied Ve ${ve.toFixed(3)} mV · current ${current.toFixed(3)} µA · Na ${result.channels.sodiumNa[index].toPrecision(4)} nA · K ${result.channels.potassiumNa[index].toPrecision(4)} nA · Ca ${result.channels.calciumNa[index].toPrecision(4)} nA`;
}
listen(run,'click',()=>{
  clearRun();run.disabled=true;const token=generation;
  try{worker=new Worker(new URL('./finite-worker.js',import.meta.url),{type:'module'});}catch(e){status.textContent=`Worker unavailable: ${e.message}`;run.disabled=!support?.supported;return;}
  worker.onerror=e=>{if(token===generation){status.textContent=`Worker error: ${e.message}`;run.disabled=false;worker?.terminate();}};
  worker.onmessage=({data})=>{
    if(token!==generation||data.id!==token)return;if(data.type==='progress'){status.textContent=`${data.stage??'Simulating'} · ${Math.round(data.progress*100)}%`;return;}
    run.disabled=false;worker.terminate();worker=null;if(data.type==='error'){status.textContent=data.message;return;}
    result=data.result;slider.max=String(result.timeMs.length-1);slider.value=String(Math.max(0,result.drive.findIndex(v=>v<0)));slider.disabled=false;$('disk-play').disabled=false;$('disk-export').disabled=false;
    status.textContent=`Complete. ${result.responseAnalysis.membraneThresholdCrossings.compartmentCount} compartments crossed −25 mV; ${result.responseAnalysis.soma.thresholdEventCount} soma threshold events; ${result.responseAnalysis.soma.waveformEvidenceCount} sampled overshoot-and-return waveforms. Propagation not established. Firing thresholds remain unvalidated.`;updateFrame();
  };worker.postMessage({id:token,config});
});
listen($('disk-cancel'),'click',()=>{clearRun();run.disabled=!support?.supported;status.textContent='Stopped. Change a setting or run again.';});
for(const id of ['disk-cell','disk-mesh','disk-current','disk-offset','disk-dt'])listen($(id),'change',prepare);
listen(slider,'input',updateFrame);
listen($('disk-compartment'),'change',()=>{selectedNode=Number($('disk-compartment').value);updateFrame();});
listen($('disk-play'),'click',()=>{playing=!playing;$('disk-play').textContent=playing?'Pause':'Play';});
listen($('disk-export'),'click',()=>{
  if(!result)return;
  const {neuralUv,appliedUv,totalUv,differentialUv,recordingSiteIds,config:legacy,...response}=result;
  const output={schemaVersion:FINITE_MODEL,configuration:{cell:legacy.neuron,membrane:legacy.membrane,solver:legacy.solver,waveform:{amplitudeUa:legacy.protocol.amplitudeUa,startMs:legacy.protocol.startMs,phaseUs:legacy.protocol.phaseUs,gapUs:legacy.protocol.gapUs},field:result.fieldModel},units:{geometry:'µm',time:'ms',membrane:'mV',unitApplied:'mV/µA',ionicCurrent:'nA'},nodes,response,limitations:['Single cell, single finite disk; no recording, field gradient or multicontact steering','Spatial/timestep convergence and biological selectivity not established']};
  const blob=new Blob([JSON.stringify(output,(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cortex-finite-disk-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
initScene();prepare();let last=0;
function animate(t){if(disposed)return;animation=requestAnimationFrame(animate);if(playing&&result&&t-last>33){last=t;slider.value=String((Number(slider.value)+1)%result.timeMs.length);updateFrame();}if(renderer)renderer.render(scene,camera);}
animation=requestAnimationFrame(animate);
return ()=>{
  disposed=true;generation++;worker?.terminate();events.abort();cancelAnimationFrame(animation);observer?.disconnect();controls?.dispose();
  scene?.traverse(object=>{object.geometry?.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material?.dispose();});
  for(const slice of slices)slice.texture.dispose();renderer?.dispose();renderer?.domElement.remove();
};
}
