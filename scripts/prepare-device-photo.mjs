import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Mechanical, reproducible extraction of a photographic panel. No generated
// content, background removal, retouching, recoloring, or scale invention.
// node scripts/prepare-device-photo.mjs SOURCE DEVICE_ID [CROP_JSON]
const [input, deviceId, cropJson] = process.argv.slice(2);
if (!input || !/^BTSD-[A-Z0-9-]+$/.test(deviceId ?? '')) {
  throw new Error('Expected an existing source image and a catalog device ID.');
}
const directory = path.resolve('public/images/devices');
await fs.mkdir(directory, { recursive: true });
const stem = deviceId.toLowerCase();
const full = path.join(directory, `${stem}.webp`);
const thumbnail = path.join(directory, `${stem}-640.webp`);
const bytes = await fs.readFile(input);
const metadata = await sharp(bytes).metadata();
const crop = cropJson ? JSON.parse(cropJson) : null;
if (crop) {
  for (const value of Object.values(crop)) if (!Number.isInteger(value) || value < 0) throw new Error('Crop bounds must be positive integer pixels.');
  if (!crop.width || !crop.height || crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) throw new Error('Crop exceeds source image bounds.');
}
const image = () => crop ? sharp(bytes).extract(crop) : sharp(bytes);
const result = await image().resize({ width: 1600, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92, effort: 6 }).toFile(full);
const small = await image().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toFile(thumbnail);
console.log(JSON.stringify({
  src: `/images/devices/${stem}.webp`,
  thumbnail: `/images/devices/${stem}-640.webp`,
  width: result.width,
  height: result.height,
  thumbnailWidth: small.width,
  thumbnailHeight: small.height,
  sourceDimensions: { width: metadata.width, height: metadata.height },
  crop,
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  fullBytes: result.size,
}));
