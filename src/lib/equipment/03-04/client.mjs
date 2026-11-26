import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/03-04/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,fit}=await import(/* @vite-ignore */url);
const app=document.querySelector('#d635'),$=k=>app.querySelector('#ds-'+k),n=x=>Number(x.toFixed(3)).toString();
let s=initial(),render3d=()=>{};
function message(text,err=false){$('status').textContent=text;$('status').dataset.error=String(err);}
function act(a,v){const q=dispatch(s,a,v);s=q.state;message(q.message,!q.ok);sync();}
for(const a of ['cover','tray','place','inspect','reset','cutaway'])$(a).onclick=()=>act(a);
$('example').onclick=()=>{s=initial();for(const a of ['cover','tray','place','inspect']){const q=dispatch(s,a);if(!q.ok){message(q.message,true);return sync();}s=q.state;}message('Ready inert witness positioned; original stored maps displayed.');sync();};
for(const k of ['diameterMm','offsetMm'])$(k).onchange=e=>act('geometry',{[k]:e.currentTarget.valueAsNumber});
for(const k of ['ix','iz'])$(k).onchange=e=>act('index',{[k]:e.currentTarget.valueAsNumber});
$('file').onchange=async e=>{const f=e.currentTarget.files[0];if(!f)return;try{if(f.size>120000)throw Error('Use a read-only fixture below 120 kB.');act('import',JSON.parse(await f.text()));}catch(e){message('Import: '+e.message,true);}e.target.value='';};
$('export').onclick=()=>{if(!s.result)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(s.result,null,2)+'\n'],{type:'application/json'}));a.href=u;a.download=s.sample.sampleId+'-inspection.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),700);};
function sync(){
 const p=fit(s.sample.diameterMm,s.offsetMm);
 $('diameterMm').value=s.sample.diameterMm;$('offsetMm').value=s.offsetMm;$('diameterMm').disabled=$('offsetMm').disabled=s.placed;
 for(const k of ['ix','iz']){$(k).value=s[k];$(k).max=s.sample[k==='ix'?'xMm':'zMm'].length-1;}
 for(const [k,v,a,b] of [['cover',s.open,'Close practice cover','Open practice cover'],['tray',s.tray,'Retract passive tray','Extend passive tray'],['place',s.placed,'Remove inert witness','Place inert witness'],['cutaway',s.cutaway,'Replace documentary panel','Hide documentary panel']]){$(k).textContent=v?a:b;$(k).setAttribute('aria-pressed',String(v));}
 $('export').disabled=!s.result;$('fit').textContent=n(p.radialClearanceMm)+' mm calculated radial clearance · '+(p.fits?'fits 2 mm clearance rule':'NO FIT')+'.';
 $('fit').dataset.error=String(!p.fits);$('identity').textContent=s.sample.sampleId+' · source revision '+s.sample.revision+(s.placed?' · placed':' · not placed');
 $('result').textContent=s.result?s.result.selected.stack.map(v=>v.material+' '+n(v.thicknessNm)+' nm ['+n(v.cumulativeBaseNm)+'–'+n(v.cumulativeTopNm)+' nm]').join(' → ')+' · total '+n(s.result.selected.totalNm)+' nm.':'No stored cross-section selected.';
 draw();render3d();
}
function draw(){
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height;
 g.fillStyle='#163140';g.fillRect(0,0,w,h);g.fillStyle='#c4dde4';g.font='bold 22px sans-serif';g.fillText('STORED WITNESS MAPS AND CUMULATIVE CROSS-SECTION',18,33);
 if(!s.result){g.font='18px sans-serif';g.fillText('Place the inert witness, then inspect its stored layers.',18,82);return;}
 const r=s.result,colors=['#61d1be','#e6ac74'];
 r.layers.forEach((q,k)=>{
  const x=28+k*244,y=82,D=170,cols=r.axes.xMm.length,rows=r.axes.zMm.length,lo=Math.min(...q.nm.flat()),hi=Math.max(...q.nm.flat());
  g.font='bold 18px sans-serif';g.fillStyle=colors[k];g.fillText(q.material,x,y-12);
  q.nm.forEach((row,iz)=>row.forEach((a,ix)=>{
   const t=hi>lo?(a-lo)/(hi-lo):.5;g.globalAlpha=.28+.72*t;g.fillStyle=colors[k];g.fillRect(x+ix*D/cols,y+(rows-1-iz)*D/rows,D/cols+.5,D/rows+.5);
  }));
  g.globalAlpha=1;g.strokeStyle='#fff4cc';g.lineWidth=2;g.strokeRect(x+r.selected.ix*D/cols,y+(rows-1-r.selected.iz)*D/rows,D/cols,D/rows);
  g.fillStyle='#c4dde4';g.font='15px sans-serif';g.fillText(n(lo)+'–'+n(hi)+' nm · +X right · +Z up',x,y+D+24);
 });
 const x=527,base=265,hscale=175/(r.selected.totalNm||1);
 g.fillStyle='#c4dde4';g.font='bold 18px sans-serif';g.fillText('Vertical slice',x,68);
 r.selected.stack.forEach((q,i)=>{
  const y=base-q.cumulativeTopNm*hscale,dy=q.thicknessNm*hscale;g.fillStyle=colors[i];g.fillRect(x,y,65,dy);
  g.font='15px sans-serif';g.fillStyle='#d4e4e7';g.fillText(n(q.thicknessNm)+' nm',x+74,y+Math.max(12,dy/2));
 });
 g.fillStyle='#adbdc2';g.fillRect(x,base,65,8);g.fillText('substrate',x,base+29);
 g.fillStyle='#c4dde4';g.fillText('Cursor: X = '+n(r.selected.xMm)+' mm, Z = '+n(r.selected.zMm)+' mm · individual map color spans',28,h-29);
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.009,16),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));r.outputColorSpace=T.SRGBColorSpace;scene.background=new T.Color('#283d48');host.append(r.domElement);r.domElement.setAttribute('aria-label','Metric documentary Denton Discovery 635 and operable inert practice tray.');
 const orbit=new OrbitControls(cam,r.domElement),draw3d=()=>r.render(scene,cam);orbit.minDistance=.28;orbit.maxDistance=8;orbit.addEventListener('change',draw3d);
 scene.add(new T.HemisphereLight(0xffffff,0x768991,2.15));
 for(const [p,i] of [[[.5,2,1.5],2.4],[[-1.4,1.9,-1.5],1.42]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(p);scene.add(l);}
 const floor=new T.GridHelper(5,36,0x6e8790,0x506370);floor.position.y=-.003;scene.add(floor);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'discovery635.glb'),fetch(path+'interaction.json').then(x=>x.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(o=>{if(o.name===n)a.push(o)});if(a.length!==1)throw Error('Missing named bind '+n);return a[0];};
 get(m.frame.placementAnchor);m.ports.forEach(get);
 const cover=get(m.parts.cover),tray=get(m.parts.tray),plate=get(m.parts.disc),hood=get(m.parts.cutaway),base=tray.position.z,plateX=plate.position.x;
 const targets=m.actions.map(a=>{const p=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(p);p.userData.a=a;return [get(a.node),p];});
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null;
 function pick(e){if(cam.position.z<.16)return null;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);return ray.intersectObjects(targets.filter(([,p])=>p.userData.a.action==='tray'?s.open:p.userData.a.action==='place'?s.open&&s.tray:true).map(([,p])=>p))[0]?.object.userData.a;}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const a=pick(e);if(a)act(a.action);}down=null;};
 r.domElement.onpointermove=e=>{const a=pick(e);r.domElement.style.cursor=a?'pointer':'grab';r.domElement.title=a?.label??'Orbit the documentary cabinet';};
 render3d=()=>{
  cover.rotation.y=s.open?m.motion.coverAngleDeg*Math.PI/180:0;tray.position.z=base+(s.tray?m.motion.slideZ:0);plate.visible=s.placed;plate.position.x=plateX+s.offsetMm/1000;
  plate.scale.x=plate.scale.z=s.sample.diameterMm/100;hood.visible=!s.cutaway;
  scene.updateMatrixWorld(true);for(const [n,p] of targets){n.getWorldPosition(p.position);n.getWorldQuaternion(p.quaternion);p.updateMatrixWorld(true);}draw3d();
 };
 const poses={orbit:[[1.846,1.55,2.90],[-.045,.81,0]],front:[[0,1.19,2.75],[0,.74,.07]],tray:[[.050,1.22,1.37],[-.47,.85,.49]],upper:[[-.62,2.12,1.32],[-.45,1.24,.03]],rear:[[.88,1.39,-2.45],[.04,.78,-.06]]};
 function pose(k){cam.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw3d();}
 app.querySelectorAll('[data-ds-view]').forEach(b=>b.onclick=()=>pose(b.dataset.dsView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3d();}}).observe(host);
 pose('orbit');render3d();$('model').textContent='Metric GLB loaded · Documentary cabinet and inert practice tray';$('model').dataset.loaded='true';
}
sync();viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. Passive fitting and stored maps still work.';$('viewer').style.display='none';});
