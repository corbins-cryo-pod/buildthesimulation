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
branching and angular noise disabled. The same initial state is used at `0.05`,
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

## Release evidence: model 2.0.0

Current, source-hashed outcomes live in
[`cell-growth-validation.json`](../../src/data/cell-growth-validation.json) and
[`cell-growth-mechanics-validation.json`](../../src/data/cell-growth-mechanics-validation.json).
The build verifier rejects stale source hashes and a failed gate in either report.
See [V2 verification](V2_VERIFICATION.md) for the mechanical criteria, browser
checks and interpretation limits. The V1 results remain available in Git history;
they are not reused as evidence for V2.

The four environment studies run the complete moving-cell engine for 72 model
hours. Full-tree audits include finite shafts, conservative soma envelopes,
solids, world bounds, foreign growth cones and material accounting. The matched
24-hour neurite interventions clamp soma motion in both arms to isolate tip
extension from mechanical stretching of an attached root. The separate mechanics
report studies freely moving cells. A clamped fixture is identified in the report
and must not be interpreted as a migration experiment.

## Reproduction

Run `node --test tests/cell-growth.mjs tests/cell-growth-mechanics.mjs` for the numerical unit and integration
suite. Run `node scripts/validate-cell-growth.mjs` for the quantitative release
report saved in `src/data/cell-growth-validation.json`. Run
`node scripts/validate-cell-growth-mechanics.mjs` for the independent mechanical
report.

The quantitative report records the exact model version, input conditions,
acceptance criteria, numerical outcomes, source-file hashes, and runtime. Its
measured timings exclude browser rendering and network overhead and should not
be interpreted as a guarantee for every device.
