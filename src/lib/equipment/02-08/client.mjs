import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const asset='/equipment/02-08/', $=k=>document.getElementById('cee-'+k);
async function main(){
 const {DEFAULT,simulate}=await import(/* @vite-ignore */ (asset+'solver.mjs'));
 const fields=$('fields').elements,field=k=>fields.namedItem(k),keys=['sampleId','revision','diameterMm','rpm','referenceUm','exponent','edgeFraction','tauS','tempA','timeA','tempB','timeB'];
 const num=k=>field(k).value.trim()===''?NaN:Number(field(k).value);
 const read=()=>({sampleId:field('sampleId').value,revision:num('revision'),diameterMm:num('diameterMm'),rpm:num('rpm'),referenceUm:num('referenceUm'),exponent:num('exponent'),edgeFraction:num('edgeFraction'),tauS:num('tauS'),bakeA:{plateC:num('tempA'),seconds:num('timeA')},bakeB:{plateC:num('tempB'),seconds:num('timeB')}});
 function defaults(){const v={...DEFAULT,tempA:DEFAULT.bakeA.plateC,timeA:DEFAULT.bakeA.seconds,tempB:DEFAULT.bakeB.plateC,timeB:DEFAULT.bakeB.seconds};for(const k of keys)field(k).value=String(v[k]);}
 let loaded=true,vacuum=true,spinOpen=false,bakeOpen=false,busy=false,result=null,phase='ready',root=null,renderer=null,scene=null,camera=null,controls=null,spinAngle=0,transfer=0;
 const node=n=>root?.getObjectByName(n);
 function status(msg,fail=false){$('status').textContent=msg;$('status').dataset.fail=String(fail)}
 function sync(){
   $('spin-lid').textContent=spinOpen?'Close spin lid':'Open spin lid';$('bake-lid').textContent=bakeOpen?'Close bake lid':'Open bake lid';$('load').textContent=loaded?'Unload pair':'Load pair';$('vacuum').textContent=vacuum?'Release vacuum':'Engage vacuum';
   for(const k of ['spin-lid','bake-lid','load','vacuum','run','example'])$(k).disabled=busy;
   $('vacuum').disabled=busy||!loaded;$('load').disabled=busy||!spinOpen;
   for(const k of ['json','csv','mapcsv'])$(k).disabled=busy||!result;
   for(const k of keys)field(k).disabled=busy;
   $('machine').textContent=(busy?phase.toUpperCase():result?'PAIR COMPLETE':'READY')+' · '+(loaded?'pair loaded':'empty')+' · '+(vacuum&&(!busy||phase.startsWith('spin'))?'vacuum engaged':'vacuum released')+' · spin lid '+(spinOpen?'open':'closed')+' · bake lid '+(bakeOpen?'open':'closed');
   if(!root)return;node('spin_lid').rotation.x=spinOpen?-1.31:0;node('bake_lid').rotation.x=bakeOpen?-1.31:0;node('spin_chuck').rotation.y=spinAngle;
   const d=num('diameterMm')/1000;for(const n of ['spin_wafer','bake_wafer']){const w=node(n);w.scale.x=d;w.scale.z=d;}
   node('spin_wafer').visible=loaded&&(phase==='ready'||phase.startsWith('spin'));node('spin_wafer_mark').visible=node('spin_wafer').visible;node('spin_wafer_mark').position.x=d*.35;const bw=node('bake_wafer');bw.visible=loaded&&(phase.startsWith('bake')||phase==='transfer');if(phase==='transfer'){bw.position.set(.176-.346*transfer,.264+(.2888625-.264)*transfer+.085*Math.sin(Math.PI*transfer),-.048+.013*transfer)}else bw.position.set(-.17,.2888625,-.035);
 }
 function baseplot(id){const c=$(id),ctx=c.getContext('2d');ctx.fillStyle='#22313a';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#ece7d9';ctx.font='14px Arial';return [c,ctx];}
 function blank(id,msg){const [c,x]=baseplot(id);x.textAlign='center';x.fillText(msg,c.width/2,c.height/2)}
 function draw(){
   if(!result){blank('map','Run paired experiment');blank('trace','Run paired experiment');$('result').textContent='No current result.';return}
   const A=result.specimenA,B=result.specimenB,g=A.coating.preBakeMap,valid=g.values.filter(v=>v!==null),lo=Math.min(...valid),hi=Math.max(...valid);
   let [c,x]=baseplot('map');const s=6.5,left=(c.width-g.n*s)/2,top=25;
   for(let j=0;j<g.n;j++)for(let i=0;i<g.n;i++){let v=g.values[j*g.n+i];if(v===null)continue;let f=(v-lo)/(hi-lo||1);x.fillStyle='rgb('+Math.round(45+187*f)+','+Math.round(100+82*f)+','+Math.round(144-91*f)+')';x.fillRect(left+i*s,top+(g.n-1-j)*s,s+.2,s+.2)}
   x.textAlign='center';x.fillStyle='#ece7d9';x.fillText('A = B   |   '+lo.toFixed(3)+'–'+hi.toFixed(3)+' µm   |   Ø '+result.input.diameterMm+' mm',c.width/2,321);
   [c,x]=baseplot('trace');const X=55,Y=18,W=c.width-75,H=c.height-70,maxT=Math.max(A.bake.schedule.plateC,B.bake.schedule.plateC,30)*1.08,maxS=Math.max(A.bake.schedule.seconds,B.bake.schedule.seconds);const px=t=>X+W*t/maxS,py=t=>Y+H*(1-t/maxT);
   x.strokeStyle='#64747c';x.fillStyle='#ece7d9';x.font='12px Arial';x.textAlign='right';for(let i=0;i<=5;i++){let v=maxT*i/5,y=py(v);x.beginPath();x.moveTo(X,y);x.lineTo(X+W,y);x.stroke();x.fillText(v.toFixed(0),X-7,y+4)}x.textAlign='center';for(let i=0;i<=5;i++)x.fillText((maxS*i/5).toFixed(0),px(maxS*i/5),Y+H+18);x.fillText('Contact time (s)',X+W/2,c.height-8);x.textAlign='left';x.fillText('°C',9,13);
   for(const [r,color,label] of [[A,'#edbc64','A'],[B,'#74c8db','B']]){x.strokeStyle=color;x.fillStyle=color;x.lineWidth=1;x.setLineDash([5,4]);x.beginPath();x.moveTo(px(0),py(r.bake.schedule.plateC));x.lineTo(px(r.bake.schedule.seconds),py(r.bake.schedule.plateC));x.stroke();x.setLineDash([]);x.lineWidth=2.5;x.beginPath();r.bake.temperatureHistory.forEach((t,i)=>{if(i===0)x.moveTo(px(t.timeS),py(t.waferC));else x.lineTo(px(t.timeS),py(t.waferC))});x.stroke();x.fillText(label,px(r.bake.schedule.seconds)-13,py(r.bake.finalWaferC)-7);}
   $('result').textContent=A.sampleId+' / '+B.sampleId+' · revision '+A.parentRevision+' → '+A.revision+' · Pre-bake reference '+A.coating.centerUm.toFixed(4)+' µm; mean '+A.coating.meanUm.toFixed(4)+' µm · A '+A.bake.finalWaferC.toFixed(3)+' °C at '+A.bake.schedule.seconds+' s · B '+B.bake.finalWaferC.toFixed(3)+' °C at '+B.bake.schedule.seconds+' s · pre-bake maps identical; post-bake film thickness unknown.';
 }
 function clear(msg){result=null;phase='ready';$('progress').value=0;draw();if(msg)status(msg);sync();}
 defaults();draw();sync();
 $('spin-lid').onclick=()=>{spinOpen=!spinOpen;if(spinOpen)vacuum=false;sync()};$('bake-lid').onclick=()=>{bakeOpen=!bakeOpen;sync()};
 $('load').onclick=()=>{loaded=!loaded;vacuum=false;clear(loaded?'Pair loaded. Close spin lid and engage vacuum.':'Pair unloaded.')};$('vacuum').onclick=()=>{if(spinOpen){status('Close spin lid before engaging vacuum.',true);return}vacuum=!vacuum;sync()};
 $('fields').addEventListener('input',e=>{if(['sampleId','revision','diameterMm'].includes(e.target.name)){loaded=false;vacuum=false;}clear('Inputs changed. Run again to generate a current result.');});
 const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function run(){if(busy)return;if(!loaded||!vacuum||spinOpen||bakeOpen){status('Interlock: load pair, close both lids and engage vacuum.',true);return;}let next;try{next=simulate(read())}catch(e){clear(e.message);status(e.message,true);return;}result=null;draw();busy=true;try{
 for(const [index,spec] of [next.specimenA,next.specimenB].entries()){phase='spin '+(index?'B':'A');status('Spinning specimen '+(index?'B':'A')+' at '+next.input.rpm+' rpm (compressed animation).');sync();for(let i=0;i<20;i++){spinAngle+=next.input.rpm/4000*.65;$('progress').value=(index*40+i)/80;sync();await nap(42)}
 phase='transfer';spinOpen=true;bakeOpen=true;transfer=0;status('Manual transfer represented between modules.');sync();for(let j=1;j<=12;j++){transfer=j/12;sync();await nap(30)}spinOpen=false;bakeOpen=false;phase='bake '+(index?'B':'A');status('Contact bake '+(index?'B':'A')+' at '+spec.bake.schedule.plateC+' °C.');sync();for(let i=0;i<20;i++){$('progress').value=(index*40+20+i)/80;await nap(42)}}
 result=next;phase='complete';$('progress').value=1;status('Complete: paired coating maps identical; separate thermal histories generated.');draw();
 }finally{busy=false;sync()}}
 $('run').onclick=run;$('example').onclick=()=>{if(busy)return;defaults();loaded=true;vacuum=true;spinOpen=bakeOpen=false;clear();run()};
 const csvCell=v=>'"'+String(v).replaceAll('"','""')+'"';
 function download(name,body,type){const u=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
 $('json').onclick=()=>result&&download('cee-paired-resist.json',JSON.stringify(result,null,2),'application/json');
 $('csv').onclick=()=>{if(!result)return;const lines=['sample_id,revision,time_s,plate_c,wafer_c'];for(const s of [result.specimenA,result.specimenB])for(const t of s.bake.temperatureHistory)lines.push([csvCell(s.sampleId),s.revision,t.timeS,t.plateC,t.waferC].join(','));download('cee-bake-traces.csv',lines.join('\n'),'text/csv')};
 $('mapcsv').onclick=()=>{if(!result)return;const a=result.specimenA,g=a.coating.preBakeMap,rows=['sample_a,sample_b,revision,x_mm,y_mm,pre_bake_um'];g.values.forEach((v,i)=>{if(v!==null)rows.push([csvCell(a.sampleId),csvCell(result.specimenB.sampleId),a.revision,g.originMm[0]+(i%g.n)*g.pitchMm,g.originMm[1]+Math.floor(i/g.n)*g.pitchMm,v].join(','))});download('cee-prebake-map.csv',rows.join('\n'),'text/csv')};
 const poses={reset:[[.79,.64,.91],[0,.15,0]],front:[[.65,.50,.95],[0,.15,0]],spin:[[.49,.78,.45],[.176,.32,-.048]],bake:[[-.64,.87,.50],[-.17,.35,-.035]],rear:[[-.62,.49,-.93],[0,.14,0]]};
 function view(k,open=false){if(!camera)return;const [p,t]=poses[k]||poses.reset;camera.position.set(...p);controls.target.set(...t);controls.update();if(open&&!busy){if(k==='spin'){spinOpen=true;vacuum=false;}if(k==='bake')bakeOpen=true;sync();}}
 for(const btn of document.querySelectorAll('[data-cee-view]'))btn.onclick=()=>view(btn.dataset.ceeView,true);
 try{
 renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor(0x29343b);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 scene=new THREE.Scene();const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();
 camera=new THREE.PerspectiveCamera(40,1,.01,20);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.20;controls.maxDistance=2.8;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0xf5f1e6,0x45505c,2));const light=new THREE.DirectionalLight(0xffffff,2.1);light.position.set(.2,1.4,.8);scene.add(light);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.MeshStandardMaterial({color:0x455058,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.y=-.0005;scene.add(ground);
 const gltf=await new GLTFLoader().loadAsync(asset+'cee-200cbx.glb');root=gltf.scene;scene.add(root);
 for(const n of ['spin_lid','bake_lid','spin_chuck','spin_wafer','bake_wafer','spin_wafer_mark'])if(!node(n))throw Error('Missing named part '+n);
 function resize(){const rect=$('canvas').parentElement.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 // Render matching original views from the same actual model, without changing experimental state.
 const save=[spinOpen,bakeOpen,vacuum,loaded];renderer.setPixelRatio(1);renderer.setSize(480,300,false);camera.aspect=480/300;camera.updateProjectionMatrix();for(const k of ['front','spin','bake','rear']){spinOpen=k==='spin';bakeOpen=k==='bake';loaded=false;sync();view(k);renderer.render(scene,camera);$('ref-'+k).src=renderer.domElement.toDataURL('image/png');}
 [spinOpen,bakeOpen,vacuum,loaded]=save;renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));resize();new ResizeObserver(resize).observe($('canvas').parentElement);view('reset');sync();$('model-status').textContent='3D asset loaded · scaled GLB · orbit, zoom and named moving parts.';
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
 }catch(e){$('model-status').textContent='3D viewer unavailable: '+e.message+'; numerical experiment remains available.';}
}
main().catch(e=>{$('status').textContent='Simulator initialization failed: '+e.message;});