import type { ForwardModel, SpikeEvent, TissueModel, ImplantModel } from "../contracts";

function hypot3(a: readonly [number, number, number], b: readonly [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

function buildSpikeKernel(sampleRateHz: number) {
  // 6 ms biphasic-ish shape (difference of exponentials), length 20 ms.
  const dt = 1 / sampleRateHz;
  const lenS = 0.02;
  const n = Math.max(8, Math.floor(lenS * sampleRateHz));
  const k = new Float32Array(n);

  // Time constants (seconds)
  const tau1 = 0.0007;
  const tau2 = 0.0025;

  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const a = Math.exp(-t / tau1);
    const b = Math.exp(-t / tau2);
    // negative then positive lobe (rough)
    k[i] = (b - a);
  }

  // Normalize to max abs 1
  let m = 1e-9;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(k[i]));
  for (let i = 0; i < n; i++) k[i] /= m;
  return k;
}

export function makeExtracellularPointSourceForwardModel(args?: {
  baseAmpUv?: number;
  r0Um?: number;
}) : ForwardModel {
  const baseAmpUv = args?.baseAmpUv ?? 60;
  const r0Um = args?.r0Um ?? 35;

  return {
    id: "fwd-point-source-v0",
    kind: "extracellular-point-source",
    computePotentials: ({ tissue, implant, spikes, tStartMs, tEndMs, sampleRateHz }) => {
      const dtMs = 1000 / sampleRateHz;
      const nSamp = Math.max(1, Math.floor((tEndMs - tStartMs) / dtMs));
      const tracesUv: Record<string, Float32Array> = {};

      const kernel = buildSpikeKernel(sampleRateHz);

      const neuronById = new Map(tissue.neurons.map((n) => [n.id, n] as const));

      for (const e of implant.electrodes) {
        if (e.recEnabled === false) continue;
        tracesUv[e.id] = new Float32Array(nSamp);
      }

      // For each spike, add a kernel at its sample index.
      for (const sp of spikes) {
        if (sp.tMs < tStartMs || sp.tMs >= tEndMs) continue;
        const n = neuronById.get(sp.neuronId);
        if (!n) continue;

        const s0 = Math.floor((sp.tMs - tStartMs) / dtMs);
        const w = sp.weight ?? 1;

        for (const e of implant.electrodes) {
          if (e.recEnabled === false) continue;
          const r = hypot3(n.posUm, e.posUm);
          const gain = baseAmpUv * w / (r + r0Um);
          const tr = tracesUv[e.id];
          if (!tr) continue;

          for (let k = 0; k < kernel.length; k++) {
            const si = s0 + k;
            if (si < 0 || si >= tr.length) break;
            tr[si] += gain * kernel[k];
          }
        }
      }

      return { tracesUv };
    },
  };
}
