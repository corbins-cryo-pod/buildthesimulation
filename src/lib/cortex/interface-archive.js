// CIF1 uses little-endian typed samples. Header JSON holds geometry, protocol
// and provenance; buffers follow in an explicitly ordered, bounded payload.
const constructors = { Float32Array, Float64Array, Int16Array, Uint8Array, Uint32Array };
export const MAX_INTERFACE_ARCHIVE_BYTES = 192 * 1024 ** 2;
const MAX_HEADER_BYTES = 24 * 1024 ** 2;
function requireLittleEndian() {
  if (new Uint8Array(Uint16Array.of(1).buffer)[0] !== 1)
    throw new Error('CIF1 replay requires a little-endian platform.');
}
export function encodeInterfaceArchive(result, { quantizeMembraneMv = false } = {}) {
  requireLittleEndian();
  const chunks = []; let offset = 0;
  const header = JSON.stringify(result, (key, value) => {
    if (!ArrayBuffer.isView(value)) return value;
    let scale, delta;
    if (quantizeMembraneMv && key === 'membraneMv') {
      for (const v of value) if (!Number.isFinite(v) || Math.abs(v) > 327.67) throw new Error('Membrane sample outside replay encoding range.');
      value = Int16Array.from(value, v => Math.round(v * 100)); scale = .01;
      // Adjacent cable samples vary smoothly. Reversible signed 16-bit deltas
      // compress better without changing the declared 0.01 mV precision.
      for (let i = value.length - 1; i > 0; i--) value[i] -= value[i - 1];
      delta = true;
    }
    const record = { $array: value.constructor.name, offset, length: value.length, scale, delta };
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    chunks.push(bytes); offset += bytes.byteLength; return record;
  });
  const json = new TextEncoder().encode(header);
  if (json.length > MAX_HEADER_BYTES || 8 + json.length + offset > MAX_INTERFACE_ARCHIVE_BYTES)
    throw new Error('Replay exceeds the supported archive size.');
  const bytes = new Uint8Array(8 + json.length + offset);
  bytes.set([67, 73, 70, 49]); new DataView(bytes.buffer).setUint32(4, json.length, true);
  bytes.set(json, 8); let position = 8 + json.length;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
  return bytes;
}
export function decodeInterfaceArchive(input) {
  requireLittleEndian();
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 8) throw new Error('Incomplete interface replay archive.');
  if (bytes.length > MAX_INTERFACE_ARCHIVE_BYTES) throw new Error('Replay exceeds the supported archive size.');
  if (bytes[0] !== 67 || bytes[1] !== 73 || bytes[2] !== 70 || bytes[3] !== 49) throw new Error('Invalid interface replay archive.');
  const headerSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true), start = 8 + headerSize;
  if (headerSize > MAX_HEADER_BYTES) throw new Error('Replay header exceeds the supported size.');
  if (start > bytes.length) throw new Error('Incomplete interface replay archive.');
  let allocatedBytes = 0;
  const intervals = [];
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(8, start)), (key, value) => {
    if (!value?.$array) return value;
    const Type = constructors[value.$array];
    if (!Object.hasOwn(constructors, value.$array) || !Number.isSafeInteger(value.length) || value.length < 0 || !Number.isSafeInteger(value.offset) || value.offset < 0 || start + value.offset + value.length * Type.BYTES_PER_ELEMENT > bytes.length)
      throw new Error('Invalid replay buffer.');
    if (value.scale !== undefined && value.scale !== .01) throw new Error('Unsupported replay precision.');
    if (value.delta && (Type !== Int16Array || value.scale !== .01)) throw new Error('Invalid delta replay buffer.');
    if (value.scale !== undefined && Type !== Int16Array) throw new Error('Invalid scaled replay buffer.');
    const end = value.offset + value.length * Type.BYTES_PER_ELEMENT;
    if (value.length && intervals.some(([a, b]) => value.offset < b && end > a)) throw new Error('Overlapping replay buffers.');
    intervals.push([value.offset, end]);
    allocatedBytes += value.length * (value.scale ? 4 + Type.BYTES_PER_ELEMENT : Type.BYTES_PER_ELEMENT);
    if (allocatedBytes > MAX_INTERFACE_ARCHIVE_BYTES || intervals.length > 4096) throw new Error('Replay allocation exceeds the supported size.');
    const array = new Type(Uint8Array.from(bytes.subarray(start + value.offset, start + end)).buffer);
    if (value.delta) for (let i = 1; i < array.length; i++) array[i] += array[i - 1];
    return value.scale ? Float32Array.from(array, v => v * value.scale) : array;
  });
}
