import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeCable } from './model.js';

/** View geometry is built exclusively from the experiment's physical coordinates. */
export function createNerveScene(container, result, onSelect) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { throw new Error('3D is unavailable on this device. The cross-section and all calculations remain available.'); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x242422, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Three-dimensional nerve cutaway. Drag to orbit; use the fiber selector for keyboard inspection.');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(33, 1, .01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; controls.minDistance = 3; controls.maxDistance = 35;
  scene.add(new THREE.HemisphereLight(0xfff6df, 0x77777a, 2.7));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(3, 6, 9); scene.add(light);
  const back = new THREE.DirectionalLight(0xbbd7e2, 1.5); back.position.set(-5, -2, 1); scene.add(back);
  const root = new THREE.Group(); root.rotation.y = Math.PI / 2; scene.add(root);
  const dispose = [], pickables = [], selectedNodes = [];
  const material = (color, opacity = 1) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: .08, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity === 1 });
    dispose.push(m); return m;
  };
  const fiberMat = material(0xc5b28b), selectedMat = material(0xf0d49b), fasciaMat = material(0xbab79e, .13), rimMat = material(0xd7c5a0, .7);
  const negativeMat = material(0xe5ad62), positiveMat = material(0x76c5ca);
  function mesh(geometry, mat, position = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, mat); m.position.set(...position); root.add(m); dispose.push(geometry); return m;
  }
  function tube(x, y, z, radius, length, mat, segments = 12) {
    const m = mesh(new THREE.CylinderGeometry(radius, radius, length, segments, 1, true), mat, [x, y, z]); m.rotation.x = Math.PI / 2; return m;
  }
  function ring(x, y, z, radius, thickness, mat) {
    return mesh(new THREE.TorusGeometry(radius, thickness, 6, 64), mat, [x, y, z]);
  }
  const { anatomy, fiberId, contacts } = result, half = 5;
  // A partial epineurial sleeve exposes the fascicle ensemble.
  const sheath = mesh(new THREE.CylinderGeometry(anatomy.radius, anatomy.radius, 10, 80, 1, true, .1, Math.PI * 1.2), material(0xb5afa0, .20));
  sheath.rotation.x = Math.PI / 2;
  ring(0, 0, -half, anatomy.radius, .025, rimMat); ring(0, 0, half, anatomy.radius, .025, rimMat);
  for (const f of anatomy.fascicles) {
    tube(f.x, f.y, 0, f.r, 10, fasciaMat, 32);
    for (const z of [-half, half]) ring(f.x, f.y, z, f.r, .012, rimMat);
  }
  for (const f of anatomy.fibers) {
    const selected = f.id === fiberId, mat = selected ? selectedMat : fiberMat;
    const m = tube(f.x, f.y, 0, f.diameterUm / 2000 * 3, 10, mat, 6);
    m.userData.fiber = f.id; pickables.push(m);
    if (selected) makeCable(f).z.forEach((z, index) => {
      if (Math.abs(z) >= half) return;
      const node = mesh(new THREE.SphereGeometry(.04, 10, 8), material(0xffe6af), [f.x, f.y, z]);
      node.userData.fiber = f.id; pickables.push(node); selectedNodes.push({ node, index });
    });
  }
  for (const c of contacts) {
    const mat = c.weight < 0 ? negativeMat : positiveMat;
    if (c.kind === 'intra') {
      mesh(new THREE.CircleGeometry(c.r, 32), mat, [c.x, c.y, c.z]);
      // Thin lead is a display cue and not an additional current source.
      const points = [new THREE.Vector3(c.x, c.y, 0), new THREE.Vector3(c.x, c.y, -half - .7)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points), lm = new THREE.LineBasicMaterial({ color: 0xe5ad62 });
      root.add(new THREE.Line(geometry, lm)); dispose.push(geometry, lm);
    } else {
      const positions = [], indices = [], n = 80;
      for (let i = 0; i <= n; i++) {
        const theta = c.angle - c.arc / 2 + c.arc * i / n;
        for (const dz of [-c.width / 2, c.width / 2]) positions.push(c.r * Math.cos(theta), c.r * Math.sin(theta), c.z + dz);
        if (i < n) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); mesh(g, mat);
    }
  }
  // Physical longitudinal ruler: 1 mm tick spacing, shown below the nerve.
  const ruler = [];
  for (let z = -5; z <= 5; z++) ruler.push(new THREE.Vector3(0, -anatomy.radius - .6, z), new THREE.Vector3(0, -anatomy.radius - .6 - (z % 5 ? .08 : .18), z));
  ruler.push(new THREE.Vector3(0, -anatomy.radius - .6, -5), new THREE.Vector3(0, -anatomy.radius - .6, 5));
  const rg = new THREE.BufferGeometry().setFromPoints(ruler), rm = new THREE.LineBasicMaterial({ color: 0xa79e88 });
  root.add(new THREE.LineSegments(rg, rm)); dispose.push(rg, rm);
  const render = () => renderer.render(scene, camera);
  const sectionRing = ring(0, 0, 0, anatomy.radius * 1.02, .012, material(0xf4ecda));
  function update(frame, sectionZ) {
    sectionRing.position.z = sectionZ;
    const { response } = result;
    for (const { node, index } of selectedNodes) {
      const value = response.voltages[frame * response.count + index] / Math.max(response.peak, 1e-9);
      node.material.color.set(0xa9a798).lerp(new THREE.Color(value >= 0 ? 0xefaf5c : 0x67bed6), Math.min(1, Math.abs(value)));
    }
    render();
  }
  function reset() { camera.position.set(8, 5.5, 13); controls.target.set(0, 0, 0); controls.update(); render(); }
  function resize() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); render(); }
  const observer = new ResizeObserver(resize); observer.observe(container);
  controls.addEventListener('change', render);
  let down;
  const pointerDown = event => { down = [event.clientX, event.clientY]; };
  const pointerUp = event => {
    if (!down || Math.hypot(down[0] - event.clientX, down[1] - event.clientY) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect(), pointer = new THREE.Vector2(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
    const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables)[0]; if (hit) onSelect(hit.object.userData.fiber);
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp);
  reset(); resize();
  return { reset, update, destroy() { observer.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); for (const d of dispose) d.dispose(); renderer.dispose(); renderer.domElement.remove(); } };
}
