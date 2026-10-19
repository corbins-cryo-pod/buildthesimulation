import test from 'node:test';
import assert from 'node:assert/strict';
import { createInterfaceField, interfacePanelKernel, INTERFACE_DESIGN } from '../src/lib/cortex/interface-field.js';

const field = createInterfaceField();

test('finite surface integration agrees with independent area quadrature and a centered rectangle identity', () => {
  const panel = { x: 0, z: 0, widthUm: 20, heightUm: 12 };
  const point = [4, 8, -3], n = 240;
  let numerical = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = ((i + .5) / n - .5) * panel.widthUm, z = ((j + .5) / n - .5) * panel.heightUm;
    numerical += 1 / Math.hypot(point[0] - x, point[1], point[2] - z) / (n * n);
  }
  const exact = interfacePanelKernel(panel, point);
  assert.ok(Math.abs(exact / numerical - 1) < 1e-5, `area quadrature relative error ${Math.abs(exact / numerical - 1)}`);
  const a = 10, b = 6, centered = (a * Math.asinh(b / a) + b * Math.asinh(a / b)) / (a * b);
  assert.ok(Math.abs(interfacePanelKernel(panel, [0, 0, 0]) - centered) < 1e-14);
});

test('joint solution conserves each contact current and retains induced floating-contact currents', () => {
  const nc = field.contacts.length;
  assert.equal(nc, 8);
  assert.ok(field.metadata.currentBalanceError < 1e-12);
  assert.ok(field.metadata.weakEquipotentialRelativeError < 1e-12);
  const sums = new Float64Array(nc), absolute = new Float64Array(nc);
  field.panels.forEach((panel, i) => {
    sums[panel.contactIndex] += field.panelBasis[i * nc];
    absolute[panel.contactIndex] += Math.abs(field.panelBasis[i * nc]);
  });
  assert.ok(Math.abs(sums[0] - 1) < 1e-12);
  assert.ok(Math.abs(sums[1]) < 1e-12);
  assert.ok(absolute[1] > 1e-5, 'inactive neighbor is polarized with zero NET current, not removed from the conductor');
  for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++)
    assert.ok(Math.abs(field.contactTransferMvPerUa[a * nc + b] - field.contactTransferMvPerUa[b * nc + a]) < 1e-11);
});

test('lead fields use the half-space SI scaling, reciprocal recording units and conductivity scaling', () => {
  const far = [0, 1e6, 850], unitExpected = 1000 / (2 * Math.PI * .3 * 1e6);
  const samples = field.sample(far);
  samples.forEach(v => assert.ok(Math.abs(v / unitExpected - 1) < 1e-6));
  const doubleConductivity = createInterfaceField({ conductivitySm: .6 });
  const point = [-18, 30, 250], base = field.sample(point), doubled = doubleConductivity.sample(point);
  base.forEach((v, i) => assert.ok(Math.abs(v - 2 * doubled[i]) < 1e-12));
  assert.ok(base[0] > 0);
});

test('out-of-domain neuronal samples are explicit, with no point-source substitution', () => {
  assert.equal(field.sample([0, 0, 500]), null);
  assert.equal(field.sample([0, -20, 500]), null);
  assert.equal(field.sample([0, 9.99, 500]), null);
  assert.equal(field.sample([NaN, 20, 500]), null);
  assert.equal(field.supportsPoint([0, 12, 500], 3), false);
  const prepared = field.prepare([[0, 30, 500], [0, -1, 500]]);
  assert.equal(prepared.supported, false);
  assert.equal(prepared.issues[0].index, 1);
  assert.ok(prepared.coefficients.slice(0, 8).every(Number.isFinite));
  assert.ok(prepared.coefficients.slice(8).every(Number.isNaN));
  assert.throws(() => createInterfaceField({ minimumHeightUm: 0 }));
});

test('4 to 8 panel refinement remains within declared sampled potential and contact-voltage tolerances', () => {
  // Gates are scoped to these samples, not arbitrary geometries or edge fields.
  const fine = createInterfaceField({ panelDivisions: 8 });
  let potentialError = 0, terminalError = 0;
  for (const contact of INTERFACE_DESIGN.contacts) {
    for (const y of [10, 25, 100]) for (const xOffset of [0, contact.widthUm / 2, contact.widthUm]) {
      const point = [contact.centerUm[0] + xOffset, y, contact.centerUm[2]];
      const coarseValue = field.sample(point), fineValue = fine.sample(point);
      for (let c = 0; c < fineValue.length; c++) potentialError = Math.max(potentialError, Math.abs(coarseValue[c] / fineValue[c] - 1));
    }
  }
  field.contactTransferMvPerUa.forEach((v, i) => { terminalError = Math.max(terminalError, Math.abs(v / fine.contactTransferMvPerUa[i] - 1)); });
  assert.ok(potentialError < .03, `sampled potential refinement error ${potentialError}`);
  assert.ok(terminalError < .04, `contact potential refinement error ${terminalError}`);
});
