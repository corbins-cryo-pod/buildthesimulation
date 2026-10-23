import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { axonAt, localMyelin, sampleFieldsAt } from './model.mjs';
import { createNerveFallback } from './fallback.mjs';

// The numerical model owns biology and all growth trajectories. This module is
// a procedural, representative anatomical view of those trajectories. Its
// transverse and fiber magnifications are explicit display transforms only.
const MAX_AXONS = 144;
const AXON_SEGMENTS = 56;
const COLORS = {
  axon: '#dcba78', growing: '#69c6b5', myelin: '#e5dcc4', motor: '#d1a361',
  sensory: '#88bfc5', wrong: '#d18472', lost: '#7e6561', waiting: '#a89b7d', stalled: '#817d76',
  schwann: '#598c7d', nucleus: '#b2d4b9', vessel: '#a96155', debris: '#a19b8c',
  selected: '#fff8c9', scar: '#a57570', sheath: '#c3b59a', scaffold: '#87a2a2',
};
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const hash = (x) => {
  let n = (Math.imul((x | 0) ^ 0x68bc21eb, 0x45d9f3b) >>> 0);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const ease = (x) => { const v = clamp(x); return v * v * (3 - 2 * v); };
const myelinPalette = Array.from({ length: 65 }, (_, i) => new THREE.Color(COLORS.axon).lerp(new THREE.Color(COLORS.myelin), ease(i / 64)));
const supportPalette = Array.from({ length: 65 }, (_, i) => new THREE.Color('#9c6156').lerp(new THREE.Color('#83c9aa'), i / 64));
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const unitY = new THREE.Vector3(0, 1, 0);
const delta = new THREE.Vector3();
const midpoint = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const pA = new THREE.Vector3();
const pB = new THREE.Vector3();

function cylinderInstance(mesh, index, a, b, radius, tint) {
  delta.subVectors(b, a);
  const length = delta.length();
  midpoint.addVectors(a, b).multiplyScalar(.5);
  quaternion.setFromUnitVectors(unitY, length > 1e-10 ? delta.multiplyScalar(1 / length) : unitY);
  scale.set(radius, Math.max(length, 1e-8), radius);
  matrix.compose(midpoint, quaternion, scale);
  mesh.setMatrixAt(index, matrix);
  if (tint) mesh.setColorAt(index, color.set(tint));
}

function ellipsoidInstance(mesh, index, center, dimensions, tint, direction = null) {
  midpoint.set(center[0], center[1], center[2]);
  if (direction) {
    delta.set(direction[0], direction[1], direction[2]).normalize();
    quaternion.setFromUnitVectors(unitY, delta);
  } else quaternion.identity();
  scale.set(dimensions[0], dimensions[1], dimensions[2]);
  matrix.compose(midpoint, quaternion, scale);
  mesh.setMatrixAt(index, matrix);
  if (tint) mesh.setColorAt(index, color.set(tint));
}

function finishInstances(mesh, count) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function instanced(geometry, capacity, materialOptions = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: .58, metalness: .08, ...materialOptions,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

function clearGroup(group) {
  const geometries = new Set(), materials = new Set();
  for (const child of [...group.children]) {
    child.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) materials.add(m);
    });
    group.remove(child);
  }
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function interpolateField(fields, name, x) {
  const xs = fields?.xMm, ys = fields?.[name];
  if (!xs?.length || !ys?.length) return 0;
  if (x <= xs[0]) return ys[0] || 0;
  if (x >= xs.at(-1)) return ys.at(-1) || 0;
  let lo = 0, hi = xs.length - 1;
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
  const f = (x - xs[lo]) / Math.max(1e-12, xs[hi] - xs[lo]);
  return (ys[lo] || 0) * (1 - f) + (ys[hi] || 0) * f;
}

// Obtain the actual recorded trajectory at an x coordinate. The model's axial
// advance is monotone; t is retained by the model to compute local myelin age.
function pathPoint(axon, x) {
  const origin = axon.origin || [0, 0];
  if (x <= 0) return [x, origin[0], origin[1]];
  const path = axon.path || [];
  if (!path.length) return [x, origin[0], origin[1]];
  let lo = 0, hi = path.length - 1;
  if (x >= path[hi].x) return [x, path[hi].y, path[hi].z];
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (path[mid].x <= x) lo = mid; else hi = mid; }
  const a = path[lo], b = path[hi];
  const f = clamp((x - a.x) / Math.max(1e-12, b.x - a.x));
  return [x, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f];
}

function pathVector(axon, x, out) {
  const origin = axon.origin || [0, 0], path = axon.path || [];
  if (x <= 0 || !path.length) return out.set(x, origin[0], origin[1]);
  let lo = 0, hi = path.length - 1;
  if (x >= path[hi].x) return out.set(x, path[hi].y, path[hi].z);
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (path[mid].x <= x) lo = mid; else hi = mid; }
  const a = path[lo], b = path[hi];
  const f = clamp((x - a.x) / Math.max(1e-12, b.x - a.x));
  return out.set(x, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
}

function cutawayShell(radius, start, length, opacity, tint, opening = true) {
  const geometry = new THREE.CylinderGeometry(radius, radius, Math.max(length, .015), 64, 1, true,
    opening ? Math.PI * .24 : 0, opening ? Math.PI * 1.48 : Math.PI * 2);
  geometry.rotateZ(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: tint, roughness: .8, metalness: .04, transparent: true, opacity,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  mesh.position.x = start + length / 2;
  return mesh;
}

function rim(radius, x, tint, opacity = .6) {
  const geometry = new THREE.TorusGeometry(radius, .008, 6, 72, Math.PI * 1.48);
  geometry.rotateY(Math.PI / 2);
  geometry.rotateX(-Math.PI * .24);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: tint, roughness: .72, transparent: true, opacity,
  }));
  mesh.position.x = x;
  return mesh;
}

function safeId(value) { return Number.isFinite(Number(value)) ? Number(value) : String(value); }

export function createNerveViewer(container, { onSelect = () => {} } = {}) {
  if (!container) throw new Error('A nerve regeneration viewport is required.');
  container.querySelector('.nr-scene-loading')?.remove();
  const abort = new AbortController();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    return createNerveFallback(container, { onSelect });
  }

  const canvas = renderer.domElement;
  canvas.className = 'nr-three-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Procedural three-dimensional nerve injury, growing representative axons and supporting tissue. Drag to orbit, scroll to zoom.');
  container.prepend(canvas);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#222725');
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.minDistance = 2.5;
  controls.maxDistance = 150;
  controls.enablePan = true;
  controls.autoRotate = false;
  const hemisphere = new THREE.HemisphereLight('#fff4dd', '#213a37', 2.4);
  const key = new THREE.DirectionalLight('#fff4df', 3.2);
  key.position.set(-8, 12, 16);
  const fill = new THREE.DirectionalLight('#a5e0d9', 1.5);
  fill.position.set(12, -4, -8);
  scene.add(hemisphere, key, fill);

  const anatomical = new THREE.Group();
  const staticGroup = new THREE.Group(), tissueGroup = new THREE.Group(), fibersGroup = new THREE.Group();
  const sheathGroup = new THREE.Group(), scaffoldsGroup = new THREE.Group(), labelsGroup = new THREE.Group();
  anatomical.add(staticGroup, tissueGroup, fibersGroup);
  staticGroup.add(sheathGroup, scaffoldsGroup);
  scene.add(anatomical, labelsGroup);

  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 7, 1, false);
  const sphereGeometry = new THREE.SphereGeometry(1, 10, 7);
  const segmentCapacity = MAX_AXONS * (AXON_SEGMENTS + 8);
  const axonMesh = instanced(cylinderGeometry, segmentCapacity, { roughness: .42, metalness: .06 });
  const myelinMesh = instanced(cylinderGeometry, MAX_AXONS * 100, { roughness: .6, metalness: .03 });
  const tipsMesh = instanced(sphereGeometry, MAX_AXONS, { roughness: .36, metalness: .04 });
  const filopodiaMesh = instanced(cylinderGeometry, MAX_AXONS * 4, { roughness: .55 });
  const schwannMesh = instanced(sphereGeometry, 350, { roughness: .88, transparent: true, opacity: .5, depthWrite: false });
  const nucleiMesh = instanced(sphereGeometry, 350, { roughness: .55 });
  const debrisMesh = instanced(cylinderGeometry, 3500, { roughness: .84, transparent: true, opacity: .64 });
  const vesselMesh = instanced(cylinderGeometry, 650, { roughness: .82, transparent: true, opacity: .68 });
  const scarMesh = instanced(cylinderGeometry, 350, { roughness: .9, transparent: true, opacity: .28, depthWrite: false });
  fibersGroup.add(axonMesh, myelinMesh, tipsMesh, filopodiaMesh);
  tissueGroup.add(schwannMesh, nucleiMesh, debrisMesh, vesselMesh, scarMesh);

  let result = null, shown = [], baseShown = [], fields = null, day = 0, selected = null, disposed = false;
  let representativeCount = 0, segmentIds = [], myelinIds = [], tipIds = [];
  let xMin = -4, xMax = 14, gap = 8, radius = 1;
  let visible = true, animation = 0, lastDraw = 0, updateQueued = false, contextLost = false;
  const options = {
    view: 'anatomy', showSheath: true, showSchwann: true, showVessels: false,
    showDebris: true, showScar: false, radialScale: 3, fiberScale: 3,
  };

  const labelElements = [];
  for (const text of ['Proximal stump', 'Repair gap', 'Distal pathway']) {
    const el = document.createElement('span');
    el.className = 'nr-world-label';
    el.textContent = text;
    el.style.cssText = 'position:absolute;pointer-events:none;z-index:2;color:#d6ccba;background:#202623b8;padding:3px 6px;font:11px/1.25 Arial,sans-serif;letter-spacing:.03em;white-space:nowrap;transform:translate(-50%,-50%);';
    container.append(el);
    labelElements.push(el);
  }
  const scaleLabel = document.createElement('span');
  scaleLabel.className = 'nr-scene-scale';
  scaleLabel.style.cssText = 'position:absolute;left:16px;bottom:13px;z-index:2;color:#c8beaa;font:11px/1.35 Arial,sans-serif;pointer-events:none;max-width:calc(100% - 32px);';
  container.append(scaleLabel);

  function setTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    scene.background.set(dark ? '#1d2221' : '#282d2a');
    renderer.toneMappingExposure = dark ? 1.2 : 1.3;
  }
  const themeObserver = new MutationObserver(setTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  setTheme();

  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver((entries) => { visible = !!entries[0]?.isIntersecting; });
  intersection.observe(container);

  function updateLabels() {
    const positions = [[-2, radius * options.radialScale * 1.35, 0], [gap / 2, radius * options.radialScale * 1.35, 0], [gap + 3, radius * options.radialScale * 1.35, 0]];
    const rect = container.getBoundingClientRect();
    for (let i = 0; i < labelElements.length; i++) {
      pA.set(...positions[i]).project(camera);
      labelElements[i].style.left = `${(pA.x * .5 + .5) * rect.width}px`;
      labelElements[i].style.top = `${(-pA.y * .5 + .5) * rect.height}px`;
      labelElements[i].hidden = !result || pA.z > 1 || pA.z < -1 || Math.abs(pA.x) > .95 || Math.abs(pA.y) > .94 || (i === 1 && gap < 1.2);
    }
  }

  function render(now) {
    if (disposed) return;
    animation = requestAnimationFrame(render);
    if (!visible || document.hidden || contextLost || now - lastDraw < 24) return;
    lastDraw = now;
    if (updateQueued) { updateQueued = false; updateBiology(); }
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
  }

  function resetCamera(preset = 'oblique') {
    const center = (xMin + xMax) / 2;
    const span = Math.max(12, xMax - xMin);
    const transverse = radius * options.radialScale;
    controls.target.set(center, 0, 0);
    // Fit the long axis on narrow displays as well as desktop viewports.
    const fit = span / Math.max(.42, camera.aspect) * 1.65;
    const distance = Math.max(span * .83, fit, transverse * 5.3);
    if (preset === 'top') camera.position.set(center, distance, .001);
    else if (preset === 'cross-section') camera.position.set(xMin - distance * .55, .05, .01);
    else camera.position.set(center + span * .21, distance * .34, distance);
    controls.minDistance = Math.max(1.5, transverse * .8);
    controls.maxDistance = Math.max(70, span * 5);
    camera.far = Math.max(300, span * 8);
    camera.updateProjectionMatrix();
    // Fit a conservative physical envelope, not just its centerline.
    for (let iteration = 0; iteration < 4; iteration++) {
      camera.lookAt(controls.target); camera.updateMatrixWorld();
      let extent = 0;
      for (const x of [xMin, xMax]) for (const y of [-transverse * 1.5, transverse * 1.35]) for (const z of [-transverse, transverse]) {
        pA.set(x, y, z).project(camera);
        extent = Math.max(extent, Math.abs(pA.x), Math.abs(pA.y));
      }
      if (extent <= .9) break;
      camera.position.sub(controls.target).multiplyScalar(extent / .87).add(controls.target);
    }
    controls.update();
  }

  function addFascicles(start, length, distal = false, graft = false) {
    const sourceCenters = result.geometry?.fascicleCenters || [[-.36 * radius, .23 * radius], [.36 * radius, .23 * radius], [0, -.39 * radius]];
    const angle = (1 - result.config.alignment) * 2.1;
    const distalCenters = result.geometry?.distalFascicleCenters || sourceCenters.map(([y,z]) => [y * Math.cos(angle) - z * Math.sin(angle), y * Math.sin(angle) + z * Math.cos(angle)]);
    const centers = distal ? distalCenters : sourceCenters;
    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      const shell = cutawayShell(radius * .30, start, length, graft ? .08 : .075, graft ? COLORS.scaffold : COLORS.sheath);
      shell.position.y = c[0]; shell.position.z = c[1];
      (graft ? scaffoldsGroup : sheathGroup).add(shell);
      for (const x of [start, start + length]) {
        const border = rim(radius * .30, x, COLORS.sheath, .3);
        border.position.y = c[0]; border.position.z = c[1];
        (graft ? scaffoldsGroup : sheathGroup).add(border);
      }
    }
  }

  function rebuildAnatomy() {
    clearGroup(sheathGroup); clearGroup(scaffoldsGroup); clearGroup(labelsGroup);
    if (!result) return;
    gap = Number(result.geometry?.gapMm ?? result.config.gapMm) || 0;
    radius = Number(result.geometry?.radiusMm) || 1;
    xMin = -Math.max(2, Number(result.geometry?.proximalMm) || 4);
    xMax = gap + Math.min(6, Math.max(.5, Number(result.geometry?.distalMm ?? result.config.distalMm) || 6));
    anatomical.scale.set(1, options.radialScale, options.radialScale);
    const crush = result.config.injury === 'crush';
    if (crush) {
      sheathGroup.add(cutawayShell(radius, xMin, xMax - xMin, .12, COLORS.sheath));
      addFascicles(xMin, xMax - xMin);
      const injuryBand = cutawayShell(radius * 1.012, -.12, Math.max(.3, gap + .24), .16, COLORS.scar);
      sheathGroup.add(injuryBand);
    } else {
      sheathGroup.add(cutawayShell(radius, xMin, -xMin, .14, COLORS.sheath));
      sheathGroup.add(cutawayShell(radius, gap, xMax - gap, .14, COLORS.sheath));
      addFascicles(xMin, -xMin); addFascicles(gap, xMax - gap, true);
    }
    for (const x of [xMin, 0, gap, xMax]) sheathGroup.add(rim(radius, x, COLORS.sheath, x === 0 || x === gap ? .72 : .3));

    if (!crush && result.config.repair === 'conduit') {
      scaffoldsGroup.add(cutawayShell(radius * 1.16, -.5, gap + 1, .15, COLORS.scaffold));
      for (const x of [-.5, gap + .5]) scaffoldsGroup.add(rim(radius * 1.16, x, COLORS.scaffold, .8));
      // Generic construction ribs are display geometry, not a real device.
      for (let i = 0; i < 10; i++) {
        const a = .3 + i * Math.PI * 1.4 / 9;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, gap + 1, 4), new THREE.MeshStandardMaterial({ color: COLORS.scaffold, transparent: true, opacity: .18 }));
        rib.rotation.z = -Math.PI / 2;
        rib.position.set(gap / 2, Math.sin(a) * radius * 1.16, Math.cos(a) * radius * 1.16);
        scaffoldsGroup.add(rib);
      }
    } else if (!crush && result.config.repair === 'graft') {
      scaffoldsGroup.add(cutawayShell(radius * .94, 0, Math.max(gap, .1), .12, COLORS.scaffold));
      addFascicles(0, Math.max(gap, .1), false, true);
    }

    if (!crush && ['direct', 'graft', 'conduit'].includes(result.config.repair)) {
      for (const seam of gap > .8 ? [0, gap] : [gap / 2]) {
        for (let i = 0; i < 5; i++) {
          const a = .4 + i * 1.14;
          const knot = new THREE.Mesh(new THREE.TorusGeometry(.11, .014, 6, 16), new THREE.MeshStandardMaterial({ color: '#687e87', roughness: .8 }));
          knot.rotation.y = Math.PI / 2;
          knot.position.set(seam, Math.cos(a) * radius, Math.sin(a) * radius);
          knot.scale.set(1.2, .65, 1);
          scaffoldsGroup.add(knot);
        }
      }
    }

    // Millimetre ticks provide an axial reference independent of radial scale.
    const points = [];
    const y = -radius * options.radialScale * 1.5;
    const tickStep = (xMax - xMin) > 35 ? 5 : 1;
    for (let x = Math.ceil(xMin / tickStep) * tickStep; x <= xMax; x += tickStep) {
      points.push(x, y, 0, x, y + (x % 5 === 0 ? .17 : .09), 0);
    }
    points.push(xMin, y, 0, xMax, y, 0);
    const rulerGeometry = new THREE.BufferGeometry();
    rulerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    labelsGroup.add(new THREE.LineSegments(rulerGeometry, new THREE.LineBasicMaterial({ color: '#aaa18b', transparent: true, opacity: .48 })));
    updateVisibility();
    updateBiology();
  }

  function fiberTint(axon, state, x) {
    if (selected === safeId(axon.id)) return COLORS.selected;
    if (options.view === 'support') {
      if (x < 0) return '#b8b39d'; // Proximal support is outside the field domain.
      const v = interpolateField(fields, 'schwann', Math.max(0, x));
      return supportPalette[Math.round(clamp(v) * 64)];
    }
    if (state.status === 'lost') return COLORS.lost;
    if (state.entered && !state.correctTarget) return COLORS.wrong;
    if (state.status === 'stalled') return COLORS.stalled;
    if (options.view === 'state') return state.status === 'waiting' ? COLORS.waiting : state.myelin > .4 ? COLORS.myelin : COLORS.growing;
    return x <= 0 ? (axon.kind === 'motor' ? COLORS.motor : COLORS.sensory) : COLORS.growing;
  }

  function updateBiology() {
    if (!result || disposed) return;
    fields = sampleFieldsAt(result, day);
    let nAxon = 0, nMyelin = 0, nTips = 0, nFilopodia = 0;
    segmentIds = []; myelinIds = []; tipIds = [];
    const fiberRadius = .004 * options.fiberScale;
    for (const axon of shown) {
      const state = axonAt(axon, day, result.config);
      const id = safeId(axon.id);
      const selectedFiber = selected === id;
      const diameterVariation = Number(axon.caliberFactor) > 0 ? .7 + .6 * Number(axon.caliberFactor) : 1;
      const r = fiberRadius * diameterVariation * (selectedFiber ? 1.65 : 1);
      const endX = Math.min(xMax, Math.max(0, state.x || 0));
      const segments = Math.max(8, Math.min(AXON_SEGMENTS, Math.ceil((endX - xMin) / .36)));
      for (let j = 0; j < segments; j++) {
        const a = xMin + (endX - xMin) * j / segments;
        const b = xMin + (endX - xMin) * (j + 1) / segments;
        pathVector(axon, a, pA); pathVector(axon, b, pB);
        cylinderInstance(axonMesh, nAxon, pA, pB, r, fiberTint(axon, state, (a + b) / 2));
        segmentIds[nAxon++] = id;
      }

      // Local myelin age retains the unmyelinated leading growth front.
      const internode = Math.max(.35 + hash(Number(axon.id) * 71 + 7) * .28, (xMax - xMin) / 95);
      for (let x = xMin + internode * .15; x < endX; x += internode) {
        const a = x, b = Math.min(endX, x + internode * .83);
        if (b - a < .025) continue;
        const m = a < 0 ? 1 : localMyelin(axon, (a + b) / 2, day, result.config);
        if (m < .08) continue;
        pathVector(axon, a, pA); pathVector(axon, b, pB);
        const tint = selectedFiber ? COLORS.selected : (state.entered && !state.correctTarget && a >= gap ? '#c9a898' : myelinPalette[Math.round(clamp(m) * 64)]);
        cylinderInstance(myelinMesh, nMyelin, pA, pB, r * (1.05 + .75 * m), tint);
        myelinIds[nMyelin++] = id;
        if (nMyelin >= myelinMesh.instanceMatrix.count) break;
      }

      if (state.x >= 0 && state.x < xMax && !['lost', 'waiting', 'arrived'].includes(state.status)) {
        const tip = pathPoint(axon, endX);
        const tint = selectedFiber ? COLORS.selected : state.status === 'stalled' ? COLORS.stalled : COLORS.growing;
        ellipsoidInstance(tipsMesh, nTips, tip, [r * 2.5, r * 1.65, r * 1.65], tint);
        tipIds[nTips++] = id;
        for (let f = 0; f < 4; f++) {
          const angle = f * Math.PI * .5 + hash(Number(axon.id) + 22) * 2;
          pA.set(...tip);
          pB.set(tip[0] + r * 5, tip[1] + Math.cos(angle) * r * 3, tip[2] + Math.sin(angle) * r * 3);
          cylinderInstance(filopodiaMesh, nFilopodia++, pA, pB, r * .22, tint);
        }
      }
    }
    finishInstances(axonMesh, nAxon); finishInstances(myelinMesh, nMyelin);
    finishInstances(tipsMesh, nTips); finishInstances(filopodiaMesh, nFilopodia);
    updateSupportingCells();
    const physicalSpan = xMax - xMin;
    scaleLabel.textContent = `${representativeCount} / ${result.axons.length} parent axons shown · ${physicalSpan.toFixed(1)} mm window · transverse ×${options.radialScale} · representative fiber diameter ×${options.fiberScale}`;
    updateVisibility();
  }

  function updateSupportingCells() {
    let nSchwann = 0, nNuclei = 0, nDebris = 0, nVessel = 0, nScar = 0;
    const cellStep = Math.max(.32, (xMax - xMin) / 28);
    // Seeded representative display positions are not measured cell counts.
    for (let lane = 0; lane < 9; lane++) {
      const angle = lane * Math.PI * 2 / 9;
      const radial = radius * (.25 + .45 * hash(lane * 17 + 3));
      for (let k = 0; k < 30; k++) {
        const x = xMin + (k + hash(lane * 137 + k)) * cellStep;
        if (x > xMax) break;
        const inGap = x > 0 && x < gap;
        const s = x < 0 ? .75 : interpolateField(fields, 'schwann', x);
        if (hash(lane * 197 + k * 31 + 5) > s || (inGap && result.config.repair === 'none' && result.config.injury !== 'crush')) continue;
        const y = Math.cos(angle) * radial, z = Math.sin(angle) * radial;
        const length = .11 + .1 * hash(lane * 31 + k * 17);
        ellipsoidInstance(schwannMesh, nSchwann++, [x, y, z], [.025, length, .025], COLORS.schwann, [1, .025, .015]);
        ellipsoidInstance(nucleiMesh, nNuclei++, [x, y, z], [.012, .038, .012], COLORS.nucleus, [1, 0, 0]);
      }
    }

    if (options.showDebris) {
      for (let lane = 0; lane < Math.min(72, shown.length); lane++) {
        const axon = shown[lane];
        for (let k = 0; k < 13; k++) {
          const x = gap + (k + hash(lane * 193 + k * 7)) * (xMax - gap) / 13;
          const d = interpolateField(fields, 'debris', x);
          const intact = interpolateField(fields, 'intact', x);
          if (hash(lane * 159 + k * 113 + 18) > d + intact) continue;
          const target = axon.target || axon.origin || [0, 0];
          const dy = (hash(lane * 371 + k) - .5) * .1;
          const dz = (hash(lane * 171 + k) - .5) * .1;
          const length = intact > .5 ? (xMax - gap) / 13 * .84 : .05 + .16 * hash(lane * 3 + k * 79);
          pA.set(x, target[0] + dy, target[1] + dz);
          pB.set(Math.min(xMax, x + length), target[0] + dy + (hash(k * 41 + lane) - .5) * .06, target[1] + dz);
          cylinderInstance(debrisMesh, nDebris++, pA, pB, .008 * options.fiberScale * (.6 + .4 * Math.max(d, intact)), intact > .5 ? '#c4c1ae' : COLORS.debris);
        }
      }
    }

    if (options.showVessels) {
      for (let lane = 0; lane < 5; lane++) {
        const angle = lane * Math.PI * 2 / 5;
        const step = (xMax - xMin) / 80;
        for (let k = 0; k < 80; k++) {
          const a = xMin + k * step, b = a + step;
          const v = a < 0 ? 1 : interpolateField(fields, 'vascular', (a + b) / 2);
          if (v < .2) continue;
          const r = radius * (.73 + .04 * Math.sin(a * .9 + lane));
          pA.set(a, Math.cos(angle + .08 * Math.sin(a * .4)) * r, Math.sin(angle + .08 * Math.sin(a * .4)) * r);
          pB.set(b, Math.cos(angle + .08 * Math.sin(b * .4)) * r, Math.sin(angle + .08 * Math.sin(b * .4)) * r);
          cylinderInstance(vesselMesh, nVessel++, pA, pB, .009 + .012 * v, COLORS.vessel);
        }
      }
    }

    if (options.showScar && gap > 0) {
      for (let k = 0; k < 260; k++) {
        const x = hash(k * 79 + 9) * gap;
        const s = interpolateField(fields, 'scar', x);
        if (hash(k * 43 + 27) > s) continue;
        const a = hash(k * 53 + 35) * Math.PI * 2;
        const r = radius * Math.sqrt(hash(k * 71 + 83));
        pA.set(x, Math.cos(a) * r, Math.sin(a) * r);
        pB.set(Math.min(gap, x + .1 + hash(k * 29) * .4), Math.cos(a + .2) * r, Math.sin(a + .2) * r);
        cylinderInstance(scarMesh, nScar++, pA, pB, .009, COLORS.scar);
      }
    }
    finishInstances(schwannMesh, nSchwann); finishInstances(nucleiMesh, nNuclei);
    finishInstances(debrisMesh, nDebris); finishInstances(vesselMesh, nVessel); finishInstances(scarMesh, nScar);
  }

  function updateVisibility() {
    sheathGroup.visible = options.showSheath;
    scaffoldsGroup.visible = !!result && day >= (Number(result.config.delayDays) || 0);
    schwannMesh.visible = nucleiMesh.visible = options.showSchwann;
    debrisMesh.visible = options.showDebris;
    vesselMesh.visible = options.showVessels;
    scarMesh.visible = options.showScar;
  }

  function setResult(next) {
    result = next;
    if (!result?.axons?.length) {
      shown = []; baseShown = []; representativeCount = 0;
      for (const mesh of [axonMesh, myelinMesh, tipsMesh, filopodiaMesh, schwannMesh, nucleiMesh, debrisMesh, vesselMesh, scarMesh]) finishInstances(mesh, 0);
      return;
    }
    const n = Math.min(MAX_AXONS, result.axons.length);
    baseShown = Array.from({ length: n }, (_, i) => result.axons[Math.floor(i * result.axons.length / n)]);
    shown = [...baseShown];
    representativeCount = shown.length;
    selected = null; day = 0;
    rebuildAnatomy(); resize(); resetCamera();
  }

  function setTime(next) {
    day = clamp(Number(typeof next === 'number' ? next : next?.day) || 0, 0, Number(result?.config?.durationDays) || Infinity);
    // Coalesce scrubber events; rAF does not advance the biological model.
    updateQueued = true;
  }

  function setOptions(next = {}) {
    const beforeScale = options.radialScale;
    Object.assign(options, next);
    options.radialScale = clamp(Number(options.radialScale) || 1, 1, 8);
    options.fiberScale = clamp(Number(options.fiberScale) || 1, 1, 8);
    if ('selected' in next) {
      selected = next.selected == null ? null : safeId(next.selected);
      shown = [...baseShown];
      // Every simulated parent is inspectable, even outside the display sample.
      if (selected != null && result && !shown.some((a) => safeId(a.id) === selected)) {
        const axon = result.axons.find((a) => safeId(a.id) === selected);
        if (axon) shown[shown.length - 1] = axon;
      }
    }
    if (beforeScale !== options.radialScale) { rebuildAnatomy(); resetCamera(); }
    else { updateVisibility(); updateQueued = true; }
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerDown = null;
  canvas.addEventListener('pointerdown', (event) => { pointerDown = [event.clientX, event.clientY]; }, { signal: abort.signal });
  canvas.addEventListener('pointerup', (event) => {
    if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 5 || !result) return;
    pointerDown = null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([tipsMesh, myelinMesh, axonMesh], false)[0];
    if (!hit || hit.instanceId == null) return;
    selected = hit.object === tipsMesh ? tipIds[hit.instanceId] : hit.object === myelinMesh ? myelinIds[hit.instanceId] : segmentIds[hit.instanceId];
    updateQueued = true;
    onSelect(selected);
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    scaleLabel.textContent = '3D context interrupted. Reload to restore the view; model results remain available.';
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    updateQueued = true;
  }, { signal: abort.signal });

  resize(); resetCamera(); animation = requestAnimationFrame(render);
  return {
    available: true, renderer: 'webgl', setResult, setTime, setOptions, resetCamera,
    get representativeCount() { return representativeCount; },
    dispose() {
      if (disposed) return;
      disposed = true; abort.abort(); cancelAnimationFrame(animation);
      resizeObserver.disconnect(); intersection.disconnect(); themeObserver.disconnect();
      controls.dispose(); clearGroup(anatomical); clearGroup(labelsGroup);
      renderer.dispose(); canvas.remove(); labelElements.forEach((el) => el.remove()); scaleLabel.remove();
    },
  };
}
