# Controlled comparisons in the Neural Interface Laboratory

This release implements the first controlled-comparison stage of the [platform review](../platform/REVIEW_2026-10-18.md). The conductor remains the joint finite-pad, infinite-insulating-plane model. It does not introduce a finite-body shank, electrode polarization, an acquisition chain, or an independently validated stimulation threshold.

## Two paired experiments

**Geometry:** choose a single physical contact and two rectangular sizes: 12 × 12, 20 × 20, 30 × 30, or 12 × 24 µm. Its center and orientation remain fixed. Other pad surfaces and all cellular, protocol, tissue, and numerical inputs remain fixed. The joint conductor is solved for each geometry, including induced currents on floating inactive contacts. Consequently, changing one pad can change more than one recording channel.

Both conditions use complete active-cable solves. In recording-only mode, the membrane arrays and soma-event times are exactly invariant; the reciprocal recording coefficients change. In stimulated modes, the altered field can change membrane dynamics and requires a fresh solve. Comparisons keep commanded current and pulse duration fixed; they do not hold current density, terminal voltage, energy, or material feasibility constant.

**Stimulation:** baseline amplitude is zero and variant amplitude is the configured positive current. Mode, geometry, cell identities, whole-cell placement, conditioning, background drive, pulse timing, and numerical settings are unchanged. In combined mode the baseline retains the same ongoing somatic drive. A resting baseline is not substituted for a driven one. The comparison window must contain a complete pulse.

The comparison envelope is `cortex-interface-comparison/1`. Its immutable baseline and variant are ordinary `cortex-interface/1` results. Canonical input JSON and an explicit changed-input list accompany descriptive analysis. Canonical JSON is not a cryptographic digest or an authenticity guarantee.

## Inspection and event semantics

The completed scene is bound to its selected A/B result. Pending setup controls do not alter the completed result's geometry, contact highlights, traces, or events. Previous completed data remain available during a run, cancellation, or failure. A/B views retain selection and synchronized biological time.

Voltage and recording overlays use shared scales. Mean subtraction is an optional display transform; raw values remain in exports. Each newly computed cell includes a Float64 `neuralUv` array in frame × contact order. The sum agrees with the aggregate recording to floating-point roundoff. It includes capacitive and ionic membrane currents, not only action-potential waveforms. Legacy single archives without those arrays remain readable, with the selected-cell contribution unavailable.

The soma waveform criterion remains the original crossing, overshoot, recovery, and refractory rule. Event correspondence is ordered one-to-one matching that maximizes pair count within an inclusive 5 ms window and then minimizes total absolute time displacement. Negative B−A times are advanced, positive times delayed; changes within 1e−9 ms are unchanged. Unmatched events are added/lost under this specific matching rule. Large phase shifts can become unmatched pairs. Incomplete end-window events can be censored. The labels do not prove causality, axonal propagation, detectability, or biological selectivity.

## Reopening and provenance

The full comparison export retains both complete runs, their geometry, compartment voltage, contact currents, signals, events, source hashes, and analysis. CIF1 payloads are little-endian; gzip is optional for import. Import limits are 64 MiB file size, 192 MiB decompressed archive/allocation budget, and a 24 MiB JSON header. The 192 MiB budget does not cap total peak browser heap use: compressed data, decompression chunks, parsed metadata, and decoded arrays can coexist. Buffer descriptors cannot overlap; constructors, sizes, sample shapes, finite values, cable topology, and supported geometry are checked before use. Comparison import also requires matching engine/source fingerprints and compatible conductor metadata. Summary metrics are recomputed rather than trusted from the file.

These checks detect inconsistent or unsupported archives; they do not authenticate an author or prove that arbitrary imported samples came from the claimed solver. Older single replay archives are supported without inventing missing provenance or per-cell recordings. Imported source revisions are not silently substituted with current ones.

`scripts/interface-manifest.mjs` generates the bundled numerical-source SHA-256 manifest. The worker attaches it to custom results. Regenerate it whenever any listed source changes; a focused test rejects stale fingerprints. Saved examples also carry source fingerprints and must be recomputed when those inputs change.

The worker remains alive after a successful job to reuse loaded models and fixed-protocol conditioned states. Field caching includes the selected geometry. Job identifiers prevent stale messages from replacing a newer result. Stop/unmount terminate the worker; the synchronous active solve does not pretend to support message-based cancellation while running.

## Ready-to-open fixtures

| Fixture | Cells / window | A | B |
| --- | --- | --- | --- |
| Ongoing firing | 12 / 260 ms | Single original mixed-pad recording example | — |
| Evoked spikes | 12 / 100 ms | Single original contact-5, 40 µA evoked example | — |
| Geometry comparison | 12 / 100 ms | Contact 5: 12 × 12 µm, ongoing somatic drive | Same center: 30 × 30 µm, identical source dynamics |
| Stimulation comparison | 12 / 100 ms | Zero current, zero somatic drive | Contact 5: 40 µA, 200 µs phases, 100 µs gap, 20 Hz from 20 ms |

The comparison generator verifies exact compartment-voltage identity for the passive geometry pair. It requires no complete soma events in the resting control and reproduces the two known complete events in specimen 601927090 in the stimulated condition. These are exact-case invariants, not new threshold or refinement evidence.

## Integrity repairs in the older laboratories

- The live synthetic cortical recorder now uses independent physiological and per-contact noise random streams. Passive channel count, order, position, and noise amplitude leave source event lists unchanged. Waveform history follows stable contact IDs; anonymous contacts use deterministic geometry keys. The unsupported distance-based sensor transit delay is removed.
- Reduced cortical stimulation applies its existing |Vm| > 200 mV diagnostic boundary as an explicit result-validity rule. Invalid trajectories retain unclipped traces and raw crossings but do not enter valid recruitment numerators, denominators, distance extents, or raster. This is a declared model-domain policy, not a biological safety limit. The equations and kinetics are unchanged.
- The peripheral teaching sandbox processes synthetic firing by scheduled chronological time with stable tie order, independently of rendering batches. Bounded catch-up retains pending events and exposes lag. Stimulus-start markers are separate from synthetic neural events; stimulation remains visual proxy highlighting. The duplicate train-duration control is removed.
- Peripheral documents now declare their schema and coordinate units. Bounded import checks reject unsupported structures, invalid geometry and slider values before replacing the current model. Legacy documents migrate explicitly. Restoring geometry and controls regenerates randomized activity; it does not restore an identical stochastic replay.
- The flagship is searchable; release verification covers its built component, worker, methods, and saved examples. The current Cortex overview no longer describes the integrated capabilities as absent.

## Verification and remaining work

Focused tests cover field/default equivalence, fixed-center geometry, joint current/reciprocity properties, passive-source invariance, per-cell current projection, paired-input restrictions, event matching, archive round trips and malformed input, source fingerprints, independent recording RNG, validity accounting, and peripheral schedule batching. Existing exact saved-event assertions remain applicable. The complete build and release checks are run before publication.

Browser interaction QA remains unavailable in the current managed environment; the Sites skill requires skipping it without the supported browser-control capability. Node tests and static compilation are not browser proof.

The next scientific gate is independently matching the exact integrated fixtures and assessing field, cable, and timestep sensitivity. Finite-body boundaries, full axon alternatives, delivery/acquisition models, and robust optimization remain the separate stages described in the platform review. This release creates controlled fixtures for that work without inheriting unrelated validation claims.

## Reproduce

```sh
node scripts/interface-manifest.mjs
node scripts/interface-default.mjs
node scripts/interface-default.mjs --evoked
node scripts/interface-comparison-examples.mjs
node --test tests/interface-*.mjs
npm test
npx astro build
node scripts/verify-cortex-build.mjs
```

Historical calibration/refinement reports remain historical snapshots; regenerating an example does not relabel those studies as new evidence.
