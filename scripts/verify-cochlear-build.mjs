// Static artifact graph assertions; numerical checks and browser QA are separate.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { MODEL_VERSION } from '../src/lib/cochlear/config.js';
const root = 'dist', route = '/simulations/cochlear-implant/';
const html = readFileSync(`${root}${route}index.html`, 'utf8'), methods = readFileSync(`${root}${route}methods/index.html`, 'utf8');
assert.match(html, /Cochlear Implant Laboratory/); assert.match(html, /client="load"/);
assert.ok(html.includes(`data-model-version="${MODEL_VERSION}"`)); assert.ok(html.includes(`href="${route}methods/"`));
assert.match(methods, /unbounded, homogeneous/); assert.match(methods, /0 mV/); assert.match(methods, /cosine/i); assert.match(methods, /10\.3389\/fnins\.2019\.01173/);
assert.match(methods, /OpenEar ZETA/); assert.match(methods, /CC BY 4\.0/); assert.match(methods, /19 physical pads/);
assert.match(methods, /id="anatomy"/); assert.match(methods, /id="implants"/);
const atlas = JSON.parse(readFileSync(`${root}/assets/cochlear/openear-zeta-atlas.json`, 'utf8'));
assert.equal(atlas.schema, 'cochlear-anatomy-atlas-v1'); assert.equal(atlas.units, 'mm');
assert.ok(atlas.meshes.some(mesh => mesh.id === 'scala-tympani' && mesh.indices.length > 1000), 'Missing measured cochlear surface asset');
const entry = html.match(/component-url="\/_astro\/(CochlearLaboratory\.[^"]+\.js)"/)?.[1]; assert.ok(entry, 'Missing hydrated cochlear laboratory entry');
const modules = new Map();
function visit(name) { if (modules.has(name)) return; const code = readFileSync(`${root}/_astro/${name}`, 'utf8'); modules.set(name, code); for (const m of code.matchAll(/(?:from\s*|import\s*|import\(\s*)["']\.\/([^"']+\.js)["']/g)) visit(m[1]); }
visit(entry); const code = [...modules.values()].join('\n');
assert.match(code, /openear-zeta-atlas\.json/); assert.match(code, /cochlear-ci632/); assert.match(code, /medel-flex28/); assert.match(code, /ab-mid-scala/);
const worker = code.match(/new Worker\(new URL\(["']\/_astro\/(worker[-.][^"']+\.js)["']/)?.[1]; assert.ok(worker, 'Missing reachable cochlear numerical worker');
const workerCode = readFileSync(`${root}/_astro/${worker}`, 'utf8'); assert.match(workerCode, /rattay-2001-deterministic-65/); assert.match(workerCode, /Conductivity and contact radius must be positive/); assert.match(workerCode, /Solving auditory nerve/);
for (const m of html.matchAll(/(?:src|component-url|renderer-url)="(\/_astro\/[^"]+)"/g)) assert.ok(existsSync(path.join(root, m[1])), `Missing page asset ${m[1]}`);
for (const font of ['C059-Roman.otf', 'C059-Italic.otf', 'C059-Bold.otf', 'URWGothic-Demi.otf']) assert.ok(existsSync(`${root}/fonts/urw-base35/${font}`));
assert.ok(readFileSync(`${root}/simulations/index.html`, 'utf8').includes(`href="${route}"`), 'Missing simulations catalogue entry');
const search = JSON.parse(readFileSync(`${root}/search-index.json`, 'utf8')); assert.ok((Array.isArray(search) ? search : search.entries).some(e => e.href === route), 'Missing search entry');
console.log(`Cochlear build verified: laboratory, methods, measured atlas, implant references, catalogue, search, local fonts, ${entry}, ${worker}.`);
