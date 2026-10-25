import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  AnatomyCanvasRenderer, anatomicalMesh, anatomyLayerVisible, applyAnatomyState,
  buildAnatomyGroup, disposeAnatomyGroup, fitAnatomyCamera, sampledMembraneValue,
} from '../src/components/cochlear/anatomy-renderer.js';
import { createAnatomyScene } from '../src/lib/cochlear/anatomy.js';
import { createGeometry } from '../src/lib/cochlear/geometry.js';
import { createNerveModel } from '../src/lib/cochlear/nerve.js';
import { DEFAULT_SETTINGS } from '../src/lib/cochlear/config.js';

// This backend writes ImageData itself. A minimal context tests its pixels in
// Node without requiring WebGL, a browser, or a native canvas dependency.
function canvas() {
  const result = { width: 0, height: 0, lastFrame: null };
  result.getContext = () => ({
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: frame => { result.lastFrame = Uint8ClampedArray.from(frame.data); },
  });
  return result;
}

function plane({ id = 'plane', z = 0, opacity = 1, indices = [0, 1, 2, 0, 2, 3], ...extra } = {}) {
  return anatomicalMesh({ id, positions: [-1, -1, z, 1, -1, z, 1, 1, z, -1, 1, z], indices, color: '#000000', opacity, ...extra });
}

function render(meshes) {
  const surface = canvas(), renderer = new AnatomyCanvasRenderer(surface), group = new THREE.Group(), scene = new THREE.Scene();
  for (const mesh of meshes) group.add(mesh); scene.add(group);
  const camera = new THREE.PerspectiveCamera(50, 1, .001, 100); camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  renderer.setSize(96, 96); renderer.setGroup(group); renderer.render(scene, camera);
  const result = { pixels: surface.lastFrame, background: Uint8ClampedArray.from(renderer.background), triangles: renderer.projectedTriangles };
  renderer.dispose(); disposeAnatomyGroup(group); return result;
}

test('transparent neighboring triangles cover their shared edge once without a bright or dark seam', () => {
  const a = plane({ opacity: .45 }), b = plane({ opacity: .45, indices: [0, 1, 3, 1, 2, 3] });
  // Saturated emissive white gives a constant optical input, independent of
  // interpolated directional lighting. This isolates the coverage rule.
  a.material.emissive.setRGB(1, 1, 1); b.material.emissive.setRGB(1, 1, 1);
  const first = render([a]), second = render([b]);
  assert.equal(first.triangles, 2);
  for (let y = 30; y < 66; y++) for (let x = 30; x < 66; x++) for (let c = 0; c < 3; c++) {
    const index = (y * 96 + x) * 4 + c, expected = first.background[index] + .45 * (255 - first.background[index]);
    assert.ok(Math.abs(first.pixels[index] - expected) <= 1, `shared edge coverage at ${x},${y}`);
    assert.equal(first.pixels[index], second.pixels[index], 'a different internal diagonal must not make a visible seam');
  }
});

test('opaque depth occludes a farther transparent surface independently of mesh order', () => {
  const front = () => { const m = plane(); m.material.emissive.setRGB(1, 0, 0); return m; };
  const back = () => { const m = plane({ z: -.4, opacity: .7 }); m.material.emissive.setRGB(0, 0, 1); return m; };
  const reference = render([front()]), first = render([back(), front()]), second = render([front(), back()]);
  for (let y = 40; y < 56; y++) for (let x = 40; x < 56; x++) {
    const start = (y * 96 + x) * 4;
    assert.deepEqual(first.pixels.slice(start, start + 4), reference.pixels.slice(start, start + 4));
    assert.deepEqual(second.pixels.slice(start, start + 4), reference.pixels.slice(start, start + 4));
  }
});

test('public layer controls hide their anatomical sublayers consistently', () => {
  for (const [control, layers] of Object.entries({ scalae: ['scala'], membranes: ['membrane'], neurons: ['nerve', 'myelin'], hairCells: ['hair-cell', 'support', 'organ'], bone: ['bone'], implant: ['implant'] })) {
    for (const layer of layers) {
      assert.equal(anatomyLayerVisible(layer, { [control]: false }), false);
      assert.equal(anatomyLayerVisible(layer, { [control]: true }), true);
      const group = new THREE.Group(); group.add(plane({ layer }));
      applyAnatomyState(group, { layers: { [control]: false } }); assert.equal(group.children[0].visible, false);
      disposeAnatomyGroup(group);
    }
  }
  assert.equal(anatomyLayerVisible('landmark', { scalae: false }), true);
});

test('selection preserves physical dimensions and source-pad picking identities', () => {
  const group = buildAnatomyGroup({ markers: [
    { id: 'source', position: [-.6, 0, 0], radius: .15, color: '#aaaaaa', contactIndex: 0 },
    { id: 'vendor-pad', position: [.6, 0, 0], radius: .2, color: '#aaaaaa', implantContactIndex: 0 },
  ] });
  const coordinates = group.children.map(mesh => Float32Array.from(mesh.geometry.attributes.position.array));
  const radii = group.children.map(mesh => mesh.geometry.boundingSphere.radius);
  applyAnatomyState(group, { selectedContact: 0, selectedImplantContact: null, layers: {} });
  assert.ok(group.children[0].material.emissive.r > 0); assert.equal(group.children[1].material.emissive.r, 0);
  applyAnatomyState(group, { selectedContact: -1, selectedImplantContact: 0, layers: {} });
  assert.equal(group.children[0].material.emissive.r, 0); assert.ok(group.children[1].material.emissive.r > 0);
  group.children.forEach((mesh, index) => {
    assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]); assert.equal(mesh.geometry.boundingSphere.radius, radii[index]);
    assert.deepEqual(mesh.geometry.attributes.position.array, coordinates[index]);
  });
  const ray = new THREE.Raycaster(new THREE.Vector3(.6, 0, 2), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObjects(group.children, false)[0]; assert.ok(hit, 'actual pad triangles must be pickable');
  assert.equal(hit.object.userData.implantContactIndex, 0); assert.equal(hit.object.userData.contactIndex, undefined);
  disposeAnatomyGroup(group);
});

test('recorded replay uses actual frame timestamps and clamps without inventing events', () => {
  const fiber = { response: { compartmentCount: 2, replayTimesMs: new Float64Array([0, .1, .5]), replayMv: new Float32Array([-65, -64, -20, -10, 20, 30]) } };
  assert.equal(sampledMembraneValue(fiber, 1, .22), -10); // .1 ms is closer than .5 ms.
  assert.equal(sampledMembraneValue(fiber, 1, .34), 30);
  assert.equal(sampledMembraneValue(fiber, 0, -2), -65); assert.equal(sampledMembraneValue(fiber, 0, 99), 20);
  assert.equal(sampledMembraneValue(null, 0, 10), -65); assert.equal(sampledMembraneValue(fiber, 8, .1), -65);
});

test('only explicitly mapped modeled compartments receive voltage colors', () => {
  const group = buildAnatomyGroup({ paths: [
    { id: 'modeled', points: [[0, 0, 0], [0, 1, 0]], radius: .03, fiberIndex: 0, compartmentIndices: [0, 1], color: '#abcabc' },
    { id: 'type-II-context', points: [[1, 0, 0], [1, 1, 0]], radius: .03, fiberIndex: 0, color: '#8d9db4' },
  ] });
  const staticColor = group.children[1].material.color.clone();
  const fiber = { response: { compartmentCount: 2, replayTimesMs: [0, 1], replayMv: [-65, -65, 30, 30] } };
  applyAnatomyState(group, { fibers: [fiber], timeMs: 0 }); const resting = Float32Array.from(group.children[0].geometry.attributes.color.array);
  applyAnatomyState(group, { fibers: [fiber], timeMs: 1 });
  assert.notDeepEqual(group.children[0].geometry.attributes.color.array, resting);
  assert.equal(group.children[1].geometry.attributes.color, undefined); assert.ok(group.children[1].material.color.equals(staticColor));
  disposeAnatomyGroup(group);
});

test('the tube fallback has a real finite-radius surface and triangle hit', () => {
  const group = buildAnatomyGroup({ paths: [{ id: 'nerve', points: [[0, 0, 0], [0, 1, 0], [0, 2, 0]], radii: [.1, .2, .3], radialSegments: 8, fiberIndex: 7, color: '#73989e' }] });
  const mesh = group.children[0], p = mesh.geometry.attributes.position;
  for (let ring = 0; ring < 3; ring++) for (let point = 0; point < 8; point++) assert.ok(Math.abs(Math.hypot(p.getX(ring * 8 + point), p.getZ(ring * 8 + point)) - [.1, .2, .3][ring]) < 1e-7);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1, 2), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObject(mesh)[0]; assert.ok(hit); assert.equal(hit.object.userData.fiberIndex, 7); assert.ok(hit.distance > 1.79 && hit.distance < 1.82);
  disposeAnatomyGroup(group);
});

test('macro and cellular meshes fit desktop and mobile views without clipping', () => {
  const atlas = JSON.parse(readFileSync(new URL('../public/assets/cochlear/openear-zeta-atlas.json', import.meta.url), 'utf8'));
  const geometry = createGeometry(DEFAULT_SETTINGS), model = createNerveModel();
  for (const mode of ['cutaway', 'organ']) {
    const data = createAnatomyScene(geometry, model, { mode, selectedFiber: 16, atlas }), group = buildAnatomyGroup(data);
    const cloud = Float32Array.from(group.children.flatMap(mesh => Array.from(mesh.geometry.attributes.position.array))), box = new THREE.Box3().setFromObject(group);
    for (const aspect of [1100 / 650, 390 / 490]) {
      const preferred = { ...data.camera, up: data.up }, camera = new THREE.PerspectiveCamera(preferred.fov, aspect, .00001, 1000);
      camera.position.fromArray(fitAnatomyCamera(box, preferred, aspect, cloud)); camera.up.fromArray(data.up); camera.lookAt(new THREE.Vector3().fromArray(preferred.target)); camera.updateMatrixWorld();
      const point = new THREE.Vector3();
      for (let i = 0; i < cloud.length; i += 3) {
        point.fromArray(cloud, i).project(camera);
        assert.ok(Math.abs(point.x) <= .86001 && Math.abs(point.y) <= .76001 && point.z > -1 && point.z < 1, `${mode} at aspect ${aspect}: ${point.toArray()}`);
      }
    }
    disposeAnatomyGroup(group);
  }
});
