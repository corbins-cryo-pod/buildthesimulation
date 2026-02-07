export type Vec3 = readonly [number, number, number];

export interface Neuron {
  id: string;
  posUm: Vec3; // tissue frame, microns
  type: "exc" | "inh";
  baselineHz: number;
}

export interface TissueVolume {
  kind: "slab";
  boundsUm: { min: Vec3; max: Vec3 };
}

export interface TissueModel {
  id: string;
  volume: TissueVolume;
  neurons: Neuron[];
  conductivitySPerM: number;
}

export interface Electrode {
  id: string;
  posUm: Vec3;
  radiusUm?: number;
  recEnabled?: boolean;
}

export interface ImplantModel {
  id: string;
  kind: "utah-array";
  electrodes: Electrode[];
  shankLengthUm?: number;
}

export interface SpikeEvent {
  tMs: number;
  neuronId: string;
  weight?: number;
}

export interface ForwardModel {
  id: string;
  kind: "extracellular-point-source";
  computePotentials: (args: {
    tissue: TissueModel;
    implant: ImplantModel;
    spikes: SpikeEvent[];
    tStartMs: number;
    tEndMs: number;
    sampleRateHz: number;
  }) => { tracesUv: Record<string, Float32Array> };
}

export interface CortexSimConfig {
  dtMs: number;
  sampleRateHz: number;
  seed: number;
  tissue: TissueModel;
  implant: ImplantModel;
  forward: ForwardModel;
}

export interface CortexSimState {
  tMs: number;
  spikes: SpikeEvent[];
  tracesUv: Record<string, Float32Array>;
}
