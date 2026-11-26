import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('pp-'+k);
async function boot(){
 const{station,inspect,act,gauge}=await window.poliWitness;let s=station(),data,texture;const c=$('chart'),g=c.getContext('2d'),x=u=>280+u*7,y=v=>230-v*7;
 function paint(){data=inspect(s);g.fillStyle='#17282c';g.fillRect(0,0,620,412);g.font='18px sans-serif';g.fillStyle='#dfdcc7';g.fillText('Detached inert chart · true XY aspect',60,29);
 const discs=[[gauge.outerMm,'#507b72'],[gauge.innerMm,'#17282c']];for(const[r,col]of discs){g.fillStyle=col;g.strokeStyle='#a0bcb2';g.lineWidth=1.6;g.beginPath();g.arc(x(0),y(0),r*7,0,2*Math.PI);g.fill();g.stroke()}
 g.strokeStyle='#738985';g.beginPath();g.moveTo(x(-21),y(0));g.lineTo(x(21),y(0));g.moveTo(x(0),y(-21));g.lineTo(x(0),y(22));g.stroke();
 Object.entries(gauge.marks).forEach(([k,[a,b]],i)=>{g.fillStyle=k===s.mark?'#ffd37b':'#d2e5de';g.beginPath();g.arc(x(a),y(b),k===s.mark?6:4,0,2*Math.PI);g.fill();g.fillText(k,x(a)+12+i*23,y(b)+20)});
 g.fillStyle='#e7dbc0';g.fillRect(61,386,70,3);g.fillText('10 mm',142,394);g.fillText('Annulus: 10 ≤ radius ≤ 18 mm',315,393);
 $('result').textContent=data.selected+' · radius '+data.radiusMm+' mm · '+data.class+' · signed edge margin '+data.signedClearanceMm+' mm';
 for(const k of ['M1','M2','M3'])$(k).setAttribute('aria-pressed',String(k===s.mark));if(texture)texture.needsUpdate=true;}
 function choose(k){s=act(s,'mark',k);paint()}for(const k of ['M1','M2','M3'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='poli500-inert-inspection.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the detached chart still works.';return}
 r.setClearColor(0x273a3e);r.setPixelRatio(Math.min(1.5,devicePixelRatio));el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.016,50),o=new OrbitControls(cam,r.domElement);o.minDistance=.25;o.maxDistance=8;scene.add(new T.HemisphereLight(0xfff8e7,0x819b9e,2.15));const sun=new T.DirectionalLight(0xfff2da,2.5);sun.position.set(-3,4,3);scene.add(sun);const grid=new T.GridHelper(5,25,0x587d7e,0x3f575c);grid.position.y=-.002;scene.add(grid);
 function go(k){const a={front:[[-1.35,1.86,3.45],[.25,.93,.03]],rear:[[1.86,1.78,-2.9],[0,.97,0]],viewer:[[.883,1.16,1.60],[.893,1.03,.48]]}[k];cam.position.set(...a[0]);o.target.set(...a[1]);o.update()}go('front');for(const k of ['front','rear','viewer'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/04-09/poli500.glb',({scene:model})=>{
  scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const tex=new T.Mesh(new T.PlaneGeometry(.463,.3075),new T.MeshBasicMaterial({map:texture}));tex.position.z=.0023;model.getObjectByName('CHART_SCREEN').add(tex);
  el.dataset.ready='true';$('status').textContent='Dormant metric cabinet loaded. Only the detached chart is interactive.';let down;
  r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!down||Math.hypot(down[0]-e.clientX,down[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const m=q.name.match(/^(?:LEGEND_)?MARK_([1-3])$/);if(m){choose('M'+m[1]);return}}};
 },undefined,()=>{$('status').textContent='Metric cabinet unavailable; chart unaffected.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
