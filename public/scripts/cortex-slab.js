import * as THREE from "https://esm.sh/three@0.170.0";
import { OrbitControls } from "https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js";

const $ = (id) => document.getElementById(id);

const canvas = $("cortex3d");
const raster = $("raster");
const traces = $("traces");
if (!canvas || !raster || !traces) {
  throw new Error("Cortex sim: missing canvas elements");
}

const ui = {
  paused: $("paused"),
  speed: $("speed"),
  nShow: $("nShow"),
  elecX: $("elecX"),
  elecY: $("elecY"),
  elecZ: $("elecZ"),
  elecXRange: $("elecXRange"),
  elecYRange: $("elecYRange"),
  elecZRange: $("elecZRange"),
  viewReset: $("viewReset"),
  viewTop: $("viewTop"),
  viewSide: $("viewSide"),
};

const cfg = {
  bounds: { min: [-1000, -1000, 0], max: [1000, 1000, 1500] },
  dtMs: 10,
  sampleRate: 1000,
  nNeurons: 1600,
};

const rand = (() => {
  let a = 1337 >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

const neurons = Array.from({ length: cfg.nNeurons }, (_, i) => {
  const x = cfg.bounds.min[0] + rand() * (cfg.bounds.max[0] - cfg.bounds.min[0]);
  const y = cfg.bounds.min[1] + rand() * (cfg.bounds.max[1] - cfg.bounds.min[1]);
  const zt = rand();
  const z = cfg.bounds.min[2] + zt * zt * (cfg.bounds.max[2] - cfg.bounds.min[2]);
  return { id: i, pos: [x, y, z], hz: 0.6 + rand() * 7.5 };
});

// ---------- 3D ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(2.3, -2.0, 1.6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0.75);
controls.minDistance = 1.2;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.42));
const key = new THREE.DirectionalLight(0xffffff, 0.95);
key.position.set(2, -2, 3);
scene.add(key);

const grid = new THREE.GridHelper(4.5, 18, 0x3c3c48, 0x2d2d36);
grid.material.transparent = true;
grid.material.opacity = 0.26;
scene.add(grid);

const umToMm = (v) => v / 1000;
const b = cfg.bounds;
const slabSize = new THREE.Vector3(
  umToMm(b.max[0] - b.min[0]),
  umToMm(b.max[1] - b.min[1]),
  umToMm(b.max[2] - b.min[2])
);
const slab = new THREE.Mesh(
  new THREE.BoxGeometry(slabSize.x, slabSize.y, slabSize.z),
  new THREE.MeshPhongMaterial({ color: 0xf4efe9, transparent: true, opacity: 0.14 })
);
slab.position.set(0, 0, umToMm((b.max[2] + b.min[2]) * 0.5));
scene.add(slab);

const pts = new Float32Array(neurons.length * 3);
for (let i = 0; i < neurons.length; i++) {
  pts[i * 3 + 0] = umToMm(neurons[i].pos[0]);
  pts[i * 3 + 1] = umToMm(neurons[i].pos[1]);
  pts[i * 3 + 2] = umToMm(neurons[i].pos[2]);
}
const nGeo = new THREE.BufferGeometry();
nGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
const nMat = new THREE.PointsMaterial({ color: 0xb7c9ff, size: 0.012, transparent: true, opacity: 0.6 });
const nCloud = new THREE.Points(nGeo, nMat);
scene.add(nCloud);

const electrodeGroup = new THREE.Group();
scene.add(electrodeGroup);
const shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.008, 0.008, 1.2, 16),
  new THREE.MeshPhongMaterial({ color: 0x6f7786, shininess: 90 })
);
const tip = new THREE.Mesh(
  new THREE.SphereGeometry(0.018, 20, 20),
  new THREE.MeshPhongMaterial({ color: 0xe04444, shininess: 120 })
);
electrodeGroup.add(shaft);
electrodeGroup.add(tip);

function electrodePosUm() {
  return [Number(ui.elecX.value), Number(ui.elecY.value), Number(ui.elecZ.value)];
}

function syncPair(a, b) {
  const v = a.value;
  if (b.value !== v) b.value = v;
}

function updateElectrodeMesh() {
  const [x, y, z] = electrodePosUm();
  const mx = umToMm(x);
  const my = umToMm(y);
  const mz = umToMm(z);
  const topZ = umToMm(cfg.bounds.max[2] + 120);
  tip.position.set(mx, my, mz);
  shaft.position.set(mx, my, (topZ + mz) * 0.5);
  shaft.scale.set(1, Math.max(0.05, topZ - mz), 1);
}

for (const [n, r] of [[ui.elecX, ui.elecXRange], [ui.elecY, ui.elecYRange], [ui.elecZ, ui.elecZRange]]) {
  n.addEventListener("input", () => {
    syncPair(n, r);
    updateElectrodeMesh();
  });
  r.addEventListener("input", () => {
    syncPair(r, n);
    updateElectrodeMesh();
  });
}

function setView(mode) {
  if (mode === "reset") {
    camera.position.set(2.3, -2.0, 1.6);
    controls.target.set(0, 0, 0.75);
  }
  if (mode === "top") {
    camera.position.set(0.001, 0.001, 4.2);
    controls.target.set(0, 0, 0.75);
  }
  if (mode === "side") {
    camera.position.set(4.2, 0.001, 0.95);
    controls.target.set(0, 0, 0.75);
  }
  controls.update();
}
ui.viewReset?.addEventListener("click", () => setView("reset"));
ui.viewTop?.addEventListener("click", () => setView("top"));
ui.viewSide?.addEventListener("click", () => setView("side"));

function resize3D() {
  const w = Math.max(320, canvas.clientWidth);
  const h = Math.max(280, canvas.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize3D);
resize3D();
updateElectrodeMesh();

// ---------- Signal model ----------
const rasterCtx = raster.getContext("2d");
const traceCtx = traces.getContext("2d");
const traceWindowS = 2;
const traceN = traceWindowS * cfg.sampleRate;
let trace = new Float32Array(traceN);
let tMs = 0;
let recentSpikes = []; // {tMs, idx}

function spikeKernel(len = 24) {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / cfg.sampleRate;
    out[i] = (Math.exp(-t / 0.003) - Math.exp(-t / 0.0008)) * 1.6;
  }
  return out;
}
const kernel = spikeKernel();

function stepModel(stepMs) {
  const dtS = stepMs / 1000;
  const newSpikes = [];
  for (let i = 0; i < neurons.length; i++) {
    if (rand() < neurons[i].hz * dtS) {
      newSpikes.push({ tMs: tMs + rand() * stepMs, idx: i });
    }
  }
  recentSpikes = recentSpikes.concat(newSpikes).filter((s) => s.tMs > tMs - 2000);

  const addSamp = Math.max(1, Math.floor((stepMs / 1000) * cfg.sampleRate));
  const block = new Float32Array(addSamp);
  const e = electrodePosUm();
  const baseUv = 90;

  for (const s of newSpikes) {
    const n = neurons[s.idx];
    const dx = n.pos[0] - e[0];
    const dy = n.pos[1] - e[1];
    const dz = n.pos[2] - e[2];
    const r = Math.hypot(dx, dy, dz);
    const gain = baseUv / (r + 45);
    const i0 = Math.floor(((s.tMs - tMs) / 1000) * cfg.sampleRate);
    for (let k = 0; k < kernel.length; k++) {
      const j = i0 + k;
      if (j >= 0 && j < block.length) block[j] += gain * kernel[k];
    }
  }

  const merged = new Float32Array(traceN);
  const keep = traceN - block.length;
  if (keep > 0) merged.set(trace.subarray(trace.length - keep), 0);
  merged.set(block.subarray(Math.max(0, block.length - traceN)), Math.max(0, keep));
  trace = merged;

  tMs += stepMs;
}

function drawRaster() {
  const ctx = rasterCtx;
  const w = raster.width;
  const h = raster.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, w, h);

  const nShow = Number(ui.nShow.value);
  const now = tMs;
  const t0 = now - 2000;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = (h * i) / 4;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.fillStyle = "#a9bcff";
  for (const s of recentSpikes) {
    if (s.idx >= nShow || s.tMs < t0) continue;
    const x = ((s.tMs - t0) / 2000) * w;
    const y = ((s.idx + 0.5) / nShow) * h;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawTrace() {
  const ctx = traceCtx;
  const w = traces.width;
  const h = traces.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  ctx.strokeStyle = "#ff7272";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < trace.length; i++) {
    const x = (i / (trace.length - 1)) * w;
    const y = h * 0.5 - trace[i] * 0.55;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

let last = performance.now();
function loop(now) {
  const elapsed = Math.min(50, now - last);
  last = now;

  if (!ui.paused.checked) {
    const speed = Number(ui.speed.value || 1);
    const steps = Math.max(1, Math.round(speed));
    for (let i = 0; i < steps; i++) stepModel((elapsed / steps) * speed);
  }

  controls.update();
  renderer.render(scene, camera);
  drawRaster();
  drawTrace();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
