import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { devicePhotos, getDevicePhoto, getDevicePhotos, getPicturedEntry } from '../src/lib/device-photos.js';

const visibleIds = new Set(fs.readdirSync('src/content/designs').filter(file => file.endsWith('.md')).flatMap(file => {
  const text = fs.readFileSync(`src/content/designs/${file}`, 'utf8');
  return /^draft: true$/m.test(text) ? [] : [text.match(/^device_id: ["']?([^"'\n]+)/m)?.[1]];
}));

test('photo records match a visible device and include accessible captions and rights', async () => {
  for (const deviceId of Object.keys(devicePhotos)) {
    assert(visibleIds.has(deviceId), `Unknown or unpublished pictured device: ${deviceId}`);
    const views = getDevicePhotos(deviceId);
    assert.equal(new Set(views.map(view => view.src)).size, views.length, `${deviceId}: do not repeat the same image`);
    for (const photo of views) {
    for (const field of ['alt', 'kind', 'caption', 'credit', 'sourceLabel', 'license', 'changes']) assert(photo[field]?.trim(), `${deviceId}: missing ${field}`);
    assert(['Photograph', 'Optical micrograph', 'Electron micrograph', 'Source figure'].includes(photo.kind), `${deviceId}: identify the image accurately`);
    for (const field of ['sourceUrl', 'sourceAssetUrl', 'licenseUrl']) assert.equal(new URL(photo[field]).protocol, 'https:', `${deviceId}: ${field}`);
    assert(photo.width > 0 && photo.height > 0);
    if (photo.crop) {
      assert(photo.crop.width > 0 && photo.crop.height > 0);
      assert(photo.crop.left >= 0 && photo.crop.top >= 0);
      assert(photo.crop.left + photo.crop.width <= photo.sourceDimensions.width);
      assert(photo.crop.top + photo.crop.height <= photo.sourceDimensions.height);
    }
    if (photo.sourceExtraction) {
      assert(Number.isInteger(photo.sourceExtraction.pdfPage) && photo.sourceExtraction.pdfPage > 0);
      assert(Number.isInteger(photo.sourceExtraction.pdfImageIndex) && photo.sourceExtraction.pdfImageIndex >= 0);
      assert.deepEqual(photo.sourceExtraction.sourceFigureDimensions, photo.sourceDimensions);
    }
    assert(/^[a-f0-9]{64}$/.test(photo.sourceSha256), `${deviceId}: keep original-image integrity record`);
    if (/\bND\b/.test(photo.license)) assert.equal(photo.preserveSource, true, `${deviceId}: preserve no-derivatives sources intact`);
    if (photo.preserveSource) {
      assert.equal(photo.crop, null);
      assert.equal(photo.src, photo.thumbnail);
      assert.equal(createHash('sha256').update(fs.readFileSync(`public${photo.src}`)).digest('hex'), photo.sourceSha256, `${deviceId}: unchanged source bytes`);
    }
    for (const field of ['src', 'thumbnail']) {
      assert(/^\/images\/devices\/[a-z0-9-]+\.(webp|jpg|png)$/.test(photo[field]));
      const file = `public${photo[field]}`;
      assert(fs.existsSync(file), `Missing local image: ${file}`);
      const actual = await sharp(file).metadata();
      assert(['webp', 'jpeg', 'png'].includes(actual.format));
      if (field === 'src') {
        assert.equal(photo.width, actual.width);
        assert.equal(photo.height, actual.height);
      } else {
        assert.equal(photo.thumbnailWidth, actual.width);
        assert.equal(photo.thumbnailHeight, actual.height);
      }
      assert(fs.statSync(file).size < (photo.preserveSource ? 6_000_000 : 900_000), `Unnecessarily heavy image: ${file}`);
    }
    }
  }
  assert.equal(getDevicePhoto('not-a-device'), null);
  assert.deepEqual(getDevicePhotos('not-a-device'), []);
});

test('device image lookup returns the lead and all separately credited views', () => {
  for (const [id, lead] of Object.entries(devicePhotos)) {
    assert.equal(getDevicePhotos(id)[0], lead);
    assert.deepEqual(getDevicePhotos(id).slice(1), lead.additionalViews ?? []);
  }
});

test('source review tracks every published record without auto-clearing pending candidates', () => {
  const audit = JSON.parse(fs.readFileSync('src/data/device-photo-research.json', 'utf8'));
  assert.equal(audit.noncommercialConfirmed, true);
  assert.deepEqual(new Set(Object.keys(audit.records)), visibleIds);
  for (const [id, entry] of Object.entries(audit.records)) {
    assert(entry.notes?.trim());
    assert(entry.researchStatus !== 'not-reviewed');
    assert.equal(entry.status, getDevicePhoto(id) ? 'published' : 'pending');
    if (entry.status === 'published') assert.equal(entry.image, getDevicePhoto(id).src);
    else assert.equal(entry.image, undefined);
  }
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
