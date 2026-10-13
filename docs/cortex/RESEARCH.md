# Scientific foundation and framework review

Reviewed 2026-10-11/12. This is a decision-oriented first review, not a completed
systematic review of all cortical modeling literature. The first implementation
has deliberately narrower physics than the long-term platform.

Structured registry: `src/lib/cortex/evidence.js`. It records identifiers,
URLs/DOIs, dates where verified, inspected locators, species, evidence category,
license/redistribution notes, limitations and unresolved questions. The public
methods page and result bundles consume this same registry.

## Scientific decisions

### Anatomy and passive parameters

[Wagstyl et al. 2020](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000678)
provides region-dependent human laminar evidence. The data do not justify universal
layer fractions: postmortem reconstruction, shrinkage and regional boundaries
matter. We choose a 4 mm representative slab and label every layer fraction as an
assumption. No scans, densities, connectivity or cell-type proportions are imported.

[Eyal et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27710767/), DOI
10.7554/eLife.16553, is a candidate human passive reference, but its temporal L2/3
evidence must not silently become motor-cortex parameters. Only its abstract and
figure captions were verified in this review. No fitted values are adopted.

The implemented soma/arbor and Cm/Rm/Ra are canonical assumptions. Independent
morphologies, preparation/temperature metadata, donor variation, extracellular
space and vascular/meningeal structure remain research tasks.

### Recording and stimulation

[Lindén et al. 2014](https://www.frontiersin.org/journals/neuroinformatics/articles/10.3389/fninf.2013.00041/full),
DOI 10.3389/fninf.2013.00041, motivates explicit total compartment currents and
point/line-source forward models. [LFPy's API](https://lfpy.readthedocs.io/en/latest/classes.html)
is a reference for units, finite-contact ideas and the current-clamp exception;
its GPL implementation is not copied into this repository.

[Anastassiou et al. 2010](https://buzsakilab.org/content/PDFs/Anastassiou2010JNeurosci.pdf),
DOI 10.1523/JNEUROSCI.3635-09.2010, supports a passive extracellular cable benchmark.
Sealed ends can polarize even when a uniform field has zero interior activating
function. Field magnitude alone is not an activation criterion.

The initial conductor is homogeneous/isotropic/ohmic and unbounded. Displayed
lamination does not create interfaces. [Koessler et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC6867008/),
DOI 10.1002/hbm.23431, measured human tissue in a 50 kHz regime; this is not direct
validation for an arbitrary low-frequency scalar conductivity. Our .3 S/m is
a modeling default. Neural, applied and total potentials stay separate.

No amplifier transfer function, spike band, LFP population model, finite exposed
contact or stimulation artifact-recovery specification is adopted from a vendor
without sources. Descriptive phase charge cannot establish material or tissue safety.

### Mechanics

[Budday et al. 2017](https://biomech.tugraz.at/images/pdf/Budday_et_al-acta_biomaterialia_2017.pdf),
DOI 10.1016/j.actbio.2017.06.024, reports human regional viscoelastic experiments
under defined preparation and loading protocols. It is a future constitutive
benchmark, not electrode insertion validation. A universal brain Young's modulus
would hide rate, region, mode and sample-history dependence. Mechanics is explicitly
unavailable until a specific experiment, material law and contact condition are selected.

## Software decision matrix

Primary official sources below were reviewed. NEURON 9.0.1 and LFPykit 0.6.2
were subsequently installed in an isolated reference environment and executed
for the uniform/branched passive and recording fixtures in VALIDATION.md.
Other listed frameworks were not executed.
Integration-cost judgments are ours. Licenses describe
the reviewed project, not every dependency, dataset, model mechanism or plugin.

| Framework | Scope, license and deployment evidence | Decision / integration risk |
| --- | --- | --- |
| [NEURON](https://github.com/neuronsimulator/nrn) | Native/Python multicompartment simulator; BSD-3-Clause in project metadata | Version 9.0.1 used for uniform cable and full declared radial-soma circuit; three protocols plus rotated/nonaligned stimulation. No browser port assumed. |
| [CoreNEURON](https://www.neuronsimulator.org/en/latest/coreneuron/compatibility.html) | Optimized CPU/GPU backend; documented restrictions include extracellular mechanism, variable timesteps and per-step callbacks | Defer; not a drop-in extracellular stimulation reference. `fast_imem` serves current readout, not all extracellular behavior. |
| [LFPy](https://github.com/LFPy/LFPy) | Python/NEURON forward potentials, point/line sources/contact averaging; GPL-3.0-or-later | Forward component checked through standalone LFPykit; the full LFPy Cell workflow was not run. No package code copied or redistributed runtime. |
| [LFPykit](https://lfpykit.readthedocs.io/en/latest/) | Standalone forward models used by LFPy; GPL-3.0-or-later | Version 0.6.2 executed offline: point/line coefficients and recordings from independent NEURON currents, in eight fixed ideal-contact cases. |
| [NetPyNE](https://github.com/suny-downstate-medical-center/netpyne) | MIT; NEURON network construction, analysis, optimization | Later network workflow; unnecessary for one passive tree. |
| [Brian2](https://brian2.readthedocs.io/en/stable/user/computation.html) | CeCILL 2.1; Python runtime and C++ standalone; SpatialNeuron/SWC support | Alternative population/reference solver. C++ generation does not establish WASM compatibility. |
| [NEST](https://github.com/nest/nest-simulator) | GPL-2.0-or-later; native/Python large spiking networks, including some current multicompartment models | Later network backend; not first detailed implant forward model. |
| [Allen Cell Types](https://celltypes.brain-map.org/overview), [AllenSDK](https://github.com/alleninstitute/allensdk) | Human/mouse morphology, electrophysiology and model resources; SDK selective maintenance; custom license restricts commercial redistribution | Review specimen/model/data rights independently; no assumption that human morphology includes a matching human fit. |
| [SONATA](https://github.com/AllenInstitute/sonata) | BSD-3-Clause reference repo; HDF5/CSV network data and JSON configs | Stable IDs now; compliant adapter only after reader/round-trip tests. |
| [NeuroML2](https://github.com/NeuroML/NeuroML2) | LGPL-3.0 core schema; XML/LEMS and Python/Java validation tools | Later model exchange. Schema validity ≠ dynamic equivalence. |
| [NWB/PyNWB](https://github.com/NeurodataWithoutBorders/pynwb) | BSD-3-Clause PyNWB; neurophysiology data format, usually HDF5 | Later experimental data/export adapter. Data licenses remain separate. |
| [Gmsh](https://gmsh.info/) | Native mesh/CAD generator; GPL-2.0-or-later with linking exception; commercial option | Offline geometry/mesh generation; preserve physical groups and units. |
| [FEniCSx/DOLFINx](https://github.com/FEniCS/dolfinx) | LGPL-3.0-or-later; native C++/Python/MPI; Poisson and Gmsh examples | Later field reference. Need defined boundaries, coefficients and mesh convergence; no browser-port claim. |
| [SOFA](https://www.sofa-framework.org/download/license/) | Native mechanics; core LGPL-2.1-or-later; applications/tutorials often GPL, plugins vary | Defer until constitutive experiment selected; real-time rendering does not validate tissue behavior. |
| [Workers](https://html.spec.whatwg.org/multipage/workers.html) | Browser background tasks and transferable buffers | Adopt now; bounded CPU kernel, progress, cancellation, independent renderer. |
| [WebAssembly](https://webassembly.org/docs/high-level-goals/) | Portable compilation target | Optimize only a measured bottleneck; whole solver builds unverified. |
| [WebGPU](https://gpuweb.github.io/gpuweb/), [WGSL](https://gpuweb.github.io/gpuweb/wgsl/) | Adapter may be unavailable; shader floating point uses f32 / optional f16, not ordinary f64 | Defer; independently verify precision and keep CPU fallback. |
| [WebGL](https://registry.khronos.org/webgl/) | Graphics API | Keep existing Three.js visualization, separate from physics timestep. |

Specific license references: [Brian2](https://github.com/brian-team/brian2/blob/master/LICENSE),
[AllenSDK](https://github.com/AllenInstitute/AllenSDK/blob/master/LICENSE.txt),
[Allen data terms](https://alleninstitute.org/terms-of-use/),
[NEURON metadata](https://github.com/neuronsimulator/nrn/blob/master/codemeta.json).

## Scope not resolved by this review

Human sensorimotor cell-type densities, synaptic connectivity distributions,
spatial active-channel calibration, axonal initiation/propagation, frequency-dependent
conductivity, device-specific interface/amplifier parameters, micromotion/insertion
contact laws, region-specific vessel/meningeal anatomy and independent experimental
validation cohorts remain open. The code and interface must not imply completion.

Before adopting any dataset: record accession/version, species/region/preparation,
license, calibration-versus-validation role, and import validation. Before adopting
any solver: run a pinned small reference and profile it, rather than relying on
framework reputation or current documentation alone.
