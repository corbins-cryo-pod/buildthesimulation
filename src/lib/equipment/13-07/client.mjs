import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('uc-'+k);
async function boot(){
 const{station,measure,act,marks}=await window.ucBench;let s=station(),m,texture;const chart=$('chart'),g=chart.getContext('2d');
 function paint(){
  m=measure(s);const scale=1/m.umPerDisplayPx,x=q=>64+q*scale,y=q=>378-q*scale;g.fillStyle='#192b2d';g.fillRect(0,0,640,434);g.fillStyle='#dbded0';g.font='17px sans-serif';g.fillText('Fixed synthetic calibration card',62,23);
  for(let k=0;k<=80;k+=10){g.strokeStyle='#3f5959';g.lineWidth=1;g.beginPath();g.moveTo(x(k),y(0));g.lineTo(x(k),y(58));g.stroke()}
  for(let k=0;k<=50;k+=10){g.strokeStyle='#3f5959';g.beginPath();g.moveTo(x(0),y(k));g.lineTo(x(80),y(k));g.stroke()}
  for(const key of ['B','A'].sort((x,y)=>Number(x===s.pair)-Number(y===s.pair))){const active=s.pair===key,[[ax,ay],[bx,by]]=marks[key],labelColor=active?(key==='A'?'#f5d48e':'#84e2ca'):'#9caea3';g.strokeStyle=labelColor;g.fillStyle=labelColor;g.lineWidth=active?3:1.5;g.beginPath();g.moveTo(x(ax),y(ay));g.lineTo(x(bx),y(by));g.stroke();for(const [i,[a,b]]of marks[key].entries()){g.beginPath();g.arc(x(a),y(b),active?5:3,0,2*Math.PI);g.fill();g.fillText(key+(i+1),x(a)+6,y(b)+17)}}
  g.fillStyle='#e6dec3';g.fillRect(64,403,m.referenceBarDisplayPx,4);g.fillText('30 µm',74+m.referenceBarDisplayPx,413);g.fillText('Display zoom '+s.zoom.toFixed(1)+'×',422,413);
  $('zoom').textContent='Display zoom '+s.zoom.toFixed(1)+'×';$('result').textContent=m.pair+': '+m.distanceDisplayPx.toFixed(0)+' display px × '+m.umPerDisplayPx.toFixed(6)+' µm/px = '+m.distanceUm.toFixed(2)+' µm';for(const k of ['A','B'])$(k).setAttribute('aria-pressed',String(k===s.pair));if(texture)texture.needsUpdate=true;
 }
 function run(key,v){s=act(s,key,v);paint()}for(const k of ['A','B'])$(k).onclick=()=>run('pair',k);$('zoom').onclick=()=>run('zoom');
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(m,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='uc7-inert-gauge.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the synthetic gauge still works.';return}r.setClearColor(0x293939);r.setPixelRatio(Math.min(devicePixelRatio,1.5));el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,1,.002,12),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.04;orb.maxDistance=5;
 scene.add(new T.HemisphereLight(0xfff5e5,0x8ea3ac,2.3));const sun=new T.DirectionalLight(0xffeee0,2.55);sun.position.set(-1,2,2);scene.add(sun);const grid=new T.GridHelper(2.3,23,0x658084,0x496062);grid.position.y=-.002;scene.add(grid);
 function go(k){let v={front:[[.68,.68,1.05],[0,.199,0]],back:[[-.70,.61,-.93],[-.04,.21,0]],gauge:[[.423,.321,.58],[.405,.11,.113]]}[k];cam.position.set(...v[0]);orb.target.set(...v[1]);orb.update()}go('front');for(const k of ['front','back','gauge'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/13-07/leica-uc7.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(chart);texture.colorSpace=T.SRGBColorSpace;const screen=new T.Mesh(new T.PlaneGeometry(.177,.12),new T.MeshBasicMaterial({map:texture}));screen.position.z=.0013;model.getObjectByName('DRY_PAD_SCREEN').add(screen);el.dataset.ready='true';$('status').textContent='Exterior GLB loaded. The inert pad and browser controls share one chart.';let p;
  r.domElement.onpointerdown=e=>p=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!p||Math.hypot(p[0]-e.clientX,p[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let o=hit?.object;o;o=o.parent){const n=o.name.replace(/^TAG_/,'');if(n==='GAUGE_ZOOM'){run('zoom');return}if(n==='PAIR_A'||n==='PAIR_B'){run('pair',n.slice(-1));return}}};
 },undefined,()=>{$('status').textContent='Model unavailable; the synthetic chart still works.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
