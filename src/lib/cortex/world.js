import { getCortexImplantModel, getCortexContacts, implantTipPointsMm } from './implants.js';
import { validateConfig } from './config.js';
import { makeActiveMorphology } from './active-morphology.js';

// Layer ordering is anatomical; these fractions are explicit visualization assumptions.
// They are NOT a measured human M1 laminar profile (especially the thin layer IV).
export const LAYER_TEMPLATE = [
  ['I', 0, 0.06, '#bad1cc'],
  ['II', 0.06, 0.16, '#99b7b1'],
  ['III', 0.16, 0.46, '#729c99'],
  ['IV', 0.46, 0.5, '#ceba8f'],
  ['V', 0.5, 0.75, '#ae9474'],
  ['VI', 0.75, 1, '#8a7970'],
];
export function rotateVector(v, degrees) {
  let [x, y, z] = v;
  const [a, b, c] = degrees.map((d) => (d * Math.PI) / 180);
  [y, z] = [Math.cos(a) * y - Math.sin(a) * z, Math.sin(a) * y + Math.cos(a) * z];
  [x, z] = [Math.cos(b) * x + Math.sin(b) * z, -Math.sin(b) * x + Math.cos(b) * z];
  return [Math.cos(c) * x - Math.sin(c) * y, Math.sin(c) * x + Math.cos(c) * y, z];
}
export function transformPoint(localUm, pose) {
  return rotateVector(localUm, pose.rotationDeg).map((x, i) => x + pose.translationUm[i]);
}
export function placedContacts(model, pose) {
  return getCortexContacts(model).map((site) => ({
    ...site,
    positionUm: transformPoint(
      site.positionMm.map((x) => x * 1000),
      pose,
    ),
    normal: site.normal ? rotateVector(site.normal, pose.rotationDeg) : null,
  }));
}
export function makeMorphology(somaUm, maximumLengthUm = 40) {
  const nodes = [
    {
      id: 'soma',
      parent: -1,
      kind: 'soma',
      centerUm: [...somaUm],
      startUm: [...somaUm],
      endUm: [...somaUm],
      lengthUm: 20,
      diameterUm: 20,
      areaUm2: 4 * Math.PI * 10 ** 2,
    },
  ];
  // A single idealized passive arbor, not a reconstructed human neuron or density sample.
  const branches = [
    ['apical', [0, 0, -600], 3],
    ['basal-east', [250, 0, 150], 2],
    ['basal-west', [-250, 0, 150], 2],
    ['basal-north', [0, 250, 150], 2],
    ['basal-south', [0, -250, 150], 2],
  ];
  let synapseIndex = 0;
  for (const [name, delta, diameter] of branches) {
    const n = Math.ceil(Math.hypot(...delta) / maximumLengthUm),
      length = Math.hypot(...delta) / n;
    let parent = 0;
    for (let k = 0; k < n; k++) {
      const start = somaUm.map((x, axis) => x + delta[axis] * (10 / Math.hypot(...delta) + k / n)),
        end = somaUm.map((x, axis) => x + delta[axis] * (10 / Math.hypot(...delta) + (k + 1) / n));
      nodes.push({
        id: `${name}-${k}`,
        parent,
        kind: 'dendrite',
        startUm: start,
        endUm: end,
        centerUm: start.map((x, i) => (x + end[i]) / 2),
        lengthUm: length,
        diameterUm: diameter,
        areaUm2: Math.PI * diameter * length,
        // Fixed distal 100 µm input patch; overlap weights preserve its location on mesh refinement.
        synapseWeight:
          name === 'apical'
            ? Math.max(0, Math.min((k + 1) * length, 600) - Math.max(k * length, 500)) / 100
            : 0,
      });
      parent = nodes.length - 1;
    }
    if (name === 'apical') synapseIndex = parent;
  }
  return { id: 'canonical-passive-arbor/1', nodes, synapseIndex, somaIndex: 0 };
}
export function makeWorld(input) {
  const config = validateConfig(input),
    model = getCortexImplantModel(config.implant.deviceId);
  if (!model || model.revision !== config.implant.revision)
    throw new Error('Catalog revision changed; explicitly migrate the experiment.');
  const contacts = placedContacts(model, config.implant),
    neuron = config.neuron.modelId
      ? makeActiveMorphology(config)
      : makeMorphology(config.neuron.somaUm, config.neuron.segmentLengthUm);
  if (
    (Math.ceil(config.solver.durationMs / (config.solver.sampleMs ?? config.solver.dtMs)) + 1) *
      neuron.nodes.length >
    2000000
  )
    throw new Error(
      'This configuration exceeds the 2,000,000 compartment-frame storage budget (32 MB for voltage/current arrays). Shorten the run or, for the active model, increase the output sample interval without changing the integration timestep.',
    );
  if (
    config.neuron.modelId &&
    ((Math.ceil(config.solver.durationMs / config.solver.sampleMs) + 1) *
      (neuron.nodes.length * 10 + 10) +
      neuron.nodes.length) *
      8 >
      64 * 1024 * 1024
  )
    throw new Error(
      'Active voltage/current/channel outputs exceed 64 MB. Shorten the experiment or increase output sampling interval.',
    );
  for (const id of [...config.recording.contactIds, ...config.protocol.sourceContactIds])
    if (!contacts.some((s) => s.id === id)) throw new Error(`Unknown catalog contact ${id}.`);
  const inside = (p) =>
    Math.abs(p[0]) <= config.anatomy.widthUm / 2 &&
    Math.abs(p[1]) <= config.anatomy.widthUm / 2 &&
    p[2] >= 0 &&
    p[2] <= config.anatomy.thicknessUm;
  if (
    neuron.nodes.some(
      (n) => !inside(n.startUm) || !inside(n.endUm) || n.pathUm?.some((p) => !inside(p)),
    )
  )
    throw new Error('The complete arbor must remain inside the cortical patch.');
  const outside = contacts.filter((s) => !inside(s.positionUm)).length;
  return {
    config,
    model,
    contacts,
    tipsUm: implantTipPointsMm(model).map(p => transformPoint(p.map(x => x * 1000), config.implant)),
    neuron,
    layers: LAYER_TEMPLATE.map(([id, from, to, color]) => ({
      id,
      topUm: from * config.anatomy.thicknessUm,
      bottomUm: to * config.anatomy.thicknessUm,
      color,
      evidence: 'assumption',
    })),
    warnings: outside
      ? [
          `${outside} of ${contacts.length} contacts are outside the cortical box. All remain visible; this is expected for a partially inserted long shank. The electrical solver still assumes an infinite homogeneous conductor.`,
        ]
      : [],
  };
}
