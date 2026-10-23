# Biohybrid Neural Interface Laboratory — crucial questions and answers

Scientific decision register for the second development stage. Reviewed 2026-10-23.

## Development decision

The next stage is a **controlled experiment workbench for causal attribution and parameter sensitivity**. The first release already demonstrates an active numerical bridge. The immediate scientific need is to distinguish synapse-dependent host recruitment from direct field excitation, subthreshold activity and volume-conducted graft signals, then measure how those outcomes change under controlled parameter variation. These controls add scientific value while retaining the independently verified benchmark.

The implementation should retain the canonical HH 6.3 °C benchmark and add matched interventions, source-resolved recordings, bounded reproducible sweeps, dose arithmetic and complete experiment records. This register states the scientific interpretation and verification obligations; execution results and publication status belong in the versioned stage-two verification report. It does not claim that every future model described below is implemented.

## How to read the register

Each answer has a principal evidence class. A publication can support an experimental phenomenon while the simulator's specific parameter remains estimated. The **implementation consequence** is an engineering requirement, the **verification** states how to check it, and the **remaining uncertainty** identifies what the model or evidence does not establish. Numerical agreement with another solver is distinct from agreement with biology.

| Evidence class | Meaning |
| --- | --- |
| experimental | Experimental observation in the named preparation |
| mathematical | Established equations or numerical method |
| estimated | Explicit simulator or experiment-design choice |
| hypothetical | Exploratory architecture or uncalibrated biological assumption |

The live version uses the same question data as this document: [scientific questions](https://buildthesimulation.com/simulations/biohybrid-interface/questions/). The implementation retains the [Methods & Validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/) and [primary reference register](../../src/lib/biohybrid/references.js).

## Crucial questions

### Evidence & model identity

What the laboratory represents, and which biological claims it can support.

#### 01. What is the laboratory actually calculating?

**Answer.** It solves membrane voltages and active sodium/potassium gates on branched neuronal cables, passes terminal events through assigned conductance synapses, and computes electrode voltages from total membrane currents. The anatomy shares the electrical geometry. A successful numerical pathway therefore has a calculated mechanism; its existence does not establish that a particular living graft would behave the same way.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Retain the verified cable engine and make its measured state, source currents and interventions available to the next experiment layer.

**Verification.** Require stable zero-input behavior, calculated action potentials, propagation, conditional synaptic activation and current balance before interpreting any response map.

**Remaining uncertainty.** Channel densities, synthetic geometry and synapse assignments remain surrogate choices rather than measurements of a specific graft.

**Sources:** [Hodgkin AL (1952): A quantitative description of membrane current and its application to conduction and excitation in nerve](https://doi.org/10.1113/jphysiol.1952.sp004764); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 02. Which parts of the living-electrode concept have been demonstrated experimentally?

**Answer.** Micro-TENN studies support engineered neuronal populations linked by long axonal tracts within hydrogel microcolumns. Adewole and colleagues demonstrated controlled construct fabrication, optical stimulation/readout and implantation proof of concept. These observations motivate the geometry and relay question. They do not supply this simulator’s electrical threshold, synaptic conductance or chronic transfer function.

**Evidence class:** Experimental observation in the named preparation.

**Implementation consequence.** Attach evidence to the particular modeled component, and keep the complete electronic-to-graft-to-host pathway labeled as an explored architecture.

**Verification.** Every quantitative experimental claim needs its preparation, measurement modality and source; synthetic defaults must remain distinguishable from those observations.

**Remaining uncertainty.** A matched dataset connecting stimulus, graft spike, host postsynaptic current and extracellular readout is still needed for biological calibration.

**Sources:** [Struzyna LA (2015): Rebuilding Brain Circuitry with Living Micro-Tissue Engineered Neural Networks](https://doi.org/10.1089/ten.tea.2014.0557); [Adewole DO (2021): Development of optically controlled “living electrodes” with long-projecting axon tracts for a synaptic brain-machine interface](https://doi.org/10.1126/sciadv.aay5347).

#### 03. What does Science Corporation’s work establish, and what remains an architecture proposal?

**Answer.** The named Brown et al. 2024 preprint concerns an optogenetically stimulated cortical biohybrid implant and behavioral reporting in mice. Science’s separate architecture article discusses neurons associated with electronics and prospective scaling. Optical input and behavioral reporting do not constitute a measured high-bandwidth electrical recording system, and a microwell count is not an electrical channel count.

**Evidence class:** Experimental observation in the named preparation.

**Implementation consequence.** Keep the named preprint and company architecture as separate evidence records; do not import prospective neuron counts, bandwidth or longevity as achieved specifications.

**Verification.** Source labels must identify the reviewed preprint version and the different status of company-described future capabilities.

**Remaining uncertainty.** Complete integrated-device geometry, simultaneous electrical input/output performance and long-term reproducibility are not calibrated by this laboratory.

**Sources:** [Brown J (2024, bioRxiv v1): Optogenetic stimulation of a cortical biohybrid implant guides goal directed behavior](https://www.biorxiv.org/content/10.1101/2024.11.22.624907v1); [Hodak M and the Science Corporation team (2024): Biohybrid neural interfaces: an old idea enabling a completely new space of possibilities](https://science.xyz/news/biohybrid-neural-interfaces/).

#### 04. Why retain the canonical Hodgkin–Huxley model at 6.3 °C?

**Answer.** It is a reproducible active-cable benchmark with an independently testable formulation. It provides real membrane dynamics and conduction, but its squid-axon provenance remains visible. Warming the gates with a temperature multiplier or drawing cortical-looking dendrites does not turn it into a validated cortical or stem-cell-derived neuron model.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Preserve this model as a named benchmark while designing a later, separately identified mammalian calibration track.

**Verification.** Export the model version and temperature. Compare waveform, conduction and threshold evidence only within the declared parameterization.

**Remaining uncertainty.** Relevant cell-type kinetics, maturation state and measured current-clamp responses must be supplied together before making preparation-specific claims.

**Sources:** [Hodgkin AL (1952): A quantitative description of membrane current and its application to conduction and excitation in nerve](https://doi.org/10.1113/jphysiol.1952.sp004764); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 05. How realistic is the neuronal anatomy?

**Answer.** The geometry contains soma, branched dendrites and segmented axons in physical units, but the branching is synthetic. It is an electrically meaningful test structure rather than a specimen reconstruction. Every rendered electrical segment corresponds to a model segment; display width exaggeration must remain disclosed and must not alter cable area or resistance.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Use the same geometry for field coupling, compartment inspection and visualization, with physical scale bars and explicit display-only exaggeration.

**Verification.** Check compartment identity, branch connectivity, membrane area and scale under mesh refinement and both 3D/2D views.

**Remaining uncertainty.** Real graft arborization, axon caliber distributions and target locations need morphological measurements or a documented reconstruction dataset.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Struzyna LA (2015): Rebuilding Brain Circuitry with Living Micro-Tissue Engineered Neural Networks](https://doi.org/10.1089/ten.tea.2014.0557).

### Causal transmission

Distinguish a functioning modeled relay from direct stimulation and distant electrical sources.

#### 06. What evidence is sufficient to call a response dependent on the modeled synaptic relay?

**Answer.** Temporal order is necessary but insufficient. Run the same geometry and stimulus with the graft-to-host synaptic conductances removed, and compare each receiving cell. If a host response disappears under that intervention while the graft still conducts, the response depends on the modeled junction under those conditions. This is a model counterfactual, not proof of a biological synapse.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Provide an automatic matched intact/synapse-off comparison rather than asking users to infer causality from waveform shape.

**Verification.** Hold every non-synaptic setting fixed; verify identical graft traces, host outcomes, local synaptic-event order and reproducible comparison results.

**Remaining uncertainty.** If both conditions spike, changed timing or counts can still show a synaptic contribution, but spike presence alone cannot identify an exclusive path.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Histed, Bonin & Reid (2009): Direct activation of sparse, distributed populations of cortical neurons by electrical microstimulation](https://doi.org/10.1016/j.neuron.2009.07.016).

#### 07. Could the electrode excite host tissue directly?

**Answer.** Yes. The imposed extracellular field acts on every modeled cable, not only the engineered soma. Histed and colleagues found that electrical microstimulation can directly recruit distributed cortical cells, consistent with activation of nearby axonal elements. In this model, a host spike that remains with junction conductance set to zero is compatible with direct field activation and cannot be credited exclusively to the bridge.

**Evidence class:** Experimental observation in the named preparation.

**Implementation consequence.** Label control-persistent host activity explicitly and retain the stimulus field on the host in both compared runs.

**Verification.** Include a configuration that produces a host response without synaptic events, plus the default configuration in which the matched control remains below threshold.

**Remaining uncertainty.** A modeled direct response does not identify the excitation site or spatial recruitment pattern of a real cortical preparation.

**Sources:** [Histed, Bonin & Reid (2009): Direct activation of sparse, distributed populations of cortical neurons by electrical microstimulation](https://doi.org/10.1016/j.neuron.2009.07.016); [Rattay F (1999): The basic mechanism for the electrical stimulation of the nervous system](https://doi.org/10.1016/S0306-4522(98)00330-3).

#### 08. Why can the receiving electrode show a waveform when no host neuron fires?

**Answer.** An electrode samples the superposed extracellular field. Currents from the graft can reach a contact near the host, and a subthreshold host membrane can also carry current. A nonzero neural waveform therefore does not imply local host spikes or successful host-graft transmission. Stimulus artifact provides another distinct contribution.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Show graft-source, host-source, total neural and applied-field components alongside the host spike raster.

**Verification.** The disconnected example must retain its nonzero graft-derived recording while reporting zero host recruitment; source components must sum back to the original signal sample by sample.

**Remaining uncertainty.** Source decomposition is available because the simulator knows every source; a real electrode does not automatically provide those separated traces.

**Sources:** [Lindén H (2014): LFPy: a tool for biophysical simulation of extracellular potentials generated by detailed model neurons](https://doi.org/10.3389/fninf.2013.00041); [Holt GR (1999): Electrical interactions via the extracellular potential near cell bodies](https://doi.org/10.1023/A:1008832702585); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 09. Which controls are needed, and what exactly changes in each?

**Answer.** The intact run retains the chosen settings. A synapse-off control changes only the assigned graft-to-host conductance to zero. A no-stimulus control changes only the stimulating current to zero. Geometry, recording position, time step, duration and membrane properties remain matched. A preset called disconnected is useful for teaching, but a causal comparison must derive its control from the actual completed run.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Store normalized settings for every member of the control set and display the exact intervention.

**Verification.** Assert the allowed setting differences, preserve the same sampling grid, and reject mixed-version or mismatched runs instead of presenting them as a matched experiment.

**Remaining uncertainty.** These interventions isolate mechanisms inside the defined model; biological blockers can have additional effects that are not represented here.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 10. How should conduction delay and relay latency be measured?

**Answer.** A delay requires specified start and end events in specified structures. Axonal delay should match a proximal crossing to a subsequent terminal crossing on the same graft. Host latency should identify the graft event, local synaptic arrival and host soma response used. Subtracting two unrelated earliest spikes can create a plausible but misleading number when multiple cells or pulses are present.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Retain per-cell event identities and distinguish conduction, configured synaptic delay and postsynaptic integration time.

**Verification.** Match events by cell, monitor and ordinal where justified; report absent or ambiguous events as unavailable rather than zero delay.

**Remaining uncertainty.** Overlapping responses or multiple upstream grafts can prevent a unique event-to-event assignment without additional interventions.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Repository: numerical validation and retained discrepancies](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/VALIDATION_HISTORY.md).

#### 11. Does a host that fails to spike imply that its synapse is absent?

**Answer.** No. A terminal event can produce a postsynaptic conductance and membrane deflection that remains below spike threshold. The laboratory should distinguish absent connections, no presynaptic terminal event, present but weak postsynaptic input, and host spiking. Those outcomes describe different failure mechanisms and call for different parameter changes.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Use terminal events, local synaptic events and host voltage together when explaining unsuccessful transmission.

**Verification.** Test zero coupling, weak nonzero coupling and sufficient coupling while keeping the stimulus and geometry fixed; the weak case must not be forced to fire.

**Remaining uncertainty.** Actual synaptic failure rates, inhibitory inputs and release probabilities are not inferred from a single deterministic conductance.

**Sources:** [Destexhe A (1994): An efficient method for computing synaptic conductances based on a kinetic model of receptor binding](https://doi.org/10.1162/neco.1994.6.1.14); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

### Stimulation & recruitment

Interpret controlled parameter changes without inventing a universal threshold or safety limit.

#### 12. Is the fraction of recruited hosts a probability of successful integration?

**Answer.** No. It is the fraction of the explicitly modeled host cells that crossed the chosen spike detector in that run. The electrical model is deterministic and the small synthetic population is not a random sample of a clinical graft. Calling 3 of 3 cells a 100% biological success probability would exceed the evidence.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Report both the integer count and the denominator, and show individual host outcomes in controlled sweeps.

**Verification.** Verify recruitment counts from unique host soma identities, not terminal events or repeated spikes; preserve a separate total spike count.

**Remaining uncertainty.** A probabilistic biological estimate would require a defined sampling population, trial variability, an uncertainty model and experimental calibration.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Dhobale AV (2018): Assessing functional connectivity across 3D tissue engineered axonal tracts using calcium fluorescence imaging](https://doi.org/10.1088/1741-2552/aac96d).

#### 13. What do current polarity and the two pulse phases mean?

**Answer.** The sign specifies current at the stimulating contact relative to its explicit return. The implemented waveform has equal-duration opposite phases, with a configurable interphase gap. The spatial field can depolarize one segment while hyperpolarizing another. A negative first phase is not a universal guarantee of excitation, and phase order can change the response.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Preserve signed current and expose polarity as an experimental variable rather than a decorative switch.

**Verification.** Invert the imposed field with current sign, integrate each delivered phase including fractional solver intervals, and recompute membrane dynamics for both polarities.

**Remaining uncertainty.** The current source is ideal; electrode polarization and compliance limits are not modeled.

**Sources:** [Rattay F (1999): The basic mechanism for the electrical stimulation of the nervous system](https://doi.org/10.1016/S0306-4522(98)00330-3); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 14. Can a parameter sweep report a single activation threshold?

**Answer.** A finite sweep can identify tested values that did and did not activate a specified cell or relay outcome. It should report those response brackets, the grid spacing and any reversals. A single interpolated threshold is justified only under additional monotonicity assumptions. Experiments in retinal ganglion cells have demonstrated an upper stimulation threshold, so a globally monotone response cannot be assumed for all neural systems.

**Evidence class:** Experimental observation in the named preparation.

**Implementation consequence.** Present the complete sampled response curve and retain transitions in both directions instead of hiding them behind one threshold number.

**Verification.** Test bracket extraction on monotone, all-negative, all-positive, discontinuous and nonmonotone outcomes; no extrapolated threshold may appear outside the tested interval.

**Remaining uncertainty.** The cited retinal observation motivates a safeguard; its numerical thresholds are not transferred to this synthetic bridge.

**Sources:** [Boinagrov et al. (2012): Upper threshold of extracellular neural stimulation](https://doi.org/10.1152/jn.01058.2011); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 15. Should a strength–duration curve be forced to follow the Lapicque formula?

**Answer.** No. Calculate each duration/current condition using the active compartments first. Extracellular strength–duration behavior depends on field geometry and channel dynamics; Boinagrov and colleagues showed departures from simple intracellular descriptions. A fitted rheobase or chronaxie would be a secondary descriptive fit with residuals and a stated range, not a replacement for the solver.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Start with bounded one-parameter response maps and explicit pulse duration. Add threshold-versus-duration fitting only after verified bracketing across several durations.

**Verification.** Use sufficient temporal resolution for each phase, report non-activation and nonmonotonicity, and compare brackets under time-step refinement.

**Remaining uncertainty.** No fitted time constant from the surrogate should be labeled as a measured graft or human-neuron chronaxie.

**Sources:** [Boinagrov, Loudin & Palanker (2010): Strength–duration relationship for extracellular neural stimulation: numerical and analytical models](https://doi.org/10.1152/jn.00343.2010); [Hodgkin AL (1952): A quantitative description of membrane current and its application to conduction and excitation in nerve](https://doi.org/10.1113/jphysiol.1952.sp004764).

#### 16. What stimulation dose should be reported, and does charge balance establish safety?

**Answer.** Report current, phase duration, phase charge and nominal geometric charge density. For a rectangular phase, Q[nC] = |I[µA]| × duration[ms]. With a disk radius r[µm], density[µC/cm²] = Q[nC] × 10⁵/(πr²). Equal opposite phase charge gives zero ideal net charge, but this model has no electrode electrochemistry, tissue injury, heating or chronic exposure law, so it cannot certify a safe stimulus.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Keep dose arithmetic visible with units and label it as ideal-source geometry, not a device safety recommendation.

**Verification.** Check unit conversions analytically, phase balance numerically and the radius-squared scaling; do not add an unsupported universal pass/fail safety threshold.

**Remaining uncertainty.** Material, effective area, electrode polarization, repetition history and preparation-specific injury measurements are required for safety assessment; empirical models such as Shannon’s have their own domain of evidence.

**Sources:** [Shannon (1992): A model of safe levels for electrical stimulation](https://doi.org/10.1109/10.126616); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 17. How can a user tell which parameter caused a change?

**Answer.** Vary one declared parameter while holding the remaining normalized settings fixed. Include the baseline value where practical and record every condition, including unsuccessful or invalid conditions. The resulting relationship is conditional on that baseline. A one-factor sweep cannot estimate all interactions between conductivity, position, morphology and synaptic strength.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Provide reproducible amplitude, coupling, recording-distance and conduction-related sweeps with visible units and base settings.

**Verification.** Verify the generated settings, number and order of cases, unchanged non-swept parameters, complete result rows and deterministic reruns.

**Remaining uncertainty.** Broader uncertainty analysis needs justified parameter ranges and a designed multivariable study; arbitrary sliders are not probability distributions.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 18. How do axon length and diameter affect conduction in this model?

**Answer.** Length changes the physical path to be traversed, while diameter changes axial conductance and membrane area. Both enter the compartment equations rather than a preset animation speed. A velocity estimate must divide the actual monitored path length by its matched conduction delay, including any taper or offset represented in the geometry.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Keep the existing conduction experiment and allow controlled comparisons with the same channel parameters and temperature.

**Verification.** Check event order, positive delay, path-length bookkeeping and temporal/spatial refinement for the tested geometries.

**Remaining uncertainty.** The unmyelinated HH surrogate does not include nodes of Ranvier, internodes, myelin remodeling or a calibrated mammalian diameter–velocity law.

**Sources:** [Hodgkin AL (1952): A quantitative description of membrane current and its application to conduction and excitation in nerve](https://doi.org/10.1113/jphysiol.1952.sp004764); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

### Extracellular measurements

Understand what electrodes measure and what the ideal conductor leaves unresolved.

#### 19. Can graft and host electrode contributions be separated without rerunning the cells?

**Answer.** Yes, within the stated linear volume conductor. At each saved time, multiply each compartment’s total membrane current by its contact transfer coefficient and sum by source identity. The graft and host contributions then add to the neural waveform. This partitions sources within one run; it is different from subtracting intact and disconnected runs, whose host dynamics can differ nonlinearly.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Add source-resolved traces and a reconstruction residual while retaining the original total neural trace.

**Verification.** Check graft + host = neural for every contact/sample, and neural + applied field = ideal total. Preserve existing voltage and event results.

**Remaining uncertainty.** The partition is model ground truth, not an inverse method that can uniquely recover source populations from experimental electrode data.

**Sources:** [Lindén H (2014): LFPy: a tool for biophysical simulation of extracellular potentials generated by detailed model neurons](https://doi.org/10.3389/fninf.2013.00041); [Holt GR (1999): Electrical interactions via the extracellular potential near cell bodies](https://doi.org/10.1023/A:1008832702585).

#### 20. What does the finite-contact correction include?

**Answer.** The ideal recording value is a spatial average of extracellular potential over a flat disk, estimated with deterministic quadrature. The stimulation disk similarly distributes the imposed current over sampled sites. This includes a stated contact size rather than an ideal point, but it does not solve electrode polarization, insulating shanks or the conductivity boundary around a metal object.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Retain contact dimensions and overlap/clearance checks, and describe the method as disk averaging rather than finite-element electrode physics.

**Verification.** Compare disk quadrature against analytic on-axis cases and distant point limits; reject contacts that intersect membranes even between quadrature sites.

**Remaining uncertainty.** Near-contact predictions require more detailed material boundaries and converged contact integration before experimental interpretation.

**Sources:** [Lindén H (2014): LFPy: a tool for biophysical simulation of extracellular potentials generated by detailed model neurons](https://doi.org/10.3389/fninf.2013.00041); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 21. Should doubling electrode distance or conductivity always halve the recorded waveform?

**Answer.** Only a controlled isolated point source obeys an exact inverse-distance law. An extended cell includes spatially distributed sources and sinks whose cancellation can change with location. In the homogeneous model, fixed source currents do scale inversely with conductivity; however, rerunning field stimulation at a different conductivity can also change those source currents and recruitment.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Separate a recording-position experiment with unchanged cell dynamics from a full conductivity perturbation of stimulation and recording.

**Verification.** Test inverse-distance behavior on an analytic point source, inverse conductivity on fixed transfer coefficients, and unchanged membrane arrays when only passive recording position changes.

**Remaining uncertainty.** Scaffold boundaries, anisotropy and frequency-dependent tissue properties are outside the homogeneous-conductor approximation.

**Sources:** [Holt GR (1999): Electrical interactions via the extracellular potential near cell bodies](https://doi.org/10.1023/A:1008832702585); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 22. What are the voltage reference and stimulus-artifact assumptions?

**Answer.** The contact potentials use a distant reference in an infinite conductor, while stimulation includes an explicit source and return. The applied-field trace is the ideal volume-conductor artifact. A real amplifier measures a difference between finite contacts and may saturate, filter or blank samples during stimulation; those effects are not recreated by simply hiding the artifact curve.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Label neural, applied-field and ideal-total views separately, including the chosen reference convention.

**Verification.** Require an equal return current, reproducible field sign, exact component reconstruction and zero applied artifact outside the specified pulse support.

**Remaining uncertainty.** Amplifier range, input impedance, differential reference placement, filtering and recovery need a separately specified acquisition model.

**Sources:** [Rattay F (1999): The basic mechanism for the electrical stimulation of the nervous system](https://doi.org/10.1016/S0306-4522(98)00330-3); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 23. Does a larger ideal extracellular waveform mean that a device can record more information?

**Answer.** Not by itself. Peak-to-peak voltage describes one waveform under an ideal reference. Detectability also depends on noise, bandwidth, artifact recovery and the number of independent signals. Information transfer additionally requires a defined input distribution, trial variability and decoding task. None can be inferred from the number of visible neurons or contacts.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Report waveform amplitude as amplitude; avoid attaching an SNR, bit rate or channel-count claim without the corresponding acquisition and statistical model.

**Verification.** Keep units and measurement windows explicit and ensure that source-resolved amplitudes are not treated as additive peak-to-peak values.

**Remaining uncertainty.** Measured electronics noise, biological background, electrode impedance and task data are needed before a recording-performance or information claim.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Hodak M and the Science Corporation team (2024): Biohybrid neural interfaces: an old idea enabling a completely new space of possibilities](https://science.xyz/news/biohybrid-neural-interfaces/).

### Numerical & software evidence

Test the calculation, reproducibility, exports and user interface separately.

#### 24. How do we know the time step is adequate?

**Answer.** An implicit voltage solve can remain stable while producing inaccurate spikes. Compare at least the production time step and two finer steps on a common saved-time grid. Check membrane-waveform differences, matched event times and counts. Near a threshold, a tiny discretization change can alter recruitment, so a passing suprathreshold waveform check is not enough to validate every sweep boundary.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Retain the existing temporal study and refine selected response transitions in the next-stage validation set.

**Verification.** Use predeclared error criteria and preserve disagreements. Report differences between discrete solutions rather than calling them exact-solution errors.

**Remaining uncertainty.** Observed reduction with refinement is evidence over the tested regime, not a proof of global accuracy or formal convergence order.

**Sources:** [Hines M (1984): Efficient computation of branched nerve equations](https://doi.org/10.1016/0020-7101(84)90008-4); [Rush S (1978): A practical algorithm for solving dynamic membrane equations](https://doi.org/10.1109/TBME.1978.326270); [Repository: numerical validation and retained discrepancies](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/VALIDATION_HISTORY.md).

#### 25. How do we distinguish a finer mesh from a changed experiment?

**Answer.** Refinement must preserve the physical branch geometry, stimulus contacts and synapse landing locations. Moving a synapse to whichever compartment happens to be nearest can change its anatomical target and produce a false convergence result. The foundational release retained a failed spatial comparison caused by exactly this kind of target change, then fixed the geometry rather than relaxing its tolerance.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Treat synapse location as a physical anatomical quantity and only change its electrical discretization under mesh refinement.

**Verification.** Compare target coordinates, cable path, recruitment, conduction delay and contact waveforms at 25, 12.5 and 6.25 µm where applicable.

**Remaining uncertainty.** A converged synthetic cable is still a synthetic cable; spatial numerical convergence cannot validate the biological morphology.

**Sources:** [Repository: numerical validation and retained discrepancies](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/VALIDATION_HISTORY.md); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 26. What does agreement with native NEURON validate?

**Answer.** The stored reference comparison tests another implementation of the same HH cable, conductance synapses, geometry and finite-step conventions. Close agreement supports the implementation and unit bookkeeping. It does not eliminate both solvers’ discretization error, prove an untested parameter regime, or show agreement with living neurons.

**Evidence class:** Established equations or numerical method.

**Implementation consequence.** Preserve the original benchmark and source identities when adding analysis-only measurements; rerun reference verification if the numerical equations or update order change.

**Verification.** Check waveform error, event count/timing, extracellular signals, reference version and source hashes; retain the raw comparison traces.

**Remaining uncertainty.** Biological validity needs experimental voltage and current data beyond software-to-software agreement.

**Sources:** [Repository: native NEURON comparison, raw traces and source identities](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/neuron-validation.json); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 27. What must an exported experiment contain to be reproducible?

**Answer.** It needs normalized settings, model and analysis versions, physical units, the source/current convention, sampling and solver resolutions, and every sweep/control condition. A summary metric without its settings is not reproducible. Electrical replay should reproduce the same arrays in the same runtime, while growth additionally requires its random seed and model parameters.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Export machine-readable experiment metadata and tabular results separately from a screenshot, including source components and control identities.

**Verification.** Round-trip settings, verify every exported sample/column and event count, reject malformed input, and compare deterministic reruns. Verify browser file saving separately from serialization.

**Remaining uncertainty.** Bitwise identity across different JavaScript runtimes is not promised; numerical tolerances and version identities are necessary for cross-platform comparisons.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Repository: exploratory growth model and its limits](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/GROWTH_MODEL.md).

#### 28. How can long calculations stay responsive without showing stale or mixed results?

**Answer.** Run numerical work in a worker and treat each request as a separate generation. Cancel or supersede earlier work when settings change, and bind completed measurements to the exact settings that produced them. Partial sweep results must be labeled partial; a cancelled worker must never overwrite a newer experiment.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Use progress, cancellation, bounded case counts and explicit completed-run provenance in the experiment workbench.

**Verification.** Test cancellation during a sweep, edits before completion, rapid reruns, stale messages and malformed worker errors. Keep rendering and user interaction responsive.

**Remaining uncertainty.** Runtime depends on device, population size and resolution; measured development-machine timings are not a universal performance guarantee.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 29. What counts as verification of the scientific visualization?

**Answer.** Inspect both themes, responsive layouts, replay, selection and parameter changes in the browser. Confirm that the displayed frame and compartment values come from returned numerical state. Source review can check renderer logic, but it cannot substitute for testing WebGL rendering and controls on a GPU-enabled browser. A tested 2D fallback should remain available when WebGL is absent.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Publish browser observations and remaining gaps separately from numerical results and build success.

**Verification.** Check anatomy/trace synchronization, units, time scrubbing, focus, keyboard use, clipping where supported, and mobile overflow; label unsupported verification explicitly.

**Remaining uncertainty.** The first release’s cloud browser could not enable WebGL. That gap remains open until direct 3D testing succeeds in a supported environment.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 30. When is the next stage actually complete and published?

**Answer.** Completion requires implemented behavior, targeted numerical regression, preserved site-wide tests, a successful production build and inspectable source history. Publication additionally requires the intended commit to be merged, Cloudflare deployment to succeed and the public routes to show the new behavior. Queued checks, a local preview or generated code alone do not meet that standard.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Keep a release report with branch, commit, PR, exact tests, quantitative discrepancies, build and deployment identities, and live verification.

**Verification.** Verify the deployed content against the tested source, exercise an intact/control comparison and a sweep, and confirm directory/navigation entries.

**Remaining uncertainty.** Any unavailable device, GPU or browser-download check must remain visible instead of being implied by a successful build.

**Sources:** [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/); [Repository: numerical validation and retained discrepancies](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/VALIDATION_HISTORY.md).

### Biology & the next calibration

Keep growth, integration and chronic performance tied to the evidence actually available.

#### 31. When does a modeled growing neurite become a functional synapse?

**Answer.** A geometric encounter is only an encounter. The exploratory module adds a separately assumed formation probability and maturation interval before marking a candidate. Even that candidate is not an experimentally verified synapse. Transferring candidate count into electrical settings requires an explicit action, and postsynaptic firing still depends on the subsequent electrical solve.

**Evidence class:** Exploratory architecture or uncalibrated biological assumption.

**Implementation consequence.** Keep encounter, candidate maturation and electrical activation as distinct states and keep days separate from millisecond electrophysiology.

**Verification.** Use seeded replay, verify no future events leak into the growth time scrubber, and show exactly what is transferred: target count, not grown trajectories or measured weights.

**Remaining uncertainty.** Culture elongation measurements do not determine in-vivo guidance, synapse formation probability, survival or circuit specificity.

**Sources:** [Repository: exploratory growth model and its limits](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/biohybrid/GROWTH_MODEL.md); [Adewole DO (2021): Development of optically controlled “living electrodes” with long-projecting axon tracts for a synaptic brain-machine interface](https://doi.org/10.1126/sciadv.aay5347).

#### 32. Can the interface-degradation experiment predict long-term implantation performance?

**Answer.** It can show how specified conductivity, separation and coupling changes affect this model. Those parameters are not a clock for months after implantation. Biran and colleagues measured tissue responses around chronic silicon implants, but that evidence does not calibrate a living graft’s survival, immune response or mechanical evolution.

**Evidence class:** Exploratory architecture or uncalibrated biological assumption.

**Implementation consequence.** Present degradation as a perturbation study with explicit changed parameters and avoid chronic survival curves without longitudinal data.

**Verification.** Separate effects on stimulation, neural recruitment and recording amplitude; do not interpret a smaller waveform as proof of neuron loss.

**Remaining uncertainty.** Viability, vascularization, immunity, glia, micromotion, material degradation and electrode impedance require independent measured models.

**Sources:** [Biran R (2005): Neuronal cell loss accompanies the brain tissue response to chronically implanted silicon microelectrode arrays](https://doi.org/10.1016/j.expneurol.2005.04.020); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 33. Does more connectivity imply learning, selectivity or useful network computation?

**Answer.** No. The current links are fixed excitatory conductances. Adding them can alter recruitment and timing, but there is no validated plasticity rule, inhibitory balance, task objective or learned representation. A larger population would also introduce convergence and performance costs, so it should follow demonstrated value from the small inspectable network.

**Evidence class:** Exploratory architecture or uncalibrated biological assumption.

**Implementation consequence.** First quantify per-host recruitment and stimulus dependence; add plasticity or more cell classes only with a declared model and independent checks.

**Verification.** Keep connection counts and weights explicit, check deterministic recruitment, and avoid naming connectivity changes learning or restoration.

**Remaining uncertainty.** Measured cell types, inhibitory/excitatory connectivity, short-term dynamics and task-level behavior are needed to support stronger network claims.

**Sources:** [Destexhe A (1994): An efficient method for computing synaptic conductances based on a kinetic model of receptor binding](https://doi.org/10.1162/neco.1994.6.1.14); [Dhobale AV (2018): Assessing functional connectivity across 3D tissue engineered axonal tracts using calcium fluorescence imaging](https://doi.org/10.1088/1741-2552/aac96d); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

#### 34. What evidence would justify the next biological model beyond this benchmark?

**Answer.** Choose a named preparation and obtain morphology, temperature, passive properties, current-clamp responses, spike shape and conduction measurements, plus paired or otherwise causal host-graft transmission measurements. Fit a defined subset, reserve independent protocols for validation, and retain the HH benchmark beside the new model. Complexity earns predictive value only when those new predictions survive tests outside the fit.

**Evidence class:** Explicit simulator or experiment-design choice.

**Implementation consequence.** Make causal controls and reproducible response maps the immediate stage, then use them as the test harness for a separately versioned cortical or stem-cell-derived model.

**Verification.** Predeclare fitted quantities, held-out protocols, uncertainty ranges and acceptance criteria; report model failures and parameter non-identifiability.

**Remaining uncertainty.** No current dataset in this laboratory establishes graft-specific thresholds, chronic stability, safe stimulation or human efficacy.

**Sources:** [Adewole DO (2021): Development of optically controlled “living electrodes” with long-projecting axon tracts for a synaptic brain-machine interface](https://doi.org/10.1126/sciadv.aay5347); [Dhobale AV (2018): Assessing functional connectivity across 3D tissue engineered axonal tracts using calcium fluorescence imaging](https://doi.org/10.1088/1741-2552/aac96d); [Biohybrid Laboratory: Methods & validation](https://buildthesimulation.com/simulations/biohybrid-interface/methods/).

## Prioritized decisions from the answers

| Priority | Decision | Scientific reason | Release evidence required |
| --- | --- | --- | --- |
| 1 | Matched intact, synapse-off and no-stimulus controls | A waveform and temporal sequence alone do not identify the route responsible for host activity. | Per-host outcomes, exact setting interventions and preserved graft behavior. |
| 2 | Source-resolved extracellular traces | Graft fields can reach the receiving contact without local host spikes. | Sample-by-sample graft/host/total reconstruction with explicit ideal artifact. |
| 3 | Bounded one-factor response maps | Threshold and recruitment depend on configuration; a single successful preset conceals the response boundary. | Complete parameter grid, failed/invalid outcomes, reproducible results and honest transition brackets. |
| 4 | Ideal stimulus dose accounting | Current, time and contact area must be interpreted together. | Unit-checked phase charge and nominal geometric density, with no unsupported safety certification. |
| 5 | Complete reproducibility and public verification | A user must know what settings produced each displayed or exported result. | Worker lifecycle checks, content/export integrity, numerical regression, browser observations, CI and verified live deployment. |
| 6 | Separate preparation-specific calibration | Synthetic HH results cannot be relabeled as cortical graft predictions. | A named dataset, cell-type model, independent validation protocols and a new versioned evidence record. |

## Research boundaries retained

- The named Brown et al. source remains explicitly the 2024 bioRxiv v1 cited by the first release; no claim is made here that a later publication was exhaustively excluded. The company architecture source is treated separately.
- New primary-source checks added for this stage are Histed et al. (2009), Boinagrov et al. (2010), Boinagrov et al. (2012), and Shannon (1992). Their findings constrain interpretation; their numerical parameters are not imported as a graft calibration.
- No pharmacological protocol, therapeutic stimulus setting, implant safety recommendation or chronic outcome prediction is supplied by this simulator.
- Experimental uncertainty is not hidden behind a seeded simulation: deterministic replay verifies computation, not a universal biological response.
