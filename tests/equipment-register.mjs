import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

function data(path) {
  return JSON.parse(readFileSync(new URL('../src/data/equipment/' + path, import.meta.url)));
}

test('the reference edition keeps stable record IDs, source links and per-instrument plans', () => {
  const zones = data('zones.json');
  const sources = data('sources.json');
  const editionCounts = [7, 12, 12, 12, 12, 12, 15, 12, 12, 16, 10, 11, 15, 12, 14, 15];
  const seen = new Set();
  for (const [i, count] of editionCounts.entries()) {
    const zone = String(i + 1).padStart(2, '0');
    assert.ok(zones.some(z => z.id === zone));
    const records = data('zones/' + zone + '.json');
    for (const record of records) {
      assert.ok(record.id.startsWith(zone + '-') && !seen.has(record.id), record.id);
      seen.add(record.id);
      for (const field of ['model','geometryBrief','behaviorBrief','inputs','outputs','acceptance','geometryStatus','simulationStatus','integrationStatus']) {
        assert.ok(record[field]?.trim(), record.id + ' ' + field);
      }
      for (const ref of record.sources) assert.match(sources[ref].url, /^https?:\/\//, ref);
    }
    for (let n = 1; n <= count; n++) assert.ok(seen.has(zone + '-' + String(n).padStart(2, '0')));
  }
  for (let n = 1; n <= 79; n++) assert.ok(sources['S' + String(n).padStart(2,'0')]);
});
