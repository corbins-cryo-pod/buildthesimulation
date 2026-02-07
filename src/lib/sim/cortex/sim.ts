import type { CortexSimConfig, CortexSimState, SpikeEvent } from "./contracts";
import { mulberry32 } from "./rng";

export function initSim(cfg: CortexSimConfig): CortexSimState {
  const tracesUv: Record<string, Float32Array> = {};
  for (const e of cfg.implant.electrodes) {
    tracesUv[e.id] = new Float32Array(0);
  }

  return {
    tMs: 0,
    spikes: [],
    tracesUv,
  };
}

export function stepSim(args: {
  cfg: CortexSimConfig;
  state: CortexSimState;
  // ring buffers:
  traceWindowS: number;
  spikeWindowS: number;
  // selected electrode ids
  traceElectrodes: string[];
}) : CortexSimState {
  const { cfg } = args;
  const rand = mulberry32((cfg.seed ^ Math.floor(args.state.tMs)) >>> 0);

  const t0 = args.state.tMs;
  const t1 = t0 + cfg.dtMs;

  // 1) Generate spikes (Poisson per neuron per step)
  const spikesNew: SpikeEvent[] = [];
  const dtS = cfg.dtMs / 1000;

  for (const n of cfg.tissue.neurons) {
    const p = Math.max(0, n.baselineHz * dtS);
    if (rand() < p) {
      spikesNew.push({ tMs: t0 + rand() * cfg.dtMs, neuronId: n.id });
    }
  }

  // 2) Keep spike ring buffer
  const spikes = args.state.spikes.concat(spikesNew);
  const cutoffSpike = t1 - args.spikeWindowS * 1000;
  while (spikes.length && spikes[0].tMs < cutoffSpike) spikes.shift();

  // 3) Compute electrode potentials for a subset (avoid doing all 100 every step for now)
  const implant = {
    ...cfg.implant,
    electrodes: cfg.implant.electrodes
      .filter((e) => args.traceElectrodes.includes(e.id))
      .map((e) => ({ ...e, recEnabled: e.recEnabled !== false })),
  };

  const block = cfg.forward.computePotentials({
    tissue: cfg.tissue,
    implant,
    spikes: spikesNew,
    tStartMs: t0,
    tEndMs: t1,
    sampleRateHz: cfg.sampleRateHz,
  });

  // 4) Append into sliding trace buffers
  const nKeep = Math.max(10, Math.floor(args.traceWindowS * cfg.sampleRateHz));

  const tracesUv: Record<string, Float32Array> = { ...args.state.tracesUv };
  for (const eid of args.traceElectrodes) {
    const prev = tracesUv[eid] ?? new Float32Array(0);
    const add = block.tracesUv[eid] ?? new Float32Array(Math.max(1, Math.floor((cfg.dtMs / 1000) * cfg.sampleRateHz)));

    const next = new Float32Array(Math.min(nKeep, prev.length + add.length));
    // copy tail of prev
    const takePrev = Math.max(0, next.length - add.length);
    const prevStart = Math.max(0, prev.length - takePrev);
    if (takePrev) next.set(prev.subarray(prevStart), 0);
    next.set(add.subarray(Math.max(0, add.length - (next.length - takePrev))), takePrev);

    tracesUv[eid] = next;
  }

  return {
    tMs: t1,
    spikes,
    tracesUv,
  };
}
