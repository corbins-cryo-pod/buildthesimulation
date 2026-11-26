import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/06-06/';
const {initial,act,load,info}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#ns-viewer'),el=k=>top.querySelector('#ns-'+k);
let data=null,s=initial(),repaint=()=>{};
const status=(m,e=false)=>{el('status').textContent=m;el('status').dataset.error=String(e);};
function dispatch(a,v){if(!data)return;const u=act(data,s,a,v);s=u.state;status(u.message,!u.ok);sync();}
function draw(c){
 if(!data)return;
 const g=c.getContext('2d'),q=info(data,s),n=data.frame.widthPx,step=c.width/n,p=([x,y])=>[(x+.5)*step,(y+.5)*step];
 g.fillStyle='#f4eddb';g.fillRect(0,0,c.width,c.height);
 g.strokeStyle='#d2c8b6';g.lineWidth=Math.max(1,step*.12);
 for(let j=0;j<=n;j+=5){g.beginPath();g.moveTo(j*step,0);g.lineTo(j*step,n*step);g.moveTo(0,j*step);g.lineTo(n*step,j*step);g.stroke();}
 g.strokeStyle='#a8a193';g.lineWidth=step*.25;g.beginPath();
 for(const [i,k] of ['A','C','B','A'].entries())(i?g.lineTo.bind(g):g.moveTo.bind(g))(...p(q.pointsPx[k]));g.stroke();
 g.strokeStyle='#a45026';g.lineWidth=step*.62;g.beginPath();g.moveTo(...p(q.pointsPx[q.pair[0]]));g.lineTo(...p(q.pointsPx[q.pair[1]]));g.stroke();
 g.fillStyle='#214a58';g.font='bold '+Math.round(3.7*step)+'px system-ui';
 for(const [k,pt] of Object.entries(q.pointsPx)){const [x,y]=p(pt);g.beginPath();g.arc(x,y,.97*step,0,Math.PI*2);g.fill();g.fillText(k,x+1.6*step,y-1.2*step);}
 g.strokeStyle='#214a58';g.lineWidth=.44*step;g.beginPath();g.moveTo(5*step,74*step);g.lineTo(25*step,74*step);g.stroke();
 g.fillText('5 mm',5*step,72*step);g.fillText(q.viewId==='BASE'?'NATIVE':'90° CW',60*step,74*step);
}
function sync(){
 el('pair').value=s.pair;el('next').disabled=el('export').disabled=!data;if(!data)return;
 const q=info(data,s);el('result').textContent=q.viewId+' · '+q.pair+' = '+q.distanceMm.toFixed(2)+' mm · column/row delta ['+q.deltaPx.join(', ')+'] px.';
 draw(el('drawing'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('pair').onchange=e=>dispatch('pair',e.currentTarget.value);
el('export').onclick=()=>{
 if(!data)return;const q=info(data,s),href=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=q.drawingId+'-'+q.viewId+'-'+q.pair+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Closed Elmarco NS LAB cabinet and detached abstract drawing exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.38;ctr.maxDistance=7;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'ns-lab.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=raster.height=405;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.370,.370),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.19)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=[s.view,s.pair].join('/');if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[-2.58,2.13,5.15],[-.16,1.01,.03]],front:[[.5,1.51,4.53],[.49,1.04,.01]],archive:[[-1.02,1.28,1.31],[-1.02,1.07,.17]],side:[[-2.83,1.56,1.9],[.39,1.03,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-ns-view]').forEach(x=>x.onclick=()=>pose(x.dataset.nsView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: fixed independent drawing and ruler.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The independent drawing remains available.';el('view').hidden=true;});
