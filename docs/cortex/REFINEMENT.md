# Bounded active-model refinement study

This is numerical verification of the declared single-cell equations. It is not
experimental validation, a universal neuronal threshold, an electrode safety
assessment, or evidence of cortical-population selectivity.

## Predeclared experiment and acceptance criteria

The criteria below were written before executing `cortex-refinement-study.mjs`.
Failing a criterion must remain visible in the report; the script must not adjust
its tolerances to make an outcome pass. No solver, mechanism, physical contact or
morphology is changed by this study.

The study uses the published human model, 100 ms no-drive initialization, 20 ms
observation, and 0.05 ms retained samples. The exact physical experiments are:

- Intracellular current: 1.2 nA into the soma, 5–10 ms, with the declared bath
  return. This tests a soma spike and neural recordings.
- Extracellular current: a 25 µA, cathodic-first, equal/opposite pair at r4-c4 /
  r4-c5, 200 µs phases and 100 µs gap, beginning at 5 ms. Ideal recording sites
  are r3-c3 / r3-c6, relative to infinity. This tests local crossings, soma
  response, neural recording and the separate applied-source artifact.
- Extracellular local-crossing threshold: the preceding extracellular protocol,
  varying only amplitude in a verified 0–40 µA bracket, eight bisections. The
  criterion is any physical membrane's upward crossing of −25 mV by 15 ms.
- Intracellular soma threshold: the preceding intracellular protocol, varying
  only amplitude in a verified 0–1.2 nA bracket, eight bisections, for each mesh
  at dt = 0.0025 ms. The criterion is a soma upward crossing by 15 ms.
- Long-phase soma-spike candidate: extracellular pair/recording sites as above,
  40 µA, 1000 µs phases, 100 µs gap, implant translation (100, −50, 0) µm,
  unchanged cell placement. Tested at all three meshes with dt = 0.0025 ms.

The first three experiments use the complete 3×3 matrix of dt = 0.005, 0.0025,
0.00125 ms and maximum compartment length = 40, 20, 10 µm. Every run retains its
complete configuration. The 20 ms observation is a deliberate bounded study
window, not a silent reduction of the shipped experiment's resolution.

Comparisons use the next-finer timestep at the same mesh or next-finer mesh at
the same timestep. They do not simultaneously change both. Probe voltages use
section midpoint x = 0.5 (soma, synthetic axon, longest apical and longest basal
section), shared exactly by all odd-segment native meshes. Thus comparison does
not inadvertently follow a renamed compartment to a different physical place.

| Quantity | Acceptance criterion | Meaning |
| --- | --- | --- |
| Section identity, attachment topology, source hash, section endpoints | Identical; endpoint discrepancy ≤ 1e−9 µm | Same physical reconstruction and source assets |
| Section area, arc length, integrated maximum channel conductance and capacitance | Relative difference ≤ 1e−10 (absolute 1e−10 for zero totals) | No changed membrane or channel amount |
| Soma spike count and local-crossing occurrence | Identical per physical experiment | Qualitative numerical stability; local compartment counts need not be identical |
| Soma and first local-crossing timing | ≤ 0.1 ms when present | Same event definition, internal-step interpolation |
| Soma and fixed-section probe voltage traces | RMS ≤ 1 mV and maximum ≤ 5 mV | Unshifted 0.05 ms samples, no alignment to conceal timing error |
| Neural recording at each contact | RMS error ≤ 5% of finer trace peak (normalization floor 0.01 µV) | Same physical sensing positions; no artifact in denominator |
| Applied artifact at each contact | Maximum absolute error ≤ 1e−7 µV | Pulse boundaries align with all study timesteps |
| Membrane conservation and local KCL | Maximum absolute residual ≤ 1e−8 nA | Includes every internal post-conditioning timestep |
| Threshold bracket precision | Width ≤ 1% of crossing upper bound | Both initial bracket endpoints actually evaluated |
| Threshold sensitivity | Maximum endpoint-envelope difference ≤ 2% of finer bracket midpoint | Conservative uncertainty from both brackets; no exact threshold claim |
| Local initiation location | Report section, section x and world position; no fixed point-distance pass gate | A compartment center is resolution dependent; differing initiation sections require investigation |
| Runtime and numeric output bytes | Report, with no portable wall-time pass gate | Solver/diagnostics only; excludes rendering and process/GPU overhead |

Threshold searches establish a crossing/noncrossing bracket for the chosen event;
they do not prove global monotonicity or rule out narrow disconnected event bands.
All tested amplitudes and classifications are retained. A failed spatial gate
means the particular observable is not certified converged at that resolution,
even if independent solvers agree on the same discretized equations.

## Reproduction

```sh
node scripts/cortex-refinement-study.mjs
```

The script writes `benchmarks/refinement-latest.json`, including hashes of the
study and relevant model/kernel/reference files, exact configurations, section
invariants, compact waveform metrics, event locations, tested threshold trials,
timings, output bytes and every acceptance result. No simulated trace from an
independent reference is used to manufacture an expected result. Full histories
exist transiently to calculate paired errors and are not retained in the report.
This analysis does not change the website solver or fixtures.

## Results and interpretation

The completed report is `benchmarks/refinement-latest.json`. It contains 21 fixed
experiments and 120 threshold trials (141 solver runs), completed in 604.48 s on
Node v24.19.0. Relevant source hashes remained unchanged throughout execution.
The predeclared criteria were retained without modification.

| Gate | Result | Interpretation |
| --- | --- | --- |
| Morphology, topology and integrated channel invariants | Pass on 40/20/10 µm | Section endpoints identical; largest relative integral difference 7.75e−16 |
| Membrane-current conservation and local KCL | Pass on all 141 runs | Maximum 4.44e−12 nA conservation and 4.70e−12 nA local residual |
| Spike counts and event timings | 26/26 pairwise comparisons pass | Maximum soma time difference 0.03532 ms; maximum first-local difference 0.02490 ms in the fixed experiments |
| Fixed-section voltage waveforms | **12/26 pass** | All 12 fixed 25 µA local-response comparisons pass; all 12 intracellular and both long-phase candidate comparisons fail at least one voltage gate |
| Neural recordings | 25/26 pass | Long-phase candidate recording B fails the 40→20 µm 5% normalized RMS gate |
| Applied artifact | 26/26 pass | Maximum discrepancy 1.54e−9 µV; independent of neuron mesh |
| Threshold bracket precision | 12/12 pass | Every bracket has width below 1%; all sampled amplitudes are consistent with monotonic classification |
| Threshold refinement | **8/14 pass** | All six temporal and both intracellular spatial comparisons pass; all six extracellular spatial comparisons fail |
| Committed independent-reference provenance | Pass | Generator, input, original asset and compressed-trace hashes match |

A stable spike count or crossing time does **not** establish pointwise waveform
convergence. The largest unshifted fixed-probe voltage discrepancy is 2.401 mV RMS
and 32.199 mV maximum. Small timing changes on sharp spike waveforms can produce
large instantaneous differences; this study deliberately does not align traces
to hide those errors. Even at 20→10 µm with dt 0.00125 ms, the intracellular soma
comparison reaches 5.484 mV maximum and fails the 5 mV gate. The result is therefore
not a certification of converged active voltage waveforms across the tested domain.

The long-phase candidate's failing recording comparison has absolute RMS error
0.001105 µV, maximum error 0.008259 µV, and a finer-trace peak of 0.016889 µV:
6.541% normalized RMS. Its tiny absolute amplitude does not justify changing the
predeclared 5% criterion or normalizing by the much larger stimulation artifact.

### Threshold findings

These brackets refer only to the specified −25 mV event by 15 ms in this one
model/configuration. Units in the following table are µA, with lower = no local
crossing and upper = local crossing.

| Maximum compartment length | dt 0.005 ms | dt 0.0025 ms | dt 0.00125 ms |
| --- | --- | --- | --- |
| 40 µm | 19.68750–19.84375 | 19.53125–19.68750 | 19.37500–19.53125 |
| 20 µm | 18.75000–18.90625 | 18.59375–18.75000 | 18.59375–18.75000 |
| 10 µm | 19.37500–19.53125 | 19.21875–19.37500 | 19.06250–19.21875 |

The former approximately 6% result used broad threshold brackets and changed dt
and mesh together. Here a like-for-like 40→20 µm comparison at dt 0.0025 ms shifts
bracket midpoints by 5.02%; the conservative endpoint envelope is 5.86%. The next
20→10 µm refinement reverses direction and shifts midpoints by 3.24%, with a
4.05% endpoint envelope. Both fail the 2% gate. At the finest dt those envelope
changes are still 5.02% and 3.27%. The nonmonotonic sequence must not be described
as converged merely because the 40 and 10 µm answers happen to lie closer together.

Near-threshold event locations expose a substantive difference. At dt 0.005 ms,
the 40 µm upper bracket first crosses in apic[40] at section x = 0.9, around
5.526 ms, after the return phase ends at 5.5 ms. The 20 µm upper bracket first
crosses in the same section at x = 0.278, around 5.200 ms, at the end of the
leading phase. The 10 µm upper bracket crosses at x = 0.237, around 5.197 ms.
These are different locations and pulse-response phases selected by the same
any-membrane criterion. Recording a first local crossing is not a validated
biological initiation-site measurement.

The intracellular soma threshold at dt 0.0025 ms is unchanged across all meshes:
0.9328125–0.9375 nA. That result applies to the declared 5 ms soma current pulse,
conditioning and event definition, not to a universal cellular threshold.

### What changed with refinement, and what did not

Per-section membrane area, arc length, section attachment, capacitance, leak
conductance, and all nine maximum channel conductances are invariant. The
original reconstruction, fit, mechanisms, orientation, source/recording positions,
input times and total injected currents are unchanged. Source changes or extra
channel-bearing membrane therefore do not explain the threshold shift.

The finite-volume cable still samples applied potential at node centers, and
its compartment locations/axial network change with discretization. This study
quantifies that system's sensitivity without attributing all error to one term.
An arc-averaged field diagnostic differs from center sampling by as much as
0.236 / 0.156 / 0.0744 mV per µA on the 40/20/10 µm meshes. This is a diagnostic
comparison, not a proposed replacement forcing rule or a certified solution-error
estimate. The fixed section midpoint probes coincide exactly in physical space.

The reconstructed neurite path length stays at approximately 5965.68 µm; summed
recording-source chords are 5604.75 / 5663.10 / 5731.23 µm. Maximum path-to-chord
displacement decreases 7.74→4.51→3.08 µm. Those changing uniform line sources can
affect extracellular recordings. **They cannot cause stimulation-threshold
changes**, because recording is a one-way calculation and does not feed back into
membrane dynamics. The native membrane areas and axial resistances retain taper
and arc geometry while that forward approximation uses straight chords.

### Fixed experiment outcomes

At dt 0.0025 ms:

| Mesh | 1.2 nA intracellular soma spike | 25 µA extracellular soma spikes | Moved 40 µA / 1000 µs soma spike |
| --- | --- | --- | --- |
| 40 µm | One at 9.286283 ms | Zero; first local crossing at 5.128009 ms | One at 5.378682 ms |
| 20 µm | One at 9.251579 ms | Zero; first local crossing at 5.103458 ms | One at 5.385438 ms |
| 10 µm | One at 9.260896 ms | Zero; first local crossing at 5.107612 ms | One at 5.389039 ms |

The moved long-phase candidate is reproducible as a **qualitative soma-spike
example** in all three meshes; first local crossing remains in dend[11]. Its
soma peaks are 31.4838 / 30.5558 / 30.5242 mV. The failed waveform/recording gates
above remain attached to this result. No new native NEURON dynamics fixture for
this candidate was generated, and this example is not a real-device stimulation
recommendation or an assertion of threshold accuracy.

### Execution and output cost

The table gives single observed measurements at dt 0.0025 ms. Intracellular runs
include freshly computed 100 ms conditioning; the following extracellular runs
reuse identical conditioning. All integrate 20 ms and retain 401 samples.

| Mesh | All nodes / membrane nodes | Cold intracellular time | Warm 25 µA extracellular time | Numeric result arrays |
| --- | --- | --- | --- | --- |
| 40 µm | 286 / 211 | 8.99 s | 1.38 s | 9.206 MB |
| 20 µm | 444 / 369 | 13.67 s | 2.47 s | 14.276 MB |
| 10 µm | 744 / 669 | 25.28 s | 4.64 s | 23.902 MB |

Across the 21 fixed cases, observed execution spans 0.81–46.59 s. This measures
the numerical CPU path, geometry/transfer setup, conditioning when needed and
solver diagnostics. It excludes rendering/overlay work and is not a browser FPS
measurement. Other development checks could run on the shared host; these are
neither isolated timing trials nor portable performance promises. Numeric output
bytes exclude heap overhead, the conditioning cache, JSON expansion, scene/GPU
memory and retained comparisons. No resolution was reduced to obtain timings.

### Independent reproducibility audit

The existing isolated environment was actually inspected: all 20 exact dependency
pins match, including NEURON 9.0.1 and LFPykit 0.6.2. Read-only native SWC/NMODL
regeneration reproduces the committed 40/20/10 µm topology and all audited areas,
lengths, diameters, axial conductances and coordinates exactly (zero numeric
difference). The report retains actual Python/NEURON build versions and the
compiled mechanism-library SHA-256. This regenerates **geometry**, not new
full-cell dynamics or a new independent threshold solution.

Run the same optional audit with the study using the pinned environment and
compiled original mechanisms described in README.md:

```sh
CORTEX_REFERENCE_PYTHON=/path/to/pinned-env/bin/python \
CORTEX_ACTIVE_MECHANISM_LIBRARY=/path/to/x86_64/libnrnmech.so \
node scripts/cortex-refinement-study.mjs
```

Concrete remaining gaps are recorded in the JSON: existing complete native
fixtures contain no 10 µm / 0.00125 ms experiment, refined extracellular threshold,
or moved long-phase candidate. The active reference generator's version metadata
is declared rather than checked against installed versions; the verified pinned
environment avoids that ambiguity for this run. Existing fixtures lack package
wheel hashes, compiler identity and compiled-library hashes. The convergence
study does not turn single-implementation agreement into independent verification.

### Next bounded scientific milestone

1. Extend independent NEURON/LFPykit dynamic comparisons to the 10 µm and
   0.00125 ms configurations, the local-threshold bracket endpoints and the moved
   long-phase candidate, with actual runtime version checks and compiled-artifact
   provenance.
2. In an isolated research branch, add a finer native morphology (for example
   5 µm, or explicitly defined local refinement around apic[40]) while preserving
   section areas, fitted densities, inputs and physical probe locations. Repeat
   the same threshold and unshifted waveform gates; retain both competing local
   initiation regions/phases in the analysis.
3. Investigate field sampling and temporal waveform errors with controlled,
   independently checked discretizations. Do not change the shipped model or
   advertise precise recruitment thresholds until the predeclared criteria pass.

No membrane mechanism, conductor model, source regularization or numerical gate
was changed to conceal these failures. The homogeneous unbounded conductor,
ideal point contacts, synthetic axon convention and absence of independent
experimental validation remain unchanged.
