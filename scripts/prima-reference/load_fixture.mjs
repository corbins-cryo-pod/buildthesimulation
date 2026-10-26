import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const defaultManifest = new URL('../../tests/fixtures/prima-percept/manifest.json', import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Reconstruct and verify the original JSON bytes before parsing. */
export function loadPerceptFixture(manifestUrl = defaultManifest) {
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  if (manifest.schema !== 'bts.prima.percept.storage.v1' || manifest.maximumChunkBytes !== 65536 || !Array.isArray(manifest.chunks) || !manifest.chunks.length) {
    throw new Error('Unsupported PRIMA percept fixture manifest.');
  }
  const chunks = manifest.chunks.map((entry, index) => {
    if (entry.file !== `chunk-${String(index).padStart(4, '0')}.txt` || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 1 || entry.byteLength > manifest.maximumChunkBytes) {
      throw new Error('Invalid PRIMA reference chunk definition.');
    }
    const bytes = readFileSync(new URL(entry.file, manifestUrl));
    if (bytes.length !== entry.byteLength || sha256(bytes) !== entry.sha256) throw new Error(`PRIMA reference chunk checksum mismatch: ${entry.file}`);
    return bytes;
  });
  const bytes = Buffer.concat(chunks);
  if (bytes.length !== manifest.byteLength || sha256(bytes) !== manifest.sha256) throw new Error('PRIMA reference fixture checksum mismatch.');
  return JSON.parse(bytes.toString('ascii'));
}
