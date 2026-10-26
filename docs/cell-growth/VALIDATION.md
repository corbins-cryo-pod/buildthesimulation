# Cell Growth Lab: verification and validation scope

The Cell Growth Lab is an exploratory, coarse-grained mechanochemical model. Its
numerical tests establish properties of the implemented model. They do not
establish that a particular human stem-cell culture, organoid, regenerating nerve,
or biohybrid implant will develop as shown.

## What must be verified

The release gates cover five distinct questions:

1. **Geometry:** do finite-radius growth segments detect an intervening obstacle
   even when both endpoints are outside it, and remain inside the modeled world?
2. **Causality:** do actin, microtubule support, membrane supply, tension, and
   developmental state affect the quantities their equations claim to control?
3. **Topology and state:** are neurite parent links valid after branching and
   retraction, and do cells, tips, membranes, and metrics remain finite and
   internally consistent?
4. **Numerics:** can a saved experiment resume exactly within the same runtime,
   and do deterministic continuous-growth results converge when the timestep is
   reduced?
5. **Interpretation:** are physical contacts kept distinct from candidate
   connections and from experimentally demonstrated functional synapses?

These checks are separate from appearance. A plausible image is not a validation
result.

## Predeclared numerical criteria

Analytic geometry tests use an absolute tolerance of `1e-9 µm` for small,
well-conditioned synthetic cases. Morphology bounds use `1e-7 µm` allowance for
floating-point roundoff. Identical seeded runs and save/resume results must agree
exactly within one JavaScript runtime; exact bit equality across different
JavaScript engines is not promised.

Timestep refinement is assessed in a deterministic, uncrowded configuration with
branching, growth episodes and angular noise disabled. The same initial state is used at `0.05`,
`0.025`, and `0.0125 h`. Continuous length error must decrease with refinement;
the coarse-to-fine difference must be below 5% of the fine reference length.
Stochastic arbors are assessed across seeds, because changing the timestep also
changes event sampling and is not expected to preserve an individual random
trajectory.

Playback chunking is checked separately: one `24 h` request is compared with
`240 × 0.1 h`, `48 × 0.5 h`, and `24 × 1 h` requests using the same internal
timestep and seed. Branch and segment counts must agree, relative length
differences must be below `1e-7`, and corresponding segment endpoints must differ
by less than `1e-7 µm`. Playback speed must not change the experiment.

Zero-driver and resource tests do not replace the equations with special test
implementations. They exercise the same engine used by the browser. Mechanical
collisions are checked with long trial segments, including obstacles thinner
than a requested growth step, to expose endpoint-only collision errors.

The membrane-area reserve ledger uses the identity

`remaining reserve = initial reserve + supplied area + recycled area − used area`.

It accounts for the reserve used by growing neurite shafts. It does not assert
that elastic changes in the soma mesh preserve total cell surface area exactly.
The stringent depletion case sets membrane supply and tension to zero while
increasing actin drive; reserve cannot be overspent even when tension supplies
no opposing force.

## Regression cases found during development

The independent whole-tree audit exposed a collision error that isolated
growth-tip sweeps did not reveal: replacing the endpoint of a short existing
shaft can cut across a solid or another shaft. The final solver checks the
entire proposed shaft chord and preserves the old corner when necessary. The
suite includes that constructed failure case and audits full trajectories after
36 hours in all four environments. The quantitative report additionally audits
the final whole trees of four 72-hour preset experiments.

Other regression checks cover membrane-reserve exhaustion without replenishment,
the removal of a timestep-dependent displacement ceiling, candidate contacts
lost after separation, and imported files with invalid material fractions or
topology. These tests remain part of the normal site test suite.

The shell checks verify a closed triangulated surface, its independently
reconstructed area, finite deformation, and the reserve ledger. They do not
establish a mesh-converged continuum membrane solution, a measured material
modulus, or a fully converged mechanical equilibrium.

## Biological interpretation

Growth cones are modeled as overdamped structures: a collision changes force,
direction, stalling, or retraction. An elastic, inertial bounce is not treated as
a biological growth-cone response. Effective substrate stiffness is not assumed
to have a universally monotonic relationship with extension. Cell-type-specific
self-avoidance and fasciculation are adjustable model rules.

The model draws qualitative mechanisms from primary research on motor-clutch
coupling, microtubule stabilization and polarity, stochastic dendrite growth and
retraction, and dendritic self-recognition. The exploratory parameter set is not
a fit to a human differentiation protocol. Its developmental clock is not a
prediction of the time required to differentiate a patient's cells.

## Required future empirical validation

Before quantitative biological prediction, a specified cell type and protocol
need time-lapse morphometry and perturbation data. Relevant targets include
axon and dendrite extension/retraction velocities, growth-cone turning after
contact, branch lifetimes and order distributions, Sholl profiles, polarity
timing, membrane area changes, and force or retrograde-flow measurements.
Training and held-out experiments must be separated. Culture, organoid,
regeneration, and biohybrid environments require separate validation datasets;
success in one cannot establish the other three.

Functional connectivity additionally requires electrophysiological or calcium
measurements and controls that distinguish synaptic transmission from direct
activation. A persistent geometric candidate connection alone does not meet
that criterion. Myelination and detailed electrophysiology are outside this
release's validation scope.

## Mechanistic evidence and its limits

| Primary study | Mechanism informing the model | What the numerical checks cannot establish |
| --- | --- | --- |
| [Cifuentes et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11064671/) | Actin motor-clutch coupling and substrate-dependent growth-cone mechanics | An effective stiffness or force fitted to a particular assay is not a human stem-cell-neuron parameter. |
| [Witte et al., 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC2234250/) | Local microtubule stabilization and axon specification | A simplified state transition does not reproduce a molecular differentiation program. |
| [Ferreira Castro et al., 2020](https://elifesciences.org/articles/60920) | Stochastic dendrite extension, retraction and branch survival | Branching rules inspired by Drosophila do not establish human dendritic morphometry. |
| [Lefebvre et al., 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3427422/) | Cell-identity-dependent dendritic self-recognition in specific mammalian neuron types | Self-avoidance is not a universal fixed rule for every neuron type. |
| [Franze et al., 2009](https://pubmed.ncbi.nlm.nih.gov/19804718/) | Growth-cone mechanical responses, collapse and retraction | A collision in the coarse model does not reproduce every molecular or calcium response to load. |

## Release evidence: model 3.0.0

Current, source-hashed outcomes live in
[`cell-growth-validation.json`](../../src/data/cell-growth-validation.json) [cell-growth-mechanics-validation.json](../../src/data/cell-growth-mechanics-validation.json), and
[cell-growth-cohort-validation.json](../../src/data/cell-growth-cohort-validation.json).
The build verifier rejects stale source hashes and a failed gate in the numerical reports or an incomplete/failed cohort study.
See [V3 research](V3_RESEARCH.md) for microscopy observations and modeling limits.
[V3 verification](V3_VERIFICATION.md) records the release review and browser limits.
[V2 verification](V2_VERIFICATION.md) is a historical record, not evidence for the
current model. Current reports must be regenerated after relevant source changes.

The four environment studies run the complete moving-cell engine for 72 model
hours. Full-tree audits include finite shafts, conservative soma envelopes,
solids, world bounds, foreign growth cones and material accounting. The matched
24-hour neurite interventions clamp soma motion in both arms to isolate tip
extension from mechanical stretching of an attached root. The separate mechanics
report studies freely moving cells. A clamped fixture is identified in the report
and must not be interpreted as a migration experiment.

## Reproduction

Run `node --test tests/cell-growth*.mjs` for the numerical unit and integration
suite. Run `node scripts/validate-cell-growth.mjs` for the quantitative release
report saved in `src/data/cell-growth-validation.json`. Run
`node scripts/validate-cell-growth-mechanics.mjs` for the independent mechanical
report. Run `node scripts/validate-cell-growth-cohort.mjs 16` for the 64-run
cohort study, and `node scripts/verify-cell-growth-build.mjs` after building.

The quantitative report records the exact model version, input conditions,
acceptance criteria, numerical outcomes, source-file hashes, and runtime. Its
measured timings exclude browser rendering and network overhead and should not
be interpreted as a guarantee for every device.

## V3 morphology and motion criteria

New tests check finite-speed wave transport through a bent tree, non-duplicating
branch selection, zero-driver suppression, continuous episode-control blending,
independent filopodial extension/retraction and renewal-stream timestep partition.
They check young-joint displacement bounds, preservation of parent/child joints,
anchoring of established shafts, a swept thin-barrier case, surface-budget
accounting, display taper inside collision envelopes, the true mesh silhouette,
and immutable display interpolation with exact endpoints. New local random
streams and transient buds must survive JSON save/resume exactly.

A 72-hour culture study found a junction-withdrawal failure: a short terminal
segment could retire within the withdrawal tolerance while leaving its tip active
on a parent with a surviving daughter. A later advance could then detach that
daughter. The corrected transition deactivates the tip at that junction. A
constructed regression verifies the parent's endpoint remains unchanged after
renewed actin drive.

A later organoid seed exposed a finite-root boundary error: mechanical motion
kept the membrane attachment vertex inside the sphere while part of the attached
shaft's radius crossed its boundary. Root capsules now participate in the
mechanical line search for both spherical and rectangular world bounds. A
constructed outward-traction test checks both shapes, a free-cell control,
attachment continuity and the membrane ledger. Initiation also checks the
starting attachment's shaft clearance.

The cohort runner uses 16 predeclared seeds (`101 + i × 104729`, i = 0…15) in
each of four public environments. Each independent run is requested to 72 hours
and is audited every 12 hours. The runner records actual reached times and any
capacity stop. Criteria are zero disconnected parent links, solid penetrations,
foreign-soma penetrations, unrelated-shaft penetrations, boundary violations,
and out-of-envelope taper; maximum membrane-ledger residual must be below
`1e-6 µm²`. Every final state must round-trip exactly through JSON restoration.
Four isolated workers improve throughput without sharing simulation or random
state. Report source hashes include the runner itself.

These checkpoint checks do not prove continuous-time collision freedom or
biological realism. Growth-cone-envelope checks also remain in the independent
four-preset quantitative report. Appearance and browser interaction require a
separate visual review; numeric gates alone cannot certify them.

A slow-playback regression additionally compares all four UI speed choices from
the same 12-hour saved state through 14 hours. The complete resulting states
(including all random streams) must be deeply equal. Slow playback uses whole
configured solver steps and longer display intervals, not a smaller numerical
timestep. This prevents a viewing preference from changing the experiment.

## V4 mechanics and connectivity

`node scripts/validate-cell-growth-connectivity.mjs` records three matched
24-hour root-mechanics arms and an eight-cell culture grown from random placement
for 48 hours. It requires coupling to prevent long roots even with settlement
disabled, continued soma displacement, a closed material ledger, naturally formed
transmission-ready contacts, a postsynaptic response and a silent blocked control.
The release also tests independent energy gradients, force and torque balance,
swept joint collisions, finite probe sensing, recognition, inhibitory responses,
contact-bearing material withdrawal and an unchanged growth state after electrical
testing in the actual worker. All report source hashes must match the release.

These are checks of the declared reduced model, not experimental electrophysiology
or a fitted human neuronal culture.
