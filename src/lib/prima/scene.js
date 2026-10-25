import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Reconstructed device geometry and schematic anatomical context. This renderer
// never supplies geometry to the electrical solver or changes its depth values.
function disposeGroup(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(item => {
    if (item.geometry) geometries.add(item.geometry);
    for (const material of Array.isArray(item.material) ? item.material : [item.material]) if (material) {
      materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  group.clear(); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
}

function textLabel(text, width = 1.0, color = '#e8dec1') {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 80;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '28px Arial'; ctx.fillText(text, 384, 40);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(width, width / 9.6, 1); sprite.renderOrder = 10; return sprite;
}

function roundedSquare(size, radius) {
  const x = -size / 2, y = -size / 2, shape = new THREE.Shape();
  shape.moveTo(x + radius, y); shape.lineTo(x + size - radius, y); shape.quadraticCurveTo(x + size, y, x + size, y + radius);
  shape.lineTo(x + size, y + size - radius); shape.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  shape.lineTo(x + radius, y + size); shape.quadraticCurveTo(x, y + size, x, y + size - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y); return shape;
}

function line(points, color, opacity = 1) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
}

function imageTexture(data) {
  const n = data?.width ?? data?.size, m = data?.height ?? data?.size, values = data?.values;
  if (!n || !m || !values) return null;
  const canvas = document.createElement('canvas'); canvas.width = n; canvas.height = m;
  const ctx = canvas.getContext('2d'), frame = ctx.createImageData(n, m);
  for (let i = 0; i < n * m; i++) { const v = Math.max(0, Math.min(1, values[i])), p = i * 4; frame.data[p] = 118; frame.data[p + 1] = 191; frame.data[p + 2] = 191; frame.data[p + 3] = Math.round(v * 145); }
  ctx.putImageData(frame, 0, 0); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function createPrimaScene(host, { onSelect = () => {}, onUnavailable = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' }); }
  catch { onUnavailable('The 3D renderer is unavailable. The calculated plan and section remain accessible.'); return { update() {}, setVisible() {}, reset() {}, dispose() {} }; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  renderer.domElement.className = 'pr-webgl'; renderer.domElement.dataset.primaWebgl = 'true'; renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Reconstructed PRIMA photovoltaic implant, optical projection, and schematic retinal cells. Drag to orbit, scroll to zoom, or select a pixel.');
  host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#202521');
  const camera = new THREE.PerspectiveCamera(35, 1, .005, 40); camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.minDistance = .6; controls.maxDistance = 11; controls.maxPolarAngle = Math.PI * .94;
  scene.add(new THREE.HemisphereLight('#fff7d8', '#203e3d', 2.4));
  const key = new THREE.DirectionalLight('#fff1ce', 3); key.position.set(-2, -3, 5); scene.add(key);
  const edge = new THREE.DirectionalLight('#9bc7ce', 2); edge.position.set(3, 2, 3); scene.add(edge);
  const device = new THREE.Group(), anatomy = new THREE.Group(), projection = new THREE.Group(), labels = new THREE.Group(); scene.add(device, anatomy, projection, labels);
  const pickable = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), abort = new AbortController();
  let disposed = false, shown = true, inView = true, frame = 0, down = null, state = null, deviceKey = '', anatomyKey = '', projectionKey = '';
  let renderAttempts = 0, renderedFrames = 0, renderedExperimentId = null;
  // Read-only diagnostics let browser QA distinguish scheduling, scene, and GPU
  // failures without changing the rendered image or the numerical calculation.
  Object.defineProperty(renderer.domElement, 'primaSceneDiagnostics', { get: () => ({
    disposed, shown, inView, framePending: Boolean(frame), renderAttempts, renderedFrames, renderedExperimentId,
    experimentId: state?.experimentId ?? null,
    host: { width: host.clientWidth, height: host.clientHeight },
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), aspect: camera.aspect, near: camera.near, far: camera.far },
    groups: Object.fromEntries(Object.entries({ device, anatomy, projection, labels }).map(([name, group]) => [name, { children: group.children.length, visible: group.visible }])),
    render: { ...renderer.info.render }, contextLost: renderer.getContext().isContextLost(),
  }) });
  const invalidate = () => { if (!disposed && !frame) frame = requestAnimationFrame(() => {
    frame = 0;
    // IntersectionObserver is asynchronous: its cached offscreen result can
    // outlive a scroll or resize. It may request a repaint, but must not veto
    // one after setSize has cleared the buffer or a calculation has completed.
    if (shown && host.clientWidth > 0 && host.clientHeight > 0) {
      renderAttempts++; renderer.render(scene, camera); renderedFrames++;
      renderedExperimentId = state?.experimentId ?? null;
    }
  }); };
  const resize = () => { const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate(); };
  const resizer = new ResizeObserver(resize); resizer.observe(host);
  const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; if (inView) invalidate(); }); observer.observe(host);
  controls.addEventListener('change', invalidate);

  function buildDevice(next) {
    disposeGroup(device); pickable.length = 0;
    const shape = roundedSquare(2, .12), body = new THREE.ExtrudeGeometry(shape, { depth: .03, bevelEnabled: false, curveSegments: 12 });
    const wafer = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: '#394c53', roughness: .38, metalness: .62 })); wafer.position.z = -.03; device.add(wafer);
    const raw = next.pixelMetrics ?? [], metrics = Array.isArray(raw) ? new Map(raw.map(m => [m.id ?? m.pixelId, m])) : new Map(Object.entries(raw));
    const activeMaterial = new THREE.MeshStandardMaterial({ color: '#dac68b', roughness: .32, metalness: .75 });
    const selectedMaterial = new THREE.MeshStandardMaterial({ color: '#fff0b3', emissive: '#73501e', emissiveIntensity: .4, metalness: .55, roughness: .3 });
    const pixels = next.geometry?.pixels ?? next.pixels ?? [];
    const lineSegments = [], separators = [];
    for (const pixel of pixels) {
      const verts = pixel.vertices ?? pixel.verticesUm ?? [], shape = new THREE.Shape();
      verts.forEach((p, k) => { const x = (p.xUm ?? p[0]) / 1000, y = (p.yUm ?? p[1]) / 1000; if (k) shape.lineTo(x, y); else shape.moveTo(x, y); }); shape.closePath();
      const hole = new THREE.Path(), radius = (next.config?.activeRadiusUm ?? pixel.activeRadiusUm ?? 15) / 1000; hole.absarc(pixel.xUm / 1000, pixel.yUm / 1000, radius * 1.18, 0, Math.PI * 2, true); shape.holes.push(hole);
      const illumination = Math.max(0, Math.min(1, metrics.get(pixel.id)?.illumination ?? pixel.illumination ?? 0));
      const baseColor = new THREE.Color('#27454f').lerp(new THREE.Color('#567f77'), illumination);
      const material = new THREE.MeshStandardMaterial({ color: baseColor, metalness: .65, roughness: .35, side: THREE.DoubleSide, emissive: new THREE.Color('#48735b'), emissiveIntensity: illumination * .15 });
      const tile = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), material); tile.position.z = .001; tile.userData.pixelId = pixel.id; device.add(tile); pickable.push(tile);
      const active = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), pixel.id === next.selectedId ? selectedMaterial : activeMaterial); active.position.set(pixel.xUm / 1000, pixel.yUm / 1000, .003); active.userData.pixelId = pixel.id; device.add(active); pickable.push(active);
      const x = pixel.xUm / 1000, y = pixel.yUm / 1000;
      separators.push(x, y + radius * 1.2, .002, x, y + .048, .002, x, y - radius * 1.2, .002, x, y - .048, .002);
      if (pixel.id === next.selectedId) {
        const points = verts.map(p => [(p.xUm ?? p[0]) / 1000, (p.yUm ?? p[1]) / 1000, .005]); if (points.length) { points.push(points[0]); device.add(line(points, '#fff1bd')); }
      }
    }
    for (const e of next.geometry?.meshEdges ?? []) lineSegments.push(e.x1Um / 1000, e.y1Um / 1000, .003, e.x2Um / 1000, e.y2Um / 1000, .003);
    if (!lineSegments.length) for (const p of pixels) { const verts = p.vertices ?? []; verts.forEach((v, k) => { const q = verts[(k + 1) % verts.length]; lineSegments.push(v.xUm / 1000, v.yUm / 1000, .003, q.xUm / 1000, q.yUm / 1000, .003); }); }
    const mesh = new THREE.BufferGeometry(); mesh.setAttribute('position', new THREE.Float32BufferAttribute(lineSegments, 3)); device.add(new THREE.LineSegments(mesh, new THREE.LineBasicMaterial({ color: '#c1b27d' })));
    const splits = new THREE.BufferGeometry(); splits.setAttribute('position', new THREE.Float32BufferAttribute(separators, 3)); device.add(new THREE.LineSegments(splits, new THREE.LineBasicMaterial({ color: '#8e9477', opacity: .7, transparent: true })));
  }

  function buildAnatomy(next) {
    disposeGroup(anatomy); disposeGroup(labels);
    const gap = Number(next.config?.debrisUm ?? next.config?.gapUm ?? next.config?.debrisThicknessUm ?? 40) / 1000;
    const scale = next.expanded ? 4 : 1, depth = z => z * scale;
    const membrane = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 2.65), new THREE.MeshStandardMaterial({ color: '#a49a70', side: THREE.DoubleSide, transparent: true, opacity: .11, depthWrite: false })); membrane.position.z = depth(gap); anatomy.add(membrane);
    const outer = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1.325, -1.325, depth(gap)], [1.325, -1.325, depth(gap)], [1.325, 1.325, depth(gap)], [-1.325, 1.325, depth(gap)]].map(p => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color: '#8e9b80', transparent: true, opacity: .35 })); anatomy.add(outer);
    const cellMaterial = new THREE.MeshStandardMaterial({ color: '#9eaf8a', roughness: .85, transparent: true, opacity: .72, depthWrite: false });
    const cellGeometry = new THREE.SphereGeometry(.011, 9, 7), branches = [];
    for (let row = 0; row < 7; row++) for (let col = 0; col < 8; col++) {
      const x = -.99 + col * .285 + .032 * Math.sin(row * 2.1 + col), y = -.95 + row * .31 + .022 * Math.cos(col * 1.8), base = gap + .008, soma = gap + .029 + .005 * Math.sin(row + col), terminal = gap + .067;
      const cell = new THREE.Mesh(cellGeometry, cellMaterial); cell.position.set(x, y, depth(soma)); cell.scale.set(1, 1, next.expanded ? 1.9 : 1.3); anatomy.add(cell);
      branches.push(x, y, depth(base), x, y, depth(terminal));
      for (let k = 0; k < 3; k++) { const angle = k * Math.PI * 2 / 3 + row * .3, dx = .035 * Math.cos(angle), dy = .035 * Math.sin(angle); branches.push(x, y, depth(base + .01), x + dx, y + dy, depth(base), x, y, depth(terminal - .01), x + dx, y + dy, depth(terminal)); }
    }
    const branchGeometry = new THREE.BufferGeometry(); branchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(branches, 3)); anatomy.add(new THREE.LineSegments(branchGeometry, new THREE.LineBasicMaterial({ color: '#9eae88', transparent: true, opacity: .6 })));
    const top = depth(gap + .08), plane = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 2.65), new THREE.MeshBasicMaterial({ color: '#6f958a', transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide })); plane.position.z = top; anatomy.add(plane);
    const scaleLine = line([[-1, -1.19, -.02], [1, -1.19, -.02]], '#e1ce99'); labels.add(scaleLine);
    labels.add(line([[-1, -1.14, -.02], [-1, -1.24, -.02]], '#e1ce99')); labels.add(line([[1, -1.14, -.02], [1, -1.24, -.02]], '#e1ce99'));
    const scaleLabel = textLabel('2 mm', .48); scaleLabel.position.set(0, -1.37, -.02); labels.add(scaleLabel);
    const chipLabel = textLabel('Photovoltaic array · 30 μm thick', 1.45); chipLabel.position.set(-.12, -.98, -.15); labels.add(chipLabel);
    const tissueLabel = textLabel('Bipolar-cell region · schematic', 1.5, '#b6c8b2'); tissueLabel.position.set(.05, 1.26, top + .035); labels.add(tissueLabel);
  }

  function buildProjection(next) {
    disposeGroup(projection);
    const z = 1.03, texture = imageTexture(next.input);
    if (texture) { const screen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })); screen.position.z = z; projection.add(screen); }
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) projection.add(line([[x, y, z], [x, y, .008]], '#7da8ac', .2));
    projection.add(line([[-1, -1, z], [1, -1, z], [1, 1, z], [-1, 1, z], [-1, -1, z]], '#92bbb8', .45));
    const title = textLabel('880 nm optical projection', 1.32, '#b4d5d0'); title.position.set(0, .98, z + .12); projection.add(title);
  }

  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; }, { signal: abort.signal });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; } down = null;
    const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickable)[0]; if (hit) onSelect(hit.object.userData.pixelId);
  }, { signal: abort.signal });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onUnavailable('The 3D graphics context was lost. Switch to plan or section.'); }, { signal: abort.signal });
  const reset = () => { camera.position.set(3.15, -4.15, 3.45); controls.target.set(0, 0, .27); controls.update(); resize(); };
  reset();
  return {
    update(next) {
      state = next;
      const currentDeviceKey = `${next.geometry?.pixels?.length ?? 0}:${next.selectedId}:${next.experimentId ?? ''}:${next.pixelMetrics?.length ?? 0}:${next.config?.activeRadiusUm}`;
      if (currentDeviceKey !== deviceKey) { buildDevice(next); deviceKey = currentDeviceKey; }
      const currentAnatomyKey = `${next.config?.debrisUm ?? next.config?.gapUm ?? next.config?.debrisThicknessUm}:${next.expanded}`;
      if (currentAnatomyKey !== anatomyKey) { buildAnatomy(next); anatomyKey = currentAnatomyKey; }
      const currentProjectionKey = `${next.experimentId ?? ''}:${Boolean(next.input)}`;
      if (currentProjectionKey !== projectionKey) { buildProjection(next); projectionKey = currentProjectionKey; }
      anatomy.visible = next.showTissue !== false; projection.visible = next.showProjection !== false; invalidate();
    },
    setVisible(visible) { shown = visible; if (visible) resize(); },
    reset,
    dispose() { disposed = true; cancelAnimationFrame(frame); abort.abort(); resizer.disconnect(); observer.disconnect(); controls.dispose(); [device, anatomy, projection, labels].forEach(disposeGroup); renderer.dispose(); renderer.domElement.remove(); },
  };
}
