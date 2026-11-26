import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/07-09/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#lonza09-exhibit'),el=k=>top.querySelector('#lonza09-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a){if(!data)return;const u=act(data,s,a);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),q=info(data,s),{left,right,top,joint,base}=q.observedEdgesPx,w=c.width,h=c.height,k=w/180,x=d=>k*d,y=d=>k*d,bound=q.framePx[1];
 g.fillStyle='#f0e9d9';g.fillRect(0,0,w,h);
 g.strokeStyle='#d4c8b7';g.lineWidth=Math.max(1,k*.19);
 for(let i=0;i<=180;i+=10){g.beginPath();g.moveTo(x(i),0);g.lineTo(x(i),y(bound));g.stroke();}
 for(let i=0;i<=bound;i+=10){g.beginPath();g.moveTo(0,y(i));g.lineTo(w,y(i));g.stroke();}
 g.fillStyle='#274f60';g.fillRect(x(left),y(top),x(right-left),y(joint-top));
 const visibleEnd=base===null?bound:base;
 g.fillStyle='#536b73';g.fillRect(x(left),y(joint),x(right-left),y(visibleEnd-joint));
 g.strokeStyle='#243d46';g.lineWidth=k*.5;
 g.beginPath();g.moveTo(x(left),y(13));g.lineTo(x(right),y(13));g.moveTo(x(left),y(11));g.lineTo(x(left),y(15));g.moveTo(x(right),y(11));g.lineTo(x(right),y(15));g.stroke();
 g.font='bold '+Math.round(k*6)+'px system-ui';g.fillStyle='#263e49';g.textAlign='center';
 g.fillText(q.results.widthMm+' mm observed width',x(90),y(10));
 g.fillStyle='#f3ede1';g.fillText('UPPER',x(90),y(46));
 if(base===null){
  g.fillStyle='#d5c9b7';g.fillRect(0,y(bound),w,h-y(bound));
  g.strokeStyle='#a0572c';g.setLineDash([k*3,k*2]);g.beginPath();g.moveTo(0,y(bound));g.lineTo(w,y(bound));g.stroke();g.setLineDash([]);
  g.fillStyle='#603925';g.fillText('BASE OUTSIDE SAVED VIEW',x(90),y(103));
 }else{
  g.fillText('LOWER',x(90),y(86));g.fillStyle='#263e49';g.fillText(q.results.totalHeightMm+' mm observed total height',x(90),y(111));
 }
 g.textAlign='start';
}
function sync(){
 el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s),d=q.results;
 el('result').textContent=q.viewId+' · width '+d.widthMm+' mm · height '+(d.totalHeightMm===null?'unknown (base cropped)':d.totalHeightMm+' mm')+'.';
 draw(el('diagram'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.drawingId+'-'+q.viewId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Closed second-generation Lonza Core and X exterior and detached abstract drawing exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.16;ctr.maxDistance=4;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'lonza-core-x.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=540;raster.height=360;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.191,.1273),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.11)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=String(s.view);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[.44,.41,1.1],[-.04,.13,.02]],front:[[.175,.21,.61],[.175,.13,.01]],archive:[[-.255,.24,.46],[-.255,.191,.046]],side:[[.63,.29,.32],[.173,.126,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-lonza09-view]').forEach(x=>x.onclick=()=>pose(x.dataset.lonza09View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: both height edges are visible in the full drawing.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The detached drawing review remains separate.';el('view').hidden=true;});
