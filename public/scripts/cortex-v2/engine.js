export function createRng(seed = 1337) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeKernel(sampleRateHz, len = 48) {
  const k = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRateHz;
    // Extracellular-like AP: negative deflection then positive rebound.
    const neg = -Math.exp(-Math.pow((t - 0.00055) / 0.00023, 2));
    const pos = 0.62 * Math.exp(-Math.pow((t - 0.0011) / 0.00034, 2));
    k[i] = neg + pos;
  }
  return k;
}

export function createEngine(cfg) {
  const rand = createRng(cfg.seed ?? 1337);
  const neurons = Array.from({ length: cfg.nNeurons }, (_, i) => {
    const x = cfg.bounds.min[0] + rand() * (cfg.bounds.max[0] - cfg.bounds.min[0]);
    const y = cfg.bounds.min[1] + rand() * (cfg.bounds.max[1] - cfg.bounds.min[1]);
    const zt = rand();
    const z = cfg.bounds.min[2] + zt * zt * (cfg.bounds.max[2] - cfg.bounds.min[2]);
    return { id: i, pos: [x, y, z], hz: 0.6 + rand() * 7.5 };
  });

  const traceN = Math.floor(cfg.traceWindowS * cfg.sampleRateHz);
  const kernel = makeKernel(cfg.sampleRateHz, 56);

  const neuronAmpScale = Float32Array.from({ length: neurons.length }, () => 0.75 + rand() * 0.6);
  const state = {
    tMs: 0,
    recentSpikes: [],
    detectedSpikes: [], // detected by selected electrode for raster display
    neuronActivity: new Float32Array(neurons.length),
    tracesByElectrode: [new Float32Array(traceN)],
    noiseByElectrode: [0],
    neurons,
    neuronAmpScale,
  };

  function ensureTraceCount(n) {
    while (state.tracesByElectrode.length < n) state.tracesByElectrode.push(new Float32Array(traceN));
    while (state.noiseByElectrode.length < n) state.noiseByElectrode.push(0);
    if (state.tracesByElectrode.length > n) state.tracesByElectrode = state.tracesByElectrode.slice(0, n);
    if (state.noiseByElectrode.length > n) state.noiseByElectrode = state.noiseByElectrode.slice(0, n);
  }

  function step(stepMs, electrodes, selectedIndex = 0) {
    ensureTraceCount(electrodes.length);

    const dtS = stepMs / 1000;
    const newSpikes = [];
    const decay = Math.exp(-stepMs / 140);
    for (let i = 0; i < state.neuronActivity.length; i++) state.neuronActivity[i] *= decay;

    for (let i = 0; i < neurons.length; i++) {
      if (rand() < neurons[i].hz * dtS) newSpikes.push({ tMs: state.tMs + rand() * stepMs, idx: i });
    }
    state.recentSpikes = state.recentSpikes.concat(newSpikes).filter((s) => s.tMs > state.tMs - 2000);

    const addSamp = Math.max(1, Math.floor((stepMs / 1000) * cfg.sampleRateHz));
    const blocks = electrodes.map(() => new Float32Array(addSamp));
    const detected = [];

    for (const s of newSpikes) {
      state.neuronActivity[s.idx] = 1;
      const n = neurons[s.idx];
      const i0 = Math.floor(((s.tMs - state.tMs) / 1000) * cfg.sampleRateHz);

      for (let ei = 0; ei < electrodes.length; ei++) {
        const e = electrodes[ei];
        const r = Math.hypot(n.pos[0] - e.x, n.pos[1] - e.y, n.pos[2] - e.z);
        const gain = (cfg.baseUv * state.neuronAmpScale[s.idx]) / (r + cfg.r0Um);

        const delaySamples = Math.floor((r / 600) * (cfg.sampleRateHz / 1000));
        const alignMs = (delaySamples / cfg.sampleRateHz) * 1000 + 0.55;

        if (ei === selectedIndex) {
          const detectProb = Math.max(0, Math.min(1, (gain - 0.22) / 0.95));
          if (rand() < detectProb) detected.push({ ...s, alignMs });
        }
        const block = blocks[ei];
        for (let k = 0; k < kernel.length; k++) {
          const j = i0 + delaySamples + k;
          if (j >= 0 && j < block.length) block[j] += gain * kernel[k];
        }
      }
    }

    state.detectedSpikes = state.detectedSpikes.concat(detected).filter((s) => s.tMs > state.tMs - 2000);

    for (let ei = 0; ei < electrodes.length; ei++) {
      const merged = new Float32Array(traceN);
      const prev = state.tracesByElectrode[ei];
      const block = blocks[ei];

      // Add colored-ish background noise (AR(1)-like) so traces look electrode-like.
      let nz = state.noiseByElectrode[ei] || 0;
      const noiseUv = cfg.noiseUv ?? 3.8;
      for (let j = 0; j < block.length; j++) {
        nz = 0.94 * nz + (rand() - 0.5) * noiseUv;
        block[j] += nz;
      }
      state.noiseByElectrode[ei] = nz;

      const keep = traceN - block.length;
      if (keep > 0) merged.set(prev.subarray(prev.length - keep), 0);
      merged.set(block.subarray(Math.max(0, block.length - traceN)), Math.max(0, keep));
      state.tracesByElectrode[ei] = merged;
    }

    state.tMs += stepMs;
  }

  return { cfg, state, step };
}
