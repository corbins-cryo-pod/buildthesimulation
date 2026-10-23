# Peripheral Nerve Regeneration Laboratory — scientific basis

## Purpose and claim boundary

This laboratory is a **mechanism-informed, exploratory model of peripheral nerve regeneration**. It combines a reproducible population of growing axons with synthetic nerve geometry and a reduced representation of the changing repair environment. It is designed to make interactions among distance, repair delay, guidance, debris, Schwann support, vascular support, target matching, and maturation inspectable.

The implementation is not a reproduction of one published mathematical model, a fitted model of a particular experiment, or a clinical prediction system. Its biological mechanisms are grounded in the primary studies listed below. Its coupling functions and many parameter values are explicit modeling assumptions. Software correctness, qualitative biological plausibility, numerical convergence, and empirical predictive validity are different claims. Passing the first three does not establish the fourth.

The main scientific deliverable is a transparent, executable hypothesis. Users can change an assumption, replay the same seeded population, inspect how the outcome changes, and export the configuration and results. The percentages on the page describe that simulated population under those assumptions.

## Biological sequence represented

### Injury and degeneration

Injury interrupts axonal continuity. The distal axon does not instantly vanish, and the persistence of a distal electrically excitable segment is not evidence that the nerve remains connected across the injury. A small human serial study found the loss of motor and sensory responses on different time courses over the first approximately two weeks [1]. The simulator therefore distinguishes elapsed time after injury, distal integrity, and debris clearance.

Debris removal involves repair Schwann cells and recruited macrophages. Schwann cells use both autophagy and receptor-mediated phagocytosis [3,4]. The laboratory represents this with aggregate environmental states. It does not calculate intracellular digestion, lysosomal flux, macrophage counts, or individual immune phenotypes.

### Repair Schwann cells and the bridge

Adult myelin and Remak Schwann cells can adopt a repair-supportive state. c-Jun is an important regulator of this response [2]. Repair cells elongate and branch into tracks that support regrowing axons; remyelinating cells subsequently shorten [6]. These are distinct cellular states, not simply a variable amount of mature myelin.

In rodent transection models, hypoxia-responsive macrophages induced oriented vascular tracks used by migrating Schwann cells [5]. This supports including vascular support and aligned bridge guidance. The laboratory's vascular variable is dimensionless. It is not an oxygen concentration, vessel density measurement, perfusion measurement, or solved vascular network.

### Regeneration and appropriate targets

Successful extension requires more than a growth-rate number. Axons must enter the repair, traverse its geometry, find a distal pathway, and eventually reach an appropriate target. Motor axons can enter inappropriate sensory pathways, and experimentally observed specificity includes collateral pruning [12]. The laboratory consequently keeps distal arrival separate from route matching. In this version the implemented matching check is only whether the modeled axon ends in its original synthetic fascicle family. Motor/sensory labels are descriptive and do not encode molecular target recognition. A matching fascicle index does not demonstrate that the correct muscle, receptor, or organ has been reinnervated.

A rendered trajectory represents one modeled parent axon. The population is representative rather than a histological nerve census. The model does not treat collateral sprouts as independent recovered neurons. Any branching-like visual motif is not evidence of a full sprouting-and-pruning solver.

### Delay, distance, and local denervation

Three biological processes must remain conceptually distinct: the injured neuron's reduced regenerative capacity while it lacks a target, deterioration of the denervated Schwann pathway, and changes in the target itself. Rat experiments separated these effects [7–9]. This is why a single global “healing rate” would be misleading.

Longer distance increases the time for which unvisited distal tissue remains denervated even when surgery occurs immediately. The environmental support field describes the support available to axons still advancing through the pathway. It does not presently receive feedback from local reinnervation. Remyelination is computed separately from each axon's local arrival history. This one-way coupling is a simplification: real axon–Schwann interactions alter the local phenotype after arrival.

### Arrival, remyelination, and function

Arrival is a structural event. New myelin, restored conduction, stable target contact, neuromuscular transmission, motor-unit organization, muscle condition, and central adaptation have their own requirements. In a rat immediate-repair study, conduction and total fiber diameter improved during 50–200 days of follow-up, while g-ratio alone did not consistently describe recovery [14]. Chronically denervated Schwann cells can also retain remyelinating capacity for axons that do successfully reach them [7].

Human longitudinal observations also distinguish return of a detectable sensory response from its later electrical maturation and tactile recovery [17]. These endpoints must be recorded separately; observing a regenerated pathway does not supply a universal conversion to useful sensation or movement.

The laboratory therefore reports separate structural and maturation quantities. A “mature” or “conducting” surrogate must not be relabeled as a percentage of recovered hand function, muscle force, sensation, or clinical success. No compound nerve or muscle action potential is simulated here.

## Evidence and assumptions

The machine-readable evidence map is `src/lib/nerve-regeneration/evidence.mjs`. Each reference records its species, direct finding, model use, and limit. `PARAMETER_EVIDENCE` classifies the main model inputs. The source metadata are used by the public methods page so the interface and this document share the same evidence register.

| Quantity | Evidence supports | The simulator assumes |
| --- | --- | --- |
| Extension speed | Axonal advance has a measurable distance/time scale; it varies with species, injury, and method [13,15,17]. | A chosen baseline and environmental modifiers; no universal biological speed distribution. |
| Repair-entry lag | Onset and subsequent elongation can be changed independently [13]. | The distribution of initial delays and repair-specific lag terms. |
| Debris clearance | Multiple Schwann-cell and macrophage pathways clear damaged myelin [3,4]. | Aggregate time constants and their effect on permissiveness. |
| Schwann repair support | Repair phenotype is active and can deteriorate with chronic denervation [2,7,10,11]. | A bounded support index and adjustable persistence time. |
| Vascular support | Vessels can guide repair Schwann-cell migration in a rodent bridge [5]. | A normalized modifier without oxygen or blood-flow units. |
| Guidance / scar | Architecture and pathway identity affect growth and targeting [5,6,12]. | The mathematical direction field, resistance, and random perturbations. |
| Route matching | Anatomical continuity does not ensure appropriate reinnervation [12]. | A synthetic fascicle-index match, without molecular recognition or pruning; no organ-target verification. |
| Maturation | Structure, electrical responses and useful sensation recover on different trajectories [7,14,17]. | A post-arrival maturation curve and any conduction-related surrogate. |
| Repair type | Clinical outcomes are intervention- and context-specific [16]. | Generic geometry and support settings, not product effectiveness. |
| Repeated seeds | Reproducible stochastic simulations are useful for exploration. | A finite synthetic population, not a measured biological sampling distribution. |
| Computational framework | Published approaches include coupled diffusion-reaction populations and random-walk neurites in engineered tissue [18,19]. | Original local reaction equations and seeded synthetic paths; no reproduction or transferred calibration. |

## Species and time scales

The human-scale scenario is a transparent hypothesis for exploring long distances and long denervation periods. The often-used approximately 1 mm/day clinical estimate is a rough scale associated with historical clinical distance/recovery observations [15]. It is not a fixed speed for every human axon and does not make arrival time equal recovery time.

Buchthal and Kühl's longitudinal suture observations included three complete median-nerve sections at the wrist and one partial section. Sensory potentials appeared after three to four months, corresponding to an inferred growth rate of 1.5–2.0 mm/day [17]. This supplies a human reference on the scale of distance and time; it is based on response-return timing rather than direct observation of individual growth cones. The small series does not calibrate the laboratory's baseline speed, initiation-lag distribution, or maturation time constant.

Rodent-scale scenarios serve a different purpose: short experimental distances and faster axonal advance. Brushart and colleagues measured 3.38 ± 0.58 mm/day with stimulation and 3.27 ± 0.90 mm/day without stimulation in their specific rat experiment [13]. These are study results, not a universal rat distribution. A browser control spanning a wider range is an exploration range, not a literature confidence interval.

The support-persistence parameters must not be silently transferred between species. Wagstaff and colleagues found mouse distal-stump c-Jun at about 40% of its one-week level after ten weeks [10]. Wilcox and colleagues studied human surgical samples across heterogeneous denervation periods and found a corresponding decline in repair markers over much longer times [11]. Neither protein expression nor a smoothed cross-sectional trend directly supplies a probability that an axon will regenerate. Accordingly, human and rodent parameter choices remain labeled assumptions; the model does not perform a validated interspecies scaling.

## Repair scenarios and interpretation

Crush-like injury, direct coaptation, graft-like repair, and conduit-like repair represent different geometric and biological hypotheses. A crush-like scenario may preserve alignment and the longitudinal pathway. Transection removes that continuity. A generic graft supplies an organized bridge in the model; a generic conduit constrains the repair space and depends on its internal support assumptions.

These presets are not a head-to-head treatment trial. A clinical randomized trial of specific processed allografts and collagen conduits studied digital sensory nerves in defined gap ranges [16]. It cannot justify a universal threshold for all nerves, a motor-nerve success curve, or a ranking of the generic presets. No commercial device's clinical performance is inferred from the simulator.

No-treatment or open-gap cases are useful as boundary experiments. A result near zero means the selected model rules do not provide an effective bridge under those settings; it is not a universal biological impossibility claim. Likewise, a high structural arrival fraction does not establish that a real treatment would succeed.

## Geometry and visualization

The nerve, fascicles, trajectories, Schwann tracks, myelin, and target markers are synthetic. They are generated for inspection, not traced from a patient's nerve, histological section, or electron-microscopy volume. Axon radii and cell features may be enlarged relative to the macroscopic nerve so their state is visible. A scale or length readout describes the model coordinates; apparent rendered fiber thickness should not be used as a micrometer measurement unless an explicit true-scale mode states otherwise.

Color identifies modeled state or route. It does not represent fluorescence intensity, measured voltage, gene expression, or a medical imaging contrast. Any traveling visual accent is an illustrative animation unless it is explicitly tied to a biophysical solver.

## Numerical model and reproducibility

The numerical methods and equations are documented alongside the implemented solver in `src/lib/nerve-regeneration/`. The evidence register does not claim that the chosen coupling equations were published in the cited biological studies. Exact equations, clamping, numerical step sizes, and parameter limits must be read from the version of the code recorded with an exported simulation. `MODEL_EQUATIONS` supplies the public equation register.

### Relationship to published computational models

Podhajsky and Myers represented regeneration with five coupled populations in a diffusion-reaction framework, including vascular advance preceding neurite growth [18]. Laranjeira and colleagues used a literature-parameterized random-walk framework to investigate neurite growth in collagen hydrogel containing biomaterial fibers, including geometric optimization and sensitivity analysis [19]. These are computational precedents, not calibration datasets for the present implementation.

This laboratory has no spatial diffusion term and no implementation of either paper's published trajectory solver. Local environmental reactions are evaluated on a spatial grid; bridge support fronts are prescribed, and axons follow curves generated from the seed and geometry before integration. Field values alter advance along those curves. The coefficients, assumptions, and numerical tests documented here belong to this original reduced model. Neither the validation claimed by an earlier framework nor its parameters transfers to this one merely because both concern peripheral nerve regeneration.

### Coordinates, state variables, and field equations

Let `t` be days since injury, `g` the gap in mm, and `x` the axial coordinate from the proximal cut plane. The bridge occupies `0 ≤ x < g`; the modeled distal stump extends from `g` to the target. Six bounded local states describe the environment: disconnected distal integrity `Q`, debris `D`, macrophage activity `M`, repair support `S`, vascular support `V`, and fibrosis `F`. These are dimensionless. They are integrated locally rather than by a reaction–diffusion PDE.

The implemented reaction equations are:

```text
dQ/dt = −k Q
dD/dt = k Q − (0.035 + 0.34 M + 0.075 S) D
dM/dt = 0.65 (D + 0.35 W) (1 − M) − 0.11 (1 − D) M
dS/dt = (S* − S) / 2.3
dV/dt = (V* − V) / τV
dF/dt = [F* (1 − exp(−t/9)) − F] / 7
```

Here `k = 0.7 smoothstep(t − 1)/day`, where the smoothstep is zero at and before day 1, rises as `u²(3 − 2u)` for `u = t − 1` between zero and one, and is one at and after day 2. This avoids an artificial discontinuity at fragmentation onset. `τV` is 3.5 days in the bridge and 1.5 days in the distal stump. The wound pulse is `W = exp(−t/6) exp(−|x − g/2|/max(2,g/2))`. All numerical rates and coefficients in these expressions are phenomenological assumptions. The integrity-to-debris transfer and debris sink have a mechanistic interpretation, but normalized material is not a measured mass of myelin. The derived cleared fraction is `1 − Q − D` in the distal stump; `Q + D + cleared = 1` is a numerical bookkeeping invariant. The initially empty bridge has no disconnected distal material and uses a zero total.

Support activation is `A(t) = 1 − exp[−max(0,t − 0.5)/2]`. Chronic support competence is `Cs(t) = 2^[−max(0,t − 28)/Hs]`, where `Hs` is the selected support half-life. For distal tissue the target support is `S* = S0 A Cs`, vascular support tends to `V0`, and the fibrosis target is `0.12 F0 exp[−max(0,x − g)/3]`, decreasing with distance from the distal repair edge. The assumed 28-day plateau must not be read as a human biological threshold.

Bridge formation is prescribed from both ends. With `tr = max(0,t − repairDelay)`, `d = min(x,g − x)`, and `logistic(u) = 1/(1 + exp(−u))`, vascular occupancy is `BV = logistic[(0.75 max(0,tr − 1) − d)/0.8]` and Schwann occupancy is `BS = logistic[(0.45 max(0,tr − 2) − d)/0.65]`. These front speeds are in mm/day and widths are in mm; their numbers are assumptions, not measurements from Cattin et al. After repair, `V* = V0(0.06 + 0.94 BV)` and `S* = S0 A Cs [a + (1 − a) BS]`. The architecture coefficient `a` is 0.72 for the structured-bridge scenario and zero for a hollow conduit. The bridge target for fibrosis is the selected fibrosis burden `F0`. Before repair, bridge repair support is zero. In a newly inserted structured bridge, the activation and support-competence clocks use time since repair (`tr`), so freshly introduced support does not inherit the recipient nerve's prior denervation age. In the distal recipient stump and host-derived conduit support, those clocks retain time since injury (`t`). This distinction is an explicit scenario assumption, not a fitted graft survival law.

The support field describes availability along the still-denervated pathway. Axonal arrival does not update these reaction equations or protect the local field against further support decline. Local myelination is a separate per-axon calculation. This one-way closure reduces computational cost but omits density-dependent axon–Schwann feedback.

### Axon population and paths

Each parent axon has fixed random traits sampled before integration: speed multiplier, initiation delay, descriptive motor/sensory class, path perturbations, caliber factor, and a draw used for chronic-axotomy competence. The potential speed distribution is a bounded lognormal choice; its spread is a computational assumption, not an experimentally fitted population variance.

For axon `i`, the axial growth law is:

```text
dxi/dt = v0 ai S (0.25 + 0.75 V) (1 − 0.65 D) (1 − 0.75 F) / Ti
Ti = sqrt(1 + (dy/dx)^2 + (dz/dx)^2)
```

`ai` is the fixed speed multiplier, and `Ti` corrects for the length of the curved synthetic path. Thus the requested potential speed is a path-extension scale, while the visible forward speed can be lower. Local field values are interpolated at the growing tip. Path tortuosity, environmental inhibition, and initiation delay are distinct effects.

The probability that a parent axon can initiate is `Pinit = 2^(−repairDelay/Hi)`, with an explicit assumed chronic-axotomy half-life `Hi`. Each axon initiates only if its fixed random draw falls below this value. A failed initiation is not interpreted as neuron death. Eligible axons begin after repair plus their fixed onset lag. Unrepaired transection has no valid bridge; local sprouts never receive credited distal entry. This is a boundary rule of the selected model.

Three synthetic fascicle families define the route labels. The destination is assigned from the exit geometry and the rotated distal family centers. “Matched” means the destination family index equals the origin index. It is not a test of motor-versus-sensory molecular identity, a unique endoneurial tube, an organ, a muscle, or a receptor.

### Maturation and displayed diagnostics

At a position `x`, let `ai(x)` be the first recorded arrival of parent axon `i`. Local maturation is zero before `ai(x) + Lm` and then rises as `mi(x,t) = 1 − exp[−(t − ai(x) − Lm)/τm]`. This avoids myelinating a segment before the axon physically reaches it. `Lm` and `τm` are adjustable assumptions. Neither the rendering nor this state estimates actual myelin thickness or g-ratio.

The summary myelin readout is an average of maturation since distal entry among entered axons. It is not the fraction of the entire nerve that has been remyelinated. The conduction-related proxy averages maturation since target arrival times a fixed caliber factor over the full parent cohort; unarrived axons contribute zero. A route-mismatched axon can contribute to this structural conduction surrogate, so it cannot be interpreted as correct functional recovery.

The separate target diagnostic is `Rtarget(t) = 2^[−max(0,t − 30)/Ht]`. It does not feed back into extension or arrival counts, and it has no rescue from reinnervation. The assumed 30-day plateau and `Ht` do not establish a biological deadline. This output is useful only as an explicit hypothetical target-condition clock.

### Integration and reference mode

The reaction fields and axon position use the explicit trapezoid / Heun predictor-corrector method. The internal time step is at most 0.25 day, with event boundaries and exact integer-day outputs. States are bounded to `[0,1]`. Randomness is not resampled during integration, so reducing the time step does not change the underlying synthetic cohort. The nonuniform field grid reserves resolution for the bridge and its distal boundary, then uses logarithmic spacing in the distal region; a long distal path therefore does not erase a short bridge from the mesh. Field values use piecewise-linear interpolation at the tip. Reported environmental averages are trapezoidal length-weighted means, rather than unweighted means of nonuniformly spaced nodes.

Moving display trajectories are simplified online using a 0.002 mm **local** positional criterion and at most one day between moving samples. Exact initiation, distal-entry and target-arrival events are retained, and repeated stationary points are dropped. The local criterion is not a proof of a global geometric error bound; the verification suite separately compares dense and simplified paths. The numerical integration step is unchanged. Replay positions and local-myelin crossing times interpolate these stored paths, while event counts use exact recorded crossing times.

An analytical reference mode fixes `S = V = 1`, `Q = D = M = F = 0`, removes speed heterogeneity and path-length penalties, and admits all axons. It supports comparison with `x = v0 max(0,t − lag)` until the target is reached. This verifies implementation and units in a simplified case; it provides no empirical biological validation.

A reproducible result requires the model version, complete normalized parameter set, random seed, population size, simulation horizon, and numerical step configuration. The same seed is especially useful when comparing two repair assumptions because it holds the synthetic population as consistent as the implementation permits. Altering the seed samples a new hypothetical population.

If several seeds are summarized, their spread describes stochastic variation under the same equations and input assumptions. It excludes systematic errors in the model structure, uncertain biological time constants, interpatient differences, missing mechanisms, and clinical measurement error. A percentile band across seeds must therefore be labeled a simulation range, not a clinical confidence interval.

The measured, reproducible numerical report is [VERIFICATION.md](./VERIFICATION.md), generated by `node scripts/verify-nerve-regeneration.mjs --write`. It records the engine hash, actually executed named tests, analytical-limit errors, time-step and spatial refinement, and one large-cohort benchmark.

### Verification requirements

Software tests should verify finite bounded outputs, deterministic replay, consistent units, and valid state transitions. Important boundary cases include zero elapsed time, no connection before repair, zero or near-zero gap, long gaps, severe misalignment, long repair delay, target beyond the simulated reach, and the maximum supported population. Spatial arrival must precede local remyelination and target maturation. Growth cannot teleport across an unresolved gap or create an axon beyond the modeled population.

Step refinement should assess whether the conclusions change materially when the internal time step is reduced. Such a check assesses numerical stability. It is distinct from comparing a model prediction against independent biological data.

### Empirical validation still required

Predictive use would require a prespecified dataset, a clear observation model, estimated parameters with uncertainty, held-out experiments, and metrics matched to what the study actually measured. Examples are an axon-count profile at known distances, retrograde parent-neuron counts, a time series of distal arrival, myelinated fiber histomorphometry, electrophysiology, and functional measurements. These should not be collapsed into a single calibration target.

The present source-grounded mechanism selection is not that validation. Future fitting should keep human, mouse, and rat datasets separate, record surgical and measurement conditions, and report failures as well as successes. A model that matches a published average can still fail to predict a new injury geometry or target distance.

## Explicit omissions

This version does not resolve intracellular axon-growth biochemistry, growth-factor concentrations, receptor kinetics, gene regulation, oxygen diffusion, endothelial sprouting, immune-cell subtypes, collagen mechanics, surgical tension, foreign-body reaction, neuroma pain, full axonal branching and pruning, motor-unit enlargement, muscle contractile mechanics, or cortical relearning. It has no patient-specific imaging, electrodiagnostic input, or treatment-selection algorithm.

These omissions limit which questions can be answered. The laboratory can reveal consequences of stated assumptions and compare mechanisms within its equations. It cannot estimate an individual's recovery probability or establish comparative clinical effectiveness.

## Primary bibliography

1. Chaudhry V, Cornblath DR (1992). Wallerian degeneration in human nerves: serial electrophysiological studies. *Muscle & Nerve* 15:687–693. [doi:10.1002/mus.880150610](https://doi.org/10.1002/mus.880150610).
2. Arthur-Farraj PJ et al. (2012). c-Jun reprograms Schwann cells of injured nerves to generate a repair cell essential for regeneration. *Neuron* 75:633–647. [doi:10.1016/j.neuron.2012.06.021](https://doi.org/10.1016/j.neuron.2012.06.021).
3. Gomez-Sanchez JA et al. (2015). Schwann cell autophagy, myelinophagy, initiates myelin clearance from injured nerves. *Journal of Cell Biology* 210:153–168. [doi:10.1083/jcb.201503019](https://doi.org/10.1083/jcb.201503019).
4. Brosius Lutz A et al. (2017). Schwann cells use TAM receptor-mediated phagocytosis in addition to autophagy to clear myelin in a mouse model of nerve injury. *PNAS* 114:E8072–E8080. [doi:10.1073/pnas.1710566114](https://doi.org/10.1073/pnas.1710566114).
5. Cattin AL et al. (2015). Macrophage-induced blood vessels guide Schwann cell-mediated regeneration of peripheral nerves. *Cell* 162:1127–1139. [doi:10.1016/j.cell.2015.07.021](https://doi.org/10.1016/j.cell.2015.07.021).
6. Gomez-Sanchez JA et al. (2017). After nerve injury, lineage tracing shows that myelin and Remak Schwann cells elongate extensively and branch to form repair Schwann cells, which shorten radically on remyelination. *Journal of Neuroscience* 37:9086–9099. [doi:10.1523/JNEUROSCI.1453-17.2017](https://doi.org/10.1523/JNEUROSCI.1453-17.2017).
7. Sulaiman OAR, Gordon T (2000). Effects of short- and long-term Schwann cell denervation on peripheral nerve regeneration, myelination, and size. *Glia* 32:234–246. [PubMed 11102965](https://pubmed.ncbi.nlm.nih.gov/11102965/).
8. Fu SY, Gordon T (1995). Contributing factors to poor functional recovery after delayed nerve repair: prolonged axotomy. *Journal of Neuroscience* 15:3876–3885. [doi:10.1523/JNEUROSCI.15-05-03876.1995](https://doi.org/10.1523/JNEUROSCI.15-05-03876.1995).
9. Gordon T, Tyreman N, Raji MA (2011). The basis for diminished functional recovery after delayed peripheral nerve repair. *Journal of Neuroscience* 31:5325–5334. [doi:10.1523/JNEUROSCI.6156-10.2011](https://doi.org/10.1523/JNEUROSCI.6156-10.2011).
10. Wagstaff LJ et al. (2021). Failures of nerve regeneration caused by aging or chronic denervation are rescued by restoring Schwann cell c-Jun. *eLife* 10:e62232. [doi:10.7554/eLife.62232](https://doi.org/10.7554/eLife.62232).
11. Wilcox MB et al. (2020). Characterising cellular and molecular features of human peripheral nerve degeneration. *Acta Neuropathologica Communications* 8:51. [doi:10.1186/s40478-020-00921-w](https://doi.org/10.1186/s40478-020-00921-w).
12. Brushart TME (1993). Motor axons preferentially reinnervate motor pathways. *Journal of Neuroscience* 13:2730–2738. [doi:10.1523/JNEUROSCI.13-06-02730.1993](https://doi.org/10.1523/JNEUROSCI.13-06-02730.1993).
13. Brushart TM et al. (2002). Electrical stimulation promotes motoneuron regeneration without increasing its speed or conditioning the neuron. *Journal of Neuroscience* 22:6631–6638. [doi:10.1523/JNEUROSCI.22-15-06631.2002](https://doi.org/10.1523/JNEUROSCI.22-15-06631.2002).
14. Ikeda M, Oka Y (2012). The relationship between nerve conduction velocity and fiber morphology during peripheral nerve regeneration. *Brain and Behavior* 2:382–390. [doi:10.1002/brb3.61](https://doi.org/10.1002/brb3.61).
15. Sunderland S (1947). Rate of regeneration in human peripheral nerves: analysis of the interval between injury and onset of recovery. *Archives of Neurology & Psychiatry* 58:251–295. [doi:10.1001/archneurpsyc.1947.02300320002001](https://doi.org/10.1001/archneurpsyc.1947.02300320002001).
16. Isaacs J et al.; RECON Study Group (2023). A multicenter prospective randomized comparison of conduits versus decellularized nerve allograft for digital nerve repairs. *Journal of Hand Surgery* 48:904–913. [doi:10.1016/j.jhsa.2023.05.020](https://doi.org/10.1016/j.jhsa.2023.05.020).
17. Buchthal F, Kühl V (1979). Nerve conduction, tactile sensibility, and the electromyogram after suture or compression of peripheral nerve: a longitudinal study in man. *Journal of Neurology, Neurosurgery & Psychiatry* 42(5):436–451. [doi:10.1136/jnnp.42.5.436](https://doi.org/10.1136/jnnp.42.5.436).
18. Podhajsky RJ, Myers RR (1995). A diffusion-reaction model of nerve regeneration. *Journal of Neuroscience Methods* 60(1–2):79–88. [doi:10.1016/0165-0270(94)00222-3](https://doi.org/10.1016/0165-0270(94)00222-3).
19. Laranjeira S, Pellegrino G, Bhangra KS, Phillips JB, Shipley RJ (2022). In silico framework to inform the design of repair constructs for peripheral nerve injury repair. *Journal of the Royal Society Interface* 19(188):20210824. [doi:10.1098/rsif.2021.0824](https://doi.org/10.1098/rsif.2021.0824). [Author manuscript and abstract](https://discovery.ucl.ac.uk/id/eprint/10145037/).
