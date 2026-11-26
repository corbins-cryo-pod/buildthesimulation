import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {action,initial} from '../../../../public/equipment/10-08/solver.mjs';
import doc from '../../../../public/equipment/10-08/facets.json';
const $=k=>document.getElementById('bv-'+k);let state=initial();
function diagram(){
 const c=$('diagram'),g=c.getContext('2d'),{width:w,height:h}=c,s=4.05,X=x=>w/2+s*x,Y=y=>h/2-s*y,fixture=doc.fixtures[state.selected],r=state.result;
 g.fillStyle='#1b3439';g.fillRect(0,0,w,h);g.font='16px monospace';g.fillStyle='#f3e8cd';g.fillText(fixture.label,16,25);g.fillText('Fictitious macro reference / mm',16,h-10);
 g.strokeStyle='#4a6568';g.lineWidth=1;
 for(let i=-50;i<=50;i+=10){g.beginPath();g.moveTo(X(i),42);g.lineTo(X(i),h-33);g.stroke()}
 for(let i=-30;i<=30;i+=10){g.beginPath();g.moveTo(60,Y(i));g.lineTo(w-60,Y(i));g.stroke()}
 for(const [key,col] of [['base','#78e4d2'],['facet','#ecb66a']]){
  const pts=fixture[key];g.strokeStyle=col;g.fillStyle=col;g.lineWidth=1;
  g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(X(x),Y(y)):g.moveTo(X(x),Y(y)));g.stroke();
  pts.forEach(([x,y])=>{g.beginPath();g.arc(X(x),Y(y),4,0,2*Math.PI);g.fill();});
  if(r&&state.overlay){
   const P=r.fittedLines[key],C=P.centroidMm,U=P.direction,length=33;g.setLineDash([8,4]);g.beginPath();
   g.moveTo(X(C[0]-length*U[0]),Y(C[1]-length*U[1]));g.lineTo(X(C[0]+length*U[0]),Y(C[1]+length*U[1]));g.stroke();g.setLineDash([]);
  }
 }
 if(r&&state.overlay){g.fillStyle='#fff1d5';g.fillText(r.interiorDeg.toFixed(6)+'° fitted',w-180,27)}
}
function sync(){
 const r=state.result;$('fixture').value=state.selected;
 $('overlay').textContent=state.overlay?'Hide fitted lines':'Show fitted lines';
 $('result').textContent=r?`Fitted acute angle: ${r.interiorDeg.toFixed(6)}°\nBase RMS: ${r.fittedLines.base.rmsOrthogonalMm.toExponential(2)} mm\nFacet RMS: ${r.fittedLines.facet.rmsOrthogonalMm.toExponential(2)} mm\n${r.fixtureId} · annotation r${r.revision}`:'No angle annotation yet.';
 $('export').disabled=!r;diagram();
}
function dispatch(type,payload){
 const b=$('status');try{state=action(state,{type,payload},doc);b.classList.remove('error');b.textContent=type==='inspect'?'Annotated a pre-existing synthetic edge. Nothing on the instrument model moved.':'Only the annotation display changed.';}catch(e){b.classList.add('error');b.textContent=e.message}sync();
}
$('fixture').onchange=e=>dispatch('choose',+e.target.value);
 for(const k of ['overlay','inspect','reset'])$(k).onclick=()=>dispatch(k);
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state.result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='10-08-angle-annotation.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)};
sync();
async function init3D(){
 const host=$('view'),renderer=new T.WebGLRenderer({antialias:true});host.append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd9dddf);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0xa8bbbe,2.58));const light=new T.DirectionalLight(0xfff2da,2.4);light.position.set(.74,1.23,.82);scene.add(light);
 const cam=new T.PerspectiveCamera(36,1,.002,10),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.08;orbit.maxDistance=2.3;
 const {scene:root}=await new GLTFLoader().loadAsync('/equipment/10-08/bv10d-static.glb');scene.add(root);
 const views={overall:[[.52,.44,.67],[0,.085,0]],detail:[[.37,.32,.36],[.108,.102,.012]],rear:[[.43,.32,-.53],[0,.087,0]]};
 const draw=()=>renderer.render(scene,cam);
 function snap(k){cam.position.set(...views[k][0]);orbit.target.set(...views[k][1]);orbit.update();draw()}
 orbit.addEventListener('change',draw);
 new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);cam.aspect=host.clientWidth/host.clientHeight;cam.updateProjectionMatrix();draw()}).observe(host);
 document.querySelectorAll('[data-bv-view]').forEach(x=>{x.onclick=()=>snap(x.dataset.bvView)});
 const ray=new T.Raycaster(),target=root.getObjectByName('facet_selector_overlay');let press;
 renderer.domElement.addEventListener('pointerdown',e=>{press=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>5)return;press=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),cam);if(ray.intersectObject(target,true).length)dispatch('cycle')});
 snap('overall');$('ready').textContent='Metric documentary model loaded. The teal teaching badge switches the reference drawing only.';
}
init3D().catch(e=>{$('ready').textContent='3D unavailable. The reference drawings and angle annotation still work.';console.warn(e.message)});
