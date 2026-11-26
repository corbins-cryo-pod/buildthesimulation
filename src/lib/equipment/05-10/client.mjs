import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const dir='/equipment/05-10/',module=new URL(dir+'solver.mjs',location.origin).href;
const {initial,dispatch,focusResponse,windows,stokesNm,mapCsv,LAMBDA}=await import(/* @vite-ignore */ module);
const app=document.querySelector('#labram'),$=k=>app.querySelector('#raman-'+k),f=(x,n=5)=>Number(x.toFixed(n)).toString();
let state=initial(),out=null,choice=0,refresh=()=>{};
function note(txt,bad=false){$('status').textContent=txt;$('status').dataset.error=String(bad);}
function act(a,value){
 const q=dispatch(state,a,value);if(!q.ok){if(a==='map')out=null;note(q.message,true);return sync();}
 state=q.state;out=q.result??null;choice=0;
 if(out)note('Acquired '+out.points.length+' spatially indexed spectra.');
 else if(a==='door')note(state.door?'Visor raised; virtual optical path disabled.':'Visor closed. Enable the optical path before acquisition.');
 else if(a==='calibrate')note('Fitted the virtual silicon witness and applied a shift correction.');
 else note('Setting applied.');
 sync();
}
for(const k of ['power','door','arm','load','objective','zero-focus','reset','calibrate','clear-axis','map'])$(k).onclick=()=>act(k);
for(const k of ['defocus','lsf','exposure'])$(k).onchange=e=>act('settings',{[k]:e.target.valueAsNumber});
$('file').onchange=async e=>{
 const a=e.target.files[0];if(!a)return;
 try{if(a.size>20000)throw Error('Use a tile JSON file below 20 kB.');act('import',JSON.parse(await a.text()));}catch(err){note('Import: '+err.message,true);}
 e.target.value='';
};
function exportData(json){if(!out)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([json?JSON.stringify(out):mapCsv(out)],{type:json?'application/json':'text/csv'}));a.href=u;a.download='labram-'+out.mapRevision+(json?'.json':'.csv');a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>exportData(true);$('csv').onclick=()=>exportData(false);
function spectrum(row){
 const canvas=$('spectrum'),g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=67,q=52,r=w-29,b=h-60;
 g.fillStyle='#102d3d';g.fillRect(0,0,w,h);g.font='bold 22px sans-serif';g.fillStyle='#b9e8ea';g.fillText(row?'Tile '+row.col+','+row.row+' / '+(row.assigned==='S'?'Silicon':'Polystyrene'):'RAMAN SHIFT / NO MAP',15,30);
 const X=x=>p+(x-480)/590*(r-p),series=row?out.signalTable[row.sourceKey]:null;
 const yM=series?Math.max(...series)*1.1:1,Y=y=>b-y/yM*(b-q);
 g.strokeStyle='#4d6877';g.lineWidth=1;g.font='16px sans-serif';g.fillStyle='#adc9d4';
 for(const x of [500,600,700,800,900,1000]){g.beginPath();g.moveTo(X(x),q);g.lineTo(X(x),b);g.stroke();g.fillText(x,X(x)-15,b+24);}
 for(let i=0;i<=4;i++){const y=yM*i/4;g.beginPath();g.moveTo(p,Y(y));g.lineTo(r,Y(y));g.stroke();g.fillText(f(y,3),9,Y(y)+5);}
 g.fillText('Raman shift (cm⁻¹), vacuum excitation '+LAMBDA+' nm',p,b+50);
 if(!row)return;
 for(const [k,a] of Object.entries(windows)){g.fillStyle=k==='S'?'#4eb6a762':'#e3af5162';g.fillRect(X(a[0]),q,X(a[1])-X(a[0]),b-q);}
 g.strokeStyle='#aaffec';g.lineWidth=2;g.beginPath();
 for(const [i,e] of series.entries()){const x=X(out.shiftCm[i]),y=Y(e);i?g.lineTo(x,y):g.moveTo(x,y);}
 g.stroke();
}
function redraw(){
 const point=out?.points[choice];spectrum(point);
 const fit=point?.fit[point.assigned];
 $('tile').textContent=point? 'Column '+point.col+', row '+point.row+' · ('+point.xUm+', '+point.yUm+') µm · '+(point.assigned==='S'?'silicon':'polystyrene')+' · peak '+f(fit.centerCm,3)+' cm⁻¹ · FWHM '+(fit.fwhmCm?f(fit.fwhmCm,3)+' cm⁻¹':'not resolved') : 'Acquire a map, then select a tile to inspect its spectrum.';
 $('areas').textContent=point?'Silicon area '+f(point.fit.S.area)+' · polystyrene area '+f(point.fit.P.area)+' (relative count × cm⁻¹) · fitted Stokes wavelength '+f(stokesNm(LAMBDA,fit.centerCm),4)+' nm.':'';
 buildMap('S');buildMap('P');refresh(point);
}
function buildMap(key){
 const dest=$(key==='S'?'si':'ps');dest.replaceChildren();
 if(!out){dest.textContent='No map';return;}
 dest.style.gridTemplateColumns='repeat('+out.input.columns+',minmax(34px,1fr))';const color=key==='S'?'#55d4c1':'#eab861',max=Math.max(...out.points.map(p=>p.fit[key].area),1e-12);
 // Render all physical y rows from highest to lowest; data/export remain row-major from y=0.
 for(let row=out.input.rows-1;row>=0;row--)for(let col=0;col<out.input.columns;col++){
  const q=out.points[row*out.input.columns+col],b=document.createElement('button');
  const active=q.fit[key].area/max;
  b.type='button';b.textContent=q.assigned===key?key:'·';
  b.dataset.row=String(row);b.dataset.col=String(col);b.setAttribute('aria-pressed',String(q.index===choice));b.setAttribute('aria-label','Column '+col+', row '+row+'; integrated area '+f(q.fit[key].area));
  b.style.background='color-mix(in srgb,'+color+' '+String(12+88*active)+'%,#173340)';b.style.color=active>.4?'#0b2826':'#f5ebe0';
  b.onclick=()=>{choice=q.index;redraw();$(key==='S'?'si':'ps').querySelector('[data-row="'+row+'"][data-col="'+col+'"]')?.focus();};
  dest.append(b);
 }
}
function sync(){
 for(const k of ['defocus','lsf','exposure'])$(k).value=state[k];
 $('door').textContent=state.door?'Close sample visor':'Open sample visor';$('door').setAttribute('aria-pressed',String(state.door));
 $('power').textContent=state.power?'Standby':'Power on';$('arm').textContent=state.armed?'Disable optical path':'Enable optical path';$('load').textContent=state.loaded?'Unload coupon':'Load last coupon';
 $('objective').textContent='Objective '+state.mag+'× · rotate turret';
 $('sample').textContent=state.loaded?state.fixture.sampleId+' · revision '+state.fixture.revision+' · '+state.fixture.columns+'×'+state.fixture.rows+' tiles':'Specimen not loaded';
 $('axis').textContent=state.cal?'Virtual silicon witness raw '+f(state.cal.rawPeakCm,3)+' cm⁻¹; correction −'+f(state.cal.correctionCm,3)+' cm⁻¹.':'Axis unreferenced.';
 $('optics').textContent='Modeled confocal relative intensity '+f(focusResponse(state.defocus,state.mag).eta,3)+'; Airy radius '+f(focusResponse(0,state.mag).AiryRadiusUm,3)+' µm.';
 $('json').disabled=$('csv').disabled=!out;
 redraw();
}
async function viewer(){
 const host=$('viewer'),sc=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.009,12),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 sc.background=new T.Color('#293b46');r.outputColorSpace=T.SRGBColorSpace;r.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Orbitable metric LabRAM HR Evolution; same physical actions available by form buttons.');
 const orbit=new OrbitControls(camera,r.domElement),draw=()=>r.render(sc,camera);orbit.addEventListener('change',draw);orbit.minDistance=.15;orbit.maxDistance=4;
 sc.add(new T.HemisphereLight(0xffffff,0x788793,2.1));for(const [p,e] of [[[.81,.91,1.3],2.1],[[-.84,.93,-.81],1.4]]){const l=new T.DirectionalLight(0xffffff,e);l.position.fromArray(p);sc.add(l);}
 const gr=new T.GridHelper(2.4,30,0x678e98,0x526371);gr.position.y=-.002;sc.add(gr);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(dir+'labram-hr-evolution.glb'),fetch(dir+'interaction.json').then(x=>x.json())]);sc.add(g.scene);
 const get=k=>{const matches=[];g.scene.traverse(x=>{if(x.name===k)matches.push(x);});if(matches.length!==1)throw Error('missing '+k);return matches[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const stage=get(m.anchors.stage),sample=get(m.anchors.sample),turret=get(m.anchors.turret),door=get(m.anchors.cover),led=get('ready_lamp'),home=stage.position.clone();
 led.material=led.material.clone();
 const targets=m.controls.map(a=>{const b=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));b.userData.row=a;sc.add(b);return {node:get(a.node),proxy:b};});
 const ray=new T.Raycaster(),p=new T.Vector2();let down=null;
 function hit(e){if(camera.position.z<0)return null;const b=r.domElement.getBoundingClientRect();p.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(p,camera);return ray.intersectObjects(targets.map(t=>t.proxy))[0]?.object.userData.row;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=hit(e);if(a)act(a.action);}down=null;};
 r.domElement.onpointermove=e=>{const a=hit(e);r.domElement.title=a?.label??'Orbit the instrument';r.domElement.style.cursor=a?'pointer':'grab';};
 refresh=point=>{
  door.rotation.x=state.door?m.coverRotationDeg*Math.PI/180:0;turret.rotation.y=state.mag===50?0:2*Math.PI/3;sample.visible=state.loaded;
  stage.position.copy(home);
  if(point){stage.position.x-=(point.xUm-state.fixture.columns*state.fixture.pitchUm/2)*1e-6;stage.position.z+=(point.yUm-state.fixture.rows*state.fixture.pitchUm/2)*1e-6;}
  stage.position.y-=state.defocus*1e-6;
  led.material.color.set(state.armed?'#7cf7a8':'#415a4c');led.material.emissive.set(state.armed?'#285038':'#000000');
  sc.updateMatrixWorld(true);for(const {node,proxy} of targets){node.getWorldPosition(proxy.position);if(proxy.userData.row.offsetM)proxy.position.add(new T.Vector3(...proxy.userData.row.offsetM));proxy.updateMatrixWorld(true);}
  draw();
 };
 const poses={orbit:[[.89,.67,1.51],[0,.22,.01]],front:[[0,.38,1.42],[0,.22,.20]],sample:[[-.59,.36,.76],[-.35,.225,.27]],rear:[[.42,.70,-1.61],[.0,.22,-.17]]};
 function pose(k){camera.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 app.querySelectorAll('[data-raman-view]').forEach(x=>x.onclick=()=>pose(x.dataset.ramanView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}).observe(host);
 pose('orbit');redraw();$('model').textContent='Metric GLB loaded · virtual visor, turret and XY stage';$('model').dataset.loaded='true';
}
sync();act('map');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'; the numerical bench remains usable.';$('viewer').style.display='none';});
