import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMorphology } from './anatomy.js';
import { distanceToContact } from './field.js';

export function fieldColor(value, kind) {
  if (!Number.isFinite(value)) return [18, 24, 30, 255];
  if (kind === 'potential') {
    const v = Math.min(1, Math.asinh(Math.abs(value) / 2) / Math.asinh(100 / 2));
    const end = value < 0 ? [81, 176, 225] : [237, 126, 106];
    return end.map((c, i) => Math.round([13, 23, 32][i] + (c - [13, 23, 32][i]) * v)).concat(255);
  }
  const max = kind === 'currentDensity' ? 300 : 1000;
  const v = Math.max(0, Math.min(1, Math.log10(1 + value) / Math.log10(1 + max)));
  const stops = [[12, 22, 31], [27, 76, 91], [64, 158, 164], [208, 183, 119], [255, 225, 172]];
  const scaled = v * 4, index = Math.min(3, Math.floor(scaled)), a = scaled - index;
  return stops[index].map((n, k) => Math.round(n + (stops[index + 1][k] - n) * a)).concat(255);
}

export function fieldImage(field, kind) {
  const data = new Uint8ClampedArray(field.n * field.n * 4), values = field[kind];
  for (let i = 0; i < values.length; i++) data.set(fieldColor(values[i], kind), i * 4);
  return data;
}

export function createCortexView(host, onSelect) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.setClearColor(0x0d1720); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.setAttribute('aria-label', 'Cortical tissue, electrodes, and simulated neurons. Drag to orbit, scroll to zoom. Use the view buttons and neuron selector for keyboard access.'); canvas.setAttribute('role', 'img'); host.append(canvas);
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xe9f8ff, 0x1a2c39, 2));
  const light = new THREE.DirectionalLight(0xffe8bb, 2); light.position.set(-200, -500, 100); scene.add(light);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 10000); camera.up.set(0, 0, -1);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = false; controls.minDistance = 25; controls.maxDistance = 3000;
  let content = new THREE.Group(); scene.add(content);
  let detail = new THREE.Group(); scene.add(detail);
  let result = null, somata = null, background = null, selected = 0, texture = null, plane = null, time = null, populationVisible = true, fieldVisible = false, view = 'oblique';
  const color = new THREE.Color(), transform = new THREE.Object3D();
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  let disposed = false;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); };
  const observer = new ResizeObserver(resize); observer.observe(host); controls.addEventListener('change', render);
  function disposeGroup(group) { group.traverse(obj => { obj.geometry?.dispose(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material?.dispose(); }); group.clear(); }
  function setView(next = 'oblique') {
    view = next; const c = result?.config, center = new THREE.Vector3(0, 0, c ? c.top + c.depth / 2 : 650), distance = (c?.width ?? 600) * 2;
    if (next === 'cell' && result) {
      center.fromArray(result.samples[selected].position); camera.position.copy(center).add(new THREE.Vector3(100, -220, -90));
    } else if (next === 'top') camera.position.copy(center).add(new THREE.Vector3(0, -.01, -distance));
    else if (next === 'side') camera.position.copy(center).add(new THREE.Vector3(0, -distance, -.01));
    else camera.position.copy(center).add(new THREE.Vector3(distance * .6, -distance * .95, -distance * .42));
    controls.target.copy(center); controls.update(); render();
  }
  function textSprite(text, size = 18, tint = '#afc3ca') {
    const label = document.createElement('canvas'); label.width = 512; label.height = 96;
    const ctx = label.getContext('2d'); ctx.font = '30px Georgia'; ctx.fillStyle = tint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 48);
    const map = new THREE.CanvasTexture(label), sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false })); sprite.scale.set(size * 5.33, size, 1); sprite.userData.labelTexture = map; return sprite;
  }
  function electrodeMesh(e) {
    let geometry;
    if (e.shape === 'rectangle') geometry = new THREE.BoxGeometry(e.width, e.height, 3);
    else if (e.shape === 'sphere') geometry = new THREE.SphereGeometry(e.diameter / 2, 20, 14);
    else if (e.shape === 'ring') {
      const shape = new THREE.Shape(); shape.absarc(0, 0, e.diameter / 2, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, e.diameter / 2 * e.innerRatio, 0, Math.PI * 2, true); shape.holes.push(hole);
      geometry = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 24 }); geometry.translate(0, 0, -1.5);
    } else { geometry = new THREE.CylinderGeometry(e.diameter / 2, e.diameter / 2, 3, 32); geometry.rotateX(Math.PI / 2); }
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: e.weight < 0 ? 0xb4dff0 : e.weight > 0 ? 0xefba99 : 0x89959a, metalness: .65, roughness: .33, side: THREE.DoubleSide }));
    mesh.rotation.y = e.tilt * Math.PI / 180; mesh.position.set(e.x, e.y, e.z);
    const label = textSprite(`${e.id}  ${e.weight < 0 ? '−' : '+'}`, 15, e.weight < 0 ? '#99d8f3' : '#f4b797'); label.position.set(e.x, e.y, e.z - e.diameter / 2 - 20); content.add(label);
    return mesh;
  }
  function updateColors() {
    if (!somata || !result) return;
    result.samples.forEach((cell, i) => {
      const recruited = cell.firstSpike >= 0 && (time === null || time >= cell.firstSpike);
      const flashing = time !== null && cell.firstSpike >= 0 && Math.abs(time - cell.firstSpike) < .3;
      color.setHex(i === selected ? 0xfff7de : flashing ? 0xffffff : recruited ? 0xf9b96c : cell.inhibitory ? 0xb1a7d7 : 0x6aafbe); somata.setColorAt(i, color);
    });
    somata.instanceColor.needsUpdate = true; render();
  }
  function setSelected(index) {
    selected = Math.max(0, Math.min(result?.samples.length - 1 || 0, index)); disposeGroup(detail);
    if (!result) return;
    const cell = result.samples[selected], morph = createMorphology(cell, result.config);
    for (let i = 1; i < morph.nodes.length; i++) {
      const node = morph.nodes[i], parent = morph.nodes[node.parent], a = new THREE.Vector3(...parent.position), b = new THREE.Vector3(...node.position), delta = b.clone().sub(a);
      const geometry = new THREE.CylinderGeometry(node.diameter / 2, parent.kind === 'soma' ? node.diameter / 2 : parent.diameter / 2, delta.length(), 6);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: node.kind === 'dendrite' ? 0x83bdc9 : node.kind === 'ais' ? 0xeacff7 : 0xf6d397 }));
      mesh.position.copy(a.add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); detail.add(mesh);
    }
    if (cell.firstNode >= 0) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff986b, wireframe: true, depthTest: false })); marker.position.fromArray(morph.nodes[cell.firstNode].position); detail.add(marker);
    }
    const outline = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .7, depthTest: false })); outline.position.fromArray(cell.position); outline.scale.set(...cell.radii.map(r => r * 1.25)); detail.add(outline);
    updateColors();
  }
  function setField(kind) {
    if (!result || !plane) return;
    texture?.dispose(); texture = new THREE.DataTexture(fieldImage(result.field, kind), result.field.n, result.field.n, THREE.RGBAFormat); texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
    plane.material.map = texture; plane.material.needsUpdate = true; render();
  }
  function setResult(next) {
    result = next; texture?.dispose(); texture = null;
    content.traverse(obj => obj.userData.labelTexture?.dispose()); disposeGroup(content);
    const c = result.config, { positions, radii } = result.anatomy, sampleIds = new Set(result.samples.map(n => n.id)), rejected = new Set(result.rejected);
    const remaining = [];
    for (let id = 0; id < result.population.count; id++) {
      if (sampleIds.has(id) || rejected.has(id)) continue;
      const p = positions.subarray(id * 3, id * 3 + 3), r = Math.max(...radii.subarray(id * 3, id * 3 + 3));
      if (!c.electrodes.some(e => distanceToContact(p, e) < r)) remaining.push(id);
    }
    background = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshBasicMaterial({ color: 0x8299a8, transparent: true, opacity: .11, depthWrite: false }), remaining.length);
    remaining.forEach((id, i) => { transform.position.fromArray(positions, id * 3); transform.scale.fromArray(radii, id * 3); transform.updateMatrix(); background.setMatrixAt(i, transform.matrix); }); background.visible = populationVisible; content.add(background);
    somata = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: .8, metalness: .05 }), result.samples.length);
    result.samples.forEach((cell, i) => { transform.position.fromArray(cell.position); transform.scale.set(...cell.radii); transform.updateMatrix(); somata.setMatrixAt(i, transform.matrix); somata.setColorAt(i, color.setHex(0x6aafbe)); }); content.add(somata);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(c.width, c.width, c.depth)), new THREE.LineBasicMaterial({ color: 0x47606c, transparent: true, opacity: .65 })); box.position.set(0, 0, c.top + c.depth / 2); content.add(box);
    const top = textSprite(`Layers 2/3 · ${c.top} µm below pia`, 22); top.position.set(0, 0, c.top - 45); content.add(top);
    const bottom = textSprite(`${c.width} × ${c.width} × ${c.depth} µm`, 20); bottom.position.set(0, -c.width / 2, c.top + c.depth + 45); content.add(bottom);
    const axonPositions = [];
    for (const cell of result.samples.filter(n => n.firstSpike >= 0).slice(0, 100)) {
      const m = createMorphology(cell, c);
      for (const node of m.nodes) if (node.parent >= 0 && ['axon', 'ais'].includes(node.kind)) axonPositions.push(...node.position, ...m.nodes[node.parent].position);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(axonPositions, 3)); content.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xe3ab6d, transparent: true, opacity: .2 })));
    c.electrodes.forEach(e => content.add(electrodeMesh(e)));
    const planeGeometry = new THREE.PlaneGeometry(c.width, c.depth); planeGeometry.rotateX(Math.PI / 2);
    plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: .7, depthWrite: false })); plane.position.set(0, 0, c.top + c.depth / 2); plane.visible = fieldVisible; content.add(plane); setField('magnitude');
    selected = Math.min(selected, result.samples.length - 1); setSelected(selected); setView(view);
  }
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
  const pointerDown = e => { down = [e.clientX, e.clientY]; };
  const pointerUp = e => {
    if (!somata || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rect = canvas.getBoundingClientRect(); mouse.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(somata)[0]; if (hit?.instanceId !== undefined) onSelect(hit.instanceId);
  };
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp);
  resize(); setView();
  return {
    setResult, setView, setSelected, setField,
    setTime(value) { time = value; updateColors(); },
    showPopulation(value) { populationVisible = value; if (background) background.visible = value; render(); },
    showField(value) { fieldVisible = value; if (plane) plane.visible = value; render(); },
    dispose() { disposed = true; observer.disconnect(); controls.dispose(); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); texture?.dispose(); content.traverse(obj => obj.userData.labelTexture?.dispose()); disposeGroup(content); disposeGroup(detail); renderer.dispose(); canvas.remove(); },
  };
}
