import * as THREE from "/vendor/three/three.module.js";
import { OrbitControls } from "/vendor/three/OrbitControls.js";

const umToMm = (v) => v / 1000;

export function createScene(canvas, bounds, neurons) {
  let dirty = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a121c);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.up.set(0,0,1);
  camera.position.set(2.3, -2.0, 1.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0.75);
  controls.minDistance = 1.2;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(2, -2, 3);
  scene.add(key);



  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(umToMm(bounds.max[0] - bounds.min[0]), umToMm(bounds.max[1] - bounds.min[1]), umToMm(bounds.max[2] - bounds.min[2])),
    new THREE.MeshPhongMaterial({ color: 0xf4efe9, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
  );
  slab.position.set(0, 0, umToMm((bounds.max[2] + bounds.min[2]) * 0.5));
  scene.add(slab);
  scene.add(new THREE.BoxHelper(slab, 0x55748a));
  const grid = new THREE.GridHelper(2,10,0x365166,0x243a4c);
  grid.rotation.x=Math.PI/2;
  scene.add(grid);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const pts = new Float32Array(neurons.length * 3);
  const colors = new Float32Array(neurons.length * 3);
  for (let i = 0; i < neurons.length; i++) {
    pts[i * 3] = umToMm(neurons[i].pos[0]);
    pts[i * 3 + 1] = umToMm(neurons[i].pos[1]);
    pts[i * 3 + 2] = umToMm(neurons[i].pos[2]);
    colors[i * 3] = 0.04;
    colors[i * 3 + 1] = 0.05;
    colors[i * 3 + 2] = 0.08;
  }
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  nGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const nCloud = new THREE.Points(
    nGeo,
    new THREE.PointsMaterial({ vertexColors: true, size: 0.03, transparent: true, opacity: 1.0, depthTest: false })
  );
  scene.add(nCloud);

  const electrodeGroup = new THREE.Group();
  scene.add(electrodeGroup);

  function drawElectrodes(electrodes, selected) {
    dirty = true;
    for (const child of electrodeGroup.children) { child.geometry.dispose(); child.material.dispose(); }
    electrodeGroup.clear();
    electrodes.forEach((e, idx) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(idx === selected ? 0.022 : 0.016, 20, 20),
        new THREE.MeshPhongMaterial({ color: idx === selected ? 0xff5d5d : 0xc73535, shininess: 120 })
      );
      mesh.position.set(umToMm(e.x), umToMm(e.y), umToMm(e.z));
      electrodeGroup.add(mesh);
      const shaft = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(umToMm(e.x),umToMm(e.y),0), mesh.position.clone()
      ]),new THREE.LineBasicMaterial({color:idx===selected?0xffca7c:0x8ca4ba,transparent:true,opacity:.65}));
      electrodeGroup.add(shaft);
    });
  }

  function setView(mode) {
    dirty = true;
    if (mode === "reset") { camera.position.set(2.3, -2.0, 1.6); controls.target.set(0, 0, 0.75); }
    if (mode === "top") { camera.position.set(0.001, 0.001, 4.2); controls.target.set(0, 0, 0.75); }
    if (mode === "side") { camera.position.set(4.2, 0.001, 0.95); controls.target.set(0, 0, 0.75); }
    controls.update();
  }

  function resize() {
    dirty = true;
    const w = Math.max(320, canvas.clientWidth);
    const h = Math.max(280, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function pickOnSlab(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(slab, false);
    if (!hits.length) return null;
    const p = hits[0].point;
    return { xUm: p.x * 1000, yUm: p.y * 1000, zUm: p.z * 1000 };
  }

  function updateNeuronActivity(activity) {
    dirty = true;
    const c = nGeo.getAttribute("color");
    for (let i = 0; i < activity.length; i++) {
      const a = Math.max(0, Math.min(1, activity[i]));
      const r = 0.22 + a * (0.56 - 0.22);
      const g = 0.32 + a * (0.90 - 0.32);
      const b = 0.44 + a * (1.00 - 0.44);
      c.setXYZ(i, r, g, b);
    }
    c.needsUpdate = true;
  }

  function render() {
    const changed = controls.update();
    if(dirty || changed) renderer.render(scene, camera);
    dirty = false;
  }

  return { drawElectrodes, setView, resize, render, pickOnSlab, updateNeuronActivity };
}

