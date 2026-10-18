import { getActiveModel } from './model-library.js';
import { getModelMetadata } from './model-registry.js';
export { activeModelData } from './model-library.js';

// Published orientation angles (radians) followed by [X,Z,-Y] mapping to the
// laboratory's +Z depth frame. All transforms are rigid and preserve scale.
const rotate = (v, angles) => {
  let [x, y, z] = v;
  const [a, b, c] = angles;
  [y, z] = [Math.cos(a) * y - Math.sin(a) * z, Math.sin(a) * y + Math.cos(a) * z];
  [x, z] = [Math.cos(b) * x + Math.sin(b) * z, -Math.sin(b) * x + Math.cos(b) * z];
  return [Math.cos(c) * x - Math.sin(c) * y, Math.sin(c) * x + Math.cos(c) * y, z];
};
export function makeActiveMorphology(config) {
  const model = getActiveModel(config.neuron.modelId);
  const metadata = getModelMetadata(config.neuron.modelId);
  if (!model.variants[String(config.neuron.segmentLengthUm)]) throw new Error("Loading selected cell resolution…");
  const angles = config.neuron.rotationDeg.map((v) => (v * Math.PI) / 180);
  const point = (v) => {
    const aligned = rotate(v, metadata.orientationRadians ?? [0,0,0]);
    return rotate([aligned[0], aligned[2], -aligned[1]], angles).map(
      (x, i) => x + config.neuron.somaUm[i],
    );
  };
  const nodes = model.variants[String(config.neuron.segmentLengthUm)].map((n) => ({
    ...n,
    startUm: point(n.startUm),
    endUm: point(n.endUm),
    centerUm: point(n.centerUm),
    pathUm: n.pathUm.map(point),
  }));
  // Fixed physical synaptic support: furthest 100 µm of the longest apical
  // section. Discretization changes overlap weights but not the input patch.
  const lengths = new Map();
  for (const n of nodes)
    if (n.sectionType === (nodes.some(n=>n.sectionType==='apic') ? 'apic' : 'dend') && n.areaUm2)
      lengths.set(n.sectionId, (lengths.get(n.sectionId) ?? 0) + n.lengthUm);
  const section = [...lengths].sort((a, b) => b[1] - a[1])[0],
    length = section[1],
    patch = Math.min(100, length);
  for (const n of nodes)
    n.synapseWeight =
      n.sectionId === section[0] && n.areaUm2
        ? Math.max(
            0,
            Math.min(length, (n.sectionX + (0.5 * n.lengthUm) / length) * length) -
              Math.max(length - patch, (n.sectionX - (0.5 * n.lengthUm) / length) * length),
          ) / patch
        : 0;
  return {
    id: model.id,
    nodes,
    somaIndex: 0,
    synapseIndex: nodes.findIndex((n) => n.synapseWeight > 0),
    specimenId: model.specimenId,
    sourceCommit: model.sourceCommit,
    sourceHashes: model.sourceHashes,
    morphology:
      metadata.scope,
    synapseDescription: `Distal ${patch} µm of ${section[0]}; synthetic step input`,
    orientation: 'Published X/Z angles, then X,Z,-Y to +Z depth, then requested cell rotation',
    membraneCompartments: nodes.filter((n) => n.areaUm2 > 0).length,
  };
}
