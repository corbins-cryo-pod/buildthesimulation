import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { devicePhotos, getDevicePhoto, getPicturedEntry } from '../src/lib/device-photos.js';

const visibleIds = new Set(fs.readdirSync('src/content/designs').filter(file => file.endsWith('.md')).flatMap(file => {
  const text = fs.readFileSync(`src/content/designs/${file}`, 'utf8');
  return /^draft: true$/m.test(text) ? [] : [text.match(/^device_id: ["']?([^"'\n]+)/m)?.[1]];
}));

test('photo records match a visible device and include accessible captions and rights', async () => {
  for (const [deviceId, photo] of Object.entries(devicePhotos)) {
    assert(visibleIds.has(deviceId), `Unknown or unpublished pictured device: ${deviceId}`);
    for (const field of ['alt', 'kind', 'caption', 'credit', 'sourceLabel', 'license', 'changes']) assert(photo[field]?.trim(), `${deviceId}: missing ${field}`);
    assert(['Photograph', 'Optical micrograph', 'Electron micrograph'].includes(photo.kind), `${deviceId}: identify the image accurately`);
    for (const field of ['sourceUrl', 'sourceAssetUrl', 'licenseUrl']) assert.equal(new URL(photo[field]).protocol, 'https:', `${deviceId}: ${field}`);
    assert(photo.width > 0 && photo.height > 0);
    assert(/^[a-f0-9]{64}$/.test(photo.sourceSha256), `${deviceId}: keep original-image integrity record`);
    for (const field of ['src', 'thumbnail']) {
      assert(/^\/images\/devices\/[a-z0-9-]+\.webp$/.test(photo[field]));
      const file = `public${photo[field]}`;
      assert(fs.existsSync(file), `Missing local image: ${file}`);
      const actual = await sharp(file).metadata();
      assert.equal(actual.format, 'webp');
      if (field === 'src') {
        assert.equal(photo.width, actual.width);
        assert.equal(photo.height, actual.height);
      } else {
        assert.equal(photo.thumbnailWidth, actual.width);
        assert.equal(photo.thumbnailHeight, actual.height);
      }
      assert(fs.statSync(file).size < 900_000, `Unnecessarily heavy photograph: ${file}`);
    }
  }
  assert.equal(getDevicePhoto('not-a-device'), null);
});

test('families never silently attribute an older photograph to a new version', () => {
  const old = { slug: 'old', photo: { src: 'old.webp' } };
  const current = { slug: 'new', photo: null };
  assert.equal(getPicturedEntry([current, old], current), old);
  const currentWithPhoto = { ...current, photo: { src: 'new.webp' } };
  assert.equal(getPicturedEntry([old, currentWithPhoto], currentWithPhoto), currentWithPhoto);
  assert.equal(getPicturedEntry([current], current), null);
  const source = fs.readFileSync('src/components/DevicesDirectory.tsx', 'utf8');
  assert(source.includes('Pictured:'));
  assert(source.includes('Other family versions differ.'));
  assert(source.includes('if (photosOnly && !e.photo) return false'));
  assert(source.includes('url.searchParams.get("photos") === "1"'));
  assert(source.includes('setPhotosOnly(false)'));
});

test('photo viewer supports keyboard dismissal, focus return and no-JS fallback', () => {
  const component = fs.readFileSync('src/components/DevicePhotograph.astro', 'utf8');
  assert(component.includes('href={photo.src}'));
  assert(component.includes('method="dialog"'));
  assert(component.includes('dialog.showModal()'));
  assert(component.includes("dialog.addEventListener('close'"));
  assert(component.includes('opener.focus'));
  assert(component.includes('prefers-reduced-motion: reduce'));
  assert(component.includes('Image credit &amp; source'));
});
