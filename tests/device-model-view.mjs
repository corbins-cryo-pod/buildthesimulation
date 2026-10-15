import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, PerspectiveCamera } from 'three';
import { deviceModels, getContactGeometry } from '../src/lib/devices/catalog.js';
import { MODEL_FOV, boundsCorners, fitModelView, modelView, modelScaleBar } from '../src/lib/devices/model-view.js';

test('camera fitting preserves complete projected bounds in portrait, landscape and end-on views', () => {
  for (const bounds of [
    { min: [-2, -2, -0.2], max: [2, 2, 1.5] },
    { min: [-0.65, -0.65, 0], max: [0.65, 0.65, 60] },
    { min: [-0.32, -0.32, -0.004], max: [0.32, 0.32, 0] },
  ]) for (const aspect of [0.6, 1, 2]) for (const direction of [[0.8, -1, 1], [0, 0, 1], [0, -1, 0]]) {
    const preset = fitModelView(bounds, direction, [0, 0, 1], aspect);
    const camera = new PerspectiveCamera(MODEL_FOV, aspect, 0.000001, 1000);
    camera.up.fromArray(preset.up);
    camera.position.fromArray(preset.target).addScaledVector(new Vector3(...preset.direction), preset.distance);
    camera.lookAt(new Vector3(...preset.target)); camera.updateMatrixWorld();
    for (const point of boundsCorners(bounds)) {
      const projected = new Vector3(...point).project(camera);
      assert(Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1, 'entire frame is visible');
      assert(projected.z > -1 && projected.z < 1, 'frame lies in front of camera');
    }
  }
});

test('Neuropixels tip and front presets inspect distal electrodes instead of the base', () => {
  const models = Object.values(deviceModels).filter(model => ['neuropixels', 'planar-probe'].includes(model.kind));
  for (const model of models) {
    const sites = getContactGeometry(model), xs = sites.map(site => site.positionMm[0]);
    const bounds = { min: [Math.min(...xs) - model.width, -model.thickness / 2, 0], max: [Math.max(...xs) + model.width, model.thickness / 2, model.length] };
    for (const view of ['default', 'front', 'tip']) {
      const preset = modelView(model, bounds, sites, view, 1.5);
      assert(preset.detail);
      assert(preset.target[2] > model.length * 0.8);
      assert.equal(preset.bounds.max[2], model.length);
      assert(preset.bounds.min[2] < Math.max(...sites.map(site => site.positionMm[2])));
      assert.equal(preset.bounds.min[0], bounds.min[0], 'all shanks retained in tip view');
      assert.equal(preset.bounds.max[0], bounds.max[0]);
    }
    assert(!modelView(model, bounds, sites, 'oblique').detail);
  }
});

test('thin surface strips start at a central contact window and keep a useful low-angle view', () => {
  const model = deviceModels['BTSD-ACAD-0068'], sites = getContactGeometry(model);
  const bounds = { min: [-model.width / 2, -model.length / 2, -model.thickness], max: [model.width / 2, model.length / 2, 0] };
  const preset = modelView(model, bounds, sites);
  assert(preset.detail);
  assert(Math.abs(preset.target[0]) < model.width / 2);
  assert(Math.abs(preset.target[1]) < model.length * 0.05, 'contact crop is near middle rather than row edge');
  assert(preset.bounds.max[1] - preset.bounds.min[1] < model.length / 10);
  assert(modelView(model, bounds, sites, 'side').direction[2] > 0.1, 'film side view is not exactly edge-on');
  assert.deepEqual(modelView(model, bounds, sites, 'oblique').bounds, bounds);
});

test('scale bar represents distance at focus, including submillimeter models', () => {
  for (const distance of [0.01, 0.1, 1, 10, 100]) {
    const bar = modelScaleBar(distance, 500);
    const reconstructed = bar.pixels * 2 * distance * Math.tan(MODEL_FOV * Math.PI / 360) / 500;
    assert(Math.abs(reconstructed - bar.mm) < 1e-12);
    assert(bar.pixels <= 112 && bar.pixels >= 40);
    assert.match(bar.label, /µm|mm/);
  }
});
