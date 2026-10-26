## Unified experimental scope

The Retina Laboratory (`retina-unified-1.0.0`) uses one scene, retinal coordinate chart, sampled cell population and experiment definition for electrical, PRIMA photovoltaic, direct optogenetic and electrical–optogenetic hybrid stimulation. **The new biological coupling is a research prototype, not a patient-calibrated prediction.** Numerically verified fields and circuits do not validate the neurons or the appearance of human vision.

The retained methods remain available:

- [Electrical field and published pulse2percept methods](#retained-electrical-reference).
- [PRIMA circuit, optical input and ProViSim methods](/simulations/retinal-implant/prima/methods/).
- [Implementation, tests and completion record](https://github.com/corbins-cryo-pod/buildthesimulation/tree/main/docs/retina-lab).

## Common coordinates and anatomy

All distances are in µm; time is ms. The fovea is `(0,0)`, retinal x points nasally and retinal y superiorly in a right-eye chart. Positive tissue depth points from the vitreous toward the RPE. Visual y is inverted. The common chart uses the retained Watson A6 retinal-to-visual mapping and its numerical inverse; the independently fitted A5 and A6 transforms in the original engines remain unchanged for legacy reproduction. Device rotation and translation act on the physical coordinates before sampling the common scene or evaluating fields.

The displayed retinal surface has a 12 mm spherical radius and a smooth foveal depression. Layer thicknesses vary smoothly with eccentricity. At the center, the illustrative NFL/GCL/IPL/INL/OPL/ONL/IS/OS/RPE thicknesses are 8/3/3/5/15/70/24/30/12 µm. Away from the center they approach 20/42/46/39/15/45/24/30/12 µm. These values and the 340 µm central ganglion displacement are **assumed display/model parameters**, not an imported histological measurement set.

The microscopic view includes rods, cones, their inner/outer segments and nuclei, RPE mosaic, bipolar cells with ON/OFF IPL stratification, horizontal and amacrine processes, and ganglion somata, dendrites and axons. Macroscopic fibers reuse the existing published Jansonius reference. Cell density is reduced for inspection; 225, 529 or 961 population sites are computational samples, not estimates of anatomical cell count. Foveal photoreceptors and displaced inner cells are represented schematically.

Ganglion arbors are seeded, space-filling branching trees through a stratified target cloud, with a path-length penalty and tapered processes. They are **procedural morphologies, not microscopy reconstructions**. The selected cable uses those same physical nodes. The form is informed by retinal histology and the generative approach of Italiano et al.; no ModelDB reconstruction or source code is redistributed. Soma size, midget/parasol proportions and arbor diameter are assumptions. There is no individual patient anatomy.

References: [Webvision, human fovea](https://www.webvision.pitt.edu/book/part-ii-anatomy-and-physiology-of-the-retina/the-architecture-of-the-human-fovea/); [Italiano et al. 2022, model and provenance](https://modeldb.science/267391); [Watson 2014](https://doi.org/10.1167/14.7.15).

## Three distinct physical pathways

| Pathway | Incident quantity | Physical calculation | Neural input |
| --- | --- | --- | --- |
| Epiretinal electrical | Commanded current, µA | Balanced finite disks in an infinite homogeneous isotropic conductor | Extracellular potential differences, mV |
| Subretinal PRIMA | 880 nm irradiance, mW/mm² | Two-series-diode photovoltaic circuit, electrode polarization, shared return and half-space field | Extracellular potential differences, mV |
| Direct optogenetic | Wavelength and irradiance, mW/mm² | Attenuation and opsin state kinetics | Light-dependent conductance and photocurrent, pA |

The shared scene is a luminance raster, sampled at the device's actual location. Electrical encoding samples each contact aperture; optional edge encoding, channel gains and total-current budgeting are applied before field calculation. PRIMA projects the scene into its local 2 mm square and averages illumination over its reconstructed 378 hexagonal pixels. Pixel gains affect photocurrent, not the original projected image. The two recorded stages remain separate. Projection offsets are in the implant's local frame. The native ProViSim image calculation remains conditional on projected input, not on the calculated photovoltaic current.

The retained electrical solver is full-space; PRIMA is a half-space approximation with its own shared-return interface equations. They are not interchangeable boundary conditions. Curvature is a registered display surface, **not a curved conductive domain**. Neither engine solves layered or anisotropic tissue, and the UI offers no misleading anisotropy control.

Electrical probes use soma and dendrite depths below the local NFL surface. PRIMA's lower bipolar probe is at the local INL bottom, with the upper probe a configurable bipolar extent toward the vitreous. The device plane is one gap below that reference. The cable transfer uses each node's depth relative to this same INL reference, all in the local planar approximation. This is an assumed subretinal registration, not a measured implant-to-cell reconstruction.

The electrical field overlay is a cathodic reference snapshot. Anodic-first selection reverses delivered waveforms and the active cable's field; it does not introduce a validated polarity-dependent percept model. Interleaved trains are individually resolved in the detailed cable. The reduced population uses the selected-contact field snapshot and a common pulse envelope; it is not a full per-contact interleaved network calculation. All reported phase charges use complete biphasic pairs only.

PRIMA's network input uses the final-pulse spatial field pattern multiplied by its calculated array-current envelope, normalized at the same snapshot. The detailed cable instead uses every captured pixel current and its shared-return transfer matrix. No optical irradiance is added to electrical current. Hybrid mode combines electrical fields and direct opsin conductance at the neural stage; optical delay allows sequential or overlapping delivery.

## Response tiers and equations

### Tier 1: bounded recruitment

The static surrogate is `R(d,θ) = 1 − exp(−max(d,0)/θ)`. Ganglion and bipolar driving differences are divided by explicit threshold scales and weighted by survival. Opsin conductance and surviving natural input can contribute. The displayed result is peak unitless recruitment, without membrane voltages or spikes. This is a screening approximation, not an experimentally measured threshold distribution.

### Tier 2: reduced retinal network

Each site has ON or OFF bipolar input, a low-pass bipolar state, lateral amacrine inhibition and a leaky integrate-and-fire ganglion state. Bipolar and amacrine states use exponential updates. The default bipolar time constant is 15 ms; lateral inhibition is 0.3 and the amacrine time constant 25 ms. Optional natural input is weighted by photoreceptor survival and an 80 ms adaptation state. ON sites rectify input minus half its adaptation; OFF sites rectify adaptation minus input. This is a simplified contrast circuit, not a full retinal microcircuit.

Ganglion voltage relaxes toward `−65 mV + excitation` with a 12 ms time constant. A −50 mV threshold resets voltage to −65 mV and imposes a 2 ms refractory interval. Excitation is surviving ganglion fraction times the rectified sum of electrical recruitment and direct/synaptic input. Default electrical and synaptic gains are 750 and 220 mV, respectively; both are exposed assumptions. They set a useful response range and are **not fitted physiological measurements**. Opsin conductance is 3 nS × expression × open fraction, with a 0 mV reversal, and its current is normalized by an assumed 180 pA scale for population coupling.

The response is spikes per second over the chosen observation window. Spikes, bipolar/amacrine states and voltages are exported. Threshold sensitivity at factors 0.5, 1 and 2 is a model sensitivity study, not a statistical confidence interval. Comparisons retain identical scene, tissue, sampling, seed and response parameters; device pulse schedules remain explicit.

### Tier 3: selected branched active cable

The surrounding population remains Tier 2. One selected ganglion morphology is integrated with membrane capacitance, axial resistance, leak, Na, delayed K, A-type K, excitatory synaptic conductance and optional opsin conductance. A tree elimination solves implicit axial/membrane coupling; gates use Rush–Larsen updates. Axial resistance includes both adjacent half-sections. Extracellular coupling uses potential differences, so a constant extracellular offset cannot stimulate the cell.

Membrane capacitance is 1 µF/cm² and axial resistivity 110 Ω·cm. Maximum Na/K/A densities in S/cm² are dendrite 0.04/0.012/0.036, soma 0.07/0.018/0.054, initial segment 0.7/0.018/0.054, and axon 0.07/0.018/0. Reversal potentials are Na +35 mV and K −75 mV; leak is 0.000005 S/cm² at −62.5 mV. These follow the retinal Fohlmeister-family implementation documented in ModelDB 267391, with independently written integration. Calcium and calcium-activated K dynamics are omitted; this is **not a reproduction of the complete published model**. Temperature dependence and compartment-refinement convergence are not established.

There is 20 ms dark equilibration. Dendritic synaptic conductance follows the selected site's calculated bipolar state using an assumed 0.002 nS/µm² scale. Direct opsin expression uses that scale per membrane area and the configured open fraction. The selected cable's spike count is shown beside its reduced-network count to reveal disagreement. The population output decoder continues to use Tier 2; one detailed cell is not substituted for the entire retinal population.

References: [Fohlmeister and Miller 1997](https://doi.org/10.1152/jn.1997.78.4.1935); [Italiano et al., ModelDB 267391](https://modeldb.science/267391).

## Optogenetics and optical energy

Existing opsin modules are reused from the Optogenetics Laboratory: ChR2 uses its Williams-family kinetics; Chronos and ChrimsonR use explicitly reduced state models. Their spectral weights and kinetics are assumptions at the retinal expression site, not evidence of human retinal calibration. The clinical rationale for a distinct optogenetic pathway is described by [Sahel et al. 2021](https://doi.org/10.1038/s41591-021-01351-4).

Transmission to depth `z` is `exp(−[μa + μs′(λ/590 nm)^−b] z)`, with depth converted to mm. This is a wavelength-scaled effective attenuation model. Reduced scattering is treated as removal from the modeled beam; there is no diffuse transport or lateral redistribution. A 4 mm square footprint, its placement and the common image determine which cells receive light. It is not Monte Carlo radiative transfer.

The thermal trace solves a lumped energy balance for a **peak-illuminated tissue column**: `C_A dT/dt = I_abs − C_A T/τ`, where `C_A = volumetric capacity × thickness` and `I_abs = incident irradiance × [1−exp(−μa thickness)]`. It uses assumed 0.004 J/mm³/K capacity, 250 µm thickness and 500 ms cooling by default. Scattering is not counted as absorbed heat. This is not a spatial temperature map, ocular exposure limit or safety determination. For PRIMA, illumination is at the implant; displayed heating is only a common illustrative absorption calculation, not heating predicted from the actual silicon package or retina.

## Tissue state, vision and time

Disease presets alter photoreceptor, bipolar and ganglion survival, which changes the neural calculation as well as displayed cells. RP-like loss rises peripherally; geographic atrophy and focal injury use a smooth lesion region. Healthy tissue has unit survival. These are explanatory spatial masks, not histological fits or predictions of eligibility for an implant. Photoreceptor survival affects simulated activity only when surviving natural input is enabled. Direct ganglion stimulation can bypass photoreceptor loss; photovoltaic recruitment requires the assumed bipolar pathway.

The coupled percept is a fixed-scale Gaussian rendering of output samples. It is not acuity, reading performance, clinical vision or a cortical reconstruction. Electrical spatial and biphasic axon-map models and PRIMA's ProViSim baseline are retained separately. The electrical baseline can show axonal elongation; the new Gaussian population decoder does not reproduce that axon-mediated percept. Baseline brightness units differ between technologies. PRIMA's image-only baseline may be nonzero at zero irradiance, which is explicitly distinct from the zero coupled neural result.

Local images and videos are converted in the browser. Videos use up to eight center-cropped grayscale samples from the first two seconds. Moving inputs and video frames run as **independent trials that restart the circuit and network**. Playback within a trial shows the calculated response; sampled-sequence playback is not a continuous video-driven neural integration with state carried between frames.

## Verification and remaining work

The original electrical and PRIMA test fixtures, upstream licenses, model versions and methods are retained. New tests cover shared image orientation, exact coordinate round trips, malformed imports, geometry, seeded anatomy, zero stimulus, lost cells, opsin expression, placement, charge balance and polarity; analytic optical transmission and lumped heating; cable SI units, dense-matrix residuals, passive RC dynamics, gauge invariance and time refinement; PRIMA field-transfer equivalence and passive current observation; and numerical regression of imported experiments. Graphics-enabled CI checks real workers, WebGL rendering, editing, comparison, legacy presets, exports and responsive layouts.

Biological validation against compatible retinal recordings and perceptual validation against matched patient outcomes remain **unperformed**. Also pending are authentic traced morphology imports, layered/anisotropic field solvers, calibrated diffuse optical transport, custom photovoltaic pixel geometry, continuous video integration, population-wide detailed electrophysiology and validated task-performance predictions. Circular custom electrical arrays are supported; unsupported Designer shapes or multiple planes are rejected rather than silently approximated.

Experiment JSON stores settings, seed, units, model versions, assumptions and calculated arrays. Import restores settings and recomputes; imported results are not trusted. The `RTL-` identifier is a non-cryptographic label, not a content-integrity or provenance guarantee. The original reference asset's SHA-256 remains verified.

## Retained electrical reference

The following original methods describe the unchanged electrical baseline and its original scope. Their statements about absent membrane or network models refer to that retained engine, not the exploratory unified tiers above.
