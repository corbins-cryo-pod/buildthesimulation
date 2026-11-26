import*as T from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('cm-'+k);
async function boot(){
 const{station,act,inspect}=await window.cmCard;let s=station(),result,texture;const c=$('chart'),g=c.getContext('2d'),px=x=>83+x*6,py=y=>350-y*6;
 function paint(){result=inspect(s);g.fillStyle='#16272d';g.fillRect(0,0,570,380);g.strokeStyle='#446067';g.lineWidth=1;for(let y=0;y<=50;y+=10){g.beginPath();g.moveTo(px(0),py(y));g.lineTo(px(53),py(y));g.stroke()}for(let x=0;x<=50;x+=10){g.beginPath();g.moveTo(px(x),py(0));g.lineTo(px(x),py(50));g.stroke()}
 g.fillStyle='#eee2c9';g.font='16px sans-serif';g.fillText('Inert printed coordinate card',83,29);g.fillText('X / mm',468,370);g.fillText('Y / mm',13,51);
 const {xInterceptMm:i,slopeXPerY:a}=result.referenceLine;g.strokeStyle='#aaddc7';g.lineWidth=2;g.beginPath();g.moveTo(px(i),py(0));g.lineTo(px(i+a*50),py(50));g.stroke();
 for(const [k,[x,y]] of Object.entries(result.fixedMarksMm)){const z=s.label===k;g.fillStyle=z?'#f8c775':'#a9cdc4';g.beginPath();g.arc(px(x),py(y),z?7:4.5,0,2*Math.PI);g.fill();g.fillText(k+' ('+x+', '+y+')',px(x)+12,py(y)-6)}
 const[x,y]=result.selectedPositionMm;$('result').textContent=s.label+': ('+x+', '+y+') mm · P→Q: Δx = '+result.pToQ.deltaXMm+' mm, Δy = '+result.pToQ.deltaYMm+' mm, separation '+result.pToQ.distanceMm+' mm';
 for(const k of ['P','Q'])$(k).setAttribute('aria-pressed',String(k===s.label));if(texture)texture.needsUpdate=true;}
 function select(k){s=act(s,'select',k);paint()}for(const k of ['P','Q'])$(k).onclick=()=>select(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='cm3050-inert-card.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the coordinate card is still readable.';return}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setClearColor(0x2b3b3b);el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,1,.01,28),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.12;orb.maxDistance=7;scene.add(new T.HemisphereLight(0xffead4,0x84989c,2.2));const sun=new T.DirectionalLight(0xffeedb,2.6);sun.position.set(-3,4,3);scene.add(sun);const grid=new T.GridHelper(3,24,0x5e7f7d,0x425c60);grid.position.y=-.002;scene.add(grid);
 function go(k){const a={front:[[1.43,1.46,2.55],[.26,.50,.03]],rear:[[1.38,1.39,-2.10],[0,.54,0]],card:[[.79,.73,1.03],[.777,.56,.107]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','card'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/13-13/cm3050s.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const tex=new T.Mesh(new T.PlaneGeometry(.343,.2286),new T.MeshBasicMaterial({map:texture}));tex.position.z=.003;model.getObjectByName('READER_SCREEN').add(tex);el.dataset.ready='true';$('status').textContent='Closed metric cabinet loaded. The separate chart reader is interactive.';
 let start;r.domElement.onpointerdown=e=>start=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!start||Math.hypot(start[0]-e.clientX,start[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const k=q.name.match(/^(?:TAG_)?READ_(P|Q)$/);if(k){select(k[1]);return}}};},undefined,()=>{$('status').textContent='Model unavailable; the chart still works.'});
 r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
