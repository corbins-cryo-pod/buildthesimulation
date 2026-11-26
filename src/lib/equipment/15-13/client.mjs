import*as T from'three';
import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import{OrbitControls}from'three/addons/controls/OrbitControls.js';
const $=k=>document.getElementById('lf-'+k);
async function boot(){
 const{station,act,read,PARTS}=await window.locatorFit;let s=act(station(),'check'),v,blocks=null;
 const keys=Object.keys(PARTS),select=$('select'),margins=$('margins');
 const signed=x=>x>0?'+'+x:x<0?'−'+Math.abs(x):'0';
 function paint(){
  v=read(s);select.value=s.part;
  $('result').textContent=s.turnDeg+'° · '+(v.verdict==='not checked'?'not checked':v.verdict+' · '+signed(v.signedMinimumMm)+' mm minimum');
  margins.replaceChildren();
  const lines=v.verdict==='not checked'?[['Signed margins','—']]:[['Main ±X',signed(Math.min(v.bodyClearanceMm.negativeX,v.bodyClearanceMm.positiveX))],['Main ±Z',signed(Math.min(v.bodyClearanceMm.negativeZ,v.bodyClearanceMm.positiveZ))],['Key −Z / +Z',signed(v.keyClearanceMm.negativeZ)+' / '+signed(v.keyClearanceMm.positiveZ)],['Key left / right',signed(v.keyClearanceMm.left)+' / '+signed(v.keyClearanceMm.right)]];
  for(const entry of lines){const tr=document.createElement('tr');for(const [i,txt] of entry.entries()){const cell=document.createElement(i===0?'th':'td');if(!i)cell.scope='row';cell.textContent=txt;tr.append(cell)}margins.append(tr)}
  if(blocks)for(const [key,o] of Object.entries(blocks)){
   const active=key===s.part;if(active&&(!o.visible||!s.checked))o.position.y=.052;
   o.visible=active;o.rotation.y=s.turnDeg*Math.PI/180;
  }
 }
 function update(action,value){s=act(s,action,value);paint()}
 select.onchange=()=>update('select',select.value);$('rotate').onclick=()=>update('rotate');$('check').onclick=()=>update('check');
 $('reset').onclick=()=>{s=act(station(),'check');paint()};
 $('save').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='detached-locator-fit.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};paint();
 const view=$('view');let renderer;try{renderer=new T.WebGLRenderer({antialias:true})}catch{$('status').textContent='WebGL unavailable; the offline fit and export still work.';return}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x2c3e45);view.appendChild(renderer.domElement);
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(37,1,.002,10),orbit=new OrbitControls(cam,renderer.domElement);orbit.minDistance=.065;orbit.maxDistance=2;
 scene.add(new T.HemisphereLight(0xf0f3e7,0x85a19c,2.12));const sun=new T.DirectionalLight(0xffe4bf,2.9);sun.position.set(-.5,.8,.5);scene.add(sun);
 const ground=new T.GridHelper(1,25,0x567775,0x476269);ground.position.y=-.001;scene.add(ground);
 const views={front:[[.245,.235,.588],[.022,.035,.0]],gauge:[[.293,.228,.328],[.19,.017,.001]],rear:[[-.28,.241,-.46],[-.035,.035,0]]};
 function camera(k){const [eye,aim]=views[k];cam.position.set(...eye);orbit.target.set(...aim);orbit.update()}
 camera('front');for(const k of Object.keys(views))$(k).onclick=()=>camera(k);
 new ResizeObserver(()=>{if(view.clientWidth&&view.clientHeight){renderer.setSize(view.clientWidth,view.clientHeight,false);cam.aspect=view.clientWidth/view.clientHeight;cam.updateProjectionMatrix()}}).observe(view);
 new GLTFLoader().load('/equipment/15-13/detached-locator.glb',({scene:model})=>{
  scene.add(model);blocks=Object.fromEntries(keys.map(k=>[k,model.getObjectByName('BLOCK_'+k)]));
  for(const o of Object.values(blocks)){o.position.x=0;o.position.z=0}
  paint();view.dataset.ready='true';$('status').textContent='Metric model loaded. Only the independent geometry gauge has actions.';
  let start;renderer.domElement.onpointerdown=e=>start=[e.clientX,e.clientY];renderer.domElement.onpointerup=e=>{
   if(!start||Math.hypot(start[0]-e.clientX,start[1]-e.clientY)>4)return;
   const b=view.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height),cam);
   const hits=ray.intersectObject(model,true);
   for(const h of hits){
    let pick,shown=true;for(let q=h.object;q;q=q.parent){if(!q.visible)shown=false;const a=q.name.match(/^(?:TAG_)?ACTION_(CHECK|ROTATE)$/);if(a)pick=a[1].toLowerCase()}
    if(!shown)continue;if(pick)update(pick);return;
   }
  };
 },undefined,()=>{$('status').textContent='3D asset unavailable; the offline fit and export still work.'});
 let prev=0;renderer.setAnimationLoop(now=>{const delta=prev?Math.min(.05,(now-prev)/1000):0;prev=now;if(blocks){const o=blocks[s.part],target=v.seated ? .012 : .052;o.position.y=matchMedia('(prefers-reduced-motion: reduce)').matches?target:T.MathUtils.damp(o.position.y,target,19,delta)}renderer.render(scene,cam)});
}
boot().catch(e=>{$('status').textContent=e.message});
