# Targeted extracellular boundary refinement

This follow-up preserves the original `REFINEMENT.md` experiment, report, and
acceptance criteria. It tests the unresolved near-threshold classification and
extends selected cases with research-only native 5 and 2.5 µm meshes and a
0.000625 ms timestep. These options are not added to the public laboratory.

## Predeclared protocol and gates

All cases use the same published human temporal layer-2 model, original native
SWC geometry and channel densities, −80 mV initialization, 34 °C, and 100 ms
no-drive conditioning. The compact research harness uses the unchanged browser
active-cable kernel. It retains physical section-midpoint probes and neural and
applied recordings at 0.05 ms without phase alignment. A production experiment
is also run to verify the harness against the complete production output.

The primary boundary is **any physical membrane upward crossing of −25 mV by
15 ms**, not a demonstrated action potential or propagation criterion. Use the
original r4-c4/r4-c5 bipolar pair, 200 µs phases, 100 µs gap, and 5 ms onset.
Both initial 0 and 40 µA endpoints are evaluated, followed by eleven bisections.
All sampled amplitudes and classifications are retained; bisection does not prove
global monotonicity. The same 19 µA current is also applied on every mesh/time
setting, specifically to reveal classification changes that threshold summaries
can conceal. Fixed experiments last 20 ms.

The primary matrix uses 40, 20, 10, and 5 µm at dt 0.00125 ms, then 10 and 5 µm
at dt 0.000625 ms. A 2.5 µm / 0.000625 ms case extends the spatial sequence.
Selected 10 and 5 µm cases additionally repeat the original 1.2 nA, 5–10 ms soma
step and the moved 40 µA, 1 ms-phase extracellular soma-crossing candidate
(implant translation [100, −50, 0] µm).

Acceptance gates retain the original values: threshold bracket relative width
≤1%, conservative endpoint-envelope change ≤2%, unshifted voltage RMS ≤1 mV
and maximum error ≤5 mV, neural RMS ≤5% of finer absolute peak with a 0.01 µV
floor, artifact maximum difference ≤1e−7 µV, and current residual ≤1e−8 nA.
Event classifications must agree and timing difference must be ≤0.1 ms.
Geometry topology/section identity and integrated membrane/channel quantities
must be preserved to relative 1e−10; endpoint difference ≤1e−9 µm. A finer
solution is a comparator, not certified truth. No criterion is relaxed after
observing the results.

The harness checks the same −25 mV event definition and 2 ms soma refractory
interval as the legacy detector. It reports soma peak, first crossing location,
and local-versus-soma events separately. It does not infer propagation from the
temporal order of first crossings, or equate local forced polarization with a
regenerative action potential.

## Reproduction

Use the pinned NEURON environment and compiled original mechanisms from the
repository reference workflow:

```sh
CORTEX_REFERENCE_PYTHON=/path/to/pinned-env/bin/python \
CORTEX_ACTIVE_MECHANISM_LIBRARY=/path/to/x86_64/libnrnmech.so \
node scripts/cortex-targeted-refinement-study.mjs
```

The native adapter generates research meshes in a temporary directory; no public
model asset is rewritten. An already generated JSON can instead be provided
with `CORTEX_RESEARCH_MESHES=/path/to/native-meshes.json`. The report records its
hash and native generator metadata. It writes only
`docs/cortex/benchmarks/targeted-refinement-latest.json`.

## Results

See the machine-readable report. A completed report contains every threshold
trial, exact physical configurations, source hashes, geometry invariants,
fixed-current classifications, fixed-probe waveform errors, and explicit failed
gates. Numerical agreement with another solver is evaluated separately in the
new native-reference work; this study alone cannot establish it.
