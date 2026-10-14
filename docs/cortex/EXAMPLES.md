# Reproducible laboratory examples

`src/lib/cortex/examples.js` contains nine curated human-cell, immutable **complete**
experiment configurations. Loading one resets all experimental settings,
including model, positions/orientations, contacts, waveform, reference and
numerical resolution; it clears the current result and preserves a separately
pinned baseline. Display suggestions are stored outside the scientific config.
An edit after loading requires another run. A model name or example title alone
is not sufficient to reproduce an experiment: export the full configuration.

Select an example, load its settings, inspect the geometry and input, then run.
After completion, replay the pulse and membrane response. Pin a completed result
before loading its named comparison; the baseline must retain its own geometry,
configuration and time samples. Compare recording components in µV separately
from membrane voltages in mV. Export the result/configuration to retain provenance.

## Measured outcomes

The values below were calculated with the current JavaScript solver, not written
into its outputs. The executable generator and complete, hashed configurations
are retained in `benchmarks/examples-latest.json`. Times use an upward −25 mV
crossing detected on internal solver steps; the soma detector uses a 2 ms
refractory interval. Local crossing counts are membrane compartments crossing
at least once, not cells, recruited axons or an experimentally measured spike
population. Peak soma values below are maxima of the retained output samples.

The seven original active examples use the published human temporal L2 model 571654895 at
34 °C, 40 µm maximum compartment length, 0.005 ms integration, 0.05 ms output,
100 ms no-drive conditioning and a 40 ms experiment. The soma is at
[−100, −200, 1500] µm with zero cell rotation. All examples use the homogeneous,
unbounded 0.3 S/m conductor, line-source neural recording and 25 µm exclusion.
The pial plane is Z=0 and positive Z is depth. These choices do not introduce an
electrical boundary at the pia or illustrative cortical layers.

| Example | Exact input or controlled change | Soma event (ms) | Local crossing count | Peak sampled soma (mV) |
| --- | --- | ---: | ---: | ---: |
| Active intracellular below threshold | +0.05 nA, 5–10 ms | None | 0 | −91.0188 |
| Active intracellular spike | +1.2 nA, 5–10 ms | 9.29395 | 141 | +23.6825 |
| Extracellular local crossings | 40 µA, 200 µs phases, 100 µs gap; unshifted array | None | 10 | −87.2025 |
| Extracellular soma spike | 40 µA, 1000 µs phases, 100 µs gap; array [100, −50, 0] µm | 5.38182 | 135 | +31.2781 |
| Placement comparison | Same 1000 µs experiment; only array translation becomes [0, 0, 0] µm | None | 112 | −79.5789 |
| Polarity comparison | Same shifted 1000 µs experiment; source/return contact order reversed | 6.65722 | 130 | +31.2437 |
| Recording components | Same physical experiment as the 200 µs local-crossing example | None | 10 | −87.2025 |

The extracellular examples begin at 5 ms. Their stimulating contacts are r4-c4
(A, cathodic-leading) and r4-c5 (B, equal/opposite return); the polarity example
swaps this order. Recording sites are r3-c3 and r3-c6. The array has zero rotation
in every example. The two intracellular examples differ **only** in injected
current; the bath return is [2000, 2000, −500] µm and recording sites are r4-c4
and r4-c5. Complete values, including inactive protocol fields, are in every
configuration. The passive example has no active channels or spike detector;
“small response” describes its calculated excursion, not a predicted threshold.

The array-driven soma-spike candidate was reproduced at the exact requested
40 µA / 1000 µs / [100, −50, 0] µm settings with a declared 100 µs gap. Its first
local crossing occurs in `dend[11]:0` at 5.37996 ms, shortly before the soma.
Reversing polarity first crosses `apic[35]:2` at 5.12787 ms and produces a later
soma event. This demonstrates a model response to field orientation; it does
not establish a biological spike initiation site. Strong modeled soma
hyperpolarization reaches approximately −130.45 mV in the shifted case and
−143.50 mV in the reversed case. Such large excursions reinforce the limits of
treating these idealized illustrative inputs as real-device recommendations.

## Recording contrast and controlled comparisons

At r3-c3/r3-c6 the 40 µA applied artifact peaks at **6893.88 µV** in every
extracellular example. Its sign reverses across phases and the polarity pair.
The local-crossing example's neural peaks are only **0.23355/0.15312 µV**.
Display neural, applied and total components separately to see each scale.
The total is their algebraic sum, not an inferred spike signal or an amplifier
output. Applied potential is zero in the interpulse gap and after the pulse,
while membrane currents and their neural potential may persist.

Every individual contact is referenced to zero potential at infinity. Bipolar
A−B subtracts those two contact potentials; it does not move the ground to a
local anatomical surface. The source A/B labels and recording A/B labels refer
to separate ordered pairs. Membrane voltage is intracellular minus local
extracellular voltage and is not interchangeable with either contact trace.

The shifted/unshifted placement pair changes the whole implant translation,
including recording contacts, while leaving the cell fixed. Source-to-probe
distances within the array remain identical: their applied artifact traces
agree exactly, while neural traces and soma outcomes differ. The polarity pair
changes only the ordered stimulating IDs: applied traces negate exactly, while
the nonlinear membrane response does not. The recording-components example has
the same physical config and calculated membrane history as the local-crossing
example; only its suggested initial display component differs.

## Reproduction and verification scope

From the repository root:

```sh
node scripts/verify-cortex-examples.mjs
node --test tests/cortex-examples.mjs
```

The generator executes all nine human-cell examples, checks the declared qualitative
outcomes, finiteness, current conservation/KCL (<1e−8 nA), per-contact charge
(<1e−10 nC error), signal decomposition/reference (<1e−10 µV error), output
budgets and the controlled applied-artifact comparisons. It writes actual
spike times, every local crossing and its location, soma/selected-compartment
statistics, contact/component statistics, phase/rest snapshots, timing, memory,
configuration hashes and executable/source hashes. It refuses to write a
passing report if a check fails or sources change during calculation.

The regression suite detects stale source/configuration hashes and reruns the
three new array soma/placement/polarity configurations. Exact numerical regression
is distinct from convergence and from independent simulator agreement. The
existing independent NEURON/LFPykit cases cover the active intracellular
examples and the 200 µs extracellular local-crossing case; the 1000 µs shifted
and reversed examples were newly reproduced in the laboratory kernel, without
new independent native-simulator fixtures. See [ACTIVE_MODEL.md](ACTIVE_MODEL.md)
and [REFINEMENT.md](REFINEMENT.md) for those separate verification scopes.

Across the development verification passes, the passive example took about
0.04–0.06 s; the first active example took 4.29–5.31 s including conditioning;
later examples took 1.31–2.41 s with identical conditioning reused. Concurrent
development load affected timings. The passive numerical outputs
occupy 1,344,840 bytes; each active example occupies 18,386,840 bytes. These are
solver times and retained output-buffer sizes, not browser rendering rates or
whole-process peak memory. Maximum measured conservation and KCL residuals
were approximately 2.06e−12 and 2.01e−12 nA. Timings are machine-specific; exact
values for the latest pass and runtime information are in the generated report.

These examples preserve the model's reconstructed dendrites, fitted mechanisms,
published synthetic 60 µm axon stub and Allen noncommercial redistribution
license. The study is a single-cell, one-way forward calculation with ideal
point contacts. No finite electrode surface, impedance, shank obstruction,
layered conductivity, acquisition electronics, injury, cortical-population
recruitment, biological selectivity or safe human stimulation level is inferred.
Original fitting to experimental data is not independent biological validation
of this port or these protocols.


## Sustained current-clamp examples (2026-10-14)

Two additional examples use the same fitted human cell, unchanged mechanisms,
40 µm mesh, 0.005 ms integration and 100 ms no-drive conditioning. A constant
+0.3 nA (300 pA) soma current is applied with the existing equal/opposite bath
return. No spike train is prescribed: repeated action potentials emerge from
integration of the original channel and cable equations.

| Example | Current window | Recording | Saved interval | Soma events | During-step count rate |
| --- | --- | --- | --- | --- | --- |
| `active-current-step-200ms` | 20–220 ms | 250 ms | 0.1 ms | 9, all during step | 45 Hz |
| `active-current-step-500ms` | 50–550 ms | 600 ms | 0.25 ms | 18: 17 during step, 1 after | 34 Hz |

The 200 ms step's first crossing occurs at 43.394546 ms (latency 23.394546 ms).
Its first and last interspike intervals are 11.336086 and 30.631592 ms. The 500 ms
step's last crossing is at 550.371530 ms, just after current offset; the during-step
summary intentionally excludes it, while the full spike table/export includes it.
During-step means onset <= event time < offset. Count rate is count / duration;
it is not a claim of stationary firing. Interval growth illustrates adaptation in
this fitted model, not a universal human-neuron response.

These two examples also differ in onset, recording length and saved interval;
they are not a one-variable comparison. Pin either, change only amplitude or
step duration while preserving an adequate recovery window, and rerun for a
controlled comparison. Loading an example retains the existing reset disclosure.
For waveform peaks choose a shorter recording and finer saved output. Spike
counts/times use all internal timesteps regardless of retained frame spacing.

Native NEURON/LFPykit long-step verification and reproducible commands are recorded
in CURRENT_STEPS.md. These cases do not resolve the earlier spatial-refinement
failures and do not simulate pipette resistance, clamp electronics or a population.


## Human-only laboratory (2026-10-14)

The simplified passive example is retired. All nine current examples use the
same published human model and preserve their prior exact active configurations.
The laboratory starts with `active-intracellular-spike`; reset restores it.
An old `?example=passive-subthreshold` link now loads the human intracellular
subthreshold example with an explicit retirement notice. It does not promise
matching passive dynamics. Version-1 passive configuration imports are rejected
with guidance; they are never silently relabeled as human active experiments.
Historical passive measurements and independent fixtures are retained as offline
mathematical verification records, not offered in the interactive interface.
