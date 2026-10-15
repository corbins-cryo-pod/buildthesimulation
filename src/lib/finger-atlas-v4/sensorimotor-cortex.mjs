import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const INSTALL_KEY = Symbol.for('buildthesimulation.fingerAtlasV4.sensorimotorCortex');
const PATCHED_CONTROLS = Symbol.for('buildthesimulation.fingerAtlasV4.sensorimotorCortex.controlsPatch');
const PATCHED_RENDERER = Symbol.for('buildthesimulation.fingerAtlasV4.sensorimotorCortex.rendererPatch');
const PAIR_CENTER = new T.Vector3(36.5, 357.5, -6.0);
const SECTION_SPECS = [
  {
    id: 'm1',
    short: 'M1',
    name: 'Primary motor cortex · precentral gyrus',
    center: new T.Vector3(-3.0, 0, 9.0),
    side: -1,
    thickness: 3.65,
    depth: 4.2,
    fractions: [0.07, 0.12, 0.24, 0.035, 0.305, 0.23],
    counts: [18, 38, 52, 7, 72, 48],
    emphasisLayer: 4,
    note: 'Agranular M1 prior: a very thin/indistinct layer IV and expanded layer V.',
  },
  {
    id: 's1',
    short: 'S1',
    name: 'Primary somatosensory cortex · postcentral gyrus',
    center: new T.Vector3(3.0, 0, -11.0),
    side: 1,
    thickness: 2.85,
    depth: 4.2,
    fractions: [0.08, 0.15, 0.19, 0.205, 0.175, 0.20],
    counts: [18, 42, 58, 82, 48, 38],
    emphasisLayer: 3,
    note: 'Granular S1 prior: a prominent thalamorecipient layer IV.',
  },
];
const LAYER_NAMES = [
  'I · molecular',
  'II · external granular',
  'III · external pyramidal',
  'IV · internal granular',
  'V · internal pyramidal',
  'VI · multiform',
];
const LAYER_COLORS = [0xe5e3dc, 0xd6d5cf, 0xc6c7c2, 0xb7c6c7, 0xc7aaa0, 0x929da2];

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeSurface(side) {
  const raw = side < 0
    ? [[3.4,-5.3],[3.05,-3.6],[2.45,-1.2],[1.85,1.35],[1.15,3.75],[0.05,5.65],[-1.55,6.55],[-3.25,6.3],[-4.55,5.05],[-5.15,2.75],[-5.0,0.15],[-4.3,-2.55],[-3.1,-4.75]]
    : [[-3.4,-5.3],[-3.05,-3.6],[-2.45,-1.2],[-1.85,1.35],[-1.15,3.75],[-0.05,5.55],[1.45,6.35],[2.95,6.15],[4.15,5.0],[4.75,2.85],[4.7,0.35],[4.05,-2.25],[2.95,-4.65]];
  const curve = new T.CatmullRomCurve3(raw.map(([x,y]) => new T.Vector3(x,y,0)), false, 'centripetal', 0.45);
  return curve.getPoints(34).map(p => new T.Vector2(p.x,p.y));
}

function inwardNormals(points) {
  const target = new T.Vector2(0, -0.35), result = [];
  for (let i = 0; i < points.length; i++) {
    const previous = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const normal = new T.Vector2(-tangent.y, tangent.x);
    if (normal.dot(target.clone().sub(points[i])) < 0) normal.multiplyScalar(-1);
    result.push(normal.normalize());
  }
  return result;
}

function offsetBoundary(surface, normals, amount) {
  return surface.map((point, index) => point.clone().addScaledVector(normals[index], amount));
}

function polygonShape(points) {
  const shape = new T.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
  shape.closePath();
  return shape;
}

function extrudedRibbon(outer, inner, depth, material) {
  const polygon = [...outer, ...[...inner].reverse()];
  const geometry = new T.ExtrudeGeometry(polygonShape(polygon), { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return new T.Mesh(geometry, material);
}

function stripGeometry(outer, inner, z) {
  const positions = [], indices = [];
  for (let i = 0; i < outer.length; i++) positions.push(outer[i].x, outer[i].y, z, inner[i].x, inner[i].y, z);
  for (let i = 0; i < outer.length - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, c, d, b);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function lineFromPoints(points, z, material) {
  const geometry = new T.BufferGeometry().setFromPoints(points.map(point => new T.Vector3(point.x, point.y, z)));
  return new T.Line(geometry, material);
}

function sampleRibbon(section, u, depth) {
  const scaled = T.MathUtils.clamp(u, 0, 0.999999) * (section.surface.length - 1);
  const index = Math.floor(scaled), t = scaled - index;
  const next = Math.min(section.surface.length - 1, index + 1);
  const surface = section.surface[index].clone().lerp(section.surface[next], t);
  const normal = section.normals[index].clone().lerp(section.normals[next], t).normalize();
  return { point: surface.addScaledVector(normal, depth), normal };
}

function makeSection(spec) {
  const group = new T.Group();
  group.name = `${spec.short} coronal section`;
  group.position.copy(spec.center);
  group.userData = { sensorimotorCortex: true, region: spec.id };

  const surface = makeSurface(spec.side), normals = inwardNormals(surface);
  const cumulative = [0];
  spec.fractions.forEach(value => cumulative.push(cumulative.at(-1) + value));
  const boundaries = cumulative.map(value => offsetBoundary(surface, normals, spec.thickness * value));
  const whiteDeep = offsetBoundary(surface, normals, spec.thickness + 1.35);
  const ribbonMaterial = new T.MeshStandardMaterial({ color: 0x8f9698, roughness: 0.94, metalness: 0, side: T.DoubleSide });
  const whiteMaterial = new T.MeshStandardMaterial({ color: 0xc9ced0, roughness: 0.98, metalness: 0, side: T.DoubleSide });
  const ribbon = extrudedRibbon(surface, boundaries.at(-1), spec.depth, ribbonMaterial);
  const white = extrudedRibbon(boundaries.at(-1), whiteDeep, spec.depth, whiteMaterial);
  ribbon.renderOrder = 1; white.renderOrder = 0;
  group.add(white, ribbon);

  const layerGroup = new T.Group();
  layerGroup.name = `${spec.short} six cortical layers`;
  const front = spec.depth / 2 + 0.018;
  for (let layer = 0; layer < 6; layer++) {
    const color = new T.Color(LAYER_COLORS[layer]);
    if (spec.id === 'm1' && layer === 4) color.offsetHSL(-0.015, 0.08, 0.015);
    if (spec.id === 's1' && layer === 3) color.offsetHSL(0.025, 0.10, 0.02);
    const material = new T.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, side: T.DoubleSide });
    const mesh = new T.Mesh(stripGeometry(boundaries[layer], boundaries[layer + 1], front), material);
    mesh.name = `${spec.short} ${LAYER_NAMES[layer]}`;
    mesh.userData = { layer: layer + 1, sensorimotorCortex: true };
    layerGroup.add(mesh);
  }
  const pial = lineFromPoints(surface, front + 0.02, new T.LineBasicMaterial({ color: 0xf1eee8, transparent: true, opacity: 0.92 }));
  const whiteBoundary = lineFromPoints(boundaries.at(-1), front + 0.021, new T.LineBasicMaterial({ color: 0x65737b, transparent: true, opacity: 0.9 }));
  layerGroup.add(pial, whiteBoundary);
  group.add(layerGroup);

  const micro = makeMicrostructure({ ...spec, surface, normals, cumulative, front });
  group.add(micro.group);

  const windowCenter = sampleRibbon({ surface, normals }, spec.id === 'm1' ? 0.46 : 0.52, spec.thickness * 0.47).point;
  const box = new T.BoxGeometry(1, 1, 1);
  const edges = new T.LineSegments(new T.EdgesGeometry(box), new T.LineBasicMaterial({ color: spec.id === 'm1' ? 0xffc2a3 : 0x9ee8eb, transparent: true, opacity: 0.82 }));
  edges.position.set(windowCenter.x, windowCenter.y, front + 0.48);
  edges.name = `${spec.short} H01-scale 1 mm³ sampling window`;
  micro.group.add(edges);

  return {
    ...spec,
    group,
    layerGroup,
    microGroup: micro.group,
    surface,
    normals,
    cumulative,
    boundaries,
    front,
    labelAnchor: new T.Vector3(spec.side < 0 ? -1.5 : 1.4, 7.15, front),
    h01Anchor: new T.Vector3(windowCenter.x, windowCenter.y, front + 1.08),
    layerAnchors: cumulative.slice(0, -1).map((start, index) => {
      const depth = spec.thickness * (start + spec.fractions[index] * 0.5);
      const sample = sampleRibbon({ surface, normals }, spec.side < 0 ? 0.13 : 0.13, depth);
      return new T.Vector3(sample.point.x, sample.point.y, front + 0.08);
    }),
  };
}

function makeMicrostructure(section) {
  const group = new T.Group();
  group.name = `${section.short} H01-inspired cellular microstructure`;
  const rng = random(section.id === 'm1' ? 41051 : 58217);
  const positions = [], colors = [], radii = [], layerIds = [], us = [], depths = [];
  for (let layer = 0; layer < 6; layer++) {
    for (let index = 0; index < section.counts[layer]; index++) {
      const u = 0.045 + rng() * 0.91;
      const depthFraction = section.cumulative[layer] + (0.09 + rng() * 0.82) * section.fractions[layer];
      const sample = sampleRibbon(section, u, section.thickness * depthFraction);
      const base = 0.030 + rng() * 0.018;
      const radius = section.id === 'm1' && layer === 4 ? 0.058 + rng() * 0.048
        : section.id === 's1' && layer === 3 ? 0.026 + rng() * 0.014
        : base;
      positions.push(new T.Vector3(sample.point.x, sample.point.y, section.front + 0.07 + (rng() - 0.5) * 0.16));
      colors.push(new T.Color(LAYER_COLORS[layer]).offsetHSL((rng() - 0.5) * 0.025, 0.08, (rng() - 0.5) * 0.08));
      radii.push(radius); layerIds.push(layer); us.push(u); depths.push(depthFraction);
    }
  }
  const somaGeometry = new T.IcosahedronGeometry(1, 1);
  const somaMaterial = new T.MeshStandardMaterial({ roughness: 0.58, metalness: 0, vertexColors: true });
  const somata = new T.InstancedMesh(somaGeometry, somaMaterial, positions.length);
  const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), scale = new T.Vector3();
  positions.forEach((position, index) => {
    scale.setScalar(radii[index]); matrix.compose(position, quaternion, scale); somata.setMatrixAt(index, matrix); somata.setColorAt(index, colors[index]);
  });
  somata.instanceMatrix.needsUpdate = true;
  if (somata.instanceColor) somata.instanceColor.needsUpdate = true;
  somata.name = `${section.short} representative somata`;
  group.add(somata);

  const arborPositions = [];
  const addSegment = (a,b) => arborPositions.push(a.x,a.y,a.z,b.x,b.y,b.z);
  positions.forEach((soma, index) => {
    const layer = layerIds[index];
    if (index % 2 && !(section.id === 'm1' && layer === 4) && !(section.id === 's1' && layer === 3)) return;
    const u = us[index], depth = section.thickness * depths[index];
    const pial = sampleRibbon(section, u, Math.max(0.08, depth * 0.08)).point;
    const deep = sampleRibbon(section, u, Math.min(section.thickness + 0.9, depth + 0.8 + rng() * 0.8)).point;
    const apical = new T.Vector3(pial.x, pial.y, soma.z + 0.01);
    const elbow = soma.clone().lerp(apical, 0.55).add(new T.Vector3((rng() - 0.5) * 0.14, 0, 0));
    if (layer >= 2) { addSegment(soma, elbow); addSegment(elbow, apical); }
    const branchCount = section.id === 's1' && layer === 3 ? 5 : 3;
    for (let branch = 0; branch < branchCount; branch++) {
      const angle = (branch / branchCount) * Math.PI * 2 + rng() * 0.7;
      const length = 0.12 + rng() * (section.id === 'm1' && layer === 4 ? 0.45 : 0.27);
      addSegment(soma, soma.clone().add(new T.Vector3(Math.cos(angle) * length, Math.sin(angle) * length, (rng() - 0.5) * 0.08)));
    }
    if (layer >= 3) addSegment(soma, new T.Vector3(deep.x, deep.y, soma.z - 0.03));
  });
  const arborGeometry = new T.BufferGeometry();
  arborGeometry.setAttribute('position', new T.Float32BufferAttribute(arborPositions, 3));
  const arbors = new T.LineSegments(arborGeometry, new T.LineBasicMaterial({ color: section.id === 'm1' ? 0xdba98f : 0x9fcfd2, transparent: true, opacity: 0.62, depthWrite: false }));
  arbors.name = `${section.short} representative dendrite and axon fragments`;
  group.add(arbors);

  const gliaCount = section.id === 'm1' ? 92 : 104;
  const glia = new T.InstancedMesh(new T.IcosahedronGeometry(1,0), new T.MeshStandardMaterial({ color: 0x8ca3b4, roughness: 0.72, transparent: true, opacity: 0.75 }), gliaCount);
  for (let index = 0; index < gliaCount; index++) {
    const u = 0.04 + rng() * 0.92, depth = rng() * section.thickness;
    const sample = sampleRibbon(section, u, depth), position = new T.Vector3(sample.point.x, sample.point.y, section.front + 0.03 + (rng() - 0.5) * 0.18);
    scale.setScalar(0.018 + rng() * 0.018); matrix.compose(position, quaternion, scale); glia.setMatrixAt(index, matrix);
  }
  glia.instanceMatrix.needsUpdate = true; glia.name = `${section.short} representative glia`;
  group.add(glia);

  const synapseCount = section.id === 'm1' ? 620 : 720, synapsePositions = [];
  for (let index = 0; index < synapseCount; index++) {
    const u = 0.03 + rng() * 0.94, depth = rng() * section.thickness;
    const sample = sampleRibbon(section, u, depth);
    synapsePositions.push(sample.point.x, sample.point.y, section.front + 0.10 + (rng() - 0.5) * 0.22);
  }
  const synapseGeometry = new T.BufferGeometry();
  synapseGeometry.setAttribute('position', new T.Float32BufferAttribute(synapsePositions, 3));
  const puncta = new T.Points(synapseGeometry, new T.PointsMaterial({ color: 0xf1c68f, size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.52, depthWrite: false }));
  puncta.name = `${section.short} representative synaptic puncta (not mapped contacts)`;
  group.add(puncta);

  const vesselMaterial = new T.MeshStandardMaterial({ color: 0x8f6d70, roughness: 0.65, transparent: true, opacity: 0.55, depthWrite: false });
  for (let vessel = 0; vessel < 5; vessel++) {
    const u = 0.1 + vessel * 0.19 + (rng() - 0.5) * 0.035;
    const points = [];
    for (let step = 0; step < 8; step++) {
      const depth = (step / 7) * (section.thickness + 0.7), sample = sampleRibbon(section, u + Math.sin(step * 1.3 + vessel) * 0.012, depth);
      points.push(new T.Vector3(sample.point.x, sample.point.y, section.front - 0.12 + (vessel % 2) * 0.07));
    }
    const vesselMesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 28, 0.018 + rng() * 0.012, 6, false), vesselMaterial);
    vesselMesh.name = `${section.short} representative microvessel`;
    group.add(vesselMesh);
  }
  return { group };
}

function makeBundle(points, count, color, radius, seed, name) {
  const group = new T.Group(), rng = random(seed);
  const material = new T.MeshStandardMaterial({ color, roughness: 0.45, transparent: true, opacity: 0.42, depthWrite: false });
  for (let index = 0; index < count; index++) {
    const jittered = points.map((point, pointIndex) => point.clone().add(new T.Vector3(
      (rng() - 0.5) * (pointIndex === 0 || pointIndex === points.length - 1 ? 0.12 : 0.62),
      (rng() - 0.5) * 0.48,
      (rng() - 0.5) * 0.48,
    )));
    const curve = new T.CatmullRomCurve3(jittered, false, 'centripetal', 0.45);
    const mesh = new T.Mesh(new T.TubeGeometry(curve, 54, radius * (0.7 + rng() * 0.65), 6, false), material.clone());
    mesh.material.opacity = 0.24 + rng() * 0.26;
    group.add(mesh);
  }
  group.name = name;
  return group;
}

function makeDkiTracts() {
  const group = new T.Group();
  group.name = 'DKI-informed orientation envelopes';
  const m1 = makeBundle([
    new T.Vector3(0.35,-5.1,10.8), new T.Vector3(0.0,-7.4,7.2), new T.Vector3(-3.0,-11.5,2.2),
    new T.Vector3(-9.0,-16,-2.5), new T.Vector3(-15,-24,-5.5),
  ], 12, 0xe7a37d, 0.035, 9021, 'M1 corticofugal / corticospinal orientation family');
  const s1 = makeBundle([
    new T.Vector3(-18,-23,-12.5), new T.Vector3(-10,-15,-13.0), new T.Vector3(-4.0,-9.0,-12.8),
    new T.Vector3(-0.45,-5.0,-11.9), new T.Vector3(-0.35,0.4,-10.8),
  ], 13, 0x76cbd1, 0.032, 11903, 'S1 thalamocortical orientation family');
  const uFibers = makeBundle([
    new T.Vector3(0.35,-5.1,7.6), new T.Vector3(1.0,-7.2,3.2), new T.Vector3(0,-8.2,-1.0),
    new T.Vector3(-1.0,-7.2,-6.1), new T.Vector3(-0.35,-5.0,-9.7),
  ], 9, 0xb7a4d8, 0.025, 7823, 'Short association U-fiber orientation family');
  group.add(m1, s1, uFibers);
  return group;
}

function makeMriContext() {
  const group = new T.Group();
  group.name = 'Schematic coronal MRI registration context';
  const background = new T.Mesh(new T.PlaneGeometry(24.5, 16.7), new T.MeshBasicMaterial({ color: 0x05090c, transparent: true, opacity: 0.62, depthWrite: false, side: T.DoubleSide }));
  background.position.z = -14.5;
  group.add(background);
  const outlinePoints = [];
  for (let i = 0; i <= 80; i++) {
    const angle = (i / 80) * Math.PI * 2;
    outlinePoints.push(new T.Vector3(Math.cos(angle) * 11.2, Math.sin(angle) * 7.3 - 0.2, -14.35));
  }
  group.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(outlinePoints), new T.LineBasicMaterial({ color: 0x86939b, transparent: true, opacity: 0.38 })));
  const midline = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-7.1,-14.3),new T.Vector3(0,6.4,-14.3)]), new T.LineDashedMaterial({ color: 0xa7afb2, dashSize: 0.25, gapSize: 0.19, transparent: true, opacity: 0.26 }));
  midline.computeLineDistances(); group.add(midline);
  return group;
}

function makeSensorimotorCortex() {
  const root = new T.Group();
  root.name = 'Finger Atlas V4 paired M1 and S1 coronal cortex';
  root.position.copy(PAIR_CENTER);
  root.userData = { sensorimotorCortex: true, source: '/assets/finger-pathway-atlas/v4/cortex-sources.json' };
  const mri = makeMriContext(), sections = SECTION_SPECS.map(makeSection), dki = makeDkiTracts();
  root.add(mri, ...sections.map(section => section.group), dki);
  return { root, sections, dki, mri };
}

function injectStyles() {
  if (document.getElementById('sensorimotor-cortex-style')) return;
  const style = document.createElement('style');
  style.id = 'sensorimotor-cortex-style';
  style.textContent = `
    #sensorimotor-cortex-panel{position:absolute;z-index:13;right:18px;top:126px;width:min(330px,calc(100% - 36px));padding:14px 15px 13px;border:1px solid rgba(181,209,215,.28);background:rgba(5,12,17,.88);backdrop-filter:blur(13px);box-shadow:0 18px 48px rgba(0,0,0,.3);color:#d9e5e6;font:12px/1.42 ui-monospace,SFMono-Regular,Menlo,monospace}
    #sensorimotor-cortex-panel[hidden]{display:none}
    #sensorimotor-cortex-panel .smc-kicker{font-size:10px;letter-spacing:.16em;color:#9fc4c9;text-transform:uppercase}
    #sensorimotor-cortex-panel h3{margin:6px 0 5px;font:500 18px/1.08 Georgia,serif;color:#f1eee8}
    #sensorimotor-cortex-panel p{margin:0 0 9px;color:#b8c7ca}
    #sensorimotor-cortex-panel .smc-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 10px}
    #sensorimotor-cortex-panel button{min-height:34px;border:1px solid rgba(174,207,212,.28);background:rgba(128,165,174,.11);color:#dfe9ea;padding:7px 8px;font:inherit;cursor:pointer}
    #sensorimotor-cortex-panel button:hover{background:rgba(128,165,174,.22)}
    #sensorimotor-cortex-panel label{display:flex;align-items:center;gap:8px;margin:6px 0;color:#d0dcde}
    #sensorimotor-cortex-panel input{accent-color:#9bcdd1}
    #sensorimotor-cortex-panel .smc-status{margin-top:8px;padding-top:8px;border-top:1px solid rgba(181,209,215,.16);color:#97aeb2;font-size:10px;letter-spacing:.05em;text-transform:uppercase}
    #sensorimotor-cortex-panel .smc-boundary{margin-top:8px;color:#91a3a7;font-size:10px;line-height:1.35}
    .smc-label{position:absolute;z-index:12;transform:translate(-50%,-50%);pointer-events:none;padding:3px 5px;border:1px solid rgba(191,218,222,.2);background:rgba(4,10,14,.7);color:#e0e9e9;font:10px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;text-shadow:0 1px 2px #000}
    .smc-label.smc-region{font-size:11px;letter-spacing:.08em;color:#f2eee8}
    .smc-label.smc-layer{border:0;background:rgba(4,10,14,.54);color:#c7d4d5}
    .smc-label.smc-h01{color:#e9c49e;border-color:rgba(233,196,158,.34)}
    @media(max-width:780px){#sensorimotor-cortex-panel{top:112px;right:10px;width:min(310px,calc(100% - 20px));max-height:44vh;overflow:auto}.smc-label.smc-layer{display:none}}
  `;
  document.head.appendChild(style);
}

function ensurePanel(context) {
  if (context.panel?.isConnected) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  const panel = document.createElement('section');
  panel.id = 'sensorimotor-cortex-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="smc-kicker">CORONAL SENSORIMOTOR CORTEX</div>
    <h3>Precentral M1 + postcentral S1</h3>
    <p>Two registered cut faces remain visible together: six layers in each gyrus, H01-inspired cellular sampling, and DKI-informed tract orientation.</p>
    <div class="smc-actions"><button type="button" data-smc-frame>Frame both sections</button><button type="button" data-smc-zoom>Dual cellular zoom</button></div>
    <label><input type="checkbox" data-smc-layers checked> Six cortical layers</label>
    <label><input type="checkbox" data-smc-cells checked> H01-inspired cells and neuropil</label>
    <label><input type="checkbox" data-smc-dki checked> DKI orientation envelopes</label>
    <div class="smc-status" data-smc-status>Paired anatomical view</div>
    <div class="smc-boundary">H01 is a temporal-cortex EM reference, not an M1/S1 reconstruction. BigBrain supplies region-specific laminar priors. DKI supplies voxel-scale orientation distributions, not individual axon traces.</div>
  `;
  stage.appendChild(panel);
  context.panel = panel;
  const request = () => context.controls?.dispatchEvent({ type: 'change' });
  panel.querySelector('[data-smc-frame]').addEventListener('click', () => framePair(context, 31));
  panel.querySelector('[data-smc-zoom]').addEventListener('click', () => framePair(context, 25.5));
  panel.querySelector('[data-smc-layers]').addEventListener('change', event => { context.state.layers = event.target.checked; request(); });
  panel.querySelector('[data-smc-cells]').addEventListener('change', event => { context.state.cells = event.target.checked; request(); });
  panel.querySelector('[data-smc-dki]').addEventListener('change', event => { context.state.dki = event.target.checked; request(); });
}

function framePair(context, distance) {
  if (!context.camera) return;
  const target = PAIR_CENTER.clone();
  const aspectScale = context.camera.aspect < 1 ? 1 / Math.max(0.58, context.camera.aspect) : 1;
  const direction = new T.Vector3(1.0, 0.03, 0.5).normalize();
  context.camera.position.copy(target).addScaledVector(direction, distance * aspectScale);
  if (context.controls) {
    context.controls.target.copy(target);
    context.controls.update();
    context.controls.dispatchEvent({ type: 'change' });
  } else {
    context.camera.lookAt(target);
    context.camera.updateMatrixWorld();
  }
}

function createLabel(stage, text, className) {
  const element = document.createElement('div');
  element.className = `smc-label ${className}`;
  element.textContent = text;
  element.hidden = true;
  stage.appendChild(element);
  return element;
}

function ensureLabels(context) {
  if (context.labels.length || !context.model) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  for (const section of context.model.sections) {
    context.labels.push({ element: createLabel(stage, section.name, 'smc-region'), section, local: section.labelAnchor, level: 'region' });
    context.labels.push({ element: createLabel(stage, `${section.short} · H01-scale 1 mm³ window`, 'smc-h01'), section, local: section.h01Anchor, level: 'h01' });
    section.layerAnchors.forEach((anchor, index) => context.labels.push({ element: createLabel(stage, LAYER_NAMES[index], 'smc-layer'), section, local: anchor, level: 'layer' }));
  }
  context.labels.push({ element: createLabel(stage, 'CENTRAL SULCUS', 'smc-region'), section: { center: new T.Vector3() }, local: new T.Vector3(0, -6.2, -1.0), level: 'region' });
}

function isCortexActive() {
  return document.querySelector('.region-button[data-region="cortex"].active') !== null || location.hash.includes('view=cortex');
}

function updateDom(context, active, distance) {
  ensurePanel(context); ensureLabels(context);
  if (context.panel) {
    context.panel.hidden = !active;
    const status = context.panel.querySelector('[data-smc-status]');
    if (status) status.textContent = distance < 29 ? 'Dual H01-inspired cellular LOD · both cut faces retained' : distance < 70 ? 'Six-layer paired coronal LOD' : 'Gross paired gyri LOD';
  }
  if (active && !context.wasCortexActive) {
    context.wasCortexActive = true;
    clearTimeout(context.autoFrameTimer);
    context.autoFrameTimer = setTimeout(() => { if (isCortexActive()) framePair(context, 32); }, 720);
  } else if (!active) {
    context.wasCortexActive = false;
    clearTimeout(context.autoFrameTimer);
  }
  const button = document.querySelector('.region-button[data-region="cortex"]');
  if (button && !button.dataset.sensorimotorRenamed) {
    const textNode = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.nodeValue = 'M1 + S1 coronal cortex';
    button.dataset.sensorimotorRenamed = 'true';
  }
  if (active) {
    const title = document.getElementById('view-title'), description = document.getElementById('view-description'), eyebrow = document.getElementById('view-eyebrow');
    if (title) title.textContent = 'M1 + S1 paired coronal sections';
    if (description) description.textContent = 'Precentral motor and postcentral sensory gyri, each with six cortical layers; both cross-sections stay visible in the shared zoom.';
    if (eyebrow) eyebrow.textContent = distance < 29 ? 'H01-INSPIRED MICROSTRUCTURE / DUAL CROSS-SECTION' : 'MRI CORONAL ORIENTATION / PRECENTRAL + POSTCENTRAL';
  }
}

function updateLabels(context, active, distance) {
  const stage = document.getElementById('stage');
  if (!stage || !context.camera) return;
  const width = stage.clientWidth, height = stage.clientHeight;
  const occupied = [];
  for (const label of context.labels) {
    const visibleLevel = label.level === 'region' ? distance < 90 : label.level === 'h01' ? distance < 38 : distance < 36;
    if (!active || !visibleLevel) { label.element.hidden = true; continue; }
    const world = label.local.clone().add(label.section.center).add(PAIR_CENTER).project(context.camera);
    const x = (world.x * 0.5 + 0.5) * width, y = (-world.y * 0.5 + 0.5) * height;
    let show = world.z > -1 && world.z < 1 && x > 34 && x < width - 34 && y > 115 && y < height - 84;
    if (show && label.level === 'layer' && occupied.some(point => Math.abs(point[0] - x) < 85 && Math.abs(point[1] - y) < 16)) show = false;
    label.element.hidden = !show;
    if (show) { label.element.style.left = `${x}px`; label.element.style.top = `${y}px`; occupied.push([x,y]); }
  }
}

function hideGenericCortex(context) {
  if (!context.scene) return;
  const now = performance.now();
  if (!context.lastCortexScan || now - context.lastCortexScan > 800) {
    context.genericCortex.length = 0;
    context.scene.traverse(object => {
      if (object.isMesh && object.userData?.category === 'cortex' && !object.userData?.sensorimotorCortex) context.genericCortex.push(object);
    });
    context.lastCortexScan = now;
  }
  context.genericCortex.forEach(object => { object.visible = false; });
}

function updateModel(context) {
  if (!context.model || !context.camera) return;
  const distance = context.camera.position.distanceTo(PAIR_CENTER), active = isCortexActive();
  context.model.sections.forEach(section => {
    section.layerGroup.visible = context.state.layers && distance < 95;
    section.microGroup.visible = context.state.cells && distance < 42;
  });
  context.model.dki.visible = context.state.dki && distance < 175;
  context.model.mri.visible = distance < 120;
  updateDom(context, active, distance);
  updateLabels(context, active, distance);
  hideGenericCortex(context);
}

function attach(context, scene, camera, renderer) {
  context.scene = scene; context.camera = camera; context.renderer = renderer;
  if (!context.model) {
    context.model = makeSensorimotorCortex();
    scene.add(context.model.root);
  } else if (context.model.root.parent !== scene) scene.add(context.model.root);
  updateModel(context);
}

function patchControls(context) {
  if (OrbitControls.prototype[PATCHED_CONTROLS]) return;
  const original = OrbitControls.prototype.update;
  OrbitControls.prototype.update = function (...args) {
    if (this.domElement?.id === 'viewport') {
      const active = globalThis[INSTALL_KEY];
      if (active) { active.controls = this; active.camera = this.object; }
    }
    return original.apply(this, args);
  };
  OrbitControls.prototype[PATCHED_CONTROLS] = true;
}

function patchRenderer() {
  if (T.WebGLRenderer.prototype[PATCHED_RENDERER]) return;
  const original = T.WebGLRenderer.prototype.render;
  T.WebGLRenderer.prototype.render = function (scene, camera) {
    const context = globalThis[INSTALL_KEY];
    if (context && this.domElement?.id === 'viewport') attach(context, scene, camera, this);
    return original.call(this, scene, camera);
  };
  T.WebGLRenderer.prototype[PATCHED_RENDERER] = true;
}

export function installSensorimotorCortex() {
  if (globalThis[INSTALL_KEY]) return globalThis[INSTALL_KEY];
  injectStyles();
  const context = {
    scene: null, camera: null, renderer: null, controls: null, model: null, panel: null,
    labels: [], genericCortex: [], lastCortexScan: 0, wasCortexActive: false, autoFrameTimer: 0,
    state: { layers: true, cells: true, dki: true },
  };
  globalThis[INSTALL_KEY] = context;
  patchControls(context); patchRenderer();
  return context;
}
