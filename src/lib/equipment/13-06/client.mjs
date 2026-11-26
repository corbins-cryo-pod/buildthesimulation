import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/13-06/';
const {initial,dispatch,loadFixture,inspect,windowPixel}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const app=document.querySelector('#gla2'),el=k=>app.querySelector('#ga-'+k);
let data=null,s=initial(),repaint=()=>{};
function status(msg,error=false){el('status').textContent=msg;el('status').dataset.error=String(error);}
function act(a,v){if(!data)return;const q=dispatch(data,s,a,v);s=q.state;status(q.message,!q.ok);sync();}
function draw(c,marks=true){
 if(!data)return;
 const [w,h]=data.frame.sizePx,g=c.getContext('2d'),slot=document.createElement('canvas');slot.width=w;slot.height=h;
 const v=slot.getContext('2d'),d=v.createImageData(w,h),img=data.images[s.index];
 for(let i=0;i<img.pixels.length;i++){const k=windowPixel(img.pixels[i],s.low,s.high);d.data.set([k,k,k,255],i*4);}
 v.putImageData(d,0,0);g.imageSmoothingEnabled=false;g.drawImage(slot,0,0,c.width,c.height);
 if(!marks)return;
 const sx=c.width/w,sy=c.height/h;
 g.font='bold '+Math.round(2.9*sx)+'px system-ui';g.fillStyle='#66f3e1';g.strokeStyle='#66f3e1';g.lineWidth=Math.max(1,sx*.18);
 for(const [id,[x,y]] of Object.entries(img.landmarks))g.fillText(id,(x+1.4)*sx,(y-1.0)*sy);
 g.strokeRect(s.x*sx,s.y*sy,sx,sy);
 // 10 pixels × 2.5 invented nm/pixel = 25 nm; sample centers are at pixel-grid indices.
 g.beginPath();g.moveTo(sx*3,sy*51);g.lineTo(sx*13,sy*51);g.stroke();g.fillText('25 nm',sx*3,sy*49.8);
}
function sync(){
 el('image').value=s.index;el('low').value=s.low;el('high').value=s.high;el('x').value=s.x;el('y').value=s.y;
 el('next').disabled=el('export').disabled=!data;
 if(!data)return;
 const q=inspect(data,s),p=q.point;
 el('summary').textContent=q.imageId+' · '+q.orientation+' · A–B '+q.landmarkSeparationNm+' nm · orientation determinant '+q.orientationDeterminantPx2+' px².';
 el('pixel').textContent='Raw pixel '+p.pixelIndex+' at ('+p.column+', '+p.row+') · ('+p.centerNm.join(', ')+') nm · '+p.rawADU+' ADU before contrast.';
 draw(el('raster'));repaint();
}
for(const k of ['next','reset'])el(k).onclick=()=>act(k);
el('image').onchange=e=>act('image',+e.currentTarget.value);
for(const k of ['low','high'])el(k).onchange=()=>act('window',[el('low').valueAsNumber,el('high').valueAsNumber]);
for(const k of ['x','y'])el(k).onchange=e=>act('pixel',{[k]:e.currentTarget.valueAsNumber});
el('raster').onclick=e=>{const b=el('raster').getBoundingClientRect();act('pixel',{x:Math.floor(56*(e.clientX-b.left)/b.width),y:Math.floor(56*(e.clientY-b.top)/b.height)});};
el('export').onclick=()=>{
 if(!data)return;const q=inspect(data,s),u=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=q.imageId+'-synthetic-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.025,22),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Dormant Glacios 2 cabinet with a separate read-only image exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.55;ctr.maxDistance=9;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(6,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'glacios2.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=raster.height=336;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.412,.412),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.31)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))act(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=[s.index,s.x,s.y,s.low,s.high].join('/');if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[3.2,2.37,4.95],[-.11,1.04,.025]],front:[[.45,1.27,4.65],[.45,1.13,.01]],archive:[[-1.11,1.46,1.45],[-1.06,1.18,.21]],side:[[3.9,1.85,1.13],[.43,1.09,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 app.querySelectorAll('[data-ga-view]').forEach(x=>x.onclick=()=>pose(x.dataset.gaView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
loadFixture().then(f=>{data=f;status('Loaded two preauthored synthetic rasters.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The 2D archive remains separate.';el('view').hidden=true;});
