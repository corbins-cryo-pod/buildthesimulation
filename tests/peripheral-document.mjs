import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPeripheralDocument, parsePeripheralDocument, PERIPHERAL_RESTORE_NOTE } from '../src/lib/peripheral/document.js';
const geometry = () => ({ nerve: { cx: 568.4, cy: 270.4, r: 171.6 }, fascicles: [{ x: 568.4, y: 270.4, r: 151.008 }], electrodes: [{ id: 'a32f', type: 'intra', x: 580, y: 270, recEnabled: true }], stim: { amp: 40, falloff: 24, thresh: 55 }, wave: { freqHz: 20, durMs: 450 }, view: { s: 1, ox: 0, oy: 0 }, scale: { nerveDiameterMm: 2, axonCount: 1000 } });

test('peripheral geometry document round-trips without claiming an activity replay', () => {
  const doc = createPeripheralDocument(geometry());
  const parsed = parsePeripheralDocument(JSON.stringify(doc));
  assert.deepEqual(parsed.document, doc);
  assert.equal(parsed.migratedFrom, null);
  assert.equal(doc.restoreNote, PERIPHERAL_RESTORE_NOTE);
  assert(doc.restoreNote.includes('regenerated'));
  assert.equal(doc.schema, 'bts-peripheral-sandbox');
  assert.equal(doc.version, 1);
});

test('legacy versionless exports migrate explicitly with bounded deterministic defaults', () => {
  const old = geometry(); delete old.electrodes[0].recEnabled;
  const parsed = parsePeripheralDocument(old);
  assert.equal(parsed.migratedFrom, 'legacy-versionless');
  assert.equal(parsed.document.electrodes[0].recEnabled, true);
  assert.deepEqual(parsed.document.scale, old.scale);
  const minimal = { nerve: old.nerve, fascicles: old.fascicles, electrodes: [] };
  assert.equal(parsePeripheralDocument(minimal).document.scale.axonCount, 1000);
  assert.equal(parsePeripheralDocument(minimal).document.stim.amp, 40);
});

test('malformed, unsupported and excessive documents fail before population allocation', () => {
  const invalid = [
    d => { d.scale.axonCount = 1e9; }, d => { d.scale.axonCount = -1; }, d => { d.scale.axonCount = 3.2; },
    d => { d.scale.axonCount = '1000'; }, d => { d.scale.nerveDiameterMm = 3; }, d => { d.nerve.r = Infinity; },
    d => { d.nerve.r = 1e6; }, d => { d.nerve.r = NaN; }, d => { d.nerve.cx = null; },
    d => { d.fascicles = []; }, d => { d.fascicles.push({ ...d.fascicles[0] }); }, d => { d.fascicles[0].r = 300; },
    d => { d.electrodes[0].x = 9999; }, d => { d.electrodes[0].type = 'cuff'; }, d => { d.electrodes[0].recEnabled = 'false'; },
    d => { d.electrodes[0].id = '<img>'; }, d => { d.electrodes.push({ ...d.electrodes[0] }); },
    d => { d.electrodes = Array.from({ length: 11 }, (_, i) => ({ ...d.electrodes[0], id: `e${i}` })); },
    d => { d.view.s = 0; }, d => { d.view.ox = -Infinity; }, d => { d.wave.freqHz = 201; },
    d => { d.wave.durMs = 1e6; }, d => { d.stim.falloff = 0; }, d => { d.stim.amp = 101; },
    d => { d.unknown = {}; }, d => { d.nerve.unknown = 0; }, d => { d.stim = true; },
  ];
  for (const mutate of invalid) { const d = geometry(); mutate(d); assert.throws(() => parsePeripheralDocument(d)); }
  assert.throws(() => parsePeripheralDocument('{'), /valid JSON/);
  assert.throws(() => parsePeripheralDocument(' '.repeat(65537)), /65,536/);
  const doc = createPeripheralDocument(geometry());
  assert.throws(() => parsePeripheralDocument({ ...doc, version: 2 }), /version 1/);
  assert.throws(() => parsePeripheralDocument({ ...doc, units: 'mm' }), /units/);
  assert.throws(() => parsePeripheralDocument({ ...geometry(), version: 1 }), /version 1/);
});

test('imported stimulus and waveform controls match the integer slider steps', () => {
  for (const [section, key] of [['stim', 'amp'], ['stim', 'falloff'], ['stim', 'thresh'], ['wave', 'freqHz'], ['wave', 'durMs']]) {
    for (const versioned of [false, true]) {
      const doc = versioned ? createPeripheralDocument(geometry()) : geometry();
      doc[section][key] += .5;
      assert.throws(() => parsePeripheralDocument(JSON.stringify(doc)), error =>
        error.message.startsWith(`${section}.${key} must be an integer`));
    }
  }
  const valid = geometry();
  valid.view = { s: 1.25, ox: 10.5, oy: -2.75 };
  assert.deepEqual(parsePeripheralDocument(valid).document.view, valid.view);
});

test('page validates before building axons or replacing model state and displays parser errors', () => {
  const source = fs.readFileSync(new URL('../src/pages/sim.astro', import.meta.url), 'utf8');
  const importer = source.slice(source.indexOf('function importModel'), source.indexOf('function openDialog'));
  assert(importer.indexOf('parsePeripheralDocument(txt)') < importer.indexOf('buildAxonSites('));
  assert(importer.indexOf('buildAxonSites(') < importer.indexOf('model = {'));
  assert(source.includes('$("dlgError").textContent = error instanceof Error ? error.message'));
  assert(source.includes('Legacy document migrated'));
});
