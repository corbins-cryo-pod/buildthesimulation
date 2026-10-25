/** CI-only integration test. Local visual QA uses the managed Sites browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const required = process.env.PRIMA_REQUIRE_BROWSER === '1';
const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(existsSync);
if (required && (!chrome || !existsSync('node_modules/astro/astro.js'))) throw new Error('Required PRIMA browser test needs installed Astro and Chrome.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function until(fn, timeout = 45000, label = 'browser condition') {
  const start = Date.now(); let last;
  while (Date.now() - start < timeout) {
    try { const answer = await fn(); if (answer) return answer; } catch (error) { last = error; }
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
}

test('PRIMA browser: real workers, WebGL, seven presets, native editing, files and responsive controls', {
  skip: required ? false : 'Explicit PRIMA_REQUIRE_BROWSER=1 gate; managed browser covers local visual QA',
  timeout: 720000,
}, async () => {
  const httpPort = await freePort(), debugPort = await freePort(), profile = mkdtempSync(join(tmpdir(), 'prima-browser-'));
  const artifacts = process.env.PRIMA_QA_DIR || profile;
  mkdirSync(artifacts, { recursive: true });
  const astro = spawn(process.execPath, ['node_modules/astro/astro.js', 'dev', '--host', '127.0.0.1', '--port', String(httpPort)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  astro.stdout.on('data', value => { serverLog += value; });
  astro.stderr.on('data', value => { serverLog += value; });
  const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const errors = []; let socket, captureFailure, evaluateFailure;
  try {
    const origin = `http://127.0.0.1:${httpPort}`, url = `${origin}/simulations/retinal-implant/prima/`;
    await until(async () => (await fetch(url)).ok, 45000, 'the PRIMA development route');
    const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(item => item.type === 'page'), 45000, 'Chrome CDP');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let counter = 0; const pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const task = pending.get(message.id);
        if (task) { pending.delete(message.id); message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result); }
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++counter; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    evaluateFailure = evaluate;
    const click = selector => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error('Missing control: ' + ${JSON.stringify(selector)}); if (element.disabled) throw new Error('Disabled control: ' + ${JSON.stringify(selector)}); element.click(); return true; })()`);
    const setControl = (name, value, event = 'change') => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(`[data-prima-setting="${name}"]`)}); if (!element) throw new Error('Missing setting: ' + ${JSON.stringify(name)}); element.value = ${JSON.stringify(String(value))}; element.dispatchEvent(new Event(${JSON.stringify(event)}, {bubbles:true})); return true; })()`);
    const completedRuns = () => evaluate('window.__primaWorkerAudit.completed');
    const ready = (after = 0) => until(() => evaluate(`document.querySelector('[data-prima-lab]')?.dataset.primaState === 'complete' && window.__primaWorkerAudit.completed > ${after}`), 120000, 'a fresh real-worker calculation');
    const runAction = async action => { const before = await completedRuns(); await action(); await ready(before); };
    const paint = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
    const capture = async name => {
      const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(join(artifacts, name), Buffer.from(screenshot.data, 'base64'));
      return screenshot.data.length;
    };
    captureFailure = capture;
    const canvasChecksums = markers => evaluate(`(() => {
      const output = {};
      for (const marker of ${JSON.stringify(markers)}) {
        const canvas = document.querySelector('[data-prima-canvas="' + marker + '"]');
        if (!canvas || !canvas.width || !canvas.height) throw new Error('Missing canvas: ' + marker);
        const values = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261;
        for (let i = 0; i < values.length; i += 4) { hash ^= values[i]; hash = Math.imul(hash, 16777619); hash ^= values[i + 1]; hash = Math.imul(hash, 16777619); hash ^= values[i + 2]; hash = Math.imul(hash, 16777619); }
        output[marker] = { width: canvas.width, height: canvas.height, checksum: hash >>> 0 };
      }
      return output;
    })()`);
    const exportJSON = () => evaluate(`(async () => {
      const originalURL = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click;
      let blob, filename;
      URL.createObjectURL = value => { blob = value; return originalURL.call(URL, value); };
      HTMLAnchorElement.prototype.click = function() { filename = this.download; };
      try { document.querySelector('[data-prima="export-json"]').click(); }
      finally { URL.createObjectURL = originalURL; HTMLAnchorElement.prototype.click = originalClick; }
      if (!blob) throw new Error('Experiment export did not produce a Blob');
      const text = await blob.text(), data = JSON.parse(text), result = data.results;
      window.__primaSavedExperiment = text;
      const inspect = values => {
        let min = Infinity, max = -Infinity, sum = 0, finite = true, hash = 2166136261;
        for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); sum += value; finite &&= Number.isFinite(value); }
        for (const byte of new Uint8Array(Float64Array.from(values).buffer)) { hash ^= byte; hash = Math.imul(hash, 16777619); }
        return { length: values.length, min, max, sum, finite, absoluteMaximum: Math.max(Math.abs(min), Math.abs(max)), checksum: hash >>> 0 };
      };
      const waveform = result.physics.waveform, field = result.physics.field;
      const arrays = [result.input.values, result.percept.values, field.potentialMv, field.bcDeltaMv, field.ezVm, ...Object.values(waveform).filter(Array.isArray)];
      let maximumArrayImbalance = 0;
      for (let i = 0; i < waveform.timeMs.length; i++) maximumArrayImbalance = Math.max(maximumArrayImbalance, Math.abs(waveform.arrayCurrentUa[i] + waveform.returnCurrentUa[i]));
      return {
        schema: data.schema, version: data.modelVersion, experimentId: data.experimentId,
        settings: { ...data.settings, customImage: data.settings.customImage ? { width: data.settings.customImage.width, height: data.settings.customImage.height, values: inspect(data.settings.customImage.values) } : null },
        geometryCount: result.geometry.pixels.length, pixelMetricCount: result.physics.pixelMetrics.length,
        input: inspect(result.input.values), percept: inspect(result.percept.values),
        field: inspect(field.potentialMv), bipolar: inspect(field.bcDeltaMv),
        waveformCurrent: inspect(waveform.currentUa), waveformLength: waveform.timeMs.length,
        maximumArrayImbalance, allFinite: arrays.every(values => values.length > 0 && values.every(Number.isFinite)),
        selectedPixel: result.physics.pixelMetrics.find(pixel => pixel.id === data.settings.selectedPixelId),
        metric: result.metrics, provenance: result.provenance, warnings: result.warnings,
        filename, bytes: text.length,
      };
    })()`);
    const exportCSV = marker => evaluate(`(async () => {
      const originalURL = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click;
      let blob, filename;
      URL.createObjectURL = value => { blob = value; return originalURL.call(URL, value); };
      HTMLAnchorElement.prototype.click = function() { filename = this.download; };
      try { document.querySelector(${JSON.stringify(`[data-prima="${marker}"]`)}).click(); }
      finally { URL.createObjectURL = originalURL; HTMLAnchorElement.prototype.click = originalClick; }
      if (!blob) throw new Error('CSV export did not produce a Blob');
      return { text: await blob.text(), filename, type: blob.type };
    })()`);

    await command('Runtime.enable');
    await command('Page.enable');
    // Observe the real Worker without replacing its numerical implementation or messages.
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      const NativeWorker = window.Worker;
      const audit = window.__primaWorkerAudit = { created: [], posted: 0, completed: 0, progress: 0, terminated: 0, errors: [] };
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          super(url, options);
          this.__primaRecord = { url: String(url), runs: [], completed: 0, terminated: false };
          audit.created.push(this.__primaRecord);
          this.addEventListener('message', ({ data }) => {
            if (data?.type === 'result') { audit.completed++; this.__primaRecord.completed++; }
            if (data?.type === 'progress') audit.progress++;
            if (data?.type === 'error') audit.errors.push(data.message);
          });
          this.addEventListener('error', event => audit.errors.push(event.message));
        }
        postMessage(message, transfer) {
          if (message?.type === 'run') { audit.posted++; this.__primaRecord.runs.push({ id: message.id, stimulus: message.config?.stimulus, selectedPixelId: message.config?.selectedPixelId }); }
          return super.postMessage(message, transfer);
        }
        terminate() { if (!this.__primaRecord.terminated) { audit.terminated++; this.__primaRecord.terminated = true; } return super.terminate(); }
      };
    })();` });
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url });
    await ready();
    const base = await exportJSON();
    assert.equal(base.schema, 'bts.prima.experiment.v1');
    assert.equal(base.version, 'prima-1.0.0');
    assert.equal(base.geometryCount, 378); assert.equal(base.pixelMetricCount, 378);
    assert.equal(base.field.length, 61 * 61); assert.equal(base.percept.length, 256 * 256);
    assert.equal(base.allFinite, true);
    assert.match(base.provenance.percept.commit, /^[a-f0-9]{40}$/);
    assert.match(base.provenance.interpretation, /independent/);
    assert.match(base.filename, /-experiment\.json$/);
    assert.equal(await evaluate('window.__primaWorkerAudit.created.length'), 1);
    assert.match(await evaluate('window.__primaWorkerAudit.created[0].url'), /prima\/worker/);
    assert(await evaluate('window.__primaWorkerAudit.progress') > 0);

    // A graphics-enabled CI runner must render structure, not just allocate a canvas.
    await until(() => evaluate(`!!document.querySelector('[data-prima-webgl]')`), 45000, 'the WebGL canvas');
    assert.equal(await evaluate(`document.querySelector('[data-prima-view="3d"]').disabled`), false);
    await evaluate(`document.querySelector('.pr-anatomy-viewport').scrollIntoView({block:'center'}); true`);
    await paint(); await pause(200);
    const rectangle = await evaluate(`(() => { const r = document.querySelector('.pr-anatomy-viewport').getBoundingClientRect(); return {x:r.x,y:r.y+window.scrollY,width:r.width,height:r.height,scale:1}; })()`);
    const crop = await command('Page.captureScreenshot', { format: 'png', clip: rectangle, captureBeyondViewport: true });
    const cropPath = join(artifacts, 'prima-webgl.png');
    writeFileSync(cropPath, Buffer.from(crop.data, 'base64'));
    const pixels = spawnSync('python', ['-c', 'from PIL import Image\nimport sys,json\nim=Image.open(sys.argv[1]).convert("RGB")\ncolors=im.getcolors(im.width*im.height)\nbackground=max(n for n,c in colors)\nprint(json.dumps({"colors":len(colors),"variation":1-background/(im.width*im.height)}))', cropPath], { encoding: 'utf8' });
    assert.equal(pixels.status, 0, pixels.stderr);
    const colorStats = JSON.parse(pixels.stdout);
    assert(colorStats.colors > 250 && colorStats.variation > .08, `The cropped 3D scene must render implant structure: ${JSON.stringify(colorStats)}`);
    assert(await capture('prima-desktop.png') > 25000);
    await click('[data-prima-scene="projection"]');
    assert.equal(await evaluate(`document.querySelector('[data-prima-scene="projection"]').checked`), false);
    await click('[data-prima-scene="projection"]');

    // A native keyboard edit must invalidate every live result before the field loses focus.
    await click('[data-prima="pin"]');
    await click('[data-prima-tab="device"]'); await paint();
    const beforeEdit = await canvasChecksums(['input', 'percept', 'field', 'waveform', 'comparison-pinned']);
    await evaluate(`document.querySelector('[data-prima-number="gapUm"]').focus(); true`);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await command('Input.insertText', { text: '50' });
    await until(() => evaluate(`document.querySelector('[data-prima-lab]').dataset.primaState === 'dirty'`), 5000, 'native input invalidation');
    assert.equal(await evaluate('document.activeElement.dataset.primaNumber'), 'gapUm');
    assert.equal(await evaluate(`document.querySelector('[data-prima-setting="gapUm"]').value`), '50');
    for (const marker of ['export-json', 'export-field', 'export-waveform', 'pin']) assert.equal(await evaluate(`document.querySelector('[data-prima="${marker}"]').disabled`), true);
    for (const marker of ['native-acuity', 'scene-field', 'illuminated', 'power', 'pixel-driving', 'pixel-residual']) assert.match(await evaluate(`document.querySelector('[data-prima-metric="${marker}"] strong').textContent`), /—/);
    for (const marker of ['pixel-illumination', 'pixel-current']) assert.match(await evaluate(`document.querySelector('[data-prima-metric="${marker}"]').textContent`), /—/);
    await paint();
    const afterEdit = await canvasChecksums(['input', 'percept', 'field', 'waveform', 'comparison-pinned']);
    for (const marker of ['input', 'percept', 'field', 'waveform']) assert.notEqual(afterEdit[marker].checksum, beforeEdit[marker].checksum, `${marker} must clear its stale plot`);
    assert.deepEqual(afterEdit['comparison-pinned'], beforeEdit['comparison-pinned'], 'Editing must retain the pinned image');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await runAction(() => click('[data-prima="run"]'));
    const edited = await exportJSON(); assert.equal(edited.settings.gapUm, 50);
    assert.notEqual(edited.experimentId, base.experimentId);

    // Inspection calculates a new trace, with both CSV exports carrying the same experiment.
    await runAction(() => setControl('selectedPixelId', 'P180'));
    const selected = await exportJSON();
    assert.equal(selected.settings.selectedPixelId, 'P180'); assert.equal(selected.selectedPixel.id, 'P180');
    assert.notEqual(selected.experimentId, edited.experimentId);
    const fieldCSV = await exportCSV('export-field'), waveformCSV = await exportCSV('export-waveform');
    writeFileSync(join(artifacts, 'prima-field.csv'), fieldCSV.text);
    writeFileSync(join(artifacts, 'prima-waveform.csv'), waveformCSV.text);
    const fieldRows = fieldCSV.text.trim().split(/\r?\n/).filter(row => !row.startsWith('#'));
    const waveformRows = waveformCSV.text.trim().split(/\r?\n/).filter(row => !row.startsWith('#'));
    assert.equal(fieldRows[0], 'x_um,y_um,potential_mv,bipolar_delta_mv,ez_vm');
    assert.equal(fieldRows.length - 1, selected.field.length);
    assert.equal(waveformRows[0], 'time_ms,irradiance_mw_mm2,pixel_current_ua,polarization_mv,diode_voltage_v,array_current_ua,return_current_ua');
    assert.equal(waveformRows.length - 1, selected.waveformLength);
    for (const rows of [fieldRows, waveformRows]) for (const row of rows.slice(1)) assert(row.split(',').every(value => value !== '' && Number.isFinite(Number(value))), 'CSV samples must be complete and finite');
    assert.match(fieldCSV.text, new RegExp(selected.experimentId));
    assert.match(waveformCSV.text, /# selected_pixel: P180/);
    assert.match(waveformCSV.text, new RegExp(selected.experimentId));
    await click('[data-prima-view="plan"]'); await paint();
    assert.equal(await evaluate(`document.querySelectorAll('[data-prima-canvas="plan"]').length`), 1);
    assert.equal(await evaluate(`document.querySelector('[data-prima="reset-camera"]').disabled`), true);
    await click('[data-prima-view="section"]'); await paint();
    assert.equal(await evaluate(`document.querySelectorAll('[data-prima-canvas="section"]').length`), 1);
    await click('[data-prima-view="3d"]');
    await click('[data-prima-field="potential"]');
    assert.equal(await evaluate(`document.querySelector('[data-prima-field="potential"]').getAttribute('aria-pressed')`), 'true');
    await click('[data-prima-field="bc"]');

    // Every launch experiment completes through the browser's actual numerical worker.
    const presetIds = await evaluate(`Array.from(document.querySelectorAll('[data-prima-preset]'), element => element.dataset.primaPreset)`);
    assert.deepEqual(presetIds, ['native', 'magnification', 'reading', 'contrast', 'spot', 'alignment', 'recovery']);
    const presetResults = [];
    for (const id of presetIds) {
      await runAction(() => click(`[data-prima-preset="${id}"]`));
      const report = await exportJSON();
      assert.equal(report.allFinite, true, `${id}: finite outputs`);
      assert.equal(report.geometryCount, 378); assert.equal(report.pixelMetricCount, 378);
      assert.equal(report.input.length, 256 ** 2); assert.equal(report.percept.length, 256 ** 2); assert.equal(report.field.length, 61 ** 2);
      assert(report.input.min >= 0 && report.input.max <= 1); assert(report.percept.min >= 0 && report.percept.max <= 1);
      assert(report.metric.illuminatedPixels > 0 && report.metric.illuminatedPixels <= 378);
      assert(report.selectedPixel.illumination > 0, `${id}: the preset should inspect an illuminated pixel`);
      assert(report.metric.maxKclResidualPa <= .200001, `${id}: circuit residual`);
      assert(Math.abs(report.metric.currentBalanceUa) < 1e-9, `${id}: snapshot current balance`);
      assert(report.maximumArrayImbalance < 1e-9, `${id}: waveform current balance`);
      assert(Math.abs(report.metric.nativeSnellenDenominator - 416.6666666666667) < 1e-9);
      assert(Math.abs(report.metric.sceneFieldDeg * report.settings.zoom - report.metric.implantFieldDeg) < 1e-12);
      presetResults.push({ id, ...report });
    }

    // Upload a real synthetic PNG through the image input, then round-trip every definition field.
    await click('[data-prima-tab="optics"]');
    await runAction(() => evaluate(`(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d'); context.fillStyle = '#000'; context.fillRect(0,0,64,64);
      context.fillStyle = '#fff'; context.fillRect(12,8,8,48); context.fillRect(20,8,30,8); context.fillRect(20,28,24,8); context.fillRect(20,48,30,8);
      context.fillStyle = '#808080'; context.fillRect(51,38,9,9);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const files = new DataTransfer(); files.items.add(new File([blob], 'synthetic-prima-e.png', {type:'image/png'}));
      const input = document.querySelector('[data-prima-file="image"]'); input.files = files.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true;
    })()`));
    const customImage = await exportJSON();
    assert.equal(customImage.settings.stimulus, 'image');
    assert.equal(customImage.settings.customImage.width, 256); assert.equal(customImage.settings.customImage.height, 256);
    assert.equal(customImage.settings.customImage.values.length, 256 ** 2);
    assert.equal(customImage.settings.customImage.values.min, 0); assert.equal(customImage.settings.customImage.values.max, 1);
    assert(customImage.input.sum > 0); assert(customImage.percept.max > 0);
    assert.match(await evaluate(`document.querySelector('.pr-file-name').textContent`), /synthetic-prima-e\.png/);
    await click('[data-prima-tab="device"]'); await setControl('gapUm', 47, 'input');
    assert.equal(await evaluate(`document.querySelector('[data-prima-lab]').dataset.primaState`), 'dirty');
    await runAction(() => evaluate(`(() => {
      const packet = JSON.parse(window.__primaSavedExperiment);
      // Imported results are deliberately invalid: only the definition may be restored.
      packet.results.metrics.maxPotentialMv = -999;
      packet.results.percept.values = [12345];
      const file = new File([JSON.stringify(packet)], 'prima-roundtrip.json', {type:'application/json'});
      const files = new DataTransfer(); files.items.add(file);
      const input = document.querySelector('[data-prima-file="experiment"]'); input.files = files.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true;
    })()`));
    const restored = await exportJSON();
    assert.deepEqual(restored.settings, customImage.settings);
    assert.equal(restored.experimentId, customImage.experimentId);
    assert.deepEqual(restored.percept, customImage.percept);
    assert(restored.metric.maxPotentialMv >= 0); assert.equal(restored.allFinite, true);

    // Switching off optical drive must zero the circuit without fabricating a sensory prediction.
    await click('[data-prima-tab="optics"]'); await setControl('irradianceMwMm2', 0, 'input');
    await runAction(() => click('[data-prima="run"]'));
    const zeroOpticalDrive = await exportJSON();
    assert.equal(zeroOpticalDrive.settings.irradianceMwMm2, 0);
    assert.equal(zeroOpticalDrive.metric.illuminatedPixels, 0); assert.equal(zeroOpticalDrive.metric.averageProjectionPowerMw, 0);
    assert.equal(zeroOpticalDrive.metric.averageArrayIncidentPowerMw, 0);
    assert.equal(zeroOpticalDrive.field.absoluteMaximum, 0); assert.equal(zeroOpticalDrive.bipolar.absoluteMaximum, 0); assert.equal(zeroOpticalDrive.waveformCurrent.absoluteMaximum, 0);
    assert.deepEqual(zeroOpticalDrive.percept, restored.percept, 'The conditional appearance branch remains independent of optical power');
    const zeroCaption = await evaluate(`document.querySelector('[data-prima-canvas="percept"]').closest('section').querySelector('.pr-caption').textContent`);
    assert.match(zeroCaption, /Optical power is off/); assert.match(zeroCaption, /does not predict a visible percept without stimulation/);
    assert(zeroOpticalDrive.warnings.some(warning => /Optical stimulation is off/.test(warning)));
    await click('[data-prima-tab="percept"]');
    assert.equal(await evaluate(`document.querySelector('[data-prima-setting="contrastModel"]').value`), restored.settings.contrastModel);
    assert.match(await evaluate(`document.querySelector('.pr-fixed-parameters').textContent`), /Tukey taper/);

    // A terminated worker cannot restore a stale result; the next run starts a fresh worker.
    const auditBeforeCancel = await evaluate('({completed:window.__primaWorkerAudit.completed,created:window.__primaWorkerAudit.created.length,terminated:window.__primaWorkerAudit.terminated})');
    await click('[data-prima-preset="contrast"]');
    await until(() => evaluate(`document.querySelector('[data-prima-lab]').dataset.primaState === 'busy' && !!document.querySelector('[data-prima="cancel"]')`), 10000, 'the cancellable calculation');
    await click('[data-prima="cancel"]'); await paint();
    assert.equal(await evaluate(`document.querySelector('[data-prima-lab]').dataset.primaState`), 'dirty');
    assert.match(await evaluate(`document.querySelector('.pr-run-status').textContent`), /cancelled/i);
    assert.equal(await evaluate(`document.querySelector('[data-prima="export-json"]').disabled`), true);
    assert.equal(await completedRuns(), auditBeforeCancel.completed);
    assert.equal(await evaluate('window.__primaWorkerAudit.terminated'), auditBeforeCancel.terminated + 1);
    await pause(200);
    assert.equal(await evaluate(`document.querySelector('[data-prima-lab]').dataset.primaState`), 'dirty');
    await runAction(() => click('[data-prima="run"]'));
    const recovered = await exportJSON();
    assert.equal(recovered.settings.stimulus, 'grating'); assert.equal(recovered.allFinite, true);
    assert.equal(await evaluate('window.__primaWorkerAudit.created.length'), auditBeforeCancel.created + 1);

    // Check the narrow layout under every settings tab and retain screenshot evidence.
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const mobile = {};
    for (const tab of ['optics', 'device', 'percept']) {
      await click(`[data-prima-tab="${tab}"]`); await paint();
      mobile[tab] = await evaluate(`({document:document.documentElement.scrollWidth,viewport:window.innerWidth,lab:document.querySelector('[data-prima-lab]').getBoundingClientRect().width})`);
      assert(mobile[tab].document <= mobile[tab].viewport + 2 && mobile[tab].lab <= mobile[tab].viewport, `Horizontal overflow in ${tab}: ${JSON.stringify(mobile[tab])}`);
    }
    await click('[data-prima-tab="optics"]');
    await evaluate('window.scrollTo(0,0); true'); await paint(); await capture('prima-mobile.png');
    await evaluate(`document.querySelector('.pr-anatomy-viewport').scrollIntoView({block:'center'}); true`); await paint(); await capture('prima-mobile-device.png');

    // A real context loss exercises the plan fallback and permanently disables unavailable 3D controls.
    const contextLossRequested = await evaluate(`(() => { const canvas = document.querySelector('[data-prima-webgl]'); const context = canvas.getContext('webgl2'); const extension = context?.getExtension('WEBGL_lose_context'); if (!extension) return false; extension.loseContext(); return true; })()`);
    assert.equal(contextLossRequested, true, 'The CI WebGL context must support a controlled loss test');
    await until(() => evaluate(`document.querySelector('[data-prima-view="3d"]').disabled && document.querySelector('[data-prima-view="plan"]').getAttribute('aria-pressed') === 'true'`), 10000, 'the graphics-loss fallback');
    assert.equal(await evaluate(`document.querySelector('[data-prima="reset-camera"]').disabled`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('[data-prima-scene]')).every(element => element.disabled)`), true);
    await evaluate(`document.querySelector('[data-prima-view="3d"]').click(); true`);
    assert.equal(await evaluate(`document.querySelector('[data-prima-view="plan"]').getAttribute('aria-pressed')`), 'true');
    await click('[data-prima-view="section"]'); await paint();
    assert.equal(await evaluate(`!!document.querySelector('[data-prima-canvas="section"]')`), true);
    await click('[data-prima-view="plan"]'); await paint(); await capture('prima-webgl-fallback.png');

    const workerAudit = await evaluate('window.__primaWorkerAudit');
    assert(workerAudit.posted >= 15 && workerAudit.completed >= 14);
    assert.deepEqual(workerAudit.errors, []); assert.deepEqual(errors, []);
    const methods = await fetch(`${origin}/simulations/retinal-implant/prima/methods/`);
    assert.equal(methods.status, 200); assert.match(await methods.text(), /ProViSim/);
    writeFileSync(join(artifacts, 'browser-report.json'), JSON.stringify({
      initial: base, nativeEdit: edited, staleCanvasChecks: { before: beforeEdit, after: afterEdit }, selectedPixel: selected,
      csv: { fieldRows: fieldRows.length - 1, waveformRows: waveformRows.length - 1 }, presets: presetResults,
      customImage, restored, zeroOpticalDrive, zeroCaption, recovered, webglScreenshot: colorStats,
      mobile, contextLossFallback: true, workerAudit, runtimeErrors: errors,
    }, null, 2));
  } catch (error) {
    try { await captureFailure?.('prima-failure.png'); } catch {}
    try { writeFileSync(join(artifacts, 'failure-state.json'), JSON.stringify(await evaluateFailure?.(`({state:document.querySelector('[data-prima-lab]')?.dataset.primaState,status:document.querySelector('.pr-run-status')?.textContent,errors:Array.from(document.querySelectorAll('[role="alert"]'),e=>e.textContent),workers:window.__primaWorkerAudit})`), null, 2)); } catch {}
    writeFileSync(join(artifacts, 'astro.log'), serverLog);
    throw new Error(`${error.stack || error.message}\nAstro log:\n${serverLog.slice(-3500)}`);
  } finally {
    socket?.close(); browser.kill('SIGTERM'); astro.kill('SIGTERM');
    await pause(200); rmSync(profile, { recursive: true, force: true });
  }
});
