import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInterfaceField, INTERFACE_CONTACT_VARIANTS, INTERFACE_DESIGN, makeInterfaceDesign,
} from '../src/lib/cortex/interface-field.js';

const base = createInterfaceField();
const samplePoints = [[0, 25, 250], [18, 50, 930], [-110, 75, 1400]];

test('null geometry retains the original design and numerical solution', () => {
  assert.strictEqual(makeInterfaceDesign(), INTERFACE_DESIGN);
  assert.strictEqual(makeInterfaceDesign(null), INTERFACE_DESIGN);
  assert.strictEqual(base.design, INTERFACE_DESIGN);
  const explicitNull = createInterfaceField({ contactGeometry: null });
  const explicitOriginalSize = createInterfaceField({ contactGeometry: { contactIndex: 0, variantId: '12x12' } });
  for (const other of [explicitNull, explicitOriginalSize]) {
    assert.deepEqual(other.panels, base.panels);
    assert.deepEqual(other.panelBasis, base.panelBasis);
    assert.deepEqual(other.contactTransferMvPerUa, base.contactTransferMvPerUa);
    assert.deepEqual(other.prepare(samplePoints), base.prepare(samplePoints));
  }
  // Captured before geometry support was added. These are regression fixtures,
  // not independent evidence of the conductor model's physical accuracy.
  const originalDiagonal = [125.86060255356576, 75.51539178210398, 50.34369128235732, 85.80291350870326,
    125.8601633585541, 75.51535486900993, 50.34369559733308, 85.80301986903979];
  const originalSamples = [
    [17.090113900760947, 3.0720605384198216, 1.5548381321257359, 1.0388845819513177,
      .7795148105161415, .62377870573427, .519943662645409, .4457382292895912],
    [.7771267306164407, 1.0356550466374106, 1.536127318355639, 2.9977677415870114,
      8.593699842080058, 2.9948597610546877, 1.5360807782696095, 1.0357754297413753],
    [.4589327513505394, .5353472203580099, .6481521475137233, .8076804433428126,
      1.0946528866994925, 1.5862421568831473, 3.0154488524502336, 3.4496856782441263],
  ];
  originalDiagonal.forEach((value, i) => assert.ok(Math.abs(base.contactTransferMvPerUa[i * 9] - value) < 2e-12));
  samplePoints.forEach((point, p) => base.sample(point).forEach((value, c) =>
    assert.ok(Math.abs(value - originalSamples[p][c]) < 2e-12)));
  assert.equal(base.metadata.contactGeometry, null);
  assert.equal(base.metadata.designId, INTERFACE_DESIGN.id);
});

test('each size variant changes only one surface while preserving center, orientation and contact identity', () => {
  assert.deepEqual(INTERFACE_CONTACT_VARIANTS.map(({ id, widthUm, heightUm }) => [id, widthUm, heightUm]),
    [['12x12', 12, 12], ['20x20', 20, 20], ['30x30', 30, 30], ['12x24', 12, 24]]);
  assert.ok(Object.isFrozen(INTERFACE_CONTACT_VARIANTS));
  for (let contactIndex = 0; contactIndex < 8; contactIndex++) for (const variant of INTERFACE_CONTACT_VARIANTS) {
    const requested = { contactIndex, variantId: variant.id }, design = makeInterfaceDesign(requested);
    assert.notEqual(design.id, INTERFACE_DESIGN.id);
    assert.equal(design.id, makeInterfaceDesign(requested).id);
    assert.deepEqual(design.contactGeometry, requested);
    assert.notStrictEqual(design.contactGeometry, requested);
    assert.ok(Object.isFrozen(design) && Object.isFrozen(design.contacts) && Object.isFrozen(design.contactGeometry));
    for (const key of ['widthUm', 'thicknessUm', 'lengthUm', 'taperUm', 'plane', 'tissueSide'])
      assert.equal(design[key], INTERFACE_DESIGN[key]);
    design.contacts.forEach((contact, i) => {
      const original = INTERFACE_DESIGN.contacts[i];
      if (i !== contactIndex) return assert.strictEqual(contact, original);
      assert.ok(Object.isFrozen(contact));
      assert.strictEqual(contact.centerUm, original.centerUm);
      for (const key of ['id', 'index', 'label', 'shape']) assert.equal(contact[key], original[key]);
      assert.equal(contact.widthUm, variant.widthUm);
      assert.equal(contact.heightUm, variant.heightUm);
      assert.equal(contact.areaUm2, variant.widthUm * variant.heightUm);
      // Every offered variant remains on the original shaft face and separate
      // from the other contacts. This does not turn the shaft into a boundary.
      assert.ok(Math.abs(contact.centerUm[0]) + contact.widthUm / 2 < design.widthUm / 2);
      assert.ok(contact.centerUm[2] + contact.heightUm / 2 < design.lengthUm - design.taperUm);
    });
    requested.variantId = 'unsupported';
    assert.equal(design.contactGeometry.variantId, variant.id, 'input mutation cannot alter resolved geometry');
  }
});

test('unsupported geometry requests fail before a substitute geometry is used', () => {
  const inherited = Object.create({ contactIndex: 0, variantId: '12x12' });
  const invalid = [false, 0, '12x12', [], new Date(), {}, inherited,
    { contactIndex: 0 }, { variantId: '12x12' },
    { contactIndex: -1, variantId: '12x12' }, { contactIndex: 8, variantId: '12x12' },
    { contactIndex: .5, variantId: '12x12' }, { contactIndex: '0', variantId: '12x12' },
    { contactIndex: NaN, variantId: '12x12' }, { contactIndex: Infinity, variantId: '12x12' },
    { contactIndex: 0, variantId: 'disk' }, { contactIndex: 0, variantId: '12X12' },
    { contactIndex: 0, variantId: null },
    { contactIndex: 0, variantId: '12x12', centerUm: [0, 0, 0] },
    { contactIndex: 0, variantId: '12x12', [Symbol('extra')]: true },
  ];
  for (const request of invalid) {
    assert.throws(() => makeInterfaceDesign(request), /contactGeometry/);
    assert.throws(() => createInterfaceField({ contactGeometry: request }), /contactGeometry/);
  }
});

test('all controlled variants retain joint current constraints and reciprocal terminal coefficients', () => {
  // A fixed physical pad and unchanged other surfaces control the geometry
  // comparison. These algebraic checks do not establish mesh convergence.
  const contactIndex = 4, neighborIndex = 3, nc = INTERFACE_DESIGN.contacts.length, localPoint = [-18, 25, 930];
  const diagonal = new Map(), local = new Map(), neighborLead = new Map(), neighborSelf = new Map();
  for (const variant of INTERFACE_CONTACT_VARIANTS) {
    const contactGeometry = { contactIndex, variantId: variant.id };
    const field = createInterfaceField({ contactGeometry });
    assert.strictEqual(field.contacts, field.design.contacts);
    assert.equal(field.metadata.designId, field.design.id);
    assert.deepEqual(field.metadata.contactGeometry, contactGeometry);
    assert.equal(field.metadata.geometry.plane, 'y=0');
    assert.equal(field.metadata.geometry.tissueSide, '+y');
    assert.strictEqual(field.metadata.geometry.contacts, field.design.contacts);
    assert.deepEqual(JSON.parse(JSON.stringify(field.metadata.geometry)).contacts, field.design.contacts);
    assert.ok(field.metadata.currentBalanceError < 1e-12);
    assert.ok(field.metadata.weakEquipotentialRelativeError < 1e-12);
    for (let basis = 0; basis < nc; basis++) {
      const totals = new Float64Array(nc);
      field.panels.forEach((panel, p) => { totals[panel.contactIndex] += field.panelBasis[p * nc + basis]; });
      totals.forEach((total, contact) => assert.ok(Math.abs(total - (contact === basis ? 1 : 0)) < 1e-12));
      for (let other = 0; other < nc; other++)
        assert.ok(Math.abs(field.contactTransferMvPerUa[other * nc + basis]
          - field.contactTransferMvPerUa[basis * nc + other]) < 1e-11);
    }
    diagonal.set(variant.id, field.contactTransferMvPerUa[contactIndex * nc + contactIndex]);
    local.set(variant.id, field.sample(localPoint)[contactIndex]);
    assert.strictEqual(field.contacts[neighborIndex], INTERFACE_DESIGN.contacts[neighborIndex]);
    neighborLead.set(variant.id, field.sample(localPoint)[neighborIndex]);
    neighborSelf.set(variant.id, field.contactTransferMvPerUa[neighborIndex * nc + neighborIndex]);
  }
  assert.ok(diagonal.get('12x12') > diagonal.get('20x20'));
  assert.ok(diagonal.get('20x20') > diagonal.get('30x30'));
  assert.ok(Math.abs(local.get('12x12') - local.get('30x30')) > .1,
    'changing a surface at a fixed center must change the finite-contact lead field');
  // With the neighbor's unit-current basis active, the resized pad is floating
  // with zero net current (checked above). Its induced panel currents still
  // change the neighbor's field and access coefficient. Updating only the
  // resized contact's column would incorrectly miss this coupled response.
  assert.ok(Math.abs(neighborLead.get('12x12') - neighborLead.get('30x30')) > 1e-9,
    'a fixed neighboring contact lead field must include the resized floating pad');
  assert.ok(Math.abs(neighborSelf.get('12x12') - neighborSelf.get('30x30')) > 1e-9,
    'a fixed neighboring contact terminal coefficient must include the resized floating pad');
});
