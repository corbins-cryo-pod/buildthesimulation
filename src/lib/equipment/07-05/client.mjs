import*as T from'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('s3-'+k);
async function boot(){
 const{station,act,review,graphicInk,imageSpec}=await window.s3Graphic;let s=station(),v,texture;const c=$('chart'),g=c.getContext('2d'),px=x=>64+12*x,py=y=>45+12*y;
 function paint(){v=review(s);g.fillStyle='#172a2d';g.fillRect(0,0,608,400);g.font='17px sans-serif';g.fillStyle='#efe0c2';g.fillText('Original printed graphic · image coordinates',64,28);
 for(let y=0;y<imageSpec.height;y++)for(let x=0;x<imageSpec.width;x++){g.fillStyle=graphicInk(x,y)?'#80cdb6':(x+y)%2===0?'#35494a':'#364c4d';g.fillRect(px(x),py(y),12,12)}
 const[a,b,d,e]=v.regionBoundsPx;g.lineWidth=3;g.strokeStyle=v.maskStatus==='present'?'#f1ba68':'#f1dcb8';g.setLineDash(v.maskStatus==='present'?[]:[9,5]);g.strokeRect(px(a),py(b),12*(d-a),12*(e-b));g.setLineDash([]);
 g.fillStyle='#f4dfbe';g.fillText('Region '+v.region+(v.maskStatus==='absent'?' · no reference mask':''),px(a)+8,py(b)-8);g.fillRect(64,369,48,3);g.fillText('1 mm / 4 px',122,377);g.fillText('Pixel origin at upper left',341,376);
 $('result').textContent=v.maskStatus==='present'?v.region+' · '+v.markedPixels+' / '+v.regionPixels+' pixels marked ('+(100*v.markedFraction).toFixed(2)+'%) · '+v.markedAreaMm2.toFixed(2)+' mm²':v.region+' · mask absent · result unknown (not zero)';
 for(const k of ['A','B','U'])$(k).setAttribute('aria-pressed',String(s.region===k));if(texture)texture.needsUpdate=true;}
 function choose(k){s=act(s,'review',k);paint()}for(const k of ['A','B','U'])$(k).onclick=()=>choose(k);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='static-graphic-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const el=$('view');let r;try{r=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable. The independent graphic viewer still works.';return}
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setClearColor(0x294045);el.appendChild(r.domElement);const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.008,30),orb=new OrbitControls(cam,r.domElement);orb.minDistance=.15;orb.maxDistance=7;
 scene.add(new T.HemisphereLight(0xfff6e7,0x829da4,2.25));const sun=new T.DirectionalLight(0xffeedb,2.65);sun.position.set(-3,4,4);scene.add(sun);const grid=new T.GridHelper(3,30,0x577977,0x425e62);grid.position.y=-.002;scene.add(grid);
 function go(k){const a={front:[[.26,.74,1.97],[.226,.163,0]],rear:[[.83,.68,-1.51],[.015,.148,.015]],graphic:[[.723,.346,.868],[.724,.24,.155]]}[k];cam.position.set(...a[0]);orb.target.set(...a[1]);orb.update()}go('front');for(const k of ['front','rear','graphic'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){r.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/07-05/incucyte-s3.glb',({scene:model})=>{scene.add(model);texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(.2888,.190),new T.MeshBasicMaterial({map:texture}));m.position.z=.0025;model.getObjectByName('INK_GAUGE_SCREEN').add(m);el.dataset.ready='true';$('status').textContent='Both dormant enclosures loaded. Only the disconnected graphic viewer is interactive.';
 let down;r.domElement.onpointerdown=e=>down=[e.clientX,e.clientY];r.domElement.onpointerup=e=>{if(!down||Math.hypot(down[0]-e.clientX,down[1]-e.clientY)>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);const hit=ray.intersectObject(model,true)[0];for(let q=hit?.object;q;q=q.parent){const m=q.name.match(/^(?:MARK_)?REVIEW_([ABU])$/);if(m){choose(m[1]);return}}};
 },undefined,()=>{$('status').textContent='Geometry unavailable; graphic review still works.'});r.setAnimationLoop(()=>r.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
