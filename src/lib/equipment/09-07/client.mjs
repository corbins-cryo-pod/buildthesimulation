import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/09-07/';
const url=new URL(path+'solver.mjs',window.location.origin).href;
const {dispatch,initial,toCsv}=await import(/* @vite-ignore */ url);
const app=document.querySelector('#lcr4980'), $=k=>app.querySelector('#lcr-'+k);
let state=initial(),result=null,paint=()=>{},getNodes=()=>null;
function message(text,err=false){$('status').textContent=text;$('status').dataset.error=String(err);}
function run(a,v){
 const r=dispatch(state,a,v);
 if(!r.ok){message(r.message,true);return false;}
 state=r.state;
 if(r.result){result=r.result;message((result.corrected?'Corrected':'Raw')+' sweep r'+result.revision+' · '+result.rows.length+' point(s).');}
 else{
  if(a!=='set-mode'&&a!=='cycle-mode')result=null;
  message(((a==='trigger'&&state.standard!=='dut')||a==='record-standard')?'Stored '+state.standard.toUpperCase()+' standard revision '+state.revision+'.':'Setting applied.');
 }
 sync();return true;
}
const nice=(n,d=6)=>n==null?'—':Number(n.toPrecision(d)).toLocaleString('en-US',{maximumFractionDigits:9});
function rows(){
 if(!result)return;
 const first=result.rows[0],m=first.impedance;
 const capital=state.mode==='series'?'Cs':'Cp';
 const values=result.rows.map(({frequencyHz,raw,impedance:i})=>[nice(frequencyHz),nice(raw.realOhm),nice(raw.imagOhm),nice(i.realOhm),nice(i.imagOhm),nice(i.phaseDeg),nice(i[state.mode==='series'?'seriesCapacitancePf':'parallelCapacitancePf']),nice(i[state.mode==='series'?'seriesResistanceOhm':'parallelResistanceOhm'])]);
 $('result').textContent=(result.corrected?'Corrected':'Raw')+' '+result.sampleId+' · '+capital+' '+nice(m[state.mode==='series'?'seriesCapacitancePf':'parallelCapacitancePf'])+' pF at '+nice(first.frequencyHz)+' Hz';
 $('cap-heading').textContent=capital+' · pF';
 $('r-heading').textContent=(state.mode==='series'?'Rs':'Rp')+' · Ω';
 $('rows').replaceChildren(...values.map(row=>{
  const tr=document.createElement('tr');
  for(const arg of row){const td=document.createElement('td');td.textContent=arg;tr.append(td);}
  return tr;
 }));
}
function sync(){
 $('mount').value=state.standard;$('mode').value=state.mode;
 $('correct').checked=state.corrected;$('freq').value=state.grid.join(', ');
 $('voltage').value=state.voltsRms;$('stray-r').value=state.fixture.seriesOhm;$('stray-c').value=state.fixture.shuntPf;
 $('dut-id').value=state.dut.id;$('topology').value=state.dut.topology;$('dut-r').value=state.dut.resistanceOhm;$('dut-c').value=state.dut.capacitancePf;
 $('power').textContent=state.powered?'Standby':'Power on';
 $('trigger').textContent=state.standard==='dut'?'Measure sweep':'Store '+state.standard.toUpperCase()+' standard';
 $('standards').textContent='OPEN '+(state.cal.open?'r'+state.cal.open.revision:'not stored')+' · SHORT '+(state.cal.short?'r'+state.cal.short.revision:'not stored');
 $('json').disabled=$('csv').disabled=!result;
 if(!result){$('rows').replaceChildren();$('result').textContent='No current measurement.';} else rows();
 paint();
}
$('mount').addEventListener('change',e=>run('mount',e.target.value));
$('mode').addEventListener('change',e=>run('set-mode',e.target.value));
$('correct').addEventListener('change',()=>run('toggle-correction'));
$('freq').addEventListener('change',e=>run('grid',e.target.value.split(',').map(x=>Number(x.trim()))));
$('voltage').addEventListener('change',e=>run('test-voltage',e.target.valueAsNumber));
for(const [id,name] of [['stray-r','seriesOhm'],['stray-c','shuntPf']])$(id).addEventListener('change',e=>run('fixture',{[name]:e.target.valueAsNumber}));
for(const [id,name,kind] of [['dut-id','id','text'],['topology','topology','text'],['dut-r','resistanceOhm','number'],['dut-c','capacitancePf','number']])$(id).addEventListener('change',e=>run('dut',{[name]:kind==='text'?e.target.value:e.target.valueAsNumber}));
for(const [id,a] of [['trigger','trigger'],['power','power'],['reset','reset']])$(id).addEventListener('click',()=>run(a));
function save(s,name,mime){
 const url=URL.createObjectURL(new Blob([s],{type:mime})),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),700);
}
$('json').onclick=()=>result&&save(JSON.stringify({...result,mode:state.mode},null,2),'e4980a-impedance.json','application/json');
$('csv').onclick=()=>result&&save(toCsv(result),'e4980a-impedance.csv','text/csv');
function lcd(ctx,w,h){
 ctx.fillStyle=state.powered?'#092652':'#17222a';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#73c9fc';ctx.font='18px system-ui';ctx.fillText('E4980A · '+state.mode.toUpperCase(),18,35);
 ctx.strokeStyle='#5891c1';ctx.beginPath();ctx.moveTo(16,47);ctx.lineTo(w-16,47);ctx.stroke();
 if(!state.powered){ctx.fillText('STANDBY',18,84);return;}
 ctx.fillText(state.standard.toUpperCase()+'     '+state.voltsRms.toFixed(2)+' V rms    '+(state.corrected?'CORR':'RAW'),18,82);
 ctx.fillText($('standards').textContent,18,120);
 if(!result){ctx.fillText('Trigger to '+(state.standard==='dut'?'measure':'save standard'),18,168);return;}
 const eq=result.rows[0].impedance,k=state.mode==='series'?'seriesCapacitancePf':'parallelCapacitancePf';
 ctx.font='27px system-ui';ctx.fillText((state.mode==='series'?'Cs  ':'Cp  ')+nice(eq[k])+' pF',18,172);ctx.font='18px system-ui';
 ctx.fillText(nice(result.rows[0].frequencyHz)+' Hz',18,208);
}
async function viewer(){
 const host=$('viewer'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.003,5);
 const r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 scene.background=new THREE.Color('#243640');r.setPixelRatio(Math.min(1.5,devicePixelRatio));r.outputColorSpace=THREE.SRGBColorSpace;
 host.appendChild(r.domElement);r.domElement.setAttribute('aria-label','Orbitable E4980A and 16034E; equivalent keyboard controls beside the view.');
 const controls=new OrbitControls(camera,r.domElement);controls.minDistance=.085;controls.maxDistance=2;
 const render=()=>r.render(scene,camera);controls.addEventListener('change',render);
 scene.add(new THREE.HemisphereLight(0xffffff,0x656169,1.8));
 for(const [p,e] of [[[.4,.6,.7],2.6],[[-.4,.55,-.63],1.8]]){const sun=new THREE.DirectionalLight(0xffffff,e);sun.position.fromArray(p);scene.add(sun);}
 const floor=new THREE.GridHelper(1.25,25,0x648496,0x48636c);floor.position.y=-.002;scene.add(floor);
 const [g,b]=await Promise.all([new GLTFLoader().loadAsync(path+'e4980a.glb'),fetch(path+'interaction.json').then(x=>x.json())]);
 const model=g.scene;scene.add(model);
 const node=name=>{const found=[];model.traverse(o=>{if(o.name===name)found.push(o)});if(found.length!==1)throw Error('Missing or duplicate node '+name);return found[0];};
 node(b.frame.placementAnchor);b.ports.forEach(x=>node(x.node));model.updateMatrixWorld(true);
 const screen=node('front_lcd'),c=document.createElement('canvas');c.width=400;c.height=263;
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
 const p=new THREE.Mesh(new THREE.PlaneGeometry(.0868,.0578),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));
 p.position.z=.00053;screen.add(p);
 const jaw=node('fixture_jaw'),z=jaw.position.x,chip=node('chip_dut'),short=node('chip_short');
 // The three specimen mount states use illustrative, not measured, jaw travel.
 paint=()=>{
  jaw.position.x=z+(state.standard==='open'?-.005:state.standard==='dut'?-.001:0);
  chip.visible=state.standard==='dut';short.visible=state.standard==='short';
  lcd(c.getContext('2d'),c.width,c.height);tx.needsUpdate=true;render();
 };
 const targets=b.controls.map(x=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(...x.targetSizeM),new THREE.MeshBasicMaterial({visible:false}));
   m.userData.control=x;node(x.node).getWorldPosition(m.position);scene.add(m);return m;
 });
 const ray=new THREE.Raycaster(),v=new THREE.Vector2();scene.updateMatrixWorld(true);
 for(const m of targets){
  ray.set(m.position.clone().add(new THREE.Vector3(0,0,.2)),new THREE.Vector3(0,0,-1));
  if(ray.intersectObjects(targets)[0]?.object!==m)throw Error('Overlapping interaction targets: '+m.userData.control.id);
 }
 function hit(e){
  const bb=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-bb.left)/bb.width-1,1-2*(e.clientY-bb.top)/bb.height);
  ray.setFromCamera(v,camera);return ray.intersectObjects(targets)[0]?.object.userData.control;
 }
 let start=null;
 r.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
 r.domElement.addEventListener('pointerup',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])<6){const x=hit(e);if(x)run(x.action,x.value);}start=null;});
 r.domElement.addEventListener('pointermove',e=>{const x=hit(e);r.domElement.style.cursor=x?'pointer':'grab';r.domElement.title=x?.label??'Orbit the instrument';});
 const poses={orbit:[[.47,.29,.57],[.013,.05,.02]],front:[[0,.075,.63],[0,.05,.155]],rear:[[0,.095,-.64],[0,.05,-.145]],fixture:[[.16,.18,.40],[.119,.047,.24]]};
 function go(k){camera.position.fromArray(poses[k][0]);controls.target.fromArray(poses[k][1]);controls.update();render();}
 app.querySelectorAll('[data-lcr-view]').forEach(x=>x.onclick=()=>go(x.dataset.lcrView));
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();};
 new ResizeObserver(resize).observe(host);resize();go('orbit');paint();
 $('model').textContent='Metric GLB loaded · '+targets.length+' validated panel/fixture targets';$('model').dataset.loaded='true';
}
sync();viewer().catch(e=>{$('model').textContent='3D view unavailable: '+e.message+' Numerical controls still work.';$('viewer').style.display='none';});
