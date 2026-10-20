import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Physical coordinates throughout are micrometres. The contact face is y=0;
// tissue occupies y>0 and the shank's pointed end is at positive z.
const VOLTAGE_STOPS = [
  [-100, '#284b74'], [-70, '#478eab'], [-55, '#8bd1cf'],
  [-25, '#f2c96c'], [0, '#fa8355'], [40, '#ffe2bc'],
].map(([voltage, color]) => [voltage, new THREE.Color(color)]);
const MISSING_COLOR = new THREE.Color('#7d858d');
const vec = value => new THREE.Vector3(...value);
const safePoint = value => value?.length >= 3 && value.slice(0, 3).every(Number.isFinite);

/** Shared by every cell. Color depends solely on the sampled membrane voltage. */
export function membraneVoltageColor(voltage, target = new THREE.Color()) {
  if (!Number.isFinite(voltage)) return target.copy(MISSING_COLOR);
  if (voltage <= VOLTAGE_STOPS[0][0]) return target.copy(VOLTAGE_STOPS[0][1]);
  for (let i = 1; i < VOLTAGE_STOPS.length; i++) {
    const [hi, b] = VOLTAGE_STOPS[i], [lo, a] = VOLTAGE_STOPS[i - 1];
    if (voltage <= hi) return target.copy(a).lerp(b, (voltage - lo) / (hi - lo));
  }
  return target.copy(VOLTAGE_STOPS.at(-1)[1]);
}

function disposeObject(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const value of textures) value.dispose();
  for (const value of materials) value.dispose();
  for (const value of geometries) value.dispose();
  object.removeFromParent();
}

/** One indexed draw per neuron, retaining the actual path and its diameter taper. */
function morphologyGeometry(nodes) {
  const positions = [], normals = [], indices = [], faceNodes = [], nodeRanges = [];
  const sides = 7;
  function addSphere(node, nodeIndex) {
    const sphere = new THREE.SphereGeometry(Math.max(.05, node.diameterUm / 2), 14, 10);
    const p = sphere.attributes.position.array, n = sphere.attributes.normal.array;
    const base = positions.length / 3, center = node.centerUm;
    for (let i = 0; i < p.length; i += 3) positions.push(p[i] + center[0], p[i + 1] + center[1], p[i + 2] + center[2]);
    normals.push(...n);
    for (let i = 0; i < sphere.index.count; i += 3) {
      indices.push(base + sphere.index.array[i], base + sphere.index.array[i + 1], base + sphere.index.array[i + 2]);
      faceNodes.push(nodeIndex);
    }
    sphere.dispose();
  }
  function addSegment(start, end, ra, rb, nodeIndex) {
    if (!safePoint(start) || !safePoint(end)) return;
    const a = vec(start), b = vec(end), axis = b.clone().sub(a), length = axis.length();
    if (length < 1e-7) return;
    axis.divideScalar(length);
    const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.z) < .9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
    const v = new THREE.Vector3().crossVectors(axis, u).normalize(), base = positions.length / 3;
    for (let ring = 0; ring < 2; ring++) {
      const center = ring ? b : a, radius = ring ? rb : ra;
      for (let j = 0; j < sides; j++) {
        const theta = 2 * Math.PI * j / sides;
        const radial = u.clone().multiplyScalar(Math.cos(theta)).addScaledVector(v, Math.sin(theta));
        const point = center.clone().addScaledVector(radial, radius);
        const normal = radial.addScaledVector(axis, (ra - rb) / length).normalize();
        positions.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z);
      }
    }
    for (let j = 0; j < sides; j++) {
      const next = (j + 1) % sides;
      indices.push(base + j, base + next, base + sides + j, base + next, base + sides + next, base + sides + j);
      faceNodes.push(nodeIndex, nodeIndex);
    }
  }
  nodes.forEach((node, nodeIndex) => {
    const start = positions.length / 3;
    if (node.areaUm2 > 0 && safePoint(node.centerUm)) {
      if (node.kind === 'soma') addSphere(node, nodeIndex);
      else {
        const path = node.pathUm?.length > 1 ? node.pathUm : [node.startUm, node.endUm];
        for (let k = 1; k < path.length; k++) addSegment(path[k - 1], path[k],
          Math.max(.03, (node.pathDiameterUm?.[k - 1] ?? node.diameterUm) / 2),
          Math.max(.03, (node.pathDiameterUm?.[k] ?? node.diameterUm) / 2), nodeIndex);
      }
    }
    nodeRanges.push([start, positions.length / 3]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.length), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
  return { geometry, nodeRanges, faceNodes };
}

function labelSprite(text, color = '#d8e5e9', width = 256) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = 64;
  const context = canvas.getContext('2d');
  context.font = '500 28px system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = 'rgba(10,20,28,.80)'; context.fillRect(0, 7, width, 50);
  context.fillStyle = color; context.fillText(text, width / 2, 32);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true }));
  sprite.scale.set(width / 2.8, 64 / 2.8, 1); sprite.renderOrder = 5;
  return sprite;
}

function contactOutline(contact, padding, color) {
  const [x, y, z] = contact.centerUm;
  const width = (contact.widthUm ?? 2 * contact.radiusUm) / 2 + padding;
  const height = (contact.heightUm ?? 2 * contact.radiusUm) / 2 + padding;
  const points = [];
  if (['disk', 'circle', 'ring'].includes(contact.shape)) {
    for (let j = 0; j < 48; j++) points.push(new THREE.Vector3(x + width * Math.cos(j / 48 * 2 * Math.PI), y + 1.3, z + height * Math.sin(j / 48 * 2 * Math.PI)));
  } else {
    points.push(new THREE.Vector3(x - width, y + 1.3, z - height), new THREE.Vector3(x + width, y + 1.3, z - height), new THREE.Vector3(x + width, y + 1.3, z + height), new THREE.Vector3(x - width, y + 1.3, z + height));
  }
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: .85 }));
}

export function createInterfaceView(host, { onSelectCell = () => {}, onSelectContact = () => {}, onStatus = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch {
    const fallback = document.createElement('p');
    fallback.textContent = 'The 3D view needs WebGL. You can still select cells and contacts, run the simulation, and inspect voltage traces and recordings below.';
    fallback.style.cssText = 'padding:2rem;color:inherit;line-height:1.6'; host.append(fallback);
    onStatus('3D unavailable: WebGL could not be initialized. Traces and numerical results remain available.');
    return { setGeometry() {}, setFrame() {}, setContacts() {}, setView() {}, dispose() { fallback.remove(); } };
  }
  let disposed = false, contextLost = false, animation, geometryGroup = new THREE.Group(), labels = new THREE.Group();
  let cells = [], cellMeshes = [], contacts = [], contactMeshes = [], activeIds = [], recordingId = null;
  let currentResult = null, currentFrame = 0, selectedCellIndex = 0, selectedNodeIndex = 0;
  const events = new AbortController(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .5, 20000);
  const background = '#302f2d'; scene.background = new THREE.Color(background);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  renderer.domElement.setAttribute('aria-label', 'Three dimensional finite-contact neural interface. Drag to rotate, scroll to zoom, click a cell compartment or electrode contact to inspect it.');
  renderer.domElement.setAttribute('role', 'img'); host.append(renderer.domElement);
  camera.up.set(0, 0, -1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .09; controls.minDistance = 20; controls.maxDistance = 9000;
  const ambient = new THREE.HemisphereLight('#dfeeff', '#5b596d', 1.6), key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(-500, 1200, -300); scene.add(ambient, key, geometryGroup, labels);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: .55, depthTest: false }));
  marker.visible = false; marker.renderOrder = 6; scene.add(marker);
  let bounds = new THREE.Box3(new THREE.Vector3(-650, -20, 0), new THREE.Vector3(650, 650, 1800));
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(), scratchColor = new THREE.Color();
  let pointerStart = null, lastHover = -Infinity;
  const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
  function hitAt(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects([...contactMeshes.map(value => value.pick), ...cellMeshes.map(value => value.mesh)], false)[0];
  }
  listen(renderer.domElement, 'pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() }; });
  listen(renderer.domElement, 'pointerup', event => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5 || performance.now() - pointerStart.time > 800) return;
    pointerStart = null;
    const hit = hitAt(event); if (!hit) return;
    if (Number.isInteger(hit.object.userData.contact)) onSelectContact(hit.object.userData.contact);
    else {
      const ci = hit.object.userData.cell, ni = cellMeshes[ci]?.faceNodes[hit.faceIndex];
      if (Number.isInteger(ni)) onSelectCell(ci, ni);
    }
  });
  listen(renderer.domElement, 'pointermove', event => {
    if (event.buttons) return;
    // A full reconstructed population can contain many triangles. Picking for
    // a tooltip need not run at the pointer device's full sampling frequency.
    const now = performance.now(); if (now - lastHover < 80) return; lastHover = now;
    const hit = hitAt(event); renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    if (!hit) { renderer.domElement.title = 'Drag to orbit · Scroll to zoom · Click a contact or neuron'; return; }
    const ci = hit.object.userData.contact;
    if (Number.isInteger(ci)) {
      const contact = contacts[ci]; renderer.domElement.title = `Contact ${contact.label ?? ci + 1} · ${contact.widthUm} × ${contact.heightUm} µm · click to inspect recording`;
    } else {
      const cellIndex = hit.object.userData.cell, ni = cellMeshes[cellIndex].faceNodes[hit.faceIndex], cell = cells[cellIndex];
      const voltage = currentResult?.cells?.[cellIndex]?.membraneMv?.[currentFrame * cell.nodes.length + ni];
      renderer.domElement.title = `${cell.label ?? `Cell ${cellIndex + 1}`} · ${cell.nodes[ni]?.id ?? ni}${Number.isFinite(voltage) ? ` · ${voltage.toFixed(2)} mV` : ''}`;
    }
  });
  listen(renderer.domElement, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; onStatus('The 3D graphics context was lost. Numerical results and traces remain available while the browser attempts to restore it.'); });
  listen(renderer.domElement, 'webglcontextrestored', () => { contextLost = false; onStatus('The 3D graphics context was restored.'); });
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.min(500, Math.max(340, width * .65));
    renderer.setSize(width, height, false); renderer.domElement.style.height = `${height}px`;
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(host); listen(globalThis, 'resize', resize); resize();

  function setView(name = 'oblique', cellIndex = selectedCellIndex) {
    if (disposed) return;
    let target = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    if (name === 'cell' && cellMeshes[cellIndex]) {
      const box = cellMeshes[cellIndex].mesh.geometry.boundingBox;
      if (box && !box.isEmpty()) { target = box.getCenter(new THREE.Vector3()); size = box.getSize(new THREE.Vector3()); }
    }
    const span = Math.max(size.x, size.y, size.z, 80);
    const distance = span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2 / Math.min(1, camera.aspect);
    const direction = name === 'front' ? new THREE.Vector3(0, 1, 0)
      : name === 'side' ? new THREE.Vector3(1, .05, 0)
        : name === 'top' ? new THREE.Vector3(0, .05, -1)
          : new THREE.Vector3(.55, 1, -.28).normalize();
    camera.up.set(0, 0, -1); if (name === 'top') camera.up.set(0, 1, 0);
    controls.target.copy(target); camera.position.copy(target).addScaledVector(direction.normalize(), distance);
    camera.near = Math.max(.1, distance / 10000); camera.far = Math.max(10000, distance * 8); camera.updateProjectionMatrix(); controls.update();
  }

  function setGeometry({ design, cells: nextCells, preserveView = false }) {
    if (disposed) return;
    disposeObject(geometryGroup); disposeObject(labels); geometryGroup = new THREE.Group(); labels = new THREE.Group(); scene.add(geometryGroup, labels);
    cells = nextCells ?? []; contacts = design?.contacts ?? []; cellMeshes = []; contactMeshes = []; currentResult = null; marker.visible = false;
    const width = design?.widthUm ?? 90, length = design?.lengthUm ?? 1800, thickness = design?.thicknessUm ?? 20, taper = design?.taperUm ?? 300;
    const silhouette = new THREE.Shape(); silhouette.moveTo(-width / 2, 0); silhouette.lineTo(width / 2, 0);
    silhouette.lineTo(width / 2, length - taper); silhouette.lineTo(0, length); silhouette.lineTo(-width / 2, length - taper); silhouette.closePath();
    const shankGeometry = new THREE.ExtrudeGeometry(silhouette, { depth: thickness, bevelEnabled: false, steps: 1 }); shankGeometry.rotateX(Math.PI / 2);
    const shank = new THREE.Mesh(shankGeometry, new THREE.MeshStandardMaterial({ color: '#3b4657', roughness: .48, metalness: .32 })); geometryGroup.add(shank);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(shankGeometry), new THREE.LineBasicMaterial({ color: '#748394', transparent: true, opacity: .7 })); geometryGroup.add(edge);
    contacts.forEach((contact, index) => {
      const w = contact.widthUm ?? contact.radiusUm * 2, h = contact.heightUm ?? contact.radiusUm * 2;
      let geometry;
      if (['circle', 'disk'].includes(contact.shape)) { geometry = new THREE.CircleGeometry(w / 2, 40); geometry.rotateX(Math.PI / 2); }
      else if (contact.shape === 'ring') { geometry = new THREE.RingGeometry(contact.innerRadiusUm ?? w / 4, w / 2, 48); geometry.rotateX(Math.PI / 2); }
      else geometry = new THREE.BoxGeometry(w, .8, h);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#c8b580', roughness: .32, metalness: .6, side: THREE.DoubleSide }));
      mesh.position.copy(vec(contact.centerUm)); mesh.position.y += .6; mesh.userData.contact = index; geometryGroup.add(mesh);
      // Larger invisible picking surface improves access without changing displayed dimensions.
      const pick = new THREE.Mesh(new THREE.BoxGeometry(Math.max(26, w), 2, Math.max(26, h)), new THREE.MeshBasicMaterial({ visible: false }));
      pick.position.copy(mesh.position); pick.userData.contact = index; geometryGroup.add(pick);
      const activeOutline = contactOutline(contact, 4, '#ff9274'), recordingOutline = contactOutline(contact, 7, '#a4eddf');
      activeOutline.visible = false; recordingOutline.visible = false; geometryGroup.add(activeOutline, recordingOutline);
      const label = labelSprite(String(contact.label ?? index + 1), '#e9dcc0', 64); label.position.set(width / 2 + 35, 8, contact.centerUm[2]); label.scale.set(22, 22, 1); labels.add(label);
      contactMeshes.push({ mesh, pick, activeOutline, recordingOutline });
    });
    cells.forEach((cell, index) => {
      const built = morphologyGeometry(cell.nodes ?? []);
      const mesh = new THREE.Mesh(built.geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: 0, side: THREE.DoubleSide }));
      mesh.userData.cell = index; geometryGroup.add(mesh); cellMeshes.push({ mesh, ...built });
      const soma = cell.nodes?.[cell.somaIndex ?? cell.nodes.findIndex(node => node.kind === 'soma')];
      if (soma && safePoint(soma.centerUm)) {
        const label = labelSprite(String(index + 1), '#d5e8ed', 64); label.position.copy(vec(soma.centerUm)); label.position.x += 22; label.scale.set(20, 20, 1); labels.add(label);
      }
    });
    bounds = new THREE.Box3().setFromObject(geometryGroup);
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-600, -20, 0), new THREE.Vector3(600, 600, length));
    const barOrigin = new THREE.Vector3(bounds.min.x + 20, bounds.max.y + 15, bounds.max.z + 70);
    const barPoints = [barOrigin.clone(), barOrigin.clone().add(new THREE.Vector3(100, 0, 0))];
    const scaleBar = new THREE.Line(new THREE.BufferGeometry().setFromPoints(barPoints), new THREE.LineBasicMaterial({ color: '#bacbd5' })); geometryGroup.add(scaleBar);
    const scaleLabel = labelSprite('100 µm'); scaleLabel.position.copy(barOrigin).add(new THREE.Vector3(50, 0, 25)); labels.add(scaleLabel);
    paintCells(null, 0); setContacts(activeIds, recordingId); if (!preserveView) setView('oblique');
  }

  function paintCells(result, frame) {
    cellMeshes.forEach((view, ci) => {
      const cell = cells[ci], values = result?.cells?.[ci]?.membraneMv, color = view.geometry.attributes.color;
      const offset = frame * cell.nodes.length;
      view.nodeRanges.forEach(([start, end], ni) => {
        // A missing/unrun value has one neutral color, never a fabricated voltage.
        membraneVoltageColor(values?.[offset + ni], scratchColor);
        const array = color.array;
        for (let vertex = start * 3; vertex < end * 3; vertex += 3) {
          array[vertex] = scratchColor.r; array[vertex + 1] = scratchColor.g; array[vertex + 2] = scratchColor.b;
        }
      });
      color.needsUpdate = true;
    });
  }
  function matches(value, index) { return value === index || value === contacts[index]?.id || value === String(index); }
  function setContacts(nextActiveIds = [], nextRecordingId = null) {
    activeIds = Array.from(nextActiveIds); recordingId = nextRecordingId;
    contactMeshes.forEach((view, index) => {
      view.activeOutline.visible = activeIds.some(value => matches(value, index));
      view.recordingOutline.visible = recordingId !== null && matches(recordingId, index);
    });
  }
  function setFrame(result, frame, selectedCell = 0, selectedNode = 0, options = {}) {
    if (disposed) return;
    const frameCount = result?.timeMs?.length ?? 0;
    frame = frameCount ? Math.max(0, Math.min(frameCount - 1, Math.trunc(frame) || 0)) : 0;
    if (currentResult !== result || currentFrame !== frame) paintCells(result, frame);
    currentResult = result; currentFrame = frame; selectedCellIndex = selectedCell; selectedNodeIndex = selectedNode;
    const cell = cells[selectedCellIndex], node = cell?.nodes?.[selectedNodeIndex];
    marker.visible = !!node && options.showSelection !== false;
    if (node && safePoint(node.centerUm)) { marker.position.copy(vec(node.centerUm)); marker.scale.setScalar(Math.max(3, (node.diameterUm ?? 2) * .65)); }
    else marker.visible = false;
    labels.visible = options.showLabels !== false;
    const currents = result?.currentUa;
    contactMeshes.forEach((view, index) => {
      const current = currents?.[frame * contacts.length + index] ?? 0;
      view.mesh.material.color.set(current < -1e-10 ? '#579eff' : current > 1e-10 ? '#ff8867' : '#c8b580');
      view.mesh.material.emissive.set(current < -1e-10 ? '#123d83' : current > 1e-10 ? '#7f251b' : '#000000');
      view.mesh.material.emissiveIntensity = .5;
    });
  }
  function animate() {
    if (disposed) return;
    animation = requestAnimationFrame(animate); controls.update(); if (!contextLost) renderer.render(scene, camera);
  }
  setView(); animate();
  return {
    setGeometry, setFrame, setContacts, setView,
    dispose() {
      if (disposed) return;
      disposed = true; events.abort(); observer?.disconnect(); cancelAnimationFrame(animation); controls.dispose();
      disposeObject(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
