import { nearestFrame } from './electrical.js';

// Events come from internal integration, independently of retained output frames.
export function currentStepSummary(result) {
  if (!result?.spikes || result.config.protocol.mode !== 'intracellular-current') return null;
  const { startMs, durationMs } = result.config.protocol;
  const during = (timeMs) => timeMs >= startMs && timeMs < startMs + durationMs;
  const times = result.spikes.map((s) => s.timeMs).filter(during);
  return {
    spikeCount: times.length,
    countRateHz: times.length * 1000 / durationMs,
    latencyMs: times.length ? times[0] - startMs : null,
    firstIsiMs: times.length > 1 ? times[1] - times[0] : null,
    lastIsiMs: times.length > 1 ? times.at(-1) - times.at(-2) : null,
    events: result.spikes.map((s, i) => ({
      timeMs: s.timeMs,
      intervalMs: i ? s.timeMs - result.spikes[i - 1].timeMs : null,
      duringStep: during(s.timeMs),
    })),
  };
}

export function adjacentSpikeFrame(result, frame, direction) {
  const frames = (result?.spikes ?? []).map((s) => nearestFrame(result.timeMs, s.timeMs));
  return direction < 0
    ? frames.findLast((f) => f < frame) ?? -1
    : frames.find((f) => f > frame) ?? -1;
}
