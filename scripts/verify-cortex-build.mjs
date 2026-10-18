// Static artifact assertions, not interactive browser QA. Run after npm run build.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  ENGINE_VERSION,
  ACTIVE_ENGINE_VERSION,
} from "../src/lib/cortex/config.js";
const html = readFileSync("dist/cortex/index.html", "utf8");
const methods = readFileSync("dist/cortex/methods/index.html", "utf8");
assert.match(html, /From membrane to contact/);
assert.match(html, /Human temporal cell · published active model/);
assert.doesNotMatch(html, /Exploratory passive model|Synthetic passive arbor|Passive · small synaptic response/);
assert.match(html, /<option selected value="extracellular-soma-spike">/);
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
  /component-url="\/_astro\/(CortexLaboratory\.[^"]+\.js)"/,
)?.[1];
assert.ok(component, "Missing hydrated component");
// Vite can emit a thin re-export entry plus a shared implementation chunk.
// Traverse only reachable module imports so stale output cannot satisfy this assertion.
const reachable = new Map();
function visit(name) {
  if (reachable.has(name)) return;
  const code = readFileSync(`dist/_astro/${name}`, "utf8");
  reachable.set(name, code);
  for (const match of code.matchAll(
    /(?:from\s*|import\s*|import\(\s*)["']\.\/([^"']+\.js)["']/g,
  ))
    visit(match[1]);
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
assert.match(html, /Real-model population/);
assert.match(html, /1 source specimen/);
assert.match(html, /Distance cloud · default/);
assert.match(html, /Shuffle angles/);
assert.match(html, /unsupported positions/);
assert.match(componentCode, /Run .*cells|Population complete/);
assert.match(methods, /200 million node-steps/);
assert.match(html, /Whole implant/);
assert.match(componentCode, /recording-only in this laboratory/);
assert.match(methods, /single-implants/);
assert.match(html, /Applied extracellular tissue potential|Tissue scale/);
assert.match(componentCode, /extracellular-soma-spike/);
const index = JSON.parse(readFileSync("dist/search-index.json", "utf8"));
const entries = Array.isArray(index) ? index : index.entries;
assert.ok(
  entries.some((entry) => entry.href === "/cortex/"),
  "Cortex Laboratory missing from site search",
);
assert.match(
  readFileSync("dist/simulations/index.html", "utf8"),
  /href="\/cortex\/"/,
);
console.log(
  `Cortex static artifact checks passed: routes, provenance labels, search, ${component}, ${worker}. Browser QA remains pending.`,
);
