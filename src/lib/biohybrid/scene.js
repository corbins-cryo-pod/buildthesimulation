import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { voltageRgb } from './colors.js';
export { VOLTAGE_STOPS, voltageRgb, voltageColor } from './colors.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const linearChannel = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const vec = p => new THREE.Vector3(...p);
const sphereSize = 1;
const THEMES = {
  dark: { background: '#242725', text: '#e6dfce', line: '#9e9481', scaffold: '#b5bfad', tissue: '#bca47f', substrate: '#575a58', metal: '#d0b778' },
  light: { background: '#efede4', text: '#3e423b', line: '#8c887d', scaffold: '#839b94', tissue: '#b2a28a', substrate: '#878b86', metal: '#a88b4d' },
};
function release(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  root.clear();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
function cylinderBetween(a, b, radius, material, radial = 12, open = false) {
  const start = vec(a), end = vec(b), direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, Math.max(.01, direction.length()), radial, 1, open);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}
// Geometry is merged per neuron. This preserves individually selectable
// electrical compartments while keeping draw calls independent of mesh density.
function buildNeuronSurface(nodes, indices, widthScale, material) {
  const positions = [], normals = [], triangleIndices = [], colors = [], pieces = [];
  for (const index of indices) {
    const node = nodes[index], start = vec(node.startUm), end = vec(node.endUm);
    const radius = node.diameterUm * .5 * (node.kind === 'soma' ? sphereSize : widthScale);
    const geometry = node.kind === 'soma'
      ? new THREE.SphereGeometry(radius, 18, 12)
      : new THREE.CylinderGeometry(radius, radius, Math.max(.001, start.distanceTo(end)), 8, 2, false);
    const nVertices = geometry.attributes.position.count;
    const offset = positions.length / 3, triangleStart = triangleIndices.length / 3;
    const localPositions = geometry.attributes.position, localNormals = geometry.attributes.normal;
    const axis = end.clone().sub(start).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    const center = vec(node.centerUm), length = Math.max(.001, start.distanceTo(end));
    const interpolation = new Float32Array(nVertices);
    for (let j = 0; j < nVertices; j++) {
      const p = new THREE.Vector3().fromBufferAttribute(localPositions, j);
      // CylinderGeometry places its first ring at +length/2 (the distal end).
      interpolation[j] = node.kind === 'soma' ? .5 : clamp(p.y / length + .5, 0, 1);
      const n = new THREE.Vector3().fromBufferAttribute(localNormals, j);
      if (node.kind !== 'soma') { p.applyQuaternion(q); n.applyQuaternion(q); }
      p.add(center);
      positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z);
      colors.push(.2, .4, .4);
    }
    for (let j = 0; j < geometry.index.count; j++) triangleIndices.push(offset + geometry.index.array[j]);
    pieces.push({ index, vertexStart: offset, vertexCount: nVertices, interpolation, triangleStart, triangleEnd: triangleIndices.length / 3 });
    geometry.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
  geometry.setIndex(triangleIndices);
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.pieces = pieces;
  return mesh;
}
/**
 * Demand-rendered anatomical view. Coordinates remain physical micrometres.
 * The caller owns computation and supplies the current compartment voltages.
 * Radial exaggeration is a declared visibility aid; centerlines, contact sizes,
 * separations and the projection-correct length scale remain unmodified.
 */
export function createBiohybridScene(host, { onSelect = () => {}, onUnavailable = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' }); }
  catch (error) {
    onUnavailable('WebGL is unavailable. Use the anatomical 2D view; the numerical simulation is unchanged.');
    return { available: false, setGeometry() {}, setFrame() {}, setOptions() {}, focus() {}, selectNode() {}, resetCamera() {}, resize() {}, dispose() {} };
  }
  let data = null, lastVoltages = null, frameRequest = 0, disposed = false, contextLost = false;
  let visible = true, pointerStart = null, activeNeuronId = null, selectedIndex = -1;
  let options = { theme: 'dark', scaffold: true, tissue: true, clip: null, diameterExaggeration: 2, labels: true };
  let neuronMeshes = [], children = [], labels = [], bounds = new THREE.Box3();
  let width = 1, height = 1;
  const events = new AbortController(), scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .5, 50000);
  camera.up.set(0, 0, 1);
  const anatomy = new THREE.Group(), scaffold = new THREE.Group(), tissue = new THREE.Group();
  const electrodes = new THREE.Group(), synapses = new THREE.Group(), guides = new THREE.Group();
  scene.add(anatomy, scaffold, tissue, electrodes, synapses, guides);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.7));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Biohybrid neural construct, host neurons and electrode contacts in three dimensions. Drag to orbit, shift-drag or right-drag to pan, scroll or pinch to zoom. Select a compartment to inspect it. Home restores the overview.');
  host.append(canvas);
  const oldPosition = host.style.position;
  if (!oldPosition) host.style.position = 'relative';
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;font:11px/1.25 Arial,sans-serif;';
  const labelLayer = document.createElement('div');
  labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  const scale = document.createElement('div');
  scale.style.cssText = 'position:absolute;bottom:15px;left:16px;pointer-events:none;text-align:center;';
  const scaleLine = document.createElement('div');
  scaleLine.style.cssText = 'border:1px solid currentColor;border-top:0;height:6px;';
  const scaleText = document.createElement('div');
  scaleText.style.cssText = 'font-size:10px;margin-top:4px;letter-spacing:.02em;';
  scale.append(scaleLine, scaleText);
  const note = document.createElement('div');
  note.style.cssText = 'position:absolute;right:14px;bottom:15px;max-width:55%;font-size:10px;text-align:right;';
  overlay.append(labelLayer, scale, note); host.append(overlay);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 25; controls.maxDistance = 16000;
  controls.screenSpacePanning = true;
  controls.listenToKeyEvents(canvas);
  const ambient = new THREE.HemisphereLight('#f0ece1', '#6b7472', 1.4);
  ambient.up.set(0, 0, 1); ambient.position.set(0, 0, 1000);
  const key = new THREE.DirectionalLight('#fff4df', 1.65); key.position.set(-500, -700, 1000);
  const fill = new THREE.DirectionalLight('#dce8ee', .65); fill.position.set(800, 500, 200);
  scene.add(ambient, key, fill);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#f0d49a', wireframe: true, transparent: true, opacity: .8, depthTest: false, depthWrite: false }));
  marker.visible = false; marker.renderOrder = 20; scene.add(marker);
  function invalidate() {
    if (disposed || contextLost || !visible || document.hidden || frameRequest) return;
    frameRequest = requestAnimationFrame(draw);
  }
  function draw() {
    frameRequest = 0;
    if (disposed || contextLost || !visible || document.hidden) return;
    const moved = controls.update();
    renderer.render(scene, camera); updateOverlay();
    if (moved) invalidate();
  }
  controls.addEventListener('change', invalidate);
  function addLabel(text, point, { small = false, kind = 'region' } = {}) {
    const element = document.createElement('span');
    element.textContent = text;
    element.style.cssText = `position:absolute;white-space:nowrap;transform:translate(-50%,-50%);font-size:${small ? 10 : 11}px;letter-spacing:${small ? '.02em' : '.08em'};${small ? '' : 'text-transform:uppercase;'}padding:3px 5px;`;
    labelLayer.append(element); labels.push({ element, point: vec(point), kind });
  }
  function updateOverlay() {
    if (!data) return;
    const theme = THEMES[options.theme];
    overlay.style.color = theme.text;
    for (const label of labels) {
      const projected = label.point.clone().project(camera);
      const inView = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .98 && Math.abs(projected.y) < .93;
      label.element.style.display = options.labels && inView && (!activeNeuronId || label.kind === 'electrode') ? 'block' : 'none';
      label.element.style.left = `${(projected.x * .5 + .5) * width}px`;
      label.element.style.top = `${(-projected.y * .5 + .5) * height}px`;
      label.element.style.background = options.theme === 'dark' ? 'rgba(36,39,37,.82)' : 'rgba(239,237,228,.85)';
    }
    // The scale is at the orbit target's depth, measured along camera-right.
    // It remains a length scale when the camera or viewport changes.
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const a = controls.target.clone().project(camera);
    const b = controls.target.clone().addScaledVector(right, 1).project(camera);
    const pixelsPerUm = Math.hypot((b.x - a.x) * width / 2, (b.y - a.y) * height / 2);
    const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
    const desired = Math.min(110, width * .21);
    const lengthUm = candidates.reduce((best, value) => Math.abs(value * pixelsPerUm - desired) < Math.abs(best * pixelsPerUm - desired) ? value : best, 100);
    scale.style.width = `${Math.max(1, lengthUm * pixelsPerUm)}px`;
    scaleText.textContent = lengthUm >= 1000 ? `${lengthUm / 1000} mm` : `${lengthUm} µm`;
    scale.title = 'Length at the camera focus plane; perspective changes scale with depth.';
    note.textContent = contextLost ? '3D context interrupted — switch to 2D'
      : `Neurite diameter ×${options.diameterExaggeration} · soma/contact size ×1${options.clip === null ? '' : ' · section enabled'}`;
  }
  function fit(box, direction = new THREE.Vector3(.12, -1, .66)) {
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const dir = direction.clone().normalize(), right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const projectedWidth = Math.abs(right.x) * size.x + Math.abs(right.y) * size.y + Math.abs(right.z) * size.z;
    const projectedHeight = Math.abs(up.x) * size.x + Math.abs(up.y) * size.y + Math.abs(up.z) * size.z;
    const depth = Math.abs(dir.x) * size.x + Math.abs(dir.y) * size.y + Math.abs(dir.z) * size.z;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const distance = Math.max(projectedHeight / (2 * tan), projectedWidth / (2 * tan * camera.aspect), 90) * 1.22 + depth * .5;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, distance);
    camera.lookAt(center); controls.update(); invalidate();
  }
  function resetCamera() { activeNeuronId = null; updateFocus(); fit(bounds); }
  function focus(neuronId = null) {
    activeNeuronId = neuronId;
    updateFocus();
    if (!neuronId || !data) { fit(bounds); return; }
    const selected = new THREE.Box3();
    for (const node of data.nodes) if (node.neuronId === neuronId) {
      selected.expandByPoint(vec(node.startUm)); selected.expandByPoint(vec(node.endUm));
    }
    selected.expandByScalar(28); fit(selected);
  }
  function updateFocus() {
    for (const mesh of neuronMeshes) {
      const focused = !activeNeuronId || mesh.userData.neuronId === activeNeuronId;
      mesh.material.transparent = !focused;
      mesh.material.opacity = focused ? 1 : .13;
      mesh.material.depthWrite = focused;
    }
    scaffold.visible = options.scaffold && !activeNeuronId;
    tissue.visible = options.tissue && !activeNeuronId;
    synapses.visible = !activeNeuronId;
    invalidate();
  }
  function selectNode(index = -1) {
    selectedIndex = Number.isInteger(index) && data?.nodes[index] ? index : -1;
    marker.visible = selectedIndex >= 0;
    if (marker.visible) {
      const node = data.nodes[selectedIndex];
      marker.position.fromArray(node.centerUm);
      marker.scale.setScalar(Math.max(3, node.diameterUm / 2 * (node.kind === 'soma' ? 1.25 : options.diameterExaggeration * 1.7)));
    }
    invalidate();
  }
  function buildScaffold() {
    release(scaffold); release(tissue); release(electrodes); release(synapses); release(guides);
    for (const label of labels) label.element.remove(); labels = [];
    if (!data) return;
    const theme = THEMES[options.theme];
    const { startUm, endUm, radiusUm } = data.scaffold;
    const shellMaterial = new THREE.MeshPhongMaterial({ color: theme.scaffold, transparent: true, opacity: .085, side: THREE.DoubleSide, depthWrite: false, shininess: 30 });
    const shell = cylinderBetween(startUm, endUm, radiusUm, shellMaterial, 48, true);
    shell.renderOrder = 6; scaffold.add(shell);
    // Sparse end rings communicate the hydrogel boundary without filling the
    // construct with decorative fibers or additional unmodeled neural tissue.
    const axis = vec(endUm).sub(vec(startUm)).normalize();
    for (const p of [startUm, endUm]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radiusUm, .5, 4, 56), new THREE.MeshBasicMaterial({ color: theme.scaffold, transparent: true, opacity: .45, depthWrite: false }));
      ring.position.fromArray(p); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis); scaffold.add(ring);
    }
    const hostNodes = data.nodes.filter(node => node.role === 'host');
    const hostBounds = new THREE.Box3();
    for (const node of hostNodes) { hostBounds.expandByPoint(vec(node.startUm)); hostBounds.expandByPoint(vec(node.endUm)); }
    if (!hostBounds.isEmpty()) {
      hostBounds.expandByScalar(35);
      const size = hostBounds.getSize(new THREE.Vector3()), center = hostBounds.getCenter(new THREE.Vector3());
      const volume = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ color: theme.tissue, transparent: true, opacity: .035, side: THREE.BackSide, depthWrite: false }));
      volume.position.copy(center); volume.renderOrder = -2; tissue.add(volume);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(volume.geometry), new THREE.LineBasicMaterial({ color: theme.line, transparent: true, opacity: .18 }));
      edges.position.copy(center); tissue.add(edges);
      addLabel('Host tissue', [center.x, hostBounds.min.y - 38, hostBounds.max.z + 25]);
    }
    addLabel('Engineered somata', [startUm[0] - 30, -175, 90]);
    addLabel('Axonal bridge', [(startUm[0] + endUm[0]) / 2, -radiusUm - 30, radiusUm + 25]);
    for (const contact of data.contacts) {
      const normal = vec(contact.normal || [0, 0, 1]).normalize();
      const point = vec(contact.positionUm), thickness = 2;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(contact.radiusUm, contact.radiusUm, thickness, 28), new THREE.MeshStandardMaterial({ color: contact.kind === 'record' ? theme.metal : contact.kind === 'return' ? '#a2a7a5' : '#b78956', metalness: .58, roughness: .42 }));
      cap.position.copy(point); cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      electrodes.add(cap);
      const shaftLength = contact.kind === 'return' ? 75 : 145;
      const shaftEnd = point.clone().addScaledVector(normal, shaftLength);
      const shaftStart = point.clone().addScaledVector(normal, thickness / 2);
      const shaft = cylinderBetween(shaftStart.toArray(), shaftEnd.toArray(), Math.max(2.5, contact.radiusUm * .22), new THREE.MeshStandardMaterial({ color: theme.substrate, roughness: .8, metalness: .1 }), 10);
      electrodes.add(shaft);
      const labelPoint = shaftEnd.clone().addScaledVector(normal, 22);
      const title = contact.kind === 'stim' ? 'STIM' : contact.kind === 'return' ? 'RETURN' : contact.id.toUpperCase();
      addLabel(title, labelPoint.toArray(), { small: true, kind: 'electrode' });
    }
    for (const synapse of data.synapses) {
      const pre = data.nodes[synapse.preIndex], post = data.nodes[synapse.postIndex];
      if (!pre || !post) continue;
      const position = synapse.positionUm || post.centerUm;
      const junction = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), new THREE.MeshBasicMaterial({ color: theme.metal, wireframe: !synapse.weightUs, transparent: true, opacity: synapse.weightUs ? .85 : .5 }));
      junction.position.fromArray(position); junction.userData.synapseId = synapse.id;
      synapses.add(junction);
    }
    applyClipping(); updateFocus();
  }
  function buildAnatomy() {
    release(anatomy); neuronMeshes = [];
    if (!data) return;
    children = data.nodes.map(() => []);
    for (let i = 0; i < data.nodes.length; i++) if (data.nodes[i].parent >= 0) children[data.nodes[i].parent].push(i);
    for (const neuron of data.neurons) {
      const indices = data.nodes.map((node, index) => node.neuronId === neuron.id && node.kind !== 'junction' && node.areaUm2 > 0 ? index : -1).filter(index => index >= 0);
      const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const mesh = buildNeuronSurface(data.nodes, indices, options.diameterExaggeration, material);
      mesh.userData.neuronId = neuron.id; mesh.name = neuron.label || neuron.id;
      neuronMeshes.push(mesh); anatomy.add(mesh);
    }
    if (lastVoltages) setFrame(lastVoltages); else setFrame(new Float32Array(data.nodes.length).fill(-65));
    selectNode(selectedIndex); applyClipping(); updateFocus();
  }
  function applyClipping() {
    if (!data) return;
    const min = data.bounds.min[2] - 20, max = data.bounds.max[2] + 20;
    clipPlane.constant = min + (max - min) * (options.clip ?? 1);
    const planes = options.clip === null ? [] : [clipPlane];
    for (const root of [anatomy, scaffold, tissue, synapses]) root.traverse(object => {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) {
        const changed = material.clippingPlanes?.length !== planes.length;
        material.clippingPlanes = planes;
        if (changed) material.needsUpdate = true;
      }
    });
    if (marker.material.clippingPlanes?.length !== planes.length) marker.material.needsUpdate = true;
    marker.material.clippingPlanes = planes;
  }
  function setGeometry(geometry) {
    if (disposed) return;
    data = geometry; lastVoltages = null; selectedIndex = -1; activeNeuronId = null;
    bounds = new THREE.Box3();
    if (data) {
      bounds.set(vec(data.bounds.min), vec(data.bounds.max));
      // Remote return is intentionally included; it is part of the field model.
      for (const contact of data.contacts) {
        bounds.expandByPoint(vec(contact.positionUm));
        bounds.expandByPoint(vec(contact.positionUm).addScaledVector(vec(contact.normal || [0, 0, 1]), contact.kind === 'return' ? 95 : 165));
      }
      bounds.expandByScalar(30);
    }
    buildAnatomy(); buildScaffold(); resetCamera(); invalidate();
  }
  function setFrame(voltages) {
    if (disposed || !data || !voltages || voltages.length < data.nodes.length) return;
    // Values are copied because callers may reuse a typed-array view of a
    // transferred worker buffer. No simulation state is advanced by rendering.
    lastVoltages = Float32Array.from(voltages.subarray ? voltages.subarray(0, data.nodes.length) : voltages.slice(0, data.nodes.length));
    const junction = new Float32Array(data.nodes.length);
    for (let i = 0; i < data.nodes.length; i++) {
      if (data.nodes[i].kind === 'junction') { junction[i] = lastVoltages[i]; continue; }
      const endpoint = children[i].find(child => data.nodes[child].kind === 'junction');
      if (endpoint !== undefined) { junction[i] = lastVoltages[endpoint]; continue; }
      let weight = 1 / Math.max(.1, data.nodes[i].lengthUm), sum = lastVoltages[i] * weight;
      for (const child of children[i]) {
        const w = 1 / Math.max(.1, data.nodes[child].lengthUm); weight += w; sum += lastVoltages[child] * w;
      }
      junction[i] = sum / weight;
    }
    for (const mesh of neuronMeshes) {
      const colors = mesh.geometry.attributes.color.array;
      for (const piece of mesh.userData.pieces) {
        const node = data.nodes[piece.index], middle = lastVoltages[piece.index];
        const start = node.parent >= 0 ? junction[node.parent] : middle;
        const end = junction[piece.index];
        const samples = [start, middle, end].map(v => voltageRgb(v).map(linearChannel));
        for (let j = 0; j < piece.vertexCount; j++) {
          const t = piece.interpolation[j];
          // Cylinder rings lie at 0, 1/2 and 1. Raster interpolation supplies
          // continuous color between them; no traveling front is fabricated.
          const rgb = samples[node.kind === 'soma' ? 1 : Math.round(t * 2)], at = (piece.vertexStart + j) * 3;
          colors[at] = rgb[0]; colors[at + 1] = rgb[1]; colors[at + 2] = rgb[2];
        }
      }
      mesh.geometry.attributes.color.needsUpdate = true;
    }
    invalidate();
  }
  function setOptions(next = {}) {
    if (disposed) return;
    const previous = options;
    options = { ...options, ...next };
    options.theme = options.theme === 'light' ? 'light' : 'dark';
    options.diameterExaggeration = clamp(Number(options.diameterExaggeration) || 1, 1, 6);
    options.clip = options.clip === null || options.clip === false || options.clip === undefined ? null : clamp(options.clip === true ? .5 : Number(options.clip) || 0, 0, 1);
    scene.background = new THREE.Color(THEMES[options.theme].background);
    marker.material.color.set(options.theme === 'light' ? '#614b1f' : '#f0d49a');
    if (previous.diameterExaggeration !== options.diameterExaggeration) buildAnatomy();
    if (previous.theme !== options.theme) buildScaffold();
    applyClipping(); updateFocus(); invalidate();
  }
  function resize() {
    if (disposed) return;
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight || 420);
    const previousAspect = camera.aspect;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (Math.abs(previousAspect - camera.aspect) > .3) focus(activeNeuronId);
    invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) invalidate(); else if (frameRequest) { cancelAnimationFrame(frameRequest); frameRequest = 0; }
  }, { rootMargin: '100px' });
  intersection?.observe(host);
  document.addEventListener('visibilitychange', invalidate, { signal: events.signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true;
    if (frameRequest) { cancelAnimationFrame(frameRequest); frameRequest = 0; }
    updateOverlay(); onUnavailable('The 3D graphics context was interrupted. The anatomical 2D view remains available.');
  }, { signal: events.signal });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; invalidate(); }, { signal: events.signal });
  canvas.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; }, { signal: events.signal });
  canvas.addEventListener('pointerup', event => {
    const down = pointerStart; pointerStart = null;
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5 || !data) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(neuronMeshes, false);
    for (const hit of hits) {
      if (options.clip !== null && clipPlane.distanceToPoint(hit.point) < 0) continue;
      const piece = hit.object.userData.pieces.find(item => hit.faceIndex >= item.triangleStart && hit.faceIndex < item.triangleEnd);
      if (!piece) continue;
      selectNode(piece.index); onSelect({ index: piece.index, node: data.nodes[piece.index] }); break;
    }
  }, { signal: events.signal });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Home') { event.preventDefault(); resetCamera(); }
    if (event.key === 'Escape') { selectNode(-1); onSelect({ index: -1, node: null }); }
  }, { signal: events.signal });
  setOptions(); resize();
  return {
    available: true, setGeometry, setFrame, setOptions, focus, selectNode, resetCamera, resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frameRequest) cancelAnimationFrame(frameRequest);
      events.abort(); observer.disconnect(); intersection?.disconnect();
      controls.removeEventListener('change', invalidate); controls.dispose();
      for (const root of [anatomy, scaffold, tissue, electrodes, synapses, guides]) release(root);
      marker.geometry.dispose(); marker.material.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); overlay.remove();
      if (!oldPosition) host.style.position = oldPosition;
    },
  };
}
