import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const src='/equipment/13-15/';
const {initial,act,load,select}=await import(/* @vite-ignore */new URL(src+'solver.mjs',location.origin).href);
const top=document.querySelector('#sky15'),el=k=>top.querySelector('#sky-'+k),mm=n=>Number(n.toFixed(4));
let data=null,s=initial(),repaint=()=>{};
const status=(m,err=false)=>{el('status').textContent=m;el('status').dataset.error=String(err);};
function dispatch(a,v){if(!data)return;const next=act(data,s,a,v);s=next.state;status(next.message,!next.ok);sync();}
function draw(c){
 if(!data)return;
 const [w,h]=data.metadata.shapeVox,g=c.getContext('2d'),p=data.planes.get(s.index),q=select(data,s.index),slot=document.createElement('canvas');slot.width=w;slot.height=h;
 g.fillStyle='#223743';g.fillRect(0,0,c.width,c.height);
 if(!p){g.fillStyle='#ffe4ac';g.font='bold '+Math.round(c.width*.055)+'px system-ui';g.textAlign='center';g.fillText('MISSING SAVED PLANE',c.width/2,c.height/2);g.textAlign='start';return;}
 const v=slot.getContext('2d'),d=v.createImageData(w,h),palette=[[38,52,63,255],[131,210,206,255],[239,192,110,255]];
 for(let i=0;i<p.labels.length;i++)d.data.set(palette[p.labels[i]],i*4);
 v.putImageData(d,0,0);g.imageSmoothingEnabled=false;g.drawImage(slot,0,0,c.width,c.height);
 const sx=c.width/w,sy=c.height/h,to=b=>[(b.centroidIndex[0]+.5)*sx,(b.centroidIndex[1]+.5)*sy];
 g.fillStyle=g.strokeStyle='#fff4da';g.lineWidth=Math.max(1,sx*.18);g.font='bold '+Math.round(2.5*sx)+'px system-ui';
 if(q.beads.length===2){const [a,b]=q.beads.map(to);g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();}
 for(const b of q.beads){const [x,y]=to(b);g.beginPath();g.arc(x,y,.48*sx,0,Math.PI*2);g.fill();g.fillText(b.id,x+1.2*sx,y-1.5*sy);}
 g.beginPath();g.moveTo(sx*3,sy*39);g.lineTo(sx*13,sy*39);g.stroke();g.fillText('1 mm',sx*3,sy*37.8);
}
function sync(){
 el('index').value=s.index;el('index-value').textContent=s.index;el('export').disabled=el('next').disabled=!data;
 if(!data)return;
 const q=select(data,s.index);
 el('plane').textContent=(q.sliceId??'No stored slice ID')+' · Z = '+mm(q.zMm)+' mm · coverage: '+q.coverage;
 el('result').textContent=q.distanceMm===null?'Center separation unavailable.':q.beads.map(b=>b.id+' ('+b.centroidMm.slice(0,2).map(mm).join(', ')+') mm').join(' · ')+' · center separation '+mm(q.distanceMm)+' mm.';
 draw(el('raster'));repaint();
}
for(const a of ['next','reset'])el(a).onclick=()=>dispatch(a);
el('index').oninput=e=>dispatch('select',e.currentTarget.valueAsNumber);
el('missing').onclick=()=>dispatch('select',6);
el('export').onclick=()=>{
 if(!data)return;const q=select(data,s.index),u=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=(q.sliceId??'CT-TOY-Z06-MISSING')+'-inert-ruler.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
async function viewer(){
 const host=el('view'),sc=new T.Scene(),cam=new T.PerspectiveCamera(41,1,.016,15),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));sc.background=new T.Color('#263949');host.append(r.domElement);
 r.domElement.setAttribute('aria-label','Dormant SkyScan 1272 with a detached inert slice exhibit.');
 const ctr=new OrbitControls(cam,r.domElement),draw3=()=>r.render(sc,cam);
 ctr.minDistance=.31;ctr.maxDistance=6;ctr.addEventListener('change',draw3);
 sc.add(new T.HemisphereLight(0xffffff,0x98a3aa,2.3));
 for(const [a,i] of [[[1.5,4,4],2.4],[[-3,3,-2],1.5]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(a);sc.add(l);}
 const grid=new T.GridHelper(4,24,0x748c99,0x536977);grid.position.y=-.004;sc.add(grid);
 const [asset,m]=await Promise.all([new GLTFLoader().loadAsync(src+'skyscan1272.glb'),fetch(src+'interaction.json').then(r=>r.json())]);
 sc.add(asset.scene);const get=n=>{const a=[];asset.scene.traverse(x=>{if(x.name===n)a.push(x);});if(a.length!==1)throw Error('Invalid model binding: '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);
 const a=m.actions[0],panel=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));sc.add(proxy);panel.getWorldPosition(proxy.position);
 const raster=document.createElement('canvas');raster.width=384;raster.height=352;
 const tex=new T.CanvasTexture(raster);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.NearestFilter;
 const display=new T.Mesh(new T.PlaneGeometry(.263,.241),new T.MeshBasicMaterial({map:tex}));display.position.z=.008;panel.add(display);
 const rc=new T.Raycaster(),xy=new T.Vector2();let down=null,tag='';
 function hit(e){if(cam.position.z<.19)return false;const b=r.domElement.getBoundingClientRect();xy.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);rc.setFromCamera(xy,cam);return Boolean(rc.intersectObject(proxy)[0]);}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))dispatch(a.action);down=null;};
 r.domElement.onpointermove=e=>{const yes=hit(e);r.domElement.style.cursor=yes?'pointer':'grab';r.domElement.title=yes?a.label:'Orbit the dormant cabinet';};
 repaint=()=>{const k=String(s.index);if(k!==tag&&data){draw(raster);tex.needsUpdate=true;tag=k;}draw3();};
 const poses={orbit:[[1.27,.91,2.79],[-.08,.21,.02]],front:[[.32,.48,1.81],[.32,.19,.01]],archive:[[-.88,.45,1.03],[-.88,.295,.13]],side:[[1.91,.63,.90],[.31,.19,0]]};
 const pose=k=>{cam.position.fromArray(poses[k][0]);ctr.target.fromArray(poses[k][1]);ctr.update();draw3();};
 top.querySelectorAll('[data-sky-view]').forEach(x=>x.onclick=()=>pose(x.dataset.skyView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw3();}}).observe(host);
 pose('orbit');repaint();el('model').textContent='Metric GLB loaded · Dormant enclosure and detached archive';el('model').dataset.loaded='true';
}
sync();
load().then(f=>{data=f;status('Ready: center plane of the fixed inert exhibit.');sync();}).catch(e=>status(e.message,true));
viewer().catch(e=>{el('model').textContent='3D unavailable: '+e.message+'. The read-only slice remains separate.';el('view').hidden=true;});
