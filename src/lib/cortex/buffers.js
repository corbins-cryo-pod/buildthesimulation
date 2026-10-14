// Reuse for worker transport and measured output storage. Nested results and
// multiple typed views of one buffer are counted/transferred exactly once.
export function resultBuffers(value) {
  const seen = new Set(),
    buffers = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      buffers.add(v.buffer);
      return;
    }
    for (const x of Object.values(v)) walk(x);
  };
  walk(value);
  return [...buffers];
}
