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

## Release evidence: model 1.0.0

The final frozen engine passes **30 individual numerical tests** and **20
quantitative report gates**. The report verifies that its source files did not
change during calculation. The engine SHA-256 is
`9c342067ebe0725a65362bf7450103d51fbf29805d06b1fe930ed9844a403931`.

All four preset studies used seed `314` and reached the requested `72 h` without
exhausting their segment budgets. Segment counts include inactive segments
retained for history and stable identifiers; length and contact metrics use live
geometry.

| Environment | Cells | Simulated time | Stored segments | Live branch points | Candidate contacts |
| --- | ---: | ---: | ---: | ---: | ---: |
| In vitro culture | 12 | 72 h | 7,423 | 60 | 11 |
| Organoid volume | 18 | 72 h | 19,819 | 132 | 0 |
| Nerve regeneration | 12 | 72 h | 14,927 | 85 | 5 |
| Biohybrid interface | 14 | 72 h | 19,012 | 148 | 9 |

The final whole-tree audits found **zero solid penetrations, zero other-cell
soma penetrations, zero world-boundary violations, and zero unrelated-shaft
penetrations**. The shaft audit checked 881,045 nearby segment pairs. This audit
does not classify the shared material at a same-cell branch junction as a
collision. Same-cell near-neighbor recognition is a separate model rule.

The deterministic 4-hour refinement study produced total lengths of
`58.5195096`, `58.1977368`, and `58.0363653 µm` at timesteps of `0.05`, `0.025`,
and `0.0125 h`. The coarse-to-fine difference was `0.8325%`; the intermediate
error was smaller. Playback chunking preserved segment and branch counts, with
a maximum corresponding endpoint difference of `1.6742 × 10⁻¹¹ µm`.

The no-supply, zero-tension depletion experiment retained a neurite membrane
reserve ledger residual of `5.6843 × 10⁻¹³ µm²`. Across the four 72-hour studies,
the largest per-cell ledger residual was `8.7312 × 10⁻¹¹ µm²`. The synthetic
contact experiment formed its candidate only after `0.3 h` of continuous
apposition and removed it after separation. The `0.3 h` threshold remains a
model assumption rather than a fitted biological measurement.

Five matched initial seeds (`101`, `202`, `303`, `404`, `505`) were run for each
of six 24-hour culture conditions, with four cells per experiment:

| Condition | Mean live total length | Mean live branch points |
| --- | ---: | ---: |
| Baseline | 3,741.15 µm | 13.2 |
| Actin drive set to zero | 2.48 µm | 0 |
| Microtubule support set to zero | 3.01 µm | 0 |
| Membrane replenishment set to zero | 497.93 µm | 1.2 |
| Membrane tension multiplier set to 3 | 2.76 µm | 0 |
| Branching hazard set to zero | 3,226.92 µm | 0 |

These are causal responses of the implemented equations. Residual length in the
zero-driver cases is retained initial geometry after retraction. The table does
not estimate treatment effects in biological neurons. Matched initial seeds
preserve initial cell placement; subsequent stochastic event streams can diverge
after an intervention.

## Reproduction

Run `node --test tests/cell-growth.mjs` for the numerical unit and integration
suite. Run `node scripts/validate-cell-growth.mjs` for the quantitative release
report saved in `src/data/cell-growth-validation.json`.

The quantitative report records the exact model version, input conditions,
acceptance criteria, numerical outcomes, source-file hashes, and runtime. Its
measured timings exclude browser rendering and network overhead and should not
be interpreted as a guarantee for every device.
