import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateField, axisDiskField, sourceCurrentSummary, clearFieldCache, fieldCacheStats } from '../src/lib/retinal-implant/field.mjs';
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/retinal-field/independent-reference.json', import.meta.url)));
const source = { id: 'S', xUm: 0, yUm: 0, zUm: 100, radiusUm: 100, currentUa: 80 };
const close = (a, b, relative = 1e-10, absolute = 1e-9) => assert(Math.abs(a - b) <= absolute + relative * Math.abs(b), `${a} differs from ${b}`);

test('retinal field: 69 independent elliptic/adaptive references agree with direct disk quadrature', () => {
  assert.equal(fixtures.cases.length, 69);
  for (const f of fixtures.cases) {
    const actual = evaluateField(f.sources, [f.point], { conductivitySm: f.conductivitySm, interpolation: false });
    close(actual.potentialMv[0], f.expected.potentialMv, 1e-7);
    const error = Math.hypot(actual.exVm[0] - f.expected.exVm, actual.eyVm[0] - f.expected.eyVm, actual.ezVm[0] - f.expected.ezVm);
    assert(error <= 1e-6 + 7e-6 * Math.hypot(f.expected.exVm, f.expected.eyVm, f.expected.ezVm), f.name);
  }
});

test('retinal field: cached interpolation agrees with the independent reference', () => {
  for (const f of fixtures.cases) {
    const actual = evaluateField(f.sources, [f.point], { conductivitySm: f.conductivitySm, interpolation: true });
    close(actual.potentialMv[0], f.expected.potentialMv, 2e-7);
    const error = Math.hypot(actual.exVm[0] - f.expected.exVm, actual.eyVm[0] - f.expected.eyVm, actual.ezVm[0] - f.expected.ezVm);
    assert(error <= 1e-6 + 3e-5 * Math.hypot(f.expected.exVm, f.expected.eyVm, f.expected.ezVm), f.name);
  }
});

test('retinal field: exact axis, polarity and conductivity scalings have consistent units', () => {
  const exact = axisDiskField({ currentUa: 80, radiusUm: 100, axialOffsetUm: -100, conductivitySm: .2 });
  close(exact.potentialMv, 263.6965437895247); close(exact.ezVm, -1864.6161428902828);
  const a = evaluateField([source], [{ xUm: 50, yUm: 80, zUm: 0 }]);
  const b = evaluateField([{ ...source, currentUa: -160 }], [{ xUm: 50, yUm: 80, zUm: 0 }], { conductivitySm: .4 });
  for (const key of ['potentialMv', 'exVm', 'eyVm', 'ezVm']) close(b[key][0], -a[key][0]);
  close(b.currentDensityAm2[0], 2 * a.currentDensityAm2[0]);
});

test('retinal field: finite sources and returns superpose and balance', () => {
  const returnSource = { ...source, id: 'R', xUm: 5000, currentUa: -80, radiusUm: 250 };
  const points = [{ xUm: 0, yUm: 0, zUm: 0 }, { xUm: 320, yUm: -230, zUm: 0 }];
  const a = evaluateField([source], points), b = evaluateField([returnSource], points), combined = evaluateField([source, returnSource], points, { requireBalanced: true });
  for (const key of ['potentialMv', 'exVm', 'eyVm', 'ezVm']) for (let i = 0; i < points.length; i++) close(combined[key][i], a[key][i] + b[key][i]);
  assert.equal(combined.metadata.currentBalanced, true); assert.equal(sourceCurrentSummary([source, returnSource]).netCurrentUa, 0);
  assert.throws(() => evaluateField([source], points, { requireBalanced: true }), /sum to zero/);
});

test('retinal field: electric field is the negative potential gradient, including cached radial interpolation', () => {
  for (const interpolation of [false, true]) {
    const p = { xUm: 83.4, yUm: 63.7, zUm: 0 }, a = evaluateField([source], [p], { interpolation });
    for (const [axis, key] of [['xUm', 'exVm'], ['yUm', 'eyVm'], ['zUm', 'ezVm']]) {
      const delta = .01, left = { ...p, [axis]: p[axis] - delta }, right = { ...p, [axis]: p[axis] + delta };
      const b = evaluateField([source], [left, right], { interpolation });
      const gradient = -(b.potentialMv[1] - b.potentialMv[0]) / (2 * delta) * 1000;
      close(a[key][0], gradient, 2e-6, 2e-4);
    }
  }
});

test('retinal field: far-field source and balanced dipole have the expected distance scaling', () => {
  const s = { ...source, xUm: 0, yUm: 0, zUm: 0 }, p1 = { xUm: 0, yUm: 0, zUm: 100000 }, p2 = { ...p1, zUm: 200000 };
  const lone = evaluateField([s], [p1, p2], { interpolation: false });
  close(lone.potentialMv[0] / lone.potentialMv[1], 2, 1e-6);
  const dipole = evaluateField([s, { ...s, zUm: -1000, currentUa: -80 }], [p1, p2], { interpolation: false, requireBalanced: true });
  assert(dipole.potentialMv[0] / dipole.potentialMv[1] > 3.9 && dipole.potentialMv[0] / dipole.potentialMv[1] < 4.1);
});

test('retinal field: exact geometry cache keys respond to mutation and remain bounded', () => {
  clearFieldCache();
  const points = [{ xUm: 0, yUm: 0, zUm: 0 }], s = { ...source };
  const a = evaluateField([s], points), b = evaluateField([s], points);
  assert.equal(b.metadata.sourceTransfersReused, 1); assert.equal(a.potentialMv[0], b.potentialMv[0]);
  points[0].xUm = 100; const c = evaluateField([s], points); assert.notEqual(c.potentialMv[0], a.potentialMv[0]);
  s.radiusUm = 150; const d = evaluateField([s], points); assert.notEqual(c.potentialMv[0], d.potentialMv[0]);
  for (let i = 0; i < 6; i++) evaluateField([s], [{ xUm: 150 + i, yUm: 0, zUm: 0 }]);
  assert(fieldCacheStats().observationSets <= 4); assert(fieldCacheStats().transferCacheBytes <= 128 * 1024 * 1024);
});

test('retinal field: small-gap quadrature refines; singular and invalid inputs reject', () => {
  const a = evaluateField([{ ...source, zUm: 2.5 }], [{ xUm: 95, yUm: 0, zUm: 0 }]);
  assert.equal(a.metadata.maximumRadialOrderUsed, 128);
  assert.throws(() => evaluateField([{ ...source, zUm: 2 }], [{ xUm: 95, yUm: 0, zUm: 0 }]), /gap\/radius/);
  assert.throws(() => evaluateField([source], [{ xUm: 0, yUm: 0, zUm: 100 }]), /source plane/);
  assert.throws(() => evaluateField([source], [{ xUm: NaN, yUm: 0, zUm: 0 }]), /finite/);
  assert.throws(() => evaluateField([source], [], { conductivitySm: 0 }), /Conductivity/);
  assert.throws(() => evaluateField([{ ...source, radiusUm: 0 }], []), /radius/);
});

test('retinal field: no current has exactly zero fields and finite metadata', () => {
  const result = evaluateField([{ ...source, currentUa: 0 }], [{ xUm: 0, yUm: 0, zUm: 100 }], { requireBalanced: true });
  for (const key of ['potentialMv', 'exVm', 'eyVm', 'ezVm', 'currentDensityAm2']) assert.equal(result[key][0], 0);
  assert.equal(result.metadata.minimumGapOverRadius, null);
});
