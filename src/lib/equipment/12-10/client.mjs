import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/12-10/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,loadFixture,stitch,point,csv}=await import(/* @vite-ignore */url);
const app=document.querySelector('#vs12'),$=k=>app.querySelector('#vs-'+k),fmt=(x,n=2)=>Number(x.toFixed(n)).toString();
let s=initial(),report=null,repaint=()=>{};
function status(text,err=false){$('status').textContent=text;$('status').dataset.error=String(err);}
function act(a,v){const q=dispatch(s,report,a,v);s=q.state;status(q.message,!q.ok);sync();}
for(const a of ['next','reset'])$(a).onclick=()=>act(a);
$('tile').onchange=e=>act('tile',Number(e.currentTarget.value));
for(const k of ['x','z'])$(k).onchange=e=>act('pixel',{[k]:e.currentTarget.valueAsNumber});
function info(){if(!report)return null;return point(report,report.tiles[s.selected].id,s.x,s.z);}
function sync(){
 $('tile').value=s.selected;$('x').value=s.x;$('z').value=s.z;for(const k of ['json','png','csv','next'])$(k).disabled=!report;
 const q=info();
 $('position').textContent=q?q.tileId+' pixel ('+q.tilePixel.join(', ')+') → mosaic ('+q.mosaicPixel.join(', ')+') → stage X/Z ('+q.stageMm.map(x=>fmt(x)).join(', ')+') mm.':'Waiting for saved tiles.';
 $('result').textContent=report?report.slideId+' · revision '+report.revision+' · '+report.fiducials.length+' unique fiducials · '+report.coverage.uniqueOverlapPixels+' verified overlap pixels · maximum stage residual '+fmt(report.coverage.maxStageResidualPx,4)+' pixels.':'No synthetic mosaic loaded.';
 if(report)render($('mosaic'),true);repaint();
}
function render(c,showMarks){
 const g=c.getContext('2d'),w=c.width,h=c.height,[px,pz]=report.frame.sizePx;
 const slot=document.createElement('canvas');slot.width=px;slot.height=pz;
 const q=slot.getContext('2d'),d=q.createImageData(px,pz);
 for(let j=0;j<report.pixels.length;j++){
  const a=report.pixels[j];
  d.data[j*4]=a>=230?230:a*.6;d.data[j*4+1]=a>=230?207:26+a*.63;d.data[j*4+2]=a>=230?130:34+a*.64;d.data[j*4+3]=255;
 }
 q.putImageData(d,0,0);g.imageSmoothingEnabled=false;g.drawImage(slot,0,0,w,h);
 if(!showMarks)return;
 for(const [i,t] of report.tiles.entries()){
  g.strokeStyle=i===s.selected?'#65efd8':'#c5e1e8';g.lineWidth=i===s.selected?Math.max(2,w/180):Math.max(1,w/500);
  g.strokeRect(t.originMosaicPx[0]*w/px,t.originMosaicPx[1]*h/pz,t.sizePx[0]*w/px,t.sizePx[1]*h/pz);
 }
 const pos=info()?.mosaicPixel;
 if(pos){g.strokeStyle='#fff7bd';g.lineWidth=Math.max(1.8,w/330);g.beginPath();g.arc((pos[0]+.5)*w/px,(pos[1]+.5)*h/pz,Math.max(3,w/100),0,2*Math.PI);g.stroke();}
}
$('mosaic').onclick=e=>{
 if(!report)return;
 const c=$('mosaic'),b=c.getBoundingClientRect(),[w,h]=report.frame.sizePx,x=Math.floor((e.clientX-b.left)/b.width*w),z=Math.floor((e.clientY-b.top)/b.height*h);
 const contains=t=>x>=t.originMosaicPx[0]&&z>=t.originMosaicPx[1]&&x<t.originMosaicPx[0]+t.sizePx[0]&&z<t.originMosaicPx[1]+t.sizePx[1];
 const index=contains(report.tiles[s.selected])?s.selected:report.tiles.findIndex(contains);
 if(index<0)return;const t=report.tiles[index],q=dispatch({...s,selected:index},report,'pixel',{x:x-t.originMosaicPx[0],z:z-t.originMosaicPx[1]});s=q.state;status(q.message,!q.ok);sync();
};
function save(blob,ext){if(!blob)return;const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=report.slideId+'-synthetic.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
$('json').onclick=()=>{if(report)save(new Blob([JSON.stringify({...report,selected:info()},null,2)],{type:'application/json'}),'json');};
$('csv').onclick=()=>{if(report)save(new Blob([csv(report)],{type:'text/csv'}),'csv');};
$('png').onclick=()=>{if(!report)return;const target=document.createElement('canvas');target.width=696;target.height=264;render(target,false);target.toBlob(b=>save(b,'png'));};
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.009,12),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));scene.background=new T.Color('#253946');host.append(r.domElement);r.domElement.setAttribute('aria-label','Dormant standard-camera single-tray VS200 scanner and generic review monitor.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.23;orbit.maxDistance=5;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x758b92,2.1));
 for(const [a,i] of [[[.62,1.5,1.7],2.4],[[-.85,1.20,-1.10],1.47]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);scene.add(l);}
 const g=new T.GridHelper(3.0,30,0x6d8893,0x526976);g.position.y=-.005;scene.add(g);
 const [data,m]=await Promise.all([new GLTFLoader().loadAsync(path+'vs200.glb'),fetch(path+'interaction.json').then(z=>z.json())]);scene.add(data.scene);
 const get=n=>{const a=[];data.scene.traverse(o=>{if(o.name===n)a.push(o)});if(a.length!==1)throw Error('Missing named model binding '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);m.ports.forEach(get);
 const a=m.actions[0],tile=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(proxy);tile.getWorldPosition(proxy.position);
 const c=document.createElement('canvas');c.width=348;c.height=132;const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const screen=new T.Mesh(new T.PlaneGeometry(.283,.1074),new T.MeshBasicMaterial({map:texture}));screen.position.z=.003;tile.add(screen);
 const anchor=get(m.parts.cursorAnchor),marker=new T.Mesh(new T.SphereGeometry(.0018,12,8),new T.MeshBasicMaterial({color:0xffdd6e}));anchor.add(marker);
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null,signature='';
 function hit(e){if(cam.position.z<.02)return false;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);return !!ray.intersectObject(proxy)[0];}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))act(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant VS200';};
 repaint=()=>{
  const tag=[s.selected,s.x,s.z].join('/'),q=info();
  if(tag!==signature&&report){render(c,true);texture.needsUpdate=true;signature=tag;}
  if(q)marker.position.set((q.stageMm[0]-38)*.001,.002,(q.stageMm[1]-13)*.001);draw();
 };
 const poses={orbit:[[.91,.77,1.89],[-.18,.29,.035]],front:[[.03,.58,1.61],[-.19,.31,.115]],plate:[[-.53,.29,.59],[-.56,.065,.235]],rear:[[.76,.68,-1.47],[-.02,.29,-.02]]};
 function pose(k){cam.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 app.querySelectorAll('[data-vs-view]').forEach(b=>b.onclick=()=>pose(b.dataset.vsView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 pose('orbit');repaint();$('model').textContent='Metric GLB loaded · Dormant cabinet and original inert tile review';$('model').dataset.loaded='true';
}
sync();
loadFixture().then(x=>{report=stitch(x);status('Verified all fixed tile offsets and overlap values.');sync();viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. The saved mosaic still works.';$('viewer').style.display='none';});}).catch(e=>{$('model').textContent='Stored inert grid could not be verified.';status(e.message,true);});
