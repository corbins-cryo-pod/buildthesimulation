import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const path = 'simulations/utah-array-fabrication/';
const sha = input => createHash('sha256').update(input).digest('hex');

test('Utah Array public workflow links from the equipment register and preserves the verified engine', () => {
  const html = read('public/' + path + 'index.html');
  const engine = html.match(/<script id="bts-app">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(engine);
  assert.equal(sha(engine), 'e536009f4e0ad038b6883cde5b54bdc8a89b300606ee8aebdd415635eccccdd6');
  assert.ok(read('src/pages/simulations/equipment/index.astro').includes('href="/' + path + '"'));
  assert.ok(html.includes('rel="canonical" href="https://buildthesimulation.com/' + path + '"'));
  assert.ok(html.includes('PUBLIC / SIMULATION'));
  assert.ok(html.includes('Geometry and symbolic IDs only'));
  assert.ok(html.includes('id="palace-plan"'));
  assert.doesNotMatch(html, /PRIVATE \/ OFFLINE|sediment:\/\/|localhost:[0-9]+|libfile_[\w-]{18,}/);
});
