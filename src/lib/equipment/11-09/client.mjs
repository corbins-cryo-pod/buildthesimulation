import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/11-09/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#monaco09-exhibit'),el=k=>top.querySelector('#monaco09-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a){if(!data)return;const u=act(data,s,a);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),q=info(data,s),w=c.width,h=c.height,k=w/56,v=a=>a*k;
 g.fillStyle='#f3ebdb';g.fillRect(0,0,w,h);
 g.strokeStyle='#d9ccbb';g.lineWidth=Math.max(1,k*.13);
 for(let x=0;x<=56;x+=4){g.beginPath();g.moveTo(v(x),0);g.lineTo(v(x),h);g.stroke();}
 for(let y=0;y<=32;y+=4){g.beginPath();g.moveTo(0,v(y));g.lineTo(w,v(y));g.stroke();}
 for(const [i,r] of q.rectangles.entries()){
  const [x,y,X,Y]=r.boundsMm;g.fillStyle=['#66929ba8','#c28454a8'][i];g.strokeStyle=['#3b626f','#9d673d'][i];g.lineWidth=k*.26;
  g.fillRect(v(x),v(y),v(X-x),v(Y-y));g.strokeRect(v(x),v(y),v(X-x),v(Y-y));
  g.font='bold '+Math.round(k*2.2)+'px system-ui';g.fillStyle='#19323c';g.fillText(r.id,v(x+1.5),v(y+3.0));
 }
 if(q.overlap.boundsMm){
  const [x,y,X,Y]=q.overlap.boundsMm;g.fillStyle='#69547bca';g.fillRect(v(x),v(y),v(X-x),v(Y-y));
  g.fillStyle='#fff6e3';g.font='bold '+Math.round(k*1.62)+'px system-ui';g.fillText(q.overlap.areaMm2+' mm²',v(x+1.2),v(y+5.5));
 }else{
  const [a,b]=q.rectangles.map(x=>x.boundsMm);
  g.strokeStyle='#583d61';g.lineWidth=k*.45;g.setLineDash([k*.8,k*.7]);g.beginPath();g.moveTo(v(b[0]),v(a[1]));g.lineTo(v(b[0]),v(a[3]));g.stroke();g.setLineDash([]);
 }
 g.fillStyle='#263c45';g.font='bold '+Math.round(k*1.55)+'px system-ui';g.fillText(q.viewId==='EDGE-TOUCH'?'SHARED EDGE ONLY':'FILLED AREA IN BOTH',v(4),v(29));
}
function sync(){
 el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s);
 el('result').textContent=q.viewId+' · '+q.overlap.classification+' · '+q.overlap.areaMm2+' mm² common area · '+q.unionAreaMm2+' mm² union.';
 draw(el('diagram'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.exhibitId+'-'+q.viewId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Dormant Coherent Monaco housing and a detached abstract geometry card stand.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.21;ctr.maxDistance=5;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(2.8,28,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'monaco-1035.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=560;raster.height=320;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.258,.1474),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.11)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=String(s.view);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[-.50,.63,1.39],[-.04,.168,.027]],front:[[-.29,.41,.96],[.23,.085,.07]],archive:[[-.34,.35,.62],[-.34,.28,.10]],side:[[-.94,.225,.29],[.21,.085,.006]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-monaco09-view]').forEach(x=>x.onclick=()=>pose(x.dataset.monaco09View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: the two fixed colored rectangles share a measurable area.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The detached geometric display remains separate.';el('view').hidden=true;});
