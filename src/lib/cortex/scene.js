import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildDeviceMesh, disposeDeviceMesh } from '../devices/geometry.js';

const mm = (p) => p.map((x) => x / 1000);
export function buildWorldGroup(world, options = {}) {
  const root = new THREE.Group(),
    tissue = new THREE.Group(),
    neurons = new THREE.Group();
  root.add(tissue, neurons);
  const width = world.config.anatomy.widthUm / 1000,
    thickness = world.config.anatomy.thicknessUm / 1000;
  const section = options.section ?? true,
    yWidth = section ? width / 2 : width,
    yCenter = section ? width / 4 : 0;
  const bands = [
    { id: 'CSF region', topUm: -250, bottomUm: 0, color: '#97bcc8' },
    ...world.layers,
    {
      id: 'White matter',
      topUm: thickness * 1000,
      bottomUm: (thickness + 1) * 1000,
      color: '#d3c9b3',
    },
  ];
  for (const layer of bands) {
    const depth = (layer.bottomUm - layer.topUm) / 1000;
    const material = new THREE.MeshBasicMaterial({
      color: layer.color,
      transparent: true,
      opacity: options.opacity ?? 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, yWidth, depth), material);
    box.position.set(0, yCenter, (layer.topUm + layer.bottomUm) / 2000);
    box.name = `layer-${layer.id}`;
    tissue.add(box);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(box.geometry),
      new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.3 }),
    );
    edge.position.copy(box.position);
    tissue.add(edge);
  }
  const pial = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2, -width / 2, 0),
      new THREE.Vector3(width / 2, -width / 2, 0),
      new THREE.Vector3(width / 2, width / 2, 0),
      new THREE.Vector3(-width / 2, width / 2, 0),
    ]),
    new THREE.LineBasicMaterial({ color: '#d0e1d8' }),
  );
  pial.name = 'pia-z-zero';
  root.add(pial);
  const device = buildDeviceMesh(world.model);
  device.group.position.fromArray(mm(world.config.implant.translationUm));
  device.group.rotation.set(
    ...world.config.implant.rotationDeg.map((x) => (x * Math.PI) / 180),
    'ZYX',
  );
  root.add(device.group);
  const nodeMeshes = [];
  for (const [i, node] of world.neuron.nodes.entries()) {
    const material = new THREE.MeshBasicMaterial({ color: '#79c9c1' });
    let geometry;
    if (node.kind === 'soma') geometry = new THREE.SphereGeometry(node.diameterUm / 2000, 24, 12);
    else
      geometry = new THREE.CylinderGeometry(
        node.diameterUm / 2000,
        node.diameterUm / 2000,
        node.lengthUm / 1000,
        6,
      );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(mm(node.centerUm));
    mesh.userData.nodeIndex = i;
    if (node.kind !== 'soma')
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(...node.endUm.map((x, j) => x - node.startUm[j])).normalize(),
      );
    neurons.add(mesh);
    nodeMeshes.push(mesh);
    // A centerline overlay keeps micron-scale branches discoverable; no geometry is enlarged.
    if (node.kind !== 'soma') {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...mm(node.startUm)),
          new THREE.Vector3(...mm(node.endUm)),
        ]),
        new THREE.LineBasicMaterial({ color: '#79c9c1', transparent: true, opacity: 0.7 }),
      );
      line.userData.nodeIndex = i;
      neurons.add(line);
      mesh.userData.centerline = line;
    }
  }
  const markers = new THREE.Group();
  for (const [index, id] of world.config.recording.contactIds.entries()) {
    const site = world.contacts.find((c) => c.id === id),
      r = 0.04;
    const line = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-r, 0, 0),
        new THREE.Vector3(r, 0, 0),
        new THREE.Vector3(0, -r, 0),
        new THREE.Vector3(0, r, 0),
      ]),
      new THREE.LineBasicMaterial({ color: index === 0 ? '#f0ba71' : '#89b6ee' }),
    );
    line.position.fromArray(mm(site.positionUm));
    line.name = `selection-${id}`;
    markers.add(line);
  }
  root.add(markers);
  root.updateMatrixWorld(true);
  return { root, tissue, neurons, device, nodeMeshes, markers };
}

export async function createCortexView(host, onStatus, onScale, onPick) {
  let renderer,
    software = false;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    const { SVGRenderer } = await import('three/addons/renderers/SVGRenderer.js');
    renderer = new SVGRenderer();
    renderer.overdraw = 0;
    software = true;
  }
  renderer.setPixelRatio?.(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor('#111f26');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'Physically scaled cortical patch and Utah array. Use view buttons, then select a compartment in the inspector.',
  );
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xaaaaaa, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(2, -5, -5);
  scene.add(light);
  const perspective = new THREE.PerspectiveCamera(38, 1, 0.0001, 100),
    orthographic = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.0001, 100);
  perspective.up.set(0, 0, -1);
  orthographic.up.set(0, 0, -1);
  let camera = perspective,
    controls = new OrbitControls(camera, renderer.domElement),
    objects,
    world,
    extent = 6,
    currentView = 'cell';
  let disposed = false;
  function render() {
    if (disposed) return;
    renderer.render(scene, camera);
    const center = controls.target,
      right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const p = center.clone().project(camera),
      q = center.clone().add(right).project(camera);
    const pixelsPerMm = (Math.abs(q.x - p.x) * host.clientWidth) / 2;
    const lengthMm = [1, 0.1, 0.01, 0.001].find((length) => pixelsPerMm * length <= 140) ?? 0.001;
    onScale({
      pixels: pixelsPerMm * lengthMm,
      label: lengthMm === 1 ? '1 mm' : `${lengthMm * 1000} µm`,
    });
  }
  function bindControls() {
    controls.enableDamping = false;
    controls.minDistance = 0.08;
    controls.maxDistance = 50;
    controls.addEventListener('change', render);
  }
  bindControls();
  function fit(view = currentView) {
    if (!world) return;
    currentView = view;
    const detail = view === 'cell',
      target = detail
        ? new THREE.Vector3(...mm(world.config.neuron.somaUm)).add(new THREE.Vector3(0, 0, -0.18))
        : new THREE.Vector3(0, 0, 1.8);
    extent = detail ? 1.5 : 8;
    const direction =
      view === 'top'
        ? new THREE.Vector3(0, -0.001, -1)
        : view === 'side'
          ? new THREE.Vector3(0, -1, 0)
          : new THREE.Vector3(0.65, -1, -0.35).normalize();
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction, extent * 1.5);
    camera.zoom = 1;
    camera.lookAt(target);
    resize();
    controls.update();
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth),
      height = Math.max(1, host.clientHeight),
      aspect = width / height;
    renderer.setSize(width, height);
    if (camera.isPerspectiveCamera) camera.aspect = aspect;
    else {
      camera.left = (-extent * aspect) / 2;
      camera.right = (extent * aspect) / 2;
      camera.top = extent / 2;
      camera.bottom = -extent / 2;
    }
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const raycaster = new THREE.Raycaster();
  const pointerDown = (e) => {
    renderer.domElement.dataset.pointerX = String(e.clientX);
    renderer.domElement.dataset.pointerY = String(e.clientY);
  };
  const pick = (e) => {
    if (
      !objects ||
      Math.hypot(
        e.clientX - Number(renderer.domElement.dataset.pointerX),
        e.clientY - Number(renderer.domElement.dataset.pointerY),
      ) > 4
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(objects.nodeMeshes)[0];
    if (hit) onPick(hit.object.userData.nodeIndex);
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pick);
  onStatus(software ? 'Software 3D · CPU solver' : 'WebGL 3D · CPU solver');
  return {
    setWorld(next, options) {
      const first = !world;
      world = next;
      if (objects) {
        scene.remove(objects.root);
        disposeDeviceMesh(objects.root);
      }
      objects = buildWorldGroup(next, options);
      scene.add(objects.root);
      if (first) fit();
      else render();
    },
    setFrame(result, frame, selected) {
      if (!objects || !world) return;
      for (const [i, mesh] of objects.nodeMeshes.entries()) {
        const deviation = result
          ? result.membraneMv[frame * result.diagnostics.compartments + i] -
            result.config.membrane.restMv
          : 0;
        const color = new THREE.Color('#79c9c1').lerp(
          new THREE.Color(deviation >= 0 ? '#ff9c56' : '#658dff'),
          Math.min(1, Math.abs(deviation) / 10),
        );
        if (i === selected) color.set('#ffffff');
        mesh.material.color.copy(color);
        mesh.userData.centerline?.material.color.copy(color);
      }
      render();
    },
    setView: fit,
    setProjection(isOrthographic) {
      const old = camera;
      camera = isOrthographic ? orthographic : perspective;
      camera.position.copy(old.position);
      camera.quaternion.copy(old.quaternion);
      const target = controls.target.clone();
      controls.dispose();
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target);
      bindControls();
      fit();
    },
    zoom(factor) {
      if (camera.isOrthographicCamera) camera.zoom *= factor;
      else
        camera.position
          .sub(controls.target)
          .multiplyScalar(1 / factor)
          .add(controls.target);
      camera.updateProjectionMatrix();
      controls.update();
      render();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pick);
      if (objects) disposeDeviceMesh(objects.root);
      renderer.dispose?.();
      renderer.domElement.remove();
    },
  };
}
