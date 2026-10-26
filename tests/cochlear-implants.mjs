import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  IMPLANT_PROFILES, GENERIC_IMPLANT_PROFILE,
  getImplantProfile, getImplantContactMap,
} from '../src/lib/cochlear/implants.js';
import { createImplantGeometry } from '../src/lib/cochlear/implantGeometry.js';

// Independent specification fixtures, from the primary documents recorded in
// docs/cochlear/IMPLANT_SOURCES.md. Reported active span is deliberately separate
// from the AB centre span calculated from fifteen nominal pitch intervals.
const SPECIFICATIONS = [
  { id: 'cochlear-ci622', sites: 22, pads: 22, active: 19.1, body: 25, tip: [0.35, 0.25], base: [0.6, 0.5], centreSpan: 19.1 },
  { id: 'cochlear-ci632', sites: 22, pads: 22, active: 14, body: 18.4, tip: [0.35, 0.4], base: [0.475, 0.5], centreSpan: 14 },
  { id: 'medel-flex28', sites: 12, pads: 19, active: 23.1, body: 28, tip: [0.5, 0.4], base: [0.8, 0.8], centreSpan: 23.1 },
  { id: 'ab-slimj', sites: 16, pads: 16, active: 20, body: 23, tip: [0.55, 0.26], base: [0.76, 0.56], centreSpan: 19.5 },
  { id: 'ab-mid-scala', sites: 16, pads: 16, active: 15, body: 23.7, tip: [0.5, 0.5], base: [0.7, 0.7], centreSpan: 14.625 },
];

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
const line = (length, clearance = 2) => ({
  lengthMm: length,
  arcMm: [0, length], displayPoints: [[0, 0, 0], [length, 0, 0]],
  inwardNormals: [[0, 0, 1], [0, 0, 1]],
  clearanceMm: Array.isArray(clearance) ? clearance : [clearance, clearance],
});
const cache = new Map();
function build(id, pose = 'bench', length = 40) {
  const key = `${id}/${pose}/${length}`;
  if (!cache.has(key)) cache.set(key, createImplantGeometry(id, { pose, centerline: line(length) }));
  return cache.get(key);
}
function meanX(mesh) {
  let sum = 0;
  for (let i = 0; i < mesh.positions.length; i += 3) sum += mesh.positions[i];
  return sum / (mesh.positions.length / 3);
}
function padMesh(scene, index) {
  return scene.meshes.find(mesh => mesh.implantContactIndex === index);
}

test('named profiles retain primary-source counts, active spans, length landmarks, and endpoint sections', () => {
  assert.equal(IMPLANT_PROFILES.length, 5);
  assert.deepEqual(IMPLANT_PROFILES.map(p => p.id).sort(), SPECIFICATIONS.map(p => p.id).sort());
  for (const expected of SPECIFICATIONS) {
    const p = getImplantProfile(expected.id);
    assert.equal(p.channelCount, expected.sites);
    assert.equal(p.padCount, expected.pads);
    near(p.activeSpanMm, expected.active);
    near(p.bodyLengthMm, expected.body);
    assert.deepEqual(p.tipSizeMm, expected.tip);
    assert.deepEqual(p.baseSizeMm, expected.base);
    assert(p.bodyLengthLabel.length > 8, 'A physical length needs its endpoint convention.');
    assert(Object.isFrozen(p) && Object.isFrozen(p.geometry));
  }
  assert.equal(getImplantProfile('generic'), GENERIC_IMPLANT_PROFILE);
  assert(!IMPLANT_PROFILES.includes(GENERIC_IMPLANT_PROFILE));
});

test('FLEX28 has five apical singles and seven paired sites, never nineteen independent channel positions', () => {
  const pads = getImplantContactMap('medel-flex28');
  assert.equal(pads.length, 19);
  const groups = Array.from({ length: 12 }, (_, site) => pads.filter(p => p.siteIndex === site));
  assert.deepEqual(groups.map(group => group.length), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(pads.map(p => p.implantContactIndex), Array.from({ length: 19 }, (_, i) => i));
  for (const group of groups) {
    assert(group.every(p => p.channelIndex === group[0].channelIndex));
    assert(group.every(p => p.distanceFromTipMm === group[0].distanceFromTipMm));
  }
  const profile = getImplantProfile('medel-flex28');
  assert.equal(profile.measurements.receiverElectrodeChannels, 12);
  assert.equal(profile.measurements.receiverIndependentCurrentSources, 24);
  assert.equal(profile.measurements.contactSurfaceAreaMm2, null, 'An unknown physical pad area must not become a sourced specification.');
});

test('all five references generate finite, indexed, normal-bearing meshes in both poses', () => {
  for (const spec of SPECIFICATIONS) for (const pose of ['bench', 'inserted']) {
    const scene = build(spec.id, pose);
    assert.equal(scene.units, 'mm');
    assert.equal(scene.contacts.length, spec.pads);
    assert.equal(scene.meshes.filter(m => Number.isInteger(m.implantContactIndex)).length, spec.pads);
    for (const mesh of scene.meshes) {
      assert(mesh.positions.length >= 9 && mesh.positions.length % 3 === 0, mesh.id);
      assert.equal(mesh.normals.length, mesh.positions.length, mesh.id);
      assert(mesh.positions.every(Number.isFinite), mesh.id);
      assert(mesh.normals.every(Number.isFinite), mesh.id);
      assert(mesh.indices.length > 0 && mesh.indices.length % 3 === 0, mesh.id);
      assert(mesh.indices.every(i => Number.isInteger(i) && i >= 0 && i < mesh.positions.length / 3), mesh.id);
      for (let i = 0; i < mesh.normals.length; i += 3) near(Math.hypot(...mesh.normals.slice(i, i + 3)), 1, 1e-6);
    }
    assert(scene.bounds.min.every(Number.isFinite) && scene.bounds.max.every(Number.isFinite));
    assert(scene.bounds.min.every((v, i) => v < scene.bounds.max[i]));
  }
});

test('physical-pad picking has independent identities and carries no solver result or source index', () => {
  for (const spec of SPECIFICATIONS) {
    const scene = build(spec.id);
    assert.equal(scene.electricalOverlay, false);
    const selected = scene.meshes.filter(m => Number.isInteger(m.implantContactIndex));
    assert.deepEqual(selected.map(m => m.implantContactIndex), Array.from({ length: spec.pads }, (_, i) => i));
    for (const mesh of scene.meshes) {
      for (const forbidden of ['contactIndex', 'fiberIndex', 'voltageMv', 'currentUA', 'amplitudeUA']) assert(!Object.hasOwn(mesh, forbidden), `${mesh.id} leaks ${forbidden}`);
      if (Object.hasOwn(mesh, 'implantContactIndex')) assert.equal(mesh.role, 'contact');
    }
  }
});

test('inserted contact-centre spans stay physical on both long and short paths; arrays are not stretched or clipped', () => {
  for (const spec of SPECIFICATIONS) {
    const long = build(spec.id, 'inserted', 40), short = build(spec.id, 'inserted', 12);
    for (const scene of [long, short]) {
      const first = scene.contacts.find(c => c.siteIndex === 0);
      const last = scene.contacts.find(c => c.siteIndex === spec.sites - 1);
      // Measure actual mesh vertices, not the stored span metadata. On this
      // straight path the pad centroids' x separation equals physical arc span.
      near(meanX(padMesh(scene, first.implantContactIndex)) - meanX(padMesh(scene, last.implantContactIndex)), spec.centreSpan, 1e-7);
      assert.equal(scene.contacts.length, spec.pads, 'Extracochlear pads must remain represented.');
    }
    near(short.placement.achievedInsertionMm, 12);
    assert.equal(short.placement.partialInsertion, true);
    assert.equal(short.placement.pathLengthLimited, true);
    assert(short.placement.outsidePhysicalPadCount > 0);
    assert(short.contacts.some(c => c.position[0] < 0 && c.withinReferencePath === false));
  }
});

test('bench geometry preserves straight versus reconstructed precurved design families', () => {
  const straight = build('cochlear-ci622'), flex = build('medel-flex28');
  const modiolar = build('cochlear-ci632'), mid = build('ab-mid-scala');
  assert(straight.bounds.size[2] < 1 && flex.bounds.size[2] < 1);
  assert(modiolar.bounds.size[2] > 3 && mid.bounds.size[2] > 3, 'Precurved references must not collapse to straight carriers.');
  assert(mid.bounds.size[2] > modiolar.bounds.size[2], 'The mid-scala reference has the more open reconstructed spiral.');
  const pads = straight.meshes.filter(m => m.role === 'contact');
  assert(pads.every(m => m.contactShape === 'half-band'));
  // Straight bench contact normals face the inward (+z) half of the carrier.
  assert(pads.every(m => m.normals.every((v, i) => i % 3 !== 2 || v >= -1e-10)));
});

test('Mid-Scala inactive marker is distinct from its sixteen stimulating pads', () => {
  const scene = build('ab-mid-scala');
  const inactive = scene.meshes.filter(m => m.role === 'inactive-marker');
  assert.equal(inactive.length, 1);
  assert.equal(inactive[0].stimulating, false);
  assert(!Object.hasOwn(inactive[0], 'implantContactIndex'));
  assert.match(inactive[0].label, /inactive.*not a stimulating/i);
  assert.equal(scene.meshes.filter(m => m.role === 'contact').length, 16);
  assert.equal(scene.meshes.filter(m => m.role === 'marker').length, 2);
});

test('clearance backoff changes placement rather than physical dimensions, and absent clearance is not a verified fit', () => {
  const narrow = createImplantGeometry('medel-flex28', { pose: 'inserted', centerline: line(22, [1, 0.13]) });
  assert(narrow.placement.clearanceBackoffMm > 0);
  assert(narrow.placement.achievedInsertionMm < 22);
  assert.equal(narrow.placement.approximateGeometricClearancePassed, true);
  assert(narrow.placement.minimumEstimatedRadialMarginMm >= narrow.placement.clearanceMarginMm);
  const first = narrow.contacts.find(c => c.siteIndex === 0), last = narrow.contacts.find(c => c.siteIndex === 11);
  near(meanX(padMesh(narrow, first.implantContactIndex)) - meanX(padMesh(narrow, last.implantContactIndex)), 23.1, 1e-7);
  const missing = line(30); delete missing.clearanceMm;
  const unverified = createImplantGeometry('medel-flex28', { pose: 'inserted', centerline: missing });
  assert.equal(unverified.placement.approximateGeometricClearancePassed, null);
  assert(unverified.notes.some(note => /containment has not been checked/i.test(note)));
});

test('conservative surface-distance bounds take precedence over optimistic point/voxel clearance', () => {
  const path = { ...line(22, 2), conservativeClearanceMm: [1, 0.13] };
  const bounded = createImplantGeometry('medel-flex28', { pose: 'inserted', centerline: path });
  const optimistic = createImplantGeometry('medel-flex28', { pose: 'inserted', centerline: line(22, 2) });
  assert.equal(bounded.placement.clearanceSource, 'conservativeClearanceMm');
  assert(bounded.placement.achievedInsertionMm < optimistic.placement.achievedInsertionMm);
  assert.equal(bounded.placement.approximateGeometricClearancePassed, true);
  // A nonpositive bound is real adverse information; it must not silently turn
  // containment checking off as if no clearance samples were supplied.
  const impossible = createImplantGeometry('medel-flex28', { pose: 'inserted', centerline: { ...line(22, 2), conservativeClearanceMm: [-0.1, -0.1] } });
  assert.equal(impossible.placement.approximateGeometricClearancePassed, false);
  assert.equal(impossible.placement.clearanceSource, 'conservativeClearanceMm');
});

test('invalid profile IDs, poses, and physical paths fail explicitly', () => {
  assert.throws(() => getImplantProfile('unknown-device'), RangeError);
  assert.throws(() => createImplantGeometry('cochlear-ci622', { pose: 'invented' }), RangeError);
  assert.throws(() => createImplantGeometry('cochlear-ci622', { pose: 'inserted' }), TypeError);
  assert.throws(() => createImplantGeometry('cochlear-ci622', { pose: 'inserted', centerline: { ...line(30), arcMm: [0, 0] } }), TypeError);
  assert.throws(() => createImplantGeometry('cochlear-ci622', { pose: 'inserted', centerline: line(30), insertionDepthMm: Infinity }), RangeError);
});

test('source documentation contains every named profile and primary provenance URL, including explicit approximation boundaries', async () => {
  const documentation = await readFile(new URL('../docs/cochlear/IMPLANT_SOURCES.md', import.meta.url), 'utf8');
  for (const profile of IMPLANT_PROFILES) {
    assert(documentation.includes(profile.id), `Missing documented profile ${profile.id}.`);
    for (const source of profile.sources) assert(documentation.includes(source.url), `Missing provenance ${source.url}.`);
  }
  assert.match(documentation, /19 physical pads at 12 longitudinal channel positions/);
  assert.match(documentation, /not manufacturer CAD/);
  assert.match(documentation, /not a clinical safety margin/);
  assert.match(documentation, /19\.5.*14\.625/);
});

test('manufacturer inspection remains outside the electrical worker dependency boundary', async () => {
  const solverFiles = ['worker.js', 'experiment.js', 'fields.js', 'geometry.js', 'nerve.js', 'processor.js'];
  for (const filename of solverFiles) {
    const source = await readFile(new URL(`../src/lib/cochlear/${filename}`, import.meta.url), 'utf8');
    const imports = source.match(/(?:import|export)[\s\S]*?from\s*['"][^'"]+['"]/g) ?? [];
    assert(imports.every(statement => !/implants\.js|implantGeometry\.js|anatomy\.js/.test(statement)), `${filename} imports inspection geometry into the solver.`);
  }
});

