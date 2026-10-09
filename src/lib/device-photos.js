import photos from '../data/device-photos.json' with { type: 'json' };

// An image belongs to one documented device/version, never to a whole
// family by implication. Research and rights records live beside this index.
export const devicePhotos = photos;

export function getDevicePhoto(deviceId) {
  return devicePhotos[deviceId] ?? null;
}

export function getDevicePhotos(deviceId) {
  const lead = getDevicePhoto(deviceId);
  return lead ? [lead, ...(lead.additionalViews ?? [])] : [];
}

export function getPicturedEntry(entries, representative) {
  if (representative?.photo) return representative;
  return entries.find(entry => entry.photo) ?? null;
}
