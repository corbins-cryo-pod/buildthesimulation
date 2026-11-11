/** Reconstructed audit contract, not a byte-for-byte recovery of the lost file.
 * Only the declared synthetic electrical cohort is counted. See RECOVERED_AUDIT.md. */
const binary = value => value === true || value === false || value === 0 || value === 1;
function vector(values, size, label) {
  if (!Array.isArray(values) || values.length !== size) throw new Error(`${label} must match the declared cohort of ${size}.`);
  if (!values.every(binary)) throw new Error(`${label} must contain valid binary values, never missing or failed samples.`);
  return values.map(Boolean);
}
function matrix(values, rows, size, label) {
  if (!Array.isArray(values) || !values.length || (rows !== null && values.length !== rows)) throw new Error(`${label} must have the same nonempty channel rows.`);
  return values.map((row, k) => vector(row, size, `${label} row ${k}`));
}

/** Rank over the real numbers, not a count of nonlinear commandable patterns. */
export function matrixRank(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  const n = rows[0].length;
  if (!rows.every(row => Array.isArray(row) && row.length === n && row.every(binary))) throw new Error('Matrix rank requires a rectangular binary matrix.');
  const a = rows.map(row => row.map(Number));
  let rank = 0;
  for (let col = 0; col < n && rank < a.length; col++) {
    let pivot = rank;
    for (let r = rank + 1; r < a.length; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) continue;
    [a[rank], a[pivot]] = [a[pivot], a[rank]];
    const scale = a[rank][col];
    for (let c = col; c < n; c++) a[rank][c] /= scale;
    for (let r = rank + 1; r < a.length; r++) {
      const factor = a[r][col];
      for (let c = col; c < n; c++) a[r][c] -= factor * a[rank][c];
    }
    rank++;
  }
  return rank;
}

export function selectivityMetrics(assigned, localSilenced, zeroInput, cohortCount, { auditValid = true, initiationEligible = null } = {}) {
  if (!Number.isInteger(cohortCount) || cohortCount < 1) throw new Error('The declared cohort count must be a positive integer.');
  if (typeof auditValid !== 'boolean') throw new Error('auditValid must be a boolean.');
  const rows = matrix(assigned, null, cohortCount, 'Assigned recruitment');
  const local = matrix(localSilenced, rows.length, cohortCount, 'Local-silencing recruitment');
  const zero = vector(zeroInput, cohortCount, 'Zero-input recruitment');
  const initiation = initiationEligible === null ? null : matrix(initiationEligible, rows.length, cohortCount, 'Initiation eligibility');
  // A positive zero-input output is not stimulus-evoked, even if a caller omitted
  // the higher-level baseline gate. Raw observations remain available below.
  const valid = auditValid && !zero.some(Boolean);
  const classes = rows.map((row, k) => row.map((active, i) => zero[i] ? 'present at zero input'
    : active ? (local[k][i] ? 'persists with local silencing' : 'lost with local silencing')
      : (local[k][i] ? 'appears with local silencing' : 'silent in both')));
  const channels = rows.map((row, channel) => {
    const members = row.flatMap((recruited, i) => recruited ? [i] : []);
    return { channel, members, count: members.length, exclusive: members.length === 1,
      status: valid ? 'calculated at the declared isolated-channel amplitude' : 'raw diagnostic; audit failed' };
  });
  const any = new Set(), exclusive = new Set(), localDependent = new Set(), conditionalInitiation = new Set();
  for (let k = 0; k < channels.length; k++) {
    const members = channels[k].members;
    members.forEach(i => any.add(i));
    if (members.length !== 1) continue;
    const i = members[0];
    exclusive.add(i);
    if (!local[k][i] && !zero[i]) {
      localDependent.add(i);
      if (initiation?.[k][i]) conditionalInitiation.add(i);
    }
  }
  const sharedOnly = [...any].filter(i => !exclusive.has(i));
  const signatures = new Map();
  for (const row of rows) { const key = row.map(Number).join(''); signatures.set(key, (signatures.get(key) ?? 0) + 1); }
  let information = 0;
  for (const frequency of signatures.values()) { const p = frequency / rows.length; information -= p * Math.log2(p); }
  const jaccard = rows.map(a => rows.map(b => {
    let intersection = 0, union = 0;
    for (let i = 0; i < cohortCount; i++) { if (a[i] || b[i]) union++; if (a[i] && b[i]) intersection++; }
    return union ? intersection / union : null;
  }));
  const gated = value => valid ? value : null;
  return {
    auditValid: valid,
    status: valid ? 'electrical cohort metrics; biological endpoint not calculated' : 'withheld: matched audit failed; matrices are diagnostic only',
    cohortCount,
    denominatorMeaning: 'Declared synthetic resolved cable cohort. No original-host census is instantiated.',
    originalHostCensus: null,
    originalHostPreservedCount: null,
    originalHostUniqueCount: null,
    originalHostY: null,
    originalHostMeaning: 'Not calculated: no original host identities, postoperative continuity, or replacement experiment exist in this benchmark.',
    hypotheticalCompleteB3: {
      originalHostY: 0,
      evidence: 'mathematical',
      architectureEvidence: 'hypothetical',
      meaning: 'Only under a separately declared complete B3 replacement: introduced neuronal outputs are new identities. This is not a result of the current cable experiment or a surgical forecast.'
    },
    anyRecruitment: gated(any.size),
    engineeredExclusiveCount: gated(exclusive.size),
    engineeredExclusiveFraction: gated(exclusive.size / cohortCount),
    engineeredLocalDependentExclusiveCount: gated(localDependent.size),
    engineeredCausalExclusiveCount: valid && initiation !== null ? conditionalInitiation.size : null,
    engineeredCausalExclusiveFraction: valid && initiation !== null ? conditionalInitiation.size / cohortCount : null,
    engineeredOutputMeaning: 'Historical API name: these are synthetic model-output counts. They are not a calculated engineered-to-original-census yield.',
    localDependenceMeaning: 'Loss under regional conductance silencing alone can indicate initiation loss or block of propagation from another site.',
    causalMeaning: 'Conditional local-initiation evidence additionally requires the earliest observed crossings to be in the intervention region. It does not establish soma mediation, a host junction, or anatomical continuity.',
    sharedOnlyCount: gated(sharedOnly.length),
    exclusiveMembers: valid ? [...exclusive].sort((a, b) => a - b) : null,
    sharedOnlyMembers: valid ? sharedOnly.sort((a, b) => a - b) : null,
    matrixRank: gated(matrixRank(rows)),
    matrixRankMeaning: 'Real-number rank of this binary isolated-channel recruitment matrix; not a count of usable nonlinear simultaneous-channel commands.',
    uniformSingleChannelInformationBits: gated(information),
    informationMeaning: 'Entropy of the deterministic observed recruitment pattern under a uniform prior over the isolated input channels. No noise model, trial variability, or simultaneous-channel prediction is included.',
    jaccard: valid ? jaccard : null,
    jaccardMeaning: 'Pairwise overlap of recruited identity sets; an empty union is undefined (null).',
    channels, classes,
    rawMatrixMeaning: 'All channel rows are retained for inspection even when the audit fails; their presence does not authorize derived yield claims.'
  };
}

export function orderedAmplitudeSweep(amplitudeUa) {
  if (!Number.isFinite(amplitudeUa) || amplitudeUa < 0) throw new Error('Amplitude must be a finite nonnegative number.');
  const values = [0, .5, .75, 1, 1.25, 1.5].map(scale => scale * amplitudeUa);
  if (!values.every(Number.isFinite)) throw new Error('Amplitude sweep contains a nonfinite value.');
  return [...new Set(values)].sort((a, b) => a - b);
}

export function bracketThreshold(amplitudes, recruitment) {
  if (!Array.isArray(amplitudes) || !amplitudes.length || !amplitudes.every((value, i) => Number.isFinite(value) && value >= 0 && (i === 0 || value > amplitudes[i - 1]))) throw new Error('Threshold samples must have strictly ordered finite nonnegative amplitudes.');
  if (!Array.isArray(recruitment) || recruitment.length !== amplitudes.length || !recruitment.every(binary)) throw new Error('Every threshold sample must have a valid binary recruitment observation; failed or missing samples are not non-recruitment.');
  const recruited = recruitment.map(Boolean), crossings = [], descending = [];
  for (let i = 1; i < amplitudes.length; i++) {
    if (!recruited[i - 1] && recruited[i]) crossings.push([amplitudes[i - 1], amplitudes[i]]);
    if (recruited[i - 1] && !recruited[i]) descending.push([amplitudes[i - 1], amplitudes[i]]);
  }
  const first = recruited.findIndex(Boolean);
  return {
    amplitudes: [...amplitudes], recruitment: recruited,
    crossings, descendingCrossings: descending, nonmonotonic: descending.length > 0,
    firstRecruitingSample: first < 0 ? null : amplitudes[first],
    firstBracket: crossings[0] ?? null,
    status: first < 0 ? 'No recruitment at the sampled amplitudes; unsampled amplitudes remain unknown.'
      : first === 0 ? 'Recruitment already present at the lowest sample; lower onset is unbounded by these samples.'
        : 'Observed transitions bracketed between adjacent samples only.',
    interpolation: 'none',
    meaning: 'Finite sampling can miss narrow recruitment or block intervals. These are observed transition brackets, not an assertion of a globally monotonic threshold.'
  };
}
