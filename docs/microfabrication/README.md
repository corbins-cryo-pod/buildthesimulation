# Cleanroom Microfabrication Laboratory

Entry point: `/simulations/microfabrication/`.

This laboratory follows a generic four-channel flexible microelectrode from its
carrier wafer through polymer deposition, lithography, metal lift-off,
encapsulation, contact opening, outlining, and release. The plan view, cross
section, and electrical inspection derive from the same material masks. Changing
a process parameter rebuilds the experiment deterministically at the selected
stage.

This is an educational process and geometry model. Published processes establish
the sequence and mechanisms; they do not calibrate the simulator's rates,
thresholds, manufacturing yield, or reliability. The four-channel layout is a
BuildTheSimulation teaching design, not a reconstruction of a commercial probe or
of any one paper's device.

## Process state

The numerical implementation is `src/lib/microfabrication/model.js`. It exports
`DEFAULT_CONFIG`, `STAGES`, `SCENARIOS`, `normalizeConfig`, and `createExperiment`.

```js
// From the repository root.
import { createExperiment } from './src/lib/microfabrication/model.js';

const result = createExperiment({ overlayXUm: 16 }, 9);
// result.geometry: rasterized device, conductors, openings, exposed metal
// result.layers: material masks with z positions and thicknesses
// result.channels: conductor continuity, isolation, exposure, resistance estimate
// result.measurements: scalar inspection results
// result.warnings: consequences and limits associated with this state
```

| Stage | Process represented | Main state change |
| --- | --- | --- |
| 0 | Carrier | A support exists before the device layers. |
| 1 | Base polyimide | The lower insulating film is present. |
| 2 | Photoresist | A sacrificial patterning layer covers the base. |
| 3 | Expose and develop | The resist mask opens the intended metal features. |
| 4 | Metal deposition | Metal reaches accessible openings and covers the resist. |
| 5 | Lift-off | The sacrificial resist and its supported metal are removed when the simplified clearance criterion permits it. |
| 6 | Encapsulation | Upper polyimide covers the patterned conductors. |
| 7 | Contact etch | Insulation is removed within registered openings; time, selectivity, and lateral etching affect the result. |
| 8 | Outline | The polymer body is patterned to the device outline. |
| 9 | Release | The carrier is removed from the device presentation. |

Release represents a change of support state. It does not solve sacrificial-layer
chemistry, peeling forces, stiction, stress relaxation, or device deformation.
Outline patterning is idealized separately from the parameterized contact etch.
If the lift-off check fails, processing stops at stage 5. The requested stage is
retained in `result.stage`, while `result.process.effectiveStage` records the last
realized stage. Later encapsulation, contact etching, outlining, and release must
not be interpreted as completed in that state.

## Geometry, units, and defaults

The simulation window is 320 by 1000 micrometres on a 160 by 500 grid. Each cell is
2 by 2 micrometres. In-plane masks are binary; material thicknesses retain their
continuous numerical values. A thin metal film is therefore not rounded to a
2-micrometre thickness.

| Parameter | Default | Interpretation |
| --- | ---: | --- |
| Trace width | 12 µm | Drawn conductor width before lithographic bias. |
| Metal-site diameter | 48 µm | Drawn circular electrode metal. |
| Contact-opening diameter | 36 µm | Drawn opening through upper insulation. |
| Channel pitch | 64 µm | Spacing of the four parallel channels. |
| Metal thickness | 200 nm | Uniform effective conducting film. |
| Base polyimide | 10 µm | Lower insulation thickness. |
| Upper polyimide | 10 µm | Encapsulation thickness before etching. |
| Lift-off resist | 2 µm | Sacrificial patterning film thickness. |
| Undercut | 1.2 µm | Simplified lateral resist clearance. |
| Lithographic bias | 0 µm | Prescribed feature displacement, not an exposure solver. |
| X/Y overlay | 0/0 µm | Contact-mask translation relative to the metal. |
| Contact-etch time | 12 min | Illustrative process duration. |
| Polyimide etch rate | 1 µm/min | Assumed constant rate. |
| Etch-mask thickness | 6 µm | Initial mask available to protect the cap. |
| Etch selectivity | 3 | Polyimide rate divided by mask-removal rate. |
| Lateral/vertical etch ratio | 0.04 | Prescribed lateral expansion of openings. |
| Deposition angular spread | 6° | Geometric lift-off clearance input. |
| Effective resistivity | 2.44 × 10⁻⁸ Ω m | Illustrative conducting-film value, not a measured thin-film calibration. |

All scenario settings are teaching examples. In particular, the etch rate,
selectivity, angular spread, and failure threshold are not recipes validated on a
named tool. Default polymer thickness is consistent with the scale of the USC
example, but this does not make the whole baseline a replication of that process.

Raster boundaries move in discrete increments; sub-cell differences can produce
identical masks. Exposed areas are reported in multiples of 4 µm². Near a geometric
threshold, reported changes include this discretization error. Quantitative use
would require a resolution study and comparison with measured structures.

### Inspection field definitions

| Field | Meaning |
| --- | --- |
| `connectedCount` | Channels with a metal path from their own pad to their own site, including channels participating in a short. |
| `isolatedConnectedCount` | Connected channels that share no conducting component with another channel. |
| `shortCount` | Number of affected channels, not number of bridging defects. |
| `exposedAreaUm2` | Sum of exposed metal within the four nominal electrode-site footprints; pads are excluded. |
| `allExposedMetalAreaUm2` | Exposed conductor anywhere, including pads and unintended routing exposure. |
| `unintendedExposedAreaUm2` | Exposed conductor outside the nominal electrode-site and pad regions. |
| `capRemainingUm` | Residual upper insulation inside the etched openings. |
| `protectedCapRemainingUm` | Residual upper insulation outside the opening mask, including erosion after mask breakthrough. |
| `maskRemainingUm` | Etch-mask thickness left at the end of contact etching, before the ideal strip step; it remains a process-budget diagnostic after stage 7. |
| `actualTraceWidthUm` | Measured width of channel 1 at a central straight segment. Each channel also has its own measured width for its resistance calculation. |
| `minimumBaseThicknessUm` | Minimum base-polymer thickness over the current footprint, including locations where it has been fully removed. |
| Channel `exposureFraction` | Exposed area within that channel's nominal metal-site footprint, divided by the nominal rasterized metal-site area. |
| Channel `apertureCoverageFraction` | Fraction of the nominal contact-opening disk actually containing exposed metal. This can be complete while `exposureFraction` is less than one because the opening is smaller than the metal site. |

## Numerical relationships

### Etch depth and selectivity

The starting model uses a prescribed polymer rate `v` and duration `t`:

```text
nominal etch depth = v × t
mask consumption = v × t / S
remaining mask = max(0, initial mask − mask consumption)
```

`S` is polymer-to-mask etch selectivity. Contact metal is exposed only when the
local upper insulation has cleared. Once the protective mask is exhausted, the
simplified model can remove previously protected upper insulation. Lateral
opening expansion is tied to etch depth by the selected lateral/vertical ratio.
Metal is an ideal etch stop. At openings without metal, etching continues through
the upper film and planarizing fill into the base. Fully removed base regions are
represented geometrically; mechanical collapse is not solved. These relations
omit loading, transport, aspect-ratio effects, rate transients, microtrenching,
redeposition, finite metal selectivity, and plasma chemistry.

### Lift-off clearance

A geometric clearance check compares resist undercut `u` with an envelope
constructed from resist height `h`, deposition spread `theta`, and film thickness
`t_m`:

```text
clearance envelope = h × tan(theta) + t_m
```

When the envelope reaches the undercut, the model retains unwanted metal as a
conservative failed-lift-off example. This condition is an explicit teaching
assumption, not a universal physical failure law. Real deposition has a flux
distribution; real lift-off also depends on sidewall morphology, remover access,
adhesion, mechanics, and processing history. Sputtered films can be lifted off
under suitable conditions; the model must not be read as a categorical statement
that sputtering always fails.

### Continuity, shorts, and exposure

Connectivity is evaluated on the realized conducting mask using edge-adjacent
cells. The program checks whether each intended pad and electrode site belong to
the same conductor and whether different channels have merged. Open and bridge
examples alter actual metal geometry. A pinhole alters local encapsulation.
These conditions are deterministic geometry examples, not sampled manufacturing
defect probabilities.

Exposed conductor area is the intersection of the actual metal with cleared
insulation. It can differ from the nominal opening and nominal metal-site area.
Misregistration can reduce the useful contact area even when the trace remains
electrically continuous. An electrically continuous but insulated site is not a
functioning exposed electrode.

### Resistance

For an intact isolated trace, the reported resistance follows a uniform
straight-conductor estimate between its nominal endpoint centers:

```text
R = rho × L / (w × t_m)
```

Geometry is converted from micrometres/nanometres to metres before evaluation.
`rho` is an adjustable effective resistivity. The default is a reference-scale
illustration; real thin films depend on composition, grain structure, thickness,
temperature, interfaces, and deposition history. The result excludes pad/contact
resistance, current crowding, electrode-electrolyte impedance, double-layer
capacitance, tissue impedance, and amplifier noise. A shorted network does not
have a well-defined independent channel resistance under this single-trace
formula.

## Source provenance

Sources below were checked on 22 October 2026. They support the named mechanisms
and example process families. No measured dataset from these sources was fitted
to the current model, and their reported device performance is not a validation
target for the generic four-channel geometry.

1. **USC, Meng laboratory — Microfabrication of Polyimide Microelectrode Arrays**,
   revision 2, 13 September 2024. Prepared by Alberto Esteban Linares and Yan Gong;
   reviewed by Ellis Meng. [Original 14-page protocol](https://bpb-us-w1.wpmucdn.com/sites.usc.edu/dist/2/915/files/2024/09/Polyimide-MEA-Microfabrication-Protocol_Y2.pdf).
   Supports the base-polymer, lithography/lift-off, encapsulation, opening/outline,
   inspection, and release sequence. Its stated device is a 20-µm-thick PI MEA.
   The simulator groups operations and does not implement this complete protocol.

2. **EPFL Center of MicroNanoTechnology — Photoresist Selection.**
   [Facility documentation](https://www.epfl.ch/research/facilities/cmi/process/photolithography/photoresist-selection-2/).
   Supports the roles of undercut, deposition direction and remover access in
   lift-off, and adequate mask thickness/selectivity in etching. Its process rules
   are facility- and material-dependent, not universal thresholds.

3. **UCSB Nanofab — Lift-Off with I-Line Imaging Resist + LOL2000 Underlayer**,
   Demis D. John, May 2022.
   [Facility process documentation](https://wiki.nanofab.ucsb.edu/wiki/Lift-Off_with_I-Line_Imaging_Resist_%2B_LOL2000_Underlayer).
   Supports the lateral development of an underlayer, loss of support beneath
   narrow resist features, directional deposition, and intermediate inspection.
   The current simulation prescribes an undercut; it does not solve this resist's
   development dynamics or reproduce the named material recipe.

4. **Pimenta et al. — Double-Layer Flexible Neural Probe With Closely Spaced
   Electrodes for High-Density in vivo Brain Recordings**, Frontiers in
   Neuroscience 15 (2021), 663174.
   [Original research](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2021.663174/full),
   [DOI: 10.3389/fnins.2021.663174](https://doi.org/10.3389/fnins.2021.663174).
   The authors attribute different exposed site areas to sequential polymer
   opening and likely lateral over-etching. This motivates the mechanism shown
   here without establishing our lateral-rate parameter. Their 32-channel,
   two-metal-layer device uses a different process; neither its geometry nor its
   electrical/biological performance is reproduced here.

5. **Tintelott, Schander and Lang — Understanding Electrical Failure of
   Polyimide-Based Flexible Neural Implants: The Role of Thin Film Adhesion**,
   Polymers 14 (2022), 3702.
   [Original abstract and figures](https://pubmed.ncbi.nlm.nih.gov/36145847/),
   [DOI: 10.3390/polym14183702](https://doi.org/10.3390/polym14183702).
   Establishes why a geometrically complete device is not sufficient evidence of
   reliable insulation: pretreatment, adhesion, electrical stress and mechanical
   stress affect failure. Adhesion and lifetime are currently outside the model;
   accelerated-test lifetimes are not converted into implant-life predictions.

## Validation

The independent model checks are in `tests/microfabrication.mjs` and are included
automatically by the repository test runner:

```sh
node --test tests/microfabrication.mjs
node tests/microfabrication.mjs
npm test
```

They exercise baseline continuity and isolation; explicit geometric breaks and
bridges; absence of contact exposure before clearing insulation; overlay-induced
area loss; mask consumption; thickness/resistivity scaling; reproducible replay;
and finite bounded input normalization. Tests check numerical and structural
consistency. They do not establish agreement with measured cleanroom outcomes.

### Verified model results — 22 October 2026

`node tests/microfabrication.mjs` completed with **19 tests passed, 0 failed**
(approximately 2.7 seconds in the development environment).
`node --test tests/microfabrication.mjs` also exited successfully; this environment
aggregates that report at file level. The direct invocation above displays each
individual check.

| Case | Observed model result |
| --- | --- |
| Default released device | Four connected, isolated channels; four conducting components; 1072 µm² exposed site area per channel; 7.4217 Ω uniform-trace estimate per channel; 20.2 µm maximum device thickness. |
| Six-minute contact etch | Four continuous traces but no exposed contacts; 4 µm insulation remains over contact openings. |
| Broken-conductor example | Channel 1 is open, three channels retain their pad-to-site path; five conductor components. |
| Bridge example | Channels 2 and 3 share a conductor; two isolated channels remain; three conductor components. |
| Perimeter clipping, 80-µm pitch and 48-µm drawn traces | Outer traces measure 40 µm and inner traces 48 µm; their respective resistance estimates are 2.2265 Ω and 1.8554 Ω. |
| Fully cleared base region at long etch time | Minimum base thickness remains zero in the diagnostic rather than excluding removed material. |

The independent graph audit verified connections directly from the returned
material grid. Two defects found during review were fixed and covered by
regressions: using the first channel's clipped width for every resistance, and
omitting completely removed regions from minimum-base-thickness reporting.
These are software-consistency checks; the numerical results are simulated,
not experimental measurements.

### Repository CPU regression context

The integration regression executed all **74 CPU test files**, with the existing
`tests/tissue-mechanics-browser.mjs` excluded to avoid launching a browser. Files
ran in separate Node processes with at most two processes at once. The initial
run passed 73 files and found two assertions failing in the existing
`tests/device-photos.mjs`. That file rejected an unsupported image-kind label and
a photo research entry marked pending despite a published image lookup. A source
audit identified eight existing photo records affected by the repository's
metadata and local-asset contracts. The failures were present in integration base
commit `7190bc2ec92cd68884488afe686b9fe77a06b9fa`.

The integration repair preserved all eight original images byte for byte in the
existing local asset directory, recorded their native dimensions and SHA-256
hashes, standardized the image kinds, and reconciled their eight audit entries.
Captions, credits, source URLs, rights statements, and version notes were
preserved. No test requirements were changed. The targeted rerun,
`node tests/device-photos.mjs`, then passed all six checks.

**All 74 CPU test files now have passing individual runs: 437 Node-test assertions
passed, with three additional plain-assertion scripts passing.** There were no
skipped or cancelled assertions. The microfabrication file passed all 19 checks.
This result combines the original individual-file run with the targeted rerun of
the repaired photo test; it is not a claim that a single aggregate `npm test`
invocation or the browser test ran in this CPU-only verification.

### Production build and static artifact checks

The final `npm run build --ignore-scripts` completed with exit code 0, generating
**504 pages** and completing the existing device-model export and preview-render
steps. `--ignore-scripts` bypassed the automatic `prebuild` test hook; the CPU
tests were verified separately as described above. The temporary browser QA
harness was removed before this build.

All three existing artifact-verification commands also exited successfully:

```sh
node scripts/verify-cortex-build.mjs
node scripts/verify-finger-atlas.mjs --build
node scripts/verify-finger-atlas-v4.mjs --build
```

These checks cover built routes, linked modules and workers, source provenance,
search entries, original image and anatomy integrity, and Finger Atlas geometry.
They inspect static artifacts and do not launch a browser or exercise WebGL.

### Browser QA and limits

All seven scenarios were checked interactively. The baseline showed four
connected, isolated channels and a 7.42 Ω trace estimate. The open example broke
channel 1; the bridge joined channels 2 and 3; underetch left no exposed contact;
misalignment reduced useful area; overetch exposed routing; and failed lift-off
disabled the electrical test. From requested stage 9 with processing blocked at
effective stage 5, Previous correctly returned to stage 4.

Desktop light and dark presentations and a 375-pixel-wide iframe were checked
without horizontal page overflow. Mask controls worked, and the Methods content
was read. The Save JSON download event completed. The import chooser could not
access the downloaded browser file through the shared filesystem, so end-to-end
file import remains unverified; the code replay audit passed. WebGL was disabled
in the browser environment: the material-mask fallback worked, while 3D GPU
rendering remains unverified. The integration preview is `preview.jpg`.

Before making quantitative fabrication claims, further validation would need a
named material/tool process, measured thickness and critical dimensions across a
parameter sweep, resolution/convergence checks, measured electrical test coupons,
and a documented comparison with uncertainty. Biological validation is a separate
task. Browser and presentation checks are recorded by the integration owner.


### Recovery verification

The transient checkout was lost after the initial verification and before its
source upload. The material model, scene, stylesheet, eight image records and
eight image assets were recovered with the same Git blob hashes. The interface
and methods were restored from recorded source and rendered text. The 19 model
tests were reconstructed with independent topology and area audits and passed
again against the exact recovered model. The full production build and six
device-photo checks also passed again.

The browser rejected a subsequent reload through its URL policy, so the restored
build did not receive another browser pass. The earlier desktop/mobile/theme and
scenario observations remain useful evidence, with the WebGL and file-import
limitations above. They must not be presented as GPU verification or a new
browser pass on the restored source.
