import {PerspectiveCamera,WebGLRenderer,Scene,Group,HemisphereLight,DirectionalLight,Vector2,Vector3,Raycaster,Ray,BufferGeometry,LineBasicMaterial,Line,CanvasTexture,SRGBColorSpace,Mesh,PlaneGeometry,MeshBasicMaterial,DoubleSide} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {state,act,film,tips,sheetCSV,constants} from '../../../../public/equipment/05-06/resmap.mjs';
const base='/equipment/05-06/',el=x=>document.getElementById('rm-'+x),s=state();
const fmt=(n,d=6)=>Number(n).toPrecision(d);let syncView=()=>{},version=0,recipe='edge',lastMessage='';
function status(txt,error=false){lastMessage=txt;el('status').textContent=txt;el('status').classList.toggle('error',error)}
function plot(){
 const c=el('map'),g=c.getContext('2d'),r=s.result,bg='#183137',radius=(r?.diameterM??s.film?.diameterM??.1)/2;
 const X=x=>220+150*x/radius,Y=y=>205-150*y/radius;
 g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.fillStyle='#244c4c';g.strokeStyle='#b1b7ab';g.lineWidth=2;g.beginPath();g.arc(220,205,150,0,2*Math.PI);g.fill();g.stroke();
 g.strokeStyle='#7b9691';g.beginPath();g.moveTo(65,205);g.lineTo(375,205);g.moveTo(220,50);g.lineTo(220,360);g.stroke();
 g.fillStyle='#f4ebd6';g.font='bold 16px sans-serif';g.fillText('+y / away',236,50);g.fillText('+x',381,210);g.fillText('Round film · Ø '+Math.round(radius*2000)+' mm',67,391);
 const selected=r?.rows[s.row],pts=selected?.tips??tips(s.site,s.angleRad);
 if(r)r.rows.forEach(({site},i)=>{g.beginPath();g.arc(X(site.xM),Y(site.yM),i===s.row?8:5,0,2*Math.PI);g.fillStyle=i===s.row?'#fff4d7':'#73d8d0';g.fill()})
 pts.forEach((p,i)=>{g.fillStyle=i===0||i===3?'#ffc477':'#9bdbef';g.beginPath();g.arc(X(p.xM),Y(p.yM),3,0,2*Math.PI);g.fill()});
 g.font='15px sans-serif';g.fillStyle='#f4ebd6';g.fillText('Contact detail',410,73);g.fillText('1 mm pitch',410,95);
 const angle=selected?.angleRad??s.angleRad;g.strokeStyle='#95aaa5';g.beginPath();g.moveTo(475-Math.cos(angle)*56,175+Math.sin(angle)*56);g.lineTo(475+Math.cos(angle)*56,175-Math.sin(angle)*56);g.stroke();
 for(let i=0;i<4;i++){const px=475+Math.cos(angle)*(i-1.5)*30,py=175-Math.sin(angle)*(i-1.5)*30;g.fillStyle=i===0||i===3?'#ffc477':'#9bdbef';g.beginPath();g.arc(px,py,6,0,2*Math.PI);g.fill();g.fillText('P'+(i+1),px-8,py+25)}
 g.fillStyle='#ffc477';g.fillText('P1/P4 · drive',410,274);g.fillStyle='#9bdbef';g.fillText('P2/P3 · sense',410,299);
}
function draw(){
 const r=s.result,x=r?.rows[s.row];plot();
 el('stats').textContent=x?[
  x.siteId+' at '+fmt(x.site.xM*1e3,4)+', '+fmt(x.site.yM*1e3,4)+' mm',
  'Sheet resistance '+fmt(x.sheetOhmSq)+' Ω/□',
  'Uncorrected '+fmt(x.apparentInfiniteOhmSq)+' Ω/□',
  'Geometry factor '+fmt(x.fOhmsPerOhm,8)+'  ·  multiplier '+fmt(x.edgeMultiplier),
  'Drive current '+fmt(x.currentA*1e3)+' mA',
  'Forward '+fmt(x.voltageV*1e3)+' mV',
  'Reverse '+(x.reversedVoltageV===null?'off':fmt(x.reversedVoltageV*1e3)+' mV'),
  x.estimatedOffsetV===null?'Offset not cancelled':'Estimated DC offset '+fmt(x.estimatedOffsetV*1e3)+' mV',
  r.rows.length+' site(s) · sample '+r.sampleId+' · rev '+r.revision
 ].join('\n'):'No current acquisition.';
 syncView();
}
function sync(poseFields=true){
 el('lid').textContent=s.lidOpen?'Close shield':'Open shield';el('head').textContent=s.headDown?'Retract probe':'Seat probe';
 el('lid').setAttribute('aria-pressed',s.lidOpen+'');el('head').setAttribute('aria-pressed',s.headDown+'');
 if(poseFields){el('x').value=Number((s.site.xM*1000).toFixed(5));el('y').value=Number((s.site.yM*1000).toFixed(5));el('angle').value=Number((s.angleRad*180/Math.PI).toFixed(5));}
 el('row').replaceChildren();for(const [i,row] of (s.result?.rows??[]).entries())el('row').add(new Option(row.siteId+' · '+fmt(row.sheetOhmSq)+' Ω/□',String(i)));
 el('row').value=String(s.row);el('row').disabled=el('json').disabled=el('csv').disabled=!s.result;draw();
}
function step(cmd,value){
 if(cmd==='load'&&value===undefined)value=film();
 try{act(s,cmd,value);status(s.result?'Acquired '+s.result.rows.length+' site(s); '+s.result.provenance.kind+'.':cmd==='load'?(s.film?'Specimen loaded: '+s.film.sampleId+'.':'Wafer unloaded.'):'Fixture updated. Acquire using the new settings.')}catch(e){status(e.message,true)}
 sync(!['currentA','offsetV','reversePair','boundary'].includes(cmd));
}
function demo(){
 try{
  if(s.headDown)act(s,'head');if(!s.lidOpen)act(s,'lid');act(s,'load',film());act(s,'angle',0);
  for(const [k,v] of [['currentA',.001],['offsetV',.0005],['boundary','disk'],['reversePair',true]])act(s,k,v);
  el('boundary').value='disk';el('current').value='1';el('offset').value='.5';el('reverse').checked=true;el('diameter').value=100;el('rho').value=2;el('thickness').value=20;recipe='edge';el('recipe').value=recipe;
  act(s,'lid');act(s,'scan','edge');status('Reference acquired: 7 sites, constant 100 Ω/□ after correction. Select S07 to inspect the edge.');
 }catch(e){status(e.message,true)}sync();
}
for(const [name,key] of [['lid','lid'],['head','head'],['load','load'],['run','run']])el(name).onclick=()=>step(key);
el('unload').onclick=()=>step('load',null);el('scan').onclick=()=>step('scan',recipe);el('demo').onclick=demo;
el('recipe').onchange=e=>recipe=e.target.value;
el('apply').onclick=()=>step('load',{...film(),sampleId:'CUSTOM-ROUND',diameterM:el('diameter').valueAsNumber/1e3,filmThicknessM:el('thickness').valueAsNumber/1e9,resistivityOhmM:el('rho').valueAsNumber/1e6,provenance:{kind:'user-specified synthetic film'}});
el('current').oninput=e=>step('currentA',e.target.valueAsNumber/1e3);el('offset').oninput=e=>step('offsetV',e.target.valueAsNumber/1e3);
for(const k of ['x','y'])el(k).onchange=()=>step('move',{xM:el('x').valueAsNumber/1e3,yM:el('y').valueAsNumber/1e3});
el('angle').onchange=e=>step('angle',e.target.valueAsNumber*Math.PI/180);el('boundary').onchange=e=>step('boundary',e.target.value);el('reverse').onchange=e=>step('reversePair',e.target.checked);
el('row').onchange=e=>{s.row=+e.target.value;draw()};
el('import').onchange=async e=>{const stamp=++version;s.result=null;sync();try{const f=e.target.files[0];if(!f||f.size>200000)throw Error('Select a JSON specimen or measurement file below 200 KB.');const obj=JSON.parse(await f.text());if(stamp!==version)return;step(obj.schema==='bts.sheet-voltage-map.v1'?'infer':'load',obj)}catch(e){if(stamp===version)status(e.message,true)}};
function save(v,name,type){const u=URL.createObjectURL(new Blob([v],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500)}
el('json').onclick=()=>s.result&&save(JSON.stringify(s.result,null,2),'05-06-sheet-map.json','application/json');el('csv').onclick=()=>s.result&&save(sheetCSV(s.result),'05-06-sheet-map.csv','text/csv');
sync();
async function view(){
 const stage=el('stage'),renderer=new WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setClearColor(0xd3dcda);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');stage.append(renderer.domElement);
 const scene=new Scene(),root=new Group();scene.add(root);scene.add(new HemisphereLight(0xffffff,0x9baaa5,2.7));const lamp=new DirectionalLight(0xfffaef,2.75);lamp.position.set(.6,1,.6);scene.add(lamp);
 const camera=new PerspectiveCamera(36,1,.001,20),controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.005;controls.maxDistance=2.2;controls.maxPolarAngle=Math.PI*.93;
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(base+'resmap-178.glb'),fetch(base+'xr-manifest.json').then(r=>r.json())]);root.add(asset.scene);
 const n=name=>asset.scene.getObjectByName(name);
 const views={Overall:[[.60,.51,1.05],[0,.277,.02]],Chuck:[[.21,.59,.46],[0,.15,.047]],Head:[[.024,.177,.098],[0,.184,.029]],Tips:[[.008,.164,.041],[0,.163,.029]],Rear:[[.62,.41,-.92],[0,.15,-.09]],Station:[[.86,.65,1.25],[.22,.22,0]]};
 let active='Overall',xr=false,down=null;
 const display=document.createElement('canvas');display.width=1000;display.height=625;const tex=new CanvasTexture(display);tex.colorSpace=SRGBColorSpace;
 const screen=new Mesh(new PlaneGeometry(.324,.204),new MeshBasicMaterial({map:tex,side:DoubleSide}));screen.position.set(.425,.278,-.118);root.add(screen);
 function paint(){
  const g=display.getContext('2d');g.fillStyle='#173238';g.fillRect(0,0,1000,625);g.fillStyle='#f7f0d9';g.font='bold 53px sans-serif';g.fillText('RESMAP 178  /  SHEET MAP',31,77);
  g.font='40px sans-serif';g.fillText(s.lidOpen?'Shield open':s.headDown?'Probe engaged':'Probe retracted',32,150);
  const row=s.result?.rows[s.row];g.fillText(row?fmt(row.sheetOhmSq)+' ohm/sq   •   '+row.siteId:'No current reading',32,221);
  g.font='31px sans-serif';g.fillText(lastMessage.slice(0,60),32,298);g.fillText(lastMessage.slice(60,120),32,339);
  const buttons=[s.lidOpen?'Close shield':'Open shield',s.headDown?'Retract tips':'Seat tips','Acquire','Run demo'];
  for(const [i,b] of buttons.entries()){g.fillStyle='#42696c';g.fillRect(8+i*250,441,234,162);g.fillStyle='#fff';g.fillText(b,24+250*i,534)}tex.needsUpdate=true;
 }
 function draw(){if(!xr)renderer.render(scene,camera)}
 function goto(name){active=name;camera.position.set(...views[name][0]);controls.target.set(...views[name][1]);controls.update();syncView()}
 function articulation(){
  n('shield_hinge').rotation.x=s.lidOpen?-constants.lidTravelRad:0;
  const r=Math.hypot(s.site.xM,s.site.yM),alpha=r>1e-9?Math.PI/2-Math.atan2(s.site.yM,s.site.xM):0;
  n('stage_xz').position.z=.029+r;
  n('chuck_rotor').rotation.y=alpha;n('probe_yaw').rotation.y=alpha+s.angleRad;n('probe_lift').position.y=-.049+(s.headDown?0:constants.loadLiftM);
  const sample=n('film');sample.visible=Boolean(s.film);if(s.film){sample.scale.x=sample.scale.z=s.film.diameterM/.1}
  n('host').visible=screen.visible=active==='Station'||xr;paint();draw();
 }
 const cast=new Raycaster();
 function pick(ray){
  cast.ray.copy(ray);root.updateMatrixWorld(true);
  const candidates=Object.keys(m.interactionNodes).filter(k=>k!=='film'||s.lidOpen).map(n);
  if(xr)candidates.push(screen);
  for(const hit of cast.intersectObjects(candidates,true)){
   let target=hit.object;while(target&&target!==screen&&!m.interactionNodes[target.name])target=target.parent;
   if(target===screen){if(hit.uv?.y<.28){const k=Math.floor(hit.uv.x*4);if(k===3)demo();else step(['lid','head','run'][k]);}return}
   if(target&&target.visible){step(m.interactionNodes[target.name].action);return}
  }
 }
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;down=null;const box=stage.getBoundingClientRect();cast.setFromCamera(new Vector2((e.clientX-box.left)*2/box.width-1,1-(e.clientY-box.top)*2/box.height),camera);pick(cast.ray)});
 for(const b of document.querySelectorAll('[data-rm-view]'))b.onclick=()=>goto(b.dataset.rmView);
 controls.addEventListener('change',draw);new ResizeObserver(()=>{const {clientWidth:w,clientHeight:h}=stage;if(!w||!h||xr)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw()}).observe(stage);
 syncView=articulation;goto('Overall');
 if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false)){
  const b=el('vr');b.hidden=false;b.onclick=async()=>{try{
   const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
   xr=true;root.position.set(-.145,.85,-.82);controls.enabled=false;await renderer.xr.setSession(session);articulation();renderer.setAnimationLoop(()=>renderer.render(scene,camera));
   session.addEventListener('end',()=>{xr=false;root.position.set(0,0,0);controls.enabled=true;renderer.setAnimationLoop(null);goto(active)});
  }catch(e){el('view-status').textContent='VR session unavailable: '+e.message}};
  for(let i=0;i<2;i++){const c=renderer.xr.getController(i);scene.add(c);c.add(new Line(new BufferGeometry().setFromPoints([new Vector3(),new Vector3(0,0,-1.4)]),new LineBasicMaterial({color:0xffbf69})));c.addEventListener('select',()=>pick(new Ray(new Vector3().setFromMatrixPosition(c.matrixWorld),new Vector3(0,0,-1).transformDirection(c.matrixWorld))))}
 }
 el('view-status').textContent='3D asset loaded · 1:1 scale · '+m.geometry.triangles.toLocaleString()+' triangles · '+m.geometry.drawPrimitives+' draw primitives.';
}
view().catch(e=>{el('view-status').textContent='3D display unavailable. All calculations, controls and exports remain available.';console.warn('ResMap viewer: '+e.message)});
