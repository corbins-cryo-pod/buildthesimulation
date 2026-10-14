// CPU-only measurements. No WebGL draw, browser layout, GPU memory, or FPS claim.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { getExampleConfig } from "../src/lib/cortex/examples.js";
import { makeWorld } from "../src/lib/cortex/world.js";
import { runExperiment } from "../src/lib/cortex/experiment.js";
import { resultSummary, appliedSlices } from "../src/lib/cortex/electrical.js";
import {
  buildWorldGroup,
  updateElectricalOverlay,
} from "../src/lib/cortex/scene.js";
import { disposeDeviceMesh } from "../src/lib/devices/geometry.js";

const config = getExampleConfig("extracellular-soma-spike");
const result = runExperiment(config); // Cold conditioning + simulation, timed by kernel itself.
const warmed = runExperiment(config);
const world = makeWorld(config);
const measured = (fn, count = 7) => {
  const samples = [];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    samplesMs: samples,
    medianMs: sorted[Math.floor(count / 2)],
    maximumMs: sorted.at(-1),
  };
};
const indexStart = performance.now();
resultSummary(result);
const summaryIndexMs = performance.now() - indexStart;
const prepareStart = performance.now();
const data = appliedSlices(world);
const sliceTransferPreparationMs = performance.now() - prepareStart;
const geometry = measured(() => {
  const objects = buildWorldGroup(world);
  disposeDeviceMesh(objects.root);
});
const objects = buildWorldGroup(world);
updateElectricalOverlay(objects.electrical, result, 0);
const replay = measured(() => {
  for (let frame = 0; frame < result.timeMs.length; frame++)
    updateElectricalOverlay(objects.electrical, result, frame, {
      component: "neural",
    });
});
disposeDeviceMesh(objects.root);
const paths = [
  "src/lib/cortex/scene.js",
  "src/lib/cortex/electrical.js",
  "src/lib/cortex/placement.js",
  "src/components/CortexLaboratory.jsx",
  "src/components/CortexElectricalPanel.jsx",
  "scripts/benchmark-cortex-workbench.mjs",
];
const report = {
  schemaVersion: "cortex-workbench-benchmark/1",
  generatedAt: new Date().toISOString(),
  runtime: { node: process.version, cpu: cpus()[0].model },
  config,
  scope:
    "Node CPU solver and scene-object updates measured separately, sequentially. Excludes actual rendering, DOM layout/labels, draw calls, GPU and browser peak memory.",
  solver: {
    coldMs: result.diagnostics.elapsedMs,
    warmMs: warmed.diagnostics.elapsedMs,
    numericOutputBytes: result.diagnostics.outputBytes,
  },
  summaryIndexMs,
  sliceTransferPreparationMs,
  sliceVertices: data.slices.reduce((sum, s) => sum + s.points.length, 0),
  sliceTriangles: data.slices.reduce((sum, s) => sum + s.indices.length / 3, 0),
  geometryBuildAndDispose: geometry,
  fullReplayOverlayCpu: replay,
  frames: result.timeMs.length,
  medianOverlayCpuMsPerFrame: replay.medianMs / result.timeMs.length,
  sourceHashes: Object.fromEntries(
    paths.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
};
writeFileSync(
  "docs/cortex/benchmarks/workbench-latest.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { ...report, config: undefined, sourceHashes: undefined },
    null,
    2,
  ),
);
