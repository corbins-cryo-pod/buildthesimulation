# Sourced-cell distance clouds and population capacity

This milestone adds independent populations of the already integrated Allen human
temporal layer-2 cell, specimen 571654895. It adds **no invented neuron morphology,
new fitted conductance distribution, reduced point neuron, or claim of biological
diversity**. Every supported position uses the existing full active solver. The
published model still contains reconstructed dendrites, mixed-species channel
kinetics, and its synthetic 60 µm axon stub. One source specimen is reused.

## Default experiment

The page opens with the existing 40 µA extracellular soma-event configuration and
a distance cloud containing one reference target plus 16 new placements. Distances
from stimulating contact A to the new soma centers are:

`1, 2, 5, 12, 20, 28, 40, 60, 85, 120, 170, 240, 340, 480, 680, 960 µm`.

Each placement has a different seeded direction uniform on the sphere. The default
seed is 20261018. The generator is a pinned Mulberry32 sequence with uniform
azimuth and uniform cosine of polar angle. Changing count interpolates this ladder
in log-radius; changing its endpoints rescales log-radius. The target remains fixed
and is identified separately from the random-direction samples. Cell orientation
is held constant, isolating placement changes from morphology rotation.

Grid and concentric-shell layouts remain selectable. The grid has a uniform pitch
and expands through 3D integer-coordinate rings; shells use geometric radius
spacing and Fibonacci angular samples. Origin options are stimulating contact A,
the source/return midpoint, and the target soma. These are illustrative placements,
not measured cortical packing. Full arbors may overlap. No physical tissue or
mechanical collision resolution is implied.

The default positions include unsupported near-source cases deliberately. The
existing exclusion is **25 µm from the nearest modeled membrane**, not from the
soma center. The 1–20 µm somata cannot be supported by this point-source model;
other arbors may bring a dendrite too close even with a farther soma. Cortical-box
bounds also apply. The default has **17 placed, 8 simulated, 9 excluded** cells.
Excluded cells remain visible in gold, with a reason and null response in JSON
and blank soma columns in CSV. They do not count as inactive or contribute fake
zero traces. The target must pass preflight. An integration failure in any
supported cell stops the batch and identifies that cell.

## Computation and retention

Independent cells receive the same prescribed extracellular field and are solved
serially in a Worker with the same timestep and sampling grid. This is equivalent
to concurrent integration for this uncoupled system; there are no synaptic or
ephaptic interactions. Conditioning is shared only when model, discretization,
timestep and conditioning duration are identical. Each stimulus response is
integrated independently at its own world position.

Only the target retains full voltage/current/channel histories. Neighbors retain
sampled soma voltage and the existing response-analysis summaries. The runner
retains one neighbor's full result at a time, sums its neural recordings, then
releases that detailed result. Typed buffers transfer without copies, with alias
deduplication. Summed neural signals include simulated cells only. The shared
applied stimulus artifact is added **once**, not once per cell.

Local membrane crossings, soma threshold events, sampled positive overshoot and
recovery, and polarization remain distinct. Propagation is not established. The
3D neighbors use whole-run classifications; the target alone shows instantaneous
membrane-voltage replay. Applied potential/field slices remain separate from
membrane response. The distance-response plot shows individual points and never
interpolates a continuous activation volume or minimum resolvable separation.

## Capacity and measurements

Reproduce: `node scripts/benchmark-cortex-population.mjs`.
Exact inputs, CPU/runtime, output sizes, per-cell outcomes, timings and source hashes
are retained in `benchmarks/population-latest.json`; the methods page renders that
report. The grid benchmark uses 20 µA and fully supported positions. The default
cloud is separately measured at the existing 40 µA configuration. No browser,
rendering FPS, whole-process peak memory or GPU measurement is claimed.

At the default 40 ms duration, 0.005 ms timestep and 40 µm discretization, each cell
has 211 membrane compartments and 75 junction nodes. One detailed result is
18,386,840 bytes. A 64-cell result remains below 19 MB of retained typed arrays
because neighbor compartment histories are not accumulated. This does not bound
the whole browser: object, geometry, worker transport, other pinned runs, exports,
allocator/GC overhead and GPU resources are separate.

The operational limits are 64 cells, 200 million node-steps including one shared
conditioning pass, 16 MiB of compact population output, and the unchanged 64 MiB
per-cell detailed-output cap. Larger durations and finer resolutions reduce the
eligible maximum. These are conservative engineering limits, not universal hardware
maxima. No integration timestep, output sample interval or morphology resolution
is silently changed. Cancellation terminates the worker and invalidates its result.

## Verification and remaining scientific limits

`tests/cortex-population.mjs` checks deterministic radii/directions, random-direction
non-collinearity, actual source distances, strict provenance, rigid morphology
preservation, work limits, exclusion/null semantics, isolated-run equivalence,
neural superposition, one-copy artifact amplitude, CSV fidelity, typed-buffer
transfer, cancellation and shared-geometry disposal.

The existing numerical fixtures and sustained patch-clamp tests remain unchanged.
Independent NEURON comparisons apply only to their specified cases; there is no
new independent reference for every cloud or grid position. The six historical
spatial-threshold convergence failures are still unresolved. This population
feature does not establish biological activation probability, an activation
radius, M1/S1 applicability, synaptic network behavior or single-neuron selectivity.
Close-field physics and realistic full axons need separate model development and
validation before the gold near-contact samples can be calculated honestly.
