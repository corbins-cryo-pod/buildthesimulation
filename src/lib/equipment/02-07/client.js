import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const base='/equipment/02-07/';
export async function initSpin(){
 const $=id=>document.getElementById('spin-'+id);
 if(!$('view'))return;
 const solverURL=base+'solver.mjs';
 const {EXAMPLE,CAL,simulate,validate}=await import(/* @vite-ignore */ solverURL);
 const keys=Object.keys(EXAMPLE).filter(k=>$(k));let contactIds=[],state={lid:false,loaded:false,vacuum:false,dispensed:false,running:false},result=null,jobAtRun=null,started=0,runDuration=0,runCounter=0,model=null,lid=null,rotor=null,wafer=null,film=null,pipette=null,screen=null,screenTexture=null,renderer=null,controls=null,camera=null,scene=null,currentRPM=0;
 const status=s=>{$('status').textContent=s};
 const job=()=>({...EXAMPLE,contactIds:[...contactIds],...Object.fromEntries(keys.map(k=>[k,$(k).type==='number'?($(k).value.trim()===''?NaN:Number($(k).value)):$(k).value]))});
 const write=j=>{for(const k of keys)$(k).value=j[k];contactIds=[...j.contactIds]};
 function setResults(r){result=r;$('json').disabled=$('csv').disabled=!r;const ctx=$('map').getContext('2d');ctx.clearRect(0,0,324,324);ctx.fillStyle='#e2ded2';ctx.fillRect(0,0,324,324);const chart=$('chart').getContext('2d');chart.clearRect(0,0,480,280);chart.fillStyle='#e2ded2';chart.fillRect(0,0,480,280);
 if(!r){$('readout').textContent='No committed resist revision.';$('legend').textContent='Run a recipe to populate map.';return}
 const {grid,metrics:m}=r,min=m.min_um,max=m.max_um,span=max-min||1;
 for(let z=0;z<grid.nz;z++)for(let x=0;x<grid.nx;x++){const v=grid.values[z*grid.nx+x];if(v===null)continue;const t=(v-min)/span;ctx.fillStyle='rgb('+Math.round(50+180*t)+','+Math.round(94+50*t)+','+Math.round(165-118*t)+')';ctx.fillRect(x*4,z*4,4,4)}
 $('legend').textContent='Blue '+min.toFixed(3)+' µm → amber '+max.toFixed(3)+' µm; outside wafer blank.';
 const W=480,H=280,left=48,bottom=H-38,top=20,right=W-18,T=r.history.total_s,M=Math.max(...r.history.steps.map(s=>Math.max(s.start_rpm,s.end_rpm)));
 const X=t=>left+t/T*(right-left),Y=v=>bottom-v/M*(bottom-top);
 chart.strokeStyle='#565958';chart.fillStyle='#303735';chart.font='12px sans-serif';chart.lineWidth=1;chart.beginPath();chart.moveTo(left,top);chart.lineTo(left,bottom);chart.lineTo(right,bottom);chart.stroke();
 for(let i=0;i<=4;i++){chart.fillText(Math.round(M*i/4),4,Y(M*i/4)+4);chart.fillText(Math.round(T*i/4)+'s',X(T*i/4)-10,bottom+18)}
 chart.fillText('rpm',4,13);chart.strokeStyle='#1e557b';chart.lineWidth=3;chart.beginPath();chart.moveTo(X(0),Y(0));for(const s of r.history.steps)chart.lineTo(X(s.end_s),Y(s.end_rpm));chart.stroke();
 $('readout').textContent='Central '+m.central_um.toFixed(3)+' µm · map mean '+m.mean_um.toFixed(3)+' µm · range '+m.range_um.toFixed(3)+' µm (illustrative) · revision '+r.revision+' · '+r.history.total_s.toFixed(2)+' s. '+r.provenance.warning;
 }
 function sync(){const j=job();$('state').textContent=state.running?'RUNNING':state.dispensed?'RESIST LOADED':state.loaded?'WAFER LOADED':'UNLOADED';$('lid').textContent=state.lid?'Close lid':'Open lid';$('vacuum').textContent=state.vacuum?'Vacuum off':'Vacuum on';$('vac-state').textContent=state.vacuum?'ON':'OFF';$('stop').disabled=!state.running;for(const k of [...keys,'lid','load','vacuum','dispense','start','unload','example','utility','import'])$(k).disabled=state.running;
 if(wafer){wafer.visible=state.loaded;const d=Number.isFinite(j.diameter_mm)?Math.max(50,Math.min(150,j.diameter_mm)):150;wafer.scale.set(d/150,1,d/150);wafer.position.x=Number.isFinite(j.offsetX_mm)?Math.max(-10,Math.min(10,j.offsetX_mm)):0;wafer.position.z=Number.isFinite(j.offsetZ_mm)?Math.max(-10,Math.min(10,j.offsetZ_mm)):0;film.visible=state.dispensed||!!result}
 if(screenTexture){const c=screenTexture.image.getContext('2d');c.fillStyle='#172b62';c.fillRect(0,0,256,128);c.fillStyle='#b9d5ff';c.font='bold 23px monospace';c.fillText(state.running?'RUN MODE':result?'DONE':'SELECT PROCESS',10,26);c.font='20px monospace';c.fillText('RPM '+Math.round(currentRPM),10,56);c.fillText('VAC '+(state.vacuum?'ON':'OFF'),10,84);c.fillText('AZ 1512',10,112);screenTexture.needsUpdate=true}
 }
 const clear=()=>{if(result)setResults(null)};
 function reset(keepJob=false){runCounter++;state={lid:false,loaded:false,vacuum:false,dispensed:false,running:false};currentRPM=0;if(!keepJob)write(EXAMPLE);setResults(null);$('progress').value=0;$('rpm').textContent='0 rpm';$('time').textContent='0.0 s';status('Ready. Open lid and load wafer, or run ready example.');sync()}
 function requireState(ok,msg){if(!ok)throw Error(msg)}
 function action(f){try{f();sync()}catch(e){status(e.message)}}
 $('lid').onclick=()=>action(()=>{requireState(!state.running,'Lid locked while spinning.');state.lid=!state.lid;status(state.lid?'Lid open.':'Lid closed; interlock ready.')});
 $('load').onclick=()=>action(()=>{requireState(state.lid&&!state.loaded,'Open lid and unload previous wafer first.');validate(job());clear();state.loaded=true;status('Wafer placed on chuck. Check centering and engage vacuum.')});
 $('vacuum').onclick=()=>action(()=>{requireState(state.loaded,'Load wafer before engaging vacuum.');requireState($('utility').checked,'Vacuum/purge unavailable.');requireState(!state.dispensed||!state.vacuum,'Unload a dispensed wafer only after recipe or abort.');state.vacuum=!state.vacuum;status(state.vacuum?'Vacuum seal engaged.':'Vacuum released.')});
 $('dispense').onclick=()=>action(()=>{requireState(state.loaded&&state.vacuum&&$('utility').checked,'Load and secure wafer before dispensing.');requireState(!state.dispensed,'Resist already dispensed.');validate(job());clear();state.dispensed=true;status('Virtual resist dispensed. Close lid before starting.')});
 function start(){requireState(state.loaded&&state.vacuum&&state.dispensed&&!state.lid&&$('utility').checked,'Interlock: wafer, vacuum, resist, closed lid and purge required.');jobAtRun=job();const calculated=simulate(jobAtRun);setResults(null);state.running=true;const token=++runCounter;started=performance.now();runDuration=calculated.history.total_s*1000/14;status('Running spread, ramp and coating steps at 14× virtual time.');sync();
 function step(now){if(token!==runCounter||!state.running)return;const p=Math.min(1,(now-started)/runDuration),t=p*calculated.history.total_s,segment=calculated.history.steps.find(s=>t<=s.end_s+1e-9)||calculated.history.steps.at(-1);const f=segment.end_s===segment.start_s?1:Math.max(0,Math.min(1,(t-segment.start_s)/(segment.end_s-segment.start_s)));currentRPM=segment.start_rpm+f*(segment.end_rpm-segment.start_rpm);$('progress').value=p;$('time').textContent=t.toFixed(1)+' s';$('rpm').textContent=Math.round(currentRPM)+' rpm';if(p<1){requestAnimationFrame(step);return}state.running=false;currentRPM=0;setResults(calculated);$('rpm').textContent='0 rpm';status('Done. Inspect thickness map, export revision, or open lid and unload.');sync()}requestAnimationFrame(step);
 }
 $('start').onclick=()=>action(start);$('example').onclick=()=>action(()=>{reset(true);validate(job());requireState($('utility').checked,'Connect simulated vacuum and purge.');Object.assign(state,{loaded:true,vacuum:true,dispensed:true,lid:false});start()});
 $('stop').onclick=()=>action(()=>{runCounter++;state.running=false;currentRPM=0;state.dispensed=false;state.vacuum=false;$('rpm').textContent='0 rpm';setResults(null);status('Aborted; no committed resist revision. Open lid and unload.')});
 $('unload').onclick=()=>action(()=>{requireState(state.lid&&state.loaded,'Open lid with a loaded wafer first.');requireState(!state.running,'Recipe running.');state.loaded=state.vacuum=state.dispensed=false;status('Wafer unloaded. Existing result remains available for export.')});
 $('reset').onclick=()=>reset();
 for(const k of keys)$(k).addEventListener('input',()=>{if(state.loaded){state.loaded=state.vacuum=state.dispensed=false;status('Recipe edited; specimen removed. Reload before running.')}clear();sync()});
 $('utility').onchange=()=>{if(!$('utility').checked){state.vacuum=false;state.dispensed=false;clear();status('Vacuum/purge unavailable. Recipe interlocked.')}sync()};
 $('import').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>1000000)throw Error('Job file too large');const j=JSON.parse(await f.text());validate(j);reset();write(j);sync();status('Imported job '+j.sampleId+'; ready to load.')}catch(e){status('Import rejected: '+e.message)}finally{$('import').value=''}};
 function download(data,name,mime){const blob=data instanceof Blob?data:new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('json').onclick=()=>{if(result)download(JSON.stringify(result,null,2),'resist-layer.json','application/json')};
 $('csv').onclick=()=>{if(!result)return;const g=result.grid,rows=['x_mm,z_mm,thickness_um'];g.values.forEach((v,i)=>{if(v!==null)rows.push([g.origin_mm[0]+i%g.nx*g.pitch_mm,g.origin_mm[1]+Math.floor(i/g.nx)*g.pitch_mm,v].join(','))});download(rows.join('\n'),'resist-map.csv','text/csv')};
 function probe(e){if(!result)return;const rect=$('map').getBoundingClientRect(),g=result.grid,x=Math.floor((e.clientX-rect.left)/rect.width*g.nx),z=Math.floor((e.clientY-rect.top)/rect.height*g.nz);if(x<0||z<0||x>=g.nx||z>=g.nz)return;const v=g.values[z*g.nx+x];$('probe').textContent=v===null?'Outside wafer':'X '+(g.origin_mm[0]+x*g.pitch_mm).toFixed(2)+' mm · Z '+(g.origin_mm[1]+z*g.pitch_mm).toFixed(2)+' mm · '+v.toFixed(3)+' µm'}
 $('map').addEventListener('pointermove',probe);$('map').addEventListener('pointerdown',probe);reset();
 try{
 const host=$('view');scene=new THREE.Scene();scene.background=new THREE.Color('#e2ded2');camera=new THREE.PerspectiveCamera(39,host.clientWidth/host.clientHeight,.005,10);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.replaceChildren(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x7b776b,2.7));const light=new THREE.DirectionalLight(0xfff4df,3.5);light.position.set(.6,1,.8);scene.add(light);const fill=new THREE.DirectionalLight(0xd8e8ff,1.4);fill.position.set(-.6,.4,-.6);scene.add(fill);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial({color:0xcac5b8,roughness:.85}));ground.rotation.x=-Math.PI/2;ground.position.y=-.006;scene.add(ground);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.18;controls.maxDistance=2.4;
 const views={whole:[[.65,.52,.78],[.05,.15,-.01]],front:[[.05,.19,.86],[.05,.15,0]],side:[[.83,.25,0],[.03,.15,0]],rear:[[.05,.24,-.85],[.04,.15,0]],bowl:[[.05,.65,.40],[0,.244,0]],controller:[[.34,.34,.48],[.182,.104,.055]]};
 function view(name){const v=views[name]||views.whole;camera.position.set(...v[0]);controls.target.set(...v[1]);controls.update()}
 document.querySelectorAll('[data-spin-view]').forEach(b=>b.onclick=()=>view(b.dataset.spinView));view('whole');
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}}).observe(host);
 const gltf=await new GLTFLoader().loadAsync(base+'laurell.gltf');model=gltf.scene;scene.add(model);
 for(const name of ['lid_pivot','rotor','wafer','resist_film_visual','manual_dispense_pipette','lcd_screen'])if(!model.getObjectByName(name))throw Error('Missing component '+name);
 lid=model.getObjectByName('lid_pivot');rotor=model.getObjectByName('rotor');wafer=model.getObjectByName('wafer');film=model.getObjectByName('resist_film_visual');pipette=model.getObjectByName('manual_dispense_pipette');screen=model.getObjectByName('lcd_screen');
 // Display texture on the front of the LCD without replacing the native mesh.
 const lcdCanvas=document.createElement('canvas');lcdCanvas.width=256;lcdCanvas.height=128;screenTexture=new THREE.CanvasTexture(lcdCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
 const lcdPlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:screenTexture}));lcdPlane.position.z=.51;lcdPlane.name='live_lcd_readout';screen.add(lcdPlane);
 $('model-status').textContent='3D geometry loaded · '+model.getObjectByName('laurell_23NPPB_mm').children.length+' top-level assemblies · metric glTF';
 $('glb').disabled=false;$('glb').onclick=async()=>{try{const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:false});download(new Blob([data],{type:'model/gltf-binary'}),'laurell-02-07.glb','model/gltf-binary')}catch(e){status('GLB export failed: '+e.message)}};
 sync();let last=performance.now(),lastSync=0;
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;lid.rotation.x+=( (state.lid?-75*Math.PI/180:0)-lid.rotation.x)*Math.min(1,dt*12);
 rotor.rotation.y+=Math.min(10,currentRPM*2*Math.PI/60*.025)*dt;
 const dest=state.dispensed&&!state.running&&state.lid?[0,278,0]:[107,243,-72];pipette.position.lerp(new THREE.Vector3(...dest),Math.min(1,dt*5));
 if(now-lastSync>150){sync();lastSync=now}controls.update();renderer.render(scene,camera);requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
 }catch(e){$('model-status').textContent='3D unavailable: '+e.message+'; numerical controls remain available.';$('glb').disabled=true;console.error(e)}
}
