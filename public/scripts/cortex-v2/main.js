import { createEngine } from "./engine.js";
import { createScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const canvas = $("cortex3d");
const raster = $("raster");
const traces = $("traces");
if (!canvas || !raster || !traces) throw new Error("Cortex v2: missing required canvas elements");

const ui = {
  paused: $("paused"), speed: $("speed"), speedLabel: $("speedLabel"), elecMeta: $("elecMeta"),
  elecAdd: $("elecAdd"), elecRemove: $("elecRemove"), elecPrev: $("elecPrev"), elecNext: $("elecNext"),
  elecX: $("elecX"), elecY: $("elecY"), elecZ: $("elecZ"), elecXRange: $("elecXRange"), elecYRange: $("elecYRange"), elecZRange: $("elecZRange"),
  viewReset: $("viewReset"), viewTop: $("viewTop"), viewSide: $("viewSide"),
  spikeBandOn: $("spikeBandOn"), thrUv: $("thrUv"), traceGain: $("traceGain"), traceGainLabel: $("traceGainLabel"),
  burstSeedProb: $("burstSeedProb"), burstSeedProbLabel: $("burstSeedProbLabel"),
  recruitRadiusUm: $("recruitRadiusUm"), recruitRadiusUmLabel: $("recruitRadiusUmLabel"),
  modStrength: $("modStrength"), modStrengthLabel: $("modStrengthLabel"),
};

const config = {
  seed: 1337,
  bounds: { min: [-1000, -1000, 0], max: [1000, 1000, 1500] },
  nNeurons: 1600,
  sampleRateHz: 8000,
  traceWindowS: 2,
  baseUv: 92,
  r0Um: 45,
  noiseUv: 4.2,
  burstSeedProb: 0.04,
  recruitRadiusUm: 180,
  modStrength: 0.9,
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

const updateSpeedLabel = () => {
  if (!ui.speedLabel || !ui.speed) return;
  ui.speedLabel.textContent = `${Number(ui.speed.value).toFixed(2)}×`;
};
ui.speed?.addEventListener("input", updateSpeedLabel);

const updateTraceGainLabel = () => {
  if (!ui.traceGainLabel || !ui.traceGain) return;
  ui.traceGainLabel.textContent = `${Number(ui.traceGain.value).toFixed(2)}×`;
};
ui.traceGain?.addEventListener("input", updateTraceGainLabel);

const updateDynamicsLabels = () => {
  if (ui.burstSeedProb && ui.burstSeedProbLabel) {
    const v = Number(ui.burstSeedProb.value);
    ui.burstSeedProbLabel.textContent = v.toFixed(3);
    config.burstSeedProb = v;
  }
  if (ui.recruitRadiusUm && ui.recruitRadiusUmLabel) {
    const v = Number(ui.recruitRadiusUm.value);
    ui.recruitRadiusUmLabel.textContent = `${Math.round(v)} µm`;
    config.recruitRadiusUm = v;
  }
  if (ui.modStrength && ui.modStrengthLabel) {
    const v = Number(ui.modStrength.value);
    ui.modStrengthLabel.textContent = v.toFixed(2);
    config.modStrength = v;
  }
};
ui.burstSeedProb?.addEventListener("input", updateDynamicsLabels);
ui.recruitRadiusUm?.addEventListener("input", updateDynamicsLabels);
ui.modStrength?.addEventListener("input", updateDynamicsLabels);

const DISPLAY_WINDOW_MS = 2000;
let playheadNorm = null;

function setPlayheadFromPointer(targetCanvas, ev) {
  const rect = targetCanvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  playheadNorm = Math.max(0, Math.min(1, x / rect.width));
}

function drawRaster() {
  const w = raster.width, h = raster.height;
  rasterCtx.clearRect(0, 0, w, h);
  rasterCtx.fillStyle = "#0f0f14"; rasterCtx.fillRect(0, 0, w, h);
  const t0 = engine.state.tMs - DISPLAY_WINDOW_MS;
  const visible = engine.state.detectedSpikes.filter((s) => (s.tMs + (s.alignMs ?? 0)) >= t0);

  rasterCtx.strokeStyle = "rgba(255,255,255,0.08)";
  rasterCtx.beginPath();
  for (let i = 0; i <= 4; i++) { const y = (h * i) / 4; rasterCtx.moveTo(0, y); rasterCtx.lineTo(w, y); }
  rasterCtx.stroke();

  rasterCtx.strokeStyle = "rgba(255,255,255,0.10)";
  rasterCtx.setLineDash([4, 4]);
  rasterCtx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const x = (i / 4) * w;
    rasterCtx.moveTo(x, 0);
    rasterCtx.lineTo(x, h);
  }
  rasterCtx.stroke();
  rasterCtx.setLineDash([]);

  // Stable rows: all neurons in-range for selected electrode (not just currently firing).
  const e = current();
  const allNeurons = engine.state.neurons;
  const ampScale = engine.state.neuronAmpScale;
  const ids = [];
  for (let i = 0; i < allNeurons.length; i++) {
    const n = allNeurons[i];
    const r = Math.hypot(n.pos[0] - e.x, n.pos[1] - e.y, n.pos[2] - e.z);
    const gain = (config.baseUv * ampScale[i]) / (r + config.r0Um);
    if (gain > 0.22) ids.push(i);
  }
  const rowIndex = new Map(ids.map((id, i) => [id, i]));
  const nRows = Math.max(1, ids.length);

  rasterCtx.fillStyle = "#a9bcff";
  for (const s of visible) {
    const row = rowIndex.get(s.idx);
    if (row == null) continue;
    const x = (((s.tMs + (s.alignMs ?? 0)) - t0) / DISPLAY_WINDOW_MS) * w;
    const y = ((row + 0.5) / nRows) * h;
    rasterCtx.fillRect(x, y, 2, 2);
  }

  rasterCtx.fillStyle = "rgba(255,255,255,0.78)";
  rasterCtx.font = "11px Times New Roman";
  rasterCtx.fillText(`Selected electrode: E${selected + 1} · units: ${ids.length}`, 10, 14);

  if (playheadNorm != null) {
    const px = playheadNorm * w;
    rasterCtx.strokeStyle = "rgba(255,226,130,0.95)";
    rasterCtx.lineWidth = 1;
    rasterCtx.beginPath();
    rasterCtx.moveTo(px, 0);
    rasterCtx.lineTo(px, h);
    rasterCtx.stroke();

    const dtMs = (playheadNorm - 1) * DISPLAY_WINDOW_MS;
    rasterCtx.fillStyle = "rgba(255,226,130,0.95)";
    rasterCtx.fillText(`${dtMs.toFixed(0)} ms`, Math.min(w - 56, px + 6), h - 8);
  }
}

function spikeBandFilter(input, sampleRateHz) {
  // Lightweight display filter: high-pass then low-pass (~300-3000 Hz).
  const out = new Float32Array(input.length);
  const hpA = Math.exp(-2 * Math.PI * 300 / sampleRateHz);
  const lpA = Math.exp(-2 * Math.PI * 3000 / sampleRateHz);
  let hpY = 0;
  let hpXPrev = input[0] || 0;
  let lpY = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    hpY = hpA * (hpY + x - hpXPrev);
    hpXPrev = x;
    lpY = lpY + (1 - lpA) * (hpY - lpY);
    out[i] = lpY;
  }
  return out;
}

function drawTracePanels() {
  const w = traces.width, h = traces.height;
  traceCtx.clearRect(0, 0, w, h);
  traceCtx.fillStyle = "#0f0f14";
  traceCtx.fillRect(0, 0, w, h);

  const tracesByEl = engine.state.tracesByElectrode;
  const n = Math.max(1, Math.min(tracesByEl.length, 6));
  const rowH = h / n;
  const thrUv = Number(ui.thrUv?.value ?? -9);
  const gainScale = Number(ui.traceGain?.value ?? 1);
  const useSpikeBand = !!ui.spikeBandOn?.checked;

  for (let i = 0; i < n; i++) {
    const y0 = i * rowH;
    const yc = y0 + rowH * 0.5;

    traceCtx.strokeStyle = "rgba(255,255,255,0.08)";
    traceCtx.beginPath();
    traceCtx.moveTo(0, yc);
    traceCtx.lineTo(w, yc);
    traceCtx.stroke();

    traceCtx.strokeStyle = "rgba(255,255,255,0.10)";
    traceCtx.setLineDash([4, 4]);
    traceCtx.beginPath();
    for (let gx = 0; gx <= 4; gx++) {
      const x = (gx / 4) * w;
      traceCtx.moveTo(x, y0);
      traceCtx.lineTo(x, y0 + rowH);
    }
    traceCtx.stroke();
    traceCtx.setLineDash([]);

    traceCtx.fillStyle = i === selected ? "#ffd6d6" : "rgba(255,255,255,0.72)";
    traceCtx.font = "11px Times New Roman";
    traceCtx.fillText(`E${i + 1}`, 8, y0 + 14);

    const raw = tracesByEl[i];
    const t = useSpikeBand ? spikeBandFilter(raw, config.sampleRateHz) : raw;
    const scale = 0.33 * gainScale;
    const yThr = yc - thrUv * scale;

    traceCtx.strokeStyle = "rgba(255,120,120,0.30)";
    traceCtx.beginPath();
    traceCtx.moveTo(0, yThr);
    traceCtx.lineTo(w, yThr);
    traceCtx.stroke();

    traceCtx.strokeStyle = i === selected ? "#ff7f7f" : "#8fb3ff";
    traceCtx.lineWidth = 1.2;
    traceCtx.beginPath();
    let prev = t[0];
    for (let j = 0; j < t.length; j++) {
      const x = (j / (t.length - 1)) * w;
      const y = yc - t[j] * scale;
      if (j === 0) traceCtx.moveTo(x, y);
      else traceCtx.lineTo(x, y);

      if (j > 0 && prev > thrUv && t[j] <= thrUv) {
        traceCtx.fillStyle = "rgba(255,170,120,0.95)";
        traceCtx.fillRect(x - 1, y0 + 2, 2, 6);
      }
      prev = t[j];
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

  if (playheadNorm != null) {
    const px = playheadNorm * w;
    traceCtx.strokeStyle = "rgba(255,226,130,0.95)";
    traceCtx.lineWidth = 1;
    traceCtx.beginPath();
    traceCtx.moveTo(px, 0);
    traceCtx.lineTo(px, h);
    traceCtx.stroke();
  }
}

function resize() { scene.resize(); }
window.addEventListener("resize", resize);
resize();
refreshUI();
updateSpeedLabel();
updateTraceGainLabel();
updateDynamicsLabels();

raster.addEventListener("mousemove", (ev) => setPlayheadFromPointer(raster, ev));
traces.addEventListener("mousemove", (ev) => setPlayheadFromPointer(traces, ev));
raster.addEventListener("mouseleave", () => { playheadNorm = null; });
traces.addEventListener("mouseleave", () => { playheadNorm = null; });

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
    const simMs = elapsed * speed;
    const steps = Math.max(1, Math.ceil(simMs / 16));
    for (let i = 0; i < steps; i++) engine.step(simMs / steps, electrodes, selected);
  }
  scene.updateNeuronActivity(engine.state.neuronActivity);
  scene.render();
  drawRaster();
  drawTracePanels();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
