# Performance

Reproduce with `node scripts/benchmark-cortex.mjs`. It writes the small
`benchmarks/latest.json` containing exact configs, engine version, source base,
Node/CPU/OS, seven warmed samples per protocol and refinement/sensitivity results.
Timing naturally varies; do not use wall time as a deterministic correctness gate.

Default: one 48-compartment tree; two sensing sites; 40 ms biological time;
dt=.025 ms; 1601 frames; approximately 1.34 MB of numeric output arrays.

Initial Node measurements on this executor were approximately 8–18 ms median
per 40 ms experiment, or .2–.45 wall seconds per biological second. The checked-in
report is authoritative for the latest actual run. These are CPU-kernel measurements,
not supported-browser, consumer-laptop, mobile or one-second-network benchmarks.
They do not establish universal real-time performance.

## Algorithmic cost

- Tree solve and current readout: O(compartments × steps).
- Lead matrix construction: O(sensing sites × compartments), once per run.
- Recording multiplication: O(sensing sites × compartments × frames).
- Full voltage/current storage: O(compartments × frames), not a ring buffer.
- Field section: fixed 45×45 analytical samples, only when expanded.
- Rendering: event-driven; simulation timesteps never advance via animation frames.
- Worker results transfer typed-array buffers instead of copying them.

The bounded config caps duration, dt and compartment resolution. Combinations
above 2,000,000 compartment-frames are rejected before allocation (32 MB for the
main voltage/current arrays, excluding all other memory). No quality is silently
reduced. Without Workers, a main-thread fallback refuses >5000 steps.
This fallback can briefly block rendering; it is an accessibility fallback, not
a claim of progressive high-performance execution. Cancellation invalidates results
and terminates the worker. Numerical output memory excludes heap overhead, scene
meshes, GPU memory, JSON expansion and pinned comparisons.

## Active model measurements, 2026-10-13

Reproduce with `node scripts/benchmark-cortex-active.mjs`. The checked-in
`benchmarks/active-latest.json` retains exact configs, engine, runtime, timings,
output bytes and six threshold searches. This run was isolated from the reference
generators and test/build processes, on Node v24.19.0 and an AMD EPYC 9V74 CPU.
It measures the JavaScript CPU solver and diagnostics, not a browser or GPU.

All cases simulate 40 ms with 0.05 ms retained sampling (801 frames). Cold cases
also calculate 100 ms of no-drive conditioning. The repeated identical run reuses
the browser solver's conditioned state; it still integrates the entire experiment.

| Case | dt (ms) | Maximum length (µm) | Membrane / junction nodes | Solver time (s) | Numeric output (MB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default, cold | 0.005 | 40 | 211 / 75 | 3.60 | 18.39 |
| Default, identical conditioning reused | 0.005 | 40 | 211 / 75 | 1.13 | 18.39 |
| Half timestep, cold | 0.0025 | 40 | 211 / 75 | 7.17 | 18.39 |
| Refined morphology, cold | 0.0025 | 20 | 369 / 75 | 12.08 | 28.51 |

MB means 1,000,000 bytes. Output includes ten node-by-frame arrays (voltage,
total current and eight channel/current/state histories) plus signals, events
and time arrays. No reference solution is stored in website state. These are
single measurements, not portable timing guarantees. The warm default is about
28 wall seconds per simulated second, so real-time or one-tenth-real-time
execution is not achieved for this detailed active model on this runtime.

### Measured refinement

| Observable | Default | Half dt | Half dt + 20 µm mesh |
| --- | ---: | ---: | ---: |
| Soma crossing time (ms) | 9.293950 | 9.286283 | 9.251579 |
| Sampled soma peak (mV) | 23.68253 | 23.71756 | 23.53185 |
| Peak neural signal A (µV) | 4.773216 | 4.787982 | 4.842210 |
| Soma threshold bracket (nA) | 0.91875–0.9375 | 0.91875–0.9375 | 0.91875–0.9375 |
| Any-membrane extracellular bracket (µA) | 19.375–20 | 19.375–20 | 18.125–18.75 |

All three current-injection cases have one soma event. Halving dt shifts its
time by 0.00767 ms and signal peak by 0.31%; refining geometry shifts time by
another 0.03470 ms and peak by 1.13%. Local KCL/conservation maxima are below
3.6e−12 nA in these runs. Each resolution's intracellular traces were independently
checked against native NEURON/LFPykit; resolution changes are discretization
sensitivity, not disagreement between solvers.

The benchmark uses six bisections; the separate independent native default
threshold reference uses seven and gives narrower brackets. The extracellular
upper threshold changes by 6.25% under spatial refinement. A short localized
field varies along curved/tapered dendrites, so center-sampled field forcing and
endpoint-chord recording change with mesh. This stage reports that unresolved
spatial sensitivity; it does not certify a converged extracellular recruitment
threshold. Extend to the 10 µm mesh and changed poses in the next bounded study.

### Runtime bounds

Active integration is separate from retained sampling, and upward crossings
are detected on internal steps. Preflight limits both 2,000,000 node-frames and
64 MB of numeric active output, including channel arrays and signal/event overhead.
No quality is silently reduced. A four-entry worker-local conditioning cache
is bounded by supported model sizes. Active runs require a Worker; the passive
main-thread fallback remains available. Recursive buffer accounting/transfer
includes channel arrays and deduplicates aliases.

The renderer retains original tapered polylines, skips zero-area junction meshes,
fits the selected cell and avoids rebuilding geometry for cutaway/opacity changes.
Headless scene-object checks cannot measure mobile responsiveness, render FPS or
WebGL/fallback appearance. Those and browser peak memory remain pending.

## Unmeasured / next work

Browser CPU matrix (Chrome/Firefox/Safari), mobile, rendering FPS, startup/bundle
cost, total peak memory and GPU benchmarks remain open. WebGPU/WASM are not adopted
without a measured bottleneck and new precision tests. The existing Three.js mesh
does not require thousands of neurons for this first scientific experiment.

Larger future runs need chunked output, decimation with defined error, progressive
computation and/or offline reference libraries. Do not retain unrestricted full
multicompartment histories or giant generated artifacts in Git.
