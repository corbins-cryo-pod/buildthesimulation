import { membraneDistanceUm } from "./volume-conductor.js";

// Uses the same conservative tapered-polyline exclusion as leadField(), including soma radius.
export function placementReport(
  world,
  selectedIndex = world.neuron.somaIndex ?? 0,
) {
  const ids = [
    ...new Set([
      ...world.config.recording.contactIds,
      ...(world.config.protocol.mode === "extracellular-stimulation"
        ? world.config.protocol.sourceContactIds
        : []),
    ]),
  ];
  const rows = ids.map((id) => {
    const contact = world.contacts.find((s) => s.id === id);
    const distances = world.neuron.nodes.map((node, index) => ({
      node,
      index,
      distance:
        node.kind === "junction"
          ? Infinity
          : membraneDistanceUm(contact.positionUm, node),
    }));
    const nearest = distances.reduce((a, b) =>
      a.distance < b.distance ? a : b,
    );
    const closestKind = (kind) =>
      Math.min(
        ...distances.filter((d) => d.node.kind === kind).map((d) => d.distance),
      );
    return {
      id,
      positionUm: contact.positionUm,
      nearestUm: nearest.distance,
      nearestId: nearest.node.id,
      somaUm: closestKind("soma"),
      axonUm: closestKind("axon"),
      selectedUm: distances[selectedIndex]?.distance,
      supported: nearest.distance >= world.config.recording.exclusionUm,
      role: world.config.recording.contactIds.includes(id)
        ? "Recording"
        : "Stimulating",
    };
  });
  return {
    rows,
    supported: rows.every((r) => r.supported),
    minTipDepthUm: Math.min(...world.tipsUm.map(p => p[2])),
    maxTipDepthUm: Math.max(...world.tipsUm.map(p => p[2])),
    meanTipDepthUm: world.tipsUm.reduce((sum, p) => sum + p[2], 0) / world.tipsUm.length,
  };
}

// Set the mean physical apex depth, retaining X/Y translation and all rotations.
export function translationForTipDepth(world, depthUm) {
  const mean =
    world.tipsUm.reduce((sum, p) => sum + p[2], 0) /
    world.tipsUm.length;
  return world.config.implant.translationUm.map((v, i) =>
    i === 2 ? v + depthUm - mean : v,
  );
}
