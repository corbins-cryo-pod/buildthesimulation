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
  for (const s of engine.state.detectedSpikes) {
    if (s.idx >= nShow || s.tMs < t0) continue;
    const x = ((s.tMs - t0) / 2000) * w, y = ((s.idx + 0.5) / nShow) * h;
    rasterCtx.fillRect(x, y, 2, 2);
  }
}

function drawTracePanels() {
  const w = traces.width, h = traces.height;
  traceCtx.clearRect(0, 0, w, h);
  traceCtx.fillStyle = "#0f0f14";
  traceCtx.fillRect(0, 0, w, h);

  const tracesByEl = engine.state.tracesByElectrode;
  const n = Math.max(1, Math.min(tracesByEl.length, 6));
  const rowH = h / n;

  for (let i = 0; i < n; i++) {
    const y0 = i * rowH;
    const yc = y0 + rowH * 0.5;

    traceCtx.strokeStyle = "rgba(255,255,255,0.08)";
    traceCtx.beginPath();
    traceCtx.moveTo(0, yc);
    traceCtx.lineTo(w, yc);
    traceCtx.stroke();

    traceCtx.fillStyle = i === selected ? "#ffd6d6" : "rgba(255,255,255,0.72)";
    traceCtx.font = "11px Times New Roman";
    traceCtx.fillText(`E${i + 1}`, 8, y0 + 14);

    const t = tracesByEl[i];
    traceCtx.strokeStyle = i === selected ? "#ff7f7f" : "#8fb3ff";
    traceCtx.lineWidth = 1.2;
    traceCtx.beginPath();
    for (let j = 0; j < t.length; j++) {
      const x = (j / (t.length - 1)) * w;
      const y = yc - t[j] * 0.33;
      if (j === 0) traceCtx.moveTo(x, y);
      else traceCtx.lineTo(x, y);
    }
    traceCtx.stroke();

    if (i < n - 1) {
      traceCtx.strokeStyle = "rgba(255,255,255,0.06)";
      traceCtx.beginPath();
      traceCtx.moveTo(0, y0 + rowH);
      traceCtx.lineTo(w, y0 + rowH);
      traceCtx.stroke();
    }
  }
}

function resize() { scene.resize(); }
window.addEventListener("resize", resize);
resize();
refreshUI();

canvas.addEventListener("click", (ev) => {
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
    for (let i = 0; i < steps; i++) engine.step((elapsed / steps) * speed, electrodes, selected);
  }
  scene.updateNeuronActivity(engine.state.neuronActivity);
  scene.render();
  drawRaster();
  drawTracePanels();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
