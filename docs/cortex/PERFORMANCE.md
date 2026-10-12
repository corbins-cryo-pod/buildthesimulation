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

## Unmeasured / next work

Browser CPU matrix (Chrome/Firefox/Safari), mobile, rendering FPS, startup/bundle
cost, total peak memory and GPU benchmarks remain open. WebGPU/WASM are not adopted
without a measured bottleneck and new precision tests. The existing Three.js mesh
does not require thousands of neurons for this first scientific experiment.

Larger future runs need chunked output, decimation with defined error, progressive
computation and/or offline reference libraries. Do not retain unrestricted full
multicompartment histories or giant generated artifacts in Git.
