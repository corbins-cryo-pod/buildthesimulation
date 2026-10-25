# Expanded Optogenetics Laboratory — model specification

Review edition **opto-lab/0.3.0**, 25 October 2026. This specification describes executable additions in `src/advanced/`, not a claim of experimental validation. All light patterns, ion currents, voltage recordings and heat fields shown after Calculate are computed. Display geometry never substitutes for a solver.

## 1. Preserved neuron and new coupling

The bundled Allen/Mosher–Wei human model is specimen 571654895, with its published fitted active channels and source-prescribed 60 µm synthetic axon stub. Both the 40 µm and 20 µm meshes are retained. The 40 µm mesh has 211 membrane-bearing compartments and 75 shared, zero-area junction nodes. Cell copies retain membrane area, native axial conductance, channel density and topology under rigid transformations. They are not different reconstructed neurons or statistically sampled cell types.

The native cable mechanisms stay at **34 °C**, with 100 ms dark/no-drive conditioning. Each cell is solved independently. Current drive is a specified somatic injection, not a synaptic network. Voltage is advanced using the original implicit Hines tree solver, with the opsin current included in the matrix. An outward-current convention is used throughout. Somatic events are upward crossings of −25 mV with a 2 ms detection refractory interval; these are numerical event definitions, not proof of recruitment of a full biological axon.

The Williams H134R current uses the original nonlinear current–voltage expression and tangent linearization. The reduced cation models use `I = gbar * O * V`. The anion model uses `I = gbar * O * (V − ECl)`. Native ionic currents are evaluated using the inherited solver's old-state/new-voltage convention. Chloride loading is driven by the actual solve-consistent anion current, not by a different display-only current. Channel states are then advanced and final-state currents saved. Local current-balance checks sample the solved circuit.

The original 40→20 µm convergence limitation remains: a retained single-pulse benchmark shifted the event by approximately 0.22 ms and changed the somatic waveform. New-model timestep checks do not remove that spatial limitation.

## 2. Opsin library: evidence tiers matter

| Option | Implemented kinetics | Evidence boundary |
|---|---|---|
| ChR2(H134R) | Original Williams four-state model plus activation variable, voltage dependence and mechanism-specific temperature factors | Source-equation port at 470 nm. No experimental validation of this expression level or optical response in the bundled human cell. |
| Chronos-like | Three-state light-dependent opening, closing, desensitization and recovery | **Reduced exploratory surrogate**, not a reproduction of a published fitted photocycle. |
| ChrimsonR-like | Same reduced structure, red-centered spectrum with blue shoulder | **All quantitative parameters are explicit design assumptions.** Not a calibrated ChrimsonR model. |
| GtACR2-like chloride | Reduced three-state opening with chloride reversal and optional concentration dynamics | **Reduced exploratory surrogate.** Soma targeting is an expression distribution, not a different ion mechanism or experimentally fitted stGtACR2 clone. |

The reduced photocycle is C → O → D → C, with O → C closing. For local action-weighted exposure E, let q = E/(E + Ehalf). Rates, in ms⁻¹, are a = q/τon, b = 1/τoff, d = q/τdes and r = 1/τrec:

```
dC/dt = -a C + b O + r D
dO/dt =  a C - (b + d) O
dD/dt =  d O - r D
```

A Poisson uniformization step preserves positivity and total occupancy for the frozen generator without silently clipping state variables. It is independently checked against SciPy's matrix exponential. τon is an opening-rate parameter; the complete transient also depends on closing and desensitization, so its effective fitted onset time is not necessarily τon.

| Surrogate | τon ms | τoff ms | Ehalf mW/mm² | τdes ms | τrec ms | Spectral center/width nm |
|---|---:|---:|---:|---:|---:|---|
| Chronos-like | 2.3 | 3.6 | 0.3 | 100 | 500 | 500 / 40 |
| ChrimsonR-like | 4 | 16 | 0.5 | 200 | 1000 | 590 / 45, blue shoulder 0.22 at 470 / 35 |
| GtACR2-like | 1 | 40 | 0.1 | 500 | 1500 | 470 / 32 |

Chronos on/off timescales are literature-motivated; the anion 40 ms off timescale is literature-motivated. These are not new fits. The other reduced rate constants, half-exposures, spectra, temperature transfer and expression levels are assumptions. Reduced rates have **no temperature extrapolation**. ChR2's added off-peak Gaussian width of 35 nm is also an assumption. The interface exposes reduced rates explicitly.

Spectral response is a normalized Gaussian (plus the assumed blue shoulder for ChrimsonR-like). Each source contribution is weighted separately by its action spectrum and λ/λpeak for relative photon energy. This supports mixed-color cross-activation as a **hypothesis model**, not quantitative color-selectivity validation. The same bulk optical attenuation coefficients currently apply to every emitter wavelength; wavelength-dependent tissue properties are not inferred.

The original Williams fit was characterized at about −80 to −10 mV and 0.34–5.5 mW/mm². This model's resting/AP voltages and some LED-adjacent sites extrapolate those ranges. Above-range expressing-site counts are exported. The retained 1.3 photon-loss factor in Williams is not recalibrated against the tissue field.

## 3. Chloride gradients, flux and recovery

At fixed 34 °C:

```
ECl [mV] = -1000 R T / F * ln(Cl_out / Cl_in)
dCl_in/dt [mM/ms] = I_Cl,outward[nA] * 1e6 / (F * volume[µm³])
                    - (Cl_in - Cl_setpoint) / τrecovery[ms]
```

F = 96485.33212 C/mol and R = 8.314462618 J/(mol·K). Positive outward conventional chloride current corresponds to inward anion flux and increases intracellular chloride. At 130 mM extracellular chloride, 5 mM intracellular gives approximately −86.24 mV; 30 mM gives approximately −38.81 mV. Therefore the same channel can oppose depolarization or provide depolarizing current depending on voltage and the gradient. There is no hard-coded silencing instruction.

The recovery term is an adjustable linear homeostasis surrogate, **not a KCC2/NKCC1 transporter model**. Its constant-current step has an exact exponential solution. Fixed mode represents a concentration reservoir. Somatic and synthetic-axon initial chloride are independently configurable. Dendrites use the somatic initial value. Each membrane compartment has its own well-mixed pool; axial chloride diffusion, bicarbonate permeability, extracellular depletion, osmotic volume changes and electroneutrality constraints are omitted.

Somatic volume is the equivalent-area sphere used in the existing rendering/electrical convention. Dendritic volumes sum frusta along retained tapered polylines; an accessible-volume fraction is explicit. Changing this convention affects concentration loading and is not donor-specific volume validation. A pool leaving 0.01–300 mM throws an error rather than being clipped.

Expression can be whole-cell, soma, apical, basal, dendritic or axonal. The additional soma-targeted profile sets axon expression to zero and uses an assumed exp(−distance/50 µm) dendritic taper. It is not measured molecular localization. The optional matched dark trial uses identical cell, drive, initialization and parameters but zero optical activation. Reduction compares event counts inside illuminated windows; negative values mean more events in the illuminated trial. Whole-recording events are also retained to expose pre/post-light activity. This is temporal comparison, not a causal network assay.

## 4. Finite microLED optics

Each rectangular emitter has an explicit position, unit normal, in-plane rotation, width, height, wavelength, optical output and wall-plug efficiency. The 22 × 22 µm / 6.5% default is an **assumed generic device**, not an exact replica of a fabricated probe. All emitters share the chosen pulse waveform; per-emitter enable, output and color are independent. There is no independent per-emitter timing sequencer yet.

The homogeneous direct-light model uses the exact solid angle Ω of a uniformly radiating rectangle:

```
L = Popt / (π A)
Φ(point) = L Ω(point) exp[-(µa + µloss) distance]
```

Φ is **scalar fluence rate**, not irradiance onto an arbitrarily oriented detector plane. The finite face removes point-source near-field divergence. Emission is one-sided. Powers superpose. Physical exposure and action-weighted exposure are separately retained. The light slice, compartment exposure and heat absorption sample the same optical function.

µloss is an empirical extra loss coefficient. Scattered photons are not recovered as a diffuse field. There are no refractive interfaces, tissue layers, blood vessels, shadowing, implant opacity or measured LED angular distributions. This is **not MCX or a radiative-transfer solution**. The existing fiber kernel remains a separate 470 nm, 100 µm core, NA 0.22 model; its original generator was not recovered, so it is not accepted as an energy-certified heat source in this extension.

## 5. Heat calculation and accounting

A 3-D finite-difference homogeneous Pennes-style equation is integrated for temperature rise θ:

```
ρ c ∂θ/∂t = k ∇²θ − ρ c β θ + Qopt + Qdevice
Qopt = µa Φ
Pdevice_loss = Popt (1/η − 1)
```

Geometry is converted from µm to m; mW/mm² × mm⁻¹ is multiplied by 10⁶ to obtain W/m³. Popt in mW times on-time in ms is emitted energy in µJ. Electrical and optical power are not conflated. A user-supplied fraction of device losses is deposited by conservative trilinear weights into surrounding tissue voxels. It is not a simulation of the chip's thermal stack.

Defaults are k = 0.6 W/(m·K), ρ = 1057 kg/m³, c = 3600 J/(kg·K), β = 0.008 s⁻¹. These are declared bulk assumptions, not a fitted preparation. The grid has a fixed-zero temperature-rise outer boundary. The integrator splits pulse edges and samples, and substeps below its explicit positivity/stability limit. It reports input energy, stored heat, boundary removal, perfusion removal, and the residual. Outside-domain compartment temperatures are missing values, **not zero**. Heat sources touching the outer boundary are rejected.

**Heating is one-way diagnostic only.** It does not change the 34 °C neuron channels, opsin rates, chloride reversal, or firing. The opsin-negative heat example does not claim to reproduce heat-induced neuronal activity.

**Hotspots are unresolved.** For the retained microLED demo, the maximum rose from 0.557 °C at 80 µm spacing to 0.977 °C at 60 µm and 1.012 °C at 48 µm, at a constant 1.92 mm domain width. The source representation changes with voxel refinement. The soma maximum also changed, approximately 0.137→0.174 °C. Halving the time step at 80 µm changed the maximum to 0.552 °C. A larger domain at fixed spacing left that short-protocol maximum essentially unchanged. Energy conservation does not validate hotspot accuracy. No junction temperature, encapsulation conduction, tissue damage, safety threshold, temperature dose or in vivo prediction is established.

## 6. Populations and imports

One to eight independent copies use exact compartmental solves, including cell-specific expression factors and optional opsin identity. Layouts are seeded lines or clouds; rigid rotations and positions can be specified in JSON. No synapses, ephaptic coupling, tissue displacement, collision handling or specimen diversity are inferred. The first-stage population is a selectivity comparison, not a neural circuit model.

The importer accepts versioned experimental configurations, explicit `bts-opto-device/1` optoelectrodes, actual Designer v1 contacts, and `microfabrication-1` run metadata. See IMPORT_CONTRACT.md. Designer electrodes are not LEDs until a selected-site conversion is confirmed. Cleanroom recipes are **provenance only**: material names and process outcomes do not magically define optical efficiency or heat conduction.

## 7. Scientific sources and what they support

- Williams et al. (2013), Computational Optogenetics. https://doi.org/10.1371/journal.pcbi.1003220 — original H134R kinetic/current equations.
- Mosher, Wei et al. (2020). https://doi.org/10.1016/j.celrep.2020.02.027 — fitted human active neuron source, not validation of the combined optogenetic extension.
- Klapoetke et al. (2014). https://doi.org/10.1038/nmeth.2836 — Chronos/Chrimson spectral and kinetic context; not a fit of these reduced code models.
- Chronos modeling context (2018). https://doi.org/10.1117/1.NPh.5.2.025009 — reported fast kinetic timescales.
- Mahn et al. (2018). https://doi.org/10.1038/s41467-018-06511-8 — soma targeting and axonal excitation caveats.
- Messier et al. (2018). https://doi.org/10.7554/eLife.38506 — chloride-gradient-dependent compartmental effects.
- Govorunova et al. (2018). https://pmc.ncbi.nlm.nih.gov/articles/PMC6051594/ — anion-channel kinetic context.
- Reddy et al. (2019). https://doi.org/10.3389/fnins.2019.00745 — finite microLED optical/thermal source context; its device-layer model is not reproduced here.
- Stujenske et al. (2015). https://doi.org/10.1016/j.celrep.2015.06.036 — optical deposition and tissue heating context; no claim this build reproduces heat-induced neural effects.

No new experimental data fit, MCX run, native NEURON comparison of the new chloride model, COMSOL reconstruction, or physical device calibration was performed in this stage.
