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
without additional runtime dependencies. Adopt workers and pinned offline
NEURON/LFPykit references. Reject a premature in-browser whole-solver port or GPU precision claim.
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

Historical update: the user subsequently authorized publication of the passive
foundation. PR #243 was merged as `f910af3` and Cloudflare reported successful
deployment. The active milestone again requires a feature branch/review PR;
production merge awaits explicit approval.

## C009 — Independent reference of the declared soma circuit

Preserve the explicit radial half-soma resistance on each branch. Model it in
NEURON with five membrane-free geometric connector sections; do not copy the
JavaScript conductance matrix or fit connector values to outputs. Directly
attaching every branch to soma(1) shares one resistance and is a different model.
Adapter segmentation and applied-potential perturbations must leave retained
membrane responses unchanged within stated tolerance. This verifies the reduced
circuit, not 3D spherical conduction or human physiology.

## C010 — Separate independent currents and recording coefficients

LFPykit 0.6.2 consumes NEURON-generated currents and shared geometric inputs,
never browser output. Compare coefficients and neural/applied/total/bipolar
signals, in both point and line approximations. Keep fixtures small, pinned and
hashed; require regeneration after any generator/input change. Offline GPL
package code is not copied into or shipped with the website.

## C011 — Published human temporal model with original mechanisms

Select Allen/Mosher–Wei specimen 571654895 under its explicit noncommercial
redistribution license. Retain human morphology and fitted distributions, the
published 60 µm synthetic active axon, and mixed-species original kinetics.
Reject a generic HH replacement, an unsupported M1 identity, or treating source
training error as held-out biological validation.

## C012 — Native morphology preprocessing, transparent browser dynamics

Use a reproducible native SWC adapter to retain taper, area, axial resistance and
shared zero-area junctions at four resolutions. Export geometry/parameters only;
the browser solves channel/cable dynamics independently. Original NMODL remains
offline for numerical references. Retain the documented legacy sodium initializer;
do not silently repair the source model or start from invented equilibrium values.

## C013 — Complete trace references and explicit sampling

Compare every physical compartment across the full exported sampling grid, plus
internal-step crossings and independent recordings. Encode references with bounded
quantization far below acceptance gates, rather than replacing full traces with
snapshots or bundling large raw JSON. Keep current/gate sampling phases explicit.
Retain the worker between completed runs for a bounded conditioning cache; cancel
terminates it. Active runs require workers rather than blocking a CPU fallback.

## C014 — Publish the verified electrical workbench; preserve unresolved science

The 2026-10-14 request authorizes publication after appropriate checks even when
supported browser tooling is unavailable, provided that gap is explicit. Recover
unpushed checkpoint `1c8d104` and retain both existing engines and all unrelated
main-branch work. Publish visualization, workflow, verified examples and the
reproducible refinement findings through the existing GitHub/Cloudflare workflow.
No unverified physical-model replacement is introduced. Failed refinement gates
remain an isolated research finding, not a reason to loosen criteria or silently
change physical resolution. Historical publication restrictions above describe
earlier requests and do not override this authorization.

## C015 — Separate quantities, fixed replay scales and conservative source holes

Give Vₘ, contact outward current, applied tissue potential and individual ideal
recording potential separate legends, units and controls. Start with applied
point-source slices; defer neural volume, isopotentials and arrows until they add
verified utility. Never infer a field from two traces. Cache geometry transfers
and discard any plane cell intersecting an exclusion sphere; do not substitute
a finite source radius or conceal a singularity. Automatic color limits stay
fixed across an entire replay, including zero-current intervals.

## C016 — Complete example resets and exact comparison provenance

Ship immutable full configurations with measured outcomes, verification scope,
source/configuration hashes and executable generators. Loading an example
explicitly replaces all experimental settings and clears current results while
retaining one pinned baseline. Surface changed fields and separate membrane mV,
neural µV and artifact µV metrics; record the chosen display independently.
Default replay slows to 1 biological ms/s and phase buttons choose actual saved
samples. No output sample is fabricated to fill a missed pulse phase.
