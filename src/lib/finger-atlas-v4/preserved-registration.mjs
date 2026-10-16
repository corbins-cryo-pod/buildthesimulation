/**
 * Register preserved V3 cell surfaces in the V4 cell graph.
 *
 * The extractor subtracts each sourceAnchorUm from ORIGINAL source vertices,
 * paths and ports. Template coordinates in this module are therefore LOCAL
 * micrometres. sourceAnchorUm is provenance, never another transform to apply.
 * World geometry = worldAnchorMm + rotation(localUm) * 0.001.
 * Uniform physical scale is fixed: no cell-specific inflation or shrinking.
 *
 * This module changes neither source morphology nor the canonical cell graph.
 * registeredCellBranches supplies display connectors to the preserved source
 * ports. Those new placements/connections remain explicitly modeled.
 */
import { createAtlasModel } from './model.mjs';

export const PRESERVED_SCALE_MM_PER_UM = 0.001;
export const PRESERVED_REGISTRATION_NOTICE = 'Original V3 local cell geometry is retained at 1 micrometre = 0.001 millimetre. Anatomical placement, orientation, template reuse and connections between preserved source ports and long-range routes are modeled. Cortical source reconstructions are not measured S1/M1 finger-pathway cells; noncortical V3 geometries remain their original synthetic models.';
export const V3_CORTICAL_SOURCE_IDS = Object.freeze([508282493,508298270,508305938,508378649,508421103,517673596,488386504,488386626,488418027,569849486]);
// Source metadata identifies these six as spiny with an intact apical dendrite.
// They are layers II/III, not verified corticospinal neurons; they are selected
// only as preserved morphological analogues for modeled upper motor cells.
export const V3_APICAL_SPINY_SOURCE_IDS = Object.freeze(V3_CORTICAL_SOURCE_IDS.slice(0, 6));
// Semantic locations in the original V3 comparison specimens. These are model
// landmarks, not measured organ centroids. Manifest organCenterUm takes
// precedence; the constants allow the original asset manifest to be read too.
const V3_TERMINAL_ORGAN_POINTS_UM = Object.freeze({
  meissner: [-335,230,0], merkel: [-65,290,0], pacinian: [318,-50,5],
  free: [89,200,99], nmj: [0,20,0], spindle: [-330,0,0], golgi: [285,0,0],
});

const add = (a, b) => a.map((n, i) => n + b[i]);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const mul = (a, factor) => a.map(n => n * factor);
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const length = a => Math.hypot(...a);
const norm = a => length(a) > 1e-12 ? mul(a, 1 / length(a)) : [0, 1, 0];
const samePoint = (a, b) => a.length === 3 && a.every((n, i) => Math.abs(n - b[i]) < 1e-9);
const copyPoint = point => [...point];

function assertPoint(point, label) {
  if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) throw new TypeError(`${label} must be a finite three-coordinate point`);
}

/** Rotate a vector by quaternion [x,y,z,w], without introducing a reflection. */
function rotate(point, quaternion) {
  const u = quaternion.slice(0, 3), w = quaternion[3];
  const twiceCross = mul(cross(u, point), 2);
  return add(add(point, mul(twiceCross, w)), cross(u, twiceCross));
}

function align(from, to) {
  const a = norm(from), b = norm(to), d = Math.max(-1, Math.min(1, dot(a, b)));
  if (d > 1 - 1e-12) return [0, 0, 0, 1];
  if (d < -1 + 1e-12) {
    const axis = norm(cross(a, Math.abs(a[0]) < .8 ? [1,0,0] : [0,1,0]));
    return [...axis, 0];
  }
  const axis = cross(a, b), q = [...axis, 1 + d], magnitude = Math.hypot(...q);
  return q.map(n => n / magnitude);
}

export function transformPreservedPoint(localUm, registration) {
  assertPoint(localUm, 'Local source point');
  return add(registration.worldAnchorMm, mul(rotate(localUm, registration.rotation), PRESERVED_SCALE_MM_PER_UM));
}

export function inversePreservedPoint(worldMm, registration) {
  assertPoint(worldMm, 'World point');
  const q = registration.rotation;
  return rotate(mul(sub(worldMm, registration.worldAnchorMm), 1 / PRESERVED_SCALE_MM_PER_UM), [-q[0],-q[1],-q[2],q[3]]);
}

/** Recover an original V3 specimen coordinate from a normalized template point. */
export function originalPreservedPoint(localUm, registration) {
  assertPoint(localUm, 'Local source point');
  return add(localUm, registration.sourceAnchorUm);
}

function legacyRandom(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function legacySensorySubtype(id) {
  if (id >= 101 && id <= 108) return 'free';
  if (id < 1 || id > 52) return null;
  const q = legacyRandom(731 + (id - 1) * 137)();
  return q < .43 ? 'meissner' : q < .76 ? 'merkel' : q < .87 ? 'pacinian' : 'sa2';
}

function ordinal(cell) {
  const match = String(cell.id).match(/(?:sensory|motor)-(\d+)/);
  if (match) return Math.max(0, Number(match[1]) - 1);
  let hash = 2166136261;
  for (const char of String(cell.id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function catalogRecords(manifest) {
  const records = Array.isArray(manifest) ? manifest : manifest?.templates;
  if (!Array.isArray(records)) throw new TypeError('Preserved morphology manifest requires a templates array');
  return records;
}

let defaultModel;
const assignmentCache = new WeakMap();
const sourceIdOrder = (a, b) => Number(a.sourceCellId) - Number(b.sourceCellId);
const sourceSubtype = template => template.metadata?.subtype || template.metadata?.type || legacySensorySubtype(Number(template.sourceCellId));

/**
 * Assign finite original collections without accidentally skipping templates
 * when model IDs from several classes are interleaved. Matching receptor class
 * is preferred, then unmatched large-afferent somata become explicit morphology
 * analogues. All 60 original DRG cells and all 26 spinal nonmotor templates occur
 * before any reuse in the standard 306-cell graph.
 */
function assignmentsFor(model, records) {
  let perModel = assignmentCache.get(records);
  if (!perModel) { perModel = new WeakMap(); assignmentCache.set(records, perModel); }
  if (perModel.has(model)) return perModel.get(model);
  const assigned = new Map();
  const sensory = model.cells.filter(cell => cell.kind === 'sensory');
  const drg = records.filter(template => template.key.startsWith('drg:')).sort(sourceIdOrder);
  const used = new Set();
  const put = (cell, template) => { if (template) { assigned.set(cell.id, template); used.add(template.key); } };
  for (const type of ['free','meissner','merkel','pacinian','sa2']) {
    const sources = drg.filter(template => sourceSubtype(template) === type);
    const targets = sensory.filter(cell => cell.type === type);
    for (let i = 0; i < Math.min(sources.length, targets.length); i++) put(targets[i], sources[i]);
  }
  const pending = sensory.filter(cell => !assigned.has(cell.id) && !['spindle','golgi'].includes(cell.type));
  const unused = drg.filter(template => !used.has(template.key) && sourceSubtype(template) !== 'free');
  pending.forEach((cell, i) => put(cell, unused[i]));
  const large = drg.filter(template => sourceSubtype(template) !== 'free');
  sensory.filter(cell => ['spindle','golgi'].includes(cell.type)).forEach((cell, i) => put(cell, large[i % large.length]));

  const spinal = records.filter(template => template.key.startsWith('spinal:') && Number(template.sourceCellId) >= 381 && Number(template.sourceCellId) <= 406).sort(sourceIdOrder);
  const spinalCells = model.cells.filter(cell => ['dorsal-projection','spinal-interneuron'].includes(cell.type));
  spinalCells.forEach((cell, i) => { if (spinal.length) assigned.set(cell.id, spinal[i % spinal.length]); });
  perModel.set(model, assigned);
  return assigned;
}

function choose(records, predicate, cell, family) {
  const candidates = records.filter(predicate).sort((a, b) => {
    const na = Number(a.sourceCellId), nb = Number(b.sourceCellId);
    return Number.isFinite(na) && Number.isFinite(nb) && na !== nb ? na - nb : String(a.key).localeCompare(String(b.key));
  });
  if (!candidates.length) throw new Error(`Missing preserved V3 ${family} template for ${cell.id}`);
  return candidates[ordinal(cell) % candidates.length];
}

function somaTemplate(cell, records, model) {
  const prefix = value => template => template.key.startsWith(`${value}:`);
  const assigned = assignmentsFor(model, records).get(cell.id);
  if (assigned) return assigned;
  if (cell.kind === 'sensory') {
    const proprio = ['spindle','golgi'].includes(cell.type);
    return choose(records, template => {
      if (!template.key.startsWith('drg:')) return false;
      const subtype = template.metadata?.subtype || template.metadata?.type || legacySensorySubtype(Number(template.sourceCellId));
      return proprio ? subtype !== 'free' : subtype === cell.type;
    }, cell, proprio ? 'large-afferent DRG soma' : `${cell.type} DRG soma`);
  }
  if (cell.type === 'cuneate') return choose(records, prefix('medulla'), cell, 'cuneate');
  if (cell.type === 'vpl') return choose(records, prefix('thalamus'), cell, 'VPL');
  if (cell.type === 'lower-motor') return choose(records, template => prefix('spinal')(template) && Number(template.sourceCellId) >= 201 && Number(template.sourceCellId) <= 212, cell, 'lower motor neuron');
  if (['spinal-interneuron','dorsal-projection'].includes(cell.type)) return choose(records, template => prefix('spinal')(template) && Number(template.sourceCellId) >= 381 && Number(template.sourceCellId) <= 406, cell, 'spinal multipolar');
  if (cell.type === 'm1') return choose(records, template => prefix('cortex')(template) && V3_APICAL_SPINY_SOURCE_IDS.includes(Number(template.sourceCellId)), cell, 'spiny cortical cell with intact apical dendrite');
  if (cell.type === 's1') return choose(records, prefix('cortex'), cell, 'cortical receiver');
  throw new Error(`No preserved V3 soma-family mapping for ${cell.type} (${cell.id})`);
}

function outgoingBranch(cell) {
  const preferredRole = cell.kind === 'sensory' ? 'stem' : 'axon';
  return (cell.branches || []).find(branch => branch.role === preferredRole && samePoint(branch.points[0], cell.soma));
}

function terminalEndpoint(cell) {
  for (const branch of cell.branches || []) {
    if (samePoint(branch.points[0], cell.terminal)) return { branch, endpoint: 'start', index: 0, adjacent: 1 };
    if (samePoint(branch.points.at(-1), cell.terminal)) return { branch, endpoint: 'end', index: branch.points.length - 1, adjacent: branch.points.length - 2 };
  }
  throw new Error(`Cell ${cell.id} has no branch endpoint at its terminal`);
}

function terminalOrganCenter(template) {
  const originalPoint = V3_TERMINAL_ORGAN_POINTS_UM[template.key.slice('terminal:'.length)];
  const point = template.organCenterUm || (originalPoint && sub(originalPoint, template.sourceAnchorUm));
  assertPoint(point, `${template.key} local organ landmark`);
  return point;
}

function orientation(cell, template, anchor) {
  if (anchor === 'soma') {
    // Source cortical reconstructions are already display oriented with their
    // apical direction along +Y. Do not rotate an entire cortical arbor to aim
    // one distant axon leaf; the new connector can leave from that actual leaf.
    if (template.key.startsWith('cortex:')) return cell.pialNormal ? align([0,1,0],cell.pialNormal) : [0,0,0,1];
    const branch = outgoingBranch(cell), port = template.ports?.axonOut;
    return branch && port && length(port) > 1e-9
      ? align(port, sub(branch.points[1], cell.soma))
      : [0, 0, 0, 1];
  }
  const endpoint = terminalEndpoint(cell);
  const outward = sub(cell.terminal, endpoint.branch.points[endpoint.adjacent]);
  const sourceDirection = terminalOrganCenter(template);
  return align(sourceDirection, outward);
}

function register(cell, template, anchor) {
  if (!template || typeof template.key !== 'string') throw new TypeError('Preserved template requires a key');
  assertPoint(template.sourceAnchorUm, `${template.key} original source anchor`);
  const anatomicalAnchorMm = copyPoint(anchor === 'soma' ? cell.soma : cell.terminal);
  assertPoint(anatomicalAnchorMm, `${cell.id} ${anchor}`);
  const rotation = orientation(cell, template, anchor);
  const organCenterUm = anchor === 'terminal' ? terminalOrganCenter(template) : [0,0,0];
  // The true end-organ landmark stays at cell.terminal. Its original incoming
  // stub is retained upstream, and the long-range display axon ends at that
  // original inlet port instead of pushing the whole organ beyond its target.
  const worldAnchorMm = sub(anatomicalAnchorMm, mul(rotate(organCenterUm, rotation), PRESERVED_SCALE_MM_PER_UM));
  const registration = {
    cellId: cell.id, templateKey: template.key, anchor,
    sourceCellId: template.sourceCellId, sourceRegion: template.sourceRegion,
    sourceAnchorUm: copyPoint(template.sourceAnchorUm),
    worldAnchorMm, anatomicalAnchorMm, organCenterUm: copyPoint(organCenterUm), scaleMmPerUm: PRESERVED_SCALE_MM_PER_UM,
    rotation,
    translationMm: copyPoint(worldAnchorMm),
    coordinateConvention: 'normalized-local-micrometres',
    provenance: {
      geometry: 'Preserved V3 template geometry',
      placement: 'Modeled V4 world placement, orientation and long-range port connection',
      originalMetadata: template.metadata || {},
      qualification: cell.type === 'm1'
        ? 'Original spiny human tracing with intact apical dendrite from source layer II/III, used only as a morphological analogue. It is not a verified layer-V corticospinal cell; source cortical area and identity are retained and the upper-motor assignment is modeled.'
        : cell.type === 's1'
          ? 'Original human tracing morphology; source cortical area and identity retained, placement here is not a measured S1 finger-pathway reconstruction. Aspiny and spiny source cells remain distinct cortical receiver morphology examples.'
        : cell.type === 'dorsal-projection'
          ? 'V3 spinal multipolar template reused for an illustrative dorsal-horn projection cell; not a traced projection neuron.'
          : ['spindle','golgi'].includes(cell.type) && anchor === 'soma'
            ? 'V3 large-afferent DRG soma reused for this distinct proprioceptive model cell; not a source-identified proprioceptive soma.'
            : 'Original synthetic V3 noncortical template retained; template identity does not establish measured connectivity.',
    },
    ports: {},
  };
  if (cell.kind === 'sensory' && sourceSubtype(template) && sourceSubtype(template) !== cell.type) {
    registration.provenance.originalSensoryClass = sourceSubtype(template);
    registration.provenance.templateReuseNotice = 'Original V3 DRG soma retained as a morphology analogue for this separate model cell. Source-template receptor label does not establish the receptor identity of the new model placement.';
  }
  for (const [name, point] of Object.entries(template.ports || {})) {
    assertPoint(point, `${template.key} ${name} port`);
    const port = { sourcePointUm: copyPoint(point), worldPointMm: transformPreservedPoint(point, registration) };
    if (anchor === 'soma' && name === 'axonOut') {
      const branch = outgoingBranch(cell);
      if (branch) Object.assign(port, { branchId: branch.id, endpoint: 'start', canonicalPointMm: copyPoint(branch.points[0]) });
    }
    if (anchor === 'terminal' && name === 'inlet') {
      const endpoint = terminalEndpoint(cell);
      Object.assign(port, { branchId: endpoint.branch.id, endpoint: endpoint.endpoint, canonicalPointMm: copyPoint(cell.terminal) });
    }
    registration.ports[name] = port;
  }
  if (cell.type === 'sa2') registration.terminalNotice = 'V3 contained no separately reconstructed SA-II end organ; its DRG cell and continuous terminal fiber are preserved without inventing a Ruffini geometry.';
  if (cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass || '')) registration.terminalNotice = 'V3 contained an annulospiral spindle terminal, not a separately reconstructed group-II secondary ending. The original DRG soma is retained; any secondary terminal is explicitly modeled rather than relabeling the original Ia-like source.';
  return registration;
}

/**
 * Every modeled cell receives a preserved soma/arbor. Cells with an original
 * V3 receptor or NMJ also receive one terminal component. Repeated source
 * templates are instances of different modeled cells, never merged cell IDs.
 */
export function getPreservedCellRegistration(cell, manifest, options = {}) {
  assertPoint(cell?.soma, 'Cell soma');
  const records = catalogRecords(manifest);
  const model = options.model || (defaultModel ||= createAtlasModel());
  const registrations = [register(cell, somaTemplate(cell, records, model), 'soma')];
  const unsupportedSecondarySpindle = cell.type === 'spindle' && /^II\b/.test(cell.sensoryClass || '');
  if (cell.terminal && cell.type !== 'sa2' && !unsupportedSecondarySpindle) {
    const terminalType = cell.type === 'lower-motor' ? 'nmj' : cell.receptorType || cell.type;
    const key = `terminal:${terminalType}`;
    const template = records.find(record => record.key === key);
    if (!template) throw new Error(`Missing preserved V3 terminal template ${key} for ${cell.id}`);
    registrations.push(register(cell, template, 'terminal'));
  }
  return registrations;
}

/**
 * Display trajectories join the original local ports. The semantic V4 graph
 * remains unchanged and available for export alongside these registrations.
 * S1's old synthetic short local axon is omitted because the restored tracing
 * already contains its original local arbor.
 */
export function registeredCellBranches(cell, registrations) {
  const restoredCortex = registrations.some(registration => registration.anchor === 'soma' && registration.templateKey.startsWith('cortex:'));
  const branches = (cell.branches || [])
    .filter(branch => !(cell.type === 's1' && restoredCortex && branch.id.endsWith('-local')))
    .map(branch => ({ ...branch, points: branch.points.map(copyPoint) }));
  for (const registration of registrations) {
    for (const port of Object.values(registration.ports)) {
      const branch = branches.find(item => item.id === port.branchId);
      if (!branch) continue;
      const index = port.endpoint === 'end' ? branch.points.length - 1 : 0;
      branch.points[index] = copyPoint(port.worldPointMm);
    }
  }
  return branches;
}

export function createPreservedRegistrations(model, manifest) {
  return model.cells.map(cell => ({ cellId: cell.id, components: getPreservedCellRegistration(cell, manifest, { model }) }));
}

/**
 * Return a fresh graph whose DRG somata fit the actual preserved surfaces.
 * Source dimensions stay unchanged. A rotation-invariant sphere encloses each
 * complete preserved DRG template (soma, fused stem and satellite patches), plus
 * a 10% separation margin. The modest submillimetre packing cloud is synthetic,
 * not a re-registration of V3 histology or its original comparison scene.
 *
 * Canonical identities, T-junctions, long-range axons and connections survive.
 * Soma-origin stem points, any incoming edge endpoints, and soma landmarks are
 * updated together. Call once after fetching the manifest, before building
 * renderer lookup tables. The function does not mutate its input model.
 */
export function registerPreservedModel(model, manifest) {
  const result = structuredClone(model), records = catalogRecords(manifest);
  const lookup = new Map(records.map(template => [template.key, template]));
  const assignments = createPreservedRegistrations(result, manifest);
  const byCell = new Map(assignments.map(item => [item.cellId, item.components.find(component => component.anchor === 'soma')]));
  const sensory = result.cells.filter(cell => cell.kind === 'sensory');
  const center = result.regions.find(region => region.id === 'drg')?.center || [-24.3,164.1,-4];
  const entries = sensory.map(cell => {
    const registration = byCell.get(cell.id), template = lookup.get(registration.templateKey);
    if (!template.boundsUm || template.boundsUm.length !== 2) throw new Error(`Preserved DRG template ${template.key} needs local bounds`);
    const extent = template.boundsUm[0].map((v, i) => Math.max(Math.abs(v), Math.abs(template.boundsUm[1][i])));
    const radiusMm = length(extent) * PRESERVED_SCALE_MM_PER_UM * 1.1;
    if (!(radiusMm > 0 && Number.isFinite(radiusMm))) throw new Error(`Invalid preserved bounds for ${template.key}`);
    const axes = template.metadata?.somaAxesUm;
    if (axes?.length === 3 && axes.every(Number.isFinite)) cell.somaRadiusMm = Math.max(...axes) * PRESERVED_SCALE_MM_PER_UM;
    cell.preservedMorphology = { templateKey: template.key, somaAxesUm: axes ? copyPoint(axes) : null, separationRadiusMm: radiusMm };
    return { cell, radiusMm, originalSoma: copyPoint(cell.soma) };
  }).sort((a, b) => b.radiusMm - a.radiusMm || a.cell.id.localeCompare(b.cell.id));

  const placed = [], moves = new Map(), rng = legacyRandom(904421);
  for (const entry of entries) {
    const fits = point => placed.every(other => length(sub(point, other.point)) > entry.radiusMm + other.radiusMm);
    let point = fits(entry.originalSoma) ? copyPoint(entry.originalSoma) : null;
    for (let attempt = 0; !point && attempt < 24000; attempt++) {
      const expansion = 1 + Math.floor(attempt / 4000) * .15;
      const normalized = [(rng() - .5) * 2, (rng() - .5) * 2, (rng() - .5) * 2];
      if (dot(normalized, normalized) > 1) continue;
      const candidate = add(center, normalized.map((n, i) => n * [.42,.48,.34][i] * expansion));
      if (fits(candidate)) point = candidate;
    }
    if (!point) throw new Error(`Cannot pack preserved source soma ${entry.cell.id} without overlap`);
    placed.push({ point, radiusMm: entry.radiusMm });
    entry.cell.soma = point;
    if (!samePoint(entry.originalSoma, point)) moves.set(entry.cell.id, { before: entry.originalSoma, after: copyPoint(point) });
  }

  const cells = new Map(result.cells.map(cell => [cell.id, cell]));
  for (const [cellId, move] of moves) {
    for (const branch of cells.get(cellId).branches) {
      branch.points = branch.points.map(point => samePoint(point, move.before) ? copyPoint(move.after) : point);
    }
  }
  for (const route of result.routes) {
    for (const edge of route.connections) {
      const move = moves.get(edge.to);
      if (!move) continue;
      edge.at = copyPoint(move.after);
      for (const branch of cells.get(edge.from).branches) {
        if (samePoint(branch.points.at(-1), move.before)) branch.points[branch.points.length - 1] = copyPoint(move.after);
      }
    }
    for (const mark of route.landmarks) {
      const move = moves.get(mark.cellId);
      if (move && samePoint(mark.point, move.before)) mark.point = copyPoint(move.after);
    }
  }
  result.preservedMorphology = {
    scaleMmPerUm: PRESERVED_SCALE_MM_PER_UM,
    templatesUsed: new Set(assignments.flatMap(item => item.components.map(component => component.templateKey))).size,
    availableTemplates: records.length,
    drgPacking: 'Synthetic packing with complete preserved DRG template bounding radii plus 10% separation; source surface dimensions unchanged.',
    registeredCells: assignments.length,
    preservedComponents: assignments.reduce((sum, item) => sum + item.components.length, 0),
    notice: PRESERVED_REGISTRATION_NOTICE,
  };
  return result;
}
