import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/15-11/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#esp3-exhibit'),el=k=>top.querySelector('#esp3-'+k),fmt=x=>Number(x.toFixed(3));
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a,v){if(!data)return;const u=act(data,s,a,v);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),w=c.width,h=c.height,ref=data.cards.find(k=>k.id===data.referenceId),card=data.cards[s.index],u=w/39;
 g.fillStyle='#253a44';g.fillRect(0,0,w,h);g.textBaseline='middle';g.textAlign='center';
 for(const [i,q] of [[0,ref],[1,card]]){
  const x=(.25+.5*i)*w-u*data.cols/2,y=h*.26;
  g.fillStyle='#d3e6e3';g.font='bold '+Math.round(w*.044)+'px system-ui';g.fillText(i?'SELECTED CARD':'REFERENCE',(i*.5+.25)*w,h*.135);
  g.fillStyle='#344d56';g.fillRect(x,y,data.cols*u,data.rows*u);g.strokeStyle='#5b737a';g.lineWidth=Math.max(1,w/710);
  for(let j=0;j<=data.cols;j++){g.beginPath();g.moveTo(x+j*u,y);g.lineTo(x+j*u,y+data.rows*u);g.stroke();}
  for(let j=0;j<=data.rows;j++){g.beginPath();g.moveTo(x,y+j*u);g.lineTo(x+data.cols*u,y+j*u);g.stroke();}
  g.fillStyle=i?'#f0b282':'#a0dcda';
  for(const [a,b] of q.cells)g.fillRect(x+(a+.07)*u,y+(b+.07)*u,.86*u,.86*u);
  g.font='bold '+Math.round(w*.042)+'px system-ui';g.fillText(q.id+(q.cells.length?'':' · BLANK'),(i*.5+.25)*w,h*.67);
 }
 g.strokeStyle='#9eb9b5';g.lineWidth=Math.max(2,w/220);g.beginPath();g.moveTo(w*.50-2*u,h*.79);g.lineTo(w*.50+2*u,h*.79);g.stroke();
 g.fillStyle='#d3e6e3';g.font=Math.round(w*.036)+'px system-ui';g.fillText('8 mm in the drawing grid',w*.50,h*.875);
 g.textAlign='start';
}
function sync(){
 el('card').value=s.index;el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s),v=q.comparison;
 el('result').textContent=q.cardId+' · '+q.card.occupiedCells+' tiles · '+q.card.areaMm2+' mm² · '+(v?fmt(v.iou*100)+'% overlap after translation correction ('+v.intersectionCells+'/'+v.unionCells+' tiles).':'stored blank; no alignment or overlap defined.');
 const diagram=el('diagram');
 diagram.setAttribute('aria-label','Static drawing comparison between '+q.referenceId+' and '+q.cardId+' with '+q.card.occupiedCells+' selected tiles.');
 draw(diagram);repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('card').onchange=e=>dispatch('select',Number(e.currentTarget.value));
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.archiveId+'-'+q.cardId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Closed Diagnosys E3 and ColorDome shells and a detached abstract pattern archive.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.36;ctr.maxDistance=7;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,32,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'e3-colordome.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=704;raster.height=480;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.248,.16909),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.11)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the disconnected exteriors';};
 repaint=()=>{const k=String(s.index);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[-.36,.77,1.74],[-.140,.23,.025]],front:[[.91,.77,1.38],[.03,.21,.07]],dome:[[-.22,.56,.93],[.315,.345,.05]],archive:[[-.72,.407,.62],[-.72,.296,.061]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-esp3-view]').forEach(x=>x.onclick=()=>pose(x.dataset.esp3View));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Disconnected shells and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: you are comparing a translated copy of the reference.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The detached pattern archive is still available.';el('view').hidden=true;el('fallback').hidden=false;});
