# Biohybrid Neural Interface Laboratory — scientific architecture

Research and architecture checkpoint: 2026-10-23. This document declares the model scope and validation targets before the final validation report. It does not claim that a test or deployment has already passed.

## Scientific question and supported scope

How can a field stimulus activate an engineered axonal pathway, recruit a host neuron through a modeled chemical synapse, and produce a measurable extracellular signal? The first experiment contains a small, fully inspectable pathway. Each displayed membrane voltage comes from active compartment equations. Each extracellular waveform comes from calculated membrane current. The model exposes failure when the stimulus is insufficient, the axon does not conduct, synaptic transmission fails, or the host remains below threshold.

The foundation is a **canonical active-cable surrogate at 6.3 °C**, using Hodgkin–Huxley kinetics on synthetic branched cells and axons. It is not fitted to living cortical grafts, human neurons, stem-cell-derived neurons, or a particular commercial device. Morphological detail and numerical verification must not be mistaken for that biological calibration. The parameterization and temperature must remain visible in the laboratory and exports.

Changing a physiological label from squid to cortical, or applying a generic temperature multiplier to the same gates, would not establish a mammalian model. A later calibrated model should introduce a documented cell preparation, channel kinetics and densities, morphology, temperature, and experimental voltage/current recordings together. The benchmark is retained for reproducibility and solver regression.

## Evidence register and provenance

The machine-readable register is [`src/lib/biohybrid/references.js`](../../src/lib/biohybrid/references.js). Every record has a component, an evidence class, a source, and a limitation. Four classes are used:

| Class | What it establishes |
| --- | --- |
| Experimental | An observation in a named species, culture, device, or measurement. |
| Mathematical | A documented equation, numerical algorithm, or forward-model approximation. |
| Estimated | A chosen simulator parameter or synthetic geometry without an experimental fit. |
| Hypothetical | An architecture or biological mechanism explored without predictive calibration. |

These classes apply to a claim, not an entire research field. For example, an engineered axon tract can be experimentally demonstrated while the simulator's selected synaptic conductance is estimated.

### Experimental anchors

[Struzyna et al. (2015)](https://doi.org/10.1089/ten.tea.2014.0557) support the arrangement of separated neuronal populations and long axonal projections inside a hydrogel lumen, including survival and anatomical integration after rat implantation. That evidence motivates the construct geometry; it does not provide a calibrated electrical transfer function.

[Adewole et al. (2021)](https://doi.org/10.1126/sciadv.aay5347) report 398 µm outer / 180 µm inner diameter microcolumns, aggregate constructs 2–9 mm long, and in-vitro optical stimulation with time-locked responses in the opposing aggregate. Their growth measurements follow the longest visible neurite, not every individual axon. Peak rates differ strongly by preparation: 39.1 ± 20.6 µm/day for planar controls, 61.7 ± 5.01 µm/day for dissociated constructs, and 1101.8 ± 81.1 µm/day at 3 days in vitro for 9 mm bidirectional constructs (means ± SEM). Some long constructs ceased outgrowth without completing a network. These observations provide context, not an in-vivo growth law or guaranteed integration time.

[Dhobale et al. (2018)](https://doi.org/10.1088/1741-2552/aac96d) estimate functional connectivity from calcium imaging of engineered populations. Calcium correlation and directed statistical coupling must not be relabeled as measurements of an individual synapse's electrical conductance or delay.

[Brown et al. (2024)](https://doi.org/10.1101/2024.11.22.624907), the Science Corporation preprint, describe a mouse cortical-surface microwell graft with optical stimulation, calcium activity, and learned behavioral reporting. This supports a biological interface proof of concept. The passive wells are not independent electrical recording channels. [Science's separate architecture description](https://science.xyz/news/biohybrid-neural-interfaces/) contains prospective electronics and scaling claims; those are not treated as measured performance of this laboratory or the microwell experiment.

[Biran et al. (2005)](https://doi.org/10.1016/j.expneurol.2005.04.020) document a tissue response and neuronal loss around chronic silicon implants. This motivates perturbing separation and coupling, but does not calibrate degradation of a living construct. No slider is interpreted as months of implantation or as a patient prognosis.

## Model composition

The electrical model contains engineered neurons with branched dendrites and a long unmyelinated axonal segment, a small set of host cells, synaptic links, a stimulating contact with an explicit return, and multiple recording contacts. A hydrogel boundary conveys geometric confinement. The initial forward model uses the same homogeneous conductivity through the illustrated regions: the scaffold is not secretly assigned a separately solved conductivity interface.

Compartment geometry stores endpoints, diameter, length, membrane area, cell identity, compartment type, and parent index. Electrical parameters store capacitance, axial resistivity, ion-channel densities/reversals, and initial gates. Synaptic records store the presynaptic terminal, postsynaptic compartment, conductance, reversal potential, delay, and event state. The scene uses this geometry and returned voltage state; it contains no independently timed traveling-light animation.

All lengths are expressed in µm, times in ms for electrophysiology and days for growth, intracellular voltage in mV, extracellular signal in µV, electrode current in µA, synaptic conductance in µS, and conductivity in S/m. Internal conversions must be explicit. Every CSV column includes units; JSON includes model version, solver settings, seed, and normalized parameters.

## Equations and numerical method

### Active compartments

For compartment i, with membrane voltage V_i = phi_i − phi_e,i:

```text
C_i dV_i/dt = −I_ion,i − I_syn,i
              + Σ_j g_ij [(V_j + phi_e,j) − (V_i + phi_e,i)]
              + I_injected,i
I_ion,i = gNa_i m_i^3 h_i (V_i − ENa)
          + gK_i n_i^4 (V_i − EK) + gL_i (V_i − EL)
dx_i/dt = alpha_x(V_i)(1 − x_i) − beta_x(V_i)x_i
```

The original [Hodgkin–Huxley formulation](https://doi.org/10.1113/jphysiol.1952.sp004764) supplies the benchmark gates and currents. Surface-density parameters are multiplied by actual membrane area. Axial conductance is the inverse resistance of the two adjacent half-segments. Neurite ends are sealed. The electrode does not inject soma current directly: the extracellular potential differences enter the axial term, following [Rattay (1999)](https://doi.org/10.1016/S0306-4522(98)00330-3). Intracellular current injection may be used as a separately named validation stimulus.

The voltage solve is an implicit linear tree solve with gates held fixed over the step, following [Hines (1984)](https://doi.org/10.1016/0020-7101(84)90008-4). First-order gates use a [Rush–Larsen update](https://doi.org/10.1109/TBME.1978.326270):

```text
x_next = x_inf(V) + [x − x_inf(V)] exp(−dt / tau_x(V))
```

This is a split approximation to nonlinear dynamics, not an exact solution. An implicit axial solve avoids the severe explicit diffusion stability restriction but does not guarantee adequate spike timing. Time and space refinement remain required. Gate singularities require analytic limiting values; non-finite states must produce a visible error rather than being hidden by voltage clipping.

### Synapses

An upward threshold crossing at the presynaptic terminal schedules a conductance event after a specified delay. A conductance kernel with explicit rise/decay parameters supplies:

```text
I_syn,i(t) = g_syn,i(t) [V_i(t) − E_syn]
```

This is a reduced conductance-based synapse, informed by the kinetic framework of [Destexhe et al. (1994)](https://doi.org/10.1162/neco.1994.6.1.14). The event threshold is a detector, not the mechanism that generates an action potential. The postsynaptic cell can remain subthreshold; it is not forced to fire. Delay and conductance are modeling choices, and release variability, if enabled, uses an explicit probability and seeded generator. No plasticity or learning is implied.

### Stimulation and extracellular recording

A specified source current and equal return current generate phi_e through an infinite, isotropic, homogeneous, resistive volume conductor. A finite stimulating disk is approximated by weighted spatial samples; this is a stated source distribution, not a solved electrode polarization boundary. Geometry and current sign both matter for excitation.

Recording uses total transmembrane source current, including capacitive, ionic, and synaptic contributions with a consistent outward sign. A sealed isolated cell's net transmembrane source should sum to zero to numerical tolerance. The line-source integral for an extended compartment is:

```text
phi_e(r,t) = Σ_i [I_m,i(t)/(4π sigma L_i)]
                  ∫_segment_i ds / |r − r_i(s)|
V_contact(t) = (1/A) ∫_contact phi_e(r,t) dA
```

Point-source approximations apply only where documented. Finite recording disks are averaged deterministically. The reuse of Cortex's conductor infrastructure follows [Holt and Koch (1999)](https://doi.org/10.1023/A:1008832702585) and [Lindén et al. (2014)](https://doi.org/10.3389/fninf.2013.00041). A finite-contact correction is not a finite-element tissue/electrode model. Near-source regularization and contact overlap restrictions must be documented rather than interpreted as resolved nanometer-scale physics.

The neural signal, applied stimulus artifact, and their sum must remain distinguishable. Membrane voltage is never plotted as extracellular voltage. Apparent attenuation from geometric cancellation can be non-monotonic for a complete neuron; the analytic inverse-distance test therefore uses a controlled single source. Conductivity inverse scaling is tested on the same stored source currents, since rerunning a field-stimulated neuron at a new conductivity can change the neural source itself.

## Exploratory growth module

Growth has a separate clock and does not run at the millisecond playback rate. A persistent-direction, target-attraction, seeded stochastic steering and branching model extends neurites within a cylindrical scaffold. [Marinov et al. (2020)](https://doi.org/10.3233/ISB-180172) provide a relevant computational precedent, but this implementation does not claim to reproduce their concentration-based growth model or its calibration.

The elongation rate is user-editable and labeled exploratory, with the measured culture values above shown only as context. Branch frequency, directional noise, attraction strength, target encounter radius, maturation delay, and synapse probability are uncertain inputs, not measured universal constants. A geometric encounter is recorded separately from a candidate matured synapse. An explicit user action can transfer the number of unique candidate target regions into pending electrical connectivity settings. That mapping transfers a count, not candidate identities, grown trajectories, or individual synaptic weights; postsynaptic activation still requires an electrical solve. Growth is not a predictor of graft survival, remyelination, immunity, or circuit repair.

## Validation plan and declared targets

The following targets are declared for the foundational release. The resulting machine-readable report must list actual values, configuration, units, acceptance limits, and pass/fail status. A failed target is retained; resolution means improving the implementation or narrowing its published validity, not silently widening a tolerance.

| Check | Target and rationale |
| --- | --- |
| Rest and zero input | No spikes; settled rest drift ≤0.1 mV in the recorded interval. Distinguish initialization equilibration from spontaneous activity. |
| Action potential threshold | A subthreshold and a suprathreshold case separate without manually triggered spikes; voltage and gate states remain finite. |
| Propagation | Proximal then distal upward crossings occur in causal order with positive delay. Longer axons increase travel time under matched conditions. |
| Synaptic transmission | Presynaptic terminal event precedes conductance onset by the configured delay; host activation is conditional on conductance and excitability. |
| Disconnection | Zero connection strength produces zero transferred synaptic current/events. A default disconnected host must not spike from the distant stimulus. Direct host field effects, if present under other positions, must be labeled separately. |
| Stimulation polarity | Inverting current inverts the imposed field; membrane responses are recalculated. Do not assume every morphology favors cathodic current. |
| Amplitude response | Increasing current produces a measurable field change and a threshold bracket for the chosen geometry. Strong-stimulus block or nonlinear changes are not forbidden. |
| Distance | Analytic point-source potential obeys 1/r. Full-cell recording comparisons retain source cancellation and report geometry. |
| Conductivity | Fixed-source forward potentials obey 1/sigma to numerical precision; avoid conflating this with a changed field-stimulation response. |
| Temporal refinement | Compare dt, dt/2, dt/4 on a common sample grid. Target membrane RMS difference ≤1 mV and spike-time shift ≤0.1 ms between production and refined settings. |
| Spatial refinement | Refine electrical segments without changing physical geometry. Target conduction-delay change ≤5% and remote contact peak-to-peak change ≤10%; report near-contact behavior separately. |
| Current balance | Sum of transmembrane sources matches specified intracellular injected current to solver roundoff/scaled numerical tolerance. |
| Determinism | Identical model version, normalized settings, and seed reproduce arrays/events exactly in the same runtime. |
| Export integrity | Settings round-trip; CSV row count, time monotonicity, units, finite values, and representative samples agree with displayed state. |
| Independent reference | Where NEURON is available, compare matching HH geometry and stimulus independently. Target ≤1 mV membrane RMS and ≤0.1 ms spike-time disagreement. Record version, method, exact scope, and any skipped comparison. |

Near-threshold comparisons require special care: a tiny numerical perturbation can change spike count. Report the threshold bracket as well as waveform errors. Do not move a test far above threshold and imply the original threshold discrepancy disappeared.

Implementation evidence is recorded separately in `numerical-validation.json` and `neuron-validation.json`. The temporal study compares the predeclared three levels: 0.005, 0.0025, and 0.00125 ms. The spatial study includes 25, 12.5, and 6.25 µm. Observed differences between discrete solutions are reported without treating them as exact-solution errors or proof of asymptotic convergence order. Native agreement at matched time steps verifies software equivalence for the defined model, not biological calibration.

Software checks also cover worker messages/cancellation, parameter bounds, all experiment presets, fallback view, replay/scrubbing, responsive layout, clipping/selection, and both theme colors. A successful build establishes packaging only. A live deployment is declared only after checking the published laboratory and methods route.

## Deliberate limits and next scientific steps

The initial tissue is sparse and synthetic; it does not represent the thousands of cells in an experimental aggregate. There is no myelin, metabolic support, oxygen transport, detailed extracellular microstructure, immune cell population, electrode electrochemistry, thermal model, injury mechanics, or chronic remodeling law. Simulated recruitment is a property of these specified equations and connections, not a clinical success probability.

Expansion should retain the benchmark and add independently tested cultured cortical or human cell models; measured scaffold conductivities and interface boundaries; experimentally constrained synaptic kinetics and connectivity; larger population recruitment; and growth data with held-out quantitative validation. Each addition needs a new evidence record and comparison before receiving a predictive label.
