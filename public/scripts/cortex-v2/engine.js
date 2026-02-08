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

export function makeKernel(sampleRateHz, len = 24) {
  const k = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRateHz;
    k[i] = (Math.exp(-t / 0.003) - Math.exp(-t / 0.0008)) * 1.6;
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
  const kernel = makeKernel(cfg.sampleRateHz, 24);

  const state = {
    tMs: 0,
    recentSpikes: [],
    detectedSpikes: [],
    neuronActivity: new Float32Array(neurons.length),
    trace: new Float32Array(traceN),
    neurons,
  };

  function step(stepMs, electrode) {
    const dtS = stepMs / 1000;
    const newSpikes = [];
    const decay = Math.exp(-stepMs / 140);
    for (let i = 0; i < state.neuronActivity.length; i++) state.neuronActivity[i] *= decay;

    for (let i = 0; i < neurons.length; i++) {
      if (rand() < neurons[i].hz * dtS) newSpikes.push({ tMs: state.tMs + rand() * stepMs, idx: i });
    }
    state.recentSpikes = state.recentSpikes.concat(newSpikes).filter((s) => s.tMs > state.tMs - 2000);

    const addSamp = Math.max(1, Math.floor((stepMs / 1000) * cfg.sampleRateHz));
    const block = new Float32Array(addSamp);
    const detected = [];

    for (const s of newSpikes) {
      state.neuronActivity[s.idx] = 1;
      const n = neurons[s.idx];
      const r = Math.hypot(n.pos[0] - electrode.x, n.pos[1] - electrode.y, n.pos[2] - electrode.z);
      const gain = cfg.baseUv / (r + cfg.r0Um);

      const detectProb = Math.max(0, Math.min(1, (gain - 0.10) / 0.70));
      if (rand() < detectProb) detected.push(s);

      const i0 = Math.floor(((s.tMs - state.tMs) / 1000) * cfg.sampleRateHz);
      for (let k = 0; k < kernel.length; k++) {
        const j = i0 + k;
        if (j >= 0 && j < block.length) block[j] += gain * kernel[k];
      }
    }

    state.detectedSpikes = state.detectedSpikes.concat(detected).filter((s) => s.tMs > state.tMs - 2000);

    const merged = new Float32Array(traceN);
    const keep = traceN - block.length;
    if (keep > 0) merged.set(state.trace.subarray(state.trace.length - keep), 0);
    merged.set(block.subarray(Math.max(0, block.length - traceN)), Math.max(0, keep));
    state.trace = merged;
    state.tMs += stepMs;
  }

  return { cfg, state, step };
}
