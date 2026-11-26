// Discrete-event model of a position indicator and an occupancy log.
// Thermo Scientific 1300 Series A2, operating instructions 7021355 rev. 20,
// pp. 1-6, 7-1. Switch hysteresis and response latency are unknown.
export const CONFIG = Object.freeze({
  deviceId: '07-01',
  model: 'Thermo Scientific 1300 Series A2, catalog 1305',
  modelNumber: '1305',
  nominalMm: 203.2,
  lowWorkMm: 184.15,
  highWorkMm: 209.55,
  maxMm: 535,
  maxSamples: 16,
  maxEvents: 512,
  maxDurationS: 86400,
  sampleKind: 'sealed-token'
});

const inputSchema = 'bts.equipment.07-01.sash-input.v1';
const outputSchema = 'bts.equipment.07-01.sash-session.v1';
const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

function readId(value, label) {
  if (typeof value !== 'string' || !identifier.test(value)) {
    throw new Error(`${label} must be 1–64 letters, digits, periods, underscores or hyphens, starting with a letter or digit.`);
  }
  return value;
}

// Use integral millisecond ticks for overlap accounting; publish elapsed seconds.
function ticks(seconds, label) {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > CONFIG.maxDurationS) {
    throw new Error(`${label} must be 0–${CONFIG.maxDurationS} elapsed seconds.`);
  }
  const milliseconds = Math.round(seconds * 1000);
  if (milliseconds / 1000 !== seconds) {
    throw new Error(`${label} supports millisecond resolution (three decimal places in seconds).`);
  }
  return milliseconds;
}

function readHeight(value) {
  if (!Number.isFinite(value) || value < 0 || value > CONFIG.maxMm) {
    throw new Error(`Sash opening must be a number from 0 to ${CONFIG.maxMm} mm.`);
  }
  return value;
}

export function positionAt(heightMm) {
  readHeight(heightMm);
  if (heightMm === 0) return 'closed';
  if (heightMm < CONFIG.lowWorkMm) return 'below-work';
  if (heightMm > CONFIG.highWorkMm) return 'above-work';
  return 'work';
}

function readJob(job) {
  requireObject(job, 'Session');
  const known = {schema: inputSchema, deviceId: CONFIG.deviceId, modelNumber: CONFIG.modelNumber};
  for (const [key, value] of Object.entries(known)) {
    if (Object.hasOwn(job, key) && job[key] !== value) {
      throw new Error(`Incompatible ${key}. Expected ${value}.`);
    }
  }
  const sessionId = readId(job.sessionId, 'Session ID');
  const durationMs = ticks(job.durationS, 'Session duration');
  const initialSashMm = readHeight(job.initialSashMm);
  if (!Array.isArray(job.events) || job.events.length > CONFIG.maxEvents) {
    throw new Error(`Provide an events array with at most ${CONFIG.maxEvents} events.`);
  }

  // Validate the complete input even when the UI requests an earlier replay frame.
  const present = new Set();
  let height = initialSashMm;
  let previousMs = 0;
  const events = job.events.map((event, index) => {
    const label = `Event ${index + 1}`;
    requireObject(event, label);
    const timeMs = ticks(event.timeS, `${label} time`);
    if (timeMs < previousMs || timeMs > durationMs) {
      throw new Error(`${label} must follow time order and fall within the session duration.`);
    }
    previousMs = timeMs;
    const {timeS, type} = event;
    if (type === 'sash') {
      height = readHeight(event.heightMm);
      return {timeS, type, heightMm: height};
    }
    if (type !== 'load' && type !== 'remove') {
      throw new Error(`${label} type must be sash, load or remove.`);
    }
    const sampleId = readId(event.sampleId, `${label} sample ID`);
    if (Object.hasOwn(event, 'sampleKind') && event.sampleKind !== CONFIG.sampleKind) {
      throw new Error(`${label} accepts sealed-token specimens only.`);
    }
    if (height === 0) throw new Error(`${label} cannot ${type} ${sampleId} through the closed sash.`);
    if (type === 'load') {
      if (present.has(sampleId)) throw new Error(`${sampleId} is already on the work surface.`);
      if (present.size >= CONFIG.maxSamples) throw new Error(`The viewer supports ${CONFIG.maxSamples} concurrent tokens.`);
      present.add(sampleId);
    } else if (!present.delete(sampleId)) {
      throw new Error(`${sampleId} cannot be removed because it is absent.`);
    }
    return {timeS, type, sampleId, sampleKind: CONFIG.sampleKind};
  });
  return {...known, sessionId, durationS: job.durationS, initialSashMm, events};
}

export function makeExample() {
  return {
    schema: inputSchema, deviceId: CONFIG.deviceId, modelNumber: CONFIG.modelNumber,
    sessionId: 'A2-EXAMPLE-01', durationS: 30, initialSashMm: CONFIG.nominalMm,
    events: [
      {timeS: 2, type: 'load', sampleId: 'SEALED-A', sampleKind: CONFIG.sampleKind},
      {timeS: 10, type: 'sash', heightMm: CONFIG.nominalMm + 20},
      {timeS: 14, type: 'load', sampleId: 'SEALED-B', sampleKind: CONFIG.sampleKind},
      {timeS: 19, type: 'remove', sampleId: 'SEALED-A', sampleKind: CONFIG.sampleKind},
      {timeS: 22, type: 'sash', heightMm: CONFIG.nominalMm},
      {timeS: 26, type: 'remove', sampleId: 'SEALED-B', sampleKind: CONFIG.sampleKind}
    ]
  };
}

export function simulate(job, untilS = job?.durationS) {
  const input = readJob(job);
  const endMs = ticks(untilS, 'Replay cursor');
  if (untilS > input.durationS) throw new Error('Replay cursor exceeds the session duration.');

  const samples = new Map();
  const present = new Map();
  const intervals = [];
  const eventHistory = [];
  let currentMs = 0;
  let sashMm = input.initialSashMm;
  let warningMs = 0;
  let sampleWarningMs = 0;

  function stateAt(timeS) {
    const position = positionAt(sashMm);
    const warning = position === 'below-work' || position === 'above-work';
    return {
      timeS, sashMm, position, warning, presentSampleIds: [...present.keys()],
      qualitativeFlag: warning ? 'sash-position-warning' : position === 'closed' ? 'closed-reduced-mode' : 'work-position'
    };
  }

  function advance(nextMs) {
    const span = nextMs - currentMs;
    if (span <= 0) return;
    const {timeS:startS, ...state} = stateAt(currentMs / 1000);
    const endS = nextMs / 1000;
    intervals.push({startS, endS, durationS: span / 1000, ...state});
    for (const [id, visit] of present) {
      visit.observedUntilS = endS;
      if (state.warning) {
        visit.warningMs += span;
        samples.get(id).warningMs += span;
      }
    }
    if (state.warning) {
      warningMs += span;
      sampleWarningMs += span * present.size;
    }
    currentMs = nextMs;
  }

  for (const [eventIndex, event] of input.events.entries()) {
    const nextMs = Math.round(event.timeS * 1000);
    if (nextMs > endMs) break;
    advance(nextMs);
    if (event.type === 'sash') {
      sashMm = event.heightMm;
    } else if (event.type === 'load') {
      const visit = {enteredS: event.timeS, removedS: null, observedUntilS: event.timeS, warningMs: 0};
      if (!samples.has(event.sampleId)) samples.set(event.sampleId, {warningMs: 0, visits: []});
      samples.get(event.sampleId).visits.push(visit);
      present.set(event.sampleId, visit);
    } else {
      present.get(event.sampleId).removedS = event.timeS;
      present.delete(event.sampleId);
    }
    eventHistory.push({eventIndex, ...event, state: stateAt(event.timeS)});
  }
  advance(endMs);

  const sampleHistory = [...samples].map(([sampleId, sample]) => ({
    sampleId, sampleKind: CONFIG.sampleKind, warningDurationS: sample.warningMs / 1000,
    visits: sample.visits.map(({warningMs: visitMs, ...visit}) => ({...visit, warningDurationS: visitMs / 1000}))
  }));
  return {
    schema: outputSchema, deviceId: CONFIG.deviceId, modelNumber: CONFIG.modelNumber, sessionId: input.sessionId,
    complete: untilS === input.durationS,
    provenance: {
      kind: 'simulated', solver: 'discrete-sash-occupancy/1',
      timeBase: 'elapsed seconds from session start; 1 ms resolution; half-open intervals',
      positionReference: 'sash opening in mm above the fully closed stop',
      reference: 'Thermo Scientific 1300 Series A2 operating instructions, 7021355 rev. 20',
      interpretation: 'Qualitative position flag; no measured data, airflow, contamination probability or sterility assessment.'
    },
    input, state: stateAt(untilS), intervals, eventHistory, sampleHistory,
    summary: {
      warningDurationS: warningMs / 1000, sampleWarningSeconds: sampleWarningMs / 1000,
      affectedSampleIds: sampleHistory.filter(sample => sample.warningDurationS > 0).map(sample => sample.sampleId)
    }
  };
}
