import * as THREE from "three";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCorticalSlab({ boundsUm, nNeurons, seed, conductivitySPerM = 0.3 }) {
  const rand = mulberry32(seed);
  const { min, max } = boundsUm;
  const neurons = [];
  for (let i = 0; i < nNeurons; i++) {
    const x = min[0] + rand() * (max[0] - min[0]);
    const y = min[1] + rand() * (max[1] - min[1]);
    const tz = rand();
    const z = min[2] + tz * tz * (max[2] - min[2]);
    const type = rand() < 0.8 ? "exc" : "inh";
    const baselineHz = type === "exc" ? 0.5 + rand() * 4 : 1 + rand() * 8;
    neurons.push({ id: `n${i}`, posUm: [x, y, z], type, baselineHz });
  }
  return { id: "cortex-slab", volume: { kind: "slab", boundsUm }, neurons, conductivitySPerM };
}

function makeUtahArray({ rows = 10, cols = 10, pitchUm = 400, insertionDepthUm = 900 }) {
  const electrodes = [];
  const w = (cols - 1) * pitchUm;
  const h = (rows - 1) * pitchUm;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * pitchUm - w / 2;
      const y = r * pitchUm - h / 2;
      const z = insertionDepthUm;
      electrodes.push({ id: `e${r}-${c}`, posUm: [x, y, z], radiusUm: 18, recEnabled: true });
    }
  }
  return { id: "utah-array", kind: "utah-array", electrodes, shankLengthUm: 1500 };
}

function buildSpikeKernel(sampleRateHz) {
  const dt = 1 / sampleRateHz;
  const n = Math.max(8, Math.floor(0.02 * sampleRateHz));
  const k = new Float32Array(n);
  const tau1 = 0.0007;
  const tau2 = 0.0025;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const a = Math.exp(-t / tau1);
    const b = Math.exp(-t / tau2);
    k[i] = b - a;
  }
  let m = 1e-9;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(k[i]));
  for (let i = 0; i < n; i++) k[i] /= m;
  return k;
}

function computePotentials({ tissue, implant, spikes, tStartMs, tEndMs, sampleRateHz }) {
  const dtMs = 1000 / sampleRateHz;
  const nSamp = Math.max(1, Math.floor((tEndMs - tStartMs) / dtMs));
  const tracesUv = {};
  const kernel = buildSpikeKernel(sampleRateHz);
  const neuronById = new Map(tissue.neurons.map((n) => [n.id, n]));
  const baseAmpUv = 80;
  const r0Um = 40;

  for (const e of implant.electrodes) {
    if (e.recEnabled === false) continue;
    tracesUv[e.id] = new Float32Array(nSamp);
  }

  for (const sp of spikes) {
    if (sp.tMs < tStartMs || sp.tMs >= tEndMs) continue;
    const n = neuronById.get(sp.neuronId);
    if (!n) continue;
    const s0 = Math.floor((sp.tMs - tStartMs) / dtMs);
    for (const e of implant.electrodes) {
      if (e.recEnabled === false) continue;
      const dx = n.posUm[0] - e.posUm[0];
      const dy = n.posUm[1] - e.posUm[1];
      const dz = n.posUm[2] - e.posUm[2];
      const r = Math.hypot(dx, dy, dz);
      const gain = baseAmpUv / (r + r0Um);
      const tr = tracesUv[e.id];
      for (let k = 0; k < kernel.length; k++) {
        const si = s0 + k;
        if (si < 0 || si >= tr.length) break;
        tr[si] += gain * kernel[k];
      }
    }
  }

  return tracesUv;
}

function presetCortexSlabUtah(seed = 1337) {
  return {
    seed,
    dtMs: 10,
    sampleRateHz: 1000,
    tissue: makeCorticalSlab({
      seed,
      nNeurons: 1800,
      boundsUm: { min: [-1000, -1000, 0], max: [1000, 1000, 1500] },
    }),
    implant: makeUtahArray({ rows: 10, cols: 10, pitchUm: 400, insertionDepthUm: 900 }),
  };
}

function initSim(cfg) {
  const tracesUv = {};
  for (const e of cfg.implant.electrodes) tracesUv[e.id] = new Float32Array(0);
  return { tMs: 0, spikes: [], tracesUv };
}

function stepSim({ cfg, state, traceWindowS, spikeWindowS, traceElectrodes }) {
  const rand = mulberry32((cfg.seed ^ Math.floor(state.tMs)) >>> 0);
  const t0 = state.tMs;
  const t1 = t0 + cfg.dtMs;
  const dtS = cfg.dtMs / 1000;

  const spikesNew = [];
  for (const n of cfg.tissue.neurons) {
    if (rand() < Math.max(0, n.baselineHz * dtS)) spikesNew.push({ tMs: t0 + rand() * cfg.dtMs, neuronId: n.id });
  }

  const spikes = state.spikes.concat(spikesNew);
  const cutoffSpike = t1 - spikeWindowS * 1000;
  while (spikes.length && spikes[0].tMs < cutoffSpike) spikes.shift();

  const implant = {
    ...cfg.implant,
    electrodes: cfg.implant.electrodes.filter((e) => traceElectrodes.includes(e.id)).map((e) => ({ ...e, recEnabled: true })),
  };

  const block = computePotentials({ tissue: cfg.tissue, implant, spikes: spikesNew, tStartMs: t0, tEndMs: t1, sampleRateHz: cfg.sampleRateHz });

  const nKeep = Math.max(10, Math.floor(traceWindowS * cfg.sampleRateHz));
  const tracesUv = { ...state.tracesUv };

  for (const eid of traceElectrodes) {
    const prev = tracesUv[eid] ?? new Float32Array(0);
    const add = block[eid] ?? new Float32Array(Math.max(1, Math.floor((cfg.dtMs / 1000) * cfg.sampleRateHz)));
    const next = new Float32Array(Math.min(nKeep, prev.length + add.length));
    const takePrev = Math.max(0, next.length - add.length);
    const prevStart = Math.max(0, prev.length - takePrev);
    if (takePrev) next.set(prev.subarray(prevStart), 0);
    next.set(add.subarray(Math.max(0, add.length - (next.length - takePrev))), takePrev);
    tracesUv[eid] = next;
  }

  return { tMs: t1, spikes, tracesUv };
}

const $ = (id) => document.getElementById(id);

const canvas = $("cortex3d");
const raster = $("raster");
const traces = $("traces");

if (!canvas || !raster || !traces) {
  // page not present
} else {
  // --- Config ---
  const cfg = presetCortexSlabUtah(1337);
  let state = initSim(cfg);

  const ui = {
    paused: $("paused"),
    speed: $("speed"),
    nShow: $("nShow"),
    depth: $("depth"),
    pitch: $("pitch"),
    pitchVal: $("pitchVal"),
    depthVal: $("depthVal"),
  };

  const traceElectrodes = ["e4-4", "e4-5", "e5-4", "e5-5"]; // center 2x2

  function syncMeta() {
    if (ui.pitchVal && ui.pitch) ui.pitchVal.textContent = `${Number(ui.pitch.value)} µm`;
    if (ui.depthVal && ui.depth) ui.depthVal.textContent = `${Number(ui.depth.value)} µm`;
  }
  syncMeta();

  // --- THREE setup ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0.9, -2.2, 1.5);
  camera.lookAt(0, 0, 0.7);

  const light = new THREE.DirectionalLight(0xffffff, 1.15);
  light.position.set(2, -2, 4);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const grid = new THREE.GridHelper(4, 16, 0x2b2b33, 0x2b2b33);
  grid.material.transparent = true;
  grid.material.opacity = 0.25;
  scene.add(grid);

  // Slab box (um -> scene units where 1 unit = 1 mm)
  const umToMm = (v) => v / 1000;

  const prefersDark =
    document.documentElement?.dataset?.theme === "dark" ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const slabMin = cfg.tissue.volume.boundsUm.min;
  const slabMax = cfg.tissue.volume.boundsUm.max;
  const slabSize = new THREE.Vector3(
    umToMm(slabMax[0] - slabMin[0]),
    umToMm(slabMax[1] - slabMin[1]),
    umToMm(slabMax[2] - slabMin[2])
  );

  const slabGeo = new THREE.BoxGeometry(slabSize.x, slabSize.y, slabSize.z);
  const slabMat = new THREE.MeshPhongMaterial({
    color: prefersDark ? 0xefe9de : 0xffffff,
    transparent: true,
    opacity: prefersDark ? 0.1 : 0.07,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.set(
    umToMm((slabMin[0] + slabMax[0]) / 2),
    umToMm((slabMin[1] + slabMax[1]) / 2),
    umToMm((slabMin[2] + slabMax[2]) / 2)
  );
  scene.add(slab);

  const slabWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(slabGeo),
    new THREE.LineBasicMaterial({
      color: prefersDark ? 0xbcb6ac : 0x3b3b45,
      transparent: true,
      opacity: prefersDark ? 0.65 : 0.45,
    })
  );
  slabWire.position.copy(slab.position);
  scene.add(slabWire);

  // Neuron point cloud
  const neuronGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(cfg.tissue.neurons.length * 3);
  const col = new Float32Array(cfg.tissue.neurons.length * 3);

  for (let i = 0; i < cfg.tissue.neurons.length; i++) {
    const n = cfg.tissue.neurons[i];
    pos[i * 3 + 0] = umToMm(n.posUm[0]);
    pos[i * 3 + 1] = umToMm(n.posUm[1]);
    pos[i * 3 + 2] = umToMm(n.posUm[2]);

    const c = prefersDark
      ? n.type === "exc"
        ? new THREE.Color("#e7e1d7")
        : new THREE.Color("#ffb4b4")
      : n.type === "exc"
        ? new THREE.Color("#2a2a2f")
        : new THREE.Color("#6b2b2b");

    col[i * 3 + 0] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  neuronGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  neuronGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const neuronMat = new THREE.PointsMaterial({
    size: prefersDark ? 0.024 : 0.02,
    vertexColors: true,
    transparent: true,
    opacity: prefersDark ? 0.95 : 0.9,
  });
  const neurons = new THREE.Points(neuronGeo, neuronMat);
  scene.add(neurons);

  // Utah electrodes (render just tips as spheres for now)
  const eGeo = new THREE.SphereGeometry(0.02, 10, 10);
  const eMat = new THREE.MeshStandardMaterial({
    color: prefersDark ? 0x0e0e12 : 0x111119,
    roughness: 0.3,
    metalness: 0.1,
  });
  const eGroup = new THREE.Group();
  scene.add(eGroup);

  function rebuildElectrodeMeshes() {
    while (eGroup.children.length) eGroup.remove(eGroup.children[0]);
    for (const e of cfg.implant.electrodes) {
      const m = new THREE.Mesh(eGeo, eMat);
      m.position.set(umToMm(e.posUm[0]), umToMm(e.posUm[1]), umToMm(e.posUm[2]));
      eGroup.add(m);
    }
  }

  function rebuildImplant() {
    const pitchUm = Math.max(120, Number(ui.pitch?.value ?? 400));
    const insertionDepthUm = Math.max(0, Number(ui.depth?.value ?? 900));

    cfg.implant.electrodes = [];
    const rows = 10;
    const cols = 10;
    const w = (cols - 1) * pitchUm;
    const h = (rows - 1) * pitchUm;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * pitchUm - w / 2;
        const y = r * pitchUm - h / 2;
        const z = insertionDepthUm;
        cfg.implant.electrodes.push({ id: `e${r}-${c}`, posUm: [x, y, z], radiusUm: 18, recEnabled: true });
      }
    }

    cfg.implant.shankLengthUm = Math.max(cfg.implant.shankLengthUm ?? insertionDepthUm, insertionDepthUm);
    rebuildElectrodeMeshes();
  }

  ui.pitch?.addEventListener("input", () => {
    syncMeta();
    rebuildImplant();
  });

  ui.depth?.addEventListener("input", () => {
    syncMeta();
    rebuildImplant();
  });

  rebuildImplant();

  // Camera controls (minimal orbit)
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;
  let dist = 3.0;
  const target = new THREE.Vector3(0, 0, 0.7);

  function updateCamera() {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x = target.x + dist * cp * cy;
    const y = target.y + dist * cp * sy;
    const z = target.z + dist * sp;
    camera.position.set(x, y, z);
    camera.lookAt(target);
  }
  updateCamera();

  canvas.addEventListener("mousedown", (ev) => {
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
  });
  window.addEventListener("mouseup", () => (dragging = false));
  window.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;

    const rot = 0.005;
    yaw += dx * rot;
    pitch += -dy * rot;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    updateCamera();
  });
  canvas.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const s = Math.sign(ev.deltaY);
      dist *= s > 0 ? 1.08 : 0.92;
      dist = Math.max(1.2, Math.min(10, dist));
      updateCamera();
    },
    { passive: false }
  );

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    raster.width = Math.floor(w);
    traces.width = Math.floor(w);
  }
  window.addEventListener("resize", resize);
  resize();

  // 2D plots
  const rctx = raster.getContext("2d");
  const tctx = traces.getContext("2d");

  function drawRaster(nowMs) {
    const W = raster.width;
    const H = raster.height;
    rctx.clearRect(0, 0, W, H);
    rctx.fillStyle = "rgba(255,255,255,0.06)";
    rctx.fillRect(0, 0, W, H);

    const winS = 1.8;
    const t0 = nowMs - winS * 1000;

    const nShow = Math.max(50, Math.min(cfg.tissue.neurons.length, Number(ui.nShow?.value ?? 250)));
    const yStep = H / nShow;

    rctx.fillStyle = "rgba(10,10,12,0.75)";
    for (const sp of state.spikes) {
      if (sp.tMs < t0) continue;
      const idx = Number(String(sp.neuronId).slice(1));
      if (idx >= nShow) continue;
      const x = ((sp.tMs - t0) / (winS * 1000)) * W;
      const y = idx * yStep;
      rctx.fillRect(x, y, 2, Math.max(1, yStep * 0.55));
    }

    rctx.fillStyle = "rgba(10,10,12,0.55)";
    rctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    rctx.fillText(`Spike raster (last ${winS.toFixed(1)} s)`, 10, 18);
  }

  function drawTraces() {
    const W = traces.width;
    const H = traces.height;
    tctx.clearRect(0, 0, W, H);
    tctx.fillStyle = "rgba(255,255,255,0.06)";
    tctx.fillRect(0, 0, W, H);

    const rows = traceElectrodes.length;
    const rowH = H / rows;

    for (let i = 0; i < rows; i++) {
      const eid = traceElectrodes[i];
      const tr = state.tracesUv[eid];
      if (!tr || tr.length < 2) continue;

      const y0 = i * rowH;
      tctx.strokeStyle = "rgba(10,10,12,0.12)";
      tctx.beginPath();
      tctx.moveTo(0, y0 + rowH / 2);
      tctx.lineTo(W, y0 + rowH / 2);
      tctx.stroke();

      tctx.strokeStyle = "rgba(10,10,12,0.75)";
      tctx.lineWidth = 1;
      tctx.beginPath();

      const maxUv = 30;
      for (let x = 0; x < W; x++) {
        const j = Math.floor((x / (W - 1)) * (tr.length - 1));
        const v = Math.max(-maxUv, Math.min(maxUv, tr[j]));
        const yy = y0 + rowH / 2 - (v / maxUv) * (rowH * 0.35);
        if (x === 0) tctx.moveTo(x, yy);
        else tctx.lineTo(x, yy);
      }
      tctx.stroke();

      tctx.fillStyle = "rgba(10,10,12,0.60)";
      tctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      tctx.fillText(eid, 10, y0 + 18);
    }

    tctx.fillStyle = "rgba(10,10,12,0.55)";
    tctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    tctx.fillText("Electrode traces (toy forward model)", 10, 18);
  }

  function loop() {
    const paused = ui.paused?.checked ?? false;
    const speed = Number(ui.speed?.value ?? 1);

    if (!paused) {
      const steps = Math.max(1, Math.min(8, Math.round(speed)));
      for (let i = 0; i < steps; i++) {
        state = stepSim({
          cfg,
          state,
          traceWindowS: 1.8,
          spikeWindowS: 1.8,
          traceElectrodes,
        });
      }
    }

    renderer.render(scene, camera);
    drawRaster(state.tMs);
    drawTraces();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
