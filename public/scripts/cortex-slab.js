import * as THREE from "https://esm.sh/three@0.170.0";
import { OrbitControls } from "https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js";

const $ = (id) => document.getElementById(id);

const canvas = $("cortex3d");
const raster = $("raster");
const traces = $("traces");
if (!canvas || !raster || !traces) throw new Error("Cortex sim: missing canvas elements");

const ui = {
  paused: $("paused"),
  speed: $("speed"),
  nShow: $("nShow"),
  elecMeta: $("elecMeta"),
  elecAdd: $("elecAdd"),
  elecRemove: $("elecRemove"),
  elecPrev: $("elecPrev"),
  elecNext: $("elecNext"),
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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
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
const slab = new THREE.Mesh(
  new THREE.BoxGeometry(umToMm(b.max[0] - b.min[0]), umToMm(b.max[1] - b.min[1]), umToMm(b.max[2] - b.min[2])),
  new THREE.MeshPhongMaterial({ color: 0xf4efe9, transparent: true, opacity: 0.14 })
);
slab.position.set(0, 0, umToMm((b.max[2] + b.min[2]) * 0.5));
scene.add(slab);

const pts = new Float32Array(neurons.length * 3);
for (let i = 0; i < neurons.length; i++) {
  pts[i * 3] = umToMm(neurons[i].pos[0]);
  pts[i * 3 + 1] = umToMm(neurons[i].pos[1]);
  pts[i * 3 + 2] = umToMm(neurons[i].pos[2]);
}
const nCloud = new THREE.Points(
  new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pts, 3)),
  new THREE.PointsMaterial({ color: 0xb7c9ff, size: 0.012, transparent: true, opacity: 0.6 })
);
scene.add(nCloud);

const electrodeGroup = new THREE.Group();
scene.add(electrodeGroup);
let electrodes = [{ x: 0, y: 0, z: 900 }];
let selected = 0;

function syncPair(a, b) { if (b.value !== a.value) b.value = a.value; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function selectedElectrode() { return electrodes[selected]; }

function syncUiFromSelected() {
  const e = selectedElectrode();
  ui.elecX.value = String(Math.round(e.x));
  ui.elecY.value = String(Math.round(e.y));
  ui.elecZ.value = String(Math.round(e.z));
  ui.elecXRange.value = ui.elecX.value;
  ui.elecYRange.value = ui.elecY.value;
  ui.elecZRange.value = ui.elecZ.value;
  if (ui.elecMeta) ui.elecMeta.textContent = `${electrodes.length} electrode${electrodes.length > 1 ? "s" : ""} · selected E${selected + 1}`;
}

function redrawElectrodes() {
  electrodeGroup.clear();
  electrodes.forEach((e, idx) => {
    const isSel = idx === selected;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(isSel ? 0.022 : 0.016, 20, 20),
      new THREE.MeshPhongMaterial({ color: isSel ? 0xff5d5d : 0xc73535, shininess: 120 })
    );
    mesh.position.set(umToMm(e.x), umToMm(e.y), umToMm(e.z));
    electrodeGroup.add(mesh);
  });
}

function updateSelectedFromInputs() {
  const e = selectedElectrode();
  e.x = clamp(Number(ui.elecX.value), -1000, 1000);
  e.y = clamp(Number(ui.elecY.value), -1000, 1000);
  e.z = clamp(Number(ui.elecZ.value), 50, 1450);
  syncUiFromSelected();
  redrawElectrodes();
}

for (const [n, r] of [[ui.elecX, ui.elecXRange], [ui.elecY, ui.elecYRange], [ui.elecZ, ui.elecZRange]]) {
  n?.addEventListener("input", () => { syncPair(n, r); updateSelectedFromInputs(); });
  r?.addEventListener("input", () => { syncPair(r, n); updateSelectedFromInputs(); });
}

ui.elecAdd?.addEventListener("click", () => {
  const e = selectedElectrode();
  electrodes.push({ x: e.x + 60, y: e.y + 60, z: e.z });
  selected = electrodes.length - 1;
  syncUiFromSelected();
  redrawElectrodes();
});

ui.elecRemove?.addEventListener("click", () => {
  if (electrodes.length <= 1) return;
  electrodes.splice(selected, 1);
  selected = Math.max(0, Math.min(selected, electrodes.length - 1));
  syncUiFromSelected();
  redrawElectrodes();
});

ui.elecPrev?.addEventListener("click", () => {
  selected = (selected - 1 + electrodes.length) % electrodes.length;
  syncUiFromSelected();
  redrawElectrodes();
});
ui.elecNext?.addEventListener("click", () => {
  selected = (selected + 1) % electrodes.length;
  syncUiFromSelected();
  redrawElectrodes();
});

function setView(mode) {
  if (mode === "reset") { camera.position.set(2.3, -2.0, 1.6); controls.target.set(0, 0, 0.75); }
  if (mode === "top") { camera.position.set(0.001, 0.001, 4.2); controls.target.set(0, 0, 0.75); }
  if (mode === "side") { camera.position.set(4.2, 0.001, 0.95); controls.target.set(0, 0, 0.75); }
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
syncUiFromSelected();
redrawElectrodes();

const rasterCtx = raster.getContext("2d");
const traceCtx = traces.getContext("2d");
const traceN = 2 * cfg.sampleRate;
let trace = new Float32Array(traceN);
let tMs = 0;
let recentSpikes = [];

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
  for (let i = 0; i < neurons.length; i++) if (rand() < neurons[i].hz * dtS) newSpikes.push({ tMs: tMs + rand() * stepMs, idx: i });
  recentSpikes = recentSpikes.concat(newSpikes).filter((s) => s.tMs > tMs - 2000);

  const addSamp = Math.max(1, Math.floor((stepMs / 1000) * cfg.sampleRate));
  const block = new Float32Array(addSamp);
  const e = selectedElectrode();

  for (const s of newSpikes) {
    const n = neurons[s.idx];
    const r = Math.hypot(n.pos[0] - e.x, n.pos[1] - e.y, n.pos[2] - e.z);
    const gain = 90 / (r + 45);
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
  const w = raster.width, h = raster.height;
  rasterCtx.clearRect(0, 0, w, h);
  rasterCtx.fillStyle = "#0f0f14"; rasterCtx.fillRect(0, 0, w, h);
  const nShow = Number(ui.nShow.value), t0 = tMs - 2000;
  rasterCtx.strokeStyle = "rgba(255,255,255,0.08)"; rasterCtx.beginPath();
  for (let i = 0; i <= 4; i++) { const y = (h * i) / 4; rasterCtx.moveTo(0, y); rasterCtx.lineTo(w, y); }
  rasterCtx.stroke();
  rasterCtx.fillStyle = "#a9bcff";
  for (const s of recentSpikes) {
    if (s.idx >= nShow || s.tMs < t0) continue;
    const x = ((s.tMs - t0) / 2000) * w, y = ((s.idx + 0.5) / nShow) * h;
    rasterCtx.fillRect(x, y, 2, 2);
  }
}

function drawTrace() {
  const w = traces.width, h = traces.height;
  traceCtx.clearRect(0, 0, w, h);
  traceCtx.fillStyle = "#0f0f14"; traceCtx.fillRect(0, 0, w, h);
  traceCtx.strokeStyle = "rgba(255,255,255,0.10)"; traceCtx.beginPath(); traceCtx.moveTo(0, h * 0.5); traceCtx.lineTo(w, h * 0.5); traceCtx.stroke();
  traceCtx.strokeStyle = "#ff7272"; traceCtx.lineWidth = 1.4; traceCtx.beginPath();
  for (let i = 0; i < trace.length; i++) {
    const x = (i / (trace.length - 1)) * w, y = h * 0.5 - trace[i] * 0.55;
    if (i === 0) traceCtx.moveTo(x, y); else traceCtx.lineTo(x, y);
  }
  traceCtx.stroke();
}

let last = performance.now();
function loop(now) {
  const elapsed = Math.min(50, now - last); last = now;
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
