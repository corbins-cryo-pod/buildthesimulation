// 07-02 already consumes arrays of reservations; its clock begins with the new chamber trace.
const validId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(id);
function checkedIdentity(sample) {
  if (!validId(sample?.sampleId) || !Number.isSafeInteger(sample.revision) || sample.revision < 1 ||
      !Array.isArray(sample.history) || !sample.history.every(row => row && typeof row === 'object' && !Array.isArray(row)) ||
      !Array.isArray(sample.contactIds ?? []) || !(sample.contactIds ?? []).every(id => typeof id === 'string')) {
    throw Error('Sample ID, revision, history or contact IDs are invalid for station 07-02.');
  }
  return {sampleId: sample.sampleId, parentRevision: sample.revision, history: structuredClone(sample.history), contactIds: [...(sample.contactIds ?? [])]};
}
export function reservationFromObservation(metadata) {
  if (metadata?.schema !== 'bts.equipment.07-03.observation.v1' || !['neurites','raster'].includes(metadata.acquisition?.fixture)) {
    throw Error('Capture a specimen before reserving an incubator shelf.');
  }
  const identity = checkedIdentity(metadata);
  const event = identity.history.at(-1);
  if (event?.deviceId !== '07-03' || event.revision !== identity.parentRevision) throw Error('Acquisition revision is missing from the sample history.');
  Object.assign(event, {source: metadata.source, acquisition: metadata.acquisition, pixelSizeUm: metadata.pixelSizeUm,
    fovUm: metadata.fovUm, rulerMeasurement: metadata.rulerMeasurement ?? null});
  return [{...identity, shelf: 1, enter_s: 0, leave_s: 60}];
}
export function samplesFromExposure(record) {
  if (record?.schema !== 'bts.incubator.exposure.v1' || record.deviceId !== '07-02' || !record.provenance?.kind ||
      !Array.isArray(record.samples) || !record.samples.length || record.samples.length > 12) {
    throw Error('Choose an exported 07-02 exposure record with sample histories.');
  }
  const samples = record.samples.map(sample => {
    const identity = checkedIdentity(sample);
    const entry = identity.history.at(-1);
    if (entry?.deviceId !== '07-02' || entry.revision !== identity.parentRevision) throw Error('The chamber history and sample revision disagree.');
    Object.assign(entry, {shelf: sample.shelf, exposureSource: record.provenance, statistics: sample.statistics});
    return identity;
  });
  if (new Set(samples.map(s => s.sampleId)).size !== samples.length) throw Error('Sample IDs in the chamber record must be unique.');
  return samples;
}
