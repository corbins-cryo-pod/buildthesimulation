// A PNG iTXt chunk keeps specimen-plane units and identity with the displayed image.
export function embedAcquisition(png, metadata) {
  const end = png.length - 12;
  const signature = [137,80,78,71,13,10,26,10];
  if (end < 8 || !signature.every((v,i) => png[i] === v) || String.fromCharCode(...png.slice(end+4,end+8)) !== 'IEND') {
    throw Error('The image encoder did not return a complete PNG.');
  }
  const encoder = new TextEncoder();
  const payload = encoder.encode('bts.acquisition\0\0\0\0\0' + JSON.stringify(metadata));
  const chunk = new Uint8Array(payload.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  chunk.set(encoder.encode('iTXt'),4);
  chunk.set(payload,8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4,-4)) {
    crc ^= byte;
    for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  view.setUint32(chunk.length-4,(crc ^ 0xffffffff) >>> 0);
  const bytes = new Uint8Array(png.length+chunk.length);
  bytes.set(png.subarray(0,end));
  bytes.set(chunk,end);
  bytes.set(png.subarray(end),end+chunk.length);
  return bytes;
}
