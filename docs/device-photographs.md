# Device photographs

The device catalog uses real photographs and optical/electron micrographs, not generated hardware imagery or schematic renders. The manifest is `src/data/device-photos.json`. It records attribution, source and asset URLs, license, source hash, crop bounds, original dimensions, changes and version qualifications. Credits and licenses are visible beside each published image.

## Noncommercial scope

The site owner confirmed strictly noncommercial use on 9 October 2026. NeuroRoots and the Stanford microwire–CMOS photographs are CC BY-NC 4.0 and must not be reused commercially without separate permission. This confirmation does not grant permission to republish arbitrary manufacturer images. No cropped CC BY-NC-ND figures are included. ShareAlike image adaptations remain under the specific image license; this does not relicense the surrounding independent site.

The Connexus image comes from Paradromics' official media press kit and retains the requested Paradromics credit. It is not labeled Creative Commons. Archival or research prototypes are explicitly qualified, including Stentrode, DOT, SetPoint and Cochlear Nucleus. A family photograph does not verify another version's geometry or performance.

## Coverage and maintenance

The initial release contained 25 photographed device records. The follow-up release contains 31, adding NET, Flex2Chip, Neurotassel, Axonics, INBRAIN and PRIMA. The Stanford microwire and both DOT records now use higher-resolution originals recovered from the published PDFs, without synthetic enhancement. The source extraction page and image index are retained in the manifest.

The follow-up source review is tracked for every published device record in `src/data/device-photo-research.json`. Pending candidates are not public gallery images. Some need copyright permission, a clearer implanted-part view, a verified hardware version or photographic-type verification. Absence of an image does not mean no photograph exists. Two DOT records reference the same published prototype; they are not distinct hardware photographs. Altius remains pending: its article clears noncommercial reuse but does not establish that its polished product image is a camera photograph. The MIT fiber press image is licensed but is a researcher portrait, not a useful implanted-part close-up.

Use `scripts/prepare-device-photo.mjs` for reproducible panel extraction and WebP optimization. Do not remove original scale bars, fabricate dimensions, recolor hardware or replace real devices with generated images. Keep each source hash and extraction rectangle in the manifest and verify the local image dimensions. Recheck licensing before any commercial change to the site.

Tests cover catalog IDs, source/license fields, actual file dimensions and sizes, family/version attribution and viewer accessibility structure. Browser interaction and visual layout require a separate browser check when browser QA is available.
