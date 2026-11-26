import * as T from 'three';import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';import {OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById('ls-'+id),colors=['#1c282c','#86e5c8','#e5ac6e','#b4a3ed'];
async function boot(){
 const{station,act,replay}=await window.lightReplay;let s=station(),out,texture;const canvas=$('plane-canvas'),g=canvas.getContext('2d');
 function draw(){out=replay(s);const[nx,ny,nz]=out.dimensions;g.fillStyle='#152229';g.fillRect(0,0,640,400);g.fillStyle=colors[0];g.fillRect(64,34,nx*8,ny*8);g.strokeStyle='#426269';g.strokeRect(63.5,33.5,nx*8+1,ny*8+1);
 out.labels.forEach((v,i)=>{if(v){g.fillStyle=colors[v];g.fillRect(64+(i%nx)*8,34+(ny-1-Math.floor(i/nx))*8,8,8)}});
 out.markers.forEach((m,i)=>{if(!m.litPixels)return;g.fillStyle=colors[i+1];g.font='18px sans-serif';g.fillText(m.id,64+m.voxel[0]*8-5,29+(ny-1-m.voxel[1])*8-20)});
 g.fillStyle='#eee0c1';g.fillRect(64,369,out.scaleBarPixels*8,3);g.font='16px sans-serif';g.fillText(out.scaleBarUm+' µm',236,376);g.fillText('XY · synthetic · '+out.zUm+' µm',395,376);
 $('plane').value=s.plane;$('plane').setAttribute('aria-valuetext',out.zUm+' micrometers');$('prev').disabled=out.planeIndex===0;$('next').disabled=out.planeIndex===nz-1;$('status').textContent='Plane '+(out.planeIndex+1)+' / '+nz+' · z = '+out.zUm+' µm';$('scale').textContent=out.separationUm!==null?'F1 ↔ F2: '+out.separationUm+' µm center spacing · '+out.markers[0].litPixels+' / '+out.markers[1].litPixels+' labeled pixels':'No F1/F2 pair in this plane.';if(texture)texture.needsUpdate=true;
 }
 function send(k,v){s=act(s,k,v);draw()}
 for(const k of ['prev','next','reset'])$(k).onclick=()=>send(k);$('plane').oninput=()=>send('plane',$('plane').valueAsNumber);
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='lightsheet7-inert-plane-'+out.planeIndex+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};draw();
 const el=$('view');let gl;try{gl=new T.WebGLRenderer({antialias:true})}catch{$('model').textContent='WebGL unavailable. Offline plane playback is still usable.';return}
 gl.setClearColor(0x29383b);gl.setPixelRatio(Math.min(devicePixelRatio,1.5));el.appendChild(gl.domElement);
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.006,30),orb=new OrbitControls(cam,gl.domElement);orb.minDistance=.12;orb.maxDistance=6;
 scene.add(new T.HemisphereLight(0xfff8ed,0x8299a1,2.15));const sun=new T.DirectionalLight(0xfff0da,2.55);sun.position.set(-2,3,4);scene.add(sun);const grid=new T.GridHelper(3,30,0x456268,0x3a5054);grid.position.y=-.003;scene.add(grid);
 function go(k){let x={front:[[-.59,.65,1.65],[.177,.235,0]],rear:[[-.49,.69,-1.28],[0,.24,0]],display:[[.68,.31,.64],[.666,.24,.02]]}[k];cam.position.set(...x[0]);orb.target.set(...x[1]);orb.update()}go('front');for(const k of ['front','rear','display'])$(k).onclick=()=>go(k);
 new ResizeObserver(()=>{if(el.clientWidth&&el.clientHeight){gl.setSize(el.clientWidth,el.clientHeight,false);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}}).observe(el);
 new GLTFLoader().load('/equipment/12-07/lightsheet7.glb',({scene:model})=>{scene.add(model);const dark=model.getObjectByName('REPLAY_SCREEN');texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const screen=new T.Mesh(new T.PlaneGeometry(.300,.1875),new T.MeshBasicMaterial({map:texture}));screen.position.z=.0019;dark.add(screen);
 el.dataset.ready='true';$('model').textContent='Metric model loaded. The disconnected display replays the same synthetic plane.';
 let start;gl.domElement.onpointerdown=e=>{start=[e.clientX,e.clientY]};gl.domElement.onpointerup=e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>4)return;const b=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);
 const hits=ray.intersectObject(model,true);for(const hit of hits){let u=hit.object;while(u){if(u.name==='REPLAY_PREV'||u.name==='REPLAY_PREV_TEXT'){send('prev');return}if(u.name==='REPLAY_NEXT'||u.name==='REPLAY_NEXT_TEXT'){send('next');return}u=u.parent}if(!hit.object.name.startsWith('REPLAY_'))break}
 };},undefined,()=>{$('model').textContent='3D asset unavailable; offline replay remains active.'});gl.setAnimationLoop(()=>gl.render(scene,cam));
}
boot().catch(e=>{$('status').textContent=e.message});
