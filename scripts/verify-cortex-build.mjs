// Static artifact assertions, not interactive browser QA. Run after npm run build.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  ENGINE_VERSION,
  ACTIVE_ENGINE_VERSION,
} from "../src/lib/cortex/config.js";
import { INTERFACE_VERSION, INTERFACE_COMPARISON_VERSION } from "../src/lib/cortex/interface-contract.js";
const html = readFileSync("dist/cortex/index.html", "utf8");
const methods = readFileSync("dist/cortex/methods/index.html", "utf8");
assert.match(html, /From membrane to contact/);
assert.match(html, /16 distinct human specimens/);
assert.doesNotMatch(html, /id="cx-population"|Shuffle angles|Distance cloud · default/);
assert.doesNotMatch(html, /Exploratory passive model|Synthetic passive arbor|Passive · small synaptic response/);
assert.match(html, /<option selected value="active-intracellular-spike">/);
assert.match(html, /Point sources · single human cell/);
assert.match(html, /href="\/cortex\/population\/"/);
assert.doesNotMatch(html, /Neuron model<select/);
assert.match(html, /no independent experimental validation/);
assert.match(html, /cortex\/methods/);
assert.match(html, /client="load"/);
assert.match(methods, /NEURON 9\.0\.1/);
assert.match(methods, /LFPykit 0\.6\.2/);
assert.match(methods, /no independent experimental validation/);
assert.match(methods, /571654895/);
assert.match(methods, /mixed-species/);
assert.ok(existsSync("dist/models/cortex/allen571654895/571654895.swc"));
assert.match(
  readFileSync("dist/models/cortex/allen571654895/LICENSE.txt", "utf8"),
  /commercial purposes are not permitted/,
);
for (const match of html.matchAll(
  /(?:src|component-url|renderer-url)="(\/_astro\/[^"]+)"/g,
))
  assert.ok(
    existsSync(path.join("dist", match[1])),
    `Missing asset ${match[1]}`,
  );
// Follow the current page's links, not the first matching file: incremental
// builds can leave older hashed assets in dist that must not satisfy this check.
const component = html.match(
  /component-url="\/_astro\/(CortexWorkspace\.[^"]+\.js)"/,
)?.[1];
assert.ok(component, "Missing hydrated component");
assert.match(html, /Finite disk · single human cell/);
assert.match(html, /Laboratory field model/);
// Vite can emit a thin re-export entry plus a shared implementation chunk.
// Traverse only reachable module imports so stale output cannot satisfy this assertion.
const reachable = new Map();
function visit(name, modules = reachable) {
  if (modules.has(name)) return;
  const code = readFileSync(`dist/_astro/${name}`, "utf8");
  modules.set(name, code);
  for (const match of code.matchAll(
    /(?:from\s*|import\s*|import\(\s*)["']\.\/([^"']+\.js)["']/g,
  ))
    visit(match[1], modules);
}
visit(component);
const componentCode = [...reachable.values()].join("\n");
const worker = componentCode.match(
  /new Worker\(new URL\(["']\/_astro\/(worker[-.][^"']+\.js)["']/,
)?.[1];
assert.ok(worker, "Missing bundled numerical worker");
assert.ok(
  readFileSync(`dist/_astro/${worker}`, "utf8").includes(ENGINE_VERSION),
);
assert.ok(
  readFileSync(`dist/_astro/${worker}`, "utf8").includes(ACTIVE_ENGINE_VERSION),
);
assert.match(componentCode, /Human temporal L2 spiny cell/);
assert.match(html, /First run/);
assert.match(html, /Curated example/);
assert.match(html, /Implant geometry/);
assert.match(html, /Neuralink N1 · one 16-site thread/);
assert.match(html, /Neuropixels 1.0 · one shank/);
assert.match(html, /Contact detail/);
const populationHtml = readFileSync("dist/cortex/population/index.html", "utf8");
assert.match(populationHtml, /Cortex Population Laboratory/);
assert.match(populationHtml, /<option selected value="extracellular-soma-spike">/);
assert.match(populationHtml, /id="cx-population"/);
assert.match(populationHtml, /Real-model population/);
assert.match(populationHtml, /distinct source specimens/);
assert.match(populationHtml, /Distance cloud · default/);
assert.match(populationHtml, /Shuffle angles/);
assert.match(populationHtml, /every supported cell shows its own compartment membrane voltages/);
assert.match(populationHtml, /href="\/cortex\/"/);
assert.match(populationHtml, /component-url="\/_astro\/CortexLaboratory\.[^"]+\.js"/);
assert.match(componentCode, /unsupported positions/);
assert.match(html, /Choose a neuron/);
assert.match(html, /Also in Finger Atlas/);
assert.match(html, /Human epilepsy circuitry/);
assert.ok(existsSync("dist/models/cortex/library/allen508378649-40.json.gz"));
assert.match(componentCode, /Run .*cells|Population complete/);
assert.match(methods, /200 million node-steps/);
assert.match(html, /Whole implant/);
assert.match(componentCode, /recording-only in this laboratory/);
assert.match(methods, /single-implants/);
assert.match(html, /Applied extracellular tissue potential|Tissue scale/);
assert.match(componentCode, /extracellular-soma-spike/);
const index = JSON.parse(readFileSync("dist/search-index.json", "utf8"));
const entries = Array.isArray(index) ? index : index.entries;
assert.ok(entries.some(entry => entry.href === "/cortex/population/"), "Population laboratory missing from site search");
assert.match(readFileSync("dist/simulations/index.html", "utf8"), /href="\/cortex\/population\/"/);
assert.ok(
  entries.some((entry) => entry.href === "/cortex/"),
  "Cortex Laboratory missing from site search",
);
assert.match(
  readFileSync("dist/simulations/index.html", "utf8"),
  /href="\/cortex\/"/,
);

// Verify the integrated laboratory independently of the original workspace.
// Follow its current hydrated entry to the worker; stale dist files cannot pass.
const interfaceHtml = readFileSync("dist/cortex/interface/index.html", "utf8");
const interfaceMethods = readFileSync("dist/cortex/interface/methods/index.html", "utf8");
assert.match(interfaceHtml, /Neural Interface Laboratory/);
assert.match(interfaceHtml, /href="\/cortex\/interface\/methods\/"/);
assert.match(interfaceMethods, /infinite insulating plane/);
const interfaceComponent = interfaceHtml.match(
  /component-url="\/_astro\/(CortexInterfaceLaboratory\.[^"]+\.js)"/,
)?.[1];
assert.ok(interfaceComponent, "Missing hydrated interface laboratory component");
const interfaceModules = new Map();
visit(interfaceComponent, interfaceModules);
const interfaceCode = [...interfaceModules.values()].join("\n");
const interfaceWorker = interfaceCode.match(
  /new Worker\(new URL\(["']\/_astro\/(interface-worker[-.][^"']+\.js)["']/,
)?.[1];
assert.ok(interfaceWorker, "Missing bundled interface worker");
assert.ok(readFileSync(`dist/_astro/${interfaceWorker}`, "utf8").includes(INTERFACE_VERSION),
  "Interface worker must include the current experiment contract");
for (const name of ["default", "evoked"]) {
  const base = `dist/models/cortex/interface/${name}`;
  assert.ok(existsSync(`${base}.bin.gz`), `Missing ${name} compartment replay`);
  const metadata = JSON.parse(readFileSync(`${base}.json`, "utf8"));
  assert.equal(metadata.config?.version, INTERFACE_VERSION, `Incompatible ${name} replay contract`);
  assert.equal(metadata.cells.length, 12, `Incomplete ${name} saved population`);
}
for (const name of ["geometry", "stimulation"]) {
  const base = `dist/models/cortex/interface/${name}`;
  assert.ok(existsSync(`${base}.bin.gz`), `Missing ${name} paired replay`);
  const metadata = JSON.parse(readFileSync(`${base}.json`, "utf8"));
  assert.equal(metadata.version, INTERFACE_COMPARISON_VERSION, `Incompatible ${name} comparison contract`);
  assert.equal(metadata.baseline.cells.length, 12);
  assert.equal(metadata.variant.cells.length, 12);
}
assert.ok(entries.some(entry => entry.href === "/cortex/interface/"),
  "Neural Interface Laboratory missing from site search");
assert.match(readFileSync("dist/simulations/index.html", "utf8"), /href="\/cortex\/interface\/"/);
console.log(
  `Cortex static artifact checks passed: original and integrated routes, provenance labels, search, ${component}, ${worker}, ${interfaceComponent}, ${interfaceWorker}, saved replays. Browser QA remains pending.`,
);
