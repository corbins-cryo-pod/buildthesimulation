import test from "node:test";
import assert from "node:assert/strict";
import { runExperiment } from "../src/lib/cortex/experiment.js";
import { resultSummary } from "../src/lib/cortex/electrical.js";
import { freshConfig } from "../src/lib/cortex/config.js";
import { makeWorld } from "../src/lib/cortex/world.js";
import {
  buildWorldGroup,
  appliedTransferMvPerUa,
  updateElectricalOverlay,
} from "../src/lib/cortex/scene.js";
import { pointTransferUvPerNa } from "../src/lib/cortex/volume-conductor.js";
import { disposeDeviceMesh } from "../src/lib/devices/geometry.js";
test("3D applied field uses transformed contacts, conductivity and source exclusion", () => {
  const c = freshConfig();
  c.protocol.mode = "extracellular-stimulation";
  c.implant.translationUm[0] += 100;
  c.implant.rotationDeg[2] = 25;
  const w = makeWorld(c),
    p = c.neuron.somaUm;
  const sources = c.protocol.sourceContactIds.map((id) =>
    w.contacts.find((x) => x.id === id),
  );
  assert.equal(appliedTransferMvPerUa(w, sources[0].positionUm), null);
  assert.equal(
    appliedTransferMvPerUa(w, p),
    pointTransferUvPerNa(p, sources[0].positionUm, c.tissue.conductivitySPerM) -
      pointTransferUvPerNa(
        p,
        sources[1].positionUm,
        c.tissue.conductivitySPerM,
      ),
  );
});
test("overlay follows recorded drive, polarity, component, and clears stale results", () => {
  const c = freshConfig();
  c.protocol.mode = "extracellular-stimulation";
  const w = makeWorld(c),
    objects = buildWorldGroup(w),
    o = objects.electrical;
  const r = runExperiment(c),
    summary = resultSummary(r);
  updateElectricalOverlay(o, r, summary.negativeFrame, { component: "neural" });
  assert.equal(o.group.visible, true);
  const tips = o.tips.filter((t) => t.role === "stim");
  assert.ok(tips[0].mesh.material.color.b > tips[0].mesh.material.color.r);
  assert.ok(tips[1].mesh.material.color.r > tips[1].mesh.material.color.b);
  assert.equal(o.slices.length, 3);
  updateElectricalOverlay(o, r, summary.positiveFrame, {
    component: "applied",
  });
  assert.ok(tips[0].mesh.material.color.r > tips[0].mesh.material.color.b);
  updateElectricalOverlay(o, r, 0);
  assert.ok(o.slices.every((s) => s.mesh.visible));
  assert.ok(
    o.slices.every((s) => s.mesh.geometry.attributes.color.getX(0) > 0),
  );
  updateElectricalOverlay(o, null, 0);
  assert.equal(o.group.visible, false);
  updateElectricalOverlay(o, r, summary.negativeFrame, { electrical: false });
  assert.equal(o.group.visible, false);
  disposeDeviceMesh(objects.root);
});
