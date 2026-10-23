import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// The sample's long axis is world X. Model coordinates remain micrometres:
// model x -> -world Z; model y -> world X; layer z -> world Y.
// Every material footprint below is read from the process engine's raster.
const BACKGROUND = '#292927';
const PALETTE = {
  carrier: '#797f85', base: '#c5a35e', resist: '#c07098', metal: '#e2bb63',
  encapsulation: '#ceb77d', mask: '#8978ad', annotation: '#eee5d5',
};
const DEFAULT_VIEW = { exploded: false, verticalScale: 3, sectionYUm: 170, selectedChannel: 1, view: 'device' };

function releaseContents(root) {
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

/** Merge identical horizontal spans into rectangles without filling any holes. */
function maskRectangles(mask, nx, ny) {
  let active = new Map();
  const result = [];
  for (let y = 0; y < ny; y++) {
    const next = new Map();
    let x = 0;
    while (x < nx) {
      if (!mask[y * nx + x]) { x++; continue; }
      const start = x;
      while (x < nx && mask[y * nx + x]) x++;
      const key = `${start}:${x}`;
      const rectangle = active.get(key) || { x0: start, x1: x, y0: y, y1: y };
      rectangle.y1 = y + 1;
      next.set(key, rectangle);
      active.delete(key);
    }
    result.push(...active.values());
    active = next;
  }
  result.push(...active.values());
  return result;
}

/** Closed, flat-sided solid of exactly the supplied occupied cells. */
function maskedSolid(mask, grid, thickness) {
  const { nx, ny, widthUm, heightUm } = grid;
  const sx = widthUm / nx, sy = heightUm / ny;
  const position = [], normal = [], index = [];
  function quad(a, b, c, d, n) {
    const base = position.length / 3;
    position.push(...a, ...b, ...c, ...d);
    normal.push(...n, ...n, ...n, ...n);
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  for (const rect of maskRectangles(mask, nx, ny)) {
    const x0 = rect.y0 * sy - heightUm / 2, x1 = rect.y1 * sy - heightUm / 2;
    const z0 = widthUm / 2 - rect.x0 * sx, z1 = widthUm / 2 - rect.x1 * sx;
    quad([x0, thickness, z1], [x0, thickness, z0], [x1, thickness, z0], [x1, thickness, z1], [0, 1, 0]);
    quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, -1, 0]);
  }
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const cell = y * nx + x;
    if (!mask[cell]) continue;
    const x0 = y * sy - heightUm / 2, x1 = x0 + sy;
    const z0 = widthUm / 2 - x * sx, z1 = z0 - sx;
    if (x === 0 || !mask[cell - 1]) quad([x0, 0, z0], [x1, 0, z0], [x1, thickness, z0], [x0, thickness, z0], [0, 0, 1]);
    if (x === nx - 1 || !mask[cell + 1]) quad([x1, 0, z1], [x0, 0, z1], [x0, thickness, z1], [x1, thickness, z1], [0, 0, -1]);
    if (y === 0 || !mask[cell - nx]) quad([x0, 0, z1], [x0, 0, z0], [x0, thickness, z0], [x0, thickness, z1], [-1, 0, 0]);
    if (y === ny - 1 || !mask[cell + nx]) quad([x1, 0, z0], [x1, 0, z1], [x1, thickness, z1], [x1, thickness, z0], [1, 0, 0]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

function materialFor(layer) {
  const id = `${layer.id} ${layer.name}`.toLowerCase();
  if (/metal|conductor|gold|platinum/.test(id)) return new THREE.MeshStandardMaterial({
    color: layer.color || PALETTE.metal, metalness: .48, roughness: .27,
    emissive: '#49330e', emissiveIntensity: .14, side: THREE.DoubleSide,
  });
  if (/carrier|silicon/.test(id)) return new THREE.MeshStandardMaterial({
    color: layer.color || PALETTE.carrier, metalness: .28, roughness: .4, side: THREE.DoubleSide,
  });
  if (/etch-mask/.test(id)) return new THREE.MeshStandardMaterial({
    color: layer.color || PALETTE.mask, metalness: .04, roughness: .48,
    transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false,
  });
  if (/resist/.test(id)) return new THREE.MeshStandardMaterial({
    color: layer.color || PALETTE.resist, metalness: .02, roughness: .45,
    transparent: true, opacity: .77, side: THREE.DoubleSide, depthWrite: false,
  });
  const top = /encapsulation|cap|top/.test(id);
  return new THREE.MeshStandardMaterial({
    color: layer.color || (top ? PALETTE.encapsulation : PALETTE.base),
    metalness: .02, roughness: .46, transparent: true,
    opacity: top ? .42 : .72, side: THREE.DoubleSide, depthWrite: false,
  });
}

function textSprite(text, { width = 256, worldWidth = 110, height = 64 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Group();
  context.clearRect(0, 0, width, height);
  context.font = '500 28px Arial, sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = PALETTE.annotation;
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false,
  }));
  sprite.scale.set(worldWidth, worldWidth * height / width, 1);
  sprite.renderOrder = 30;
  return sprite;
}

function lineFrom(points, { color = PALETTE.annotation, opacity = .8, dashed = false } = {}) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 8, gapSize: 6, depthTest: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances(); line.renderOrder = 20;
  return line;
}

// Stretch thin metal intervals as well as their neighbours' coordinates. This
// preserves layer ordering instead of drawing a thickened film inside its cap.
function displayHeights(layers, scale, exploded) {
  const events = [...new Set([0, ...layers.flatMap(layer => [layer.zUm, layer.zUm + layer.thicknessUm])])].sort((a, b) => a - b);
  const mapped = new Map();
  let total = events[0] * scale;
  mapped.set(events[0], total);
  for (let i = 1; i < events.length; i++) {
    const lo = events[i - 1], hi = events[i];
    const thinMetal = layers.some(layer => /metal|conductor/.test(layer.id) && layer.thicknessUm < .8 && layer.zUm <= lo + 1e-8 && layer.zUm + layer.thicknessUm >= hi - 1e-8);
    total += Math.max((hi - lo) * scale, thinMetal ? 1.25 : 0);
    mapped.set(hi, total);
  }
  const zero = mapped.get(0) || 0;
  const starts = [...new Set(layers.map(layer => layer.zUm))].sort((a, b) => a - b);
  return layers.map(layer => {
    const gap = exploded ? starts.indexOf(layer.zUm) * 32 : 0;
    const bottom = (mapped.get(layer.zUm) ?? layer.zUm * scale) - zero + gap;
    const top = (mapped.get(layer.zUm + layer.thicknessUm) ?? (layer.zUm + layer.thicknessUm) * scale) - zero + gap;
    return { layer, bottom, top, thickness: Math.max(.01, top - bottom) };
  });
}

function waferGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 128; i++) {
    const angle = i / 128 * Math.PI * 2;
    const x = Math.cos(angle) * 650, z = Math.max(-598, Math.sin(angle) * 650);
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 18, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2, steps: 1 });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Demand-rendered physical material view; the process model remains authoritative. */
export function createFabricationScene(host, { onError = () => {}, onSelectChannel = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch {
    const fallback = document.createElement('p');
    fallback.className = 'mf-scene-fallback';
    fallback.textContent = 'The 3D view needs WebGL. The cross-section, fabrication controls, and electrical measurements remain available.';
    fallback.style.cssText = 'padding:28px;color:inherit;margin:0;';
    host.append(fallback);
    onError('3D unavailable: WebGL could not be initialized.');
    return { update() {}, resetCamera() {}, setView() {}, dispose() { fallback.remove(); } };
  }
  let disposed = false, contextLost = false, frame = 0, visible = true, activeState = null;
  let options = { ...DEFAULT_VIEW }, previousState = null, previousStage = -1, previousScale = null, previousExploded = null, previousView = null;
  let displayedTop = 0, pickTargets = [], pointerStart = null;
  const events = new AbortController();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  const camera = new THREE.PerspectiveCamera(34, 1, .5, 15000);
  const sampleRoot = new THREE.Group(), annotationRoot = new THREE.Group(), environment = new THREE.Group();
  scene.add(sampleRoot, annotationRoot, environment);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  canvas.setAttribute('role', 'img'); canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Three-dimensional microfabricated sample. Drag to orbit, scroll or pinch to zoom, and select an electrode to inspect its channel.');
  host.append(canvas);
  const note = document.createElement('div');
  note.className = 'mf-scene-overlay';
  note.style.cssText = 'position:absolute;left:16px;bottom:14px;right:16px;pointer-events:none;color:#e3d8c5;font:12px/1.4 Arial,sans-serif;letter-spacing:.03em;';
  host.append(note);
  const oldPosition = host.style.position;
  if (!oldPosition) host.style.position = 'relative';
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .1;
  controls.minDistance = 80; controls.maxDistance = 6000;
  controls.maxPolarAngle = Math.PI * .48;
  controls.screenSpacePanning = true;
  controls.listenToKeyEvents(canvas);
  const ambient = new THREE.HemisphereLight('#f3ead9', '#57524a', 2.1);
  const key = new THREE.DirectionalLight('#fff0d7', 2.6); key.position.set(-400, 1100, 700);
  const fill = new THREE.DirectionalLight('#dde4f0', 1.5); fill.position.set(600, 600, -800);
  scene.add(ambient, key, fill);
  const grid = new THREE.GridHelper(2200, 22, '#777065', '#777065');
  grid.position.y = -140; grid.material.transparent = true; grid.material.opacity = .14;
  environment.add(grid);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function invalidate() {
    if (disposed || contextLost || !visible || document.hidden || frame) return;
    frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (disposed || contextLost || !visible || document.hidden) return;
    const moved = controls.update();
    renderer.render(scene, camera);
    if (moved) invalidate();
  }
  controls.addEventListener('change', invalidate);

  function resetCamera() {
    const wafer = options.view === 'wafer';
    const sizeX = wafer ? 1370 : (activeState?.geometry.heightUm || 1000) + 80;
    const sizeZ = wafer ? 1370 : (activeState?.geometry.widthUm || 320) + 200;
    const sizeY = wafer ? 70 : displayedTop + 120;
    const targetY = wafer ? -45 : Math.max(0, displayedTop * .38);
    const direction = new THREE.Vector3(wafer ? .12 : .18, wafer ? 1.15 : .86, 1).normalize();
    const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();
    const projectedWidth = Math.abs(right.x) * sizeX + Math.abs(right.y) * sizeY + Math.abs(right.z) * sizeZ;
    const projectedHeight = Math.abs(up.x) * sizeX + Math.abs(up.y) * sizeY + Math.abs(up.z) * sizeZ;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const distance = Math.max(projectedHeight / (2 * Math.tan(verticalFov / 2)), projectedWidth / (2 * Math.tan(verticalFov / 2) * camera.aspect)) * 1.14;
    controls.target.set(0, targetY, 0);
    camera.position.copy(controls.target).addScaledVector(direction, distance + sizeZ * .12);
    camera.lookAt(controls.target);
    controls.update(); invalidate();
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight || 420);
    const changedAspect = Math.abs(camera.aspect - width / height) > .2;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (changedAspect) resetCamera();
    invalidate();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) invalidate(); else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '120px' }) : null;
  intersection?.observe(host);
  document.addEventListener('visibilitychange', invalidate, { signal: events.signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    note.textContent = '3D rendering paused. The process model and measurements remain available.';
    onError('The WebGL context was interrupted.');
  }, { signal: events.signal });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; updateNote(); invalidate(); }, { signal: events.signal });
  canvas.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; }, { signal: events.signal });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
    pointerStart = null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (hit) onSelectChannel(hit.object.userData.channelId);
  }, { signal: events.signal });
  canvas.addEventListener('keydown', event => { if (event.key === 'Home') { event.preventDefault(); resetCamera(); } }, { signal: events.signal });

  function updateNote() {
    note.textContent = options.view === 'wafer'
      ? 'Schematic wafer layout · 20 copies of the current structure · no yield prediction'
      : 'Drag to orbit · scroll to zoom · translucent insulation · dimensions in µm';
  }

  function buildSample() {
    releaseContents(sampleRoot);
    if (!activeState?.geometry) return;
    const gridData = activeState.geometry;
    const layers = (activeState.layers || []).filter(layer => layer.mask?.length === gridData.nx * gridData.ny && Number.isFinite(layer.zUm) && layer.thicknessUm > 0);
    const heights = displayHeights(layers, options.verticalScale, options.exploded);
    displayedTop = Math.max(0, ...heights.map(item => item.top));
    const sample = new THREE.Group();
    for (const { layer, bottom, thickness } of heights) {
      if (!layer.mask.some(Boolean)) continue;
      const mesh = new THREE.Mesh(maskedSolid(layer.mask, gridData, thickness), materialFor(layer));
      mesh.name = layer.id; mesh.position.y = bottom;
      mesh.renderOrder = /metal/.test(layer.id) ? 2 : /carrier/.test(layer.id) ? 0 : 3;
      sample.add(mesh);
    }
    if (options.view === 'wafer') {
      const wafer = new THREE.Mesh(waferGeometry(), new THREE.MeshStandardMaterial({ color: '#7b858e', metalness: .42, roughness: .36 }));
      wafer.position.y = -80; sampleRoot.add(wafer);
      for (let row = -2; row <= 2; row++) for (let column = 0; column < 4; column++) {
        const copy = sample.clone(true);
        copy.scale.setScalar(.255);
        copy.position.set((column - 1.5) * 283, -42, row * 174);
        sampleRoot.add(copy);
      }
      // All copies share geometry/materials. releaseContents disposes each once.
      grid.visible = false;
    } else {
      sampleRoot.add(sample); grid.visible = true;
      grid.position.y = Math.min(-45, ...heights.map(item => item.bottom)) - 18;
    }
    buildAnnotations(); updateNote();
  }

  function buildAnnotations() {
    releaseContents(annotationRoot); pickTargets = [];
    if (!activeState?.geometry || options.view === 'wafer') return;
    const { widthUm, heightUm } = activeState.geometry;
    const sectionX = Math.max(0, Math.min(heightUm, options.sectionYUm)) - heightUm / 2;
    const lineY = displayedTop + 5;
    annotationRoot.add(lineFrom([[sectionX, lineY, -widthUm / 2 - 24], [sectionX, lineY, widthUm / 2 + 24]], { opacity: .9, dashed: true }));
    const sectionLabel = textSprite('A—A', { width: 128, worldWidth: 53 });
    sectionLabel.position.set(sectionX, lineY + 5, widthUm / 2 + 46);
    annotationRoot.add(sectionLabel);
    const rulerX = -heightUm / 2 + 80, rulerZ = widthUm / 2 + 112;
    annotationRoot.add(lineFrom([[rulerX, 1, rulerZ - 7], [rulerX, 1, rulerZ + 7], [rulerX, 1, rulerZ], [rulerX + 200, 1, rulerZ], [rulerX + 200, 1, rulerZ - 7], [rulerX + 200, 1, rulerZ + 7]], { opacity: .65 }));
    const scaleLabel = textSprite('200 µm', { worldWidth: 98 });
    scaleLabel.position.set(rulerX + 100, 4, rulerZ + 28); annotationRoot.add(scaleLabel);
    if (activeState.stage < 3) return;
    for (const channel of activeState.channels || []) {
      const worldX = channel.siteYUm - heightUm / 2, worldZ = widthUm / 2 - channel.xUm;
      const radius = Math.max(16, (activeState.config?.siteDiameterUm || 48) / 2);
      const pick = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.12, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
      pick.position.set(worldX, lineY, worldZ); pick.userData.channelId = channel.id;
      annotationRoot.add(pick); pickTargets.push(pick);
      const label = textSprite(String(channel.id), { width: 96, worldWidth: 26, height: 64 });
      label.position.set(worldX - radius - 28, lineY + 6, worldZ); annotationRoot.add(label);
      if (String(channel.id) !== String(options.selectedChannel)) continue;
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const angle = i / 64 * Math.PI * 2;
        points.push([worldX + Math.cos(angle) * (radius + 5), lineY + 1, worldZ + Math.sin(angle) * (radius + 5)]);
      }
      annotationRoot.add(lineFrom(points, { opacity: .95 }));
    }
  }

  function update(state, nextOptions = {}) {
    if (disposed) return;
    activeState = state;
    options = { ...options, ...nextOptions };
    options.verticalScale = Math.max(1, Math.min(20, Number(options.verticalScale) || 3));
    options.view = options.view === 'wafer' ? 'wafer' : 'device';
    const rebuild = previousState !== state || previousStage !== state?.stage || previousScale !== options.verticalScale || previousExploded !== options.exploded || previousView !== options.view;
    const refit = previousView !== options.view || previousExploded !== options.exploded || previousScale !== options.verticalScale;
    if (rebuild) buildSample(); else buildAnnotations();
    previousState = state; previousStage = state?.stage; previousScale = options.verticalScale;
    previousExploded = options.exploded; previousView = options.view;
    if (refit) resetCamera();
    invalidate();
  }

  function setView(view) { update(activeState, { view }); }
  resize(); resetCamera();
  return {
    update, resetCamera, setView,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      events.abort(); resizeObserver.disconnect(); intersection?.disconnect();
      controls.removeEventListener('change', invalidate); controls.dispose();
      releaseContents(sampleRoot); releaseContents(annotationRoot); releaseContents(environment);
      renderer.dispose(); canvas.remove(); note.remove();
      if (!oldPosition) host.style.position = oldPosition;
    },
  };
}
