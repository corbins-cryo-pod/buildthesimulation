import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { freshConfig, freshActiveConfig, validateConfig } from '../src/lib/cortex/config.js';
import { makeWorld } from '../src/lib/cortex/world.js';
import { activeModelData } from '../src/lib/cortex/active-morphology.js';
import {
  initialSodium,
  stepSodium,
  sodiumMatrix,
  denseSolve,
  channelRates,
  advanceChannelGates,
} from '../src/lib/cortex/active-channels.js';
import { resultBuffers } from '../src/lib/cortex/buffers.js';
import { runExperiment } from '../src/lib/cortex/experiment.js';
const read = (p) => readFileSync(new URL(p, import.meta.url));
const hash = (v) => createHash('sha256').update(v).digest('hex');

test('native SWC geometry retains source provenance and original licensed mechanisms', () => {
  assert.equal(activeModelData.sourceCommit, '750e7840cc1a9eb32492c924e79609a85a893b8a');
  assert.deepEqual(
    activeModelData.fit,
    JSON.parse(read('../public/models/cortex/allen571654895/optim_param_571654895.json')),
  );
  assert.equal(activeModelData.generatorSha256, hash(read('../scripts/cortex-active-model.py')));
  for (const [file, expected] of Object.entries(activeModelData.sourceHashes)) {
    const base = file.endsWith('.mod')
      ? '../scripts/cortex-active-mechanisms/'
      : '../public/models/cortex/allen571654895/';
    assert.equal(hash(read(base + file)), expected);
  }
  assert.match(
    read('../public/models/cortex/allen571654895/LICENSE.txt').toString(),
    /commercial purposes are not permitted/,
  );
});
test('old passive configurations keep their exact versioned definition', () => {
  const old = freshConfig();
  assert.deepEqual(validateConfig(old), old);
  assert.equal(makeWorld(old).neuron.nodes.length, 48);
  const active = freshActiveConfig();
  assert.equal(validateConfig(active).membrane.temperatureC, 34);
  active.membrane.temperatureC = 37;
  assert.throws(() => validateConfig(active), /34/);
});
test('active mesh preserves membrane area, topology and a 60 µm axon across refinement', () => {
  let first;
  for (const length of [10, 20, 40, 80]) {
    const c = freshActiveConfig();
    c.neuron.segmentLengthUm = length;
    const w = makeWorld(c),
      nodes = w.neuron.nodes;
    for (const [i, n] of nodes.entries()) {
      assert.ok(n.parent < i);
      if (n.parent >= 0) assert.ok(n.edgeUs > 0);
      if (n.kind === 'junction') assert.equal(n.areaUm2, 0);
      else assert.ok(n.areaUm2 > 0);
    }
    const area = nodes.reduce((s, n) => s + n.areaUm2, 0);
    first ??= area;
    assert.ok(Math.abs(area - first) / first < 1e-6);
    assert.ok(
      Math.abs(nodes.filter((n) => n.kind === 'axon').reduce((s, n) => s + n.lengthUm, 0) - 60) <
        1e-8,
    );
    assert.ok(Math.abs(nodes.reduce((s, n) => s + (n.synapseWeight ?? 0), 0) - 1) < 1e-12);
  }
});
test('block sodium solve agrees with full independent linear algebra and preserves probability', () => {
  for (const v of [-100, -80, -40, -20, 0, 40]) {
    const state = initialSodium(-80),
      rhs = state.slice(),
      dt = 0.005;
    stepSodium(state, 0, v, dt, {
      d: new Float64Array(24),
      upper: new Float64Array(12),
      r: new Float64Array(12),
    });
    const dense = denseSolve(sodiumMatrix(v, dt), rhs);
    assert.ok(Math.max(...state.map((x, i) => Math.abs(x - dense[i]))) < 1e-12);
    assert.ok(Math.abs(state.reduce((a, b) => a + b) - 1) < 1e-12);
    assert.ok(state.every((v) => v >= 0 && v <= 1));
  }
});
test('fast gate updates implement the specified rates, including singular voltages', () => {
  for (const v of [-154.9, -80, -27, 0, 40]) {
    const state = new Float64Array(12).fill(0.3),
      rates = channelRates(v),
      density = Array.from({ length: 9 }, () => new Float64Array([1]));
    advanceChannelGates(state, 0, v, 0.005, 1e-4, density);
    for (let j = 0; j < 12; j++) {
      const [inf, tau] = rates[j];
      assert.ok(Math.abs(state[j] - (inf + (0.3 - inf) * Math.exp(-0.005 / tau))) < 1e-12);
    }
  }
});
test('nested channel arrays transfer and count each buffer only once', () => {
  const a = new Float64Array(5),
    b = new Float64Array(3);
  const object = { v: a, channels: { alias: a.subarray(1), b }, other: [b] };
  const buffers = resultBuffers(object);
  assert.equal(buffers.length, 2);
  assert.equal(
    buffers.reduce((s, b) => s + b.byteLength, 0),
    64,
  );
});
test('bath-return exclusion follows reconstructed polylines and taper', () => {
  const c = freshActiveConfig();
  c.neuron.segmentLengthUm = 80;
  c.protocol.bathReturnUm = [-169.4833057459228, -189.5174749886107, 1499.8209426565172];
  assert.throws(() => runExperiment(c), /bath return/);
});
