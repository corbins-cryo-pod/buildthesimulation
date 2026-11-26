import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/04-10/';
const {initial,act,load,inspect}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#r4-exhibit'),el=k=>top.querySelector('#r4-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a,v){if(!data)return;const next=act(data,s,a,v);s=next.state;status(next.message,!next.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),slots=data.charts[s.display].rows,[w,h]=data.shapePx,x=c.width/w,y=c.height/h;
 g.fillStyle='#f2eadd';g.fillRect(0,0,c.width,c.height);
 g.fillStyle=s.display?'#204b62':'#1a6373';
 for(const [i,[left,n]] of slots.entries())if(n)g.fillRect(x*left,i*y,n*x,y+.3);
 g.fillStyle='#e29635';
 g.fillRect(0,y*s.row,c.width,Math.max(2,.22*y));
 g.strokeStyle='#253644';g.lineWidth=Math.max(2,.20*x);g.beginPath();g.moveTo(3*x,33.5*y);g.lineTo(11*x,33.5*y);g.stroke();
 g.font='bold '+Math.round(2*x)+'px system-ui';g.fillStyle='#253644';g.fillText('2 mm',3*x,32.8*y);g.fillText(s.display?'CHART B':'CHART A',37*x,33.9*y);
}
function sync(){
 el('row').value=s.row;el('row-value').textContent=s.row;el('display').value=s.display;
 el('export').disabled=el('next').disabled=!data;if(!data)return;
 const r=inspect(data,s);el('active').textContent=r.displayChartId+' · row '+r.row;
 el('result').textContent=r.measurements.map((q,i)=>['A','B'][i]+': '+(q.widthMm===null?'no printed ink':q.widthMm+' mm')).join(' · ')+(r.differenceBMinusAMm===null?'':' · difference (B − A): '+r.differenceBMinusAMm+' mm');
 draw(el('raster'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('row').oninput=e=>dispatch('row',e.currentTarget.valueAsNumber);
el('display').onchange=e=>dispatch('view',Number(e.currentTarget.value));
el('empty').onclick=()=>dispatch('row',0);
el('raster').onclick=e=>{const b=e.currentTarget.getBoundingClientRect();dispatch('row',Math.floor(36*(e.clientY-b.top)/b.height));};
el('export').onclick=()=>{
 if(!data)return;const q=inspect(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download='R4-synthetic-printed-pair-row-'+q.row+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Closed ProtoLaser R4 candidate and detached printed chart exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.38;ctr.maxDistance=7;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'protolaser-r4.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=432;raster.height=288;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.348,.232),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.19)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=[s.row,s.display].join('/');if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[2.6,1.83,4.0],[-.08,.79,.03]],front:[[.42,1.27,3.41],[.42,.84,.01]],archive:[[-.85,1.23,1.17],[-.85,1.05,.14]],side:[[2.75,1.23,1.21],[.42,.83,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-r4-view]').forEach(x=>x.onclick=()=>pose(x.dataset.r4View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Loaded two fixed printed chart rasters.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The independent chart comparison still works.';el('view').hidden=true;});
