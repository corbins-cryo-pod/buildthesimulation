import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/06-11/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#of11-exhibit'),el=k=>top.querySelector('#of11-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a){if(!data)return;const u=act(data,s,a);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),q=info(data,s),w=c.width,h=c.height,scale=w/113;
 g.fillStyle='#f1e9db';g.fillRect(0,0,w,h);
 g.strokeStyle='#d6cab7';g.lineWidth=Math.max(1,w*.002);
 for(let i=0;i<w;i+=5*scale){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();}
 for(let i=0;i<h;i+=5*scale){g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}
 g.font='bold '+Math.round(w*.042)+'px system-ui';g.fillStyle='#1c4d59';g.textAlign='center';
 g.fillText(q.viewId==='PARALLEL'?'PARALLEL VIEW':'PERSPECTIVE VIEW',w*.5,h*.16);
 for(const [i,a] of q.cards.entries()){
  const [dx,dy]=a.displaySizeMm.map(v=>v*scale),x=w*(i?.75:.25),y=h*.49;
  g.fillStyle=['#1a6071','#bf7839'][i];g.fillRect(x-dx/2,y-dy/2,dx,dy);
  g.strokeStyle='#253944';g.lineWidth=Math.max(1.5,scale*.34);
  const bar=y+dy/2+1.6*scale;
  g.beginPath();g.moveTo(x-dx/2,bar);g.lineTo(x+dx/2,bar);
  g.moveTo(x-dx/2,bar-scale);g.lineTo(x-dx/2,bar+scale);
  g.moveTo(x+dx/2,bar-scale);g.lineTo(x+dx/2,bar+scale);g.stroke();
  g.fillStyle='#243d46';g.fillText(a.displaySizeMm[0]+' mm',x,h*.81);
  g.font='bold '+Math.round(w*.032)+'px system-ui';g.fillText(i?'FAR CARD':'NEAR CARD',x,h*.91);g.font='bold '+Math.round(w*.042)+'px system-ui';
 }
 g.textAlign='start';
}
function sync(){
 el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s);
 el('result').textContent=q.viewId+' · near width '+q.cards[0].displaySizeMm[0]+' mm · far width '+q.cards[1].displaySizeMm[0]+' mm · width ratio '+q.nearToFarWidthRatio+':1.';
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
 r.domElement.setAttribute('aria-label','Closed Jeio Tech OF-12G solid-door enclosure and separate projection exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.38;ctr.maxDistance=7;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'of-12g.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=560;raster.height=360;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.330,.212),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.19)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=String(s.view);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[1.26,.95,2.15],[-.075,.42,.04]],front:[[.33,.47,1.72],[.33,.43,.01]],archive:[[-.64,.67,.95],[-.64,.53,.14]],side:[[1.76,.66,1.02],[.33,.40,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-of11-view]').forEach(x=>x.onclick=()=>pose(x.dataset.of11View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: both abstract cards have the same source size.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The separate projection exercise still works.';el('view').hidden=true;});
