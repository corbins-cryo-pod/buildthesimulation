import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const cameras = {
  whole: { target: [0, .224, .003], from: [-.64, .48, .82] },
  stage: { target: [0, .194, .005], from: [.235, .27, .27] },
  nosepiece: { target: [0, .157, .004], from: [-.21, .146, .225] },
  camera: { target: [-.125, .261, .218], from: [-.41, .38, .52] },
  rear: { target: [0, .185, -.055], from: [-.61, .46, -.73] }
};

export async function openMicroscope(host) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .003, 5);
  let renderer;
  let software = false;
  const surface = document.createElement('canvas');
  const opts = { alpha: true, antialias: true, powerPreference: 'low-power' };
  try {
    const context = surface.getContext('webgl2', opts);
    if (!context) throw new Error('WebGL2 unavailable');
    renderer = new THREE.WebGLRenderer({canvas: surface, context, ...opts});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = generator.fromScene(room, .04).texture;
    scene.environmentIntensity = .8;
    room.dispose();
    generator.dispose();
  } catch {
    const {createSoftwareRenderer} = await import('../07-01/software-viewer.js');
    renderer = createSoftwareRenderer();
    software = true;
  }
  const model = (await new GLTFLoader().loadAsync('/equipment/07-03/microscope.glb')).scene;
  scene.add(model, new THREE.HemisphereLight(0xfffaf0, 0xa9b4be, 1.45));
  const key = new THREE.DirectionalLight(0xfff6de, 2.0);
  key.position.set(-1, 2, 2);
  scene.add(key);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = .038;
  controls.maxDistance = 2.15;
  controls.maxPolarAngle = .88 * Math.PI;
  const draw = () => renderer.render(scene, camera);
  controls.addEventListener('change', draw);
  const part = name => {
    const node = model.getObjectByName(name);
    if (!node) throw new Error('Missing instrument part ' + name);
    return node;
  };
  const turret = part('NosepieceIndex');
  const focus = part('FocusCarriage');
  const carriage = part('SpecimenCarrier');
  const ruler = part('StageMicrometer');
  const slide = part('SpecimenSlide');
  slide.scale.setScalar(1);
  const fineKnobs = ['FineFocusL','FineFocusR'].map(part);
  const knobHome = fineKnobs.map(node => node.quaternion.clone());
  const x = new THREE.Vector3(1,0,0);
  const selector = part('EpiSelector');
  const selectorHome = selector.quaternion.clone();
  const indicators = ['DiaIndicator', 'EpiIndicator'].map(name => {
    const indicator = part(name);
    indicator.traverse(mesh => {
      if (mesh.isMesh) mesh.material = mesh.material.clone();
    });
    return indicator;
  });
  const home = {focus: focus.position.clone(), stage: carriage.position.clone(), turret: turret.quaternion.clone()};
  const y = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  function sync({objective, focusUm, stageXUm, stageYUm, loaded, fixture, mode}) {
    turret.quaternion.copy(home.turret).multiply(q.setFromAxisAngle(y, objective === 20 ? -2 * Math.PI / 5 : 0));
    focus.position.copy(home.focus);
    focus.position.y += focusUm * 1e-6;
    const turn = (focusUm / 200) * 2 * Math.PI;
    fineKnobs.forEach((knob,i) => knob.quaternion.copy(knobHome[i]).multiply(q.setFromAxisAngle(x,turn)));
    carriage.position.copy(home.stage);
    carriage.position.x -= stageXUm * 1e-6;
    carriage.position.z += stageYUm * 1e-6;
    ruler.visible = loaded && fixture === 'micrometer';
    slide.visible = loaded && fixture !== 'micrometer';
    const epi = mode === 'fluorescence';
    selector.quaternion.copy(selectorHome).multiply(q.setFromAxisAngle(y, epi ? Math.PI / 2 : 0));
    indicators.forEach((indicator, index) => {
      const active = index === Number(epi);
      indicator.traverse(mesh => {
        if (mesh.isMesh) mesh.material.color.setHex(active ? 0x90c862 : 0x475448);
      });
    });
    draw();
  }
  let currentView = 'whole';
  function go(name) {
    currentView = name;
    const {target, from} = cameras[name];
    controls.target.fromArray(target);
    camera.position.fromArray(from).sub(controls.target).multiplyScalar(Math.max(1, .93 / camera.aspect)).add(controls.target);
    controls.update();
    draw();
  }
  let lastWidth = 0;
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (Math.abs(width - lastWidth) > 80) go(currentView);
    else draw();
    lastWidth = width;
  }
  host.append(renderer.domElement);
  host.querySelector('img').hidden = true;
  new ResizeObserver(resize).observe(host);
  resize();
  host.dataset.model = 'loaded';
  host.dataset.renderer = software ? 'software' : 'webgl';
  return {go, sync};
}
