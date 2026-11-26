import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import {OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('cb-'+k);
async function boot(){
 const {station,act,inspect,witness:w}=await window.cbSection;let s=station(),data,texture;const c=$('diagram'),g=c.getContext('2d');
 const px=x=>64+x*4,py=y=>360-y*4;
 function draw(){
  data=inspect(s);g.fillStyle='#152528';g.fillRect(0,0,608,406);g.fillStyle=s.selected==='body'?'#5b8582':'#3a5856';g.fillRect(px(0),py(w.heightUm),w.widthUm*4,w.heightUm*4);g.strokeStyle='#b9dbd5';g.lineWidth=s.selected==='body'?4:1.4;g.strokeRect(px(0),py(w.heightUm),w.widthUm*4,w.heightUm*4);
  g.fillStyle='#152528';g.strokeStyle=s.selected==='void'?'#f0ddaf':'#adc7b7';g.lineWidth=s.selected==='void'?4:1.5;g.beginPath();g.arc(px(w.voidCenterUm[0]),py(w.voidCenterUm[1]),w.voidRadiusUm*4,0,2*Math.PI);g.fill();g.stroke();
  const[a,b]=w.markedStartUm,[d,e]=w.markedEndUm;g.strokeStyle=s.selected==='diagonal'?'#f5dc9b':'#e3c695';g.lineWidth=s.selected==='diagonal'?4:1.6;g.beginPath();g.moveTo(px(a),py(b));g.lineTo(px(d),py(e));g.stroke();
  for(const[x,y]of[[a,b],[d,e]]){g.fillStyle='#f6dba2';g.beginPath();g.arc(px(x),py(y),4,0,2*Math.PI);g.fill()}
  g.fillStyle='#eee2c4';g.font='15px sans-serif';g.fillText('Synthetic · fixed XY diagram',64,29);g.fillText('P0',px(a)+7,py(b)+17);g.fillText('P1',px(d)+8,py(e)+3);
  g.fillRect(64,382,w.barUm*4,3);g.fillText(w.barUm+' µm',170,389);g.fillText('Origin · lower left',413,388);
  const n=data.void,h=data.diagonal;
  $('result').textContent={body:'120 × 80 µm · Gross area 9,600 µm² · Net area '+data.netAreaUm2.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' µm²',void:'Circular void '+n.diameterUm+' µm across · '+n.percent.toFixed(3)+'% of outer area',diagonal:'P0 → P1: '+h.lengthUm+' µm · Δx = '+h.deltaUm[0]+' µm · Δy = '+h.deltaUm[1]+' µm'}[s.selected];
  for(const k of ['body','void','diagonal'])$(k).setAttribute('aria-pressed',String(k===s.selected));if(texture)texture.needsUpdate=true;
 }
 function choose(k){s=act(s,'inspect',k);draw()}
 for(const k of ['body','void','diagonal'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='crossbeam550-inert-section.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};draw();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the locked diagram is still available.';return}
 r.setClearColor(0x283a3e);r.setPixelRatio(Math.min(1.5,devicePixelRatio));el.appendChild(r.domElement);
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.015,55),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.22;orb.maxDistance=9;
 scene.add(new T.HemisphereLight(0xfff2dd,0x829ca3,2.2));const sun=new T.DirectionalLight(0xffefdc,2.6);sun.position.set(-4,5,4);scene.add(sun);const grid=new T.GridHelper(5,25,0x539088,0x3a565b);grid.position.y=-.003;scene.add(grid);
 function go(k){const a={front:[[-1.23,1.64,3.10],[.30,.81,0]],rear:[[1.65,1.67,-2.62],[0,.78,0]],panel:[[.86,1.20,1.65],[.851,1.10,.55]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','panel'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/13-02/crossbeam550.glb',({scene:model})=>{
  scene.add(model);const base=model.getObjectByName('INSPECTOR_SCREEN');texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(.452,.302),new T.MeshBasicMaterial({map:texture}));mesh.position.z=.00235;base.add(mesh);
  el.dataset.ready='true';$('status').textContent='Metric case loaded. The disconnected panel shows the same locked diagram.';let p;
  r.domElement.onpointerdown=e=>p=[e.clientX,e.clientY];
  r.domElement.onpointerup=e=>{if(!p||Math.hypot(e.clientX-p[0],e.clientY-p[1])>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let j=hit?.object;j;j=j.parent){const m=j.name.match(/^(?:INSPECT|BTN)_(BODY|VOID|DIAGONAL)$/);if(m){choose(m[1].toLowerCase());return}}};
 },undefined,()=>{$('status').textContent='3D model unavailable; the locked diagram is still available.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
