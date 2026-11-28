import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));

test('every Foundry hub lab or bench has a unique, digest-locked deploy artifact', () => {
  const hub = read('src/pages/simulations/foundry/index.astro').toString();
  const links = [...hub.matchAll(/\blink\s*:\s*['"]((?:\/simulations)(?:\/[a-z0-9-]+)+\/)['"]/g)].map(m => m[1]);
  const entries = Object.values(JSON.parse(read('src/data/foundry-atlas/lab-releases.json')));
  assert.ok(links.length >= 17);
  assert.equal(new Set(links).size, links.length);
  assert.deepEqual(entries.map(e => e.url).sort(), links.sort());
  for (const {url, sha256} of entries) {
    assert.equal(createHash('sha256').update(read('public' + url + 'index.html')).digest('hex'), sha256, url);
  }
});
