# Architecture decision log

## C001 — Shared world, not a third isolated cortical toy

Adopt one versioned config/world for recording and stimulation, importing the
existing catalog and mesh. Existing tools remain available pending adapters.
Reject duplicated device specifications and differently scaled tissue scenes.

## C002 — Passive verified first slice

Start with explicit passive membrane currents and analytical oracles. The legacy
active solver is useful but its morphology/channel allocation is not a validated
human sensorimotor model. Reject relabeling it as a high-fidelity human model, and
reject synthetic spike templates as the new recording engine.

## C003 — Canonical geometry versus measured anatomy

Use a 4 mm slab and clearly assumed fractions, not unsupported exact human M1
layers. No density background is rendered to imply cells were simulated. Curved
atlas geometry is deferred until licensing, region and deformation semantics are
defined. Preserve physical dimensions; camera crops do not scale the implant.

## C004 — Ideal apex probes, with near-field rejection

Utah exposed contact dimensions are unknown in the selected catalog reference.
Keep point sensing/stimulation explicit, reject close geometry, preserve null
area/channel map, and avoid fabricated finite-contact impedance or charge density.
Do not claim the 25 µm cutoff validates farther-field accuracy.

## C005 — Plain JavaScript worker kernel

Existing repository tests use Node ESM; transparent Float64 kernels integrate
without additional dependencies. Adopt workers now, offline NEURON/LFPy reference
later. Reject a premature in-browser whole-solver port or GPU precision claim.
CoreNEURON's extracellular restrictions require separate compatibility analysis.

## C006 — Physical source support survives refinement

Initial terminal-compartment synapse placement changed the experiment with dx.
Use a fixed distal 100 µm conductance patch, distributed by overlap. Tests retain
the <1% default refinement target. This is a synthetic distributed input, not a
single measured synapse; the distinction is visible in UI and exports.

## C007 — Separate source artifact and current-clamp return

Compute total outward current, including capacitance and synaptic contributions.
Explicitly close intracellular current injection with a bath return and retain
its field/artifact. Never equate soma injection with extracellular stimulation.

## C008 — No production deployment

User requested an isolated feature branch and reviewable PR, with no automatic
merge. Sites workflow guidance does not override that instruction. No hosting or
production branch changes are made. Browser QA unavailable here is an explicit
review limitation, not an assumed success.
