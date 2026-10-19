/**
 * Advance illustrative firing schedules in event-time order, independently of
 * paint cadence. Equal-time events use the stable axon index. The caller owns
 * the random interval generator; every event consumes exactly one draw.
 * A work cap retains all pending events in nextFire instead of dropping time.
 */
export function advanceDueEvents(axons, throughS, nextInterval, maxEvents = 4000) {
  if (!Number.isFinite(throughS) || !Number.isInteger(maxEvents) || maxEvents < 1) throw new Error('Invalid event scheduler time or work limit.');
  const heap = Array.from({ length: axons.length }, (_, i) => i);
  const before = (a, b) => axons[a].nextFire < axons[b].nextFire || (axons[a].nextFire === axons[b].nextFire && a < b);
  for (const a of axons) if (!Number.isFinite(a.nextFire)) throw new Error('Axon event times must be finite.');
  const down = start => {
    let i = start;
    while (true) {
      const left = i * 2 + 1, right = left + 1;
      let best = i;
      if (left < heap.length && before(heap[left], heap[best])) best = left;
      if (right < heap.length && before(heap[right], heap[best])) best = right;
      if (best === i) break;
      [heap[i], heap[best]] = [heap[best], heap[i]]; i = best;
    }
  };
  for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) down(i);
  const events = [];
  while (heap.length && axons[heap[0]].nextFire <= throughS && events.length < maxEvents) {
    const axonIndex = heap[0], timeS = axons[axonIndex].nextFire, interval = nextInterval();
    if (!(interval > 0) || !Number.isFinite(interval) || !(timeS + interval > timeS)) throw new Error('Firing intervals must advance time by a finite positive amount.');
    events.push({ axonIndex, timeS, type: 'neural' });
    axons[axonIndex].nextFire = timeS + interval;
    down(0);
  }
  const nextTimeS = heap.length ? axons[heap[0]].nextFire : null;
  return { events, pending: nextTimeS !== null && nextTimeS <= throughS, nextTimeS };
}
