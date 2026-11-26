import*as T from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('di-'+k);
async function boot(){
 const{station,act,read}=await window.doricChart;let s=station(),v,texture;const c=$('chart'),g=c.getContext('2d');
 function shape(k,x,y){g.beginPath();if(k==='circle')g.arc(x,y,24,0,2*Math.PI);else if(k==='square')g.rect(x-24,y-24,48,48);else{g.moveTo(x,y-29);g.lineTo(x-26,y+20);g.lineTo(x+26,y+20);g.closePath()}g.fill()}
 function paint(){v=read(s);g.fillStyle='#172b2d';g.fillRect(0,0,600,310);g.font='19px sans-serif';g.fillStyle='#f0e0c3';g.fillText('Reference legend',54,38);g.fillText('Selected tile · '+v.id,54,170);
 v.legend.forEach((q,i)=>{const x=141+i*150;g.fillStyle='#a2b5a5';shape(q,x,86);g.fillStyle='#d5d8c0';g.fillText(q,x-27,128)});
 if(v.shapes){v.shapes.forEach((q,i)=>{const x=141+i*150;g.fillStyle=v.duplicates.includes(q)?'#d39b6a':'#7cc0ae';shape(q,x,225);g.fillStyle='#e5dbc4';g.fillText(q,x-27,267)})}
 else{g.fillStyle='#caccb3';g.fillText('Tile not supplied',230,222)}
 $('result').textContent=v.matches===null?'U · no tile supplied · result unknown':v.matches?'A · all three shapes match; order does not matter':'B · missing '+v.missing.join(', ')+' · duplicate '+v.duplicates.join(', ');
 for(const k of ['A','B','U'])$(k).setAttribute('aria-pressed',String(s.id===k));if(texture)texture.needsUpdate=true;}
 function choose(k){s=act(s,'read',k);paint()}for(const k of ['A','B','U'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='generic-symbol-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable. The separate tile viewer still works.';return}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setClearColor(0x2a3d42);el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,1,.002,9),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.019;orb.maxDistance=4;
 scene.add(new T.HemisphereLight(0xfff4e7,0x849c9e,2.23));const light=new T.DirectionalLight(0xffecd5,2.53);light.position.set(-1.2,2,2.3);scene.add(light);const grid=new T.GridHelper(.85,17,0x68817e,0x465c60);grid.position.y=-.001;scene.add(grid);
 function go(k){const a={front:[[.186,.309,.567],[.05,.046,.01]],rear:[[-.22,.21,-.35],[-.041,.038,0]],module:[[.098,.099,.132],[.068,.013,.009]],tile:[[.177,.124,.321],[.178,.08,.055]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','module','tile'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/11-02/doric-closed.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const s0=new T.Mesh(new T.PlaneGeometry(.121,.0625),new T.MeshBasicMaterial({map:texture}));s0.position.z=.0023;model.getObjectByName('SYMBOL_SCREEN').add(s0);el.dataset.ready='true';$('status').textContent='Two dormant metric cases loaded. Only the separate shapes panel is interactive.';
 let down;r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!down||Math.hypot(down[0]-e.clientX,down[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const m=q.name.match(/^(?:TAG_)?SYMBOL_([ABU])$/);if(m){choose(m[1]);return}}};
 },undefined,()=>{$('status').textContent='Geometry unavailable; the tile viewer still works.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
