# Cochlear Implant Laboratory — developer handoff

Model version: **1.0.0**. The experiment's serialized settings, audio samples, random seed, and model version define the reproducible run. `src/lib/cochlear/config.js` is the authoritative source for defaults and supported settings.

## Routes and retained evidence

- Laboratory: [`/simulations/cochlear-implant/`](https://buildthesimulation.com/simulations/cochlear-implant/)
- Public methods and walkthrough: [`/simulations/cochlear-implant/methods/`](https://buildthesimulation.com/simulations/cochlear-implant/methods/)
- [Field and integration validation](VALIDATION.md)
- [Quantitative neural validation and convergence](neural-validation.json)
- [Independent author-run reference traces and source identities](nerve-reference.json)
- [Independent disk-field fixtures](../../tests/fixtures/cochlear-disk-reference.json)

## Architecture and ownership

The actual computational path is **audio → filter-bank envelopes → compression and source selection → timed biphasic pulses → source/return lead fields → active auditory-nerve cables → distal spike events and membrane recordings**. The acoustic vocoder is a separate demonstration branch; it does not turn modeled spikes into a validated percept.

| Source | Responsibility |
| --- | --- |
| `src/lib/cochlear/config.js` | Normalize and validate settings; define eight presets; versioned experiment JSON import/export. |
| `src/lib/cochlear/audio.js` | Deterministic synthetic sounds and sine/noise vocoders; explicit normalization and bandwidth-omission diagnostics. |
| `src/lib/cochlear/processor.js` | Fourth-order logarithmic filter bank, envelope extraction, generic CIS/n-of-m, physical current mapping, independent event audit. |
| `src/lib/cochlear/geometry.js` | Fixed 35 mm reference map, contact/fiber placement, seeded survival mask, and display-only spiral coordinates. |
| `src/lib/cochlear/fields.js` | Uniform-source disk potential, explicit local/remote return weights, compartment lead fields, and field slices. |
| `src/lib/cochlear/nerve.js` | Independent deterministic 65-compartment Rattay model, edge-aligned cable integration, membrane traces, replay frames, and distal spike detection. |
| `src/lib/cochlear/experiment.js` | Couple all stages; run isolated-channel scans and model-threshold searches; export pulses, spikes, and membrane CSV. |
| `src/lib/cochlear/worker.js` | Numerical tasks, throttled progress, result/error messages, and transferable typed-array buffers. |
| `src/components/CochlearLaboratory.jsx` | Controls, worker lifecycle, audio playback, saved comparisons, and experiment I/O. |
| `src/components/cochlear/Scene.jsx` | Coiled and unrolled scientific views of actual geometry and calculated responses. |
| `src/components/cochlear/Charts.jsx` | Responsive waveform, electrodogram, membrane, raster, recruitment, and cosine-overlap plots. |
| `src/styles/cochlear.css` | Scoped laboratory/methods presentation using the site's Schoolbook/Gothic typography. |

Contact index 0 is basal/high-frequency. Processor matrices are frame-major. Audio uses digital amplitude/dBFS, electrical amplitudes use µA, event times use µs, geometry uses mm, and membrane voltage uses mV. One phase carries `amplitude_µA × width_µs / 1000` nC. Interleaved occupancy includes both phases, interphase gap, and scheduling guard. The source-channel mask suppresses driving events but retains a contact's eligibility as a neighboring local return.

## Model boundaries to preserve

- Fields are calculated in an **unrolled, unbounded, homogeneous isotropic conductor**. Finite disks have prescribed uniform source density; they are not equipotential contacts in a cochlear finite-element mesh. The coiled scene supplies no tissue boundary conditions.
- The fixed 35 mm Greenwood reference and chosen array span are model coordinates, not a conversion from real implant length, surgical insertion, or patient CT anatomy.
- Surviving fibers share the published model parameters. The seeded survival mask does not model degeneration or changed excitability in the remaining fibers. There is no added stochastic channel noise or long-term adaptation mechanism.
- The implementation uses integrated frustum axial conductances for both membrane and extracellular coupling. The author reference stimulus generator uses midpoint-diameter resistance approximations for extracellular drive; the retained comparison reports the resulting discrepancies.
- Laboratory recruitment requires a distal **0 mV upcrossing**. Some author-reference cases use the original **−5 mV** criterion; do not silently substitute one criterion for the other.
- Channel scans report **cosine overlap**: shared recruited fibers divided by the square root of the two recruited counts. Either empty response makes the pair undefined. The threshold tool refines the first sampled nonfiring-to-firing bracket; it is not a clinical hearing threshold.
- Synthetic listening previews use two seconds; neural runs use their configured shorter window plus the retained response tail. Uploaded audio uses the selected available clip. Vocoding illustrates coding constraints and does not predict subjective hearing, speech scores, comfort, or safety.
- Event timestamps on a 1 ns grid are separate from neural integration accuracy. Preserve the measured timestep-refinement errors in the public methods and validation records.

## Presets

1. Follow a tone
2. Frequency sweep
3. Two frequencies
4. Closer array
5. More contacts
6. Local nerve loss
7. Focused return
8. Synthetic vowel

“More contacts” also selects n-of-m. Match coding strategy and maxima in the reference when isolating the effect of contact count. “Focused return” holds source amplitude fixed, rather than matching perceived loudness.

## Verification and reproduction

Recorded verification checkpoint before workspace recovery: **all 92 repository test files passed** in the completed `npm test` run. The four direct cochlear suites contained **46 passing individual tests**: 12 processor/audio, 12 nerve, 11 field/geometry, and 11 integration checks. File-level counts from the repository runner and individual case counts from direct execution are different quantities. Recovered source requires its own verification before release.

Run the four suites directly to see every individual test:

```bash
node tests/cochlear-processor.mjs
node tests/cochlear-nerve.mjs
node tests/cochlear-fields.mjs
node tests/cochlear-integration.mjs
```

Regenerate the numerical comparison against the retained author-run traces:

```bash
node scripts/cochlear-neural-validation.mjs
```

To regenerate the independent traces themselves, provide the pinned author source or explicitly fetch it. This separate reference workflow needs Brian2, NumPy, pandas, and matplotlib; the retained reference uses Brian2 2.10.1. Downloaded author source stays in the system temporary directory, outside this repository. Regenerating disk fixtures additionally requires SciPy; committed fixtures make it unnecessary for the JavaScript test runs.

```bash
python scripts/cochlear-neural-reference.py --author-source /path/to/human-anf-models
# Alternative: fetch the source files identified by pinned Git blob hashes.
python scripts/cochlear-neural-reference.py --fetch-author-source
# Independent elliptic-integral/adaptive-quadrature disk fixtures:
python tests/fixtures/generate-cochlear-disk-reference.py
```

Repository and production-artifact checks:

```bash
npm test
npm run build
node scripts/verify-cochlear-build.mjs
```

`npm run build` already invokes the repository tests through `prebuild`; avoid a redundant concurrent test run. The artifact check verifies the generated routes, hydrated entry, reachable numerical worker, local fonts, catalogue link, and search entry. It does not replace browser interaction checks. Browser results are intentionally not asserted in this handoff.

## Provenance and code reuse

The processing, field, and nerve modules are independent implementations. Published mathematical equations and parameter facts are attributed in the source and public methods. **No vendor sound-processing code or third-party author-model source is incorporated into the laboratory bundle.** The separate reference script runs the authors' original implementation after checking its pinned source identities; upstream license terms remain applicable to that separately obtained reference source. Retained JSON files contain numerical verification data and provenance, not a redistributed copy of the author model. Do not relabel the generic n-of-m processor as a complete vendor strategy.
