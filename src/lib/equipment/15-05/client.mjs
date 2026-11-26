import*as T from'three';
import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=key=>document.getElementById('bp-'+key);
async function boot(){
 const {station,act,read,PLANES,PHANTOM}=await window.biospecCard;
 let s=station(),v,texture;
 const c=$('plot'),g=c.getContext('2d'),W=c.width,H=c.height;
 function line(x1,y1,x2,y2,color,width){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
 function paint(){
  v=read(s);g.fillStyle='#192b30';g.fillRect(0,0,W,H);g.fillStyle='#f1e4ca';g.font='22px system-ui';g.fillText('Authored geometric views  /  '+v.picture,20,35);
  for(const [p,{pair,normal}] of PLANES.entries()){
   const view=v.projections[p], paneX=9+252*p, span=PHANTOM.shapeIJK.map((n,k)=>n*PHANTOM.stepMm[k]), q=7.25;
   const width=span[pair[0]]*q,height=span[pair[1]]*q,x0=paneX+(240-width)/2,y0=236-height;
   g.fillStyle='#263c43';g.fillRect(paneX,55,244,246);g.fillStyle='#2e535a';g.fillRect(x0,y0,width,height);
   for(let i=0;i<=PHANTOM.shapeIJK[pair[0]];i++)line(x0+i*PHANTOM.stepMm[pair[0]]*q,y0,x0+i*PHANTOM.stepMm[pair[0]]*q,y0+height,'#467278',.5);
   for(let i=0;i<=PHANTOM.shapeIJK[pair[1]];i++)line(x0,y0+i*PHANTOM.stepMm[pair[1]]*q,x0+width,y0+i*PHANTOM.stepMm[pair[1]]*q,'#467278',.5);
   g.fillStyle='#b0c8bd';g.font='17px system-ui';g.fillText(view.id+' · '+('XYZ'[normal])+'='+view.fixedSliceMm+' mm',paneX+12,79);
   g.fillText('+'+view.id[0]+' →  /  +'+view.id[1]+' ↑',paneX+14,282);
   if(view.fiducialIndex){const x=x0+(view.fiducialIndex[0]+.5)*PHANTOM.stepMm[pair[0]]*q,y=y0+height-(view.fiducialIndex[1]+.5)*PHANTOM.stepMm[pair[1]]*q;
    line(x-7,y,x+7,y,'#ffd589',2);line(x,y-7,x,y+7,'#ffd589',2);g.fillStyle='#ffd589';g.font='16px system-ui';g.fillText(v.fiducial.id,x+9,y-4);}
  }
  line(22,328,22+5*7.25,328,'#f1e4ca',2);g.fillStyle='#f1e4ca';g.font='15px system-ui';g.fillText('5 mm',67,332);g.fillText('Common physical scale · no acquisition',434,332);
  $('result').textContent=v.fiducial?v.fiducial.id+' at ('+v.fiducial.xyzMm.join(', ')+') mm · '+v.distanceFromAMm.toFixed(3)+' mm from A':'U · valid corner at ('+v.sliceIntersectionMm.join(', ')+') mm, no fiducial';
  for(const k of ['A','B','U'])$(k).setAttribute('aria-pressed',String(k===s.picture));if(texture)texture.needsUpdate=true;
 }
 function choose(k){s=act(s,'picture',k);paint()}
 for(const k of ['A','B','U'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='authored-orthographic-card.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the detached geometry card still works.';return}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setClearColor(0x2c3d45);el.appendChild(r.domElement);
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.025,45),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.30;orb.maxDistance=13;
 scene.add(new T.HemisphereLight(0xf1f1e9,0x839894,2.2));const sun=new T.DirectionalLight(0xffedcb,2.6);sun.position.set(-2,4,5);scene.add(sun);const ground=new T.GridHelper(6,24,0x638481,0x465d62);ground.position.y=-.003;scene.add(ground);
 const poses={front:[[1.76,2.12,4.80],[.43,.98,.02]],bore:[[-.30,1.14,2.07],[0,.985,.82]],rear:[[2.36,2.26,-3.89],[.08,1,.06]],card:[[1.46,1.69,1.62],[1.24,1.11,.20]]};
 function frame(k){let [p,t]=poses[k];cam.position.set(...p);orb.target.set(...t);orb.update()}
 frame('front');for(const k of Object.keys(poses))$(k).onclick=()=>frame(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/15-05/biospec-closed.glb',({scene:model})=>{
  scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const pic=new T.Mesh(new T.PlaneGeometry(.575,.266),new T.MeshBasicMaterial({map:texture}));pic.position.z=.005;model.getObjectByName('CHART_FACE').add(pic);
  el.dataset.ready='true';$('status').textContent='Metric shell loaded. The device is non-operating; only the separate card has selectable views.';
  let start;r.domElement.onpointerdown=e=>start=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{
   if(!start||Math.hypot(start[0]-e.clientX,start[1]-e.clientY)>5)return;
   const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);
   const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const m=q.name.match(/^(?:TAG_)?FRAME_([ABU])$/);if(m){choose(m[1]);return}}
  };
 },undefined,()=>{$('status').textContent='3D asset unavailable; the geometry card is still usable.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
