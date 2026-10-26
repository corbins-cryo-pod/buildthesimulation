import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Anatomy is display context. The conductor model uses an explicitly labeled plane.
const displayRadiusMm = { x: 7.2, y: 5.8 };
const insideDisplayEllipse = ([xUm, yUm]) => (xUm / (displayRadiusMm.x * 1000)) ** 2 + (yUm / (displayRadiusMm.y * 1000)) ** 2 <= 1;
const curvature = (x, y) => (x * x + y * y) / 24;
const position = (xUm, yUm, gapUm = 0) => new THREE.Vector3(xUm / 1000, yUm / 1000, curvature(xUm / 1000, yUm / 1000) + gapUm / 1000);

function release(group) {
  const geometry = new Set(), material = new Set(), texture = new Set();
  group.traverse(o => { if (o.geometry) geometry.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) { material.add(m); for (const v of Object.values(m)) if (v?.isTexture) texture.add(v); } });
  group.clear(); geometry.forEach(v => v.dispose()); material.forEach(v => v.dispose()); texture.forEach(v => v.dispose());
}

function label(text, color = '#e9dfc5', size = .32) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.font = '32px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 40);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true })); sprite.scale.set(size * 6.4, size, 1); sprite.renderOrder = 10; return sprite;
}

export function createRetinalScene(host, { onSelect = () => {}, onUnavailable = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' }); }
  catch { onUnavailable('3D graphics are unavailable in this browser. The retinal plan and numerical calculations remain available.'); return { update() {}, reset() {}, setVisible() {}, dispose() {} }; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.domElement.className = 'ri-webgl-canvas'; renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Three-dimensional retinal surface, reference nerve-fiber trajectories and epiretinal contacts. Drag to orbit; scroll to zoom.'); host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#232823');
  const camera = new THREE.PerspectiveCamera(36, 1, .03, 100); camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false; controls.minDistance = 2; controls.maxDistance = 50; controls.maxPolarAngle = Math.PI * .94;
  scene.add(new THREE.HemisphereLight('#fff4d4', '#163b39', 2)); const light = new THREE.DirectionalLight('#ffe9c4', 2.5); light.position.set(-3, -4, 10); scene.add(light);
  const rim = new THREE.DirectionalLight('#9bc3cb', 1.4); rim.position.set(7, 5, 5); scene.add(rim);
  const anatomy = new THREE.Group(), fibers = new THREE.Group(), implant = new THREE.Group(), labels = new THREE.Group(); scene.add(anatomy, fibers, implant, labels);
  let state = null, disposed = false, frame = 0, shown = true, inView = true, meshes = [], down = null, geometryKey = '', fiberKey = '';
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), abort = new AbortController();
  // A cached IntersectionObserver result can lag a scroll or resize. Use it to
  // request redraws, never to veto one after setSize has cleared the buffer.
  const paint = () => { frame = 0; if (!disposed && shown && host.clientWidth > 0 && host.clientHeight > 0) renderer.render(scene, camera); };
  const invalidate = () => { if (!disposed && !frame) frame = requestAnimationFrame(paint); };
  const resize = () => { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); invalidate(); };
  const resizer = new ResizeObserver(resize); resizer.observe(host);
  const visibility = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; if (inView) invalidate(); }); visibility.observe(host);
  controls.addEventListener('change', invalidate);

  function buildAnatomy(data, eye) {
    release(anatomy); release(labels);
    const rings = 40, sectors = 160, vertices = [0, 0, curvature(0, 0)], indices = [];
    for (let ring = 1; ring <= rings; ring++) for (let sector = 0; sector < sectors; sector++) {
      const angle = sector / sectors * Math.PI * 2, radius = ring / rings;
      const x = displayRadiusMm.x * radius * Math.cos(angle), y = displayRadiusMm.y * radius * Math.sin(angle); vertices.push(x, y, curvature(x, y));
    }
    for (let sector = 0; sector < sectors; sector++) indices.push(0, 1 + sector, 1 + (sector + 1) % sectors);
    for (let ring = 1; ring < rings; ring++) for (let sector = 0; sector < sectors; sector++) {
      const inner = 1 + (ring - 1) * sectors, outer = inner + sectors, next = (sector + 1) % sectors;
      indices.push(inner + sector, outer + sector, outer + next, inner + sector, outer + next, inner + next);
    }
    const surface = new THREE.BufferGeometry(); surface.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); surface.setIndex(indices); surface.computeVertexNormals();
    anatomy.add(new THREE.Mesh(surface, new THREE.MeshStandardMaterial({ color: '#8d7e58', roughness: .95, side: THREE.DoubleSide, transparent: true, opacity: .55, depthWrite: false })));
    const lower = new THREE.Mesh(surface.clone(), new THREE.MeshStandardMaterial({ color: '#3f6960', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .35, depthWrite: false })); lower.position.z = -.16; anatomy.add(lower);
    const fovea = new THREE.Mesh(new THREE.RingGeometry(.13, .18, 48), new THREE.MeshBasicMaterial({ color: '#d7c79f', side: THREE.DoubleSide })); fovea.position.z = .015; anatomy.add(fovea);
    const discXY = data?.opticDiscUm ?? [4200, -300], discPosition = position(discXY[0] * (eye === 'LE' ? -1 : 1), discXY[1], 20);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.38, 48), new THREE.MeshStandardMaterial({ color: '#c9bd96', roughness: 1, side: THREE.DoubleSide })); disc.position.copy(discPosition); disc.scale.set(.8, 1.2, 1); anatomy.add(disc);
    const foveaLabel = label('Fovea'); foveaLabel.position.set(0, -.65, .2); labels.add(foveaLabel);
    const discLabel = label('Optic disc'); discLabel.position.copy(discPosition).add(new THREE.Vector3(0, -.8, .15)); labels.add(discLabel);
    const scale = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4, -4.5, 1.4), new THREE.Vector3(-3, -4.5, 1.4)]), new THREE.LineBasicMaterial({ color: '#e3d5b4' })); labels.add(scale);
    const scaleLabel = label('1 mm', '#e3d5b4', .25); scaleLabel.position.set(-3.5, -4.9, 1.4); labels.add(scaleLabel);
  }

  function buildFibers(data, eye) {
    release(fibers); const paths = data?.bundles ?? data?.paths ?? [], points = [], mirror = (data?.eye ?? 'RE') !== eye ? -1 : 1;
    for (const item of paths) { const path = Array.isArray(item) ? item : item.points ?? [];
      for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; if (!insideDisplayEllipse(a) || !insideDisplayEllipse(b)) continue; const p = position(a[0] * mirror, a[1], 9), q = position(b[0] * mirror, b[1], 9); points.push(p.x, p.y, p.z, q.x, q.y, q.z); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); fibers.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#dcc38b', opacity: .43, transparent: true, depthWrite: false })));
  }

  function buildImplant(contacts, config, selectedId) {
    release(implant); meshes = []; if (!contacts.length) return;
    const angle = config.rotationDeg * Math.PI / 180, co = Math.cos(angle), si = Math.sin(angle), cx = config.xUm, cy = config.yUm;
    const local = contacts.map(c => [(c.xUm - cx) * co + (c.yUm - cy) * si, -(c.xUm - cx) * si + (c.yUm - cy) * co]);
    const x0 = Math.min(...local.map(p => p[0])) - 190, x1 = Math.max(...local.map(p => p[0])) + 190, y0 = Math.min(...local.map(p => p[1])) - 190, y1 = Math.max(...local.map(p => p[1])) + 190;
    const vertices = [], indices = [], nx = 20, ny = 16;
    for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) { const x = x0 + (x1 - x0) * ix / nx, y = y0 + (y1 - y0) * iy / ny, p = position(cx + co * x - si * y, cy + si * x + co * y, config.gapUm + 25); vertices.push(p.x, p.y, p.z); }
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) { const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1; indices.push(a, b, d, a, d, c); }
    const surface = new THREE.BufferGeometry(); surface.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); surface.setIndex(indices); surface.computeVertexNormals();
    implant.add(new THREE.Mesh(surface, new THREE.MeshStandardMaterial({ color: '#80938b', roughness: .7, metalness: .15, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false })));
    const maximum = Math.max(1, ...contacts.map(c => c.amplitudeUa));
    for (const c of contacts) {
      const ratio = c.amplitudeUa / maximum, color = c.id === selectedId ? '#f6d894' : !c.enabled ? '#454d48' : c.amplitudeUa > 0 ? new THREE.Color('#b79d5e').lerp(new THREE.Color('#efd091'), ratio) : '#717e77';
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(c.radiusUm / 1000, c.radiusUm / 1000, .035, 24), new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: .6, emissive: c.id === selectedId ? '#6a4e16' : '#000000', emissiveIntensity: .4 })); mesh.rotation.x = Math.PI / 2; mesh.position.copy(position(c.xUm, c.yUm, config.gapUm)); mesh.userData.contactId = c.id; implant.add(mesh); meshes.push(mesh);
      if (c.id === selectedId) { const ring = new THREE.Mesh(new THREE.RingGeometry(c.radiusUm / 1000 + .035, c.radiusUm / 1000 + .055, 32), new THREE.MeshBasicMaterial({ color: '#f8ecc6', side: THREE.DoubleSide })); ring.position.copy(mesh.position).add(new THREE.Vector3(0, 0, .025)); implant.add(ring); }
    }
  }

  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; }, { signal: abort.signal });
  renderer.domElement.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; } down = null; const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(meshes)[0]; if (hit) onSelect(hit.object.userData.contactId); }, { signal: abort.signal });
  renderer.domElement.addEventListener('webglcontextlost', () => onUnavailable('The 3D graphics context was lost. The retinal plan remains available.'), { signal: abort.signal });
  const reset = () => { camera.position.set(9, -14, 13); controls.target.set(.4, 0, .35); controls.update(); resize(); };
  reset();
  return {
    update(next) { state = next; const nextGeometry = `${next.config.eye}:${next.axonData?.opticDiscUm?.join(',')}`; if (geometryKey !== nextGeometry) { buildAnatomy(next.axonData, next.config.eye); geometryKey = nextGeometry; } const nextFibers = `${next.config.eye}:${(next.axonData?.bundles ?? next.axonData?.paths ?? []).length}`; if (fiberKey !== nextFibers) { buildFibers(next.axonData, next.config.eye); fiberKey = nextFibers; } fibers.visible = next.showFibers; buildImplant(next.contacts, next.config, next.selectedId); invalidate(); },
    setVisible(visible) { shown = visible; if (visible) resize(); }, reset,
    dispose() { disposed = true; cancelAnimationFrame(frame); abort.abort(); resizer.disconnect(); visibility.disconnect(); controls.dispose(); [anatomy, fibers, implant, labels].forEach(release); renderer.dispose(); renderer.domElement.remove(); },
  };
}
