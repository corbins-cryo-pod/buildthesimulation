# Independent numerical reference comparisons

NEURON 9.0.1 and LFPykit 0.6.2 were actually installed and run in an isolated
Python environment. They are not website dependencies. These checks verify the
declared mathematical models in fixed cases; they are not experimental validation
or biological uncertainty estimates.

The passive cases below remain regression references. The active extension adds
the selected native SWC/original NMODL model, eight complete exported voltage/current
traces, native threshold brackets and LFPykit recordings. Its conventions and
predeclared gates are in [ACTIVE_MODEL](ACTIVE_MODEL.md); achieved results are in
[VALIDATION](VALIDATION.md). Reproduction commands are in [README](README.md).

## Inputs and independence

`scripts/cortex-reference-input.mjs` exports only the shared geometry, catalog
placement and experiment parameters. It does not import the cable solver or
volume-conductor implementation and exports no solved voltage, current or matrix.
The reference generators build and solve their own NEURON sections, compute
applied point fields in SI units, and invoke public LFPykit forward-model APIs.

The four configurations are the default synaptic, intracellular and extracellular
protocols, plus extracellular stimulation with implant translation (−100,75,50) µm,
rotation (5,10,−15) degrees, onset 5.0125 ms and zero interphase gap. Each uses
48 membrane compartments, dt=.025 ms and 40 ms duration. Fourteen saved frames
cover rest, pulse phases, synaptic/current onset/offset, and recovery.

## Exact soma convention

The browser model has a spherical soma membrane but an independent radial axial
resistance for each dendritic branch. NEURON constructs this explicit circuit:

| Element | NEURON geometry and membrane | Purpose |
| --- | --- | --- |
| Soma | L=20 µm, diameter=20 µm, nseg=1, normal passive membrane | Lateral area 400π µm² equals the modeled sphere's membrane area |
| Five radial adapters | Each L=10 µm, diameter=20 µm, Ra=150 Ωcm, cm=0, no membrane conductance | Separate 0.04774648 MΩ half-soma path per branch |
| Dendritic branches | Original lengths/diameters/segment counts, attached after their own adapter | Same 47 membrane-bearing dendritic compartments |

Each adapter attaches to soma(0.5). Attaching all dendrites directly to soma(1)
would introduce a shared resistance and a different junction. Adapter nodes are
not anatomical neurites and never enter recording-source arrays. Tests measure
zero adapter membrane current and compare variants with three adapter segments
or an added 20·sin(t) mV command on adapter interiors. The retained membrane
response changes by less than 1e−8 mV / 1e−10 nA.

NEURON inserts `extracellular` in every section with one layer, xg=1e9 S/cm²,
xc=0 µF/cm² and xraxial=1e9 MΩ/cm. This approximates a prescribed field with
finite conductances. The maximum actual `vext[0]` versus command difference is
below 5.6e−12 mV in the four base cases. `secondorder=0`, fixed dt, and disabled
CVode select backward Euler. `use_fast_imem(1)` supplies total outward nA;
unique-node conservation includes zero-area endpoints without double counting.

The synaptic step is represented by the exact combined ohmic conductance and
weighted reversal in NEURON's `pas`; it is not replaced by a current clamp.
Intracellular injection uses IClamp plus the independently calculated bath-return
field. Extracellular drive uses both physical source positions and exact interval
overlap; no radius-of-activation rule is used.

## Independent forward recordings

LFPykit receives the 48 physical source positions and NEURON currents. Its
`RecExtElectrode` uses `pointsource` or `root_as_point` (point soma plus uniform
dendritic lines). The root is supplied with a nonzero equivalent-cylinder axis
only to keep intermediate package geometry defined; both selected methods use
its unchanged midpoint as a point source. `PointSourcePotential` computes applied
stimulus and bath-return potentials separately. Matrices are converted from
mV/nA to µV/nA explicitly. No finite contact area is inferred.

Eight cases cover both source approximations for each configuration. Their
perpendicular distances exceed source radii, so LFPykit's near-axis radius
regularization is inactive. This does not validate our exclusion rule near a
source or prove equivalence in regularized regimes.

## Achieved agreement

| Comparison | Test gate | Achieved maximum at saved frames |
| --- | --- | --- |
| Original 41-segment uniform cable voltage/current | 1e−8 mV / 1e−10 nA | 7.96e−13 mV / 1.35e−15 nA |
| Full declared arbor voltage/current, four configurations | 1e−8 mV / 1e−10 nA | <9e−12 mV / <4e−13 nA |
| LFPykit point/line coefficients | 1e−10 µV/nA | <4e−15 µV/nA |
| NEURON → LFPykit neural/applied/total/bipolar signals | 1e−8 µV | <3e−13 µV |

These tiny differences reflect agreement between numerical implementations of the
same assumptions. They are not the difference between the model and real tissue.
Other parameter combinations, active channels, finite exposed contacts, layered
conductors, realistic morphology and acquisition electronics remain outside scope.

## Reproduction and provenance

Follow the optional environment commands in README.md. Generate the arbor fixture
before the LFPykit fixture. Python package versions, NEURON build, generator hashes,
shared-input hash and NEURON-fixture hash are retained. Node tests verify them;
changing geometry or inputs requires regenerating references, not updating expected
values from browser output. CI compares against the committed fixtures without
needing Python, NEURON or LFPykit installed.

Primary documentation:

- [NEURON geometry](https://www.neuronsimulator.org/en/9.0.1/progref/modelspec/programmatic/topology/geometry.html): stylized geometry, area and axial resistance.
- [NEURON extracellular](https://www.neuronsimulator.org/en/9.0.1/progref/modelspec/programmatic/mechanisms/mech.html#extracellular): prescribed-field circuit and section ownership.
- [NEURON fast_imem](https://www.neuronsimulator.org/en/9.0.1/progref/simctrl/cvode.html#CVode.use_fast_imem): units, electrode-current exclusion and unique-node conservation.
- [LFPykit API](https://lfpykit.readthedocs.io/en/latest/): CellGeometry, RecExtElectrode and PointSourcePotential; installed version 0.6.2 is pinned.
