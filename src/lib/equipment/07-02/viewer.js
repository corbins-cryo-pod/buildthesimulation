import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function makeViewer(host) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xe4e0d5);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.28;
  host.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(36,1,.015,14);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.minDistance=.24;controls.maxDistance=3.7;
  controls.maxPolarAngle=Math.PI*.9;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;
  room.dispose();pmrem.dispose();
  const sky=new THREE.HemisphereLight(0xffffff,0xc1aa84,1.35);
  const key=new THREE.DirectionalLight(0xfff6e9,1.8);
  key.position.set(-2,4,3);scene.add(sky,key);
  const grid=new THREE.GridHelper(3.6,36,0xaaa296,0xc3bdae);
  grid.position.y=-.004;scene.add(grid);
  const draw=()=>renderer.render(scene,camera);
  controls.addEventListener('change',draw);
  const presets={
    whole:{at:[.06,.46,.02],from:[-.94,.95,1.72]},
    chamber:{at:[.005,.425,.09],from:[-.31,.58,1.27]},
    rear:{at:[0,.45,-.16],from:[.91,.89,-1.73]},
    controller:{at:[.04,.72,.38],from:[-.03,.77,1.02]}
  };
  let view='whole';
  function go(name) {
    view=name;
    const {at,from}=presets[view];
    controls.target.fromArray(at);
    const offset=new THREE.Vector3().fromArray(from).sub(controls.target);
    if(camera.aspect<1)offset.multiplyScalar(Math.min(1.5,1/camera.aspect));
    camera.position.copy(controls.target).add(offset);
    controls.update();draw();
  }
  let previousWidth=0;
  const resize=()=>{
    const w=host.clientWidth,h=host.clientHeight;
    if(!w || !h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    if(Math.abs(w-previousWidth)>100)go(view);else draw();
    previousWidth=w;
  };
  new ResizeObserver(resize).observe(host);resize();
  const {scene:model}=await new GLTFLoader().loadAsync('/equipment/07-02/geometry/heracell-vios-160i.glb');
  scene.add(model);
  const outer=model.getObjectByName('OuterDoorPivot'),glass=model.getObjectByName('GlassDoorPivot');
  if(!outer || !glass)throw Error('Door pivot missing from instrument asset.');
  const neutralOuter=outer.quaternion.clone(),neutralGlass=glass.quaternion.clone(),y=new THREE.Vector3(0,1,0);
  const rotation=new THREE.Quaternion();
  const vessels=Array.from({length:3},(_,i)=>{
    const body=new THREE.Group();
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.048,.046,.014,32),new THREE.MeshStandardMaterial({color:0x66919b,roughness:.38}));
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.005,32),new THREE.MeshStandardMaterial({color:0xb6d8db,roughness:.28}));
    dish.position.y=.008;lid.position.y=.017;body.add(dish,lid);
    body.position.set(-.075,[.225,.414,.603][i],.155);
    scene.add(body);return body;
  });
  const display=model.getObjectByName('DisplayFace');
  const lcd=document.createElement('canvas');lcd.width=384;lcd.height=240;
  const ctx=lcd.getContext('2d');
  const texture=new THREE.CanvasTexture(lcd);texture.colorSpace=THREE.SRGBColorSpace;
  let screen;
  if(display){
    model.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(display).getCenter(new THREE.Vector3());
    center.z=new THREE.Box3().setFromObject(display).max.z+.001;
    screen=new THREE.Mesh(new THREE.PlaneGeometry(.139,.083),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    screen.position.copy(outer.worldToLocal(center));outer.add(screen);
  }
  let lastLCD='';
  function sync({outerOpen,glassOpen,row,occupants}) {
    outer.quaternion.copy(neutralOuter).premultiply(rotation.setFromAxisAngle(y,outerOpen?Math.PI*.58:0));
    glass.quaternion.copy(neutralGlass).premultiply(rotation.setFromAxisAngle(y,glassOpen?Math.PI*.49:0));
    vessels.forEach((v,i)=>{v.visible=occupants.some(s=>s.shelf===i+1);});
    const lines=[row.temp_C===null?'—':row.temp_C.toFixed(1)+' °C',row.co2_pct===null?'—':row.co2_pct.toFixed(2)+' %'];
    if(screen && lastLCD!==lines.join('|')){
      ctx.fillStyle='#c1deea';ctx.fillRect(0,0,384,240);ctx.fillStyle='#1e3c51';ctx.font='23px sans-serif';ctx.fillText('TEMPERATURE',15,30);ctx.fillText('CO₂',15,147);
      ctx.font='bold 62px sans-serif';ctx.fillText(lines[0],15,99);ctx.fillText(lines[1],15,217);
      texture.needsUpdate=true;lastLCD=lines.join('|');
    }
    draw();
  }
  go(view);
  host.dataset.model='loaded';
  return {go,sync};
}
