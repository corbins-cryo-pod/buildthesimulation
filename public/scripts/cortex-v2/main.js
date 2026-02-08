import { createEngine } from "./engine.js";
import { createScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const canvas = $("cortex3d");
const raster = $("raster");
const traces = $("traces");
if (!canvas || !raster || !traces) throw new Error("Cortex v2: missing required canvas elements");

const ui = {
  paused: $("paused"), speed: $("speed"), nShow: $("nShow"), elecMeta: $("elecMeta"),
  elecAdd: $("elecAdd"), elecRemove: $("elecRemove"), elecPrev: $("elecPrev"), elecNext: $("elecNext"),
  elecX: $("elecX"), elecY: $("elecY"), elecZ: $("elecZ"), elecXRange: $("elecXRange"), elecYRange: $("elecYRange"), elecZRange: $("elecZRange"),
  viewReset: $("viewReset"), viewTop: $("viewTop"), viewSide: $("viewSide"),
};

const config = {
  seed: 1337,
  bounds: { min: [-1000, -1000, 0], max: [1000, 1000, 1500] },
  nNeurons: 1600,
  sampleRateHz: 1000,
  traceWindowS: 2,
  baseUv: 90,
  r0Um: 45,
};

const engine = createEngine(config);
const scene = createScene(canvas, config.bounds, engine.state.neurons);
const rasterCtx = raster.getContext("2d");
const traceCtx = traces.getContext("2d");

let electrodes = [{ x: 0, y: 0, z: 900 }];
let selected = 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const current = () => electrodes[selected];
const syncPair = (a, b) => { if (b.value !== a.value) b.value = a.value; };

function refreshUI() {
  const e = current();
  ui.elecX.value = String(Math.round(e.x));
  ui.elecY.value = String(Math.round(e.y));
  ui.elecZ.value = String(Math.round(e.z));
  ui.elecXRange.value = ui.elecX.value;
  ui.elecYRange.value = ui.elecY.value;
  ui.elecZRange.value = ui.elecZ.value;
  if (ui.elecMeta) ui.elecMeta.textContent = `${electrodes.length} electrode${electrodes.length > 1 ? "s" : ""} · selected E${selected + 1}`;
  scene.drawElectrodes(electrodes, selected);
}

function updateFromInputs() {
  const e = current();
  e.x = clamp(Number(ui.elecX.value), -1000, 1000);
  e.y = clamp(Number(ui.elecY.value), -1000, 1000);
  e.z = clamp(Number(ui.elecZ.value), 50, 1450);
  refreshUI();
}

for (const [n, r] of [[ui.elecX, ui.elecXRange], [ui.elecY, ui.elecYRange], [ui.elecZ, ui.elecZRange]]) {
  n?.addEventListener("input", () => { syncPair(n, r); updateFromInputs(); });
  r?.addEventListener("input", () => { syncPair(r, n); updateFromInputs(); });
}
ui.elecAdd?.addEventListener("click", () => { const e = current(); electrodes.push({ x: e.x + 60, y: e.y + 60, z: e.z }); selected = electrodes.length - 1; refreshUI(); });
ui.elecRemove?.addEventListener("click", () => { if (electrodes.length <= 1) return; electrodes.splice(selected, 1); selected = Math.max(0, Math.min(selected, electrodes.length - 1)); refreshUI(); });
ui.elecPrev?.addEventListener("click", () => { selected = (selected - 1 + electrodes.length) % electrodes.length; refreshUI(); });
ui.elecNext?.addEventListener("click", () => { selected = (selected + 1) % electrodes.length; refreshUI(); });

ui.viewReset?.addEventListener("click", () => scene.setView("reset"));
ui.viewTop?.addEventListener("click", () => scene.setView("top"));
ui.viewSide?.addEventListener("click", () => scene.setView("side"));

function drawRaster() {
  const w = raster.width, h = raster.height;
  rasterCtx.clearRect(0, 0, w, h);
  rasterCtx.fillStyle = "#0f0f14"; rasterCtx.fillRect(0, 0, w, h);
  const nShow = Number(ui.nShow.value), t0 = engine.state.tMs - 2000;
  rasterCtx.strokeStyle = "rgba(255,255,255,0.08)"; rasterCtx.beginPath();
  for (let i = 0; i <= 4; i++) { const y = (h * i) / 4; rasterCtx.moveTo(0, y); rasterCtx.lineTo(w, y); }
  rasterCtx.stroke();
  rasterCtx.fillStyle = "#a9bcff";
  for (const s of engine.state.recentSpikes) {
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
  const t = engine.state.trace;
  for (let i = 0; i < t.length; i++) {
    const x = (i / (t.length - 1)) * w, y = h * 0.5 - t[i] * 0.55;
    if (i === 0) traceCtx.moveTo(x, y); else traceCtx.lineTo(x, y);
  }
  traceCtx.stroke();
}

function resize() { scene.resize(); }
window.addEventListener("resize", resize);
resize();
refreshUI();

let dragging = false;
let dragMoved = false;

canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0) return;
  const hit = scene.pickOnSlab(ev.clientX, ev.clientY);
  if (!hit) return;
  dragging = true;
  dragMoved = false;
  scene.setDragging(true);
  canvas.setPointerCapture?.(ev.pointerId);
  const e = current();
  e.x = clamp(hit.xUm, -1000, 1000);
  e.y = clamp(hit.yUm, -1000, 1000);
  if (ev.shiftKey) e.z = clamp(hit.zUm, 50, 1450);
  refreshUI();
});

canvas.addEventListener("pointermove", (ev) => {
  if (!dragging) return;
  const hit = scene.pickOnSlab(ev.clientX, ev.clientY);
  if (!hit) return;
  dragMoved = true;
  const e = current();
  e.x = clamp(hit.xUm, -1000, 1000);
  e.y = clamp(hit.yUm, -1000, 1000);
  if (ev.shiftKey) e.z = clamp(hit.zUm, 50, 1450);
  refreshUI();
});

function stopDrag(ev) {
  if (!dragging) return;
  dragging = false;
  scene.setDragging(false);
  if (ev && canvas.releasePointerCapture) {
    try { canvas.releasePointerCapture(ev.pointerId); } catch {}
  }
}
canvas.addEventListener("pointerup", stopDrag);
canvas.addEventListener("pointercancel", stopDrag);

canvas.addEventListener("click", (ev) => {
  if (dragMoved) { dragMoved = false; return; }
  const hit = scene.pickOnSlab(ev.clientX, ev.clientY);
  if (!hit) return;
  const e = current();
  e.x = clamp(hit.xUm, -1000, 1000);
  e.y = clamp(hit.yUm, -1000, 1000);
  if (ev.shiftKey) e.z = clamp(hit.zUm, 50, 1450);
  refreshUI();
});

let last = performance.now();
function loop(now) {
  const elapsed = Math.min(50, now - last);
  last = now;
  if (!ui.paused.checked) {
    const speed = Number(ui.speed.value || 1);
    const steps = Math.max(1, Math.round(speed));
    for (let i = 0; i < steps; i++) engine.step((elapsed / steps) * speed, current());
  }
  scene.render();
  drawRaster();
  drawTrace();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
