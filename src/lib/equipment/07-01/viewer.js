import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function openViewer(host, status) {
  const scene = new THREE.Scene();
  let renderer;
  let software = false;
  try {
    const canvas = document.createElement('canvas');
    const options = {alpha:true, antialias:true, powerPreference:'low-power'};
    const context = canvas.getContext('webgl2',options);
    if (!context) throw Error('WebGL2 unavailable');
    renderer = new THREE.WebGLRenderer({...options,canvas,context});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = generator.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.75;
    room.dispose();
    generator.dispose();
  } catch {
    const { createSoftwareRenderer } = await import('./software-viewer.js');
    renderer = createSoftwareRenderer();
    software = true;
  }
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = .13;
  controls.maxDistance = 6;
  controls.maxPolarAngle = .54 * Math.PI;
  controls.enablePan = true;
  host.append(renderer.domElement);
  const hemi = new THREE.HemisphereLight(0xfffcf5,0xb5c3ce,1.4);
  const key = new THREE.DirectionalLight(0xfff6dd,2.0);
  key.position.set(-2,3,4);
  const rim = new THREE.DirectionalLight(0xd7ecff,1.5);
  rim.position.set(1.9,1.8,-1.3);
  scene.add(hemi,key,rim);

  if (!software) {
    const grid = new THREE.GridHelper(6, 30, 0xa49d92, 0xb4aea4);
    grid.position.y = -.004;
    grid.material.transparent = true;
    grid.material.opacity = .25;
    scene.add(grid);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const shadow = ctx.createRadialGradient(64,64,10,64,64,62);
    shadow.addColorStop(0,'rgba(43,42,36,.34)');
    shadow.addColorStop(.55,'rgba(43,42,36,.20)');
    shadow.addColorStop(1,'rgba(43,42,36,0)');
    ctx.fillStyle = shadow; ctx.fillRect(0,0,128,128);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.35,1.65),
      new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
    contact.rotation.x = -Math.PI/2; contact.position.y = -.002;
    scene.add(contact);
  }
  const {scene:model} = await new GLTFLoader().loadAsync('/equipment/07-01/cabinet.glb');
  const part = (name) => {
    const node = model.getObjectByName(name);
    if (!node) throw Error('The asset is missing '+name);
    return node;
  };
  const sash = part('SashAssembly'), counterweight = part('Counterweight');
  const nominal = sash.userData.nominalOpeningMm;
  const rake = THREE.MathUtils.degToRad(sash.userData.frontRakeDeg);
  const sashOrigin = sash.position.clone(), weightOrigin = counterweight.position.y;
  const source = part('SealedSample');
  const lamp = part('ChamberLamp'), windowLed = part('WindowStatusIndicator'), reducedLed = part('ReducedModeIndicator');
  for (const node of [lamp,windowLed,reducedLed]) node.material = node.material.clone();
  source.visible = false;
  const tokens = new Map();
  scene.add(model);
  const keypad = windowLed.getWorldPosition(new THREE.Vector3()).toArray();
  const views = [
    [[1.62,1.24,3.16],[0,.77,0]], [[0,.78,3.15],[0,.78,0]],
    [[.32,.55,1.27],[0,.24,.06]], [[keypad[0]+.03,keypad[1]+.105,keypad[2]+.55],keypad],
    [[2.65,1.0,.9],[0,.77,0]], [[1.28,1.16,-2.9],[0,.78,-.04]]
  ];
  let activeView = 0;
  let pendingFrame=0;
  function render(){
    if (pendingFrame) return;
    pendingFrame=requestAnimationFrame(()=>{pendingFrame=0;renderer.render(scene,camera);});
  }
  function selectView(index) {
    activeView = index;
    const [eye,at] = views[index];
    controls.target.fromArray(at);
    camera.position.fromArray(eye);
    // Leave room for the full cabinet on a narrow portrait display.
    if ([0,1,4,5].includes(index) && camera.aspect<1) {
      camera.position.sub(controls.target).multiplyScalar(1/camera.aspect).add(controls.target);
    }
    controls.update(); render();
    document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.camera)===index)));
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight) return;
    const previous = camera.aspect;
    camera.aspect = host.clientWidth/host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth,host.clientHeight);
    if (Math.abs(previous - camera.aspect)>.25) selectView(activeView);
    else render();
  }
  controls.addEventListener('change',render);
  new ResizeObserver(resize).observe(host);
  resize(); selectView(0);
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>selectView(Number(b.dataset.camera)));
  document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length()*Number(b.dataset.zoom),controls.minDistance,controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update(); render();
  });
  function token(id,slot) {
    const obj = source.clone();
    obj.name = 'Specimen '+id; obj.visible = true;
    obj.position.x = -.34 + (slot%4)*.22;
    obj.position.z = .16 - Math.floor(slot/4)*.132;
    obj.traverse(n=>{ if(n.name.startsWith('Witness_ID') || n.name==='Witness ID') n.visible=false; });
    const c=document.createElement('canvas'); c.width=256; c.height=96;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#f3eddb';ctx.fillRect(0,0,256,96);ctx.fillStyle='#242624';
    ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(id,128,48,244);
    const map = new THREE.CanvasTexture(c); map.colorSpace=THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.052,.021),new THREE.MeshBasicMaterial({map}));
    label.rotation.x=-Math.PI/2; label.position.y=.051;
    obj.add(label); source.parent.add(obj);
    return {obj,label};
  }
  let signature = '';
  function update(result) {
    // Reconstruct deck slots from accepted events so a specimen stays put when its neighbor leaves.
    const key = JSON.stringify([result.state.sashMm,result.eventHistory.length,result.state.presentSampleIds,result.input.sessionId]);
    if (key===signature) return;
    signature = key;
    const slots=new Map();
    for(const event of result.eventHistory) {
      if(event.type==='remove') slots.delete(event.sampleId);
      if(event.type==='load') {
        let slot=0;
        const occupied=new Set(slots.values());
        while(occupied.has(slot)) slot++;
        slots.set(event.sampleId,slot);
      }
    }
    for(const [id,entry] of tokens) {
      if(slots.get(id)===entry.slot) continue;
      entry.obj.removeFromParent();
      entry.label.material.map.dispose();entry.label.material.dispose();entry.label.geometry.dispose();
      tokens.delete(id);
    }
    for(const [id,slot] of slots) if(!tokens.has(id)) tokens.set(id,{...token(id,slot),slot});
    const delta=(result.state.sashMm-nominal)/1000;
    sash.position.set(sashOrigin.x,sashOrigin.y+delta,sashOrigin.z-Math.tan(rake)*delta);
    counterweight.position.y=weightOrigin-delta;
    const closed=result.state.position==='closed';
    windowLed.material.color.set(closed?0x344247:result.state.warning?0xe24324:0x58bf76);
    windowLed.material.emissive.copy(windowLed.material.color);windowLed.material.emissiveIntensity=closed?0:.55;
    reducedLed.material.color.set(closed?0x408feb:0x263747);
    reducedLed.material.emissive.copy(reducedLed.material.color); reducedLed.material.emissiveIntensity=closed?.55:0;
    host.dataset.openingMm=String(result.state.sashMm);
    host.dataset.tokenCount=String(tokens.size);
    render();
  }
  document.getElementById('cab-poster').hidden=true;
  status.textContent=software?'3D cabinet · software rendering':'3D cabinet · metric GLB';
  host.dataset.ready='true';
  return {update};
}
