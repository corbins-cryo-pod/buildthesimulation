# Numerical contract and scientific scope

## 1. Cell and circuit

The numerical cell is Allen specimen 571654895 from Mosher, Wei et al. (2020), middle temporal gyrus, source commit `750e7840cc1a9eb32492c924e79609a85a893b8a`. It is a fitted human layer-2 spiny neuron, not a universal human-neuron model. The original source includes mixed-species channel kinetics; fitting membrane densities to human recordings does not make every kinetic measurement human-specific.

The recovered geometry asset includes 40 µm and 20 µm maximum-length meshes. They contain 211 and 369 membrane-bearing compartments respectively, with 75 shared zero-area junctions each. The original model preprocessing prescribed two 30 µm × 1 µm active axon sections. This synthetic 60 µm stub is not the specimen's complete biological axon.

Physical units are µm, µm², ms, mV, nA, µS, nF, and S/cm² as named in each field. Surface conductance converts by `g_us = density_S_cm2 * area_um2 * 0.01`. Membrane capacitance converts by `C_nF = Cm_uF_cm2 * area_um2 * 1e-5`. Zero-area junctions contribute axial connectivity only.

The native model initializes at −80 mV and conditions in darkness for 100 ms at fixed 34 °C. The current default conditioned soma is −92.263908 mV and continues to drift. This is not a claim that the source's observed resting voltage has been reproduced. The native NaV/Ih/Im/K_Pst/K_Tst/Kv3_1/Ca_HVA/Ca_LVA/SK channels, leak, calcium dynamics, and section parameters are retained. No global temperature slider is supplied.

The native cable solve is backward Euler with old-state conductances, followed by native state updates at new voltage. Calcium dynamics retain the inherited old-voltage current convention and precede the SK update. The scalar-gate and sodium Markov equations are in `vendor/cortex/`. A photocurrent tangent and offset are inserted into the same voltage matrix. For current `I(V)`, the inserted terms are `a=dI/dV`, `b=I(V_old)-a*V_old`; positive current is outward, and the voltage equation subtracts `b` from the RHS. Local KCL is measured with the discrete current used in that matrix. The saved photocurrent uses the nonlinear model at saved voltage and opsin state. Its maximum discrepancy from the tangent current is separately reported.

## 2. ChR2(H134R)

The five stored variables are `(C1,O1,O2,C2,p)` with `C1+O1+O2+C2=1`. `p` is the activation variable, not another Markov occupancy. The two conducting states have conductance ratio γ=0.1. Rates are in ms⁻¹.

At 22 °C:

```
Gd1 = 0.075 + 0.043 tanh(-(V+20)/20)
Gd2 = 0.05
Gr = 0.0000434587 exp(-0.0211539274 V)
e12_dark = 0.011
e21_dark = 0.008
epsilon1 = 0.8535
epsilon2 = 0.14
```

Apply Q10 values 1.97, 1.77, 2.56, 1.1, 1.95, 1.46, and 2.77 to those seven parameters respectively, with exponent `(T-22)/10`. Then:

```
e12 = e12_dark + 0.005 log(1 + E/0.024)
e21 = e21_dark + 0.004 log(1 + E/0.024)
F = E * (470e-9 * 12e-20)/(1.986446e-25 * 1.3)
S0 = 0.5[1+tanh(120(100E-0.1))]
dp/dt = (S0-p)/1.3
```

The occupancy system is:

```
dO1/dt = epsilon1*F*p*C1 - (Gd1+e12)*O1 + e21*O2
dO2/dt = epsilon2*F*p*C2 + e12*O1 - (Gd2+e21)*O2
dC1/dt = -epsilon1*F*p*C1 + Gd1*O1 + Gr*C2
dC2/dt = Gd2*O2 - (epsilon2*F*p+Gr)*C2
```

For frozen voltage/exposure during a timestep, the activation update is exact; the occupancy system uses a stochastic uniformization series with midpoint activation. The independent SciPy reference instead integrates the full continuous ODE with adaptive DOP853 and restarts at pulse edges. These are genuinely different numerical paths, but they share published model equations and coefficients. They do not provide new experimental data.

The current in nA is:

```
I = gbar_uS * (O1 + 0.1 O2) * [10.6408 - 14.6408 exp(V/-42.7671)]
```

This is the source current–voltage expression with its `V` denominator analytically cancelled for the published zero-reversal form. It is finite at V=0 and is not forced to have an exact zero there. The original fit is retained rather than silently corrected. Its use for voltages outside approximately −80 to −10 mV is extrapolation. Typical illumination characterization was 0.34–5.5 mW/mm²; the importer permits a wider numerical domain but that does not widen the empirical validation range. A 0.1 ms pulse may be numerically resolved without being biologically accurate.

Source: Williams et al. (2013), https://doi.org/10.1371/journal.pcbi.1003220 ; equation cross-check: https://github.com/ModelDBRepository/244414/blob/master/ChR2H134R.mod . No third-party implementation is used by the new Python ODE reference.

## 3. Optical field

The fixed source is a 100 µm core, NA 0.22, 470 nm fiber embedded in homogeneous bulk tissue. The archived kernel uses μa=0.4008375827/mm, μs=25.44786278/mm, g=0.9, and refractive index 1.36. It stores cylindrical scalar-fluence-rate voxels of 25 µm radial and axial spacing: radial extent [0,3) mm and axial extent [−2,4) mm. Two archived 500,000-photon seed runs were averaged. Their transport domain was larger than the stored field.

The normalized quantity is scalar fluence rate per emitted mW, with units mm⁻². Multiplication by source mW yields mW/mm². It is not directional irradiance at a plane. Sampling is bilinear in cylindrical voxel-center coordinates, clamped to the closest center within an edge half-voxel, and zero outside the stored field. The number of membrane compartments outside the stored kernel is disclosed. Rotation/translation are rigid; rotation about the fiber axis has no effect because the field is azimuthally averaged.

The voxel absorption integral `sum(mu_a * Phi * voxel_volume)` is 0.98291545525 of launched power in the stored region. It need not equal one: absorption outside the stored volume is omitted. The archived full-transport balance and seed comparison are retained as historical metadata, not recomputed validation. The original photon generator and separate seed tallies are not in this recovered package. This is **not an MCX-generated or MCX-verified field**. Reproducible transport generation and comparison against an established solver remain required before a scientific optical release.

The UI field slice and electrical exposure call the same `lightAt()` function. Electrical exposure is sampled at compartment centers, not integrated over curved membrane surface; mesh refinement is therefore relevant to illumination as well as cable conduction. Uniform mode supplies prescribed local exposure and has no defined emitted optical power or total source energy.

Time integral: mW/mm² × ms = µJ/mm². For the fiber only, mW × ms = µJ of emitted optical energy. Neither quantity is a tissue-temperature estimate. The Williams loss factor 1.3 is retained when using tissue fluence. Transferring that calibration factor and scalar fluence to a channel originally characterized with irradiance is an explicit, uncalibrated coupling assumption.

Optical-property reference: OptogenSIM, https://doi.org/10.1364/BOE.6.004859 . No separate optical source geometry, tissue surface, blood vessels, implanted material boundary, or thermal solver is implied.

## 4. Protocol, events, and records

Intervals are half-open `[onset, offset)`. All integration steps split exactly at pulse boundaries and saved-output boundaries, including fractional-millisecond inputs. A train contains only complete pulses inside its epoch. The complete protocol must fit in the record; pulse width cannot exceed its period.

Spikes are upward soma crossings of −25 mV, linearly interpolated at integration resolution, with a 2 ms event refractory interval. They are a numerical event criterion, not proof of axonal recruitment or transmitter release.

Train association windows are `[onset, min(onset+20 ms,next onset,record end))`. The first event is matched. A pulse with exactly one event is counted separately from a pulse with at least one. Subsequent events in the window and events outside windows are reported as extras. This is temporal association, not proof that light caused each spike. Deterministic trials report following, not spike probability.

Response maps instead count all soma events after the single pulse onset until record end. This distinction is retained in the map contract and exports. Every point retains its computed compartment trace. The dark state can be cached only for an identical model/mesh/timestep/conditioning configuration; illuminated end states are not reused as new-trial initial conditions.

Replay stores voltage, current, and opening at 0.25 ms by default; event detection occurs at the smaller integration step. Sharp spikes can therefore peak between display samples. Time, soma voltage, total current, and scalar diagnostic outputs retain double precision; per-compartment replay arrays use float32. JSON records the layout and all configurations.

## 5. Verification scope

See `REVIEW.md` for current checks. The independent channel integrator covers state/current dynamics at fixed voltage. The independent cable test assembles and solves a frozen-conductance matrix; it does not independently generate the native channel gates. Independent full combined NEURON + ChR2 + optical transport comparisons and experimental validation remain unfinished.

Sources for the cell: https://github.com/AllenInstitute/Human_all_active_models_EAP at commit `750e7840cc1a9eb32492c924e79609a85a893b8a`; Mosher, Wei et al., https://doi.org/10.1016/j.celrep.2020.02.027 . Source-asset hashes embedded in the recovered model are preserved, not falsely presented as newly downloaded SWC/NMODL verification.
