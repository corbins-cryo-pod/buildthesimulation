import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/10-13/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,selection,loadMap,csv,banks,shankAsset}=await import(/* @vite-ignore */url);
const app=document.querySelector('#npx-passive'),$=k=>app.querySelector('#np-'+k),n=(x,p=4)=>Number(x.toFixed(p)).toString();
let s=initial(),map=null,draw3d=()=>{},close3d=()=>{};
function status(t,e=false){$('status').textContent=t;$('status').dataset.error=String(e);}
function act(a,v,again=false){
 const q=dispatch(s,map,a,v);s=q.state;status(q.message,!q.ok);
 if(again&&q.ok&&map){const r=dispatch(s,map,'run');s=r.state;if(!r.ok)status(r.message,true);}
 sync();
}
for(const a of ['run','reset'])$(a).onclick=()=>act(a,undefined,a==='reset');
$('bank').onchange=e=>{act('bank',Number(e.currentTarget.value),true);if(map)close3d('site');};
$('channel').onchange=e=>{act('channel',e.currentTarget.valueAsNumber,true);if(map)close3d('site');};
$('shift').onchange=e=>act('shift',e.currentTarget.valueAsNumber,true);
const keys=['dcUv','amplitudeUv','slopeUvPerUm','toneHz','durationMs'];
for(const k of keys)$(k).onchange=e=>act('fixture',{[k]:e.currentTarget.valueAsNumber});
$('file').onchange=async e=>{const f=e.currentTarget.files[0];if(!f)return;try{if(f.size>15000)throw Error('Use a fixture JSON below 15 kB.');act('import',JSON.parse(await f.text()),true);}catch(e){status('Import: '+e.message,true);}e.target.value='';};
function save(r,b){
 if(!r)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([b?csv(r):JSON.stringify(r,null,2)],{type:b?'text/csv':'application/json'}));a.href=u;a.download='npx1-site-'+r.selected.siteId+(b?'.csv':'.json');a.click();setTimeout(()=>URL.revokeObjectURL(u),800);
}
$('json').onclick=()=>save(s.result,false);$('csv').onclick=()=>save(s.result,true);
function sync(){
 $('bank').value=s.bank;$('channel').max=banks[s.bank]-1;$('channel').value=s.channel;$('shift').value=s.yShiftUm;
 for(const k of keys)$(k).value=s.userFixture[k];
 $('run').disabled=!map;$('json').disabled=$('csv').disabled=!s.result;
 const p=map?selection(map,s.bank,s.channel):null;
 $('position').textContent=p?'Asset site '+p.siteId+' · local XYZ ('+[p.xUm,p.yUm,p.zUm].map(x=>n(x)).join(', ')+') µm.':'Waiting for the engineering map.';
 $('world').textContent=p?'Display XYZ ('+[p.xUm,p.yUm+s.yShiftUm,p.zUm].map(x=>n(x)).join(', ')+') µm · '+banks[s.bank]+' virtual channels in this group.':'';
 $('result').textContent=s.result?'Initial synthetic level '+n(s.result.selected.initialV*1e6)+' µV · '+s.result.trace.timeS.length+' samples · 1 kSa/s.':'No synthetic trace yet.';
 plot();draw3d();
}
function plot(){
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height,l=68,r=w-27,t=48,b=h-61;
 g.fillStyle='#172e39';g.fillRect(0,0,w,h);g.fillStyle='#bfd9df';g.font='bold 20px sans-serif';g.fillText('SYNTHETIC DEPTH-CODED REPLAY',17,31);
 if(!s.result)return;
 const z=s.result.trace,d=z.voltageV.map(x=>x*1e6),time=z.timeS.at(-1),lo=Math.min(...d),hi=Math.max(...d),span=hi-lo||10,X=x=>l+x/time*(r-l),Y=y=>b-(y-(lo-.12*span))/(1.24*span)*(b-t);
 g.strokeStyle='#526c76';g.lineWidth=1;g.font='15px sans-serif';
 for(let i=0;i<=5;i++){const x=l+(r-l)*i/5,y=b-(b-t)*i/5;g.beginPath();g.moveTo(x,t);g.lineTo(x,b);g.moveTo(l,y);g.lineTo(r,y);g.stroke();g.fillText(n(time*i/5,2),x-6,b+22);g.fillText(n(lo-.12*span+1.24*span*i/5,1),12,y+5);}
 g.fillText('synthetic time (s) · voltage in µV',l,b+47);
 g.strokeStyle='#7fe5ce';g.lineWidth=2.6;g.beginPath();d.forEach((v,i)=>i?g.lineTo(X(z.timeS[i]),Y(v)):g.moveTo(X(0),Y(v)));g.stroke();
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.000002,.10),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));scene.background=new T.Color('#203441');host.append(r.domElement);r.domElement.setAttribute('aria-label','True-scale shank reference. Select an enlarged view to pick the virtual site pads.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.000045;orbit.maxDistance=.045;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x758a91,2.55));const l=new T.DirectionalLight(0xffffff,1.65);l.position.set(.015,.02,.022);scene.add(l);
 const anchor=new T.Group();anchor.name='bts_bench_anchor';scene.add(anchor);
 const g=await new GLTFLoader().loadAsync(shankAsset);anchor.add(g.scene);
 const sites=[];g.scene.traverse(o=>{if(Number.isInteger(o.userData?.site_id))sites.push(o);});
 if(sites.length!==960)throw Error('Original 960 geometric site anchors not found.');
 anchor.updateMatrixWorld(true);
 const geo=new T.PlaneGeometry(12e-6,12e-6),material=new T.MeshBasicMaterial({side:T.DoubleSide,color:0xffffff}),pads=new T.InstancedMesh(geo,material,map.length);pads.name='npx_virtual_sites';anchor.add(pads);
 const matrix=new T.Matrix4();
 for(const o of sites){
  const j=o.userData.site_id,q=map[j],actual=o.getWorldPosition(new T.Vector3());
  if(Math.hypot(actual.x-q.xUm*1e-6,actual.y-q.yUm*1e-6,actual.z-q.zUm*1e-6)>2e-9)throw Error('Site '+j+' does not coincide with the advertised GLB geometry.');
  matrix.makeTranslation(actual.x,actual.y,actual.z+0.15e-6);pads.setMatrixAt(j,matrix);o.removeFromParent();
 }
 pads.instanceMatrix.needsUpdate=true;
 const ring=new T.Mesh(new T.RingGeometry(13e-6,19e-6,28),new T.MeshBasicMaterial({color:0xffda85,side:T.DoubleSide}));ring.name='virtual_site_selection_marker';anchor.add(ring);
 const on=new T.Color('#58d8c5'),off=new T.Color('#8f8062'),sel=new T.Color('#ffdb81');
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null,lastBank=-1,lastSite=-1;
 function hit(e){
  if(cam.position.z<0)return null;
  const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);
  return ray.intersectObject(pads)[0]?.instanceId??null;
 }
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const q=hit(e);if(q!==null){act('site',q,true);close3d('site');}}down=null;};
 r.domElement.onpointermove=e=>{const q=hit(e);r.domElement.style.cursor=q!==null?'pointer':'grab';r.domElement.title=q!==null?'Select asset site '+q:'Orbit the shank';};
 draw3d=()=>{
  const p=selection(map,s.bank,s.channel);
  anchor.position.y=s.yShiftUm*1e-6;
  if(lastBank!==s.bank||lastSite!==p.siteId){
   for(const q of map)pads.setColorAt(q.siteId,q.siteId===p.siteId?sel:Math.floor(q.siteId/384)===s.bank?on:off);
   pads.instanceColor.needsUpdate=true;lastBank=s.bank;lastSite=p.siteId;
  }
  ring.position.set(p.xUm*1e-6,p.yUm*1e-6,p.zUm*1e-6+1.2e-6);draw();
 };
 close3d=name=>{
  const p=selection(map,s.bank,s.channel),o=anchor.position.y,t=name==='site'?[p.xUm*1e-6,p.yUm*1e-6+o,0]:name==='tip'?[0,.00032+o,0]:[0,.005+o,0],
   q=name==='site'?[p.xUm*1e-6+.000041,t[1]+.000045,.00029]:name==='tip'?[.000095,t[1]+.00008,.0013]:name==='side'?[.015,t[1]+.001,.0011]:[.0028,t[1]+.001,.0155];
  cam.position.fromArray(q);orbit.target.fromArray(t);orbit.update();draw();
 };
 app.querySelectorAll('[data-np-view]').forEach(b=>b.onclick=()=>close3d(b.dataset.npView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 close3d('site');draw3d();$('model').textContent='Metric engineering GLB loaded · lightweight 960-site display';$('model').dataset.loaded='true';
}
sync();
loadMap().then(m=>{map=m;status('Pinned 960-site coordinate map verified.');act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. Coordinates and synthetic replay still work.';$('viewer').style.display='none';});})
.catch(e=>{status(e.message,true);$('model').textContent='Cannot verify the engineering geometry map.';});
