import * as THREE from 'three';

// Reference-informed appearance, not measured optical constants. Geometry and
// source measurements are independent of color, opacity and surface response.
const finishes = {
  silicon: { color: 0x454d59, metalness: 0.32, roughness: 0.38 },
  polyimide: { color: 0xc68a36, metalness: 0.02, roughness: 0.4, opacity: 0.83 },
  parylene: { color: 0xc8d6da, metalness: 0, roughness: 0.28, opacity: 0.36 },
  silicone: { color: 0xe1e3dd, metalness: 0, roughness: 0.46, opacity: 0.7 },
  polyurethane: { color: 0xdde2dc, metalness: 0, roughness: 0.32, opacity: 0.78 },
  ptfe: { color: 0xe9e9df, metalness: 0, roughness: 0.5 },
  'neutral-polymer': { color: 0xdfe3df, metalness: 0, roughness: 0.46, opacity: 0.75 },
  'neutral-metal': { color: 0xc0c7cf, metalness: 0.75, roughness: 0.4 },
  carbon: { color: 0x343a42, metalness: 0.08, roughness: 0.58 },
  ceramic: { color: 0xe7e4d7, metalness: 0, roughness: 0.65 },
  titanium: { color: 0xa6aeb8, metalness: 0.8, roughness: 0.4 },
  nitinol: { color: 0xb7c1ca, metalness: 0.8, roughness: 0.34 },
  platinum: { color: 0xc8ced4, metalness: 0.82, roughness: 0.36 },
  'platinum-nanorod': { color: 0x52585e, metalness: 0.26, roughness: 0.86 },
  'platinum-iridium': { color: 0xbcc3cb, metalness: 0.82, roughness: 0.4 },
  'titanium-nitride': { color: 0x78818a, metalness: 0.38, roughness: 0.72 },
  iridium: { color: 0xb6bbc4, metalness: 0.76, roughness: 0.4 },
  'iridium-oxide': { color: 0x3e454f, metalness: 0.12, roughness: 0.72 },
  sirof: { color: 0x3e454f, metalness: 0.12, roughness: 0.72 },
  pedot: { color: 0x333d46, metalness: 0.04, roughness: 0.88 },
  graphene: { color: 0x53676c, metalness: 0.08, roughness: 0.5, opacity: 0.7 },
  gold: { color: 0xc5a15b, metalness: 0.8, roughness: 0.36 },
  mp35n: { color: 0xbac3cc, metalness: 0.82, roughness: 0.4 },
};

export function createDeviceMaterial(finish, overrides = {}) {
  const properties = finishes[finish];
  if (!properties) throw new Error(`Unknown implant material finish: ${finish}`);
  const transparent = (overrides.opacity ?? properties.opacity ?? 1) < 1;
  const material = new THREE.MeshStandardMaterial({
    ...properties, side: THREE.DoubleSide, transparent, depthWrite: !transparent,
    ...overrides,
  });
  material.name = finish;
  material.userData = { appearance: 'Reference-informed visualization; optical properties are not measured', finish };
  return material;
}

export function createDeviceMaterials(model) {
  const defaults = model.kind === 'planar-probe' || model.kind === 'neuropixels'
    ? ['silicon', 'titanium-nitride']
    : model.kind === 'surface-grid' ? ['parylene', 'platinum']
    : ['cylindrical-lead', 'flat-cuff', 'nerve-cuff'].includes(model.kind) ? ['silicone', 'platinum-iridium']
    : model.kind === 'exposed-wire' ? ['ptfe', 'platinum-iridium']
    : ['silicon', 'platinum'];
  const appearance = model.appearance ?? {};
  return {
    substrate: createDeviceMaterial(appearance.substrate ?? defaults[0],
      ['flat-cuff','nerve-cuff'].includes(model.kind) ? { opacity: 0.35 } : {}),
    contact: createDeviceMaterial(appearance.contact ?? defaults[1], {
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }),
  };
}
