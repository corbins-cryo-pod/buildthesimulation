# PRIMA Photovoltaic Laboratory

## Scientific scope

This laboratory combines **two independently interpreted calculations**:

1. A reproduction of the published **ProViSim v2.0.0** image approximation.
2. A **reduced photovoltaic circuit and homogeneous half-space electrical model**, with a connected return and capacitive electrode interfaces.

The optical image is shared by both calculations. The circuit output does **not** determine the displayed ProViSim image. Optical power, pulse timing and tissue conductivity change device calculations; they do not calibrate perceptual brightness. A grayscale display value is not physical luminance, a detection probability or a ganglion-cell firing rate.

The published human PRIMA implant is approximately 2 × 2 mm, 30 µm thick, with 378 hexagonally arranged 100 µm photovoltaic pixels. It is placed beneath the atrophic retina. Each pixel contains two series photodiodes, a central active electrode and surrounding returns. The intended principal neural pathway is stimulation of surviving bipolar-cell circuitry, followed by retinal network processing [1,2].

This research implementation is independent of the manufacturer. Its geometry and adjustable circuit parameters are openly documented approximations; it is not a manufacturer digital twin, a patient-specific neural model, a surgical planning system or a determination of optical/electrochemical safety.

The [epiretinal laboratory](/simulations/retinal-implant/) remains a separate model family. Its pulse2percept equations, axon trajectories and full-space electrode calculations do not validate the PRIMA model.

## Optical input and geometry

### Projected image

Synthetic Landolt-C, letter, grating, checkerboard, schematic face, spot and blank patterns are available. A local image can be converted to grayscale in the browser. Uploaded images remain in the browser and can be included in an explicitly downloaded experiment file. The schematic face is a generated test pattern, not a patient dataset.

Images use physical retinal coordinates: x increases to the right, y increases toward the superior edge, and raster row zero is superior. The image covers a 2000 µm square. Zoom enlarges scene features inside this fixed retinal footprint; displacement shifts the image relative to the array. Optional Gaussian blur is an illustrative image-space operation, not a measured projector transfer function.

The physical model uses each reconstructed hexagon's mean raster intensity. Both series junctions share that mean illumination. Junction-level shadowing, unequal junction illumination, eye tracking, ocular scattering and aberrations are not resolved. Incident irradiance is specified at the implant plane in mW/mm².

Grayscale is represented here by a fraction of peak irradiance during a common optical pulse. This is an explicit modeling choice: the simulation does not reconstruct the commercial projector's pixelwise pulse-width modulation. Consequently, a gray image and a sequence of binary illumination intervals with the same average energy need not produce identical nonlinear circuit waveforms.

### Geometry and scale

The 378-pixel lattice is an **idealized reconstruction**, not extracted manufacturing CAD. Exact commercial edge truncation, photodiode metallization and junction layout are not claimed. The three-dimensional anatomy is schematic; an expanded-depth view changes the display only.

At the default retinal scale of 288 µm/degree, 100 µm corresponds to 0.3472° or 20.83 arcminutes. The one-pixel geometric acuity equivalent is approximately 20/417. A 2 mm footprint spans approximately 6.94° per side. These are geometry calculations, not a measured acuity for the current simulation. At zoom Z, scene coverage is divided by Z. Changing magnification does not change the number of implant pixels [3].

## Photovoltaic circuit and electrical field

The model follows the structure of published photovoltaic circuit models and RPSim: illumination generates photocurrent, which interacts with diode laws, shunt resistance, electrode capacitance and a tissue impedance model [4,5]. The browser implementation is a reduced model, not a reproduction of a COMSOL mesh or a complete RPSim configuration.

The active interfaces have individual capacitive states. The connected return has a lumped capacitive interface. The shared return's spatial current distribution is solved from the mutual electrical interaction model rather than forced to cancel one neighboring pixel at a time. Recovery currents can flow through dark pixels. A finite simulated window can leave residual stored charge; it is reported rather than set to zero.

The conductor is a homogeneous, isotropic half-space with surface flux prescribed by regularized electrode basis functions. This approximates an insulating implant plane but does not resolve finite electrode edges; the basis has noncompact spatial tails. Electrode interactions use a reciprocal regularized surface-source approximation. It does not resolve exact metal edge singularities, spatially varying interfacial capacitance, retinal conductivity layers, anisotropy or a finite eye boundary. See [the detailed physics model](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/prima/PHYSICS.md) for the basis, circuit equations, solver, units and parameter provenance.

The extracellular equations have the form:

```text
div(sigma grad(phi)) = 0 within the conductor
E = -grad(phi)
J = sigma E
phi(r,t) = sum_j I_j(t) psi_j(r)
```

The field basis is linear for fixed geometry and conductivity. Photovoltaic circuit dynamics remain nonlinear. The circuit is solved before the instantaneous currents are applied to the spatial field basis.

### Observation depth and bipolar-cell surrogate

The gap control sets the lower observation depth above the implant. A second plane is separated by the assumed bipolar-cell length. Their signed extracellular potential difference is reported as a **bipolar-cell driving surrogate**. It is not membrane voltage, a spike count or a detection threshold. No universal human stimulation threshold is imposed.

Changing gap therefore changes field observations; it does not create an unmodeled layer with a fabricated conductivity. Published engineering work motivates studying this separation because target-cell distance affects stimulation strength and contrast [2,6].

Field images are snapshots at the time named in their caption. Their maxima are maxima of the sampled grid, not continuous-space extrema. The selected-pixel waveform and the array total use their stated units and are not interchangeable.

### Parameter provenance

Array size, nominal pixel dimensions, two-series-diode architecture and 880 nm optical carrier are literature-derived. Adjustable responsivity, diode parameters, electrode size, shunt resistance, capacitance density, conductivity and neuronal dimensions are **exploratory model assumptions**, not verified specifications for a manufactured implant or measurements from a particular eye.

The preset optical timing lies within the types of pulse schedules described in the literature. Controls are numerical exploration bounds; their availability does not establish an approved operating range.

### Energy and charge

The average incident optical power over the square projection is:

```text
mean normalized image intensity × illuminated square area
× peak irradiance × pulse duration × frequency
```

For full uniform illumination at 3.5 mW/mm², 9.8 ms and 30 Hz, the duty cycle is 0.294 and average incident power over 4 mm² is 4.116 mW. This is not absorbed heat. No tissue temperature or laser-exposure compliance is computed. Charge calculations integrate the actual modeled current, including recovery, rather than assuming a symmetric current pulse.

The exported array incident power integrates the 378 complete reconstructed hexagons, covering approximately 3.274 mm². The interface's projection-power metric integrates the full 4 mm² square. The two areas, and therefore the two powers, are distinct; neither is the electrical power delivered to tissue.

## Percept approximation

The pinned ProViSim release converts grayscale images with a radial Fourier low-pass filter and a selected contrast transform. The reference source, MIT license, checksums and reproduction notes are retained with this project. See [percept implementation details](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/prima/PERCEPT.md).

For the published 2 mm / 100 µm device, the nominal cutoff is 10 cycles per image. The release's Tukey-window construction, padding, real reconstruction and clipping are reproduced, including its discrete mask alignment. This avoids silently changing the published implementation. The nominal sampling limit and the tapered filter support are distinct quantities.

At the default 256 × 256 size, the published 27-sample mask is centered at index 127 while the shifted FFT's zero-frequency bin is at index 128. Its inverse transform can therefore have an imaginary component. The published code retains the real part and clips it to 0–1; this reproduction follows that behavior and exports the discarded imaginary peak and clipped-sample count. Reference agreement does not remove this implementation artifact or establish an exact physiological transfer function.

The gamma transform is signed about mid-gray:

```text
y = (sign(2x - 1) × abs(2x - 1)^gamma + 1) / 2
```

It is not the ordinary x^gamma transform. The alternative sigmoid is:

```text
y = 1 / (1 + exp(-gain × (x - offset)))
```

A sigmoid can produce a nonzero display black level. It does not imply spontaneous neural activation. No per-image min/max normalization is applied to the comparison panels; all use the same normalized 0–1 display range.

ProViSim is motivated by reported smooth forms and limited resolution/contrast in prosthetic vision. Its contrast curves are phenomenological alternatives, not individually fitted PRIMA response curves. The paper's face-enhancement experiment involved 16 sighted participants viewing simulations. It did not establish improved face recognition in implanted patients [3].

## Clinical evidence and interpretation

The pivotal PRIMAvera study implanted 38 participants, with 32 assessed at 12 months. Twenty-six of those 32 achieved at least a 10-letter improvement. Mean improvement with glasses was 24.5 letters; the better result with or without glasses yielded 25.5 letters. Native implant-resolution testing averaged approximately 20/417. Magnification-assisted chart performance is distinct from native retinal sampling [7].

The trial reported 26 serious adverse events in 19 participants, predominantly early after surgery. It was open-label and single-group. These clinical observations establish neither patient-specific validation of this simulator nor a conversion from its current or field metrics to clinical benefit [7].

An October 2026 company announcement reported 36-month efficacy data for 18 participants and safety data for 27. That conference/manufacturer report has a smaller evaluable cohort than the original trial and is kept distinct from the peer-reviewed 12-month paper [8].

## Verification

Verification is separated into numerical implementation, model assumptions and clinical evidence:

- **Percept reference:** the pinned original Python definitions generate independent image fixtures, checked against the JavaScript implementation across synthetic patterns and contrast transforms.
- **Circuit reference:** an independent Python/SciPy calculation checks nonlinear waveforms and integrated charge. Time-step refinement measures numerical sensitivity.
- **Field reference:** independent evaluations check signed potentials, observation-plane differences, field derivatives, reciprocity and passive interaction structure under the documented reduced basis.
- **Experiment integration:** tests check optical orientation, pixel sampling, unit conversions, exact zero drive, input rejection, deterministic definitions, worker cancellation and JSON restoration.
- **Browser verification:** real numerical workers, all example experiments, native keyboard editing, stale-result clearing, 3D rendering, file serialization/restore and mobile layout are exercised in the dedicated GitHub workflow.

Detailed validation reports and fixture provenance accompany the source. Numerical agreement with a reference establishes agreement for those equations and cases. It is not patient validation, thermal validation or evidence that uncertain biological assumptions are correct.

### Recorded implementation checks

| Calculation | Recorded check | Result |
| --- | --- | --- |
| Published image approximation | 18 native Python reference cases; 626,688 mask, spatial and percept samples, including two 256 × 256 cases | Maximum absolute difference 1.64313 × 10⁻¹⁴; acceptance bound 5 × 10⁻¹² |
| Percept and optical implementation | 30 tests, including exact default optical raster comparison and the published mask alignment | Passed |
| Complete experiments | All seven presets run through the 378-pixel solver; 20 integration tests | Passed; maximum preset current-balance equation residual below 0.2 pA |
| Independent circuit and field reference | Six Hankel-integral checks, four seven-pixel networks, an augmented shared-return solve and a complete 378-pixel experiment | Reference fixtures reproduced; browser equations agree within declared numerical gates |

The [percept report](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/prima/PERCEPT_VALIDATION.json) and [experiment report](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/prima/INTEGRATION_VALIDATION.json) record the individual cases and numerical results. These bounds concern floating-point implementation and circuit equation residuals; they do not quantify uncertainty in biological or device parameters.

The default integration step is 0.05 ms, with 16 return-basis sites per hexagon side. In the recorded full-array refinement case, reducing the step to 0.025 ms changes final light-phase charge by 0.0574% and snapshot current by 0.9617%, each normalized to the finer result's peak absolute value. Refining the return perimeter from 16 to 32 sites per side changes the six recorded potential probes by at most 0.02369% of the finer probe peak. These are case-specific sensitivity measurements, not uniform accuracy bounds across all controls.

The [physics report](https://github.com/corbins-cryo-pod/buildthesimulation/blob/main/docs/prima/PHYSICS_VALIDATION.json) also retains difficult near-zero cases. In its low-capacitance example, the default step differs from the adaptive continuous-time reference by approximately 26 pA at the snapshot, or 37.6% of a 69.2 pA peak. A small circuit-equation residual does not eliminate time-discretization error. Absolute errors, normalization denominators and further refinement are therefore reported together.

## Reproducible experiments

Experiment JSON includes the validated definition, calculated arrays, model version, coordinate conventions and source provenance. Imported result arrays are ignored: restoring a file recomputes the definition. The short experiment identifier is a deterministic non-cryptographic label, not a cryptographic integrity check. Source and fixture files carry separate checksums where applicable.

## References

1. Palanker et al. (2022). *Simultaneous perception of prosthetic and natural vision in AMD patients.* [Nature Communications, DOI 10.1038/s41467-022-28125-x](https://www.nature.com/articles/s41467-022-28125-x).
2. Wang et al. (2022). *Pixel size limit of the PRIMA implants: from humans to rodents and back.* [Journal of Neural Engineering, DOI 10.1088/1741-2552/ac8e31](https://doi.org/10.1088/1741-2552/ac8e31).
3. Kochnev Goldstein, Park et al. (2026). *Simulation of prosthetic vision with the PRIMA system and enhancement of face representation.* [J NeuroEngineering and Rehabilitation, DOI 10.1186/s12984-026-01958-z](https://link.springer.com/article/10.1186/s12984-026-01958-z). [ProViSim v2.0.0 source release](https://doi.org/10.5281/zenodo.19212252).
4. Boinagrov et al. (2016; online 2015). *Photovoltaic Pixels for Neural Stimulation: Circuit Models and Performance.* [DOI 10.1109/TBCAS.2014.2376528](https://doi.org/10.1109/TBCAS.2014.2376528).
5. Chen et al. (2022). *Photovoltaic implant simulator reveals resolution limits in subretinal prosthesis.* [DOI 10.1088/1741-2552/ac8ed8](https://doi.org/10.1088/1741-2552/ac8ed8).
6. Jensen et al. (2026). *Maximizing the fidelity of a photovoltaic subretinal prosthesis for human patients.* [DOI 10.1088/1741-2552/ae6d77](https://doi.org/10.1088/1741-2552/ae6d77).
7. Holz et al. *Subretinal Photovoltaic Implant to Restore Vision in Geographic Atrophy Due to AMD.* Online October 20, 2025; NEJM 394:232–242, January 2026. [DOI 10.1056/NEJMoa2501396](https://pubmed.ncbi.nlm.nih.gov/41124203/).
8. Science Corporation (October 5, 2026). [Company report of 36-month PRIMAvera conference results](https://science.xyz/news/long-term-prima-results/).
