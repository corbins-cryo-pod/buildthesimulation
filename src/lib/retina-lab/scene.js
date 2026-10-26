import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { retinalSurface, worldPoint, placePoint } from "./coordinates.mjs";
import {
  layersAt,
  morphology,
  random,
  tissueAt,
  population,
  cellWorld,
} from "./anatomy.mjs";
import { buildImplantGeometry, microscopeClipPlanes } from "./implant-geometry.mjs";
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
  { onSelect = () => {}, onPlace = () => {}, onUnavailable = () => {} } = {},
) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return createFallback(host, { onSelect });
  }
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setClearColor("#151b1c");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.className = "rtl-webgl";
  renderer.domElement.setAttribute(
    "aria-label",
    "Registered 3D retina. Drag to orbit, scroll to zoom. Shift-drag moves the implant. Placement fields provide keyboard controls.",
  );
  renderer.domElement.setAttribute("role", "img");
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(34, 1, 0.005, 100);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 0.14;
  controls.maxDistance = 45;
  scene.add(new THREE.HemisphereLight("#fff0d5", "#344354", 2.6));
  const key = new THREE.DirectionalLight("#fff0ce", 3.5);
  key.position.set(-2, -4, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#82adb3", 2);
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
  ]) {
    groups[k] = new THREE.Group();
    scene.add(groups[k]);
  }
  let latest = {},
    lastGeometry = "",
    lastOverlay = "",
    lastView = "",
    pickable = [],
    axonData = null,
    disposed = false,
    drag = null,
    neuralBodies = null;
  const ray = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    intersection = new THREE.Vector3();
  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };
  function center() {
    const cell =
      latest.result?.neural.cells[latest.config.neural.selectedIndex] ??
      population(latest.config)[latest.config.neural.selectedIndex];
    return { x: cell.xUm, y: cell.yUm, cell };
  }
  function reset() {
    const { x, y } = center(),
      z = retinalSurface(x, y) / 1000;
    if (latest.view === "whole") {
      camera.position.set(1, -13, 14);
      controls.target.set(0, 0, 0.4);
    } else if (latest.view === "section") {
      camera.position.set(x / 1000, y / 1000 - 1.6, z - 0.1);
      controls.target.set(x / 1000, y / 1000, z - 0.13);
    } else if (latest.view === "plan") {
      camera.position.set(x / 1000, y / 1000, z + 1.9);
      controls.target.set(x / 1000, y / 1000, z - 0.13);
    } else {
      camera.position.set(x / 1000 + 0.8, y / 1000 - 1.3, z + 0.67);
      controls.target.set(x / 1000, y / 1000, z - 0.12);
    }
    controls.update();
    render();
  }
  function buildWhole(c) {
    sheet(groups.retina, { color: "#704b3b", depth: 250 });
    sheet(groups.retina, { color: "#a38667", opacity: 0.48, depth: 0 });
    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18 + r * 0.14, 0.182 + r * 0.14, 96),
        new THREE.MeshBasicMaterial({
          color: "#b69c65",
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      ring.position.z = -0.05;
      groups.retina.add(ring);
    }
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 64),
      mat("#e0c8a2", { side: THREE.DoubleSide }),
    );
    disc.position.copy(point(4200, -300, -5));
    disc.scale.set(0.7, 1, 1);
    groups.retina.add(disc);
    const curves = [];
    for (const sign of [-1, 1])
      for (let k = 0; k < 7; k++) {
        const arr = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          arr.push([
            4200 - (4400 + k * 500) * t,
            -300 + sign * (1000 + k * 380) * Math.sin(t * Math.PI * 0.7),
            -15,
          ]);
        }
        for (let i = 1; i < arr.length; i++)
          curves.push([arr[i - 1], arr[i], 14 + 10 * (1 - i / arr.length)]);
        const vessel = arr.filter((_, i) => i % 4 === 0);
        for (let j = 2; j < vessel.length; j++) {
          const p = vessel[j],
            q = [p[0] - 350, p[1] + sign * 550, -16];
          curves.push([p, q, 8]);
        }
      }
    segments(groups.vessels, curves, "#843d3c");
    if (axonData) {
      const lines = [];
      for (const item of axonData.bundles ?? axonData.paths ?? []) {
        const path = Array.isArray(item) ? item : (item.points ?? []);
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1],
            b = path[i];
          if (
            Math.abs(a[0]) < 7000 &&
            Math.abs(a[1]) < 5400 &&
            Math.abs(b[0]) < 7000 &&
            Math.abs(b[1]) < 5400
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
            opacity: 0.4,
          }),
        ),
      );
    }
    for (const [text, x, y] of [
      ["FOVEA", 0, -900],
      ["OPTIC DISC", 4200, -1400],
      ["MACULA", -1800, 1700],
    ]) {
      const s = label(text, 0.25);
      s.position.copy(point(x, y, -120));
      groups.labels.add(s);
    }
  }
  function buildTissue(c) {
    const { x: cx, y: cy, cell } = center(),
      rng = random(c.seed),
      width = 850,
      height = 500;
    const layers = layersAt(cx, cy);
    for (const layer of layers) {
      sheet(groups.retina, {
        cx,
        cy,
        width,
        height,
        depth: (x, y) => layersAt(x, y).find((l) => l.id === layer.id).bottom,
        color: layer.color,
        opacity: layer.id === "RPE" ? 0.95 : 0.09,
        nx: 24,
        ny: 10,
      });
      const s = label(layer.id, 0.022);
      s.position.copy(
        point(cx + width / 2 + 90, cy - height / 2, layer.bottom - 3),
      );
      groups.labels.add(s);
    }
    const rods = [],
      cones = [],
      nuclei = [],
      receptorBodies = [],
      rpe = [];
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
        receptorBodies.push({
          x,
          y,
          z: by("ONL").top + by("ONL").thickness * (0.25 + 0.5 * rng()),
          r: isCone ? 3.4 : 2.8,
          tall: 1.6,
        });
        rods.push([[x, y, by("ONL").bottom], [x, y, by("OPL").top + 5], 0.5]);
      }
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < 24; i++) {
        const x = cx + (i / 23 - 0.5) * width,
          y = cy + (j / 9 - 0.5) * height,
          l = layersAt(x, y).at(-1);
        rpe.push({ x, y, z: l.bottom - 4, r: 12, tall: 0.25 });
      }
    segments(groups.photoreceptors, rods, "#aab7a1");
    segments(groups.photoreceptors, cones, "#d8b67d");
    bodies(groups.photoreceptors, receptorBodies, "#a6afbe");
    bodies(groups.retina, rpe, "#5c4239");
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
    neuralBodies = bodies(groups.ganglion, somas, "#c8ada5");
    const title = label("500 µm · anatomical depth", 0.026);
    title.position.copy(
      point(cx - 150, cy - height / 2 - 40, layers.at(-1).bottom + 30),
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
      clipPlanes: latest.view === "whole" ? [] : microscopeClipPlanes(x, y),
    });
    groups.device.add(assembly.group);
    pickable = assembly.pickable;
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
    const fieldPeak = field
      ? Math.max(1e-10, ...field.potentialMv.map(Math.abs))
      : 1;
    const width = whole ? 10000 : 850,
      height = whole ? 10000 : 500,
      x0 = whole ? 0 : cx,
      y0 = whole ? 0 : cy,
      field = result.electrical?.field ?? result.photovoltaic?.physics.field;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const xx = x0 + (x / size - 0.5) * width,
          yy = y0 + (0.5 - y / size) * height;
        let value = 0;
        if (kind === "field" && field) {
          let p = { xUm: xx, yUm: yy };
          if (result.photovoltaic) {
            const t = (-c.placement.rotationDeg * Math.PI) / 180,
              dx = xx - c.placement.xUm,
              dy = yy - c.placement.yUm;
            p = {
              xUm: Math.cos(t) * dx - Math.sin(t) * dy,
              yUm: Math.sin(t) * dx + Math.cos(t) * dy,
            };
          }
          const ix = Math.round(
              ((p.xUm - field.xUm[0]) / (field.xUm.at(-1) - field.xUm[0])) *
                (field.width - 1),
            ),
            iy = Math.round(
              ((field.yUm[0] - p.yUm) / (field.yUm[0] - field.yUm.at(-1))) *
                (field.height - 1),
            );
          if (ix >= 0 && iy >= 0 && ix < field.width && iy < field.height)
            value = field.potentialMv[iy * field.width + ix] / fieldPeak;
        } else {
          const cells = result.neural.cells;
          let best = Infinity,
            index = 0;
          for (let i = 0; i < cells.length; i++) {
            const d = (cells[i].xUm - xx) ** 2 + (cells[i].yUm - yy) ** 2;
            if (d < best) {
              best = d;
              index = i;
            }
          }
          if (kind === "light") value = result.drive.incidentLight[index] / 4;
          else if (kind === "damage")
            value = 1 - cells[index].survival.photoreceptor;
          else if (kind === "heat")
            value = (result.thermal?.peakDeltaK ?? 0) / 0.5;
          else {
            const frame =
              result.neural.frames[
                Math.min(latest.frame ?? 0, result.neural.frames.length - 1)
              ];
            value =
              kind === "voltage"
                ? (frame.voltageMv[index] + 70) / 35
                : kind === "synapses"
                  ? frame.bipolar[index]
                  : frame.activity[index] / 2;
          }
        }
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
      c.electrical.rows,
      c.electrical.cols,
      c.electrical.pitchUm,
      c.electrical.diameterUm,
      c.electrical.gapUm,
      c.photovoltaic.gapUm,
      c.neural.selectedIndex,
      c.fidelity,
      !!result?.cable,
      view,
      !!axonData,
    ]);
    if (key !== lastGeometry) {
      for (const g of Object.values(groups)) clear(g);
      neuralBodies = null;
      if (view === "whole") buildWhole(c);
      else buildTissue(c);
      buildDevice(c, result);
      lastGeometry = key;
      lastOverlay = "";
    }
    for (const k of Object.keys(groups))
      if (k !== "overlay") groups[k].visible = layers[k] !== false;
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
    if (lastView !== view) {
      lastView = view;
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
    pointer(e);
    if (e.shiftKey) {
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
    } else {
      const hits = groups.device.visible ? ray.intersectObjects(pickable).filter(hit =>
        (hit.object.material.clippingPlanes ?? []).every(p => p.distanceToPoint(hit.point) >= 0)
      ) : [];
      if (hits.length) onSelect(hits[0].object.userData.contactId);
    }
  };
  renderer.domElement.addEventListener("pointerdown", down, true);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", () => {
    drag = null;
    controls.enabled = true;
  });
  const resize = new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
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
      controls.dispose();
      for (const g of Object.values(groups)) clear(g);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
