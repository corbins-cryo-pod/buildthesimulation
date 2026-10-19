# Integrated Neural Interface Laboratory

Route: `/cortex/interface/`. The existing Cortex Laboratory and finite-disk routes remain available.

The new experiment uses the original active cable solver, morphology meshes, fitted channels and human model library. Twelve independent cells retain every original compartment and use one membrane-voltage palette. No cell is replaced with a waveform template or omitted to conceal a failed solve. The default contains 3,428 compartments. The scene, selected branch trace, contact signals and soma raster share the same output times.

## Test shank and finite fields

The hypothetical shank is 90 × 20 µm, 1,800 µm long, with a 300 µm pointed taper. Eight surface contacts include 12 × 12, 20 × 20, 30 × 30 and 12 × 24 µm rectangles. The Neuropixels-inspired silhouette is a test design, not an optimized or manufactured device. Contact size and position both vary in the original layout. The [controlled-comparison mode](INTERFACE_COMPARISONS.md) now changes one contact's size at a fixed center, holding the other inputs constant, or compares a protocol with stimulation off and on.

The joint panel solver imposes equipotential contacts and prescribed total current. Inactive contacts float with zero net current, retaining induced local panel currents. Current is shared equally across selected pads; the return is at infinity. The same reciprocal coefficients are used for stimulation and ideal neural recording. Neural current is the cable solver's outward total membrane current; intracellular injection is not added again. Direct applied-source artifact is stored separately in µV. All signals at an output frame describe the just-completed integration interval.

**The insulating backing is an infinite plane.** The rendered finite shank's tip, sides and back do not shape the field. No electrode impedance, capacitance, noise, acquisition electronics, spike sorting, synapses or ephaptic feedback is modeled. A full finite-shank conductor model and independently matched neural comparisons remain outstanding.

## Computed examples

The two original examples and two new paired fixtures use 40 µm compartments, dt 0.005 ms, 100 ms no-drive conditioning, 0.1 ms saved sampling and 0.3 S/m conductivity. Complete morphologies are rigidly placed with at least 25 µm membrane-surface clearance from the plane. Source hashes, cell identities, currents, placement and detector events accompany the saved data. See [the comparison guide](INTERFACE_COMPARISONS.md) for the paired fixtures, shared scales, per-cell recordings, and full comparison import/export.

* Ongoing firing: 260 ms; explicit cell-specific somatic current starts at offsets 0–22 ms. All twelve cells produce at least two complete somatic events. This is imposed patch-style drive, not spontaneous resting activity or a cortical network.
* Evoked example: 100 ms, no somatic drive; pad 5, 40 µA, 200 µs cathodic and anodic phases separated by 100 µs, 20 Hz from 20 ms. Cell 8 (601927090) has complete events at 20.870914 and 70.793808 ms, with peaks +14.0754 and +14.8585 mV. Other cells have no somatic events; all remain solved. The corresponding zero-current check has no event in this cell. This exact run is reproducible; it is not a converged threshold or biological selectivity result.

The detector requires an upward −25 mV crossing, peak ≥ 0 mV within 3 ms, repolarization below −40 mV within 20 ms, and a 2 ms refractory interval. Raw crossings remain exported. These known soma events are separate from detection in an extracellular recording and from proof of propagation.

Saved example compartment Vm is encoded at 0.01 mV resolution (maximum rounding error 0.005 mV). Solver integration, current projection, event detection, soma traces and extracellular signals use unrounded values. This compact representation keeps the default below the host's per-file size limit. Custom worker results retain Float32 replay samples. The loop repeats the recorded window; it does not advance biological time beyond it.

## Evidence and retained limitations

`INTERFACE_CELL_PRESETS.md` and `interface-cell-calibration.json` retain the calibration and failed candidates. All twelve final drives retain sustained complete soma events at 40 and 20 µm. Eleven final-current cases also pass the half-timestep persistence check; the revised 2.0 nA drive for 508378649 was not checked at half dt. Counts and times differ with resolution, including a 37.134 ms spatial ordinal-event timing difference. These checks do not establish waveform or threshold convergence.

`interface-field-numerics.json` retains 160/360/640-panel checks. The sampled 160-to-640-panel maximum potential difference is 1.878%; contact transfer voltage differs by 2.067%. Current balance, weak equipotential constraints, reciprocal symmetry and independent rectangle integration checks pass. No independent solver has validated this new multicontact problem.

Integration tests reconstruct total membrane current independently from the cable voltage differences and injection (KCL), then project the reciprocal field to check recorded signals. They also check pulse charge, contact selection, complete morphology retention, plane clearance, stimulus artifact alignment, binary encoding, exact saved-example event counts and source fingerprints. The saved runs must be regenerated when relevant source fingerprints change. Older disk evidence is not transferred to the new interface.

## Reproduce

```sh
node scripts/interface-calibrate.mjs
node scripts/interface-field-validation.mjs > docs/cortex/interface-field-numerics.json
node scripts/interface-default.mjs
node scripts/interface-default.mjs --evoked
node --test tests/interface-*.mjs
npx astro build
```

The calibrated current table includes bounded follow-up and refinement studies documented in the calibration report; a fresh initial scan alone is not the entire retained evidence history. Do not overwrite that history with an incomplete rerun.

Browser visual QA is pending: the supported browser-control capability was unavailable in this managed environment. Static compilation and numerical checks do not substitute for interacting with the rendered page.
