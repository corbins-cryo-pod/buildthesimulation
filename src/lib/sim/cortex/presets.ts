import { makeCorticalSlab } from "./tissue";
import { makeUtahArray } from "./implant";
import { makeExtracellularPointSourceForwardModel } from "./forward/extracellularPointSource";
import type { CortexSimConfig } from "./contracts";

export function presetCortexSlabUtah(seed = 1234): CortexSimConfig {
  // Tissue frame: um. We'll set origin at center of slab.
  // Z goes into tissue (0 = pia-ish, positive = deeper) for this toy.
  const slab = makeCorticalSlab({
    seed,
    nNeurons: 1800,
    boundsUm: {
      min: [-1000, -1000, 0],
      max: [1000, 1000, 1500],
    },
    conductivitySPerM: 0.3,
  });

  const implant = makeUtahArray({
    grid: { rows: 10, cols: 10 },
    pitchUm: 400,
    originUm: [0, 0, 0],
    insertionDepthUm: 900,
    shankLengthUm: 1500,
  });

  const forward = makeExtracellularPointSourceForwardModel({ baseAmpUv: 80, r0Um: 40 });

  return {
    seed,
    dtMs: 10,
    sampleRateHz: 1000,
    tissue: slab,
    implant,
    forward,
  };
}
