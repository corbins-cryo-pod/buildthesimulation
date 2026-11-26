import*as T from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('bx-'+k);
async function boot(){
 const{station,read,act,card}=await window.bxRuler;let s=station(),out,texture;const c=$('chart'),g=c.getContext('2d'),px=x=>57+39*x;
 function paint(){
  out=read(s);g.fillStyle='#192c2e';g.fillRect(0,0,620,330);g.fillStyle='#e6dbc8';g.font='19px sans-serif';g.fillText('Generic signed ruler · fixed ticks',58,51);g.strokeStyle='#879e97';g.lineWidth=2;g.beginPath();g.moveTo(px(0),171);g.lineTo(px(13),171);g.stroke();
  for(let i=0;i<=13;i++){const v=(i-card.originTick)*card.tickPitchMm;g.strokeStyle=i===card.originTick?'#f2e5c4':'#8ca8a3';g.beginPath();g.moveTo(px(i),171);g.lineTo(px(i),i===card.originTick?201:187);g.stroke();if(i%2===0){g.fillStyle='#d8e4d8';g.fillText(String(v),px(i)-9,224)}}
  for(const[k,i]of Object.entries(card.marks)){g.fillStyle=s.mark===k?'#fccd78':'#a9d7d2';g.beginPath();g.moveTo(px(i),162);g.lineTo(px(i)-8,143);g.lineTo(px(i)+8,143);g.fill();g.fillText(k,px(i)-6,128)}
  g.fillStyle='#e9dcb9';g.fillText('2 mm per tick · 0 at index 6',57,284);g.fillText('+X right',461,284);
  $('result').textContent=out.selected+' · x = '+out.coordinateMm+' mm · |x| = '+out.distanceFromOriginMm+' mm · L↔R = '+out.intermarkDistanceMm+' mm';for(const k of ['L','R'])$(k).setAttribute('aria-pressed',String(s.mark===k));if(texture)texture.needsUpdate=true;
 }
 function choose(k){s=act(s,'read',k);paint()}for(const k of ['L','R'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='generic-ruler-readout.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable. The independent ruler is still readable.';return}
 r.setClearColor(0x2d3e42);r.setPixelRatio(Math.min(devicePixelRatio,1.5));el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.004,22),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.085;orb.maxDistance=5;scene.add(new T.HemisphereLight(0xfff7e7,0x849da4,2.3));const sun=new T.DirectionalLight(0xffedd6,2.7);sun.position.set(-3,4,4);scene.add(sun);const grid=new T.GridHelper(2.7,27,0x587677,0x425d62);grid.position.y=-.002;scene.add(grid);
 function go(k){const a={front:[[.84,.72,1.73],[.19,.223,.044]],rear:[[.82,.73,-1.37],[0,.25,0]],ruler:[[.65,.32,.827],[.632,.225,.16]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','ruler'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/06-02/bio-x6-gen3.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const tex=new T.Mesh(new T.PlaneGeometry(.291,.1549),new T.MeshBasicMaterial({map:texture}));tex.position.z=.0024;model.getObjectByName('RULER_SCREEN').add(tex);el.dataset.ready='true';$('status').textContent='Closed documentary model loaded. Only the disconnected ruler is interactive.';
 let start;r.domElement.onpointerdown=e=>start=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!start||Math.hypot(start[0]-e.clientX,start[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){let id=q.name.replace(/^TAG_/,'');if(id==='CARD_LEFT'||id==='CARD_RIGHT'){choose(id==='CARD_LEFT'?'L':'R');return}}};},undefined,()=>{$('status').textContent='3D shell unavailable; printed ruler remains readable.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
