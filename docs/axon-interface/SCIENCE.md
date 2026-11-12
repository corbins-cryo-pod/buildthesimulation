# Axon-Resolution Nerve Interface Laboratory: scientific scope and methods

## Release identity

This release is an **electrical-core development model** for the Biohybrid Axon-Resolution Nerve Interface Laboratory. It is not the complete Stage 1 requested in the build specification. Its default experiment calculates a synthetic cohort of straight, myelinated MRG-type cables in a layered volume conductor. The compartment selected for addressing is a node of Ranvier. An optional enlarged-compartment experiment, if enabled, is a hypothetical electrical-load study; it is not a calibrated ganglion soma. There is no organoid, engineered synapse, biological growth clock, or postoperative preservation calculation.

The numerical report determines which implementation tests have passed. The words *calculated*, *numerically verified*, *experimentally calibrated*, and *biologically demonstrated* describe different achievements. A passing cable comparison cannot establish the latter two.

**Suggested interface boundary:**

> Synthetic MRG-type myelinated cables at 37 °C · anisotropic ohmic volume conduction · explicit perineurial shell. The default addressed region is a node; optional soma-load geometry is hypothetical. Electrical responses and specified interventions are calculated; ganglion replacement, organoid integration, regeneration, and chronic biology are not yet modelled. Numerical verification status is reported separately.

The executable evidence register is `src/lib/axon-interface/evidence.mjs`. The numerical parameter registers are exported by the membrane and field modules. The application must retain the settings that produced a completed result, even when the editable controls subsequently change.

## 1. Evidence vocabulary

Every parameter and substantive claim uses one class:

| Class | Meaning |
| --- | --- |
| `experimental` | An observation in the stated species and preparation. |
| `mathematical` | A stated equation, numerical formulation, model definition, or consequence of definitions. |
| `estimated` | An explicit simulator setting, extrapolation, or effective parameter without a fit to the represented preparation. |
| `hypothetical` | A proposed architecture or biological coupling not established by this calculation. |

A published model parameter is not automatically an experimental measurement. In particular, using an MRG channel conductance in a synthetic neuron does not make it a measured organoid conductance. References are classified according to their specific use here; a single paper can contain additional kinds of evidence that this implementation does not use.

## 2. What is counted

The proposed long-term endpoint is

\[
Y_{\mathrm{original}}=
\frac{\left|\{i\in H_0: C_i\land P_i\land M_i\land U_i\}\right|}
{|H_0|}.
\]

Here, \(H_0\) is the set of original host-axon identities before intervention; \(C_i\) means that original identity remains anatomically continuous to its relevant target, \(P_i\) means a propagating action potential is evoked, \(M_i\) means the architecture-appropriate intervention supports the claimed mechanism, and \(U_i\) means at least one isolated channel recruits only that axon at the stated amplitude and pulse. This is a set intersection, not a product of unrelated estimated marginal yields.

The electrical core calculates only the event/recruitment properties of its declared synthetic cohort. It does not establish \(C_i\), target identity, or biological mediation. Its cohort count is not a complete human nerve census. The headline biological endpoint therefore remains **not calculated** in the current benchmark.

### Replacement is a different endpoint

In complete B3 ganglion replacement, engineered neurons supply their own processes. Their outputs are new identities, \(E\), rather than surviving members of \(H_0\). With all original neurons replaced, strict original-host preservation and therefore \(Y_{\mathrm{original}}\) are zero by definition. This is not an estimate of surgical outcomes.

An engineered-output ratio may instead be defined as

\[
Y_{\mathrm{engineered}}=
\frac{N_{\mathrm{uniquely\ addressed\ engineered\ outputs}}}{N_{\mathrm{original\ census}}}.
\]

Its name, identity set, continuity requirements, and denominator must remain explicit. Never relabel it original-host addressability. A mixed architecture must track retained original and introduced engineered identities separately.

The current cable benchmark instead reports its local electrical fraction over `N_resolved`, the declared synthetic cohort size. It does not calculate the proposed original-census-normalized engineered ratio above because no original census or replacement experiment is instantiated.

Transplantation experiments provide reasons to investigate projecting engineered neurons, but they do not supply the missing count conversion or automatic correct wiring. Auditory-response improvement in an animal model is distinct from original-axon preservation and independently addressable replacement channels. [Chen 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3480718/)

## 3. Membrane and cable model

### 3.1 Published model and present scope

The reference is the McIntyre–Richardson–Grill mammalian myelinated motor-axon model, using the corrected ModelDB 3810 source. The supported diameters are the nine published values rather than undocumented interpolation or extrapolation. The model contains active nodes, myelin attachment segments (MYSA), paranodal main segments (FLUT), and six internodal STIN sections between consecutive nodes. Myelin and the periaxonal space remain explicit electrical paths. [MRG 2002](https://doi.org/10.1152/jn.00353.2001), [ModelDB 3810](https://github.com/ModelDBRepository/3810)

The membrane equation is expressed in terms of transmembrane potential, while axial current depends on intracellular potential differences. The imposed extracellular potential is therefore included at connected compartments; electrode current is never substituted for a membrane current injection. The implementation advances the coupled cable system with an implicit linear step and channel gates with their declared exponential update. The independent-reference report must compare that implementation with the native NEURON cable solver and original channel mechanism. [Rattay 1986](https://doi.org/10.1109/TBME.1986.325670)

Nodal current density is

\[
i_{\mathrm{ion}}=
\bar g_{\mathrm{Na}}m^3h(V_m-E_{\mathrm{Na}})
+\bar g_{\mathrm{Nap}}m_p^3(V_m-E_{\mathrm{Na}})
+\bar g_{\mathrm K}s(V_m-E_{\mathrm K})
+g_L(V_m-E_L).
\]

Each gating variable \(x\) obeys \(dx/dt=(x_\infty(V_m)-x)/\tau_x(V_m)\), using the source's voltage-rate expressions and temperature factors. The full source expressions and singular-rate limits are retained with the model reference. Unstable or unsupported voltage excursions cause a visible calculation error; the implementation must not clip voltages to create a plausible waveform.

### 3.2 Geometry register

These are published model definitions, class `mathematical` in this simulator. They are not measurements of an implanted construct.

| Outer fiber diameter (µm) | Internodal axon diameter (µm) | Node diameter (µm) | Node spacing (µm) | FLUT length (µm) | Myelin lamellae |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5.7 | 3.4 | 1.9 | 500 | 35 | 80 |
| 7.3 | 4.6 | 2.4 | 750 | 38 | 100 |
| 8.7 | 5.8 | 2.8 | 1000 | 40 | 110 |
| 10.0 | 6.9 | 3.3 | 1150 | 46 | 120 |
| 11.5 | 8.1 | 3.7 | 1250 | 50 | 130 |
| 12.8 | 9.2 | 4.2 | 1350 | 54 | 135 |
| 14.0 | 10.4 | 4.7 | 1400 | 56 | 140 |
| 15.0 | 11.5 | 5.0 | 1450 | 58 | 145 |
| 16.0 | 12.7 | 5.5 | 1500 | 60 | 150 |

Node length is 1 µm, each MYSA is 3 µm, and each STIN length is `(nodeSpacing − nodeLength − 2 × MYSA length − 2 × FLUT length) / 6`. Periaxonal gaps are 0.002 µm at MYSA/nodal regions and 0.004 µm at the other modelled myelinated regions. Geometry comes from `MRGaxon.hoc`; the table is not an axon-diameter distribution for a human cochlear nerve.

### 3.3 Electrical register

| Parameter | Reference value | Units | Class and provenance |
| --- | ---: | --- | --- |
| Temperature | 37 | °C | `mathematical`; published model operating condition |
| Initial membrane potential before equilibration | −80 | mV | `mathematical`; original source |
| Axoplasmic/periaxonal resistivity | 700,000 | Ω·µm | `mathematical`; 70 Ω·cm in source units |
| Axolemmal capacitance | 2 | µF/cm² | `mathematical`; source model definition |
| Fast sodium maximum conductance | 3.0 | S/cm² | `mathematical`; AXNODE.mod |
| Persistent sodium maximum conductance | 0.01 | S/cm² | `mathematical`; AXNODE.mod |
| Slow potassium maximum conductance | 0.08 | S/cm² | `mathematical`; AXNODE.mod |
| Nodal leak conductance | 0.007 | S/cm² | `mathematical`; AXNODE.mod |
| MYSA passive conductance | 0.001 | S/cm² of axolemma | `mathematical`; MRGaxon.hoc |
| FLUT/STIN passive conductance | 0.0001 | S/cm² of axolemma | `mathematical`; MRGaxon.hoc |
| Sodium reversal | 50 | mV | `mathematical`; AXNODE.mod |
| Potassium/nodal-leak reversal | −90 | mV | `mathematical`; AXNODE.mod |
| Passive-region reversal | −80 | mV | `mathematical`; corrected source |
| Myelin capacitance per lamellar membrane | 0.1 | µF/cm² | `mathematical`; divide by twice the lamella count |
| Myelin conductance per lamellar membrane | 0.001 | S/cm² | `mathematical`; divide by twice the lamella count |
| Sodium activation-rate temperature factor | 2.2^((T−20)/10) | 1 | `mathematical`; source rate expression |
| Sodium inactivation-rate temperature factor | 2.9^((T−20)/10) | 1 | `mathematical`; source rate expression |
| Slow-potassium rate temperature factor | 3^((T−36)/10) | 1 | `mathematical`; source rate expression |

Current numerical defaults and restrictions are exported from `MRG_PARAMETERS` and the normalized run settings. Time step, pre-run equilibration, event threshold, spatial refinement, duration, saved-value cadence, and voltage-excursion bounds are `estimated` numerical choices. They are not fitted physiological measurements. The report records the actual values used in each study.

### 3.4 Resting preparation and silencing

The original conductances and reversal potentials are retained; the resting state is explicitly equilibrated before the experiment. Every matched condition starts from the same saved pre-intervention state unless the report declares a different experiment. The zero-input drift check applies to the measured observation window after the declared preparation, not to an unreported baseline correction.

Removing active conductances can alter resting-current balance. A silencing control must expose that response, keep passive parameters fixed, and avoid silently changing the leak or starting voltage. Whole-cable silencing and local initiating-region silencing are different interventions with different interpretations.

### 3.5 Why this is not yet a ganglion neuron

Human cochlear neurons include a soma and electrically distinct peripheral/central structures. Human spiral-ganglion somata are predominantly unmyelinated and can introduce a propagation barrier. DRG neurons have a stem axon and a branch point with their own effects. A motor cable cannot represent these merely by changing the illustration. [Rattay 2001](https://pubmed.ncbi.nlm.nih.gov/11223296/), [Potrusil 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3377987/), [Farooqui 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11475779/)

The Rattay et al. 2013 human SGN model provides a useful future reference with distinct terminal, peripheral-process, pre-somatic, soma, post-somatic and central-process compartments. Its 20 µm spherical soma and different process diameters are not its only differences from MRG: it uses a temperature-fitted Hodgkin–Huxley formulation rather than the present MRG nodal kinetics. It cannot be silently substituted and called the same 37 °C model. [Rattay 2013](https://doi.org/10.1371/journal.pone.0079256)

### 3.6 Retained enlarged-compartment failure

A development experiment enlarged the central MRG node to a 20 µm cylindrical compartment while retaining the original nodal-channel prescription. After the declared 20 ms preparation, the zero-input experiment produced **29 upward nodal crossings across the recorded nodes in 6 ms** and **110.525 mV maximum drift**. The required zero-input criteria are no spikes and at most 0.1 mV drift. This experiment failed and remains a retained failure; the crossing total is not a claim of 29 distinct neuronal spikes.

The failure is an observed property of that synthetic parameterization, not evidence about human spiral-ganglion spontaneous activity. It demonstrates why increasing compartment size without an appropriate membrane model does not produce a validated soma. The default remains the original straight-cable benchmark. A passive enlarged compartment or reduced somatic active-conductance factor is a different hypothetical experiment and must receive its own tests; its results cannot erase this failure or be labelled a fitted SGN correction.

### 3.7 Published diameter–velocity relation remains unvalidated

The broad Aα/Aβ velocity bands supplied in the build specification are class-band diagnostics. Passing those bands does not establish the experimental diameter–velocity relation cited in the original MRG paper. The final report measures conduction away from the initiation site and sealed cable ends using 41 nodes, three numerical segments per passive section, a 0.000625 ms time step, and a 10 nA, 0.1 ms pulse at node 20. Velocity is measured between nodes 28 and 33, using the report's zero-based node indices.

| Fiber diameter | Refined model velocity | Published large-cat-fiber line, 5.66 × diameter | Relative difference |
| ---: | ---: | ---: | ---: |
| 10 µm | 49.12606 m/s | 56.60 m/s | −13.20485% |
| 16 µm | 82.22406 m/s | 90.56 m/s | −9.20489% |

The earlier shorter-cable, near-initiation diagnostics were approximately 47.52 and 80.59 m/s. The longer-cable measurement provides the stated spatial context; it does not replace a failed physiological comparison with a new passing tolerance. No channel retuning or acceptance expansion was applied. The report explicitly sets `publishedDiameterRelationValidated: false`. Agreement with native NEURON at the same discretization verifies the implemented equations, not a new species or preparation calibration. See [MRG Figure 8](https://doi.org/10.1152/jn.00353.2001), its cited [Boyd & Kalu experiment](https://pubmed.ncbi.nlm.nih.gov/458657/), and the `conductionLiteratureComparison` records in [the numerical report](mrg-numerical-report.json).

## 4. Volume conductor

### 4.1 Equation and discretization

The field model solves

\[
\nabla\cdot(\boldsymbol\sigma\nabla\phi)=-q,
\]

with distinct endoneurial, perineurial, epineurial, and surrounding regions. The endoneurium uses the axial tensor `diag(σT, σT, σL)`; the other implemented regions are isotropic. Continuous piecewise-linear basis functions on a conforming tetrahedral mesh resolve the material interfaces. The baseline radial grid places two element bands across the perineurium. The cylindrical interface is polygonal at finite angular resolution.

For tetrahedron \(e\),

\[
K_{ab}^{(e)}=\int_{\Omega_e}(\nabla N_a)^T\boldsymbol\sigma_e\nabla N_b\,d\Omega.
\]

The source and return are finite Gaussian volume-source distributions, each truncated at three standard deviations and normalized to the declared equal-and-opposite current. **They are not equipotential metal contacts.** The calculation does not resolve electrode polarization, an insulating well, a wall aperture, or access resistance of an actual electrode–cell pocket. A user-visible source-radius setting must retain that meaning.

Zero potential is imposed on the outer cylindrical surface and both axial end faces. These are finite-domain boundaries, not an assertion of an infinite bath. Domain truncation and spatial interpolation belong in the error discussion. Unsupported source placement or insufficient source support is rejected rather than enlarged silently.

### 4.2 Field register

All default values below are class `estimated`: they define an exploratory specimen and effective ohmic material choices, not measured organoid anatomy or a fitted human nerve.

| Parameter | Default | Units | Provenance |
| --- | ---: | --- | --- |
| Fascicle radius | 250 | µm | Synthetic single-fascicle benchmark |
| Perineurial thickness | 15 | µm | 3% of the 500 µm fascicle diameter; literature-informed geometry rule |
| Epineurial outer radius | 400 | µm | Synthetic enclosing region |
| Surrounding-domain outer radius | 1200 | µm | Numerical domain choice |
| Domain half-length | 8000 | µm | Numerical domain choice |
| Endoneurial transverse conductivity | 0.083 | S/m | Effective literature-informed choice |
| Endoneurial longitudinal conductivity | 0.571 | S/m | Effective literature-informed choice |
| Perineurial conductivity | 1/1149 | S/m | Frog-derived DC estimate adjusted to 37 °C in Pelot et al.; not direct measurement |
| Epineurial conductivity | 0.083 | S/m | Explicit effective choice, not a fit |
| Surrounding conductivity | 0.3 | S/m | Explicit effective choice, not a fit |
| Gaussian source-radius parameter | 75 | µm | Numerical finite-source geometry; not a metal contact radius |
| Angular segments | 32 | 1 | Baseline polygonal mesh resolution |
| Radial refinement factor | 1 | 1 | Declared baseline mesh |
| Axial refinement factor | 1 | 1 | Declared baseline mesh |

The exact exported `FIELD_DEFAULTS`, `FIELD_PARAMETERS`, and `FIELD_LIMITS` are authoritative for executable settings and budgets. Refinement studies must state any different mesh, source radius, field domain, and sampling location used. Conductivities are not multiplied by an undocumented confinement coefficient.

Pelot et al. support sensitivity analysis and a careful distinction between resistivity and sheet resistance. Their frequency/temperature transformations remain estimates. Newer canine-vagus measurements at 22 ± 1 °C also show appreciable layer reactance, which the present ohmic model excludes. Neither source supplies a subject-specific human-ganglion field model. [Pelot 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC7309635/), [Horn 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10426281/)

### 4.3 Units and reciprocity

Geometric coordinates are in µm, conductivity in S/m, applied source current in µA, and sampled potential in mV. A channel transfer coefficient is therefore mV/µA. Multiplying membrane current in nA by this coefficient and `0.001` gives recording voltage in mV. The implementation reports µV, so its product `I_outer[nA] × T[mV/µA]` already has the required µV scale.

If reciprocal recording is calculated, it uses the same stated finite source/receiver weighting and full-precision simulated membrane currents. The imposed-field contribution, neural-source contribution, and their instantaneous sum must remain separate. Peak-to-peak amplitudes do not add even when instantaneous waveforms do.

## 5. Recruitment and controls

For an isolated channel \(k\), stated pulse, and stated amplitude \(a\), define a binary matrix entry only after the membrane and propagation criteria have been evaluated:

\[
R_{ki}(a)=1\quad\text{if the declared experiment recruits cable }i.
\]

An exclusively recruited cable has a row where it is the only recruited cable. This is a statement about the simulated cohort at that pulse and amplitude. It is not evidence that every unseen axon in a real nerve remains silent. Shared recruitment retains the complete co-recruited set.

An event detector uses an upward voltage crossing, but a crossing alone is not a propagated action potential. The reported criterion must include spatially separated observation nodes, consistent propagation direction/timing, and initiation-site diagnostics. Multiple directly activated locations can otherwise produce a misleading ordered sequence. The result cannot be promoted beyond the criterion actually implemented.

### Architecture-aware audit

| Condition | Meaning in the current cable core | What it does not establish |
| --- | --- | --- |
| Assigned drive | The normalized channel pulse applied through the calculated extracellular field | Organoid function or original-axon survival |
| Zero drive | The same cohort and observation window with zero applied source waveform | Long-term absence of spontaneous activity |
| Channel isolation | Only the named channel contributes an imposed field | Arbitrary simultaneous-channel controllability |
| Initiation-region silencing | Active conductances suppressed only in the declared local region, with the same imposed field | A literal soma intervention when no soma exists |
| Whole-cable silencing | All active nodal conductances suppressed | Whether the original spike began at the intended site |
| Junction block | **Not applicable:** no organoid–host junction exists in this core | A passed relay-mediation test |
| No construct | A separately described future anatomical comparator | A calculated postoperative preservation fraction |

Keep interventions identical in morphology, passive membrane properties, imposed field where required, resolution, temperature, initial state, and duration except for the named change. Record the identity and parameters of that change. A not-applicable condition is not a pass; an unperformed condition is not a pass; a failed condition remains a failure.

Amplitude sweeps use a finite declared list. Report the operating point and how it was selected. A threshold bracket is bounded by adjacent tested values; it is not an interpolated physiological threshold. The application must not search outside valid samples or return a threshold after a failed solve.

Matrix rank, if later calculated, is a linear-algebra summary of the stated matrix. It is not the number of independently controllable neural patterns under nonlinear simultaneous stimulation. Mutual information additionally requires a declared input distribution, output representation, trial/noise model, and estimator.

## 6. Numerical validation and release gates

Acceptance values belong in the machine-readable frozen test specification before the corresponding study is run. This document does not override those values or convert supplemental diagnostics into substitutes for failed required tests.

| Required study from the build specification | Predeclared acceptance |
| --- | --- |
| Zero-input drift after declared preparation | ≤0.1 mV across the measured window; no spikes |
| Time-step halving, membrane RMS | ≤1 mV at each declared level |
| Time-step halving, spike timing | ≤0.1 ms and identical event counts |
| Spatial refinement, conduction delay | ≤5% |
| Spatial refinement, recording peak-to-peak | ≤10% |
| Conduction velocity | Within the explicitly selected reference band for the supported model class |
| Independent membrane reference | ≤1 mV RMS, without time shift, rescaling, or baseline correction |
| Independent field reference | ≤0.001 µV for the declared like-for-like comparison |
| Field superposition | Numerical-precision residual, with normalization stated |
| Current conservation | Reported numerical residual with source, sink, and boundary flux accounting |
| Deterministic replay | Exact equality in the same runtime |
| Screening classification | Not applicable until a screening approximation exists; eventual ≤1% disagreement with a stated sampling interval |

The finite-element implementation may have supplemental analytic and refinement checks with their own frozen criteria. Their scope must be clear. In particular:

- An independent Python assembly on the **same mesh** checks assembly, units, and solver agreement; it does not remove the shared mesh-discretization error.
- Comparison with an infinite homogeneous analytic solution also contains finite-domain and source-regularization differences unless the benchmark controls those explicitly.
- A layered radial analytic test checks a geometry/load case represented by that test; it does not by itself verify arbitrary off-axis electrodes.
- A coarse-field error gate does not replace the stricter independent-reference gate.
- Field convergence does not replace cable spatial or temporal convergence.

Tests compare unshifted, unscaled traces and the declared observation locations. Export the original measured errors, counts, runtime, source hashes, settings, and correction history. A report retains every observed failure and identifies what changed. Unsupported computations remain unavailable instead of receiving plausible default values.

### Retained temporal and spatial failures

| Retained comparison | Original measured discrepancy | Unchanged acceptance | Status and correction |
| --- | ---: | ---: | --- |
| Time step 0.005 → 0.0025 ms | 2.128164 mV maximum per-node RMS; 1.506887 mV aggregate across nodes | ≤1 mV at every recorded node | Failed; retain the original measurement and test finer steps. |
| Time step 0.0025 → 0.00125 ms | 1.129199 mV maximum per-node RMS | ≤1 mV at every recorded node | Failed; the aggregate metric had hidden the endpoint error. Production uses 0.00125 ms and verifies further halving. |
| Passive subdivisions 1 → 3, conduction delay | 12.438560% | ≤5% | Failed; production uses three subdivisions and publishes 3 → 5 and 5 → 7 comparisons. |
| Passive subdivisions 1 → 3, recording peak-to-peak | 23.065106% | ≤10% | Failed; retain this recording discrepancy alongside the finer comparisons. |

The correction is to use and test finer resolution with the same criteria, not raise a tolerance or accept an aggregate error in place of the maximum per-node error. A finer-resolution pass licenses only its declared comparison and experimental conditions. These records remain in `retainedFailures` in [the numerical report](mrg-numerical-report.json).

An early straight-cable comparison with the original native NEURON mechanism measured approximately **4.76 × 10⁻⁹ mV RMS** for the stated 10 µm, 11-node, 2 nA injected-pulse benchmark at 0.0025 ms. This is a useful implementation check; it does not turn the failed coarse-step convergence test or enlarged-compartment test into passes. The final machine-readable report supplies the complete settings, unrounded values, and current status of each study.

The field history likewise retains an initial radial-refinement discrepancy of approximately **19.58%**, above its unchanged 10% gate. Physical-space source quadrature and an explicitly refined surrounding-region mesh reduced that discrepancy to approximately 2.45% in the revised fixture. The corrected mesh does not retroactively pass the original experiment; both records remain in [the field history](field-history.jsonl).

## 7. Biological boundaries and future work

### No calculated survival cascade yet

The current core does not solve oxygen consumption/diffusion, trophic dependence, fate specification, growth cones, junction maturation, fabrication defects, interconnect routing, heat transfer, immune response, or chronic fibrosis. It must not display numeric stage yields or projected days for those mechanisms. The absence of a model is not a yield of one.

A future cascade should carry the actual surviving identity set from one stage to the next, showing conditional counts. The geometric expression `area / pitch² × length / axialPitch` is an upper-bound capacity estimate until edge losses, integer placement, dead volume, routing, and actual soma accommodation are accounted for. Poisson single-occupancy probability, `λ exp(−λ)`, describes a specified seeding model; it is not measured loading efficiency for a fabricated well array.

### C fibers are not smaller MRG cables

The current supported fiber diameters and channel model do not cover unmyelinated C fibers. Adding a C-fiber label or reducing the diameter is insufficient. A separate mammalian model, relevant calibration, and explicit Remak-bundle assumptions are required. [Pelot 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8087387/)

### Regeneration is not routine division of mature neurons

Peripheral axon regrowth, repair-state Schwann-cell programming, new neuron differentiation, and cell division are distinct processes. The repair program documented in Schwann cells is not evidence that mature sensory or motor neurons routinely divide to replace a severed nerve. [Arthur-Farraj 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3657176/)

### Vision boundary

The retina and optic nerve are CNS structures. Retinal ganglion cells do not provide a PNS regeneration exemption. Adult mammalian optic-nerve regeneration is ordinarily poor, while experimental interventions demonstrate that regrowth is not categorically impossible. A future optic-nerve preset can be a geometry-only scale study, with peripheral repair mechanisms disabled. [CNS regeneration experiment, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11283980/)

### Future addressing modalities

Coil stimulation requires induction from the actual winding geometry and the variation of induced electric field along a cable. Optical stimulation requires photon transport and opsin dynamics. Neither can be represented by relabelling an electrode transfer matrix. Conductive/insulating well walls, optical liners, scattering, spectral overlap, heating, and drive power need their own calculations before a modality comparison is valid.

Optogenetic human-derived otic-neuron cocultures offer relevant experimental motivation for an engineered projecting-neuron path. They do not validate a chronic implant, human functional restoration, or a mature axo-axonal junction in a peripheral shaft. [Chen 2024](https://pubmed.ncbi.nlm.nih.gov/39092452/)

### Safety boundary

Charge balance and geometric charge density are electrical descriptors. A Shannon relation comparison, if provided, is limited by its empirical context and does not solve electrode electrochemistry or tissue injury. No result is a device specification, an operating recommendation, or a prediction of human recovery. [Shannon 1992](https://doi.org/10.1109/10.126616)

## 8. Source attribution and reproducibility

The MRG equations and reference files originate with Cameron C. McIntyre and collaborators. Cite:

McIntyre CC, Richardson AG, Grill WM. *Modeling the excitability of mammalian nerve fibers: influence of afterpotentials on the recovery cycle.* Journal of Neurophysiology. 2002;87:995–1006. DOI: [10.1152/jn.00353.2001](https://doi.org/10.1152/jn.00353.2001). ModelDB accession [3810](https://modeldb.science/3810).

The source snapshot used for this implementation is the official ModelDBRepository commit `b15daeda6ea368df0198d257f339cf5e840cf31c`. Retain the upstream README and author headers. The README records the 2011 singular-rate fixes, 2014 passive-reversal clarification, and 2018 stimulus-panel fix. The JavaScript numerical implementation is distinct from the upstream NMODL/HOC reference; deviations and comparison errors must be stated.

No separate model-specific license file was present among the inspected source files. This repository does not invent an MIT, BSD, or other license for those upstream files. ModelDB's published description discusses citation-based reuse practice, but that description is not a new source-specific software license. Preserve author attribution and any applicable upstream notices. [ModelDB reproducibility and reuse description](https://pmc.ncbi.nlm.nih.gov/articles/PMC5279891/)

Reproduction must record the exact upstream file hashes, local model hashes, dependency versions, runtime, and observed hardware. Browser and independent-reference results must be generated from the same declared geometries and stimuli. Re-running a script is not a guarantee of bitwise equality across different floating-point implementations; exact determinism is claimed only in the same runtime as tested.

## 9. Reference register and scientific questions

The machine-readable reference register and fifteen public scientific questions live in `src/lib/axon-interface/evidence.mjs`. Each reference has a stable ID, title, URL, evidence class, and scope statement. Each question has its answer, evidence class, and source IDs. The site renders that register directly so citations and boundary text do not drift between the laboratory, methods, and questions pages.

The register deliberately distinguishes experimental motivations for future architectures from the equations implemented in this release. No experimental source is presented as evidence that this synthetic organoid interface has been built, implanted, or validated.
