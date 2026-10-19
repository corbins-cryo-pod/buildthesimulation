# Finite-contact scientific verification milestone

## Scope and fixed gates

This study checks specimen 601927090 at one fixed physical placement, the pinned 25 µm-radius disk, conductivity 0.3 S/m and one biphasic waveform. All meshes use the same placement calculated from the 10 µm morphology. It is numerical verification, not independent experimental validation. The pre-existing neural failures and original integration report are retained.

Before computation, gates were specified in the generators: 2% relative local-boundary midpoint change, independent NEURON maximum waveform error 1 mV at soma / 2 mV across physical membranes, identical local-crossing masks and somatic event counts, and shared local-crossing timing error ≤0.1 ms. The independent field study uses 5% potential / 8% field-vector differences and mesh/domain changes. Passing sampled gates is not a global error bound.

## Neuronal study

The browser solver scans 0, 1 and 5–100 µA in 5 µA steps at 40/20/10 µm maximum compartment lengths and 0.005/0.0025 ms timesteps. Every detected change in local crossing, somatic crossing or sampled somatic overshoot-and-return classification is refined to ≤0.1 µA. Both onset and loss transitions are retained. Narrow response windows between scan points may be missed. No somatic transition was found; this does not prove absence of firing at every intermediate amplitude.

The initial local onset moves from about 75.7 µA (40 µm mesh) to about 62.1 µA (20 µm mesh). This fails 2% convergence. The 20→10 µm local-onset change passes the sampled gate, but crossing compartment counts still differ. Local crossing is not proof of a regenerative action potential, somatic action potential or propagation.

A common 70 µA follow-up was chosen after seeing the coarse/intermediate scan. It exposes classification sensitivity; it is an explicitly exploratory selection. Soma traces and classification differences are retained. Independent runs include zero and 1 µA, 100 µA, each bracket endpoint, and 70 µA at all six resolutions.

The native harness independently imports the source SWC and fits through the existing source-model adapter, compiles original NMODL with NEURON 9.0.1, checks geometry/topology invariants, independently parses and samples the hashed binary field, applies matched conditioning, temperature and step-averaged forcing, then records every output-frame physical membrane voltage. Only after all native runs does it open browser voltage solutions for comparison. It shares the field export and upstream morphology-processing conventions, so this is independent neuronal dynamics, not an end-to-end independent biological model. Reports retain exact configurations, source and compiled-library hashes, measured versions, classifications, errors and soma traces.

All 36 corrected matched cases passed. Maximum soma discrepancy was 2.44×10⁻¹⁰ mV, maximum physical-membrane discrepancy 1.17×10⁻⁹ mV, and shared local-crossing timing discrepancy below 1×10⁻¹¹ ms. This near-roundoff agreement verifies the matched implementation of the prescribed equations; it does not confer that precision on biological predictions. The local onset changed about 21.4–21.9% between 40 and 20 µm meshes, versus about 0.126% between 20 and 10 µm. No somatic onset bracket was found in the sampled range.

### Corrected harness defect

An initial development run incorrectly assigned NEURON `e_extracellular` at zero-area section endpoints as well as physical segments. NEURON range variables at endpoints alias adjacent segments; a minimal three-segment probe showed assigning the endpoint overwrote the last segment's field value. This produced spurious native recruitment, including a somatic event at 100 µA. The harness was corrected to assign physical membrane segments only, matching the established native reference implementation. Those initial results are invalid harness output, not evidence of a browser solver defect. The final report is from the corrected harness. Neither neuronal mechanisms nor browser forcing were tuned to improve agreement.

## Independent field solver

The gallery uses a collocation boundary-element discretization of an infinite half-space. The independent check uses a three-dimensional cell-centered finite-volume discretization of Laplace's equation. Conductive bottom faces are held at 1 V, other bottom faces carry zero normal current, and the outer box is grounded. The measured contact flux normalizes potential to unit current. Electric field is computed from the numerical spatial gradient and interpolated to fixed test points.

The nominal shapes are rasterized independently; contact-area discrepancies are reported rather than hidden by shape rescaling. Initial near-contact spacings are 0.125 and 0.0625 equivalent radii, with progressively coarser cells away from the contact. Initial extents 16 and 32 radii failed the potential domain gate. Extents 64 and 128 were added to resolve that demonstrated return-boundary sensitivity, keeping the original gates and retaining the initial results. This is a targeted refinement after a failed check, not a tolerance adjustment. The final comparison covers 24 locations, heights 0.5–2 radii, and does not certify the gallery's 0.2-radius lower sampling limit.

The first extended-domain solve exhausted 300 conjugate-gradient iterations with smoothed-aggregation AMG. The linear preconditioner was changed to Ruge-Stuben AMG and the iteration cap increased to 1000, retaining the 1e-10 residual tolerance and all physical gates. The final study passes all declared sampled gates. Maximum BEM-versus-finite-volume differences across shapes are 1.64% potential and 4.85% field vector; final domain potential changes are about 2.0–2.1%. Initial failures remain in `initialStudy` in the report.

## Reproduce

Use Python 3.12 and an isolated environment with `scripts/cortex-finite-rigor-requirements.txt`; measured runtime versions are in the reports. This run used system NumPy/SciPy rather than claiming the historical reference requirements were installed. Compile original mechanisms in a scratch directory using `CXX=g++ CC=gcc nrnivmodl /absolute/repo/scripts/cortex-active-mechanisms`. Set `CORTEX_ACTIVE_MECHANISM_LIBRARY` to its `x86_64/libnrnmech.so`.

From the repository root, run in this order:

```
node scripts/cortex-finite-rigor.mjs /tmp/cortex-finite-rigor
node scripts/cortex-finite-focus.mjs /tmp/cortex-finite-rigor
python scripts/cortex-finite-native.py /tmp/cortex-finite-rigor
OPENBLAS_NUM_THREADS=2 python scripts/cortex-gallery-independent.py
OPENBLAS_NUM_THREADS=2 python scripts/cortex-gallery-independent.py --extend-domain
node scripts/build-cortex-evidence.mjs
node --test tests/cortex-experiment-evidence.mjs tests/cortex-finite-contact.mjs tests/cortex-finite-lifecycle.mjs
```

Full browser/native physical-membrane traces are reproducible scratch intermediates. Published reports retain all matched-case metrics, configurations, soma traces and hashes. Do not treat unmatched configurations as verified. A source/report hash regression gate prevents stale evidence from silently surviving changes to the recorded physics code.

## Remaining limits

No biological validation, propagation proof, general somatic threshold, population selectivity, finite-shank solution or interacting-contact solution is claimed. The finite field remains restricted to its existing whole-cell coverage. The geometry gallery remains separate from neuronal forcing. Browser visual QA is pending because the supported browser-control capability is unavailable in this managed environment.
