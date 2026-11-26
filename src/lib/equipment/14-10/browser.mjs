import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,checkpoint,configure,csv,defaults,limits,result} from '../../../../public/equipment/14-10/solver.mjs';
const $=id=>document.getElementById('fx-'+id), settings=()=>Object.fromEntries(Object.keys(defaults).map(k=>[k,$(k).valueAsNumber]));
let state={job:null,loaded:true,armBent:false}, renderPose=()=>{};
function drawChart(){
 const c=$('chart'),ctx=c.getContext('2d'),w=c.width,h=c.height,rows=state.job?.history??[];
 ctx.fillStyle='#172e34';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff3d8';ctx.font='16px sans-serif';
 ctx.fillText('Flat-loop resistance (Ω) after each completed cycle',16,25);
 if(!rows.length){ctx.fillText('No cycles acquired.',18,h/2);return}
 const good=rows.filter(r=>r.flatResistanceOhm!==null), lo=Math.min(...good.map(r=>r.flatResistanceOhm),configure(state.job.settings).baselineOhm), hi=Math.max(...good.map(r=>r.flatResistanceOhm),lo+0.05);
 const X=i=>63+i*(w-100)/state.job.settings.cycles,Y=r=>46+(1-(r-lo)/(hi-lo))*(h-103);
 ctx.lineWidth=1;
 for(let j=0;j<5;j++){const x=X(j*state.job.settings.cycles/4),v=lo+(hi-lo)*j/4,y=Y(v);ctx.strokeStyle='#547276';ctx.beginPath();ctx.moveTo(63,y);ctx.lineTo(w-37,y);ctx.moveTo(x,46);ctx.lineTo(x,h-57);ctx.stroke();ctx.fillStyle='#fff3d8';ctx.fillText(v.toFixed(3),5,y+4);ctx.fillText(String(Math.round(j*state.job.settings.cycles/4)),x-11,h-34)}
 ctx.fillText('Cycle',w/2-20,h-9);
 ctx.lineWidth=2;ctx.strokeStyle='#7ef0d1';ctx.beginPath();ctx.moveTo(X(0),Y(lo));for(const row of good)ctx.lineTo(X(row.cycle),Y(row.flatResistanceOhm));ctx.stroke();
 for(const ev of state.job.events){const x=X(ev.cycle);ctx.strokeStyle='#fdaf71';ctx.beginPath();ctx.moveTo(x,46);ctx.lineTo(x,h-57);ctx.stroke();ctx.fillStyle='#fdaf71';ctx.fillText('Open '+ev.cycle,Math.min(x+4,w-97),42)}
}
function sync(){
 const j=state.job,r=j?.history.at(-1),e=j?.events[0];
 $('load').textContent=state.loaded?'Unload coupon':'Load coupon';$('jog').textContent=state.armBent?'Return to flat':'Jog to 90°';
 for(const key of Object.keys(defaults))$(key).disabled=!!j;
 $('run').disabled=!!j&&j.history.length>=j.settings.cycles; $('pause').disabled=(j?.history.length??0)>=60||settings().cycles<60;
 $('checkpoint').disabled=!j||!j.history.length;$('csv').disabled=$('json').disabled=!r;
 $('result').textContent=r?[`${r.cycle} / ${j.settings.cycles} cycles · ${r.timeS.toFixed(2)} s model time`,`Peak curvature: ${r.peakCurvaturePerM.toFixed(3)} m⁻¹`,`Peak surface strain: ${(r.peakStrain*100).toFixed(4)}%`,`End-of-cycle reading: ${r.flatResistanceOhm===null?'Open circuit':r.flatResistanceOhm.toFixed(4)+' Ω'}`,e?`One open event · cycle ${e.cycle} · ${e.reason}`:'No open event',j.resumedAt===null?'':`Restored checkpoint at cycle ${j.resumedAt}`].filter(Boolean).join('\n'):'No cycles acquired. Settings can be edited.';
 drawChart();renderPose();
}
function dispatch(type,payload){
 const m=$('status');try{
  if(type==='jog')configure(state.job?.settings??settings());
  state=action(state,{type,payload});
  if(type==='resume')for(const [k,v] of Object.entries(state.job.settings))$(k).value=String(v);
  m.textContent=type==='resume'?`Restored cycle ${state.job.resumedAt}; finish or export the job.`:type==='jog'?(state.armBent?'At 90° crest. Jogging does not increment the count.':'Returned flat.'):(state.job?`Completed cycle ${state.job.history.length}.`:'Ready.');m.classList.remove('error');
 }catch(e){m.textContent=e.message;m.classList.add('error')}
 sync();
}
for(const k of Object.keys(limits))$(k).addEventListener('change',sync);
for(const k of ['load','jog','reset'])$(k).onclick=()=>dispatch(k);
$('pause').onclick=()=>dispatch('run',{settings:settings(),cycle:60});
$('run').onclick=()=>dispatch('run',{settings:settings(),cycle:(state.job?.settings??settings()).cycles});
$('restore').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('Checkpoint exceeds 100 kB.');dispatch('resume',JSON.parse(await f.text()))}catch(err){$('status').textContent=err.message;$('status').classList.add('error')}finally{e.target.value=''}};
function download(data,filename,mime){const u=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
$('checkpoint').onclick=()=>download(JSON.stringify(checkpoint(state.job),null,2),'14-10-checkpoint.json','application/json');
$('csv').onclick=()=>download(csv(state.job),'14-10-history.csv','text/csv');
$('json').onclick=()=>download(JSON.stringify(result(state.job),null,2),'14-10-history.json','application/json');
sync();

async function init3D(){
 const box=$('view'),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd7dddf);box.append(renderer.domElement);
 const scene=new T.Scene(),root=new T.Group();scene.add(root,new T.HemisphereLight(0xffffff,0xacc0c3,2.7));const light=new T.DirectionalLight(0xfff4dc,2.6);light.position.set(.4,.55,.32);scene.add(light);
 const camera=new T.PerspectiveCamera(36,1,.001,10),orbit=new OrbitControls(camera,renderer.domElement);orbit.minDistance=.033;orbit.maxDistance=1.7;
 const glb=await new GLTFLoader().loadAsync('/equipment/14-10/cyclic-bend.glb');root.add(glb.scene);
 const node=k=>glb.scene.getObjectByName(k), arm=node('bend_arm'),mandrel=node('replaceable_mandrel'),jaw=node('moving_grip');
 const foilMaterial=new T.MeshStandardMaterial({color:0xdd9a34,side:T.DoubleSide,metalness:.38,roughness:.35});
 const positions=new Float32Array(3*2*23), g=new T.BufferGeometry(), indices=[];
 for(let i=0;i<22;i++)indices.push(2*i,2*i+1,2*i+2,2*i+1,2*i+3,2*i+2);
 g.setIndex(indices);g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 const foil=new T.Mesh(g,foilMaterial);foil.name='synthetic_coupon';foil.frustumCulled=false;root.add(foil);
 const cameras={overall:[[.38,.3,.47],[0,.047,0]],detail:[[.027,.180,.176],[-.035,.087,.02]],rear:[[.34,.28,-.42],[0,.051,0]]};let view='overall';
 const draw=()=>renderer.render(scene,camera);
 function snap(v){view=v;camera.position.set(...cameras[v][0]);orbit.target.set(...cameras[v][1]);orbit.update();draw()}
 renderPose=()=>{
  let m;try{m=configure(state.job?.settings??settings())}catch{m=configure(defaults)}
  const r=m.radiusNeutralM, theta=state.armBent?Math.PI/2:0, cx=-.025,cz=.018,y=.094,width=.006, L=m.values.lengthMm/1000;
  const line=(i,x,z,nx,nz)=>{for(let j=0;j<2;j++){const a=j===0?-.5:.5;g.attributes.position.setXYZ(2*i+j,x,y+a*width,z)}};
  const arc=(i,a)=>line(i,cx+r*Math.sin(a),cz+r*Math.cos(a),Math.sin(a),Math.cos(a));
  line(0,cx-.023,cz+r,0,1);
  for(let i=0;i<=20;i++){if(theta)arc(i+1,theta*i/20);else line(i+1,cx+L*.85*i/20,cz+r,0,1)}
  const x=cx+r*Math.sin(theta)+(L-r*theta)*Math.cos(theta), z=cz+r*Math.cos(theta)-(L-r*theta)*Math.sin(theta);
  line(22,x,z,Math.sin(theta),Math.cos(theta));
  g.attributes.position.needsUpdate=true;g.computeVertexNormals();
  jaw.position.set(x,y,z);jaw.rotation.y=theta;arm.rotation.y=theta;const fixed=node('fixed_grip');fixed.position.z=cz+r;mandrel.scale.set(m.values.radiusMm/4.95,1,m.values.radiusMm/4.95);foil.visible=state.loaded;
  foilMaterial.color.setHex(state.job?.events.length?0xd56f47:0xdd9a34);draw();
 };
 orbit.addEventListener('change',draw);
 new ResizeObserver(()=>{if(!box.clientWidth||!box.clientHeight)return;renderer.setSize(box.clientWidth,box.clientHeight,false);camera.aspect=box.clientWidth/box.clientHeight;camera.updateProjectionMatrix();draw()}).observe(box);
 for(const b of document.querySelectorAll('[data-fx-view]'))b.onclick=()=>snap(b.dataset.fxView);
 const ray=new T.Raycaster(),hit=node('jog_input');let start;
 renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;start=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);if(ray.intersectObject(hit,true).length)dispatch('jog')});
 snap(view);renderPose();$('ready').textContent='3D instrument loaded · meters · click the turquoise jog control.';
}
init3D().catch(e=>{$('ready').textContent='3D viewer unavailable. The model calculations and exports still work.';console.warn(e.message)});
