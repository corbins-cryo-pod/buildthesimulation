import * as THREE from "https://esm.sh/three@0.170.0";
import { OrbitControls } from "https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js";

const umToMm = (v) => v / 1000;

export function createScene(canvas, bounds, neurons) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(2.3, -2.0, 1.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0.75);
  controls.minDistance = 1.2;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(2, -2, 3);
  scene.add(key);

  const grid = new THREE.GridHelper(4.5, 18, 0x3c3c48, 0x2d2d36);
  grid.material.transparent = true;
  grid.material.opacity = 0.26;
  scene.add(grid);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(umToMm(bounds.max[0] - bounds.min[0]), umToMm(bounds.max[1] - bounds.min[1]), umToMm(bounds.max[2] - bounds.min[2])),
    new THREE.MeshPhongMaterial({ color: 0xf4efe9, transparent: true, opacity: 0.14 })
  );
  slab.position.set(0, 0, umToMm((bounds.max[2] + bounds.min[2]) * 0.5));
  scene.add(slab);

  const pts = new Float32Array(neurons.length * 3);
  for (let i = 0; i < neurons.length; i++) {
    pts[i * 3] = umToMm(neurons[i].pos[0]);
    pts[i * 3 + 1] = umToMm(neurons[i].pos[1]);
    pts[i * 3 + 2] = umToMm(neurons[i].pos[2]);
  }
  const nCloud = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pts, 3)),
    new THREE.PointsMaterial({ color: 0xb7c9ff, size: 0.012, transparent: true, opacity: 0.6 })
  );
  scene.add(nCloud);

  const electrodeGroup = new THREE.Group();
  scene.add(electrodeGroup);

  function drawElectrodes(electrodes, selected) {
    electrodeGroup.clear();
    electrodes.forEach((e, idx) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(idx === selected ? 0.022 : 0.016, 20, 20),
        new THREE.MeshPhongMaterial({ color: idx === selected ? 0xff5d5d : 0xc73535, shininess: 120 })
      );
      mesh.position.set(umToMm(e.x), umToMm(e.y), umToMm(e.z));
      electrodeGroup.add(mesh);
    });
  }

  function setView(mode) {
    if (mode === "reset") { camera.position.set(2.3, -2.0, 1.6); controls.target.set(0, 0, 0.75); }
    if (mode === "top") { camera.position.set(0.001, 0.001, 4.2); controls.target.set(0, 0, 0.75); }
    if (mode === "side") { camera.position.set(4.2, 0.001, 0.95); controls.target.set(0, 0, 0.75); }
    controls.update();
  }

  function resize() {
    const w = Math.max(320, canvas.clientWidth);
    const h = Math.max(280, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  return { drawElectrodes, setView, resize, render };
}
