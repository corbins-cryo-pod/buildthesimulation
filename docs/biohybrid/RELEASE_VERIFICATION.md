# Biohybrid Laboratory — release verification record

Date: 2026-10-23. Model: `biohybrid-hh-cable/1.0.0`.

This record concerns numerical, interface, and build verification before publication. The associated pull request and release report identify the exact merged revision and live deployment. These checks establish implementation behavior, not experimental calibration of a graft or implant.

## Numerical evidence

- `tests/biohybrid-engine.mjs`: 20 substantive assertions covering equilibrium, active propagation, synapses, disconnected and zero-input controls, amplitude/polarity, conduction length/diameter, electrode distance, conductivity with fixed sources, finite disks/clearance, charge balance, mesh/time refinement, replay, and event ordering.
- `tests/biohybrid-export.mjs`: 7 assertions checking normalized settings replay, explicit units/version, all trace and recording columns, all 801 × 656 voltage samples, spike records, invalid inputs, and corrupted data rejection.
- `tests/biohybrid-growth.mjs`: 13 assertions covering deterministic trajectories, growth length, confinement, encounter detection, independent formation trials, maturation, and computational caps.
- `tests/biohybrid-reference.mjs`: regression against four native NEURON 9.0.1 cases with pinned source/reference hashes and unadjusted raw traces. Independent reference execution and all frozen acceptance criteria pass. The separate 0.5 mV pointwise diagnostic also passes.
- `scripts/validate-biohybrid.mjs`: 0.005, 0.0025, 0.00125 ms temporal study and 25, 12.5, 6.25 µm spatial study. Both adjacent time refinements pass the original 1 mV RMS and 0.1 ms timing gates. Spatial delay and recording gates remain 5% and 10%.

The original failed spatial gate, its physical target-selection correction, event-ordering defect, and native endpoint-sampling observation remain in `VALIDATION_HISTORY.md`. No gate was relaxed to obtain a pass.

## All seven preset calculations

Each calculation below completed using the current source. Recruitment counts hosts with somatic spikes at least once; total soma spikes counts both graft and host events. The growth preset's electrical baseline does not imply that the separate growth realization has formed functional synapses.

| Preset | Host cells recruited | Total soma spikes | Trunk delay / ms | Recording 2 / µV p–p |
|---|---:|---:|---:|---:|
| Functional living electrode | 3/3 | 10 | 2.120274 | 9.745330 |
| Failed host–graft integration | 0/3 | 4 | 2.120274 | 5.479452 |
| Axonal conduction | 3/3 | 10 | 4.933439 | 6.289067 |
| Electrode positioning | 3/3 | 10 | 2.120274 | 4.649223 |
| Synaptic connectivity | 1/3 | 6 | 2.120274 | 7.315069 |
| Growth and integration | 3/3 | 10 | 2.120274 | 9.745330 |
| Interface degradation | 3/3 | 7 | 2.150407 | 4.129941 |

The degradation example still recruits all three hosts at least once but produces seven total soma spikes instead of ten. It demonstrates degraded repeat transmission and signal changes, rather than an imposed complete failure. Local calculation time ranged approximately 0.88–1.36 s; this excludes page/rendering startup and is environment-dependent.

## Browser verification

Desktop verification at `http://terminal.local:4173/simulations/biohybrid-interface/` exercised:

- Initial Worker calculation: 574 active membrane compartments, 3/3 hosts, 2.120 ms trunk delay, 4.420 ms relay latency, 9.745 µV recording-2 peak-to-peak.
- Disconnected preset: graft activity retained, 0/3 hosts, 5.479 µV volume-conducted receiving signal.
- Pinned comparisons, pause/play, saved-time scrubbing, neuron focus, keyboard compartment selection, and inspected-compartment voltage/trace.
- Vintage Ivory and Graphite & Brass themes, with a shared numerical voltage palette and readable theme-specific trace colors.
- Growth: the default seed at day 8 has two encounters and zero candidates; formation probability 1 yields two candidates without changing paths. Scrubbing to day 0 restores zero length/encounters/candidates. Explicitly transferring that zero count changes pending electrical targets only; a subsequent electrical solve produces 0/3 hosts.
- Methods content, numerical tables, all 16 evidence-register entries, and growth anchor.

A 390 px same-origin iframe exercised the mobile CSS and reduced population: one graft/two hosts, 322 active membrane compartments, 2/2 hosts recruited. The inner page's 375 px content viewport had a 375 px scroll width; the experiment selector is intentionally horizontally scrollable. No whole-page horizontal overflow was observed. This is responsive browser verification, not a physical mobile-device performance measurement. The temporary QA page is excluded from the release.

### Browser limitations retained

The verification browser disables WebGL. Automatic 2D fallback was visually checked; the Three.js renderer received an independent source/lifecycle/API review, but GPU-enabled 3D rendering, orbit/pan/zoom, clipping, and selection require direct verification in a WebGL-capable browser. Do not represent the fallback screenshots as a 3D visual test.

The browser download tool reported failure on two settings-JSON save attempts at the HTTP preview origin. No application exception accompanied those clicks. Export contents and settings reload pass automated tests, but those tests do not prove that this browser saved a file. Live HTTPS download verification is tracked separately in the release report; this preview limitation is not silently converted to a pass.

A visual check found that camel-case SVG presentation attributes were not being applied by this Preact configuration. The chart and growth SVGs now use native hyphenated attributes for alignment, stroke width, opacity, dashes, and non-scaling strokes. DOM checks confirmed the day/outlet labels use `text-anchor="end"`; the corrected drawing was inspected. This did not change calculated data.

## Site preservation and build

The first full repository run passed 79 test files. The initial production build and Cortex/Finger Atlas artifact checks passed. During development, main advanced to `fcffb9950d9310266b1313c0b7d5cbe03a3077d6` with the Peripheral Nerve Regeneration Laboratory. That commit was merged into the biohybrid branch, preserving every existing entry and its new search records. Nerve and discovery tests passed on the integrated source. The final pull-request checks verify the complete integrated tree, including the added biohybrid search entries and final documentation/layout corrections.

The new laboratory has isolated modules, a dedicated Worker, two new routes, shared directory/search entries, and no new package dependency. The existing Cortex point/line-source volume-conductor kernel is reused. Native NEURON is only a reference-generation dependency; it is not shipped to browsers.
