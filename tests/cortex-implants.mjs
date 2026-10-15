import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { freshActiveConfig, freshConfig, validateConfig } from '../src/lib/cortex/config.js';
import { CORTEX_IMPLANTS, getCortexImplantModel, getCortexContacts, selectCortexImplant } from '../src/lib/cortex/implants.js';
import { makeWorld, transformPoint } from '../src/lib/cortex/world.js';
import { placementReport, translationForTipDepth } from '../src/lib/cortex/placement.js';
import { buildWorldGroup } from '../src/lib/cortex/scene.js';
import { buildCortexImplantMesh } from '../src/lib/cortex/implant-mesh.js';
import { disposeDeviceMesh } from '../src/lib/devices/geometry.js';
import { getDeviceModel, getContactGeometry } from '../src/lib/devices/catalog.js';
import { encodeJson, parseConfig, runExperiment, resultBundle } from '../src/lib/cortex/experiment.js';

const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('Utah adapter preserves historical contact geometry and experiment configuration', () => {
  const c = freshConfig(), world = makeWorld(c);
  assert.deepEqual(world.config, c);
  assert.deepEqual(getCortexContacts(world.model), getContactGeometry(getDeviceModel('BTSD-0001')));
  assert.equal(world.model.revision, 1);
  assert.equal(world.model.physicalSites, 100);
  assert.equal(world.model.simultaneousChannels, 96);
});

test('one N1 thread retains 16 sites, true stack and pitch without claiming pad area', () => {
  const m = getCortexImplantModel('BTSD-0002'), sites = getCortexContacts(m);
  assert.equal(sites.length, 16);
  assert.equal(m.physicalSites, 16);
  assert.equal(m.simultaneousChannels, 16);
  close(m.threadThickness * 1000, 4.4);
  close(sites.at(-1).positionMm[2] - sites[0].positionMm[2], 3);
  sites.slice(1).forEach((s, i) => close(s.positionMm[2] - sites[i].positionMm[2], .2));
  assert.ok(sites.every(s => s.contactAreaMm2 === null && s.channel === null));
  assert.equal(getDeviceModel('BTSD-0002').physicalSites, 1024, 'catalog remains the full N1');
  const mesh = buildCortexImplantMesh(m), size = new Box3().setFromObject(mesh.bodies).getSize(new Vector3());
  close(size.x, .084); close(size.y, .0044); close(size.z, 3.6, 1e-6);
  assert.equal(mesh.contacts.children.length, 16);
  disposeDeviceMesh(mesh.group);
});

test('Neuropixels adapter preserves all 960 sites and full shank in a tip-relative frame', () => {
  const m = getCortexImplantModel('BTSD-0004'), sites = getCortexContacts(m);
  assert.equal(sites.length, 960); assert.equal(m.simultaneousChannels, 384);
  close(sites[0].positionMm[2], -.2);
  close(sites[2].positionMm[2] - sites[0].positionMm[2], -.02);
  close(sites[2].positionMm[0] - sites[0].positionMm[0], .016);
  assert.ok(sites.every(s => s.contactAreaMm2 === .012 ** 2 && s.channel === null));
  const mesh = buildCortexImplantMesh(m), box = new Box3().setFromObject(mesh.bodies), size = box.getSize(new Vector3());
  close(size.x, .07); close(size.y, .024); close(size.z, 10);
  close(box.max.z, 0); close(box.min.z, -10);
  disposeDeviceMesh(mesh.group);
});

for (const d of CORTEX_IMPLANTS.slice(1)) {
  test(`${d.key}: pose, pad meshes, normals, physical tip depth and exports share one frame`, () => {
    const c = selectCortexImplant(freshActiveConfig(), d.deviceId);
    assert.deepEqual(parseConfig(encodeJson(c)), c);
    assert.ok(placementReport(makeWorld(c)).supported, 'initial selected contacts clear membrane exclusion');
    c.implant.rotationDeg = [21, -17, 36];
    const w = makeWorld(c), scene = buildWorldGroup(w);
    assert.equal(w.tipsUm.length, 1);
    assert.deepEqual(w.tipsUm[0], c.implant.translationUm);
    for (const s of w.contacts) {
      const pad = scene.device.contacts.getObjectByName(s.id);
      const p = pad.getWorldPosition(new Vector3()).toArray();
      // Physical points and visual surfaces differ only by the stated 10 nm bias.
      close(Math.hypot(...p.map((v, i) => v * 1000 - s.positionUm[i])), .01, 1e-6);
      close(Math.hypot(...s.normal), 1);
      const expected = transformPoint(s.positionMm.map(v => v * 1000), c.implant);
      s.positionUm.forEach((v, i) => close(v, expected[i]));
    }
    const moved = translationForTipDepth(w, 2300);
    close(moved[2], 2300); close(moved[0], c.implant.translationUm[0]);
    disposeDeviceMesh(scene.root);
  });
  test(`${d.key}: hardware stimulation is rejected, including imported configs`, () => {
    const c = selectCortexImplant(freshActiveConfig(), d.deviceId);
    c.protocol.mode = 'extracellular-stimulation';
    assert.throws(() => validateConfig(c), /recording-only/);
    assert.throws(() => parseConfig(encodeJson(c)), /recording-only/);
    c.protocol.mode = 'intracellular-current'; c.implant.revision = 2;
    assert.throws(() => validateConfig(c), /revision/);
  });
}

test('switching scope preserves neuron/solver, resets contact IDs and handles recording-only protocols', () => {
  const c = freshActiveConfig(); c.protocol.mode = 'extracellular-stimulation';
  for (const d of CORTEX_IMPLANTS.slice(1)) {
    const next = selectCortexImplant(c, d.deviceId);
    assert.deepEqual(next.neuron, c.neuron); assert.deepEqual(next.solver, c.solver);
    assert.equal(next.protocol.mode, 'intracellular-current');
    assert.deepEqual(next.recording.contactIds, d.recording);
    assert.equal(c.implant.deviceId, 'BTSD-0001', 'selection must not mutate its input');
  }
  assert.throws(() => selectCortexImplant(c, 'unknown'), /Unknown/);
});

test('both single implants record finite active-cell signals without changing membrane dynamics', () => {
  const base = freshActiveConfig(), reference = runExperiment(base);
  for (const d of CORTEX_IMPLANTS.slice(1)) {
    const c = selectCortexImplant(base, d.deviceId), r = runExperiment(c), bundle = resultBundle(r);
    assert.deepEqual(r.membraneMv, reference.membraneMv);
    assert.ok(r.neuralUv.every(values => values.every(Number.isFinite)));
    assert.ok(r.neuralUv[0].some(v => Math.abs(v) > 1e-5));
    assert.notDeepEqual(r.neuralUv, reference.neuralUv);
    assert.equal(bundle.implant.catalogRevision, 2);
    assert.equal(bundle.implant.revision, 1);
    assert.equal(bundle.implant.extracellularStimulationSupported, false);
    assert.equal(bundle.implant.contacts.length, d.deviceId === 'BTSD-0002' ? 16 : 960);
    assert.match(bundle.coordinateSystem, /distal/);
    assert.ok(bundle.assumptions.some(s => s.includes('point sensing at reconstructed contact centers')));
  }
});
