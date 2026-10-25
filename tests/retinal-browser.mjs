/** CI-only integration test. Local visual QA uses the managed Sites browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const required = process.env.RETINAL_REQUIRE_BROWSER === '1';
const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(existsSync);
if (required && (!chrome || !existsSync('node_modules/astro/astro.js'))) throw new Error('Required retinal browser test needs installed Astro and Chrome.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() { const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function until(fn, timeout = 45000) { const start = Date.now(); let last; while (Date.now() - start < timeout) { try { const answer = await fn(); if (answer) return answer; } catch (error) { last = error; } await pause(100); } throw new Error(`Timed out${last ? `: ${last.message}` : ''}`); }

test('retinal browser: native input, scientific workers, WebGL, presets, exports and responsive controls', { skip: required ? false : 'Explicit RETINAL_REQUIRE_BROWSER=1 gate; managed browser covers local visual QA', timeout: 480000 }, async () => {
  const httpPort = await freePort(), debugPort = await freePort(), profile = mkdtempSync(join(tmpdir(), 'retinal-browser-'));
  const artifacts = process.env.RETINAL_QA_DIR || profile; mkdirSync(artifacts, { recursive: true });
  const astro = spawn(process.execPath, ['node_modules/astro/astro.js', 'dev', '--host', '127.0.0.1', '--port', String(httpPort)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = ''; astro.stdout.on('data', value => { serverLog += value; }); astro.stderr.on('data', value => { serverLog += value; });
  const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const errors = []; let socket;
  try {
    const origin = `http://127.0.0.1:${httpPort}`, url = `${origin}/simulations/retinal-implant/`;
    await until(async () => (await fetch(url)).ok);
    const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(t => t.type === 'page'));
    socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let counter = 0; const pending = new Map();
    socket.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
    const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); true`);
    const ready = () => until(() => evaluate(`document.querySelector('[data-retinal-lab]')?.dataset.riState === 'complete'`), 90000);
    const capture = async name => { const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(join(artifacts, name), Buffer.from(screenshot.data, 'base64')); return screenshot.data.length; };
    const exportJSON = async () => evaluate(`(async () => {
      const originalURL = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click; let blob;
      URL.createObjectURL = value => { blob = value; return 'blob:retinal-test'; }; HTMLAnchorElement.prototype.click = () => {};
      try { document.querySelector('[data-ri="export-json"]').click(); } finally { URL.createObjectURL = originalURL; HTMLAnchorElement.prototype.click = originalClick; }
      if (!blob) throw new Error('Export did not produce a Blob');
      const text = await blob.text(), data = JSON.parse(text); window.__retinalSavedExperiment = text;
      return { schema: data.schema, version: data.modelVersion, settings: data.settings, metadata: data.results.provenance,
        metric: data.results.metrics, fieldPoints: data.results.field.potentialMv.length, visualPoints: data.results.percept.brightness.length,
        allFinite: data.results.percept.brightness.every(Number.isFinite) && data.results.field.potentialMv.every(Number.isFinite), bytes: text.length };
    })()`);

    await command('Runtime.enable'); await command('Page.enable'); await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url }); await ready();
    const base = await exportJSON(); assert.equal(base.schema, 'bts.retinal.experiment.v1'); assert.equal(base.allFinite, true); assert.equal(base.fieldPoints, 61 * 61); assert.match(base.metadata.referenceAssetSha256, /^[a-f0-9]{64}$/);

    // The scene must create a real WebGL canvas in the graphics-enabled CI runner.
    await until(() => evaluate(`!!document.querySelector('.ri-webgl-canvas')`));
    assert.equal(await evaluate(`document.querySelector('[data-ri-view="3d"]').disabled`), false);
    await evaluate(`document.querySelector('.ri-anatomy-viewport').scrollIntoView({block:'center'}); true`); await pause(200);
    const rectangle = await evaluate(`(() => { const r = document.querySelector('.ri-anatomy-viewport').getBoundingClientRect(); return {x:r.x,y:r.y+window.scrollY,width:r.width,height:r.height,scale:1}; })()`);
    const crop = await command('Page.captureScreenshot', { format: 'png', clip: rectangle, captureBeyondViewport: true }); const cropPath = join(artifacts, 'retinal-webgl.png'); writeFileSync(cropPath, Buffer.from(crop.data, 'base64'));
    const pixels = spawnSync('python', ['-c', 'from PIL import Image\nimport sys,json\nim=Image.open(sys.argv[1]).convert("RGB")\ncolors=im.getcolors(im.width*im.height)\nbackground=max(n for n,c in colors)\nprint(json.dumps({"colors":len(colors),"variation":1-background/(im.width*im.height)}))', cropPath], { encoding: 'utf8' });
    assert.equal(pixels.status, 0, pixels.stderr); const colorStats = JSON.parse(pixels.stdout); assert(colorStats.colors > 250 && colorStats.variation > .08, `The cropped 3D scene must render structure: ${JSON.stringify(colorStats)}`);
    assert(await capture('retinal-desktop.png') > 25000);

    // Native keyboard editing must update config immediately and clear stale results.
    await click('[data-ri-preset="single"]'); await ready(); await click('[data-ri="pin"]');
    await evaluate(`document.querySelector('[data-ri-number="gapUm"]').focus(); true`);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
    await command('Input.insertText', { text: '250' });
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate(`document.querySelector('[data-ri-setting="gapUm"]').value`), '250');
    assert.equal(await evaluate(`document.querySelector('[data-retinal-lab]').dataset.riState`), 'dirty');
    assert.equal(await evaluate(`document.querySelector('[data-ri="export-json"]').disabled`), true);
    assert.match(await evaluate(`document.querySelector('[data-ri-metric="potential"]').textContent`), /—/);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('h3')).some(e => e.textContent === 'Pinned trial')`), true);
    await click('[data-ri="run"]'); await ready(); const edited = await exportJSON(); assert.equal(edited.settings.gapUm, 250); assert.equal(edited.metric.drivenContacts, 1);

    // Inspect a different direct-drive contact and use a finer local electrical grid.
    await evaluate(`(() => { const e = document.querySelector('[data-ri-setting="inspector"]'); e.value='E14'; e.dispatchEvent(new Event('change',{bubbles:true})); document.querySelectorAll('.ri-field-panel details').forEach(d=>d.open=true); return true; })()`);
    await evaluate(`(() => { const e = document.querySelector('[data-ri-setting="fieldView"]'); e.value='selected'; e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await evaluate(`(() => { const e = document.querySelector('[data-ri-setting="fieldGridSize"]'); e.value='121'; e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await click('[data-ri="run"]'); await ready(); const local = await exportJSON(); assert.equal(local.settings.selectedId, 'E14'); assert.equal(local.settings.fieldView, 'selected'); assert.equal(local.fieldPoints, 121 * 121);
    await click('[data-ri-view="plan"]'); await click('[data-ri-view="section"]'); assert.equal(await evaluate(`document.querySelectorAll('[data-ri-canvas="section"]').length`), 1);

    // Every launch experiment executes through the browser's actual numerical worker.
    const presetIds = await evaluate(`Array.from(document.querySelectorAll('[data-ri-preset]'), e => e.dataset.riPreset)`);
    const presetResults = [];
    for (const id of presetIds) { await click(`[data-ri-preset="${id}"]`); await ready(); const report = await exportJSON(); assert.equal(report.allFinite, true); assert(Math.abs(report.metric.netSourceCurrentUa) < 1e-7); assert(Math.abs(report.metric.netChargeNc) < 1e-7); presetResults.push({ id, settings: report.settings, metrics: report.metric }); }
    assert.equal(presetResults.length, 7);

    // Restore the exported JSON through the actual file input and recompute.
    await evaluate(`(() => { const file = new File([window.__retinalSavedExperiment], 'retinal-roundtrip.json', {type:'application/json'}); const list = new DataTransfer(); list.items.add(file); const input = document.querySelector('input[type=file]'); input.files=list.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`); await ready();
    const restored = await exportJSON(); assert.equal(restored.settings.pattern, presetResults.at(-1).settings.pattern);

    // Blank drive is exactly zero; it must not retain prior maps or a fabricated centroid.
    await click('[data-ri-tab="stimulus"]'); await evaluate(`(() => { const e=document.querySelector('[data-ri-setting="pattern"]'); e.value='blank'; e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`); await click('[data-ri="run"]'); await ready();
    const blank = await exportJSON(); assert.equal(blank.metric.drivenContacts, 0); assert.equal(blank.metric.perceptPeak, 0); assert.equal(blank.metric.maxAbsPotentialMv, 0);
    await click('[data-ri-preset="letter"]'); await ready();
    const beforeTheme = await evaluate(`document.documentElement.dataset.theme`); await click('#themeToggle'); const afterTheme = await evaluate(`document.documentElement.dataset.theme`); assert.notEqual(beforeTheme, afterTheme); await click('#themeToggle');
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await pause(200);
    const widths = await evaluate(`({document:document.documentElement.scrollWidth, viewport:window.innerWidth, lab:document.querySelector('[data-retinal-lab]').getBoundingClientRect().width})`); assert(widths.document <= widths.viewport + 2 && widths.lab <= widths.viewport, `Horizontal overflow: ${JSON.stringify(widths)}`);
    await evaluate(`window.scrollTo(0,0); true`); await capture('retinal-mobile.png');
    assert.deepEqual(errors, []); writeFileSync(join(artifacts, 'browser-report.json'), JSON.stringify({ initial: base, numericalKeyboardEdit: edited, localField: local, presets: presetResults, blank, webglScreenshot: colorStats, mobile: widths, runtimeErrors: errors }, null, 2));
    const methods = await fetch(`${origin}/simulations/retinal-implant/methods/`); assert.equal(methods.status, 200); assert.match(await methods.text(), /pulse2percept/);
  } catch (error) { throw new Error(`${error.stack || error.message}\nAstro log:\n${serverLog.slice(-3500)}`); }
  finally { socket?.close(); browser.kill('SIGTERM'); astro.kill('SIGTERM'); await pause(200); rmSync(profile, { recursive: true, force: true }); }
});
