// Static artifact assertions, not interactive browser QA. Run after npm run build.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ENGINE_VERSION } from '../src/lib/cortex/config.js';
const html = readFileSync('dist/cortex/index.html', 'utf8');
const methods = readFileSync('dist/cortex/methods/index.html', 'utf8');
assert.match(html, /From membrane to contact/);
assert.match(html, /Exploratory passive model/);
assert.match(html, /no experimental validation/);
assert.match(html, /cortex\/methods/);
assert.match(html, /client="load"/);
assert.match(methods, /NEURON 9\.0\.1/);
assert.match(methods, /LFPykit 0\.6\.2/);
assert.match(methods, /No experimental dataset/);
for (const match of html.matchAll(/(?:src|component-url|renderer-url)="(\/_astro\/[^"]+)"/g))
  assert.ok(existsSync(path.join('dist', match[1])), `Missing asset ${match[1]}`);
// Follow the current page's links, not the first matching file: incremental
// builds can leave older hashed assets in dist that must not satisfy this check.
const component = html.match(/component-url="\/_astro\/(CortexLaboratory\.[^"]+\.js)"/)?.[1];
assert.ok(component, 'Missing hydrated component');
const componentCode = readFileSync(`dist/_astro/${component}`, 'utf8');
const worker = readdirSync('dist/_astro').find(
  (f) =>
    /^worker[-.].*\.js$/.test(f) &&
    componentCode.includes(f) &&
    readFileSync(`dist/_astro/${f}`, 'utf8').includes(ENGINE_VERSION),
);
assert.ok(worker, 'Missing bundled numerical worker');
const index = JSON.parse(readFileSync('dist/search-index.json', 'utf8'));
const entries = Array.isArray(index) ? index : index.entries;
assert.ok(
  entries.some((entry) => entry.href === '/cortex/'),
  'Cortex Laboratory missing from site search',
);
assert.match(readFileSync('dist/simulations/index.html', 'utf8'), /href="\/cortex\/"/);
console.log(
  `Cortex static artifact checks passed: routes, provenance labels, search, ${component}, ${worker}. Browser QA remains pending.`,
);
