import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createRpniFallback, buildRpniAnatomy, sampleRpniView, stateFor, partialPath,
  sourceColor, contactRole, niceScale, clamp, RPNI_COLORS, abbreviateId,
} from './fallback.mjs';

/**
 * RPNI anatomy in the numerical model's coordinate system: x is the muscle
 * fibre direction, y separates grafts, and z is graft thickness. The exact
 * rectangular bulk envelope and equivalent contact disks are accompanied by
 * representative fibres / arbors. There is no nerve bridge or distal stump.
 * Only the supplied model day and activity time advance the biological view.
 */
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const sameId = (a, b) => String(a ?? '') === String(b ?? '');
const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
const origin = new THREE.Vector3(), delta = new THREE.Vector3(), scaling = new THREE.Vector3();
const axisY = new THREE.Vector3(0, 1, 0), axisZ = new THREE.Vector3(0, 0, 1), axisX = new THREE.Vector3(1, 0, 0);
const color = new THREE.Color();

function instanceCylinder(mesh, index, start, end, radius, tint) {
  origin.set(...start); delta.set(...end).sub(origin);
  const length = Math.max(.0001, delta.length());
  origin.addScaledVector(delta, .5); quaternion.setFromUnitVectors(axisY, delta.normalize());
  scaling.set(radius, length, radius); matrix.compose(origin, quaternion, scaling);
  mesh.setMatrixAt(index, matrix);
  if (tint) mesh.setColorAt(index, color.set(tint));
}
function instanceSphere(mesh, index, point, dimensions, tint) {
  origin.set(...point); quaternion.identity(); scaling.set(...dimensions);
  matrix.compose(origin, quaternion, scaling); mesh.setMatrixAt(index, matrix);
  if (tint) mesh.setColorAt(index, color.set(tint));
}
function instanceDisc(mesh, index, point, radiusY, radiusZ, tint) {
  origin.set(...point); quaternion.setFromUnitVectors(axisZ, axisX); scaling.set(radiusZ, radiusY, 1);
  matrix.compose(origin, quaternion, scaling); mesh.setMatrixAt(index, matrix);
  if (tint) mesh.setColorAt(index, color.set(tint));
}
function finish(mesh, count) {
  mesh.count = Math.min(count, mesh.instanceMatrix.count);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (mesh.count) mesh.computeBoundingSphere();
}
function instanced(geometry, capacity, material = {}) {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7, metalness: .03, ...material }), capacity);
  mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
  return mesh;
}
function clearGroup(group, disposeShared = false) {
  const geometries = new Set(), materials = new Set();
  group.traverse((object) => {
    if (object.geometry && (disposeShared || !object.userData.sharedGeometry)) geometries.add(object.geometry);
    for (const item of Array.isArray(object.material) ? object.material : [object.material]) if (item) materials.add(item);
  });
  while (group.children.length) group.remove(group.children[0]);
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
}

export function createRpniViewer(container, { onSelect = () => {} } = {}) {
  if (!container) throw new Error('The RPNI viewer needs a container.');
  container.querySelector('.rpni-scene-loading, .rp-loading')?.remove();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
  catch { return createRpniFallback(container, { onSelect }); }

  const canvas = renderer.domElement;
  canvas.className = 'rpni-anatomy-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-3px;';
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Three-dimensional RPNI anatomy. A terminal nerve enters each independent muscle graft. Drag to rotate, scroll to zoom, click a recording contact to inspect. Arrow keys select contacts; Home resets view.');
  container.prepend(canvas);
  renderer.setPixelRatio(Math.min(1.8, globalThis.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene(); scene.background = new THREE.Color(RPNI_COLORS.background);
  const camera = new THREE.OrthographicCamera(-25, 25, 15, -15, .01, 2000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .09;
  controls.minZoom = .45; controls.maxZoom = 10; controls.enablePan = true;
  controls.autoRotate = false;
  scene.add(new THREE.HemisphereLight('#fff1d7', '#243831', 2.8));
  const key = new THREE.DirectionalLight('#ffe9cc', 3.4); key.position.set(-18, 26, 38); scene.add(key);
  const fill = new THREE.DirectionalLight('#a7d8d1', 1.5); fill.position.set(15, -10, 10); scene.add(fill);
  const fullGroup = new THREE.Group(), sectionGroup = new THREE.Group(), staticFull = new THREE.Group(), staticSection = new THREE.Group();
  const contactFull = new THREE.Group(), contactSection = new THREE.Group(), territoryFull = new THREE.Group(), territorySection = new THREE.Group();
  scene.add(fullGroup, sectionGroup); fullGroup.add(staticFull, contactFull, territoryFull); sectionGroup.add(staticSection, contactSection, territorySection);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
  const sphereGeometry = new THREE.SphereGeometry(1, 10, 7);
  const discGeometry = new THREE.CircleGeometry(1, 14);
  const fibres = instanced(cylinderGeometry, 4 * 60 * 10, { roughness: .83 });
  const striations = instanced(cylinderGeometry, 4 * 60 * 22, { roughness: .88, transparent: true, opacity: .46 });
  const nerve = instanced(cylinderGeometry, 20, { roughness: .68 });
  const arbors = instanced(cylinderGeometry, 4 * 18 * 17, { roughness: .5, metalness: .05 });
  const endplates = instanced(sphereGeometry, 4 * 18, { roughness: .4 });
  const fronts = instanced(cylinderGeometry, 4 * 60 * 12, { emissive: '#6a5c36', emissiveIntensity: .7, roughness: .32 });
  const sectionFibres = new THREE.InstancedMesh(discGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: .88 }), 4 * 60);
  sectionFibres.count = 0; sectionFibres.frustumCulled = false;
  fullGroup.add(fibres, striations, nerve, arbors, endplates, fronts); sectionGroup.add(sectionFibres);
  for (const mesh of [fibres, striations, nerve, arbors, endplates, fronts, sectionFibres]) mesh.userData.sharedGeometry = true;

  const abort = new AbortController();
  let result = null, anatomy = buildRpniAnatomy(null), snapshot = null;
  let day = 0, timeMs = 0, selectedId = null, disposed = false, webglDisposed = false, fallback = null;
  let width = 1, height = 1, animation = 0, lastRender = 0, dirtyState = true, visible = true;
  let fibreIndices = [], sectionFibreIndices = [], contactMeshes = [], labels = [];
  const options = { view: 'longitudinal', showNerve: true, showTerritories: true, showElectrodes: true,
    showOxygen: false, showLabels: true, selectedElectrodeId: null, sectionFraction: .5 };

  const topLabel = document.createElement('div');
  topLabel.className = 'rpni-scene-heading';
  topLabel.style.cssText = 'position:absolute;z-index:2;left:16px;right:16px;top:13px;pointer-events:none;display:flex;justify-content:space-between;gap:8px;color:#e8e1d1;font:10px/1.3 "URW Gothic",Arial,sans-serif;letter-spacing:.04em;';
  const title = document.createElement('span'), clock = document.createElement('span');
  clock.style.cssText = 'color:#d8b77b;white-space:nowrap;'; topLabel.append(title, clock); container.append(topLabel);
  const sourceLegend = document.createElement('div');
  sourceLegend.style.cssText = 'position:absolute;left:16px;right:16px;top:34px;display:flex;gap:13px;align-items:center;z-index:2;color:#b5ae9b;font:8px/1.2 "URW Gothic",Arial,sans-serif;pointer-events:none;';
  container.append(sourceLegend);
  const footer = document.createElement('div');
  footer.className = 'rpni-scene-caption';
  footer.style.cssText = 'position:absolute;left:16px;right:16px;bottom:9px;z-index:2;color:#b5ae9b;font:9px/1.45 "URW Gothic",Arial,sans-serif;pointer-events:none;';
  container.append(footer);
  const selectedLabel = document.createElement('div');
  selectedLabel.className = 'rpni-contact-coordinate';
  selectedLabel.style.cssText = 'position:absolute;left:16px;right:16px;bottom:68px;z-index:2;color:#fff5c2;text-align:center;font:9px/1.3 "URW Gothic",Arial,sans-serif;pointer-events:none;';
  container.append(selectedLabel);
  const scaleBar = document.createElement('div');
  scaleBar.style.cssText = 'position:absolute;left:18px;bottom:45px;z-index:2;color:#d8c8a5;font:9px/1.2 "URW Gothic",Arial,sans-serif;pointer-events:none;';
  const scaleRule = document.createElement('div'), scaleText = document.createElement('span');
  scaleRule.style.cssText = 'height:5px;border-left:1px solid #d8c8a5;border-right:1px solid #d8c8a5;border-bottom:1px solid #d8c8a5;margin-bottom:4px;';
  scaleBar.append(scaleRule, scaleText); container.append(scaleBar);
  const svgNs = 'http://www.w3.org/2000/svg';
  const orientation = document.createElementNS(svgNs, 'svg');
  orientation.setAttribute('viewBox', '0 0 82 74'); orientation.setAttribute('width', '82'); orientation.setAttribute('height', '74');
  orientation.style.cssText = 'position:absolute;right:4px;bottom:27px;z-index:2;pointer-events:none;';
  orientation.setAttribute('aria-label', 'Model x, y, and z axis orientation');
  const orientationAxes = ['x', 'y', 'z'].map((axis, index) => {
    const path = document.createElementNS(svgNs, 'line'), label = document.createElementNS(svgNs, 'text');
    path.setAttribute('stroke', ['#d8b77b', '#69b4a6', '#b2a6cf'][index]); path.setAttribute('stroke-width', '1.1');
    label.setAttribute('fill', ['#d8b77b', '#69b4a6', '#b2a6cf'][index]); label.setAttribute('font-size', '10'); label.setAttribute('font-family', 'Arial,sans-serif');
    label.textContent = axis; orientation.append(path, label); return { path, label };
  });
  container.append(orientation);
  const projectVector = new THREE.Vector3(), projectOrigin = new THREE.Vector3(), projectEnd = new THREE.Vector3();

  function addLabel(text, position, { contact = null, kind = 'anatomy', moduleIndex = 0, rank = 0 } = {}) {
    const element = document.createElement(contact ? 'button' : 'span');
    element.textContent = text; element.className = contact ? 'rpni-world-contact' : 'rpni-world-label';
    element.style.cssText = `position:absolute;z-index:${contact ? 4 : 2};white-space:nowrap;transform:translate(-50%,-50%);font:9px/1.2 "URW Gothic",Arial,sans-serif;letter-spacing:.02em;color:${contact ? '#dddccc' : '#d3c8b1'};background:#252522bd;padding:${contact ? '4px 5px' : '2px 3px'};border:${contact ? '1px solid #9eaa9655' : '0'};border-radius:0;min-height:0;pointer-events:${contact ? 'auto' : 'none'};${contact ? 'cursor:pointer;' : ''}`;
    if (contact) {
      element.type = 'button'; element.title = `Recording contact ${contact.id}; [${contact.positionMm.map((value) => Number(value.toFixed(2))).join(', ')}] mm`;
      element.setAttribute('aria-label', `Select recording contact ${contact.id}`);
      element.onclick = (event) => { event.stopPropagation(); selectContact(contact.id); };
    }
    container.append(element); labels.push({ element, position, contact, kind, moduleIndex, rank });
  }
  function removeLabels() { for (const label of labels) label.element.remove(); labels = []; }
  function sectionX(module) { return module.centerMm[0] + (options.sectionFraction - .5) * module.dimensionsMm[0]; }

  function buildStatic() {
    clearGroup(staticFull); clearGroup(staticSection); clearGroup(contactFull); clearGroup(contactSection);
    clearGroup(territoryFull); clearGroup(territorySection); removeLabels(); contactMeshes = [];
    fibreIndices = []; sectionFibreIndices = [];
    sourceLegend.replaceChildren();
    let fibreCount = 0, stripeCount = 0, nerveCount = 0, sectionCount = 0;
    if (!result) { for (const mesh of [fibres, striations, nerve, sectionFibres, arbors, endplates, fronts]) finish(mesh, 0); return; }
    const sourceWord = document.createElement('span'); sourceWord.textContent = 'SOURCES'; sourceLegend.append(sourceWord);
    for (const module of anatomy.modules) {
      const key = document.createElement('span');
      key.style.cssText = `color:${sourceColor({ sourcePoolId: module.id }, result)};white-space:nowrap;`;
      key.textContent = `■ pool ${module.index + 1}${Number(result.config.targetModule) === Number(module.id) ? ' target' : ''}`;
      sourceLegend.append(key);
    }
    for (const module of anatomy.modules) {
      const [length, graftWidth, thickness] = module.dimensionsMm, [cx, cy, cz] = module.centerMm;
      const boxGeometry = new THREE.BoxGeometry(length, graftWidth, thickness);
      const envelope = new THREE.Mesh(boxGeometry, new THREE.MeshStandardMaterial({ color: '#ad7667', transparent: true, opacity: .13, roughness: .9, depthWrite: false, side: THREE.DoubleSide }));
      envelope.position.set(cx, cy, cz); envelope.userData.graftEnvelope = true; staticFull.add(envelope);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), new THREE.LineBasicMaterial({ color: '#c7987e', transparent: true, opacity: .48 }));
      outline.position.copy(envelope.position); staticFull.add(outline);
      // The transparent envelope deliberately retains the rectangular slab
      // assumed by the oxygen diagnostic and dimension controls.
      const slice = new THREE.Mesh(new THREE.BoxGeometry(.035, graftWidth, thickness), new THREE.MeshStandardMaterial({ color: '#a26a59', transparent: true, opacity: .66, roughness: .9, side: THREE.DoubleSide }));
      slice.position.set(sectionX(module), cy, cz); slice.userData.graftSlice = true; staticSection.add(slice);
      const sliceBorder = new THREE.LineSegments(new THREE.EdgesGeometry(slice.geometry), new THREE.LineBasicMaterial({ color: '#d4a58a', transparent: true, opacity: .72 }));
      sliceBorder.position.copy(slice.position); staticSection.add(sliceBorder);
      const oxygenProfile = result.oxygen?.profile || [];
      for (let index = 1; index < oxygenProfile.length; index++) {
        const lower = oxygenProfile[index - 1], upper = oxygenProfile[index];
        const thicknessZ = upper.zMm - lower.zMm, ratio = clamp((finite(lower.ratio, 1) + finite(upper.ratio, 1)) / 2);
        const band = new THREE.Mesh(new THREE.BoxGeometry(.004, graftWidth, Math.max(.001, thicknessZ)),
          new THREE.MeshBasicMaterial({ color: '#76a3b5', transparent: true, opacity: (1 - ratio) * .55, depthWrite: false }));
        band.position.set(sectionX(module) + .024, cy, cz + (lower.zMm + upper.zMm) / 2);
        band.userData.transportLayer = true; band.visible = options.showOxygen; staticSection.add(band);
      }

      for (const fibre of module.fibres) {
        for (let segment = 0; segment < 10; segment++) {
          const a = segment / 10, b = (segment + 1) / 10;
          const pa = [fibre.startX + (fibre.endX - fibre.startX) * a, fibre.y + Math.sin(a * Math.PI * 2 + fibre.phase) * fibre.bendMm, fibre.z];
          const pb = [fibre.startX + (fibre.endX - fibre.startX) * b, fibre.y + Math.sin(b * Math.PI * 2 + fibre.phase) * fibre.bendMm, fibre.z];
          instanceCylinder(fibres, fibreCount, pa, pb, fibre.radiusMm, '#ba806d');
          fibreIndices.push({ index: fibreCount++, fibre });
        }
        for (let segment = 0; segment < 22; segment++) {
          const t = (segment + .5) / 22;
          const x = fibre.startX + (fibre.endX - fibre.startX) * t;
          const y = fibre.y + Math.sin(t * Math.PI * 2 + fibre.phase) * fibre.bendMm;
          const halfWidth = Math.min(.024, length * .001);
          instanceCylinder(striations, stripeCount++, [x - halfWidth, y, fibre.z], [x + halfWidth, y, fibre.z], fibre.radiusMm * 1.055, '#e8bc99');
        }
        if (sectionX(module) >= fibre.startX && sectionX(module) <= fibre.endX) {
          instanceDisc(sectionFibres, sectionCount, [sectionX(module) + .03, fibre.y, fibre.z], fibre.radiusMm, fibre.radiusMm * 1.08, '#c68b74');
          sectionFibreIndices.push({ index: sectionCount++, fibre });
        }
      }
      instanceCylinder(nerve, nerveCount++, module.nerveStartMm, module.nerveTipMm, module.nerveRadiusMm, RPNI_COLORS.nerve);
      for (const lane of [-.45, 0, .45]) {
        const a = [...module.nerveStartMm], b = [...module.nerveTipMm];
        a[1] += module.nerveRadiusMm * lane; b[1] += module.nerveRadiusMm * lane;
        a[2] += module.nerveRadiusMm * .9; b[2] += module.nerveRadiusMm * .9;
        instanceCylinder(nerve, nerveCount++, a, b, module.nerveRadiusMm * .07, '#f4e1ac');
      }
      if (sectionX(module) >= module.nerveEntryMm[0] && sectionX(module) <= module.nerveTipMm[0]) {
        const nerveSlice = new THREE.Mesh(new THREE.CircleGeometry(module.nerveRadiusMm, 24), new THREE.MeshBasicMaterial({ color: '#dcc895', side: THREE.DoubleSide }));
        nerveSlice.rotation.y = Math.PI / 2;
        nerveSlice.position.set(sectionX(module) + .045, module.nerveTipMm[1], module.nerveTipMm[2]);
        nerveSlice.userData.nerveSection = true; staticSection.add(nerveSlice);
      }
      for (const unit of module.shownUnits) {
        const center = unit.territoryCenterMm || module.centerMm, radius = Math.max(.08, finite(unit.territoryRadiusMm, .8));
        const territory = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), new THREE.MeshBasicMaterial({ color: sourceColor(unit, result), transparent: true, opacity: .045, depthWrite: false }));
        territory.position.set(...center); territory.scale.set(Math.min(length * .065, radius * 1.5), Math.min(graftWidth * .22, radius), Math.min(thickness * .36, radius));
        territory.userData.unitId = unit.id; territoryFull.add(territory);
        const sectionTerritory = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: sourceColor(unit, result), side: THREE.DoubleSide, transparent: true, opacity: .06, depthWrite: false }));
        sectionTerritory.position.set(sectionX(module) + .06, center[1], center[2]); sectionTerritory.rotation.y = Math.PI / 2;
        sectionTerritory.scale.set(Math.min(thickness * .36, radius), Math.min(graftWidth * .22, radius), 1);
        sectionTerritory.userData.unitId = unit.id; territorySection.add(sectionTerritory);
      }
      module.contacts.forEach((contact, rank) => {
        const radius = Math.max(.001, contact.radiusMm);
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .065, 24), new THREE.MeshStandardMaterial({ color: RPNI_COLORS.contact, roughness: .26, metalness: .68 }));
        disk.rotation.x = Math.PI / 2; disk.position.set(...contact.positionMm);
        disk.userData.contactId = contact.id; contactFull.add(disk); contactMeshes.push(disk);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.45, Math.max(.022, radius * .055), 6, 28), new THREE.MeshBasicMaterial({ color: RPNI_COLORS.brass, transparent: true, opacity: .75 }));
        ring.position.copy(disk.position); ring.position.z += .045; ring.userData.contactId = contact.id; ring.userData.halo = true;
        contactFull.add(ring);
        const leadPoints = [contact.positionMm, [contact.positionMm[0], contact.positionMm[1], cz + thickness / 2 + .8],
          [contact.positionMm[0] + .5, cy + graftWidth / 2 + .7, cz + thickness / 2 + 1.5]];
        const curve = new THREE.CatmullRomCurve3(leadPoints.map((point) => new THREE.Vector3(...point)));
        const lead = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, Math.max(.045, radius * .12), 5, false), new THREE.MeshStandardMaterial({ color: '#a6b2a9', roughness: .8 }));
        contactFull.add(lead);
        const projected = new THREE.Mesh(new THREE.BoxGeometry(.08, radius * 2, .065), new THREE.MeshStandardMaterial({ color: RPNI_COLORS.contact, roughness: .35, metalness: .55 }));
        projected.position.set(sectionX(module) + .09, contact.positionMm[1], contact.positionMm[2]);
        projected.userData.contactId = contact.id; contactSection.add(projected); contactMeshes.push(projected);
        const projectedRing = new THREE.Mesh(new THREE.RingGeometry(radius * 1.34, radius * 1.48, 28), new THREE.MeshBasicMaterial({ color: RPNI_COLORS.brass, side: THREE.DoubleSide, transparent: true, opacity: .8 }));
        projectedRing.rotation.y = Math.PI / 2; projectedRing.position.copy(projected.position); projectedRing.position.x += .03;
        projectedRing.userData.contactId = contact.id; projectedRing.userData.halo = true; contactSection.add(projectedRing);
        const role = contactRole(result, contact.id);
        addLabel(`${abbreviateId(role.channelId || contact.id)}${role.sign}`, contact.positionMm, { contact, moduleIndex: module.index, rank });
      });
      addLabel(`GRAFT ${module.index + 1}`, [cx + length * .4, cy + graftWidth / 2 + .7, cz + thickness / 2], { kind: 'graft', moduleIndex: module.index });
    }
    finish(fibres, fibreCount); finish(striations, stripeCount); finish(nerve, nerveCount); finish(sectionFibres, sectionCount);
    if (anatomy.modules.length) {
      const module = anatomy.modules[anatomy.modules.length - 1];
      addLabel('TERMINAL NERVE', [module.nerveStartMm[0], module.nerveStartMm[1], module.nerveStartMm[2] + module.nerveRadiusMm + .8], { kind: 'nerve' });
    }
    buildRuler(); updateVisibility(); dirtyState = true;
  }
  function buildRuler() {
    if (!anatomy.modules.length) return;
    const { min, max } = anatomy.bounds;
    const step = max[0] - min[0] > 40 ? 5 : 1, y = min[1] - .7, z = min[2] - .4;
    const points = [min[0], y, z, max[0], y, z];
    for (let x = Math.ceil(min[0] / step) * step; x <= max[0]; x += step) points.push(x, y, z, x, y + (x % 5 === 0 ? .3 : .15), z);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    staticFull.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#b8aa8d', transparent: true, opacity: .45 })));
  }

  function updateBiology() {
    if (!result || disposed || webglDisposed) return;
    snapshot = sampleRpniView(result, day, timeMs);
    let arborCount = 0, endplateCount = 0, frontCount = 0;
    for (const { index, fibre } of fibreIndices) {
      const state = stateFor(snapshot, fibre.unitId), arrived = finite(state.growthFraction) >= 1;
      fibres.setColorAt(index, color.set(arrived ? '#c28b75' : '#aa7a68'));
    }
    if (fibres.instanceColor) fibres.instanceColor.needsUpdate = true;
    for (const { index, fibre } of sectionFibreIndices) {
      const state = stateFor(snapshot, fibre.unitId);
      sectionFibres.setColorAt(index, color.set(finite(state.activation) > .08 ? sourceColor({ sourcePoolId: fibre.sourcePoolId }, result) : '#c68b74'));
    }
    if (sectionFibres.instanceColor) sectionFibres.instanceColor.needsUpdate = true;
    for (const module of anatomy.modules) {
      for (const arbor of module.arbors) {
        const state = stateFor(snapshot, arbor.unit), path = partialPath(arbor.points, state.growthFraction);
        const tint = sourceColor(arbor.unit, result), radius = Math.min(.042, module.dimensionsMm[2] / 70);
        for (let index = 1; index < path.length; index++) instanceCylinder(arbors, arborCount++, path[index - 1], path[index], radius, tint);
        if (finite(state.growthFraction) >= 1) {
          const active = clamp(finite(state.activation)), end = arbor.points[arbor.points.length - 1];
          instanceSphere(endplates, endplateCount++, end, [.11 + active * .04, .065 + active * .025, .065], active > .4 ? RPNI_COLORS.selected : tint);
        }
      }
      for (const fibre of module.fibres) {
        const state = stateFor(snapshot, fibre.unitId), activation = clamp(finite(state.activation));
        if (activation < .01) continue;
        const tint = sourceColor({ sourcePoolId: fibre.sourcePoolId }, result);
        for (const front of state.wavefrontsMm || []) {
          if (frontCount >= fronts.instanceMatrix.count) break;
          const x = finite(typeof front === 'number' ? front : front?.xMm, NaN);
          if (!Number.isFinite(x) || x < fibre.startX || x > fibre.endX) continue;
          const halfLength = Math.min(.65, module.dimensionsMm[0] * .035);
          instanceCylinder(fronts, frontCount++, [Math.max(fibre.startX, x - halfLength), fibre.y, fibre.z],
            [Math.min(fibre.endX, x + halfLength), fibre.y, fibre.z], fibre.radiusMm * 1.16, tint);
        }
      }
    }
    finish(arbors, arborCount); finish(endplates, endplateCount); finish(fronts, frontCount);
    for (const group of [territoryFull, territorySection]) for (const object of group.children) {
      object.material.opacity = .035 + clamp(finite(stateFor(snapshot, object.userData.unitId).activation)) * .12;
    }
    updateOxygen(); updateSelection();
    title.textContent = options.view === 'transverse' ? 'TRANSVERSE · y–z PLANE' : 'RPNI · MUSCLE-GRAFT ANATOMY';
    clock.textContent = `DAY ${Number(day.toFixed(1))} · ${Number(timeMs.toFixed(0))} ms`;
    footer.textContent = options.view === 'transverse'
      ? 'Contacts projected along x. Bulk geometry in mm; fibers / terminal arbors representative, with enlarged display diameters.'
      : 'Bulk geometry in mm · drag to rotate / scroll to zoom. Representative fibers and synthetic motor-unit arbors; display diameters enlarged.';
    if (options.showOxygen) footer.textContent = `O₂ ${options.view === 'transverse' ? 'slab profile across z' : 'envelope tint for central slab ratio'} · center / surface ${(100 * clamp(finite(snapshot?.sample?.oxygenCenterRatio, 1))).toFixed(1)}%. Bulk geometry in mm; representative fibers / arbors have enlarged display diameters.`;
  }
  function updateOxygen() {
    // This tint is only a scalar slab-diffusion diagnostic. It neither animates
    // vessels nor claims a predicted perfusion or viable-tissue distribution.
    const ratio = clamp(finite(snapshot?.sample?.oxygenCenterRatio, 1));
    for (const group of [staticFull, staticSection]) for (const child of group.children) {
      if (child.userData.transportLayer) { child.visible = options.showOxygen; continue; }
      if (!child.userData.graftEnvelope && !child.userData.graftSlice) continue;
      child.material.color.set(options.showOxygen && child.userData.graftEnvelope ? '#8ba9af' : child.userData.graftEnvelope ? '#ad7667' : '#a26a59');
      child.material.opacity = child.userData.graftEnvelope ? (options.showOxygen ? .13 + (1 - ratio) * .2 : .13) : .66;
    }
  }
  function updateVisibility() {
    fullGroup.visible = options.view !== 'transverse'; sectionGroup.visible = options.view === 'transverse';
    nerve.visible = arbors.visible = endplates.visible = options.showNerve;
    contactFull.visible = contactSection.visible = options.showElectrodes;
    territoryFull.visible = territorySection.visible = options.showTerritories;
    for (const object of staticSection.children) if (object.userData.nerveSection) object.visible = options.showNerve;
    controls.enableRotate = options.view !== 'transverse';
  }
  function updateSelection() {
    for (const group of [contactFull, contactSection]) for (const object of group.children) {
      if (object.userData.contactId == null) continue;
      const selected = sameId(object.userData.contactId, selectedId);
      if (object.userData.halo) { object.visible = selected; continue; }
      object.material.color.set(selected ? RPNI_COLORS.selected : RPNI_COLORS.contact);
      object.material.emissive?.set(selected ? '#554726' : '#000000');
    }
    for (const label of labels) if (label.contact) {
      const selected = sameId(label.contact.id, selectedId);
      label.element.style.color = selected ? '#fff5c2' : '#dddccc';
      label.element.style.borderColor = selected ? '#d8b77b' : '#9eaa9655';
      label.element.setAttribute('aria-pressed', String(selected));
    }
    const contact = anatomy.contacts.find((item) => sameId(item.id, selectedId));
    if (!contact) { selectedLabel.textContent = ''; return; }
    const [x, y, z] = contact.positionMm;
    selectedLabel.textContent = width < 490 ? `${contact.id} · (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) mm`
      : `${contact.id} · x ${x.toFixed(2)} / y ${y.toFixed(2)} / z ${z.toFixed(2)} mm`;
  }
  function screenPoint(point) {
    projectVector.set(...point).project(camera);
    return [(projectVector.x * .5 + .5) * width, (-projectVector.y * .5 + .5) * height, projectVector.z];
  }
  function updateOverlays() {
    for (const label of labels) {
      let position = label.position, dx = 0, dy = 0;
      if (options.view === 'transverse') {
        const module = anatomy.modules[label.moduleIndex];
        if (label.contact && module) {
          position = [sectionX(module), label.contact.positionMm[1], label.contact.positionMm[2]];
          dx = (label.rank - (module.contacts.length - 1) / 2) * 48; dy = -30 - label.rank * 3;
        } else if (label.kind === 'graft' && module) position = [sectionX(module), module.centerMm[1], module.centerMm[2] - module.dimensionsMm[2] / 2 - .8];
      } else if (label.contact) { dx = 12; dy = label.rank % 2 ? 16 : -17; }
      const [x, y, z] = screenPoint(position);
      label.element.hidden = !options.showLabels || !result || z > 1 || z < -1 || x + dx < 12 || x + dx > width - 12 || y + dy < 53 || y + dy > height - 85
        || (label.contact && !options.showElectrodes) || (label.kind === 'nerve' && (!options.showNerve || options.view === 'transverse'));
      label.element.style.left = `${x + dx}px`; label.element.style.top = `${y + dy}px`;
    }
    projectOrigin.copy(controls.target).project(camera);
    let best = { pixels: 0, axis: 'x' };
    const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    axes.forEach((axis, index) => {
      projectEnd.copy(controls.target).add(new THREE.Vector3(...axis)).project(camera);
      const dx = (projectEnd.x - projectOrigin.x) * width / 2, dy = -(projectEnd.y - projectOrigin.y) * height / 2;
      const pixels = Math.hypot(dx, dy);
      if (pixels > best.pixels) best = { pixels, axis: ['x', 'y', 'z'][index] };
      const divisor = Math.max(1, Math.hypot(dx, dy, (projectEnd.z - projectOrigin.z) * 100));
      const ex = 38 + dx / divisor * 25, ey = 39 + dy / divisor * 25;
      const { path, label } = orientationAxes[index];
      path.setAttribute('x1', '38'); path.setAttribute('y1', '39'); path.setAttribute('x2', ex.toFixed(2)); path.setAttribute('y2', ey.toFixed(2));
      label.setAttribute('x', (ex + (dx < 0 ? -8 : 3)).toFixed(2)); label.setAttribute('y', (ey + (dy > 0 ? 9 : -3)).toFixed(2));
    });
    const scale = niceScale(best.pixels, Math.min(90, width * .2));
    scaleRule.style.width = `${Math.max(1, scale * best.pixels)}px`;
    scaleText.textContent = `${Number(scale.toPrecision(3))} mm · ${best.axis}`;
  }
  function resize() {
    if (fallback) { fallback.resize?.(); return; }
    if (disposed || webglDisposed) return;
    const rect = container.getBoundingClientRect();
    const oldAspect = width / height; width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    const halfHeight = Math.max(1, (camera.top - camera.bottom) / 2);
    camera.left = -halfHeight * width / height; camera.right = halfHeight * width / height;
    camera.updateProjectionMatrix();
    if (result && Math.abs(width / height - oldAspect) > .2) resetCamera();
    updateSelection();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  const intersection = new IntersectionObserver((entries) => { visible = !!entries[0]?.isIntersecting; }); intersection.observe(container);
  function resetCamera(preset) {
    if (fallback) { fallback.resetCamera(preset); return; }
    if (disposed || webglDisposed) return;
    if (preset) options.view = ['transverse', 'cross-section'].includes(preset) ? 'transverse' : 'longitudinal';
    updateVisibility();
    const { min, max } = anatomy.bounds;
    const center = min.map((value, axis) => (value + max[axis]) / 2), span = min.map((value, axis) => Math.max(1, max[axis] - value));
    const distance = Math.max(...span) * 3 + 20;
    controls.target.set(...center); camera.zoom = 1;
    if (options.view === 'transverse') {
      camera.up.set(0, 0, 1); camera.position.set(center[0] + distance, center[1], center[2]);
    } else {
      camera.up.set(0, 1, 0);
      if (preset === 'top') camera.position.set(center[0], center[1], center[2] + distance);
      else camera.position.set(center[0] + span[0] * .22, center[1] - span[1] * .24, center[2] + distance);
    }
    const primaryWidth = options.view === 'transverse' ? span[1] : span[0];
    const primaryHeight = options.view === 'transverse' ? span[2] + 2.5 : span[1] + 3;
    let halfHeight = Math.max(primaryHeight, primaryWidth / Math.max(.2, width / height)) * .7;
    camera.left = -halfHeight * width / height; camera.right = halfHeight * width / height;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.far = distance * 5;
    camera.lookAt(controls.target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // Fit actual bulk corners in the remaining viewport, including a margin for
    // contact leads and captions. The orthographic projection keeps true scale.
    let extent = 0;
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2] + 1.5]) {
      projectVector.set(x, y, z).project(camera); extent = Math.max(extent, Math.abs(projectVector.x), Math.abs(projectVector.y));
    }
    if (extent > .78) {
      halfHeight *= extent / .78; camera.left = -halfHeight * width / height; camera.right = halfHeight * width / height;
      camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    }
    controls.update(); dirtyState = true;
  }
  function render(now) {
    if (disposed || webglDisposed) return;
    animation = requestAnimationFrame(render);
    if (!visible || document.hidden || now - lastRender < 25) return;
    lastRender = now;
    if (dirtyState) { dirtyState = false; updateBiology(); }
    controls.update(); renderer.render(scene, camera); updateOverlays();
  }
  function selectContact(id) {
    selectedId = id; options.selectedElectrodeId = id; dirtyState = true;
    onSelect(id);
  }
  function setResult(next) {
    if (fallback) { result = next; fallback.setResult(next); return; }
    result = next; anatomy = buildRpniAnatomy(next);
    day = clamp(day, 0, finite(result?.config?.durationDays, Infinity));
    timeMs = clamp(timeMs, 0, finite(result?.config?.traceDurationMs, Infinity));
    if (!anatomy.contacts.some((contact) => sameId(contact.id, selectedId))) selectedId = anatomy.contacts[0]?.id ?? null;
    buildStatic(); resize(); resetCamera();
  }
  function setTime(next, activityMs) {
    if (fallback) { fallback.setTime(next, activityMs); return; }
    day = clamp(finite(typeof next === 'number' ? next : next?.day, day), 0, finite(result?.config?.durationDays, Infinity));
    timeMs = clamp(finite(typeof next === 'object' ? next?.timeMs ?? next?.activityMs : activityMs, timeMs), 0, finite(result?.config?.traceDurationMs, Infinity));
    dirtyState = true;
  }
  function setOptions(next = {}) {
    if (fallback) { fallback.setOptions(next); return; }
    const beforeView = options.view, beforeSection = options.sectionFraction;
    Object.assign(options, next);
    if (next.view === 'cross-section') options.view = 'transverse';
    if (!['longitudinal', 'transverse'].includes(options.view)) options.view = 'longitudinal';
    options.sectionFraction = clamp(finite(options.sectionFraction, .5));
    if ('selectedElectrodeId' in next) selectedId = next.selectedElectrodeId;
    else if ('selected' in next) selectedId = next.selected;
    if (beforeSection !== options.sectionFraction) buildStatic();
    updateVisibility(); dirtyState = true;
    if (beforeView !== options.view) resetCamera();
  }
  let pointerDown = null;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (event) => { pointerDown = [event.clientX, event.clientY]; }, { signal: abort.signal });
  canvas.addEventListener('pointerup', (event) => {
    const down = pointerDown; pointerDown = null;
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5 || !options.showElectrodes) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const group = options.view === 'transverse' ? contactSection : contactFull;
    const hit = raycaster.intersectObjects(contactMeshes.filter((object) => object.parent === group), false)[0];
    if (hit?.object.userData.contactId != null) selectContact(hit.object.userData.contactId);
  }, { signal: abort.signal });
  canvas.addEventListener('pointercancel', () => { pointerDown = null; }, { signal: abort.signal });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Home') { event.preventDefault(); resetCamera(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !anatomy.contacts.length) return;
    event.preventDefault();
    const current = anatomy.contacts.findIndex((contact) => sameId(contact.id, selectedId));
    const increment = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    selectContact(anatomy.contacts[(current + increment + anatomy.contacts.length) % anatomy.contacts.length].id);
  }, { signal: abort.signal });
  function cleanupWebgl() {
    if (webglDisposed) return;
    webglDisposed = true; abort.abort(); cancelAnimationFrame(animation);
    resizeObserver.disconnect(); intersection.disconnect(); controls.dispose();
    clearGroup(fullGroup); clearGroup(sectionGroup); removeLabels();
    cylinderGeometry.dispose(); sphereGeometry.dispose(); discGeometry.dispose();
    renderer.dispose(); canvas.remove();
    for (const element of [topLabel, sourceLegend, footer, selectedLabel, scaleBar, orientation]) element.remove();
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (disposed) return;
    cleanupWebgl();
    fallback = createRpniFallback(container, { onSelect });
    fallback.setResult(result); fallback.setOptions({ ...options, selectedElectrodeId: selectedId }); fallback.setTime({ day, timeMs });
  }, { signal: abort.signal });
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (fallback) fallback.dispose(); else cleanupWebgl();
  }
  resize(); resetCamera(); animation = requestAnimationFrame(render);
  return {
    get available() { return fallback ? fallback.available : true; },
    get renderer() { return fallback ? fallback.renderer : 'webgl'; },
    get representativeCount() { return fallback ? fallback.representativeCount : anatomy.representativeCount; },
    setResult, setTime, setOptions, resetCamera, resize, destroy: dispose, dispose,
  };
}
