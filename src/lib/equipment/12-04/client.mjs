import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const path='/equipment/12-04/',url=new URL(path+'solver.mjs',location.origin).href;
const {initial,dispatch,loadPair,csv}=await import(/* @vite-ignore */url);
const app=document.querySelector('#leica12'),$=k=>app.querySelector('#le-'+k),n=(x,p=2)=>Number(x.toFixed(p)).toString();
let s=initial(),pair=null,draw3d=()=>{};
function status(t,e=false){$('status').textContent=t;$('status').dataset.error=String(e);}
function act(a,v,auto=false){const q=dispatch(s,pair,a,v);s=q.state;status(q.message,!q.ok);if(auto&&q.ok&&pair){const r=dispatch(s,pair,'run');s=r.state;status(r.message,!r.ok);}sync();}
for(const a of ['view','run','reset'])$(a).onclick=()=>act(a,undefined,a==='reset');
$('axis').onchange=e=>act('axis',e.currentTarget.value,true);
$('line').onchange=e=>act('line',e.currentTarget.valueAsNumber,true);
for(const k of ['wide','narrow'])$(k).onclick=e=>{
 const b=e.currentTarget.getBoundingClientRect(),v=s.axis==='x'?(e.clientY-b.top)/b.height:(e.clientX-b.left)/b.width;
 act('line',Math.max(0,Math.min(64,Math.floor(65*v))),true);
};
function save(b){
 if(!s.result)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([b?csv(s.result):JSON.stringify(s.result,null,2)],{type:b?'text/csv':'application/json'}));a.href=u;a.download='synthetic-psf-comparison.'+(b?'csv':'json');a.click();setTimeout(()=>URL.revokeObjectURL(u),800);
}
$('json').onclick=()=>save(false);$('csv').onclick=()=>save(true);
function renderImage(c,a,showLine){
 const g=c.getContext('2d'),w=c.width,h=c.height,slot=document.createElement('canvas');slot.width=slot.height=65;
 const ctx=slot.getContext('2d'),im=ctx.createImageData(65,65);
 for(let i=0;i<a.pixelsQ16.length;i++){const u=a.pixelsQ16[i]/65535;im.data[i*4]=12+218*u;im.data[i*4+1]=27+213*u;im.data[i*4+2]=37+202*u;im.data[i*4+3]=255;}
 ctx.putImageData(im,0,0);g.imageSmoothingEnabled=false;g.drawImage(slot,0,0,w,h);
 if(showLine!==false){
  const pos=(s.line+.5)/65;
  g.strokeStyle='#65ead0';g.lineWidth=Math.max(1,w/200);g.beginPath();
  if(s.axis==='x'){g.moveTo(0,pos*h);g.lineTo(w,pos*h);}else{g.moveTo(pos*w,0);g.lineTo(pos*w,h);}
  g.stroke();
 }
}
function sync(){
 $('axis').value=s.axis;$('line').value=s.line;$('run').disabled=!pair;$('json').disabled=$('csv').disabled=!s.result;
 $('view').textContent=s.visible==='wide'?'Show narrow image on 3D monitor':'Show broad image on 3D monitor';
 $('active').textContent='3D review monitor: '+(s.visible==='wide'?'broad':'narrow')+' synthetic image.';
 const r=s.result;$('result').textContent=r?'Broad '+n(r.wide.widthNm)+' nm · narrow '+n(r.narrow.widthNm)+' nm · difference '+n(r.deltaNm)+' nm · width ratio '+n(r.ratio)+'×.':'No valid comparison at this line.';
 if(pair)for(const k of ['wide','narrow'])renderImage($(k),pair[k],true);
 plot();draw3d();
}
function plot(){
 const c=$('plot'),g=c.getContext('2d'),w=c.width,h=c.height,l=63,r=w-24,t=47,b=h-60;
 g.fillStyle='#172d38';g.fillRect(0,0,w,h);g.fillStyle='#c5dae1';g.font='bold 21px sans-serif';g.fillText('NORMALIZED SYNTHETIC PROFILE',17,32);
 if(!s.result)return;
 const u=s.result,X=x=>l+(x+320)/640*(r-l),Y=v=>b-v*(b-t);
 g.font='15px sans-serif';g.strokeStyle='#526c75';g.lineWidth=1;
 for(let i=0;i<=4;i++){const x=X(-320+160*i),y=Y(i/4);g.beginPath();g.moveTo(x,t);g.lineTo(x,b);g.moveTo(l,y);g.lineTo(r,y);g.stroke();g.fillText(String(-320+160*i),x-9,b+21);g.fillText(n(i/4),14,y+5);}
 g.fillText('Along-line position (nm)',l,b+49);
 for(const [z,col] of [[u.wide,'#eeb278'],[u.narrow,'#75e1c8']]){
  g.lineWidth=2.4;g.strokeStyle=col;g.fillStyle=col;g.beginPath();z.samples.forEach((p,i)=>i?g.lineTo(X(p.xNm),Y(p.value)):g.moveTo(X(p.xNm),Y(p.value)));g.stroke();
  g.setLineDash([4,3]);g.beginPath();g.moveTo(X(z.leftNm),Y(z.threshold));g.lineTo(X(z.rightNm),Y(z.threshold));g.stroke();g.setLineDash([]);
  for(const k of [z.leftNm,z.rightNm]){g.beginPath();g.arc(X(k),Y(z.threshold),4.3,0,2*Math.PI);g.fill();}
 }
 g.fillStyle='#eeb278';g.fillText('Broad',w*.71,32);g.fillStyle='#75e1c8';g.fillText('Narrow',w*.83,32);
}
async function viewer(){
 const host=$('viewer'),scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.01,12),r=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(devicePixelRatio,1.6));scene.background=new T.Color('#243942');host.append(r.domElement);r.domElement.setAttribute('aria-label','Dormant Leica exterior. Only the generic monitor swaps synthetic references.');
 const orbit=new OrbitControls(cam,r.domElement),draw=()=>r.render(scene,cam);orbit.minDistance=.27;orbit.maxDistance=5;orbit.addEventListener('change',draw);
 scene.add(new T.HemisphereLight(0xffffff,0x778990,2.1));
 for(const [p,i] of [[[.7,1.3,1.5],2.45],[[-.8,.99,-.9],1.52]]){const l=new T.DirectionalLight(0xffffff,i);l.position.fromArray(p);scene.add(l);}
 const ground=new T.GridHelper(2.7,30,0x6d8b92,0x526a70);ground.position.y=-.004;scene.add(ground);
 const [g,m]=await Promise.all([new GLTFLoader().loadAsync(path+'stellaris8.glb'),fetch(path+'interaction.json').then(z=>z.json())]);scene.add(g.scene);
 const get=n=>{const a=[];g.scene.traverse(o=>{if(o.name===n)a.push(o)});if(a.length!==1)throw Error('Missing named model binding '+n);return a[0];};
 get(m.frame.placementAnchor);Object.values(m.parts).forEach(get);m.ports.forEach(get);
 const a=m.actions[0],tile=get(a.node),proxy=new T.Mesh(new T.BoxGeometry(...a.sizeM),new T.MeshBasicMaterial({visible:false}));scene.add(proxy);tile.getWorldPosition(proxy.position);
 const c=document.createElement('canvas');c.width=c.height=128;const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const picture=new T.Mesh(new T.PlaneGeometry(.133,.123),new T.MeshBasicMaterial({map:texture}));picture.position.z=.0036;tile.add(picture);
 const ray=new T.Raycaster(),v=new T.Vector2();let down=null,signature='';
 function hit(e){if(cam.position.z<.05)return false;const b=r.domElement.getBoundingClientRect();v.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);ray.setFromCamera(v,cam);return !!ray.intersectObject(proxy)[0];}
 r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];
 r.domElement.onpointerup=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&hit(e))act(a.action);down=null;};
 r.domElement.onpointermove=e=>{const q=hit(e);r.domElement.style.cursor=q?'pointer':'grab';r.domElement.title=q?a.label:'Orbit the dormant bench';};
 draw3d=()=>{const tag=[s.visible,s.line,s.axis].join('/');if(tag!==signature&&pair){renderImage(c,pair[s.visible]);texture.needsUpdate=true;signature=tag;}draw();};
 const poses={orbit:[[.96,.79,1.58],[0,.19,.04]],front:[[.04,.49,1.55],[0,.19,.07]],stand:[[.40,.54,.74],[0,.24,.10]],rear:[[.83,.63,-1.30],[-.03,.19,-.04]]};
 function pose(k){cam.position.fromArray(poses[k][0]);orbit.target.fromArray(poses[k][1]);orbit.update();draw();}
 app.querySelectorAll('[data-le-view]').forEach(b=>b.onclick=()=>pose(b.dataset.leView));
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();draw();}}).observe(host);
 pose('orbit');draw3d();$('model').textContent='Metric GLB loaded · Dormant exterior and original image review tile';$('model').dataset.loaded='true';
}
sync();
loadPair().then(value=>{pair=value;act('run');viewer().catch(e=>{$('model').textContent='3D unavailable: '+e.message+'. Image comparison still works.';$('viewer').style.display='none';});}).catch(e=>{$('model').textContent='Stored images could not be verified.';status(e.message,true);});
