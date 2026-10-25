/** Read-only operations on measured excerpts. No synthesis, interpolation or filtering. */
export const SCHEMA = 'bts-recording-v1';
export function validateRecording(data) {
  if (data?.schema !== SCHEMA || typeof data.id !== 'string' || !Array.isArray(data.segments) || !data.segments.length) throw new Error('Unrecognized recording format.');
  for (const segment of data.segments) {
    if (!Number.isFinite(segment.sampleRateHz) || segment.sampleRateHz <= 0 || segment.sampleRateHz > 1000000) throw new Error('Invalid sampling rate.');
    if (!Array.isArray(segment.channels) || !segment.channels.length || segment.channels.length > 2048) throw new Error('Invalid channel list.');
    const count = segment.channels[0].samples?.length;
    if (!Number.isInteger(count) || count < 2 || count > 2000000) throw new Error('Invalid sample count.');
    const ids = new Set();
    for (const channel of segment.channels) {
      if (ids.has(String(channel.id))) throw new Error('Duplicate channel identifier.');
      ids.add(String(channel.id));
      if (!Array.isArray(channel.samples) || channel.samples.length !== count || channel.samples.some(n => n !== null && !Number.isFinite(n))) throw new Error('Invalid or misaligned samples.');
      if (!channel.unit && !segment.unit) throw new Error('Missing signal units.');
      if (channel.summaryWaveform && (!channel.summaryWaveform.values.every(Number.isFinite) || !(channel.summaryWaveform.sampleRateHz > 0))) throw new Error('Invalid waveform summary.');
      if (channel.position && (!Number.isFinite(channel.position.x) || !Number.isFinite(channel.position.y) || !channel.position.unit)) throw new Error('Invalid contact coordinates.');
    }
    for (const event of segment.events ?? []) {
      if (!Number.isFinite(event.timeSeconds) || event.timeSeconds < 0 || event.timeSeconds > count / segment.sampleRateHz || (event.durationSeconds != null && (!Number.isFinite(event.durationSeconds) || event.durationSeconds < 0))) throw new Error('Event outside excerpt.');
    }
  }
  return data;
}
export function sampleBounds(length, sampleRate, startSeconds, windowSeconds) {
  const count = Math.max(2, Math.min(length, Math.round(windowSeconds * sampleRate)));
  const start = Math.max(0, Math.min(length - count, Math.floor(startSeconds * sampleRate + 1e-7)));
  return [start, start + count];
}
export function statistics(samples, start = 0, end = samples.length) {
  let min = Infinity, max = -Infinity, sum = 0, square = 0, count = 0;
  for (let i = start; i < end; i++) { const x = samples[i]; if (x === null || !Number.isFinite(x)) continue; min = Math.min(min, x); max = Math.max(max, x); sum += x; square += x * x; count++; }
  return count ? { min, max, mean: sum / count, rms: Math.sqrt(square / count), peakToPeak: max - min, sum, count } : { min: null, max: null, mean: null, rms: null, peakToPeak: null, sum: 0, count: 0 };
}
/** Extrema per horizontal pixel: narrow spikes and artifacts survive zoom-out. */
export function envelope(samples, start, end, pixels) {
  const buckets = Math.min(end - start, Math.max(1, Math.floor(pixels))), out = [];
  for (let i = 0; i < buckets; i++) {
    const a = start + Math.floor(i * (end - start) / buckets), b = start + Math.floor((i + 1) * (end - start) / buckets);
    const stats = statistics(samples, a, b);
    out.push({ start: a, end: b, min: stats.min, max: stats.max });
  }
  return out;
}
export function formatNumber(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return Math.abs(value) >= 10000 || Math.abs(value) < .001 ? value.toExponential(2) : Number(value.toPrecision(5)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}
export function timeLabel(seconds, span = 1) { return span < .5 ? `${(seconds * 1000).toFixed(span < .01 ? 2 : 1)} ms` : `${seconds.toFixed(span < 10 ? 3 : 2)} s`; }
export function csvForChannel(recording, segment, channel) {
  const quote = x => `"${String(x).replaceAll('"', '""')}"`;
  return ['# ' + recording.title, '# Source: ' + recording.sourceUrl, '# Time: seconds from excerpt start; values retained as released/prepared', `time_s,${quote(`${channel.label} (${channel.unit || segment.unit})`)}`, ...channel.samples.map((v, i) => `${(i / segment.sampleRateHz).toPrecision(12)},${v === null ? '' : v}`)].join('\n') + '\n';
}
