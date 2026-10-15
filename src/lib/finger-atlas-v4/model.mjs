/**
 * Finger Pathway Atlas v4 — one deterministic, world-registered cell graph.
 *
 * Every coordinate and radius is in millimetres. The surface atlas uses a
 * right-sided limb (negative x); positive y is superior. Source anatomical
 * coordinates [x,y,z] map to [x,z-1250,-y-95]. Cell placements, connectivities,
 * long-range trajectories and dimensional priors below are modeled examples,
 * not registered histological reconstructions or a measured human connectome.
 * Cells retain their identities and geometry when the renderer changes LOD.
 */

export const MODEL_SOURCES = [
  { id: 'v3-anatomy', label: 'BodyParts3D anatomical scaffold and v3 route landmarks', href: '/assets/finger-pathway-atlas/v3/SOURCES.md' },
  { id: 'comparison-plates', label: 'Histology, microscopy and reconstruction comparison plates', href: '/simulations/finger-pathway-atlas/references/' },
];

const world = ([x, y, z]) => [x, z - 1250, -y - 95];
const add = (a, b) => a.map((n, i) => n + b[i]);
const lerp = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
const copy = p => [...p];
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const branch = (id, role, points) => ({ id, role, points: points.map(copy) });
const nativeBranch = (id, role, points) => branch(id, role, points.map(world));
const region = (id, name, native, distanceMm, description, referencePlates) => ({ id, name, center: world(native), distance: distanceMm, description, referencePlates });

export const REGIONS = [
  region('overview', 'Complete pathway', [-130, -110, 1185], 1450, 'One world-registered representative cell graph from the right index finger and its muscle targets to left sensory and motor cortex.', []),
  region('tip', 'Fingertip endings', [-311, -179, 680], 16, 'Distinct cutaneous receptor endings remain attached to their parent primary afferents. Support morphology is synthetic and reference informed.', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]),
  region('hand', 'Hand and finger', [-280, -149, 735], 210, 'Terminal fields along the selected index finger and a separate intrinsic-muscle motor destination.', [1, 6, 12]),
  region('nerve', 'Median nerve fibers', [-263, -128, 818], 3, 'Continuous individual fibers with micrometre-scale caliber. No cut surface or cross section is part of this model.', [15, 16, 17, 18, 19, 20]),
  region('arm', 'Peripheral nerve routes', [-216, -96, 1030], 650, 'Median sensory route; separate median, radial and ulnar motor trajectories. Their geometry is landmark based.', [15, 17, 18]),
  region('drg', 'Sensory ganglion', [-24.3, -91, 1414.1], 1.4, 'One soma and one stem per primary afferent, joining its peripheral and central branches at a T-junction. There is no DRG synapse.', [21, 22, 23, 24]),
  region('spinal', 'Cervical spinal circuit', [-3, -76, 1409], 34, 'Dorsal sensory entry, pain-pathway spinal crossing, local interneurons and separate ventral motor output. Root levels are illustrative, not an exclusive index-finger dermatome map.', [25, 26]),
  region('medulla', 'Medullary relays and crossings', [-2, -82, 1497], 34, 'Touch relays in the right cuneate nucleus before crossing. The motor crossing is separate and more caudal.', [27, 28]),
  region('pons', 'Pons transit', [7, -97, 1528], 24, 'Distinct ascending sensory and descending motor axons traverse the pons. No obligatory relay is invented here.', [28]),
  region('midbrain', 'Midbrain transit', [9, -98, 1544], 22, 'Sensory fibers continue to thalamus while corticospinal axons descend through a separate route.', [28]),
  region('thalamus', 'Left VPL relay', [12, -92, 1561], 1.5, 'Separate modeled thalamic relay neurons connect ascending sensory pathways to S1. VPL is not a segmented source subnucleus.', [29, 38]),
  region('cortex', 'Left S1 and M1', [36.5, -89, 1607.5], 34, 'Simplified individual cortical receivers and upper motor neurons. Local placement and connectivity are modeled; cortical cell complexity is intentionally reduced.', [30, 31, 32, 33, 34, 36, 37, 38, 39, 40]),
  region('nmj', 'Forearm motor endplates', [-225, -83, 974], 2, 'Motor axons end at a modeled forearm muscle endplate. Other motor routes terminate at extensor and intrinsic hand-muscle targets.', [41, 42, 43, 44]),
  region('proprio', 'Muscle and tendon receptors', [-220, -79, 990], 5, 'Muscle spindles and Golgi tendon organs connect to their own DRG cells, conscious sensory relays and illustrative local spinal collaterals. Select a tendon-organ route to visit its more distal myotendinous target.', [45, 46, 47, 48, 49, 50]),
];

// Native atlas landmarks. Negative x belongs to the anatomical right side.
const TACTILE = [
  [-311,-179,679],[-305,-163,697],[-296,-146,724],[-279,-140,765],
  [-263,-128,818],[-243,-122,906],[-221,-105,993],[-208,-101,1061],
  [-184,-94,1178],[-169,-85,1276],[-137,-93,1338],[-88,-96,1366],
  [-52,-95,1392],[-24,-91,1414],[-12,-76,1418],[-5,-66,1422],
  [-5,-66,1437],[-5,-65,1462],[-5,-69,1497],
];
const LEMNISCUS = [[-5,-69,1497],[-9,-76,1502],[2,-88,1508],[7,-97,1528],[9,-98,1544],[12,-92,1561]];
const CORTICAL = [[12,-92,1561],[22,-83,1586],[36,-78,1607]];
const UPPER_MOTOR = [[37,-100,1608],[24,-94,1586],[14,-94,1557],[7,-103,1534],[4,-93,1502],[2,-89,1486],[-4,-83,1477],[-5,-72,1450]];
const MOTOR = {
  median: [[-4,-84,1409],[-16,-94,1406],[-35,-103,1398],[-84,-100,1362],[-139,-94,1338],[-169,-91,1278],[-182,-95,1176],[-208,-104,1060],[-221,-105,1005],[-224,-90,985],[-225,-83,974]],
  radial: [[-4,-84,1390],[-20,-95,1389],[-65,-94,1365],[-148,-84,1318],[-189,-43,1220],[-214,-31,1133],[-232,-52,1034],[-248,-96,944],[-248,-96,900],[-244,-100,845]],
  ulnar: [[-4,-83,1386],[-25,-88,1381],[-74,-94,1361],[-148,-81,1319],[-181,-54,1215],[-203,-42,1082],[-214,-61,1035],[-239,-99,918],[-245,-107,835],[-248,-127,790],[-270,-148,749]],
};

const SCOPE = 'Representative connected anatomical model: 52 cutaneous tactile afferents, 8 free-ending nociceptive examples, 6 proprioceptive afferents, and 12 motor-unit examples with distinct relay cells. Every modeled cell is present in a single millimetre coordinate system. This is not a full biological cell census, measured connectome, histology/EM segmentation, or physiological simulation. Somata, caliber, dendrites, receptor structures, anatomical routes and synaptic assignments are reference-informed synthetic priors; the source plates are comparisons, not registration data. Conscious proprioceptive pathways and selected local collaterals are represented; cerebellar, autonomic, reticular and other collateral networks are outside this model.';
const CELL_NOTE = 'Synthetic cell identity, morphology prior and atlas placement; not a measured individual human neuron. Terminal coordinates at target somata encode conceptual synaptic graph attachment, not measured subcellular synapse positions.';

function random(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

function makeCell(id, name, kind, type, regionId, nativeSoma, radius, axonRadius, extra = {}) {
  return { id, name, kind, type, region: regionId, soma: world(nativeSoma), somaRadiusMm: radius, axonRadiusMm: axonRadius, branches: [], sourceNote: CELL_NOTE, ...extra };
}

function packSensorySomata(radii) {
  const rng = random(408619), placed = [];
  for (const radius of radii) {
    let accepted;
    for (let attempt = 0; attempt < 12000; attempt++) {
      const p = [(rng() - .5) * .50, (rng() - .5) * .42, (rng() - .5) * .48];
      if ((p[0] / .25) ** 2 + (p[1] / .21) ** 2 + (p[2] / .24) ** 2 > 1) continue;
      if (placed.every(other => distance(p, other.p) > (radius + other.radius) * 1.12)) { accepted = p; break; }
    }
    if (!accepted) throw new Error('Sensory soma packing exhausted');
    placed.push({ p: accepted, radius });
  }
  return placed.map(({ p }) => add([-24.30,-91,1414.1], p));
}

// Stable unequal offsets preserve fiber identity without independently jittering
// every control point. The small offsets describe a modeled fascicular sample.
function offsetFor(index, count, scale = .18) {
  const angle = index * 2.399963229728653, rho = Math.sqrt((index + .5) / count) * scale;
  return [Math.cos(angle) * rho, Math.sin(angle) * rho, Math.sin(angle * .73) * scale * .32];
}
function offsetPath(points, offset) { return points.map(p => add(p, offset)); }
function localSoma(center, index, count, spread = .20) { return add(center, offsetFor(index, count, spread)); }
function landmark(regionId, cell, nativePoint, label) { return { region: regionId, cellId: cell.id, point: world(nativePoint), label }; }
function somaLandmark(regionId, cell, label) { return { region: regionId, cellId: cell.id, point: copy(cell.soma), label }; }
function synapse(from, to) { return { from: from.id, to: to.id, at: copy(to.soma), kind: 'synapse' }; }

function tactileTerminal(index, type, rng) {
  // The first 24 endings occupy the distal pad; remaining samples continue
  // along the middle/proximal glabrous index finger. No population inference.
  const segment = index < 24 ? 0 : index < 38 ? 1 : 2;
  const base = segment === 0 ? TACTILE[0] : lerp(TACTILE[segment], TACTILE[segment + 1], .2 + .5 * rng());
  const depth = type === 'pacinian' ? 1.6 : type === 'sa2' ? .8 : type === 'free' ? -.25 : 0;
  return { point: add(base, [(rng() - .5) * 5.8, depth + (rng() - .5) * 1.5, (rng() - .5) * 2.2]), segment };
}

/** Create a fresh deterministic model; renderer caches must not mutate it. */
export function createAtlasModel() {
  const cells = [], routes = [], rng = random(731);
  const types = Array.from({ length: 52 }, (_, i) => i < 22 ? 'meissner' : i < 39 ? 'merkel' : i < 45 ? 'pacinian' : 'sa2');
  // Spread receptor types across the finger while preserving exact counts.
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  const primaryTypes = [...types, ...Array(8).fill('free'), 'spindle','spindle','spindle','spindle','golgi','golgi'];
  const radii = primaryTypes.map((type, i) => type === 'free' ? .012 + (i % 4) * .0012 : .020 + (i % 7) * .0018);
  const somata = packSensorySomata(radii);
  const labels = { meissner: 'Meissner-associated FA-I', merkel: 'Merkel-associated SA-I', pacinian: 'Pacinian-associated FA-II', sa2: 'SA-II afferent (end organ unresolved)', free: 'Free-ending nociceptive example', spindle: 'Muscle-spindle afferent', golgi: 'Golgi tendon-organ afferent' };

  for (let i = 0; i < primaryTypes.length; i++) {
    const type = primaryTypes[i], pain = type === 'free', proprio = type === 'spindle' || type === 'golgi';
    const kind = pain ? 'pain' : proprio ? 'proprioception' : 'touch';
    const num = String(i + 1).padStart(3, '0'), id = `sensory-${num}`;
    const offset = offsetFor(i, primaryTypes.length), main = offsetPath(TACTILE, offset);
    const tJunction = add([-24,-91,1414], offset.map(n => n * .5));
    main[13] = tJunction;
    const axonRadius = pain ? .00035 + (i % 4) * .00005 : proprio ? .004 + (i % 3) * .0004 : .0028 + (i % 7) * .00028;
    let terminal, peripheral;
    if (proprio) {
      const n = i - 60;
      // Targets follow local source-mesh neighborhoods: FDP muscle belly for
      // spindles, distal FDP taper for tendon organs. Exact organ positions are
      // modeled; source anatomy does not segment spindles or tendon organs.
      terminal = add(type === 'spindle' ? [-220,-79,990] : [-242,-115,860], [(n % 3 - 1) * .55, (n % 2 - .5) * .8, n * .45]);
      peripheral = [terminal, add(terminal, [.35, 1.2, 1.2]), ...main.slice(type === 'spindle' ? 6 : 5, 14)];
    } else {
      const position = tactileTerminal(pain ? i - 52 : i, type, random(113 + i * 97));
      terminal = position.point;
      peripheral = [terminal, ...main.slice(position.segment + 1, 14)];
    }
    const primary = makeCell(id, `${labels[type]} ${i + 1}`, 'sensory', type, 'drg', somata[i], radii[i], axonRadius, {
      terminal: world(terminal), receptorType: type, routeId: `route-${id}`, tJunction: world(tJunction),
      sensoryClass: type === 'spindle' ? (i < 62 ? 'Ia spindle primary ending example' : 'II spindle secondary ending example') : type === 'golgi' ? 'Ib tendon-organ example' : pain ? 'C-fiber nociceptive example' : 'A-beta tactile example',
      myelinated: !pain, diameterPrior: pain ? 'Small unmyelinated C-fiber example; free endings also include other fiber classes outside this sample.' : 'Illustrative class-range prior; not an individual measured fiber.',
    });
    const route = { id: `route-${id}`, name: `${labels[type]} ${i + 1}`, kind, cellIds: [], connections: [], landmarks: [] };
    const appendCell = cell => { cells.push(cell); route.cellIds.push(cell.id); };
    appendCell(primary);
    primary.branches.push(nativeBranch(`${id}-stem`, 'stem', [somata[i], lerp(somata[i], tJunction, .52), tJunction]));

    let relay, relayNative, central;
    if (pain) {
      relayNative = localSoma([-3,-67.5,1418], i - 52, 8, .14);
      relay = makeCell(`${id}-dorsal`, `Dorsal-horn projection neuron ${i - 51}`, 'relay', 'dorsal-projection', 'spinal', relayNative, .011 + (i % 3) * .001, .0007);
      central = [...main.slice(14, 15), relayNative];
    } else {
      relayNative = localSoma([-5,-69,1497], i, 66, .24);
      relay = makeCell(`${id}-cuneate`, `Right cuneate relay ${i + 1}`, 'relay', 'cuneate', 'medulla', relayNative, .014 + (i % 4) * .0012, .0014);
      central = [...main.slice(14, -1), relayNative];
    }
    primary.branches.unshift(nativeBranch(`${id}-axon`, 'axon', [...peripheral, ...central]));
    appendCell(relay);
    route.connections.push(synapse(primary, relay));

    const vplNative = localSoma([12,-92,1561], i, 66, .28);
    const vpl = makeCell(`${id}-vpl`, `Left VPL relay ${i + 1}`, 'relay', 'vpl', 'thalamus', vplNative, .011 + (i % 5) * .0008, .0011);
    const relayPath = pain
      ? [relayNative, add([-1,-75,1418], offset), add([1.5,-79,1419], offset), add([4,-78,1437], offset), add([4.5,-80,1462], offset), add([5,-87,1497], offset), add([7.8,-98.5,1528], offset), add([10,-99,1544], offset), vplNative]
      : [relayNative, ...offsetPath(LEMNISCUS.slice(1, -1), offset), vplNative];
    relay.branches.push(nativeBranch(`${relay.id}-axon`, 'axon', relayPath));
    appendCell(vpl);
    route.connections.push(synapse(relay, vpl));

    const s1Native = localSoma([36,-78,1607], i, 66, .40);
    const s1 = makeCell(`${id}-s1`, `Left S1 cortical receiver ${i + 1}`, 'relay', 's1', 'cortex', s1Native, .010 + (i % 3) * .001, .00065, { simplified: true });
    vpl.branches.push(nativeBranch(`${vpl.id}-axon`, 'axon', [vplNative, add(CORTICAL[1], offset), s1Native]));
    s1.branches.push(nativeBranch(`${s1.id}-local`, 'axon', [s1Native, add(s1Native, [.035,-.045,-.055]), add(s1Native, [.09,-.02,-.12])]));
    appendCell(s1);
    route.connections.push(synapse(vpl, s1));

    route.landmarks.push(
      landmark(proprio ? 'proprio' : 'tip', primary, terminal, proprio ? 'Muscle/tendon sensory terminal' : 'Cutaneous sensory terminal'),
      ...(!proprio ? [landmark('nerve', primary, main[4], 'Continuous median sensory fiber')] : []),
      somaLandmark('drg', primary, 'DRG soma and stem (no synapse)'),
      landmark('spinal', primary, pain ? relayNative : main[15], pain ? 'Dorsal-horn relay' : 'Ipsilateral dorsal column'),
      somaLandmark(pain ? 'spinal' : 'medulla', relay, pain ? 'Spinal projection neuron / spinal crossing' : 'Cuneate relay / medullary crossing'),
      landmark('pons', relay, relayPath[pain ? 6 : 3], 'Ascending axon through pons'),
      landmark('midbrain', relay, relayPath[pain ? 7 : 4], 'Ascending axon through midbrain'),
      somaLandmark('thalamus', vpl, 'Separate left VPL relay'),
      somaLandmark('cortex', s1, 'Separate left S1 receiver'),
    );

    if (proprio) {
      const localNative = localSoma([-3,-73.5,1418], i - 60, 6, .18);
      const local = makeCell(`${id}-local-interneuron`, `Proprioceptive spinal interneuron ${i - 59}`, 'interneuron', 'spinal-interneuron', 'spinal', localNative, .009, .0007);
      // A collateral branches from an existing central-axon control point.
      // This is a selected local branch, not a complete monosynaptic reflex arc.
      primary.branches.push(nativeBranch(`${id}-spinal-collateral`, 'collateral', [main[15], add([-4,-71,1420], offset), localNative]));
      local.branches.push(nativeBranch(`${local.id}-axon`, 'axon', [localNative, add(localNative, [.07,-.04,-.09]), add(localNative, [.13,-.06,-.20])]));
      appendCell(local);
      route.connections.push(synapse(primary, local));
      route.landmarks.push(somaLandmark('spinal', local, 'Selected local proprioceptive collateral'));
    }
    routes.push(route);
  }

  for (let i = 0; i < 12; i++) {
    const nerve = i < 4 ? 'median' : i < 8 ? 'radial' : 'ulnar', n = i % 4;
    const id = `motor-${String(i + 1).padStart(3, '0')}`, offset = offsetFor(n, 4, .15);
    const tract = offsetPath(MOTOR[nerve], offset), lmnNative = tract[0];
    const localNative = add([-2.5,-75.5,MOTOR[nerve][0][2]], offset);
    const m1Native = localSoma([37,-100,1608], i, 12, .33);
    const m1 = makeCell(`${id}-m1`, `Left M1 upper motor neuron ${i + 1}`, 'motor', 'm1', 'cortex', m1Native, .015 + (i % 4) * .002, .0022, { simplified: true, nerve, routeId: `route-${id}` });
    const local = makeCell(`${id}-interneuron`, `Right spinal motor interneuron ${i + 1}`, 'interneuron', 'spinal-interneuron', 'spinal', localNative, .010 + n * .0007, .0008, { nerve });
    const lmn = makeCell(`${id}-lower`, `Lower motor neuron ${i + 1} (${nerve})`, 'motor', 'lower-motor', 'spinal', lmnNative, .024 + n * .003, .004 + n * .0007, { nerve, terminal: world(tract.at(-1)), receptorType: 'nmj', myelinated: true });
    m1.branches.push(nativeBranch(`${m1.id}-axon`, 'axon', [m1Native, ...offsetPath(UPPER_MOTOR.slice(1), offset), add([-5,-72,1422], offset), localNative]));
    local.branches.push(nativeBranch(`${local.id}-axon`, 'axon', [localNative, add([-3.4,-79.4,MOTOR[nerve][0][2] + .35], offset), lmnNative]));
    lmn.branches.push(nativeBranch(`${lmn.id}-axon`, 'axon', tract));
    cells.push(m1, local, lmn);
    routes.push({
      id: `route-${id}`, name: `${nerve[0].toUpperCase() + nerve.slice(1)} motor unit ${n + 1}`, kind: 'motor',
      cellIds: [m1.id, local.id, lmn.id], connections: [synapse(m1, local), synapse(local, lmn)],
      landmarks: [
        somaLandmark('cortex', m1, 'Left M1 upper motor neuron'),
        landmark('midbrain', m1, add(UPPER_MOTOR[2], offset), 'Descending corticospinal axon'),
        landmark('pons', m1, add(UPPER_MOTOR[3], offset), 'Ventral pontine transit'),
        landmark('medulla', m1, add(UPPER_MOTOR[6], offset), 'Caudal pyramidal decussation'),
        somaLandmark('spinal', local, 'Distinct spinal interneuron'),
        somaLandmark('spinal', lmn, 'Ventral-horn lower motor neuron'),
        landmark('arm', lmn, tract[Math.min(7, tract.length - 2)], `${nerve} motor axon / ventral-root output`),
        landmark('nmj', lmn, tract.at(-1), nerve === 'ulnar' ? 'Intrinsic hand-muscle endplate' : 'Forearm muscle endplate'),
      ],
    });
  }

  return {
    version: 4, units: 'mm', cells, routes, regions: REGIONS, scope: SCOPE, sources: MODEL_SOURCES,
    coordinateSystem: { units: 'mm', rightSide: 'negative x', superior: 'positive y', sourceTransform: '[x, z-1250, -y-95]' },
    statistics: { primarySensoryCells: 66, tactileAfferents: 52, nociceptiveExamples: 8, proprioceptiveAfferents: 6, motorUnits: 12, cells: cells.length, routes: routes.length },
  };
}
