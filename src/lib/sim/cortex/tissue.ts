import type { Neuron, TissueModel, Vec3 } from "./contracts";
import { mulberry32 } from "./rng";

export function makeCorticalSlab(args: {
  id?: string;
  boundsUm: { min: Vec3; max: Vec3 };
  nNeurons: number;
  seed: number;
  conductivitySPerM?: number;
}) : TissueModel {
  const id = args.id ?? "cortex-slab";
  const rand = mulberry32(args.seed);

  const { min, max } = args.boundsUm;
  const neurons: Neuron[] = [];

  // Minimal depth profile: uniform in x/y, slight bias for depth (z) toward upper layers.
  for (let i = 0; i < args.nNeurons; i++) {
    const x = min[0] + rand() * (max[0] - min[0]);
    const y = min[1] + rand() * (max[1] - min[1]);

    // Bias z toward surface (min z) using squared random.
    const tz = rand();
    const z = min[2] + (tz * tz) * (max[2] - min[2]);

    const type: Neuron["type"] = rand() < 0.8 ? "exc" : "inh";
    const baselineHz = type === "exc" ? (0.5 + rand() * 4) : (1 + rand() * 8);

    neurons.push({
      id: `n${i}`,
      posUm: [x, y, z],
      type,
      baselineHz,
    });
  }

  return {
    id,
    volume: { kind: "slab", boundsUm: args.boundsUm },
    neurons,
    conductivitySPerM: args.conductivitySPerM ?? 0.3,
  };
}
