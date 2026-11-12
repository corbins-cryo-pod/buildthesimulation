# Stage 2 — modalities and selectivity: component increment 0.1.0

## Release boundary

This is **not the completed Stage 2 release**. It implements and tests separable components while leaving the pinned Stage 1 electrode implementation untouched. No new magnetic or optical axon-recruitment result is reported. The public-facing bench repeatedly identifies this boundary; `completeStage2` and `releaseQualified` remain false.

The task's next stage is to compare microelectrode, microcoil and optical addressing through the same engineered bipolar neurons. This increment supplies component equations, diagnostics and table analysis. It does not claim that independent component passes qualify the combined biological model.

Stage 1 source baseline: `90ff2502aec6a01f3b3a6c91bf28a6f848d8285a`, PR389, `feature/axon-resolution-stage1`. At the time of this work the PR is open and unmerged. The available GitHub connection was read-only. **No repository write or deployment was performed.**

## Implemented and unimplemented

| Component | Implemented here | Not established |
|---|---|---|
| Selectivity | Exact exclusive/shared membership; exact rank over the reals; deterministic isolated-input mutual information; retained adjacent-sample brackets | Original-host function, simultaneous pattern control, information rate or channel capacity |
| Microcoil | Explicit closed trace/via/bridge/return path; finite-segment A and B; primary induced E; along-cable gradient; DC resistance; estimated inductance; drive energy | Tissue-corrected production result, membrane recruitment, full electromagnetic loading, safety |
| Induction adapter | Conservative P1 tetrahedral weak load, correct units, path-potential adapter for the existing Stage 1 FEM | Production mesh assembly/run, field and cable refinement, reference NEURON comparisons |
| Light transport | Seeded Monte Carlo; finite cylindrical wall/endcap/aperture intersections; scattering, absorption, specular reflection; energy accounting and independent batches | Membrane-surface fluence, heterogeneous tissue, refractive boundaries, qualified rare-event crosstalk |
| Opsin | Four-state Williams H134R channel model plus activation lag; voltage-clamp current; temperature and voltage dependence | Active-neuron integration, propagation, matched optical silencing controls |
| Spectral analysis | Tabulated overlap, photon-energy weighting, refusal to extrapolate; clearly hypothetical 2–4 population examples | Measured named-opsin spectra, multiple opsin kinetics, independent extra channels |
| Energy | Joule loss, emitted light, electrical input and LED junction waste heat | Bioheat temperature, electrochemical/tissue safety, operating recommendation |

Growth, tissue survival, synapse formation and target reinnervation are outside this increment, as are the later full-census, chronic and feasibility stages.

## Selectivity and information

Given a binary table R[k,i] for one declared amplitude per isolated channel:

- Output i is exclusive when at least one row contains exactly that output.
- An output belongs to the shared-only tier when it appears in at least one row but no singleton row.
- The numerator of **tested coverage** counts unique exclusive identities, not singleton rows. Duplicate channels never duplicate identities.
- The optional dependence count requires loss in both supplied regional-block and whole-cell-block tables. Headlines require complete, passing source audit flags and correctly shaped controls. The flags are source claims; imports are not independently certified.
- Rank is computed with fraction-free BigInt elimination over the reals. It is not rank over GF(2). It describes this binary matrix and does not prove arbitrary commandability of nonlinear neurons.
- I(X;Y) is evaluated under a declared experiment: the input is off or one channel alone; the output is its retained deterministic activation pattern. Default probabilities are uniform over these inputs. Since H(Y|X)=0 in this particular deterministic table, I(X;Y)=H(Y). This is not a noise-robust communication-capacity estimate, nor bits per second.

The synthetic bench table is a software fixture, not generated neural evidence. It has two exclusive outputs, two shared-only outputs, real rank3 and 1.9219280949bit/trial for a uniform five-input protocol. The user can instead import a complete Stage 1 result. Its settings and identity ledger are preserved in the component result and export.

A finite amplitude sweep returns transitions only between adjacent valid samples. Failed conditions remain explicit unknown intervals. The API does not bridge an invalid point, interpolate a threshold or assume monotonicity. A table-only sweep does not run new neurons and cannot verify that its supplied cohort remained physically unchanged; that remains an obligation of the future experiment adapter.

## Magnetic field and winding

The coil is a finite, closed series path, not a magnetic dipole scaled to achieve firing. Each layer consists of an open circular trace; vias and short bridges connect successive layers. The final lead returns to the start outside the winding radius. Every source segment has a finite cross-sectional exclusion region. Sampling inside a conductor raises an error, rather than regularizing a stimulation field singularity.

For a line path C in free space:

    A(r)/I = (mu0/4pi) integral_C dl' / |r-r'|
    B(r)/I = (mu0/4pi) integral_C dl' × (r-r') / |r-r'|^3
    E_primary(r,t) = -(A(r)/I) dI/dt

The module integrates A and B analytically on each straight segment. An independent Python reference integrates the original line integrals by adaptive quadrature. Polygonal circular-loop fields are also compared to the analytic on-axis circular-loop expression. Rotation, current reversal and translation are tested.

The bench plots E_parallel and its finite-difference spatial derivative along a specified straight cable line. This is a field assay, not a neural activation threshold. The displayed path is not substituted for the actual Stage 1 soma/stem morphology.

Insulating well walls do not become a fitted magnetic-shield factor. Their influence on tissue-induced electric fields would enter the scalar charge-redistribution solution, which is separate from the primary source field. No blanket claim is made here that coil crosstalk is always worse or better than electrode crosstalk; that comparison requires matched geometry and coupled calculations.

For an ohmic conductor with tensor Sigma:

    E_total = -dA/dt - grad(phi)
    div(Sigma E_total) = 0
    K phi = integral grad(N) · Sigma E_primary dV

`induction.mjs` implements this weak load using the existing Stage 1 mesh geometry and conductivity regions. Mesh coordinates are micrometers and the existing stiffness convention expects load in microamps. Consequently a field coefficient in V/m per(A/s) receives the explicit 1e-6 conversion in the volume-gradient product. Current loads sum to zero before any outer boundary enforcement. Independent Python gradients use inverse affine interpolation matrices rather than the JavaScript cross-product formula.

A scalar path potential may represent the drive along the branches of a tree cable, but it is not a global conservative potential for a circulating induced field. The included adapter accumulates the line integral of A/I and adds the scalar secondary potential. It is deliberately not invoked by the standalone bench. It needs finite-conductor/tissue intersection checks, surface and line quadrature refinement, a production-mesh reference, and new-drive cable verification.

Resistance is the sum of rho*L/area for each trace/via segment. Inductance is an **estimated** regularized Neumann integral with an equal-area circular core, analytic straight-segment self terms and four-point Gaussian mutual quadrature. It is not a measured multilayer coil inductance. Skin/proximity effects, substrate eddy currents, magnetic materials, parasitic capacitance, leads outside the modeled path and driver losses are absent.

The declared current waveform rises linearly to I_peak, optionally holds, and returns linearly to zero. Its Joule energy is R I_peak^2(2t_rise/3+t_hold); aggregate average power multiplies by rate and simultaneously driven coils. Peak voltage is the conservative estimate R I_peak+L|dI/dt|. Energy arithmetic is not a temperature or safety assessment.

## Optical transport

Photons launch from a finite disk just inside one cavity wall, with a Lambertian inward distribution. Flight lengths sample the total extinction coefficient. At tissue interactions, implicit capture transfers the absorption fraction to the absorbed-energy ledger; the surviving packet scatters by the Henyey–Greenstein phase function. The code uses total scattering coefficient mu_s, not reduced scattering mu_s'.

Finite cylinder and cap solids are intersected analytically. Apertures remain open conducting optical paths. Walls are opaque, with user-declared specular reflectivity: the reflected fraction continues and the rest enters the wall-absorption ledger. Tissue and cavity share the same hypothetical optical coefficients. The soma is a virtual detector volume; it does not refract or displace tissue.

The fluence estimator accumulates weighted path length inside each detector sphere and divides by detector volume and launched photon count. In micrometer coordinates the conversion to mW/mm² per emitted mW is 1e6*trackLengthUm/(volumeUm3*N). This is volume-averaged scalar fluence, **not** angle-resolved membrane irradiance or a membrane-surface average.

Each independent batch uses a reproducible named seed stream. Batch standard errors are exported. A zero sample standard error at zero hits is not a zero-uncertainty statement. The default calculations encountered extremely rare off-target hits; their raw ratios were unstable by many orders of magnitude. These values are preserved as diagnostic history. The corrected interface withholds the confinement headline unless every off-target detector has at least100 intersecting photon histories and batch standard error <=20% of its mean. These are conservative estimated display-adequacy conditions, not release qualification or confidence guarantees. Even a displayed finite ratio would not establish recruitment selectivity.

Every packet ends in tissue absorption, wall absorption, escape or unresolved truncation. Event limits do not quietly classify truncated power as heat. The energy sum is tested to1e-10. A separate collimated, absorption-only slab is checked against exp(-mu_a L). Two seeded budgets assess finite-sample compatibility; rare off-target results are marked unresolved, not passed as crosstalk convergence.

No photons returning from outside the finite domain are modeled. Domain expansion, membrane-surface estimator convergence, realistic optical interfaces and uncertainty in threshold classification remain release gates.

## Four-state optogenetic kinetics

The source is the Williams et al. ChR2(H134R) model, checked against the Giugliano NEURON mechanism in ModelDB244414. States are C1,O1,O2,C2 plus activation variable p. At given voltage V, irradiance I and temperature T, the transition matrix is a continuous-time Markov generator. Its state equation is integrated by uniformization using a midpoint value of the analytically updated p. There is no occupancy clipping or renormalization.

    C1' = -k1 C1 + Gd1 O1 + Gr C2
    O1' = k1 C1 - (Gd1 + e12) O1 + e21 O2
    O2' = e12 O1 - (Gd2 + e21) O2 + k2 C2
    C2' = Gd2 O2 - (k2 + Gr) C2
    p' = (S0(I)-p)/1.3 ms
    k1 = epsilon1 F p; k2 = epsilon2 F p

The supplied register/code preserves all voltage functions, logarithmic light-dependence terms and Q10 factors. The recovery coefficient is4.34587e-5 as in the source mechanism. The article's rendered HTML table presents the exponent inconsistently; this implementation records the chosen mechanism rather than silently selecting a favorable recovery behavior.

For zero nominal reversal, multiplying the source I–V conductance expression by V permits evaluation without dividing by zero:

    I_photo [nA] = gmax[mS/cm²] area[um²] *1e-5
                  *(10.6408-14.6408 exp(-V/42.7671))*(O1+0.1 O2)

This literal empirical expression has a small reversal offset; it is not forcibly corrected to zero current at0mV. The interactive clamp restricts V to−100…−10mV. The fixed loss divisor1.3 follows the published/ported assay. A future physical light-transport coupling must define its photon-loss convention to avoid counting the same attenuation twice.

Six reference conditions span22/37°C, voltages−80/−40mV and irradiances0.1/1/5mW/mm². Python integrates the five differential equations directly with SciPy DOP853 on each continuous-light interval, without sharing the JavaScript generator or time step. Samples match exact times; no time shift, amplitude scaling or baseline correction is used. The reference uses a0.005ms JavaScript step. Larger interactive steps remain exploratory and are not automatically qualified by that comparison.

This is an ideal voltage clamp, not a neuron with regenerative spikes. An expression value at an engineered bipolar soma is hypothetical. No native NEURON comparison or newly coupled magnetic/optical cable computation has run in this increment.

## Spectral overlap

The tabulated-spectrum function rejects wavelengths outside supplied support. It weights each integrated spectral irradiance bin by lambda/(hc) and its relative action sensitivity, rather than comparing radiant powers alone. Its units are absorption events per molecule per millisecond under the selected cross section.

The bench's Gaussian curves and blue tails are explicitly hypothetical. They are not measured ChR2, Chrimson or other named-opsin spectra. The2–4 population selector illustrates overlap without promising a corresponding increase in independently addressable channels.

## Parameters and provenance

Each user control and default is registered in `parameter-register.json` with exactly one class: mathematical, estimated or hypothetical. No parameter in this increment is presented as an experimentally measured engineered-human-neuron value. Published-model constants define transferred equations and are classed mathematical, with their primary source. Numerical budgets, tolerances and estimator-adequacy choices are estimated. Proposed cell/well/winding/liner geometry and engineered expression are hypothetical.

Temperature, wavelength, units and completed inputs remain in exported data. Editing controls never relabels an already completed result. JSON marks incomplete release status and unknown recruitment; CSV carries metadata. Imports reject malformed shape/census, unsupported numeric values and excessively large files. Cancellation terminates the worker, and request IDs discard late results.

## Retained failures

1. The first one-layer coil test detected a return lead intersecting the sampled cable. The default lateral offset was changed from35 to60um. The failure log is retained; singularity checks and tolerances were unchanged.
2. Initial optical output displayed finite ratios from1–3 off-target photon intersections. These raw calculations are retained. A conservative adequacy rule now withholds the headline. Three off-target photon-budget comparisons remain unresolved; they are not relabeled as isolation.

## Release gates still open

The component bench is not eligible to replace Stage1 or claim completion of Stage2 until all of these are executed: same-anatomy electrode/coil/light comparisons; coupled37°C membrane and multi-state opsin integration; modality-specific matched controls and propagated events; native independent membrane comparisons; secondary induction-field and spatial/temporal convergence; membrane-surface optical sampling and stochastic threshold uncertainty; actual amplitude studies and four selectivity metrics from those experiments; full site build and hosted browser verification. Growth and long-term integration remain later stages.

## Primary sources

1. Williams JC et al. Computational Optogenetics: Empirically-Derived Voltage- and Light-Sensitive Channelrhodopsin-2 Model. PLoS Computational Biology9(9):e1003220(2013). https://doi.org/10.1371/journal.pcbi.1003220
2. ModelDB244414, WilliamsEtAl2013NEURON/ChR2H134R.mod, port by Michele Giugliano. https://modeldb.science/244414 and https://modeldb.science/getModelFile?embed=True&file=WilliamsEtAl2013NEURON/ChR2H134R.mod&model=244414
3. Bonmassar G et al. Microscopic magnetic stimulation of neural tissue(2012). https://pmc.ncbi.nlm.nih.gov/articles/PMC3621430/ — mechanism context, not calibration of this coil.
4. Lee SW and Fried SI. Enhanced control of cortical pyramidal neurons with micromagnetic stimulation(2017). https://pmc.ncbi.nlm.nih.gov/articles/PMC5498237/ — geometry and orientation context, not a measured peripheral recruitment threshold.
5. The original project specification and pinned Stage1 source determine the application boundary. No numerical pass is a citation for biological efficacy.
