# Biohybrid Laboratory — second-stage scientific architecture

Reviewed 2026-10-23. Companion to the [34-question scientific register](STAGE2_QUESTIONS_AND_ANSWERS.md). This document specifies the model and interpretation contract. Test outcomes, discrepancies, source identities and deployment status are recorded separately in the release evidence.

## Scientific objective

Determine whether a host response depends on the assigned graft-to-host synapses, distinguish the electrical sources seen by the recording contacts, and measure sensitivity to controlled parameter changes. The first release's canonical Hodgkin–Huxley 6.3 °C cable model remains the reproducible numerical benchmark. The added experiment layer does not relabel its morphology or channel parameters as a calibrated cortical graft.

The immediate scientific advance is the ability to test an explanation of a waveform. A nonzero receiving-contact signal, an appropriately colored axon, and an ordered sequence of spikes are individually insufficient to establish exclusive synaptic mediation. The experiment layer adds explicit interventions and source accounting so users can examine those alternatives.

## 1. Model identity and preservation

The physical calculation retains active branched cables, explicit axial conductance, the existing gate/voltage update order, terminal-triggered conductance synapses, and the homogeneous finite-contact volume conductor. Source partitions and protocol summaries are observational additions. They must preserve the first release's membrane voltages, event sequence, neural total, artifact and ideal total to the established regression precision.

Numerical model identity, observation identity and protocol schema identity are separate concepts. A versioned protocol records the normalized base settings and all calculated cases. If a later change alters the physical equations or numerical update order, it requires numerical revalidation rather than only a new user-interface label.

## 2. Matched causal audit

The audit calculates three runs:

| Condition | Sole intervention | Purpose |
| --- | --- | --- |
| Intact | None | Calculate the selected experiment. |
| Synapses off | Set host–graft synaptic conductance to zero | Test whether host somatic activity requires the assigned synapses under this configuration. |
| Zero stimulus | Set the stimulating contact current to zero | Check monitored spontaneous activity and numerical baseline behavior. |

Geometry, channel properties, sampling, observation duration, contacts, conductivity and all remaining normalized settings stay matched. The synapses-off condition retains the field on both graft and host cells. It does not simulate a particular blocker, cell death, lesion or inflammatory response.

Classification is performed per host cell using soma spike detections over the stated observation window:

| Intact response | Synapses-off response | Interpretation |
| --- | --- | --- |
| Present | Absent | All detected somatic activity was lost under conductance removal; supports dependence on these modeled junctions for that cell. |
| Present | Present | Activity persists without the junctions. Exclusive synaptic mediation is not established; count and timing may still change. |
| Absent | Present | Activity appears after removal. The nonlinear response must remain visible and be inspected rather than forced into a monotone explanation. |
| Absent | Absent | Neither condition produced a detected host soma spike in the observation window. |

Recruitment is a count of unique host soma identities. It is not a success probability, cell-survival estimate or count of individual synaptic events. The zero-stimulus quiet flag means that no event was detected at the monitored soma/terminal sites. Subthreshold membrane currents can remain without spikes.

The comparator checks that only the declared synaptic parameter differs. A missing or failed numerical run cannot produce a successful causal classification. Causal language remains restricted to the defined model and its specific initial conditions and inputs.

### Signed timing summaries and mixed activation

The retained summary fields describe first upward 0 mV crossings, with exact monitor identities:

| Retained field | Defined quantity | Interpretation limit |
| --- | --- | --- |
| `conductionDelayMs` | First engineered-1 tip crossing minus first engineered-1 soma crossing | Signed first-crossing difference; it does not automatically match one propagating wavefront. |
| `relayDelayMs` | Earliest host soma crossing minus first engineered-1 soma crossing | Signed first-crossing difference; the host can receive another graft's input or be activated directly. |
| `conductionVelocityMPerS` | Engineered-1 monitored path length divided by a positive `conductionDelayMs`; otherwise null | Conditional apparent velocity. A physical conduction interpretation additionally requires matched propagation. |

The keys remain compatible with the foundational export, but user-facing labels must describe these signed differences. A negative value means the distal monitor or host crossed before the reference soma. It is not a negative physical travel time, and taking an absolute value would erase information about activation order. A positive difference also does not establish a causal relay by itself. Missing monitor events produce unavailable differences, not a zero value.

A reproduced mixed-activation example uses the default model with `axonLengthUm: 300`, `stimXUm: 300`, `stimAmplitudeUa: -30`, `pulseCount: 1`, and `durationMs: 25`. Engineered-1 tip crosses at **5.906975824913949 ms**, host-2 soma at **6.174653403903345 ms**, and engineered-1 soma at **6.888537880693696 ms**. The retained differences are therefore **−0.9815620557797473 ms** and **−0.7138844767903514 ms**, and the velocity field is **null**. These calculated events demonstrate why the displayed quantities need signed first-crossing labels. They do not uniquely establish the direction or initiation site of every wavefront.

For a physical propagation measurement, identify the same traveling event at specified proximal/distal monitors in a specified direction. A per-pulse synaptic relay latency additionally needs a defined presynaptic event, local synaptic arrival, postsynaptic event and evidence from the matched intervention. The present summary fields do not perform that additional matching.

## 3. Source-resolved extracellular recording

For contact k and source compartment i, let L[k,i] be the existing finite-contact transfer coefficient and I_m[i,t] the outward total membrane current. Partition the same current vector by anatomical population:

```text
V_graft[k,t] = sum over graft compartments of L[k,i] I_m[i,t]
V_host[k,t]  = sum over host compartments of L[k,i] I_m[i,t]
V_neural[k,t] = V_graft[k,t] + V_host[k,t]
V_total[k,t]  = V_neural[k,t] + V_applied[k,t]
```

Massless electrical junctions are not membrane sources. Source sums use the same current sign, reference convention and spatial coefficients as the original neural recording. They do not change the neuronal dynamics or feed the generated neural field back into the cable equations.

This identity is a consequence of the assumed linear conductor, not an experimental source-separation algorithm. A real electrode measures a combined signal; it does not provide the simulator's population labels. Likewise, the difference between intact and synapses-off recordings is not interchangeable with a source partition, because the intervention changes host dynamics.

The sample-wise components add. Their peak-to-peak amplitudes generally do not, because extrema can occur at different times and source fields can cancel. A host-source waveform can also represent field-induced or synaptic subthreshold currents rather than host spikes.

## 4. Controlled parameter sweeps

The initial workbench varies one parameter at a time:

| Parameter | Units | Main interpretation |
| --- | --- | --- |
| Signed first-phase current | µA | Conditional stimulus response and recruitment. |
| Each assigned host–graft connection's conductance | µS | Postsynaptic recruitment conditional on the fixed wiring and stimulus. |
| Recording contact height | µm | Ideal readout changes while electrical activity is unchanged. Height is a coordinate, not every contact's shortest membrane separation. |
| Shared axon diameter | µm | Changes graft trunks and host axons; graft terminal branches use 0.8 times this diameter. Recruitment or recording changes cannot be assigned exclusively to graft-trunk caliber. |
| Tissue conductivity | S/m | Combined changes in the applied field, cell response and recording transfer. |

Each sweep uses an ordered list of two to seven distinct values. Paired synapses-off controls can be requested. A full no-stimulus audit is a separate three-run protocol rather than an implied control at every sweep point. All settings, outcomes, failures and units are retained.

Response summaries describe the recruited-host **count in the supplied sample order**. Descending negative currents therefore need no relabeling or sign inversion. A constant total count does not imply that the same host identities responded. Per-host results remain available.

Only adjacent successful samples can bracket a measured change. A failed intermediate case breaks that bracket. All-negative or all-positive responses provide no observed transition in the tested interval. The workbench does not invent an interpolated threshold, extrapolate beyond the range, or assume global monotonicity. A nonmonotone sampled response is a valid possible result and remains visible.

The calculation uses a bounded worker workload, preserving solver time step and mesh rather than automatically coarsening them. Protocols that exceed the explicit workload limits are rejected with a useful explanation. Source movies are not retained for every sweep condition when the exported summary suffices. Cancellation and superseded requests cannot overwrite newer results.

## 5. Ideal-source dose accounting

For a rectangular current phase:

```text
signed first-phase charge [nC] = current [µA] × phase duration [ms]
absolute phase charge [nC] = |signed first-phase charge|
geometric disk area [µm²] = π radius²
nominal phase density [µC/cm²] = absolute phase charge [nC] × 10⁵ / area [µm²]
total absolute train charge [nC] = 2 × absolute phase charge × pulse count
```

The ideal equal-opposite biphasic waveform has zero net charge when fully included in the observation window. The delivered waveform is integrated across fractional solver intervals so charge accounting does not depend on a phase boundary falling exactly on the time grid.

Geometric charge density is an arithmetic description of the ideal disk. There is no modeled electrode polarization, electrochemical surface area, thermal injury or chronic exposure response. No universal safe/unsafe threshold is attached to these quantities. They are not clinical or device operating recommendations.

## 6. Verification contract

The analysis layer is checked separately from the underlying engine. Required evidence includes:

- Original membrane/event/full-recording benchmarks remain unchanged.
- Every saved contact sample reconstructs from its source components to numerical precision.
- The default matched audit loses host recruitment when synaptic conductance is removed, while graft behavior remains unchanged.
- A deliberately direct-stimulation configuration retains host firing with synapses removed. This prevents the classifier from treating every host response as a successful bridge.
- A distal-stimulation mixed-activation configuration retains negative first-crossing differences and an unavailable velocity. These values are checked against the stored spike times and are not relabeled as negative physical conduction times.
- A disconnected condition preserves distant graft signal and small nonspiking host-current contributions.
- Sampled response transitions, constant responses, nonmonotonicity, failed gaps and per-host identities are retained correctly.
- A passive recording-position change leaves membrane voltages and spike events unchanged.
- Phase charge, nominal density and radius-squared scaling pass analytical unit checks.
- Settings, source components, protocol outcomes and failed cases survive export without hidden non-finite values or fabricated zeros.
- Worker progress/cancellation, changed settings and stale messages cannot mix result generations.
- Selected response boundaries are examined at finer time steps rather than assuming the existing suprathreshold convergence study covers every transition.

Verification must preserve unsuccessful diagnostics. In particular, reconstructing membrane currents from the saved Float32 replay voltages is a different precision problem from using the original Float64 source currents. Small differences between adjacent compartment voltages can amplify rounding when multiplied by axial conductance. An analytical bound can propagate each voltage's half-ULP through the axial-current and recording operators. Passing that storage-precision consistency check does not retroactively pass a stricter absolute-error diagnostic that failed. Both observations belong in the report.

## 7. Scientific and release boundaries

Growth remains a separate exploratory model on a days-long timescale. Target contact, candidate maturation and actual electrical recruitment remain distinct. Chronic degradation remains an explicit parameter perturbation, not a prediction of months after implantation. No new claim about learning, graft survival, human efficacy, integrated-device bandwidth or mammalian calibration follows from the protocol workbench.

The public question page, Methods page and repository report should make these distinctions easy to find. A successful build validates packaging; it does not replace numerical, browser or live-deployment verification. Direct WebGL operation and browser file saving must be reported as tested or unverified based on actual observations, independently of the tested 2D fallback and export serialization.

## Supporting sources

- [Histed, Bonin & Reid (2009)](https://doi.org/10.1016/j.neuron.2009.07.016): primary evidence that electrical microstimulation can directly activate cortical neurons through nearby neural processes; motivates the direct-response control.
- [Boinagrov, Loudin & Palanker (2010)](https://doi.org/10.1152/jn.00343.2010): extracellular strength–duration modeling; motivates calculating the response rather than imposing a universal fit.
- [Boinagrov et al. (2012)](https://doi.org/10.1152/jn.01058.2011): upper stimulation thresholds in a retinal preparation; motivates preserving nonmonotone responses without importing its thresholds into the bridge.
- [Lindén et al. (2014)](https://doi.org/10.3389/fninf.2013.00041): linear membrane-current forward models and finite-contact averaging.
- [Shannon (1992)](https://doi.org/10.1109/10.126616): an empirical safety model with a specific evidence domain; not a universal safety certification for this laboratory.
- [Foundational architecture](SCIENTIFIC_ARCHITECTURE.md), [growth scope](GROWTH_MODEL.md), and [retained validation history](VALIDATION_HISTORY.md): existing equations, biological limitations and quantitative checks.
