/**
 * A bounded, physical-scale inspection of the modeled human spiral-ganglion cell.
 *
 * The ten somatic frusta and neighboring process cores use model.lengthMm and
 * model.edgeDiameterMm directly. Meshes with compartmentIndex replay that exact
 * cable compartment. There is no geometry feedback to the electrical solver.
 *
 * Human type-I soma / initial-segment anatomy is informed by Liu et al. (2021).
 * Glial patches, nucleus, and process-myelin thickness are static reconstructions
 * and are not additional electrical compartments or a patient-specific sample.
 */

export const NEURON_ANATOMY_SOURCES = Object.freeze([
  {
    label: 'Rattay, Lutter & Felix (2001): published human auditory-nerve model',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11223296/',
    role: 'Cable dimensions and compartment topology; values are read from the running model.',
  },
  {
    label: 'Bachmaier et al. (2019): comparison of human auditory-nerve models',
    url: 'https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2019.01173/full',
    role: 'Published model comparison and parameter-reference implementation.',
  },
  {
    label: 'Liu et al. (2021): ultrastructure of the human auditory nerve',
    url: 'https://www.frontiersin.org/journals/cellular-neuroscience/articles/10.3389/fncel.2021.642211/full',
    role: 'Human type-I somata and initial segments generally lack compact myelin and have satellite-glial context; process myelination is distinct.',
  },
]);

const TAU = 2 * Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const colors = {
  membrane: '#c99169', myelin: '#dfcda0', cytoplasm: '#d6ae87',
  nucleus: '#8b779c', nucleolus: '#b49bc2', glia: '#83a79a',
  glialNucleus: '#627f7a', node: '#c28461', continuation: '#82949d',
};

function mesh(id, color, role, opacity = 1, extra = {}) {
  return {
    id, role, layer: role === 'process-myelin' ? 'myelin' : 'nerve',
    color, opacity, material: { color, opacity, roughness: 0.55, metalness: 0 },
    positions: [], indices: [], normals: [], ...extra,
  };
}

/** An axial frustum along x; an optional open sector makes a literal cutaway. */
function frustum(id, x0, x1, r0, r1, { startAngle = 0, endAngle = TAU, sides = 32, color = colors.membrane, role = 'model-process', opacity = 1, ...extra } = {}) {
  const result = mesh(id, color, role, opacity, extra);
  const slope = (r1 - r0) / (x1 - x0);
  const inverseNormalLength = 1 / Math.sqrt(1 + slope * slope);
  for (let row = 0; row < 2; row++) {
    const x = row ? x1 : x0, r = row ? r1 : r0;
    for (let k = 0; k <= sides; k++) {
      const angle = mix(startAngle, endAngle, k / sides), c = Math.cos(angle), s = Math.sin(angle);
      result.positions.push(x, r * c, r * s);
      result.normals.push(-slope * inverseNormalLength, c * inverseNormalLength, s * inverseNormalLength);
      if (row && k) {
        const a = k - 1, b = k, c0 = sides + 1 + k - 1, d = c0 + 1;
        result.indices.push(a, b, c0, b, d, c0);
      }
    }
  }
  return result;
}

function ellipsoid(id, position, radii, color, role, opacity = 1) {
  const result = mesh(id, color, role, opacity, { staticContext: true });
  const latitude = 12, longitude = 24;
  for (let j = 0; j <= latitude; j++) for (let k = 0; k <= longitude; k++) {
    const p = Math.PI * j / latitude, a = TAU * k / longitude;
    const unit = [Math.cos(p), Math.sin(p) * Math.cos(a), Math.sin(p) * Math.sin(a)];
    result.positions.push(...position.map((v, i) => v + radii[i] * unit[i]));
    const raw = unit.map((v, i) => v / radii[i]), length = Math.hypot(...raw);
    result.normals.push(...raw.map(v => v / length));
  }
  for (let j = 0; j < latitude; j++) for (let k = 0; k < longitude; k++) {
    const a = j * (longitude + 1) + k, b = a + longitude + 1;
    if (j) result.indices.push(a, b, a + 1);
    if (j < latitude - 1) result.indices.push(a + 1, b, b + 1);
  }
  return result;
}

function crossSectionFace(id, x0, x1, r0, r1, angle) {
  const result = mesh(id, colors.cytoplasm, 'static-cut-face', 0.38, { staticContext: true });
  const c = Math.cos(angle), s = Math.sin(angle);
  result.positions.push(x0, 0, 0, x0, r0 * c, r0 * s, x1, 0, 0, x1, r1 * c, r1 * s);
  const normal = [0, -s, c];
  for (let i = 0; i < 4; i++) result.normals.push(...normal);
  result.indices.push(0, 1, 2, 1, 3, 2);
  return result;
}

function label(scene, id, text, position, priority = 2) {
  scene.labels.push({ id, text, position, layer: 'nerve', priority });
}

function bounds(meshes) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) for (let i = 0; i < m.positions.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], m.positions[i + k]);
    max[k] = Math.max(max[k], m.positions[i + k]);
  }
  return { min, max };
}

/**
 * Return a scene in physical millimetres, centred on the actual model soma.
 * This is a cropped local inspection, not the atlas macro fiber and not a full
 * cable stretched into a convenient screen width. No soma myelin coat is drawn.
 *
 * @param {object} geometry Existing experiment geometry (selects fiber identity).
 * @param {object} model Existing cable model; no duplicate model is constructed.
 * @param {number} selectedFiber Existing population index, clamped if necessary.
 */
export function createNeuronAnatomyScene(geometry, model, selectedFiber = 0) {
  const count = model?.compartmentCount;
  if (!Number.isInteger(count) || !model.positionsMm || !model.lengthMm || !model.edgeDiameterMm || model.edgeDiameterMm.length !== count + 1 || model.type?.length !== count) {
    throw new TypeError('Neuron anatomy requires the existing compartment model and its physical dimensions.');
  }
  const somaIndices = model.somaIndices ?? model.type.flatMap((type, i) => type === 'soma' ? [i] : []);
  if (!somaIndices.length || somaIndices.some(i => !Number.isInteger(i) || i < 0 || i >= count)) throw new RangeError('The model has no valid soma compartments.');
  const first = somaIndices[0], last = somaIndices.at(-1);
  const somaStart = model.positionsMm[first] - model.lengthMm[first] / 2;
  const somaEnd = model.positionsMm[last] + model.lengthMm[last] / 2;
  const somaCenter = (somaStart + somaEnd) / 2;
  const somaLength = somaEnd - somaStart;
  const somaDiameter = Math.max(...Array.from(model.edgeDiameterMm).slice(first, last + 2));
  const fiberIndex = clamp(Math.trunc(Number(selectedFiber) || 0), 0, Math.max(0, (geometry?.fibers?.length ?? 1) - 1));
  const fiber = geometry?.fibers?.[fiberIndex];

  // Include the complete published 100-µm pre-somatic section and a short true-
  // diameter stretch of adjacent peripheral/central internodes. The asymmetry is
  // intentional: the published post-somatic section is only 5 µm long.
  let presomaStart = somaStart;
  for (let i = first - 1; i >= 0 && model.type[i] === 'presoma'; i--) presomaStart = model.positionsMm[i] - model.lengthMm[i] / 2;
  const cropMin = presomaStart - somaCenter - 0.035;
  const cropMax = somaEnd - somaCenter + 0.07;
  const openStart = 0.55 * Math.PI;
  const scene = {
    mode: 'neuron', units: 'mm', up: [0, 1, 0],
    title: 'Spiral-ganglion neuron',
    subtitle: `${somaIndices.length} soma compartments · ${(somaLength * 1000).toFixed(0)} micrometre model soma · physical scale`,
    provenanceLabel: 'Published cable dimensions; reconstructed glial and myelin context',
    meshes: [], paths: [], markers: [], labels: [], legend: [], notes: [],
    sources: NEURON_ANATOMY_SOURCES,
    scaleBarMm: 0.01,
    physicalScale: { unit: 'mm', referenceLengthMm: 0.01, artificialMagnification: false },
    inspection: {
      fiberIndex, modelId: model.id, somaCompartmentIndices: [...somaIndices],
      somaLengthMm: somaLength, somaMaximumDiameterMm: somaDiameter,
      cropMinMm: cropMin, cropMaxMm: cropMax,
      somaOriginAlongCableMm: somaCenter,
      visibleCompartmentIndices: [], visibleNodeIndices: [],
      staticContext: ['nucleus', 'nucleolus', 'satellite-glial patches', 'process-myelin thickness'],
    },
  };

  for (let i = 0; i < count; i++) {
    const original0 = model.positionsMm[i] - model.lengthMm[i] / 2 - somaCenter;
    const original1 = model.positionsMm[i] + model.lengthMm[i] / 2 - somaCenter;
    const x0 = Math.max(original0, cropMin), x1 = Math.min(original1, cropMax);
    if (x1 <= x0 + 1e-12) continue;
    const t0 = (x0 - original0) / model.lengthMm[i], t1 = (x1 - original0) / model.lengthMm[i];
    const r0 = mix(model.edgeDiameterMm[i], model.edgeDiameterMm[i + 1], t0) / 2;
    const r1 = mix(model.edgeDiameterMm[i], model.edgeDiameterMm[i + 1], t1) / 2;
    if (![x0, x1, r0, r1].every(Number.isFinite) || r0 <= 0 || r1 <= 0) throw new RangeError('Model compartment dimensions must be finite and positive.');
    const isSoma = model.type[i] === 'soma', isNode = model.type[i].endsWith('-node');
    scene.inspection.visibleCompartmentIndices.push(i);
    if (isNode) scene.inspection.visibleNodeIndices.push(i);
    scene.meshes.push(frustum(`neuron-core-${i}`, x0, x1, r0, r1, {
      startAngle: isSoma ? openStart : 0,
      color: isNode ? colors.node : colors.membrane,
      role: isSoma ? 'model-soma' : isNode ? 'model-node' : 'model-process',
      sides: isSoma ? 48 : 24,
      fiberIndex, compartmentIndex: i,
      label: `${fiber?.label ?? `ANF ${fiberIndex + 1}`} · ${model.type[i]} · compartment ${i + 1} / ${count}`,
      actualModelDimensions: true,
      originalLengthMm: model.lengthMm[i],
      displayedAxialIntervalMm: [x0, x1],
      clippedContinuation: x0 > original0 + 1e-10 || x1 < original1 - 1e-10,
    }));
    if (isSoma) {
      scene.meshes.push(crossSectionFace(`soma-cut-face-a-${i}`, x0, x1, r0, r1, 0));
      scene.meshes.push(crossSectionFace(`soma-cut-face-b-${i}`, x0, x1, r0, r1, openStart));
    }
    if (model.type[i].endsWith('internode')) {
      // Morphological sleeve only. The numerical cable's myelin conductance and
      // capacitance are already part of the model; this thickness does not set
      // those parameters. The open sector exposes the replaying process core.
      const thickness = 0.35 * Math.min(r0, r1);
      const taperLength = Math.min(0.002, (x1 - x0) / 4);
      const leftTaper = x0 <= original0 + 1e-10, rightTaper = x1 >= original1 - 1e-10;
      const samples = [x0, x0 + taperLength, x1 - taperLength, x1];
      for (let k = 0; k < samples.length - 1; k++) {
        const a = samples[k], b = samples[k + 1];
        if (b <= a) continue;
        const ra = mix(r0, r1, (a - x0) / (x1 - x0));
        const rb = mix(r0, r1, (b - x0) / (x1 - x0));
        const oa = k === 0 && leftTaper ? 0.04 * thickness : thickness;
        const ob = k === samples.length - 2 && rightTaper ? 0.04 * thickness : thickness;
        scene.meshes.push(frustum(`neuron-process-myelin-${i}-${k}`, a, b, ra + oa, rb + ob, {
          startAngle: openStart, sides: 28, color: colors.myelin, role: 'process-myelin',
          staticContext: true, sheathThicknessMm: thickness,
          label: 'Thin process-myelin sleeve · reconstructed thickness; no independent electrical state',
        }));
      }
    }
  }

  // Internal context is intentionally static and receives no fiber/compartment
  // indices. Its colour must never be interpreted as a nuclear voltage trace.
  scene.meshes.push(ellipsoid('neuron-nucleus', [0.0015, 0.001, 0.0005], [0.0045, 0.005, 0.0042], colors.nucleus, 'static-nucleus'));
  scene.meshes.push(ellipsoid('neuron-nucleolus', [0.0027, 0.002, 0.002], [0.0011, 0.0012, 0.001], colors.nucleolus, 'static-nucleolus'));
  const glia = [
    { position: [-0.006, -0.0126, -0.0035], radii: [0.0045, 0.0011, 0.003] },
    { position: [0.004, 0.0139, -0.002], radii: [0.0037, 0.0009, 0.003] },
    { position: [0.008, -0.002, -0.0126], radii: [0.0032, 0.0034, 0.0008] },
  ];
  glia.forEach((cell, i) => {
    scene.meshes.push(ellipsoid(`neuron-satellite-glia-${i}`, cell.position, cell.radii, colors.glia, 'static-satellite-glia', 0.8));
    scene.meshes.push(ellipsoid(`neuron-satellite-nucleus-${i}`, cell.position, cell.radii.map(r => r * 0.48), colors.glialNucleus, 'static-glial-nucleus'));
  });

  label(scene, 'neuron-soma', `${(somaLength * 1000).toFixed(0)} µm soma · ten-frustum model cutaway`, [0, 0.026, 0], 5);
  label(scene, 'neuron-presoma', 'Pre-somatic process · model dimensions', [(presomaStart + somaStart) / 2 - somaCenter, 0.010, 0], 3);
  label(scene, 'neuron-peripheral-crop', 'Peripheral continuation · cropped', [cropMin, -0.011, 0], 4);
  label(scene, 'neuron-central-crop', 'Central continuation · cropped', [cropMax, -0.011, 0], 4);
  label(scene, 'neuron-nucleus-label', 'Nucleus · static context', [0.008, 0.009, 0.010], 2);
  label(scene, 'neuron-glia-label', 'Satellite glia · reconstructed patches', [-0.006, -0.023, -0.003], 3);
  label(scene, 'neuron-myelin-label', 'Process myelin · reconstructed thin sleeve', [0.052, 0.010, 0], 3);
  if (!scene.inspection.visibleNodeIndices.length) {
    scene.notes.push('The nearest modeled nodes of Ranvier lie outside this local crop. No extra nodes or node spacing have been invented to decorate the soma view.');
  } else {
    for (const i of scene.inspection.visibleNodeIndices) label(scene, `neuron-node-${i}`, `Node · ${(model.lengthMm[i] * 1000).toFixed(1)} µm`, [model.positionsMm[i] - somaCenter, 0.006, 0], 3);
  }
  scene.legend = [
    { label: 'Model soma / processes · Vm replay', color: colors.membrane, layer: 'nerve' },
    { label: 'Static process myelin', color: colors.myelin, layer: 'myelin' },
    { label: 'Static satellite glia', color: colors.glia, layer: 'nerve' },
    { label: 'Static nuclear context', color: colors.nucleus, layer: 'nerve' },
  ];
  scene.notes.unshift(
    `The ${somaIndices.length} somatic frusta, ${(somaLength * 1000).toFixed(0)} µm soma extent, and all process-core diameters are read directly from the running ${model.id ?? 'auditory-nerve'} model. This parameterized cell is not a morphometrically validated sample of an individual human neuron.`,
    'The soma is shown without a thick compact-myelin coat. Human large type-I somata and adjoining initial segments generally have non-myelinating satellite-glial context (Liu et al., 2021). The cutaway opening is an inspection aid, not an anatomical hole.',
    'Only meshes explicitly mapped to a cable compartment replay membrane voltage. Nucleus, nucleolus, satellite-glial patches, and myelin sleeves are static reconstructed context, without a membrane calculation of their own.',
    'Visible process sheaths are drawn only over model internodes; their radial thickness is an illustrative 35% of the local process-core radius. This is not a measured human g-ratio or a conversion of the cable model’s effective myelin-layer parameters.',
    'The cable model’s somatic capacitance factors are retained in the solver. They are not rendered as a thick somatic myelin shell. No hair-cell transduction, glial signaling, nuclear dynamics, or soma-to-soma coupling is added.',
    `This view crops a ${(1000 * (cropMax - cropMin)).toFixed(0)} µm local window from a ${(model.totalLengthMm ?? 0).toFixed(3)} mm model cable. Coordinates and scale are physical; neither process lengths nor soma diameters are enlarged.`,
  );
  if (fiber?.alive === false) scene.notes.push('The selected fiber was removed by the experiment’s survival mask. Its anatomical reference is visible, but it has no simulated neural response.');
  scene.bounds = bounds(scene.meshes);
  scene.camera = { position: [0.055, 0.11, 0.30], target: [-0.025, 0, 0], fov: 32 };
  return scene;
}

