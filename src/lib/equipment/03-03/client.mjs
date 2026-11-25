import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {exampleCalibration,defaultRecipe,calculate,verification} from './solver.mjs';

const root=document.querySelector('[data-pvd75]');
if(root){
const $=id=>root.querySelector('#'+id);
const status=$('pvd-status'),error=$('pvd-error'),readout=$('pvd-results'),map=$('pvd-map');
const fields=['sampleId','material','mode','diameter_mm','duration_s','angle_deg','rpm','pressure_mTorr','power_W','threshold_nm'];
let cal=exampleCalibration(), loaded=false,door=false,pumped=false,running=false,result=null,history=[],runStart=0,recipeAtRun=null,model=null,renderer=null,camera=null,controls=null,scene=null,stage=null,shutter=null,wafer=null,doorJoint=null,raf=0,disposed=false;
function recipe(){return Object.fromEntries(fields.map(k=>[k,['sampleId','material','mode'].includes(k)?$(k).value:($(k).value.trim()===''?NaN:Number($(k).value))]));}
function setRecipe(p){for(const k of fields)$(k).value=String(p[k]);}
function note(s){error.textContent=s||'';}
function exportFile(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function refresh(){
 const p=recipe();$('pvd-cal').textContent=cal?cal.id+' · '+cal.material+'/'+cal.mode+' · '+cal.provenance:'No calibration loaded';
 status.textContent=(running?'DEPOSITING':pumped?'PROCESS VACUUM (virtual)':door?'VENTED · DOOR OPEN':'VENTED · DOOR CLOSED')+' / '+(loaded?'sample loaded':'no sample');
 $('pvd-pressure').textContent=running||pumped?(Number.isFinite(p.pressure_mTorr)?p.pressure_mTorr.toFixed(2)+' mTorr · recipe setpoint':'Invalid setpoint'):'Atmosphere · conceptual';
 $('pvd-door').textContent=door?'Close chamber':'Open chamber';
 $('pvd-door').disabled=pumped||running;
 $('pvd-load').disabled=!door||running;$('pvd-pump').disabled=door||!loaded||pumped||running;
 $('pvd-vent').disabled=!pumped||running;$('pvd-run').disabled=!pumped||!loaded||door||running;
 $('pvd-example').disabled=running;$('pvd-export').disabled=!result||running;$('pvd-csv').disabled=!result||running;
 for(const k of fields)$(k).disabled=running;
 for(const id of ['pvd-import','pvd-demo-cal','pvd-clear-cal'])$(id).disabled=running;
 if(doorJoint)doorJoint.rotation.y=door?-1.9:0;
 if(wafer){wafer.visible=loaded;wafer.scale.x=wafer.scale.z=Math.max(.001,Math.min(.2032,(Number.isFinite(p.diameter_mm)?p.diameter_mm:100)/1000));}
 if(stage&&!running)stage.rotation.y=Number.isFinite(p.angle_deg)?p.angle_deg*Math.PI/180:0;
 if(shutter&&!running)shutter.rotation.y=0;
}
function invalidate(){result=null;readout.textContent='No result for the current settings.';draw(null);refresh();}
function draw(r){
 const ctx=map.getContext('2d');const w=map.width,h=map.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#171d21';ctx.fillRect(0,0,w,h);
 if(!r){ctx.fillStyle='#e4e0d4';ctx.font='15px sans-serif';ctx.fillText('Thickness field · run an experiment',12,26);return}
 const R=r.recipe.diameter_mm/2,scale=(Math.min(w,h)-34)/(2*R),lo=r.min_nm,hi=r.max_nm;
 for(const q of r.points){const t=hi>lo?(q.thickness_nm-lo)/(hi-lo):1;ctx.fillStyle='hsl('+(220-175*t)+',68%,'+(34+24*t)+'%)';const s=2*R/40*scale+1;ctx.fillRect(w/2+q.x_mm*scale-s/2,h/2-q.y_mm*scale-s/2,s,s)}
 ctx.strokeStyle='#f1ead8';ctx.beginPath();ctx.arc(w/2,h/2,R*scale,0,2*Math.PI);ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.fillText('−x',8,h/2);ctx.fillText('+x',w-25,h/2);ctx.fillText('+y',w/2+6,13);
}
function show(r){result=r;const f=v=>v.toFixed(3);readout.textContent='Centre '+f(r.center_nm)+' nm · mean '+f(r.mean_nm)+' nm · range '+f(r.min_nm)+'–'+f(r.max_nm)+' nm · nonuniformity ±'+f(r.nonuniformity_pct)+'% · planar coverage '+(100*r.coverage_fraction).toFixed(1)+'% · stress not estimated · revision '+r.revision;
 $('pvd-map-scale').textContent='Map range: '+f(r.min_nm)+' to '+f(r.max_nm)+' nm (auto-scaled)';draw(r);if(wafer){wafer.material=wafer.material.clone();wafer.material.color.set(r.material==='Al'?0xbfc5c8:r.mode==='RF'?0xddd4bb:0x9d9b91);}
 $('pvd-history').textContent=history.map(x=>x.sampleId+' / r'+x.revision+' / '+x.material+' / '+x.center_nm.toFixed(2)+' nm').join(' | ');
}
function finish(r){running=false;let prior=history.filter(x=>x.sampleId===r.sampleId).at(-1);r.revision=prior?prior.revision+1:1;r.parentRevision=prior?prior.revision:null;r.createdAt=new Date().toISOString();r.provenance='Calculated, not measured';history.push(r);show(r);refresh();$('pvd-progress').value=1;}
function run(){
 note('');if(!loaded||!pumped||door){note('Close and pump the loaded chamber first.');return}
 try{const p=recipe();const r=calculate(cal,p);running=true;runStart=performance.now();recipeAtRun=p;result=null;$('pvd-progress').value=0;refresh();
 const tick=()=>{if(disposed)return;const t=Math.min(1,(performance.now()-runStart)/2000);$('pvd-progress').value=t;if(stage)stage.rotation.y=(p.angle_deg*Math.PI/180)+2*Math.PI*p.rpm*p.duration_s/60*t;if(shutter)shutter.rotation.y=-1.45;if(t<1)requestAnimationFrame(tick);else finish(r)};requestAnimationFrame(tick);
 }catch(e){note(e.message);running=false;refresh();}
}
$('pvd-door').onclick=()=>{if(!pumped&&!running){door=!door;refresh();if(door)view('chamber');}};
$('pvd-load').onclick=()=>{if(!door||running)return;const p=recipe();if(!p.sampleId.trim()||!Number.isFinite(p.diameter_mm)||p.diameter_mm<=0||p.diameter_mm>203.2){note('A sample ID and diameter up to 203.2 mm are required.');return}loaded=true;note('');invalidate();};
$('pvd-pump').onclick=()=>{if(!door&&loaded){pumped=true;note('');refresh();}};
$('pvd-vent').onclick=()=>{pumped=false;note('');refresh();};
$('pvd-run').onclick=run;
$('pvd-example').onclick=()=>{cal=exampleCalibration();setRecipe(defaultRecipe());loaded=true;door=false;pumped=true;invalidate();run();};
$('pvd-demo-cal').onclick=()=>{cal=exampleCalibration();invalidate();note('');};
$('pvd-clear-cal').onclick=()=>{cal=null;invalidate();note('');};
$('pvd-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Rate map exceeds 2 MB.');cal=JSON.parse(await file.text());invalidate();note('Imported; target, mode, pressure, power and grid are validated at run time.');}catch(err){cal=null;invalidate();note('Import failed: '+err.message);}finally{e.target.value='';}};
for(const k of fields)$(k).addEventListener('change',()=>{if(k==='sampleId'||k==='diameter_mm'){loaded=false;pumped=false;}invalidate();note('');});
$('pvd-export').onclick=()=>{if(result)exportFile(result.sampleId+'-r'+result.revision+'.json',JSON.stringify({...result,revisionHistory:history.filter(x=>x.sampleId===result.sampleId).map(({revision,parentRevision,material,center_nm,createdAt})=>({revision,parentRevision,material,center_nm,createdAt}))},null,2),'application/json');};
$('pvd-csv').onclick=()=>{if(result)exportFile(result.sampleId+'-r'+result.revision+'.csv',['x_mm,y_mm,rate_nm_s,thickness_nm',...result.points.map(q=>[q.x_mm,q.y_mm,q.rate_nm_s,q.thickness_nm].join(','))].join('\n'),'text/csv');};
const views={front:[[0,1.02,3.25],[0,.98,0]],perspective:[[2.2,1.65,3.1],[0,.99,0]],side:[[3.25,1.1,0],[0,.96,0]],rear:[[1.3,1.4,-3.2],[0,.95,0]],chamber:[[-.28,1.30,1.22],[-.28,1.23,.03]]};
function view(v){if(!camera||!controls)return;const [p,t]=views[v]||views.perspective;camera.position.set(...p);controls.target.set(...t);controls.update();}
for(const button of root.querySelectorAll('[data-pvd-view]'))button.onclick=()=>{const v=button.dataset.pvdView;if(v==='chamber'&&!pumped&&!running){door=true;refresh();}view(v);};
function label(text,width,height,x,y,z){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#aeb4b9';ctx.fillRect(0,0,512,96);ctx.fillStyle='#12629b';ctx.font='bold 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,495);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex}));mesh.position.set(x,y,z);return mesh;}
function init3d(){
 const host=$('pvd-viewer');try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setClearColor(0x242b30);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;Object.assign(renderer.domElement.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});host.replaceChildren(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.025,30);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.25;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.92;
 scene.add(new THREE.HemisphereLight(0xeaf2ff,0x66615a,2.2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,4);scene.add(key);const fill=new THREE.DirectionalLight(0xc4d8ff,1.3);fill.position.set(-3,3,-2);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0x394047,roughness:.92}));ground.rotation.x=-Math.PI/2;ground.position.y=-.007;scene.add(ground);
 const grid=new THREE.GridHelper(5,20,0x6e7a80,0x48535a);grid.position.y=-.004;scene.add(grid);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};const observer=new ResizeObserver(resize);observer.observe(host);resize();view('perspective');
 new GLTFLoader().load('/equipment/03-03/pvd75.gltf',g=>{if(disposed)return;model=g.scene;scene.add(model);doorJoint=model.getObjectByName('door_pivot');stage=model.getObjectByName('stage_pivot');shutter=model.getObjectByName('shutter_pivot');wafer=model.getObjectByName('sample_wafer');model.add(label('PVD 75',.28,.046,-.39,1.856,.455));model.add(label('Kurt J. Lesker',.29,.035,.40,1.856,.455));$('pvd-model-status').textContent='Metric glTF loaded · 162 named parts';$('pvd-glb').disabled=false;refresh();},undefined,e=>{$('pvd-model-status').textContent='3D asset failed to load; numerical experiment remains available.';console.error(e);});
 const loop=()=>{if(disposed)return;controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(loop);};loop();
 $('pvd-glb').onclick=()=>{if(!model)return;new GLTFExporter().parse(model,b=>exportFile('pvd75-current.glb',b,'model/gltf-binary'),e=>note('GLB export failed: '+e.message),{binary:true,onlyVisible:false});};
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.dispose();},{once:true});
 }catch(e){$('pvd-model-status').textContent='WebGL unavailable; numerical experiment remains available.';console.error(e);}
}
setRecipe(defaultRecipe());draw(null);refresh();init3d();
const tests=verification();for(const r of tests){const tr=document.createElement('tr');for(const val of [r.test,r.expected,r.actual,r.units,r.tolerance,r.pass?'PASS':'FAIL']){const td=document.createElement('td');td.textContent=String(val);tr.append(td)}$('pvd-verification').append(tr);}
}
