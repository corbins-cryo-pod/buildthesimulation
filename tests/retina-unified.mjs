import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cloneDefaults,
  normalize,
  exportExperiment,
  parseExperiment,
  importDesigner,
  fromLegacyElectrical,
  fromLegacyPrima,
} from "../src/lib/retina-lab/schema.mjs";
import {
  placePoint,
  localPoint,
  retinalToVisual,
  visualToRetinal,
  sampleRetinal,
} from "../src/lib/retina-lab/coordinates.mjs";
import {
  population,
  morphology,
  layersAt,
  tissueAt,
} from "../src/lib/retina-lab/anatomy.mjs";
import {
  opticalTransmission,
  thermalTrace,
} from "../src/lib/retina-lab/optics.mjs";
import {
  retinalRates,
  cableSystem,
  solveTree,
  runCable,
  runNetwork,
} from "../src/lib/retina-lab/neural.mjs";
import {
  simulate,
  sceneImage,
  projectPrima,
  encodedContacts,
  contactWaveform,
  bipolarPulse,
  primaTransfer,
} from "../src/lib/retina-lab/engine.mjs";
import { decodePerceptReference } from "../src/lib/retinal-implant/percept.mjs";
import { simulateExperiment as oldElectrical } from "../src/lib/retinal-implant/engine.mjs";
import { simulateExperiment as oldPrima } from "../src/lib/prima/engine.mjs";
import { exportExperiment as exportOldElectrical } from "../src/lib/retinal-implant/model.mjs";
import { exportExperiment as exportOldPrima } from "../src/lib/prima/export.mjs";
import { createPrimaGeometry } from "../src/lib/prima/geometry.mjs";
import {
  makeCircuitModel,
  evaluateFields,
  solvePhysics,
} from "../src/lib/prima/physics.mjs";
const close = (a, b, tol = 1e-9) =>
  assert(Math.abs(a - b) <= tol, `${a} vs ${b}, tolerance ${tol}`);
const asset = new URL("../public/assets/retinal-implant/", import.meta.url),
  manifest = JSON.parse(readFileSync(new URL("axon-reference.json", asset)));
const reference = await decodePerceptReference(
  manifest,
  Buffer.concat(
    manifest.storage.chunks.map((c) => readFileSync(new URL(c.file, asset))),
  ),
);
const max = (a) => Math.max(...a),
  sum = (a) => a.reduce((a, b) => a + b, 0);
function fast(mode = "electrical") {
  const c = cloneDefaults();
  c.modality = mode;
  c.neural.durationMs = 50;
  c.neural.gridSize = 15;
  c.neural.selectedIndex = 112;
  c.photovoltaic.cycles = 1;
  return c;
}

// Coordinate checks use independently specified expected rotations and image quadrants.
test("shared chart: rigid placement, inverse transform, Watson round trip and visual-y inversion", () => {
  const p = placePoint(
    { xUm: 300, yUm: 100 },
    { xUm: 10, yUm: -20, rotationDeg: 90 },
  );
  close(p.xUm, -90);
  close(p.yUm, 280);
  const q = localPoint(p, { xUm: 10, yUm: -20, rotationDeg: 90 });
  close(q.xUm, 300);
  close(q.yUm, 100);
  for (const [x, y] of [
    [0, 0],
    [-9, 3],
    [4, -12],
  ]) {
    const r = visualToRetinal(x, y),
      v = retinalToVisual(r.xUm, r.yUm);
    close(v.xDeg, x, 2e-5);
    close(v.yDeg, y, 2e-5);
    if (y) assert(Math.sign(r.yUm) === -Math.sign(y));
  }
});
test("electrical and photovoltaic encoding both select the same visual quadrant", () => {
  const c = fast(),
    values = Array.from({ length: 32 * 32 }, (_, i) =>
      i % 32 >= 16 && i < 16 * 32 ? 1 : 0,
    );
  c.scene.customImage = { width: 32, height: 32, values };
  c.scene.stimulus = "image";
  const scene = sceneImage(c),
    projection = projectPrima(scene, c, 32),
    contacts = encodedContacts(c, scene);
  assert(sampleRetinal(scene, 500, -500, c.scene.fieldDeg) > 0.9);
  assert(sampleRetinal(scene, 500, 500, c.scene.fieldDeg) < 0.01);
  assert(projection.values[24 * 32 + 24] > 0.9);
  assert(projection.values[8 * 32 + 24] < 0.01);
  assert(
    contacts.filter((p) => p.drive > 0.9).every((p) => p.xUm > 0 && p.yUm < 0),
  );
  c.placement.rotationDeg = 180;
  const rotated = projectPrima(scene, c, 32);
  assert(rotated.values[8 * 32 + 8] > 0.9);
});
test("strict schema rejects nonfinite values, unknown models, unsafe size and unsupported geometry", () => {
  assert.throws(() => normalize({ fidelity: "patient-validated" }));
  assert.throws(() => normalize({ neural: { thresholdMv: NaN } }));
  assert.throws(() => normalize({ foo: 1 }));
  assert.throws(() => normalize({ scene: { stimulus: "video", frames: [] } }));
  assert.throws(() => normalize({ driveWeights: { E01: 2 } }));
  const d = {
    schema: "bts-neural-interface",
    version: 1,
    units: "µm",
    contacts: [
      { id: "custom", x: 10, y: 20, w: 50, shape: "circle", layer: 1 },
    ],
  };
  assert.deepEqual(importDesigner(JSON.stringify(d))[0], {
    id: "custom",
    xUm: 10,
    yUm: -20,
    radiusUm: 25,
    material: "unspecified",
  });
  d.contacts.push({ ...d.contacts[0], id: "other", x: 200, layer: 0 });
  assert.throws(() => importDesigner(JSON.stringify(d)), /one plane/);
  d.contacts[1].layer = 1;
  d.contacts[0].shape = "square";
  assert.throws(() => importDesigner(JSON.stringify(d)), /circular/);
  d.contacts[0].shape = "circle";
  d.units = "mm";
  assert.throws(() => importDesigner(JSON.stringify(d)), /µm/);
});
test("custom contact selection and channel gains survive normalization and export", () => {
  const c = fast();
  c.customContacts = [
    { id: "C-A", xUm: 0, yUm: 0, radiusUm: 20 },
    { id: "C-B", xUm: 500, yUm: 0, radiusUm: 30 },
  ];
  c.electrical.selectedId = "C-B";
  c.driveWeights = { "C-A": 0, "C-B": 0.5 };
  const n = normalize(c);
  assert.equal(n.electrical.selectedId, "C-B");
  assert.deepEqual(parseExperiment(JSON.stringify(exportExperiment(n))), n);
  const contacts = encodedContacts(n, {
    width: 32,
    height: 32,
    values: new Float32Array(1024).fill(1),
  });
  assert.equal(contacts[0].amplitudeUa, 0);
  close(contacts[1].amplitudeUa, 40);
});
test("anatomy is reproducible, stratified, topologically valid and disease changes function", () => {
  const c = fast(),
    a = population(c),
    b = population(c);
  assert.deepEqual(a, b);
  const m = morphology(a[111]);
  assert.deepEqual(m, morphology(a[111]));
  assert(
    m.every((q, i) =>
      i === 0 ? q.parent === -1 : q.parent >= 0 && q.parent < i,
    ),
  );
  assert(m.every((q) => q.radiusUm > 0 && Number.isFinite(q.depthUm)));
  const l = layersAt(2000, 0),
    f = layersAt(0, 0);
  assert(
    l.every((q, i) => q.bottom > q.top && (!i || q.top === l[i - 1].bottom)),
  );
  assert(
    f.find((q) => q.id === "GCL").thickness <
      l.find((q) => q.id === "GCL").thickness,
  );
  const t = { ...c.tissue, condition: "ga", severity: 1 };
  assert(tissueAt(0, 0, t).photoreceptor === 0);
  assert(tissueAt(4000, 0, t).photoreceptor > 0.99);
  assert.equal(tissueAt(0, 0, { ...t, condition: "ganglion" }).ganglion, 0);
});
test("optics: vacuum and Beer–Lambert slab agree with closed-form transmission", () => {
  const o = {
    ...cloneDefaults().optical,
    scatteringMmInv: 0,
    absorptionMmInv: 2,
  };
  close(opticalTransmission(500, o), Math.exp(-1));
  close(opticalTransmission(0, o), 1);
  close(opticalTransmission(500, { ...o, absorptionMmInv: 0 }), 1);
  assert(
    opticalTransmission(400, { ...o, scatteringMmInv: 1 }) <
      opticalTransmission(200, { ...o, scatteringMmInv: 1 }),
  );
});
test("thermal balance matches analytical constant-flux solution and excludes scattering from heat", () => {
  const o = { ...cloneDefaults().optical, pulseMs: 30, frequencyHz: 1 };
  const t = thermalTrace(o, 20, 0.05),
    thick = o.tissueThicknessUm / 1000,
    abs = 1 - Math.exp(-o.absorptionMmInv * thick),
    q = o.irradianceMwMm2 * 1e-3 * abs;
  close(t.absorbedEnergyJMm2, q * 0.02, 1e-14);
  close(
    t.deltaK.at(-1),
    ((q * (o.coolingMs / 1000)) / (o.thermalCapacityJMm3K * thick)) *
      (1 - Math.exp(-20 / o.coolingMs)),
    1e-12,
  );
  assert.equal(thermalTrace({ ...o, absorptionMmInv: 0 }, 20).peakDeltaK, 0);
  assert.equal(thermalTrace({ ...o, irradianceMwMm2: 0 }, 20).peakDeltaK, 0);
  close(
    thermalTrace({ ...o, scatteringMmInv: 15 }, 20, 0.05).peakDeltaK,
    t.peakDeltaK,
  );
});
test("charge-balanced waveform reverses polarity and suppresses incomplete pulse pairs", () => {
  const c = fast();
  c.electrical.pattern = "single";
  c.inputMode = "legacy-electrical";
  c.electrical.trainDurationMs = 20;
  const contacts = encodedContacts(c, sceneImage(c)),
    w = contactWaveform(c, contacts, c.electrical.selectedId);
  close(w.netChargeNc, 0);
  assert(w.phaseChargeNc > 0);
  close(w.events[0].currentUa, -80);
  c.polarity = "anodic-first";
  const a = contactWaveform(c, contacts, c.electrical.selectedId);
  close(a.events[0].currentUa, 80);
  close(a.netChargeNc, 0);
  assert.equal(bipolarPulse(c, 0.1), -1);
  assert.equal(bipolarPulse(c, 20), 0);
  assert.equal(bipolarPulse(c, 19.8, 19.5), 0);
});
test("Hines tree elimination matches independent dense residuals on an asymmetric branched tree", () => {
  const nodes = [
      { parent: -1, axialNs: 0 },
      { parent: 0, axialNs: 2 },
      { parent: 0, axialNs: 3 },
      { parent: 1, axialNs: 5 },
    ],
    diag = [8, 9, 6, 7],
    rhs = [1, 2, 3, 4];
  const x = solveTree(nodes, diag, rhs);
  const A = [
    [8, -2, -3, 0],
    [-2, 9, 0, -5],
    [-3, 0, 6, 0],
    [0, -5, 0, 7],
  ];
  for (let i = 0; i < 4; i++)
    close(
      A[i].reduce((s, v, j) => s + v * x[j], 0),
      rhs[i],
      1e-12,
    );
});
test("cable conductance has correct SI area conversion and two half-section resistances", () => {
  const nodes = [
      { xUm: 0, yUm: 0, depthUm: 0, radiusUm: 5, parent: -1, type: "soma" },
      {
        xUm: 100,
        yUm: 0,
        depthUm: 0,
        radiusUm: 1,
        parent: 0,
        type: "dendrite",
      },
    ],
    q = cableSystem(nodes);
  close(q[0].capacitancePf, Math.PI);
  close(q[1].capacitancePf, 2 * Math.PI);
  const resistance =
    110 * (50e-4 / (Math.PI * 1e-8) + 5e-4 / (Math.PI * 25e-8));
  close(q[1].axialNs, 1e9 / resistance, 1e-12);
});
test("retinal rates are finite at removable singularities and obey probability bounds", () => {
  for (const v of [-120, -90, -70, -50, -40, -30, 0, 50])
    for (const [a, b] of retinalRates(v)) {
      assert(a >= 0 && b >= 0 && Number.isFinite(a + b));
      assert(a / (a + b) >= 0 && a / (a + b) <= 1);
    }
});
test("passive cable matches its analytical RC equilibrium and is extracellular-gauge invariant", () => {
  const c = fast("optogenetic");
  c.neural.durationMs = 100;
  const cell = population(c)[112],
    nodes = [
      { xUm: 0, yUm: 0, depthUm: 20, radiusUm: 5, parent: -1, type: "soma" },
    ];
  const a = runCable(c, cell, () => [0], {
    nodes,
    passive: true,
    injectionPa: 0,
  });
  const b = runCable(c, cell, () => [125], {
    nodes,
    passive: true,
    injectionPa: 0,
  });
  assert.deepEqual(a.voltageMv, b.voltageMv);
  // C/g=200 ms, including the documented 20 ms equilibration.
  close(
    a.voltageMv.at(-1),
    -62.5 + (-65 + 62.5) * Math.exp(-120 / 200),
    0.0001,
  );
});
test("active retinal cable is finite, spikes with intracellular drive and converges under time refinement", () => {
  const c = fast("optogenetic"),
    cell = population(c)[112];
  c.neural.durationMs = 60;
  const nodes = morphology(cell, { count: 20 });
  const a = runCable(c, cell, () => new Float64Array(nodes.length), {
    nodes,
    injectionPa: 100,
  });
  c.neural.cableDtMs = 0.01;
  const b = runCable(c, cell, () => new Float64Array(nodes.length), {
    nodes,
    injectionPa: 100,
  });
  assert(a.voltageMv.every(Number.isFinite));
  assert(a.spikes.length > 0);
  assert(Math.abs(a.spikes.length - b.spikes.length) <= 1);
  assert(Math.abs(a.spikes[0] - b.spikes[0]) < 0.6);
});
test("PRIMA transfer matrix matches direct active-plus-shared-return field evaluation", () => {
  const c = fast("photovoltaic").photovoltaic,
    g = createPrimaGeometry(c),
    m = makeCircuitModel(c, g),
    points = [
      { xUm: 35, yUm: -70, zUm: 50 },
      { xUm: 250, yUm: 200, zUm: 120 },
    ];
  const currents = Float64Array.from(g.pixels, (_, i) =>
      i % 17 === 0 ? 0.05e-6 : 0,
    ),
    T = primaTransfer(m, g, points),
    direct = evaluateFields(m, g, currents, points);
  for (let i = 0; i < 2; i++)
    close(
      T[i].reduce((s, v, j) => s + v * currents[j] * 1e6, 0),
      direct[i].potentialMv,
      1e-8,
    );
});
test("PRIMA observer is passive: captured per-pixel currents equal exported circuit samples", () => {
  const c = fast("photovoltaic").photovoltaic,
    g = createPrimaGeometry(c),
    light = Float64Array.from(g.pixels, (_, i) => (i === 141 ? 1 : 0)),
    samples = [];
  const r = solvePhysics(c, light, () => {}, {
    onSample: (time, current) =>
      samples.push({ time, current: Float64Array.from(current) }),
  });
  assert.equal(samples.length, r.waveform.timeMs.length);
  for (let i = 0; i < samples.length; i += 37) {
    close(samples[i].time, r.waveform.timeMs[i]);
    close(sum(samples[i].current) * 1e6, r.waveform.arrayCurrentUa[i], 1e-10);
  }
});
test("all modalities are dark at zero physical stimulus, with their baseline distinction retained", async () => {
  for (const mode of ["electrical", "photovoltaic", "optogenetic", "hybrid"]) {
    const c = fast(mode);
    c.electrical.amplitudeUa = 0;
    c.photovoltaic.irradianceMwMm2 = 0;
    c.optical.irradianceMwMm2 = 0;
    const r = await simulate(c, reference);
    assert.equal(r.metrics.totalSpikes, 0, mode);
    assert.equal(max(r.response.values), 0, mode);
    assert.equal(r.metrics.peakGanglionDriveMv, 0);
    assert.equal(r.metrics.peakBipolarDriveMv, 0);
    if (mode === "photovoltaic")
      assert(
        max(r.baseline.values) > 0,
        "Conditional image baseline intentionally does not depend on physical current",
      );
  }
});
test("real device placement and surviving pathways alter calculated responses", async () => {
  const c = fast(),
    a = await simulate(c, reference);
  assert(a.metrics.totalSpikes > 0);
  c.placement.xUm = 2600;
  const b = await simulate(c, reference);
  assert.notDeepEqual(a.drive.ganglionMv, b.drive.ganglionMv);
  c.tissue.ganglion = 0;
  const dead = await simulate(c, reference);
  assert.equal(dead.metrics.totalSpikes, 0);
  assert.equal(max(dead.response.values), 0);
  const p = fast("photovoltaic");
  p.neural.durationMs = 100;
  const pv = await simulate(p, null);
  assert(pv.metrics.peakBipolarDriveMv > 0);
  assert(pv.metrics.totalSpikes > 0);
  p.tissue.bipolar = 0;
  const noBC = await simulate(p, null);
  assert.equal(noBC.metrics.totalSpikes, 0);
  assert.equal(noBC.metrics.peakBipolarDriveMv, pv.metrics.peakBipolarDriveMv);
});
test("opsin expression changes photocurrent without changing illumination", async () => {
  const c = fast("optogenetic"),
    a = await simulate(c, null);
  c.optical.expression = 0;
  const b = await simulate(c, null);
  assert.deepEqual(a.drive.optical, b.drive.optical);
  assert(a.metrics.totalSpikes > 0);
  assert.equal(b.metrics.totalSpikes, 0);
  assert.equal(max(b.neural.traces.photocurrentPa), 0);
});
test("legacy electrical export restores full settings and exact retained fields and percept", async () => {
  const c = fromLegacyElectrical({
    ...cloneDefaults().electrical,
    pattern: "single",
    gapUm: 250,
    eye: "LE",
  });
  c.neural.durationMs = 20;
  const r = await simulate(c, reference),
    old = await oldElectrical(c.electrical, reference);
  for (const key of [
    "potentialMv",
    "exVm",
    "eyVm",
    "ezVm",
    "jxAm2",
    "jyAm2",
    "jzAm2",
  ])
    assert.deepEqual(r.electrical.legacy.field[key], old.field[key]);
  assert.deepEqual(r.electrical.legacy.percept, old.percept);
  assert.deepEqual(
    parseExperiment(JSON.stringify(exportOldElectrical(c.electrical)))
      .electrical,
    c.electrical,
  );
});
test("legacy PRIMA export restores full settings and exact retained circuit and percept", async () => {
  const c = fromLegacyPrima({
    ...cloneDefaults().photovoltaic,
    stimulus: "spot",
    cycles: 1,
    imageSize: 128,
  });
  c.neural.durationMs = 20;
  const r = await simulate(c, null),
    old = await oldPrima(c.photovoltaic);
  assert.deepEqual(r.photovoltaic.legacy.physics, old.physics);
  assert.deepEqual(r.photovoltaic.legacy.percept, old.percept);
  assert.deepEqual(
    parseExperiment(exportOldPrima(old)).photovoltaic,
    c.photovoltaic,
  );
});
test("new results export round-trips settings, rejects stale results and ignores imported calculations", async () => {
  const c = fast("optogenetic"),
    r = await simulate(c, null),
    d = exportExperiment(c, r);
  d.results.metrics.totalSpikes = 123456;
  assert.deepEqual(parseExperiment(JSON.stringify(d)), r.config);
  c.optical.expression = 0.3;
  assert.throws(() => exportExperiment(c, r), /changed settings/);
});

test("thermal exposure ends with the actual photovoltaic train and resolves pulse edges", () => {
  const o = {
    ...cloneDefaults().optical,
    pulseMs: 7.3,
    frequencyHz: 30,
    trainDurationMs: 2000 / 30,
  };
  const r = thermalTrace(o, 200, 0.1),
    expected =
      (o.irradianceMwMm2 *
        1e-3 *
        (1 - Math.exp((-o.absorptionMmInv * o.tissueThicknessUm) / 1000)) *
        2 *
        o.pulseMs) /
      1000;
  close(r.absorbedEnergyJMm2, expected, 1e-12);
  const nearEnd = r.timeMs.findIndex((t) => t >= o.trainDurationMs);
  assert(r.deltaK.at(-1) < r.deltaK[nearEnd]);
});

test("sampled video inputs use the specified frame and preserve common scene orientation", () => {
  const c = fast("optogenetic"),
    black = { width: 16, height: 16, values: Array(256).fill(0) },
    white = { width: 16, height: 16, values: Array(256).fill(1) };
  c.scene.stimulus = "video";
  c.scene.frames = [black, white];
  c.scene.frameMs = 100;
  assert.equal(max(sceneImage(c).values), 0);
  c.scene.frameIndex = 1;
  assert.equal(max(sceneImage(c).values), 1);
  assert.deepEqual(normalize(c).scene.frames, [black, white]);
});
