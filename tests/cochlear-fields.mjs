import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  diskPotentialMvPerUa,
  returnWeights,
  potentialBasisAtPoint,
  buildLeadFields,
} from '../src/lib/cochlear/fields.js';
import {
  greenwoodHz,
  greenwoodPositionMm,
  frequencyMismatchSemitones,
  createGeometry,
} from '../src/lib/cochlear/geometry.js';
import { normalizeSettings, presetSettings, PRESETS } from '../src/lib/cochlear/config.js';
import { validateProcessorConfig } from '../src/lib/cochlear/processor.js';

const reference = JSON.parse(readFileSync(
  new URL('./fixtures/cochlear-disk-reference.json', import.meta.url), 'utf8',
));

function near(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: got ${actual}, expected ${expected} ± ${tolerance}`);
}

function contact(positionMm = [0, 0, 0], radiusMm = 0.15, normal = [0, 0, 1]) {
  return { positionMm, radiusMm, normal };
}

function axisReference(axialMm, radiusMm, conductivitySPerM = 1 / 3) {
  return 1 / (2 * Math.PI * conductivitySPerM
    * (Math.sqrt(axialMm ** 2 + radiusMm ** 2) + Math.abs(axialMm)));
}

test('cochlear geometry: anatomical frequency direction, inverse, and mismatch sign are explicit', () => {
  near(greenwoodHz(35), 19.848, 1e-10, '35 mm apical endpoint');
  assert.ok(greenwoodHz(0) > 20000, 'The basal endpoint has the highest reference frequency.');
  assert.ok(greenwoodPositionMm(1000) > greenwoodPositionMm(4000));
  for (const frequency of [200, 1000, 4000, 8000]) {
    near(greenwoodHz(greenwoodPositionMm(frequency)), frequency, 1e-8, 'Reference-map inverse');
  }
  near(frequencyMismatchSemitones(2000, 1000), 12, 1e-12,
    'Positive mismatch means the anatomical reference is higher than the assigned sound band');
});

test('cochlear geometry: increasing contacts or insertion preserves the intended physical array span', () => {
  const baseline = createGeometry(normalizeSettings());
  const more = createGeometry(presetSettings('contacts'));
  near(baseline.contacts[0].positionMm[0], 10, 1e-12, 'Baseline basal contact');
  near(baseline.contacts.at(-1).positionMm[0], 26, 1e-12, 'Baseline apical contact');
  assert.equal(more.contacts.length, 24);
  near(more.contacts[0].positionMm[0], 10, 1e-12, '24-contact basal contact');
  near(more.contacts.at(-1).positionMm[0], 26, 1e-12, '24-contact apical contact');
  near(more.contacts[1].positionMm[0] - more.contacts[0].positionMm[0], 16 / 23, 1e-12,
    'Additional contacts change spacing, not the declared array span');
  const deeper = createGeometry(normalizeSettings({ apicalDepthMm: 28 }));
  baseline.contacts.forEach((source, i) => {
    near(deeper.contacts[i].positionMm[0] - source.positionMm[0], 2, 1e-12,
      'Moving insertion shifts the whole array while preserving inter-contact distances');
  });
});

test('cochlear geometry: saved presets use valid physical contacts and feasible pulse timing', () => {
  for (const preset of PRESETS) {
    const settings = presetSettings(preset.id);
    const geometry = createGeometry(settings);
    const check = validateProcessorConfig(settings, settings.sampleRate);
    assert.equal(check.valid, true, `${preset.id}: ${check.errors.join(' ')}`);
    assert.ok(geometry.contacts.every((source) => source.positionMm[0] >= 0 && source.positionMm[0] <= 35));
    assert.ok(2 * settings.contactRadiusMm < settings.arraySpanMm / (settings.channelCount - 1));
  }
});

test('cochlear field: exact on-axis values pin µA/mm/S·m⁻¹ to mV and the finite center limit', () => {
  for (const radius of [0.03, 0.15, 0.35]) {
    for (const z of [0, 0.01, 0.1, 1, 1000]) {
      const source = contact([3, -5, 7], radius);
      const actual = diskPotentialMvPerUa([3, -5, 7 + z], source, 1);
      const expected = axisReference(z, radius, 1);
      near(actual, expected, Math.max(1e-12, Math.abs(expected) * 1e-11), 'Finite disk axial reference');
    }
  }
  const gain = diskPotentialMvPerUa([0, 0, 1], contact(), 1);
  const potentialAt100UA = 100 * gain;
  near(potentialAt100UA, 7.913481431181958, 1e-10,
    'Independent dimensional reference for 100 µA, 1 mm, radius 0.15 mm, conductivity 1 S/m');
});

test('cochlear field: off-axis values agree with independent elliptic-integral references', () => {
  for (const fixture of reference.cases) {
    const source = contact(reference.sourcePositionMm, fixture.radiusMm, reference.sourceNormal);
    const actual = diskPotentialMvPerUa(fixture.pointMm, source, reference.conductivitySPerM);
    const relative = Math.abs(actual - fixture.expectedMvPerUa) / fixture.expectedMvPerUa;
    assert.ok(relative < 1e-4,
      `Default quadrature error must stay below 0.01% for fixture ${JSON.stringify(fixture)}; got ${relative}`);
    const refined = diskPotentialMvPerUa(fixture.pointMm, source, reference.conductivitySPerM,
      { radialOrder: 16, angularOrder: 64 });
    near(refined, fixture.expectedMvPerUa, 5e-9 * fixture.expectedMvPerUa,
      'Refined quadrature converges to the independent elliptic-integral reference');
  }
});

test('cochlear field: far-field point-source limit and homogeneous conductivity scaling', () => {
  const sigma = 0.5;
  const actual = diskPotentialMvPerUa([0, 0, 100], contact(), sigma);
  const point = 1 / (4 * Math.PI * sigma * 100);
  assert.ok(Math.abs(actual - point) / point < 1e-6);
  const p = [0.2, 0.4, 0.5];
  const lowConductivity = diskPotentialMvPerUa(p, contact(), 0.25);
  const highConductivity = diskPotentialMvPerUa(p, contact(), 0.5);
  near(lowConductivity, 2 * highConductivity, 1e-12, 'Conductivity scaling');
});

test('cochlear field: translation, axis rotation, and disk-normal sign preserve physical potential', () => {
  const source = contact([1, 2, 3]);
  const p = [1.3, 2.2, 3.5];
  const before = diskPotentialMvPerUa(p, source);
  const shift = [4.3, -7.1, 2.9];
  const shifted = diskPotentialMvPerUa(p.map((v, i) => v + shift[i]),
    contact(source.positionMm.map((v, i) => v + shift[i])));
  near(shifted, before, 1e-12, 'Rigid translation');
  const rotate = ([x, y, z]) => [z, x, y];
  const rotated = diskPotentialMvPerUa(rotate(p),
    contact(rotate(source.positionMm), source.radiusMm, rotate(source.normal)));
  near(rotated, before, 1e-12, 'Rigid rotation including contact normal');
  near(diskPotentialMvPerUa(p, { ...source, normal: [0, 0, -1] }), before, 1e-12,
    'A uniform disk is unchanged by reversing its normal');
});

test('cochlear field: source and return weights conserve current, including edge contacts', () => {
  for (const mode of ['monopolar', 'bipolar', 'partial-tripolar']) {
    for (const sourceIndex of [0, 5, 11]) {
      const weights = returnWeights(sourceIndex, 12, mode, 0.75);
      near(weights.contacts.reduce((sum, value) => sum + value, weights.remote), 0, 1e-14,
        `${mode} source plus returns`);
      assert.equal(weights.contacts[sourceIndex], 1);
    }
  }
  const edge = returnWeights(0, 12, 'partial-tripolar', 0.75);
  near(edge.contacts[1], -0.375, 1e-14, 'Existing edge neighbor receives half of the focused return');
  near(edge.remote, -0.625, 1e-14, 'Missing edge neighbor return is routed remotely');
});

test('cochlear field: remote return and focused superposition enter the actual contact gains', () => {
  const geometry = {
    contacts: [contact([0, 0, 0]), contact([1, 0, 0]), contact([2, 0, 0])],
    returnPositionMm: [0, -20, 20],
  };
  const p = [1, 0.2, 0.5];
  const sigma = 1 / 3;
  const sources = geometry.contacts.map((source) => diskPotentialMvPerUa(p, source, sigma));
  const remote = 1 / (4 * Math.PI * sigma * Math.hypot(1, 20.2, -19.5));
  const monopolar = potentialBasisAtPoint(p, geometry,
    { conductivitySPerM: sigma, returnMode: 'monopolar', focusFraction: 0.75 });
  near(monopolar[1], sources[1] - remote, 1e-12, 'Monopolar source minus remote return');
  const focused = potentialBasisAtPoint(p, geometry,
    { conductivitySPerM: sigma, returnMode: 'partial-tripolar', focusFraction: 0.75 });
  near(focused[1], sources[1] - 0.375 * sources[0] - 0.375 * sources[2] - 0.25 * remote,
    1e-12, 'Partial-tripolar linear superposition');
  const bipolar = potentialBasisAtPoint(p, geometry,
    { conductivitySPerM: sigma, returnMode: 'bipolar', focusFraction: 0.75 });
  near(bipolar[1], sources[1] - sources[2], 1e-12, 'Bipolar local return');
});

test('cochlear field: the lead-field tensor uses physical fiber place and compartment coordinate', () => {
  const geometry = {
    contacts: [contact([10, 0, 0.5]), contact([12, 0, 0.5])],
    fibers: [{ placeMm: 10 }, { placeMm: 12 }],
    returnPositionMm: [0, -20, 20],
  };
  const settings = { conductivitySPerM: 1 / 3, returnMode: 'monopolar', focusFraction: 0.75 };
  const fields = buildLeadFields(geometry, [-1, 0, 1], settings);
  const expected = axisReference(0.5, 0.15)
    - 1 / (4 * Math.PI * (1 / 3) * Math.sqrt(10 ** 2 + 20 ** 2 + 20 ** 2));
  near(fields[0][0][1], expected, 1e-12, 'On-axis compartment in the actual driving tensor');
  assert.ok(fields[0][0][1] > fields[0][1][1],
    'The contact above the first fiber couples more strongly at its source-centered compartment.');
  assert.ok(fields[1][1][1] > fields[1][0][1]);
  assert.ok(fields[0][0][1] > fields[0][0][0],
    'The compartment coordinate changes the field sampled by the cable.');
});

test('cochlear field: unsupported on-surface off-axis samples fail explicitly', () => {
  assert.throws(() => diskPotentialMvPerUa([0.05, 0, 0], contact()), /surface/);
  assert.throws(() => diskPotentialMvPerUa([0, 0, 1], contact(), 0), /Conductivity/);
});
