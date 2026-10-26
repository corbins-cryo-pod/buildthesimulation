/** CI-only graphics integration. Local interactive QA uses the managed Sites browser. */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function port() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}
async function until(fn, ms = 90000) {
  const t = Date.now();
  let err;
  while (Date.now() - t < ms) {
    try {
      const r = await fn();
      if (r) return r;
    } catch (e) {
      err = e;
    }
    await pause(100);
  }
  throw Error("Browser condition timed out" + (err ? `: ${err.message}` : ""));
}
export async function verifyRetinaBrowser(mode = "electrical") {
  const chrome = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
  ].find(existsSync);
  assert(chrome, "Graphics CI requires Chrome");
  const http = await port(),
    debug = await port(),
    profile = mkdtempSync(join(tmpdir(), "retina-")),
    artifacts =
      process.env.RETINAL_QA_DIR ?? process.env.PRIMA_QA_DIR ?? profile;
  mkdirSync(artifacts, { recursive: true });
  const astro = spawn(
    process.execPath,
    [
      "node_modules/astro/astro.js",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(http),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  astro.stdout.on("data", (v) => (log += v));
  astro.stderr.on("data", (v) => (log += v));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      `--remote-debugging-port=${debug}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let socket, evaluate, capture;
  const errors = [];
  try {
    const origin = `http://127.0.0.1:${http}`,
      url =
        origin +
        (mode === "photovoltaic"
          ? "/simulations/retinal-implant/prima/"
          : "/simulations/retinal-implant/");
    await until(async () => (await fetch(url)).ok);
    const target = await until(async () =>
      (await (await fetch(`http://127.0.0.1:${debug}/json`)).json()).find(
        (p) => p.type === "page",
      ),
    );
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      socket.addEventListener("open", r, { once: true });
      socket.addEventListener("error", j, { once: true });
    });
    let id = 0;
    const pending = new Map();
    socket.addEventListener("message", ({ data }) => {
      const m = JSON.parse(data);
      if (m.id) {
        const p = pending.get(m.id);
        if (p) {
          pending.delete(m.id);
          m.error
            ? p.reject(Error(JSON.stringify(m.error)))
            : p.resolve(m.result);
        }
      } else if (m.method === "Runtime.exceptionThrown")
        errors.push(
          m.params.exceptionDetails.exception?.description ??
            m.params.exceptionDetails.text,
        );
    });
    const command = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id;
        pending.set(n, { resolve, reject });
        socket.send(JSON.stringify({ id: n, method, params }));
      });
    evaluate = async (expression) => {
      const r = await command("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails)
        throw Error(
          r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
        );
      return r.result.value;
    };
    const click = (selector) =>
        evaluate(
          `document.querySelector(${JSON.stringify(selector)}).click();true`,
        ),
      select = (selector, value) =>
        evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`,
        );
    const ready = () =>
      until(
        () =>
          evaluate(
            `document.querySelector('[data-retina-lab]')?.dataset.state==='complete'`,
          ),
        120000,
      );
    const run = async () => {
      await click('[data-rtl="run"]');
      await ready();
    };
    capture = async (name) => {
      const r = await command("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      writeFileSync(join(artifacts, name), Buffer.from(r.data, "base64"));
      return r.data.length;
    };
    const exportJSON = () =>
      evaluate(
        `(async()=>{const originalURL=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click;let blob;URL.createObjectURL=v=>{blob=v;return 'blob:retina-test'};HTMLAnchorElement.prototype.click=()=>{};try{document.querySelector('[data-rtl="export-json"]').click()}finally{URL.createObjectURL=originalURL;HTMLAnchorElement.prototype.click=originalClick}if(!blob)throw Error('Missing exported Blob');const text=await blob.text();window.__retinaSaved=text;const d=JSON.parse(text),r=d.results;return {schema:d.schema,settings:d.settings,id:d.experimentId,metrics:r.metrics,coordinates:r.provenance.coordinates,finite:r.response.values.every(Number.isFinite),reference:r.provenance.referenceSha256,fieldPoints:r.electrical?.field.potentialMv.length,pixelCount:r.photovoltaic?.geometry.pixels.length,kcl:r.photovoltaic?.metrics.maxKclResidualPa,baselinePeak:Math.max(...(r.baseline?.values??[0])),responsePeak:Math.max(...r.response.values),legacy:!!(r.electrical?.legacy??r.photovoltaic?.legacy),cable:r.cable?{compartments:r.cable.compartments,peak:r.cable.peakMv}:null,bytes:text.length}})()`,
      );
    await command("Runtime.enable");
    await command("Page.enable");
    await command("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.__retinaWorkers={started:0,completed:0,terminated:0};const RealWorker=Worker;window.Worker=class extends RealWorker{constructor(...a){super(...a);window.__retinaWorkers.started++;this.addEventListener('message',e=>{if(e.data?.type==='result')window.__retinaWorkers.completed++})}terminate(){window.__retinaWorkers.terminated++;return super.terminate()}};`,
    });
    await command("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await command("Page.navigate", { url });
    await ready();
    const initial = await exportJSON();
    assert.equal(initial.schema, "bts.retina-laboratory.experiment.v1");
    assert.equal(initial.settings.modality, mode);
    assert(initial.finite);
    assert.match(initial.reference, /^[a-f0-9]{64}$/);
    if (mode === "photovoltaic") {
      assert.equal(initial.pixelCount, 378);
      assert(initial.kcl < 0.21);
    } else assert.equal(initial.fieldPoints, 3721);
    assert.equal(
      await evaluate(`location.pathname`),
      "/simulations/retinal-implant/",
    );
    await until(() => evaluate(`!!document.querySelector('.rtl-webgl')`));
    assert.equal(
      await evaluate(`document.querySelectorAll('.rtl-canvas-anatomy').length`),
      0,
      "Graphics-enabled CI must render the real 3D scene",
    );
    await evaluate(
      `document.querySelector('.rtl-anatomy').scrollIntoView({block:'center'});true`,
    );
    await pause(300);
    const rect = await evaluate(
        `(()=>{const r=document.querySelector('.rtl-viewport').getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`,
      ),
      shot = await command("Page.captureScreenshot", {
        format: "png",
        clip: rect,
        captureBeyondViewport: true,
      }),
      scenePath = join(artifacts, mode + "-webgl.png");
    writeFileSync(scenePath, Buffer.from(shot.data, "base64"));
    const px = spawnSync(
      "python",
      [
        "-c",
        'from PIL import Image\nimport sys,json\nim=Image.open(sys.argv[1]).convert("RGB"); colors=im.getcolors(im.width*im.height); print(json.dumps({"colors":len(colors),"variation":1-max(n for n,c in colors)/(im.width*im.height)}))',
        scenePath,
      ],
      { encoding: "utf8" },
    );
    assert.equal(px.status, 0, px.stderr);
    const graphics = JSON.parse(px.stdout);
    assert(
      graphics.colors > 250 && graphics.variation > 0.08,
      JSON.stringify(graphics),
    );
    await capture(mode + "-desktop.png");
    // Preserve side-on and en-face evidence of the assembled implant, not just
    // the initial perspective that can conceal detached contacts or backing.
    for (const view of ['section', 'plan', 'whole', 'tissue']) {
      await evaluate(`document.querySelector('[data-rtl-view="${view}"]').click();true`);
      await pause(350);
      await capture(mode + '-assembly-' + view + '.png');
    }
    // Native keyboard events, not programmatic state mutation, verify immediate invalidation.
    const field =
        mode === "photovoltaic" ? "photovoltaic.gapUm" : "electrical.gapUm",
      gap = mode === "photovoltaic" ? "75" : "250";
    await evaluate(
      `document.querySelector('[data-rtl-setting="${field}"]').focus();true`,
    );
    await command("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "a",
      code: "KeyA",
      modifiers: 2,
      windowsVirtualKeyCode: 65,
    });
    await command("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "a",
      code: "KeyA",
      modifiers: 2,
      windowsVirtualKeyCode: 65,
    });
    await command("Input.insertText", { text: gap });
    await pause(100);
    assert.equal(
      await evaluate(
        `document.querySelector('[data-retina-lab]').dataset.state`,
      ),
      "dirty",
    );
    assert.equal(
      await evaluate(
        `document.querySelector('[data-rtl="export-json"]').disabled`,
      ),
      true,
    );
    await run();
    const edited = await exportJSON();
    assert.equal(
      edited.settings[mode === "photovoltaic" ? "photovoltaic" : "electrical"]
        .gapUm,
      +gap,
    );
    assert.notEqual(
      edited.metrics.peakGanglionDriveMv + edited.metrics.peakBipolarDriveMv,
      initial.metrics.peakGanglionDriveMv + initial.metrics.peakBipolarDriveMv,
    );
    await click('[data-rtl="compare"]');
    await ready();
    assert.equal(
      await evaluate(
        `document.querySelectorAll('.rtl-comparison-images figure').length`,
      ),
      2,
    );
    // Exercise all retained launch experiments through their real worker path.
    const selector =
        mode === "photovoltaic" ? "data-rtl-legacy-pv" : "data-rtl-legacy-e",
      ids = await evaluate(
        `Array.from(document.querySelectorAll('[${selector}]'),e=>e.getAttribute('${selector}'))`,
      ),
      presets = [];
    for (const key of ids) {
      await click(`[${selector}="${key}"]`);
      await ready();
      const r = await exportJSON();
      assert(r.finite && r.legacy);
      presets.push({ key, settings: r.settings, metrics: r.metrics });
    }
    assert.equal(presets.length, 7);
    const expected = presets.at(-1).settings;
    await select('[data-rtl-setting="scene.stimulus"]', "blank");
    assert.equal(
      await evaluate(
        `document.querySelector('[data-retina-lab]').dataset.state`,
      ),
      "dirty",
    );
    await evaluate(
      `(()=>{const f=new File([window.__retinaSaved],'roundtrip.json',{type:'application/json'}),d=new DataTransfer();d.items.add(f);const e=document.querySelector('input[aria-label="Import experiment JSON"]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`,
    );
    await ready();
    assert.deepEqual((await exportJSON()).settings, expected);
    await select('[data-rtl-setting="scene.stimulus"]', "blank");
    await select('[data-rtl-setting="percept"]', "coupled");
    await run();
    const blank = await exportJSON();
    assert.equal(blank.metrics.totalSpikes, 0);
    assert.equal(blank.responsePeak, 0);
    // Optogenetic kinetics and detailed membrane compartments also execute in a worker.
    await click('[data-rtl-preset="optical"]');
    await ready();
    const optical = await exportJSON();
    assert(optical.metrics.totalSpikes > 0);
    await click('[data-rtl-preset="cable"]');
    await ready();
    const cable = await exportJSON();
    assert(cable.cable.compartments > 50 && Number.isFinite(cable.cable.peak));
    await click('[data-rtl="run"]');
    await until(
      () =>
        evaluate(
          `document.querySelector('[data-retina-lab]').dataset.state==='running'`,
        ),
      10000,
    );
    await click('[data-rtl="cancel"]');
    assert.equal(
      await evaluate(
        `document.querySelector('[data-retina-lab]').dataset.state`,
      ),
      "dirty",
    );
    assert.equal(
      await evaluate(
        `document.querySelector('[data-rtl="export-json"]').disabled`,
      ),
      true,
    );
    await run();
    // A real local file input must decode image pixels and invalidate prior output.
    await evaluate(
      `(()=>{const svg='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="white"/></svg>';const file=new File([svg],'white.svg',{type:'image/svg+xml'}),d=new DataTransfer();d.items.add(file);const e=document.querySelector('input[aria-label="Upload local image or video"]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`,
    );
    await until(() =>
      evaluate(
        `document.querySelector('[data-retina-lab]').dataset.state==='dirty'`,
      ),
    );
    await run();
    const uploaded = await exportJSON();
    assert.equal(uploaded.settings.scene.stimulus, "image");
    assert(uploaded.settings.scene.customImage.values.every((v) => v > 0.99));
    // Reject unsupported Designer shapes without overwriting a valid experiment.
    await evaluate(
      `(()=>{const file=new File([JSON.stringify({schema:'bts-neural-interface',version:1,units:'µm',contacts:[{id:'test',x:0,y:0,w:50,shape:'square'}]})],'unsupported.json',{type:'application/json'}),d=new DataTransfer();d.items.add(file);const e=document.querySelector('input[aria-label="Import Designer geometry"]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`,
    );
    await until(() =>
      evaluate(
        `document.querySelector('[role="alert"]')?.textContent.includes('circular')`,
      ),
    );
    await click('[data-rtl-preset="cable"]');
    await ready();
    for (const view of ["whole", "section", "plan", "tissue"])
      await click(`[data-rtl-view="${view}"]`);
    await select('select[aria-label="Anatomical overlay"]', "voltage");
    await pause(100);
    assert.equal(
      await evaluate(`document.querySelectorAll('.rtl-graphics-error').length`),
      0,
    );
    const before = await evaluate(`document.documentElement.dataset.theme`);
    await click("#themeToggle");
    assert.notEqual(
      await evaluate(`document.documentElement.dataset.theme`),
      before,
    );
    await capture(mode + "-dark.png");
    await click("#themeToggle");
    await command("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await pause(200);
    const widths = await evaluate(
      `({document:document.documentElement.scrollWidth,viewport:innerWidth,lab:document.querySelector('[data-retina-lab]').getBoundingClientRect().width})`,
    );
    assert(
      widths.document <= widths.viewport + 2 && widths.lab <= widths.viewport,
      JSON.stringify(widths),
    );
    await evaluate(`scrollTo(0,0);true`);
    await capture(mode + "-mobile.png");
    const workers = await evaluate(`window.__retinaWorkers`);
    assert(
      workers.started > 0 && workers.completed >= 12 && workers.terminated > 0,
    );
    assert.deepEqual(errors, []);
    const methods = await fetch(
      origin + "/simulations/retinal-implant/methods/",
    );
    assert.match(await methods.text(), /research prototype/);
    const oldMethods = await fetch(
      origin + "/simulations/retinal-implant/prima/methods/",
    );
    assert.equal(oldMethods.status, 200);
    writeFileSync(
      join(artifacts, mode + "-report.json"),
      JSON.stringify(
        {
          initial,
          edited,
          presets,
          blank,
          optical,
          cable,
          graphics,
          widths,
          workers,
          errors,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    try {
      await capture?.("failure.png");
      writeFileSync(
        join(artifacts, "failure.json"),
        JSON.stringify(
          await evaluate?.(
            `({state:document.querySelector('[data-retina-lab]')?.dataset.state,status:document.querySelector('.rtl-status')?.textContent,errors:Array.from(document.querySelectorAll('[role=alert]'),p=>p.textContent)})`,
          ),
        ),
      );
    } catch {}
    throw Error(`${e.stack ?? e.message}\n${log.slice(-4000)}`);
  } finally {
    socket?.close();
    browser.kill("SIGTERM");
    astro.kill("SIGTERM");
    await pause(200);
    rmSync(profile, { recursive: true, force: true });
  }
}
