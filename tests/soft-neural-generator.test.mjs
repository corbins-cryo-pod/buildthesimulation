import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInThisContext, Script } from 'node:vm';

const root = new URL('../public/simulations/soft-neural-generator/', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const source = read('engine.js');
const model = { exports: {} };
runInThisContext('(function(module,exports){\n' + source + '\n})', { filename: 'soft-neural-generator/engine.js' })(model, model.exports);
const { Simulation, PRESETS } = model.exports;
const html = read('index.html');

test('soft neural generator retains the reviewed engine, renderer and controls byte-for-byte', () => {
  for (const [name, sha] of Object.entries({
    'engine.js': '14ecafa11aea0f4fb971b3869fc8b86ab37fd0ff',
    'renderer.js': 'bef541c0e5da51be5fa43da84ebcf4a180bdf26a',
    'app.js': '39e5f2cb44d886f36c268fa8fdaacae6a8a96f3e'
  })) {
    const bytes = readFileSync(new URL(name, root));
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), sha);
    assert.doesNotThrow(() => new Script(bytes.toString('utf8'), { filename: name }));
  }
});

test('soft neural generator has its own static route, notice and complete local scripts', () => {
  assert.match(html, /Separate mechanics test/);
  assert.match(html, /Whole-cell crawling remains weak/);
  assert.match(html, /href="\/simulations\/cell-growth\/"/);
  assert.match(html, /https:\/\/buildthesimulation.com\/simulations\/soft-neural-generator\//);
  assert.doesNotMatch(html, /\/\*(ENGINE|RENDERER|APP|REFERENCES)\*\//);
  const scripts = [...html.matchAll(/<script src="\.\/([^\"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['engine.js', 'renderer.js', 'app.js']);
  for (const name of scripts) assert.ok(existsSync(new URL(name, root)));
  assert.ok(existsSync(new URL('README.md', root)));
  assert.ok(!existsSync(new URL('../src/pages/simulations/soft-neural-generator.astro', import.meta.url)));
  assert.ok(!existsSync(new URL('../src/pages/simulations/soft-neural-generator/index.astro', import.meta.url)));
});

test('soft neural generator reference media is optional and has a publisher fallback', () => {
  assert.match(html, /preload="none"/);
  assert.match(html, /id="referenceError"/);
  assert.match(html, /elifesciences.org\/articles\/12387\/figures#videos/);
  assert.doesNotMatch(html, /data:video\/mp4;base64/);
  for (const n of [2, 4, 5, 7]) assert.match(html, new RegExp(`elife-12387-media${n}\\.mp4`));
});

test('soft neural generator retains six experiments and begins with a round finite cell', () => {
  assert.equal(Object.keys(PRESETS).length, 6);
  const s = new Simulation();
  assert.equal(s.cells.length, 1);
  assert.equal(s.cells[0].height, 16);
  assert.equal(s.cells[0].processes.length, 0);
  assert.ok(s.cells[0].r.every(r => r === 8));
  assert.equal(s.material(s.cells[0]), 620);
});

test('soft neural generator develops one arm without fabricating material', () => {
  const s = new Simulation();
  s.advance(90);
  assert.equal(s.cells[0].processes.length, 1);
  assert.ok(s.metrics().length > 8);
  assert.ok(s.stats.arrivals > 0);
  assert.ok(Math.abs(s.metrics().budgetError) < 1e-7);
});

test('soft neural generator spreading depends on adhesion', () => {
  const a = new Simulation({ preset: 'spread', params: { noise: 0 } });
  const b = new Simulation({ preset: 'spread', params: { noise: 0, adhesion: 0 } });
  a.advance(45); b.advance(45);
  assert.ok(a.metrics().spread > 2);
  assert.ok(Math.abs(b.metrics().spread - 1) < 0.001);
  assert.ok(a.metrics().height >= 4.6 - 1e-7);
});

test('soft neural generator save/restore retains the exact seeded trajectory', () => {
  const a = new Simulation({ preset: 'pair', seed: 17 });
  a.advance(20);
  const b = Simulation.restore(a.snapshot());
  a.advance(5); b.advance(5);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('soft neural generator population preset preserves separate cell budgets', () => {
  const s = new Simulation({ preset: 'culture' });
  s.advance(5);
  assert.equal(s.cells.length, 25);
  for (const c of s.cells) assert.ok(Math.abs(s.material(c) - 620) < 1e-7);
});
