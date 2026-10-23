import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  STAGES,
  SCENARIOS,
  normalizeConfig,
  createExperiment,
} from '../src/lib/microfabrication/model.js';

// Independent checks of the realized material, not expectations derived from
// warning labels or a second invocation of the model's connectivity routine.
const close = (actual, expected, message, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual), `${message}: finite value`);
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${message}: ${actual} versus ${expected}`);
};

const occupied = mask => mask.reduce((sum, value) => sum + Number(Boolean(value)), 0);

function independentComponents({ metal, nx, ny }) {
  const labels = new Int32Array(metal.length);
  let count = 0;
  for (let seed = 0; seed < metal.length; seed += 1) {
    if (!metal[seed] || labels[seed]) continue;
    count += 1;
    const stack = [seed];
    labels[seed] = count;
    while (stack.length) {
      const cell = stack.pop();
      const x = cell % nx;
      const y = Math.floor(cell / nx);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || xx >= nx || yy < 0 || yy >= ny) continue;
        const neighbor = yy * nx + xx;
        if (!metal[neighbor] || labels[neighbor]) continue;
        labels[neighbor] = count;
        stack.push(neighbor);
      }
    }
  }
  return { labels, count };
}

function endpointLabels(state, graph) {
  const { nx, cellUm } = state.geometry;
  return state.channels.map(channel => ({
    site: graph.labels[Math.floor(channel.siteYUm / cellUm) * nx + Math.floor(channel.xUm / cellUm)],
    pad: graph.labels[Math.floor(channel.padYUm / cellUm) * nx + Math.floor(channel.xUm / cellUm)],
  }));
}

function auditGraph(state) {
  const graph = independentComponents(state.geometry);
  assert.equal(state.measurements.componentCount, graph.count, 'reported components match retained metal');
  const ends = endpointLabels(state, graph);
  for (const [index, channel] of state.channels.entries()) {
    const end = ends[index];
    const connected = end.site > 0 && end.site === end.pad;
    assert.equal(channel.connected, connected, `channel ${channel.id}: actual endpoint path`);
    for (const otherId of channel.shortedWith) {
      assert.ok(state.channels[otherId - 1].shortedWith.includes(channel.id), 'short relation is symmetric');
    }
  }
  assert.equal(state.measurements.connectedCount, state.channels.filter(c => c.connected).length);
  assert.equal(state.measurements.isolatedConnectedCount,
    state.channels.filter(c => c.connected && c.shortedWith.length === 0).length);
  assert.equal(state.measurements.shortCount, state.channels.filter(c => c.shortedWith.length > 0).length);
  return { ...graph, ends };
}

function siteAreas(state, channel) {
  const { nx, ny, cellUm, exposed } = state.geometry;
  let nominal = 0;
  let visible = 0;
  let aperture = 0;
  let visibleAperture = 0;
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const distanceSquared = ((x + 0.5) * cellUm - channel.xUm) ** 2
        + ((y + 0.5) * cellUm - channel.siteYUm) ** 2;
      const isExposed = exposed[y * nx + x] !== 0;
      if (distanceSquared <= (state.config.siteDiameterUm / 2) ** 2) {
        nominal += cellUm ** 2;
        if (isExposed) visible += cellUm ** 2;
      }
      if (distanceSquared <= (state.config.openingDiameterUm / 2) ** 2) {
        aperture += cellUm ** 2;
        if (isExposed) visibleAperture += cellUm ** 2;
      }
    }
  }
  return { nominal, visible, aperture, visibleAperture };
}

function finiteScalars(value, path = 'result') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} is finite`);
  else if (ArrayBuffer.isView(value)) {
    assert.ok(value instanceof Uint8Array || value instanceof Int32Array, `${path}: expected finite integer mask`);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) finiteScalars(child, `${path}.${key}`);
  }
}

function assertSameMasks(a, b) {
  for (const key of ['body', 'designMetal', 'metal', 'openings', 'exposed', 'maskOpenings', 'intendedOpenings']) {
    assert.deepEqual(a.geometry[key], b.geometry[key], `same ${key} material mask`);
  }
}

test('microfabrication: baseline has four physically connected isolated channels', () => {
  const state = createExperiment();
  assert.equal(state.stage, 9);
  assert.equal(state.process.effectiveStage, 9);
  assert.equal(state.process.blocked, false);
  assert.equal(state.channels.length, 4);
  const graph = auditGraph(state);
  assert.equal(graph.count, 4);
  assert.equal(new Set(graph.ends.map(end => end.pad)).size, 4);
  assert.equal(state.measurements.connectedCount, 4);
  assert.equal(state.measurements.isolatedConnectedCount, 4);
  assert.equal(state.measurements.openCount, 0);
  assert.equal(state.measurements.shortCount, 0);
  for (const channel of state.channels) {
    assert.deepEqual(channel.shortedWith, []);
    assert.equal(channel.status, 'connected');
    assert.ok(channel.resistanceOhm > 0);
    const areas = siteAreas(state, channel);
    assert.equal(channel.nominalAreaUm2, areas.nominal);
    assert.equal(channel.exposedAreaUm2, areas.visible);
    assert.ok(areas.visible > 0 && areas.visible < areas.nominal);
    close(channel.exposureFraction, areas.visible / areas.nominal, 'site exposure fraction');
    close(channel.apertureCoverageFraction, areas.visibleAperture / areas.aperture, 'aperture coverage');
    assert.equal(channel.apertureCoverageFraction, 1);
  }
  close(state.measurements.totalThicknessUm,
    state.config.baseThicknessUm + state.config.metalThicknessNm / 1000 + state.config.topThicknessUm,
    'released stack thickness');
  assert.ok(!state.layers.some(layer => layer.id === 'carrier'));
});

test('microfabrication: grid masks have consistent dimensions and exposed metal is real metal', () => {
  const state = createExperiment();
  const { nx, ny, cellUm, widthUm, heightUm, body, metal, exposed, openings } = state.geometry;
  assert.equal(nx * cellUm, widthUm);
  assert.equal(ny * cellUm, heightUm);
  assert.equal(nx, 160);
  assert.equal(ny, 500);
  for (const mask of Object.values(state.geometry).filter(value => ArrayBuffer.isView(value))) {
    assert.ok(mask instanceof Uint8Array);
    assert.equal(mask.length, nx * ny);
    assert.ok(mask.every(value => value === 0 || value === 1));
  }
  for (let i = 0; i < metal.length; i += 1) {
    if (exposed[i]) assert.ok(metal[i] && openings[i] && body[i], 'exposed cell has metal and cleared insulation');
    if (metal[i]) assert.ok(body[i], 'outlined metal remains within the device');
  }
  for (const layer of state.layers) {
    assert.equal(layer.mask.length, nx * ny);
    assert.ok(layer.thicknessUm > 0);
    assert.ok(Number.isFinite(layer.zUm));
    assert.ok(layer.mask.some(Boolean));
  }
  close(state.measurements.allExposedMetalAreaUm2, occupied(exposed) * cellUm ** 2, 'total exposed area');
  close(state.measurements.exposedAreaUm2,
    state.channels.reduce((sum, channel) => sum + siteAreas(state, channel).visible, 0), 'useful site area');
  assert.ok(state.measurements.allExposedMetalAreaUm2 > state.measurements.exposedAreaUm2, 'pads are excluded from site area');
});

test('microfabrication: open defect severs the actual first conductor without merging others', () => {
  const baseline = createExperiment();
  const state = createExperiment({ defect: 'open' });
  const graph = auditGraph(state);
  assert.equal(graph.count, 5);
  assert.notEqual(graph.ends[0].site, graph.ends[0].pad);
  assert.equal(state.channels[0].connected, false);
  assert.equal(state.channels[0].resistanceOhm, null);
  assert.equal(state.channels[0].status, 'open');
  assert.equal(state.measurements.openCount, 1);
  assert.equal(state.measurements.connectedCount, 3);
  assert.equal(state.measurements.shortCount, 0);
  assert.ok(occupied(state.geometry.metal) < occupied(baseline.geometry.metal));
  assert.ok(state.geometry.metal.every((value, index) => !value || baseline.geometry.metal[index]));
  for (const channel of state.channels.slice(1)) assert.equal(channel.connected, true);
});

test('microfabrication: bridge defect joins actual channels and reports symmetric shorts', () => {
  const baseline = createExperiment();
  const state = createExperiment({ defect: 'bridge' });
  const graph = auditGraph(state);
  assert.equal(graph.count, 3);
  assert.equal(graph.ends[1].pad, graph.ends[2].pad);
  assert.notEqual(graph.ends[0].pad, graph.ends[1].pad);
  assert.notEqual(graph.ends[3].pad, graph.ends[1].pad);
  assert.equal(state.measurements.connectedCount, 4);
  assert.equal(state.measurements.isolatedConnectedCount, 2);
  assert.equal(state.measurements.shortCount, 2);
  assert.deepEqual(state.channels.map(channel => channel.shortedWith), [[], [3], [2], []]);
  assert.equal(state.channels[1].resistanceOhm, null);
  assert.equal(state.channels[2].resistanceOhm, null);
  assert.ok(occupied(state.geometry.metal) > occupied(baseline.geometry.metal));
  assert.ok(baseline.geometry.metal.every((value, index) => !value || state.geometry.metal[index]));
});

test('microfabrication: unetched insulation blocks exposure while preserving metal continuity', () => {
  const state = createExperiment({}, 6);
  auditGraph(state);
  assert.equal(state.measurements.connectedCount, 4);
  assert.equal(state.measurements.exposedAreaUm2, 0);
  assert.equal(occupied(state.geometry.exposed), 0);
  assert.equal(occupied(state.geometry.openings), 0);
  assert.equal(state.measurements.capRemainingUm, state.config.topThicknessUm);
  assert.ok(state.layers.some(layer => layer.id === 'encapsulation'));
  assert.ok(state.channels.every(channel => channel.connected && channel.status === 'covered'));
});

test('microfabrication: partial etch does not expose a still-insulated contact', () => {
  const state = createExperiment({ etchTimeMin: 6 });
  const baseline = createExperiment();
  assert.equal(state.measurements.capRemainingUm, 4);
  assert.equal(state.measurements.exposedAreaUm2, 0);
  assert.equal(occupied(state.geometry.exposed), 0);
  assert.equal(state.measurements.connectedCount, 4);
  assert.deepEqual(state.geometry.metal, baseline.geometry.metal);
  assert.ok(state.channels.every(channel => channel.status === 'covered'));
  assert.ok(state.warnings.some(warning => warning.id === 'underetch'));
});

test('microfabrication: mask overlay changes useful exposed area without moving conductors', () => {
  const aligned = createExperiment();
  const shifted = createExperiment({ overlayXUm: 28, overlayYUm: 10 });
  assert.deepEqual(shifted.geometry.metal, aligned.geometry.metal);
  assert.deepEqual(shifted.geometry.body, aligned.geometry.body);
  assert.ok(shifted.measurements.exposedAreaUm2 < aligned.measurements.exposedAreaUm2);
  assert.equal(shifted.measurements.connectedCount, 4);
  assert.equal(shifted.measurements.shortCount, 0);
  for (const channel of shifted.channels) {
    const area = siteAreas(shifted, channel);
    assert.equal(channel.exposedAreaUm2, area.visible);
    assert.ok(channel.apertureCoverageFraction < 1);
    close(channel.apertureCoverageFraction, area.visibleAperture / area.aperture, 'registered aperture overlap');
    assert.equal(channel.resistanceOhm, aligned.channels[channel.id - 1].resistanceOhm);
  }
});

test('microfabrication: selectivity conserves the declared mask-removal budget', () => {
  for (const etchSelectivity of [1, 2, 3, 6]) {
    const state = createExperiment({ etchSelectivity }, 7);
    const { maskThicknessUm, etchRateUmMin, etchTimeMin } = state.config;
    const consumed = etchRateUmMin * etchTimeMin / etchSelectivity;
    close(state.measurements.maskRemainingUm, Math.max(0, maskThicknessUm - consumed), 'mask budget');
    close(state.process.maskLifetimeMin, maskThicknessUm * etchSelectivity / etchRateUmMin, 'mask lifetime');
    close(state.process.protectedEtchDepthUm,
      Math.max(0, etchTimeMin - state.process.maskLifetimeMin) * etchRateUmMin, 'post-breakthrough etch');
    const maskLayer = state.layers.find(layer => layer.id === 'etch-mask');
    if (state.measurements.maskRemainingUm > 0) {
      assert.ok(maskLayer);
      close(maskLayer.thicknessUm, state.measurements.maskRemainingUm, 'visible remaining mask');
    } else assert.equal(maskLayer, undefined);
  }
});

test('microfabrication: equal etch dose gives equal geometry in the constant-rate model', () => {
  const slow = createExperiment({ etchTimeMin: 12, etchRateUmMin: 1 });
  const fast = createExperiment({ etchTimeMin: 6, etchRateUmMin: 2 });
  assertSameMasks(slow, fast);
  assert.deepEqual(slow.layers, fast.layers);
  assert.deepEqual(slow.channels, fast.channels);
  assert.deepEqual(slow.measurements, fast.measurements);
});

test('microfabrication: a pinhole exposes extra conductor without repairing or shorting traces', () => {
  const baseline = createExperiment();
  const pinhole = createExperiment({ defect: 'pinhole' });
  assert.deepEqual(pinhole.geometry.metal, baseline.geometry.metal);
  assert.equal(pinhole.measurements.connectedCount, 4);
  assert.equal(pinhole.measurements.shortCount, 0);
  assert.ok(pinhole.measurements.allExposedMetalAreaUm2 > baseline.measurements.allExposedMetalAreaUm2);
  assert.ok(pinhole.measurements.unintendedExposedAreaUm2 > baseline.measurements.unintendedExposedAreaUm2);
  assert.deepEqual(pinhole.channels, baseline.channels);
  assert.ok(occupied(pinhole.geometry.exposed) > occupied(baseline.geometry.exposed));
  assert.equal(createExperiment({ defect: 'pinhole', etchTimeMin: 6 }).measurements.allExposedMetalAreaUm2, 0);
  auditGraph(pinhole);
});

test('microfabrication: doubling metal thickness halves isolated trace resistance', () => {
  const thin = createExperiment();
  const thick = createExperiment({ metalThicknessNm: 2 * DEFAULT_CONFIG.metalThicknessNm });
  assert.deepEqual(thin.geometry.metal, thick.geometry.metal);
  assert.equal(thick.process.blocked, false);
  for (let index = 0; index < 4; index += 1) {
    close(thick.channels[index].resistanceOhm, thin.channels[index].resistanceOhm / 2, 'inverse thickness scaling');
  }
});

test('microfabrication: doubling effective resistivity doubles resistance without changing geometry', () => {
  const baseline = createExperiment();
  const higher = createExperiment({ effectiveResistivityOhmM: 2 * DEFAULT_CONFIG.effectiveResistivityOhmM });
  assertSameMasks(baseline, higher);
  assert.deepEqual(baseline.layers, higher.layers);
  for (let index = 0; index < 4; index += 1) {
    close(higher.channels[index].resistanceOhm, 2 * baseline.channels[index].resistanceOhm, 'linear resistivity scaling');
  }
});

test('microfabrication: perimeter clipping changes each channel resistance according to its own width', () => {
  const state = createExperiment({ pitchUm: 80, traceWidthUm: 48 });
  auditGraph(state);
  assert.deepEqual(state.channels.map(channel => channel.actualTraceWidthUm), [40, 48, 48, 40]);
  assert.equal(state.measurements.actualTraceWidthUm, 40);
  for (const channel of state.channels) {
    const clippedWidth = Math.min(channel.xUm + 24, 296) - Math.max(channel.xUm - 24, 24);
    const lengthM = (channel.padYUm - channel.siteYUm) * 1e-6;
    const areaM2 = clippedWidth * 1e-6 * state.config.metalThicknessNm * 1e-9;
    close(channel.resistanceOhm, state.config.effectiveResistivityOhmM * lengthM / areaM2, 'own clipped-width resistance');
  }
  assert.ok(state.channels[0].resistanceOhm > state.channels[1].resistanceOhm);
});

test('microfabrication: fully removed base regions remain visible in the minimum-thickness diagnostic', () => {
  const state = createExperiment({ etchTimeMin: 60 });
  const baseLayers = state.layers.filter(layer => layer.id === 'base' || layer.id.startsWith('base-recess-'));
  let minimum = Infinity;
  let maximum = 0;
  for (let index = 0; index < state.geometry.body.length; index += 1) {
    if (!state.geometry.body[index]) continue;
    const thickness = baseLayers.reduce((sum, layer) => sum + (layer.mask[index] ? layer.thicknessUm : 0), 0);
    minimum = Math.min(minimum, thickness);
    maximum = Math.max(maximum, thickness);
  }
  assert.equal(minimum, 0, 'some base regions are entirely absent');
  assert.ok(maximum > 0, 'metal-protected base is still present');
  assert.equal(state.measurements.minimumBaseThicknessUm, minimum);
});

test('microfabrication: film stages do not report conductor continuity before deposition', () => {
  assert.equal(STAGES.length, 10);
  for (let stage = 0; stage < 4; stage += 1) {
    const state = createExperiment({}, stage);
    assert.equal(state.stage, stage);
    assert.equal(state.process.effectiveStage, stage);
    assert.equal(occupied(state.geometry.metal), 0);
    assert.equal(occupied(state.geometry.exposed), 0);
    assert.equal(state.measurements.connectedCount, 0);
    assert.equal(state.measurements.openCount, 0);
    assert.equal(state.measurements.shortCount, 0);
    assert.ok(state.channels.every(channel => !channel.connected && channel.resistanceOhm === null && channel.status === 'not-fabricated'));
    assert.ok(!state.layers.some(layer => layer.material === 'gold'));
  }
  assert.equal(createExperiment({}, 4).measurements.connectedCount, 4);
});

test('microfabrication: a failed lift-off does not fabricate downstream layers or a released device', () => {
  const config = SCENARIOS.find(scenario => scenario.id === 'liftoff').config;
  const stopped = createExperiment(config, 5);
  for (let requested = 6; requested <= 9; requested += 1) {
    const state = createExperiment(config, requested);
    assert.equal(state.stage, requested);
    assert.equal(state.process.effectiveStage, 5);
    assert.equal(state.process.blocked, true);
    assert.ok(state.process.liftOffMarginUm <= 0);
    assertSameMasks(state, stopped);
    assert.deepEqual(state.layers, stopped.layers);
    assert.ok(state.layers.some(layer => layer.id === 'carrier'));
    assert.ok(state.layers.some(layer => layer.material === 'resist'));
    assert.ok(!state.layers.some(layer => layer.id.startsWith('encapsulation') || layer.id.startsWith('cap-fill') || layer.id === 'etch-mask'));
    assert.ok(state.warnings.some(warning => warning.id === 'lift-off-blocked'));
    assert.ok(state.channels.every(channel => channel.resistanceOhm === null));
  }
});

test('microfabrication: replay is deterministic and input objects are not mutated', () => {
  const input = Object.freeze({ overlayXUm: 16, etchTimeMin: 14, traceWidthUm: 16, ignored: 'leave intact' });
  const before = JSON.stringify(input);
  const first = createExperiment(input, 9);
  const reference = createExperiment(input, 9);
  const replay = createExperiment(JSON.parse(JSON.stringify(first.config)), first.stage);
  assert.deepEqual(first, reference);
  assert.deepEqual(first, replay);
  assert.equal(JSON.stringify(input), before);
  assert.notEqual(first.geometry.metal, reference.geometry.metal);
  first.geometry.metal.fill(0);
  first.layers[0].mask.fill(0);
  first.channels[0].shortedWith.push(99);
  assert.deepEqual(createExperiment(input, 9), reference, 'mutating one result cannot change a later replay');
});

test('microfabrication: nonfinite and out-of-range inputs cannot propagate NaN into process state', () => {
  const numericKeys = Object.keys(DEFAULT_CONFIG).filter(key => typeof DEFAULT_CONFIG[key] === 'number');
  for (const invalid of [NaN, Infinity, -Infinity, '12', null]) {
    const input = Object.fromEntries(numericKeys.map(key => [key, invalid]));
    input.defect = 'not-a-defect';
    input.unknown = 42;
    assert.deepEqual(normalizeConfig(input), DEFAULT_CONFIG);
  }
  for (const input of [null, 'invalid', 42, { traceWidthUm: -1e300, pitchUm: 1e300, etchTimeMin: 1e300 }, { metalThicknessNm: -1e300, topThicknessUm: -1e300, overlayXUm: 1e300 }]) {
    const config = normalizeConfig(input);
    assert.deepEqual(Object.keys(config).sort(), Object.keys(DEFAULT_CONFIG).sort());
    assert.ok(config.traceWidthUm >= 2 && config.traceWidthUm <= 48);
    assert.ok(config.pitchUm >= 40 && config.pitchUm <= 80);
    assert.ok(config.metalThicknessNm > 0 && config.metalThicknessNm <= 2000);
    assert.ok(config.topThicknessUm > 0);
    assert.ok(config.etchTimeMin >= 0 && config.etchTimeMin <= 120);
    finiteScalars(createExperiment(input, 9));
  }
  assert.equal(createExperiment({}, NaN).stage, 9);
  assert.equal(createExperiment({}, Infinity).stage, 9);
  assert.equal(createExperiment({}, -100).stage, 0);
  assert.equal(createExperiment({}, 100).stage, 9);
  assert.equal(createExperiment({}, 4.9).stage, 4);
});

test('microfabrication: every preset produces a reproducible inspectable state', () => {
  assert.equal(SCENARIOS.length, 7);
  assert.equal(new Set(SCENARIOS.map(scenario => scenario.id)).size, SCENARIOS.length);
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.name && scenario.description);
    const first = createExperiment(scenario.config, 9);
    const second = createExperiment(scenario.config, 9);
    assert.deepEqual(first, second, `${scenario.id}: deterministic state`);
    assert.ok(first.process.effectiveStage <= first.stage);
    finiteScalars(first);
    auditGraph(first);
    for (const warning of first.warnings) {
      assert.ok(warning.id && warning.title && warning.detail && warning.severity);
    }
    for (const channel of first.channels) {
      assert.ok(channel.exposureFraction >= 0 && channel.exposureFraction <= 1);
      assert.ok(channel.apertureCoverageFraction >= 0 && channel.apertureCoverageFraction <= 1);
      assert.ok(channel.resistanceOhm === null || channel.resistanceOhm > 0);
    }
  }
});
