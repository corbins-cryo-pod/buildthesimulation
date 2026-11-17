import { overlaySampler } from "./overlay-sampler.mjs";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { retinalSurface } from "./coordinates.mjs";
import {
  layersAt,
  morphology,
  random,
  tissueAt,
  population,
} from "./anatomy.mjs";
import {
  buildImplantGeometry,
  carrierSection,
  localClearance,
  microscopeClipPlanes,
} from "./implant-geometry.mjs";
import { sectionLabels } from "./layer-labels.js";
import {
  cutBlock,
  FUNDUS,
  PATCH,
  pigmentTexture,
  posteriorBowl,
  vesselPaths,
} from "./specimen.js";
import { createFallback } from "./fallback.js";

const point = (x, y, depth = 0) =>
  new THREE.Vector3(x / 1000, y / 1000, (retinalSurface(x, y) - depth) / 1000);
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.08,
    ...extra,
  });
function clear(group) {
  const gs = new Set(),
    ms = new Set(),
    ts = new Set();
  group.traverse((o) => {
    for (const m of o.userData.contactMaterials ?? []) ms.add(m);
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry) gs.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        ms.add(m);
        if (m.map) ts.add(m.map);
      }
  });
  group.clear();
  gs.forEach((g) => g.dispose());
  ms.forEach((m) => m.dispose());
  ts.forEach((t) => t.dispose());
}
function segments(group, list, color, radius = 1) {
  if (!list.length) return;
  const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 7, 1),
      mat(color),
      list.length,
    ),
    dummy = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0);
  list.forEach(([a, b, ra = radius, rb = ra], i) => {
    const p = point(...a),
      q = point(...b),
      d = q.clone().sub(p);
    dummy.position.copy(p).add(q).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(up, d.clone().normalize());
    dummy.scale.set((ra + rb) / 2000, d.length(), (ra + rb) / 2000);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  group.add(mesh);
  return mesh;
}
function bodies(group, list, color) {
  if (!list.length) return;
  const m = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 12, 9),
      mat(color),
      list.length,
    ),
    d = new THREE.Object3D();
  list.forEach((p, i) => {
    d.position.copy(point(p.x, p.y, p.z));
    d.rotation.set(0.2 * Math.sin(i), 0.15 * Math.cos(i), i * 1.71);
    d.scale.set(
      p.r / 1000,
      (p.r / 1000) * (p.aspect ?? 0.85),
      (p.r / 1000) * (p.tall ?? 1.15),
    );
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (p.color) m.setColorAt(i, new THREE.Color(p.color));
  });
  group.add(m);
  return m;
}
function label(text, scale = 0.045, color = "#e8dec6") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "30px Arial";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 8, 48);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }),
  );
  s.scale.set(scale * 8, scale, 1);
  s.center.set(0, 0.5);
  s.renderOrder = 30;
  return s;
}
function sheet(
  group,
  {
    cx = 0,
    cy = 0,
    width = 14000,
    height = 11000,
    depth = 0,
    color = "#805c4e",
    opacity = 1,
    ellipse = false,
    nx = 48,
    ny = 36,
  },
) {
  const verts = [],
    indices = [],
    uv = [];
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const x = cx + (i / nx - 0.5) * width,
        y = cy + (j / ny - 0.5) * height,
        p = point(x, y, typeof depth === "function" ? depth(x, y) : depth);
      verts.push(...p.toArray());
      uv.push(i / nx, j / ny);
    }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (
        ellipse &&
        (((i + 0.5) / nx) * 2 - 1) ** 2 + (((j + 0.5) / ny) * 2 - 1) ** 2 > 1
      )
        continue;
      const a = j * (nx + 1) + i;
      indices.push(a, a + 1, a + nx + 2, a, a + nx + 2, a + nx + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(
    g,
    mat(color, {
      side: THREE.DoubleSide,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
    }),
  );
  group.add(mesh);
  return mesh;
}
export function createScene(
  host,
  { onSelect = () => {}, onPlace = () => {}, onBackend = () => {} } = {},
) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    onBackend("section");
    return createFallback(host, { onSelect });
  }
  onBackend("webgl");
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setClearColor("#172225");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.className = "rtl-webgl";
  renderer.domElement.setAttribute(
    "aria-label",
    "Registered 3D retina. Drag to orbit, scroll to zoom. Shift-drag moves the implant. Placement fields provide keyboard controls.",
  );
  renderer.domElement.setAttribute("role", "img");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const perspective = new THREE.PerspectiveCamera(34, 1, 0.005, 100);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.005, 100);
  ortho.up.set(0, 0, 1);
  let camera = perspective;
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 0.14;
  controls.maxDistance = 45;
  scene.add(new THREE.HemisphereLight("#fff2df", "#445456", 1.55));
  const key = new THREE.DirectionalLight("#ffead4", 2.2);
  key.position.set(-2, -4, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#c3e2df", 1.15);
  rim.position.set(4, 3, 2);
  scene.add(rim);
  const groups = {};
  for (const k of [
    "retina",
    "vessels",
    "fibers",
    "photoreceptors",
    "interneurons",
    "ganglion",
    "device",
    "overlay",
    "labels",
    "caliper",
    "glia",
  ]) {
    groups[k] = new THREE.Group();
    scene.add(groups[k]);
  }
  let latest = {},
    lastGeometry = "",
    lastOverlay = "",
    nearestSite = null,
    lastView = "",
    pickable = [],
    axonData = null,
    disposed = false,
    drag = null,
    tap = null;
  const ray = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    intersection = new THREE.Vector3();
  const annotation = sectionLabels(host);
  let anchors = null;
  const render = () => {
    if (!disposed) {
      renderer.render(scene, camera);
      annotation.update(
        latest.view === "section" &&
          latest.layers?.labels !== false &&
          latest.layers?.retina !== false
          ? anchors
          : null,
        camera,
      );
    }
  };
  function center() {
    const cell =
      latest.result?.neural.cells[latest.config.neural.selectedIndex] ??
      population(latest.config)[latest.config.neural.selectedIndex];
    return { x: cell.xUm, y: cell.yUm, cell };
  }
  function projection() {
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    perspective.aspect = aspect;
    const gap =
      latest.config?.modality === "electrical" ||
      latest.config?.modality === "hybrid"
        ? latest.config.electrical.gapUm / 1000
        : 0;
    const height = Math.max(0.58 + gap, 1.22 / Math.max(0.35, aspect));
    ortho.top = height / 2;
    ortho.bottom = -height / 2;
    ortho.right = ortho.top * aspect;
    ortho.left = -ortho.right;
    camera.updateProjectionMatrix();
  }
  function reset() {
    camera = latest.view === "section" ? ortho : perspective;
    controls.object = camera;
    controls.enableRotate = camera !== ortho;
    camera.zoom = 1;
    projection();
    const { x, y } = center(),
      z = retinalSurface(x, y) / 1000;
    if (latest.view === "whole") {
      controls.target.set(0, 0, 0.4);
      camera.position.set(0, -7, 20);
    } else if (latest.view === "section") {
      camera.position.set(x / 1000, y / 1000 - 1.1, z - 0.13);
      controls.target.set(x / 1000, y / 1000, z - 0.13);
    } else if (latest.view === "plan") {
      camera.position.set(x / 1000, y / 1000, z + 1.9);
      controls.target.set(x / 1000, y / 1000, z - 0.13);
    } else {
      camera.position.set(x / 1000 + 0.41, y / 1000 - 1.14, z + 0.29);
      controls.target.set(x / 1000, y / 1000, z - 0.12);
    }
    if (latest.view === "section") {
      camera.position.x += 0.095;
      controls.target.x += 0.095;
    }
    // Fit the patch on narrow screens. Include large epiretinal gaps in the side view.
    if (
      latest.view !== "whole" &&
      latest.view !== "plan" &&
      latest.config.modality !== "optogenetic" &&
      latest.config.modality !== "photovoltaic"
    ) {
      const rise = Math.max(0, latest.config.electrical.gapUm - 130) / 1000;
      camera.position.z += rise / 2;
      controls.target.z += rise / 2;
      camera.position
        .sub(controls.target)
        .multiplyScalar(1 + rise)
        .add(controls.target);
    }
    camera.position
      .sub(controls.target)
      .multiplyScalar(
        Math.max(
          1,
          1.42 /
            Math.max(0.35, host.clientWidth / Math.max(1, host.clientHeight)),
        ),
      )
      .add(controls.target);
    controls.update();
    render();
  }
  function buildWhole(c) {
    groups.retina.add(posteriorBowl());
    const discCenter = axonData?.opticDiscUm ?? [4205, -407];
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 80),
      mat("#ce9868", { side: THREE.DoubleSide }),
    );
    disc.scale.set(0.5, 0.67, 1);
    disc.position.copy(point(...discCenter, -22));
    // Tangent to the chart so the nasal rim does not disappear into the bowl.
    const [dx, dy] = discCenter;
    const normal = new THREE.Vector3(
      -(retinalSurface(dx + 1, dy) - retinalSurface(dx - 1, dy)) / 2,
      -(retinalSurface(dx, dy + 1) - retinalSurface(dx, dy - 1)) / 2,
      1,
    ).normalize();
    disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    groups.retina.add(disc);
    const vessels = [[], []];
    for (const path of vesselPaths(discCenter)) {
      for (let i = 1; i < path.points.length; i++) {
        const r = path.radius * (1 - (0.83 * i) / (path.points.length - 1));
        vessels[Number(path.vein)].push([
          [...path.points[i - 1], -26],
          [...path.points[i], -26],
          r,
        ]);
      }
    }
    segments(groups.vessels, vessels[0], "#c25e48");
    segments(groups.vessels, vessels[1], "#6e3034");
    if (axonData) {
      const lines = [];
      for (const item of axonData.bundles ?? axonData.paths ?? []) {
        const path = Array.isArray(item) ? item : (item.points ?? []);
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1],
            b = path[i];
          if (
            Math.hypot(a[0] / FUNDUS.rx, a[1] / FUNDUS.ry) < 1 &&
            Math.hypot(b[0] / FUNDUS.rx, b[1] / FUNDUS.ry) < 1
          ) {
            lines.push(
              ...point(a[0], a[1], -6).toArray(),
              ...point(b[0], b[1], -6).toArray(),
            );
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
      groups.fibers.add(
        new THREE.LineSegments(
          g,
          new THREE.LineBasicMaterial({
            color: "#d8bd83",
            transparent: true,
            opacity: 0.17,
          }),
        ),
      );
    }
    for (const [text, x, y] of [
      ["FOVEA", 0, -600],
      ["OPTIC DISC", 4200, -1400],
      ["MACULA", -1800, 1700],
    ]) {
      const s = label(text, 0.65);
      s.position.copy(point(x, y, -120));
      groups.labels.add(s);
    }
  }
  function buildTissue(c) {
    const { x: cx, y: cy, cell } = center(),
      rng = random(c.seed),
      width = PATCH.width,
      height = PATCH.height;
    const layers = layersAt(cx, cy);
    const edgeX = cx + width / 2,
      edgeY = latest.view === "section" ? cy : cy + height * 0.13;
    anchors = layersAt(edgeX, edgeY).map((l) => ({
      id: l.id,
      position: point(edgeX, edgeY, (l.top + l.bottom) / 2),
    }));
    groups.retina.add(cutBlock(cx, cy, c, edgeY));
    const backDepth = cy + height / 2 - edgeY;
    sheet(groups.retina, {
      cx,
      cy: cy + height / 2 - backDepth / 2,
      width,
      height: backDepth,
      color: "#986c60",
      depth: 0,
      nx: 40,
      ny: 12,
    });
    const floor = sheet(groups.retina, {
      cx,
      cy,
      width,
      height,
      color: "#ffffff",
      depth: (x, y) => layersAt(x, y).at(-1).bottom,
      nx: 40,
      ny: 20,
    });
    floor.material.map = pigmentTexture(c.seed);
    const rods = [],
      cones = [],
      receptorBodies = [];
    for (let j = 0; j < 16; j++)
      for (let i = 0; i < 38; i++) {
        const x = cx + (i / 37 - 0.5) * width + (rng() - 0.5) * 6,
          y = cy + (j / 15 - 0.5) * height + (rng() - 0.5) * 6,
          l = layersAt(x, y),
          by = (id) => l.find((q) => q.id === id),
          survival = tissueAt(x, y, c.tissue);
        const isCone = Math.hypot(x, y) < 180 || rng() < 0.22;
        if (rng() > survival.photoreceptor) continue;
        const z = by("OS").top,
          arr = isCone ? cones : rods;
        arr.push([
          [x, y, z],
          [x + 1, y, z + by("OS").thickness],
          isCone ? 3 : 1.3,
        ]);
        arr.push([[x, y, by("IS").top], [x, y, z], isCone ? 3.8 : 2]);
        const nucleusDepth =
          by("ONL").top + by("ONL").thickness * (0.22 + 0.56 * rng());
        receptorBodies.push({
          x,
          y,
          z: nucleusDepth,
          r: isCone ? 3.4 : 2.8,
          tall: 1.6,
        });
        const terminal = [
          x - 3,
          y + 1,
          by("OPL").top + by("OPL").thickness * 0.7,
        ];
        arr.push(
          [[x, y, by("IS").top], [x, y, nucleusDepth], 0.8],
          [[x, y, nucleusDepth], terminal, 0.55],
        );
        receptorBodies.push({
          x: terminal[0],
          y: terminal[1],
          z: terminal[2],
          r: isCone ? 2.6 : 1.4,
          tall: 0.5,
        });
      }
    segments(groups.photoreceptors, rods, "#aab7a1");
    segments(groups.photoreceptors, cones, "#d8b67d");
    bodies(groups.photoreceptors, receptorBodies, "#a6afbe");

    const bcOn = [],
      bcOff = [],
      bcBodies = [],
      amacrine = [],
      horizontal = [];
    for (let i = 0; i < 100; i++) {
      const x = cx + (rng() - 0.5) * width,
        y = cy + (rng() - 0.5) * height,
        l = layersAt(x, y),
        inl = l.find((q) => q.id === "INL"),
        ipl = l.find((q) => q.id === "IPL"),
        opl = l.find((q) => q.id === "OPL"),
        on = i % 2 === 0,
        sv = tissueAt(x, y, c.tissue);
      if (rng() > sv.bipolar) continue;
      const z = inl.top + inl.thickness * (0.25 + 0.5 * rng()),
        arr = on ? bcOn : bcOff,
        terminal = ipl.top + ipl.thickness * (on ? 0.72 : 0.25),
        tx = x + (rng() - 0.5) * 12;
      bcBodies.push({
        x,
        y,
        z,
        r: 3.5,
        tall: 1.3,
        color: on ? "#91c2ab" : "#d9b987",
      });
      arr.push([[x, y, z], [tx, y + 3, terminal], 0.55]);
      for (let j = 0; j < 5; j++) {
        const a = rng() * Math.PI * 2,
          rx = 8 + rng() * 13;
        arr.push([
          [tx, y + 3, terminal],
          [
            tx + rx * Math.cos(a),
            y + 3 + rx * Math.sin(a),
            terminal + (rng() - 0.5) * 3,
          ],
          0.3,
        ]);
        arr.push([
          [x, y, z],
          [x + Math.cos(a) * 8, y + Math.sin(a) * 8, opl.top + 5],
          0.35,
        ]);
      }
      if (i % 8 === 0) {
        for (let j = 0; j < 8; j++) {
          const a = rng() * Math.PI * 2,
            rad = 20 + rng() * 55;
          amacrine.push([
            [x, y, inl.top + 3],
            [
              x + Math.cos(a) * rad,
              y + Math.sin(a) * rad,
              ipl.top + ipl.thickness * 0.5,
            ],
            0.5,
          ]);
          horizontal.push([
            [x, y, opl.top],
            [x + Math.cos(a) * rad, y + Math.sin(a) * rad, opl.top + 3],
            0.45,
          ]);
        }
      }
    }
    segments(groups.interneurons, bcOn, "#80b9a7");
    segments(groups.interneurons, bcOff, "#ccae72");
    segments(groups.interneurons, amacrine, "#b394b5");
    segments(groups.interneurons, horizontal, "#ae9c7e");
    bodies(groups.interneurons, bcBodies, "#91bbae");
    const glia = [],
      glialBodies = [];
    for (let i = 0; i < 36; i++) {
      const x = cx + (rng() - 0.5) * width,
        y = cy + (rng() - 0.5) * height;
      const layer = layersAt(x, y),
        nucleus = (layer[3].top + layer[3].bottom) / 2;
      const foot = [x - 7, y + 2, 2],
        stalk = [x + 4, y - 1, layer[2].bottom];
      const soma = [x, y, nucleus],
        outer = [x + 7, y, layer[5].bottom];
      glia.push([foot, stalk, 0.8], [stalk, soma, 1.2], [soma, outer, 0.9]);
      for (const side of [-1, 1])
        glia.push(
          [foot, [foot[0] + side * 6, y, 2], 1.5],
          [stalk, [x + side * 10, y - 4, layer[2].bottom - 8], 0.5],
          [outer, [outer[0] + side * 4, y + 2, outer[2]], 0.7],
        );
      glialBodies.push({ x, y, z: nucleus, r: 2.7, tall: 1.6 });
    }
    segments(groups.glia, glia, "#87a69a");
    bodies(groups.glia, glialBodies, "#94aba1");
    const treeSegments = [],
      somas = [],
      axons = [];
    const models = [{ ...cell }];
    for (let i = 0; i < 15; i++) {
      const x = cx + (rng() - 0.5) * width,
        y = cy + (rng() - 0.5) * height;
      if (Math.hypot(x, y) < 180) continue;
      const l = layersAt(x, y),
        g = l.find((a) => a.id === "GCL"),
        ip = l.find((a) => a.id === "IPL");
      models.push({
        xUm: x,
        yUm: y,
        depthUm: g.top + g.thickness * 0.55,
        dendriteDepthUm: ip.top + ip.thickness * (i % 2 ? 0.72 : 0.28),
        seed: c.seed + i * 707,
        on: i % 2 === 0,
        kind: i % 4 ? "midget" : "parasol",
      });
    }
    for (let i = 0; i < models.length; i++) {
      const model = models[i],
        sv = tissueAt(model.xUm, model.yUm, c.tissue);
      if (i && rng() > sv.ganglion) continue;
      const nodes =
        i === 0 && latest.result?.cable
          ? latest.result.cable.nodes
          : morphology(model, { count: i ? 45 : 80 });
      somas.push({
        x: model.xUm,
        y: model.yUm,
        z: model.depthUm,
        r: model.kind === "parasol" ? 9 : 6,
        color: i === 0 ? "#ecd094" : "#c8b6af",
      });
      for (let k = 1; k < nodes.length; k++) {
        const p = nodes[k],
          q = nodes[p.parent];
        (p.type === "axon" || p.type === "ais" ? axons : treeSegments).push([
          [p.xUm, p.yUm, p.depthUm],
          [q.xUm, q.yUm, q.depthUm],
          p.radiusUm,
          q.radiusUm,
        ]);
      }
    }
    segments(groups.ganglion, treeSegments, "#c8ada5");
    segments(groups.ganglion, axons, "#d3bd8f");
    bodies(groups.ganglion, somas, "#c8ada5");
    const title = label("500 µm", 0.048);
    title.position.copy(
      point(cx - 250, cy - height / 2 - 40, layers.at(-1).bottom + 30),
    );
    groups.labels.add(title);
    segments(
      groups.labels,
      [
        [
          [cx - 250, cy - height / 2 - 30, layers.at(-1).bottom + 15],
          [cx + 250, cy - height / 2 - 30, layers.at(-1).bottom + 15],
          0.7,
        ],
      ],
      "#d8d0b7",
    );
  }
  function buildDevice(c, result) {
    const { x, y } = center();
    const assembly = buildImplantGeometry(c, {
      contacts: result?.electrical?.contacts,
      clipPlanes:
        latest.view === "whole"
          ? []
          : microscopeClipPlanes(
              x,
              y,
              PATCH.width,
              latest.view === "section" ? 36 : PATCH.height,
            ),
    });
    groups.device.add(assembly.group);
    const layout = assembly.group.userData.layout;
    // Clipping the intact backing exposes an open shell when viewed edge-on.
    // Fill its physical cross-section so the caliper terminates on visible material.
    if (layout && latest.view === "section") {
      const profile = carrierSection(layout, c, x, y, PATCH.width);
      const vertices = [],
        faces = [];
      for (const [i, p] of profile.entries()) {
        vertices.push(
          p.x / 1000,
          y / 1000,
          p.face / 1000,
          p.x / 1000,
          y / 1000,
          p.back / 1000,
        );
        if (i) {
          const n = 2 * i;
          faces.push(n - 2, n - 1, n, n - 1, n + 1, n);
        }
      }
      if (faces.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3),
        );
        geometry.setIndex(faces);
        groups.device.add(
          new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
              color: layout.pv ? "#758193" : "#8aa397",
              side: THREE.DoubleSide,
            }),
          ),
        );
      }
    }
    if (layout && latest.view !== "whole" && latest.view !== "plan") {
      const px = x - PATCH.width * 0.32,
        py = latest.view === "section" ? y : y - PATCH.height * 0.35;
      const clearance = localClearance(layout, c, px, py);
      if (clearance) {
        const { face, reference, gapUm } = clearance,
          pts = [];
        for (const [a, b] of [
          [
            [px, reference],
            [px, face],
          ],
          [
            [px - 8, face],
            [px + 8, face],
          ],
          [
            [px - 8, reference],
            [px + 8, reference],
          ],
        ])
          pts.push(
            new THREE.Vector3(a[0] / 1000, py / 1000, a[1] / 1000),
            new THREE.Vector3(b[0] / 1000, py / 1000, b[1] / 1000),
          );
        const bracket = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0xbbeadc, depthTest: false }),
        );
        bracket.renderOrder = 32;
        groups.caliper.add(bracket);
        const note = label(Math.round(gapUm) + " µm", 0.045, "#d4ffed");
        note.center.set(0, 0.5);
        note.position.set(
          (px + 9) / 1000,
          py / 1000,
          (face + reference) / 2000,
        );
        groups.caliper.add(note);
      }
    }
    pickable = assembly.pickable;
    if (pickable.length) {
      const highlight = pickable[0].material.clone();
      highlight.color.set("#f7ca79");
      highlight.emissive.set("#a56322");
      highlight.emissiveIntensity = 0.5;
      assembly.group.userData.highlightMaterial = highlight;
      // Retain both shared materials even when all contacts use one of them.
      assembly.group.userData.contactMaterials = [
        highlight,
        pickable[0].material,
      ];
      for (const contact of pickable)
        contact.userData.normalMaterial = contact.material;
    }
  }

  function overlay(c, result) {
    clear(groups.overlay);
    if (!result || latest.overlay === "none") return;
    const whole = latest.view === "whole",
      { x: cx, y: cy } = center(),
      size = 96,
      canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d"),
      data = ctx.createImageData(size, size),
      kind = latest.overlay;
    if (kind === "voltage" && result.cable && !whole) {
      const cf =
        result.cable.compartmentFrames[
          Math.min(latest.frame ?? 0, result.cable.compartmentFrames.length - 1)
        ];
      for (let bin = 0; bin < 8; bin++) {
        const list = [];
        for (let i = 1; i < result.cable.nodes.length; i++) {
          if (
            Math.min(
              7,
              Math.max(0, Math.floor((cf.voltageMv[i] + 80) / 15)),
            ) !== bin
          )
            continue;
          const p = result.cable.nodes[i],
            q = result.cable.nodes[p.parent];
          list.push([
            [p.xUm, p.yUm, p.depthUm],
            [q.xUm, q.yUm, q.depthUm],
            p.radiusUm * 1.7,
          ]);
        }
        segments(
          groups.overlay,
          list,
          new THREE.Color().setHSL((1 - bin / 7) * 0.6, 0.65, 0.55),
        );
      }
      return;
    }
    const sample = overlaySampler(c, result, kind, latest.frame);
    const width = whole ? 10000 : 850,
      height = whole ? 10000 : 500,
      x0 = whole ? 0 : cx,
      y0 = whole ? 0 : cy;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const xx = x0 + (x / size - 0.5) * width,
          yy = y0 + (0.5 - y / size) * height;
        let index = 0;
        if (kind !== "field") {
          nearestSite ??= new Int32Array(size * size).fill(-1);
          const pixel = y * size + x;
          if (nearestSite[pixel] < 0) {
            let best = Infinity;
            result.neural.cells.forEach((p, i) => {
              const d = (p.xUm - xx) ** 2 + (p.yUm - yy) ** 2;
              if (d < best) {
                best = d;
                index = i;
              }
            });
            nearestSite[pixel] = index;
          } else index = nearestSite[pixel];
        }
        const value = sample(xx, yy, index);
        const i = (y * size + x) * 4,
          level = Math.min(1, Math.abs(value));
        data.data[i] = value < 0 ? 78 : 240;
        data.data[i + 1] = value < 0 ? 173 : 182;
        data.data[i + 2] = value < 0 ? 218 : 91;
        data.data[i + 3] = level * 170;
      }
    ctx.putImageData(data, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = sheet(groups.overlay, {
      cx: x0,
      cy: y0,
      width,
      height,
      depth: latest.overlay === "field" ? 0 : -4,
      color: "#fff",
      opacity: 0.75,
      nx: 32,
      ny: 24,
    });
    mesh.material.map = texture;
    mesh.material.emissive = new THREE.Color("#fff");
    mesh.material.emissiveMap = texture;
    mesh.material.emissiveIntensity = 0.35;
    mesh.renderOrder = 10;
  }
  function update(next) {
    latest = next;
    const { config: c, view = "tissue", layers = {}, result } = next;
    const key = JSON.stringify([
      c.placement,
      c.tissue,
      c.seed,
      c.modality,
      c.customContacts,
      c.electrical.device,
      c.electrical.rows,
      c.electrical.cols,
      c.electrical.pitchUm,
      c.electrical.diameterUm,
      c.electrical.gapUm,
      c.photovoltaic.gapUm,
      c.photovoltaic.activeRadiusUm,
      c.photovoltaic.returnWidthUm,
      c.neural.selectedIndex,
      c.neural.gridSize,
      c.scene.fieldDeg,
      c.fidelity,
      !!result?.cable,
      view,
      !!axonData,
    ]);
    if (key !== lastGeometry) {
      for (const g of Object.values(groups)) clear(g);
      tap = null;
      if (view === "whole") buildWhole(c);
      else {
        buildTissue(c);
        if (view === "section") {
          const { x, y } = center(),
            planes = microscopeClipPlanes(x, y, PATCH.width, 36);
          for (const name of [
            "glia",
            "interneurons",
            "photoreceptors",
            "ganglion",
          ]) {
            groups[name].traverse((o) => {
              if (o.material) o.material.clippingPlanes = planes;
            });
          }
        }
      }
      buildDevice(c, result);
      lastGeometry = key;
      lastOverlay = "";
      nearestSite = null;
    }
    for (const k of Object.keys(groups))
      if (k !== "overlay") groups[k].visible = layers[k] !== false;
    const selected =
      c.modality === "photovoltaic"
        ? c.photovoltaic.selectedPixelId
        : c.electrical.selectedId;
    for (const contact of pickable) {
      contact.material =
        contact.userData.contactId === selected
          ? groups.device.children[0].userData.highlightMaterial
          : contact.userData.normalMaterial;
    }
    groups.caliper.visible = layers.labels !== false && layers.device !== false;
    const okey = JSON.stringify([
      result?.experimentId,
      next.overlay,
      next.frame,
      view,
      key,
    ]);
    if (okey !== lastOverlay) {
      overlay(c, result);
      lastOverlay = okey;
    }
    const homeKey = [
      view,
      c.neural.selectedIndex,
      c.neural.gridSize,
      c.scene.fieldDeg,
      c.electrical.gapUm,
    ].join("/");
    if (lastView !== homeKey) {
      lastView = homeKey;
      reset();
    }
    render();
  }
  controls.addEventListener("change", render);
  const pointer = (event) => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(mouse, camera);
  };
  const down = (e) => {
    tap = [e.clientX, e.clientY];
    pointer(e);
    if (e.shiftKey && latest.config.modality !== "optogenetic") {
      controls.enabled = false;
      plane.constant =
        -retinalSurface(
          latest.config.placement.xUm,
          latest.config.placement.yUm,
        ) / 1000;
      if (ray.ray.intersectPlane(plane, intersection)) {
        drag = {
          x: intersection.x,
          y: intersection.y,
          placement: { ...latest.config.placement },
        };
        renderer.domElement.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }
  };
  const up = (e) => {
    pointer(e);
    if (drag) {
      if (ray.ray.intersectPlane(plane, intersection))
        onPlace({
          xUm: Math.max(
            -3000,
            Math.min(
              3000,
              drag.placement.xUm + (intersection.x - drag.x) * 1000,
            ),
          ),
          yUm: Math.max(
            -3000,
            Math.min(
              3000,
              drag.placement.yUm + (intersection.y - drag.y) * 1000,
            ),
          ),
        });
      drag = null;
      controls.enabled = true;
    } else if (tap && Math.hypot(e.clientX - tap[0], e.clientY - tap[1]) < 5) {
      const hits = groups.device.visible
        ? ray
            .intersectObjects(pickable)
            .filter((hit) =>
              (hit.object.material.clippingPlanes ?? []).every(
                (p) => p.distanceToPoint(hit.point) >= 0,
              ),
            )
        : [];
      if (hits.length) onSelect(hits[0].object.userData.contactId);
    }
  };
  renderer.domElement.addEventListener("pointerdown", down, true);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", () => {
    drag = null;
    tap = null;
    controls.enabled = true;
  });
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    projection();
    render();
  });
  resize.observe(host);
  const abort = new AbortController();
  fetch("/assets/retinal-implant/axon-display.json", { signal: abort.signal })
    .then((r) => r.json())
    .then((d) => {
      axonData = d;
      if (latest.config) update(latest);
    })
    .catch(() => {});
  return {
    update,
    reset,
    dispose() {
      disposed = true;
      abort.abort();
      resize.disconnect();
      annotation.dispose();
      controls.dispose();
      for (const g of Object.values(groups)) clear(g);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
