import test from "node:test";
import assert from "node:assert/strict";
import { freshConfig } from "../src/lib/cortex/config.js";
import { makeWorld } from "../src/lib/cortex/world.js";
import { runExperiment } from "../src/lib/cortex/experiment.js";
import {
  membraneDistanceUm,
  leadField,
  pointField,
} from "../src/lib/cortex/volume-conductor.js";
import {
  appliedSlices,
  electricalScales,
  nearestFrame,
  replayPhase,
  sampleInterval,
  resultSummary,
  configurationChanges,
} from "../src/lib/cortex/electrical.js";
import {
  placementReport,
  translationForTipDepth,
} from "../src/lib/cortex/placement.js";
import {
  buildWorldGroup,
  updateElectricalOverlay,
} from "../src/lib/cortex/scene.js";
import { disposeDeviceMesh } from "../src/lib/devices/geometry.js";

const stimulated = () => {
  const c = freshConfig();
  c.protocol.mode = "extracellular-stimulation";
  return c;
};

test("slice mask excludes a source inside a cell even when all vertices are outside the exclusion sphere", () => {
  const world = makeWorld(stimulated()),
    source = world.contacts.find(
      (s) => s.id === world.config.protocol.sourceContactIds[0],
    );
  const data = appliedSlices(world, {
    orientation: "xy",
    extentUm: 2400,
    offsetUm: source.positionUm.map(
      (v, i) => v - world.config.neuron.somaUm[i] + (i < 2 ? 50 : 0),
    ),
  });
  const slice = data.slices[0];
  assert.ok(slice.excludedCells > 0);
  // Independently test every retained rectangle's closest point to either source.
  for (let k = 0; k < slice.indices.length; k += 6) {
    const a = slice.points[slice.indices[k]],
      d = slice.points[slice.indices[k + 4]];
    for (const id of world.config.protocol.sourceContactIds) {
      const p = world.contacts.find((s) => s.id === id).positionUm;
      const dx = Math.max(a[0] - p[0], 0, p[0] - d[0]);
      const dy = Math.max(a[1] - p[1], 0, p[1] - d[1]);
      assert.ok(
        Math.hypot(dx, dy, p[2] - a[2]) > world.config.recording.exclusionUm,
      );
    }
  }
});

test("applied tissue values agree with direct SI potential and ideal recording artifact for both phases and rest", () => {
  const world = makeWorld(stimulated()),
    result = runExperiment(world.config),
    summary = resultSummary(result);
  const sources = world.config.protocol.sourceContactIds.map((id) =>
    world.contacts.find((s) => s.id === id),
  );
  const sample = world.contacts.find(
    (s) => s.id === world.config.recording.contactIds[0],
  ).positionUm;
  const data = appliedSlices(world, {
    orientation: "xz",
    offsetUm: sample.map((v, i) => v - world.config.neuron.somaUm[i]),
  });
  const transfer = data.slices[0].transfers[12 * 25 + 12];
  for (const frame of [
    0,
    summary.negativeFrame,
    summary.positiveFrame,
    result.timeMs.length - 1,
  ]) {
    const current = result.drive[frame];
    const independentMv = sources.reduce(
      (sum, s, i) =>
        sum +
        pointField(
          sample,
          s.positionUm,
          current * 1000 * (i ? -1 : 1),
          world.config.tissue.conductivitySPerM,
        ).voltageMv,
      0,
    );
    assert.ok(Math.abs(transfer * current - independentMv) < 1e-12);
    assert.ok(
      Math.abs(transfer * current * 1000 - result.appliedUv[0][frame]) < 1e-10,
    );
  }
});

test("fixed/automatic scales have separate units and remain unchanged across replay", () => {
  const world = makeWorld(stimulated()),
    result = runExperiment(world.config);
  const auto = electricalScales(world, result, {
    fieldScale: "auto",
    component: "applied",
  });
  assert.equal(auto.recordingUv, resultSummary(result).limits.applied);
  assert.equal(
    auto.fieldMv,
    auto.field.peakTransfer * world.config.protocol.amplitudeUa,
  );
  const fixed = electricalScales(world, result, {
    fieldScale: "fixed",
    fieldLimitMv: 0.1,
    recordingScale: "fixed",
    recordingLimitUv: 7,
  });
  assert.equal(fixed.fieldMv, 0.1);
  assert.equal(fixed.recordingUv, 7);
  assert.strictEqual(appliedSlices(world), appliedSlices(world));
  assert.strictEqual(resultSummary(result), resultSummary(result));
});

test("slice-only edits dispose replaced buffers and retain geometry/calculation identity", () => {
  const world = makeWorld(stimulated()),
    result = runExperiment(world.config),
    objects = buildWorldGroup(world);
  const overlay = objects.electrical;
  let disposed = 0;
  for (const s of overlay.slices) {
    s.mesh.geometry.addEventListener("dispose", () => disposed++);
    s.mesh.material.addEventListener("dispose", () => disposed++);
  }
  updateElectricalOverlay(overlay, result, 0, {
    orientation: "xz",
    offsetUm: [0, 100, 0],
    tips: false,
    tissueField: true,
    fieldOpacity: 0.4,
  });
  assert.equal(disposed, 6);
  assert.equal(overlay.slices.length, 1);
  assert.ok(overlay.tips.every((t) => !t.mesh.visible));
  assert.equal(overlay.slices[0].mesh.material.opacity, 0.4);
  const geometry = overlay.slices[0].mesh.geometry;
  updateElectricalOverlay(overlay, result, 1, {
    orientation: "xz",
    offsetUm: [0, 100, 0],
    tips: true,
    tissueField: false,
  });
  assert.strictEqual(overlay.slices[0].mesh.geometry, geometry);
  assert.equal(overlay.slices[0].mesh.visible, false);
  assert.ok(overlay.tips.every((t) => t.mesh.visible));
  assert.match(overlay.tips[0].label, /Rec A.*r4-c4/);
  updateElectricalOverlay(overlay, null, 0);
  assert.equal(overlay.group.visible, false);
  disposeDeviceMesh(objects.root);
});

test("placement diagnostics use exactly the solver exclusion distance and reject membrane overlap", () => {
  const world = makeWorld(freshConfig()),
    report = placementReport(world);
  assert.ok(report.supported);
  for (const row of report.rows) assert.ok(Number.isFinite(row.nearestUm));
  const node = world.neuron.nodes[0],
    point = node.centerUm;
  assert.equal(membraneDistanceUm(point, node), -node.diameterUm / 2);
  assert.throws(
    () =>
      leadField(
        world.neuron.nodes,
        [{ id: "test", positionUm: point }],
        0.3,
        "point",
        25,
      ),
    /within 25/,
  );
  world.contacts.find(
    (s) => s.id === world.config.recording.contactIds[0],
  ).positionUm = point;
  assert.equal(placementReport(world).supported, false);
});

test("tip-depth control translates the same rotated contact coordinates used by the solver", () => {
  const c = freshConfig();
  c.implant.rotationDeg = [20, -15, 32];
  const world = makeWorld(c),
    original = structuredClone(world.contacts);
  c.implant.translationUm = translationForTipDepth(world, 1800);
  const next = makeWorld(c);
  assert.ok(
    Math.abs(
      next.contacts.reduce((s, c) => s + c.positionUm[2], 0) / 100 - 1800,
    ) < 1e-10,
  );
  for (let i = 0; i < original.length; i++)
    for (const axis of [0, 1])
      assert.equal(
        next.contacts[i].positionUm[axis],
        original[i].positionUm[axis],
      );
});

test("replay phase jumps use retained samples with binary nearest-frame search, including boundaries", () => {
  const result = runExperiment(stimulated()),
    summary = resultSummary(result);
  assert.equal(nearestFrame(result.timeMs, -1), 0);
  assert.equal(nearestFrame(result.timeMs, 100), result.timeMs.length - 1);
  assert.equal(
    nearestFrame(result.timeMs, result.timeMs[summary.negativeFrame]),
    summary.negativeFrame,
  );
  assert.match(replayPhase(result, summary.negativeFrame), /Cathodic A/);
  assert.match(replayPhase(result, summary.positiveFrame), /Anodic A/);
  assert.match(replayPhase(result, result.timeMs.length - 1), /Zero net/);
});

test("comparison lists complete changed vectors and distinguishes model parameters", () => {
  const a = freshConfig(),
    b = freshConfig();
  b.implant.translationUm = [100, -50, 0];
  b.protocol.phaseUs = 1000;
  const changes = configurationChanges(a, b);
  assert.deepEqual(
    changes.map((v) => v.key),
    ["implant.translationUm", "protocol.phaseUs"],
  );
  assert.deepEqual(changes[0].after, [100, -50, 0]);
});

test("replay interval reports shortened passive final step and never invents a gap sample", () => {
  const c = stimulated();
  c.solver.dtMs = 0.03;
  const result = runExperiment(c),
    last = result.timeMs.length - 1;
  const interval = sampleInterval(result, last);
  assert.equal(interval[0], result.timeMs[last - 1]);
  assert.ok(Math.abs(interval[1] - interval[0] - 0.01) < 1e-9);
  const sparse = {
    ...result,
    config: structuredClone(result.config),
    timeMs: Float64Array.from([0, 5.2, 5.25]),
    drive: Float64Array.from([0, -1, 1]),
    membraneMv: result.membraneMv,
  };
  sparse.config.neuron.modelId = "test-active";
  sparse.config.solver.dtMs = 0.005;
  sparse.config.protocol.gapUs = 20;
  assert.equal(resultSummary(sparse).gapFrame, -1);
  assert.equal(resultSummary(result).somaSpikes, null);
});
