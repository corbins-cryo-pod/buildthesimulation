import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeInterfaceArchive, decodeInterfaceArchive } from '../src/lib/cortex/interface-archive.js';
test('replay archive preserves typed signals, nested geometry and declared Vm precision', () => {
  const source = { timeMs: Float64Array.of(0,.1,.2), cells: [{ membraneMv: Float32Array.of(-70.1234, 0, 32.1118), nodes: [{ centerUm: [1,2,3] }] }], neuralUv: Float64Array.of(.012345678901234, -4.5) };
  const full = decodeInterfaceArchive(encodeInterfaceArchive(source));
  assert.deepEqual(full, source);
  assert.deepEqual(decodeInterfaceArchive(Buffer.from(encodeInterfaceArchive(source))), source);
  const compact = decodeInterfaceArchive(encodeInterfaceArchive(source, { quantizeMembraneMv: true }));
  assert.deepEqual(compact.neuralUv, source.neuralUv);
  assert.deepEqual(compact.timeMs, source.timeMs);
  assert.deepEqual(compact.cells[0].nodes, source.cells[0].nodes);
  for (let i=0;i<3;i++) assert.ok(Math.abs(compact.cells[0].membraneMv[i]-source.cells[0].membraneMv[i]) <= .0051);
  assert.throws(() => decodeInterfaceArchive(new Uint8Array(10)), /Invalid/);
  assert.throws(() => decodeInterfaceArchive(encodeInterfaceArchive(source).slice(0,50)), /Incomplete/);
  const extremes = { membraneMv: Float32Array.of(-249.99,149.99,-249.99,0) };
  assert.deepEqual(decodeInterfaceArchive(encodeInterfaceArchive(extremes, { quantizeMembraneMv: true })), extremes);
});
