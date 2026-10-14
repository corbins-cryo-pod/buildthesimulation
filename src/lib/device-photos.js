import photos from '../data/device-photos.json' with { type: 'json' };
import references from '../data/device-photo-references.json' with { type: 'json' };

// An image belongs to one documented device/version, never to a whole
// family by implication. Research and rights records live beside this index.
export const devicePhotos = photos;
export const devicePhotoReferences = references;

export function getDevicePhotoReference(deviceId) {
  return devicePhotoReferences[deviceId] ?? null;
}

export function getDevicePhoto(deviceId) {
  return devicePhotos[deviceId] ?? null;
}

export function getDevicePhotos(deviceId) {
  const lead = getDevicePhoto(deviceId);
  return lead ? [lead, ...(lead.additionalViews ?? [])] : [];
}

// Card selection can favor the clearest overview without changing the
// source order the owner selected for the full device gallery.
export function getDeviceCardPhoto(deviceId) {
  const lead = getDevicePhoto(deviceId);
  if (!lead?.cardViewSrc) return lead;
  const view = getDevicePhotos(deviceId).find(photo => photo.src === lead.cardViewSrc);
  return view ? { ...lead, ...view, additionalViews: lead.additionalViews } : lead;
}

export function getPicturedEntry(entries, representative) {
  if (representative?.photo) return representative;
  return entries.find(entry => entry.photo) ?? null;
}
