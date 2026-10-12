# Current project audit

Inspected base: `6104dd09d708ff460817f8ddc4e6b0060c75deb4` on `main`.
Feature branch: `feature/cortex-laboratory-foundation`.
Audit conducted 2026-10-11/12. Public site and both cortical routes were inspected
through retrieved HTML; no interactive browser testing was available.

## Existing architecture

Astro 5.17.1, Preact 10, Three.js 0.182; static output. Existing Node tests and
two PR build workflows. `src/layouts/Layout.astro` supplies compact/wide variants,
paper/light and dark themes, navigation and site search. No backend is needed
for the first bounded numerical experiment.

| Existing component | Finding | Decision |
| --- | --- | --- |
| `src/lib/devices/catalog.js` | Versioned, cited contact coordinates in mm; unknown area/channel map preserved | Single source for the initial Utah model; do not duplicate specs |
| `src/lib/devices/geometry.js` | Shared Three meshes and disposal; reconstruction caveats | Reuse directly; common rigid transform matches numerical contacts |
| `public/scripts/cortex-v2/engine.js` | Actual legacy recording route uses seeded event generation, empirical spike kernel and distance gain, not membrane-current forward physics | Preserve explicitly synthetic tool; do not adopt as scientific recording kernel |
| `src/lib/sim/cortex/` | Older typed contracts and Poisson/template forward code; not the current recording route's entry point | Do not mistake unused scaffolding for the live engine |
| `src/lib/stimulation/field.js` | Full-space diagonal-tensor point kernel, finite-source quadrature, regularized patches and interface RC/compliance | Keep legacy tool; future adapter needs boundary and quadrature error comparison |
| `src/lib/stimulation/membrane.js` | Reduced active cable; implicit tree solve, Pospischil-style kinetics and newly assumed spatial conductances | Reuse concepts; do not call this a validated human model or immediately merge its population assumptions |
| `src/lib/stimulation/anatomy.js` | Seeded V1 L2/3-oriented population and idealized arbors | Not an established human sensorimotor laminar model |
| Peripheral sandbox/designer | Separate coordinate and UI conventions | Leave untouched; later explicit adapters only |

The legacy stimulation tool is materially more developed than the synthetic
recording sandbox. Replacing it wholesale would lose useful functionality. The
new lab first establishes a simpler shared benchmark with explicit current
conservation; an active adapter is a later, separately verified migration.

## Highest-risk scientific assumptions

1. Representative slab ≠ regional histology. Layer fractions are not sourced
   measurements; no density or excitatory/inhibitory percentages are invented.
2. The Utah apex ≠ exposed-contact centroid. Point sampling and point stimulation
   do not establish a commercial electrode's near field or impedance.
3. Total membrane currents must include capacitance and synaptic current; ionic
   current alone creates incorrect extracellular signals and net monopoles.
4. Colored CSF/white matter do not modify the full-space homogeneous electrical
   solution. Implant conductivity and displaced tissue are also omitted.
5. Empirical datasets, fitted active channels and independent validation are
   missing. Analytical correctness alone cannot support neural recruitment claims.

## Integration footprint

New code is isolated to `src/lib/cortex/`, its Preact component, stylesheet,
two Astro routes, tests, benchmark script and these docs. Existing catalog and
legacy solver behavior are unchanged. A simulations tile, search entry and
navigation active-state condition make the lab discoverable without redesigning
the homepage or replacing prior routes.

Baseline verification before new work: 71 Node tests passed.
