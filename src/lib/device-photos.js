import photos from '../data/device-photos.json' with { type: 'json' };

// A photograph belongs to one documented device/version, never to a whole
// family by implication. Research and rights records live beside this index.
export const devicePhotos = photos;

export function getDevicePhoto(deviceId) {
  return devicePhotos[deviceId] ?? null;
}

export function getPicturedEntry(entries, representative) {
  if (representative?.photo) return representative;
  return entries.find(entry => entry.photo) ?? null;
}
