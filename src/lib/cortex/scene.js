import * as THREE from "three";
import {
  DEFAULT_ELECTRICAL,
  appliedSlices,
  electricalScales,
} from "./electrical.js";
export { appliedTransferMvPerUa } from "./electrical.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { disposeDeviceMesh } from "../devices/geometry.js";
import { buildCortexImplantMesh } from "./implant-mesh.js";

const mm = (p) => p.map((x) => x / 1000);
function morphologyGeometry(node) {
  const path = node.pathUm.map((p) => new THREE.Vector3(...mm(p))),
    vertices = [],
    indices = [],
    radial = 6;
  for (let i = 0; i < path.length; i++) {
    const tangent = path[Math.min(i + 1, path.length - 1)]
      .clone()
      .sub(path[Math.max(0, i - 1)])
      .normalize();
    const helper =
      Math.abs(tangent.z) < 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(tangent, helper).normalize(),
      v = new THREE.Vector3().crossVectors(tangent, u).normalize();
    const radius = node.pathDiameterUm[i] / 2000;
    for (let j = 0; j < radial; j++) {
      const angle = (j * 2 * Math.PI) / radial,
        p = path[i]
          .clone()
          .addScaledVector(u, Math.cos(angle) * radius)
          .addScaledVector(v, Math.sin(angle) * radius);
      vertices.push(p.x, p.y, p.z);
    }
    if (i)
      for (let j = 0; j < radial; j++) {
        const a = (i - 1) * radial + j,
          b = (i - 1) * radial + ((j + 1) % radial),
          c = i * radial + j,
          d = i * radial + ((j + 1) % radial);
        indices.push(a, c, b, b, c, d);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
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
    { id: "CSF region", topUm: -250, bottomUm: 0, color: "#97bcc8" },
    ...world.layers,
    {
      id: "White matter",
      topUm: thickness * 1000,
      bottomUm: (thickness + 1) * 1000,
      color: "#d3c9b3",
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
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(width, yWidth, depth),
      material,
    );
    box.position.set(0, yCenter, (layer.topUm + layer.bottomUm) / 2000);
    box.name = `layer-${layer.id}`;
    tissue.add(box);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(box.geometry),
      new THREE.LineBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.3,
      }),
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
    new THREE.LineBasicMaterial({ color: "#d0e1d8" }),
  );
  pial.name = "pia-z-zero";
  root.add(pial);
  const device = buildCortexImplantMesh(world.model);
  device.group.position.fromArray(mm(world.config.implant.translationUm));
  device.group.rotation.set(
    ...world.config.implant.rotationDeg.map((x) => (x * Math.PI) / 180),
    "ZYX",
  );
  root.add(device.group);
  const nodeMeshes = [];
  for (const [i, node] of world.neuron.nodes.entries()) {
    if (node.kind === "junction") {
      nodeMeshes.push(null);
      continue;
    }
    const material = new THREE.MeshBasicMaterial({ color: "#79c9c1" });
    let geometry;
    if (node.kind === "soma")
      geometry = new THREE.SphereGeometry(node.diameterUm / 2000, 24, 12);
    else if (node.pathUm?.length > 1) geometry = morphologyGeometry(node);
    else
      geometry = new THREE.CylinderGeometry(
        node.diameterUm / 2000,
        node.diameterUm / 2000,
        node.lengthUm / 1000,
        6,
      );
    const mesh = new THREE.Mesh(geometry, material);
    if (!node.pathUm?.length || node.kind === "soma")
      mesh.position.fromArray(mm(node.centerUm));
    mesh.userData.nodeIndex = i;
    if (node.kind !== "soma" && !node.pathUm?.length)
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(
          ...node.endUm.map((x, j) => x - node.startUm[j]),
        ).normalize(),
      );
    neurons.add(mesh);
    nodeMeshes.push(mesh);
    // A centerline overlay keeps micron-scale branches discoverable; no geometry is enlarged.
    if (node.kind !== "soma") {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          ...(node.pathUm?.length
            ? node.pathUm.map((p) => new THREE.Vector3(...mm(p)))
            : [
                new THREE.Vector3(...mm(node.startUm)),
                new THREE.Vector3(...mm(node.endUm)),
              ]),
        ]),
        new THREE.LineBasicMaterial({
          color: "#79c9c1",
          transparent: true,
          opacity: 0.7,
        }),
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
      new THREE.LineBasicMaterial({
        color: index === 0 ? "#f0ba71" : "#89b6ee",
      }),
    );
    line.position.fromArray(mm(site.positionUm));
    line.name = `selection-${id}`;
    markers.add(line);
  }
  root.add(markers);
  const selectedMarker = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.012, 0, 0),
      new THREE.Vector3(0.012, 0, 0),
      new THREE.Vector3(0, -0.012, 0),
      new THREE.Vector3(0, 0.012, 0),
      new THREE.Vector3(0, 0, -0.012),
      new THREE.Vector3(0, 0, 0.012),
    ]),
    new THREE.LineBasicMaterial({ color: "#ffffff", depthTest: false }),
  );
  selectedMarker.renderOrder = 10;
  root.add(selectedMarker);
  const electrical = buildElectricalOverlay(world, options);
  root.add(electrical.group);
  root.updateMatrixWorld(true);
  return {
    root,
    tissue,
    neurons,
    device,
    nodeMeshes,
    markers,
    selectedMarker,
    electrical,
  };
}

const neutralColor = new THREE.Color("#b6c4cc");
// Reuse the exact tapered source geometries for every rigidly translated cell.
// Instancing changes draw cost, not cable discretization or morphology scale.
export function updatePopulationOverlay(objects, population) {
  const cells = population?.cells?.slice(1) ?? [];
  const key = JSON.stringify(cells.map(c => [c.offsetUm, c.unsupportedReason]));
  if (objects.populationKey !== key) {
    for (const mesh of objects.populationMeshes ?? []) {
      objects.neurons.remove(mesh);
      mesh.dispose(); // Borrowed geometry belongs to the original target mesh.
    }
    objects.populationMaterial?.dispose();
    objects.populationMeshes = [];
    objects.populationKey = key;
    objects.populationResponses = undefined;
    if (cells.length) {
      objects.populationMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const translation = new THREE.Matrix4();
      for (const source of objects.nodeMeshes.filter(Boolean)) {
        source.updateMatrix();
        const mesh = new THREE.InstancedMesh(source.geometry, objects.populationMaterial, cells.length);
        mesh.name = 'sourced-population-morphology';
        for (let i = 0; i < cells.length; i++) {
          translation.makeTranslation(...mm(cells[i].offsetUm));
          mesh.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(translation, source.matrix));
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        objects.neurons.add(mesh);
        objects.populationMeshes.push(mesh);
      }
    }
  }
  const responses = population?.responses ?? null;
  if (objects.populationResponses === responses) return;
  objects.populationResponses = responses;
  for (const mesh of objects.populationMeshes ?? []) {
    for (let i = 0; i < cells.length; i++) {
      const response = responses?.[i + 1]?.response;
      const excluded = cells[i].unsupportedReason || responses?.[i + 1]?.status === 'excluded';
      const color = excluded ? '#b58b31' : !response ? '#79c9c1' : response.soma.thresholdEventCount > 0 ? '#f2a05e'
        : response.membraneThresholdCrossings.compartmentCount > 0 ? '#b28bdb' : '#658dff';
      mesh.setColorAt(i, new THREE.Color(color));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}
const negativeColor = new THREE.Color("#438cff");
const positiveColor = new THREE.Color("#ff684c");
function signedColor(value, limit, target = new THREE.Color()) {
  return target
    .copy(neutralColor)
    .lerp(
      value < 0 ? negativeColor : positiveColor,
      Math.min(1, Math.abs(value) / limit),
    );
}
function setSlices(overlay, options) {
  if (overlay.world.config.protocol.mode !== "extracellular-stimulation")
    return;
  const data = appliedSlices(overlay.world, options);
  if (data === overlay.sliceData) return;
  for (const { mesh } of overlay.slices) {
    overlay.group.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  overlay.sliceData = data;
  overlay.slices = data.slices.map((slice) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(slice.points.flatMap(mm), 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Float32Array(slice.points.length * 3),
        3,
      ),
    );
    geometry.setIndex(slice.indices);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: options.fieldOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.name = "applied-potential-slice";
    mesh.renderOrder = 1;
    overlay.group.add(mesh);
    return { mesh, ...slice };
  });
}
function buildElectricalOverlay(world, options = {}) {
  const group = new THREE.Group(),
    tips = [];
  const addTip = (id, role, index) => {
    const site = world.contacts.find((c) => c.id === id);
    const mesh = new THREE.Mesh(
      role === "stim"
        ? new THREE.SphereGeometry(0.028, 12, 8)
        : new THREE.OctahedronGeometry(0.024),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    mesh.position.fromArray(mm(site.positionUm));
    mesh.name = `${role}-${id}`;
    mesh.renderOrder = 5;
    group.add(mesh);
    tips.push({ mesh, role, index, id, label: "" });
  };
  world.config.recording.contactIds.forEach((id, i) => addTip(id, "record", i));
  if (world.config.protocol.mode === "extracellular-stimulation")
    world.config.protocol.sourceContactIds.forEach((id, i) =>
      addTip(id, "stim", i),
    );
  const overlay = { group, tips, slices: [], world };
  setSlices(overlay, { ...DEFAULT_ELECTRICAL, ...options });
  group.visible = false;
  return overlay;
}
export function updateElectricalOverlay(overlay, result, frame, options = {}) {
  const o = { ...DEFAULT_ELECTRICAL, ...options };
  overlay.group.visible = !!result && o.electrical;
  if (!result || !o.electrical) return;
  setSlices(overlay, o);
  const stimulation =
    result.config.protocol.mode === "extracellular-stimulation";
  const current = stimulation ? result.drive[frame] : 0;
  const component = o.component ?? "neural";
  const signals = result[`${component}Uv`];
  const scales = electricalScales(overlay.world, result, o);
  for (const tip of overlay.tips) {
    tip.mesh.visible = o.tips;
    const value =
      tip.role === "stim"
        ? current * (tip.index === 0 ? 1 : -1)
        : signals[tip.index][frame];
    const limit =
      tip.role === "stim" ? scales.stimulationUa : scales.recordingUv;
    signedColor(value, limit, tip.mesh.material.color);
    const number =
      Math.abs(value) < 0.001 && value !== 0
        ? value.toExponential(2)
        : Number(value.toPrecision(4)).toString();
    tip.label = `${tip.role === "stim" ? "Stim" : "Rec"} ${tip.index ? "B" : "A"} · ${tip.id}\n${number} ${tip.role === "stim" ? "µA · " + (value < 0 ? "sink / cathodic" : value > 0 ? "source / anodic" : "off") : "µV · " + component}`;
    tip.showLabel = o.labels && o.tips;
  }
  const scratch = new THREE.Color();
  for (const slice of overlay.slices) {
    // Keep zero-potential slices visible and neutral: a rest interval is an interpretable state.
    slice.mesh.visible = o.tissueField;
    slice.mesh.material.opacity = o.fieldOpacity;
    const colorKey = `${current}:${scales.fieldMv}`;
    if (slice.colorKey === colorKey) continue;
    slice.colorKey = colorKey;
    const colors = slice.mesh.geometry.attributes.color;
    slice.transfers.forEach((transfer, i) => {
      signedColor((transfer ?? 0) * current, scales.fieldMv, scratch);
      colors.setXYZ(i, scratch.r, scratch.g, scratch.b);
    });
    colors.needsUpdate = true;
  }
}

export async function createCortexView(host, onStatus, onScale, onPick) {
  let renderer,
    software = false;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    const { SVGRenderer } = await import(
      "three/addons/renderers/SVGRenderer.js"
    );
    renderer = new SVGRenderer();
    renderer.overdraw = 0;
    software = true;
  }
  renderer.setPixelRatio?.(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor("#111f26");
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "Physically scaled cortical patch and selected implant. Use view buttons, then select a compartment in the inspector.",
  );
  host.append(renderer.domElement);
  const labelLayer = document.createElement("div");
  labelLayer.className = "cx-contact-labels";
  labelLayer.setAttribute("aria-hidden", "true"); // Equivalent readings remain in the accessible table.
  host.append(labelLayer);
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
    currentView = "cell";
  let disposed = false;
  function render() {
    if (disposed) return;
    renderer.render(scene, camera);
    for (const tip of objects?.electrical.tips ?? []) {
      if (!tip.element) continue;
      const p = tip.mesh.position.clone().project(camera);
      const visible =
        objects.electrical.group.visible &&
        tip.showLabel &&
        Math.abs(p.z) <= 1 &&
        Math.abs(p.x) <= 1 &&
        Math.abs(p.y) <= 1;
      tip.element.hidden = !visible;
      if (!visible) continue;
      tip.element.textContent = tip.label;
      tip.element.style.left = `${Math.max(5, Math.min(host.clientWidth - 150, ((p.x + 1) * host.clientWidth) / 2 + 8))}px`;
      tip.element.style.top = `${Math.max(45, Math.min(host.clientHeight - 45, ((1 - p.y) * host.clientHeight) / 2 + (tip.index ? 8 : -36)))}px`;
    }
    const center = controls.target,
      right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const p = center.clone().project(camera),
      q = center.clone().add(right).project(camera);
    const pixelsPerMm = (Math.abs(q.x - p.x) * host.clientWidth) / 2;
    const lengthMm =
      [1, 0.1, 0.01, 0.001].find((length) => pixelsPerMm * length <= 140) ??
      0.001;
    onScale({
      pixels: pixelsPerMm * lengthMm,
      label: lengthMm === 1 ? "1 mm" : `${lengthMm * 1000} µm`,
    });
  }
  function bindControls() {
    controls.enableDamping = false;
    controls.minDistance = 0.08;
    controls.maxDistance = 50;
    controls.addEventListener("change", render);
  }
  bindControls();
  function fit(view = currentView) {
    if (!world) return;
    currentView = view;
    const detail = view === "cell",
      target = detail
        ? new THREE.Vector3(...mm(world.config.neuron.somaUm)).add(
            new THREE.Vector3(0, 0, -0.18),
          )
        : new THREE.Vector3(0, 0, 1.8);
    extent = detail ? 1.5 : 8;
    if (detail && world.neuron.specimenId) {
      const box = new THREE.Box3().setFromPoints(
        world.neuron.nodes
          .filter((n) => n.kind !== "junction")
          .flatMap((n) => [
            new THREE.Vector3(...mm(n.startUm)),
            new THREE.Vector3(...mm(n.endUm)),
          ]),
      );
      box.getCenter(target);
      const size = box.getSize(new THREE.Vector3());
      extent = Math.max(size.x, size.y, size.z) * 1.2;
    }
    if (view === "population") {
      const box = new THREE.Box3().setFromObject(objects.neurons);
      box.getCenter(target);
      const size = box.getSize(new THREE.Vector3());
      extent = Math.max(size.x, size.y, size.z) * 1.25;
    } else if (view === "implant") {
      const box = new THREE.Box3().setFromObject(objects.device.group);
      box.getCenter(target);
      const size = box.getSize(new THREE.Vector3());
      extent = Math.max(size.x, size.y, size.z) * 1.25;
    } else if (view === "contacts") {
      const points = world.config.recording.contactIds.map(id =>
        new THREE.Vector3(...mm(world.contacts.find(s => s.id === id).positionUm)));
      target.copy(points[0]).add(points[1]).multiplyScalar(0.5);
      extent = Math.max(0.18, points[0].distanceTo(points[1]) * 2.5);
    }
    const direction =
      view === "top"
        ? new THREE.Vector3(0, -0.001, -1)
        : view === "side"
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
    const hit = raycaster.intersectObjects(
      objects.nodeMeshes.filter(Boolean),
    )[0];
    if (hit) onPick(hit.object.userData.nodeIndex);
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pick);
  onStatus(software ? "Software 3D · CPU solver" : "WebGL 3D · CPU solver");
  return {
    setWorld(next, options) {
      if (world === next && objects) {
        const nextWidth = next.config.anatomy.widthUm / 1000,
          yWidth = options.section ? nextWidth / 2 : nextWidth;
        for (const object of objects.tissue.children) {
          object.material.opacity = object.isMesh ? options.opacity : 0.3;
          object.scale.y =
            yWidth /
            (world.config.anatomy.widthUm / 1000 / (objects.cutaway ? 2 : 1));
          object.position.y = options.section ? nextWidth / 4 : 0;
        }
        render();
        return;
      }
      const first = !world,
        modelChanged = world?.neuron.id !== next.neuron.id,
        implantChanged = world?.config.implant.deviceId !== next.config.implant.deviceId,
        pairChanged = world?.config.recording.contactIds.join() !== next.config.recording.contactIds.join();
      world = next;
      if (objects) {
        scene.remove(objects.root);
        disposeDeviceMesh(objects.root);
      }
      objects = buildWorldGroup(next, options);
      labelLayer.replaceChildren();
      for (const tip of objects.electrical.tips) {
        tip.element = document.createElement("span");
        tip.element.className = "cx-contact-label";
        tip.element.hidden = true;
        labelLayer.append(tip.element);
      }
      objects.cutaway = options.section;
      scene.add(objects.root);
      if (first || modelChanged || (implantChanged && ["contacts", "implant"].includes(currentView)) || (pairChanged && currentView === "contacts")) fit();
      else render();
    },
    setFrame(result, frame, selected, options = {}) {
      if (!objects || !world) return;
      updatePopulationOverlay(objects, options.population);
      updateElectricalOverlay(objects.electrical, result, frame, options);
      for (const [i, mesh] of objects.nodeMeshes.entries()) {
        if (!mesh) continue;
        const active = !!world.neuron.specimenId;
        const deviation =
          result && !active
            ? result.membraneMv[frame * result.diagnostics.compartments + i] -
              result.config.membrane.restMv
            : 0;
        const color = active
          ? new THREE.Color("#658dff").lerp(
              new THREE.Color("#ff9c56"),
              Math.max(
                0,
                Math.min(
                  1,
                  ((result?.membraneMv[
                    frame * result.diagnostics.compartments + i
                  ] ?? -90) +
                    100) /
                    140,
                ),
              ),
            )
          : new THREE.Color("#79c9c1").lerp(
              new THREE.Color(deviation >= 0 ? "#ff9c56" : "#658dff"),
              Math.min(1, Math.abs(deviation) / 10),
            );
        if (options.neuronColor === false || !result) color.set("#79c9c1");
        mesh.material.color.copy(color);
        mesh.userData.centerline?.material.color.copy(color);
      }
      objects.selectedMarker.position.fromArray(
        mm(
          world.neuron.nodes[selected]?.centerUm ?? world.config.neuron.somaUm,
        ),
      );
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
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pick);
      if (objects) disposeDeviceMesh(objects.root);
      renderer.dispose?.();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}
