import*as T from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('i3-'+k);
async function boot(){
 const{station,act,read}=await window.i3Graphic;let s=station(),v,texture;const c=$('plot'),g=c.getContext('2d');
 function paint(){v=read(s);g.fillStyle='#152a2e';g.fillRect(0,0,608,380);g.font='17px sans-serif';g.fillStyle='#e9dfc7';g.fillText('Abstract intensity card · arbitrary units',61,29);
 for(let j=0;j<=5;j++){const y=314-47*j;g.strokeStyle='#456163';g.lineWidth=.9;g.beginPath();g.moveTo(73,y);g.lineTo(544,y);g.stroke();g.fillStyle='#c7d3c8';g.fillText(String(j*10),36,y+6)}
 g.fillStyle='#decdb0';g.fillText('Display ceiling 50 · visually capped only',75,358);
 if(v.present){v.displayAu.forEach((q,i)=>{let x=106+110*i,y=314-q*4.7,above=v.authoredAu[i]>v.axisCeilingAu;g.fillStyle=above?'#cc976b':'#80ad9f';g.fillRect(x,y,63,314-y);g.fillStyle=above?'#ffc995':'#e9e0c5';g.fillText(String(v.authoredAu[i])+(above?' ↟':''),x+15,y-8);g.fillText(String(i+1),x+25,335)})}else{g.fillStyle='#e3d7b7';g.font='22px sans-serif';g.fillText('Source card not supplied',162,200)}
 $('result').textContent=v.present?v.tag+' · source mean '+v.meanAuthoredAu.toFixed(2)+' a.u. · '+v.aboveDisplayCount+' above display scale':v.tag+' · source absent · no intensity estimates';
 for(const k of ['A','B','U'])$(k).setAttribute('aria-pressed',String(s.tag===k));if(texture)texture.needsUpdate=true;}
 function choose(k){s=act(s,'read',k);paint()}for(const k of ['A','B','U'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='generic-intensity-card.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the abstract chart still works.';return}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setClearColor(0x2a4147);el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.006,26),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.12;orb.maxDistance=7;
 scene.add(new T.HemisphereLight(0xfff4e6,0x8aa3a8,2.22));const light=new T.DirectionalLight(0xffedd8,2.6);light.position.set(-3,4,4);scene.add(light);const grid=new T.GridHelper(2.6,26,0x5f7d7c,0x425f65);grid.position.y=-.002;scene.add(grid);
 function go(k){const a={front:[[.87,.62,1.43],[.12,.161,.04]],rear:[[.68,.51,-1.16],[-.091,.16,.02]],chart:[[.364,.329,.802],[.365,.24,.189]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','chart'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/07-11/spectramax-i3x.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const surface=new T.Mesh(new T.PlaneGeometry(.272,.170),new T.MeshBasicMaterial({map:texture}));surface.position.z=.0019;model.getObjectByName('CHART_SCREEN').add(surface);el.dataset.ready='true';$('status').textContent='Dormant closed model loaded. The chart viewer is physically separate.';
 let s0;r.domElement.onpointerdown=e=>s0=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!s0||Math.hypot(s0[0]-e.clientX,s0[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const m=q.name.match(/^(?:TAG_)?PICK_([ABU])$/);if(m){choose(m[1]);return}}};
 },undefined,()=>{$('status').textContent='Geometry unavailable; chart unaffected.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
