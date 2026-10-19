// Binary archive preserves every typed sample. Header JSON holds geometry,
// protocol and provenance; buffers follow in an explicitly ordered payload.
const constructors = { Float32Array, Float64Array, Int16Array, Uint8Array, Uint32Array };
export function encodeInterfaceArchive(result, { quantizeMembraneMv = false } = {}) {
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
  const json = new TextEncoder().encode(header), bytes = new Uint8Array(8 + json.length + offset);
  bytes.set([67, 73, 70, 49]); new DataView(bytes.buffer).setUint32(4, json.length, true);
  bytes.set(json, 8); let position = 8 + json.length;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
  return bytes;
}
export function decodeInterfaceArchive(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes[0] !== 67 || bytes[1] !== 73 || bytes[2] !== 70 || bytes[3] !== 49) throw new Error('Invalid interface replay archive.');
  const headerSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true), start = 8 + headerSize;
  if (start > bytes.length) throw new Error('Incomplete interface replay archive.');
  return JSON.parse(new TextDecoder().decode(bytes.subarray(8, start)), (key, value) => {
    if (!value?.$array) return value;
    const Type = constructors[value.$array];
    if (!Type || !Number.isInteger(value.length) || value.length < 0 || !Number.isInteger(value.offset) || value.offset < 0 || start + value.offset + value.length * Type.BYTES_PER_ELEMENT > bytes.length)
      throw new Error('Invalid replay buffer.');
    const array = new Type(Uint8Array.from(bytes.subarray(start + value.offset, start + value.offset + value.length * Type.BYTES_PER_ELEMENT)).buffer);
    if (value.scale !== undefined && value.scale !== .01) throw new Error('Unsupported replay precision.');
    if (value.delta && (Type !== Int16Array || value.scale !== .01)) throw new Error('Invalid delta replay buffer.');
    if (value.delta) for (let i = 1; i < array.length; i++) array[i] += array[i - 1];
    return value.scale ? Float32Array.from(array, v => v * value.scale) : array;
  });
}
