// Presentation calculations share the conductor and exported time samples with the solver.
// No radius clamp, electrode-surface model, or field inferred from recording traces.
import { pointTransferUvPerNa, distance } from "./volume-conductor.js";

export const DEFAULT_ELECTRICAL = Object.freeze({
  electrical: true,
  tips: true,
  tissueField: true,
  neuronColor: true,
  labels: true,
  orientation: "three",
  offsetUm: [0, 0, 0],
  extentUm: 1600,
  fieldOpacity: 0.24,
  fieldScale: "fixed",
  fieldLimitMv: 2,
  recordingScale: "auto",
  recordingLimitUv: 10,
});

export function appliedTransferMvPerUa(world, point) {
  const sources = world.config.protocol.sourceContactIds.map((id) =>
    world.contacts.find((c) => c.id === id),
  );
  if (
    sources.some(
      (s) =>
        distance(point, s.positionUm) <= world.config.recording.exclusionUm,
    )
  )
    return null;
  return (
    pointTransferUvPerNa(
      point,
      sources[0].positionUm,
      world.config.tissue.conductivitySPerM,
    ) -
    pointTransferUvPerNa(
      point,
      sources[1].positionUm,
      world.config.tissue.conductivitySPerM,
    )
  );
}

const sliceCache = new WeakMap();
export function appliedSlices(world, options = {}) {
  const o = { ...DEFAULT_ELECTRICAL, ...options };
  const key = JSON.stringify([o.orientation, o.offsetUm, o.extentUm]);
  let cache = sliceCache.get(world);
  if (!cache) {
    cache = new Map();
    sliceCache.set(world, cache);
  }
  if (cache.has(key)) return cache.get(key);
  if (
    !["three", "xy", "xz", "yz"].includes(o.orientation) ||
    !Number.isFinite(o.extentUm) ||
    o.extentUm < 100 ||
    o.extentUm > 6000 ||
    o.offsetUm.length !== 3 ||
    o.offsetUm.some((v) => !Number.isFinite(v) || Math.abs(v) > 5000)
  )
    throw new Error(
      "Use a supported slice orientation, extent 100–6000 µm, and offsets within ±5000 µm.",
    );
  const axesList =
    o.orientation === "three"
      ? [
          [0, 1],
          [0, 2],
          [1, 2],
        ]
      : [{ xy: [0, 1], xz: [0, 2], yz: [1, 2] }[o.orientation]];
  const sources = world.config.protocol.sourceContactIds.map((id) =>
    world.contacts.find((c) => c.id === id),
  );
  const center = world.config.neuron.somaUm.map((v, i) => v + o.offsetUm[i]);
  const size = 25,
    slices = [];
  for (const axes of axesList) {
    const points = [],
      transfers = [],
      indices = [];
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        const point = [...center];
        point[axes[0]] += (col / (size - 1) - 0.5) * o.extentUm;
        point[axes[1]] += (row / (size - 1) - 0.5) * o.extentUm;
        points.push(point);
        transfers.push(appliedTransferMvPerUa(world, point));
      }
    let excludedCells = 0;
    for (let row = 0; row < size - 1; row++)
      for (let col = 0; col < size - 1; col++) {
        const a = row * size + col,
          b = a + 1,
          c = a + size,
          d = c + 1;
        // Conservatively discard BOTH triangles if their cell intersects an exclusion sphere.
        // Testing vertices alone can bridge a singularity inside a triangle or along an edge.
        const intersects = sources.some((s) => {
          const nearest = [...center];
          for (const axis of axes)
            nearest[axis] = Math.max(
              points[a][axis],
              Math.min(points[d][axis], s.positionUm[axis]),
            );
          return (
            distance(nearest, s.positionUm) <=
            world.config.recording.exclusionUm
          );
        });
        if (intersects) {
          excludedCells++;
          continue;
        }
        indices.push(a, b, c, b, d, c);
      }
    const visibleVertices = [...new Set(indices)];
    slices.push({
      axes,
      points,
      transfers,
      indices,
      visibleVertices,
      excludedCells,
    });
  }
  const peakTransfer = Math.max(
    0,
    ...slices.flatMap((s) =>
      s.visibleVertices.map((i) => Math.abs(s.transfers[i] ?? 0)),
    ),
  );
  const data = { key, slices, center, size, peakTransfer };
  if (cache.size >= 4) cache.delete(cache.keys().next().value);
  cache.set(key, data);
  return data;
}

const summaries = new WeakMap();
const peak = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
export function resultSummary(result) {
  if (!result) return null;
  if (summaries.has(result)) return summaries.get(result);
  const limits = Object.fromEntries(
    ["neural", "applied", "total"].map((k) => [
      k,
      Math.max(...result[`${k}Uv`].map(peak)),
    ]),
  );
  const soma = result.somaIndex ?? 0,
    n = result.diagnostics.compartments;
  let somaPeak = -Infinity;
  for (let k = 0; k < result.timeMs.length; k++)
    somaPeak = Math.max(somaPeak, result.membraneMv[k * n + soma]);
  const negativeFrame = result.drive.findIndex((v) => v < -1e-12),
    positiveFrame = result.drive.findIndex((v) => v > 1e-12);
  const p = result.config.protocol;
  const gapStart = p.startMs + p.phaseUs / 1000;
  const gapEnd = gapStart + p.gapUs / 1000;
  const gapFrame =
    p.mode === "extracellular-stimulation" && p.gapUs > 0
      ? result.drive.findIndex((v, frame) => {
          if (!frame || Math.abs(v) > 1e-12) return false;
          const [start, end] = sampleInterval(result, frame);
          return start >= gapStart - 1e-10 && end <= gapEnd + 1e-10;
        })
      : -1;
  const summary = {
    limits,
    somaPeak,
    negativeFrame,
    positiveFrame,
    gapFrame,
    neuralPeakA: peak(result.neuralUv[0]),
    artifactPeakA: peak(result.appliedUv[0]),
    somaSpikes: result.spikes?.length ?? null,
    firstSomaMs: result.spikes?.[0]?.timeMs,
    localCrossings:
      result.firstCrossingByCompartment?.filter(Number.isFinite).length ?? null,
  };
  summaries.set(result, summary);
  return summary;
}

export function electricalScales(world, result, options = {}) {
  const o = { ...DEFAULT_ELECTRICAL, ...options };
  const field =
    world.config.protocol.mode === "extracellular-stimulation"
      ? appliedSlices(world, o)
      : null;
  return {
    // Auto scales are fixed for the entire run, including zero-drive intervals.
    fieldMv:
      o.fieldScale === "auto"
        ? Math.max(
            1e-9,
            (field?.peakTransfer ?? 0) * world.config.protocol.amplitudeUa,
          )
        : Math.max(1e-9, o.fieldLimitMv),
    recordingUv:
      o.recordingScale === "auto"
        ? Math.max(
            1e-9,
            resultSummary(result)?.limits[o.component ?? "neural"] ?? 0,
          )
        : Math.max(1e-9, o.recordingLimitUv),
    stimulationUa: Math.max(1e-9, world.config.protocol.amplitudeUa),
    field,
  };
}

export function nearestFrame(time, target) {
  let lo = 0,
    hi = time.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (time[m] < target) lo = m + 1;
    else hi = m;
  }
  return lo > 0 && Math.abs(time[lo - 1] - target) < Math.abs(time[lo] - target)
    ? lo - 1
    : lo;
}

export function sampleInterval(result, frame) {
  if (frame === 0) return null;
  const end = result.timeMs[frame];
  return [
    result.config.neuron.modelId
      ? Math.max(0, end - result.config.solver.dtMs)
      : result.timeMs[frame - 1],
    end,
  ];
}

export function replayPhase(result, frame) {
  if (!result) return "No current result";
  if (frame === 0)
    return result.config.neuron.modelId
      ? "Conditioned initial state"
      : "Initial equilibrium";
  const p = result.config.protocol,
    drive = result.drive[frame];
  if (p.mode !== "extracellular-stimulation")
    return Math.abs(drive) > 1e-12 ? "Input active" : "No applied input";
  if (drive < -1e-12) return "Cathodic A / anodic B · interval-average current";
  if (drive > 1e-12) return "Anodic A / cathodic B · interval-average current";
  return "Zero net applied current in sampled interval";
}

export function configurationChanges(a, b) {
  const changes = [];
  for (const group of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (typeof a[group] !== "object" || typeof b[group] !== "object") {
      if (JSON.stringify(a[group]) !== JSON.stringify(b[group]))
        changes.push({ key: group, before: a[group], after: b[group] });
      continue;
    }
    for (const key of new Set([
      ...Object.keys(a[group]),
      ...Object.keys(b[group]),
    ]))
      if (JSON.stringify(a[group][key]) !== JSON.stringify(b[group][key]))
        changes.push({
          key: `${group}.${key}`,
          before: a[group][key],
          after: b[group][key],
        });
  }
  return changes;
}
