import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/15-06/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#sky76-exhibit'),el=k=>top.querySelector('#sky76-'+k),fmt=x=>Number(x.toFixed(3));
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a,v){if(!data)return;const u=act(data,s,a,v);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),p=data.planes.get(s.index),w=c.width,h=c.height;
 g.fillStyle='#20313b';g.fillRect(0,0,w,h);
 if(!p){g.fillStyle='#f2dbac';g.font='bold '+Math.round(w*.045)+'px system-ui';g.textAlign='center';g.fillText('NO ARCHIVED FRAME',w*.5,h*.51);g.textAlign='start';return;}
 const scale=Math.min(w*.91/6.4,h*.84/6),cx=scale*.2,cy=scale*.25,ox=(w-32*cx)/2,oy=(h-24*cy)/2;
 g.fillStyle='#293e48';g.fillRect(ox,oy,32*cx,24*cy);
 for(let i=0;i<p.object.length;i++){
  const col=i%32,row=Math.floor(i/32),x=ox+col*cx,y=oy+row*cy;
  if(p.object[i]){g.fillStyle='#9bd1d1';g.fillRect(x,y,cx,cy);}
  if(s.showAnnotation&&p.annotation[i]){
   g.strokeStyle='#f4ad60';g.lineWidth=Math.max(1,cx*.18);g.beginPath();g.moveTo(x+cx*.17,y+cy*.82);g.lineTo(x+cx*.83,y+cy*.18);g.stroke();
  }
 }
 g.strokeStyle='#677f89';g.lineWidth=Math.max(1,cx*.09);g.strokeRect(ox,oy,32*cx,24*cy);
 g.fillStyle='#d1e8e8';g.font='bold '+Math.round(w*.027)+'px system-ui';g.fillText(s.index===1?'STORED · NO SHAPE LABEL':'STORED · SHAPE LABEL',w*.04,h*.952);
 g.fillStyle='#f4ad60';g.textAlign='right';g.fillText(s.showAnnotation?'ANNOTATION SHOWN':'ANNOTATION HIDDEN',w*.96,h*.952);g.textAlign='start';
}
function sync(){
 el('slice').value=s.index;el('overlay').checked=s.showAnnotation;el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s),r=q.result;
 el('result').textContent=q.coverage==='missing'?'Index '+q.index+' · missing frame · object and annotation unknown.':q.frameId+' · '+(r.objectPixels?fmt(r.objectAreaMm2)+' mm² area · '+fmt(r.objectWidthMm)+' mm width':'stored, no shape · 0 mm² area')+' · '+r.annotationPixels+' annotation cells · '+r.intersectionPixels+' intersecting cells.';
 draw(el('diagram'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('slice').onchange=e=>dispatch('select',Number(e.currentTarget.value));el('overlay').onchange=()=>dispatch('overlay');
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.archiveId+'-'+(q.frameId??'MISSING-'+q.index)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Closed Bruker SkyScan 1276 CMOS cabinet and detached fixed geometry archive.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.36;ctr.maxDistance=7;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,32,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'skyscan1276.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=496;raster.height=372;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.321,.24075),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.11)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=[s.index,s.showAnnotation].join('/');if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[-1.47,1.20,2.83],[-.085,.44,.022]],front:[[-.37,1.00,1.97],[.34,.46,.20]],archive:[[-.55,.58,.88],[-.55,.452,.16]],side:[[-1.72,.69,.61],[.34,.46,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-sky76-view]').forEach(x=>x.onclick=()=>pose(x.dataset.sky76View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: fixed shape and annotation are separate stored layers.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The detached geometry archive is still available.';el('view').hidden=true;});
